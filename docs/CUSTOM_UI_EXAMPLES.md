# UI 样式自定义示例

本文档提供了各种 UI 自定义的实际示例，帮助你快速实现想要的视觉效果。

## 示例 1: 经典 Galgame 风格

一个经典的日式视觉小说游戏界面风格。

```scss
// src/game/ui/game-custom-styles.scss
:root {
  // 对话框 - 经典的半透明黑色背景
  --ke-dialog-box-bg: rgba(0, 0, 0, 0.75);
  --ke-dialog-box-border: 2px solid rgba(255, 255, 255, 0.4);
  --ke-dialog-box-border-radius: 4px;
  --ke-dialog-box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);

  // 说话人名字 - 经典的蓝色
  --ke-dialog-speaker-color: #4fc3f7;
  --ke-dialog-speaker-font-size: 1.3rem;
  --ke-dialog-speaker-font-weight: bold;
  --ke-dialog-speaker-margin: 0 0 0.75rem 0.5rem;

  // 对话文本 - 清晰的白色
  --ke-dialog-text-color: #ffffff;
  --ke-dialog-text-font-size: 1.05rem;
  --ke-dialog-text-line-height: 1.75;

  // 继续按钮 - 经典的三角形指示器
  --ke-continue-btn-bg: transparent;
  --ke-continue-btn-color: #ffffff;
}

// 添加继续按钮的三角形指示器
.dialog-content .absolute-bottom-right .q-btn::after {
  content: '▼';
  margin-left: 4px;
  animation: bounce 1s infinite;
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(3px);
  }
}
```

## 示例 2: 现代简约风格

干净的现代设计，适合移动端优化。

```scss
:root {
  // 对话框 - 毛玻璃效果
  --ke-dialog-box-bg: rgba(255, 255, 255, 0.15);
  --ke-dialog-box-border: 1px solid rgba(255, 255, 255, 0.2);
  --ke-dialog-box-border-radius: 20px;
  --ke-dialog-box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  --ke-dialog-box-padding: 20px;

  // 对话框工具栏 - 隐藏或简化
  --ke-dialog-toolbar-bg: rgba(255, 255, 255, 0.1);
  --ke-dialog-toolbar-border-bottom: none;

  // 说话人名字
  --ke-dialog-speaker-color: #2196f3;
  --ke-dialog-speaker-font-size: 1rem;
  --ke-dialog-speaker-font-weight: 600;
  --ke-dialog-speaker-margin: 0 0 0.5rem 0;

  // 对话文本
  --ke-dialog-text-color: #ffffff;
  --ke-dialog-text-font-size: 1rem;
  --ke-dialog-text-line-height: 1.6;

  // 选择按钮 - 现代胶囊形状
  --ke-choice-btn-bg: rgba(255, 255, 255, 0.2);
  --ke-choice-btn-color: #ffffff;
  --ke-choice-btn-border: none;
  --ke-choice-btn-border-radius: 50px;
  --ke-choice-btn-padding: 14px 28px;
  --ke-choice-btn-hover-bg: rgba(255, 255, 255, 0.3);
}

.dialog-box {
  backdrop-filter: blur(10px);
}
```

## 示例 3: 蒸汽朋克风格

充满机械感和复古风格的界面。

```scss
:root {
  // 对话框 - 铜色调
  --ke-dialog-box-bg: rgba(60, 40, 20, 0.9);
  --ke-dialog-box-border: 4px solid #b8860b;
  --ke-dialog-box-border-radius: 0;
  --ke-dialog-box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.5), 4px 4px 0 #8b7355;

  // 说话人名字 - 金色
  --ke-dialog-speaker-color: #ffd700;
  --ke-dialog-speaker-font-size: 1.4rem;
  --ke-dialog-speaker-font-weight: bold;

  // 对话文本 - 米黄色
  --ke-dialog-text-color: #f5deb3;
  --ke-dialog-text-font-size: 1.05rem;
  --ke-dialog-text-line-height: 1.7;

  // 选择按钮 - 机械风格
  --ke-choice-panel-bg: rgba(60, 40, 20, 0.95);
  --ke-choice-panel-border: 3px solid #b8860b;
  --ke-choice-btn-bg: linear-gradient(180deg, #cd853f 0%, #8b4513 100%);
  --ke-choice-btn-color: #ffd700;
  --ke-choice-btn-border: 2px solid #b8860b;
  --ke-choice-btn-border-radius: 4px;
  --ke-choice-btn-hover-bg: linear-gradient(180deg, #daa520 0%, #a0522d 100%);
}

// 添加齿轮装饰
.dialog-box::before {
  content: '⚙';
  position: absolute;
  top: -20px;
  right: -20px;
  font-size: 40px;
  color: #b8860b;
  animation: spin 10s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
```

