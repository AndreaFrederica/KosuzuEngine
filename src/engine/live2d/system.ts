import type { TransformState } from '../core/BaseActor';
import type { EngineState } from '../core/EngineContext';
import type { ILive2DBackend, Live2DInspection, Live2DSnapshot } from './backend';

type ActorEntry = EngineState['actors'][string];

type PrevActorState = {
  modelId?: string;
  transformKey?: string;
  params?: Record<string, number>;
  motionId?: string;
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

      if (motionChanged && motionId) {
        await this.backend.playMotion(actorId, motionId);
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
      if (motionId) nextPrev.motionId = motionId;
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
