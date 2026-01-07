<template>
  <q-page class="column items-stretch q-pa-none">
    <div class="col stage-container">
      <StageView :debug="showDebug" @stage-click="onStageClick">
        <template #overlay>
          <DialogBox
            v-if="showDialog"
            @back="store.back?.()"
            @restart="restartScene"
            @open-settings="showSettings = !showSettings"
            @open-context="showContext = !showContext"
            @open-debug="showDebug = !showDebug"
            @open-console="showConsole = !showConsole"
            @open-history="showHistory = !showHistory"
            @open-save="
              slMode = 'save';
              showSL = true;
            "
            @open-load="
              slMode = 'load';
              showSL = true;
            "
            @hide="showDialog = false"
          />
          <ChoicePanel />
          <ContextViewer :visible="showContext" />
          <ScriptConsole :visible="showConsole" @close="showConsole = false" />
          <SaveLoadPanel :visible="showSL" :mode="slMode" @close="showSL = false" />
          <SettingsPanel :visible="showSettings" @close="showSettings = false" />
          <HistoryPanel
            :visible="showHistory"
            @close="showHistory = false"
            @back="store.back?.()"
          />
        </template>
      </StageView>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import StageView from '../engine/render/StageView.vue';
import DialogBox from '../engine/render/DialogBox.vue';
import ChoicePanel from '../engine/render/ChoicePanel.vue';
import ContextViewer from '../engine/debug/ContextViewer.vue';
import ScriptConsole from '../engine/debug/ScriptConsole.vue';
import HistoryPanel from '../engine/render/HistoryPanel.vue';
import SaveLoadPanel from '../engine/render/SaveLoadPanel.vue';
import SettingsPanel from '../engine/render/SettingsPanel.vue';
import { onMounted, ref, watch } from 'vue';
import { useEngineStore } from 'stores/engine-store';
import {
  loadPersistedProgress,
  loadPersistedState,
  clearPersistedProgress,
  type PersistedProgress,
} from '../engine/core/Persistence';
import { scene1, scene2 } from '../scripts/scene1';
import { sceneEffects } from '../scripts/effectsTest';
import { defaultRuntime } from '../engine/core/Runtime';
const showDebug = ref(false);
const showContext = ref(false);
const showHistory = ref(false);
const showDialog = ref(true);
const showSL = ref(false);
const showConsole = ref(false);
const showSettings = ref(false);
const slMode = ref<'save' | 'load'>('save');
const store = useEngineStore();

const scenes = {
  scene1,
  scene2,
  sceneEffects,
} as const;
type SceneName = keyof typeof scenes;

let sceneLoopToken = 0;

async function runSceneLoop(initialScene: SceneName, initialFrame: number) {
  sceneLoopToken += 1;
  const token = sceneLoopToken;
  const initialProgress = loadPersistedProgress();
  const initialReplay: PersistedProgress | null =
    initialProgress?.scene === initialScene && Array.isArray(initialProgress.actions)
      ? initialProgress
      : null;
  let nextScene: SceneName | null = initialScene;
  let nextFrame = initialFrame;
  while (nextScene) {
    if (token !== sceneLoopToken) return;
    const name = nextScene;
    nextScene = null;
    const result = await startSceneFromFrame(
      name,
      nextFrame,
      name === initialScene ? initialReplay : null,
    );
    if (token !== sceneLoopToken) return;
    nextFrame = 0;
    const maybeNext = (result || '').trim();
    if (maybeNext && maybeNext in scenes) {
      nextScene = maybeNext as SceneName;
    }
  }
}

async function startSceneFromFrame(
  sceneName: SceneName,
  frame: number,
  replay: PersistedProgress | null,
) {
  defaultRuntime.reset();
  // 暂时禁用 beginReplay，完全使用新脚本
  // if (replay && replay.actions) {
  //   const plan: { actions: NonNullable<PersistedProgress['actions']>; choices?: string[]; targetFrame?: number } = {
  //     actions: replay.actions,
  //     targetFrame: replay.frame,
  //   };
  //   if (Array.isArray(replay.choices)) plan.choices = replay.choices;
  //   defaultRuntime.beginReplay(plan);
  // } else if (frame > 0) {
  //   defaultRuntime.replayToFrame(frame);
  // }
  // 始终使用 replayToFrame 来跳转到目标帧
  if (frame > 0) {
    defaultRuntime.replayToFrame(frame);
  }
  await store.dispatch('scene', sceneName);

  // 动态导入场景函数以获取最新的脚本内容（支持热重载）
  // 使用 URL 参数强制绕过 Vite 的模块缓存
  const timestamp = Date.now();
  console.log('[HMR DemoVN] 动态导入脚本，时间戳:', timestamp);
  let result: string | void;
  if (sceneName === 'scene1' || sceneName === 'scene2') {
    const mod = await import(`../scripts/scene1?t=${timestamp}`);
    console.log('[HMR DemoVN] scene1 模块导入完成');
    result = await (sceneName === 'scene1' ? mod.scene1() : mod.scene2());
  } else if (sceneName === 'sceneEffects') {
    const mod = await import(`../scripts/effectsTest?t=${timestamp}`);
    console.log('[HMR DemoVN] effectsTest 模块导入完成');
    result = await mod.sceneEffects();
  } else {
    // 降级到缓存的 scenes 对象
    const fn = scenes[sceneName] as () => Promise<string | void>;
    result = await fn();
  }

  return result ?? '';
}

