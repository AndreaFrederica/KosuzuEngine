<template>
  <teleport to="body">
    <transition name="audio-prompt">
      <div v-if="visible" class="audio-prompt-overlay" @click="handleClick">
        <div class="audio-prompt-content" @click.stop>
          <svg class="audio-prompt-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
          <span class="audio-prompt-text">点击启用音频 / Click to Enable Audio</span>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { audioManager, setShowPromptVisible, setHidePrompt } from './AudioManager';

const visible = ref(false);

function handleClick() {
  visible.value = false;
  audioManager.handleUserInteraction();
}

// 显示提示框
function show() {
  visible.value = true;
}

// 隐藏提示框
function hide() {
  visible.value = false;
}

onMounted(() => {
  setShowPromptVisible(show);
  setHidePrompt(hide);
});

onUnmounted(() => {
  setShowPromptVisible(null);
  setHidePrompt(null);
});
</script>

<style scoped>
.audio-prompt-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  cursor: pointer;
}

.audio-prompt-content {
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(0, 0, 0, 0.9);
  color: #fff;
  padding: 20px 32px;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
  cursor: pointer;
}

.audio-prompt-content:hover {
  background: rgba(0, 0, 0, 0.95);
  border-color: rgba(255, 255, 255, 0.4);
  transform: scale(1.05);
}

.audio-prompt-icon {
  width: 32px;
  height: 32px;
  animation: audio-prompt-icon-bounce 1s ease-in-out infinite;
  flex-shrink: 0;
}

.audio-prompt-text {
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

@keyframes audio-prompt-icon-bounce {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.15);
  }
}

/* 音频提示过渡动画 */
.audio-prompt-enter-active,
.audio-prompt-leave-active {
  transition: all 0.3s ease;
}

.audio-prompt-enter-from,
.audio-prompt-leave-to {
  opacity: 0;
}

.audio-prompt-enter-to,
.audio-prompt-leave-from {
  opacity: 1;
}
</style>
