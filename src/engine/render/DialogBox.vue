<template>
  <div class="dialog-box">
    <!-- 顶部工具栏 -->
    <div class="dialog-toolbar row items-center justify-between q-px-md">
      <!-- 左侧返回按钮 -->
      <div class="row items-center q-gutter-sm">
        <q-btn flat dense color="white" label="返回" :disable="!canBack" @click="$emit('back')" />
        <q-btn flat dense color="white" label="回到开头" @click="$emit('restart')" />
      </div>

      <!-- 右侧功能按钮 -->
      <div class="row q-gutter-sm">
        <q-btn flat dense color="white" label="设置" @click="$emit('open-settings')" />
        <q-btn flat dense color="white" label="音频" @click="$emit('open-audio')" />
        <q-btn flat dense color="white" label="上下文" @click="$emit('open-context')" />
        <q-btn flat dense color="white" label="调试" @click="$emit('open-debug')" />
        <q-btn flat dense color="white" label="控制台" @click="$emit('open-console')" />
        <q-btn flat dense color="white" label="历史" @click="$emit('open-history')" />
        <q-btn flat dense color="white" label="存档" @click="$emit('open-save')" />
        <q-btn flat dense color="white" label="读档" @click="$emit('open-load')" />
        <q-btn flat dense color="white" label="回到主屏幕" @click="$emit('back-to-title')" />
        <q-btn flat dense color="white" label="隐藏" @click.stop="$emit('hide')" />
        <q-btn flat dense color="primary" label="QS1" @click="quickSaveWithConfirm(1)" />
        <q-btn flat dense color="primary" label="QS2" @click="quickSaveWithConfirm(2)" />
        <q-btn flat dense color="primary" label="QS3" @click="quickSaveWithConfirm(3)" />
      </div>
    </div>

    <!-- 对话框主体 -->
    <div class="dialog-content q-pa-md relative-position" @click="onContentClick">
      <!-- 说话人名字 -->
      <div class="text-bold q-mb-sm text-subtitle1">{{ speaker }}</div>

      <!-- 对话文本（打字机效果） -->
      <TypewriterText
        ref="typewriterRef"
        :text="text"
        :is-html="isHtml"
        :enabled="typewriterEnabled"
        :speed="textSpeed"
        :auto-speed="autoSpeed"
        :max-height="150"
        class="dialog-text"
        @complete="onTypewriterComplete"
      />

      <!-- 继续按钮 (右下角) -->
      <div v-if="!hideContinueButton" class="absolute-bottom-right q-pa-md">
        <q-btn label="继续" color="primary" @click.stop="onNext" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { useQuasar } from 'quasar';
import { useEngineStore } from 'stores/engine-store';
import { useSettingsStore } from 'stores/settings-store';
import TypewriterText from './TypewriterText.vue';

type TypewriterPublicApi = {
  isTyping: { value: boolean };
  hasNextPage: { value: boolean };
  revealAllCurrentPage: () => void;
  nextPage: () => void;
};

const $q = useQuasar();
const store = useEngineStore();
const settingsStore = useSettingsStore();
const dialog = computed(() => store.dialog());

// 文本 diff 设置（从 settingsStore 读取）
const dialogDiffEnabled = computed(() => settingsStore.displaySettings.dialogDiffEnabled);

// 隐藏继续按钮设置
const hideContinueButton = computed(() => settingsStore.displaySettings.hideContinueButton);

// 继续按键绑定设置
const continueKeyBinding = computed(() => settingsStore.displaySettings.continueKeyBinding);

// 打字机效果设置
const typewriterEnabled = computed(() => settingsStore.textSettings.typewriterEnabled);
const textSpeed = computed(() => settingsStore.textSettings.textSpeed);
const autoSpeed = computed(() => settingsStore.textSettings.autoSpeed);

const typewriterRef = ref<TypewriterPublicApi | null>(null);

// 用于 diff 检查的稳定引用
const stableSpeaker = ref('');
const stableText = ref('');
const stableIsHtml = ref(false);

// 监听 dialog 变化，只在内容真正改变时更新
watch(
  dialog,
  (newDialog) => {
    const newSpeaker = newDialog.speaker ?? '';
    const newText = newDialog.text ?? '';
    const newIsHtml = newDialog.html === true;

    if (dialogDiffEnabled.value) {
      // 启用 diff：只在内容变化时更新
      if (stableSpeaker.value !== newSpeaker) {
        stableSpeaker.value = newSpeaker;
      }
      if (stableText.value !== newText) {
        stableText.value = newText;
      }
      if (stableIsHtml.value !== newIsHtml) {
        stableIsHtml.value = newIsHtml;
      }
    } else {
      // 禁用 diff：总是更新
      stableSpeaker.value = newSpeaker;
      stableText.value = newText;
      stableIsHtml.value = newIsHtml;
    }
  },
  { immediate: true, deep: true },
);

// 打字机完成回调
function onTypewriterComplete() {
  // 可以在这里添加逻辑，例如自动继续
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
});

const speaker = computed(() => stableSpeaker.value);
const text = computed(() => stableText.value);
const isHtml = computed(() => stableIsHtml.value);
const canBack = computed(() => store.canBack());

// 定义事件，方便父组件（如 DemoVN.vue）监听处理
const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'restart'): void;
  (e: 'open-settings'): void;
  (e: 'open-audio'): void;
  (e: 'open-context'): void;
  (e: 'open-debug'): void;
  (e: 'open-console'): void;
  (e: 'open-history'): void;
  (e: 'open-save'): void;
  (e: 'open-load'): void;
  (e: 'back-to-title'): void;
  (e: 'quick-save-1'): void;
  (e: 'quick-save-2'): void;
  (e: 'quick-save-3'): void;
  (e: 'hide'): void;
}>();

function onNext() {
  const tw = typewriterRef.value;
  const isTypingNow = !!tw?.isTyping.value;
  const hasNext = !!tw?.hasNextPage.value;

  // 打字中：先瞬间输出本页，不执行下一步
  if (isTypingNow) {
    tw?.revealAllCurrentPage();
    return;
  }

  // 分页中：先翻到后一页，不执行下一步
  if (hasNext) {
    tw?.nextPage();
    return;
  }

  store.advance();
}

// 点击对话框内容区域继续（仅当隐藏按钮时）
function onContentClick() {
  if (hideContinueButton.value) {
    onNext();
  }
}

// 监听按键事件
function onKeyDown(e: KeyboardEvent) {
  if (e.key === continueKeyBinding.value) {
    e.preventDefault();
    onNext();
  }
}

// 快速存档确认对话框
function quickSaveWithConfirm(slotNum: number) {
  $q.dialog({
    title: '快速存档确认',
    message: `确定要保存到快速存档 QS${slotNum} 吗？`,
    ok: {
      label: '确定',
      color: 'primary',
    },
    cancel: {
      label: '取消',
      color: 'grey',
    },
    persistent: true,
  }).onOk(() => {
    // 用户确认后触发对应事件
    if (slotNum === 1) {
      emit('quick-save-1');
    } else if (slotNum === 2) {
      emit('quick-save-2');
    } else if (slotNum === 3) {
      emit('quick-save-3');
    }
  });
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
