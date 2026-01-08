import { BackgroundActor, AudioActor } from '../../engine/core/BaseActor';
import { ContextOps } from '../../engine/core/BaseActor';
import { Josei06Sailor, Josei07Sailor, AkamafuGirl, NekoAnimal } from '../actors';

export async function scene1(): Promise<void | string> {
  const bg = new BackgroundActor('haikei_01_sora/jpg/sora_01.jpg');
  const bgm = new AudioActor('daytime');
  const sailorA = new Josei06Sailor('sailorA');
  const sailorB = new Josei07Sailor('sailorB');
  const akamafu = new AkamafuGirl('akamafu');
  const neko = new NekoAnimal('neko');
  const ctx = new ContextOps();

  await bg.switch('haikei_01_sora/jpg/sora_01.jpg', { effect: 'blurFade', duration: 650 });
  await ctx.wait(650);
  await bgm.play('daytime', { fadeIn: 800 });

  await sailorA.show({ x: 0.75, y: 0.3, layer: 2, scale: 0.6, opacity: 0 });
  await sailorB.show({ x: 0.1, y: 0.4, layer: 2, scale: 0.6, opacity: 0 });
  await ctx.wait(60);
  await sailorA.move({ x: 0.75, y: 0.3, layer: 2, scale: 0.6, opacity: 1 }, { duration: 360 });
  await sailorB.move({ x: 0.1, y: 0.4, layer: 2, scale: 0.6, opacity: 1 }, { duration: 360 });
  await ctx.wait(360);

  await sailorA.pose('a');
  await sailorB.pose('b');
  await sailorA.focus(220);
  await sailorB.dim(0.75, 220);
  await ctx.wait(220);

  await sailorA.say('今天天气真好。');
  await sailorA.dim(0.75, 220);
  await sailorB.focus(220);
  await ctx.wait(220);
  await sailorB.say('嗯，放学一起去买甜点吧？11');

  await sailorA.move({ x: 0.65, y: 0.38, scale: 0.6 }, { duration: 280 });
  await sailorB.move({ x: 0.18, y: 0.5, scale: 0.6 }, { duration: 280 });
  await ctx.wait(280);
  await sailorA.pose('c');
  await sailorB.pose('d');
  await sailorA.focus(200);
  await sailorB.dim(0.75, 200);
  await ctx.wait(200);
  await sailorA.say('我想试试那家新开的店。');
  await sailorA.dim(0.75, 200);
  await sailorB.focus(200);
  await ctx.wait(200);
  await sailorB.say('听说草莓蛋糕很受欢迎。');

  await bg.switch('haikei_01_sora/jpg/sora_02.jpg', { effect: 'wipeLeft', duration: 520 });
  await ctx.wait(520);
  await sailorA.move({ x: 0.55, y: 0.45, scale: 0.6 }, { duration: 260 });
  await sailorB.move({ x: 0.25, y: 0.55, scale: 0.6 }, { duration: 260 });
  await ctx.wait(260);
  await sailorA.pose('e');
  await sailorB.pose('f');
  await sailorA.focus(200);
  await sailorB.dim(0.75, 200);
  await ctx.wait(200);
  await sailorA.say('风有点大，别让帽子飞了。');
  await sailorB.shake(420, { strengthX: 0.012, strengthY: 0.005 });
  await sailorB.say('好险，差点就掉了。');
  await sailorA.say(`喂……你现在看见的系统时间是：${new Date().toLocaleString()}。`);

  await neko.show({ x: 0.02, y: 1.22, layer: 3, scale: 0.5, opacity: 0 });
  await ctx.wait(60);
  await neko.move({ x: 0.02, y: 1.22, layer: 3, scale: 0.5, opacity: 0.9 }, { duration: 240 });
  await ctx.wait(240);
  await neko.pose('g');
  await neko.jump(240, { height: 0.04 });
  await sailorA.say('呀，小猫咪也出来散步。');
  await sailorB.say('好可爱，想摸摸它。');

  await sailorA.move({ x: 0.62, y: 0.48, scale: 0.6 }, { duration: 240 });
  await sailorB.move({ x: 0.2, y: 0.48, scale: 0.6 }, { duration: 240 });
  await ctx.wait(240);
  await sailorA.pose('g');
  await sailorB.pose('h');
  await sailorA.say('我们要不要邀请她一起？');
  await sailorB.say('好，正好人多可以点更多。');

  await akamafu.show({ x: 0.42, y: 0.58, layer: 2, scale: 0.56, opacity: 0 });
  await ctx.wait(60);
  await akamafu.move({ x: 0.4, y: 0.55, layer: 2, scale: 0.6, opacity: 1 }, { duration: 340 });
  await ctx.wait(340);
  await akamafu.pose('a');
  await akamafu.focus(220);
  await sailorA.dim(0.75, 220);
  await sailorB.dim(0.75, 220);
  await ctx.wait(220);
  await akamafu.say('咦，你们在聊什么？');
  await akamafu.dim(0.75, 200);
  await sailorA.focus(200);
  await ctx.wait(200);
  await sailorA.say('一起去甜点店，刚好路过。');
  await sailorA.dim(0.75, 200);
  await sailorB.focus(200);
  await ctx.wait(200);
  await sailorB.say('要不要一起来？');

  await akamafu.pose('b');
  await sailorB.dim(0.75, 200);
  await akamafu.focus(200);
  await ctx.wait(200);
  await akamafu.say('当然好呀，我也想试试新品。');
  await sailorA.pose('h');
  await akamafu.dim(0.75, 200);
  await sailorA.focus(200);
  await ctx.wait(200);
  await sailorA.say('太好了，那就出发吧。');

  await bg.switch('haikei_01_sora/jpg/sora_03.jpg', { effect: 'zoom', duration: 520 });
  await sailorA.move({ x: 0.8, y: 0.32, scale: 0.6 }, { duration: 280 });
  await sailorB.move({ x: 0.18, y: 0.42, scale: 0.6 }, { duration: 280 });
  await akamafu.move({ x: 0.48, y: 0.38, scale: 0.6 }, { duration: 280 });
  await neko.move({ x: 0.05, y: 0.42, scale: 0.52 }, { duration: 280 });
  await ctx.wait(520);

  await sailorA.pose('a');
  await sailorB.pose('b');
  await akamafu.pose('c');
  await sailorA.focus(220);
  await sailorB.dim(0.75, 220);
  await akamafu.dim(0.75, 220);
  await ctx.wait(220);
  await sailorA.say('快到了，我想先点冰饮。');
  await sailorA.dim(0.75, 200);
  await sailorB.focus(200);
  await ctx.wait(200);
  await sailorB.say('我要抹茶拿铁。');
  await sailorB.dim(0.75, 200);
  await akamafu.focus(200);
  await ctx.wait(200);
  await akamafu.say('我选焦糖布丁。');

  await bg.switch('haikei_01_sora/jpg/sora_04.jpg', { effect: 'wipeRight', duration: 520 });
  await ctx.wait(520);
  await sailorA.move({ x: 0.7, y: 0.46, scale: 0.6 }, { duration: 260 });
  await sailorB.move({ x: 0.12, y: 0.5, scale: 0.6 }, { duration: 260 });
  await akamafu.move({ x: 0.45, y: 0.4, scale: 0.6 }, { duration: 260 });
  await neko.move({ x: 0.08, y: 0.42, scale: 0.55 }, { duration: 260 });
  await ctx.wait(260);

  await sailorA.pose('d');
  await sailorB.pose('e');
  await akamafu.pose('f');
  await sailorA.focus(220);
  await sailorB.dim(0.75, 220);
  await akamafu.dim(0.75, 220);
  await ctx.wait(220);
  await sailorA.say('今天真是个适合约会的日子。');
  await sailorA.dim(0.75, 200);
  await sailorB.focus(200);
  await ctx.wait(200);
  await sailorB.say('哈哈，说得也是。');
  await sailorB.dim(0.75, 200);
  await akamafu.focus(200);
  await ctx.wait(200);
  await akamafu.say('下次换你们请客哦。');

  await sailorA.pose('g');
  await sailorB.pose('h');
  await akamafu.pose('a');
  await akamafu.dim(0.75, 200);
  await sailorA.focus(200);
  await ctx.wait(200);
  await sailorA.say('成交。');
  await sailorA.dim(0.75, 200);
  await sailorB.focus(200);
  await ctx.wait(200);
  await sailorB.say('那就这么说定了。');
  await sailorA.dim(0.8, 180);
  await sailorB.dim(0.8, 180);
  await akamafu.dim(0.8, 180);
  await ctx.wait(180);
  const picked = await ctx.choice([
    { text: '立刻切到另一幕（scene2）', goto: 'scene2' },
    { text: '进入特效测试场景（sceneEffects）', goto: 'sceneEffects' },
    { text: '留在当前幕结束', goto: 'stay' },
  ]);
  if (picked.ok && picked.value === 'scene2') return 'scene2';
  if (picked.ok && picked.value === 'sceneEffects') return 'sceneEffects';
  await sailorA.focus(200);
  await sailorB.focus(200);
  await akamafu.focus(200);
  await ctx.wait(200);
  await akamafu.say('走吧。');
}

