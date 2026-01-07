<template>
  <div v-if="visible" class="settings-panel" @click.stop>
    <div class="settings-header">
      <div class="title">设置</div>
      <button class="close-btn" @click="$emit('close')">关闭</button>
    </div>
    <div class="settings-body">
      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-label">开发模式</div>
          <div class="setting-desc">暂无特殊功能，开关仅保存设置状态</div>
        </div>
        <q-toggle
          :model-value="isDevMode"
          @update:model-value="onDevModeChange"
          color="primary"
          keep-color
        />
      </div>
      <div v-if="isDevMode" class="dev-mode-info">
        <div class="info-title">开发模式已启用</div>
        <div class="info-desc">当前无特殊功能</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useEngineStore } from 'stores/engine-store';

const props = defineProps<{ visible?: boolean }>();
defineEmits<{ (e: 'close'): void }>();

const store = useEngineStore();
const isDevMode = computed(() => store.devMode());

function onDevModeChange(value: boolean) {
  store.setDevMode(value);
}
</script>

<style scoped>
.settings-panel {
  position: absolute;
  left: 50%;
  bottom: 220px;
  transform: translateX(-50%);
  width: min(500px, calc(100% - 32px));
  background: rgba(0, 0, 0, 0.85);
  color: #fff;
  border-radius: 8px;
  padding: 16px;
  z-index: 1002;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.title {
  font-weight: 600;
  font-size: 18px;
}

.close-btn {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

.settings-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  padding-right: 16px;
}

.setting-label {
  font-weight: 500;
  font-size: 15px;
}

.setting-desc {
  font-size: 13px;
  opacity: 0.7;
  line-height: 1.4;
}

.dev-mode-info {
  padding: 12px;
  background: rgba(76, 175, 80, 0.15);
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-title {
  font-weight: 500;
  color: #81c784;
  font-size: 14px;
}

.info-desc {
  font-size: 12px;
  opacity: 0.85;
}
</style>
