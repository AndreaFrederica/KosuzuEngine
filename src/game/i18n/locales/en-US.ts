/**
 * English Language Pack
 *
 * Uses original Chinese text as keys for easy lookup
 */

import type { LocaleData } from '../../../engine/i18n/types';

const enUS: LocaleData = {
  // ==================== Character Names ====================
  '@char:josei_06_sailor': {
    text: 'Student Girl 06',
  },
  '@char:josei_07_sailor': {
    text: 'Student Girl 07',
  },
  '@char:josei_04_akamafu': {
    text: 'Red-haired Girl',
  },
  '@char:josei_05_wa': {
    text: 'Kimono Girl',
  },
  '@char:animal_01_neko': {
    text: 'Kitty',
  },

  // ==================== UI Text ====================
  '@ui:save': {
    text: 'Save',
  },
  '@ui:load': {
    text: 'Load',
  },
  '@ui:close': {
    text: 'Close',
  },
  '@ui:save_btn': {
    text: 'Save',
  },
  '@ui:load_btn': {
    text: 'Load',
  },
  '@ui:refresh': {
    text: 'Refresh',
  },
  '@ui:slot_placeholder': {
    text: 'Enter save name',
  },
  '@ui:overwrite': {
    text: 'Overwrite',
  },
  '@ui:delete': {
    text: 'Delete',
  },
  '@ui:no_saves': {
    text: 'No saves',
  },
  '@ui:unnamed_scenario': {
    text: 'Unnamed Scenario',
  },
  '@ui:settings': {
    text: 'Settings',
  },
  '@ui:language': {
    text: 'Language',
  },
  '@ui:voice_settings': {
    text: 'Voice Settings',
  },
  '@ui:voice_enabled': {
    text: 'Enable Voice',
  },
  '@ui:tts_engine': {
    text: 'TTS Engine',
  },
  '@ui:tts_engine_browser': {
    text: 'Browser Built-in',
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
    text: 'Browser Voice',
  },
  '@ui:display_settings': {
    text: 'Display Settings',
  },
  '@ui:dialog_diff': {
    text: 'Prevent Text Refresh',
  },
  '@ui:dialog_diff_desc': {
    text: 'When enabled, identical text will not trigger re-rendering, improving visual experience',
  },
  '@ui:auto_continue_after_load': {
    text: 'Auto Continue After Load',
  },
  '@ui:auto_continue_after_load_desc': {
    text: 'When enabled, automatically execute continue once after loading save',
  },
  '@ui:hide_continue_button': {
    text: 'Hide Continue Button',
  },
  '@ui:hide_continue_button_desc': {
    text: 'Hide the continue button in dialog box, click blank area or use key to continue',
  },
  '@ui:continue_key_binding': {
    text: 'Continue Key',
  },
  '@ui:continue_key_binding_desc': {
    text: 'Press this key to continue game dialog',
  },
  '@ui:press_key_to_bind': {
    text: 'Press any key to bind...',
  },

  // ==================== Scene 1 - Dialog Text ====================
  '今天天气真好。': {
    text: 'The weather is really nice today.',
    voice: 'josei_06_sailor/line1_en.wav',
  },
  '嗯，放学一起去买甜点吧？': {
    text: 'Yeah, let\'s go get some desserts after school!',
    voice: 'josei_07_sailor/line2_en.wav',
  },
  '我想试试那家新开的店。': {
    text: 'I want to try that newly opened shop.',
    voice: 'josei_06_sailor/line3_en.wav',
  },
  '听说草莓蛋糕很受欢迎。': {
    text: 'I heard the strawberry cake is very popular.',
    voice: 'josei_07_sailor/line4_en.wav',
  },
  '风有点大，别让帽子飞了。': {
    text: 'The wind is strong, don\'t let your hat fly away.',
    voice: 'josei_06_sailor/line5_en.wav',
  },
  '好险，差点就掉了。': {
    text: 'That was close, almost dropped it.',
    voice: 'josei_07_sailor/line6_en.wav',
  },
  '呀，小猫咪也出来散步。': {
    text: 'Oh, a kitty is out for a walk too.',
    voice: 'josei_06_sailor/line7_en.wav',
  },
  '好可爱，想摸摸它。': {
    text: 'So cute, I want to pet it.',
    voice: 'josei_07_sailor/line8_en.wav',
  },
  '我们要不要邀请她一起？': {
    text: 'Should we invite her to join us?',
    voice: 'josei_06_sailor/line9_en.wav',
  },
  '好，正好人多可以点更多。': {
    text: 'Sure, more people means we can order more.',
    voice: 'josei_07_sailor/line10_en.wav',
  },
  '咦，你们在聊什么？': {
    text: 'Hey, what are you talking about?',
    voice: 'josei_04_akamafu/line1_en.wav',
  },
  '一起去甜点店，刚好路过。': {
    text: 'We\'re going to the dessert shop, passing by.',
    voice: 'josei_06_sailor/line10_en.wav',
  },
  '要不要一起来？': {
    text: 'Want to come along?',
    voice: 'josei_07_sailor/line11_en.wav',
  },
  '当然好呀，我也想试试新品。': {
    text: 'Of course! I\'d love to try the new items too.',
    voice: 'josei_04_akamafu/line2_en.wav',
  },
  '太好了，那就出发吧。': {
    text: 'Great, let\'s go then.',
    voice: 'josei_06_sailor/line11_en.wav',
  },
  '快到了，我想先点冰饮。': {
    text: 'We\'re almost here. I want to order a cold drink first.',
    voice: 'josei_06_sailor/line12_en.wav',
  },
  '我要抹茶拿铁。': {
    text: 'I\'ll have a matcha latte.',
    voice: 'josei_07_sailor/line12_en.wav',
  },
  '我选焦糖布丁。': {
    text: 'I\'ll choose the caramel pudding.',
    voice: 'josei_04_akamafu/line3_en.wav',
  },
  '今天真是个适合约会的日子。': {
    text: 'Today really is a perfect day for a date.',
    voice: 'josei_06_sailor/line13_en.wav',
  },
  '哈哈，说得也是。': {
    text: 'Haha, you\'re right.',
    voice: 'josei_07_sailor/line13_en.wav',
  },
  '下次换你们请客哦。': {
    text: 'Next time, it\'s your turn to treat us.',
    voice: 'josei_04_akamafu/line4_en.wav',
  },
  '成交。': {
    text: 'Deal.',
    voice: 'josei_06_sailor/line14_en.wav',
  },
  '那就这么说定了。': {
    text: 'It\'s a deal then.',
    voice: 'josei_07_sailor/line14_en.wav',
  },
  '走吧。': {
    text: 'Let\'s go.',
    voice: 'josei_04_akamafu/line5_en.wav',
  },

  // Parameterized text examples
  '你好，{name}！': {
    text: 'Hello, {name}!',
    tts: { provider: 'browser', voiceId: 'Microsoft David', rate: 1.0 },
  },

  // System text
  '特效测试场景：角色与背景过渡。': {
    text: 'Effects Test Scene: Character & Background Transitions.',
  },
  '角色淡入（手动插值）。': {
    text: 'Character fade-in (manual interpolation).',
  },
  '角色抖动。': {
    text: 'Character shake.',
  },
  '角色跳一下。': {
    text: 'Character jump.',
  },
  '角色翻转、旋转、缩放。': {
    text: 'Character flip, rotate, zoom.',
  },
  '聚焦/虚化/变暗。': {
    text: 'Focus/blur/dim.',
  },
  '背景过渡：fade / wipeLeft / wipeRight / zoom / blurFade。': {
    text: 'Background transitions: fade / wipeLeft / wipeRight / zoom / blurFade.',
  },
  '角色同时演示：叠加 filter + opacity。': {
    text: 'Character demo: combined filters + opacity.',
  },
  '测试结束：返回 scene1 或结束。': {
    text: 'Test complete: Return to scene1 or end.',
  },

  // Scene 2
  '欢迎来到 scene2。现在时间仍然是：{time}。': {
    text: 'Welcome to scene2. The current time is still: {time}.',
  },
  '演示结束。': {
    text: 'Demo finished.',
  },
};

export default enUS;
