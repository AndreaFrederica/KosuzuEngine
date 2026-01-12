/**
 * 设置管理 Store
 * 集中管理所有游戏设置（文本、音频、语音、显示等）
 */

import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import type { SupportedLocale } from '../engine/i18n/types';

// ==================== 设置类型定义 ====================

/** 文本设置 */
export interface TextSettings {
  /** 启用打字机效果 */
  typewriterEnabled: boolean;
  /** 文字速度 (1-100) */
  textSpeed: number;
  /** 自动播放速度 (1-100) */
  autoSpeed: number;
}

/** 音频设置 */
export interface AudioSettings {
  /** 主音量 (0-100) */
  masterVolume: number;
  /** BGM 音量 (0-100) */
  bgmVolume: number;
  /** 音效音量 (0-100) */
  sfxVolume: number;
  /** 语音音量 (0-100) */
  voiceVolume: number;
}

/** 语音设置 */
export interface VoiceSettings {
  /** 启用语音 */
  enabled: boolean;
  /** TTS 引擎 */
  engine: 'browser' | 'openai' | 'azure' | 'google';
  /** 浏览器语音 ID */
  browserVoiceId: string;
}

/** 恢复模式 */
export type RecoveryMode = 'full' | 'fast' | 'direct';

/** 显示设置 */
export interface DisplaySettings {
  /** 对话框差异模式 */
  dialogDiffEnabled: boolean;
  /** 读档后自动继续 */
  autoContinueAfterLoad: boolean;
  /** 隐藏继续按钮 */
  hideContinueButton: boolean;
  /** 继续按键绑定 */
  continueKeyBinding: string;
  /** 显示打字机调试面板 */
  showTypewriterDebug: boolean;
  /** 跳过重放（读档时直接恢复状态） */
  skipReplay: boolean;
  /** 自动模式（打字完成后自动继续） */
  autoMode: boolean;
  /** 自动播放等待延迟（毫秒） */
  autoWaitDelay: number;
  /** 闲置时自动卸载 Live2D 引擎以节能 */
  autoUnloadLive2D: boolean;
  /** 恢复模式：full=完整重放, fast=快速跳转（跳过目标帧前的所有命令）, direct=直接恢复 */
  recoveryMode: RecoveryMode;
}

/** 其他设置 */
export interface OtherSettings {
  /** 跳过已读文本 */
  skipRead: boolean;
}

/** 语言设置 */
export interface LocaleSettings {
  /** 当前语言（从 game/i18n 声明式定义） */
  currentLocale: SupportedLocale;
}

/** 所有设置 */
export interface AllSettings {
  text: TextSettings;
  audio: AudioSettings;
  voice: VoiceSettings;
  display: DisplaySettings;
  other: OtherSettings;
  locale: LocaleSettings;
}

// ==================== 默认值 ====================

const DEFAULT_TEXT_SETTINGS: TextSettings = {
  typewriterEnabled: true,
  textSpeed: 50,
  autoSpeed: 50,
};

const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  masterVolume: 80,
  bgmVolume: 80,
  sfxVolume: 80,
  voiceVolume: 100,
};

const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  enabled: false,
  engine: 'browser',
  browserVoiceId: '',
};

const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  dialogDiffEnabled: true,
  autoContinueAfterLoad: false,
  hideContinueButton: false,
  continueKeyBinding: 'Enter',
  showTypewriterDebug: false,
  skipReplay: false,
  autoMode: false,
  autoWaitDelay: 1000,
  autoUnloadLive2D: true,
  recoveryMode: 'fast',
};

const DEFAULT_OTHER_SETTINGS: OtherSettings = {
  skipRead: false,
};

const DEFAULT_LOCALE_SETTINGS: LocaleSettings = {
  currentLocale: 'zh-CN',
};

// ==================== Storage Keys ====================

