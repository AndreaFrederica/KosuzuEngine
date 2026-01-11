import type { TransformState } from '../core/BaseActor';

export type Live2DSource = string | File[];

export type Live2DBackendInit = {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
};

export type Live2DParameterSnapshot = {
  id: string;
  value: number;
  min?: number;
  max?: number;
};

export type Live2DDrawableSnapshot = {
  index: number;
  id?: string;
  renderOrder?: number;
  opacity?: number;
  visible?: boolean;
};

export type Live2DInspection = {
  motions: string[];
  expressions: string[];
  parameters: Live2DParameterSnapshot[];
};

export type Live2DSnapshot = {
  ts: number;
  parameters: Live2DParameterSnapshot[];
  drawables: Live2DDrawableSnapshot[];
};

export interface ILive2DBackend {
  init(input: Live2DBackendInit): void;
  resize(width: number, height: number): void;

  registerSource(actorId: string, source: Live2DSource): void;
  load(actorId: string, source?: Live2DSource): Promise<void>;
  unload(actorId: string): void;

  setTransform(actorId: string, transform?: TransformState): void;
  setParams(actorId: string, params: Record<string, number>): void;
  playMotion(actorId: string, motionId: string): Promise<void>;

  inspect(actorId: string): Live2DInspection | null;
  snapshot(actorId: string): Live2DSnapshot | null;
}

