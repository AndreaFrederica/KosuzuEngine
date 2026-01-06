export interface DialogState {
  speaker?: string;
  text?: string;
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
}

import type { TransformState, PoseState } from './BaseActor';
import type { BindingsRegistry } from './bindings';

export interface EngineState {
  dialog: DialogState;
  choice: ChoiceState;
  scene?: string;
  bg?: { name?: string };
  bgm?: { name?: string; volume?: number };
  actors: Record<string, { name: string; kind: string; transform?: TransformState; pose?: PoseState }>;
  actorIds?: string[];
  overlay?: { layer?: number };
  history: HistoryEntry[];
  bindings: BindingsRegistry;
}

export const initialEngineState: EngineState = {
  dialog: {},
  choice: { items: [], visible: false },
  actors: {},
  actorIds: [],
  overlay: { layer: 100 },
  history: [],
  bindings: {},
};

export type Reducer = (state: EngineState, action: { type: string; payload?: unknown }) => EngineState;

export const reducer: Reducer = (state, action) => {
  if (action.type === 'say') {
    const payload = action.payload as { text: string; speaker?: string };
    const nextDialog: DialogState = {};
    if (payload.text !== undefined) nextDialog.text = payload.text;
    if (payload.speaker !== undefined) nextDialog.speaker = payload.speaker;
    const nextChoice: ChoiceState = { items: state.choice.items, visible: false };
    const entry: HistoryEntry = {};
    if (payload.text !== undefined) entry.text = payload.text;
    if (payload.speaker !== undefined) entry.speaker = payload.speaker;
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
    const payload = action.payload as { name?: string };
    const nextBg = payload?.name !== undefined ? { name: payload.name } : undefined;
    const nextState = { ...state };
    if (nextBg !== undefined) {
      nextState.bg = nextBg;
    } else {
      delete (nextState as Partial<EngineState>).bg;
    }
    return nextState as EngineState;
  }
  if (action.type === 'bgm') {
    const payload = action.payload as { name?: string; volume?: number; stop?: boolean };
    const nextState = { ...state };
    if (payload?.stop) {
      delete (nextState as Partial<EngineState>).bgm;
      return nextState as EngineState;
    }
    const nextName = payload?.name !== undefined ? payload.name : undefined;
    const nextVol = payload?.volume !== undefined ? payload.volume : undefined;
    const nextBgm: { name?: string; volume?: number } = {};
    if (nextName !== undefined) nextBgm.name = nextName;
    if (nextVol !== undefined) nextBgm.volume = nextVol;
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
  if (action.type === 'show' || action.type === 'move' || action.type === 'hide' || action.type === 'pose' || action.type === 'motion') {
    const next = { ...state };
    if (action.type === 'show') {
      const p = action.payload as { actorId: string; name: string; kind: string; transform?: TransformState };
      const a = next.actors[p.actorId] ?? { name: p.name, kind: p.kind };
      if (p.transform !== undefined) {
        a.transform = p.transform;
      } else {
        if ('transform' in a) delete (a as { transform?: TransformState }).transform;
      }
      next.actors[p.actorId] = a;
      const ids = (next.actorIds ?? []).slice();
      if (!ids.includes(p.actorId)) ids.push(p.actorId);
      next.actorIds = ids;
    } else if (action.type === 'move') {
      const p = action.payload as { actorId: string; transform?: TransformState };
      const a = next.actors[p.actorId];
      if (a) {
        if (p.transform !== undefined) {
          a.transform = p.transform;
        } else {
          if ('transform' in a) delete (a as { transform?: TransformState }).transform;
        }
      }
    } else if (action.type === 'hide') {
      const p = action.payload as { actorId: string };
      const rest = { ...next.actors };
      delete (rest as Record<string, unknown>)[p.actorId];
      next.actors = rest as typeof next.actors;
      const ids = (next.actorIds ?? []).filter((x) => x !== p.actorId);
      next.actorIds = ids;
    } else if (action.type === 'pose') {
      const p = action.payload as { actorId: string; key: string };
      const a = next.actors[p.actorId] ?? { name: '', kind: 'character' };
      a.pose = { emote: p.key };
      next.actors[p.actorId] = a;
    }
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
