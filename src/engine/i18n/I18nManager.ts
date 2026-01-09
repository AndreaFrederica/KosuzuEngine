/**
 * 国际化管理器
 *
 * 支持使用文本作为键的翻译系统
 */

import type {
  SupportedLocale,
  TranslationValue,
  LocaleData,
  NamedKeysData,
  TranslationResult,
} from './types';

export class I18nManager {
  private currentLocale: SupportedLocale;
  private textTranslations: Map<SupportedLocale, LocaleData> = new Map();
  private namedKeys: Map<SupportedLocale, NamedKeysData> = new Map();
  private fallbackLocale: SupportedLocale = 'zh-CN';
  private listeners: Array<(locale: SupportedLocale) => void> = [];
  private settingsStore: {
    localeSettings: { currentLocale: SupportedLocale };
    setCurrentLocale: (value: SupportedLocale) => void;
    $subscribe: (callback: (mutation: unknown, state: { localeSettings: { currentLocale: SupportedLocale } }) => void) => () => void;
  } | null = null;
  private supportedLocales: SupportedLocale[] = [];

  constructor() {
    // 从 settings-store 读取保存的语言设置（延迟加载）
    this.currentLocale = 'zh-CN';
  }

  /** 设置支持的语言列表（由 game/i18n 声明式定义） */
  setSupportedLocales(locales: SupportedLocale[]) {
    this.supportedLocales = locales;
  }

  /** 检查是否是有效的语言代码（基于声明式定义的语言列表） */
  private isValidLocale(value: string | null): value is SupportedLocale {
    if (!value) return false;
    // 检查该语言是否在声明式定义的支持列表中
    return this.supportedLocales.includes(value as SupportedLocale);
  }

  /** 注册文本翻译（使用文本作为键） */
  registerTextTranslations(locale: SupportedLocale, data: LocaleData) {
    const existing = this.textTranslations.get(locale) || {};
    this.textTranslations.set(locale, { ...existing, ...data });
  }

  /** 注册命名键翻译（可选） */
  registerNamedKeys(locale: SupportedLocale, data: NamedKeysData) {
    const existing = this.namedKeys.get(locale) || {};
    this.namedKeys.set(locale, { ...existing, ...data });
  }

  /** 设置当前语言 */
  setLocale(locale: SupportedLocale) {
    if (this.isValidLocale(locale) && locale !== this.currentLocale) {
      this.currentLocale = locale;
      // 保存到 settings-store
      void this.saveToSettingsStore();
      // 通知所有监听器
      this.listeners.forEach((fn) => fn(locale));
    }
  }

  /** 获取当前语言 */
  getLocale(): SupportedLocale {
    return this.currentLocale;
  }

  /** 公开的初始化方法（供外部调用） */
  initSettingsSync(): Promise<void> {
    return this.initSettingsSyncInternal();
  }

  /** 内部初始化方法 */
  private async initSettingsSyncInternal(): Promise<void> {
    if (this.settingsStore) {
      return; // 已经初始化过了
    }
    try {
      const { useSettingsStore } = await import('../../stores/settings-store');
      this.settingsStore = useSettingsStore();

      // 加载初始语言设置
      this.currentLocale = this.settingsStore.localeSettings.currentLocale;

      // 监听设置变化
      this.settingsStore.$subscribe((mutation, state) => {
        if (state.localeSettings.currentLocale !== this.currentLocale) {
          const newLocale = state.localeSettings.currentLocale;
          if (this.isValidLocale(newLocale) && newLocale !== this.currentLocale) {
            this.currentLocale = newLocale;
            // 通知所有监听器
            this.listeners.forEach((fn) => fn(newLocale));
          }
        }
      });
    } catch (e) {
      console.warn('[I18nManager] 初始化设置同步失败:', e);
    }
  }

  /** 添加语言变更监听器 */
  onLocaleChange(callback: (locale: SupportedLocale) => void): () => void {
    this.listeners.push(callback);
    // 返回取消监听的函数
    return () => {
      this.listeners = this.listeners.filter((fn) => fn !== callback);
    };
  }

