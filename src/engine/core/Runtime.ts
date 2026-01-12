import type { ActorAction, ActionResult } from './ActorAction';
import { initialEngineState, reducer, type EngineState, type HistoryEntry, type DialogState } from './EngineContext';
import type { BindingsRegistry, Live2DBinding, SpriteAtlasBinding, VoiceBankBinding, AudioMixerBinding, SayTargetBinding } from './bindings';
import {
  saveToIndexedDB,
  loadFromIndexedDB,
  listIndexedDBSaves,
  deleteFromIndexedDB,
  isIndexedDBAvailable,
  type SaveData,
} from '../storage/indexeddb';

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
  private replayMode: 'full' | 'fast' | null;
  private replayChoiceCursor: number;
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
  private sceneEntryVarsSnapshot: Record<string, unknown> | null;
  private readonly progressKey: string;
  private saveKeyPrefix: string;
  // 是否使用 IndexedDB 存储存档
  private useIndexedDB: boolean = false;
  // 开发模式回调，用于检查设置面板的开发模式开关
  private isDevModeCallback: () => boolean = () => import.meta.env?.DEV === true;
  // 恢复后的继续回调，用于在 hydrate 后等待用户点击继续
  private resumeCallback: (() => void | Promise<void>) | null = null;
  // 是否保存 action 历史（用于重放和调试）
  private saveActionHistory: boolean = true;
  private latestCheckpointTimer: ReturnType<typeof setTimeout> | null = null;

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
    this.replayMode = null;
    this.replayChoiceCursor = 0;
    this.replayHistory = null;
    this.choiceTrail = [];
    this.replayPlan = null;
    this.sceneEntryVarsSnapshot = null;
    this.progressKey = 'kosuzu_engine_progress';
    this.saveKeyPrefix = 'save:';
    // 默认不使用 IndexedDB，需要显式启用（因为某些客户端可能不支持）
    this.useIndexedDB = false;
  }

  reset(options?: { silent?: boolean }) {
    if (this.latestCheckpointTimer !== null) {
      clearTimeout(this.latestCheckpointTimer);
      this.latestCheckpointTimer = null;
    }
    this.state = { ...initialEngineState };
    this.pendingChoice = null;
    this.pendingSay = null;
    this.past = [];
    this.future = [];
    this.actionLog = [];
    this.replayTargetFrame = null;
    this.replayMode = null;
    this.replayChoiceCursor = 0;
    this.replayPlan = null;
    this.replayHistory = null;
    this.choiceTrail = [];
    this.sceneEntryVarsSnapshot = null;
    if (!options?.silent) {
      this.emit();
      this.persistProgress(0);
    }
  }

  replayToFrame(frame: number, mode: 'full' | 'fast' = 'full') {
    this.replayTargetFrame = Math.max(0, Math.floor(frame));
    this.replayMode = mode;
    this.replayChoiceCursor = 0;
  }

  /**
   * 快速跳转到目标帧（不执行脚本）
   * 直接基于保存的 history 恢复到目标帧的状态
   *
   * @param targetFrame - 目标帧数
   * @param savedHistory - 保存的完整历史记录
   * @param savedDialog - 保存的对话框状态
   */
  fastForwardToFrame(targetFrame: number, savedHistory: HistoryEntry[], savedDialog: DialogState) {
    console.log(`[Runtime.fastForwardToFrame] 快速跳转到帧 ${targetFrame}`);

    // 确保 targetFrame 在有效范围内
    const frame = Math.max(0, Math.min(Math.floor(targetFrame), savedHistory.length));

    // 截取 history 到目标帧
    this.state.history = savedHistory.slice(0, frame);

    // 恢复目标帧的对话框状态
    const entry = frame > 0 ? savedHistory[frame - 1] : undefined;
    if (entry) {
      const nextDialog: DialogState = {};
      if (entry.text !== undefined) nextDialog.text = entry.text;
      if (entry.speaker !== undefined) nextDialog.speaker = entry.speaker;
      if (entry.html !== undefined) nextDialog.html = entry.html;
      if (entry.originalText !== undefined) nextDialog.originalText = entry.originalText;
      if (entry.originalSpeaker !== undefined) nextDialog.originalSpeaker = entry.originalSpeaker;
      this.state.dialog = nextDialog;
    } else {
      this.state.dialog = { ...savedDialog };
    }

    // 清除重放标记
    this.replayTargetFrame = null;
    this.replayHistory = null;

    // 设置 pendingSay，等待用户点击后可以继续
    // 这使得用户点击"下一步"时 advance() 可以响应
    this.pendingSay = {
      resolve: (() => {
        // 用户点击后什么都不做，因为不执行后续脚本
        console.log('[Runtime.fastForwardToFrame] 用户点击继续（快速模式无后续操作）');
      }) as unknown as (value: ActionResult<void>) => void,
    };

    console.log(`[Runtime.fastForwardToFrame] 已恢复到帧 ${frame}，history 长度 = ${this.state.history.length}`);

    // 触发状态更新
    this.emit();
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
    const replayTarget = this.replayTargetFrame;
    const replayMode = this.replayMode;
    const replayPreTarget = replayTarget !== null && this.currentFrame() < replayTarget;
    const suppressEffects = replayPreTarget && replayMode === 'fast';

    if (effectiveAction.type === 'scene') {
      this.replayChoiceCursor = 0;
      if (this.replayTargetFrame === null) this.choiceTrail = [];
      const snapshot: Record<string, unknown> = this.state.vars ? JSON.parse(JSON.stringify(this.state.vars)) : {};
      this.sceneEntryVarsSnapshot = snapshot;
    }

    if (isRecordable && effectiveAction.type !== 'back' && !replayPreTarget) {
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
      if ((this.replayPlan && !replayIsLast) || replayPreTarget) {
        return Promise.resolve({ ok: true } as ActionResult<TResult>);
      }
      if (isRecordable && !suppressEffects) this.persistProgress(this.currentFrame());

      const msPayload = effectiveAction.payload as number | { ms?: number } | undefined;
      const ms =
        typeof msPayload === 'number'
          ? msPayload
          : typeof (msPayload as { ms?: number } | undefined)?.ms === 'number'
            ? (msPayload as { ms?: number }).ms!
            : effectiveAction.options?.duration ?? 0;
      // Dev 模式下重放时跳过等待，加快恢复速度
      // Fix: 只有在重放计划依然存在时才跳过（避免重放结束后的第一个指令被错误跳过）
      const waitMs = isSkipping && this.replayPlan ? 0 : Math.max(0, Math.floor(ms));
      return new Promise<ActionResult<TResult>>((resolve) => {
        setTimeout(() => resolve({ ok: true } as ActionResult<TResult>), waitMs);
      });
    }
    if (effectiveAction.type === 'choice') {
      if ((this.replayPlan && !replayIsLast) || replayPreTarget) {
        const picked = this.replayPlan
          ? (this.choiceTrail[this.replayPlan.choiceCursor] ?? '')
          : (this.choiceTrail[this.replayChoiceCursor] ?? '');
        if (this.replayPlan) this.replayPlan.choiceCursor += 1;
        else this.replayChoiceCursor += 1;
        this.state = reducer(this.state, {
          type: effectiveAction.type,
          payload: effectiveAction.payload,
          ...(effectiveAction.options ? { options: effectiveAction.options } : {}),
        });
        this.state = reducer(this.state, { type: 'choose' });
        if (!suppressEffects) {
          this.emit();
          if (isRecordable) this.persistProgress(this.currentFrame());
        }
        return Promise.resolve({ ok: true, value: picked } as ActionResult<TResult>);
      }

      this.state = reducer(this.state, {
        type: effectiveAction.type,
        payload: effectiveAction.payload,
        ...(effectiveAction.options ? { options: effectiveAction.options } : {}),
      });
      if (!suppressEffects) {
        this.emit();
        if (isRecordable) this.persistProgress(this.currentFrame());
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

      // 暂时禁用快速模式的"假 say"逻辑，测试是否是这里的bug
      // // 快速模式优化：假 say 命令 - 只增加帧计数，不触发 UI 更新
      // const isFastMode = this.replayTargetFrame !== null;
      // const currentFrameBeforeUpdate = this.currentFrame();
      // if (isFastMode && currentFrameBeforeUpdate < this.replayTargetFrame!) {
      //   console.log(`[say] 快速模式：当前帧=${currentFrameBeforeUpdate}，目标帧=${this.replayTargetFrame}，文本="${payload.text?.substring(0, 20)}"`);
      //   // 直接修改 state.history，不调用 reducer，不 emit，避免 UI 更新
      //   const entry: HistoryEntry = {};
      //   if (payload.text !== undefined) entry.text = payload.text;
      //   if (payload.speaker !== undefined) entry.speaker = payload.speaker;
      //   if (payload.html !== undefined) entry.html = payload.html;
      //   const nextDialog: DialogState = {};
      //   if (payload.text !== undefined) nextDialog.text = payload.text;
      //   if (payload.speaker !== undefined) nextDialog.speaker = payload.speaker;
      //   if (payload.html !== undefined) nextDialog.html = payload.html;
      //   this.state = {
      //     ...this.state,
      //     history: [...this.state.history, entry],
      //     dialog: nextDialog,
      //   };
      //   // 不调用 this.emit()，避免 UI 闪烁
      //   const frame = this.currentFrame();
      //   this.persistProgress(frame);

      //   // 检查是否到达目标帧
      //   if (frame >= this.replayTargetFrame!) {
      //     console.log(`[say] 快速模式：到达目标帧 ${frame}`);
      //     this.replayTargetFrame = null;
      //     this.replayHistory = null;
      //     // 到达目标帧后，触发一次 UI 更新显示当前对话框
      //     this.emit();
      //     return new Promise<ActionResult<TResult>>((resolve) => {
      //       this.pendingSay = { resolve: resolve as unknown as (value: ActionResult<void>) => void };
      //     });
      //   }
      //   // 未到目标帧，继续快速跳转
      //   return Promise.resolve({ ok: true } as ActionResult<TResult>);
      // }

      this.state = reducer(this.state, {
        type: effectiveAction.type,
        payload,
        ...(effectiveAction.options ? { options: effectiveAction.options } : {}),
      });
      const frame = this.currentFrame();
      const replayTargetAfter = this.replayTargetFrame;
      const replayModeAfter = this.replayMode;
      const replayPreTargetAfter = replayTargetAfter !== null && frame < replayTargetAfter;
      const suppressEffectsAfter = replayPreTargetAfter && replayModeAfter === 'fast';

      if (!suppressEffectsAfter) {
        this.emit();
        this.persistProgress(frame);
      }

      console.log(`[say] 执行完成，当前帧=${frame}，replayTargetFrame=${this.replayTargetFrame}`);

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
        console.log(`[say] 跳过等待（replayPlan）`);
        return Promise.resolve({ ok: true } as ActionResult<TResult>);
      }
      if (this.replayTargetFrame !== null && frame < this.replayTargetFrame) {
        console.log(`[say] 跳过等待（replayTargetFrame）当前帧=${frame} < ${this.replayTargetFrame}`);
        return Promise.resolve({ ok: true } as ActionResult<TResult>);
      }
      if (this.replayTargetFrame !== null && frame >= this.replayTargetFrame) {
        console.log(`[say] 到达目标帧，清除标记`);
        this.replayTargetFrame = null;
        this.replayHistory = null;
        this.replayMode = null;
        this.replayChoiceCursor = 0;
      }
      console.log(`[say] 等待用户点击，pendingSay 已设置`);
      return new Promise<ActionResult<TResult>>((resolve) => {
        this.pendingSay = { resolve: resolve as unknown as (value: ActionResult<void>) => void };
      });
    }
    this.state = reducer(this.state, {
      type: effectiveAction.type,
      payload: effectiveAction.payload,
      ...(effectiveAction.options ? { options: effectiveAction.options } : {}),
    });
    if (!suppressEffects) {
      this.emit();
      if (isRecordable) this.persistProgress(this.currentFrame());
    }
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
    console.log('[advance] 被调用，pendingSay =', this.pendingSay !== null, 'resumeCallback =', this.resumeCallback !== null);
    if (this.pendingSay !== null) {
      console.log('[advance] 解析 pendingSay');
      this.pendingSay.resolve({ ok: true });
      this.pendingSay = null;
    } else if (this.resumeCallback !== null) {
      // 如果没有 pendingSay 但有恢复回调，触发恢复回调
      const callback = this.resumeCallback;
      this.resumeCallback = null;
      void callback(); // 可能是 async 函数，使用 void 忽略 Promise
    }
  }

  /**
   * 设置一个"等待继续"的 Promise
   * 用于快速恢复后等待用户点击，然后触发脚本继续执行
   */
  waitForContinue(): Promise<ActionResult<void>> {
    return new Promise((resolve) => {
      this.pendingSay = { resolve: resolve as unknown as (value: ActionResult<void>) => void };
    });
  }

  /**
   * 从存档恢复运行时状态
   * TODO: 目前的实现会在 hydrate 后调用 emit()，这会导致视觉闪烁。
   *       这是为了方便开发时调试（能看到状态恢复的过程）。
   *       未来应该优化：在跳过重放模式时不调用 emit()，直接静默恢复状态。
   */
  hydrate(state: EngineState, options?: { clearHistory?: boolean; silent?: boolean }) {
    console.log('[Runtime.hydrate] 恢复状态快照:');
    console.log('[Runtime.hydrate] - scene:', state.scene);
    console.log('[Runtime.hydrate] - frame:', state.history?.length);
    console.log('[Runtime.hydrate] - clearHistory:', options?.clearHistory);
    console.log('[Runtime.hydrate] - actors:', state.actors);
    console.log('[Runtime.hydrate] - actorIds:', state.actorIds);
    console.log('[Runtime.hydrate] - bg:', state.bg);
    console.log('[Runtime.hydrate] - bgm:', state.bgm);
    console.log('[Runtime.hydrate] - 清空前 resumeCallback =', this.resumeCallback !== null);

    this.state = { ...state };
    // 如果需要清空 history（用于恢复后继续执行脚本）
    if (options?.clearHistory) {
      this.state.history = [];
      console.log('[Runtime.hydrate] history 已清空，currentFrame 重置为 0');
    }
    this.pendingChoice = null;
    this.pendingSay = null;
    this.past = [];
    this.future = [];
    this.actionLog = [];
    this.replayTargetFrame = null;
    this.replayMode = null;
    this.replayChoiceCursor = 0;
    this.replayPlan = null;
    this.replayHistory = null;
    this.choiceTrail = [];
    this.sceneEntryVarsSnapshot = null;
    this.resumeCallback = null;
    if (!options?.silent) {
      this.emit();
      this.persistProgress(this.currentFrame());
    }

    console.log('[Runtime.hydrate] 恢复完成，currentFrame =', this.currentFrame(), '，resumeCallback =', this.resumeCallback !== null);
  }

  // 设置恢复后的继续回调
  setResumeCallback(callback: (() => void | Promise<void>) | null) {
    console.log('[setResumeCallback] 被调用，callback =', callback !== null);
    this.resumeCallback = callback;
    console.log('[setResumeCallback] 设置后，resumeCallback =', this.resumeCallback !== null);
  }

  // 检查是否有恢复回调等待
  hasResumeCallback(): boolean {
    return this.resumeCallback !== null;
  }

  isRestoring() {
    return this.replayTargetFrame !== null;
  }

  setChoiceTrail(choices: string[] | null | undefined) {
    this.choiceTrail = Array.isArray(choices) ? choices.slice() : [];
  }

  getSceneEntryVarsSnapshot(): Record<string, unknown> | null {
    return this.sceneEntryVarsSnapshot ? { ...this.sceneEntryVarsSnapshot } : null;
  }

  async getSaveData(slot: string): Promise<SaveData | null> {
    if (this.useIndexedDB) {
      try {
        const saveData = await loadFromIndexedDB(slot);
        if (saveData) return saveData;
      } catch (e) {
        console.warn('IndexedDB load failed, trying localStorage:', e);
      }
    }
    const key = this.getSaveStorageKey(slot);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SaveData | EngineState;
    if (parsed && typeof parsed === 'object' && 'meta' in parsed && 'state' in parsed) return parsed;
    return { meta: { slot, time: Date.now() }, state: parsed as unknown } as SaveData;
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

  async save(slot?: string) {
    const scene = this.state.scene || '无名剧本';
    const text = this.state.dialog?.text || '';
    const time = Date.now();
    const defaultSlot = `${scene}_${new Date(time).toLocaleString()}`;
    const useSlot = slot && slot.trim().length > 0 ? slot : defaultSlot;

    // 调试：打印当前状态
    console.log('[Runtime.save] 当前状态快照:');
    console.log('[Runtime.save] - scene:', scene);
    console.log('[Runtime.save] - frame:', this.currentFrame());
    console.log('[Runtime.save] - actors:', this.state.actors);
    console.log('[Runtime.save] - actorIds:', this.state.actorIds);
    console.log('[Runtime.save] - bg:', this.state.bg);
    console.log('[Runtime.save] - bgm:', this.state.bgm);

    const entryVars: Record<string, unknown> =
      this.sceneEntryVarsSnapshot ?? (this.state.vars ? JSON.parse(JSON.stringify(this.state.vars)) : {});
    const saveData: SaveData = {
      meta: { scene, text, time, slot: useSlot, frame: this.currentFrame() },
      state: this.state,
      entryVars,
      // 不保存 actions，以便支持热重载（所有恢复模式都不需要 actions）
      // actions: this.actionLog,
      choices: this.choiceTrail.slice(),
    };

    if (this.useIndexedDB) {
      try {
        await saveToIndexedDB(saveData);
      } catch (e) {
        console.warn('IndexedDB save failed, falling back to localStorage:', e);
        // 降级到 localStorage
        const key = this.getSaveStorageKey(useSlot);
        localStorage.setItem(key, JSON.stringify(saveData));
      }
    } else {
      const key = this.getSaveStorageKey(useSlot);
      localStorage.setItem(key, JSON.stringify(saveData));
    }
    return { ok: true } as ActionResult<void>;
  }

  async load(slot: string) {
    if (this.useIndexedDB) {
      try {
        const saveData = await loadFromIndexedDB(slot);
        if (saveData) {
          if (saveData.state) {
            this.hydrate(saveData.state as EngineState);
            if (Array.isArray(saveData.choices)) this.choiceTrail = saveData.choices.slice();
            if (saveData.entryVars && typeof saveData.entryVars === 'object') {
              this.sceneEntryVarsSnapshot = saveData.entryVars;
            }
            this.persistProgress(this.currentFrame());
          }
          return { ok: true } as ActionResult<void>;
        }
      } catch (e) {
        console.warn('IndexedDB load failed, trying localStorage:', e);
      }
    }

    // 降级到 localStorage
    const key = this.getSaveStorageKey(slot);
    const raw = localStorage.getItem(key);
    if (!raw) return { ok: false, error: 'missing_save' } as ActionResult<void>;
    const parsed = JSON.parse(raw) as
      | { meta?: unknown; state?: EngineState; actions?: ActorAction<unknown>[]; choices?: string[]; entryVars?: unknown }
      | EngineState;
    if (parsed && typeof parsed === 'object' && 'state' in parsed && parsed.state) {
      this.hydrate(parsed.state);
      if (Array.isArray(parsed.choices)) this.choiceTrail = parsed.choices.slice();
      if (parsed.entryVars && typeof parsed.entryVars === 'object') this.sceneEntryVarsSnapshot = parsed.entryVars as Record<string, unknown>;
      this.persistProgress(this.currentFrame());
    } else {
      this.hydrate(parsed as EngineState);
    }
    return { ok: true } as ActionResult<void>;
  }

  async listSaves(): Promise<Array<{ slot: string; scene?: string; text?: string; time?: number }>> {
    if (this.useIndexedDB) {
      try {
        const indexedDBSaves = await listIndexedDBSaves();
        return indexedDBSaves
          .filter((meta) => meta.slot !== '__latest__')
          .map((meta): { slot: string; scene?: string; text?: string; time?: number } => ({
            slot: meta.slot,
            ...(meta.scene !== undefined && { scene: meta.scene }),
            ...(meta.text !== undefined && { text: meta.text }),
            ...(meta.time !== undefined && { time: meta.time }),
          }));
      } catch (e) {
        console.warn('IndexedDB list failed, using localStorage:', e);
      }
    }

    // 降级到 localStorage
    const slotNames: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || '';
      if (k.startsWith(this.saveKeyPrefix)) slotNames.push(k.substring(this.saveKeyPrefix.length));
    }
    return slotNames
      .filter((slot) => slot !== '__latest__')
      .map((slot): { slot: string; scene?: string; text?: string; time?: number } => {
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

  async deleteSave(slot: string) {
    if (this.useIndexedDB) {
      try {
        await deleteFromIndexedDB(slot);
        return { ok: true } as ActionResult<void>;
      } catch (e) {
        console.warn('IndexedDB delete failed, trying localStorage:', e);
      }
    }

    // 降级到 localStorage
    const key = this.getSaveStorageKey(slot);
    localStorage.removeItem(key);
    return { ok: true } as ActionResult<void>;
  }

  /** 设置是否使用 IndexedDB */
  setUseIndexedDB(use: boolean) {
    this.useIndexedDB = use && isIndexedDBAvailable();
  }

  /** 检查是否正在使用 IndexedDB */
  isUsingIndexedDB(): boolean {
    return this.useIndexedDB;
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
      choices: this.choiceTrail,
      entryVars: this.sceneEntryVarsSnapshot ?? this.state.vars ?? {},
    });
    localStorage.setItem(this.progressKey, payload);
    this.scheduleLatestCheckpoint();
  }

  private scheduleLatestCheckpoint() {
    if (this.latestCheckpointTimer !== null) clearTimeout(this.latestCheckpointTimer);
    this.latestCheckpointTimer = setTimeout(() => {
      this.latestCheckpointTimer = null;
      void this.saveLatestCheckpoint();
    }, 1500);
  }

  private async saveLatestCheckpoint() {
    const scene = this.state.scene;
    if (!scene) return;
    const slot = '__latest__';
    const time = Date.now();
    const text = this.state.dialog?.text || '';
    const entryVars: Record<string, unknown> =
      this.sceneEntryVarsSnapshot ?? (this.state.vars ? JSON.parse(JSON.stringify(this.state.vars)) : {});
    const stateSnapshot = JSON.parse(JSON.stringify(this.state)) as EngineState;
    const saveData: SaveData = {
      meta: { scene, text, time, slot, frame: this.currentFrame() },
      state: stateSnapshot,
      entryVars,
      choices: this.choiceTrail.slice(),
    };

    if (this.useIndexedDB) {
      try {
        await saveToIndexedDB(saveData);
        return;
      } catch {
        const key = this.getSaveStorageKey(slot);
        localStorage.setItem(key, JSON.stringify(saveData));
        return;
      }
    }

    const key = this.getSaveStorageKey(slot);
    localStorage.setItem(key, JSON.stringify(saveData));
  }
}

export const defaultRuntime = new Runtime();
