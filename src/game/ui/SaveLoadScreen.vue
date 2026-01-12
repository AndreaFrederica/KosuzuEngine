<template>
  <div class="saveload-screen">
    <!-- 背景图 -->
    <div class="saveload-background" :style="{ backgroundImage: `url(${backgroundImage})` }"></div>

    <!-- 遮罩层 -->
    <div class="saveload-overlay"></div>

    <!-- 存读档内容 -->
    <div class="saveload-content">
      <div class="saveload-panel">
        <!-- 侧边栏 -->
        <div class="saveload-sidebar">
          <div class="mode-tabs">
            <button class="mode-tab" :class="{ active: mode === 'load' }" @click="mode = 'load'">
              <span class="mode-text">读取游戏</span>
              <span class="mode-text-en">LOAD</span>
            </button>
            <button class="mode-tab" :class="{ active: mode === 'save' }" @click="mode = 'save'">
              <span class="mode-text">保存游戏</span>
              <span class="mode-text-en">SAVE</span>
            </button>
          </div>
          <div class="sidebar-spacer"></div>
          <button class="back-button" @click="goBack">
            <span>返回 / Back</span>
          </button>
        </div>

        <!-- 主内容区 -->
        <div class="saveload-main">
          <!-- 顶部操作栏 -->
          <div class="saveload-topbar">
            <div class="topbar-left">
              <button class="latest-button" :disabled="!hasLatest" @click="loadLatest">
                <span class="icon">🕒</span>
                <span>继续最近存档 / Continue Recent</span>
              </button>
            </div>

            <div class="topbar-right">
              <div class="quick-save-toolbar">
                <div class="toolbar-label">
                  {{ mode === 'save' ? '快速存档' : '快速读取' }} / Quick
                </div>
                <div class="quick-save-slots">
                  <button v-for="i in 3" :key="i" class="quick-save-btn" @click="quickSave(i)">
                    QS{{ i }}
                  </button>
                </div>
              </div>

              <div class="recovery-mode-toolbar">
                <div class="toolbar-label">恢复模式 / Recovery</div>
                <div class="select-wrapper">
                  <select
                    v-model="recoveryMode"
                    @change="onRecoveryModeChange"
                    class="recovery-mode-select"
                  >
                    <option value="full">完整重放 / Full</option>
                    <option value="fast">快速跳转 / Fast</option>
                    <option value="direct">直接恢复 / Direct</option>
                  </select>
                  <div class="select-arrow"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- 存档列表 -->
          <div class="saveload-body">
            <div v-if="saves.length === 0" class="empty-state">
              <div class="empty-icon-container">
                <div class="empty-icon">📂</div>
              </div>
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
                    {{ mode === 'save' ? '覆盖 / Save' : '读取 / Load' }}
                  </button>
                  <button class="slot-action-btn danger" @click.stop="deleteSave(save.slot)">
                    删除 / Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useEngineStore } from 'stores/engine-store';
import { useSettingsStore } from 'stores/settings-store';
import { gameRegistry } from '../registry';

const router = useRouter();
const store = useEngineStore();
const settingsStore = useSettingsStore();

// 获取游戏配置
const gameConfig = gameRegistry.getDefault() || {
  titleBackground: '/assets/bg/haikei_01_sora/jpg/sora_01.jpg',
};

// 使用自定义背景或默认背景
const backgroundImage = gameConfig.titleBackground || '/assets/bg/haikei_01_sora/jpg/sora_01.jpg';

// 模式：save 或 load
const mode = ref<'save' | 'load'>('load');

// 恢复模式
const recoveryMode = computed(() => settingsStore.displaySettings.recoveryMode);

// 存档列表
const saves = ref<Array<{ slot: string; scene?: string; text?: string; time?: number }>>([]);
const hasLatest = ref(false);

// 加载存档列表
async function loadSaves() {
  saves.value = await store.listSaves();
  hasLatest.value = await store.hasSave('__latest__');
}

// 选择存档槽位
async function selectSlot(slot: string) {
  if (mode.value === 'save') {
    await store.save(slot);
    void loadSaves();
  } else {
    await router.push({ path: '/demo', query: { load: slot } });
  }
}

// 删除存档
async function deleteSave(slot: string) {
  if (confirm(`确定要删除存档 ${slot} 吗？`)) {
    await store.deleteSave?.(slot);
    void loadSaves();
  }
}

// 快速存档/读取
async function quickSave(slotNum: number) {
  const slot = `quicksave:${slotNum}`;
  if (mode.value === 'save') {
    await store.save(slot);
    void loadSaves();
  } else {
    await router.push({ path: '/demo', query: { load: slot } });
  }
}

async function loadLatest() {
  if (!hasLatest.value) return;
  await router.push({ path: '/demo', query: { load: '__latest__' } });
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

// 恢复模式变化
function onRecoveryModeChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  const mode = target.value as 'full' | 'fast' | 'direct';
  settingsStore.setRecoveryMode(mode);
}

