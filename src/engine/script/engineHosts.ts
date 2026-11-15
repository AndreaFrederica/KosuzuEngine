import type { Runtime } from '../core/Runtime';
import type { ActorAction } from '../core/ActorAction';
import { getI18nManager } from '../i18n/I18nManager';
import { getVoiceManager } from '../i18n/VoiceManager';
import type { TTSConfig } from '../i18n/types';
import { nav } from '../navigation';
import { getRegisteredScriptHostFunctions, type ScriptHostFunctionMap } from './QuickJSScriptRuntime';

function delay(ms: unknown) {
  return new Promise<void>((resolve) => setTimeout(resolve, Math.max(0, Number(ms) || 0)));
}

export function createEngineHosts(runtime: Runtime): ScriptHostFunctionMap {
  const hosts: ScriptHostFunctionMap = {
    ...getRegisteredScriptHostFunctions(),
    'runtime.state': { call: () => runtime.state },
    'runtime.flowStep': { call: (id, occurrence) => runtime.flowStep(String(id), Number(occurrence)) },
    'runtime.flowComplete': { call: (id, occurrence, value) => runtime.flowComplete(String(id), Number(occurrence), value) },
    'runtime.flowAbort': { call: (id, occurrence) => runtime.flowAbort(String(id), Number(occurrence)) },
    'runtime.dispatch': {
      call: (action) => runtime.dispatch(action as ActorAction),
      resume: ({ args, elapsed }) => {
        const action = args[0] as ActorAction;
        if (action.type === 'say') return runtime.waitForContinue();
        if (action.type === 'choice') return runtime.waitForChoice();
        if (action.type === 'wait') {
          const p = action.payload as number | { ms?: number } | undefined;
          const ms = typeof p === 'number' ? p : p?.ms ?? action.options?.duration ?? 0;
          return delay(ms - elapsed).then(() => ({ ok: true }));
        }
        // All other dispatch operations have already applied their state change.
        return { ok: true };
      },
    },
    'runtime.back': { call: () => { queueMicrotask(() => runtime.back()); } },
    'runtime.reset': { call: () => { queueMicrotask(() => runtime.reset()); } },
    'runtime.bindSpriteAtlas': { call: (b) => runtime.bindSpriteAtlas(b as Parameters<Runtime['bindSpriteAtlas']>[0]) },
    'runtime.bindLive2D': { call: (b) => runtime.bindLive2D(b as Parameters<Runtime['bindLive2D']>[0]) },
    'runtime.bindVoiceBank': { call: (b) => runtime.bindVoiceBank(b as Parameters<Runtime['bindVoiceBank']>[0]) },
    'runtime.bindAudioMixer': { call: (b) => runtime.bindAudioMixer(b as Parameters<Runtime['bindAudioMixer']>[0]) },
    'store.save': { call: (slot) => Promise.resolve().then(() => runtime.save(String(slot))), resume: () => ({ ok: true }) },
    'store.load': { call: (slot) => Promise.resolve().then(() => runtime.load(String(slot))) },
    'store.advance': { call: () => runtime.advance() },
    'store.choose': { call: (choice) => runtime.choose(String(choice)) },
    'store.back': { call: () => { queueMicrotask(() => runtime.back()); } },
    'store.reset': { call: () => { queueMicrotask(() => runtime.reset()); } },
    'store.listSaves': { call: () => runtime.listSaves() },
    'store.hasSave': { call: async (slot) => (await runtime.getSaveData(String(slot))) !== null },
    'store.deleteSave': { call: (slot) => runtime.deleteSave(String(slot)) },
    'store.dispatch': { call: (type, payload) => runtime.dispatch({ type: type as ActorAction['type'], payload }) },
    translate: { call: (key, params) => getI18nManager().getTranslation(String(key), params as Record<string, unknown> | undefined) },
    navigate: { call: (path) => nav.push(String(path)) },
    sleep: { call: delay, resume: ({ args, elapsed }) => delay(Number(args[0]) - elapsed) },
    // Playback is a side effect on the host, not a guest continuation.
    'voice.play': { call: (name, url) => {
      void import('../render/CharacterAudioManager').then(({ characterAudioRegistry }) =>
        characterAudioRegistry.getOrCreate(String(name)).playVoice(String(url)),
      ).catch(console.error);
    } },
    'voice.tts': { call: (text, config) => {
      void getVoiceManager().speakWithAPI(String(text), config as TTSConfig).catch(console.error);
    } },
  };
  for (const level of ['log', 'info', 'warn', 'error', 'debug'] as const) {
    hosts[`log.${level}`] = { call: (...args) => console[level]('[script]', ...args) };
  }
  return hosts;
}
