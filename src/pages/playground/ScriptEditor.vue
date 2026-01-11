<template>
  <div class="column full-height">
    <input
      ref="fileInput"
      type="file"
      accept=".ts,.js,.txt"
      style="display: none"
      @change="onOpenFileChange"
    />
    <div class="col relative-position" ref="editorContainer"></div>
    <div class="q-pa-sm bg-grey-10 row items-center justify-between">
      <div class="row items-center">
        <q-btn dense round flat color="primary" icon="save" @click="onSave">
          <q-tooltip>保存</q-tooltip>
        </q-btn>
        <q-btn dense round flat color="primary" icon="save_as" @click="onSaveAs">
          <q-tooltip>另存为</q-tooltip>
        </q-btn>
        <q-btn dense round flat color="primary" icon="folder_open" @click="onOpen">
          <q-tooltip>读取</q-tooltip>
        </q-btn>
      </div>

      <div class="row items-center">
        <q-btn
          dense
          round
          color="primary"
          icon="play_arrow"
          @click="onRun"
          :loading="runState === 'running'"
          :disable="runState === 'running'"
        >
          <q-tooltip>运行</q-tooltip>
        </q-btn>
        <q-btn
          class="q-ml-xs"
          dense
          round
          outline
          color="primary"
          icon="skip_next"
          @click="onStep"
          :disable="runState === 'running'"
        >
          <q-tooltip>单步</q-tooltip>
        </q-btn>
        <q-btn
          class="q-ml-xs"
          dense
          round
          outline
          color="primary"
          icon="play_circle"
          @click="onContinue"
          :disable="runState !== 'paused'"
        >
          <q-tooltip>继续</q-tooltip>
        </q-btn>
        <q-btn
          class="q-ml-xs"
          dense
          round
          outline
          color="negative"
          icon="stop"
          @click="onStop"
          :disable="runState === 'idle'"
        >
          <q-tooltip>停止</q-tooltip>
        </q-btn>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import * as monaco from 'monaco-editor';
import 'monaco-editor/esm/vs/language/typescript/monaco.contribution';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import * as ts from 'typescript';
import { defaultRuntime } from '../../engine/core/Runtime';
import { ContextOps, StageOps } from '../../engine/core/BaseActor';
import { useEngineStore } from 'stores/engine-store';
import { useQuasar } from 'quasar';

const props = defineProps<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actor: any;
}>();

const engineStore = useEngineStore();
const $q = useQuasar();

const editorContainer = ref<HTMLElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
let editor: monaco.editor.IStandaloneCodeEditor | null = null;
let model: monaco.editor.ITextModel | null = null;
let modelChangeDisposable: monaco.IDisposable | null = null;
let ro: ResizeObserver | null = null;

const STORAGE_LAST_NAME_KEY = 'playground:scriptEditor:lastName';
const STORAGE_LAST_CODE_KEY = 'playground:scriptEditor:lastCode';
const fileName = ref('playground.ts');

type RunState = 'idle' | 'running' | 'paused';
type DebugMode = 'run' | 'step';
const runState = ref<RunState>('idle');
let debugMode: DebugMode = 'run';
let shouldStop = false;
let resume: (() => void) | null = null;
let currentLine = 0;
let execDecorationIds: string[] = [];
let breakpointDecorationIds: string[] = [];
const breakpoints = ref<Set<number>>(new Set());

function layoutEditor() {
  if (!editor || !editorContainer.value) return;
  if (editorContainer.value.offsetParent === null) return;
  const rect = editorContainer.value.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;
  editor.layout();
}

function ensureMonacoWorkers() {
  const g = globalThis as unknown as {
    MonacoEnvironment?: {
      getWorker?: (_workerId: string, label: string) => Worker;
    };
  };

  if (!g.MonacoEnvironment) g.MonacoEnvironment = {};
  if (g.MonacoEnvironment.getWorker) return;

  g.MonacoEnvironment.getWorker = (_workerId: string, label: string) => {
    if (label === 'typescript' || label === 'javascript') return new TsWorker();
    if (label === 'json') return new JsonWorker();
    if (label === 'css' || label === 'scss' || label === 'less') return new CssWorker();
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new HtmlWorker();
    return new EditorWorker();
  };
}

