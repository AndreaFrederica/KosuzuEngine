import type { ActorAction, ActionResult } from './ActorAction';
import { initialEngineState, reducer, type EngineState } from './EngineContext';
import type { BindingsRegistry, Live2DBinding, SpriteAtlasBinding, VoiceBankBinding, AudioMixerBinding, SayTargetBinding } from './bindings';

export class Runtime {
  state: EngineState;
  bindings: BindingsRegistry;
  private listeners: Array<(state: EngineState) => void>;
  private pendingChoice: { resolve: (value: ActionResult<string>) => void } | null;
  private pendingSay: { resolve: (value: ActionResult<void>) => void } | null;

  constructor() {
    this.state = { ...initialEngineState };
    this.bindings = {};
    this.listeners = [];
    this.pendingChoice = null;
    this.pendingSay = null;
  }

  dispatch<T = unknown>(action: ActorAction<T>): Promise<ActionResult<T>> {
    if (action.type === 'choice') {
      this.state = reducer(this.state, { type: action.type, payload: action.payload });
      this.emit();
      return new Promise<ActionResult<T>>((resolve) => {
        this.pendingChoice = { resolve: resolve as unknown as (value: ActionResult<string>) => void };
      });
    }
    if (action.type === 'say') {
      this.state = reducer(this.state, { type: action.type, payload: action.payload });
      this.emit();
      return new Promise<ActionResult<T>>((resolve) => {
        this.pendingSay = { resolve: resolve as unknown as (value: ActionResult<void>) => void };
      });
    }
    this.state = reducer(this.state, { type: action.type, payload: action.payload });
    this.emit();
    return Promise.resolve({ ok: true } as ActionResult<T>);
  }

  parallel(actions: ActorAction[]) {
    return Promise.all(actions.map((a) => this.dispatch(a)));
  }

  bindSayTarget(binding: SayTargetBinding) {
    this.bindings.sayTarget = binding;
  }

  bindVoiceBank(binding: VoiceBankBinding) {
    if (!this.bindings.voiceBanks) this.bindings.voiceBanks = {};
    this.bindings.voiceBanks[binding.actorId] = binding;
  }

  bindSpriteAtlas(binding: SpriteAtlasBinding) {
    if (!this.bindings.spriteAtlases) this.bindings.spriteAtlases = {};
    this.bindings.spriteAtlases[binding.actorId] = binding;
  }

  bindLive2D(binding: Live2DBinding) {
    if (!this.bindings.live2d) this.bindings.live2d = {};
    this.bindings.live2d[binding.actorId] = binding;
  }

  bindAudioMixer(binding: AudioMixerBinding) {
    this.bindings.audioMixer = binding;
  }

  addListener(fn: (state: EngineState) => void) {
    this.listeners.push(fn);
  }

  removeListener(fn: (state: EngineState) => void) {
    this.listeners = this.listeners.filter((x) => x !== fn);
  }

  private emit() {
    this.listeners.forEach((fn) => fn(this.state));
  }

  choose(goto: string = '') {
    this.state = reducer(this.state, { type: 'say', payload: { text: '', speaker: '' } });
    this.state.choice = { items: [], visible: false };
    this.emit();
    if (this.pendingChoice !== null) {
      this.pendingChoice.resolve({ ok: true, value: goto });
      this.pendingChoice = null;
    }
  }

  advance() {
    if (this.pendingSay !== null) {
      this.pendingSay.resolve({ ok: true });
      this.pendingSay = null;
    }
  }
}

export const defaultRuntime = new Runtime();
