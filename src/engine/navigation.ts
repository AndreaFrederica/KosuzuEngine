/**
 * 全局导航 API
 * 提供 UI 界面（主菜单、设置等）使用的页面导航功能
 * 与游戏脚本中的 ContextOps 导航方法一致
 */

import { registerRouterNavigateCallback, type RouterNavigateCallback } from './core/BaseActor';

// 存储路由回调
let currentRouterCallback: RouterNavigateCallback | null = null;

// 注册导航回调（由 DemoVN.vue 或其他主组件调用）
export function initNavigation(callback: RouterNavigateCallback) {
  currentRouterCallback = callback;
  // 同时注册到 BaseActor 系统，使 ContextOps 导航方法也能工作
  registerRouterNavigateCallback(callback);
}

/**
 * 全局导航控制器
 * 可在任何 UI 组件中使用
 */
export const nav = {
  /**
   * 导航到主菜单（标题界面）
   * @example
   * import { nav } from 'src/engine/navigation';
   * function goToMainMenu() {
   *   nav.goToTitle();
   * }
   */
  goToTitle() {
    if (currentRouterCallback) {
      currentRouterCallback('/title');
    }
  },

  /**
   * 导航到启动动画界面
   */
  goToSplash() {
    if (currentRouterCallback) {
      currentRouterCallback('/');
    }
  },

  /**
   * 导航到结束动画界面
   */
  goToEnd() {
    if (currentRouterCallback) {
      currentRouterCallback('/end');
    }
  },

  /**
   * 导航到设置界面
   */
  goToSettings() {
    if (currentRouterCallback) {
      currentRouterCallback('/settings');
    }
  },

  /**
   * 导航到存读档界面
   * @param mode 模式 'save' | 'load'
   */
  goToSaves(mode?: 'save' | 'load') {
    if (currentRouterCallback) {
      currentRouterCallback(mode ? `/saves?mode=${mode}` : '/saves');
    }
  },

  /**
   * 导航到游戏界面
   */
  goToGame() {
    if (currentRouterCallback) {
      currentRouterCallback('/demo');
    }
  },

  /**
   * 通用导航方法
   * @param path 路由路径
   */
  push(path: string) {
    if (currentRouterCallback) {
      currentRouterCallback(path);
    }
  },
};
