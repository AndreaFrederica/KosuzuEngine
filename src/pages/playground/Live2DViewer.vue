<template>
  <div
    class="live2d-playground window-height relative-position"
    @drop.prevent="onDrop"
    @dragover.prevent
  >
    <q-splitter
      v-model="viewerSplitterModel"
      class="fit"
      :limits="[0, 100]"
      :disable="!toolsVisible"
      :separator-style="toolsVisible ? undefined : 'display:none;'"
    >
      <template #before>
        <div
          class="relative-position overflow-hidden fit"
          :style="{
            backgroundColor: bgColor,
            backgroundImage: bgImage ? `url(${bgImage})` : 'none',
            backgroundSize: 'cover',
          }"
        >
          <!-- Canvas Wrapper for Pan/Zoom -->
          <div
            class="full-width full-height"
            @wheel.prevent="onWheel"
            @mousedown="startDrag"
            @mousemove="onMouseMoveWrapper"
            @mouseup="stopDrag"
            @mouseleave="stopDrag"
          >
            <Live2DLayer />
          </div>

          <!-- Overlay Controls -->
          <div
            class="absolute-top-left playground-toolbar row items-center q-gutter-xs"
            style="z-index: 10"
          >
            <q-btn round dense unelevated color="primary" icon="add" @click="loaderOpen = true">
              <q-tooltip>Load Model</q-tooltip>
            </q-btn>
            <q-btn
              round
              dense
              unelevated
              color="info"
              icon="data_object"
              @click="ctxOpen = !ctxOpen"
            >
              <q-tooltip>Context</q-tooltip>
            </q-btn>
            <q-btn
              round
              dense
              unelevated
              color="grey-7"
              :icon="toolsVisible ? 'chevron_right' : 'chevron_left'"
              @click="toggleTools"
            >
              <q-tooltip>{{ toolsVisible ? '隐藏侧边栏' : '显示侧边栏' }}</q-tooltip>
            </q-btn>
            <q-btn
              round
              dense
              unelevated
              color="teal"
              :icon="showDialogBox ? 'chat_bubble' : 'chat_bubble_outline'"
              @click="showDialogBox = !showDialogBox"
            >
              <q-tooltip>Dialog Box</q-tooltip>
            </q-btn>
            <q-btn round dense unelevated color="secondary" icon="image" @click="bgOpen = true">
              <q-tooltip>Change Background</q-tooltip>
            </q-btn>
            <q-btn round dense unelevated color="warning" icon="restart_alt" @click="resetView">
              <q-tooltip>Reset View</q-tooltip>
            </q-btn>
            <q-btn
              round
              dense
              unelevated
              color="deep-orange"
              icon="bug_report"
              @click="showInternal = !showInternal"
            >
              <q-tooltip>Internal</q-tooltip>
            </q-btn>
            <q-btn round dense unelevated color="dark" icon="home" @click="goHome">
              <q-tooltip>返回主界面 / Back to Menu</q-tooltip>
            </q-btn>
          </div>

          <!-- Debug info overlay -->
          <div class="absolute-bottom-left playground-debug text-white">
            <div>Model: {{ currentModelId }}</div>
            <div>
              View: {{ view.scale.toFixed(2) }}x ({{ view.x.toFixed(0) }}, {{ view.y.toFixed(0) }})
            </div>
          </div>

          <AudioPrompt />
          <ScriptConsole :visible="showConsole" @close="showConsole = false" />
          <SaveLoadPanel :visible="showSL" :mode="slMode" @close="showSL = false" />
          <SettingsPanel :visible="showSettings" @close="showSettings = false" />
          <AudioChannelsPanel :visible="showAudioChannels" @close="showAudioChannels = false" />
          <HistoryPanel :visible="showHistory" @close="showHistory = false" />

          <div v-if="showDialogBox" class="absolute-bottom full-width" style="z-index: 20">
            <DialogBox
              @back="store.back?.()"
              @restart="store.reset()"
              @open-settings="showSettings = !showSettings"
              @open-audio="showAudioChannels = !showAudioChannels"
              @open-context="ctxOpen = !ctxOpen"
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
              @quick-save-1="store.save('quicksave:1')"
              @quick-save-2="store.save('quicksave:2')"
              @quick-save-3="store.save('quicksave:3')"
              @hide="showDialogBox = false"
            />
          </div>
        </div>
      </template>

      <template #after>
        <div
          class="column playground-sidebar text-white fit"
          style="min-width: 0"
          v-show="toolsVisible"
        >
          <div class="q-pa-xs">
            <q-btn-toggle
              v-model="panelMode"
              dense
              unelevated
              color="grey-8"
              toggle-color="primary"
              text-color="white"
              :options="[
                { label: 'Tabs', value: 'tabs' },
                { label: 'Both', value: 'both' },
              ]"
            />
          </div>

          <q-tabs
            v-if="panelMode === 'tabs'"
            v-model="tab"
            dense
            class="text-grey"
            active-color="primary"
            indicator-color="primary"
            align="justify"
          >
            <q-tab name="control" label="Controls" />
            <q-tab name="editor" label="Script" />
          </q-tabs>

          <q-separator />

          <q-splitter
            v-model="splitterModel"
            horizontal
            class="bg-grey-9 text-white col"
            :limits="[0, 100]"
            :disable="panelMode === 'tabs'"
            :separator-style="panelMode === 'tabs' ? 'display:none;' : undefined"
          >
            <template #before>
              <div class="fit q-pa-none" v-show="panelMode === 'both' || tab === 'control'">
                <ControlPanel
                  ref="controlPanel"
                  :model-id="currentModelId"
                  :actor="actor"
                  @copy="copyCode"
                />
              </div>
            </template>

            <template #after>
              <div
                class="fit q-pa-none"
                style="min-width: 0"
                v-show="panelMode === 'both' || tab === 'editor'"
              >
                <ScriptEditor ref="scriptEditor" :actor="actor" />
              </div>
            </template>
          </q-splitter>
        </div>
      </template>
    </q-splitter>

    <FloatingWindow
      v-model="showInternal"
      title="Live2D Internal"
      storage-key="playground:internalWindow"
      window-class="bg-grey-10 text-white"
      :initial-size="{ w: 420, h: 520 }"
    >
      <div class="fw-content q-pa-sm">
        <pre class="fw-pre">{{ internalText }}</pre>
      </div>
    </FloatingWindow>

    <!-- Dialogs -->
    <ContextWindow v-model="ctxOpen" :actor-id="currentModelId" />
    <ModelLoader v-model="loaderOpen" @load="loadModelSource" />

    <q-dialog v-model="bgOpen">
      <q-card style="min-width: 300px">
        <q-card-section>
          <div class="text-h6">Background Settings</div>
        </q-card-section>
        <q-card-section>
          <q-input filled v-model="bgColor" label="Color (Hex/Name)" class="q-mb-sm">
            <template v-slot:append>
              <q-icon name="colorize" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-color v-model="bgColor" />
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
          <q-input filled v-model="bgImage" label="Image URL" hint="Leave empty for color only" />
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, reactive, watch, computed, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useEngineStore } from 'stores/engine-store';
import { useLive2DDebugStore } from 'stores/live2d-debug-store';
import { getLive2DBackend } from '../../engine/live2d/runtime';
import Live2DLayer from '../../engine/render/Live2DLayer.vue';
import { CharacterActor } from '../../engine/core/BaseActor';
import { defaultRuntime } from '../../engine/core/Runtime';
import SettingsPanel from '../../engine/render/SettingsPanel.vue';
import AudioChannelsPanel from '../../engine/render/AudioChannelsPanel.vue';
import HistoryPanel from '../../engine/render/HistoryPanel.vue';
import SaveLoadPanel from '../../engine/render/SaveLoadPanel.vue';
import AudioPrompt from '../../engine/render/AudioPrompt.vue';
import ScriptConsole from '../../engine/debug/ScriptConsole.vue';
import ModelLoader from './ModelLoader.vue';
import ControlPanel from './ControlPanel.vue';
import ScriptEditor from './ScriptEditor.vue';
import ContextWindow from './ContextWindow.vue';
import FloatingWindow from 'components/FloatingWindow.vue';
import DialogBox from '../../engine/render/DialogBox.vue';

