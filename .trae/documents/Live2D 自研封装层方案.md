## 总目标
- 先把 Kosuzu 的 Live2D 封装层做出来：上层只依赖“引擎状态 + 高层命令”，底层继续用 Pixi/pixi-live2d-display 作为渲染后端。
- 同时为未来的 CoreWebGLBackend 预留后端接口（但本轮不实现 B）。

## 现状对齐（基于当前仓库）
- 状态流已经是“上下文驱动”：`ActorAction → reducer → store.state.actors[*].live2d → Live2DLayer 同步`。
- 现在需要做的，是把 Live2D 的底层细节（加载、实例缓存、参数写入、motion 播放、排序）从 Vue 组件里抽出来，变成可测试、可替换的系统层。

## 交付内容（A 路线）
### 1) Live2D 后端接口（可插拔）
- 新增 `ILive2DBackend`（建议放 `src/engine/live2d/backend.ts`）：
  - `init(canvas, size)` / `resize(size)`
  - `load(actorId, source)` / `unload(actorId)`
  - `setTransform(actorId, transform)`
  - `setParams(actorId, paramsPatch)`（增量）
  - `playMotion(actorId, motionId)` / `setExpression(actorId, exprId)`（按你现有字段）
  - `snapshot(actorId)`（给 Inspector 用）

### 2) PixiBackend（把现有 Live2DManager 正式“后端化”）
- 基于现有 [Live2DManager.ts](file:///d:/Projcets/KosuzuEngine/src/engine/live2d/Live2DManager.ts) 演进成 `PixiBackend`：
  - 保留你现在的 sourceKey 热重载、File[] 支持。
  - 默认强制关闭库内交互（autoFocus/autoHitTest、eventMode），确保“不会再直接跟鼠标”。
  - 每个 actorId 维护独立 container 或用 `model.zIndex`，开启 `sortableChildren`，实现 `transform.layer` → 渲染排序。

### 3) Live2DSystem（从 state 到后端的同步器）
- 新增 `Live2DSystem`（建议 `src/engine/live2d/system.ts`）：
  - 输入：`EngineState.actors`（或 store.state.actors）
  - 输出：调用 backend 的 load/unload/transform/params/motion
  - 核心：**actor 粒度 diff**（替换当前 deep watch 全量遍历），只在参数变化时写 coreModel。

### 4) 渲染层瘦身
- [Live2DLayer.vue](file:///d:/Projcets/KosuzuEngine/src/engine/render/Live2DLayer.vue) 只保留：
  - Canvas 初始化、尺寸观察（resize），把 state 变更转发给 `Live2DSystem`。
  - 不再直接写 coreModel / 调 motion / 管缓存。

### 5) Profile 与标准通道（第二阶段，但仍属 A）
- 新增 `Live2DProfile`（参数映射/范围/曲线/默认值），用于把“高层命令”稳定映射到 params。
- 先实现最小集合：lookAt、turnTo（头/身）、blink（可选），并允许模型缺少某参数时自动降级。
- profile 来源先支持：
  - 自动探测（看是否存在 `ParamAngleX`/`ParamEyeBallX` 等）
  - 手写配置（后续可接入 `bindings.live2d`）

### 6) Playground  Inspector 适配
- Playground 继续复用“上下文驱动”，但底层读数/写入统一走封装层：
  - ContextWindow 显示：EngineState + Live2D snapshot（来自 `backend.snapshot`），避免直接依赖 pixi-live2d-display 的内部字段。
  - 控制面板的开关（Follow Mouse）保持不变，但实现都走 actor/action。

## 验证方式（实现完成后会做）
- `pnpm eslint` + `vue-tsc --noEmit` 全通过。
- 在 Playground：
  - 切换模型 URL/拖入 File[] 能正确热重载。
  - motion 列表/当前 motion 高亮正常。
  - Follow Mouse 开关关闭时绝不“自发注视”；开启时只由上下文参数驱动。
  - 多 actor（后续可加一个测试页面）`transform.layer` 能影响 Live2D 绘制顺序。

## 涉及文件范围（预期新增/改动）
- 新增：`src/engine/live2d/backend.ts`、`src/engine/live2d/pixi-backend.ts`、`src/engine/live2d/system.ts`
- 改动：`src/engine/render/Live2DLayer.vue`、必要的类型定义（EngineState live2d 字段/actor API）
- 兼容：Playground 与现有脚本 API 不需要大改，最多改动内部引用点。

我会按以上步骤落地：先把 backend + system 搭好并替换掉 Live2DLayer 的直连逻辑，再做排序与 profile/标准通道的最小版。