## 示例 4: 赛博朋克风格

霓虹灯和未来科技感的界面。

```scss
:root {
  // 对话框 - 深色背景配合霓虹边框
  --ke-dialog-box-bg: rgba(10, 10, 20, 0.9);
  --ke-dialog-box-border: 2px solid #00ffff;
  --ke-dialog-box-border-radius: 0;
  --ke-dialog-box-shadow: 0 0 20px rgba(0, 255, 255, 0.3), 0 0 40px rgba(0, 255, 255, 0.1);
  --ke-dialog-box-padding: 20px;

  // 说话人名字 - 霓虹青色
  --ke-dialog-speaker-color: #00ffff;
  --ke-dialog-speaker-font-size: 1.3rem;
  --ke-dialog-speaker-font-weight: bold;
  text-shadow: 0 0 10px #00ffff;

  // 对话文本 - 白色带蓝色阴影
  --ke-dialog-text-color: #ffffff;
  --ke-dialog-text-font-size: 1rem;
  --ke-dialog-text-line-height: 1.6;

  // 选择按钮 - 霓虹效果
  --ke-choice-btn-bg: transparent;
  --ke-choice-btn-color: #ff00ff;
  --ke-choice-btn-border: 2px solid #ff00ff;
  --ke-choice-btn-border-radius: 0;
  --ke-choice-btn-padding: 16px 32px;
  --ke-choice-btn-hover-bg: rgba(255, 0, 255, 0.2);
  --ke-choice-btn-hover-border-color: #00ffff;

  // 继续按钮
  --ke-continue-btn-bg: #ff00ff;
  --ke-continue-btn-color: #ffffff;
}

// 添加扫描线效果
.dialog-box {
  position: relative;
  overflow: hidden;
}

.dialog-box::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.1),
    rgba(0, 0, 0, 0.1) 1px,
    transparent 1px,
    transparent 2px
  );
  pointer-events: none;
}

// 添加故障效果（需要 JavaScript 支持）
@keyframes glitch {
  0% {
    transform: translate(0);
  }
  20% {
    transform: translate(-2px, 2px);
  }
  40% {
    transform: translate(-2px, -2px);
  }
  60% {
    transform: translate(2px, 2px);
  }
  80% {
    transform: translate(2px, -2px);
  }
  100% {
    transform: translate(0);
  }
}
```

## 示例 5: 可爱卡通风风格

明亮的颜色和圆润的设计。

```scss
:root {
  // 对话框 - 粉色圆角
  --ke-dialog-box-bg: rgba(255, 182, 193, 0.95);
  --ke-dialog-box-border: 4px solid #ff69b4;
  --ke-dialog-box-border-radius: 25px;
  --ke-dialog-box-shadow: 0 6px 0 #db7093, 0 12px 20px rgba(0, 0, 0, 0.2);
  --ke-dialog-box-padding: 24px;

  // 对话框工具栏
  --ke-dialog-toolbar-bg: rgba(255, 105, 180, 0.3);

  // 说话人名字 - 深粉色
  --ke-dialog-speaker-color: #c71585;
  --ke-dialog-speaker-font-size: 1.5rem;
  --ke-dialog-speaker-font-weight: 900;

  // 对话文本 - 深褐色
  --ke-dialog-text-color: #4a3728;
  --ke-dialog-text-font-size: 1.1rem;
  --ke-dialog-text-line-height: 1.8;

  // 选择按钮 - 圆润可爱
  --ke-choice-btn-bg: linear-gradient(180deg, #ffb6c1 0%, #ff69b4 100%);
  --ke-choice-btn-color: #ffffff;
  --ke-choice-btn-border: 3px solid #c71585;
  --ke-choice-btn-border-radius: 20px;
  --ke-choice-btn-padding: 18px 36px;
  --ke-choice-btn-hover-bg: linear-gradient(180deg, #ffc0cb 0%, #ff1493 100%);
  --ke-choice-btn-shadow: 0 4px 0 #db7093;
}

// 添加可爱的星星装饰
.dialog-box::before {
  content: '⭐';
  position: absolute;
  top: -15px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 30px;
  animation: twinkle 1.5s ease-in-out infinite;
}

@keyframes twinkle {
  0%,
  100% {
    opacity: 1;
    transform: translateX(-50%) scale(1);
  }
  50% {
    opacity: 0.5;
    transform: translateX(-50%) scale(0.8);
  }
}
```

