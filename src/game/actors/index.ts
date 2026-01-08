/**
 * 游戏角色定义和注册
 *
 * 这个文件包含所有游戏角色的定义和资源绑定
 * 与引擎代码完全分离，便于维护和扩展
 */

import { CharacterActor } from '../../engine/core/BaseActor';
import { defaultRuntime } from '../../engine/core/Runtime';

/**
 * 角色精灵图集配置
 */
interface AtlasConfig {
  dir: string;
  prefix: string;
  folder: 'PNG' | 'png';
  poses: string[];
}

/**
 * 注册角色精灵图集
 */
function registerAtlas(actorId: string, config: AtlasConfig): void {
  const mapping: Record<string, string> = {};
  mapping.default = `/assets/characters/${config.dir}/${config.folder}/${config.prefix}.png`;
  config.poses.forEach((pose) => {
    mapping[pose] = `/assets/characters/${config.dir}/${config.folder}/${config.prefix}_${pose}.png`;
  });
  defaultRuntime.bindSpriteAtlas({ actorId, atlasId: config.dir, mapping });
}

// ==================== 角色定义 ====================

/**
 * 女学生 06 - 水手服
 */
export class Josei06Sailor extends CharacterActor {
  constructor(id?: string) {
    super('josei_06_sailor', id);
    registerAtlas(this.id, {
      dir: 'josei_06_sailor',
      prefix: 'josei_06',
      folder: 'PNG',
      poses: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
    });
  }
}

/**
 * 女学生 07 - 水手服
 */
export class Josei07Sailor extends CharacterActor {
  constructor(id?: string) {
    super('josei_07_sailor', id);
    registerAtlas(this.id, {
      dir: 'josei_07_sailor',
      prefix: 'josei_07',
      folder: 'PNG',
      poses: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
    });
  }
}

/**
 * 赤发女孩
 */
export class AkamafuGirl extends CharacterActor {
  constructor(id?: string) {
    super('josei_04_akamafu', id);
    registerAtlas(this.id, {
      dir: 'josei_04_akamafu',
      prefix: 'josei_04',
      folder: 'PNG',
      poses: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
    });
  }
}

/**
 * 和服女孩
 */
export class WaGirl extends CharacterActor {
  constructor(id?: string) {
    super('josei_05_wa', id);
    registerAtlas(this.id, {
      dir: 'josei_05_wa',
      prefix: 'josei_05',
      folder: 'PNG',
      poses: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
    });
  }
}

/**
 * 猫咪动物
 */
export class NekoAnimal extends CharacterActor {
  constructor(id?: string) {
    super('animal_01_neko', id);
    registerAtlas(this.id, {
      dir: 'animal_01_neko',
      prefix: 'animal_01',
      folder: 'png',
      poses: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'],
    });
  }
}

// ==================== 角色导出 ====================

/**
 * 所有角色类的映射
 * 用于方便地引用和实例化角色
 */
export const Actors = {
  Josei06Sailor,
  Josei07Sailor,
  AkamafuGirl,
  WaGirl,
  NekoAnimal,
} as const;

/** 角色类型 */
export type ActorName = keyof typeof Actors;
