import wasmUrl from 'quickjs-wasi/quickjs.wasm?url';

let compiled: Promise<WebAssembly.Module> | undefined;
export function loadScriptWasm() {
  compiled ??= fetch(wasmUrl).then(async (response) => {
    if (!response.ok) throw new Error(`无法加载本地 QuickJS WASM: ${response.status}`);
    return WebAssembly.compile(await response.arrayBuffer());
  }).catch((error: unknown) => {
    compiled = undefined;
    throw error;
  });
  return compiled;
}
