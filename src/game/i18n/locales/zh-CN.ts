/**
 * 简体中文语言包
 *
 * 使用原文作为键，这样可以方便地查找和添加翻译
 */

import type { LocaleData } from '../../../engine/i18n/types';

const zhCN: LocaleData = {
  // ==================== 角色名字 ====================
  '@char:josei_06_sailor': {
    text: '女学生06',
  },
  '@char:josei_07_sailor': {
    text: '女学生07',
  },
  '@char:josei_04_akamafu': {
    text: '赤发女孩',
  },
  '@char:josei_05_wa': {
    text: '和服女孩',
  },
  '@char:animal_01_neko': {
    text: '小猫咪',
  },

  // ==================== UI 文本 ====================
  '@ui:save': {
    text: '存档',
  },
  '@ui:load': {
    text: '读档',
  },
  '@ui:close': {
    text: '关闭',
  },
  '@ui:save_btn': {
    text: '保存',
  },
  '@ui:load_btn': {
    text: '读取',
  },
  '@ui:refresh': {
    text: '刷新',
  },
  '@ui:slot_placeholder': {
    text: '请输入存档名',
  },
  '@ui:overwrite': {
    text: '覆盖',
  },
  '@ui:delete': {
    text: '删除',
  },
  '@ui:no_saves': {
    text: '暂无存档',
  },
  '@ui:unnamed_scenario': {
    text: '无名剧本',
  },
  '@ui:settings': {
    text: '设置',
  },
  '@ui:language': {
    text: '语言',
  },
  '@ui:voice_settings': {
    text: '语音设置',
  },
  '@ui:voice_enabled': {
    text: '启用语音',
  },
  '@ui:tts_engine': {
    text: 'TTS 引擎',
  },
  '@ui:tts_engine_browser': {
    text: '浏览器内置',
  },
  '@ui:tts_engine_openai': {
    text: 'OpenAI',
  },
  '@ui:tts_engine_azure': {
    text: 'Azure',
  },
  '@ui:tts_engine_google': {
    text: 'Google',
  },
  '@ui:browser_voice': {
    text: '浏览器语音',
  },

  // ==================== 场景1 - 对话文本 ====================
  '今天天气真好。': {
    text: '今天天气真好。',
    voice: 'josei_06_sailor/line1_zh.wav',
  },
  '嗯，放学一起去买甜点吧？': {
    text: '嗯，放学一起去买甜点吧？',
    voice: 'josei_07_sailor/line2_zh.wav',
  },
  '我想试试那家新开的店。': {
    text: '我想试试那家新开的店。',
    voice: 'josei_06_sailor/line3_zh.wav',
  },
  '听说草莓蛋糕很受欢迎。': {
    text: '听说草莓蛋糕很受欢迎。',
    voice: 'josei_07_sailor/line4_zh.wav',
  },
  '风有点大，别让帽子飞了。': {
    text: '风有点大，别让帽子飞了。',
    voice: 'josei_06_sailor/line5_zh.wav',
  },
  '好险，差点就掉了。': {
    text: '好险，差点就掉了。',
    voice: 'josei_07_sailor/line6_zh.wav',
  },
  '呀，小猫咪也出来散步。': {
    text: '呀，小猫咪也出来散步。',
    voice: 'josei_06_sailor/line7_zh.wav',
  },
  '好可爱，想摸摸它。': {
    text: '好可爱，想摸摸它。',
    voice: 'josei_07_sailor/line8_zh.wav',
  },
  '我们要不要邀请她一起？': {
    text: '我们要不要邀请她一起？',
    voice: 'josei_06_sailor/line9_zh.wav',
  },
  '好，正好人多可以点更多。': {
    text: '好，正好人多可以点更多。',
    voice: 'josei_07_sailor/line10_zh.wav',
  },
  '咦，你们在聊什么？': {
    text: '咦，你们在聊什么？',
    voice: 'josei_04_akamafu/line1_zh.wav',
  },
  '一起去甜点店，刚好路过。': {
    text: '一起去甜点店，刚好路过。',
    voice: 'josei_06_sailor/line10_zh.wav',
  },
  '要不要一起来？': {
    text: '要不要一起来？',
    voice: 'josei_07_sailor/line11_zh.wav',
  },
  '当然好呀，我也想试试新品。': {
    text: '当然好呀，我也想试试新品。',
    voice: 'josei_04_akamafu/line2_zh.wav',
  },
  '太好了，那就出发吧。': {
    text: '太好了，那就出发吧。',
    voice: 'josei_06_sailor/line11_zh.wav',
  },
  '快到了，我想先点冰饮。': {
    text: '快到了，我想先点冰饮。',
    voice: 'josei_06_sailor/line12_zh.wav',
  },
  '我要抹茶拿铁。': {
    text: '我要抹茶拿铁。',
    voice: 'josei_07_sailor/line12_zh.wav',
  },
  '我选焦糖布丁。': {
    text: '我选焦糖布丁。',
    voice: 'josei_04_akamafu/line3_zh.wav',
  },
  '今天真是个适合约会的日子。': {
    text: '今天真是个适合约会的日子。',
    voice: 'josei_06_sailor/line13_zh.wav',
  },
  '哈哈，说得也是。': {
    text: '哈哈，说得也是。',
    voice: 'josei_07_sailor/line13_zh.wav',
  },
  '下次换你们请客哦。': {
    text: '下次换你们请客哦。',
    voice: 'josei_04_akamafu/line4_zh.wav',
  },
  '成交。': {
    text: '成交。',
    voice: 'josei_06_sailor/line14_zh.wav',
  },
  '那就这么说定了。': {
    text: '那就这么说定了。',
    voice: 'josei_07_sailor/line14_zh.wav',
  },
  '走吧。': {
    text: '走吧。',
    voice: 'josei_04_akamafu/line5_zh.wav',
  },

  // 参数化文本示例
  '你好，{name}！': {
    text: '你好，{name}！',
    tts: { provider: 'browser', voiceId: 'Google 普通话', rate: 1.0 },
  },

  // 系统文本
  '特效测试场景：角色与背景过渡。': {
    text: '特效测试场景：角色与背景过渡。',
  },
  '角色淡入（手动插值）。': {
    text: '角色淡入（手动插值）。',
  },
  '角色抖动。': {
    text: '角色抖动。',
  },
  '角色跳一下。': {
    text: '角色跳一下。',
  },
  '角色翻转、旋转、缩放。': {
    text: '角色翻转、旋转、缩放。',
  },
  '聚焦/虚化/变暗。': {
    text: '聚焦/虚化/变暗。',
  },
  '背景过渡：fade / wipeLeft / wipeRight / zoom / blurFade。': {
    text: '背景过渡：fade / wipeLeft / wipeRight / zoom / blurFade。',
  },
  '角色同时演示：叠加 filter + opacity。': {
    text: '角色同时演示：叠加 filter + opacity。',
  },
  '测试结束：返回 scene1 或结束。': {
    text: '测试结束：返回 scene1 或结束。',
  },

  // 场景2
  '欢迎来到 scene2。现在时间仍然是：{time}。': {
    text: '欢迎来到 scene2。现在时间仍然是：{time}。',
  },
  '演示结束。': {
    text: '演示结束。',
  },
};

export default zhCN;
