/**
 * 语音管理器
 *
 * 支持预录制语音文件和多种 TTS 服务
 */

import type { TTSConfig } from './types';

export interface VoiceSettings {
  enabled: boolean;
  engine: 'browser' | 'openai' | 'azure' | 'google';
  browserVoiceId?: string;
  rate: number;
  pitch: number;
  volume: number;
}

export class VoiceManager {
  private settings: VoiceSettings;
  private settingsStore: {
    voiceSettings: {
      enabled: boolean;
      engine: 'browser' | 'openai' | 'azure' | 'google';
      browserVoiceId: string;
    };
    setVoiceEnabled: (value: boolean) => void;
    setVoiceEngine: (value: 'browser' | 'openai' | 'azure' | 'google') => void;
    setBrowserVoiceId: (value: string) => void;
  } | null = null;

  constructor() {
    this.settings = this.getDefaultSettings();
    // 延迟初始化 settingsStore 以避免循环依赖
    void this.initSettingsStore();
  }

  private async initSettingsStore() {
    try {
      const { useSettingsStore } = await import('../../stores/settings-store');
      this.settingsStore = useSettingsStore();
    } catch (e) {
      console.warn('[VoiceManager] 初始化 settingsStore 失败:', e);
    }
  }

  private getDefaultSettings(): VoiceSettings {
    return {
      enabled: false,
      engine: 'browser',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
    };
  }

  /** 获取语音设置（从 settings-store 读取） */
  getSettings(): VoiceSettings {
    if (this.settingsStore) {
      return {
        enabled: this.settingsStore.voiceSettings.enabled,
        engine: this.settingsStore.voiceSettings.engine,
        browserVoiceId: this.settingsStore.voiceSettings.browserVoiceId,
        rate: this.settings.rate,
        pitch: this.settings.pitch,
        volume: this.settings.volume,
      };
    }
    return { ...this.settings };
  }

  /** 更新语音设置（更新到 settings-store） */
  updateSettings(updates: Partial<VoiceSettings>) {
    this.settings = { ...this.settings, ...updates };
    if (this.settingsStore) {
      if (updates.enabled !== undefined) {
        this.settingsStore.setVoiceEnabled(updates.enabled);
      }
      if (updates.engine !== undefined) {
        this.settingsStore.setVoiceEngine(updates.engine);
      }
      if (updates.browserVoiceId !== undefined) {
        this.settingsStore.setBrowserVoiceId(updates.browserVoiceId);
      }
    }
  }

  /** 播放预录制的语音文件 */
  async playVoiceFile(path: string): Promise<void> {
    if (!this.settings.enabled) return;

    try {
      // 使用新的多通道音频系统
      const { audioManager } = await import('../render/AudioManager');
      const audioUrl = `/assets/voices/${path}`;
      await audioManager.playVoice(audioUrl, { volume: this.settings.volume });
    } catch (error) {
      console.error(`[VoiceManager] 播放语音文件失败: ${path}`, error);
    }
  }

  /** 使用浏览器 TTS 播放 */
  speakWithBrowserTTS(text: string, config?: TTSConfig): Promise<void> {
    if (!this.settings.enabled) return Promise.resolve();
    if (!('speechSynthesis' in window)) {
      console.warn('[VoiceManager] 浏览器不支持 speechSynthesis API');
      return Promise.resolve();
    }

    // 取消当前正在播放的语音
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // 合并配置
    const voiceId = config?.voiceId ?? this.settings.browserVoiceId;
    const rate = config?.rate ?? this.settings.rate;
    const pitch = config?.pitch ?? this.settings.pitch;
    const volume = config?.volume ?? this.settings.volume;

    // 设置语音
    if (voiceId) {
      const voices = speechSynthesis.getVoices();
      const voice = voices.find((v) => v.name === voiceId || v.lang === voiceId);
      if (voice) utterance.voice = voice;
    }

    utterance.rate = Math.max(0.1, Math.min(2, rate));
    utterance.pitch = Math.max(0.1, Math.min(2, pitch));
    utterance.volume = Math.max(0, Math.min(1, volume));

    speechSynthesis.speak(utterance);
    return Promise.resolve();
  }