let typeSystemReady = false;
function setupTypeSystem() {
  if (typeSystemReady) return;
  typeSystemReady = true;

  type MonacoTsLang = {
    typescriptDefaults?: {
      setCompilerOptions: (opts: unknown) => void;
      setDiagnosticsOptions: (opts: unknown) => void;
      addExtraLib: (content: string, filePath?: string) => { dispose: () => void } | void;
    };
    ScriptTarget?: { ES2022: unknown };
    ModuleKind?: { ESNext: unknown };
    ModuleResolutionKind?: { NodeJs: unknown };
  };

  const tsLang = (monaco.languages as unknown as { typescript?: MonacoTsLang }).typescript;
  const tsDefaults = tsLang?.typescriptDefaults;
  if (!tsDefaults) return;

  tsDefaults.setCompilerOptions({
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    moduleDetection: ts.ModuleDetectionKind.Force,
    lib: ['es2022', 'dom'],
    strict: true,
    allowNonTsExtensions: true,
    allowJs: true,
    checkJs: true,
    noEmit: true,
    esModuleInterop: true,
    skipLibCheck: true,
    noImplicitAny: false,
    types: [],
  });

  tsDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    diagnosticCodesToIgnore: [],
  });

  const typings = [
    `declare type Awaitable<T> = T | Promise<T>;`,
    `declare type Dict<T = unknown> = Record<string, T>;`,
    `declare class Runtime {`,
    `  state: any;`,
    `  dispatch<T = unknown>(action: any): Promise<any>;`,
    `  back(): void;`,
    `  reset(): void;`,
    `}`,
    `declare class BaseActor {`,
    `  readonly id: string;`,
    `  readonly kind: string;`,
    `  readonly name: string;`,
    `  action<T = unknown>(input: any): Promise<any>;`,
    `}`,
    `declare class CharacterActor extends BaseActor {`,
    `  show(opts?: any): Promise<any>;`,
    `  hide(opts?: any): Promise<any>;`,
    `  say(text: string, opts?: { duration?: number; html?: boolean }): Promise<any>;`,
    `  sayHtml(html: string, opts?: { duration?: number }): Promise<any>;`,
    `  sayI18n(keyOrText: string, opts?: any): Promise<any>;`,
    `  emote(key: string): Promise<any>;`,
    `  pose(diffKey: string): Promise<any>;`,
    `  motion(id: string): Promise<any>;`,
    `  expression(id: string): Promise<any>;`,
    `  setMode(mode: 'normal' | 'live2d'): Promise<any>;`,
    `  setLive2DModel(path: string): Promise<any>;`,
    `  lookAt(x: number, y: number): Promise<any>;`,
    `  setFollowMouse(enabled: boolean): Promise<any>;`,
    `  setParams?(params: Record<string, number>): Promise<any>;`,
    `}`,
    `declare class ContextOps {`,
    `  state(): any;`,
    `  getVar<T = unknown>(key: string, fallback?: T): T;`,
    `  setVar(key: string, value: unknown): Promise<any>;`,
    `  delVar(key: string): Promise<any>;`,
    `  wait(ms: number): Promise<any>;`,
    `  choice(items: any[]): Promise<any>;`,
    `  back(): void;`,
    `  restart(): void;`,
    `  readonly nav: {`,
    `    goToTitle: () => void;`,
    `    goToSplash: () => void;`,
    `    goToEnd: () => void;`,
    `    goToSettings: () => void;`,
    `    goToSaves: (mode?: 'save' | 'load') => void;`,
    `    goToGame: () => void;`,
    `    push: (path: string) => void;`,
    `  };`,
    `}`,
    `declare class StageOps {`,
    `  size(): { width: number; height: number } | undefined;`,
    `  width(): number;`,
    `  height(): number;`,
    `}`,
    `declare const actor: CharacterActor;`,
    `declare const runtime: Runtime;`,
    `declare const ctx: ContextOps;`,
    `declare const stage: StageOps;`,
    `declare const store: any;`,
    `declare const log: { info: (...args: any[]) => void; warn: (...args: any[]) => void; error: (...args: any[]) => void; debug: (...args: any[]) => void };`,
    `declare function sleep(ms: number): Promise<void>;`,
  ].join('\n');

  tsDefaults.addExtraLib(typings, 'inmemory://model/engine-globals.d.ts');
}

function getMainModelUri() {
  return monaco.Uri.parse('inmemory://model/playground-script.ts');
}

function setExecLine(line: number | null) {
  if (!editor) return;
  if (line === null) {
    execDecorationIds = editor.deltaDecorations(execDecorationIds, []);
    return;
  }

  execDecorationIds = editor.deltaDecorations(execDecorationIds, [
    {
      range: new monaco.Range(line, 1, line, 1),
      options: {
        isWholeLine: true,
        className: 'monaco-exec-line',
      },
    },
  ]);

  editor.revealLineInCenter(line);
}

