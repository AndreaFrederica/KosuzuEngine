<template>
  <div class="end-screen">
    <!-- 背景图 -->
    <div class="end-background" :style="{ backgroundImage: `url(${backgroundImage})` }"></div>

    <!-- 遮罩层 -->
    <div class="end-overlay"></div>

    <!-- 结束内容 -->
    <div class="end-content">
      <!-- 感谢文字 -->
      <div class="end-text">
        <h1 class="end-title">感谢游玩</h1>
        <p class="end-subtitle">Thank You for Playing</p>
        <p class="end-message">故事到此结束</p>
      </div>

      <!-- 游戏信息 -->
      <div class="game-info">
        <div class="game-name">{{ gameConfig.name }}</div>
        <div v-if="gameConfig.subtitle" class="game-subtitle">{{ gameConfig.subtitle }}</div>
      </div>

      <!-- 操作按钮 -->
      <div class="end-actions">
        <button class="end-action-btn" @click="goToTitle">
          <span class="action-text">返回主菜单</span>
          <span class="action-text-en">Title Screen</span>
        </button>
        <button class="end-action-btn secondary" @click="goToSplash">
          <span class="action-text">重新开始</span>
          <span class="action-text-en">Replay</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { gameRegistry } from '../registry';
import type { GameConfig } from '../config';

const router = useRouter();

// 获取游戏配置
const gameConfig: GameConfig = gameRegistry.getDefault() || {
  id: 'demo-vn',
  name: 'DEMO VN',
  version: 'v0.1.0',
  titleBackground: '/assets/bg/haikei_01_sora/jpg/sora_01.jpg',
};

// 使用自定义背景或默认背景
const backgroundImage = gameConfig.titleBackground || '/assets/bg/haikei_01_sora/jpg/sora_01.jpg';

function goToTitle() {
  void router.push('/title');
}

function goToSplash() {
  void router.push('/');
}
</script>

<style scoped>
.end-screen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
}

.end-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  animation: end-bg-fade 2s ease-in-out;
}

@keyframes end-bg-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.end-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.5) 0%,
    rgba(0, 0, 0, 0.7) 50%,
    rgba(0, 0, 0, 0.9) 100%
  );
}

.end-content {
  position: relative;
  z-index: 10;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 40px;
  text-align: center;
}

.end-text {
  animation: end-text-fade-in 1.5s ease-out;
}

.end-title {
  font-size: 56px;
  font-weight: 700;
  margin: 0 0 16px 0;
  color: #fff;
  letter-spacing: 4px;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.end-subtitle {
  font-size: 24px;
  color: rgba(255, 255, 255, 0.8);
  margin: 0 0 40px 0;
  letter-spacing: 2px;
}

.end-message {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
  font-style: italic;
}

.game-info {
  margin: 40px 0;
  padding: 24px 40px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  animation: game-info-fade-in 1s ease-out 0.5s both;
}

.game-name {
  font-size: 32px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 8px;
  letter-spacing: 2px;
}

.game-subtitle {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 1px;
}

.end-actions {
  display: flex;
  gap: 16px;
  animation: actions-fade-in 1s ease-out 1s both;
}

.end-action-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 16px 32px;
  color: #fff;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 160px;
}

.end-action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4);
}

.end-action-btn:active {
  transform: translateY(0);
}

.end-action-btn.secondary {
  background: rgba(255, 255, 255, 0.1);
}

.end-action-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.2);
}

.action-text {
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 1px;
}

.action-text-en {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

@keyframes end-text-fade-in {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes game-info-fade-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes actions-fade-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
