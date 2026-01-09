/**
 * 日本語言語パック
 *
 * 元の中国語テキストをキーとして使用
 */

import type { LocaleData } from '../../../engine/i18n/types';

const jaJP: LocaleData = {
  // ==================== キャラクター名 ====================
  '@char:josei_06_sailor': {
    text: '女子生徒06',
  },
  '@char:josei_07_sailor': {
    text: '女子生徒07',
  },
  '@char:josei_04_akamafu': {
    text: '赤髪の女の子',
  },
  '@char:josei_05_wa': {
    text: '着物の女の子',
  },
  '@char:animal_01_neko': {
    text: '猫ちゃん',
  },

  // ==================== UIテキスト ====================
  '@ui:save': {
    text: 'セーブ',
  },
  '@ui:load': {
    text: 'ロード',
  },
  '@ui:close': {
    text: '閉じる',
  },
  '@ui:save_btn': {
    text: '保存',
  },
  '@ui:load_btn': {
    text: '読込',
  },
  '@ui:refresh': {
    text: '更新',
  },
  '@ui:slot_placeholder': {
    text: 'セーブ名を入力',
  },
  '@ui:overwrite': {
    text: '上書き',
  },
  '@ui:delete': {
    text: '削除',
  },
  '@ui:no_saves': {
    text: 'セーブデータがありません',
  },
  '@ui:unnamed_scenario': {
    text: '名前のないシナリオ',
  },
  '@ui:settings': {
    text: '設定',
  },
  '@ui:language': {
    text: '言語',
  },
  '@ui:voice_settings': {
    text: '音声設定',
  },
  '@ui:voice_enabled': {
    text: '音声を有効化',
  },
  '@ui:tts_engine': {
    text: 'TTSエンジン',
  },
  '@ui:tts_engine_browser': {
    text: 'ブラウザ内蔵',
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
    text: 'ブラウザ音声',
  },  '@ui:display_settings': {
    text: '表示設定',
  },
  '@ui:dialog_diff': {
    text: 'テキストの再描画を防ぐ',
  },
  '@ui:dialog_diff_desc': {
    text: '有効にすると、同じテキストは再レンダリングされず、視覚体験が向上します',
  },
  '@ui:auto_continue_after_load': {
    text: 'ロード後に自動継続',
  },
  '@ui:auto_continue_after_load_desc': {
    text: '有効にすると、セーブデータをロードした後に自動的に一度継続を実行します',
  },
  '@ui:hide_continue_button': {
    text: '継続ボタンを非表示',
  },
  '@ui:hide_continue_button_desc': {
    text: 'ダイアログボックスの継続ボタンを非表示にし、空白エリアをクリックまたはキーを使用して継続',
  },
  '@ui:continue_key_binding': {
    text: '継続キー',
  },
  '@ui:continue_key_binding_desc': {
    text: 'このキーを押してゲームダイアログを継続',
  },
  '@ui:press_key_to_bind': {
    text: 'キーを押してバインド...',
  },
  // ==================== シーン1 - 会話テキスト ====================
  '今天天气真好。': {
    text: '今日は本当にいい天気ですね。',
    voice: 'josei_06_sailor/line1_ja.wav',
  },
  '嗯，放学一起去买甜点吧？': {
    text: 'うん、放課後一緒にスイーツを買いに行こうよ！',
    voice: 'josei_07_sailor/line2_ja.wav',
  },
  '我想试试那家新开的店。': {
    text: 'あの新しいお店、行ってみたいな。',
    voice: 'josei_06_sailor/line3_ja.wav',
  },
  '听说草莓蛋糕很受欢迎。': {
    text: 'イチゴケーキが人気らしいよ。',
    voice: 'josei_07_sailor/line4_ja.wav',
  },
  '风有点大，别让帽子飞了。': {
    text: '風が強いから、帽子が飛ばないようにしてね。',
    voice: 'josei_06_sailor/line5_ja.wav',
  },
  '好险，差点就掉了。': {
    text: '危ない、もう少しで落ちるところだった。',
    voice: 'josei_07_sailor/line6_ja.wav',
  },
  '呀，小猫咪也出来散步。': {
    text: 'あら、こ猫ちゃんもお散歩に来てる。',
    voice: 'josei_06_sailor/line7_ja.wav',
  },
  '好可爱，想摸摸它。': {
    text: 'かわいい、触りたいな。',
    voice: 'josei_07_sailor/line8_ja.wav',
  },
  '我们要不要邀请她一起？': {
    text: '彼女を誘ってみない？',
    voice: 'josei_06_sailor/line9_ja.wav',
  },
  '好，正好人多可以点更多。': {
    text: 'いいね、人数が多いといくらでも頼めるしね。',
    voice: 'josei_07_sailor/line10_ja.wav',
  },
  '咦，你们在聊什么？': {
    text: 'あれ、何を話してるの？',
    voice: 'josei_04_akamafu/line1_ja.wav',
  },
  '一起去甜点店，刚好路过。': {
    text: 'スイーツ店に行くところ、通りがかったの。',
    voice: 'josei_06_sailor/line10_ja.wav',
  },
  '要不要一起来？': {
    text: '一緒に行かない？',
    voice: 'josei_07_sailor/line11_ja.wav',
  },
  '当然好呀，我也想试试新品。': {
    text: 'もちろんいいよ、私も新品試したいな。',
    voice: 'josei_04_akamafu/line2_ja.wav',
  },
  '太好了，那就出发吧。': {
    text: 'よかった、じゃあ出発しよう。',
    voice: 'josei_06_sailor/line11_ja.wav',
  },
  '快到了，我想先点冰饮。': {
    text: 'もうすぐ着くよ。私まずコールドドリンク頼みたいな。',
    voice: 'josei_06_sailor/line12_ja.wav',
  },
  '我要抹茶拿铁。': {
    text: '抹茶ラテにする。',
    voice: 'josei_07_sailor/line12_ja.wav',
  },
  '我选焦糖布丁。': {
    text: 'キャラメルプリンにする。',
    voice: 'josei_04_akamafu/line3_ja.wav',
  },
  '今天真是个适合约会的日子。': {
    text: '今日は本当にデートにぴったりの日だね。',
    voice: 'josei_06_sailor/line13_ja.wav',
  },
  '哈哈，说得也是。': {
    text: 'はは、そうだね。',
    voice: 'josei_07_sailor/line13_ja.wav',
  },
  '下次换你们请客哦。': {
    text: '次は君たちのおごりだよ。',
    voice: 'josei_04_akamafu/line4_ja.wav',
  },
  '成交。': {
    text: '約束。',
    voice: 'josei_06_sailor/line14_ja.wav',
  },
  '那就这么说定了。': {
    text: 'じゃあそういうことで。',
    voice: 'josei_07_sailor/line14_ja.wav',
  },
  '走吧。': {
    text: '行こう。',
    voice: 'josei_04_akamafu/line5_ja.wav',
  },

  // パラメータ付きテキストの例
  '你好，{name}！': {
    text: 'こんにちは、{name}さん！',
    tts: { provider: 'browser', voiceId: 'Google 日本語', rate: 1.0 },
  },

  // システムテキスト
  '特效测试场景：角色与背景过渡。': {
    text: 'エフェクトテストシーン：キャラクターと背景の遷移。',
  },
  '角色淡入（手动插值）。': {
    text: 'キャラクターフェードイン（手動補間）。',
  },
  '角色抖动。': {
    text: 'キャラクターシェイク。',
  },
  '角色跳一下。': {
    text: 'キャラクタージャンプ。',
  },
  '角色翻转、旋转、缩放。': {
    text: 'キャラクター反転、回転、拡大縮小。',
  },
  '聚焦/虚化/变暗。': {
    text: 'フォーカス/ぼかし/調光。',
  },
  '背景过渡：fade / wipeLeft / wipeRight / zoom / blurFade。': {
    text: '背景遷移：フェード/ワイプ左/ワイプ右/ズーム/ぼかしフェード。',
  },
  '角色同时演示：叠加 filter + opacity。': {
    text: 'キャラクター同時デモ：フィルターと不透明度の組み合わせ。',
  },
  '测试结束：返回 scene1 或结束。': {
    text: 'テスト終了：scene1に戻るか終了。',
  },

  // シーン2
  '欢迎来到 scene2。现在时间仍然是：{time}。': {
    text: 'scene2へようこそ。現在時刻はまだ：{time}。',
  },
  '演示结束。': {
    text: 'デモ終了。',
  },
};

export default jaJP;
