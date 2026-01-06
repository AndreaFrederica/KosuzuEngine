<template>
  <div v-if="visible" class="history-panel">
    <div class="history-header">
      <div class="title">历史对话</div>
      <button class="close-btn" @click="$emit('close')">关闭</button>
    </div>
    <div class="history-body">
      <div v-for="(h, idx) in history" :key="idx" class="line">
        <span class="speaker">{{ h.speaker || '——' }}</span>
        <span class="text">{{ h.text }}</span>
      </div>
    </div>
  </div>
  <div v-else class="history-placeholder"></div>
  <div class="history-controls">
    <button class="ctrl-btn" @click="$emit('back')">返回</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useEngineStore } from 'stores/engine-store';
const { visible = false } = defineProps<{ visible?: boolean }>();
const store = useEngineStore();
const history = computed(() => store.history());
</script>

<style scoped>
.history-panel {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 200px;
  max-height: 40vh;
  overflow: auto;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 14px;
  border-radius: 6px;
  padding: 8px;
  z-index: 1002;
}
.history-header {
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
.history-body .line {
  padding: 4px 0;
}
.speaker {
  display: inline-block;
  min-width: 120px;
  color: #9ad;
}
.text {
  color: #fff;
}
.history-placeholder {
  display: none;
}
.history-controls {
  position: absolute;
  left: 12px;
  bottom: 160px;
  z-index: 1002;
}
.ctrl-btn {
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
}
</style>
