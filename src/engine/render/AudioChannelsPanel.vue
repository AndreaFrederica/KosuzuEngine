<template>
  <FloatingWindow
    :model-value="visible"
    @update:model-value="onUpdateOpen"
    title="音频通道 / Audio Channels"
    storage-key="panel:audioChannels"
    window-id="panel:audioChannels"
    window-class="bg-grey-10 text-white"
    :initial-size="{ w: 520, h: 420 }"
    :min-width="420"
    :min-height="300"
  >
    <div class="fw-content audio-channels-panel">
      <div class="channels-body">
        <div v-if="channels.length === 0" class="no-channels">
          暂无活动音频通道 / No active channels
        </div>
        <div v-else class="channels-list">
          <div
            v-for="channel in channels"
            :key="channel.channelId"
            class="channel-card"
            :class="`type-${channel.type}`"
          >
            <!-- 通道头部 -->
            <div class="channel-header">
              <div class="channel-info">
                <div class="channel-id">{{ channel.channelId }}</div>
                <div class="channel-type">{{ typeLabel(channel.type) }}</div>
              </div>
              <div class="channel-status-group">
                <div v-if="channel.isPlaying" class="channel-status playing">播放中</div>
                <div v-else class="channel-status stopped">已停止</div>
                <div v-if="channel.loop" class="channel-loop" title="循环播放">
                  <span class="loop-icon">∞</span>
                </div>
              </div>
            </div>

            <!-- 播放信息 -->
            <div v-if="channel.currentTrack" class="channel-track">
              <div class="track-value">{{ getTrackName(channel.currentTrack) }}</div>
              <div v-if="channel.isPlaying" class="channel-time">
                {{ formatTime(channel.audioCurrentTime) }}
              </div>
            </div>

            <!-- 整合的音量控制：滑块 + 当前音量 -->
            <div class="channel-volume-control">
              <input
                type="range"
                min="0"
                max="100"
                :value="channel.volume * 100"
                @input="setVolume(channel.channelId, $event)"
                class="volume-slider"
              />
              <div class="volume-value">{{ Math.round(channel.volume * 100) }}%</div>
            </div>

            <!-- 实时电平显示 -->
            <div class="channel-level">
              <div class="level-bar-container">
                <!-- dB 刻度线 -->
                <div class="level-ticks">
                  <div class="level-tick" style="left: 0%"></div>
                  <div class="level-tick" style="left: 33.33%"></div>
                  <div class="level-tick" style="left: 66.67%"></div>
                  <div class="level-tick level-tick-max" style="left: 100%"></div>
                </div>
                <!-- 电平填充 -->
                <div
                  class="level-bar-fill"
                  :class="{ clipping: isClipping(levelToDb(channel.level)) }"
                  :style="{ width: `${dbToPercent(levelToDb(channel.level))}%` }"
                ></div>
              </div>
              <div class="level-labels">
                <span class="level-label">-60</span>
                <span class="level-label">-40</span>
                <span class="level-label">-20</span>
                <span class="level-label">0</span>
              </div>
              <div
                class="level-current"
                :class="{ clipping: isClipping(levelToDb(channel.level)) }"
              >
                {{ Math.round(levelToDb(channel.level)) }} dB
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </FloatingWindow>
</template>

<script setup lang="ts">
import { ref, onUnmounted, computed, watch } from 'vue';
import { audioManager } from './AudioManager';
import type { ChannelStatus } from './AudioChannel';
import FloatingWindow from 'components/FloatingWindow.vue';

const props = withDefaults(defineProps<{ visible?: boolean }>(), { visible: false });
const visible = computed(() => props.visible);
const emit = defineEmits<{ (e: 'close'): void }>();

const channels = ref<ChannelStatus[]>([]);
let refreshInterval: ReturnType<typeof setInterval> | null = null;

function onUpdateOpen(v: boolean) {
  if (!v) emit('close');
}

// 通道类型标签
function typeLabel(type: string): string {
  const labels: Record<string, string> = {
    bgm: 'BGM',
    sfx: 'SFX',
    voice: 'Voice',
  };
  return labels[type] ?? type;
}

// 从完整路径提取文件名
function getTrackName(path: string): string {
  if (!path) return '-';
  const parts = path.split('/');
  const filename = parts[parts.length - 1];
  return filename ?? '-';
}

