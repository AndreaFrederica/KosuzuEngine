# 资源投放约定

- 背景：`public/assets/bg/`，示例：`school.png`、`cafe.png`。建议 1920x1080 PNG。
- 角色差分：`public/assets/characters/<name>/`，示例：`alice/happy.png`、`alice/normal.png`。
- Live2D：`public/assets/live2d/<name>/`，放置模型与动作（如 `model3.json`、`motions/idle.motion3.json`、`expressions/happy.exp3.json`）。
- 音频：
  - BGM：`public/assets/audio/bgm/`，示例：`daytime.mp3`、`relax.mp3`
  - SE：`public/assets/audio/se/`，示例：`click.wav`
- UI：`public/assets/ui/`，示例：对话框皮肤、按钮素材等

在代码中引用路径示例：
- 背景：`/assets/bg/school.png`
- 角色差分：`/assets/characters/alice/happy.png`
- BGM：`/assets/audio/bgm/daytime.mp3`
- Live2D：`/assets/live2d/alice/model3.json`

