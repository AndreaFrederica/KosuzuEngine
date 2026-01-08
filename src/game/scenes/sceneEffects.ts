import { BackgroundActor } from '../../engine/core/BaseActor';
import { ContextOps } from '../../engine/core/BaseActor';
import { Josei06Sailor, Josei07Sailor, AkamafuGirl, NekoAnimal } from '../actors';

export async function sceneEffects(): Promise<void | string> {
  const ctx = new ContextOps();
  const bg = new BackgroundActor('haikei_01_sora/jpg/sora_01.jpg');
  const a = new Josei06Sailor('fxA');
  const b = new Josei07Sailor('fxB');
  const c = new AkamafuGirl('fxC');
  const neko = new NekoAnimal('fxNeko');

  await bg.switch('haikei_01_sora/jpg/sora_01.jpg', { effect: 'cut' });
  await a.show({ x: 0.35, y: 0.2, layer: 2, scale: 0.6 });
  await b.show({ x: 0.65, y: 0.2, layer: 2, scale: 0.6 });
  await a.pose('a');
  await b.pose('b');
  await a.say('特效测试场景：角色与背景过渡。');

  await a.say('角色淡入（手动插值）。');
  await a.fadeOut(200);
  await a.fadeIn(260);

  await a.say('角色抖动。');
  await a.shake(420, { strengthX: 0.012 });

  await a.say('角色跳一下。');
  await a.jump(320, { height: 0.08 });

  await a.say('角色翻转、旋转、缩放。');
  await a.flipX(true);
  await ctx.wait(200);
  await a.rotate(-8);
  await ctx.wait(200);
  await a.zoom(0.72);
  await ctx.wait(200);
  await a.rotate(0);
  await a.flipX(false);
  await a.zoom(0.6);

  await a.say('聚焦/虚化/变暗。');
  await b.dim(0.6);
  await a.focus();
  await ctx.wait(220);
  await a.blur(6);
  await ctx.wait(220);
  await a.blur(0);
  await b.focus();

  await a.say('背景过渡：fade / wipeLeft / wipeRight / zoom / blurFade。');
  await bg.switch('haikei_01_sora/jpg/sora_02.jpg', { effect: 'fade', duration: 520 });
  await ctx.wait(650);
  await bg.switch('haikei_01_sora/jpg/sora_03.jpg', { effect: 'wipeLeft', duration: 620 });
  await ctx.wait(760);
  await bg.switch('haikei_01_sora/jpg/sora_04.jpg', { effect: 'wipeRight', duration: 620 });
  await ctx.wait(760);
  await bg.switch('haikei_01_sora/jpg/sora_05.jpg', { effect: 'zoom', duration: 700 });
  await ctx.wait(840);
  await bg.switch('haikei_01_sora/jpg/sora_06.jpg', { effect: 'blurFade', duration: 700 });
  await ctx.wait(840);

  await a.say('角色同时演示：叠加 filter + opacity。');
  await c.show({ x: 0.5, y: 0.15, layer: 3, scale: 0.65, opacity: 0.2, blur: 10, grayscale: 0.9 });
  await c.pose('c');
  await ctx.wait(220);
  await c.fadeIn(420);
  await c.blur(0);
  await c.focus();

  await neko.show({ x: 0.1, y: 0.15, layer: 4, scale: 0.5 });
  await neko.pose('a');
  await neko.shake(380, { strengthX: 0.02 });

  await a.say('测试结束：返回 scene1 或结束。');
  const picked = await ctx.choice([
    { text: '回到 scene1', goto: 'scene1' },
    { text: '结束', goto: 'end' },
  ]);
  if (picked.ok && picked.value === 'scene1') return 'scene1';
}
