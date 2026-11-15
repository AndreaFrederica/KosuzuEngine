import initialGameSource, { scriptSources as initialScriptSources } from 'virtual:game-script';
import hotGameSource, { scriptSources as hotScriptSources } from 'virtual:game-script-hmr';
import { defaultRuntime, type Runtime } from '../core/Runtime';
import type { EngineState } from '../core/EngineContext';
import { createEngineHosts } from './engineHosts';
import { loadScriptWasm } from './wasm';
import { QuickJSScriptRuntime, type ScriptExecutionState, type ScriptHostFunctionMap, type ScriptSnapshot } from './QuickJSScriptRuntime';
import { decompressSnapshot } from './snapshotStorage';

export interface SavedScript {
  kind: 'game' | 'editor';
  vm: ScriptSnapshot;
  /** Original editor source, independent of its generated SDK wrapper. */
  debugSource?: { file: string; source: string };
}
export interface ScriptController {
  capture(): SavedScript | undefined;
  restore(script: SavedScript, state: EngineState): Promise<void>;
  stop(): void;
  back(): boolean;
}

/** Owns the VM across route changes; loading replaces it atomically. */
export class ScriptSession implements ScriptController {
  private active: QuickJSScriptRuntime | undefined;
  private kind: SavedScript['kind'] = 'game';
  private generation = 0;
  private extraHosts: ScriptHostFunctionMap = {};
  private checkpoints: Array<{ key: string; file: string; line: number; actionCursor: number; choices: string[]; state: EngineState; script: SavedScript }> = [];
  private gameSource = initialGameSource;
  private restoring = false;
  private deferredHotReload: { line: number; file: string } | undefined;
  private activeScene = 'scene1';
  private currentLine = 0;
  private currentFile = '';
  private gameSources = initialScriptSources;
  private debugSource: SavedScript['debugSource'];
  private execution: ScriptExecutionState = { status: 'idle', pending: [] };
  private executionListeners = new Set<(state: ScriptExecutionState) => void>();

  get executionState() { return this.execution; }

  subscribeExecution(listener: (state: ScriptExecutionState) => void) {
    this.executionListeners.add(listener);
    listener(this.execution);
    return () => { this.executionListeners.delete(listener); };
  }

  sourceFor(file: string) {
    const normalized = file.replaceAll('\\', '/');
    if (this.kind === 'editor') {
      return this.debugSource?.file.replaceAll('\\', '/') === normalized ? this.debugSource.source : undefined;
    }
    return this.gameSources[normalized];
  }

  private observeExecution(vm: QuickJSScriptRuntime) {
    vm.onExecutionChange = (state) => {
      if (this.active !== vm) return;
      this.execution = state;
      this.currentFile = state.location?.file ?? '';
      this.currentLine = state.location?.line ?? 0;
      this.executionListeners.forEach((listener) => listener(state));
    };
  }

  constructor(private readonly runtime: Runtime) {
    if (import.meta.hot) {
      import.meta.hot.on('kosuzu:script-update', (payload: { file: string; line: number }) => {
        void this.hotReload(Math.max(1, Math.floor(payload.line || 1)), payload.file);
      });
    }
  }

  get running() { return this.active !== undefined; }

  capture(): SavedScript | undefined {
    if (!this.active) return;
    return {
      kind: this.kind, vm: this.active.snapshot(),
      ...(this.debugSource ? { debugSource: this.debugSource } : {}),
    };
  }

  private loadLatestGameSource() {
    if (!import.meta.hot) return this.gameSource;
    this.gameSource = hotGameSource;
    this.gameSources = hotScriptSources;
    return this.gameSource;
  }

  async startGame(scene = 'scene1', source = this.gameSource) {
    this.activeScene = scene;
    await this.start('game', `${source}\n
      let next = ${JSON.stringify(scene)};
      while (next) {
        const scene = GameScript.getScene(next);
        if (!scene) throw new Error('未知场景: ' + next);
        await __call('runtime.dispatch', { type: 'scene', payload: next });
        next = await scene.fn();
      }
    `);
  }

  async start(kind: SavedScript['kind'], source: string, hosts: ScriptHostFunctionMap = {}, debugSource?: SavedScript['debugSource']) {
    this.stop();
    const generation = this.generation;
    this.extraHosts = hosts;
    const vm = await QuickJSScriptRuntime.create(await loadScriptWasm(), {
      ...createEngineHosts(this.runtime),
      __trace: { call: (file, line) => { this.currentFile = String(file); this.currentLine = Number(line); } },
      ...hosts,
    });
    if (generation !== this.generation) { vm.stop(); return; }
    this.kind = kind;
    this.debugSource = debugSource;
    this.active = vm;
    this.observeExecution(vm);
    vm.onStable = () => this.checkpoint();
    this.runtime.setScriptController(this);
    vm.start(source, debugSource?.file ?? `${kind}.js`);
    void vm.finished.catch((error: unknown) => console.error('Script Error:', error));
    return vm;
  }

