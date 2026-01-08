/**
 * 游戏特定的 i18n 语言数据
 *
 * 这个文件包含所有游戏相关的翻译数据
 * 包括对话文本、角色名字、UI 文本等
 */

import type { LocaleData } from '../../engine/i18n/types';

// 导入所有语言包
import zhCN from './locales/zh-CN';
import enUS from './locales/en-US';
import jaJP from './locales/ja-JP';

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

// 导出各个语言包，供直接使用
export { zhCN, enUS, jaJP };
export type { LocaleData } from '../../engine/i18n/types';
