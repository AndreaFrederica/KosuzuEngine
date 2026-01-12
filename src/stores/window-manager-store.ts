import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

/** 窗口控制函数 - 由组件提供 */
export interface WindowControls {
  show: () => void | Promise<void>;
  hide: () => void | Promise<void>;
  toggle: () => void | Promise<void>;
  minimize: () => void | Promise<void>;
  restore: () => void | Promise<void>;
  moveTo: (x: number, y: number) => void | Promise<void>;
  resize: (w: number, h: number) => void | Promise<void>;
}

/** 窗口定义 - 用于注册窗口模板 */
export interface WindowDefinition {
  /** 窗口唯一标识 */
  id: string;
  /** 窗口标题 */
  title: string;
  /** 存储 key */
  storageKey: string;
  /** 窗口组件 (异步加载) */
  component: () => Promise<{ default: unknown }>;
  /** 初始位置 */
  initialPos?: { x: number; y: number };
  /** 初始尺寸 */
  initialSize?: { w: number; h: number };
  /** 窗口类名 */
  windowClass?: string;
  /** 最小宽度 */
  minWidth?: number;
  /** 最小高度 */
  minHeight?: number;
  /** 是否可调整大小 */
  resizable?: boolean;
}

/** 窗口实例 - 已挂载的窗口 */
export interface WindowInstance {
  /** 窗口定义 ID */
  id: string;
  /** 窗口标题 */
  title: string;
  /** 是否可见 */
  visible: boolean;
  /** 是否最小化 */
  minimized: boolean;
  /** 窗口位置 */
  pos: { x: number; y: number };
  /** 窗口尺寸 */
  size: { w: number; h: number };
  /** 存储 key */
  storageKey: string;
  /** 控制函数引用 */
  controls: WindowControls;
}

/** 合并的窗口信息（用于 UI 显示） */
export interface WindowInfo extends WindowInstance {
  /** 是否已挂载 */
  mounted: boolean;
}

