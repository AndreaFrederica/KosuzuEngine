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
  params?: Record<string, number>;
  lookAt?: { x: number; y: number };
  followMouse?: boolean;
}

export interface AudioState {
  voiceBankId?: string;
  voiceClipId?: string;
}

export interface ActorState {
  mode?: 'normal' | 'live2d';
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

  /** 让角色说话，显示对话文本（自动支持 i18n 翻译） */
  say(text: string, opts?: { duration?: number; html?: boolean }) {
    // 尝试获取 i18n 翻译（同步方式）
    let finalText = text;
    let finalSpeaker = this.name;
    let voicePath: string | undefined;
    let ttsConfig: { provider?: 'browser' | 'openai' | 'azure' | 'google'; voiceId?: string; rate?: number; pitch?: number; volume?: number } | undefined;

    // 检查 i18n 模块是否已加载
    try {
      // 使用 require 同步获取（如果可用）或直接访问全局
      type I18nManager = {
        getTranslation: (keyOrText: string, params?: Record<string, unknown>) => { text: string; voice?: string; tts?: { provider?: 'browser' | 'openai' | 'azure' | 'google'; voiceId?: string; rate?: number; pitch?: number; volume?: number } | undefined };
      };
      const i18nModule = (window as unknown as { __i18n_manager__?: I18nManager }).__i18n_manager__;
      if (i18nModule) {
        // 翻译对话文本
        const translation = i18nModule.getTranslation(text);
        if (translation.text !== text) {
          finalText = translation.text;
        }
        voicePath = translation.voice;
        // 过滤掉 'custom' 类型（如果存在）
        if (translation.tts) {
          ttsConfig = translation.tts;
        }

        // 翻译角色名字（使用 @char: 前缀）
        const nameKey = `@char:${this.name}`;
        const nameTranslation = i18nModule.getTranslation(nameKey);
        if (nameTranslation.text !== nameKey) {
          finalSpeaker = nameTranslation.text;
        }
      }
    } catch {
      // i18n 未加载，使用原文
    }

    // 播放语音（异步，不阻塞对话显示）
    if (voicePath || ttsConfig) {
      void import('../render/CharacterAudioManager').then(({ characterAudioRegistry }) => {
        const charAudioManager = characterAudioRegistry.getOrCreate(this.name);
        if (voicePath) {
          // 使用角色的音频管理器播放预录制语音
          const audioUrl = `/assets/audio/voice/${voicePath}`;
          void charAudioManager.playVoice(audioUrl);
        } else if (ttsConfig) {
          // TTS 仍然使用 VoiceManager（暂时保留）
          void import('../i18n').then(({ getVoiceManager }) => {
            const voiceManager = getVoiceManager();
            void voiceManager.speakWithAPI(finalText, ttsConfig);
          });
        }
      });
    }

    const options = opts?.duration !== undefined ? { duration: opts.duration } : undefined;
    const action: ActorAction = {
      type: 'say',
      payload: { text: finalText, speaker: finalSpeaker, html: opts?.html, originalText: text, originalSpeaker: this.name }
    };
    if (options) action.options = options;
    return this.action(action);
  }

  /** 让角色说HTML格式的内容 */
  sayHtml(html: string, opts?: { duration?: number }) {
    return this.say(html, { ...opts, html: true });
  }

