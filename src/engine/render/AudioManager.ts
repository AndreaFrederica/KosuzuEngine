/**
 * 音频管理器，负责多音频通道的管理
 * 支持 BGM、音效、语音等多种音频类型的独立播放
 */

import { AudioChannel, type ChannelConfig, type ChannelStatus } from './AudioChannel';

// 全局回调类型，用于显示用户交互提示
type ShowPromptCallback = () => void;
type HidePromptCallback = () => void;

let showPromptCallback: ShowPromptCallback | null = null;
let hidePromptCallback: HidePromptCallback | null = null;

export function setShowPromptVisible(callback: ShowPromptCallback | null) {
  showPromptCallback = callback;
}

export function setHidePrompt(callback: HidePromptCallback | null) {
  hidePromptCallback = callback;
}

export class AudioManager {
  // 多通道管理
  private channels: Map<string, AudioChannel> = new Map();
  private channelCounter: number = 0;
  private pendingPlays: Map<string, { url: string; fadeInMs: number }> = new Map();
  private hasUserInteracted: boolean = false;
  private interactionHandlerBound: boolean = false;

  // 默认 BGM 通道（向后兼容）
  private readonly BGM_CHANNEL = 'default_bgm';

  constructor() {
    // 创建默认 BGM 通道
    this.createChannel(this.BGM_CHANNEL, { type: 'bgm', loop: true });
  }

  /**
   * 创建一个新的音频通道
   * @param channelId 自定义通道 ID，如不提供则自动生成
   * @param config 通道配置
   * @returns 通道 ID
   */
  createChannel(channelId?: string, config?: ChannelConfig): string {
    const id = channelId ?? `channel_${++this.channelCounter}`;
    const channelConfig: ChannelConfig = config ?? { type: 'sfx', loop: false };

    // 如果通道已存在，先销毁旧的
    if (this.channels.has(id)) {
      const oldChannel = this.channels.get(id);
      if (oldChannel) {
        oldChannel.dispose();
      }
    }

    const channel = new AudioChannel(id, channelConfig);
    this.channels.set(id, channel);

    console.log(`[AudioManager] 创建音频通道: ${id}, 类型: ${channelConfig.type}`);
    return id;
  }

  /**
   * 获取一个音频通道
   * @param channelId 通道 ID
   * @returns 音频通道实例
   */
  getChannel(channelId: string): AudioChannel | undefined {
    return this.channels.get(channelId);
  }

  /**
   * 删除一个音频通道
   * @param channelId 通道 ID
   */
  destroyChannel(channelId: string): void {
    const channel = this.channels.get(channelId);
    if (channel) {
      channel.dispose();
      this.channels.delete(channelId);
      console.log(`[AudioManager] 删除音频通道: ${channelId}`);
    }
  }

  /**
   * 获取所有通道的状态
   */
  getAllChannelStatus(): Map<string, ChannelStatus> {
    const status = new Map<string, ChannelStatus>();
    for (const [id, channel] of this.channels) {
      status.set(id, channel.getStatus());
    }
    return status;
  }

  /**
   * 绑定用户交互监听器
   */
  private bindInteractionHandler() {
    if (this.interactionHandlerBound) return;
    this.interactionHandlerBound = true;

    const events = ['click', 'keydown', 'touchstart', 'mousedown'];
    const handler = () => {
      if (!this.hasUserInteracted) {
        this.handleUserInteraction();
      }

      // 移除事件监听
      events.forEach(event => {
        window.removeEventListener(event, handler);
      });
      this.interactionHandlerBound = false;
    };

    events.forEach(event => {
      window.addEventListener(event, handler, { once: true, passive: true });
    });
  }

  /**
   * 处理用户交互（播放待处理的音频）
   */
  handleUserInteraction() {
    if (this.hasUserInteracted) {
      return; // 已经处理过，直接返回
    }
    console.log('[AudioManager] 检测到用户交互');
    this.hasUserInteracted = true;

    // 隐藏交互提示（如果存在）
    if (hidePromptCallback) {
      hidePromptCallback();
      hidePromptCallback = null;
    }

    // 尝试播放所有待处理的音频
    for (const [chId, { url, fadeInMs }] of this.pendingPlays) {
      console.log(`[AudioManager] 用户交互后重试播放: ${chId}`);
      void this.playOnChannel(chId, url, fadeInMs);
    }
    this.pendingPlays.clear();
  }

