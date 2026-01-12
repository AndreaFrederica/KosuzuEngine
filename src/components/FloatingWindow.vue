<template>
  <teleport to="body">
    <div
      v-if="open"
      ref="winEl"
      class="fw-window"
      :class="windowClass"
      @pointerdown="focus"
      :style="{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: `${size.w}px`,
        height: minimized ? `${headerHeight}px` : `${size.h}px`,
        zIndex: currentZ,
      }"
    >
      <div class="fw-header row items-center q-px-sm" @pointerdown="startDrag">
        <div class="text-body2 text-weight-bold">{{ title }}</div>
        <q-space />
        <q-btn
          v-if="showMinimize"
          flat
          round
          dense
          size="sm"
          :icon="minimized ? 'unfold_more' : 'unfold_less'"
          @click="toggleMin"
        />
        <q-btn v-if="showClose" flat round dense size="sm" icon="close" @click="close" />
      </div>

      <div
        v-show="!minimized"
        class="fw-body"
        :style="{ height: `calc(100% - ${headerHeight}px)` }"
      >
        <slot />
      </div>

      <div
        v-show="!minimized && resizable"
        class="fw-resize-hint"
        @pointerdown.stop.prevent="startResize"
      />
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useWindowManagerStore } from 'stores/window-manager-store';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    title: string;
    storageKey: string;
    windowId?: string;
    initialPos?: { x: number; y: number };
    initialSize?: { w: number; h: number };
    windowClass?: string;
    minWidth?: number;
    minHeight?: number;
    headerHeight?: number;
    resizable?: boolean;
    zIndex?: number;
    showMinimize?: boolean;
    showClose?: boolean;
  }>(),
  {
    initialPos: () => ({ x: 24, y: 72 }),
    initialSize: () => ({ w: 520, h: 420 }),
    windowClass: '',
    minWidth: 320,
    minHeight: 220,
    headerHeight: 40,
    resizable: true,
    zIndex: 9999,
    showMinimize: true,
    showClose: true,
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void;
}>();

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const wm = useWindowManagerStore();

const effectiveId = computed(() => props.windowId ?? props.storageKey);
const currentZ = ref(wm.getZIndex(effectiveId.value, props.zIndex));

watch(
  [effectiveId, () => props.zIndex],
  ([id, minZ]) => {
    currentZ.value = wm.getZIndex(id, minZ);
  },
  { immediate: true },
);

watch(
  open,
  (v) => {
    if (!v) return;
    currentZ.value = wm.bringToFront(effectiveId.value, props.zIndex);
  },
  { immediate: true },
);

const winEl = ref<HTMLElement | null>(null);
const pos = reactive({ x: props.initialPos.x, y: props.initialPos.y });
const size = reactive({ w: props.initialSize.w, h: props.initialSize.h });
const minimized = ref(false);

function recenter() {
  const vw = Math.max(1, window.innerWidth);
  const vh = Math.max(1, window.innerHeight);
  const x = Math.round((vw - size.w) / 2);
  const y = Math.round((vh - size.h) / 2);
  pos.x = x;
  pos.y = y;
  clampToViewport();
}

function clampToViewport() {
  const padding = 8;
  const vw = Math.max(1, window.innerWidth);
  const vh = Math.max(1, window.innerHeight);

  const minX = padding;
  const minY = padding;
  const maxX = Math.max(minX, vw - size.w - padding);
  const maxY = Math.max(
    minY,
    vh - (minimized.value ? props.headerHeight : props.headerHeight) - padding,
  );

  pos.x = Math.min(Math.max(pos.x, minX), maxX);
  pos.y = Math.min(Math.max(pos.y, minY), maxY);
}

function ensureVisible() {
  const vw = Math.max(1, window.innerWidth);
  const vh = Math.max(1, window.innerHeight);

  const headerH = props.headerHeight;
  const offscreenX = pos.x + size.w < 0 || pos.x > vw;
  const offscreenY = pos.y + headerH < 0 || pos.y > vh;
  if (offscreenX || offscreenY) {
    recenter();
    return;
  }
  clampToViewport();
}

function focus() {
  currentZ.value = wm.bringToFront(effectiveId.value, props.zIndex);
}

function loadLayout() {
  try {
    const raw = localStorage.getItem(props.storageKey);
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
  localStorage.setItem(props.storageKey, JSON.stringify(payload));
}

loadLayout();

watch([() => pos.x, () => pos.y, () => size.w, () => size.h, () => minimized.value], saveLayout);

// Update window manager when state changes
watch([open, minimized, () => pos.x, () => pos.y, () => size.w, () => size.h], ([v, min, x, y, w, h]) => {
  wm.updateWindow(effectiveId.value, {
    visible: v,
    minimized: min,
    pos: { x, y },
    size: { w, h },
  });
});

let dragging = false;
let dragStart = { x: 0, y: 0 };
let origin = { x: 0, y: 0 };

let resizing = false;
let resizeStart = { x: 0, y: 0 };
let sizeOrigin = { w: 0, h: 0 };

function startDrag(e: PointerEvent) {
  if ((e.target as HTMLElement)?.closest('.q-btn')) return;
  if (!minimized.value && winEl.value) {
    const r = winEl.value.getBoundingClientRect();
    size.w = Math.max(props.minWidth, Math.round(r.width));
    size.h = Math.max(props.minHeight, Math.round(r.height));
  }
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
  ensureVisible();
}

function startResize(e: PointerEvent) {
  if (!props.resizable) return;
  if (minimized.value) return;
  resizing = true;
  resizeStart = { x: e.clientX, y: e.clientY };
  sizeOrigin = { w: size.w, h: size.h };
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  window.addEventListener('pointermove', onResizeMove, { passive: true });
  window.addEventListener('pointerup', onResizeEnd, { passive: true, once: true });
}

function onResizeMove(e: PointerEvent) {
  if (!resizing) return;
  size.w = Math.max(props.minWidth, Math.round(sizeOrigin.w + (e.clientX - resizeStart.x)));
  size.h = Math.max(props.minHeight, Math.round(sizeOrigin.h + (e.clientY - resizeStart.y)));
}

function onResizeEnd() {
  resizing = false;
  window.removeEventListener('pointermove', onResizeMove);
  ensureVisible();
}

function toggleMin() {
  minimized.value = !minimized.value;
}

function close() {
  open.value = false;
}

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onDragMove);
  window.removeEventListener('pointermove', onResizeMove);
  // Unregister from window manager
  wm.unregisterWindow(effectiveId.value);
});