  /** 让角色说话，支持 i18n 和语音
   *
   * 使用方式：
   * - say('中文文本') - 使用中文作为键，自动查找对应语言的翻译
   * - say('scene.key') - 使用命名键查找翻译
   * - say('文本', { params: { name: 'xxx' } }) - 支持参数插值
   * - say('文本', { useVoice: false }) - 禁用语音
   */
  sayI18n(
    keyOrText: string,
    opts?: {
      duration?: number;
      html?: boolean;
      /** 翻译参数 */
      params?: Record<string, unknown>;
      /** 是否使用语音文件（默认根据 i18n 配置） */
      useVoice?: boolean;
      /** 强制指定语音文件路径 */
      voicePath?: string;
      /** TTS 配置覆盖 */
      tts?: { provider?: 'browser' | 'openai' | 'azure' | 'google'; voiceId?: string; rate?: number; pitch?: number; volume?: number };
    },
  ) {
    // 动态导入 i18n 功能
    void import('../i18n').then(({ getI18nManager, getVoiceManager }) => {
      const i18n = getI18nManager();
      const voiceManager = getVoiceManager();

      // 获取翻译
      const translation = i18n.getTranslation(keyOrText, opts?.params);

      // 处理语音播放
      if (opts?.useVoice !== false) {
        const voicePath = opts?.voicePath ?? translation.voice;
        const ttsConfig = opts?.tts ?? translation.tts;

        // 使用角色的音频管理器
        void import('../render/CharacterAudioManager').then(({ characterAudioRegistry }) => {
          const charAudioManager = characterAudioRegistry.getOrCreate(this.name);
          if (voicePath) {
            // 播放预录制的语音文件
            const audioUrl = `/assets/audio/voice/${voicePath}`;
            void charAudioManager.playVoice(audioUrl);
          } else if (ttsConfig) {
            // 使用 TTS（暂时保留 VoiceManager）
            void voiceManager.speakWithAPI(translation.text, ttsConfig);
          }
        });
      }

      // 执行原有的 say 逻辑
      const sayOpts: { duration?: number; html?: boolean } = {};
      if (opts?.duration !== undefined) sayOpts.duration = opts.duration;
      if (opts?.html !== undefined) sayOpts.html = opts.html;
      return this.say(translation.text, sayOpts);
    });

    // 返回一个 Promise，保持 API 一致性
    return Promise.resolve({ ok: true } as const);
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
    return this.action({ type: 'motion', payload: { actorId: this.id, id } });
  }

  /** 设置模式 */
  setMode(mode: 'normal' | 'live2d') {
    return this.action({ type: 'live2d', payload: { actorId: this.id, mode } });
  }

  /** 设置Live2D模型 */
  setLive2DModel(path: string) {
    return this.action({ type: 'live2d', payload: { actorId: this.id, model: path, mode: 'live2d' } });
  }

  /** 设置Live2D参数 */
  setParam(id: string, value: number) {
    return this.action({ type: 'live2d', payload: { actorId: this.id, params: { [id]: value } } });
  }

  /** 设置Live2D注视点（归一化坐标：x/y 推荐范围 -1..1 或 0..1） */
  lookAt(x: number, y: number) {
    return this.action({ type: 'live2d', payload: { actorId: this.id, lookAt: { x, y } } });
  }

  /** 是否由上下文驱动注视鼠标 */
  setFollowMouse(enabled: boolean) {
    return this.action({ type: 'live2d', payload: { actorId: this.id, followMouse: enabled } });
  }

  /** 自控模式下是否禁用表情系统 */
  setControlBanExpressions(enabled: boolean) {
    return this.action({ type: 'live2d', payload: { actorId: this.id, controlBanExpressions: enabled } });
  }

  setControlBanIdle(enabled: boolean) {
    return this.action({ type: 'live2d', payload: { actorId: this.id, controlBanIdle: enabled } });
  }

  setControlBanMotions(enabled: boolean) {
    return this.action({ type: 'live2d', payload: { actorId: this.id, controlBanMotions: enabled } });
  }

  setControlBanFocus(enabled: boolean) {
    return this.action({ type: 'live2d', payload: { actorId: this.id, controlBanFocus: enabled } });
  }

  setControlBanNatural(enabled: boolean) {
    return this.action({ type: 'live2d', payload: { actorId: this.id, controlBanNatural: enabled } });
  }

  setControlBanEyeBlink(enabled: boolean) {
    return this.action({ type: 'live2d', payload: { actorId: this.id, controlBanEyeBlink: enabled } });
  }