## 示例 6: 复古像素风格

8-bit 游戏的经典外观。

```scss
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

:root {
  // 对话框 - 纯黑背景
  --ke-dialog-box-bg: #000000;
  --ke-dialog-box-border: 4px solid #ffffff;
  --ke-dialog-box-border-radius: 0;
  --ke-dialog-box-shadow: 8px 8px 0 #333;
  --ke-dialog-box-padding: 16px;

  // 说话人名字 - 绿色
  --ke-dialog-speaker-color: #00ff00;
  --ke-dialog-speaker-font-size: 0.9rem;
  --ke-dialog-speaker-font-weight: normal;

  // 对话文本 - 白色
  --ke-dialog-text-color: #ffffff;
  --ke-dialog-text-font-size: 0.8rem;
  --ke-dialog-text-line-height: 1.6;

  // 选择按钮
  --ke-choice-btn-bg: #000000;
  --ke-choice-btn-color: #00ff00;
  --ke-choice-btn-border: 4px solid #00ff00;
  --ke-choice-btn-border-radius: 0;
  --ke-choice-btn-padding: 12px 20px;
  --ke-choice-btn-hover-bg: #003300;

  // 光标 - 红色方块
  --ke-typewriter-cursor-color: #ff0000;
  --ke-typewriter-cursor-width: 0.5rem;
}

// 应用像素字体
.dialog-box,
.choice-panel,
.settings-panel {
  font-family: 'Press Start 2P', monospace;
}

// 添加像素化光标
.typewriter-container .text-content .cursor {
  display: inline-block;
  width: var(--ke-typewriter-cursor-width);
  height: 1em;
  background: var(--ke-typewriter-cursor-color);
  animation: blink 0.5s step-end infinite;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}
```

## 示例 7: 中国古典风格

传统的中国水墨画风格。

```scss
@import url('https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&family=ZCOOL+XiaoWei&display=swap');

:root {
  // 对话框 - 宣纸质感
  --ke-dialog-box-bg: rgba(245, 245, 240, 0.92);
  --ke-dialog-box-border: 2px solid #8b4513;
  --ke-dialog-box-border-radius: 8px;
  --ke-dialog-box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  --ke-dialog-box-padding: 20px;

  // 说话人名字 - 朱红色
  --ke-dialog-speaker-color: #8b0000;
  --ke-dialog-speaker-font-size: 1.4rem;
  --ke-dialog-speaker-font-weight: bold;

  // 对话文本 - 墨黑色
  --ke-dialog-text-color: #2f2f2f;
  --ke-dialog-text-font-size: 1.1rem;
  --ke-dialog-text-line-height: 1.9;

  // 选择按钮
  --ke-choice-panel-bg: rgba(245, 245, 240, 0.95);
  --ke-choice-btn-bg: rgba(139, 69, 19, 0.1);
  --ke-choice-btn-color: #8b0000;
  --ke-choice-btn-border: 2px solid #8b4513;
  --ke-choice-btn-border-radius: 4px;
  --ke-choice-btn-padding: 16px 32px;
  --ke-choice-btn-hover-bg: rgba(139, 69, 19, 0.2);
}

// 应用中文字体
.dialog-box,
.choice-panel,
.settings-panel {
  font-family: 'ZCOOL XiaoWei', serif;
}

// 添加水印效果
.dialog-box {
  position: relative;
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4a574' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}

// 添加竖排文字效果（可选）
.dialog-content .text-bold {
  font-family: 'Ma Shan Zheng', cursive;
  writing-mode: horizontal-tb;
  letter-spacing: 0.1em;
}
```

## 示例 8: 暗黑奇幻风格

黑暗、神秘的视觉风格。

