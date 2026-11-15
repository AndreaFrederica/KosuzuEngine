import { QuickJS, type QuickJSOptions, type JSValueHandle } from 'quickjs-wasi';

export const SCRIPT_ABI = 'kosuzu-quickjs-wasi-3.6.4-v1';
export interface ScriptLocation {
  file: string;
  line: number;
}
export interface ScriptExecutionState {
  status: 'idle' | 'running' | 'waiting' | 'completed' | 'stopped' | 'error';
  location?: ScriptLocation;
  pending: PendingHostCall[];
  error?: string;
}
export interface PendingHostCall {
  id: number;
  name: string;
  args: unknown[];
  elapsed: number;
  location?: ScriptLocation;
}
export interface ScriptHostFunction {
  call: (...args: unknown[]) => unknown;
  /** Reattach an unfinished operation; never repeat a completed side effect. */
  resume?: (call: PendingHostCall) => unknown;
}
export type ScriptHostFunctionMap = Record<string, ScriptHostFunction>;
export interface ScriptSnapshot {
  abi: typeof SCRIPT_ABI;
  memory: string;
  pending: PendingHostCall[];
  compression?: 'gzip';
  location?: ScriptLocation;
}

const bootstrap = `
globalThis.__pending = new Map();
globalThis.__nextCall = 0;
globalThis.__status = { done: false };
globalThis.__settle = (id, ok, value) => {
  const entry = __pending.get(id);
  if (!entry) throw new Error('Unknown host call: ' + id);
  __pending.delete(id);
  (ok ? entry.resolve : entry.reject)(value);
};
globalThis.__call = (name, ...args) => {
  const id = ++__nextCall;
  let entry;
  const promise = new Promise((resolve, reject) => { entry = { resolve, reject }; });
  __pending.set(id, entry);
  const result = __hostInvoke(id, name, args);
  if (result.async) return promise;
  __pending.delete(id);
  if (!result.ok) throw result.value;
  return result.value;
};
globalThis.__flowCounters = Object.create(null);
globalThis.__flowStep = async (id, fn) => {
  const occurrence = globalThis.__flowCounters[id] || 0;
  globalThis.__flowCounters[id] = occurrence + 1;
  const gate = __call('runtime.flowStep', id, occurrence);
  if (gate && gate.skip) return gate.value;
  try {
    const value = await fn();
    __call('runtime.flowComplete', id, occurrence, value);
    return value;
  } catch (error) {
    __call('runtime.flowAbort', id, occurrence);
    throw error;
  }
};
globalThis.external = new Proxy(Object.create(null), {
  get: (_, name) => (...args) => __call('external.' + String(name), ...args),
});
globalThis.sleep = (ms) => __call('sleep', ms);
globalThis.__trace = (...args) => __call('__trace', ...args);
globalThis.log = globalThis.console = Object.fromEntries(
  ['log', 'info', 'warn', 'error', 'debug'].map(name => [name, (...args) => __call('log.' + name, ...args)])
);
globalThis.setTimeout = (fn, ms = 0, ...args) => {
  let cancelled = false;
  sleep(ms).then(() => { if (!cancelled) fn(...args); });
  return () => { cancelled = true; };
};
globalThis.clearTimeout = (cancel) => cancel?.();
`;

function encode(bytes: Uint8Array): string {
  let text = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(text);
}

/** A VM keeps all continuations in its heap, including host-operation resolvers. */
export class QuickJSScriptRuntime {
  onStable: (() => void) | undefined;
  onExecutionChange: ((state: ScriptExecutionState) => void) | undefined;
  private location: ScriptLocation | undefined;
  private filename = 'script.ts';
  private status: ScriptExecutionState['status'] = 'idle';
  private error: string | undefined;
  private vm!: QuickJS;
  private stopped = false;
  private deadline = 0;
  private pending = new Map<number, PendingHostCall & { started: number }>();
  private resolveFinished!: () => void;
  private rejectFinished!: (error: Error) => void;
  readonly finished = new Promise<void>((resolve, reject) => {
    this.resolveFinished = resolve;
    this.rejectFinished = reject;
  });

