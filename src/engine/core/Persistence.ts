import type { EngineState } from './EngineContext';
import type { Runtime } from './Runtime';

const KEY = 'kosuzu_engine_state';

export function enablePersistence(runtime: Runtime) {
  runtime.addListener((s: EngineState) => {
    const json = JSON.stringify(s);
    localStorage.setItem(KEY, json);
  });
}

export function loadPersistedState(): EngineState | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  return JSON.parse(raw) as EngineState;
}
