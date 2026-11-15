import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { QuickJSScriptRuntime, registerScriptHostFunction, getRegisteredScriptHostFunctions } from '../src/engine/script/QuickJSScriptRuntime.ts';
import { compileScript } from '../src/engine/script/compileScript.ts';
import { scriptVmPlugin } from '../build/script-vm-plugin.ts';

const wasm = await readFile(new URL(import.meta.resolve('quickjs-wasi/quickjs.wasm')));
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

test('closures, loops, pending choice and host callbacks survive a fresh VM restore', async () => {
  const choice = deferred();
  const output = [];
  const hosts = {
    'choose': { call: () => choice.promise, resume: () => choice.promise },
    'output': { call: value => output.push(value) },
  };
  let vm = await QuickJSScriptRuntime.create(wasm, hosts);
  vm.start(`let total = 2; const increment = n => total += n;
    for (let i = 0; i < 2; i++) { const x = await __call('choose'); __call('output', increment(x)); }`);
  const snapshot = JSON.parse(JSON.stringify(vm.snapshot()));
  vm.stop();
  const restoredChoice = deferred();
  hosts.choose = { call: () => Promise.resolve(4), resume: () => restoredChoice.promise };
  vm = await QuickJSScriptRuntime.create(wasm, hosts, snapshot);
  vm.resume();
  choice.resolve(999); // stale host completions must not touch the new VM
  restoredChoice.resolve(3);
  await vm.finished;
  assert.deepEqual(output, [5, 9]);
  vm.stop();
});

test('sync and async external calls return values and throw catchable guest errors', async () => {
  registerScriptHostFunction('double', n => n * 2);
  registerScriptHostFunction('fail', () => { throw new Error('sync failure'); });
  registerScriptHostFunction('later', () => Promise.reject(new Error('async failure')));
  const out = [];
  const vm = await QuickJSScriptRuntime.create(wasm, { ...getRegisteredScriptHostFunctions(), output: { call: x => out.push(x) } });
  vm.start(`__call('output', external.double(4));
    try { external.fail(); } catch(e) { __call('output', e.message); }
    try { await external.later(); } catch(e) { __call('output', e.message); }`);
  await vm.finished;
  assert.deepEqual(out, [8, 'sync failure', 'async failure']);
  vm.stop();
});

test('unsupported pending external operation and incompatible snapshots fail explicitly', async () => {
  const vm = await QuickJSScriptRuntime.create(wasm, { request: { call: () => new Promise(() => {}) } });
  vm.start(`await __call('request');`);
  assert.throws(() => vm.snapshot(), /恢复接口/);
  await assert.rejects(QuickJSScriptRuntime.create(wasm, {}, { abi: 'old', memory: '', pending: [] }), /版本/);
  vm.stop();
});

test('ordinary synchronous TS functions remain synchronous under debugging', async () => {
  const lines = [];
  const out = [];
  const source = compileScript(`function add(a: number, b: number) { return a + b; }
class Value { get value() { return add(1, 2); } }
const doubled = [1, 2].map(n => { return n * 2; });
await Promise.resolve();
__call('output', { value: new Value().value, doubled });`);
  const vm = await QuickJSScriptRuntime.create(wasm, {
    '__trace': { call: line => { lines.push(line); } }, output: { call: value => out.push(value) },
  });
  vm.start(source);
  await vm.finished;
  assert.deepEqual(out, [{ value: 3, doubled: [2, 4] }]);
  assert.deepEqual(lines, [3, 4, 5]);
  vm.stop();
});

