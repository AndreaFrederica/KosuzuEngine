import { BackgroundActor, AudioActor } from '../engine/core/BaseActor';
import { Josei06Sailor, Josei07Sailor, AkamafuGirl, NekoAnimal } from '../roles/josei';

export async function scene1() {
  const bg = new BackgroundActor('haikei_01_sora/jpg/sora_01.jpg');
  const bgm = new AudioActor('daytime');
  const sailorA = new Josei06Sailor('sailorA');
  const sailorB = new Josei07Sailor('sailorB');
  const akamafu = new AkamafuGirl('akamafu');
  const neko = new NekoAnimal('neko');

  await bg.switch('haikei_01_sora/jpg/sora_01.jpg', { fadeIn: 500 });
  await bgm.play('daytime', { fadeIn: 800 });

  await sailorA.show({ x: 0.75, y: 0.30, layer: 2, scale: 0.6 });
  await sailorB.show({ x: 0.10, y: 0.40, layer: 2, scale: 0.6 });

  await sailorA.pose('a');
  await sailorB.pose('b');

  await sailorA.say('今天天气真好。');
  await sailorB.say('嗯，放学一起去买甜点吧？');

  await sailorA.move({ x: 0.65, y: 0.38, scale: 0.6 });
  await sailorB.move({ x: 0.18, y: 0.50, scale: 0.6 });
  await sailorA.pose('c');
  await sailorB.pose('d');
  await sailorA.say('我想试试那家新开的店。');
  await sailorB.say('听说草莓蛋糕很受欢迎。');

  await bg.switch('haikei_01_sora/jpg/sora_02.jpg', { fadeIn: 400 });
  await sailorA.move({ x: 0.55, y: 0.45, scale: 0.6 });
  await sailorB.move({ x: 0.25, y: 0.55, scale: 0.6 });
  await sailorA.pose('e');
  await sailorB.pose('f');
  await sailorA.say('风有点大，别让帽子飞了。');
  await sailorB.say('好险，差点就掉了。');

  await neko.show({ x: 0.02, y: 1.22, layer: 3, scale: 0.5, opacity: 0.9 });
  await neko.pose('g');
  await sailorA.say('呀，小猫咪也出来散步。');
  await sailorB.say('好可爱，想摸摸它。');

  await sailorA.move({ x: 0.62, y: 0.48, scale: 0.6 });
  await sailorB.move({ x: 0.20, y: 0.48, scale: 0.6 });
  await sailorA.pose('g');
  await sailorB.pose('h');
  await sailorA.say('我们要不要邀请她一起？');
  await sailorB.say('好，正好人多可以点更多。');

  await akamafu.show({ x: 0.40, y: 0.55, layer: 2, scale: 0.6 });
  await akamafu.pose('a');
  await akamafu.say('咦，你们在聊什么？');
  await sailorA.say('一起去甜点店，刚好路过。');
  await sailorB.say('要不要一起来？');

  await akamafu.pose('b');
  await akamafu.say('当然好呀，我也想试试新品。');
  await sailorA.pose('h');
  await sailorA.say('太好了，那就出发吧。');

  await bg.switch('haikei_01_sora/jpg/sora_03.jpg', { fadeIn: 400 });
  await sailorA.move({ x: 0.80, y: 0.32, scale: 0.6 });
  await sailorB.move({ x: 0.18, y: 0.42, scale: 0.6 });
  await akamafu.move({ x: 0.48, y: 0.38, scale: 0.6 });
  await neko.move({ x: 0.05, y: 0.42, scale: 0.52 });

  await sailorA.pose('a');
  await sailorB.pose('b');
  await akamafu.pose('c');
  await sailorA.say('快到了，我想先点冰饮。');
  await sailorB.say('我要抹茶拿铁。');
  await akamafu.say('我选焦糖布丁。');

  await bg.switch('haikei_01_sora/jpg/sora_04.jpg', { fadeIn: 400 });
  await sailorA.move({ x: 0.70, y: 0.46, scale: 0.6 });
  await sailorB.move({ x: 0.12, y: 0.50, scale: 0.6 });
  await akamafu.move({ x: 0.45, y: 0.40, scale: 0.6 });
  await neko.move({ x: 0.08, y: 0.42, scale: 0.55 });

  await sailorA.pose('d');
  await sailorB.pose('e');
  await akamafu.pose('f');
  await sailorA.say('今天真是个适合约会的日子。');
  await sailorB.say('哈哈，说得也是。');
  await akamafu.say('下次换你们请客哦。');

  await sailorA.pose('g');
  await sailorB.pose('h');
  await akamafu.pose('a');
  await sailorA.say('成交。');
  await sailorB.say('那就这么说定了。');
  await akamafu.say('走吧。');
}