  setControlBanBreath(enabled: boolean) {
    return this.action({ type: 'live2d', payload: { actorId: this.id, controlBanBreath: enabled } });
  }

  setControlBanPhysics(enabled: boolean) {
    return this.action({ type: 'live2d', payload: { actorId: this.id, controlBanPhysics: enabled } });
  }

  setControlBanPose(enabled: boolean) {
    return this.action({ type: 'live2d', payload: { actorId: this.id, controlBanPose: enabled } });
  }

  /** 播放Live2D表情 */
  expression(id: string) {
    return this.action({ type: 'live2d', payload: { actorId: this.id, expressionId: id } });
  }

  /** 彻底析构角色，从引擎状态和绑定中移除所有相关数据 */
  async destroy() {
    // 清理 Runtime state 中的角色数据
    await this.action({ type: 'destroy', payload: { actorId: this.id } });
    // 清理 bindings 中的角色相关绑定
    await this.action({ type: 'clearActorBindings', payload: { actorId: this.id } });
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

  /** 彻底析构背景演员，从引擎状态中移除所有相关数据 */
  async destroy() {
    await this.action({ type: 'destroy', payload: { actorId: this.id } });
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

  /** 彻底析构音频演员，从引擎状态中移除所有相关数据 */
  async destroy() {
    await this.action({ type: 'destroy', payload: { actorId: this.id } });
  }
}

/** 路由导航回调类型 */
export type RouterNavigateCallback = (path: string) => void;

/** 路由回调注册表 */
let routerNavigateCallback: RouterNavigateCallback | null = null;

/** 注册路由导航回调（从 Vue 组件中调用） */
export function registerRouterNavigateCallback(callback: RouterNavigateCallback) {
  routerNavigateCallback = callback;
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

  /** 导航到主菜单（标题界面） */
  goToTitle() {
    if (routerNavigateCallback) {
      routerNavigateCallback('/title');
    }
  }

  /** 导航到启动动画界面 */
  goToSplash() {
    if (routerNavigateCallback) {
      routerNavigateCallback('/');
    }
  }

  /** 导航到结束动画界面 */
  goToEnd() {
    if (routerNavigateCallback) {
      routerNavigateCallback('/end');
    }
  }

  /** 导航到设置界面 */
  goToSettings() {
    if (routerNavigateCallback) {
      routerNavigateCallback('/settings');
    }
  }

  /** 导航到存读档界面 */
  goToSaves(mode?: 'save' | 'load') {
    if (routerNavigateCallback) {
      // 可以通过 query 参数传递模式（可选）
      routerNavigateCallback(mode ? `/saves?mode=${mode}` : '/saves');
    }
  }

  /** 完整的路由导航对象 */
  readonly nav = {
    /** 导航到主菜单（标题界面） */
    goToTitle: () => {
      if (routerNavigateCallback) routerNavigateCallback('/title');
    },
    /** 导航到启动动画界面 */
    goToSplash: () => {
      if (routerNavigateCallback) routerNavigateCallback('/');
    },
    /** 导航到结束动画界面 */
    goToEnd: () => {
      if (routerNavigateCallback) routerNavigateCallback('/end');
    },
    /** 导航到设置界面 */
    goToSettings: () => {
      if (routerNavigateCallback) routerNavigateCallback('/settings');
    },
    /** 导航到存读档界面 */
    goToSaves: (mode?: 'save' | 'load') => {
      if (routerNavigateCallback) routerNavigateCallback(mode ? `/saves?mode=${mode}` : '/saves');
    },
    /** 导航到游戏界面 */
    goToGame: () => {
      if (routerNavigateCallback) routerNavigateCallback('/demo');
    },
    /** 通用导航方法 */
    push: (path: string) => {
      if (routerNavigateCallback) routerNavigateCallback(path);
    },
  };
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
