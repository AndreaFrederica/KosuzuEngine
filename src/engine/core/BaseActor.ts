import type { ActorAction, ActionResult } from './ActorAction';
import type { Runtime } from './Runtime';
import { defaultRuntime } from './Runtime';
import type { ChoiceItem, EngineState } from './EngineContext';

export type ActorKind = 'character' | 'background' | 'audio' | 'overlay';

export interface TransformState {
  x?: number;
  y?: number;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  rotate?: number;
  opacity?: number;
  layer?: number;
  blur?: number;
  brightness?: number;
  grayscale?: number;
  saturate?: number;
  contrast?: number;
  hueRotate?: number;
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
  private static readonly defaultTransitionMs = 200;

  constructor(name: string, id?: string, runtime?: Runtime) {
    super('character', name, id, runtime);
  }

  say(text: string, opts?: { duration?: number; html?: boolean }) {
    const options = opts?.duration !== undefined ? { duration: opts.duration } : undefined;
    const action: ActorAction = { type: 'say', payload: { text, speaker: this.name, html: opts?.html } };
    if (options) action.options = options;
    return this.action(action);
  }

  sayHtml(html: string, opts?: { duration?: number }) {
    return this.say(html, { ...opts, html: true });
  }

  show(opts?: TransformState) {
    return this.action({ type: 'show', payload: { actorId: this.id, name: this.name, kind: this.kind, transform: opts } });
  }

  hide() {
    return this.action({ type: 'hide', payload: { actorId: this.id } });
  }

  move(to: TransformState, opts?: { duration?: number }) {
    const action: ActorAction = { type: 'move', payload: { actorId: this.id, transform: to } };
    if (opts?.duration !== undefined) action.options = { duration: opts.duration };
    return this.action(action);
  }

  private currentTransform(): TransformState {
    const t = this.runtime.state.actors?.[this.id]?.transform;
    return t ? { ...t } : {};
  }

  private async wait(ms: number) {
    await this.action({ type: 'wait', payload: ms });
  }

  private mergedMove(patch: TransformState, opts?: { duration?: number }) {
    const curr = this.currentTransform();
    return this.move({ ...curr, ...patch }, opts);
  }

  async fadeIn(ms = 240) {
    const curr = this.currentTransform();
    if (!(this.id in (this.runtime.state.actors || {}))) {
      await this.show({ ...curr, opacity: 0 });
    } else {
      await this.mergedMove({ opacity: 0 });
    }
    await this.mergedMove({ opacity: 1 }, { duration: ms });
    await this.wait(ms);
  }

  async fadeOut(ms = 240, opts?: { hide?: boolean }) {
    const hide = opts?.hide ?? false;
    await this.mergedMove({ opacity: 0 }, { duration: ms });
    await this.wait(ms);
    if (hide) await this.hide();
  }

  async shake(ms = 320, opts?: { strengthX?: number; strengthY?: number; freq?: number }) {
    const strengthX = opts?.strengthX ?? 0.01;
    const strengthY = opts?.strengthY ?? 0;
    await this.action({
      type: 'fx',
      payload: { actorId: this.id, name: 'shake', duration: ms, params: { strengthX, strengthY } },
    });
    await this.wait(ms);
  }

  async jump(ms = 260, opts?: { height?: number }) {
    const height = opts?.height ?? 0.06;
    await this.action({
      type: 'fx',
      payload: { actorId: this.id, name: 'jump', duration: ms, params: { height } },
    });
    await this.wait(ms);
  }

  focus(ms: number = CharacterActor.defaultTransitionMs) {
    return this.mergedMove(
      { blur: 0, brightness: 1, grayscale: 0, saturate: 1, contrast: 1 },
      { duration: ms },
    );
  }

  dim(level = 0.7, ms: number = CharacterActor.defaultTransitionMs) {
    return this.mergedMove({ brightness: level, saturate: 0.9, contrast: 0.95 }, { duration: ms });
  }

  blur(px = 6, ms: number = CharacterActor.defaultTransitionMs) {
    return this.mergedMove({ blur: px }, { duration: ms });
  }

  flipX(on = true, ms: number = CharacterActor.defaultTransitionMs) {
    return this.mergedMove({ scaleX: on ? -1 : 1 }, { duration: ms });
  }

  rotate(deg: number, ms: number = CharacterActor.defaultTransitionMs) {
    return this.mergedMove({ rotate: deg }, { duration: ms });
  }

  zoom(scale: number, ms: number = CharacterActor.defaultTransitionMs) {
    return this.mergedMove({ scale }, { duration: ms });
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

  switch(name: string, opts?: { effect?: 'cut' | 'fade' | 'wipeLeft' | 'wipeRight' | 'zoom' | 'blurFade'; duration?: number }) {
    const action: ActorAction = { type: 'bg', payload: { name, effect: opts?.effect, duration: opts?.duration } };
    return this.action(action);
  }

  fadeIn(ms: number) {
    const name = this.runtime.state.bg?.name;
    if (!name) return this.action({ type: 'wait', payload: ms });
    return this.switch(name, { effect: 'fade', duration: ms });
  }

  fadeOut(ms: number) {
    const name = this.runtime.state.bg?.name;
    if (!name) return this.action({ type: 'wait', payload: ms });
    return this.switch(name, { effect: 'fade', duration: ms });
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

export class ContextOps {
  protected runtime: Runtime;
  constructor(runtime?: Runtime) {
    this.runtime = runtime ?? defaultRuntime;
  }

  state(): EngineState {
    return this.runtime.state;
  }

  sceneName() {
    return this.runtime.state.scene;
  }

  stageSize() {
    return this.runtime.state.stage;
  }

  var<T = unknown>(key: string, fallback?: T) {
    const vars = this.runtime.state.vars || {};
    const v = vars[key] as T | undefined;
    return v !== undefined ? v : (fallback as T);
  }

  setVar(key: string, value: unknown) {
    return this.runtime.dispatch({ type: 'var', payload: { key, value } });
  }

  delVar(key: string) {
    return this.runtime.dispatch({ type: 'var', payload: { key, remove: true } });
  }

  wait(ms: number) {
    return this.runtime.dispatch({ type: 'wait', payload: ms });
  }

  choice(items: ChoiceItem[]) {
    return this.runtime.dispatch<string>({ type: 'choice', payload: items });
  }

  back() {
    this.runtime.back();
  }

  restart() {
    this.runtime.reset();
  }
}

export class StageOps {
  protected runtime: Runtime;
  constructor(runtime?: Runtime) {
    this.runtime = runtime ?? defaultRuntime;
  }

  size() {
    return this.runtime.state.stage;
  }

  width() {
    return this.runtime.state.stage?.width ?? 0;
  }

  height() {
    return this.runtime.state.stage?.height ?? 0;
  }
}
