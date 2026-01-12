import { defineStore } from 'pinia';
import { reactive, watch } from 'vue';
import { defaultRuntime } from '../engine/core/Runtime';
import { initialEngineState, selectors, type EngineState } from '../engine/core/EngineContext';
import type { ActionResult, ActionType } from '../engine/core/ActorAction';
import {
  enablePersistence,
  loadPersistedProgress,
  loadPersistedState,
  clearPersistedProgress,
  type PersistedProgress,
} from '../engine/core/Persistence';
import { useSettingsStore, type RecoveryMode } from './settings-store';

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
  const progress = loadPersistedProgress();
  const settingsStore = useSettingsStore();
  const skipReplay = settingsStore.displaySettings.skipReplay;
  const recoveryMode: RecoveryMode = skipReplay ? 'direct' : settingsStore.displaySettings.recoveryMode;

  watch(
    () => settingsStore.otherSettings.useIndexedDBSaves,
    (v) => {
      runtime.setUseIndexedDB(v);
    },
    { immediate: true },
  );

  if (recoveryMode === 'direct') {
    const savedFrame = progress?.frame;
    if (progress) clearPersistedProgress();
    const restored = loadPersistedState();
    if (restored) {
      runtime.hydrate(restored);
      if (typeof savedFrame === 'number') (loadProgress as { frame: number }).frame = savedFrame;
      Object.assign(state, restored);
      skipScript.value = true;
    }
  } else if (!progress) {
    // 没有进度记录：从持久化状态恢复
    const restored = loadPersistedState();
    if (restored) {
      console.log('[engine-store] 从持久化状态恢复');
      runtime.hydrate(restored, { clearHistory: true });
      Object.assign(state, restored);
      skipScript.value = true;
    }
  } else {
    console.log('[engine-store] 从进度记录恢复（将重放操作）');
    loadReplay.value = { ...progress, fastMode: recoveryMode === 'fast' };
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

      // 获取恢复模式设置
      const settingsStore = useSettingsStore();
      const recoveryMode: RecoveryMode = settingsStore.displaySettings.recoveryMode;

      console.log('[load] recoveryMode =', recoveryMode);
      console.log('[load] frame =', frame);

      // 根据恢复模式决定如何加载
      if (recoveryMode === 'direct') {
        // 直接恢复模式：只恢复状态，不执行脚本
        console.log('[load] 进入直接恢复模式');
        loadReplay.value = null;
        skipScript.value = true;
        if (savedState) {
          runtime.hydrate(savedState, { clearHistory: true });
        }
      } else {
        console.log(recoveryMode === 'fast' ? '[load] 进入快速恢复模式' : '[load] 进入完整重放模式');
        const choices = Array.isArray(saveData.choices) ? saveData.choices : undefined;
        const entryVars = saveData.entryVars && typeof saveData.entryVars === 'object' ? saveData.entryVars : undefined;
        loadReplay.value = {
          scene,
          frame,
          time: Date.now(),
          fastMode: recoveryMode === 'fast',
          ...(choices ? { choices } : {}),
          ...(entryVars ? { entryVars } : {}),
        };
        skipScript.value = false;
      }

      console.log('[load] skipScript.value =', skipScript.value);
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
