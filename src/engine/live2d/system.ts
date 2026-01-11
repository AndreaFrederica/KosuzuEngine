import type { TransformState } from '../core/BaseActor';
import type { EngineState } from '../core/EngineContext';
import type { ILive2DBackend, Live2DInspection, Live2DSnapshot } from './backend';

type ActorEntry = EngineState['actors'][string];

type PrevActorState = {
  modelId?: string;
  transformKey?: string;
  params?: Record<string, number>;
  motionId?: string;
  controlBanExpressions?: boolean;
  expressionId?: string;
  controlBanIdle?: boolean;
  controlBanMotions?: boolean;
  controlBanFocus?: boolean;
  controlBanNatural?: boolean;
  controlBanEyeBlink?: boolean;
  controlBanBreath?: boolean;
  controlBanPhysics?: boolean;
  controlBanPose?: boolean;
  lastInspectTs?: number;
};

export type Live2DSystemCallbacks = {
  onInspect?: (actorId: string, inspection: Live2DInspection | null) => void;
  onSnapshot?: (actorId: string, snapshot: Live2DSnapshot | null) => void;
  inspectIntervalMs?: number;
};

export class Live2DSystem {
  private prev = new Map<string, PrevActorState>();
  private inspectIntervalMs: number;

  constructor(
    private backend: ILive2DBackend,
    private callbacks: Live2DSystemCallbacks = {},
  ) {
    this.inspectIntervalMs = callbacks.inspectIntervalMs ?? 120;
  }

  private isActive(actor: ActorEntry) {
    return (actor.mode === 'live2d' || !!actor.live2d?.modelId) && !!actor.live2d?.modelId;
  }

  private transformKey(t?: TransformState) {
    if (!t) return '';
    const parts = [
      t.x,
      t.y,
      t.scale,
      t.scaleX,
      t.scaleY,
      t.rotate,
      t.opacity,
      t.layer,
    ].map((v) => (typeof v === 'number' ? v.toFixed(6) : ''));
    return parts.join('|');
  }

  private diffParams(prev: Record<string, number> | undefined, next: Record<string, number> | undefined) {
    const patch: Record<string, number> = {};
    if (!next) return patch;
    for (const [k, v] of Object.entries(next)) {
      if (typeof v !== 'number') continue;
      if (!prev || prev[k] !== v) patch[k] = v;
    }
    return patch;
  }

