import type { ActorAction, ActionResult } from './ActorAction';
import { initialEngineState, reducer, type EngineState } from './EngineContext';
import type { BindingsRegistry, Live2DBinding, SpriteAtlasBinding, VoiceBankBinding, AudioMixerBinding, SayTargetBinding } from './bindings';

export class Runtime {
  state: EngineState;
  bindings: BindingsRegistry;
  private listeners: Array<(state: EngineState) => void>;
  private pendingChoice: { resolve: (value: ActionResult<string>) => void } | null;
  private pendingSay: { resolve: (value: ActionResult<void>) => void } | null;
  private past: EngineState[];
  private future: EngineState[];
  private readonly maxPast: number;
  private actionLog: ActorAction<unknown>[];
  private replayTargetFrame: number | null;
  private readonly progressKey: string;

  constructor() {
    this.state = { ...initialEngineState };
    this.bindings = {};
    this.listeners = [];
    this.pendingChoice = null;
    this.pendingSay = null;
    this.past = [];
    this.future = [];
    this.maxPast = 10;
    this.actionLog = [];
    this.replayTargetFrame = null;
    this.progressKey = 'kosuzu_engine_progress';
  }

  reset() {
    this.state = { ...initialEngineState };
    this.pendingChoice = null;
    this.pendingSay = null;
    this.past = [];
    this.future = [];
    this.actionLog = [];
    this.replayTargetFrame = null;
    this.emit();
    this.persistProgress(0);
  }

  replayToFrame(frame: number) {
    this.replayTargetFrame = Math.max(0, Math.floor(frame));
  }

  dispatch<T = unknown>(action: ActorAction<T>): Promise<ActionResult<T>> {
    if (import.meta.env?.DEV) {

      console.log('dispatch', action.type, action.payload);
    }
    if (action.type !== 'back') {
      const snapshot = JSON.parse(JSON.stringify(this.state)) as EngineState;
      this.past.push(snapshot);
      if (this.past.length > this.maxPast) this.past.shift();
      this.future = [];
      this.actionLog.push({ type: action.type, payload: action.payload } as ActorAction<unknown>);
    }
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
      const frame = this.currentFrame();
      this.persistProgress(frame);
      if (this.replayTargetFrame !== null && frame < this.replayTargetFrame) {
        return Promise.resolve({ ok: true } as ActionResult<T>);
      }
      if (this.replayTargetFrame !== null && frame >= this.replayTargetFrame) {
        this.replayTargetFrame = null;
      }
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
    const next = { ...this.state };
    next.bindings = next.bindings || {};
    next.bindings.voiceBanks = next.bindings.voiceBanks || {};
    next.bindings.voiceBanks[binding.actorId] = binding;
    this.state = next;
    this.emit();
  }

  bindSpriteAtlas(binding: SpriteAtlasBinding) {
    if (!this.bindings.spriteAtlases) this.bindings.spriteAtlases = {};
    this.bindings.spriteAtlases[binding.actorId] = binding;
    const next = { ...this.state };
    next.bindings = next.bindings || {};
    next.bindings.spriteAtlases = next.bindings.spriteAtlases || {};
    next.bindings.spriteAtlases[binding.actorId] = binding;
    this.state = next;
    this.emit();
  }

  bindLive2D(binding: Live2DBinding) {
    if (!this.bindings.live2d) this.bindings.live2d = {};
    this.bindings.live2d[binding.actorId] = binding;
    const next = { ...this.state };
    next.bindings = next.bindings || {};
    next.bindings.live2d = next.bindings.live2d || {};
    next.bindings.live2d[binding.actorId] = binding;
    this.state = next;
    this.emit();
  }

  bindAudioMixer(binding: AudioMixerBinding) {
    this.bindings.audioMixer = binding;
    const next = { ...this.state };
    next.bindings = next.bindings || {};
    next.bindings.audioMixer = binding;
    this.state = next;
    this.emit();
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

  hydrate(state: EngineState) {
    this.state = { ...state };
    this.emit();
    this.persistProgress(this.currentFrame());
  }

  back() {
    const curr = JSON.parse(JSON.stringify(this.state)) as EngineState;
    if (this.past.length > 0) {
      const prev = this.past.pop() as EngineState;
      this.future.push(curr);
      this.state = prev;
      this.emit();
      this.persistProgress(this.currentFrame());
      return;
    }
    if (this.actionLog.length > 0) {
      const targetLen = this.actionLog.length - 1;
      const rebuilt = this.fastRebuild(targetLen);
      this.future.push(curr);
      this.state = rebuilt;
      this.actionLog.pop();
      this.emit();
      this.persistProgress(this.currentFrame());
    }
  }

  private fastRebuild(targetLen: number): EngineState {
    const len = Math.max(0, Math.min(targetLen, this.actionLog.length));
    let next: EngineState = { ...initialEngineState };
    for (let i = 0; i < len; i++) {
      const a = this.actionLog[i];
      if (!a) continue;
      next = reducer(next, { type: a.type, payload: a.payload });
    }
    return next;
  }

  save(slot?: string) {
    const scene = this.state.scene || '无名剧本';
    const text = this.state.dialog?.text || '';
    const time = Date.now();
    const defaultSlot = `${scene}_${new Date(time).toLocaleString()}`;
    const useSlot = slot && slot.trim().length > 0 ? slot : defaultSlot;
    const key = `save:${slot}`;
    const snapshot = JSON.stringify({
      meta: { scene, text, time, slot: useSlot },
      state: this.state,
    });
    localStorage.setItem(key, snapshot);
    return { ok: true } as ActionResult<void>;
  }

  load(slot: string) {
    const key = `save:${slot}`;
    const raw = localStorage.getItem(key);
    if (!raw) return { ok: false, error: 'missing_save' } as ActionResult<void>;
    const parsed = JSON.parse(raw) as { meta?: unknown; state?: EngineState } | EngineState;
    if ('state' in parsed && parsed.state) {
      this.hydrate(parsed.state);
    } else {
      this.hydrate(parsed as EngineState);
    }
    this.persistProgress(this.currentFrame());
    return { ok: true } as ActionResult<void>;
  }

  listSaves(): Array<{ slot: string; scene?: string; text?: string; time?: number }> {
    const slotNames: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || '';
      if (k.startsWith('save:')) slotNames.push(k.substring(5));
    }
    return slotNames
      .map((slot) => {
        const raw = localStorage.getItem(`save:${slot}`);
        try {
          const obj = JSON.parse(raw || '{}') as { meta?: { scene?: string; text?: string; time?: number } };
          const entry: { slot: string; scene?: string; text?: string; time?: number } = { slot };
          if (obj.meta?.scene !== undefined) entry.scene = obj.meta.scene;
          if (obj.meta?.text !== undefined) entry.text = obj.meta.text;
          if (obj.meta?.time !== undefined) entry.time = obj.meta.time;
          return entry;
        } catch {
          return { slot };
        }
      })
      .sort((a, b) => (b.time || 0) - (a.time || 0));
  }

  private currentFrame() {
    return this.state.history?.length ?? 0;
  }

  private persistProgress(frame: number) {
    const scene = this.state.scene;
    if (!scene) return;
    const payload = JSON.stringify({ scene, frame, time: Date.now() });
    localStorage.setItem(this.progressKey, payload);
  }
}

export const defaultRuntime = new Runtime();
