/**
 * 游戏配置导出
 * 在这里注册游戏的自定义 UI 组件和信息
 */

import { gameRegistry } from './registry';
import type { GameConfig } from './config';

// 导出游戏组件
export { default as SplashScreen } from './ui/SplashScreen.vue';
export { default as TitleScreen } from './ui/TitleScreen.vue';
export { default as SettingsScreen } from './ui/SettingsScreen.vue';
export { default as SaveLoadScreen } from './ui/SaveLoadScreen.vue';
export { default as EndScreen } from './ui/EndScreen.vue';

/**
 * 注册默认游戏配置
 * 游戏开发者可以修改这里的配置来定制自己的游戏
 */
export function registerDefaultGame() {
  const config: GameConfig = {
    id: 'demo-vn',
    name: 'DEMO VN',
    subtitle: 'A Visual Novel Demo',
    version: 'v0.1.0',
    author: 'KosuzuEngine',
    description: 'KosuzuEngine 演示游戏',
    titleBackground: '/assets/bg/haikei_01_sora/jpg/sora_01.jpg',
  };

  gameRegistry.register(config);
  gameRegistry.setDefault(config.id);
}

// 自动注册默认游戏
registerDefaultGame();
