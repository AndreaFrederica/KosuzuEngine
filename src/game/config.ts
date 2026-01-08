/**
 * 游戏配置接口
 * 定义游戏可自定义的 UI 组件和信息
 */
import type { Component } from 'vue';

export interface GameConfig {
  /** 游戏唯一标识 */
  id: string;

  /** 游戏名称 */
  name: string;

  /** 游戏副标题 */
  subtitle?: string;

  /** 游戏版本 */
  version: string;

  /** 作者信息 */
  author?: string;

  /** 游戏描述 */
  description?: string;

  /** 启动动画组件 */
  splashScreen?: Component;

  /** 主界面组件 */
  titleScreen?: Component;

  /** 设置界面组件 */
  settingsScreen?: Component;

  /** 存读档界面组件 */
  saveLoadScreen?: Component;

  /** 结束动画组件 */
  endScreen?: Component;

  /** 主界面背景图（可选，默认使用游戏提供的） */
  titleBackground?: string;
}

/**
 * 游戏注册表类型
 */
export type GameRegistry = Map<string, GameConfig>;
