# KosuzuEngine

KosuzuEngine 是一个以 Quasar + Vue3 构建的视觉小说演出引擎原型，提供舞台层系统、对白推进、历史查看、返回时间旅行以及存档/读档功能。

## 功能总览
- 舞台坐标系：左下角为原点，x 向右、y 向上；角色以中心点对齐
- Layer 系统：角色可通过 transform.layer 超越 UI（overlay.layer 默认为 100）
- 对话推进：say/advance，支持隐藏文本栏、点击舞台恢复
- 历史与返回：记录对白历史；返回支持最近 10 帧快照与动作快速重建
- 存档读档：基于上下文快照到本地存储；列表展示剧本名与对白预览
- 调试与上下文查看：可在页面右下工具按钮中开启

## 目录结构
- src/pages/DemoVN.vue：演示页面（默认路由）
- src/engine/render/StageView.vue：舞台渲染与 overlay 插槽
- src/engine/render/DialogBox.vue：文本栏与工具按钮
- src/engine/render/HistoryPanel.vue：历史对话查看
- src/engine/render/SaveLoadPanel.vue：存档/读档面板
- src/engine/core/EngineContext.ts：上下文与 reducer
- src/engine/core/Runtime.ts：运行时、快照与存档
- src/stores/engine-store.ts：Pinia store 封装
- src/router/routes.ts：路由配置（默认指向 Demo）
- src/layouts/MainLayout.vue：主布局（侧边栏默认折叠）

## 开发与运行
```bash
npm install
npm run dev
# 打开浏览器访问 http://localhost:9000/
```

## 交互说明
- 文本栏隐藏/恢复：点击“隐藏”后文本栏消失，点击舞台任意位置恢复显示
- 历史与返回：打开“历史”面板，点击“返回”回到上一条对白；舞台状态一致回退
- 存档/读档：
  - 存档：点击“存档”，输入名称或使用“剧本名_时间”的默认名
  - 读档：点击“读档”，从列表选择或输入名称读取
  - 列表项展示剧本名与截断的对白预览文本（超长以 ... 显示）

## 路由与布局
- 默认路由指向 Demo 页面
- 侧边栏默认折叠；需要时通过左上角菜单按钮切换

## 备注
- 返回快照上限为 10 帧；更早的状态通过动作日志快速重建
- 存档信息保存在浏览器 localStorage，键名 `save:<slot>`

