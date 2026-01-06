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

import type { TransformState, PoseState } from './BaseActor';

export interface EngineState {
  dialog: DialogState;
  choice: ChoiceState;
  bg?: { name?: string };
  bgm?: { name?: string; volume?: number };
  actors: Record<string, { name: string; kind: string; transform?: TransformState; pose?: PoseState }>;
  history: unknown[];
  bindings: Record<string, unknown>;
}

export const initialEngineState: EngineState = {
  dialog: {},
  choice: { items: [], visible: false },
  actors: {},
  history: [],
  bindings: {},
};

export type Reducer = (state: EngineState, action: { type: string; payload?: unknown }) => EngineState;

export const reducer: Reducer = (state, action) => {
  if (action.type === 'say') {
    const payload = action.payload as { text: string; speaker?: string };
    const nextDialog: DialogState = { text: payload.text };
    if (payload.speaker !== undefined) nextDialog.speaker = payload.speaker;
    const nextChoice: ChoiceState = { items: state.choice.items, visible: false };
    return { ...state, dialog: nextDialog, choice: nextChoice };
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
  if (action.type === 'show' || action.type === 'move' || action.type === 'hide' || action.type === 'pose' || action.type === 'motion') {
    return state;
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
