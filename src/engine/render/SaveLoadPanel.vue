<template>
  <div v-if="visible" class="sl-panel" @click.stop>
    <div class="sl-header">
      <div class="title">{{ mode === 'save' ? '存档' : '读档' }}</div>
      <button class="close-btn" @click="$emit('close')">关闭</button>
    </div>
    <div class="sl-body">
      <div class="row">
        <input v-model="slot" class="slot-input" type="text" placeholder="请输入存档名" />
        <button class="action-btn" @click="onPrimary">
          {{ mode === 'save' ? '保存' : '读取' }}
        </button>
        <button class="action-btn" @click="refresh">刷新</button>
      </div>
      <div class="list">
        <div v-for="s in saves" :key="s.slot" class="item" @click="onItem(s.slot)">
          <div class="meta">
            <div class="scene">{{ s.scene || s.slot }}</div>
            <div class="text">{{ truncate(s.text || '') }}</div>
            <div class="time">{{ formatTime(s.time) }}</div>
          </div>
          <div class="btns">
            <button class="mini-btn" @click.stop="onItem(s.slot)">
              {{ mode === 'save' ? '覆盖' : '读取' }}
            </button>
            <button class="mini-btn danger" @click.stop="onDelete(s.slot)">删除</button>
          </div>
        </div>
        <div v-if="saves.length === 0" class="empty">暂无存档</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import { useEngineStore } from 'stores/engine-store';
const props = defineProps<{ visible?: boolean; mode?: 'save' | 'load' }>();
defineEmits<{ (e: 'close'): void }>();
const store = useEngineStore();
const slot = ref('');
const saves = ref<Array<{ slot: string; scene?: string; text?: string; time?: number }>>([]);
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
  slot.value = s;
  onPrimary();
}
function onDelete(s: string) {
  store.deleteSave?.(s);
  if (slot.value === s) slot.value = '';
  refresh();
}
function defaultSlot() {
  const scene = store.state.scene || '无名剧本';
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
  position: absolute;
  left: 50%;
  bottom: 220px;
  transform: translateX(-50%);
  width: min(680px, calc(100% - 32px));
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border-radius: 8px;
  padding: 10px;
  z-index: 1002;
}
.sl-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.title {
  font-weight: 600;
}
.close-btn {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 4px 10px;
  cursor: pointer;
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
.danger {
  background: rgba(255, 80, 80, 0.35);
}
.empty {
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
  padding: 10px 0;
}
</style>
