import { defineStore } from 'pinia';
import { reactive } from 'vue';
import { defaultRuntime } from '../engine/core/Runtime';
import { initialEngineState, selectors, type EngineState } from '../engine/core/EngineContext';
import type { ActionType } from '../engine/core/ActorAction';

export const useEngineStore = defineStore('engine', () => {
  const runtime = defaultRuntime;
  const state = reactive<EngineState>({ ...initialEngineState });

  runtime.addListener((s: EngineState) => {
    Object.assign(state, s);
  });

  function dispatch(type: ActionType, payload?: unknown) {
    return runtime.dispatch({ type, payload });
  }

  function choose(goto?: string) {
    runtime.choose(goto);
  }

  function advance() {
    runtime.advance();
  }

  return {
    state,
    dialog: () => selectors.dialog(state),
    choice: () => selectors.choice(state),
    background: () => selectors.background(state),
    bgm: () => selectors.bgm(state),
    dispatch,
    choose,
    advance,
  };
});
