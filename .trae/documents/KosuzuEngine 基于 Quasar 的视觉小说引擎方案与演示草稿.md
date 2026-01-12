## 设计原则

* 首要剧本接口：Alice.say(xxx) 等强类型方法；保留通用 actor.action({ type, payload })

* 角色支持传统差分与 Live2D；统一渲染接口与状态切换动作

* 渲染用 Vue3 函数组件，数据单向流动；上下文集中管理，Pinia 外壳

* 剧本为 TS 源码，逐行可断点；方法与 action 均返回 Promise

## 源码目录

* src/engine/core：BaseActor / ActorAction / EngineContext / Runtime / bindings

* src/engine/render：StageView（函数组件）、DialogBox、ChoicePanel、LayerManager、AudioManager

* src/actors：角色原型与资源绑定（差分/Live2D 配置）

* src/scripts：TS 剧本

* src/pages/DemoVN.vue：演示页面，路由 /demo（在 [routes.ts](file:///d:/Projcets/KosuzuEngine/src/router/routes.ts) 添加）

## 接口与类

* BaseActor

  * 字段：id、kind（'character'|'background'|'audio'|'overlay'）、name、renderer、state

  * state：transform、pose（expression/outfit/emote）、spriteDiff、live2d(motion/expression/model)、audio(voiceBank)

  * 通用：`action(input: ActorAction): Promise<ActionResult>`

  * 强类型方法：

    * CharacterActor：`say(text, opts?)`、`show(opts?)`、`hide()`、`move(to)`、`emote(key)`、`pose(diffKey)`、`motion(id)`

    * BackgroundActor：`switch(name, opts?)`、`fadeIn(ms)`、`fadeOut(ms)`

    * AudioActor（bgm/se）：`play(name, opts?)`、`stop(opts?)`、`fadeTo(volume, ms)`

  * 所有方法内部走 `action({ type, payload, options })`；可被覆盖以做特化

* IActorRenderer

  * `apply(state)`、`loadAssets(resources)`；SpriteRenderer/Live2DRenderer 两种实现

## 执行模型

* 剧本使用 async/await：

  * `await alice.say('你好')`

  * `await bg.switch('school', { fadeIn:500 })`

  * `await bgm.play('daytime', { fadeIn:800 })`

* 方法调用 -> 转换为 ActorAction -> Runtime 调度 -> reducer 更新 Context -> 过渡完成后 resolve

* 保留 `actor.action(...)` 以支持自定义/未定义动作；仍可直接 `engine.dispatch(action)` 做高级用例

## 绑定机制

* BindingsRegistry（Context 内）：

  * sayTarget：默认对话框目标

  * voiceBank：角色语音库映射，`alice.say` 自动播放绑定语音

  * spriteAtlas：差分映射（expression/outfit -> frame）

  * live2dModel：模型/动作/表情映射

  * audioMixer：bgm/se 渠道与淡入淡出策略

* API：`bind.sayTarget(...)`、`bind.voiceBank(...)`、`bind.spriteAtlas(...)`、`bind.live2D(...)`、`bind.audioMixer(...)`

* 方法可传入 opts 覆盖绑定策略

## 渲染层

* StageView（函数组件）：只读 Context 渲染背景/角色/叠层，使用 Quasar 过渡

* DialogBox/ChoicePanel（SFC）：从 Context 读取数据；选择后通知 Runtime

* AudioManager：根据 Context 切换 BGM/SE，支持淡入淡出

## 剧本示例

```ts
import { CharacterActor, BackgroundActor, AudioActor } from '@/engine/core'

export async function scene1() {
  const bg = new BackgroundActor('school')
  const bgm = new AudioActor('daytime')
  const alice = new CharacterActor('Alice')
  const bob = new CharacterActor('Bob')

  await bg.switch('school', { fadeIn: 500 })
  await bgm.play('daytime', { fadeIn: 800 })

  await alice.show({ x: 0.2, layer: 2 })
  await bob.show({ x: 0.7, layer: 2 })

  await alice.pose('happy')
  await bob.motion('idle')

  await alice.say('你好，今天的课真多。')
  await bob.say('是啊，放学去喝奶茶？')

  const c = await alice.action({
    type: 'choice',
    payload: [
      { text: '去', goto: 'A1' },
      { text: '不去', goto: 'B1' },
    ],
  })

  if (c === 'A1') {
    await bg.switch('cafe', { fadeIn: 400 })
    await bgm.play('relax', { fadeIn: 600 })
    await alice.say('那就出发吧！')
  } else {
    await bob.say('那下次吧～')
  }
}
```

## 实施步骤

1. 创建目录骨架（engine/core/render、actors、scripts、pages/DemoVN.vue）
2. BaseActor 与派生 Actor；实现强类型方法与通用 action()
3. ActorAction 类型与 EngineContext（state/reducers/selectors）
4. Runtime（串行/基本并行）与 BindingsRegistry；在 Actor 构造时注入
5. 渲染层：StageView、DialogBox、ChoicePanel、AudioManager
6. Demo 剧本与路由 /demo；自测断点/状态切换/分支

## 验收标准

* /demo 演出正常：背景/BGM/对白/分支；差分/Live2D 占位切换可用

* Alice.say 等方法工作；通用 actor.action 可扩展自定义动作

* 渲染层无副作用，状态仅在 Context；TS 行断点可命中

* 代码通过 ESLint/TS 检查，结构清晰

