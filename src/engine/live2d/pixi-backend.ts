import * as PIXI from 'pixi.js';
import { Live2DModel, MotionPreloadStrategy } from 'pixi-live2d-display';
import type { TransformState } from '../core/BaseActor';
import type { ILive2DBackend, Live2DBackendInit, Live2DInspection, Live2DSource, Live2DSnapshot } from './backend';
import { applyProfileParams, autoProfileFromParamIds, type Live2DProfile } from './profile';

(window as unknown as { PIXI: typeof PIXI }).PIXI = PIXI;
Live2DModel.registerTicker(PIXI.Ticker);

type CoreModelLike = {
  getParameterCount?: () => number;
  getParameterIds?: () => string[];
  getParameterMinimumValues?: () => number[];
  getParameterMaximumValues?: () => number[];
  getParameterValues?: () => number[];
  getParamCount?: () => number;
  getParamID?: (index: number) => string;
  getParamMin?: (index: number) => number;
  getParamMax?: (index: number) => number;
  getParamValue?: (index: number) => number;
  getParamIndex?: (id: string) => number;
  getParamFloat?: (id: string | number) => number;
  setParamFloat?: (id: string | number, value: number, weight?: number) => unknown;
  setParameterValueById?: (id: string, value: number) => void;
  getDrawableCount?: () => number;
  getDrawableId?: (index: number) => string;
  getDrawableRenderOrder?: (index: number) => number;
  getDrawableOpacity?: (index: number) => number;
  getDrawableDynamicFlagIsVisible?: (index: number) => boolean;
};

type InternalModelEmitter = {
  on: (event: string, fn: () => void) => void;
  off?: (event: string, fn: () => void) => void;
};

type MotionStateLike = {
  shouldRequestIdleMotion?: () => boolean;
};

type MotionManagerLike = {
  stopAllMotions?: () => void;
  groups?: { idle: string };
  state?: MotionStateLike;
  expressionManager?: unknown;
};

type InternalModelLike = InternalModelEmitter & {
  motionManager?: MotionManagerLike;
  updateFocus?: () => void;
  updateNaturalMovements?: (dt: DOMHighResTimeStamp, now: DOMHighResTimeStamp) => void;
  eyeBlink?: unknown;
  breath?: unknown;
  physics?: unknown;
  pose?: unknown;
};

type InternalModelBackup = {
  idleGroup?: string;
  shouldRequestIdleMotion?: () => boolean;
  updateFocus?: () => void;
  updateNaturalMovements?: (dt: DOMHighResTimeStamp, now: DOMHighResTimeStamp) => void;
  eyeBlink?: unknown;
  breath?: unknown;
  physics?: unknown;
  pose?: unknown;
  expressionManager?: unknown;
};

export class PixiLive2DBackend implements ILive2DBackend {
  private app: PIXI.Application | null = null;
  private viewport = new PIXI.Container();
  private root = new PIXI.Container();

  private models: Map<string, Live2DModel> = new Map();
  private actorContainers: Map<string, PIXI.Container> = new Map();
  private modelSources: Map<string, Live2DSource> = new Map();
  private loadedSourceKeys: Map<string, string> = new Map();
  private paramIdSets: Map<string, Set<string>> = new Map();
  private profiles: Map<string, Live2DProfile> = new Map();
  private desiredParams: Map<string, Record<string, number>> = new Map();
  private beforeUpdateHooks: Map<string, () => void> = new Map();
  private backups: Map<string, InternalModelBackup> = new Map();
  private controlModes: Map<string, 'default' | 'control'> = new Map();

  public static readonly CONTROL_MOTION_ID = '__CONTROL__';

  init(input: Live2DBackendInit) {
    if (this.app) return;
    this.app = new PIXI.Application({
      view: input.canvas,
      width: input.width,
      height: input.height,
      backgroundAlpha: 0,
      autoStart: true,
      resizeTo: (input.canvas.parentElement as HTMLElement) || undefined,
    });
    this.viewport.sortableChildren = true;
    this.root.sortableChildren = true;
    this.viewport.addChild(this.root);
    this.app.stage.addChild(this.viewport);

    this.app.ticker.add(() => {
      const dt = this.app?.ticker.deltaMS ?? 0;
      for (const model of this.models.values()) {
        model.update(dt);
      }
    });
  }

