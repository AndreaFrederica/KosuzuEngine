<template>
  <div class="saveload-screen">
    <!-- 背景图 -->
    <div class="saveload-background" :style="{ backgroundImage: `url(${backgroundImage})` }"></div>

    <!-- 遮罩层 -->
    <div class="saveload-overlay"></div>

    <!-- 存读档内容 -->
    <div class="saveload-content">
      <div class="saveload-panel">
        <!-- 标题栏 -->
        <div class="saveload-header">
          <div class="mode-tabs">
            <button
              class="mode-tab"
              :class="{ active: mode === 'load' }"
              @click="mode = 'load'"
            >
              <span class="mode-text">读取游戏</span>
              <span class="mode-text-en">Load</span>
            </button>
            <button
              class="mode-tab"
              :class="{ active: mode === 'save' }"
              @click="mode = 'save'"
            >
              <span class="mode-text">保存游戏</span>
              <span class="mode-text-en">Save</span>
            </button>
          </div>
          <button class="back-button" @click="goBack">
            <span>返回</span>
          </button>
        </div>

        <!-- 存档列表 -->
        <div class="saveload-body">
          <div v-if="saves.length === 0" class="empty-state">
            <div class="empty-icon">📁</div>
            <div class="empty-text">暂无存档</div>
            <div class="empty-sub">No saves found</div>
          </div>

          <div v-else class="save-grid">
            <div
              v-for="save in saves"
              :key="save.slot"
              class="save-slot"
              @click="selectSlot(save.slot)"
            >
              <div class="slot-header">
                <span class="slot-number">Slot {{ save.slot.replace('save:', '') }}</span>
                <span class="slot-time">{{ formatTime(save.time) }}</span>
              </div>
              <div class="slot-content">
                <div class="slot-scene">{{ save.scene || '未命名场景' }}</div>
                <div class="slot-text">{{ truncate(save.text || '') }}</div>
              </div>
              <div class="slot-actions">
                <button class="slot-action-btn primary" @click.stop="selectSlot(save.slot)">
                  {{ mode === 'save' ? '覆盖' : '读取' }}
                </button>
                <button class="slot-action-btn danger" @click.stop="deleteSave(save.slot)">
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部快速存档栏 -->
        <div class="quick-save-bar">
          <div class="quick-save-title">快速存档 / Quick Save</div>
          <div class="quick-save-slots">
            <button
              v-for="i in 3"
              :key="i"
              class="quick-save-btn"
              @click="quickSave(i)"
            >
              QS{{ i }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useEngineStore } from 'stores/engine-store';
import { gameRegistry } from '../registry';

const router = useRouter();
const store = useEngineStore();

// 获取游戏配置
const gameConfig = gameRegistry.getDefault() || {
  titleBackground: '/assets/bg/haikei_01_sora/jpg/sora_01.jpg',
};

// 使用自定义背景或默认背景
const backgroundImage = gameConfig.titleBackground || '/assets/bg/haikei_01_sora/jpg/sora_01.jpg';

// 模式：save 或 load
const mode = ref<'save' | 'load'>('load');

// 存档列表
const saves = ref<Array<{ slot: string; scene?: string; text?: string; time?: number }>>([]);

// 加载存档列表
function loadSaves() {
  saves.value = store.listSaves();
}

// 选择存档槽位
function selectSlot(slot: string) {
  if (mode.value === 'save') {
    store.save(slot);
    loadSaves();
  } else {
    store.load(slot);
    loadSaves();
    // 读取成功后跳转到游戏
    void router.push('/demo');
  }
}

// 删除存档
function deleteSave(slot: string) {
  if (confirm(`确定要删除存档 ${slot} 吗？`)) {
    store.deleteSave?.(slot);
    loadSaves();
  }
}

// 快速存档
function quickSave(slotNum: number) {
  const slot = `quicksave:${slotNum}`;
  store.save(slot);
  loadSaves();
}

// 格式化时间
function formatTime(time?: number) {
  if (!time) return '-';
  const date = new Date(time);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// 截断文本
function truncate(text: string, max = 50) {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '...' : text;
}

// 返回
function goBack() {
  router.back();
}

// 监听模式变化，刷新存档列表
watch(mode, () => {
  loadSaves();
});

// 组件挂载时加载存档
onMounted(() => {
  loadSaves();
});
</script>

<style scoped>
.saveload-screen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
}

.saveload-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.saveload-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
}

.saveload-content {
  position: relative;
  z-index: 10;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.saveload-panel {
  background: rgba(20, 20, 30, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  width: 100%;
  max-width: 900px;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.saveload-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.mode-tabs {
  display: flex;
  gap: 8px;
}

.mode-tab {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 12px 24px;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.mode-tab:hover {
  background: rgba(255, 255, 255, 0.1);
}

.mode-tab.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: transparent;
  color: #fff;
}

.mode-text {
  font-size: 16px;
  font-weight: 500;
}

.mode-text-en {
  font-size: 11px;
  opacity: 0.7;
  text-transform: uppercase;
}

.back-button {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 10px 20px;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.back-button:hover {
  background: rgba(255, 255, 255, 0.2);
}

.saveload-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
}

.saveload-body::-webkit-scrollbar {
  width: 8px;
}

.saveload-body::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.saveload-body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.saveload-body::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.5);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 20px;
  margin-bottom: 8px;
}

.empty-sub {
  font-size: 14px;
}

.save-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.save-slot {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
}

.save-slot:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.slot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.slot-number {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.slot-time {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  font-family: monospace;
}

.slot-content {
  flex: 1;
  margin-bottom: 12px;
}

.slot-scene {
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  margin-bottom: 6px;
}

.slot-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.4;
}

.slot-actions {
  display: flex;
  gap: 8px;
}

.slot-action-btn {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.slot-action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.slot-action-btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: transparent;
}

.slot-action-btn.primary:hover {
  opacity: 0.9;
}

.slot-action-btn.danger:hover {
  background: rgba(244, 67, 54, 0.3);
  border-color: rgba(244, 67, 54, 0.5);
}

.quick-save-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 32px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.2);
}

.quick-save-title {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}

.quick-save-slots {
  display: flex;
  gap: 8px;
}

.quick-save-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  padding: 8px 16px;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 60px;
}

.quick-save-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
}
</style>
