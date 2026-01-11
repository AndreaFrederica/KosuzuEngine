export type ActionType =
  | 'say'
  | 'scene'
  | 'back'
  | 'wait'
  | 'show'
  | 'hide'
  | 'destroy'
  | 'clearActorBindings'
  | 'move'
  | 'emote'
  | 'pose'
  | 'motion'
  | 'fx'
  | 'bg'
  | 'bgm'
  | 'overlay'
  | 'stage'
  | 'var'
  | 'choice'
  | 'group'
  | 'end'
  | 'live2d';

export interface ActorAction<T = unknown> {
  type: ActionType;
  payload?: T;
  options?: {
    duration?: number;
    async?: boolean;
  };
}

export interface ActionResult<T = unknown> {
  ok: boolean;
  value?: T;
}