const store = useEngineStore();
const router = useRouter();
const live2dDebugStore = useLive2DDebugStore();
const backend = getLive2DBackend();

// State
const panelMode = ref<'tabs' | 'both'>('tabs');
const tab = ref('control');
const loaderOpen = ref(false);
const bgOpen = ref(false);
const ctxOpen = ref(false);
const showDialogBox = ref(false);
const showConsole = ref(false);
const showSettings = ref(false);
const showAudioChannels = ref(false);
const showHistory = ref(false);
const showSL = ref(false);
const slMode = ref<'save' | 'load'>('save');
const currentModelId = ref('playground_actor');
const bgColor = ref('#333333');
const bgImage = ref('');
const splitterModel = ref(50);
const toolsVisible = ref(true);
const viewerSplitterModel = ref(70);
const viewerSplitterModelBackup = ref(70);
const showInternal = ref(false);

function goHome() {
  void router.push('/title');
}

// View State (Pan/Zoom)
const view = reactive({ x: 0, y: 0, scale: 1 });
const isDragging = ref(false);
const lastMouse = { x: 0, y: 0 };

// Actor
const actor = new CharacterActor('Playground Actor', currentModelId.value, defaultRuntime);

const followMouse = computed(() => {
  const a = store.state.actors?.[currentModelId.value];
  return !!a?.live2d?.followMouse;
});