const STORAGE_KEYS = {
  TEXT: {
    TYPEWRITER_ENABLED: 'engine:typewriterEnabled',
    TEXT_SPEED: 'engine:textSpeed',
    AUTO_SPEED: 'engine:autoSpeed',
  },
  AUDIO: {
    MASTER: 'audio:masterVolume',
    BGM: 'audio:bgmVolume',
    SFX: 'audio:sfxVolume',
    VOICE: 'audio:voiceVolume',
  },
  VOICE: {
    ENABLED: 'voice:enabled',
    ENGINE: 'voice:engine',
    BROWSER_VOICE: 'voice:browserVoiceId',
  },
  DISPLAY: {
    DIALOG_DIFF: 'engine:dialogDiffEnabled',
    AUTO_CONTINUE: 'engine:autoContinueAfterLoad',
    HIDE_CONTINUE: 'engine:hideContinueButton',
    CONTINUE_KEY: 'engine:continueKeyBinding',
    TYPEWRITER_DEBUG: 'engine:showTypewriterDebug',
    SKIP_REPLAY: 'engine:skipReplay',
    AUTO_MODE: 'engine:autoMode',
    AUTO_WAIT_DELAY: 'engine:autoWaitDelay',
    AUTO_UNLOAD_LIVE2D: 'engine:autoUnloadLive2D',
    RECOVERY_MODE: 'engine:recoveryMode',
  },
  OTHER: {
    SKIP_READ: 'game:skipRead',
  },
  LOCALE: {
    CURRENT_LOCALE: 'i18n:locale',
  },
  LEGACY: 'game_settings',
} as const;

// ==================== Store ====================