  /**
   * 在指定通道上播放音频
   * @param channelId 通道 ID
   * @param url 音频 URL
   * @param fadeInMs 淡入时间（毫秒）
   */
  async playOnChannel(channelId: string, url: string, fadeInMs = 0): Promise<boolean> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      console.error(`[AudioManager] 通道不存在: ${channelId}`);
      return false;
    }

    try {
      return await channel.play(url, fadeInMs);
    } catch (error: unknown) {
      const errorName = error instanceof Error ? error.name : String(error);
      if (errorName === 'NotAllowedError') {
        console.log(`[AudioManager] 需要用户交互才能播放音频 (${channelId})`);
        // 保存播放请求，等待用户交互
        this.pendingPlays.set(channelId, { url, fadeInMs });
        // 绑定交互监听器
        this.bindInteractionHandler();
        // 显示交互提示
        if (showPromptCallback) {
          showPromptCallback();
        }
        return false;
      }
      console.error(`[AudioManager] 播放失败 (${channelId}):`, error);
      return false;
    }
  }

  /**
   * 播放背景音乐（向后兼容方法）
   * @param name 音频文件名
   * @param options 选项 { fadeIn?: number, volume?: number }
   */
  async play(name: string, options?: { fadeIn?: number; volume?: number }): Promise<boolean> {
    const fadeInMs = options?.fadeIn ?? 0;
    const volume = options?.volume ?? 1.0;

    const audioPath = `/assets/audio/bgm/${name}`;
    console.log('[AudioManager] 播放背景音乐:', name, '淡入:', fadeInMs);

    // 确保 BGM 通道存在（热重载后可能被清空）
    if (!this.channels.has(this.BGM_CHANNEL)) {
      console.log('[AudioManager] BGM 通道不存在，重新创建');
      this.createChannel(this.BGM_CHANNEL, { type: 'bgm', loop: true, volume });
    }

    const channel = this.channels.get(this.BGM_CHANNEL);
    if (!channel) {
      console.error('[AudioManager] BGM 通道创建失败');
      return false;
    }

    // 设置音量
    void channel.setVolume(volume);

    return await this.playOnChannel(this.BGM_CHANNEL, audioPath, fadeInMs);
  }

  /**
   * 停止指定通道的音频
   * @param channelId 通道 ID
   * @param fadeOutMs 淡出时间（毫秒）
   */
  async stopChannel(channelId: string, fadeOutMs = 0): Promise<boolean> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      return false;
    }

    // 清除待处理的播放
    this.pendingPlays.delete(channelId);

    return await channel.stop(fadeOutMs);
  }

  /**
   * 停止背景音乐（向后兼容方法）
   * @param options 选项 { fadeOut?: number }
   */
  async stop(options?: { fadeOut?: number }): Promise<boolean> {
    const fadeOutMs = options?.fadeOut ?? 0;
    console.log('[AudioManager] 停止背景音乐, 淡出:', fadeOutMs);

    // 如果 BGM 通道不存在，直接返回成功
    if (!this.channels.has(this.BGM_CHANNEL)) {
      return true;
    }

    return await this.stopChannel(this.BGM_CHANNEL, fadeOutMs);
  }

  /**
   * 播放音效（单次播放，不循环）
   * @param url 音频 URL
   * @param options 选项 { volume?: number, fadeIn?: number }
   * @returns 通道 ID
   */
  async playSFX(url: string, options?: { volume?: number; fadeIn?: number }): Promise<string> {
    const config: ChannelConfig = { type: 'sfx', loop: false };
    if (options?.volume !== undefined) {
      config.volume = options.volume;
    }
    const channelId = this.createChannel(undefined, config);
    await this.playOnChannel(channelId, url, options?.fadeIn ?? 0);

    // 播放完成后自动清理通道
    const channel = this.channels.get(channelId);
    if (channel) {
      const checkInterval = setInterval(() => {
        const status = channel.getStatus();
        if (!status.isPlaying) {
          clearInterval(checkInterval);
          this.destroyChannel(channelId);
        }
      }, 500);
    }

    return channelId;
  }

  /**
   * 播放角色语音（单次播放，不循环）
   * @param url 音频 URL
   * @param options 选项 { volume?: number, fadeIn?: number }
   * @returns 通道 ID
   */
  async playVoice(url: string, options?: { volume?: number; fadeIn?: number }): Promise<string> {
    const config: ChannelConfig = { type: 'voice', loop: false };
    if (options?.volume !== undefined) {
      config.volume = options.volume;
    }
    const channelId = this.createChannel(undefined, config);
    await this.playOnChannel(channelId, url, options?.fadeIn ?? 0);

    // 播放完成后自动清理通道
    const channel = this.channels.get(channelId);
    if (channel) {
      const checkInterval = setInterval(() => {
        const status = channel.getStatus();
        if (!status.isPlaying) {
          clearInterval(checkInterval);
          this.destroyChannel(channelId);
        }
      }, 500);
    }

    return channelId;
  }

  /**
   * 设置通道音量
   * @param channelId 通道 ID
   * @param volume 音量 (0-1)
   * @param fadeMs 渐变时间（毫秒）
   */
  async setChannelVolume(channelId: string, volume: number, fadeMs = 0): Promise<boolean> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      return false;
    }
    return await channel.setVolume(volume, fadeMs);
  }

  /**
   * 获取默认 BGM 通道状态（向后兼容）
   */
  getStatus() {
    const channel = this.channels.get(this.BGM_CHANNEL);
    if (!channel) {
      return {
        isPlaying: false,
        currentTrack: null,
        volume: 0,
        audioPaused: true,
        audioCurrentTime: 0,
        hasAudioElement: false,
        hasPendingPlay: false,
      };
    }

    const status = channel.getStatus();
    const hasPendingPlay = this.pendingPlays.has(this.BGM_CHANNEL);

    return {
      isPlaying: status.isPlaying,
      currentTrack: status.currentTrack,
      volume: status.volume,
      audioPaused: status.audioPaused,
      audioCurrentTime: status.audioCurrentTime,
      audioReady: status.audioReady,
      hasAudioElement: status.hasAudioElement,
      hasPendingPlay,
    };
  }

  /**
   * 清理所有资源
   */
  dispose() {
    // 清理所有通道
    for (const [channelId, channel] of this.channels) {
      console.log(`[AudioManager] 清理通道: ${channelId}`);
      channel.dispose();
    }
    this.channels.clear();
    this.pendingPlays.clear();
  }
}

// 导出单例实例
export const audioManager = new AudioManager();
