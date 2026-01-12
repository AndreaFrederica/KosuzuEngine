<template>
  <div class="bgm-control-container">
    <!-- 折叠状态的标签 -->
    <div
      class="bgm-label"
      :class="{ expanded: isExpanded }"
      @click="isExpanded = !isExpanded"
    >
      <span class="label-icon">🎵</span>
      <span v-if="currentTrack && !isExpanded" class="label-text">{{ trackDisplayName }}</span>
    </div>

    <!-- 展开状态的控制面板 -->
    <div class="bgm-control-panel" :class="{ visible: isExpanded }">
      <div class="bgm-info">
        <span v-if="currentTrack" class="track-name">{{ trackDisplayName }}</span>
        <span v-else class="track-name">无音乐</span>
      </div>

      <div class="bgm-controls">
        <!-- 播放/暂停按钮 -->
        <button class="control-btn" @click="togglePlay" :title="isPlaying ? '暂停' : '播放'">
          <span v-if="isPlaying">⏸</span>
          <span v-else>▶</span>
        </button>

        <!-- 音量控制 -->
        <div class="volume-control">
          <span class="volume-icon">🔊</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            :value="volume"
            @input="onVolumeChange"
            class="volume-slider"
            :disabled="!currentTrack"
          />
          <span class="volume-value">{{ Math.round(volume * 100) }}%</span>
        </div>

        <!-- 播放进度 -->
        <div v-if="currentTrack && duration > 0" class="progress-control">
          <span class="progress-text">{{ formatTime(currentTime) }}</span>
          <input
            type="range"
            min="0"
            :max="duration"
            :value="currentTime"
            @input="onSeek"
            class="progress-slider"
          />
          <span class="progress-text">{{ formatTime(duration) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { audioManager } from './AudioManager';

// 定义组件名称（用于调试）
defineOptions({
  name: 'BGMControl'
});

// 折叠状态
const isExpanded = ref(false);

// 状态
const currentTrack = ref<string | null>(null);
const isPlaying = ref(false);
const volume = ref(1);
const currentTime = ref(0);
const duration = ref(0);
const audioElement = ref<HTMLAudioElement | null>(null);

// 更新状态
function updateStatus() {
  const status = audioManager.getStatus();
  currentTrack.value = status.currentTrack;
  volume.value = status.volume;

  // 获取音频元素来计算进度和真实播放状态
  const channel = audioManager.getChannel('default_bgm');
  if (channel && 'audioElement' in channel) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    audioElement.value = (channel as any).audioElement;
    if (audioElement.value) {
      currentTime.value = audioElement.value.currentTime;
      duration.value = audioElement.value.duration || 0;
      // 使用音频元素的真实播放状态
      isPlaying.value = !audioElement.value.paused;
    }
  } else {
    isPlaying.value = status.isPlaying;
  }
}

// 定时更新进度
let progressInterval: number | null = null;

function startProgressUpdate() {
  stopProgressUpdate();
  progressInterval = window.setInterval(() => {
    if (audioElement.value && isPlaying.value) {
      currentTime.value = audioElement.value.currentTime;
      duration.value = audioElement.value.duration || 0;
    }
  }, 100);
}

function stopProgressUpdate() {
  if (progressInterval !== null) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
}

// 播放/暂停切换
function togglePlay() {
  const channel = audioManager.getChannel('default_bgm');
  if (!channel) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = (channel as any).audioElement as HTMLAudioElement;
  if (!element) return;

  if (element.paused) {
    // 恢复播放
    void element.play();
  } else {
    // 暂停
    element.pause();
  }

  // 立即更新状态
  setTimeout(() => updateStatus(), 50);
}

// 音量变化
function onVolumeChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const newVolume = parseFloat(target.value);
  void audioManager.setChannelVolume('default_bgm', newVolume, 100);
}

// 进度跳转
function onSeek(event: Event) {
  const target = event.target as HTMLInputElement;
  if (audioElement.value) {
    audioElement.value.currentTime = parseFloat(target.value);
  }
}

// 格式化时间
function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// 显示的曲目名称
const trackDisplayName = computed(() => {
  if (!currentTrack.value) return '';
  // 移除路径前缀和文件扩展名
  const parts = currentTrack.value.split('/');
  const filename = parts[parts.length - 1] || currentTrack.value;
  return filename.replace(/\.[^/.]+$/, '');
});

onMounted(() => {
  updateStatus();
  startProgressUpdate();

  // 监听状态变化
  const checkInterval = setInterval(() => {
    updateStatus();
  }, 500);

  onUnmounted(() => {
    clearInterval(checkInterval);
    stopProgressUpdate();
  });
});
</script>

<style scoped>
.bgm-control-container {
  display: flex;
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
}

/* 折叠状态标签 */
.bgm-label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.25s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.bgm-label:hover {
  color: rgba(255, 255, 255, 1);
}

.bgm-label.expanded {
  padding: 8px;
}

.label-icon {
  font-size: 14px;
  cursor: pointer;
}

.label-text {
  font-size: 11px;
  opacity: 0.8;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 展开状态的控制面板 */
.bgm-control-panel {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 16px;
  overflow: hidden;
  max-width: 0;
  opacity: 0;
  transition: all 0.25s ease;
}

.bgm-control-panel.visible {
  max-width: 500px;
  opacity: 1;
  margin-left: 16px;
}

.bgm-info {
  flex-shrink: 0;
}

.track-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
}

.bgm-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.control-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all 0.2s;
  flex-shrink: 0;
}

.control-btn:hover {
  color: rgba(255, 255, 255, 1);
}

.control-btn:active {
  transform: scale(0.95);
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 6px;
}

.volume-icon {
  font-size: 14px;
  opacity: 0.8;
}

.volume-slider {
  width: 60px;
  height: 20px;
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  outline: none;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.volume-slider::-webkit-slider-runnable-track {
  height: 3px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  margin-top: -3.5px; /* (3px - 10px) / 2 */
}

.volume-slider::-moz-range-track {
  height: 3px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.volume-slider::-moz-range-thumb {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  border: none;
  cursor: pointer;
}

.volume-slider:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.volume-value {
  min-width: 30px;
  text-align: right;
  font-size: 11px;
  opacity: 0.7;
}

.progress-control {
  display: flex;
  align-items: center;
  gap: 6px;
}

.progress-slider {
  width: 80px;
  height: 20px;
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  outline: none;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.progress-slider::-webkit-slider-runnable-track {
  height: 3px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.progress-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  margin-top: -2.5px; /* (3px - 8px) / 2 */
}

.progress-slider::-moz-range-track {
  height: 3px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.progress-slider::-moz-range-thumb {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  border: none;
  cursor: pointer;
}

.progress-text {
  font-size: 10px;
  opacity: 0.6;
  min-width: 25px;
}
</style>
