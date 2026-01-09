<template>
  <q-page class="column items-stretch q-pa-none">
    <div class="col stage-container">
      <StageView :debug="showDebug" @stage-click="onStageClick">
        <template #overlay>
          <AudioPrompt />
          <DialogBox
            v-if="showDialog"
            @back="store.back?.()"
            @restart="restartScene"
            @open-settings="showSettings = !showSettings"
            @open-audio="showAudioChannels = !showAudioChannels"
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
          <ContextViewer :visible="showContext" @close="showContext = false" />
          <ScriptConsole :visible="showConsole" @close="showConsole = false" />
          <SaveLoadPanel :visible="showSL" :mode="slMode" @close="showSL = false" />
          <SettingsPanel :visible="showSettings" @close="showSettings = false" />
          <AudioChannelsPanel :visible="showAudioChannels" @close="showAudioChannels = false" />
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
import AudioChannelsPanel from '../engine/render/AudioChannelsPanel.vue';
import AudioPrompt from '../engine/render/AudioPrompt.vue';
import { onMounted, ref, watch } from 'vue';
import { useEngineStore } from 'stores/engine-store';
import {
  loadPersistedProgress,
  loadPersistedState,
  clearPersistedProgress,
  type PersistedProgress,
} from '../engine/core/Persistence';
import { scenes, getSceneFn, hasScene } from '../game/scenes';
import { defaultRuntime } from '../engine/core/Runtime';
import { initI18n, registerEngineStore } from '../engine/i18n';
import { useRouter } from 'vue-router';
import { registerRouterNavigateCallback } from '../engine/core/BaseActor';
import { initNavigation } from '../engine/navigation';
const showDebug = ref(false);
const showContext = ref(false);
const showHistory = ref(false);
const showDialog = ref(true);
const showSL = ref(false);
const showConsole = ref(false);
const showSettings = ref(false);
const showAudioChannels = ref(false);
const slMode = ref<'save' | 'load'>('save');
const store = useEngineStore();
const router = useRouter();

// 从场景注册表获取场景ID列表
type SceneName = (typeof scenes)[number]['id'];

let sceneLoopToken = 0;

async function runSceneLoop(initialScene: SceneName, initialFrame: number) {
  sceneLoopToken += 1;
  const token = sceneLoopToken;

  // 检查是否应该跳过脚本执行（直接从保存状态恢复）
  if (store.shouldSkipScript?.()) {
    console.log('[runSceneLoop] 跳过脚本执行，直接从保存状态恢复');
    store.clearSkipScript?.();
    return; // 不执行脚本，状态已在 load() 中通过 hydrate 恢复
  }

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
    if (maybeNext && hasScene(maybeNext)) {
      nextScene = maybeNext as SceneName; // eslint-disable-line @typescript-eslint/no-unnecessary-type-assertion
    }
  }
}

