/**
 * 场景注册表
 *
 * 这个文件负责注册所有游戏场景
 * 与引擎代码完全分离，便于管理游戏内容
 */

import { scene1, scene2 } from './scene1';
import { sceneEffects } from './sceneEffects';
import { sceneLive2DMix } from './sceneLive2DMix';

/**
 * 场景配置接口
 */
export interface SceneConfig {
  /** 场景ID，用于场景跳转 */
  id: string;
  /** 场景显示名称 */
  name: string;
  /** 场景执行函数 */
  fn: () => Promise<void | string>;
}

/**
 * 所有游戏场景的注册表
 *
 * 添加新场景时：
 * 1. 在 src/game/scenes/ 目录下创建场景文件
 * 2. 导出场景函数（async function sceneXxx()）
 * 3. 在这里注册场景配置
 */
export const scenes: SceneConfig[] = [
  {
    id: 'scene1',
    name: '开始',
    fn: scene1,
  },
  {
    id: 'scene2',
    name: '继续',
    fn: scene2,
  },
  {
    id: 'sceneEffects',
    name: '特效测试',
    fn: sceneEffects,
  },
  {
    id: 'sceneLive2DMix',
    name: 'Live2D 混合测试',
    fn: sceneLive2DMix,
  },
];

/**
 * 场景ID类型
 */
export type SceneId = typeof scenes[number]['id'];

/**
 * 根据ID获取场景配置
 */
export function getScene(id: SceneId): SceneConfig | undefined {
  return scenes.find((s) => s.id === id);
}

/**
 * 根据ID获取场景函数
 */
export function getSceneFn(id: SceneId): (() => Promise<void | string>) | undefined {
  return getScene(id)?.fn;
}

/**
 * 检查场景是否存在
 */
export function hasScene(id: string): id is SceneId {
  return scenes.some((s) => s.id === id);
}
