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
        <button class="menu-button" @click="goToPlayground">
          <span class="button-text">Live2D游乐场</span>
          <span class="button-text-en">Playground</span>
        </button>
      </div>

      <!-- 底部信息 -->
      <div class="footer-info">
        <!-- BGM 控制组件 -->
        <div v-if="hasInteracted" class="bgm-control-wrapper">
          <BGMControl />
        </div>
        <!-- 引擎品牌 (Logo + 文字) -->
        <div class="engine-brand">
          <!-- 引擎Logo和文字链接 -->
          <a
            href="https://github.com/AndreaFrederica/KosuzuEngine"
            target="_blank"
            rel="noopener noreferrer"
            class="engine-link"
          >
            <img src="/logo.png" alt="KosuzuEngine" class="engine-logo" />
            <div class="engine-text">
              <p class="engine-info">Powered by</p>
              <p class="engine-name">KosuzuEngine</p>
            </div>
          </a>
          <!-- Patchouli 链接 -->
          <a
            href="https://github.com/AndreaFrederica/patchouli.js"
            target="_blank"
            rel="noopener noreferrer"
            class="patchouli-link"
          >
            <img src="/patchouli.js_logo.png" alt="patchouli.js" class="patchouli-icon" />
            <div class="patchouli-text">
              <p class="patchouli-info">inside</p>
              <p class="patchouli-name">Patchouli.js</p>
            </div>
          </a>
          <!-- GitHub 链接 -->
          <a
            href="https://github.com/AndreaFrederica/KosuzuEngine"
            target="_blank"
            rel="noopener noreferrer"
            class="github-link"
          >
            <svg class="github-icon" viewBox="0 0 16 16" fill="currentColor">
              <path
                d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
              />
            </svg>
            <span class="github-text">GitHub</span>
          </a>
          <!-- Wiki 链接 -->
          <a
            href="https://wiki.sirrus.cc/KosuzuEngine/"
            target="_blank"
            rel="noopener noreferrer"
            class="wiki-link"
          >
            <svg class="wiki-icon" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"
              />
            </svg>
            <span class="wiki-text">Wiki</span>
          </a>
        </div>

        <!-- 游戏版本信息 -->
        <div class="game-version">
          <p class="version-info">{{ gameConfig.version }}</p>
          <p v-if="gameConfig.author" class="author-info">{{ gameConfig.author }}</p>
        </div>
      </div>
    </div>

    <!-- 点击提示 -->
    <Transition name="prompt-fade">
      <div v-if="showPrompt" class="click-prompt">
        <span class="prompt-text">点击屏幕开始</span>
      </div>
    </Transition>

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
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { gameRegistry } from '../index'; // 从 index 导入，确保 registerDefaultGame() 被执行
import { bgm } from '../../engine/audio';
import { audioManager } from '../../engine/render/AudioManager';
import BGMControl from '../../engine/render/BGMControl.vue';

const router = useRouter();
const showGallery = ref(false);
const hasInteracted = ref(false);
const showPrompt = ref(true);

// 获取游戏配置（使用非空断言，因为 registerDefaultGame() 会在模块导入时执行）
const gameConfig = gameRegistry.getDefault()!;

// 使用自定义背景或默认背景
const backgroundImage = gameConfig.titleBackground || '/assets/bg/haikei_01_sora/jpg/sora_01.jpg';

// 首次用户交互时播放BGM（绕过自动播放限制）
function handleFirstInteraction() {
  if (!hasInteracted.value) {
    hasInteracted.value = true;

    // 先淡出提示
    showPrompt.value = false;

    // 延迟解锁音频并播放，等待淡出完成
    setTimeout(() => {
      audioManager.handleUserInteraction();
      void bgm.play('ようこそ.ogg', { fadeIn: 1000 });
    }, 300);
  }
}

// 组件挂载时添加全局交互监听
onMounted(() => {
  const events = ['click', 'keydown', 'touchstart', 'mousedown'] as const;
  events.forEach((event) => {
    window.addEventListener(event, handleFirstInteraction, { once: true, passive: true });
  });
});

// 组件卸载时移除监听
onUnmounted(() => {
  const events = ['click', 'keydown', 'touchstart', 'mousedown'] as const;
  events.forEach((event) => {
    window.removeEventListener(event, handleFirstInteraction);
  });
});

// 按钮点击音效（暂无文件）
function playClickSound() {
  // TODO: 添加 click.ogg 到 /assets/audio/sfx/
  // void sfx.play('/assets/audio/sfx/click.ogg', { volume: 0.5 });
}

async function startNewGame() {
  playClickSound();
  // 清除存档进度，从零开始
  localStorage.removeItem('kosuzu_engine_progress');
  localStorage.removeItem('kosuzu_engine_state');

  console.log('[TitleScreen] 开始停止BGM...');
  // 停止背景音乐并切换到游戏界面
  await bgm.stop({ fadeOut: 500 });
  console.log('[TitleScreen] BGM已停止，准备导航到游戏界面...');
  await router.push('/demo');
  console.log('[TitleScreen] 导航命令已执行');
}

