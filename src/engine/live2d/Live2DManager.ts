import * as PIXI from 'pixi.js';
import { Live2DModel } from 'pixi-live2d-display';

// Expose PIXI for the plugin
(window as unknown as { PIXI: typeof PIXI }).PIXI = PIXI;

// Register Ticker
Live2DModel.registerTicker(PIXI.Ticker);

export class Live2DManager {
  private static instance: Live2DManager;
  public app: PIXI.Application | null = null;
  private models: Map<string, Live2DModel> = new Map();
  private loadedSourceKeys: Map<string, string> = new Map();
  private modelSources: Map<string, string | File[]> = new Map();
  private container: PIXI.Container;

  private constructor() {
    this.container = new PIXI.Container();
  }

  static getInstance() {
    if (!Live2DManager.instance) {
      Live2DManager.instance = new Live2DManager();
    }
    return Live2DManager.instance;
  }

  init(canvas: HTMLCanvasElement, width: number, height: number) {
    if (this.app) {
      // Resize if already exists?
      return;
    }

    this.app = new PIXI.Application({
      view: canvas,
      width,
      height,
      backgroundAlpha: 0,
      autoStart: true,
      // We handle resize manually via CSS/Observer usually, but Pixi can auto resize
      resizeTo: (canvas.parentElement as HTMLElement) || undefined,
    });

    this.app.stage.addChild(this.container);
    console.log('[Live2DManager] Initialized');
  }

  public registerModelSource(id: string, source: string | File[]) {
    this.modelSources.set(id, source);
  }

  private sourceKey(source: string | File[]) {
    if (typeof source === 'string') return `url:${source}`;
    const parts = source
      .map((f) => `${f.name}:${f.size}:${f.lastModified}`)
      .sort()
      .join('|');
    return `files:${source.length}:${parts}`;
  }

  async loadModel(id: string, path?: string): Promise<Live2DModel> {
    const source = this.modelSources.get(id) || path;

    if (!source) {
      throw new Error(`[Live2DManager] No source found for model ${id}`);
    }

    const nextKey = this.sourceKey(source);
    const prevKey = this.loadedSourceKeys.get(id);
    const hasModel = this.models.has(id);
    if (hasModel && prevKey === nextKey) {
      return this.models.get(id)!;
    }

    if (hasModel) {
      const prevModel = this.models.get(id)!;
      this.removeModelFromStage(prevModel);
      prevModel.destroy({ children: true });
      this.models.delete(id);
      this.loadedSourceKeys.delete(id);
    }

    try {
      console.log(`[Live2DManager] Loading model ${id} from source`, source);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const model = await Live2DModel.from(source as any, { autoHitTest: false, autoFocus: false } as any);
      this.models.set(id, model);
      this.loadedSourceKeys.set(id, nextKey);

      // Default transform
      model.anchor.set(0.5, 0.5);
      model.eventMode = 'none';
      if ((model as unknown as { automator?: { autoHitTest?: boolean; autoFocus?: boolean } }).automator) {
        const automator = (model as unknown as { automator: { autoHitTest: boolean; autoFocus: boolean } }).automator;
        automator.autoHitTest = false;
        automator.autoFocus = false;
      }

      return model;
    } catch (e) {
      console.error(`[Live2DManager] Failed to load model ${id}`, e);
      throw e;
    }
  }

  addModelToStage(model: Live2DModel) {
    if (!this.container.children.includes(model)) {
      this.container.addChild(model);
    }
  }

  removeModelFromStage(model: Live2DModel) {
    if (this.container.children.includes(model)) {
      this.container.removeChild(model);
    }
  }

  getModel(id: string) {
    return this.models.get(id);
  }

  resize(width: number, height: number) {
    if (this.app) {
      this.app.renderer.resize(width, height);
    }
  }

  public getContainer() {
    return this.container;
  }
}
