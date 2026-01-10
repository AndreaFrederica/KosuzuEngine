# KosuzuEngine UI 样式自定义指南

## 概述

KosuzuEngine 提供了一套灵活的 CSS 变量系统，允许游戏开发者轻松自定义引擎内嵌 UI 组件的样式，而无需修改引擎源代码。

## 工作原理

样式系统分为三个层次：

1. **引擎变量层** (`src/engine/styles/engine-variables.scss`)
   - 定义所有引擎组件的默认样式变量
   - 使用 `--ke-*` 前缀命名，避免与其他 CSS 变量冲突

2. **引擎基础样式层** (`src/engine/styles/engine-base.scss`)
   - 应用引擎样式变量到组件的默认样式规则
   - 由引擎维护，不应被游戏开发者修改

3. **游戏自定义样式层** (`src/game/ui/game-custom-styles.scss`)
   - 游戏开发者在此文件中覆盖引擎变量
   - 可以自定义任何引擎组件的样式

## 如何使用

### 快速开始

1. 打开 `src/game/ui/game-custom-styles.scss` 文件
2. 找到你想自定义的组件变量
3. 修改变量值即可

### 示例：自定义对话框样式

```scss
// 在 src/game/ui/game-custom-styles.scss 中

:root {
  // 更改对话框背景为紫色
  --ke-dialog-box-bg: rgba(80, 0, 120, 0.85);

  // 更改边框颜色为粉色
  --ke-dialog-box-border: 3px solid rgba(255, 100, 150, 0.8);

  // 更改说话人名字为白色
  --ke-dialog-speaker-color: #ffffff;

  // 更改对话文本颜色为浅粉色
  --ke-dialog-text-color: #ffd1dc;
}
```

### 示例：自定义选择按钮

```scss
:root {
  // 使用渐变背景
  --ke-choice-btn-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --ke-choice-btn-color: #ffffff;
  --ke-choice-btn-border-radius: 25px; // 圆角按钮
  --ke-choice-btn-padding: 18px 32px;

  // 悬停效果
  --ke-choice-btn-hover-bg: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
}
```

## 可用的样式变量

### 对话框变量

| 变量名                            | 默认值                             | 描述               |
| --------------------------------- | ---------------------------------- | ------------------ |
| `--ke-dialog-box-bg`              | rgba(0, 0, 0, 0.8)                 | 对话框背景颜色     |
| `--ke-dialog-box-border`          | 2px solid rgba(255, 255, 255, 0.3) | 边框样式           |
| `--ke-dialog-box-border-radius`   | 8px                                | 边框圆角           |
| `--ke-dialog-box-padding`         | 16px                               | 内边距             |
| `--ke-dialog-box-margin`          | 20px                               | 外边距             |
| `--ke-dialog-box-shadow`          | 0 4px 12px rgba(0, 0, 0, 0.5)      | 阴影效果           |
| `--ke-dialog-speaker-color`       | #ffffff                            | 说话人名字颜色     |
| `--ke-dialog-speaker-font-size`   | 1.25rem                            | 说话人名字字体大小 |
| `--ke-dialog-speaker-font-weight` | bold                               | 说话人名字字体粗细 |
| `--ke-dialog-text-color`          | #ffffff                            | 对话文本颜色       |
| `--ke-dialog-text-font-size`      | 1rem                               | 对话文本字体大小   |
| `--ke-dialog-text-line-height`    | 1.6                                | 对话文本行高       |

### 打字机文本变量

| 变量名                               | 默认值             | 描述           |
| ------------------------------------ | ------------------ | -------------- |
| `--ke-typewriter-cursor-color`       | #ffffff            | 光标颜色       |
| `--ke-typewriter-cursor-width`       | 2px                | 光标宽度       |
| `--ke-typewriter-cursor-blink`       | true               | 是否闪烁       |
| `--ke-typewriter-page-dot-active-bg` | #ffffff            | 激活页码点颜色 |
| `--ke-typewriter-nav-btn-bg`         | rgba(0, 0, 0, 0.5) | 导航按钮背景   |

