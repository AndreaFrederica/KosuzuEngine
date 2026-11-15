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
            @open-execution="showExecution = !showExecution"
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
          <ScriptExecutionViewer :visible="showExecution" @close="showExecution = false" />
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
import ScriptExecutionViewer from '../engine/debug/ScriptExecutionViewer.vue';
import HistoryPanel from '../engine/render/HistoryPanel.vue';
import SaveLoadPanel from '../engine/render/SaveLoadPanel.vue';
import SettingsPanel from '../engine/render/SettingsPanel.vue';
import AudioChannelsPanel from '../engine/render/AudioChannelsPanel.vue';
import AudioPrompt from '../engine/render/AudioPrompt.vue';
import { onMounted, ref, watch } from 'vue';
import { useEngineStore } from 'stores/engine-store';
import { useSettingsStore } from 'stores/settings-store';
import { clearPersistedProgress } from '../engine/core/Persistence';
import { scriptSession } from '../engine/script/ScriptSession';
import { defaultRuntime } from '../engine/core/Runtime';
import { initI18n, registerEngineStore } from '../engine/i18n';
import { useRouter, useRoute } from 'vue-router';
import { registerRouterNavigateCallback } from '../engine/core/BaseActor';
import { initNavigation } from '../engine/navigation';
const showDebug = ref(false);
const showContext = ref(false);
const showHistory = ref(false);
const showDialog = ref(true);
const showSL = ref(false);
const showConsole = ref(false);
const showExecution = ref(false);
const showSettings = ref(false);
const showAudioChannels = ref(false);
const slMode = ref<'save' | 'load'>('save');
const store = useEngineStore();
const settingsStore = useSettingsStore();
const router = useRouter();
const route = useRoute();

async function runSceneLoop(scene = 'scene1') {
  store.clearSkipScript();
  defaultRuntime.reset();
  await scriptSession.startGame(scene);
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

  void (async () => {
    const loadSlot = typeof route.query.load === 'string' ? route.query.load : null;
    if (loadSlot) {
      const r = await store.load(loadSlot);
      if (r.ok) {
        void router.replace('/demo');
      } else {
        alert(`读取存档失败：${loadSlot}`);
        void router.push('/saves');
      }
      return;
    }

    // Route changes preserve the live VM; full reload resumes the last VM snapshot.
    if (scriptSession.running) return;
    const latest = await defaultRuntime.getSaveData('__latest__');
    if (route.query.new !== '1' && latest?.script) {
      await store.load('__latest__');
      return;
    }
    await runSceneLoop();
  })();
});

watch(() => store.loadToken(), () => { showDialog.value = true; });
function onStageClick() {
  if (!showDialog.value) showDialog.value = true;
}

function restartScene() {
  clearPersistedProgress();
  showDialog.value = true;
  const scene = settingsStore.displaySettings.restartScope === 'currentScene'
    ? store.state.scene ?? 'scene1' : 'scene1';
  void runSceneLoop(scene);
}

function backToTitle() {
  void router.push('/');
}

function quickSave(slotNum: number) {
  const slot = `quicksave:${slotNum}`;
  void store.save(slot);
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
