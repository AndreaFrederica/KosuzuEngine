/**
 * 游戏特定的 i18n 语言数据
 *
 * 这个文件包含所有游戏相关的翻译数据
 * 包括对话文本、角色名字、UI 文本等
 */

import type { LocaleData, SupportedLocale } from '../../engine/i18n/types';

// 导入所有语言包
import zhCN from './locales/zh-CN';
import enUS from './locales/en-US';
import jaJP from './locales/ja-JP';

/**
 * 声明式定义支持的语言列表
 *
 * 添加新语言时，需要：
 * 1. 在这里添加语言代码
 * 2. 创建对应的 locales/{locale}.ts 文件
 * 3. 在上面的 import 语句中导入语言包
 */
export const SUPPORTED_LOCALES: SupportedLocale[] = ['zh-CN', 'en-US', 'ja-JP'];

/**
 * 获取所有游戏语言包
 */
export function getGameLocales(): Record<string, LocaleData> {
  return {
    'zh-CN': zhCN,
    'en-US': enUS,
    'ja-JP': jaJP,
  };
}

/**
 * 获取支持的语言列表
 */
export function getSupportedLocales(): SupportedLocale[] {
  return [...SUPPORTED_LOCALES];
}

// 导出各个语言包，供直接使用
export { zhCN, enUS, jaJP };
export type { LocaleData, SupportedLocale } from '../../engine/i18n/types';
