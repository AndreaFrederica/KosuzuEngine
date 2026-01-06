export type ActionType =
  | 'say'
  | 'show'
  | 'hide'
  | 'move'
  | 'emote'
  | 'pose'
  | 'motion'
  | 'bg'
  | 'bgm'
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