onMounted(() => {
  // Register window with window manager
  wm.registerWindow({
    id: effectiveId.value,
    title: props.title,
    visible: open.value,
    minimized: minimized.value,
    pos: { ...pos },
    size: { ...size },
    storageKey: props.storageKey,
    controls: {
      show: () => { open.value = true; },
      hide: () => { open.value = false; },
      toggle: () => { open.value = !open.value; },
      minimize: () => { minimized.value = true; },
      restore: () => { minimized.value = false; },
      moveTo: (x: number, y: number) => { pos.x = x; pos.y = y; },
      resize: (w: number, h: number) => { size.w = w; size.h = h; },
    },
  });

  void nextTick(() => {
    ensureVisible();
  });

  const onWinResize = () => ensureVisible();
  window.addEventListener('resize', onWinResize, { passive: true });
  onBeforeUnmount(() => window.removeEventListener('resize', onWinResize));

  let ro: ResizeObserver | null = null;
  let observedEl: HTMLElement | null = null;
  let isUpdatingFromRO = false;

  const ensureObserved = () => {
    if (!open.value) return;
    if (minimized.value) return;
    const el = winEl.value;
    if (!el) return;

    if (!ro) {
      ro = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (!open.value) return;
        if (minimized.value) return;
        if (isUpdatingFromRO) return;

        // Use borderBoxSize to get the full element size including borders
        // This matches what we set via inline style (width/height)
        let nextW: number;
        let nextH: number;

        if (entry.borderBoxSize && entry.borderBoxSize[0]) {
          // borderBoxSize is available (modern browsers)
          nextW = Math.round(entry.borderBoxSize[0].inlineSize);
          nextH = Math.round(entry.borderBoxSize[0].blockSize);
        } else if (entry.contentRect) {
          // Fallback: contentRect doesn't include borders, so we need to add them
          const computedStyle = window.getComputedStyle(winEl.value!);
          const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0;
          const borderRight = parseFloat(computedStyle.borderRightWidth) || 0;
          const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
          const borderBottom = parseFloat(computedStyle.borderBottomWidth) || 0;
          nextW = Math.round(entry.contentRect.width + borderLeft + borderRight);
          nextH = Math.round(entry.contentRect.height + borderTop + borderBottom);
        } else {
          return;
        }

        if (nextW <= 0 || nextH <= 0) return;
        nextW = Math.max(props.minWidth, nextW);
        nextH = Math.max(props.minHeight, nextH);

        if (nextW !== size.w || nextH !== size.h) {
          isUpdatingFromRO = true;
          if (nextW !== size.w) size.w = nextW;
          if (nextH !== size.h) size.h = nextH;
          requestAnimationFrame(() => {
            isUpdatingFromRO = false;
          });
        }
        ensureVisible();
      });
    }

    if (observedEl && observedEl !== el) {
      ro.unobserve(observedEl);
      observedEl = null;
    }

    if (!observedEl) {
      observedEl = el;
      ro.observe(el);
    }
  };

  const stopObserving = () => {
    if (!ro) return;
    if (observedEl) {
      ro.unobserve(observedEl);
      observedEl = null;
    }
  };

  watch(
    [open, minimized],
    async ([isOpen, isMin]) => {
      if (!isOpen || isMin) {
        stopObserving();
        return;
      }
      await nextTick();
      ensureObserved();
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    stopObserving();
    ro?.disconnect();
    ro = null;
  });
});
</script>

<style scoped>
.fw-window {
  position: fixed;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35);
  overflow: hidden;
}

.fw-window * {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.25) rgba(255, 255, 255, 0.06);
}

.fw-window ::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.fw-window ::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 4px;
}

.fw-window ::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.22);
  border-radius: 4px;
}

.fw-window ::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.35);
}

.fw-header {
  cursor: grab;
  user-select: none;
  background: rgba(255, 255, 255, 0.06);
}

.fw-body {
  display: flex;
  flex-direction: column;
}

::v-slotted(.fw-content) {
  flex: 1;
  overflow: auto;
}

::v-slotted(.fw-pre) {
  margin: 0;
  font-size: 12px;
  line-height: 1.35;
  white-space: pre-wrap;
  word-break: break-word;
}

.fw-resize-hint {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 16px;
  height: 16px;
  pointer-events: auto;
  cursor: se-resize;
}
</style>
