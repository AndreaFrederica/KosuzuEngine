import type { ActorAction, ActionResult } from './ActorAction';
import { initialEngineState, reducer, type EngineState, type HistoryEntry } from './EngineContext';
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
  private replayHistory: HistoryEntry[] | null;
  private choiceTrail: string[];
  private replayPlan:
    | {
      actions: ActorAction<unknown>[];
      cursor: number;
      choices: string[];
      choiceCursor: number;
      targetFrame: number;
    }
    | null;
  private readonly progressKey: string;
  private saveKeyPrefix: string;
  // 开发模式回调，用于检查设置面板的开发模式开关
  private isDevModeCallback: () => boolean = () => import.meta.env?.DEV === true;
  // 恢复后的继续回调，用于在 hydrate 后等待用户点击继续
  private resumeCallback: (() => void) | null = null;

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
    this.replayHistory = null;
    this.choiceTrail = [];
    this.replayPlan = null;
    this.progressKey = 'kosuzu_engine_progress';
    this.saveKeyPrefix = 'save:';
  }

  reset() {
    this.state = { ...initialEngineState };
    this.pendingChoice = null;
    this.pendingSay = null;
    this.past = [];
    this.future = [];
    this.actionLog = [];
    this.replayTargetFrame = null;
    this.replayPlan = null;
    this.replayHistory = null;
    this.choiceTrail = [];
    this.emit();
    this.persistProgress(0);
  }

  replayToFrame(frame: number) {
    this.replayTargetFrame = Math.max(0, Math.floor(frame));
  }

  beginReplay(plan: { actions: ActorAction<unknown>[]; choices?: string[]; targetFrame?: number }) {
    const filtered = plan.actions.filter((a) => this.shouldRecordAction(a.type));
    this.replayPlan = {
      actions: filtered,
      cursor: 0,
      choices: plan.choices || [],
      choiceCursor: 0,
      targetFrame: plan.targetFrame ?? 0,
    };
    this.actionLog = filtered.slice();
    this.choiceTrail = (plan.choices || []).slice();
  }

  private shouldRecordAction(type: string) {
    return type !== 'stage';
  }

  setReplayHistory(history: HistoryEntry[] | null | undefined) {
    if (!history || history.length === 0) {
      this.replayHistory = null;
      return;
    }
    this.replayHistory = history.map((h) => {
      const entry: HistoryEntry = {};
      if (h.speaker !== undefined) entry.speaker = h.speaker;
      if (h.text !== undefined) entry.text = h.text;
      if (h.html !== undefined) entry.html = h.html;
      return entry;
    });
  }

  dispatch<TResult = unknown>(action: ActorAction<unknown>): Promise<ActionResult<TResult>> {
    const isRecordable = this.shouldRecordAction(action.type);
    let effectiveAction = action;
    let replayIsLast = false;
    const plan = this.replayPlan;

    // Dev 模式下重放时跳过动画，加快恢复速度（使用回调检查设置面板的开发模式开关）
    const isSkipping = this.isDevModeCallback() && this.replayTargetFrame !== null;
    if (isSkipping && effectiveAction.options?.duration !== undefined) {
      // 移除 duration 选项以跳过动画
      effectiveAction = {
        ...effectiveAction,
        options: { ...effectiveAction.options, duration: 0 },
      };
    }
    if (plan && isRecordable) {
      const expected = plan.actions[plan.cursor];
      if (expected) {
        // 只用于判断是否还在重放范围内，不替换 payload
        // 这样热重载时可以使用新脚本的最新内容
        replayIsLast = plan.cursor >= plan.actions.length - 1;
        plan.cursor += 1;
      } else {
        this.replayPlan = null;
      }
    }
    if (import.meta.env?.DEV) {

      console.log('dispatch', effectiveAction.type, effectiveAction.payload);
    }
    if (isRecordable && effectiveAction.type !== 'back') {
      const snapshot = JSON.parse(JSON.stringify(this.state)) as EngineState;
      this.past.push(snapshot);
      if (this.past.length > this.maxPast) this.past.shift();
      this.future = [];
      // 暂时禁用 actions 的保存，以便调试热重载问题
      // if (!this.replayPlan) {
      //   this.actionLog.push({
      //     type: effectiveAction.type,
      //     payload: effectiveAction.payload,
      //     options: effectiveAction.options,
      //   } as ActorAction<unknown>);
      // }
    }
    if (effectiveAction.type === 'wait') {
      if (this.replayPlan && !replayIsLast) {
        return Promise.resolve({ ok: true } as ActionResult<TResult>);
      }
      if (isRecordable) this.persistProgress(this.currentFrame());

      const msPayload = effectiveAction.payload as number | { ms?: number } | undefined;
      const ms =
        typeof msPayload === 'number'
          ? msPayload
          : typeof (msPayload as { ms?: number } | undefined)?.ms === 'number'
            ? (msPayload as { ms?: number }).ms!
            : effectiveAction.options?.duration ?? 0;
      // Dev 模式下重放时跳过等待，加快恢复速度
      const waitMs = isSkipping ? 0 : Math.max(0, Math.floor(ms));
      return new Promise<ActionResult<TResult>>((resolve) => {
        setTimeout(() => resolve({ ok: true } as ActionResult<TResult>), waitMs);
      });
    }
    if (effectiveAction.type === 'choice') {
      this.state = reducer(this.state, {
        type: effectiveAction.type,
        payload: effectiveAction.payload,
        ...(effectiveAction.options ? { options: effectiveAction.options } : {}),
      });
      this.emit();
      if (isRecordable) this.persistProgress(this.currentFrame());
      if (this.replayPlan && !replayIsLast) {
        const picked = this.choiceTrail[this.replayPlan.choiceCursor] ?? '';
        this.replayPlan.choiceCursor += 1;
        this.state = reducer(this.state, { type: 'choose' });
        this.emit();
        return Promise.resolve({ ok: true, value: picked } as ActionResult<TResult>);
      }
      return new Promise<ActionResult<TResult>>((resolve) => {
        this.pendingChoice = { resolve: resolve as unknown as (value: ActionResult<string>) => void };
      });
    }
    if (effectiveAction.type === 'say') {
      const sayIndex = this.state.history?.length ?? 0;
      let payload = effectiveAction.payload as { text: string; speaker?: string; html?: boolean };
      if (this.replayTargetFrame !== null && this.replayHistory && sayIndex < this.replayHistory.length) {
        const h = this.replayHistory[sayIndex] || {};
        const nextPayload: { text: string; speaker?: string; html?: boolean } = { text: h.text ?? payload.text };
        const speaker = h.speaker ?? payload.speaker;
        const html = h.html ?? payload.html;
        if (speaker !== undefined) nextPayload.speaker = speaker;
        if (html !== undefined) nextPayload.html = html;
        payload = nextPayload;
      }
      this.state = reducer(this.state, {
        type: effectiveAction.type,
        payload,
        ...(effectiveAction.options ? { options: effectiveAction.options } : {}),
      });
      this.emit();
      const frame = this.currentFrame();
      this.persistProgress(frame);

      // 检查是否在重放模式且未到达目标帧
      let shouldSkip = false;
      if (this.replayPlan && !replayIsLast) {
        // 检查当前 frame 是否还未达到目标帧
        if (this.replayPlan.targetFrame === 0 || frame < this.replayPlan.targetFrame) {
          shouldSkip = true;
        } else {
          // 已达到或超过目标帧，停止重放
          this.replayPlan = null;
        }
      }

      if (shouldSkip) {
        return Promise.resolve({ ok: true } as ActionResult<TResult>);
      }
      if (this.replayTargetFrame !== null && frame < this.replayTargetFrame) {
        return Promise.resolve({ ok: true } as ActionResult<TResult>);
      }
      if (this.replayTargetFrame !== null && frame >= this.replayTargetFrame) {
        this.replayTargetFrame = null;
        this.replayHistory = null;
      }
      return new Promise<ActionResult<TResult>>((resolve) => {
        this.pendingSay = { resolve: resolve as unknown as (value: ActionResult<void>) => void };
      });
    }
    this.state = reducer(this.state, {
      type: effectiveAction.type,
      payload: effectiveAction.payload,
      ...(effectiveAction.options ? { options: effectiveAction.options } : {}),
    });
    this.emit();
    if (isRecordable) this.persistProgress(this.currentFrame());
    return Promise.resolve({ ok: true } as ActionResult<TResult>);
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
    this.state = reducer(this.state, { type: 'choose' });
    this.emit();
    if (this.pendingChoice !== null) {
      this.choiceTrail.push(goto);
      this.pendingChoice.resolve({ ok: true, value: goto });
      this.pendingChoice = null;
      this.persistProgress(this.currentFrame());
    }
  }

  advance() {
    if (this.pendingSay !== null) {
      this.pendingSay.resolve({ ok: true });
      this.pendingSay = null;
    } else if (this.resumeCallback !== null) {
      // 如果没有 pendingSay 但有恢复回调，触发恢复回调
      const callback = this.resumeCallback;
      this.resumeCallback = null;
      callback();
    }
  }

  /**
   * 从存档恢复运行时状态
   * TODO: 目前的实现会在 hydrate 后调用 emit()，这会导致视觉闪烁。
   *       这是为了方便开发时调试（能看到状态恢复的过程）。
   *       未来应该优化：在跳过重放模式时不调用 emit()，直接静默恢复状态。
   */
  hydrate(state: EngineState) {
    this.state = { ...state };
    this.pendingChoice = null;
    this.pendingSay = null;
    this.past = [];
    this.future = [];
    this.actionLog = [];
    this.replayTargetFrame = null;
    this.replayPlan = null;
    this.replayHistory = null;
    this.choiceTrail = [];
    this.resumeCallback = null;
    this.emit();
    this.persistProgress(this.currentFrame());
  }

  // 设置恢复后的继续回调
  setResumeCallback(callback: (() => void) | null) {
    this.resumeCallback = callback;
  }

  // 检查是否有恢复回调等待
  hasResumeCallback(): boolean {
    return this.resumeCallback !== null;
  }

  isRestoring() {
    return this.replayTargetFrame !== null;
  }

  // 设置开发模式检查回调，用于检查设置面板的开发模式开关
  setDevModeCallback(callback: () => boolean) {
    this.isDevModeCallback = callback;
  }

  setSaveKeyPrefix(prefix: string) {
    this.saveKeyPrefix = prefix && prefix.length > 0 ? prefix : 'save:';
  }

  getSaveStorageKey(slot: string) {
    return `${this.saveKeyPrefix}${slot}`;
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
      next = reducer(next, {
        type: a.type,
        payload: a.payload,
        ...(a.options ? { options: a.options } : {}),
      });
    }
    return next;
  }

  save(slot?: string) {
    const scene = this.state.scene || '无名剧本';
    const text = this.state.dialog?.text || '';
    const time = Date.now();
    const defaultSlot = `${scene}_${new Date(time).toLocaleString()}`;
    const useSlot = slot && slot.trim().length > 0 ? slot : defaultSlot;
    const key = this.getSaveStorageKey(useSlot);
    const snapshot = JSON.stringify({
      meta: { scene, text, time, slot: useSlot, frame: this.currentFrame() },
      state: this.state,
      actions: this.actionLog,
      choices: this.choiceTrail,
    });
    localStorage.setItem(key, snapshot);
    return { ok: true } as ActionResult<void>;
  }

  load(slot: string) {
    const key = this.getSaveStorageKey(slot);
    const raw = localStorage.getItem(key);
    if (!raw) return { ok: false, error: 'missing_save' } as ActionResult<void>;
    const parsed = JSON.parse(raw) as
      | { meta?: unknown; state?: EngineState; actions?: ActorAction<unknown>[]; choices?: string[] }
      | EngineState;
    if (parsed && typeof parsed === 'object' && 'state' in parsed && parsed.state) {
      this.hydrate(parsed.state);
      if (Array.isArray(parsed.actions)) this.actionLog = parsed.actions.slice();
      if (Array.isArray(parsed.choices)) this.choiceTrail = parsed.choices.slice();
      this.persistProgress(this.currentFrame());
    } else {
      this.hydrate(parsed as EngineState);
    }
    return { ok: true } as ActionResult<void>;
  }

  listSaves(): Array<{ slot: string; scene?: string; text?: string; time?: number }> {
    const slotNames: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || '';
      if (k.startsWith(this.saveKeyPrefix)) slotNames.push(k.substring(this.saveKeyPrefix.length));
    }
    return slotNames
      .map((slot) => {
        const raw = localStorage.getItem(this.getSaveStorageKey(slot));
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

  deleteSave(slot: string) {
    const key = this.getSaveStorageKey(slot);
    localStorage.removeItem(key);
    return { ok: true } as ActionResult<void>;
  }

  private currentFrame() {
    return this.state.history?.length ?? 0;
  }

  private persistProgress(frame: number) {
    const scene = this.state.scene;
    if (!scene) return;
    // 暂时禁用 actions 的保存，以便调试热重载问题
    const payload = JSON.stringify({
      scene,
      frame,
      time: Date.now(),
      // actions: this.actionLog,
      // choices: this.choiceTrail,
    });
    localStorage.setItem(this.progressKey, payload);
  }
}

export const defaultRuntime = new Runtime();
