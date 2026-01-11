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
  hitAreas: string[];
  parameters: Live2DParameterSnapshot[];
  debug?: {
    controlMode?: 'default' | 'control';
    control?: {
      banExpressions?: boolean;
      banIdle?: boolean;
      banMotions?: boolean;
      banFocus?: boolean;
      banNatural?: boolean;
      banEyeBlink?: boolean;
      banBreath?: boolean;
      banPhysics?: boolean;
      banPose?: boolean;
    };
    motion?: { idleGroup?: string };
    expression?: {
      available?: boolean;
      present?: boolean;
      isFinished?: boolean;
      reserveIndex?: number;
      active?: boolean;
    };
  };
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
  setControlOptions?: (
    actorId: string,
    options: {
      banExpressions?: boolean;
      banIdle?: boolean;
      banMotions?: boolean;
      banFocus?: boolean;
      banNatural?: boolean;
      banEyeBlink?: boolean;
      banBreath?: boolean;
      banPhysics?: boolean;
      banPose?: boolean;
    },
  ) => void;
  playMotion(actorId: string, motionId: string): Promise<void>;
  playExpression?: (actorId: string, expressionId: string) => Promise<void>;

  inspect(actorId: string): Live2DInspection | null;
  snapshot(actorId: string): Live2DSnapshot | null;
}
