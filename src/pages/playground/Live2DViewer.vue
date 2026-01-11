<template>
  <div class="live2d-playground row no-wrap window-height" @drop.prevent="onDrop" @dragover.prevent>
    <!-- Left: Preview -->
    <div
      class="col-8 relative-position overflow-hidden"
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
      <div class="absolute-top-left q-pa-sm row q-gutter-sm" style="z-index: 10">
        <q-btn round dense color="primary" icon="add" @click="loaderOpen = true">
          <q-tooltip>Load Model</q-tooltip>
        </q-btn>
        <q-btn round dense color="info" icon="data_object" @click="ctxOpen = !ctxOpen">
          <q-tooltip>Context</q-tooltip>
        </q-btn>
        <q-btn round dense color="secondary" icon="image" @click="bgOpen = true">
          <q-tooltip>Change Background</q-tooltip>
        </q-btn>
        <q-btn round dense color="warning" icon="restart_alt" @click="resetView">
          <q-tooltip>Reset View</q-tooltip>
        </q-btn>
      </div>

      <!-- Debug info overlay -->
      <div
        class="absolute-bottom-left text-white q-pa-sm"
        style="pointer-events: none; text-shadow: 1px 1px 2px black"
      >
        <div>Model: {{ currentModelId }}</div>
        <div>
          View: {{ view.scale.toFixed(2) }}x ({{ view.x.toFixed(0) }}, {{ view.y.toFixed(0) }})
        </div>
      </div>

      <ContextWindow v-model="ctxOpen" :actor-id="currentModelId" />
    </div>

    <!-- Right: Tools -->
    <div class="col-4 column bg-grey-9 text-white">
      <q-tabs
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

      <q-tab-panels v-model="tab" animated class="bg-grey-9 text-white col">
        <q-tab-panel name="control" class="q-pa-none">
          <ControlPanel
            ref="controlPanel"
            :model-id="currentModelId"
            :actor="actor"
            @copy="copyCode"
          />
        </q-tab-panel>

        <q-tab-panel name="editor" class="q-pa-none">
          <ScriptEditor ref="scriptEditor" :actor="actor" />
        </q-tab-panel>
      </q-tab-panels>
    </div>

    <!-- Dialogs -->
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
import { ref, onMounted, onBeforeUnmount, reactive, watch, computed } from 'vue';
import { useEngineStore } from 'stores/engine-store';
import { getLive2DBackend } from '../../engine/live2d/runtime';
import Live2DLayer from '../../engine/render/Live2DLayer.vue';
import { CharacterActor } from '../../engine/core/BaseActor';
import { defaultRuntime } from '../../engine/core/Runtime';
import ModelLoader from './ModelLoader.vue';
import ControlPanel from './ControlPanel.vue';
import ScriptEditor from './ScriptEditor.vue';
import ContextWindow from './ContextWindow.vue';

const store = useEngineStore();
const backend = getLive2DBackend();

// State
const tab = ref('control');
const loaderOpen = ref(false);
const bgOpen = ref(false);
const ctxOpen = ref(false);
const currentModelId = ref('playground_actor');
const bgColor = ref('#333333');
const bgImage = ref('');

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

// Refs
const controlPanel = ref<InstanceType<typeof ControlPanel> | null>(null);
const scriptEditor = ref<InstanceType<typeof ScriptEditor> | null>(null);

// Lifecycle
onMounted(() => {
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

// Logic
async function loadModelSource(source: string | File[]) {
  try {
    const id = currentModelId.value;

    // Register source with backend
    const normalizedSource =
      typeof source === 'string'
        ? source
            .trim()
            .replace(/^`+/, '')
            .replace(/`+$/, '')
            .replace(/^"+/, '')
            .replace(/"+$/, '')
            .trim()
        : source;
    backend.registerSource(id, normalizedSource);

    await actor.show({ opacity: 1 });

    await actor.setLive2DModel(
      typeof normalizedSource === 'string' ? normalizedSource : 'local_files',
    );
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
