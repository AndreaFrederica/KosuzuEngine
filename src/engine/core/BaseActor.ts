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

/** 基础演员类，所有角色/背景/音频的基类 */
export class BaseActor {
  readonly id: string;
  readonly kind: ActorKind;
  readonly name: string;
  state: ActorState;
  protected runtime: Runtime;

  /** 创建一个基础演员实例 */
  constructor(kind: ActorKind, name: string, id?: string, runtime?: Runtime) {
    this.kind = kind;
    this.name = name;
    this.id = id ?? `${kind}:${name}`;
    this.state = {};
    this.runtime = runtime ?? defaultRuntime;
  }

  /** 执行一个动作并返回结果 */
  action<T = unknown>(input: ActorAction<T>): Promise<ActionResult<T>> {
    return this.runtime.dispatch<T>(input);
  }
}

/** 角色演员类，用于控制角色在场景中的显示、动作和对话 */
export class CharacterActor extends BaseActor {
  private static readonly defaultTransitionMs = 200;

  /** 创建一个角色演员实例 */
  constructor(name: string, id?: string, runtime?: Runtime) {
    super('character', name, id, runtime);
  }

  /** 让角色说话，显示对话文本 */
  say(text: string, opts?: { duration?: number; html?: boolean }) {
    const options = opts?.duration !== undefined ? { duration: opts.duration } : undefined;
    const action: ActorAction = { type: 'say', payload: { text, speaker: this.name, html: opts?.html } };
    if (options) action.options = options;
    return this.action(action);
  }

  /** 让角色说HTML格式的内容 */
  sayHtml(html: string, opts?: { duration?: number }) {
    return this.say(html, { ...opts, html: true });
  }

  /** 在场景中显示角色 */
  show(opts?: TransformState) {
    return this.action({ type: 'show', payload: { actorId: this.id, name: this.name, kind: this.kind, transform: opts } });
  }

  /** 隐藏角色 */
  hide() {
    return this.action({ type: 'hide', payload: { actorId: this.id } });
  }

  /** 移动角色到指定位置/状态 */
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

  /** 淡入效果，让角色渐隐显示 */
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

  /** 淡出效果，让角色渐隐消失 */
  async fadeOut(ms = 240, opts?: { hide?: boolean }) {
    const hide = opts?.hide ?? false;
    await this.mergedMove({ opacity: 0 }, { duration: ms });
    await this.wait(ms);
    if (hide) await this.hide();
  }

  /** 抖动效果，让角色产生震动 */
  async shake(ms = 320, opts?: { strengthX?: number; strengthY?: number; freq?: number }) {
    const strengthX = opts?.strengthX ?? 0.01;
    const strengthY = opts?.strengthY ?? 0;
    await this.action({
      type: 'fx',
      payload: { actorId: this.id, name: 'shake', duration: ms, params: { strengthX, strengthY } },
    });
    await this.wait(ms);
  }

  /** 跳跃效果，让角色产生跳跃动画 */
  async jump(ms = 260, opts?: { height?: number }) {
    const height = opts?.height ?? 0.06;
    await this.action({
      type: 'fx',
      payload: { actorId: this.id, name: 'jump', duration: ms, params: { height } },
    });
    await this.wait(ms);
  }

  /** 聚焦效果，恢复角色清晰显示 */
  focus(ms: number = CharacterActor.defaultTransitionMs) {
    return this.mergedMove(
      { blur: 0, brightness: 1, grayscale: 0, saturate: 1, contrast: 1 },
      { duration: ms },
    );
  }

  /** 变暗效果，降低角色亮度 */
  dim(level = 0.7, ms: number = CharacterActor.defaultTransitionMs) {
    return this.mergedMove({ brightness: level, saturate: 0.9, contrast: 0.95 }, { duration: ms });
  }

  /** 模糊效果，让角色变模糊 */
  blur(px = 6, ms: number = CharacterActor.defaultTransitionMs) {
    return this.mergedMove({ blur: px }, { duration: ms });
  }

  /** 水平翻转角色 */
  flipX(on = true, ms: number = CharacterActor.defaultTransitionMs) {
    return this.mergedMove({ scaleX: on ? -1 : 1 }, { duration: ms });
  }

  /** 旋转角色 */
  rotate(deg: number, ms: number = CharacterActor.defaultTransitionMs) {
    return this.mergedMove({ rotate: deg }, { duration: ms });
  }

  /** 缩放角色 */
  zoom(scale: number, ms: number = CharacterActor.defaultTransitionMs) {
    return this.mergedMove({ scale }, { duration: ms });
  }

  /** 播放表情动画 */
  emote(key: string) {
    return this.action({ type: 'emote', payload: { actorId: this.id, key } });
  }

