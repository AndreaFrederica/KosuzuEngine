import { defineStore } from 'pinia';
import { reactive, watch } from 'vue';
import { defaultRuntime } from '../engine/core/Runtime';
import { initialEngineState, selectors, type EngineState } from '../engine/core/EngineContext';
import type { ActionResult, ActionType } from '../engine/core/ActorAction';
import {
  enablePersistence,
  type PersistedProgress,
} from '../engine/core/Persistence';
import { useSettingsStore } from './settings-store';
import { scriptSession } from '../engine/script/ScriptSession';

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
  // 标志：是否跳过脚本执行（直接从保存状态恢复）
  const skipScript = reactive<{ value: boolean }>({ value: false });

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

  // 设置 Runtime 的开发模式回调，使其能检查设置面板的开发模式开关
  runtime.setDevModeCallback(() => devMode.value);

  enablePersistence(runtime);
  const settingsStore = useSettingsStore();

  watch(
    () => settingsStore.otherSettings.useIndexedDBSaves,
    (v) => {
      runtime.setUseIndexedDB(v);
    },
    { immediate: true },
  );

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

  function reset() {
    Object.assign(state, initialEngineState);
    loadToken.value = 0;
    loadProgress.scene = undefined;
    loadProgress.frame = undefined;
    loadReplay.value = null;
    skipScript.value = false;
    runtime.reset();
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
    async hasSave(slot: string) {
      const saveData = await runtime.getSaveData(slot);
      return saveData !== null;
    },
    async load(slot: string) {
      console.log('[load] ========== 开始 load ==========');
      console.log('[load] slot =', slot);

      const saveData = await runtime.getSaveData(slot);
      if (!saveData) {
        console.log('[load] 没有找到存档数据');
        return { ok: false } as ActionResult<void>;
      }

      if (saveData.script) {
        await runtime.restoreSave(saveData);
        loadReplay.value = null;
        skipScript.value = true;
        loadToken.value += 1;
        return { ok: true } as ActionResult<void>;
      }
      scriptSession.stop();

      const parsedMeta = saveData.meta;
      const savedState = (saveData.state ?? null) as EngineState | null;

      console.log('[load] savedState.scene =', (savedState)?.scene);
      console.log('[load] runtime.state.scene =', runtime.state.scene);
      const scene =
        (parsedMeta && typeof parsedMeta.scene === 'string' ? parsedMeta.scene : savedState?.scene) ?? 'scene1';
      const frame =
        parsedMeta && typeof parsedMeta.frame === 'number' ? parsedMeta.frame : (savedState?.history?.length ?? 0);

      loadProgress.scene = scene;
      loadProgress.frame = frame;

      // Legacy saves contain no VM heap. Replay once to migrate them into a live VM.
      runtime.reset();
      runtime.hydrate({
        ...initialEngineState,
        vars: saveData.entryVars ?? {},
        bindings: savedState?.bindings ?? {},
      }, { silent: true });
      runtime.setChoiceTrail(saveData.choices);
      runtime.replayToFrame(frame, 'fast');
      await scriptSession.startGame(scene);
      loadReplay.value = null;
      skipScript.value = false;
      loadToken.value += 1;
      return { ok: true } as ActionResult<void>;
    },
    listSaves(): Promise<Array<{ slot: string; scene?: string; text?: string; time?: number }>> {
      return runtime.listSaves();
    },
    deleteSave(slot: string) {
      return runtime.deleteSave(slot);
    },
    loadToken: () => loadToken.value,
    loadProgress: () => ({ scene: loadProgress.scene, frame: loadProgress.frame }),
    loadReplay: () => loadReplay.value,
    // 检查是否应该跳过脚本执行（直接从保存状态恢复）
    shouldSkipScript: () => skipScript.value,
    clearSkipScript: () => { skipScript.value = false; },
    // 开发模式状态（暂无特殊功能）
    devMode: () => devMode.value,
    setDevMode(enabled: boolean) {
      devMode.value = enabled;
    },
    // 检查是否正在恢复位置（Dev 模式下快速重放时禁用 CSS 动画）
    // 需要同时检查：开发模式开关 AND 正在恢复位置
    isRestoring: () => devMode.value && runtime.isRestoring(),
    reset,
  };
});

export type EngineStore = ReturnType<typeof useEngineStore>;