### 选择面板变量

| 变量名                          | 默认值                   | 描述         |
| ------------------------------- | ------------------------ | ------------ |
| `--ke-choice-panel-bg`          | rgba(0, 0, 0, 0.9)       | 面板背景     |
| `--ke-choice-btn-bg`            | rgba(255, 255, 255, 0.1) | 按钮背景     |
| `--ke-choice-btn-color`         | #ffffff                  | 按钮文字颜色 |
| `--ke-choice-btn-border-radius` | 4px                      | 按钮圆角     |
| `--ke-choice-btn-padding`       | 12px 24px                | 按钮内边距   |
| `--ke-choice-btn-hover-bg`      | rgba(255, 255, 255, 0.2) | 悬停背景     |

### 设置面板变量

| 变量名                           | 默认值                   | 描述         |
| -------------------------------- | ------------------------ | ------------ |
| `--ke-settings-panel-bg`         | rgba(0, 0, 0, 0.95)      | 面板背景     |
| `--ke-settings-header-color`     | #ffffff                  | 标题颜色     |
| `--ke-settings-header-font-size` | 1.5rem                   | 标题字体大小 |
| `--ke-settings-label-color`      | #ffffff                  | 标签颜色     |
| `--ke-settings-desc-color`       | rgba(255, 255, 255, 0.7) | 描述文字颜色 |

### BGM 控制器变量

| 变量名                 | 默认值                   | 描述         |
| ---------------------- | ------------------------ | ------------ |
| `--ke-bgm-control-bg`  | rgba(0, 0, 0, 0.8)       | 控制器背景   |
| `--ke-bgm-label-color` | #ffffff                  | 标签颜色     |
| `--ke-bgm-btn-bg`      | rgba(255, 255, 255, 0.1) | 按钮背景     |
| `--ke-bgm-btn-color`   | #ffffff                  | 按钮文字颜色 |

### 历史记录面板变量

| 变量名                       | 默认值              | 描述       |
| ---------------------------- | ------------------- | ---------- |
| `--ke-history-panel-bg`      | rgba(0, 0, 0, 0.95) | 面板背景   |
| `--ke-history-speaker-color` | #1976d2             | 说话人颜色 |
| `--ke-history-text-color`    | #ffffff             | 文本颜色   |

### 存档/读档面板变量

| 变量名                         | 默认值                   | 描述         |
| ------------------------------ | ------------------------ | ------------ |
| `--ke-save-load-panel-bg`      | rgba(0, 0, 0, 0.95)      | 面板背景     |
| `--ke-save-card-bg`            | rgba(255, 255, 255, 0.1) | 存档卡片背景 |
| `--ke-save-card-border-radius` | 4px                      | 卡片圆角     |

## 高级用法

### 创建多个主题

你可以创建多个主题并在运行时切换：

```scss
// 在 game-custom-styles.scss 中定义多个主题

// 默认主题
:root {
  --ke-dialog-box-bg: rgba(0, 0, 0, 0.8);
  --ke-dialog-text-color: #ffffff;
}

// 暗色主题
.theme-dark {
  --ke-dialog-box-bg: rgba(0, 0, 0, 0.9);
  --ke-dialog-text-color: #e0e0e0;
}

// 亮色主题
.theme-light {
  --ke-dialog-box-bg: rgba(255, 255, 255, 0.95);
  --ke-dialog-box-border: 2px solid #333;
  --ke-dialog-text-color: #333;
}

// 复古像素风格
.theme-retro {
  --ke-dialog-box-bg: #000000;
  --ke-dialog-box-border: 4px solid #00ff00;
  --ke-dialog-text-color: #00ff00;
  --ke-dialog-text-font-size: 0.9rem;
  font-family: 'Courier New', monospace;
}
```

然后在 Vue 组件中切换主题：