  /** Lightweight inspection; does not snapshot WASM memory or run guest code. */
  get executionState(): ScriptExecutionState {
    return {
      status: this.status,
      ...(this.location ? { location: { ...this.location } } : {}),
      pending: [...this.pending.values()].map(({ started, ...call }) => ({
        ...call, elapsed: call.elapsed + Date.now() - started,
      })),
      ...(this.error ? { error: this.error } : {}),
    };
  }

  private publishExecution() {
    this.onExecutionChange?.(this.executionState);
  }

  private constructor(private readonly hosts: ScriptHostFunctionMap) {
    // The owner may attach its UI error handler after startup.
    void this.finished.catch(() => {});
  }

  static async create(wasm: QuickJSOptions['wasm'], hosts: ScriptHostFunctionMap, snapshot?: ScriptSnapshot) {
    const runtime = new QuickJSScriptRuntime(hosts);
    const options: QuickJSOptions = {
      wasm,
      memoryLimit: 64 * 1024 * 1024,
      maxStackSize: 512 * 1024,
      interruptHandler: () => runtime.stopped || Date.now() > runtime.deadline,
    };
    if (snapshot) {
      if (snapshot.abi !== SCRIPT_ABI) throw new Error('存档 VM 版本不兼容');
      for (const call of snapshot.pending) {
        if (!hosts[call.name]?.resume) throw new Error(`缺少宿主恢复接口: ${call.name}`);
      }
      const bytes = Uint8Array.from(atob(snapshot.memory), (c) => c.charCodeAt(0));
      runtime.vm = await QuickJS.restore(QuickJS.deserializeSnapshot(bytes), options);
      runtime.vm.registerHostCallback('__hostInvoke', (...args) => runtime.invoke(args));
      runtime.location = snapshot.location;
      // Restored continuations are reattached explicitly after engine state is hydrated.
      for (const call of snapshot.pending) {
        runtime.pending.set(call.id, { ...call, started: Date.now() });
      }
    } else {
      runtime.vm = await QuickJS.create(options);
      const fn = runtime.vm.newFunction('__hostInvoke', (...args) => runtime.invoke(args));
      runtime.vm.setProp(runtime.vm.global, '__hostInvoke', fn);
      fn.dispose();
      runtime.evaluate(bootstrap);
    }
    return runtime;
  }

  private invoke(args: JSValueHandle[]) {
    const id = args[0]!.toNumber();
    const name = args[1]!.toString();
    const values = this.vm.dump(args[2]!) as unknown[];
    if (name === '__trace') {
      const file = values.length > 1 ? String(values[0]) : this.filename;
      const line = Number(values.length > 1 ? values[1] : values[0]);
      if (Number.isInteger(line) && line > 0) {
        this.location = { file: file.replaceAll('\\', '/'), line };
      }
    }
    try {
      const host = this.hosts[name];
      if (!host && name === '__trace') return this.vm.hostToHandle({ ok: true, value: undefined });
      if (!host) throw new Error(`未注册的宿主函数: ${name}`);
      const result = host.call(...values);
      if (result instanceof Promise) {
        this.pending.set(id, {
          id, name, args: values, elapsed: 0, started: Date.now(),
          ...(this.location ? { location: { ...this.location } } : {}),
        });
        this.observe(id, result);
        return this.vm.hostToHandle({ async: true });
      }
      return this.vm.hostToHandle({ ok: true, value: result });
    } catch (error) {
      return this.vm.hostToHandle({ ok: false, value: error instanceof Error ? error : new Error(String(error)) });
    }
  }

  private observe(id: number, promise: Promise<unknown>) {
    void promise.then(
      (value) => this.settle(id, true, value),
      (error: unknown) => this.settle(id, false, error instanceof Error ? error : new Error(String(error))),
    ).catch((error: unknown) => this.fail(error));
  }

