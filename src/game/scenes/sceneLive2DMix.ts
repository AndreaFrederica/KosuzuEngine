import { BackgroundActor, CharacterActor } from '../../engine/core/BaseActor';
import { ContextOps } from '../../engine/core/BaseActor';
import { Josei06Sailor } from '../actors';

export async function sceneLive2DMix(): Promise<void | string> {
  const bg = new BackgroundActor('haikei_01_sora/jpg/sora_01.jpg');
  const ctx = new ContextOps();

  const normal = new Josei06Sailor('mix_normal');
  const shizuku = new CharacterActor('Shizuku', 'mix_shizuku');
  const haru = new CharacterActor('Haru', 'mix_haru');

  await bg.switch('haikei_01_sora/jpg/sora_01.jpg', { effect: 'cut' });

  await normal.show({ x: 0.2, y: 0.48, layer: 2, scale: 0.6, opacity: 1 });
  await normal.pose('a');

  await haru.show({ x: 0.5, y: 0.44, layer: 2, scale: 0.1, opacity: 1 });
  await haru.setLive2DModel(
    'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/haru/haru_greeter_t03.model3.json',
  );

  await shizuku.show({ x: 0.7, y: 0.38, layer: 1, scale: 0.35, opacity: 1 });
  await shizuku.setLive2DModel(
    'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/shizuku/shizuku.model.json',
  );

  await ctx.wait(600);

  await normal.say('……嗯？右边那个，是“会动的立绘”吗？');
  await shizuku.say('你好。我是 Shizuku。今天在这里做一个短暂的演出测试。');
  await haru.say('我叫 Haru。也来凑个热闹，一起做同屏测试。');
  await normal.say('我负责做“普通立绘参照组”。要开始的话，先给个信号？');

  await shizuku.motion('idle');
  await shizuku.expression('f01');
  await haru.motion('Idle');
  await haru.expression('f01');
  await ctx.wait(500);

  await normal.say('好，那我就当作——你现在是正常待机状态。');
  await normal.say('接下来我会“点一下”。如果你有反应，就说明 motion 能正常触发。');
  await shizuku.motion('tap_body');
  await haru.motion('Tap');
  await ctx.wait(700);
  await shizuku.expression('f02');
  await haru.expression('f02');
  await ctx.wait(500);
  await normal.say('真的有反应……而且表情也切了。');

  // 循环测试环节

  while (true) {
    const pickedDemo = await ctx.choice([
      { text: '演示：pinch_in / pinch_out / shake / flick_head', goto: 'motions' },
      { text: '演示：__CONTROL__ 参数驱动（转头+眼球）', goto: 'params' },
      { text: '演示：Haru 的 Idle / Tap / 表情', goto: 'haruMotions' },
      { text: '演示：Haru 的参数驱动（身体/手臂/嘴）', goto: 'haruParams' },
      { text: '结束测试环节', goto: 'end_loop' },
    ]);

    if (!pickedDemo.ok || pickedDemo.value === 'end_loop') {
      break;
    }

    if (pickedDemo.value === 'motions') {
      await normal.say('那我就多试几种动作，看看在剧情里能不能当“演出指令”用。');
      await shizuku.motionAndWait('pinch_in');
      await shizuku.motionAndWait('pinch_out');
      await shizuku.motionAndWait('shake');
      await shizuku.motionAndWait('flick_head');
      await normal.say('动作链 OK。你看起来……越来越有“真人感”了。');
      await shizuku.expression('f03');
      await ctx.wait(600);
    }

    if (pickedDemo.value === 'params') {
      await normal.say('接下来进入“导演模式”。我会用参数来让你转头、看向某个方向。');
      await shizuku.motion('__CONTROL__');
      await ctx.wait(400);
      await normal.say('先看左上角。');
      await shizuku.setParam('ParamAngleX', 30);
      await shizuku.setParam('ParamAngleY', -15);
      await shizuku.setParam('ParamEyeBallX', -0.4);
      await shizuku.setParam('ParamEyeBallY', 0.42);
      await ctx.wait(900);
      await normal.say('再看右下角。');
      await shizuku.setParam('ParamAngleX', -30);
      await shizuku.setParam('ParamAngleY', 15);
      await shizuku.setParam('ParamEyeBallX', 0.4);
      await shizuku.setParam('ParamEyeBallY', -0.42);
      await ctx.wait(900);
      await normal.say('回到待机。');
      await shizuku.motion('idle');
      await shizuku.expression('f04');
      await ctx.wait(500);
    }

    if (pickedDemo.value === 'haruMotions') {
      await normal.say('换 Haru 试试：她的动作组看起来更像“招呼/互动”。');
      await haru.motion('Idle');
      await haru.expression('f00');
      await ctx.wait(600);
      await haru.motion('Tap');
      await haru.expression('f03');
      await ctx.wait(700);
      await haru.expression('f05');
      await ctx.wait(600);
      await normal.say('OK，Haru 的动作和表情也能调度。');
    }

    if (pickedDemo.value === 'haruParams') {
      await normal.say('进入 Haru 的“导演模式”。先切到 __CONTROL__，再直接驱动参数。');
      await haru.motion('__CONTROL__');
      await ctx.wait(400);
      await normal.say('先让身体往右倾一点，手臂抬起。');
      await haru.setParam('ParamBodyAngleX', 15);
      await haru.setParam('ParamBodyAngleY', 0);
      await haru.setParam('ParamBodyAngleZ', -10);
      await haru.setParam('ParamArmLA', 0.6);
      await haru.setParam('ParamArmLB', 0.4);
      await haru.setParam('ParamArmRA', 0.2);
      await haru.setParam('ParamArmRB', 0.2);
      await ctx.wait(900);
      await normal.say('接着转头、挑眉、张嘴说话。');
      await haru.setParam('ParamAngleX', -20);
      await haru.setParam('ParamAngleY', 10);
      await haru.setParam('ParamAngleZ', 0);
      await haru.setParam('ParamBrowLAngle', 0.5);
      await haru.setParam('ParamBrowRAngle', 0.5);
      await haru.setParam('ParamMouthForm', 0.6);
      await haru.setParam('ParamMouthOpenY', 0.8);
      await ctx.wait(900);
      await normal.say('最后补一点呼吸和情绪。');
      await haru.setParam('ParamBreath', 0.7);
      await haru.setParam('ParamTere', 0.6);
      await haru.setParam('ParamTear', 0.2);
      await ctx.wait(900);
      await normal.say('回到待机。');
      await haru.motion('Idle');
      await haru.expression('f01');
      await ctx.wait(500);
    }
  }

  await normal.say('结论：普通立绘和 Live2D 可以同屏，两套模型的动作/表情/参数都能在剧情里调度。');
  await shizuku.say('测试结束。辛苦了。');
  await haru.say('辛苦啦。下次也叫我来演出。');

  const picked = await ctx.choice([
    { text: '回到 scene1', goto: 'scene1' },
    { text: '回到 scene2', goto: 'scene2' },
    { text: '结束', goto: 'end' },
  ]);

  await normal.hide();
  await shizuku.hide();
  await haru.hide();

  if (picked.ok && picked.value === 'scene1') return 'scene1';
  if (picked.ok && picked.value === 'scene2') return 'scene2';
}
