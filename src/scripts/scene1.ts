import { CharacterActor, BackgroundActor, AudioActor } from '../engine/core/BaseActor';

export async function scene1() {
  const bg = new BackgroundActor('school');
  const bgm = new AudioActor('daytime');
  const alice = new CharacterActor('Alice');
  const bob = new CharacterActor('Bob');

  await bg.switch('school', { fadeIn: 500 });
  await bgm.play('daytime', { fadeIn: 800 });

  await alice.show({ x: 0.2, layer: 2 });
  await bob.show({ x: 0.7, layer: 2 });

  await alice.pose('happy');
  await bob.motion('idle');

  await alice.say('你好，今天的课真多。');
  await bob.say('是啊，放学去喝奶茶？');
}
