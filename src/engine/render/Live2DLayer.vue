<template>
  <div v-if="hasLive2DActors || system" class="live2d-layer">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, onBeforeUnmount, computed } from 'vue';
import { getLive2DBackend } from '../live2d/runtime';
import { Live2DSystem } from '../live2d/system';
import { useEngineStore } from 'stores/engine-store';
import { useSettingsStore } from 'stores/settings-store';
import { useLive2DDebugStore } from 'stores/live2d-debug-store';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const store = useEngineStore();
const settingsStore = useSettingsStore();
const debugStore = useLive2DDebugStore();
const backend = getLive2DBackend();
let system: Live2DSystem | null = null;
let resizeObserver: ResizeObserver | null = null;

// 初始化 Live2D 系统
function initSystem() {
  if (system || !canvasRef.value) return;

  const rect = canvasRef.value.parentElement?.getBoundingClientRect();
  backend.init({
    canvas: canvasRef.value,
    width: rect?.width || 1280,
    height: rect?.height || 720,
  });

  system = new Live2DSystem(backend, {
    onInspect: (actorId, inspection) => debugStore.setInspection(actorId, inspection),
    onSnapshot: (actorId, snapshot) => debugStore.setSnapshot(actorId, snapshot),
    onMotionStart: (actorId, e) => {
      void store.dispatch('live2d', {
        actorId,
        motionDuration: e.durationMs ?? 0,
        motionStartTime: e.startTimeMs,
        motionGroup: e.group,
        motionIndex: e.index,
      });
    },
    onMotionFinish: (actorId, e) => {
      void store.dispatch('live2d', {
        actorId,
        motionFinishTime: e.finishTimeMs,
      });
    },
  });

  // 立即同步当前状态
  void system.syncActors(store.state.actors);
}

// 销毁 Live2D 系统
function disposeSystem() {
  if (!system) return;

  system = null;
  backend.dispose();

  // 清理调试信息
  for (const actorId of Object.keys(store.state.actors || {})) {
    debugStore.clearActor(actorId);
  }
}

// 检查是否有活跃的 Live2D 角色
const hasLive2DActors = computed(() => {
  const actors = store.state.actors || {};
  return Object.values(actors).some((a) => a.mode === 'live2d' && a.live2d?.modelId);
});

// 监听是否应该卸载
watch(
  [() => settingsStore.displaySettings.autoUnloadLive2D, hasLive2DActors],
  ([autoUnload, hasActors]) => {
    if (!hasActors) {
      if (autoUnload) {
        disposeSystem();
      } else {
        backend.pause?.();
      }
      return;
    }

    initSystem();
    backend.resume?.();
  },
  { immediate: true },
);

onMounted(() => {
  if (canvasRef.value) {
    // 初始加载由 watch 处理，这里只处理 ResizeObserver
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
    // 如果系统已卸载，不进行同步（由上述 watch 负责在需要时重新初始化）
    void system?.syncActors(actors);
  },
  { deep: true },
);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  disposeSystem();
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
