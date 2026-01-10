# 游戏自定义样式系统

KosuzuEngine 提供了一套强大的 CSS 变量系统，允许你轻松自定义所有引擎内嵌 UI 组件的样式。

## 快速开始

1. 编辑 `src/game/ui/game-custom-styles.scss` 文件
2. 覆盖你想要修改的样式变量
3. 重新加载页面即可看到效果

## 文件结构

```
src/
├── engine/
│   └── styles/
│       ├── engine-variables.scss    # 引擎样式变量定义（默认值）
│       └── engine-base.scss        # 引擎基础样式规则（应用变量）
├── game/
│   └── ui/
│       └── game-custom-styles.scss # 游戏自定义样式（编辑这里）
```

## 可自定义的组件

- ✅ 对话框 (`DialogBox.vue`)
- ✅ 打字机文本 (`TypewriterText.vue`)
- ✅ 选择面板 (`ChoicePanel.vue`)
- ✅ 设置面板 (`SettingsPanel.vue`)
- ✅ 存档/读档面板 (`SaveLoadPanel.vue`)
- ✅ BGM 控制器 (`BGMControl.vue`)
- ✅ 历史记录面板 (`HistoryPanel.vue`)
- ✅ 音频通道面板 (`AudioChannelsPanel.vue`)
- ✅ 舞台视图 (`StageView.vue`)
- ✅ 音频提示框 (`AudioPrompt.vue`)

## 简单示例

### 修改对话框颜色

```scss
:root {
  // 更改对话框背景为蓝色
  --ke-dialog-box-bg: rgba(30, 60, 100, 0.85);

  // 更改说话人名字为金色
  --ke-dialog-speaker-color: #ffcc00;

  // 更改对话文本为浅蓝色
  --ke-dialog-text-color: #cce0ff;
}
```

### 修改按钮样式

```scss
:root {
  // 修改选择按钮
  --ke-choice-btn-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --ke-choice-btn-color: #ffffff;
  --ke-choice-btn-border-radius: 25px;
  --ke-choice-btn-padding: 16px 28px;
}
```

## 完整文档

- 📖 [详细指南](../../../../docs/CUSTOM_UI_STYLES.md)
- 🎨 [样式示例](../../../../docs/CUSTOM_UI_EXAMPLES.md)

## 样式变量命名规则

所有引擎样式变量都以 `--ke-` (KosuzuEngine) 开头，例如：

- `--ke-dialog-box-bg` - 对话框背景
- `--ke-dialog-text-color` - 对话文本颜色
- `--ke-choice-btn-bg` - 选择按钮背景
- `--ke-settings-panel-bg` - 设置面板背景

## 主题示例

`src/game/ui/game-custom-styles.scss` 包含了一个完整的主题示例，展示了如何自定义所有组件的样式。你可以参考它来创建自己的主题。

## 注意事项

- ✅ 优先使用 CSS 变量，而不是直接覆盖组件类名
- ✅ 保持样式一致性和可维护性
- ✅ 在不同设备上测试你的样式
- ❌ 不要修改 `src/engine/styles/` 中的文件

## 获取帮助

如果你有任何问题或需要帮助：

1. 查看 [详细文档](../../../../docs/CUSTOM_UI_STYLES.md)
2. 参考 [样式示例](../../../../docs/CUSTOM_UI_EXAMPLES.md)
3. 在 [GitHub Issues](https://github.com/AndreaFrederica/KosuzuEngine/issues) 提问

---

祝你创作出独特的游戏风格！ 🎨✨
