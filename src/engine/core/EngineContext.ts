export interface DialogState {
  speaker?: string;
  text?: string;
  html?: boolean;
  /** 保存原始文本键，用于语言切换时重新翻译 */
  originalText?: string;
  /** 保存原始角色 ID，用于语言切换时重新翻译角色名 */
  originalSpeaker?: string;
}

export interface ChoiceItem {
  text: string;
  goto?: string;
}

export interface ChoiceState {
  items: ChoiceItem[];
  visible: boolean;
}

export interface HistoryEntry {
  speaker?: string;
  text?: string;
  html?: boolean;
  /** 保存原始文本键，用于语言切换时重新翻译 */
  originalText?: string;
  /** 保存原始角色 ID，用于语言切换时重新翻译角色名 */
  originalSpeaker?: string;
}

import type { TransformState, PoseState } from './BaseActor';
import type { BindingsRegistry } from './bindings';

export interface EngineState {
  dialog: DialogState;
  choice: ChoiceState;
  scene?: string;
  stage?: { width?: number; height?: number };
  bg?: { name?: string; effect?: string; duration?: number };
  bgm?: { name?: string; volume?: number; fadeDuration?: number };
  actors: Record<
    string,
    {
      name: string;
      kind: string;
      transform?: TransformState;
      pose?: PoseState;
      mode?: 'normal' | 'live2d';
      live2d?: {
        modelId?: string;
        expressionId?: string;
        motionId?: string;
        params?: Record<string, number>;
        lookAt?: { x: number; y: number };
        followMouse?: boolean;
      };
      transition?: { duration?: number; easing?: string };
      fx?: { name?: string; duration?: number; token?: number; params?: Record<string, unknown> };
    }
  >;
  actorIds?: string[];
  overlay?: { layer?: number };
  history: HistoryEntry[];
  vars?: Record<string, unknown>;
  bindings: BindingsRegistry;
}

export const initialEngineState: EngineState = {
  dialog: {},
  choice: { items: [], visible: false },
  stage: {},
  actors: {},
  actorIds: [],
  overlay: { layer: 100 },
  history: [],
  vars: {},
  bindings: {},
};

export type Reducer = (
  state: EngineState,
  action: { type: string; payload?: unknown; options?: { duration?: number; async?: boolean } },
) => EngineState;