  async syncActors(actors: EngineState['actors']) {
    const activeIds = new Set<string>();

    for (const [actorId, actor] of Object.entries(actors)) {
      if (!this.isActive(actor)) continue;
      const modelId = actor.live2d?.modelId;
      if (!modelId) continue;
      activeIds.add(actorId);

      const prev = this.prev.get(actorId);
      const modelChanged = !prev || prev.modelId !== modelId;
      const nextTransformKey = this.transformKey(actor.transform);
      const transformChanged = !prev || prev.transformKey !== nextTransformKey;
      const patch = this.diffParams(prev?.params, actor.live2d?.params);
      const motionId = actor.live2d?.motionId;
      const motionChanged = !!motionId && (!prev || prev.motionId !== motionId);
      const controlBanExpressions = actor.live2d?.controlBanExpressions;
      const expressionId = actor.live2d?.expressionId;
      const expressionChanged = typeof expressionId === 'string' && (!prev || prev.expressionId !== expressionId);
      const banIdle = actor.live2d?.controlBanIdle;
      const banMotions = actor.live2d?.controlBanMotions;
      const banFocus = actor.live2d?.controlBanFocus;
      const banNatural = actor.live2d?.controlBanNatural;
      const banEyeBlink = actor.live2d?.controlBanEyeBlink;
      const banBreath = actor.live2d?.controlBanBreath;
      const banPhysics = actor.live2d?.controlBanPhysics;
      const banPose = actor.live2d?.controlBanPose;
      const controlOptChanged =
        controlBanExpressions !== prev?.controlBanExpressions ||
        banIdle !== prev?.controlBanIdle ||
        banMotions !== prev?.controlBanMotions ||
        banFocus !== prev?.controlBanFocus ||
        banNatural !== prev?.controlBanNatural ||
        banEyeBlink !== prev?.controlBanEyeBlink ||
        banBreath !== prev?.controlBanBreath ||
        banPhysics !== prev?.controlBanPhysics ||
        banPose !== prev?.controlBanPose;

      try {
        if (modelChanged) await this.backend.load(actorId, modelId);
      } catch {
        continue;
      }

      if (modelChanged || transformChanged) {
        this.backend.setTransform(actorId, actor.transform);
      }

      if (Object.keys(patch).length > 0) {
        this.backend.setParams(actorId, patch);
      }

      if (controlOptChanged) {
        const options: {
          banExpressions?: boolean;
          banIdle?: boolean;
          banMotions?: boolean;
          banFocus?: boolean;
          banNatural?: boolean;
          banEyeBlink?: boolean;
          banBreath?: boolean;
          banPhysics?: boolean;
          banPose?: boolean;
        } = {};
        if (typeof controlBanExpressions === 'boolean') options.banExpressions = controlBanExpressions;
        if (typeof banIdle === 'boolean') options.banIdle = banIdle;
        if (typeof banMotions === 'boolean') options.banMotions = banMotions;
        if (typeof banFocus === 'boolean') options.banFocus = banFocus;
        if (typeof banNatural === 'boolean') options.banNatural = banNatural;
        if (typeof banEyeBlink === 'boolean') options.banEyeBlink = banEyeBlink;
        if (typeof banBreath === 'boolean') options.banBreath = banBreath;
        if (typeof banPhysics === 'boolean') options.banPhysics = banPhysics;
        if (typeof banPose === 'boolean') options.banPose = banPose;
        this.backend.setControlOptions?.(actorId, options);
      }

      if (motionChanged && motionId) {
        await this.backend.playMotion(actorId, motionId);
      }
      if (expressionChanged && expressionId) {
        await this.backend.playExpression?.(actorId, expressionId);
      }

      const now = Date.now();
      const lastInspectTs = prev?.lastInspectTs ?? 0;
      if (now - lastInspectTs >= this.inspectIntervalMs) {
        const inspection = this.backend.inspect(actorId);
        const snapshot = this.backend.snapshot(actorId);
        this.callbacks.onInspect?.(actorId, inspection);
        this.callbacks.onSnapshot?.(actorId, snapshot);
        if (prev) prev.lastInspectTs = now;
      }

      const nextPrev: PrevActorState = {
        modelId,
        transformKey: nextTransformKey,
        params: { ...(actor.live2d?.params || {}) },
        lastInspectTs: prev?.lastInspectTs ?? Date.now(),
      };
      if (typeof controlBanExpressions === 'boolean') nextPrev.controlBanExpressions = controlBanExpressions;
      if (motionId) nextPrev.motionId = motionId;
      if (typeof expressionId === 'string') nextPrev.expressionId = expressionId;
      if (typeof banIdle === 'boolean') nextPrev.controlBanIdle = banIdle;
      if (typeof banMotions === 'boolean') nextPrev.controlBanMotions = banMotions;
      if (typeof banFocus === 'boolean') nextPrev.controlBanFocus = banFocus;
      if (typeof banNatural === 'boolean') nextPrev.controlBanNatural = banNatural;
      if (typeof banEyeBlink === 'boolean') nextPrev.controlBanEyeBlink = banEyeBlink;
      if (typeof banBreath === 'boolean') nextPrev.controlBanBreath = banBreath;
      if (typeof banPhysics === 'boolean') nextPrev.controlBanPhysics = banPhysics;
      if (typeof banPose === 'boolean') nextPrev.controlBanPose = banPose;
      this.prev.set(actorId, nextPrev);
    }

    for (const actorId of [...this.prev.keys()]) {
      if (activeIds.has(actorId)) continue;
      this.backend.unload(actorId);
      this.callbacks.onInspect?.(actorId, null);
      this.callbacks.onSnapshot?.(actorId, null);
      this.prev.delete(actorId);
    }
  }
}