  /** 使用 TTS API 播放 */
  async speakWithAPI(text: string, config?: TTSConfig): Promise<void> {
    if (!this.settings.enabled) return Promise.resolve();

    const engine = config?.provider ?? this.settings.engine;

    switch (engine) {
      case 'browser':
        return this.speakWithBrowserTTS(text, config);
      case 'openai':
        return this.speakWithOpenAI(text, config);
      case 'azure':
        return this.speakWithAzure(text, config);
      case 'google':
        return this.speakWithGoogle(text, config);
      default:
        return this.speakWithBrowserTTS(text, config);
    }
  }

  /** 使用 OpenAI TTS API */
  private async speakWithOpenAI(text: string, config?: TTSConfig): Promise<void> {
    try {
      const voice = config?.voiceId || 'alloy';
      const response = await fetch('/api/tts/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice }),
      });

      if (!response.ok) {
        console.warn('[VoiceManager] OpenAI TTS 请求失败');
        // 回退到浏览器 TTS
        return this.speakWithBrowserTTS(text, config);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.volume = config?.volume ?? this.settings.volume;
      void audio.play();

      // 清理 URL
      audio.onended = () => URL.revokeObjectURL(audioUrl);
    } catch (error) {
      console.error('[VoiceManager] OpenAI TTS 播放失败', error);
      // 回退到浏览器 TTS
      return this.speakWithBrowserTTS(text, config);
    }
  }

  /** 使用 Azure TTS API */
  private async speakWithAzure(text: string, config?: TTSConfig): Promise<void> {
    try {
      const voice = config?.voiceId || 'zh-CN-XiaoxiaoNeural';
      const response = await fetch('/api/tts/azure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice }),
      });

      if (!response.ok) {
        console.warn('[VoiceManager] Azure TTS 请求失败');
        return this.speakWithBrowserTTS(text, config);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.volume = config?.volume ?? this.settings.volume;
      void audio.play();

      audio.onended = () => URL.revokeObjectURL(audioUrl);
    } catch (error) {
      console.error('[VoiceManager] Azure TTS 播放失败', error);
      return this.speakWithBrowserTTS(text, config);
    }
  }

  /** 使用 Google TTS API */
  private async speakWithGoogle(text: string, config?: TTSConfig): Promise<void> {
    try {
      const voice = config?.voiceId || 'zh-CN-Wavenet-A';
      const response = await fetch('/api/tts/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice }),
      });

      if (!response.ok) {
        console.warn('[VoiceManager] Google TTS 请求失败');
        return this.speakWithBrowserTTS(text, config);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.volume = config?.volume ?? this.settings.volume;
      void audio.play();

      audio.onended = () => URL.revokeObjectURL(audioUrl);
    } catch (error) {
      console.error('[VoiceManager] Google TTS 播放失败', error);
      return this.speakWithBrowserTTS(text, config);
    }
  }

  /** 获取可用的浏览器语音列表 */
  getBrowserVoices(): SpeechSynthesisVoice[] {
    if (!('speechSynthesis' in window)) return [];
    return speechSynthesis.getVoices();
  }

  /** 预加载语音列表（需要在用户交互后调用） */
  async preloadVoices(): Promise<void> {
    if (!('speechSynthesis' in window)) return;

    // 某些浏览器需要用户交互后才加载语音列表
    return new Promise((resolve) => {
      speechSynthesis.getVoices();
      // 短暂延迟确保语音列表已加载
      setTimeout(resolve, 100);
    });
  }
}

// 单例实例
let voiceManagerInstance: VoiceManager | null = null;

export function getVoiceManager(): VoiceManager {
  if (!voiceManagerInstance) {
    voiceManagerInstance = new VoiceManager();
  }
  return voiceManagerInstance;
}

export function resetVoiceManager() {
  voiceManagerInstance = null;
}
