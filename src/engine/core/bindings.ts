export interface SayTargetBinding {
  dialogId?: string;
}

export interface VoiceBankBinding {
  actorId: string;
  bankId: string;
}

export interface SpriteAtlasBinding {
  actorId: string;
  atlasId: string;
  mapping: Record<string, string>;
}

export interface Live2DBinding {
  actorId: string;
  modelId: string;
  motions?: Record<string, string>;
  expressions?: Record<string, string>;
}

export interface AudioMixerBinding {
  bgmChannel?: string;
  seChannel?: string;
  defaultFade?: number;
}

export interface BindingsRegistry {
  sayTarget?: SayTargetBinding;
  voiceBanks?: Record<string, VoiceBankBinding>;
  spriteAtlases?: Record<string, SpriteAtlasBinding>;
  live2d?: Record<string, Live2DBinding>;
  audioMixer?: AudioMixerBinding;
}