```vue
<script setup lang="ts">
import { ref } from 'vue';

const currentTheme = ref('dark');

function setTheme(theme: string) {
  document.documentElement.className = theme === 'default' ? '' : `theme-${theme}`;
}
</script>

<template>
  <button @click="setTheme('dark')">暗色主题</button>
  <button @click="setTheme('light')">亮色主题</button>
  <button @click="setTheme('retro')">复古主题</button>
</template>
```

### 添加自定义动画

```scss
// 为对话框添加淡入动画
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dialog-box {
  animation: fadeInUp 0.3s ease-out;
}

// 为按钮添加脉冲效果
@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.menu-button {
  animation: pulse 2s infinite;
}
```

### 响应式设计

```scss
// 针对不同屏幕尺寸调整样式
@media (max-width: 768px) {
  :root {
    --ke-dialog-text-font-size: 0.95rem;
    --ke-dialog-box-padding: 12px;
    --ke-dialog-box-margin: 10px;
  }
}

@media (max-width: 480px) {
  :root {
    --ke-dialog-text-font-size: 0.9rem;
    --ke-dialog-speaker-font-size: 1.1rem;
  }
}
```

### 深度样式覆盖

如果 CSS 变量无法满足需求，你可以直接覆盖组件的样式类：

```scss
// 直接覆盖组件样式
.dialog-box {
  background: url('/assets/dialog-bg.png') center/cover;
  backdrop-filter: blur(5px);
}

.dialog-content .text-bold {
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  letter-spacing: 1px;
}

.typewriter-container .text-content {
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}
```

## 最佳实践

1. **优先使用 CSS 变量**：这是最简单、最安全的方式
2. **保持一致性**：在整个游戏中使用统一的配色和风格
3. **考虑可访问性**：确保文字与背景有足够的对比度
4. **测试不同设备**：在移动设备和桌面设备上测试样式
5. **使用语义化命名**：为自定义主题使用有意义的名称

## 常见问题

### Q: 如何重置所有样式到默认值？

A: 删除或注释掉 `src/game/ui/game-custom-styles.scss` 中的所有自定义样式。

### Q: 可以只覆盖特定场景的样式吗？

A: 可以，通过添加特定的父容器选择器来实现：

```scss
// 只在标题屏幕应用样式
.title-screen {
  .menu-button {
    --ke-choice-btn-bg: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  }
}

// 只在游戏界面应用样式
.game-screen {
  --ke-dialog-box-bg: rgba(20, 30, 60, 0.85);
}
```

### Q: 样式不生效怎么办？

A: 检查以下几点：

1. 确认变量名拼写正确
2. 确认使用了 `:root` 或正确的选择器
3. 清除浏览器缓存并重新构建项目
4. 检查是否有其他样式规则覆盖了你的样式

### Q: 可以使用预处理器（Sass/Less）吗？

A: 可以！`src/game/ui/game-custom-styles.scss` 使用了 Sass 语法，你可以使用 Sass 的所有特性。

### Q: 如何添加自定义字体？

A: 在 CSS 中导入字体并应用到变量：

```scss
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700&display=swap');

:root {
  --ke-dialog-text-font-family: 'Noto Serif SC', serif;
}

.dialog-text {
  font-family: var(--ke-dialog-text-font-family);
}
```

## 相关文件

- `src/engine/styles/engine-variables.scss` - 引擎默认样式变量
- `src/engine/styles/engine-base.scss` - 引擎基础样式规则
- `src/game/ui/game-custom-styles.scss` - 游戏自定义样式（编辑这个文件）
- `quasar.config.ts` - Quasar 配置（样式导入顺序）

## 社区支持

如果你在自定义样式时遇到问题，可以：

1. 查看 KosuzuEngine 的 [Wiki](https://wiki.sirrus.cc/KosuzuEngine/)
2. 在 [GitHub Issues](https://github.com/AndreaFrederica/KosuzuEngine/issues) 提问
3. 加入我们的社区讨论

---

祝你创作出独特的视觉风格！ 🎨
