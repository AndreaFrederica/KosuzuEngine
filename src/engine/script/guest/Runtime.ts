import type { Runtime } from '../../core/Runtime';

export function call<T = unknown>(name: string, ...args: unknown[]): T {
  return (globalThis as unknown as { __call: (name: string, ...args: unknown[]) => T }).__call(name, ...args);
}

export const defaultRuntime = {
  get state() { return call('runtime.state'); },
  dispatch: (action: unknown) => call('runtime.dispatch', action),
  back: () => call('runtime.back'),
  reset: () => call('runtime.reset'),
  bindSpriteAtlas: (binding: unknown) => call('runtime.bindSpriteAtlas', binding),
  bindLive2D: (binding: unknown) => call('runtime.bindLive2D', binding),
  bindVoiceBank: (binding: unknown) => call('runtime.bindVoiceBank', binding),
  bindAudioMixer: (binding: unknown) => call('runtime.bindAudioMixer', binding),
} as unknown as Runtime;