export const useWindowManagerStore = defineStore('windowManager', () => {
  // Z-Index 管理
  const zIndexById = ref<Record<string, number>>({});
  const nextZ = ref(10_000);

  // 窗口定义注册表（窗口模板）
  const definitions = ref<Map<string, WindowDefinition>>(new Map());

  // 已挂载的窗口实例
  const instances = ref<Map<string, WindowInstance>>(new Map());

  // 窗口管理器可见性
  const managerVisible = ref(false);

  // 窗口管理器的 storage key（用于排除自身）
  const MANAGER_STORAGE_KEY = 'window:manager';

  // 待创建的窗口队列（用于异步组件加载）
  const pendingCreates = ref<Set<string>>(new Set());

  // 计算属性：所有窗口信息（定义 + 实例）
  const allWindows = computed(() => {
    const result: WindowInfo[] = [];

    // 添加所有定义的窗口模板
    for (const [id, def] of definitions.value) {
      if (def.storageKey === MANAGER_STORAGE_KEY) continue; // 排除管理器自身

      const instance = instances.value.get(id);
      const isPending = pendingCreates.value.has(id);

      result.push({
        id,
        title: def.title,
        storageKey: def.storageKey,
        visible: instance?.visible ?? false,
        minimized: instance?.minimized ?? false,
        pos: instance?.pos ?? { x: def.initialPos?.x ?? 100, y: def.initialPos?.y ?? 100 },
        size: instance?.size ?? { w: def.initialSize?.w ?? 500, h: def.initialSize?.h ?? 400 },
        controls: instance?.controls ?? {
          show: () => createWindow(id),
          hide: () => {},
          toggle: () => createWindow(id),
          minimize: () => {},
          restore: () => {},
          moveTo: () => {},
          resize: () => {},
        },
        mounted: !!instance || isPending,
      });
    }

    // 添加没有对应定义的已挂载实例（兼容旧代码 - FloatingWindow 自动注册）
    for (const [id, inst] of instances.value) {
      if (inst.storageKey === MANAGER_STORAGE_KEY) continue;
      if (!definitions.value.has(id)) {
        result.push({
          ...inst,
          mounted: true,
        });
      }
    }

    return result;
  });

  // 计算属性：可见的窗口列表
  const visibleWindows = computed(() => {
    return allWindows.value.filter(w => w.visible);
  });

  // ==================== Z-Index 管理 ====================

  function ensureNextAtLeast(v: number) {
    if (v > nextZ.value) nextZ.value = v;
  }

  function allocate(id: string, minZ = 0) {
    ensureNextAtLeast(minZ);
    const existing = zIndexById.value[id];
    if (typeof existing === 'number') return existing;
    const z = nextZ.value++;
    zIndexById.value = { ...zIndexById.value, [id]: z };
    return z;
  }

  function bringToFront(id: string, minZ = 0) {
    ensureNextAtLeast(minZ);
    const z = nextZ.value++;
    zIndexById.value = { ...zIndexById.value, [id]: z };
    return z;
  }

  function getZIndex(id: string, minZ = 0) {
    return zIndexById.value[id] ?? allocate(id, minZ);
  }

  // ==================== 窗口定义管理 ====================

  /** 注册窗口定义（窗口模板） */
  function defineWindow(definition: WindowDefinition) {
    definitions.value.set(definition.id, definition);
  }

  /** 批量注册窗口定义 */
  function defineWindows(defs: WindowDefinition[]) {
    defs.forEach(def => defineWindow(def));
  }

  /** 注销窗口定义 */
  function undefineWindow(id: string) {
    definitions.value.delete(id);
  }

  // ==================== 窗口实例管理 ====================

  /** 注册窗口实例（由 FloatingWindow 组件调用） */
  function registerWindow(instance: WindowInstance) {
    instances.value.set(instance.id, instance);
    pendingCreates.value.delete(instance.id);
  }

  /** 注销窗口实例 */
  function unregisterWindow(id: string) {
    instances.value.delete(id);
    delete zIndexById.value[id];
  }

  /** 更新窗口实例状态 */
  function updateWindow(id: string, updates: Partial<Omit<WindowInstance, 'id' | 'controls'>>) {
    const existing = instances.value.get(id);
    if (existing) {
      instances.value.set(id, { ...existing, ...updates });
    }
  }

  /** 获取窗口实例 */
  const getWindow = (id: string) => instances.value.get(id);

  /** 获取窗口定义 */
  const getDefinition = (id: string) => definitions.value.get(id);

  // ==================== 窗口创建/销毁 ====================

  /** 创建窗口（根据定义） */
  function createWindow(id: string) {
    const def = definitions.value.get(id);
    if (!def) {
      console.warn(`[WindowManager] Window definition not found: ${id}`);
      return;
    }

    const existing = instances.value.get(id);
    if (existing) {
      // 窗口已存在，只需显示
      void existing.controls.show();
      updateWindow(id, { visible: true, minimized: false });
      return;
    }

    // 标记为待创建
    pendingCreates.value.add(id);

    // 触发窗口创建事件，由全局监听器处理实际的组件挂载
    globalThis.dispatchEvent(new CustomEvent('window-manager:create', {
      detail: { id },
    }));
  }

  /** 销毁窗口 */
  function destroyWindow(id: string) {
    const instance = instances.value.get(id);
    if (instance) {
      void instance.controls.hide();
      // 等待过渡动画完成后注销
      setTimeout(() => {
        unregisterWindow(id);
        // 触发销毁事件
        globalThis.dispatchEvent(new CustomEvent('window-manager:destroy', {
          detail: { id },
        }));
      }, 100);
    }
  }

  // ==================== 窗口操作 ====================

  /** 显示窗口 */
  function showWindow(id: string) {
    const instance = instances.value.get(id);
    if (instance) {
      void instance.controls.show();
      updateWindow(id, { visible: true, minimized: false });
    } else {
      // 窗口未挂载，尝试创建
      createWindow(id);
    }
  }

  /** 隐藏窗口 */
  function hideWindow(id: string) {
    const instance = instances.value.get(id);
    if (instance) {
      void instance.controls.hide();
      updateWindow(id, { visible: false });
    }
  }

  /** 切换窗口可见性 */
  function toggleWindow(id: string) {
    const instance = instances.value.get(id);
    if (instance) {
      if (instance.visible) {
        hideWindow(id);
      } else {
        showWindow(id);
      }
    } else {
      createWindow(id);
    }
  }

  /** 最小化窗口 */
  function minimizeWindow(id: string) {
    const instance = instances.value.get(id);
    if (instance) {
      void instance.controls.minimize();
      updateWindow(id, { minimized: true });
    }
  }

  /** 恢复窗口 */
  function restoreWindow(id: string) {
    const instance = instances.value.get(id);
    if (instance) {
      void instance.controls.restore();
      updateWindow(id, { minimized: false });
      bringToFront(id);
    }
  }

  /** 移动窗口到指定位置 */
  function moveWindow(id: string, x: number, y: number) {
    const instance = instances.value.get(id);
    if (instance) {
      void instance.controls.moveTo(x, y);
      updateWindow(id, { pos: { x, y } });
    }
  }

  /** 调整窗口大小 */
  function resizeWindow(id: string, w: number, h: number) {
    const instance = instances.value.get(id);
    if (instance) {
      void instance.controls.resize(w, h);
      updateWindow(id, { size: { w, h } });
    }
  }

  /** 将所有窗口排列成网格 */
  function arrangeGrid() {
    const visible = visibleWindows.value;
    if (visible.length === 0) return;

    const cols = Math.ceil(Math.sqrt(visible.length));
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const cellWidth = viewportWidth / cols;
    const cellHeight = viewportHeight / Math.ceil(visible.length / cols);

    visible.forEach((win, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = col * cellWidth + 20;
      const y = row * cellHeight + 20;
      moveWindow(win.id, x, y);
    });
  }

  /** 层叠所有窗口 */
  function cascadeWindows() {
    const visible = visibleWindows.value;
    if (visible.length === 0) return;

    const offsetX = 30;
    const offsetY = 30;
    const startX = 50;
    const startY = 50;

    visible.forEach((win, index) => {
      const x = startX + index * offsetX;
      const y = startY + index * offsetY;
      moveWindow(win.id, x, y);
    });
  }

  /** 最小化所有窗口 */
  function minimizeAll() {
    visibleWindows.value.forEach(win => minimizeWindow(win.id));
  }

  /** 恢复所有窗口 */
  function restoreAll() {
    Array.from(instances.value.values()).forEach(win => {
      if (win.visible && win.minimized) {
        restoreWindow(win.id);
      }
    });
  }

  /** 关闭所有窗口 */
  function hideAll() {
    visibleWindows.value.forEach(win => hideWindow(win.id));
  }

  // ==================== 窗口管理器 UI ====================

  /** 显示窗口管理器 */
  function showManager() {
    managerVisible.value = true;
  }

  /** 隐藏窗口管理器 */
  function hideManager() {
    managerVisible.value = false;
  }

  /** 切换窗口管理器可见性 */
  function toggleManager() {
    managerVisible.value = !managerVisible.value;
  }

  return {
    // Z-Index
    allocate,
    bringToFront,
    getZIndex,

    // 窗口定义
    defineWindow,
    defineWindows,
    undefineWindow,
    getDefinition,

    // 窗口实例
    registerWindow,
    unregisterWindow,
    updateWindow,
    getWindow,

    // 窗口创建/销毁
    createWindow,
    destroyWindow,

    // 窗口操作
    showWindow,
    hideWindow,
    toggleWindow,
    minimizeWindow,
    restoreWindow,
    moveWindow,
    resizeWindow,

    // 批量操作
    arrangeGrid,
    cascadeWindows,
    minimizeAll,
    restoreAll,
    hideAll,

    // 管理器 UI
    managerVisible,
    showManager,
    hideManager,
    toggleManager,

    // 计算属性
    visibleWindows,
    allWindows,

    // 状态
    pendingCreates,
  };
});
