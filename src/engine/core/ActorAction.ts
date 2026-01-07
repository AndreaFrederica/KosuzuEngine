export type ActionType =
  | 'say'
  | 'scene'
  | 'back'
  | 'show'
  | 'hide'
  | 'move'
  | 'emote'
  | 'pose'
  | 'motion'
  | 'bg'
  | 'bgm'
  | 'overlay'
  | 'stage'
  | 'var'
  | 'choice'
  | 'group'
  | 'end';

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
