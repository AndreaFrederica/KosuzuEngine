import type { EngineState } from './EngineContext';
import type { ActorAction } from './ActorAction';
import type { Runtime } from './Runtime';

const KEY = 'kosuzu_engine_state';
const PROGRESS_KEY = 'kosuzu_engine_progress';

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

export type PersistedProgress = {
  scene: string;
  frame: number;
  time: number;
  actions?: ActorAction<unknown>[];
  choices?: string[];
  /** 快速模式标记：true=快速跳转（跳过动画），false=完整重放 */
  fastMode?: boolean;
};

export function loadPersistedProgress(): PersistedProgress | null {
  const raw = localStorage.getItem(PROGRESS_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedProgress>;
    if (typeof parsed.scene !== 'string') return null;
    if (typeof parsed.frame !== 'number') return null;
    if (typeof parsed.time !== 'number') return null;
    const out: PersistedProgress = {
      scene: parsed.scene,
      frame: parsed.frame,
      time: parsed.time,
    };
    if (Array.isArray(parsed.actions)) out.actions = parsed.actions;
    if (Array.isArray(parsed.choices)) out.choices = parsed.choices;
    return out;
  } catch {
    return null;
  }
}

export function clearPersistedProgress() {
  localStorage.removeItem(PROGRESS_KEY);
}