  /** 切换角色姿势/立绘差分 */
  pose(diffKey: string) {
    return this.action({ type: 'pose', payload: { actorId: this.id, key: diffKey } });
  }

  /** 播放Live2D动作 */
  motion(id: string) {
    return this.action({ type: 'motion', payload: { id } });
  }
}

/** 背景演员类，用于控制场景背景的切换和效果 */
export class BackgroundActor extends BaseActor {
  /** 创建一个背景演员实例 */
  constructor(name: string, id?: string, runtime?: Runtime) {
    super('background', name, id, runtime);
  }

  /** 切换背景，支持多种转场效果 */
  switch(name: string, opts?: { effect?: 'cut' | 'fade' | 'wipeLeft' | 'wipeRight' | 'zoom' | 'blurFade'; duration?: number }) {
    const action: ActorAction = { type: 'bg', payload: { name, effect: opts?.effect, duration: opts?.duration } };
    return this.action(action);
  }

  /** 背景淡入效果 */
  fadeIn(ms: number) {
    const name = this.runtime.state.bg?.name;
    if (!name) return this.action({ type: 'wait', payload: ms });
    return this.switch(name, { effect: 'fade', duration: ms });
  }

  /** 背景淡出效果 */
  fadeOut(ms: number) {
    const name = this.runtime.state.bg?.name;
    if (!name) return this.action({ type: 'wait', payload: ms });
    return this.switch(name, { effect: 'fade', duration: ms });
  }
}

/** 音频演员类，用于控制背景音乐播放 */
export class AudioActor extends BaseActor {
  /** 创建一个音频演员实例 */
  constructor(name: string, id?: string, runtime?: Runtime) {
    super('audio', name, id, runtime);
  }

  /** 播放背景音乐 */
  play(name: string, opts?: { fadeIn?: number }) {
    const duration = opts?.fadeIn;
    const options = duration !== undefined ? { duration } : undefined;
    const action: ActorAction = { type: 'bgm', payload: { name } };
    if (options) action.options = options;
    return this.action(action);
  }

  /** 停止背景音乐 */
  stop(opts?: { fadeOut?: number }) {
    const duration = opts?.fadeOut;
    const options = duration !== undefined ? { duration } : undefined;
    const action: ActorAction = { type: 'bgm', payload: { stop: true } };
    if (options) action.options = options;
    return this.action(action);
  }

  /** 渐变调整音量 */
  fadeTo(volume: number, ms: number) {
    return this.action({ type: 'bgm', payload: { volume }, options: { duration: ms } });
  }
}

/** 上下文操作类，提供对引擎状态和变量的访问 */
export class ContextOps {
  protected runtime: Runtime;
  constructor(runtime?: Runtime) {
    this.runtime = runtime ?? defaultRuntime;
  }

  /** 获取当前引擎状态 */
  state(): EngineState {
    return this.runtime.state;
  }

  /** 获取当前场景名称 */
  sceneName() {
    return this.runtime.state.scene;
  }

  /** 获取舞台尺寸 */
  stageSize() {
    return this.runtime.state.stage;
  }

  /** 获取变量值 */
  var<T = unknown>(key: string, fallback?: T) {
    const vars = this.runtime.state.vars || {};
    const v = vars[key] as T | undefined;
    return v !== undefined ? v : (fallback as T);
  }

  /** 设置变量值 */
  setVar(key: string, value: unknown) {
    return this.runtime.dispatch({ type: 'var', payload: { key, value } });
  }

  /** 删除变量 */
  delVar(key: string) {
    return this.runtime.dispatch({ type: 'var', payload: { key, remove: true } });
  }

  /** 等待指定毫秒数 */
  wait(ms: number) {
    return this.runtime.dispatch({ type: 'wait', payload: ms });
  }

  /** 显示选项让用户选择 */
  choice(items: ChoiceItem[]) {
    return this.runtime.dispatch<string>({ type: 'choice', payload: items });
  }

  /** 返回上一个场景 */
  back() {
    this.runtime.back();
  }

  /** 重新开始当前场景 */
  restart() {
    this.runtime.reset();
  }
}

/** 舞台操作类，提供对舞台尺寸的访问 */
export class StageOps {
  protected runtime: Runtime;
  constructor(runtime?: Runtime) {
    this.runtime = runtime ?? defaultRuntime;
  }

  /** 获取舞台尺寸信息 */
  size() {
    return this.runtime.state.stage;
  }

  /** 获取舞台宽度 */
  width() {
    return this.runtime.state.stage?.width ?? 0;
  }

  /** 获取舞台高度 */
  height() {
    return this.runtime.state.stage?.height ?? 0;
  }
}