async function startSceneFromFrame(
  sceneName: SceneName,
  frame: number,
  replay: PersistedProgress | null,
) {
  // 检查开发模式
  const isDevMode = store.devMode();

  // 检查是否有保存的完整状态
  const savedState = loadPersistedState();

  // 非开发模式且有保存状态时，直接恢复状态，不重新执行脚本
  if (!isDevMode && savedState && savedState.scene === sceneName && frame > 0) {
    console.log('[恢复] 使用已保存的状态直接恢复，不重新执行脚本');
    defaultRuntime.hydrate(savedState);
    await store.dispatch('scene', sceneName);
    return ''; // 不继续执行脚本
  }

  // 开发模式或没有保存状态时，重放脚本
  defaultRuntime.reset();

  if (frame > 0) {
    defaultRuntime.replayToFrame(frame);
    if (replay && Array.isArray(replay.actions)) {
      defaultRuntime.beginReplay({
        actions: replay.actions,
        choices: replay.choices ?? [],
        targetFrame: frame,
      });
    }
  }
  await store.dispatch('scene', sceneName);

  // 根据环境选择场景加载方式
  const isDev = import.meta.env.DEV;
  let result: string | void;

  if (isDev) {
    // 开发环境：使用动态导入以支持热重载（HMR）
    const timestamp = Date.now();
    console.log('[HMR DemoVN] 动态导入脚本，时间戳:', timestamp);

    if (sceneName === 'scene1' || sceneName === 'scene2') {
      const mod = await import(`../game/scenes/scene1?t=${timestamp}`);
      console.log('[HMR DemoVN] scene1 模块导入完成');
      result = await (sceneName === 'scene1' ? mod.scene1() : mod.scene2());
    } else if (sceneName === 'sceneEffects') {
      const mod = await import(`../game/scenes/sceneEffects?t=${timestamp}`);
      console.log('[HMR DemoVN] sceneEffects 模块导入完成');
      result = await mod.sceneEffects();
    } else {
      // 使用场景注册表获取场景函数
      const sceneFn = getSceneFn(sceneName);
      if (sceneFn) {
        result = await sceneFn();
      } else {
        console.error(`[HMR DemoVN] 未找到场景: ${sceneName}`);
        return '';
      }
    }
  } else {
    // 生产环境：直接使用场景注册表，避免动态导入路径问题
    const sceneFn = getSceneFn(sceneName);
    if (sceneFn) {
      result = await sceneFn();
    } else {
      console.error(`[DemoVN] 未找到场景: ${sceneName}`);
      return '';
    }
  }

  return result ?? '';
}

onMounted(() => {
  // 注册路由导航回调，允许脚本中调用导航方法
  // 同时初始化全局导航 API，使 UI 组件也能使用
  const navigateCallback = (path: string) => {
    void router.push(path);
  };
  registerRouterNavigateCallback(navigateCallback);
  initNavigation(navigateCallback);

  // 初始化 i18n 国际化系统
  initI18n();
  // 注册 engine store，用于语言切换时重新翻译
  registerEngineStore(store);

  const progress = loadPersistedProgress();
  const _restored = loadPersistedState(); // eslint-disable-line @typescript-eslint/no-unused-vars

  // 从场景注册表获取有效的场景ID列表
  const validSceneIds = new Set(scenes.map((s) => s.id));

  // 确定初始场景
  let sceneName: SceneName = 'scene1';
  if (progress?.scene && validSceneIds.has(progress.scene)) {
    sceneName = progress.scene as SceneName; // eslint-disable-line @typescript-eslint/no-unnecessary-type-assertion
  }

  const frame = progress?.scene === sceneName ? progress.frame : 0;
  void runSceneLoop(sceneName, frame);
});

watch(
  () => store.loadToken(),
  () => {
    const p = store.loadProgress();
    const replay = store.loadReplay?.() ?? null;

    // 从场景注册表获取有效的场景ID列表
    const validSceneIds = new Set(scenes.map((s) => s.id));

    const scene = (p.scene && validSceneIds.has(p.scene) ? p.scene : 'scene1') as SceneName; // eslint-disable-line @typescript-eslint/no-unnecessary-type-assertion
    const frame = typeof p.frame === 'number' ? p.frame : 0;

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
        if (maybeNext && validSceneIds.has(maybeNext)) {
          nextScene = maybeNext as SceneName; // eslint-disable-line @typescript-eslint/no-unnecessary-type-assertion
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

  // 从场景注册表获取有效的场景ID列表
  const validSceneIds = new Set(scenes.map((s) => s.id));

  const sceneName: SceneName =
    progress?.scene && validSceneIds.has(progress.scene)
      ? (progress.scene as SceneName) // eslint-disable-line @typescript-eslint/no-unnecessary-type-assertion
      : 'scene1';
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
  import.meta.hot.accept(['../game/scenes/scene1', '../game/scenes/sceneEffects'], () => {
    console.log('[HMR DemoVN] import.meta.hot.accept 回调被触发！');
    const progress = loadPersistedProgress();

    // 从场景注册表获取有效的场景ID列表
    const validSceneIds = new Set(scenes.map((s) => s.id));

    const sceneName: SceneName =
      progress?.scene && validSceneIds.has(progress.scene)
        ? (progress.scene as SceneName) // eslint-disable-line @typescript-eslint/no-unnecessary-type-assertion
        : 'scene1';
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
