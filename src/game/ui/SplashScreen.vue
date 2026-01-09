<template>
  <div class="splash-screen">
    <div class="logo-slide engine-logo-slide">
      <a
        href="https://github.com/AndreaFrederica/KosuzuEngine"
        target="_blank"
        rel="noopener noreferrer"
        class="engine-link"
      >
        <img src="/logo.png" alt="KosuzuEngine Logo" class="engine-logo" />
        <div class="engine-text">
          <p class="engine-info">Powered by</p>
          <h2 class="engine-name">KosuzuEngine</h2>
        </div>
      </a>
      <a
        href="https://github.com/AndreaFrederica/patchouli.js"
        target="_blank"
        rel="noopener noreferrer"
        class="patchouli-link"
      >
        <img src="/patchouli.js_logo.png" alt="patchouli.js" class="patchouli-icon" />
        <div class="patchouli-text">
          <p class="patchouli-info">inside</p>
          <h2 class="patchouli-name">Patchouli.js</h2>
        </div>
      </a>
    </div>

    <div class="logo-slide game-logo-slide">
      <h1 class="game-title">{{ gameConfig.name }}</h1>
      <p v-if="gameConfig.subtitle" class="game-subtitle">{{ gameConfig.subtitle }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { gameRegistry } from '../index'; // 从 index 导入，确保 registerDefaultGame() 被执行

const router = useRouter();

// 获取游戏配置（使用非空断言，因为 registerDefaultGame() 会在模块导入时执行）
const gameConfig = gameRegistry.getDefault()!;

async function runSplashSequence() {
  // 引擎 Logo: 淡入 1s -> 停留 1.5s -> 淡出 0.8s
  await sleep(3300);

  // 游戏 Logo: 淡入 1s -> 停留 2s -> 淡出 0.8s
  await sleep(3800);

  // 跳转到主界面
  void router.push('/title');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

onMounted(() => {
  void runSplashSequence();
});
</script>

<style scoped>
.splash-screen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  overflow: hidden;
}

.logo-slide {
  position: absolute;
  text-align: center;
  opacity: 0;
}

/* 引擎 Logo 动画 */
.engine-logo-slide {
  animation: engine-logo-fade 3.3s ease-in-out forwards;
}

@keyframes engine-logo-fade {
  0% {
    opacity: 0;
  }
  30.3% {
    /* 1s 淡入 */
    opacity: 1;
  }
  75.8% {
    /* 1.5s 停留后，共 2.5s */
    opacity: 1;
  }
  100% {
    /* 0.8s 淡出，共 3.3s */
    opacity: 0;
  }
}

/* 游戏 Logo 动画 */
.game-logo-slide {
  animation: game-logo-fade 3.8s ease-in-out forwards;
  animation-delay: 3.3s;
}

@keyframes game-logo-fade {
  0% {
    opacity: 0;
  }
  26.3% {
    /* 1s 淡入 */
    opacity: 1;
  }
  78.9% {
    /* 2s 停留后，共 3s */
    opacity: 1;
  }
  100% {
    /* 0.8s 淡出，共 3.8s */
    opacity: 0;
  }
}

.engine-logo-slide {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 40px;
  animation: engine-logo-fade 3.3s ease-in-out forwards;
}

.engine-logo {
  width: 80px;
  height: 80px;
  object-fit: contain;
  filter: drop-shadow(0 4px 20px rgba(0, 0, 0, 0.2));
  opacity: 0.9;
}

.engine-name {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  letter-spacing: 2px;
  margin: 0;
  opacity: 0.9;
  line-height: 1;
}

.engine-info {
  font-size: 14px;
  color: #666;
  letter-spacing: 1px;
  margin: 0;
  opacity: 0.6;
  line-height: 1;
}

.engine-link {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  transition: all 0.3s ease;
}

.engine-link:hover .engine-logo {
  opacity: 1;
}

.engine-link:hover .engine-name {
  opacity: 1;
}

.engine-link:hover .engine-info {
  opacity: 0.8;
}

.engine-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0; /* tighten vertical spacing between the two lines */
}

.patchouli-link {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  transition: all 0.3s ease;
}

.patchouli-icon {
  width: 80px;
  height: 80px;
  object-fit: contain;
  opacity: 0.9;
}

.patchouli-name {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  letter-spacing: 0.5px;
  margin: 0;
  opacity: 0.9;
  line-height: 1;
}

.patchouli-info {
  font-size: 14px;
  color: #666;
  letter-spacing: 1px;
  margin: 0;
  opacity: 0.6;
  text-transform: lowercase;
  line-height: 1;
}

.patchouli-link:hover .patchouli-icon {
  opacity: 1;
}

.patchouli-link:hover .patchouli-name {
  opacity: 1;
}

.patchouli-link:hover .patchouli-info {
  opacity: 0.8;
}

.patchouli-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0; /* tighten vertical spacing between the two lines */
}

.game-logo-slide {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.game-title {
  font-size: 72px;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 4px;
}

.game-subtitle {
  margin-top: 20px;
  font-size: 18px;
  color: rgba(0, 0, 0, 0.6);
  letter-spacing: 6px;
  text-transform: uppercase;
}
</style>