function renderBreakpoints() {
  if (!editor) return;

  const decorations: monaco.editor.IModelDeltaDecoration[] = Array.from(breakpoints.value)
    .sort((a, b) => a - b)
    .map((line) => ({
      range: new monaco.Range(line, 1, line, 1),
      options: {
        isWholeLine: true,
        glyphMarginClassName: 'monaco-breakpoint-glyph',
      },
    }));

  breakpointDecorationIds = editor.deltaDecorations(breakpointDecorationIds, decorations);
}

function toggleBreakpoint(line: number) {
  const next = new Set(breakpoints.value);
  if (next.has(line)) next.delete(line);
  else next.add(line);
  breakpoints.value = next;
  renderBreakpoints();
}

onMounted(() => {
  ensureMonacoWorkers();
  setupTypeSystem();
  if (editorContainer.value) {
    const uri = getMainModelUri();
    model = monaco.editor.getModel(uri);
    if (!model) {
      model = monaco.editor.createModel(
        'async function scene() {\n  await actor.say("Hello Live2D!");\n  await actor.motion("tap_body");\n}\n\nawait scene();\n',
        'typescript',
        uri,
      );
    }

    editor = monaco.editor.create(editorContainer.value, {
      model,
      theme: 'vs-dark',
      automaticLayout: false,
      glyphMargin: true,
    });
    ro = new ResizeObserver(() => {
      layoutEditor();
    });
    ro.observe(editorContainer.value);
    layoutEditor();

    const savedName = localStorage.getItem(STORAGE_LAST_NAME_KEY);
    const savedCode = localStorage.getItem(STORAGE_LAST_CODE_KEY);
    if (savedName) fileName.value = savedName;
    if (savedCode) model.setValue(savedCode);

    modelChangeDisposable = model.onDidChangeContent(() => {
      localStorage.setItem(STORAGE_LAST_NAME_KEY, fileName.value);
      localStorage.setItem(STORAGE_LAST_CODE_KEY, model?.getValue() ?? '');
    });

    editor.onMouseDown((e: monaco.editor.IEditorMouseEvent) => {
      if (e.target.type !== monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) return;
      const line = e.target.position?.lineNumber;
      if (!line) return;
      toggleBreakpoint(line);
    });

    renderBreakpoints();
  }
});

onBeforeUnmount(() => {
  if (editor) editor.dispose();
  editor = null;
  modelChangeDisposable?.dispose();
  modelChangeDisposable = null;
  ro?.disconnect();
  ro = null;
  if (model) model.dispose();
  model = null;
});

function downloadTextFile(name: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function normalizeFileName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return 'playground.ts';
  if (/\.(ts|js|txt)$/i.test(trimmed)) return trimmed;
  return `${trimmed}.ts`;
}

function promptFileName(initial: string) {
  return new Promise<string | null>((resolve) => {
    $q.dialog({
      title: '另存为',
      prompt: {
        model: initial,
        type: 'text',
      },
      cancel: true,
      persistent: true,
    })
      .onOk((val) => resolve(typeof val === 'string' ? val : String(val)))
      .onCancel(() => resolve(null))
      .onDismiss(() => resolve(null));
  });
}

function onSave() {
  if (!model) return;
  localStorage.setItem(STORAGE_LAST_NAME_KEY, fileName.value);
  localStorage.setItem(STORAGE_LAST_CODE_KEY, model.getValue());
  downloadTextFile(fileName.value, model.getValue());
}

async function onSaveAs() {
  if (!model) return;
  const next = await promptFileName(fileName.value);
  if (!next) return;
  fileName.value = normalizeFileName(next);
  onSave();
}

function onOpen() {
  fileInput.value?.click();
}

async function onOpenFileChange(e: Event) {
  if (!model) return;
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const text = await file.text();
  fileName.value = normalizeFileName(file.name);
  model.setValue(text);
  localStorage.setItem(STORAGE_LAST_NAME_KEY, fileName.value);
  localStorage.setItem(STORAGE_LAST_CODE_KEY, text);
  input.value = '';
}

