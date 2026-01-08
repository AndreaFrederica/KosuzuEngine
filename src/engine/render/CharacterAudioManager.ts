/**
 * 角色音频管理器
 * 每个角色可以创建和管理多个独立的语音通道
 */

import { AudioManager } from './AudioManager';
import type { ChannelConfig } from './AudioChannel';

// 全局 AudioManager 单例
let audioManagerInstance: AudioManager | null = null;

function getAudioManager(): AudioManager {
  if (!audioManagerInstance) {
    // 动态导入避免循环依赖
    void import('./AudioManager').then((module) => {
      audioManagerInstance = module.audioManager;
    });
  }
  return audioManagerInstance ?? (window as unknown as { __audioManager__?: AudioManager }).__audioManager__ ?? new AudioManager();
}

/**
 * 角色音频通道状态
 */
export interface CharacterChannelStatus {
  channelId: string;
  characterName: string;
  isPlaying: boolean;
  currentTrack: string | null;
  volume: number;
}

/**
 * 角色音频管理器
 * 管理单个角色的多个语音通道
 */
export class CharacterAudioManager {
  private characterName: string;
  private voiceChannels: Set<string> = new Set();
  private audioManager: AudioManager;
  private channelCounter: number = 0;

  constructor(characterName: string) {
    this.characterName = characterName;
    this.audioManager = getAudioManager();
  }

  /**
   * 播放角色语音
   * @param url 音频文件 URL
   * @param options 选项 { volume?: number; fadeIn?: number; loop?: boolean }
   * @returns 通道 ID
   */
  async playVoice(
    url: string,
    options?: { volume?: number; fadeIn?: number; loop?: boolean }
  ): Promise<string> {
    const channelId = `${this.characterName}_voice_${++this.channelCounter}`;
    const config: ChannelConfig = {
      type: 'voice',
      loop: options?.loop ?? false,
    };
    if (options?.volume !== undefined) {
      config.volume = options.volume;
    }

    // 创建通道
    this.audioManager.createChannel(channelId, config);
    this.voiceChannels.add(channelId);

    // 播放音频
    await this.audioManager.playOnChannel(channelId, url, options?.fadeIn ?? 0);

    // 如果不是循环播放，播放完成后自动清理
    if (!options?.loop) {
      const channel = this.audioManager.getChannel(channelId);
      if (channel) {
        const checkInterval = setInterval(() => {
          const status = channel.getStatus();
          if (!status.isPlaying) {
            clearInterval(checkInterval);
            void this.stopVoice(channelId);
          }
        }, 500);
      }
    }

    console.log(`[CharacterAudioManager:${this.characterName}] 播放语音: ${channelId}`);
    return channelId;
  }

  /**
   * 停止指定语音通道
   * @param channelId 通道 ID
   * @param fadeOutMs 淡出时间（毫秒）
   */
  async stopVoice(channelId: string, fadeOutMs = 0): Promise<boolean> {
    if (!this.voiceChannels.has(channelId)) {
      return false;
    }

    const result = await this.audioManager.stopChannel(channelId, fadeOutMs);
    this.voiceChannels.delete(channelId);
    this.audioManager.destroyChannel(channelId);

    console.log(`[CharacterAudioManager:${this.characterName}] 停止语音: ${channelId}`);
    return result;
  }

  /**
   * 停止所有语音通道
   * @param fadeOutMs 淡出时间（毫秒）
   */
  async stopAllVoices(fadeOutMs = 0): Promise<void> {
    const promises: Promise<boolean>[] = [];

    for (const channelId of this.voiceChannels) {
      promises.push(this.stopVoice(channelId, fadeOutMs));
    }

    await Promise.all(promises);
    console.log(`[CharacterAudioManager:${this.characterName}] 停止所有语音`);
  }

  /**
   * 设置语音通道音量
   * @param channelId 通道 ID
   * @param volume 音量 (0-1)
   * @param fadeMs 渐变时间（毫秒）
   */
  async setVoiceVolume(channelId: string, volume: number, fadeMs = 0): Promise<boolean> {
    if (!this.voiceChannels.has(channelId)) {
      return false;
    }

    return await this.audioManager.setChannelVolume(channelId, volume, fadeMs);
  }

  /**
   * 获取角色所有语音通道状态
   */
  getVoiceChannelsStatus(): CharacterChannelStatus[] {
    const statuses: CharacterChannelStatus[] = [];

    for (const channelId of this.voiceChannels) {
      const channel = this.audioManager.getChannel(channelId);
      if (channel) {
        const status = channel.getStatus();
        statuses.push({
          channelId,
          characterName: this.characterName,
          isPlaying: status.isPlaying,
          currentTrack: status.currentTrack,
          volume: status.volume,
        });
      }
    }

    return statuses;
  }

  /**
   * 获取角色名称
   */
  getCharacterName(): string {
    return this.characterName;
  }

  /**
   * 清理所有语音通道
   */
  dispose(): void {
    for (const channelId of this.voiceChannels) {
      this.audioManager.destroyChannel(channelId);
    }
    this.voiceChannels.clear();
    console.log(`[CharacterAudioManager:${this.characterName}] 已清理`);
  }
}

/**
 * 全局角色音频管理器注册表
 * 管理所有角色的音频管理器实例
 */
class CharacterAudioManagerRegistry {
  private managers: Map<string, CharacterAudioManager> = new Map();

  /**
   * 获取或创建角色的音频管理器
   * @param characterName 角色名称
   * @returns 角色音频管理器实例
   */
  getOrCreate(characterName: string): CharacterAudioManager {
    let manager = this.managers.get(characterName);

    if (!manager) {
      manager = new CharacterAudioManager(characterName);
      this.managers.set(characterName, manager);
      console.log(`[CharacterAudioRegistry] 创建角色音频管理器: ${characterName}`);
    }

    return manager;
  }

  /**
   * 获取角色的音频管理器（不创建）
   * @param characterName 角色名称
   * @returns 角色音频管理器实例或 undefined
   */
  get(characterName: string): CharacterAudioManager | undefined {
    return this.managers.get(characterName);
  }

  /**
   * 移除角色的音频管理器
   * @param characterName 角色名称
   */
  remove(characterName: string): void {
    const manager = this.managers.get(characterName);
    if (manager) {
      manager.dispose();
      this.managers.delete(characterName);
      console.log(`[CharacterAudioRegistry] 移除角色音频管理器: ${characterName}`);
    }
  }

  /**
   * 清理所有角色音频管理器
   */
  dispose(): void {
    for (const manager of this.managers.values()) {
      manager.dispose();
    }
    this.managers.clear();
    console.log('[CharacterAudioRegistry] 已清理所有管理器');
  }

  /**
   * 获取所有角色音频管理器状态
   */
  getAllStatus(): Map<string, CharacterChannelStatus[]> {
    const allStatus = new Map<string, CharacterChannelStatus[]>();

    for (const [characterName, manager] of this.managers) {
      allStatus.set(characterName, manager.getVoiceChannelsStatus());
    }

    return allStatus;
  }
}

// 导出全局注册表单例
export const characterAudioRegistry = new CharacterAudioManagerRegistry();
