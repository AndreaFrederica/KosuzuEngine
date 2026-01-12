<template>
  <router-view />
  <WindowManager />
  <!-- 动态窗口容器 -->
  <component
    :is="win.component"
    v-for="win in activeWindows"
    :key="win.id"
    v-model="win.visible"
    v-bind="win.props"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, markRaw } from 'vue';
import WindowManager from 'components/WindowManager.vue';
import { useWindowManagerStore } from 'stores/window-manager-store';

const wmStore = useWindowManagerStore();

// 动态加载的窗口组件缓存
const windowComponents = ref<Map<string, { default: unknown }>>(new Map());

// 待创建的窗口
const pendingWindows = ref<Map<string, { visible: boolean; props: Record<string, unknown> }>>(new Map());

// 已激活的窗口（用于渲染）
const activeWindows = ref<Array<{ id: string; component: unknown; visible: boolean; props: Record<string, unknown> }>>([]);

// 监听窗口创建事件
function handleWindowCreate(e: Event) {
  const customEvent = e as CustomEvent<{ id: string }>;
  const { id } = customEvent.detail;

  const def = wmStore.getDefinition(id);
  if (!def) return;

  // 如果组件还没加载，先加载
  if (windowComponents.value.has(id)) {
    pendingWindows.value.set(id, { visible: true, props: { ...def } });
    updateActiveWindows();
    return;
  }

  // 加载组件
  def.component().then(module => {
    windowComponents.value.set(id, markRaw(module));
    pendingWindows.value.set(id, { visible: true, props: { ...def } });
    updateActiveWindows();
  }).catch(err => {
    console.error(`[App] Failed to load window component: ${id}`, err);
  });
}

// 监听窗口销毁事件
function handleWindowDestroy(e: Event) {
  const customEvent = e as CustomEvent<{ id: string }>;
  const { id } = customEvent.detail;

  pendingWindows.value.delete(id);
  windowComponents.value.delete(id);
  updateActiveWindows();
}

// 更新激活的窗口列表
function updateActiveWindows() {
  activeWindows.value = Array.from(pendingWindows.value.entries()).map(([id, data]) => ({
    id,
    component: windowComponents.value.get(id)?.default ?? null,
    visible: data.visible,
    props: data.props,
  }));
}

onMounted(() => {
  globalThis.addEventListener('window-manager:create', handleWindowCreate);
  globalThis.addEventListener('window-manager:destroy', handleWindowDestroy);
});

onBeforeUnmount(() => {
  globalThis.removeEventListener('window-manager:create', handleWindowCreate);
  globalThis.removeEventListener('window-manager:destroy', handleWindowDestroy);
});
</script>
