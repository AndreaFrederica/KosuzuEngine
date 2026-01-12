<template>
  <FloatingWindow
    :model-value="visible"
    @update:model-value="onUpdateOpen"
    :title="uiText.title"
    :storage-key="storageKey"
    :window-id="windowId"
    window-class="bg-grey-10 text-white"
    :initial-size="{ w: 760, h: 560 }"
    :min-width="560"
    :min-height="360"
  >
    <div class="fw-content sl-panel">
      <div class="sl-body">
        <div class="row">
          <input
            v-model="slot"
            class="slot-input"
            type="text"
            :placeholder="uiText.slotPlaceholder"
          />
          <button class="action-btn" @click="onPrimary">
            {{ mode === 'save' ? uiText.saveBtn : uiText.loadBtn }}
          </button>
          <button class="action-btn" @click="refresh">{{ uiText.refresh }}</button>
        </div>
        <div class="quick-save-section">
          <div class="quick-save-label">
            {{ mode === 'save' ? '快速存档' : '快速读取' }} /
            {{ mode === 'save' ? 'Quick Save' : 'Quick Load' }}
          </div>
          <div class="quick-save-slots">
            <button class="quick-save-btn" @click="onQuickSave(1)">QS1</button>
            <button class="quick-save-btn" @click="onQuickSave(2)">QS2</button>
            <button class="quick-save-btn" @click="onQuickSave(3)">QS3</button>
          </div>
        </div>
        <div class="list">
          <div v-for="s in saves" :key="s.slot" class="item" @click="onItem(s.slot)">
            <div class="meta">
              <div class="slot-name">{{ s.slot }}</div>
              <div class="scene">{{ s.scene || uiText.unnamedScenario }}</div>
              <div class="text">{{ truncate(s.text || '') }}</div>
              <div class="time">{{ formatTime(s.time) }}</div>
            </div>
            <div class="btns">
              <button class="mini-btn" @click.stop="onItem(s.slot)">
                {{ mode === 'save' ? uiText.overwrite : uiText.loadBtn }}
              </button>
              <button class="mini-btn danger" @click.stop="onDelete(s.slot)">
                {{ uiText.delete }}
              </button>
            </div>
          </div>
          <div v-if="saves.length === 0" class="empty">{{ uiText.noSaves }}</div>
        </div>
      </div>
    </div>
  </FloatingWindow>
</template>

<script setup lang="ts">
import { ref, watchEffect, computed, onMounted, onUnmounted } from 'vue';
import { useEngineStore } from 'stores/engine-store';
import { getI18nManager, type SupportedLocale } from '../../engine/i18n';
import FloatingWindow from 'components/FloatingWindow.vue';

const props = withDefaults(defineProps<{ visible?: boolean; mode?: 'save' | 'load' }>(), {
  visible: false,
  mode: 'save',
});
const emit = defineEmits<{ (e: 'close'): void }>();
const store = useEngineStore();
const slot = ref('');
const saves = ref<Array<{ slot: string; scene?: string; text?: string; time?: number }>>([]);

// i18n 管理器和当前语言
const i18n = getI18nManager();
const currentLocale = ref<SupportedLocale>(i18n.getLocale());

const windowId = computed(() => `panel:saveLoad:${props.mode}`);
const storageKey = computed(() => `panel:saveLoad:${props.mode}`);

function onUpdateOpen(v: boolean) {
  if (!v) emit('close');
}

// 监听语言变化
let unlistenLocale: (() => void) | null = null;
onMounted(() => {
  unlistenLocale = i18n.onLocaleChange(() => {
    currentLocale.value = i18n.getLocale();
  });
});
onUnmounted(() => {
  unlistenLocale?.();
});

// i18n 翻译函数
const t = (key: string): string => {
  try {
    const result = i18n.getTranslation(`@ui:${key}`);
    return result.text !== `@ui:${key}` ? result.text : key;
  } catch {
    return key;
  }
};

// 响应式翻译（依赖 currentLocale 以在语言切换时更新）
const uiText = computed(() => {
  // 触发 computed 重新计算
  void currentLocale.value;
  return {
    title: props.mode === 'save' ? t('save') : t('load'),
    close: t('close'),
    saveBtn: t('save_btn'),
    loadBtn: t('load_btn'),
    refresh: t('refresh'),
    slotPlaceholder: t('slot_placeholder'),
    overwrite: t('overwrite'),
    delete: t('delete'),
    noSaves: t('no_saves'),
    unnamedScenario: t('unnamed_scenario'),
  };
});
function refresh() {
  saves.value = store.listSaves();
}
function onPrimary() {
  if (!slot.value) {
    slot.value = defaultSlot();
  }
  if (props.mode === 'save') {
    store.save(slot.value);
    refresh();
  } else {
    store.load(slot.value);
  }
}
function onItem(s: string) {
  if (props.mode === 'save') {
    // 保存模式：只当输入框为空时才使用选中槽位，不更新输入框显示
    if (!slot.value) {
      slot.value = s;
    }
    store.save(s);
    refresh();
  } else {
    // 读取模式：直接读取，不更新输入框
    store.load(s);
  }
}
function onDelete(s: string) {
  store.deleteSave?.(s);
  if (slot.value === s) slot.value = '';
  refresh();
}
function onQuickSave(slotNum: number) {
  const qsSlot = `quicksave:${slotNum}`;
  if (props.mode === 'save') {
    store.save(qsSlot);
    refresh();
  } else {
    store.load(qsSlot);
  }
}

function defaultSlot() {
  const scene = store.state.scene || uiText.value.unnamedScenario;
  const time = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const ts = `${time.getFullYear()}-${pad(time.getMonth() + 1)}-${pad(time.getDate())} ${pad(time.getHours())}:${pad(
    time.getMinutes(),
  )}:${pad(time.getSeconds())}`;
  return `${scene}_${ts}`;
}
watchEffect(() => {
  if (props.visible) refresh();
});

function truncate(t: string) {
  if (!t) return '';
  const max = 40;
  return t.length > max ? t.slice(0, max) + '...' : t;
}

function formatTime(time?: number) {
  if (!time) return '-';
  const date = new Date(time);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
</script>

<style scoped>
.sl-panel {
  height: 100%;
  color: #fff;
  padding: 10px;
}
.row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
}
.slot-input {
  flex: 1 1 auto;
  padding: 6px 8px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  outline: none;
}
.action-btn {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
}
.list {
  max-height: 40vh;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  padding: 8px;
  cursor: pointer;
}
.meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 80%;
}
.slot-name {
  font-size: 11px;
  opacity: 0.5;
  font-family: monospace;
}
.scene {
  font-weight: 600;
}
.text {
  font-size: 13px;
  opacity: 0.85;
}
.time {
  font-size: 11px;
  opacity: 0.6;
}
.name {
  font-size: 14px;
}
.mini-btn {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
}
.btns {
  display: flex;
  gap: 8px;
  align-items: center;
}
.quick-save-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 10px;
}
.quick-save-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}
.quick-save-slots {
  display: flex;
  gap: 8px;
}
.quick-save-btn {
  background: rgba(103, 126, 234, 0.3);
  color: #fff;
  border: 1px solid rgba(103, 126, 234, 0.5);
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 50px;
}
.quick-save-btn:hover {
  background: rgba(103, 126, 234, 0.5);
  border-color: rgba(103, 126, 234, 0.8);
}
.danger {
  background: rgba(255, 80, 80, 0.35);
}
.empty {
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
  padding: 10px 0;
}
</style>