function createTraceTransformer() {
  return (context: ts.TransformationContext) => {
    const f = context.factory;
    let sourceFile: ts.SourceFile;

    const makeTrace = (line: number) =>
      f.createExpressionStatement(
        f.createAwaitExpression(
          f.createCallExpression(f.createIdentifier('__trace'), undefined, [
            f.createNumericLiteral(line),
          ]),
        ),
      );

    const isTraceStatement = (s: ts.Statement) => {
      if (!ts.isExpressionStatement(s)) return false;
      const expr = s.expression;
      const inner = ts.isAwaitExpression(expr) ? expr.expression : expr;
      if (!ts.isCallExpression(inner)) return false;
      const callee = inner.expression;
      return ts.isIdentifier(callee) && callee.text === '__trace';
    };

    const instrumentStatements = (stmts: readonly ts.Statement[]) => {
      const out: ts.Statement[] = [];
      for (const s of stmts) {
        if (
          ts.isEmptyStatement(s) ||
          ts.isFunctionDeclaration(s) ||
          ts.isClassDeclaration(s) ||
          isTraceStatement(s)
        ) {
          out.push(s);
          continue;
        }
        const start = s.getStart(sourceFile);
        const lc = sourceFile.getLineAndCharacterOfPosition(start);
        out.push(makeTrace(Math.max(1, lc.line)), s);
      }
      return f.createNodeArray(out);
    };

    const visit: ts.Visitor = (node) => {
      if (ts.isBlock(node)) {
        const visited = ts.visitEachChild(node, visit, context);
        const updatedStatements = instrumentStatements(visited.statements);
        return f.updateBlock(visited, updatedStatements);
      }

      if (ts.isCaseClause(node)) {
        const visited = ts.visitEachChild(node, visit, context);
        const updatedStatements = instrumentStatements(visited.statements);
        return f.updateCaseClause(visited, visited.expression, updatedStatements);
      }

      if (ts.isDefaultClause(node)) {
        const visited = ts.visitEachChild(node, visit, context);
        const updatedStatements = instrumentStatements(visited.statements);
        return f.updateDefaultClause(visited, updatedStatements);
      }

      return ts.visitEachChild(node, visit, context);
    };

    return (sf: ts.SourceFile) => {
      sourceFile = sf;
      return ts.visitNode(sf, visit) as ts.SourceFile;
    };
  };
}

function compileWithTrace(tsCode: string) {
  const wrappedTs = `{\n${tsCode}\n}`;
  const res = ts.transpileModule(wrappedTs, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      strict: true,
      esModuleInterop: true,
      sourceMap: false,
      inlineSourceMap: false,
    },
    transformers: {
      before: [createTraceTransformer()],
    },
  });
  return res.outputText;
}

async function trace(line: number) {
  currentLine = line;
  setExecLine(line);

  if (shouldStop) {
    throw new Error('Execution stopped');
  }

  const hitBreakpoint = breakpoints.value.has(line);
  if (debugMode === 'step' || hitBreakpoint) {
    runState.value = 'paused';
    await new Promise<void>((resolve) => {
      resume = resolve;
    });
    resume = null;
    if (shouldStop) throw new Error('Execution stopped');
    runState.value = 'running';
  }
}

async function startExecution(mode: DebugMode) {
  if (!editor) return;
  const tsCode = editor.getValue();
  currentLine = 0;
  setExecLine(null);
  shouldStop = false;
  debugMode = mode;
  runState.value = 'running';

  try {
    const jsCode = compileWithTrace(tsCode);
    const wrapped = `return (async (actor, runtime, ctx, stage, store, log, sleep, __trace) => { ${jsCode} })`;
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const func = new Function(wrapped)();

    const runtime = defaultRuntime;
    const ctx = new ContextOps(runtime);
    const stage = new StageOps(runtime);
    const store = engineStore;
    const log = console;
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    await func(props.actor, runtime, ctx, stage, store, log, sleep, trace);
  } catch (e) {
    if (currentLine > 0) setExecLine(currentLine);
    console.error('Script Error:', e);
    alert('Script Error: ' + String(e));
  } finally {
    runState.value = 'idle';
    resume = null;
  }
}

function onRun() {
  if (runState.value === 'paused') {
    debugMode = 'run';
    resume?.();
    return;
  }
  void startExecution('run');
}

function onStep() {
  if (runState.value === 'paused') {
    debugMode = 'step';
    resume?.();
    return;
  }
  void startExecution('step');
}

function onContinue() {
  if (runState.value !== 'paused') return;
  debugMode = 'run';
  resume?.();
}

function onStop() {
  if (runState.value === 'idle') return;
  shouldStop = true;
  resume?.();
}

function setValue(code: string) {
  if (model) model.setValue(code);
}

function layout() {
  layoutEditor();
}

defineExpose({ setValue, layout });
</script>

<style scoped>
.column.full-height {
  min-width: 0;
}

.col.relative-position {
  min-width: 0;
}

:deep(.monaco-breakpoint-glyph) {
  background: #ff5252;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  margin-left: 3px;
  margin-top: 3px;
}

:deep(.monaco-exec-line) {
  background: rgba(0, 136, 255, 0.2);
}
</style>
