<template>
  <q-page class="column items-stretch q-pa-none">
    <div class="col stage-container">
      <StageView :debug="showDebug" @stage-click="onStageClick">
        <template #overlay>
          <AudioPrompt />
          <DialogBox
            v-show="showDialog"
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
            @back-to-title="backToTitle"
            @quick-save-1="quickSave(1)"
            @quick-save-2="quickSave(2)"
            @quick-save-3="quickSave(3)"
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
import { useSettingsStore } from 'stores/settings-store';
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
const settingsStore = useSettingsStore();
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
    // 设置恢复回调，当用户点击"继续"时从当前帧开始执行脚本
    defaultRuntime.setResumeCallback(() => {
      console.log('[resumeCallback] 用户点击继续，从当前帧恢复脚本执行');
      void runSceneLoop(initialScene, initialFrame);
    });

    // 检查是否启用了读档后自动继续
    const autoContinue = settingsStore.displaySettings.autoContinueAfterLoad;
    if (autoContinue) {
      console.log('[runSceneLoop] 读档后自动继续已启用，延迟触发继续');
      // 延迟一小段时间让用户看到恢复的状态，然后自动继续
      setTimeout(() => {
        store.advance();
      }, 300);
    }
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

  // 检查是否为快速模式
  const isFastMode = replay?.fastMode === true;

  console.log('[startSceneFromFrame] isDevMode =', isDevMode, 'isFastMode =', isFastMode, 'frame =', frame);

  // 快速模式：使用 replayToFrame 跳过目标帧之前的所有命令
  // Dev 模式下也会跳过动画（通过 Runtime 的 dispatch 方法处理）
  if (isFastMode || isDevMode) {
    console.log('[startSceneFromFrame] 快速模式：重放到目标帧', frame);
    defaultRuntime.reset();
    if (frame > 0) {
      defaultRuntime.replayToFrame(frame);
    }
    await store.dispatch('scene', sceneName);
  } else if (savedState && savedState.scene === sceneName && frame > 0) {
    // 非快速模式且有保存状态时，直接恢复状态，不重新执行脚本
    console.log('[startSceneFromFrame] 直接恢复模式：使用已保存的状态');
    defaultRuntime.hydrate(savedState);
    await store.dispatch('scene', sceneName);
    return ''; // 不继续执行脚本
  } else {
    // 正常模式：从头开始执行脚本
    console.log('[startSceneFromFrame] 正常模式：从头执行脚本');
    defaultRuntime.reset();
    await store.dispatch('scene', sceneName);
  }

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
  void initI18n();
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
    const shouldSkip = store.shouldSkipScript?.();

    console.log('[watch loadToken] 触发');
    console.log('[watch loadToken] shouldSkipScript =', shouldSkip);
    console.log('[watch loadToken] replay =', replay);
    console.log('[watch loadToken] scene =', p.scene, 'frame =', p.frame);

    // 从场景注册表获取有效的场景ID列表
    const validSceneIds = new Set(scenes.map((s) => s.id));

    const scene = (p.scene && validSceneIds.has(p.scene) ? p.scene : 'scene1') as SceneName; // eslint-disable-line @typescript-eslint/no-unnecessary-type-assertion
    const frame = typeof p.frame === 'number' ? p.frame : 0;

    // 检查是否应该跳过脚本执行（直接从保存状态恢复）
    // 与 runSceneLoop 的逻辑保持一致
    if (shouldSkip) {
      console.log('[watch loadToken] 跳过脚本执行，直接从保存状态恢复');
      store.clearSkipScript?.();
      showDialog.value = true;
      // 设置恢复回调，当用户点击"继续"时从当前帧开始执行脚本
      defaultRuntime.setResumeCallback(() => {
        console.log('[resumeCallback] 用户点击继续，从当前帧恢复脚本执行');
        void runSceneLoop(scene, frame);
      });

      // 检查是否启用了读档后自动继续
      const autoContinue = settingsStore.displaySettings.autoContinueAfterLoad;
      if (autoContinue) {
        console.log('[watch loadToken] 读档后自动继续已启用，延迟触发继续');
        // 延迟一小段时间让用户看到恢复的状态，然后自动继续
        setTimeout(() => {
          store.advance();
        }, 300);
      }
      return; // 不执行脚本，状态已在 load() 中通过 hydrate 恢复
    }

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

function backToTitle() {
  void router.push('/');
}

function quickSave(slotNum: number) {
  const slot = `quicksave:${slotNum}`;
  void store.save(slot);
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
  void runSceneLoop(sceneName, frame); // 保持进度
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
    void runSceneLoop(sceneName, frame); // 保持进度
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