export async function scene2(): Promise<void | string> {
  const bg = new BackgroundActor('haikei_01_sora/jpg/sora_04.jpg');
  const sailorA = new Josei06Sailor('sailorA');
  const ctx = new ContextOps();
  await bg.switch('haikei_01_sora/jpg/sora_04.jpg', { effect: 'zoom', duration: 420 });
  await ctx.wait(420);
  await sailorA.show({ x: 0.5, y: 0.2, layer: 2, scale: 0.58, opacity: 0 });
  await ctx.wait(60);
  await sailorA.move({ x: 0.5, y: 0.2, layer: 2, scale: 0.6, opacity: 1 }, { duration: 360 });
  await ctx.wait(360);
  await sailorA.pose('a');
  await sailorA.jump(260, { height: 0.05 });
  await sailorA.say(`欢迎来到 scene2。现在时间仍然是：${new Date().toLocaleString()}。`);
  await sailorA.shake(360, { strengthX: 0.01, strengthY: 0.004 });
  const picked = await ctx.choice([
    { text: '回到 scene1', goto: 'scene1' },
    { text: '进入特效测试场景（sceneEffects）', goto: 'sceneEffects' },
    { text: '结束演示', goto: 'end' },
  ]);
  if (picked.ok && picked.value === 'scene1') return 'scene1';
  if (picked.ok && picked.value === 'sceneEffects') return 'sceneEffects';
  await sailorA.say('演示结束。');
}

// 热重载支持
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    console.log('[HMR] scene1.ts accept 回调被触发！');
    const reloadScene = (window as unknown as { __reloadScene?: () => void }).__reloadScene;
    console.log('[HMR] reloadScene 函数存在?', !!reloadScene);
    if (reloadScene) {
      console.log('[HMR] 调用 reloadScene()');
      reloadScene();
    } else {
      console.error('[HMR] reloadScene 函数不存在！请确保 DemoVN.vue 已注册');
    }
  });
}
