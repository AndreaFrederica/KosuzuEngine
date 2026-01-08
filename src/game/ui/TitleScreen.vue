<template>
  <div class="title-screen">
    <!-- 背景图 -->
    <div class="title-background" :style="{ backgroundImage: `url(${backgroundImage})` }"></div>

    <!-- 遮罩层 -->
    <div class="title-overlay"></div>

    <!-- 主内容 -->
    <div class="title-content">
      <!-- 游戏标题 -->
      <div class="game-title-section">
        <h1 class="title-game-name">{{ gameConfig.name }}</h1>
        <p v-if="gameConfig.subtitle" class="title-subtitle">~ {{ gameConfig.subtitle }} ~</p>
      </div>

      <!-- 菜单按钮 -->
      <div class="menu-buttons">
        <button class="menu-button" @click="startNewGame">
          <span class="button-text">开始游戏</span>
          <span class="button-text-en">New Game</span>
        </button>
        <button class="menu-button" @click="goToSaveLoad">
          <span class="button-text">继续游戏</span>
          <span class="button-text-en">Continue</span>
        </button>
        <button class="menu-button" @click="goToSettings">
          <span class="button-text">设置</span>
          <span class="button-text-en">Settings</span>
        </button>
        <button class="menu-button" @click="showGallery = true">
          <span class="button-text">图鉴</span>
          <span class="button-text-en">Gallery</span>
        </button>
      </div>

      <!-- 底部信息 -->
      <div class="footer-info">
        <p class="engine-info">Powered by KosuzuEngine</p>
        <p class="version-info">{{ gameConfig.version }}</p>
        <p v-if="gameConfig.author" class="author-info">{{ gameConfig.author }}</p>
      </div>
    </div>

    <!-- 图鉴面板 -->
    <div v-if="showGallery" class="gallery-panel" @click="showGallery = false">
      <div class="gallery-content" @click.stop>
        <h2>图鉴 / Gallery</h2>
        <p class="gallery-placeholder">敬请期待...</p>
        <button class="close-button" @click="showGallery = false">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { gameRegistry } from '../registry';
import { bgm } from '../../engine/audio';
import { nav } from '../../engine/navigation';

const router = useRouter();
const showGallery = ref(false);

// 获取游戏配置
const gameConfig = gameRegistry.getDefault() || {
  name: 'DEMO VN',
  subtitle: 'A Visual Novel Demo',
  version: 'v0.1.0',
  author: 'KosuzuEngine',
  titleBackground: '/assets/bg/haikei_01_sora/jpg/sora_01.jpg',
};

// 使用自定义背景或默认背景
const backgroundImage = gameConfig.titleBackground || '/assets/bg/haikei_01_sora/jpg/sora_01.jpg';

// 按钮点击音效（暂无文件）
function playClickSound() {
  // TODO: 添加 click.ogg 到 /assets/audio/sfx/
  // void sfx.play('/assets/audio/sfx/click.ogg', { volume: 0.5 });
}

// 组件挂载时播放背景音乐
onMounted(() => {
  // 使用全局音频 API 播放主菜单背景音乐
  // 使用现有的 BGM 文件
  void bgm.play('ようこそ.ogg', { fadeIn: 1000 });
});

function startNewGame() {
  playClickSound();
  // 清除存档进度，从零开始
  localStorage.removeItem('kosuzu_engine_progress');
  localStorage.removeItem('kosuzu_engine_state');

  // 停止背景音乐并切换到游戏界面
  void bgm.stop({ fadeOut: 500 });
  setTimeout(() => {
    nav.goToGame();
  }, 500);
}

function goToSaveLoad() {
  playClickSound();
  void router.push('/saves');
}

function goToSettings() {
  playClickSound();
  void router.push('/settings');
}
</script>

<style scoped>
.title-screen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
}

.title-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.title-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.3) 0%,
    rgba(0, 0, 0, 0.5) 50%,
    rgba(0, 0, 0, 0.7) 100%
  );
}

.title-content {
  position: relative;
  z-index: 10;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 60px 40px 40px;
}

.game-title-section {
  text-align: center;
  margin-top: 80px;
  animation: title-fade-in 1.5s ease-out;
}

.title-game-name {
  font-size: 64px;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(135deg, #fff 0%, #e0e0e0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  letter-spacing: 8px;
}

.title-subtitle {
  font-size: 20px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 20px;
  letter-spacing: 4px;
  font-weight: 300;
}

.menu-buttons {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 400px;
  animation: menu-fade-in 1s ease-out 0.5s both;
}

.menu-button {
  position: relative;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 16px 32px;
  color: #fff;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.menu-button:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
  transform: translateX(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.menu-button:active {
  transform: translateX(10px) scale(0.98);
}

.button-text {
  font-size: 20px;
  font-weight: 500;
  letter-spacing: 2px;
}

.button-text-en {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 1px;
  text-transform: uppercase;
}

.footer-info {
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  animation: footer-fade-in 1s ease-out 1s both;
}

.engine-info {
  font-size: 14px;
  margin: 0;
}

.version-info {
  font-size: 12px;
  margin: 8px 0 0 0;
}

.author-info {
  font-size: 12px;
  margin: 4px 0 0 0;
  opacity: 0.7;
}

/* 图鉴面板 */
.gallery-panel {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fade-in 0.3s ease;
}

.gallery-content {
  background: rgba(20, 20, 30, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 40px;
  min-width: 400px;
  text-align: center;
  color: #fff;
}

.gallery-content h2 {
  margin: 0 0 20px 0;
  font-size: 24px;
}

.gallery-placeholder {
  color: rgba(255, 255, 255, 0.6);
  margin: 40px 0;
}

.close-button {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  padding: 10px 24px;
  color: #fff;
  cursor: pointer;
  transition: background 0.2s;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* 动画 */
@keyframes title-fade-in {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes menu-fade-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes footer-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