export const useSettingsStore = defineStore('settings', () => {
  // ============ 状态 ============

  // 文本设置
  const textSettings = ref<TextSettings>({ ...DEFAULT_TEXT_SETTINGS });

  // 音频设置
  const audioSettings = ref<AudioSettings>({ ...DEFAULT_AUDIO_SETTINGS });

  // 语音设置
  const voiceSettings = ref<VoiceSettings>({ ...DEFAULT_VOICE_SETTINGS });

  // 显示设置
  const displaySettings = ref<DisplaySettings>({ ...DEFAULT_DISPLAY_SETTINGS });

  // 其他设置
  const otherSettings = ref<OtherSettings>({ ...DEFAULT_OTHER_SETTINGS });

  // 语言设置
  const localeSettings = ref<LocaleSettings>({ ...DEFAULT_LOCALE_SETTINGS });

  // ============ 加载设置 ============

  function loadSettings(): void {
    loadTextSettings();
    loadAudioSettings();
    loadVoiceSettings();
    loadDisplaySettings();
    loadOtherSettings();
    loadLocaleSettings();
  }

  function loadTextSettings(): void {
    textSettings.value.typewriterEnabled = localStorage.getItem(STORAGE_KEYS.TEXT.TYPEWRITER_ENABLED) !== 'false';
    textSettings.value.textSpeed = parseInt(localStorage.getItem(STORAGE_KEYS.TEXT.TEXT_SPEED) || '50', 10);
    textSettings.value.autoSpeed = parseInt(localStorage.getItem(STORAGE_KEYS.TEXT.AUTO_SPEED) || '50', 10);

    // 尝试从旧格式加载
    loadFromLegacy('typewriterEnabled', (v) => textSettings.value.typewriterEnabled = Boolean(v));
    loadFromLegacy('textSpeed', (v) => textSettings.value.textSpeed = Number(v));
    loadFromLegacy('autoSpeed', (v) => textSettings.value.autoSpeed = Number(v));
  }

  function loadAudioSettings(): void {
    audioSettings.value.masterVolume = parseInt(localStorage.getItem(STORAGE_KEYS.AUDIO.MASTER) || '80', 10);
    audioSettings.value.bgmVolume = parseInt(localStorage.getItem(STORAGE_KEYS.AUDIO.BGM) || '80', 10);
    audioSettings.value.sfxVolume = parseInt(localStorage.getItem(STORAGE_KEYS.AUDIO.SFX) || '80', 10);
    audioSettings.value.voiceVolume = parseInt(localStorage.getItem(STORAGE_KEYS.AUDIO.VOICE) || '100', 10);

    // 尝试从旧格式加载
    loadFromLegacy('masterVolume', (v) => audioSettings.value.masterVolume = Number(v));
    loadFromLegacy('bgmVolume', (v) => audioSettings.value.bgmVolume = Number(v));
    loadFromLegacy('sfxVolume', (v) => audioSettings.value.sfxVolume = Number(v));
    loadFromLegacy('voiceVolume', (v) => audioSettings.value.voiceVolume = Number(v));
  }

  function loadVoiceSettings(): void {
    voiceSettings.value.enabled = localStorage.getItem(STORAGE_KEYS.VOICE.ENABLED) === 'true';
    voiceSettings.value.engine = (localStorage.getItem(STORAGE_KEYS.VOICE.ENGINE) as VoiceSettings['engine']) || 'browser';
    voiceSettings.value.browserVoiceId = localStorage.getItem(STORAGE_KEYS.VOICE.BROWSER_VOICE) || '';

    // 尝试从旧格式加载
    loadFromLegacy('voiceEnabled', (v) => voiceSettings.value.enabled = Boolean(v));
  }

  function loadDisplaySettings(): void {
    displaySettings.value.dialogDiffEnabled = localStorage.getItem(STORAGE_KEYS.DISPLAY.DIALOG_DIFF) !== 'false';
    displaySettings.value.autoContinueAfterLoad = localStorage.getItem(STORAGE_KEYS.DISPLAY.AUTO_CONTINUE) === 'true';
    displaySettings.value.hideContinueButton = localStorage.getItem(STORAGE_KEYS.DISPLAY.HIDE_CONTINUE) === 'true';
    displaySettings.value.continueKeyBinding = localStorage.getItem(STORAGE_KEYS.DISPLAY.CONTINUE_KEY) || 'Enter';
    displaySettings.value.showTypewriterDebug = localStorage.getItem(STORAGE_KEYS.DISPLAY.TYPEWRITER_DEBUG) === 'true';
    displaySettings.value.skipReplay = localStorage.getItem(STORAGE_KEYS.DISPLAY.SKIP_REPLAY) === 'true';
    displaySettings.value.autoMode = localStorage.getItem(STORAGE_KEYS.DISPLAY.AUTO_MODE) === 'true';
    displaySettings.value.autoWaitDelay = Number.parseInt(localStorage.getItem(STORAGE_KEYS.DISPLAY.AUTO_WAIT_DELAY) || '1000', 10);
    displaySettings.value.autoUnloadLive2D = localStorage.getItem(STORAGE_KEYS.DISPLAY.AUTO_UNLOAD_LIVE2D) !== 'false';
    const recoveryModeStr = localStorage.getItem(STORAGE_KEYS.DISPLAY.RECOVERY_MODE);
    displaySettings.value.recoveryMode = (recoveryModeStr === 'full' || recoveryModeStr === 'fast' || recoveryModeStr === 'direct') ? recoveryModeStr : 'fast';

    // 尝试从旧格式加载
    loadFromLegacy('dialogDiffEnabled', (v) => displaySettings.value.dialogDiffEnabled = Boolean(v));
    loadFromLegacy('autoContinueAfterLoad', (v) => displaySettings.value.autoContinueAfterLoad = Boolean(v));
    loadFromLegacy('hideContinueButton', (v) => displaySettings.value.hideContinueButton = Boolean(v));
    loadFromLegacy('continueKeyBinding', (v) => displaySettings.value.continueKeyBinding = String(v));
  }

  function loadOtherSettings(): void {
    otherSettings.value.skipRead = localStorage.getItem(STORAGE_KEYS.OTHER.SKIP_READ) === 'true';

    // 尝试从旧格式加载
    loadFromLegacy('skipRead', (v) => otherSettings.value.skipRead = Boolean(v));
  }

  function loadLocaleSettings(): void {
    const saved = localStorage.getItem(STORAGE_KEYS.LOCALE.CURRENT_LOCALE) as SupportedLocale | null;
    // 尝试从旧的 kosuzu:locale 键迁移
    if (!saved) {
      const legacySaved = localStorage.getItem('kosuzu:locale') as SupportedLocale | null;
      if (legacySaved) {
        localeSettings.value.currentLocale = legacySaved;
      }
    } else {
      localeSettings.value.currentLocale = saved;
    }
    // 有效性检查由 I18nManager 在初始化时根据已注册的语言包进行
  }

  function loadFromLegacy(key: string, callback: (value: unknown) => void): void {
    const legacy = localStorage.getItem(STORAGE_KEYS.LEGACY);
    if (!legacy) return;

    try {
      const parsed = JSON.parse(legacy);
      if (key in parsed) {
        callback(parsed[key]);
      }
    } catch (e) {
      console.warn('[SettingsStore] 加载旧格式设置失败:', e);
    }
  }

  // ============ 保存设置 ============

  function saveSettings(): void {
    saveTextSettings();
    saveAudioSettings();
    saveVoiceSettings();
    saveDisplaySettings();
    saveOtherSettings();
    saveLocaleSettings();
  }

  function saveTextSettings(): void {
    localStorage.setItem(STORAGE_KEYS.TEXT.TYPEWRITER_ENABLED, String(textSettings.value.typewriterEnabled));
    localStorage.setItem(STORAGE_KEYS.TEXT.TEXT_SPEED, String(textSettings.value.textSpeed));
    localStorage.setItem(STORAGE_KEYS.TEXT.AUTO_SPEED, String(textSettings.value.autoSpeed));
  }

  function saveAudioSettings(): void {
    localStorage.setItem(STORAGE_KEYS.AUDIO.MASTER, String(audioSettings.value.masterVolume));
    localStorage.setItem(STORAGE_KEYS.AUDIO.BGM, String(audioSettings.value.bgmVolume));
    localStorage.setItem(STORAGE_KEYS.AUDIO.SFX, String(audioSettings.value.sfxVolume));
    localStorage.setItem(STORAGE_KEYS.AUDIO.VOICE, String(audioSettings.value.voiceVolume));
  }

  function saveVoiceSettings(): void {
    localStorage.setItem(STORAGE_KEYS.VOICE.ENABLED, String(voiceSettings.value.enabled));
    localStorage.setItem(STORAGE_KEYS.VOICE.ENGINE, voiceSettings.value.engine);
    localStorage.setItem(STORAGE_KEYS.VOICE.BROWSER_VOICE, voiceSettings.value.browserVoiceId);
  }

  function saveDisplaySettings(): void {
    localStorage.setItem(STORAGE_KEYS.DISPLAY.DIALOG_DIFF, String(displaySettings.value.dialogDiffEnabled));
    localStorage.setItem(STORAGE_KEYS.DISPLAY.AUTO_CONTINUE, String(displaySettings.value.autoContinueAfterLoad));
    localStorage.setItem(STORAGE_KEYS.DISPLAY.HIDE_CONTINUE, String(displaySettings.value.hideContinueButton));
    localStorage.setItem(STORAGE_KEYS.DISPLAY.CONTINUE_KEY, displaySettings.value.continueKeyBinding);
    localStorage.setItem(STORAGE_KEYS.DISPLAY.TYPEWRITER_DEBUG, String(displaySettings.value.showTypewriterDebug));
    localStorage.setItem(STORAGE_KEYS.DISPLAY.SKIP_REPLAY, String(displaySettings.value.skipReplay));
    localStorage.setItem(STORAGE_KEYS.DISPLAY.AUTO_MODE, String(displaySettings.value.autoMode));
    localStorage.setItem(STORAGE_KEYS.DISPLAY.AUTO_WAIT_DELAY, String(displaySettings.value.autoWaitDelay));
    localStorage.setItem(STORAGE_KEYS.DISPLAY.AUTO_UNLOAD_LIVE2D, String(displaySettings.value.autoUnloadLive2D));
    localStorage.setItem(STORAGE_KEYS.DISPLAY.RECOVERY_MODE, displaySettings.value.recoveryMode);
  }

  function saveOtherSettings(): void {
    localStorage.setItem(STORAGE_KEYS.OTHER.SKIP_READ, String(otherSettings.value.skipRead));
  }

  function saveLocaleSettings(): void {
    localStorage.setItem(STORAGE_KEYS.LOCALE.CURRENT_LOCALE, localeSettings.value.currentLocale);
  }

  // ============ 重置设置 ============

  function resetToDefaults(): void {
    textSettings.value = { ...DEFAULT_TEXT_SETTINGS };
    audioSettings.value = { ...DEFAULT_AUDIO_SETTINGS };
    voiceSettings.value = { ...DEFAULT_VOICE_SETTINGS };
    displaySettings.value = { ...DEFAULT_DISPLAY_SETTINGS };
    otherSettings.value = { ...DEFAULT_OTHER_SETTINGS };
    localeSettings.value = { ...DEFAULT_LOCALE_SETTINGS };

    saveSettings();
  }

  // ============ 计算属性 ============

  /** 获取所有设置 */
  function getAllSettings(): AllSettings {
    return {
      text: { ...textSettings.value },
      audio: { ...audioSettings.value },
      voice: { ...voiceSettings.value },
      display: { ...displaySettings.value },
      other: { ...otherSettings.value },
      locale: { ...localeSettings.value },
    };
  }

  // ============ 初始化 ============

  // 监听变化自动保存
  watch(
    textSettings,
    saveTextSettings,
    { deep: true }
  );

  watch(
    audioSettings,
    saveAudioSettings,
    { deep: true }
  );

  watch(
    voiceSettings,
    saveVoiceSettings,
    { deep: true }
  );

  watch(
    displaySettings,
    saveDisplaySettings,
    { deep: true }
  );

  watch(
    otherSettings,
    saveOtherSettings,
    { deep: true }
  );

  watch(
    localeSettings,
    saveLocaleSettings,
    { deep: true }
  );

  // 初始化时加载设置
  loadSettings();

  // ============ 返回 ============

  return {
    // 状态
    textSettings,
    audioSettings,
    voiceSettings,
    displaySettings,
    otherSettings,
    localeSettings,

    // 加载/保存/重置
    loadSettings,
    saveSettings,
    resetToDefaults,
    getAllSettings,

    // 文本设置快捷方法
    setTypewriterEnabled(value: boolean) {
      textSettings.value.typewriterEnabled = value;
      dispatchSettingChanged(STORAGE_KEYS.TEXT.TYPEWRITER_ENABLED, String(value));
    },
    setTextSpeed(value: number) {
      textSettings.value.textSpeed = value;
      dispatchSettingChanged(STORAGE_KEYS.TEXT.TEXT_SPEED, String(value));
    },
    setAutoSpeed(value: number) {
      textSettings.value.autoSpeed = value;
      dispatchSettingChanged(STORAGE_KEYS.TEXT.AUTO_SPEED, String(value));
    },

    // 音频设置快捷方法
    setMasterVolume(value: number) {
      audioSettings.value.masterVolume = value;
    },
    setBgmVolume(value: number) {
      audioSettings.value.bgmVolume = value;
    },
    setSfxVolume(value: number) {
      audioSettings.value.sfxVolume = value;
    },
    setVoiceVolume(value: number) {
      audioSettings.value.voiceVolume = value;
    },

    // 语音设置快捷方法
    setVoiceEnabled(value: boolean) {
      voiceSettings.value.enabled = value;
    },
    setVoiceEngine(value: VoiceSettings['engine']) {
      voiceSettings.value.engine = value;
    },
    setBrowserVoiceId(value: string) {
      voiceSettings.value.browserVoiceId = value;
    },

    // 显示设置快捷方法
    setDialogDiffEnabled(value: boolean) {
      displaySettings.value.dialogDiffEnabled = value;
      dispatchSettingChanged(STORAGE_KEYS.DISPLAY.DIALOG_DIFF, String(value));
    },
    setAutoContinueAfterLoad(value: boolean) {
      displaySettings.value.autoContinueAfterLoad = value;
    },
    setHideContinueButton(value: boolean) {
      displaySettings.value.hideContinueButton = value;
      dispatchSettingChanged(STORAGE_KEYS.DISPLAY.HIDE_CONTINUE, String(value));
    },
    setContinueKeyBinding(value: string) {
      displaySettings.value.continueKeyBinding = value;
      dispatchSettingChanged(STORAGE_KEYS.DISPLAY.CONTINUE_KEY, value);
    },
    setShowTypewriterDebug(value: boolean) {
      displaySettings.value.showTypewriterDebug = value;
      dispatchSettingChanged(STORAGE_KEYS.DISPLAY.TYPEWRITER_DEBUG, String(value));
    },
    setSkipReplay(value: boolean) {
      displaySettings.value.skipReplay = value;
    },
    setAutoMode(value: boolean) {
      displaySettings.value.autoMode = value;
    },
    setAutoWaitDelay(value: number) {
      displaySettings.value.autoWaitDelay = value;
    },
    setAutoUnloadLive2D(value: boolean) {
      displaySettings.value.autoUnloadLive2D = value;
    },
    setRecoveryMode(value: RecoveryMode) {
      displaySettings.value.recoveryMode = value;
    },

    // 其他设置快捷方法
    setSkipRead(value: boolean) {
      otherSettings.value.skipRead = value;
    },

    // 语言设置快捷方法
    setCurrentLocale(value: SupportedLocale) {
      localeSettings.value.currentLocale = value;
      dispatchSettingChanged(STORAGE_KEYS.LOCALE.CURRENT_LOCALE, value);
    },
  };
});

// ==================== 工具函数 ====================

/**
 * 派发设置变化事件
 */
function dispatchSettingChanged(key: string, value: string): void {
  globalThis.dispatchEvent(
    new CustomEvent('engine-setting-changed', {
      detail: { key, value },
    }),
  );
}
