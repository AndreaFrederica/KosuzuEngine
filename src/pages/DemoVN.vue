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
  if (replay && replay.actions) {
    const plan: { actions: NonNullable<PersistedProgress['actions']>; choices?: string[] } = {
      actions: replay.actions,
    };
    if (Array.isArray(replay.choices)) plan.choices = replay.choices;
    defaultRuntime.beginReplay(plan);
  } else if (frame > 0) {
    defaultRuntime.replayToFrame(frame);
  }
  await store.dispatch('scene', sceneName);
  return scenes[sceneName]();
}

onMounted(() => {
  const progress = loadPersistedProgress();
  const restored = loadPersistedState();
  const sceneName: SceneName =
    progress?.scene && progress.scene in scenes ? (progress.scene as SceneName) : 'scene1';
  const frame = progress?.scene === sceneName ? progress.frame : 0;
  if (!Array.isArray(progress?.actions) && frame > 0 && restored?.scene === sceneName) {
    defaultRuntime.setReplayHistory(restored.history);
  }
  void runSceneLoop(sceneName, frame);
});

watch(
  () => store.loadToken(),
  () => {
    const p = store.loadProgress();
    const replay = store.loadReplay?.() ?? null;
    const scene = (p.scene && p.scene in scenes ? p.scene : 'scene1') as SceneName;
    const frame = typeof p.frame === 'number' ? p.frame : 0;
    if (!replay && frame > 0) defaultRuntime.setReplayHistory(store.state.history);
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
</script>

<style scoped>
.stage-container {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
</style>