  private settle(id: number, ok: boolean, value: unknown) {
    if (this.stopped) return;
    this.status = 'running';
    this.pending.delete(id);
    this.deadline = Date.now() + 1000;
    this.vm.withScope(() => {
      const fn = this.vm.global.getProp('__settle');
      const result = this.vm.callFunction(
        fn,
        this.vm.undefined,
        this.vm.newNumber(id),
        this.vm.hostToHandle(ok),
        this.vm.hostToHandle(value),
      );
      result.dispose();
      fn.dispose();
    });
    this.drain();
  }

  evaluate(source: string, filename = 'script.js') {
    if (this.stopped) throw new Error('Script stopped');
    this.deadline = Date.now() + 1000;
    this.vm.evalCode(source, filename).dispose();
  }

  start(source: string, filename = 'script.js') {
    this.filename = filename;
    this.status = 'running';
    try {
      this.evaluate(`(async () => {\n${source}\n})().then(
        () => { __status = { done: true }; },
        error => { __status = { done: true, error: String(error) + (error?.stack ? '\\n' + error.stack : '') }; }
      );`, filename);
      this.drain();
    } catch (error) {
      this.fail(error);
      throw error;
    }
  }

  resume() {
    this.status = 'running';
    for (const call of this.pending.values()) {
      try {
        this.observe(call.id, Promise.resolve(this.hosts[call.name]!.resume!(call)));
      } catch (error) {
        this.observe(call.id, Promise.reject(error instanceof Error ? error : new Error(String(error))));
      }
    }
    this.drain();
  }

  private drain() {
    this.deadline = Date.now() + 1000;
    this.vm.executePendingJobs();
    const status = this.vm.global.getProp('__status').consume((h) => this.vm.dump(h)) as { done: boolean; error?: string };
    if (status.error) this.fail(new Error(status.error));
    else {
      this.status = status.done ? 'completed' : this.pending.size ? 'waiting' : 'running';
      if (status.done) this.resolveFinished();
    }
    if (!this.stopped) {
      this.publishExecution();
      this.onStable?.();
    }
  }

  snapshot(): ScriptSnapshot {
    if (this.stopped) throw new Error('Script stopped');
    const pending = [...this.pending.values()].map(({ started, ...call }) => {
      if (!this.hosts[call.name]?.resume) {
        throw new Error(`宿主操作 ${call.name} 尚未完成且未提供恢复接口，暂时无法存档`);
      }
      return { ...call, elapsed: call.elapsed + Date.now() - started };
    });
    return {
      abi: SCRIPT_ABI, memory: encode(QuickJS.serializeSnapshot(this.vm.snapshot())), pending,
      ...(this.location ? { location: { ...this.location } } : {}),
    };
  }

  private fail(error: unknown) {
    this.status = 'error';
    this.error = error instanceof Error ? error.message : String(error);
    this.rejectFinished(error instanceof Error ? error : new Error(String(error)));
    this.stop();
  }

  stop() {
    if (this.stopped) return;
    this.stopped = true;
    if (this.status !== 'error') this.status = 'stopped';
    this.pending.clear();
    this.vm?.dispose();
    this.resolveFinished();
    this.publishExecution();
  }
}

const extensions: ScriptHostFunctionMap = Object.create(null) as ScriptHostFunctionMap;
export function registerScriptHostFunction(name: string, call: ScriptHostFunction['call'], resume?: ScriptHostFunction['resume']) {
  if (!/^[A-Za-z_$][\w$]*$/.test(name)) throw new Error('无效的宿主函数名');
  extensions[`external.${name}`] = { call, ...(resume ? { resume } : {}) };
}
export function unregisterScriptHostFunction(name: string) {
  delete extensions[`external.${name}`];
}
export function getRegisteredScriptHostFunctions(): ScriptHostFunctionMap {
  return { ...extensions };
}
