/**
 * i18n 国际化系统统一入口
 *
 * 导出所有 i18n 相关的类型、管理器和语音管理器
 *
 * 注意：游戏特定的翻译数据（对话文本、角色名字等）应该在 game/i18n 目录中管理
 */

export * from './types';
export * from './I18nManager';
export * from './VoiceManager';

// 从 game/i18n 导出支持的语言列表（声明式定义）
export { SUPPORTED_LOCALES } from '../../game/i18n';

// 导入游戏特定的语言包（从 game 目录）
import { getGameLocales, SUPPORTED_LOCALES } from '../../game/i18n';

import { getI18nManager } from './I18nManager';
import type { SupportedLocale } from './types';
import type { EngineState } from '../core/EngineContext';
import type { useEngineStore } from 'stores/engine-store';

type EngineStore = ReturnType<typeof useEngineStore>;

let engineStoreRef: EngineStore | null = null;

/**
 * 注册 engine store 引用，用于语言切换时重新翻译
 */
export function registerEngineStore(store: EngineStore) {
  engineStoreRef = store;
}

/**
 * 初始化 i18n 系统
 *
 * 在应用启动时调用此函数来注册所有语言包
 * 语言包从 game/i18n 目录加载
 */
export async function initI18n() {
  const i18n = getI18nManager();

  // 从 game/i18n 获取声明式定义的支持语言列表
  i18n.setSupportedLocales(SUPPORTED_LOCALES);

  // 从 game/i18n 获取所有语言包
  const gameLocales = getGameLocales();

  // 注册所有语言包
  for (const [locale, data] of Object.entries(gameLocales)) {
    i18n.registerTextTranslations(locale as SupportedLocale, data);
  }

  // 初始化与 settings-store 的同步
  try {
    await i18n.initSettingsSync();
  } catch (e) {
    console.warn('[i18n] 初始化 settings-store 同步失败:', e);
  }

  // 将 i18n 管理器保存到全局变量，供 BaseActor.say() 同步访问
  (window as unknown as { __i18n_manager__: typeof i18n }).__i18n_manager__ = i18n;

  // 监听语言变化，更新全局变量并重新翻译
  i18n.onLocaleChange(() => {
    (window as unknown as { __i18n_manager__: typeof i18n }).__i18n_manager__ = i18n;
    // 重新翻译当前对话和历史
    retranslateState();
  });

  console.log('[i18n] 国际化系统已初始化');
  console.log('[i18n] 当前语言:', i18n.getLocale());
}

/**
 * 重新翻译引擎状态中的所有文本
 */
function retranslateState() {
  if (!engineStoreRef) return;

  const state = engineStoreRef.state as EngineState;
  const i18n = getI18nManager();

  // 重新翻译当前对话
  if (state.dialog?.originalText) {
    const translation = i18n.getTranslation(state.dialog.originalText);
    state.dialog.text = translation.text;
  }
  // 重新翻译当前对话的角色名字
  if (state.dialog?.originalSpeaker) {
    const nameKey = `@char:${state.dialog.originalSpeaker}`;
    const nameTranslation = i18n.getTranslation(nameKey);
    if (nameTranslation.text !== nameKey) {
      state.dialog.speaker = nameTranslation.text;
    }
  }

  // 重新翻译历史记录
  if (state.history && Array.isArray(state.history)) {
    for (const entry of state.history) {
      if (entry.originalText) {
        const translation = i18n.getTranslation(entry.originalText);
        entry.text = translation.text;
      }
      // 重新翻译历史记录的角色名字
      if (entry.originalSpeaker) {
        const nameKey = `@char:${entry.originalSpeaker}`;
        const nameTranslation = i18n.getTranslation(nameKey);
        if (nameTranslation.text !== nameKey) {
          entry.speaker = nameTranslation.text;
        }
      }
    }
  }
}

/**
 * 获取所有支持的语言列表（用于 UI 显示）
 *
 * 注意：声明的语言列表应该与 game/i18n 中的 SUPPORTED_LOCALES 保持同步
 */
export function getSupportedLocales(): Array<{ code: SupportedLocale; name: string; nativeName: string }> {
  return SUPPORTED_LOCALES.map((locale) => {
    switch (locale) {
      case 'zh-CN':
        return { code: locale, name: 'Chinese (Simplified)', nativeName: '简体中文' };
      case 'en-US':
        return { code: locale, name: 'English (US)', nativeName: 'English' };
      case 'ja-JP':
        return { code: locale, name: 'Japanese', nativeName: '日本語' };
      default:
        // TypeScript 会确保永远不会到达这里
        return { code: locale, name: '', nativeName: '' };
    }
  });
}

/**
 * 便捷函数：翻译文本
 */
export function t(keyOrText: string, params?: Record<string, unknown>): string {
  return getI18nManager().t(keyOrText, params);
}

/**
 * 便捷函数：获取完整翻译信息
 */
export function translate(keyOrText: string, params?: Record<string, unknown>) {
  return getI18nManager().getTranslation(keyOrText, params);
}