onMounted(() => {
  const progress = loadPersistedProgress();
  const restored = loadPersistedState();
  const sceneName: SceneName =
    progress?.scene && progress.scene in scenes ? (progress.scene as SceneName) : 'scene1';
  const frame = progress?.scene === sceneName ? progress.frame : 0;
  // 暂时禁用 replayHistory，让热重载使用新脚本的文本
  // if (!Array.isArray(progress?.actions) && frame > 0 && restored?.scene === sceneName) {
  //   defaultRuntime.setReplayHistory(restored.history);
  // }
  void runSceneLoop(sceneName, frame);
});

watch(
  () => store.loadToken(),
  () => {
    const p = store.loadProgress();
    const replay = store.loadReplay?.() ?? null;
    const scene = (p.scene && p.scene in scenes ? p.scene : 'scene1') as SceneName;
    const frame = typeof p.frame === 'number' ? p.frame : 0;
    // 暂时禁用 replayHistory，让热重载使用新脚本的文本
    // if (!replay && frame > 0) defaultRuntime.setReplayHistory(store.state.history);
    showDialog.value = true;
    sceneLoopToken += 1;
    const token = sceneLoopToken;
    void (async () => {
      const initialReplay: PersistedProgress | null =
        replay && replay.scene === scene && Array.isArray(replay.actions) ? replay : null;
      let nextScene: SceneName | null = scene;
      let nextFrame = frame;
      while (nextScene) {
        if (token !== sceneLoopToken) return;
        const name = nextScene;
        nextScene = null;
        const result = await startSceneFromFrame(
          name,
          nextFrame,
          name === scene ? initialReplay : null,
        );
        if (token !== sceneLoopToken) return;
        nextFrame = 0;
        const maybeNext = (result || '').trim();
        if (maybeNext && maybeNext in scenes) {
          nextScene = maybeNext as SceneName;
        }
      }
    })();
  },
);
function onStageClick() {
  if (!showDialog.value) showDialog.value = true;
}

function restartScene() {
  clearPersistedProgress();
  showDialog.value = true;
  void runSceneLoop('scene1', 0);
}

// Vite HMR: 监听脚本文件变化，自动重新运行当前场景
// 注册全局函数供脚本模块调用
(window as unknown as { __reloadScene?: () => void }).__reloadScene = () => {
  console.log('[HMR DemoVN] __reloadScene 被调用！');
  const progress = loadPersistedProgress();
  console.log('[HMR DemoVN] 当前进度:', progress);
  const sceneName: SceneName =
    progress?.scene && progress.scene in scenes ? (progress.scene as SceneName) : 'scene1';
  const frame = progress?.frame ?? 0;
  console.log('[HMR DemoVN] 场景名称:', sceneName, '目标帧:', frame);

  // HMR 时清除保存的 actions，让新脚本完全重新执行
  // 否则会使用旧的 actions 进行重放，导致显示旧内容
  if (progress?.actions) {
    const updatedProgress = { ...progress, actions: undefined };
    localStorage.setItem('kosuzu_engine_progress', JSON.stringify(updatedProgress));
    console.log('[HMR DemoVN] 已清除旧 actions');
  }

  console.log('[HMR DemoVN] 重新运行场景', sceneName, '从帧', frame, '开始');
  showDialog.value = true;
  void runSceneLoop(sceneName, frame);  // 保持进度
};
console.log('[HMR DemoVN] __reloadScene 函数已注册到 window 对象');

if (import.meta.hot) {
  import.meta.hot.accept(['../scripts/scene1', '../scripts/effectsTest'], () => {
    console.log('[HMR DemoVN] import.meta.hot.accept 回调被触发！');
    const progress = loadPersistedProgress();
    const sceneName: SceneName =
      progress?.scene && progress.scene in scenes ? (progress.scene as SceneName) : 'scene1';
    const frame = progress?.frame ?? 0;

    // HMR 时清除保存的 actions，让新脚本完全重新执行
    if (progress?.actions) {
      const updatedProgress = { ...progress, actions: undefined };
      localStorage.setItem('kosuzu_engine_progress', JSON.stringify(updatedProgress));
    }

    showDialog.value = true;
    void runSceneLoop(sceneName, frame);  // 保持进度
  });
}
</script>

<style scoped>
.stage-container {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
</style>
