<template>
  <FloatingWindow
    v-model="wmStore.managerVisible"
    title="Window Manager"
    storage-key="window:manager"
    :initial-size="{ w: 680, h: 520 }"
    :initial-pos="{ x: 100, y: 100 }"
    window-class="bg-grey-9 text-white"
    :show-close="true"
  >
    <!-- Toolbar -->
    <div class="wm-toolbar q-gutter-xs">
      <q-btn
        flat
        dense
        icon="grid_view"
        label="Grid"
        @click="wmStore.arrangeGrid"
        :disable="wmStore.visibleWindows.length === 0"
      >
        <q-tooltip>Arrange windows in grid</q-tooltip>
      </q-btn>
      <q-btn
        flat
        dense
        icon="view_day"
        label="Cascade"
        @click="wmStore.cascadeWindows"
        :disable="wmStore.visibleWindows.length === 0"
      >
        <q-tooltip>Cascade windows</q-tooltip>
      </q-btn>
      <q-separator vertical />
      <q-btn
        flat
        dense
        icon="minimize"
        label="Minimize All"
        @click="wmStore.minimizeAll"
        :disable="wmStore.visibleWindows.length === 0"
      >
        <q-tooltip>Minimize all visible windows</q-tooltip>
      </q-btn>
      <q-btn
        flat
        dense
        icon="restore"
        label="Restore All"
        @click="wmStore.restoreAll"
      >
        <q-tooltip>Restore all minimized windows</q-tooltip>
      </q-btn>
      <q-btn
        flat
        dense
        icon="close"
        label="Close All"
        @click="wmStore.hideAll"
        :disable="wmStore.visibleWindows.length === 0"
      >
        <q-tooltip>Hide all windows</q-tooltip>
      </q-btn>
      <q-space />
      <div class="text-caption text-grey-6 q-py-sm">
        Hotkey: Ctrl+{{ currentHotkey }}
      </div>
    </div>

    <q-separator />

    <!-- Window List -->
    <div class="fw-content">
      <div v-if="wmStore.allWindows.length === 0" class="wm-empty">
        <q-icon name="widgets" size="64px" color="grey-6" />
        <div class="text-grey-6 q-mt-md">No windows registered</div>
      </div>

      <q-list separator dense class="wm-list">
        <q-item
          v-for="win in wmStore.allWindows"
          :key="win.id"
          class="wm-window-item"
          :class="{ 'wm-window-item--visible': win.visible, 'wm-window-item--minimized': win.minimized }"
        >
          <!-- Window Info -->
          <q-item-section avatar>
            <q-icon
              :name="win.minimized ? 'minimize' : win.visible ? 'check_circle' : 'radio_button_unchecked'"
              :color="win.visible ? 'positive' : 'grey-6'"
            />
          </q-item-section>

          <q-item-section>
            <q-item-label>{{ win.title }}</q-item-label>
            <q-item-label caption>
              {{ win.storageKey }}
              <template v-if="win.visible">
                • {{ Math.round(win.size.w) }}×{{ Math.round(win.size.h) }}
                • ({{ Math.round(win.pos.x) }}, {{ Math.round(win.pos.y) }})
              </template>
            </q-item-label>
          </q-item-section>

          <!-- Actions -->
          <q-item-section side>
            <div class="row q-gutter-xs">
              <q-btn
                v-if="!win.visible"
                flat
                dense
                round
                size="sm"
                icon="visibility"
                color="positive"
                @click="wmStore.showWindow(win.id)"
              >
                <q-tooltip>Show window</q-tooltip>
              </q-btn>
              <q-btn
                v-if="win.visible && !win.minimized"
                flat
                dense
                round
                size="sm"
                icon="minimize"
                @click="wmStore.minimizeWindow(win.id)"
              >
                <q-tooltip>Minimize</q-tooltip>
              </q-btn>
              <q-btn
                v-if="win.visible && win.minimized"
                flat
                dense
                round
                size="sm"
                icon="restore"
                color="primary"
                @click="wmStore.restoreWindow(win.id)"
              >
                <q-tooltip>Restore</q-tooltip>
              </q-btn>
              <q-btn
                v-if="win.visible"
                flat
                dense
                round
                size="sm"
                icon="close"
                color="negative"
                @click="wmStore.hideWindow(win.id)"
              >
                <q-tooltip>Hide window</q-tooltip>
              </q-btn>
            </div>
          </q-item-section>
        </q-item>
      </q-list>

      <!-- Footer -->
      <q-separator />
      <div class="wm-footer q-px-md q-py-sm">
        <div class="text-caption text-grey">
          {{ wmStore.visibleWindows.length }} visible, {{ wmStore.allWindows.length }} total
        </div>
      </div>
    </div>
  </FloatingWindow>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed } from 'vue';
import { useWindowManagerStore } from 'stores/window-manager-store';
import { useSettingsStore } from 'stores/settings-store';
import FloatingWindow from 'components/FloatingWindow.vue';

const wmStore = useWindowManagerStore();
const settingsStore = useSettingsStore();

// 当前快捷键
const currentHotkey = computed(() => settingsStore.displaySettings.windowManagerHotkey);

function handleKeyDown(e: KeyboardEvent) {
  // Ctrl + hotkey 或 Cmd + hotkey (Mac)
  if ((e.ctrlKey || e.metaKey) && e.key === currentHotkey.value) {
    e.preventDefault();
    wmStore.toggleManager();
  }
  // Escape to close
  if (e.key === 'Escape' && wmStore.managerVisible) {
    wmStore.hideManager();
  }
}

onMounted(() => {
  globalThis.addEventListener('keydown', handleKeyDown);
});

onBeforeUnmount(() => {
  globalThis.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
.wm-toolbar {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
}

.wm-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  min-height: 300px;
}

.wm-list {
  background: transparent;
}

.wm-window-item {
  transition: background-color 0.15s;
}

.wm-window-item:hover {
  background: rgba(255, 255, 255, 0.04);
}

.wm-window-item--visible {
  background: rgba(76, 175, 80, 0.08);
}

.wm-window-item--minimized {
  background: rgba(255, 193, 7, 0.08);
  opacity: 0.7;
}

.wm-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.02);
}
</style>