  resize(width: number, height: number) {
    this.app?.renderer.resize(width, height);
  }

  registerSource(actorId: string, source: Live2DSource) {
    this.modelSources.set(actorId, this.normalizeSource(source));
  }

  private normalizeSource(source: Live2DSource): Live2DSource {
    if (typeof source !== 'string') return source;
    let s = source.trim();
    s = s.replace(/^`+/, '').replace(/`+$/, '').trim();
    s = s.replace(/^"+/, '').replace(/"+$/, '').trim();
    s = s.replace(/^'+/, '').replace(/'+$/, '').trim();
    return s;
  }

  private scanTokensFromBuffer(buffer: ArrayBuffer, prefix: string) {
    const bytes = new Uint8Array(buffer);
    const prefixBytes = new TextEncoder().encode(prefix);
    const out = new Set<string>();

    const isAllowed = (b: number) => {
      if (b >= 48 && b <= 57) return true;
      if (b >= 65 && b <= 90) return true;
      if (b >= 97 && b <= 122) return true;
      return b === 95 || b === 46;
    };

    const maxLen = 64;

    for (let i = 0; i <= bytes.length - prefixBytes.length; i++) {
      let ok = true;
      for (let k = 0; k < prefixBytes.length; k++) {
        if (bytes[i + k] !== prefixBytes[k]) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;

      let j = i;
      const end = Math.min(bytes.length, i + maxLen);
      while (j < end && isAllowed(bytes[j]!)) j++;
      if (j <= i + prefixBytes.length) continue;

      const token = new TextDecoder().decode(bytes.slice(i, j));
      out.add(token);
      i = j;
    }

    return out;
  }

  private async extractCubism2ParamIdsFromSource(source: Live2DSource) {
    const out = new Set<string>();

    const scan = (buf: ArrayBuffer) => {
      for (const t of this.scanTokensFromBuffer(buf, 'PARAM_')) out.add(t);
    };

    if (typeof source !== 'string') {
      const mocFiles = source.filter((f) => f.name.toLowerCase().endsWith('.moc'));
      const targets = mocFiles.length > 0 ? mocFiles : source;
      for (const f of targets) {
        try {
          scan(await f.arrayBuffer());
        } catch {
          continue;
        }
      }
      return out;
    }

    try {
      const settingsUrl = source;
      const settings = (await fetch(settingsUrl).then((r) => r.json())) as { model?: string };
      const mocRel = typeof settings.model === 'string' ? settings.model : '';
      if (!mocRel) return out;
      const mocUrl = new URL(mocRel, settingsUrl).toString();
      const buf = await fetch(mocUrl).then((r) => r.arrayBuffer());
      scan(buf);
    } catch {
      return out;
    }

    return out;
  }

  private sourceKey(source: Live2DSource) {
    if (typeof source === 'string') return `url:${source}`;
    const parts = source
      .map((f) => `${f.name}:${f.size}:${f.lastModified}`)
      .sort()
      .join('|');
    return `files:${source.length}:${parts}`;
  }

  private getCore(model: Live2DModel): CoreModelLike | null {
    const internal = (model as unknown as { internalModel?: unknown }).internalModel as
      | undefined
      | { coreModel?: unknown; settings?: unknown; motionManager?: unknown };
    const core = (internal as { coreModel?: unknown } | undefined)?.coreModel as CoreModelLike | undefined;
    return core ?? null;
  }

  private getInternalModelEmitter(model: Live2DModel): InternalModelEmitter | null {
    const internal = (model as unknown as { internalModel?: unknown }).internalModel as
      | undefined
      | InternalModelEmitter;
    if (!internal || typeof internal.on !== 'function') return null;
    return internal;
  }

  private getInternalModel(model: Live2DModel): InternalModelLike | null {
    const internal = (model as unknown as { internalModel?: unknown }).internalModel as
      | undefined
      | InternalModelLike;
    if (!internal || typeof internal.on !== 'function') return null;
    return internal;
  }

  private disableAutoIdle(model: Live2DModel) {
    const internal = this.getInternalModel(model);
    if (!internal) return;
    const motionManager = internal.motionManager;
    if (motionManager?.groups && 'idle' in motionManager.groups) {
      (motionManager.groups as { idle: string }).idle = '__disabled__';
    }
  }

  private setControlMode(actorId: string, mode: 'default' | 'control') {
    const model = this.models.get(actorId);
    if (!model) return;
    const internal = this.getInternalModel(model);
    if (!internal) return;

    const current = this.controlModes.get(actorId) ?? 'default';
    if (current === mode) return;

    const motionManager = internal.motionManager;

    if (mode === 'control') {
      const backup: InternalModelBackup = {};

      if (motionManager?.groups && 'idle' in motionManager.groups) {
        backup.idleGroup = (motionManager.groups as { idle: string }).idle;
        (motionManager.groups as { idle: string }).idle = '__disabled__';
      }

      if (motionManager?.state && typeof motionManager.state.shouldRequestIdleMotion === 'function') {
        backup.shouldRequestIdleMotion = motionManager.state.shouldRequestIdleMotion;
        motionManager.state.shouldRequestIdleMotion = () => false;
      }

      if (typeof internal.updateFocus === 'function') {
        backup.updateFocus = internal.updateFocus;
        internal.updateFocus = () => { };
      }
      if (typeof internal.updateNaturalMovements === 'function') {
        backup.updateNaturalMovements = internal.updateNaturalMovements;
        internal.updateNaturalMovements = () => { };
      }

      backup.eyeBlink = internal.eyeBlink;
      backup.breath = internal.breath;
      backup.physics = internal.physics;
      backup.pose = internal.pose;
      internal.eyeBlink = undefined;
      internal.breath = undefined;
      internal.physics = undefined;
      internal.pose = undefined;

      if (motionManager && 'expressionManager' in motionManager) {
        backup.expressionManager = motionManager.expressionManager;
        motionManager.expressionManager = undefined;
      }

      this.backups.set(actorId, backup);
      motionManager?.stopAllMotions?.();
      this.controlModes.set(actorId, 'control');
    } else {
      const backup = this.backups.get(actorId);
      if (backup) {
        if (motionManager?.groups && typeof backup.idleGroup === 'string' && 'idle' in motionManager.groups) {
          (motionManager.groups as { idle: string }).idle = backup.idleGroup;
        }
        if (motionManager?.state && backup.shouldRequestIdleMotion) {
          motionManager.state.shouldRequestIdleMotion = backup.shouldRequestIdleMotion;
        }
        if (backup.updateFocus) internal.updateFocus = backup.updateFocus;
        if (backup.updateNaturalMovements) internal.updateNaturalMovements = backup.updateNaturalMovements;
        internal.eyeBlink = backup.eyeBlink;
        internal.breath = backup.breath;
        internal.physics = backup.physics;
        internal.pose = backup.pose;
        if (motionManager && 'expressionManager' in motionManager) {
          motionManager.expressionManager = backup.expressionManager;
        }
      }
      this.backups.delete(actorId);
      this.controlModes.set(actorId, 'default');
    }
  }

  private ensureActorContainer(actorId: string) {
    const existed = this.actorContainers.get(actorId);
    if (existed) return existed;
    const c = new PIXI.Container();
    c.sortableChildren = true;
    this.actorContainers.set(actorId, c);
    this.root.addChild(c);
    return c;
  }

  async load(actorId: string, source?: Live2DSource) {
    const actualSource = this.normalizeSource(this.modelSources.get(actorId) ?? source ?? '');
    if (!actualSource) throw new Error(`[PixiLive2DBackend] No source for ${actorId}`);

    const nextKey = this.sourceKey(actualSource);
    const prevKey = this.loadedSourceKeys.get(actorId);
    const hasModel = this.models.has(actorId);
    if (hasModel && prevKey === nextKey) return;

    if (hasModel) this.unload(actorId);

    const model = await Live2DModel.from(actualSource as unknown as string | File[], {
      autoHitTest: false,
      autoFocus: false,
      autoInteract: false,
      autoUpdate: false,
      motionPreload: MotionPreloadStrategy.NONE,
    });
    model.anchor.set(0.5, 0.5);
    model.eventMode = 'none';
    const automator = (model as unknown as { automator?: { autoHitTest?: boolean; autoFocus?: boolean } }).automator;
    if (automator) {
      automator.autoHitTest = false;
      automator.autoFocus = false;
    }

    this.models.set(actorId, model);
    this.loadedSourceKeys.set(actorId, nextKey);

    const c = this.ensureActorContainer(actorId);
    c.addChild(model);

    this.desiredParams.set(actorId, {});
    this.controlModes.set(actorId, 'default');

    const core = this.getCore(model);
    const ids: string[] = [];
    if (core?.getParameterCount && core.getParameterIds) {
      ids.push(...(core.getParameterIds() ?? []));
    } else if (core?.getParamCount && core.getParamID) {
      const count = core.getParamCount() ?? 0;
      for (let i = 0; i < count; i++) ids.push(core.getParamID(i));
    } else if (core?.getParamIndex) {
      const candidates = [
        'ParamAngleX',
        'ParamAngleY',
        'ParamAngleZ',
        'ParamBodyAngleX',
        'ParamBodyAngleY',
        'ParamEyeBallX',
        'ParamEyeBallY',
        'PARAM_ANGLE_X',
        'PARAM_ANGLE_Y',
        'PARAM_ANGLE_Z',
        'PARAM_BODY_ANGLE_X',
        'PARAM_BODY_ANGLE_Y',
        'PARAM_EYE_BALL_X',
        'PARAM_EYE_BALL_Y',
      ];
      for (const id of candidates) {
        try {
          const idx = core.getParamIndex(id);
          if (typeof idx === 'number' && idx >= 0) ids.push(id);
        } catch {
          continue;
        }
      }
    }
    const scanned =
      ids.length === 0 && core?.setParamFloat
        ? await this.extractCubism2ParamIdsFromSource(actualSource)
        : new Set<string>();
    for (const id of scanned) ids.push(id);
    const idSet = new Set(ids.filter((x) => typeof x === 'string' && x.length > 0));
    this.paramIdSets.set(actorId, idSet);
    this.profiles.set(actorId, autoProfileFromParamIds(idSet));

    const internal = this.getInternalModelEmitter(model);
    if (internal) {
      const hook = () => {
        const desired = this.desiredParams.get(actorId);
        if (!desired) return;
        this.applyParamsToModel(actorId, desired);
      };
      this.beforeUpdateHooks.set(actorId, hook);
      internal.on('beforeModelUpdate', hook);
    }
  }

  unload(actorId: string) {
    const model = this.models.get(actorId);
    if (model) {
      const internal = this.getInternalModelEmitter(model);
      const hook = this.beforeUpdateHooks.get(actorId);
      if (internal && hook && typeof internal.off === 'function') {
        internal.off('beforeModelUpdate', hook);
      }
      this.beforeUpdateHooks.delete(actorId);
      const c = this.actorContainers.get(actorId);
      if (c && c.children.includes(model)) c.removeChild(model);
      model.destroy({ children: true });
    }
    const container = this.actorContainers.get(actorId);
    if (container) {
      this.root.removeChild(container);
      container.destroy({ children: true });
    }
    this.models.delete(actorId);
    this.actorContainers.delete(actorId);
    this.loadedSourceKeys.delete(actorId);
    this.paramIdSets.delete(actorId);
    this.profiles.delete(actorId);
    this.desiredParams.delete(actorId);
    this.backups.delete(actorId);
    this.controlModes.delete(actorId);
  }

  setTransform(actorId: string, transform?: TransformState) {
    const model = this.models.get(actorId);
    if (!model || !this.app || !transform) return;
    const c = this.actorContainers.get(actorId);
    if (c && typeof transform.layer === 'number') c.zIndex = transform.layer;

    const screenW = this.app.screen.width;
    const screenH = this.app.screen.height;

    if (typeof transform.x === 'number') model.x = transform.x * screenW;
    if (typeof transform.y === 'number') model.y = (1 - transform.y) * screenH;
    if (typeof transform.opacity === 'number') model.alpha = transform.opacity;
    if (typeof transform.rotate === 'number') model.rotation = transform.rotate * (Math.PI / 180);

    const base = typeof transform.scale === 'number' ? transform.scale : 1;
    const sx = (typeof transform.scaleX === 'number' ? transform.scaleX : 1) * base;
    const sy = (typeof transform.scaleY === 'number' ? transform.scaleY : 1) * base;
    model.scale.set(sx, sy);
  }

  setParams(actorId: string, params: Record<string, number>) {
    const existing = this.desiredParams.get(actorId) ?? {};
    const next: Record<string, number> = { ...existing };
    for (const [k, v] of Object.entries(params)) {
      if (typeof v === 'number') next[k] = v;
    }
    this.desiredParams.set(actorId, next);
    this.applyParamsToModel(actorId, params);
  }

  private applyParamsToModel(actorId: string, params: Record<string, number>) {
    const model = this.models.get(actorId);
    if (!model) return;
    const core = this.getCore(model);
    const allow = this.paramIdSets.get(actorId);
    const allowFilter = allow && allow.size > 0 ? allow : undefined;
    const profile = this.profiles.get(actorId) ?? autoProfileFromParamIds(allow ?? new Set());
    const mapped = applyProfileParams(params, profile, allowFilter);
    for (const [key, val] of Object.entries(mapped)) {
      if (typeof val !== 'number') continue;
      if (core?.setParameterValueById) {
        try {
          core.setParameterValueById(key, val);
        } catch {
          continue;
        }
      } else if (core?.setParamFloat) {
        try {
          core.setParamFloat(key, val, 1);
        } catch {
          continue;
        }
      } else {
        return;
      }
    }
  }

  async playMotion(actorId: string, motionId: string) {
    if (motionId === PixiLive2DBackend.CONTROL_MOTION_ID) {
      this.setControlMode(actorId, 'control');
      return;
    }
    this.setControlMode(actorId, 'default');
    const model = this.models.get(actorId);
    if (!model) return;
    try {
      await model.motion(motionId);
    } catch {
      return;
    }
  }

  inspect(actorId: string): Live2DInspection | null {
    const model = this.models.get(actorId);
    if (!model) return null;
    const internal = (model as unknown as {
      internalModel?: {
        motionManager?: { groups?: Record<string, unknown>; definitions?: Record<string, unknown> };
        settings?: { motions?: Record<string, unknown>; expressions?: Array<{ name?: string }> };
      };
    }).internalModel;
    const core = this.getCore(model);
    if (!internal || !core) return null;

    const motions: string[] = [PixiLive2DBackend.CONTROL_MOTION_ID];
    if (internal.motionManager) {
      const groups = internal.motionManager.groups;
      const definitions = internal.motionManager.definitions;
      if (groups) motions.push(...Object.keys(groups));
      else if (definitions) motions.push(...Object.keys(definitions));
    }
    if (motions.length === 0 && internal.settings?.motions) {
      motions.push(...Object.keys(internal.settings.motions));
    }

    const expressions: string[] = [];
    const exps = internal.settings?.expressions;
    if (Array.isArray(exps)) {
      for (const e of exps) {
        if (typeof e?.name === 'string') expressions.push(e.name);
      }
    }

    const parameters: Live2DInspection['parameters'] = [];
    if (core.getParameterCount && core.getParameterIds) {
      const count = core.getParameterCount() ?? 0;
      const ids = core.getParameterIds() ?? [];
      const mins = core.getParameterMinimumValues?.();
      const maxs = core.getParameterMaximumValues?.();
      const values = core.getParameterValues?.();
      for (let i = 0; i < count; i++) {
        const base = { id: ids[i] ?? String(i), value: values?.[i] ?? 0 } as Live2DInspection['parameters'][number];
        const min = mins?.[i];
        const max = maxs?.[i];
        if (typeof min === 'number') base.min = min;
        if (typeof max === 'number') base.max = max;
        parameters.push(base);
      }
    } else if (core.getParamCount) {
      const count = core.getParamCount() ?? 0;
      for (let i = 0; i < count; i++) {
        const base = {
          id: core.getParamID?.(i) ?? String(i),
          value: core.getParamValue?.(i) ?? 0,
        } as Live2DInspection['parameters'][number];
        const min = core.getParamMin?.(i);
        const max = core.getParamMax?.(i);
        if (typeof min === 'number') base.min = min;
        if (typeof max === 'number') base.max = max;
        parameters.push(base);
      }
    } else if (core.getParamFloat) {
      const ids = [...(this.paramIdSets.get(actorId) ?? new Set<string>())];
      for (const id of ids) {
        try {
          const value = core.getParamFloat(id);
          parameters.push({ id, value });
        } catch {
          continue;
        }
      }
    }

    return { motions, expressions, parameters };
  }

  snapshot(actorId: string): Live2DSnapshot | null {
    const model = this.models.get(actorId);
    if (!model) return null;
    const core = this.getCore(model);
    if (!core) return null;

    const parameters: Live2DSnapshot['parameters'] = [];
    if (core.getParameterCount && core.getParameterIds) {
      const count = core.getParameterCount() ?? 0;
      const ids = core.getParameterIds() ?? [];
      const mins = core.getParameterMinimumValues?.();
      const maxs = core.getParameterMaximumValues?.();
      const values = core.getParameterValues?.();
      for (let i = 0; i < count; i++) {
        const base = { id: ids[i] ?? String(i), value: values?.[i] ?? 0 } as Live2DSnapshot['parameters'][number];
        const min = mins?.[i];
        const max = maxs?.[i];
        if (typeof min === 'number') base.min = min;
        if (typeof max === 'number') base.max = max;
        parameters.push(base);
      }
    } else if (core.getParamCount) {
      const count = core.getParamCount() ?? 0;
      for (let i = 0; i < count; i++) {
        const base = {
          id: core.getParamID?.(i) ?? String(i),
          value: core.getParamValue?.(i) ?? 0,
        } as Live2DSnapshot['parameters'][number];
        const min = core.getParamMin?.(i);
        const max = core.getParamMax?.(i);
        if (typeof min === 'number') base.min = min;
        if (typeof max === 'number') base.max = max;
        parameters.push(base);
      }
    } else if (core.getParamFloat) {
      const ids = [...(this.paramIdSets.get(actorId) ?? new Set<string>())];
      for (const id of ids) {
        try {
          const value = core.getParamFloat(id);
          parameters.push({ id, value });
        } catch {
          continue;
        }
      }
    }

    const drawables: Live2DSnapshot['drawables'] = [];
    if (core.getDrawableCount) {
      const count = core.getDrawableCount() ?? 0;
      for (let i = 0; i < count; i++) {
        const base: Live2DSnapshot['drawables'][number] = { index: i };
        const id = core.getDrawableId?.(i);
        const renderOrder = core.getDrawableRenderOrder?.(i);
        const opacity = core.getDrawableOpacity?.(i);
        const visible = core.getDrawableDynamicFlagIsVisible?.(i);
        if (typeof id === 'string') base.id = id;
        if (typeof renderOrder === 'number') base.renderOrder = renderOrder;
        if (typeof opacity === 'number') base.opacity = opacity;
        if (typeof visible === 'boolean') base.visible = visible;
        drawables.push(base);
      }
    }

    return { ts: Date.now(), parameters, drawables };
  }

  getViewportContainer() {
    return this.viewport;
  }

  setHitAreasVisible(actorId: string, visible: boolean) {
    const model = this.models.get(actorId);
    if (!model) return;
    const anyModel = model as unknown as { hitAreaFrames?: { visible: boolean } };
    if (anyModel.hitAreaFrames) anyModel.hitAreaFrames.visible = visible;
  }
}