// 格式化时间
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// 设置音量
function setVolume(channelId: string, event: Event) {
  const target = event.target as HTMLInputElement;
  const volume = parseInt(target.value, 10) / 100;
  void audioManager.setChannelVolume(channelId, volume);
}

// 刷新通道列表
function refreshChannels() {
  const allStatus = audioManager.getAllChannelStatus();
  channels.value = Array.from(allStatus.values()).flat();
}

// 将线性电平转换为 dB
function levelToDb(level: number): number {
  if (level <= 0) return -60; // 最小显示 -60dB
  const db = 20 * Math.log10(level);
  return Math.max(-60, Math.min(0, db));
}

// 计算电平条的宽度百分比（基于 dB 对数刻度）
function dbToPercent(db: number): number {
  // 0dB = 100%, -60dB = 0%
  return ((db + 60) / 60) * 100;
}

// 检查是否削波（接近 0dB）
function isClipping(db: number): boolean {
  return db >= -1;
}

function startPolling() {
  refreshChannels();
  if (refreshInterval) return;
  refreshInterval = setInterval(() => {
    refreshChannels();
  }, 50);
}

function stopPolling() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

watch(
  visible,
  (v) => {
    if (v) startPolling();
    else stopPolling();
  },
  { immediate: true },
);

onUnmounted(() => {
  stopPolling();
});
</script>

<style scoped>
.audio-channels-panel {
  height: 100%;
  overflow: auto;
  color: #fff;
  padding: 16px;
}

.channels-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
}

.title {
  font-weight: 600;
  font-size: 16px;
}

.close-btn {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 6px 14px;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 13px;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.22);
}

.channels-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.no-channels {
  text-align: center;
  padding: 32px;
  opacity: 0.6;
  font-size: 14px;
}

.channels-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.channel-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: background 0.2s;
}

.channel-card:hover {
  background: rgba(255, 255, 255, 0.08);
}

.channel-card.type-bgm {
  border-left: 3px solid #e91e63;
}

.channel-card.type-sfx {
  border-left: 3px solid #ff9800;
}

.channel-card.type-voice {
  border-left: 3px solid #2196f3;
}

.channel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.channel-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.channel-id {
  font-weight: 600;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.95);
}

.channel-type {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
}

.channel-status-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.channel-status {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
}

.channel-status.playing {
  background: rgba(76, 175, 80, 0.25);
  color: #81c784;
}

.channel-status.stopped {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.5);
}

.channel-loop {
  font-size: 12px;
  opacity: 0.6;
  padding: 2px 4px;
}

.loop-icon {
  font-weight: bold;
}

.channel-track {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding: 6px 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
}

.track-value {
  font-size: 11px;
  word-break: break-all;
  color: rgba(255, 255, 255, 0.85);
  flex: 1;
}

.channel-time {
  font-size: 11px;
  opacity: 0.7;
  font-family: monospace;
  margin-left: 8px;
}

.channel-volume-control {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.volume-slider {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
  outline: none;
  -webkit-appearance: none;
  cursor: pointer;
}

.volume-slider::-webkit-slider-runnable-track {
  height: 6px;
  border-radius: 3px;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
  transition: transform 0.1s;
}

.volume-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.volume-value {
  font-size: 12px;
  font-weight: 600;
  min-width: 38px;
  text-align: right;
  color: rgba(255, 255, 255, 0.9);
}

.channel-level {
  margin-top: 8px;
}

.level-bar-container {
  width: 100%;
  height: 10px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 5px;
  overflow: hidden;
  position: relative;
}

.level-ticks {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.level-tick {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(255, 255, 255, 0.15);
}

.level-tick-max {
  width: 2px;
  background: rgba(255, 255, 255, 0.4);
}

.level-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #8bc34a, #aed581, #c5e1a5);
  border-radius: 5px;
  transition:
    width 0.05s ease-out,
    background 0.1s;
  min-width: 2px;
  position: relative;
}

.level-bar-fill.clipping {
  background: linear-gradient(90deg, #f44336, #ff5722, #ff9800);
}

.level-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  padding: 0 2px;
}

.level-label {
  font-size: 9px;
  opacity: 0.5;
  font-family: monospace;
}

.level-current {
  text-align: right;
  font-size: 10px;
  font-family: monospace;
  opacity: 0.7;
  margin-top: 2px;
  transition: color 0.1s;
}

.level-current.clipping {
  color: #ff5722;
  opacity: 1;
  font-weight: 600;
}
</style>