function goToSaveLoad() {
  playClickSound();
  void router.push('/saves');
}

function goToSettings() {
  playClickSound();
  void router.push('/settings');
}

function goToPlayground() {
  playClickSound();
  console.log('[TitleScreen] 开始停止BGM...');
  // 停止背景音乐并切换到游戏界面
  void bgm.stop({ fadeOut: 500 });
  void router.push('/playground');
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
  font-size: clamp(32px, 8vw, 64px);
  font-weight: 700;
  margin: 0;
  background: linear-gradient(135deg, #fff 0%, #e0e0e0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  letter-spacing: clamp(4px, 1vw, 8px);
}

.title-subtitle {
  font-size: clamp(14px, 3vw, 20px);
  color: rgba(255, 255, 255, 0.8);
  margin-top: 20px;
  letter-spacing: clamp(2px, 0.5vw, 4px);
  font-weight: 300;
}

.menu-buttons {
  display: flex;
  flex-direction: column;
  gap: clamp(4px, 1vw, 8px);
  width: 100%;
  max-width: 400px;
  animation: menu-fade-in 1s ease-out 0.5s both;
}

.menu-button {
  position: relative;
  background: transparent;
  border: none;
  padding: clamp(6px, 1.5vw, 10px) clamp(24px, 5vw, 32px);
  padding-left: 0;
  color: #fff;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  overflow: visible;
}

.menu-button::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.3) 50%,
    transparent 100%
  );
  transition: all 0.3s ease;
}

.menu-button::after {
  content: '';
  position: absolute;
  left: 50%;
  right: 50%;
  bottom: 0;
  height: 1px;
  background: rgba(255, 255, 255, 0.6);
  opacity: 0;
  transition: all 0.3s ease;
  transform: translateX(-50%);
}

.menu-button:hover {
  /* 取消右移效果，保持居中 */
  transform: none;
}

.menu-button:hover::before {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.5) 50%,
    transparent 100%
  );
}

.menu-button:hover::after {
  opacity: 1;
  left: 0;
  right: 0;
  transform: none;
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
}

.menu-button:active {
  /* 仅在按下时做轻微缩放，不偏移位置 */
  transform: scale(0.98);
}

.button-text {
  font-size: clamp(16px, 4vw, 20px);
  font-weight: 500;
  letter-spacing: clamp(1px, 0.3vw, 2px);
}

.button-text-en {
  font-size: clamp(10px, 2.5vw, 12px);
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: clamp(0.5px, 0.2vw, 1px);
  text-transform: uppercase;
}

.footer-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
  animation: footer-fade-in 1s ease-out 1s both;
  padding-bottom: 20px;
}

.engine-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.engine-logo-section {
  display: flex;
  justify-content: center;
  align-items: center;
}

.engine-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 10px;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.engine-link:hover {
  color: rgba(255, 255, 255, 1);
  background: rgba(255, 255, 255, 0.1);
}

.engine-logo {
  height: 50px;
  width: auto;
  object-fit: contain;
  opacity: 0.9;
  transition: opacity 0.3s ease;
}

.engine-link:hover .engine-logo {
  opacity: 1;
}

.engine-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.engine-info {
  font-size: 12px;
  margin: 0;
  opacity: 0.6;
  letter-spacing: 1px;
}

.engine-name {
  font-size: 16px;
  margin: 0;
  font-weight: 600;
  letter-spacing: 2px;
  opacity: 0.9;
}

.game-version {
  display: flex;
  flex-direction: column;
  gap: 4px;
  opacity: 0.5;
}

.version-info {
  font-size: 11px;
  margin: 0;
}

.author-info {
  font-size: 11px;
  margin: 0;
}

/* GitHub 链接 */
.github-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  margin-left: 12px;
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.github-link:hover {
  color: rgba(255, 255, 255, 1);
  background: rgba(255, 255, 255, 0.1);
}

.github-icon {
  width: 40px;
  height: 40px;
  fill: currentColor;
}

.github-text {
  font-size: 18px;
  font-weight: 500;
}

/* Wiki 链接 */
.wiki-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  margin-left: 12px;
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.wiki-link:hover {
  color: rgba(255, 255, 255, 1);
  background: rgba(255, 255, 255, 0.1);
}

.wiki-icon {
  width: 40px;
  height: 40px;
  fill: currentColor;
}

.wiki-text {
  font-size: 18px;
  font-weight: 500;
}

/* Patchouli 链接 */
.patchouli-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  margin-left: 12px;
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.patchouli-link:hover {
  color: rgba(255, 255, 255, 1);
  background: rgba(255, 255, 255, 0.1);
}

.patchouli-icon {
  width: 40px;
  height: 40px;
  object-fit: contain;
  opacity: 0.9;
  transition: opacity 0.3s ease;
}