const internalText = computed(() => {
  const id = currentModelId.value;
  const actorState = store.state.actors?.[id];
  const inspection = live2dDebugStore.inspections[id];
  const snapshot = live2dDebugStore.snapshots[id];
  return JSON.stringify(
    {
      actor: actorState?.live2d,
      inspection: inspection?.debug,
      snapshot,
    },
    null,
    2,
  );
});

// Refs
const controlPanel = ref<InstanceType<typeof ControlPanel> | null>(null);
const scriptEditor = ref<InstanceType<typeof ScriptEditor> | null>(null);

type ScriptEditorExposed = {
  layout?: () => void;
};

function layoutScriptEditor() {
  void nextTick(() => {
    requestAnimationFrame(() => {
      (scriptEditor.value as unknown as ScriptEditorExposed | null)?.layout?.();
    });
  });
}

// Lifecycle
onMounted(() => {
  defaultRuntime.setSaveKeyPrefix('playground:save:');
  store.reset();
  // Initialize actor position to center
  void actor.show({ x: 0.5, y: 0.5 });
  void actor.setMode('live2d');

  // Load default model
  void loadModelSource(
    'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/shizuku/shizuku.model.json',
  );
});

onBeforeUnmount(() => {
  defaultRuntime.setSaveKeyPrefix('save:');
  void actor.hide();
  // Reset container transform
  const container = backend.getViewportContainer();
  container.position.set(0, 0);
  container.scale.set(1, 1);
});

// Watch view to update container transform
watch(view, () => {
  const container = backend.getViewportContainer();
  container.position.set(view.x, view.y);
  container.scale.set(view.scale, view.scale);
});

watch(
  [panelMode, tab],
  ([mode, t]) => {
    if (mode === 'tabs') {
      splitterModel.value = t === 'control' ? 100 : 0;
      layoutScriptEditor();
      return;
    }

    if (splitterModel.value <= 0 || splitterModel.value >= 100) {
      splitterModel.value = 50;
    }
    layoutScriptEditor();
  },
  { immediate: true },
);

