/**
 * 游戏场景统一入口
 *
 * 导出所有场景和场景注册表
 */

export { scene1, scene2 } from './scene1';
export { sceneEffects } from './sceneEffects';
export { scenes, getScene, getSceneFn, hasScene, type SceneId, type SceneConfig } from './registry';