// 监听模式变化，刷新存档列表
watch(mode, () => {
  void loadSaves();
});

// 组件挂载时加载存档
onMounted(() => {
  void loadSaves();
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
  background: rgba(20, 20, 30, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  width: 95%;
  max-width: 1100px;
  height: 85vh;
  display: flex;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}

/* 侧边栏样式 */
.saveload-sidebar {
  width: 110px;
  background: rgba(0, 0, 0, 0.2);
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  padding: 20px 10px;
}

.mode-tabs {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mode-tab {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 16px 8px;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.mode-tab:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateX(4px);
  color: #fff;
}

.mode-tab.active {
  background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
}

.mode-text {
  font-size: 15px;
  font-weight: 600;
  writing-mode: vertical-lr;
  letter-spacing: 4px;
}

.mode-text-en {
  font-size: 9px;
  opacity: 0.8;
  font-weight: 700;
}

.sidebar-spacer {
  flex: 1;
}

.back-button {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 10px 6px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 11px;
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.back-button:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.3);
  color: #fff;
}

/* 主内容区样式 */
.saveload-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.saveload-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 32px;
  background: rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  gap: 20px;
}

.topbar-left {
  flex: 0 1 auto;
}

.topbar-right {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 32px;
}

.latest-button {
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 10px;
  padding: 12px 20px;
  color: #e0e7ff;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
}

.latest-button .icon {
  font-size: 18px;
}

.latest-button:hover:not(:disabled) {
  background: rgba(99, 102, 241, 0.2);
  transform: translateY(-1px);
}

.latest-button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.quick-save-toolbar,
.recovery-mode-toolbar {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.toolbar-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.3);
  text-transform: uppercase;
  font-weight: 800;
  white-space: nowrap;
  letter-spacing: 0.5px;
}

.quick-save-slots {
  display: flex;
  gap: 6px;
}

.quick-save-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 6px 12px;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 45px;
}

.quick-save-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.recovery-mode-select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background: rgba(0, 0, 0, 0.4);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 8px 32px 8px 12px;
  font-size: 12px;
  outline: none;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 140px;
  width: 100%;
}

.select-wrapper {
  position: relative;
  width: 100%;
}

.select-arrow {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid rgba(255, 255, 255, 0.5);
  pointer-events: none;
  transition: all 0.2s;
}

.recovery-mode-select:hover {
  border-color: rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.08);
}

.recovery-mode-select:hover + .select-arrow {
  border-top-color: #fff;
}

.recovery-mode-select option {
  background: #1a1a2e;
  color: #fff;
  padding: 10px;
}

.saveload-body {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
}

.saveload-body::-webkit-scrollbar {
  width: 6px;
}

.saveload-body::-webkit-scrollbar-track {
  background: transparent;
}

.saveload-body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.empty-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.3);
}

.empty-icon-container {
  width: 100px;
  height: 100px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}

.empty-icon {
  font-size: 48px;
  opacity: 0.5;
}

.empty-text {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 4px;
  color: rgba(255, 255, 255, 0.5);
}

.empty-sub {
  font-size: 13px;
}

.save-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

.save-slot {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.save-slot::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #6366f1, #a855f7);
  opacity: 0;
  transition: opacity 0.3s;
}

.save-slot:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-4px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.save-slot:hover::before {
  opacity: 1;
}

.slot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.slot-number {
  font-size: 12px;
  font-weight: 800;
  color: #818cf8;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.slot-time {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  font-family: 'JetBrains Mono', monospace;
}

.slot-content {
  flex: 1;
  margin-bottom: 20px;
}

.slot-scene {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.slot-text {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.slot-actions {
  display: flex;
  gap: 10px;
}

.slot-action-btn {
  flex: 1;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.slot-action-btn.primary {
  background: rgba(99, 102, 241, 0.1);
  border-color: rgba(99, 102, 241, 0.3);
  color: #e0e7ff;
}

.slot-action-btn.primary:hover {
  background: rgba(99, 102, 241, 0.3);
  border-color: rgba(99, 102, 241, 0.5);
}

.slot-action-btn.danger {
  color: rgba(255, 255, 255, 0.4);
}

.slot-action-btn.danger:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: #fca5a5;
}

@media (max-width: 768px) {
  .saveload-panel {
    flex-direction: column;
    height: 95vh;
  }

  .saveload-sidebar {
    width: 100%;
    height: auto;
    flex-direction: row;
    border-right: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    padding: 12px 20px;
  }

  .mode-tabs {
    flex-direction: row;
  }

  .mode-tab {
    padding: 10px 16px;
    flex-direction: row;
    writing-mode: horizontal-tb;
  }

  .mode-text {
    writing-mode: horizontal-tb;
    letter-spacing: 1px;
  }

  .sidebar-spacer,
  .back-button {
    display: none;
  }

  .saveload-topbar {
    flex-direction: column;
    align-items: stretch;
    padding: 16px 20px;
  }

  .topbar-right {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
}
</style>