  async restore(script: SavedScript, state: EngineState, keepHistory = false) {
    const generation = ++this.generation;
    // Validate and instantiate first: invalid snapshots leave the current VM intact.
    const vm = await QuickJSScriptRuntime.create(await loadScriptWasm(), {
      ...createEngineHosts(this.runtime),
      '__trace': { call: (file, line) => { this.currentFile = String(file); this.currentLine = Number(line); }, resume: () => undefined },
      ...this.extraHosts,
    }, await decompressSnapshot(script.vm));
    if (generation !== this.generation) { vm.stop(); return; }
    this.active?.stop();
    this.active = vm;
    this.kind = script.kind;
    this.debugSource = script.debugSource;
    this.observeExecution(vm);
    if (!keepHistory) this.checkpoints = [];
    vm.onStable = () => this.checkpoint();
    this.runtime.setScriptController(this);
    this.runtime.hydrate(state);
    vm.resume();
    void vm.finished.catch((error: unknown) => console.error('Script Error:', error));
  }

  private checkpoint() {
    try {
      const key = `${this.runtime.state.scene}:${this.runtime.state.history.length}:${this.runtime.state.choice.visible}`;
      if (this.checkpoints.at(-1)?.key === key) return;
      if (!this.runtime.state.history.length && !this.runtime.state.choice.visible) return;
      const script = this.capture();
      if (!script?.vm.pending.some((p) => p.name === 'runtime.dispatch' && ['say', 'choice'].includes((p.args[0] as { type: string }).type))) return;
      this.checkpoints.push({
        key,
        file: this.currentFile,
        line: this.currentLine,
        actionCursor: this.runtime.getActionCursor(),
        choices: this.runtime.getChoiceTrailSnapshot(),
        script,
        state: JSON.parse(JSON.stringify(this.runtime.state)) as EngineState,
      });
      if (this.checkpoints.length > 10) this.checkpoints.shift();
      if (this.deferredHotReload && !this.runtime.isOperationPending()) {
        const update = this.deferredHotReload;
        this.deferredHotReload = undefined;
        queueMicrotask(() => void this.hotReload(update.line, update.file));
      }
    } catch {
      // A non-resumable extension is still running; defer the checkpoint.
    }
  }

  /**
   * Dev HMR path for resumable OOP commands. The VM is restarted only at an
   * operation boundary; completed flow commands are skipped by Runtime and
   * never dispatch their engine action again.
   */
  async hotReload(changedLine: number, changedFile = '') {
    if (this.kind !== 'game' || !this.active || this.restoring) return;
    if (this.runtime.isOperationPending()) {
      this.deferredHotReload = { line: changedLine, file: changedFile };
      console.info('[Kosuzu HMR] 当前命令仍在等待，已延迟到命令完成后切换');
      return;
    }
    const scene = this.runtime.state.scene || this.activeScene;

    this.restoring = true;
    try {
      const source = this.loadLatestGameSource();
      if (changedFile) this.runtime.invalidateFlowFrom(changedFile, changedLine);
      this.stop();
      await this.startGame(scene, source);
      console.info(`[Kosuzu HMR] 已从 OOP 命令边界继续执行，修改位置 ${changedFile}:${changedLine}`);
    } catch (error) {
      console.error('[Kosuzu HMR] 脚本热更新失败:', error instanceof Error ? error.stack : String(error));
    } finally {
      this.restoring = false;
    }
  }

  back() {
    if (!this.active) return false;
    if (this.restoring || this.checkpoints.length < 2) return true;
    this.checkpoints.pop();
    const checkpoint = this.checkpoints.at(-1)!;
    this.restoring = true;
    void this.restore(checkpoint.script, checkpoint.state, true)
      .catch((error: unknown) => console.error('无法回退脚本:', error))
      .finally(() => { this.restoring = false; });
    return true;
  }

  stop() {
    this.generation += 1;
    this.active?.stop();
    this.active = undefined;
    this.checkpoints = [];
  }
}

export const scriptSession = new ScriptSession(defaultRuntime);
defaultRuntime.setScriptController(scriptSession);