watch(
  viewerSplitterModel,
  (v) => {
    if (toolsVisible.value && v < 100) viewerSplitterModelBackup.value = v;
    layoutScriptEditor();
  },
  { immediate: true },
);

watch(
  toolsVisible,
  (visible) => {
    if (visible) {
      viewerSplitterModel.value =
        viewerSplitterModelBackup.value >= 100 ? 70 : viewerSplitterModelBackup.value;
    } else {
      viewerSplitterModel.value = 100;
    }
    layoutScriptEditor();
  },
  { immediate: true },
);

function toggleTools() {
  toolsVisible.value = !toolsVisible.value;
}

// Logic
async function loadModelSource(source: string | File[]) {
  try {
    const id = currentModelId.value;

    // Register source with backend
    const normalizedSource =
      typeof source === 'string'
        ? source
            .trim()
            .replace(/^[`"']+/, '')
            .replace(/[`"']+$/, '')
            .trim()
        : source;
    backend.registerSource(id, normalizedSource);

    const curr = store.state.actors?.[id]?.transform ?? {};
    const x = typeof curr.x === 'number' ? curr.x : 0.5;
    const y = typeof curr.y === 'number' ? curr.y : 0.5;
    const scale = typeof curr.scale === 'number' ? curr.scale : 1;

    if (!store.state.actors?.[id]) {
      await actor.show({ x, y, scale, opacity: 0 });
    } else {
      await actor.move({ opacity: 0 }, { duration: 0 });
    }

    await actor.setLive2DModel(
      typeof normalizedSource === 'string' ? normalizedSource : 'local_files',
    );

    await actor.show({
      x,
      y,
      scale,
      opacity: 1,
    });
  } catch (e) {
    console.error('Failed to load model:', e);
    alert('Failed to load model. See console for details.');
  }
}

function copyCode(code: string) {
  void navigator.clipboard.writeText(code);
}

// Drag & Drop
function onDrop(e: DragEvent) {
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    const files = Array.from(e.dataTransfer.files);
    void loadModelSource(files);
  }
}

// View Control
function onWheel(e: WheelEvent) {
  const delta = -e.deltaY * 0.001;
  const newScale = Math.min(Math.max(0.1, view.scale + delta), 5);
  view.scale = newScale;
}

function startDrag(e: MouseEvent) {
  isDragging.value = true;
  lastMouse.x = e.clientX;
  lastMouse.y = e.clientY;
}

function onDrag(e: MouseEvent) {
  if (!isDragging.value) return;
  const dx = e.clientX - lastMouse.x;
  const dy = e.clientY - lastMouse.y;
  view.x += dx;
  view.y += dy;
  lastMouse.x = e.clientX;
  lastMouse.y = e.clientY;
}

function stopDrag() {
  isDragging.value = false;
}

let lastLookAtTs = 0;
function onMouseMove(e: MouseEvent) {
  if (!followMouse.value) return;
  const now = performance.now();
  if (now - lastLookAtTs < 16) return;
  lastLookAtTs = now;
  const el = e.currentTarget as HTMLElement;
  const rect = el.getBoundingClientRect();
  const rx = (e.clientX - rect.left) / Math.max(1, rect.width);
  const ry = (e.clientY - rect.top) / Math.max(1, rect.height);
  const nx = rx * 2 - 1;
  const ny = (ry * 2 - 1) * -1;
  void actor.lookAt(nx, ny);
}

function onMouseMoveWrapper(e: MouseEvent) {
  onDrag(e);
  onMouseMove(e);
}

function resetView() {
  view.x = 0;
  view.y = 0;
  view.scale = 1;
}
</script>

<style scoped>
:deep(.q-splitter__panel) {
  min-width: 0;
}

.playground-toolbar {
  margin: 10px;
  padding: 8px;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(10px);
}

.playground-debug {
  margin: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35);
  pointer-events: none;
}

.playground-sidebar {
  background: rgba(18, 18, 20, 0.96);
  border-left: 1px solid rgba(255, 255, 255, 0.08);
}
</style>
