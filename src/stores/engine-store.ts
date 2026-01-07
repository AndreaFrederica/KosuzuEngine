import { defineStore } from 'pinia';
import { reactive, watch } from 'vue';
import { defaultRuntime } from '../engine/core/Runtime';
import { initialEngineState, selectors, type EngineState } from '../engine/core/EngineContext';
import type { ActionResult, ActionType, ActorAction } from '../engine/core/ActorAction';
import {
  enablePersistence,
  loadPersistedProgress,
  loadPersistedState,
  type PersistedProgress,
} from '../engine/core/Persistence';

const DEV_MODE_KEY = 'engine:devMode';

export const useEngineStore = defineStore('engine', () => {
  const runtime = defaultRuntime;
  const state = reactive<EngineState>({ ...initialEngineState });
  const loadToken = reactive<{ value: number }>({ value: 0 });
  const loadProgress = reactive<{ scene: string | undefined; frame: number | undefined }>({
    scene: undefined,
    frame: undefined,
  });
  const loadReplay = reactive<{ value: PersistedProgress | null }>({ value: null });

  // 开发模式状态（暂无特殊功能）
  const devMode = reactive<{ value: boolean }>({
    value: localStorage.getItem(DEV_MODE_KEY) === 'true',
  });

  // 监听开发模式变化，持久化到 localStorage
  watch(
    () => devMode.value,
    (newValue) => {
      localStorage.setItem(DEV_MODE_KEY, String(newValue));
    },
    { deep: true },
  );
  enablePersistence(runtime);
  const progress = loadPersistedProgress();
  if (!progress) {
    const restored = loadPersistedState();
    if (restored) {
      runtime.hydrate(restored);
      Object.assign(state, restored);
    }
  }
  let prevActors: EngineState['actors'] = {};
  let prevBgName: string | undefined = undefined;

  runtime.addListener((s: EngineState) => {
    const curr = s.actors;
    Object.keys(curr).forEach((id) => {
      const curA = curr[id];
      const prev = prevActors[id];
      if (!curA) return;
      if (!prev) {
        console.log('actor:show', id, curA);
        return;
      }
      const ct = curA.transform;
      const pt = prev.transform;
      const cp = curA.pose?.emote;
      const pp = prev.pose?.emote;
      if (JSON.stringify(ct) !== JSON.stringify(pt)) {
        console.log('actor:move', id, ct);
      }
      if (cp !== pp) {
        console.log('actor:pose', id, cp);
      }
    });
    Object.keys(prevActors).forEach((id) => {
      const curA = curr[id];
      if (!curA) {
        console.log('actor:hide', id);
      }
    });
    if (s.bg?.name !== prevBgName) {
      console.log('bg:switch', s.bg?.name);
    }
    Object.assign(state, s);
    prevActors = { ...s.actors };
    prevBgName = s.bg?.name;
  });

  function dispatch(type: ActionType, payload?: unknown) {
    return runtime.dispatch({ type, payload });
  }

  function choose(goto?: string) {
    runtime.choose(goto);
  }

  function advance() {
    runtime.advance();
  }

  return {
    state,
    dialog: () => selectors.dialog(state),
    choice: () => selectors.choice(state),
    background: () => selectors.background(state),
    bgm: () => selectors.bgm(state),
    overlayLayer() {
      return state.overlay?.layer ?? 100;
    },
    history() {
      return state.history;
    },
    actorIds() {
      return state.actorIds ?? Object.keys(state.actors || {});
    },
    spriteForActor(id: string) {
      const atlas = state.bindings?.spriteAtlases?.[id];
      if (!atlas) return '';
      const poseKey = state.actors[id]?.pose?.emote ?? 'default';
      return atlas.mapping[poseKey] ?? atlas.mapping.default ?? '';
    },
    dispatch,
    choose,
    advance,
    canBack() {
      return (state.history?.length ?? 0) > 1;
    },
    back() {
      if ((state.history?.length ?? 0) <= 1) return;
      runtime.back();
    },
    save(slot: string) {
      return runtime.save(slot);
    },
    load(slot: string) {
      const key = `save:${slot}`;
      const raw = localStorage.getItem(key);
      if (!raw) return { ok: false } as ActionResult<void>;
      const parsed = JSON.parse(raw) as
        | { meta?: { scene?: string; frame?: number; time?: number }; state?: EngineState; actions?: unknown; choices?: unknown }
        | EngineState;
      const savedState: EngineState | null =
        parsed && typeof parsed === 'object' && 'state' in parsed && parsed.state ? (parsed.state) : null;
      const scene =
        (parsed && typeof parsed === 'object' && 'meta' in parsed && parsed.meta && typeof parsed.meta.scene === 'string'
          ? parsed.meta.scene
          : savedState?.scene) ?? 'scene1';
      const frame =
        parsed && typeof parsed === 'object' && 'meta' in parsed && parsed.meta && typeof parsed.meta.frame === 'number'
          ? parsed.meta.frame
          : (savedState?.history?.length ?? 0);

      loadProgress.scene = scene;
      loadProgress.frame = frame;

      if (
        parsed &&
        typeof parsed === 'object' &&
        'actions' in parsed &&
        Array.isArray(parsed.actions) &&
        parsed.actions.length > 0
      ) {
        const time =
          'meta' in parsed && parsed.meta && typeof parsed.meta.time === 'number' ? parsed.meta.time : Date.now();
        const out: PersistedProgress = { scene, frame, time, actions: parsed.actions as ActorAction<unknown>[] };
        if ('choices' in parsed && Array.isArray(parsed.choices)) out.choices = parsed.choices as string[];
        loadReplay.value = out;
      } else {
        loadReplay.value = null;
        if (savedState) {
          runtime.hydrate(savedState);
        }
      }
      loadToken.value += 1;
      return { ok: true } as ActionResult<void>;
    },
    listSaves(): Array<{ slot: string; scene?: string; text?: string; time?: number }> {
      return runtime.listSaves();
    },
    deleteSave(slot: string) {
      return runtime.deleteSave(slot);
    },
    loadToken: () => loadToken.value,
    loadProgress: () => ({ scene: loadProgress.scene, frame: loadProgress.frame }),
    loadReplay: () => loadReplay.value,
    // 开发模式状态（暂无特殊功能）
    devMode: () => devMode.value,
    setDevMode(enabled: boolean) {
      devMode.value = enabled;
    },
  };
});
