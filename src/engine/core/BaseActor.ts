import type { ActorAction, ActionResult } from './ActorAction';
import type { Runtime } from './Runtime';
import { defaultRuntime } from './Runtime';

export type ActorKind = 'character' | 'background' | 'audio' | 'overlay';

export interface TransformState {
  x?: number;
  y?: number;
  scale?: number;
  opacity?: number;
  layer?: number;
}

export interface PoseState {
  expression?: string;
  outfit?: string;
  emote?: string;
}

export interface Live2DState {
  modelId?: string;
  expressionId?: string;
  motionId?: string;
}

export interface AudioState {
  voiceBankId?: string;
  voiceClipId?: string;
}

export interface ActorState {
  transform?: TransformState;
  pose?: PoseState;
  spriteDiff?: string;
  live2d?: Live2DState;
  audio?: AudioState;
}

export class BaseActor {
  readonly id: string;
  readonly kind: ActorKind;
  readonly name: string;
  state: ActorState;
  protected runtime: Runtime;

  constructor(kind: ActorKind, name: string, id?: string, runtime?: Runtime) {
    this.kind = kind;
    this.name = name;
    this.id = id ?? `${kind}:${name}`;
    this.state = {};
    this.runtime = runtime ?? defaultRuntime;
  }

  action<T = unknown>(input: ActorAction<T>): Promise<ActionResult<T>> {
    return this.runtime.dispatch<T>(input);
  }
}

export class CharacterActor extends BaseActor {
  constructor(name: string, id?: string, runtime?: Runtime) {
    super('character', name, id, runtime);
  }

  say(text: string, opts?: { duration?: number }) {
    const options = opts?.duration !== undefined ? { duration: opts.duration } : undefined;
    const action: ActorAction = { type: 'say', payload: { text, speaker: this.name } };
    if (options) action.options = options;
    return this.action(action);
  }

  show(opts?: TransformState) {
    return this.action({ type: 'show', payload: { actorId: this.id, name: this.name, kind: this.kind, transform: opts } });
  }

  hide() {
    return this.action({ type: 'hide', payload: { actorId: this.id } });
  }

  move(to: TransformState) {
    return this.action({ type: 'move', payload: { actorId: this.id, transform: to } });
  }

  emote(key: string) {
    return this.action({ type: 'emote', payload: { actorId: this.id, key } });
  }

  pose(diffKey: string) {
    return this.action({ type: 'pose', payload: { actorId: this.id, key: diffKey } });
  }

  motion(id: string) {
    return this.action({ type: 'motion', payload: { id } });
  }
}

export class BackgroundActor extends BaseActor {
  constructor(name: string, id?: string, runtime?: Runtime) {
    super('background', name, id, runtime);
  }

  switch(name: string, opts?: { fadeIn?: number; fadeOut?: number }) {
    const duration = opts?.fadeIn;
    const options = duration !== undefined ? { duration } : undefined;
    const action: ActorAction = { type: 'bg', payload: { name } };
    if (options) action.options = options;
    return this.action(action);
  }

  fadeIn(ms: number) {
    return this.action({ type: 'bg', payload: { fade: 'in' }, options: { duration: ms } });
  }

  fadeOut(ms: number) {
    return this.action({ type: 'bg', payload: { fade: 'out' }, options: { duration: ms } });
  }
}

export class AudioActor extends BaseActor {
  constructor(name: string, id?: string, runtime?: Runtime) {
    super('audio', name, id, runtime);
  }

  play(name: string, opts?: { fadeIn?: number }) {
    const duration = opts?.fadeIn;
    const options = duration !== undefined ? { duration } : undefined;
    const action: ActorAction = { type: 'bgm', payload: { name } };
    if (options) action.options = options;
    return this.action(action);
  }

  stop(opts?: { fadeOut?: number }) {
    const duration = opts?.fadeOut;
    const options = duration !== undefined ? { duration } : undefined;
    const action: ActorAction = { type: 'bgm', payload: { stop: true } };
    if (options) action.options = options;
    return this.action(action);
  }

  fadeTo(volume: number, ms: number) {
    return this.action({ type: 'bgm', payload: { volume }, options: { duration: ms } });
  }
}