  /** 翻译 - 自动判断是文本键还是命名键 */
  translate(keyOrText: string, params?: Record<string, unknown>): TranslationResult {
    // 首先尝试作为命名键查找
    const namedResult = this.lookupNamedKey(keyOrText, params);
    if (namedResult) {
      return namedResult;
    }

    // 然后尝试作为文本键查找
    const textResult = this.lookupText(keyOrText, params);
    if (textResult) {
      return textResult;
    }

    // 都找不到，返回原文
    return { text: keyOrText };
  }

  /** 简写 - 只返回文本 */
  t(keyOrText: string, params?: Record<string, unknown>): string {
    return this.translate(keyOrText, params).text;
  }

  /** 获取完整信息（包含语音和 TTS 配置） */
  getTranslation(keyOrText: string, params?: Record<string, unknown>): TranslationResult {
    return this.translate(keyOrText, params);
  }

  /** 查找命名键 */
  private lookupNamedKey(key: string, params?: Record<string, unknown>): TranslationResult | null {
    let data = this.namedKeys.get(this.currentLocale);
    let entry = data?.[key];

    // 回退到默认语言
    if (!entry && this.currentLocale !== this.fallbackLocale) {
      data = this.namedKeys.get(this.fallbackLocale);
      entry = data?.[key];
    }

    if (!entry) return null;

    // 处理不同类型的 entry
    if (typeof entry === 'string') {
      return { text: entry };
    }

    const result: TranslationResult = {
      text: this.interpolateText(entry.text, params),
    };
    if (entry.voice !== undefined) result.voice = entry.voice;
    if (entry.tts !== undefined) result.tts = entry.tts;
    return result;
  }

  /** 查找文本键 */
  private lookupText(text: string, params?: Record<string, unknown>): TranslationResult | null {
    let data = this.textTranslations.get(this.currentLocale);
    let entry = data?.[text];

    // 回退到默认语言
    if (!entry && this.currentLocale !== this.fallbackLocale) {
      data = this.textTranslations.get(this.fallbackLocale);
      entry = data?.[text];
    }

    if (!entry) return null;

    const result: TranslationResult = {
      text: this.interpolateText(entry.text, params),
    };
    if (entry.voice !== undefined) result.voice = entry.voice;
    if (entry.tts !== undefined) result.tts = entry.tts;
    return result;
  }

  /** 文本插值（处理 {param} 占位符） */
  private interpolateText(text: string, params?: Record<string, unknown>): string {
    if (!params) return text;
    return text.replace(/\{(\w+)\}/g, (_, key) => {
      const value = params[key];
      if (value === undefined) return `{${key}}`;
      if (typeof value === 'string') return value;
      if (typeof value === 'number') return String(value);
      return JSON.stringify(value);
    });
  }

  /** 批量添加翻译 */
  addTranslations(locale: SupportedLocale, translations: Record<string, string | TranslationValue>) {
    const data: LocaleData = {};
    for (const [key, value] of Object.entries(translations)) {
      if (typeof value === 'string') {
        data[key] = { text: value };
      } else {
        data[key] = value;
      }
    }
    this.registerTextTranslations(locale, data);
  }

  /** 获取所有已注册的文本翻译 */
  getTextTranslations(locale: SupportedLocale): LocaleData {
    return this.textTranslations.get(locale) || {};
  }

  /** 获取所有已注册的命名键 */
  getNamedKeys(locale: SupportedLocale): NamedKeysData {
    return this.namedKeys.get(locale) || {};
  }

  /** 保存语言设置到 settings-store */
  private async saveToSettingsStore(): Promise<void> {
    if (!this.settingsStore) {
      // 延迟初始化
      await this.initSettingsSyncInternal();
    }
    if (this.settingsStore) {
      this.settingsStore.setCurrentLocale(this.currentLocale);
    }
  }
}

// 单例实例
let i18nInstance: I18nManager | null = null;

export function getI18nManager(): I18nManager {
  if (!i18nInstance) {
    i18nInstance = new I18nManager();
  }
  return i18nInstance;
}

export function resetI18nManager() {
  i18nInstance = null;
}
