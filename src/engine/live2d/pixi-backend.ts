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
  getParameterIndex?: (id: string) => number;
  getParameterMinimumValue?: (index: number) => number;
  getParameterMaximumValue?: (index: number) => number;
  getParameterValueByIndex?: (index: number) => number;
  getParameterValueById?: (id: string) => number;
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
  _parameterIds?: unknown;
  _model?: unknown;
  _parameterValues?: unknown;
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
  private hitAreaOverlays: Map<string, PIXI.Container> = new Map();
  private hitAreaGraphics: Map<string, PIXI.Graphics> = new Map();
  private hitAreaVisible: Map<string, boolean> = new Map();
  private modelSources: Map<string, Live2DSource> = new Map();
  private loadedSourceKeys: Map<string, string> = new Map();
  private paramIdSets: Map<string, Set<string>> = new Map();
  private profiles: Map<string, Live2DProfile> = new Map();
  private desiredParams: Map<string, Record<string, number>> = new Map();
  private beforeUpdateHooks: Map<string, () => void> = new Map();
  private backups: Map<string, InternalModelBackup> = new Map();
  private controlModes: Map<string, 'default' | 'control'> = new Map();
  private controlOptions: Map<
    string,
    {
      banExpressions: boolean;
      banIdle: boolean;
      banMotions: boolean;
      banFocus: boolean;
      banNatural: boolean;
      banEyeBlink: boolean;
      banBreath: boolean;
      banPhysics: boolean;
      banPose: boolean;
    }
  > = new Map();

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
      }

      if (motionManager?.state && typeof motionManager.state.shouldRequestIdleMotion === 'function') {
        backup.shouldRequestIdleMotion = motionManager.state.shouldRequestIdleMotion;
      }

      if (typeof internal.updateFocus === 'function') {
        backup.updateFocus = internal.updateFocus;
      }
      if (typeof internal.updateNaturalMovements === 'function') {
        backup.updateNaturalMovements = internal.updateNaturalMovements;
      }

      backup.eyeBlink = internal.eyeBlink;
      backup.breath = internal.breath;
      backup.physics = internal.physics;
      backup.pose = internal.pose;

      if (motionManager && 'expressionManager' in motionManager) {
        backup.expressionManager = motionManager.expressionManager;
      }

      this.backups.set(actorId, backup);
      this.controlModes.set(actorId, 'control');
      const options = this.controlOptions.get(actorId) ?? {
        banExpressions: true,
        banIdle: true,
        banMotions: true,
        banFocus: true,
        banNatural: true,
        banEyeBlink: true,
        banBreath: true,
        banPhysics: true,
        banPose: true,
      };
      this.controlOptions.set(actorId, options);
      this.applyControlOptionsToInternal(internal, backup, options);
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

  private ensureHitAreaOverlay(actorId: string) {
    const existed = this.hitAreaOverlays.get(actorId);
    if (existed) return existed;
    const overlay = new PIXI.Container();
    overlay.sortableChildren = true;
    overlay.visible = false;
    overlay.eventMode = 'none';
    overlay.zIndex = 1_000_000_000;

    const gfx = new PIXI.Graphics();
    gfx.eventMode = 'none';
    overlay.addChild(gfx);

    this.hitAreaOverlays.set(actorId, overlay);
    this.hitAreaGraphics.set(actorId, gfx);
    this.hitAreaVisible.set(actorId, false);
    return overlay;
  }

  private syncHitAreaOverlayTransform(actorId: string) {
    const model = this.models.get(actorId);
    const overlay = this.hitAreaOverlays.get(actorId);
    if (!model || !overlay) return;
    overlay.position.copyFrom(model.position);
    overlay.scale.copyFrom(model.scale);
    overlay.pivot.copyFrom(model.pivot);
    overlay.skew.copyFrom(model.skew);
    overlay.rotation = model.rotation;
  }

  private updateHitAreaOverlay(actorId: string) {
    const model = this.models.get(actorId);
    const gfx = this.hitAreaGraphics.get(actorId);
    if (!model || !gfx) return;

    const internal = (model as unknown as { internalModel?: unknown }).internalModel as
      | undefined
      | {
        hitAreas?: Record<string, { index: number }>;
        getDrawableBounds?: (index: number, bounds?: { x: number; y: number; width: number; height: number }) => {
          x: number;
          y: number;
          width: number;
          height: number;
        };
        localTransform?: PIXI.Matrix;
      };
    if (!internal?.hitAreas || !internal.getDrawableBounds || !internal.localTransform) {
      gfx.clear();
      return;
    }

    gfx.clear();
    gfx.lineStyle(2, 0xff3b30, 0.9);

    for (const def of Object.values(internal.hitAreas)) {
      const idx = def?.index;
      if (typeof idx !== 'number' || idx < 0) continue;
      const b = internal.getDrawableBounds(idx);
      if (!b || !Number.isFinite(b.x) || !Number.isFinite(b.y) || !Number.isFinite(b.width) || !Number.isFinite(b.height)) continue;

      const x0 = b.x;
      const y0 = b.y;
      const x1 = b.x + b.width;
      const y1 = b.y + b.height;

      const p0 = internal.localTransform.apply(new PIXI.Point(x0, y0));
      const p1 = internal.localTransform.apply(new PIXI.Point(x1, y0));
      const p2 = internal.localTransform.apply(new PIXI.Point(x1, y1));
      const p3 = internal.localTransform.apply(new PIXI.Point(x0, y1));

      gfx.beginFill(0xff3b30, 0.08);
      gfx.moveTo(p0.x, p0.y);
      gfx.lineTo(p1.x, p1.y);
      gfx.lineTo(p2.x, p2.y);
      gfx.lineTo(p3.x, p3.y);
      gfx.closePath();
      gfx.endFill();
    }
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
    const overlay = this.ensureHitAreaOverlay(actorId);
    c.addChild(overlay);
    this.syncHitAreaOverlayTransform(actorId);

    this.desiredParams.set(actorId, {});
    this.controlModes.set(actorId, 'default');

    const core = this.getCore(model);
    const ids: string[] = [];
    if (core?.getParameterCount) {
      const raw =
        (typeof core.getParameterIds === 'function' && core.getParameterIds()) ||
        (Array.isArray(core._parameterIds) ? core._parameterIds : undefined) ||
        ((core._model as { parameters?: { ids?: unknown } } | undefined)?.parameters?.ids);
      if (Array.isArray(raw)) {
        for (const x of raw) ids.push(String(x));
      }
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
        if (desired) this.applyParamsToModel(actorId, desired);
        if (this.hitAreaVisible.get(actorId)) this.updateHitAreaOverlay(actorId);
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
    this.hitAreaOverlays.delete(actorId);
    this.hitAreaGraphics.delete(actorId);
    this.hitAreaVisible.delete(actorId);
    this.loadedSourceKeys.delete(actorId);
    this.paramIdSets.delete(actorId);
    this.profiles.delete(actorId);
    this.desiredParams.delete(actorId);
    this.backups.delete(actorId);
    this.controlModes.delete(actorId);
    this.controlOptions.delete(actorId);
  }

  setControlOptions(actorId: string, options: {
    banExpressions?: boolean;
    banIdle?: boolean;
    banMotions?: boolean;
    banFocus?: boolean;
    banNatural?: boolean;
    banEyeBlink?: boolean;
    banBreath?: boolean;
    banPhysics?: boolean;
    banPose?: boolean;
  }) {
    const prev = this.controlOptions.get(actorId) ?? {
      banExpressions: true,
      banIdle: true,
      banMotions: true,
      banFocus: true,
      banNatural: true,
      banEyeBlink: true,
      banBreath: true,
      banPhysics: true,
      banPose: true,
    };
    const next = {
      banExpressions: typeof options.banExpressions === 'boolean' ? options.banExpressions : prev.banExpressions,
      banIdle: typeof options.banIdle === 'boolean' ? options.banIdle : prev.banIdle,
      banMotions: typeof options.banMotions === 'boolean' ? options.banMotions : prev.banMotions,
      banFocus: typeof options.banFocus === 'boolean' ? options.banFocus : prev.banFocus,
      banNatural: typeof options.banNatural === 'boolean' ? options.banNatural : prev.banNatural,
      banEyeBlink: typeof options.banEyeBlink === 'boolean' ? options.banEyeBlink : prev.banEyeBlink,
      banBreath: typeof options.banBreath === 'boolean' ? options.banBreath : prev.banBreath,
      banPhysics: typeof options.banPhysics === 'boolean' ? options.banPhysics : prev.banPhysics,
      banPose: typeof options.banPose === 'boolean' ? options.banPose : prev.banPose,
    };
    this.controlOptions.set(actorId, next);

    const model = this.models.get(actorId);
    if (!model) return;
    const internal = this.getInternalModel(model);
    if (!internal) return;
    const inControl = (this.controlModes.get(actorId) ?? 'default') === 'control';
    if (!inControl) return;

    const backup = this.backups.get(actorId);
    if (!backup) return;
    this.applyControlOptionsToInternal(internal, backup, next);
  }

  private applyControlOptionsToInternal(
    internal: InternalModelLike,
    backup: InternalModelBackup,
    options: {
      banExpressions: boolean;
      banIdle: boolean;
      banMotions: boolean;
      banFocus: boolean;
      banNatural: boolean;
      banEyeBlink: boolean;
      banBreath: boolean;
      banPhysics: boolean;
      banPose: boolean;
    },
  ) {
    const motionManager = internal.motionManager;

    if (motionManager?.groups && typeof backup.idleGroup === 'string') {
      motionManager.groups.idle = options.banIdle ? '__disabled__' : backup.idleGroup;
    }

    if (motionManager?.state && backup.shouldRequestIdleMotion) {
      motionManager.state.shouldRequestIdleMotion = options.banIdle ? () => false : backup.shouldRequestIdleMotion;
    }

    if (options.banMotions) motionManager?.stopAllMotions?.();

    if (backup.updateFocus) {
      internal.updateFocus = options.banFocus ? () => { } : backup.updateFocus;
    }
    if (backup.updateNaturalMovements) {
      internal.updateNaturalMovements = options.banNatural ? () => { } : backup.updateNaturalMovements;
    }

    internal.eyeBlink = options.banEyeBlink ? undefined : backup.eyeBlink;
    internal.breath = options.banBreath ? undefined : backup.breath;
    internal.physics = options.banPhysics ? undefined : backup.physics;
    internal.pose = options.banPose ? undefined : backup.pose;

    if (motionManager && 'expressionManager' in motionManager) {
      motionManager.expressionManager = options.banExpressions ? undefined : backup.expressionManager;
    }
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
    this.syncHitAreaOverlayTransform(actorId);
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

  async playExpression(actorId: string, expressionId: string) {
    const model = this.models.get(actorId);
    if (!model) return;
    try {
      await model.expression(expressionId);
    } catch {
      return;
    }
  }

  inspect(actorId: string): Live2DInspection | null {
    const model = this.models.get(actorId);
    if (!model) return null;
    const internal = (model as unknown as {
      internalModel?: {
        motionManager?: {
          groups?: Record<string, unknown>;
          definitions?: unknown;
          expressionManager?: { definitions?: unknown };
        };
        settings?: { motions?: unknown; expressions?: unknown };
        hitAreas?: Record<string, unknown>;
      };
    }).internalModel;
    const core = this.getCore(model);
    if (!internal || !core) return null;

    const motionSet = new Set<string>([PixiLive2DBackend.CONTROL_MOTION_ID]);
    const motionDefs = internal.motionManager?.definitions ?? internal.settings?.motions;
    if (motionDefs instanceof Map) {
      for (const k of motionDefs.keys()) motionSet.add(String(k));
    } else if (motionDefs && typeof motionDefs === 'object') {
      for (const k of Object.keys(motionDefs as Record<string, unknown>)) motionSet.add(k);
    }
    const motions = [...motionSet];

    const expressions: string[] = [];
    const exps = internal.motionManager?.expressionManager?.definitions ?? internal.settings?.expressions;
    if (Array.isArray(exps)) {
      for (const e of exps) {
        const name =
          (e as { name?: unknown; Name?: unknown } | undefined)?.name ??
          (e as { Name?: unknown } | undefined)?.Name;
        if (typeof name === 'string' && name.length > 0) expressions.push(name);
      }
    }

    const hitAreas: string[] = [];
    if (internal.hitAreas && typeof internal.hitAreas === 'object') {
      hitAreas.push(...Object.keys(internal.hitAreas));
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
    } else if (core.getParameterCount && core.getParameterMinimumValue && core.getParameterMaximumValue) {
      const count = core.getParameterCount() ?? 0;
      const raw =
        (typeof core.getParameterIds === 'function' && core.getParameterIds()) ||
        (Array.isArray(core._parameterIds) ? core._parameterIds : undefined) ||
        ((core._model as { parameters?: { ids?: unknown } } | undefined)?.parameters?.ids);
      const ids = Array.isArray(raw) ? raw.map((x) => String(x)) : [];
      for (let i = 0; i < count; i++) {
        const id = ids[i] ?? String(i);
        const value =
          (typeof core.getParameterValueByIndex === 'function' && core.getParameterValueByIndex(i)) ??
          (typeof core.getParameterValueById === 'function' ? core.getParameterValueById(id) : undefined) ??
          0;
        const base = { id, value } as Live2DInspection['parameters'][number];
        const min = core.getParameterMinimumValue(i);
        const max = core.getParameterMaximumValue(i);
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

    const debug: NonNullable<Live2DInspection['debug']> = {};
    debug.controlMode = this.controlModes.get(actorId) ?? 'default';
    debug.control = { ...(this.controlOptions.get(actorId) ?? {}) };
    const idleGroup = internal.motionManager?.groups?.idle;
    if (typeof idleGroup === 'string') debug.motion = { idleGroup };
    const em = (internal.motionManager as unknown as { expressionManager?: unknown })?.expressionManager as
      | undefined
      | {
        isFinished?: () => boolean;
        reserveExpressionIndex?: number;
        currentExpression?: unknown;
        defaultExpression?: unknown;
      };
    const expr: NonNullable<NonNullable<Live2DInspection['debug']>['expression']> = {
      available: expressions.length > 0,
      present: !!em,
    };
    const isFinished = typeof em?.isFinished === 'function' ? em.isFinished() : undefined;
    if (typeof isFinished === 'boolean') expr.isFinished = isFinished;
    if (typeof em?.reserveExpressionIndex === 'number') expr.reserveIndex = em.reserveExpressionIndex;
    const active =
      em && 'currentExpression' in em && 'defaultExpression' in em
        ? em.currentExpression !== em.defaultExpression
        : undefined;
    if (typeof active === 'boolean') expr.active = active;
    debug.expression = expr;

    return { motions, expressions, hitAreas, parameters, debug };
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
    } else if (core.getParameterCount && core.getParameterMinimumValue && core.getParameterMaximumValue) {
      const count = core.getParameterCount() ?? 0;
      const raw =
        (typeof core.getParameterIds === 'function' && core.getParameterIds()) ||
        (Array.isArray(core._parameterIds) ? core._parameterIds : undefined) ||
        ((core._model as { parameters?: { ids?: unknown } } | undefined)?.parameters?.ids);
      const ids = Array.isArray(raw) ? raw.map((x) => String(x)) : [];
      for (let i = 0; i < count; i++) {
        const id = ids[i] ?? String(i);
        const value =
          (typeof core.getParameterValueByIndex === 'function' && core.getParameterValueByIndex(i)) ??
          (typeof core.getParameterValueById === 'function' ? core.getParameterValueById(id) : undefined) ??
          0;
        const base = { id, value } as Live2DSnapshot['parameters'][number];
        const min = core.getParameterMinimumValue(i);
        const max = core.getParameterMaximumValue(i);
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
    const c = this.actorContainers.get(actorId);
    if (!c) return;

    const overlay = this.hitAreaOverlays.get(actorId) ?? this.ensureHitAreaOverlay(actorId);
    if (!c.children.includes(overlay)) c.addChild(overlay);

    this.hitAreaVisible.set(actorId, visible);
    overlay.visible = visible;
    this.syncHitAreaOverlayTransform(actorId);
    if (visible) this.updateHitAreaOverlay(actorId);
  }
}
