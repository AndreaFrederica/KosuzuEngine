# QuickJS 脚本 VM

游戏场景和 Playground 脚本现在在随应用发布的 `quickjs-wasi` WASM VM 中执行。`quickjs.wasm` 由 Vite 从 npm 包打包进 `dist/spa/assets`，运行时不会请求 CDN。

## 在脚本中调用引擎

原有场景 API 保持不变：

```ts
await actor.say('你好');
await actor.motion('tap_body');
const picked = await ctx.choice([{ text: '继续', goto: 'next' }]);
await ctx.setVar('score', 10);
```

这些对象是 VM 内的代理。真正的角色动作、渲染、音频、路由和存档操作通过宿主桥接函数执行，VM 内不会拿到 Vue、Pinia 或 DOM 对象。

## 注册扩展函数

在宿主端注册一个函数：

```ts
import { registerScriptHostFunction } from 'src/engine/script/QuickJSScriptRuntime';

registerScriptHostFunction('openGallery', (imageId) => {
  return gallery.open(String(imageId));
});
```

脚本端使用：

```ts
await external.openGallery('cg-01');
```

同步返回值、Promise、异常都会自动转换为 VM 内的值或可捕获异常。扩展如果可能在存档时处于等待状态，需要同时提供 `resume(call)`，根据 `call.id`、`call.name`、`call.args` 和已经等待的 `call.elapsed` 重新连接操作：

```ts
registerScriptHostFunction(
  'fetchProfile',
  (userId) => api.fetchProfile(String(userId)),
  (call) => api.fetchProfile(String(call.args[0])),
);
```

没有恢复函数的异步扩展不会允许在等待期间存档，以免读档后脚本永久挂起。宿主副作用不会重复执行；读档恢复的是 QuickJS 堆、闭包、局部变量和 Promise continuation。

## 存档和回退

存档包含引擎状态和 QuickJS snapshot。snapshot 会在写入前 gzip 压缩，并保存 ABI 版本。读档会创建新的 WASM 实例、重新注册宿主函数、恢复快照，再把引擎状态绑定到 UI。恢复的是 QuickJS 堆和 Promise continuation，不需要从场景入口重放脚本。

`返回` 会从最近的脚本检查点恢复 VM 和画面状态；它不会重新运行已经完成的宿主动作。

## Quasar dev 热更新

### 实时执行位置

在演示页面的对白工具栏点击“更多 → 执行位置”，可以打开可拖动、缩放的源码面板。面板显示当前脚本的文件和行号，高亮最近执行的语句，并自动滚动跟随。关闭“自动跟随”后可自由查看其他行，点击定位按钮可回到当前行。

等待对白点击、选项、计时器或外部宿主函数时，会保留调用位置并显示等待原因；并发等待会分别列出。执行结束、停止和异常也会更新状态。位置来自 VM 的实际 trace 和未完成宿主调用，查看面板不会执行脚本或生成 WASM 快照。存档和回退会恢复对应的执行位置，Playground 存档也保留原始编辑器源码。

行号对应构建时的原始 TypeScript；当前追踪覆盖场景的异步函数语句及 Playground 的执行语句，同步函数内部不提供逐行追踪。

### 命令边界

开发服务器启动后，修改 `src/game/scenes/*.ts` 或相关角色脚本时，插件会计算本次修改的第一个行号，并发送 `kosuzu:script-update` 事件。编译器只给包含 `await` 的 OOP 引擎调用增加 `__flowStep` 边界；普通 TypeScript 仍由 QuickJS 按完整 JavaScript 语义执行。运行时为每个已完成边界保存结果，HMR 会停止旧 VM、保留当前引擎状态并从场景入口启动新 VM；修改行之前的边界直接返回已保存结果，因此不会再次 dispatch 背景、角色、音频、对白或等待动作。修改行及之后的边界会失效，新的代码从那里继续执行。

如果当前 OOP 命令仍在等待用户、计时器或其他宿主 Promise，HMR 会等该命令完成后再切换。普通裸 JS 函数内部没有 `__flowStep` 边界时，无法无损替换它当前的 continuation；这类代码继续保持完整 JS 能力，但应把需要热更新的引擎操作写在 OOP API 调用中。