test('bundled game scenes and actual actor API run in QuickJS and resume without replay', async () => {
  const plugin = scriptVmPlugin();
  const module = await plugin.load.call({ addWatchFile() {} }, '\0virtual:game-script');
  assert.match(module, /^export default "/, 'the VM bundle is emitted as a normal JavaScript string module');
  assert.doesNotMatch(module, /TextDecoder|atob\(/, 'the virtual module must not contain a runtime base64 decoder');
  const { default: source, scriptSources } = await import('data:text/javascript,' + encodeURIComponent(module));
  const actions = [];
  const waiting = deferred();
  const state = { actors: {}, vars: {}, bindings: {} };
  const hosts = {
    'runtime.flowStep': { call: () => ({ skip: false }) },
    'runtime.flowComplete': { call: () => {} },
    'runtime.flowAbort': { call: () => {} },
    'runtime.state': { call: () => state },
    'runtime.dispatch': { call: a => { actions.push(a); return a.type === 'say' ? waiting.promise : Promise.resolve({ok:true}); }, resume: () => waiting.promise },
    'runtime.bindSpriteAtlas': { call: () => {} },
    'translate': { call: key => ({ text: key }) },
  };
  let vm = await QuickJSScriptRuntime.create(wasm, hosts);
  vm.start(`${source}; await GameScript.getScene('scene1').fn();`);
  await tick();
  assert.equal(actions.at(-1).type, 'say');
  assert.equal(vm.executionState.status, 'waiting');
  const location = vm.executionState.location;
  assert.ok(location.file.endsWith('/src/game/scenes/scene1.ts'));
  assert.match(scriptSources[location.file].split(/\r?\n/)[location.line - 1], /await defaultRuntime.dispatch/);
  assert.deepEqual(vm.executionState.pending[0].location, location);
  const before = actions.length;
  const snapshot = vm.snapshot();
  vm.stop();
  vm = await QuickJSScriptRuntime.create(wasm, hosts, snapshot);
  vm.resume();
  await tick();
  assert.equal(actions.length, before, 'restore must not replay actions');
  assert.deepEqual(vm.executionState.location, location, 'restore reports the suspended line before another trace runs');
  vm.stop();
});

test('execution inspection tracks parallel waits, completion, errors, and stop without running guest code', async () => {
  const first = deferred();
  const second = deferred();
  const hosts = {
    first: { call: () => first.promise, resume: () => first.promise },
    second: { call: () => second.promise, resume: () => second.promise },
  };
  const vm = await QuickJSScriptRuntime.create(wasm, hosts);
  const updates = [];
  vm.onExecutionChange = state => updates.push(state);
  vm.start(`
    __trace('src/game/scenes/a.ts', 12);
    const a = __call('first');
    __trace('src/game/scenes/b.ts', 25);
    const b = __call('second');
    await Promise.all([a, b]);
    __trace('src/game/scenes/a.ts', 16);
  `);
  assert.equal(vm.executionState.status, 'waiting');
  assert.deepEqual(vm.executionState.pending.map(p => p.location), [
    { file: 'src/game/scenes/a.ts', line: 12 }, { file: 'src/game/scenes/b.ts', line: 25 },
  ]);
  const count = updates.length;
  for (let i = 0; i < 10; i++) assert.equal(vm.executionState.pending.length, 2);
  assert.equal(updates.length, count, 'inspection does not execute or emit guest work');
  first.resolve(); await tick();
  assert.deepEqual(vm.executionState.pending.map(p => p.name), ['second']);
  second.resolve(); await vm.finished;
  assert.equal(vm.executionState.status, 'completed');
  assert.equal(vm.executionState.location.line, 16);
  vm.stop();
  assert.equal(updates.at(-1).status, 'stopped');
  assert.deepEqual(vm.executionState.pending, []);

  const failing = await QuickJSScriptRuntime.create(wasm, {});
  failing.start(`__trace('bad.ts', 7); throw new Error('broken script');`);
  await assert.rejects(failing.finished, /broken script/);
  assert.equal(failing.executionState.status, 'error');
  assert.equal(failing.executionState.location.line, 7);
  assert.match(failing.executionState.error, /broken script/);
});

test('gzip snapshot storage round-trips and resumes in a fresh instance', async () => {
  const { compressSnapshot, decompressSnapshot } = await import('../src/engine/script/snapshotStorage.ts');
  let vm = await QuickJSScriptRuntime.create(wasm, { wait: { call: () => new Promise(() => {}), resume: () => Promise.resolve() } });
  vm.start(`const state = new Map([['score', 7]]); await __call('wait'); if(state.get('score') !== 7) throw new Error('lost state');`);
  const original = vm.snapshot();
  const packed = await compressSnapshot(original);
  assert.equal(packed.compression, 'gzip');
  assert.ok(packed.memory.length < original.memory.length / 2);
  const loaded = await decompressSnapshot(JSON.parse(JSON.stringify(packed)));
  vm.stop();
  vm = await QuickJSScriptRuntime.create(wasm, { wait: { call: () => {}, resume: () => Promise.resolve() } }, loaded);
  vm.resume();
  await vm.finished;
  vm.stop();
});

test('runtime save/load and back restore the script position with the displayed state', async () => {
  const { build } = await import('esbuild');
  const code = await build({
    stdin: { contents: `export { Runtime } from './src/engine/core/Runtime'; export { ScriptSession } from './src/engine/script/ScriptSession';`, resolveDir: process.cwd(), loader: 'ts' },
    bundle: true, write: false, platform: 'node', format: 'esm',
    plugins: [{ name: 'test-browser-adapters', setup(builder) {
      builder.onResolve({filter:/^virtual:game-script(?:-hmr)?$/},()=>({path:'game',namespace:'test'}));
      builder.onResolve({filter:/^\.\/wasm$/},()=>({path:'wasm',namespace:'test'}));
      builder.onResolve({filter:/(?:i18n\/(?:I18nManager|VoiceManager)|\/navigation|render\/CharacterAudioManager)$/},()=>({path:'services',namespace:'test'}));
      builder.onLoad({filter:/.*/,namespace:'test'},args=>({ contents: args.path==='game' ? 'export default ""; export const scriptSources = {};' : args.path==='wasm'
        ? `export async function loadScriptWasm() { return Uint8Array.from(atob(${JSON.stringify(wasm.toString('base64'))}), c=>c.charCodeAt(0)); }`
        : `export const nav = { push(){} }; export const getI18nManager = () => ({getTranslation: key=>({text:key})}); export const getVoiceManager=()=>({speakWithAPI:async()=>{}}); export const characterAudioRegistry={getOrCreate:()=>({playVoice:async()=>{}})};`
      }));
    }}],
  });
  const { Runtime, ScriptSession } = await import('data:text/javascript;base64,' + Buffer.from(code.outputFiles[0].text).toString('base64'));
  const storage = new Map();
  globalThis.localStorage = { getItem:k=>storage.get(k)??null, setItem:(k,v)=>storage.set(k,String(v)), removeItem:k=>storage.delete(k) };
  const runtime = new Runtime();
  const session = new ScriptSession(runtime);
  const executionUpdates = [];
  const unsubscribe = session.subscribeExecution(state => executionUpdates.push(state));
  assert.equal(executionUpdates.at(-1).status, 'idle');
  runtime.setScriptController(session);
  await session.start('editor', `
    await __call('runtime.dispatch', {type:'scene',payload:'test'});
    let count = 10;
    for (let i=0; i<3; i++) {
      __trace('test.ts', 5 + i);
      await __call('runtime.dispatch', {type:'say',payload:{text:String(count++)}});
    }
  `, {}, { file: 'test.ts', source: 'original editor source' });
  await tick();
  assert.equal(runtime.state.dialog.text, '10');
  assert.equal(executionUpdates.at(-1).location.line, 5);
  assert.equal(session.sourceFor('test.ts'), 'original editor source');
  await runtime.save('slot');
  runtime.advance(); await tick();
  assert.equal(runtime.state.dialog.text, '11');
  assert.equal(executionUpdates.at(-1).location.line, 6);
  await runtime.load('slot');
  assert.equal(runtime.state.dialog.text, '10');
  assert.equal(executionUpdates.at(-1).location.line, 5);
  assert.equal(session.sourceFor('test.ts'), 'original editor source', 'save/load preserves editor source metadata');
  assert.equal(runtime.state.history.length,1);
  runtime.advance(); await tick();
  assert.equal(runtime.state.dialog.text, '11', 'local count resumes, not reset or incremented twice');
  runtime.back();
  for(let i=0;i<50 && runtime.state.dialog.text!=='10';i++) await new Promise(r=>setTimeout(r,10));
  assert.equal(runtime.state.dialog.text, '10');
  assert.equal(executionUpdates.at(-1).location.line, 5, 'back updates the execution viewer to the restored position');
  runtime.advance(); await tick();
  assert.equal(runtime.state.dialog.text, '11', 'back restores continuation as well as visuals');

  runtime.reset({ silent: true });
  runtime.hydrate({
    scene: 'test',
    dialog: { text: 'checkpoint' },
    choice: { items: [], visible: false },
    actors: {},
    actorIds: [],
    history: [{ text: 'checkpoint' }],
    vars: {},
    bindings: {},
  }, { silent: true });
  assert.deepEqual(runtime.flowStep('test.ts:1', 0), { skip: false });
  runtime.flowComplete('test.ts:1', 0, { ok: true });
  assert.deepEqual(runtime.flowStep('test.ts:1', 0), { skip: true, value: { ok: true } });
  assert.equal(runtime.state.dialog.text, 'checkpoint', 'hot reload skips old actions without replaying the frame');
  runtime.reset();
  assert.equal(executionUpdates.at(-1).status, 'stopped');
  unsubscribe();
  const updateCount = executionUpdates.length;
  await session.start('editor', `__trace('done.ts', 1);`);
  assert.equal(executionUpdates.length, updateCount, 'closed viewers unsubscribe');
  session.stop();
});