export const reducer: Reducer = (state, action) => {
  if (action.type === 'choose') {
    const next: EngineState = { ...state };
    next.choice = { items: [], visible: false };
    next.dialog = { text: '', speaker: '' };
    return next;
  }
  if (action.type === 'say') {
    const payload = action.payload as { text: string; speaker?: string; html?: boolean; originalText?: string; originalSpeaker?: string };
    const nextDialog: DialogState = {};
    if (payload.text !== undefined) nextDialog.text = payload.text;
    if (payload.speaker !== undefined) nextDialog.speaker = payload.speaker;
    if (payload.html !== undefined) nextDialog.html = payload.html;
    if (payload.originalText !== undefined) nextDialog.originalText = payload.originalText;
    if (payload.originalSpeaker !== undefined) nextDialog.originalSpeaker = payload.originalSpeaker;
    const nextChoice: ChoiceState = { items: state.choice.items, visible: false };
    const entry: HistoryEntry = {};
    if (payload.text !== undefined) entry.text = payload.text;
    if (payload.speaker !== undefined) entry.speaker = payload.speaker;
    if (payload.html !== undefined) entry.html = payload.html;
    if (payload.originalText !== undefined) entry.originalText = payload.originalText;
    if (payload.originalSpeaker !== undefined) entry.originalSpeaker = payload.originalSpeaker;
    const nextHistory = [...state.history, entry];
    return { ...state, dialog: nextDialog, choice: nextChoice, history: nextHistory };
  }
  if (action.type === 'back') {
    const next = { ...state };
    if (next.history.length > 0) {
      const trimmed = next.history.slice(0, -1);
      next.history = trimmed;
      const last = trimmed[trimmed.length - 1];
      if (last) {
        const nd: DialogState = {};
        if (last.text !== undefined) nd.text = last.text;
        if (last.speaker !== undefined) nd.speaker = last.speaker;
        if (last.html !== undefined) nd.html = last.html;
        if (last.originalText !== undefined) nd.originalText = last.originalText;
        if (last.originalSpeaker !== undefined) nd.originalSpeaker = last.originalSpeaker;
        next.dialog = nd;
      } else {
        next.dialog = {};
      }
    }
    return next;
  }
  if (action.type === 'scene') {
    const payload = action.payload as { name?: string } | string | undefined;
    const next = { ...state };
    if (typeof payload === 'string') {
      next.scene = payload;
    } else if (payload && typeof payload === 'object') {
      if (payload.name !== undefined) next.scene = payload.name;
    }
    return next;
  }
  if (action.type === 'choice') {
    const items = (action.payload as ChoiceItem[]) || [];
    return { ...state, choice: { items, visible: true } };
  }
  if (action.type === 'bg') {
    const payload = action.payload as { name?: string; effect?: string; duration?: number };
    const nextBg: { name?: string; effect?: string; duration?: number } = {};
    if (payload?.name !== undefined) nextBg.name = payload.name;
    if (payload?.effect !== undefined) nextBg.effect = payload.effect;
    if (payload?.duration !== undefined) nextBg.duration = payload.duration;
    const nextState = { ...state };
    if (Object.keys(nextBg).length > 0) {
      nextState.bg = nextBg;
    } else {
      delete (nextState as Partial<EngineState>).bg;
    }
    return nextState as EngineState;
  }
  if (action.type === 'bgm') {
    const payload = action.payload as { name?: string; volume?: number; stop?: boolean };
    const fadeDuration = action.options?.duration;
    const nextState = { ...state };
    if (payload?.stop) {
      // 保存淡出时间
      if (fadeDuration !== undefined) {
        nextState.bgm = { fadeDuration };
      } else {
        delete (nextState as Partial<EngineState>).bgm;
      }
      return nextState as EngineState;
    }
    const nextName = payload?.name !== undefined ? payload.name : undefined;
    const nextVol = payload?.volume !== undefined ? payload.volume : undefined;
    const nextBgm: { name?: string; volume?: number; fadeDuration?: number } = {};
    if (nextName !== undefined) nextBgm.name = nextName;
    if (nextVol !== undefined) nextBgm.volume = nextVol;
    if (fadeDuration !== undefined) nextBgm.fadeDuration = fadeDuration;
    if (Object.keys(nextBgm).length > 0) {
      nextState.bgm = nextBgm;
    } else {
      delete (nextState as Partial<EngineState>).bgm;
    }
    return nextState as EngineState;
  }
  if (action.type === 'overlay') {
    const payload = action.payload as { layer?: number };
    const next = { ...state };
    next.overlay = next.overlay || {};
    if (payload?.layer !== undefined) next.overlay.layer = payload.layer;
    return next;
  }
  if (action.type === 'stage') {
    const payload = action.payload as { width?: number; height?: number };
    const next = { ...state };
    next.stage = next.stage || {};
    if (payload?.width !== undefined) next.stage.width = payload.width;
    if (payload?.height !== undefined) next.stage.height = payload.height;
    return next;
  }
  if (action.type === 'var') {
    const payload = action.payload as { key?: string; value?: unknown; remove?: boolean };
    const key = payload?.key;
    if (!key) return state;
    const next = { ...state };
    const vars = { ...(next.vars || {}) };
    if (payload?.remove) {
      delete (vars as Record<string, unknown>)[key];
    } else {
      vars[key] = payload.value;
    }
    next.vars = vars;
    return next;
  }
  if (
    action.type === 'show' ||
    action.type === 'move' ||
    action.type === 'hide' ||
    action.type === 'destroy' ||
    action.type === 'clearActorBindings' ||
    action.type === 'pose' ||
    action.type === 'motion' ||
    action.type === 'fx' ||
    action.type === 'live2d'
  ) {
    const next = { ...state };
    const nextActors = { ...(state.actors || {}) } as EngineState['actors'];
    const nextActorIds = (state.actorIds ?? []).slice();
    const transitionDuration = action.options?.duration;

    if (action.type === 'show') {
      const p = action.payload as {
        actorId: string;
        name: string;
        kind: string;
        transform?: TransformState;
      };
      const prevA = nextActors[p.actorId];
      const a = prevA ? { ...prevA } : { name: p.name, kind: p.kind };
      if (p.transform !== undefined) {
        a.transform = { ...p.transform };
      } else if (a.transform !== undefined) {
        delete (a as { transform?: TransformState }).transform;
      }
      if (transitionDuration !== undefined) {
        a.transition = { ...(a.transition || {}), duration: transitionDuration };
      } else if (a.transition !== undefined) {
        delete (a as { transition?: unknown }).transition;
      }
      nextActors[p.actorId] = a;
      if (!nextActorIds.includes(p.actorId)) nextActorIds.push(p.actorId);
    } else if (action.type === 'move') {
      const p = action.payload as { actorId: string; transform?: TransformState };
      const prevA = nextActors[p.actorId];
      if (prevA) {
        const a = { ...prevA };
        if (p.transform !== undefined) {
          a.transform = { ...p.transform };
        } else if (a.transform !== undefined) {
          delete (a as { transform?: TransformState }).transform;
        }
        if (transitionDuration !== undefined) {
          a.transition = { ...(a.transition || {}), duration: transitionDuration };
        } else if (a.transition !== undefined) {
          delete (a as { transition?: unknown }).transition;
        }
        nextActors[p.actorId] = a;
      }
    } else if (action.type === 'hide') {
      const p = action.payload as { actorId: string };
      delete (nextActors as Record<string, unknown>)[p.actorId];
      const idx = nextActorIds.indexOf(p.actorId);
      if (idx >= 0) nextActorIds.splice(idx, 1);
    } else if (action.type === 'destroy') {
      const p = action.payload as { actorId: string };
      // 从 actors 和 actorIds 中删除（与 hide 相同）
      delete (nextActors as Record<string, unknown>)[p.actorId];
      const idx = nextActorIds.indexOf(p.actorId);
      if (idx >= 0) nextActorIds.splice(idx, 1);
    } else if (action.type === 'clearActorBindings') {
      const p = action.payload as { actorId: string };
      const nextBindings = { ...(next.bindings || {}) };
      // 清理语音库绑定
      if (nextBindings.voiceBanks && p.actorId in (nextBindings.voiceBanks || {})) {
        delete (nextBindings.voiceBanks as Record<string, unknown>)[p.actorId];
      }
      // 清理 Sprite Atlas 绑定
      if (nextBindings.spriteAtlases && p.actorId in (nextBindings.spriteAtlases || {})) {
        delete (nextBindings.spriteAtlases as Record<string, unknown>)[p.actorId];
      }
      // 清理 Live2D 绑定
      if (nextBindings.live2d && p.actorId in (nextBindings.live2d || {})) {
        delete (nextBindings.live2d as Record<string, unknown>)[p.actorId];
      }
      next.bindings = nextBindings;
    } else if (action.type === 'pose') {
      const p = action.payload as { actorId: string; key: string };
      const prevA = nextActors[p.actorId];
      const a = prevA ? { ...prevA } : { name: '', kind: 'character' };
      a.pose = { emote: p.key };
      nextActors[p.actorId] = a;
      if (!nextActorIds.includes(p.actorId)) nextActorIds.push(p.actorId);
    } else if (action.type === 'motion') {
      const p = action.payload as { actorId: string; id: string };
      const prevA = nextActors[p.actorId];
      if (prevA) {
        const a = { ...prevA };
        const l2d = { ...(a.live2d || {}) };
        l2d.motionId = p.id;
        a.live2d = l2d;
        nextActors[p.actorId] = a;
      }
    } else if (action.type === 'live2d') {
      const p = action.payload as {
        actorId: string;
        model?: string;
        mode?: 'normal' | 'live2d';
        params?: Record<string, number>;
        lookAt?: { x: number; y: number };
        followMouse?: boolean;
      };
      const prevA = nextActors[p.actorId];
      if (prevA) {
        const a = { ...prevA };
        if (p.mode) a.mode = p.mode;
        const l2d = { ...(a.live2d || {}) };
        if (p.model) l2d.modelId = p.model;
        if (p.params) l2d.params = { ...(l2d.params || {}), ...p.params };
        if (p.lookAt) {
          const nx = (p.lookAt.x >= 0 && p.lookAt.x <= 1) ? (p.lookAt.x * 2 - 1) : p.lookAt.x;
          const ny = (p.lookAt.y >= 0 && p.lookAt.y <= 1) ? (p.lookAt.y * 2 - 1) : p.lookAt.y;
          const x = Math.max(-1, Math.min(1, nx));
          const y = Math.max(-1, Math.min(1, ny));
          l2d.lookAt = { x, y };
          const nextParams: Record<string, number> = {
            ParamEyeBallX: x,
            ParamEyeBallY: y,
            ParamAngleX: x * 30,
            ParamAngleY: y * 30,
            ParamBodyAngleX: x * 10,
          };
          l2d.params = { ...(l2d.params || {}), ...nextParams };
        }
        if (typeof p.followMouse === 'boolean') l2d.followMouse = p.followMouse;
        if (Object.keys(l2d).length > 0) a.live2d = l2d;
        nextActors[p.actorId] = a;
        if (!nextActorIds.includes(p.actorId)) nextActorIds.push(p.actorId);
      }
    } else if (action.type === 'fx') {
      const p = action.payload as { actorId: string; name: string; duration?: number; params?: Record<string, unknown> };
      const prevA = nextActors[p.actorId];
      if (prevA) {
        const a = { ...prevA };
        const prevFx = a.fx ?? {};
        const token = typeof prevFx.token === 'number' ? prevFx.token + 1 : 1;
        const nextFx: NonNullable<typeof a.fx> = { name: p.name, token };
        const d = p.duration ?? transitionDuration;
        if (d !== undefined) nextFx.duration = d;
        if (p.params !== undefined) nextFx.params = p.params;
        a.fx = nextFx;
        nextActors[p.actorId] = a;
      }
    }

    next.actors = nextActors;
    next.actorIds = nextActorIds;
    return next;
  }
  return state;
};

export const selectors = {
  dialog(state: EngineState) {
    return state.dialog;
  },
  choice(state: EngineState) {
    return state.choice;
  },
  background(state: EngineState) {
    return state.bg;
  },
  bgm(state: EngineState) {
    return state.bgm;
  },
};
