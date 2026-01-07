<template>
  <q-page class="column items-stretch q-pa-none">
    <div class="col stage-container">
      <StageView :debug="showDebug" @stage-click="onStageClick">
        <template #overlay>
          <DialogBox
            v-if="showDialog"
            @back="store.back?.()"
            @restart="restartScene"
            @open-context="showContext = !showContext"
            @open-debug="showDebug = !showDebug"
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
          <SaveLoadPanel :visible="showSL" :mode="slMode" @close="showSL = false" />
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
import HistoryPanel from '../engine/render/HistoryPanel.vue';
import SaveLoadPanel from '../engine/render/SaveLoadPanel.vue';
import { onMounted, ref } from 'vue';
import { useEngineStore } from 'stores/engine-store';
import { loadPersistedProgress, clearPersistedProgress } from '../engine/core/Persistence';
import { scene1, scene2 } from '../scripts/scene1';
import { defaultRuntime } from '../engine/core/Runtime';
const showDebug = ref(false);
const showContext = ref(false);
const showHistory = ref(false);
const showDialog = ref(true);
const showSL = ref(false);
const slMode = ref<'save' | 'load'>('save');
const store = useEngineStore();

const scenes = {
  scene1,
  scene2,
} as const;
type SceneName = keyof typeof scenes;

async function runSceneLoop(initialScene: SceneName, initialFrame: number) {
  let nextScene: SceneName | null = initialScene;
  let nextFrame = initialFrame;
  while (nextScene) {
    const name = nextScene;
    nextScene = null;
    const result = await startSceneFromFrame(name, nextFrame);
    nextFrame = 0;
    const maybeNext = (result || '').trim();
    if (maybeNext && maybeNext in scenes) {
      nextScene = maybeNext as SceneName;
    }
  }
}

async function startSceneFromFrame(sceneName: SceneName, frame: number) {
  defaultRuntime.reset();
  if (frame > 0) defaultRuntime.replayToFrame(frame);
  await store.dispatch('scene', sceneName);
  return scenes[sceneName]();
}

onMounted(() => {
  const progress = loadPersistedProgress();
  const sceneName: SceneName =
    progress?.scene && progress.scene in scenes ? (progress.scene as SceneName) : 'scene1';
  const frame = progress?.scene === sceneName ? progress.frame : 0;
  void runSceneLoop(sceneName, frame);
});
function onStageClick() {
  if (!showDialog.value) showDialog.value = true;
}

function restartScene() {
  clearPersistedProgress();
  showDialog.value = true;
  void runSceneLoop('scene1', 0);
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
