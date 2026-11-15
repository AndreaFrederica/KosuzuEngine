import { call } from './Runtime';

export function getI18nManager() {
  return { getTranslation: (key: string, params?: Record<string, unknown>) => call<{ text: string; voice?: string; tts?: Record<string, unknown> }>('translate', key, params) };
}
export function getVoiceManager() {
  return { speakWithAPI: (text: string, options: unknown) => call('voice.tts', text, options) };
}
export const characterAudioRegistry = {
  getOrCreate: (name: string) => ({ playVoice: (url: string) => call('voice.play', name, url) }),
};
