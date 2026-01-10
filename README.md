<p align="center">
  <img src="logo.png" alt="KosuzuEngine Logo" width="20%" />
</p>

<h1 align="center">KosuzuEngine</h1>

<div align="center">

⚠️ **此项目处于早期开发阶段，API 和架构可能会有较大变动。**

</div>

KosuzuEngine 是一个基于 Quasar + Vue3 构建的视觉小说演出引擎原型，专注于提供高质量的视觉小说游戏开发框架。引擎采用现代化的前端技术栈，结合视觉小说特有的演出需求，实现了完整的舞台层系统、对白推进机制、历史查看功能、时间旅行（返回）系统以及存档/读档功能。

## 链接

- [在线演示](https://kosuzuenginedemo.sirrus.cc/)
- [项目 Wiki](https://wiki.sirrus.cc/KosuzuEngine/)
- [English Version](README.en.md)

## 技术栈

- **前端框架**：Vue 3 + TypeScript
- **UI 组件库**：Quasar Framework
- **状态管理**：Pinia
- **构建工具**：Vite
- **国际化**：vue-i18n
- **HTTP 客户端**：Axios
- **部署平台**：Cloudflare Workers

## 核心架构

引擎采用模块化设计，主要分为以下几个核心模块：

- **Engine Core（引擎核心）**：负责游戏运行时的上下文管理、状态持久化、动作执行与回放
- **Render System（渲染系统）**：提供舞台渲染、角色图层管理、对话框系统、UI 组件
- **Audio System（音频系统）**：支持背景音乐（BGM）、音效（SE）、角色语音的独立管理与控制
- **I18n System（国际化系统）**：完整的本地化支持，包括文本翻译和语音文件管理
- **Game Logic（游戏逻辑）**：剧本场景管理、角色系统、资源加载与管理

### 引擎核心模块详解

| 模块             | 职责                                           |
| ---------------- | ---------------------------------------------- |
| EngineContext.ts | 游戏上下文状态管理，负责协调各系统之间的数据流 |
| Runtime.ts       | 运行时引擎，处理动作执行、快照生成与状态回退   |
| Persistence.ts   | 数据持久化，负责存档/读档的序列化和存储        |
| ActorAction.ts   | 角色动作定义，支持复杂动作序列的执行           |
| BaseActor.ts     | 角色基类，定义角色的基础属性和行为接口         |
| bindings.ts      | 动作绑定系统，将脚本命令映射到引擎操作         |

### 渲染组件模块详解

| 组件                   | 功能                                 |
| ---------------------- | ------------------------------------ |
| StageView.vue          | 舞台主视图，管理图层渲染和角色显示   |
| DialogBox.vue          | 对话框组件，支持打字机效果和交互控制 |
| HistoryPanel.vue       | 历史记录面板，查看已完成的对白       |
| SaveLoadPanel.vue      | 存档/读档界面，管理游戏进度          |
| ChoicePanel.vue        | 选项面板，支持多分支剧情选择         |
| LayerManager.ts        | 图层管理器，控制渲染层级顺序         |
| AudioManager.ts        | 音频总控，协调 BGM、SE、语音播放     |
| BGMControl.vue         | 背景音乐控制面板                     |
| AudioChannelsPanel.vue | 音频通道监控面板                     |

## 功能总览

- **舞台坐标系**：左下角为原点，x 向右、y 向上；角色以中心点对齐
- **Layer 系统**：角色可通过 transform.layer 超越 UI（overlay.layer 默认为 100）
- **对话推进**：say/advance，支持隐藏文本栏、点击舞台恢复
- **历史与返回**：记录对白历史；返回支持最近 10 帧快照与动作快速重建
- **存档读档**：基于上下文快照到本地存储；列表展示剧本名与对白预览
- **调试与上下文查看**：可在页面右下工具按钮中开启
- **UI 样式自定义**：通过 CSS 变量系统轻松自定义所有引擎 UI 组件的样式，无需修改引擎源代码（详见 [UI 样式自定义指南](./docs/CUSTOM_UI_STYLES.md)）

## 目录结构

```
KosuzuEngine/
├── public/                 # 静态资源
│   ├── assets/            # 资源目录
│   │   ├── audio/bgm/     # 背景音乐
│   │   ├── audio/se/      # 音效
│   │   ├── bg/            # 背景图片
│   │   ├── characters/    # 角色立绘
│   │   ├── live2d/        # Live2D 模型
│   │   └── ui/            # UI 素材
│   └── icons/             # 图标
├── src/
│   ├── engine/            # 引擎核心
│   │   ├── core/         # 核心系统（上下文、运行时、持久化）
│   │   ├── render/       # 渲染组件（对话框、舞台、存档等）
│   │   ├── styles/       # 引擎样式系统
│   │   ├── i18n/         # 国际化与语音
│   │   └── debug/        # 调试工具
│   ├── game/              # 游戏逻辑
│   │   ├── scenes/       # 剧本场景
│   │   └── ui/           # 游戏界面
│   ├── pages/             # 页面组件
│   ├── layouts/           # 布局组件
│   ├── components/        # 通用组件
│   ├── stores/            # Pinia 状态管理
│   ├── router/            # 路由配置
│   ├── i18n/              # 全局国际化
│   └── css/               # 全局样式
├── docs/                  # 文档
│   ├── CUSTOM_UI_STYLES.md          # UI 样式自定义指南
│   └── CUSTOM_UI_EXAMPLES.md        # UI 样式示例
└── 配置文件
```

## 开发与运行

```bash
npm install
npm run dev
# 打开浏览器访问 http://localhost:9000/
```

## 交互说明

- **文本栏隐藏/恢复**：点击"隐藏"后文本栏消失，点击舞台任意位置恢复显示
- **历史与返回**：打开"历史"面板，点击"返回"回到上一条对白；舞台状态一致回退
- **存档/读档**：
  - 存档：点击"存档"，输入名称或使用"剧本名\_时间"的默认名
  - 读档：点击"读档"，从列表选择或输入名称读取
  - 列表项展示剧本名与截断的对白预览文本（超长以 ... 显示）

## 路由与布局

- 默认路由指向 Demo 页面
- 侧边栏默认折叠；需要时通过左上角菜单按钮切换

## 备注

- 返回快照上限为 10 帧；更早的状态通过动作日志快速重建
- 存档信息保存在浏览器 localStorage，键名 `save:<slot>`

## 许可证

KosuzuEngine 使用的是 MPL-2.0 许可证，详情请参阅 [LICENSE](./LICENSE)。

- 您可以将引擎内嵌到您的项目中，但需要开源您修改的引擎部分代码，并保留 KosuzuEngine 的署名
- 任何您使用 KosuzuEngine 开发的游戏内容均归您所有，KosuzuEngine 不会对您的游戏内容拥有任何权利
- 任何您使用 KosuzuEngine 开发的游戏内容均不得违反当地法律法规
- 任何位于 games 目录下的游戏内容均视为使用 KosuzuEngine 开发的游戏内容
- 任何您通过动态加载等方式使用 KosuzuEngine 引擎的行为均视为使用 KosuzuEngine 开发的游戏内容
- 我们建议您在游戏中显著位置标注"本游戏使用 KosuzuEngine 引擎开发"
- 如果您对许可证有任何疑问，请联系作者

## 参与贡献

我们欢迎任何形式的贡献！无论是代码、文档、测试还是反馈，您的参与都将帮助我们改进 KosuzuEngine。

- 提交 [GitHub Issue](https://github.com/AndreaFrederica/KosuzuEngine/issues) 报告 Bug 或提出功能请求
- 提交 [Pull Request](https://github.com/AndreaFrederica/KosuzuEngine/pulls) 贡献代码
- 参与讨论，可通过加入 ANH（Andrea Novel Helper）的 QQ 群（977737943）进行交流
- 编写和改进文档
- 测试新功能并提供反馈
- 分享您的使用经验和项目
- 帮助其他用户解决问题
- 翻译文档
- 宣传 KosuzuEngine
- 捐赠支持项目发展
- 编写教程和示例项目
- 设计图标和界面

## 可能的未来功能

- 可视化脚本编辑器
- 更多内置 UI 组件
- 插件系统
- 支持其他的脚本语言
