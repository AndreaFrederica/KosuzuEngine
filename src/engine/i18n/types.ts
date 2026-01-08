/**
 * i18n 国际化系统的类型定义
 */

/** 支持的语言 */
export type SupportedLocale = 'zh-CN' | 'en-US' | 'ja-JP';

/** TTS 配置 */
export interface TTSConfig {
  /** TTS 提供商 */
  provider?: 'browser' | 'openai' | 'azure' | 'google';
  /** 语音 ID */
  voiceId?: string;
  /** 语速 (0.1-2.0) */
  rate?: number;
  /** 音高 (0.1-2.0) */
  pitch?: number;
  /** 音量 (0-1) */
  volume?: number;
}

/** 翻译值 - 包含翻译文本和可选的语音配置 */
export interface TranslationValue {
  /** 翻译后的文本 */
  text: string;
  /** 关联的语音文件路径（可选） */
  voice?: string;
  /** TTS 配置（可选） */
  tts?: TTSConfig;
}

/** 翻译数据结构 - 使用文本作为键 */
export type LocaleData = Record<string, TranslationValue>;

/** 命名键的翻译数据（可选，用于需要特殊键的场景） */
export type NamedKeysData = Record<string, TranslationValue | string>;

/** 翻译结果 */
export interface TranslationResult {
  text: string;
  voice?: string;
  tts?: TTSConfig;
}

/** Say 选项 */
export interface SayOptions {
  duration?: number;
  html?: boolean;
  /** 翻译参数 */
  params?: Record<string, unknown>;
  /** 是否使用语音文件（默认根据 i18n 配置） */
  useVoice?: boolean;
  /** 强制指定语音文件路径 */
  voicePath?: string;
  /** TTS 配置覆盖 */
  tts?: TTSConfig;
}
