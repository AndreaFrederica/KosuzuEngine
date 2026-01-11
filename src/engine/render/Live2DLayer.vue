<template>
  <div class="live2d-layer">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, onBeforeUnmount } from 'vue';
import { getLive2DBackend } from '../live2d/runtime';
import { Live2DSystem } from '../live2d/system';
import { useEngineStore } from 'stores/engine-store';
import { useLive2DDebugStore } from 'stores/live2d-debug-store';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const store = useEngineStore();
const debugStore = useLive2DDebugStore();
const backend = getLive2DBackend();
let system: Live2DSystem | null = null;
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (canvasRef.value) {
    const rect = canvasRef.value.parentElement?.getBoundingClientRect();
    backend.init({
      canvas: canvasRef.value,
      width: rect?.width || 1280,
      height: rect?.height || 720,
    });
    system = new Live2DSystem(backend, {
      onInspect: (actorId, inspection) => debugStore.setInspection(actorId, inspection),
      onSnapshot: (actorId, snapshot) => debugStore.setSnapshot(actorId, snapshot),
    });
    const el = canvasRef.value.parentElement ?? canvasRef.value;
    resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const r = entry.contentRect;
      backend.resize(r.width || 1280, r.height || 720);
    });
    resizeObserver.observe(el);
  }
});

watch(
  () => store.state.actors,
  (actors) => {
    void system?.syncActors(actors);
  },
  { deep: true },
);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  for (const actorId of Object.keys(store.state.actors || {})) {
    debugStore.clearActor(actorId);
  }
  system = null;
  backend.dispose();
});
</script>

<style scoped>
.live2d-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
canvas {
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
}
</style>
