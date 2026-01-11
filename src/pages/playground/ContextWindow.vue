<template>
  <div
    v-if="open"
    ref="winEl"
    class="ctx-window bg-grey-10 text-white"
    :style="{
      left: `${pos.x}px`,
      top: `${pos.y}px`,
      width: `${size.w}px`,
      height: minimized ? '40px' : `${size.h}px`,
    }"
  >
    <div class="ctx-header row items-center q-px-sm" @pointerdown="startDrag">
      <div class="text-body2 text-weight-bold">Context</div>
      <q-space />
      <q-btn
        flat
        round
        dense
        size="sm"
        :icon="minimized ? 'unfold_more' : 'unfold_less'"
        @click="toggleMin"
      />
      <q-btn flat round dense size="sm" icon="close" @click="close" />
    </div>

    <div v-show="!minimized" class="ctx-body">
      <q-tabs
        v-model="tab"
        dense
        active-color="primary"
        indicator-color="primary"
        class="bg-grey-9"
      >
        <q-tab name="engine" label="Engine" />
        <q-tab name="live2d" label="Live2D Raw" />
      </q-tabs>
      <q-separator />
      <div class="ctx-content">
        <div v-if="tab === 'engine'" class="q-pa-sm">
          <q-input v-model="filter" dense filled placeholder="Filter (JSON text)" class="q-mb-sm" />
          <pre class="ctx-pre">{{ filteredEngineJson }}</pre>
        </div>
        <div v-else class="q-pa-sm">
          <div class="text-caption q-mb-sm">Actor: {{ actorId }}</div>
          <pre class="ctx-pre">{{ live2dJson }}</pre>
        </div>
      </div>
    </div>

    <div v-show="!minimized" class="ctx-resize-hint" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useEngineStore } from 'stores/engine-store';
import { useLive2DDebugStore } from 'stores/live2d-debug-store';

const props = defineProps<{
  modelValue: boolean;
  actorId: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void;
}>();

const store = useEngineStore();
const live2dDebug = useLive2DDebugStore();

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const tab = ref<'engine' | 'live2d'>('engine');
const filter = ref('');

const winEl = ref<HTMLElement | null>(null);
const pos = reactive({ x: 24, y: 72 });
const size = reactive({ w: 520, h: 420 });
const minimized = ref(false);

const STORAGE_KEY = 'playground:contextWindow';

function loadLayout() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as {
      pos?: { x: number; y: number };
      size?: { w: number; h: number };
      minimized?: boolean;
    };
    if (parsed.pos) {
      pos.x = parsed.pos.x;
      pos.y = parsed.pos.y;
    }
    if (parsed.size) {
      size.w = parsed.size.w;
      size.h = parsed.size.h;
    }
    if (typeof parsed.minimized === 'boolean') minimized.value = parsed.minimized;
  } catch {
    return;
  }
}

function saveLayout() {
  const payload = {
    pos: { ...pos },
    size: { ...size },
    minimized: minimized.value,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

loadLayout();

watch([() => pos.x, () => pos.y, () => size.w, () => size.h, () => minimized.value], saveLayout);

const engineJson = computed(() => {
  const state = store.state;
  return JSON.stringify(state, null, 2);
});

const filteredEngineJson = computed(() => {
  const f = filter.value.trim();
  if (!f) return engineJson.value;
  const lines = engineJson.value.split('\n');
  return lines.filter((l) => l.toLowerCase().includes(f.toLowerCase())).join('\n') || '// no match';
});

const live2dJson = computed(() => {
  const snap = live2dDebug.snapshots[props.actorId];
  return snap ? JSON.stringify(snap, null, 2) : '// no live2d snapshot';
});

let dragging = false;
let dragStart = { x: 0, y: 0 };
let origin = { x: 0, y: 0 };

function startDrag(e: PointerEvent) {
  if ((e.target as HTMLElement)?.closest('.q-btn')) return;
  dragging = true;
  dragStart = { x: e.clientX, y: e.clientY };
  origin = { x: pos.x, y: pos.y };
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  window.addEventListener('pointermove', onDragMove, { passive: true });
  window.addEventListener('pointerup', onDragEnd, { passive: true, once: true });
}

function onDragMove(e: PointerEvent) {
  if (!dragging) return;
  pos.x = origin.x + (e.clientX - dragStart.x);
  pos.y = origin.y + (e.clientY - dragStart.y);
}

function onDragEnd() {
  dragging = false;
  window.removeEventListener('pointermove', onDragMove);
}

function toggleMin() {
  minimized.value = !minimized.value;
}

function close() {
  open.value = false;
}

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onDragMove);
});

onMounted(() => {
  if (!winEl.value) return;
  const ro = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (!entry) return;
    if (minimized.value) return;
    const r = entry.contentRect;
    size.w = Math.max(320, Math.round(r.width));
    size.h = Math.max(220, Math.round(r.height));
  });
  ro.observe(winEl.value);
  onBeforeUnmount(() => ro.disconnect());
});
</script>

<style scoped>
.ctx-window {
  position: absolute;
  z-index: 30;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35);
  overflow: hidden;
  resize: both;
}

.ctx-header {
  height: 40px;
  cursor: grab;
  user-select: none;
  background: rgba(255, 255, 255, 0.06);
}

.ctx-body {
  height: calc(100% - 40px);
  display: flex;
  flex-direction: column;
}

.ctx-content {
  flex: 1;
  overflow: auto;
}

.ctx-pre {
  margin: 0;
  font-size: 12px;
  line-height: 1.35;
  white-space: pre-wrap;
  word-break: break-word;
}

.ctx-resize-hint {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 12px;
  height: 12px;
}
</style>