```scss
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Cormorant+Garamond:wght@400;600&display=swap');

:root {
  // 对话框 - 深邃的暗色
  --ke-dialog-box-bg: rgba(10, 5, 10, 0.95);
  --ke-dialog-box-border: 2px solid #4a4a4a;
  --ke-dialog-box-border-radius: 2px;
  --ke-dialog-box-shadow: inset 0 0 50px rgba(0, 0, 0, 0.8), 0 8px 32px rgba(0, 0, 0, 0.6);
  --ke-dialog-box-padding: 24px;

  // 说话人名字 - 血红色
  --ke-dialog-speaker-color: #8b0000;
  --ke-dialog-speaker-font-size: 1.5rem;
  --ke-dialog-speaker-font-weight: 700;

  // 对话文本 - 灰白色
  --ke-dialog-text-color: #d4d4d4;
  --ke-dialog-text-font-size: 1.05rem;
  --ke-dialog-text-line-height: 1.7;

  // 选择按钮 - 暗黑风格
  --ke-choice-panel-bg: rgba(10, 5, 10, 0.98);
  --ke-choice-btn-bg: linear-gradient(180deg, #2d2d2d 0%, #1a1a1a 100%);
  --ke-choice-btn-color: #c0c0c0;
  --ke-choice-btn-border: 1px solid #4a4a4a;
  --ke-choice-btn-border-radius: 2px;
  --ke-choice-btn-padding: 16px 28px;
  --ke-choice-btn-hover-bg: linear-gradient(180deg, #3d3d3d 0%, #2a2a2a 100%);
  --ke-choice-btn-hover-border-color: #8b0000;

  // 光标
  --ke-typewriter-cursor-color: #8b0000;
}

// 应用字体
.dialog-box {
  font-family: 'Cormorant Garamond', serif;
}

.dialog-content .text-bold {
  font-family: 'Cinzel', serif;
  text-transform: uppercase;
  letter-spacing: 0.15em;
}

// 添加暗淡的边框光晕
.dialog-box::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border: 1px solid rgba(139, 0, 0, 0.3);
  pointer-events: none;
  animation: pulse 3s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.3;
  }
  50% {
    opacity: 0.6;
  }
}
```

## 示例 9: 动态主题切换

在运行时切换不同主题的实现。

```scss
// 基础主题（默认）
:root {
  --ke-dialog-box-bg: rgba(0, 0, 0, 0.8);
  --ke-dialog-text-color: #ffffff;
}

// 春天主题
.theme-spring {
  --ke-dialog-box-bg: rgba(255, 218, 185, 0.9);
  --ke-dialog-box-border: 2px solid #ff69b4;
  --ke-dialog-speaker-color: #ff1493;
  --ke-dialog-text-color: #2d2d2d;
}

// 夏天主题
.theme-summer {
  --ke-dialog-box-bg: rgba(135, 206, 235, 0.9);
  --ke-dialog-box-border: 2px solid #00bfff;
  --ke-dialog-speaker-color: #0066cc;
  --ke-dialog-text-color: #000080;
}

// 秋天主题
.theme-autumn {
  --ke-dialog-box-bg: rgba(255, 165, 0, 0.9);
  --ke-dialog-box-border: 2px solid #8b4513;
  --ke-dialog-speaker-color: #8b0000;
  --ke-dialog-text-color: #1a1a1a;
}

// 冬天主题
.theme-winter {
  --ke-dialog-box-bg: rgba(240, 248, 255, 0.95);
  --ke-dialog-box-border: 2px solid #708090;
  --ke-dialog-speaker-color: #4682b4;
  --ke-dialog-text-color: #2f4f4f;
}

// 主题切换动画
* {
  transition:
    background 0.5s ease,
    border-color 0.5s ease,
    color 0.5s ease;
}
```

在 Vue 组件中使用：

```vue
<script setup lang="ts">
import { ref } from 'vue';

const seasons = ['default', 'spring', 'summer', 'autumn', 'winter'];
const currentSeason = ref('default');

function setSeason(season: string) {
  currentSeason.value = season;
  if (season === 'default') {
    document.documentElement.className = '';
  } else {
    document.documentElement.className = `theme-${season}`;
  }
}
</script>

<template>
  <div class="theme-selector">
    <button
      v-for="season in seasons"
      :key="season"
      @click="setSeason(season)"
      :class="{ active: currentSeason === season }"
    >
      {{ season === 'default' ? '默认' : season }}
    </button>
  </div>
</template>

<style scoped>
.theme-selector {
  position: fixed;
  top: 10px;
  right: 10px;
  z-index: 9999;
}

.theme-selector button {
  margin: 4px;
  padding: 8px 16px;
  border: 2px solid #fff;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.theme-selector button:hover {
  transform: scale(1.1);
  background: rgba(0, 0, 0, 0.9);
}

.theme-selector button.active {
  background: #1976d2;
  border-color: #1976d2;
  box-shadow: 0 0 10px rgba(25, 118, 210, 0.5);
}
</style>
```

## 提示

1. **组合使用**：你可以从不同示例中提取元素，创建独特的风格
2. **测试效果**：在不同屏幕尺寸和设备上测试你的样式
3. **性能优化**：避免使用过多的阴影和动画，可能影响性能
4. **保持一致**：确保整个游戏的风格保持一致

希望这些示例能帮助你创建出令人惊艳的视觉效果！ 🎨✨
