import { CharacterActor } from '../engine/core/BaseActor';
import { defaultRuntime } from '../engine/core/Runtime';

function registerAtlas(actorId: string, dir: string, prefix: string, folder: 'PNG' | 'png', keys: string[]) {
  const mapping: Record<string, string> = {};
  mapping.default = `/assets/characters/${dir}/${folder}/${prefix}.png`;
  keys.forEach((k) => (mapping[k] = `/assets/characters/${dir}/${folder}/${prefix}_${k}.png`));
  defaultRuntime.bindSpriteAtlas({ actorId, atlasId: dir, mapping });
}

export class Josei06Sailor extends CharacterActor {
  constructor(id?: string) {
    super('josei_06_sailor', id);
    registerAtlas(this.id, 'josei_06_sailor', 'josei_06', 'PNG', ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
  }
}

export class Josei07Sailor extends CharacterActor {
  constructor(id?: string) {
    super('josei_07_sailor', id);
    registerAtlas(this.id, 'josei_07_sailor', 'josei_07', 'PNG', ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
  }
}

export class AkamafuGirl extends CharacterActor {
  constructor(id?: string) {
    super('josei_04_akamafu', id);
    registerAtlas(this.id, 'josei_04_akamafu', 'josei_04', 'PNG', ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
  }
}

export class WaGirl extends CharacterActor {
  constructor(id?: string) {
    super('josei_05_wa', id);
    registerAtlas(this.id, 'josei_05_wa', 'josei_05', 'PNG', ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
  }
}

export class NekoAnimal extends CharacterActor {
  constructor(id?: string) {
    super('animal_01_neko', id);
    registerAtlas(this.id, 'animal_01_neko', 'animal_01', 'png', ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']);
  }
}
