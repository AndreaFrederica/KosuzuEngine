/**
 * 全局音频 API
 * 提供 UI 界面（主菜单、设置等）使用的音频播放功能
 * 与游戏脚本中的 AudioActor 使用相同的接口
 */

import { audioManager } from './render/AudioManager';

/**
 * 全局 BGM 控制器
 * 可在任何 UI 组件中使用，与游戏脚本中的 AudioActor 接口一致
 */
export const bgm = {
  /**
   * 播放背景音乐
   * @param name 音频文件名（如 'bgm.ogg'）
   * @param opts 选项 { fadeIn?: number }
   * @example
   * // 在 TitleScreen.vue 中
   * import { bgm } from 'src/engine/audio';
   * onMounted(() => {
   *   bgm.play('main_theme.ogg', { fadeIn: 1000 });
   * });
   */
  async play(name: string, opts?: { fadeIn?: number }): Promise<boolean> {
    return await audioManager.play(name, opts);
  },

  /**
   * 停止背景音乐
   * @param opts 选项 { fadeOut?: number }
   */
  async stop(opts?: { fadeOut?: number }): Promise<boolean> {
    return await audioManager.stop(opts);
  },

  /**
   * 渐变调整音量
   * @param volume 目标音量 (0-1)
   * @param ms 渐变时间（毫秒）
   */
  async fadeTo(volume: number, ms: number): Promise<boolean> {
    const channelId = 'default_bgm';
    return await audioManager.setChannelVolume(channelId, volume, ms);
  },

  /**
   * 获取当前播放状态
   */
  getStatus() {
    return audioManager.getStatus();
  },
};

/**
 * 全局音效控制器
 * 用于播放 UI 音效（按钮点击、菜单选择等）
 */
export const sfx = {
  /**
   * 播放音效
   * @param url 音频文件 URL 或路径
   * @param opts 选项 { volume?: number, fadeIn?: number }
   * @returns 通道 ID
   * @example
   * import { sfx } from 'src/engine/audio';
   * function onButtonClick() {
   *   sfx.play('/assets/audio/sfx/click.ogg');
   * }
   */
  async play(url: string, opts?: { volume?: number; fadeIn?: number }): Promise<string> {
    return await audioManager.playSFX(url, opts);
  },
};

/**
 * 全局语音控制器
 * 用于播放角色语音
 */
export const voice = {
  /**
   * 播放语音
   * @param url 音频文件 URL 或路径
   * @param opts 选项 { volume?: number, fadeIn?: number }
   * @returns 通道 ID
   */
  async play(url: string, opts?: { volume?: number; fadeIn?: number }): Promise<string> {
    return await audioManager.playVoice(url, opts);
  },
};

/**
 * 音频通道控制器
 * 用于高级音频控制（多通道管理）
 */
export const audio = {
  /**
   * 创建新的音频通道
   * @param channelId 通道 ID
   * @param config 通道配置
   */
  createChannel(channelId?: string, config?: { type: 'bgm' | 'sfx' | 'voice'; loop?: boolean; volume?: number }): string {
    if (!config) {
      return audioManager.createChannel(channelId);
    }
    return audioManager.createChannel(channelId, config);
  },

  /**
   * 获取指定通道
   * @param channelId 通道 ID
   */
  getChannel(channelId: string) {
    return audioManager.getChannel(channelId);
  },

  /**
   * 在指定通道播放音频
   * @param channelId 通道 ID
   * @param url 音频 URL
   * @param fadeInMs 淡入时间
   */
  async playOnChannel(channelId: string, url: string, fadeInMs = 0): Promise<boolean> {
    return await audioManager.playOnChannel(channelId, url, fadeInMs);
  },

  /**
   * 停止指定通道
   * @param channelId 通道 ID
   * @param fadeOutMs 淡出时间
   */
  async stopChannel(channelId: string, fadeOutMs = 0): Promise<boolean> {
    return await audioManager.stopChannel(channelId, fadeOutMs);
  },

  /**
   * 设置通道音量
   * @param channelId 通道 ID
   * @param volume 音量 (0-1)
   * @param fadeMs 渐变时间
   */
  async setChannelVolume(channelId: string, volume: number, fadeMs = 0): Promise<boolean> {
    return await audioManager.setChannelVolume(channelId, volume, fadeMs);
  },

  /**
   * 删除通道
   * @param channelId 通道 ID
   */
  destroyChannel(channelId: string): void {
    audioManager.destroyChannel(channelId);
  },

  /**
   * 获取所有通道状态
   */
  getAllChannelStatus() {
    return audioManager.getAllChannelStatus();
  },

  /**
   * 处理用户交互（用于解锁音频播放）
   */
  handleUserInteraction() {
    audioManager.handleUserInteraction();
  },
};