.patchouli-link:hover .patchouli-icon {
  opacity: 1;
}

.patchouli-link:hover .patchouli-name {
  opacity: 1;
}

.patchouli-link:hover .patchouli-info {
  opacity: 0.7;
}

.engine-link:hover .engine-name {
  opacity: 1;
}

.engine-link:hover .engine-info {
  opacity: 0.7;
}

.patchouli-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.patchouli-info {
  font-size: 12px;
  margin: 0;
  opacity: 0.6;
  letter-spacing: 1px;
}

.patchouli-name {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  letter-spacing: 2px;
  opacity: 0.9;
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

/* 响应式布局 - 移动端优化 */
@media (max-width: 768px) {
  .title-content {
    padding: 40px 20px 20px;
  }

  .game-title-section {
    margin-top: 40px;
  }

  .menu-buttons {
    max-width: 100%;
  }

  .footer-info {
    gap: 12px;
    padding-bottom: 16px;
  }

  .engine-logo {
    height: 40px;
  }

  .engine-brand {
    gap: 8px;
  }

  .engine-info {
    font-size: 10px;
  }

  .engine-info {
    font-size: 10px;
  }

  .engine-name {
    font-size: 14px;
  }

  .version-info,
  .author-info {
    font-size: 10px;
  }

  .github-link {
    padding: 6px 10px;
  }

  .github-icon {
    width: 16px;
    height: 16px;
  }

  .github-text {
    font-size: 11px;
  }

  .patchouli-link {
    padding: 6px 10px;
  }

  .patchouli-icon {
    width: 16px;
    height: 16px;
  }

  .patchouli-info {
    font-size: 10px;
  }

  .patchouli-name {
    font-size: 14px;
  }
}

/* 超小屏幕 */
@media (max-width: 480px) {
  .title-content {
    padding: 30px 16px 16px;
  }

  .game-title-section {
    margin-top: 30px;
  }

  .menu-button {
    border-radius: 6px;
  }

  .engine-logo {
    height: 32px;
  }
}

/* 大屏幕优化 */
@media (min-width: 1920px) {
  .menu-buttons {
    max-width: 500px;
  }

  .title-game-name {
    font-size: 80px;
  }
}

/* 小高度屏幕优化 (横向平板或窄屏幕) */
@media (max-height: 600px) {
  .title-content {
    flex-direction: row;
    flex-wrap: wrap;
    padding: 20px 40px;
    justify-content: center;
    align-content: center;
    gap: 20px;
  }

  .game-title-section {
    margin-top: 0;
    flex: 1 1 auto;
    min-width: 200px;
  }

  .title-game-name {
    font-size: clamp(24px, 4vw, 48px);
  }

  .title-subtitle {
    font-size: clamp(12px, 2vw, 16px);
    margin-top: 12px;
  }

  .menu-buttons {
    flex: 0 0 auto;
    max-width: 300px;
    gap: 8px;
  }

  .footer-info {
    position: absolute;
    bottom: 10px;
    right: 20px;
    flex-direction: row;
    gap: 12px;
    padding-bottom: 0;
  }

  .engine-brand {
    flex-direction: row;
  }

  .game-version {
    display: none;
  }

  .wiki-link {
    display: none;
  }
}

/* 超小高度屏幕 */
@media (max-height: 450px) {
  .title-content {
    padding: 10px 30px;
    gap: 10px;
  }

  .game-title-section {
    min-width: 150px;
  }

  .title-game-name {
    font-size: clamp(20px, 3vw, 36px);
  }

  .title-subtitle {
    margin-top: 8px;
  }

  .menu-buttons {
    max-width: 250px;
  }

  .menu-button {
    padding: 8px 16px;
  }

  .button-text {
    font-size: clamp(14px, 2.5vw, 18px);
  }

  .button-text-en {
    font-size: clamp(9px, 1.5vw, 10px);
  }

  .wiki-link {
    display: none;
  }
}

/* 点击提示 */
.click-prompt {
  position: fixed;
  bottom: 15%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  animation: prompt-fade-in 1s ease-out;
}

/* Vue Transition 淡入淡出 */
.prompt-fade-enter-active {
  animation: prompt-fade-in 1s ease-out;
}

.prompt-fade-leave-active {
  animation: prompt-fade-out 0.3s ease-out forwards;
}

.prompt-fade-enter-from,
.prompt-fade-leave-to {
  opacity: 0;
}

.prompt-text {
  display: inline-block;
  padding: 12px 24px;
  font-size: clamp(16px, 3vw, 20px);
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 3px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: prompt-blink 2s ease-in-out infinite;
}

@keyframes prompt-fade-in {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

@keyframes prompt-fade-out {
  from {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  to {
    opacity: 0;
    transform: translateX(-50%) translateY(-10px);
  }
}

@keyframes prompt-blink {
  0%,
  100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

/* BGM 控制组件容器 */
.bgm-control-wrapper {
  position: relative;
  z-index: 50;
}
</style>
