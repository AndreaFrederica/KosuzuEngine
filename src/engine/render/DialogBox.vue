<template>
  <div class="dialog-box">
    <!-- 顶部工具栏 -->
    <div class="dialog-toolbar row items-center justify-between q-px-md">
      <!-- 左侧返回按钮 -->
      <div class="text-white cursor-pointer hover-opacity" @click="$emit('back')">返回</div>

      <!-- 右侧功能按钮 -->
      <div class="row q-gutter-sm">
        <q-btn flat dense color="white" label="上下文" @click="$emit('open-context')" />
        <q-btn flat dense color="white" label="调试" @click="$emit('open-debug')" />
        <q-btn flat dense color="white" label="历史" @click="$emit('open-history')" />
        <q-btn flat dense color="white" label="存档" @click="$emit('open-save')" />
        <q-btn flat dense color="white" label="读档" @click="$emit('open-load')" />
        <q-btn flat dense color="white" label="隐藏" @click.stop="$emit('hide')" />
      </div>
    </div>

    <!-- 对话框主体 -->
    <div class="dialog-content q-pa-md relative-position">
      <!-- 说话人名字 -->
      <div class="text-bold q-mb-sm text-subtitle1">{{ speaker }}</div>

      <!-- 对话文本 -->
      <div class="dialog-text">{{ text }}</div>

      <!-- 继续按钮 (右下角) -->
      <div class="absolute-bottom-right q-pa-md">
        <q-btn label="继续" color="primary" @click="onNext" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useEngineStore } from 'stores/engine-store';

const store = useEngineStore();
const dialog = computed(() => store.dialog());
const speaker = computed(() => dialog.value.speaker ?? '');
const text = computed(() => dialog.value.text ?? '');

// 定义事件，方便父组件（如 DemoVN.vue）监听处理
defineEmits([
  'back',
  'open-context',
  'open-debug',
  'open-history',
  'open-save',
  'open-load',
  'hide',
]);

function onNext() {
  store.advance();
}
</script>

<style scoped>
.dialog-box {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  z-index: 1000; /* 确保在最上层 */
}

.dialog-toolbar {
  background: rgba(0, 0, 0, 0.7); /* 深色半透明背景 */
  height: 40px;
  font-size: 14px;
}

.dialog-content {
  min-height: 180px;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(3px);
}

.dialog-text {
  font-size: 1.1em;
  white-space: pre-wrap;
  line-height: 1.5;
}

.hover-opacity:hover {
  opacity: 0.8;
}
</style>
