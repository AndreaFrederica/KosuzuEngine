<template>
  <FloatingWindow
    :model-value="visible"
    @update:model-value="onUpdateOpen"
    title="控制台"
    storage-key="panel:console:v2"
    window-id="panel:console:v2"
    window-class="bg-grey-10 text-white"
    :initial-size="{ w: 980, h: 560 }"
    :min-width="520"
    :min-height="320"
  >
    <div class="fw-content script-console">
      <q-card class="panel">
        <q-card-section class="help">
          <div>
            可用变量：ctx / stage / runtime / store / log / sleep / BackgroundActor / AudioActor /
            CharacterActor / Josei06Sailor / Josei07Sailor / AkamafuGirl / NekoAnimal
          </div>
          <div>Tab 补全（可循环）；Enter 执行；Ctrl/Cmd+L 或 :clear 清屏；输入 :help 查看命令</div>
        </q-card-section>
        <q-separator />
        <q-card-section class="terminal">
          <div ref="terminalEl" class="terminal-host" />
        </q-card-section>
        <q-separator />
        <q-card-section class="toolbar row items-center justify-end q-gutter-xs">
          <q-btn flat dense size="sm" icon="delete_sweep" @click="clearTerminal" title="清屏" />
          <q-btn flat dense size="sm" icon="download" @click="exportTerminalContent" title="导出" />
        </q-card-section>
      </q-card>
    </div>
  </FloatingWindow>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick, computed } from 'vue';
import { useEngineStore } from 'stores/engine-store';
import { defaultRuntime } from '../core/Runtime';
import {
  ContextOps,
  StageOps,
  BackgroundActor,
  AudioActor,
  CharacterActor,
} from '../core/BaseActor';
import { Josei06Sailor, Josei07Sailor, AkamafuGirl, NekoAnimal } from '../../game/actors';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import FloatingWindow from 'components/FloatingWindow.vue';
import { getManual, formatManual, getAllCommandNames, searchCommands } from './commands';

const props = withDefaults(defineProps<{ visible?: boolean }>(), { visible: false });
const visible = computed(() => props.visible);
const emit = defineEmits<{ (e: 'close'): void }>();

function onUpdateOpen(v: boolean) {
  if (!v) emit('close');
}

const store = useEngineStore();
const runtime = defaultRuntime;
const ctx = new ContextOps(runtime);
const stage = new StageOps(runtime);

const running = ref(false);
const terminalEl = ref<HTMLElement | null>(null);
let term: Terminal | null = null;
let fit: FitAddon | null = null;
let input = '';
let cursor = 0;
const history: string[] = [];
let historyIndex = 0;
let historyDraft = '';
let completionSession: {
  before: string;
  after: string;
  candidates: string[];
  index: number;
  kind: 'global' | 'prop';
} | null = null;
let ro: ResizeObserver | null = null;

const prompt = '> ';

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function clearTerminal() {
  term?.clear();
  writeBanner();
  resetLine();
  renderLine();
}

function exportTerminalContent() {
  if (!term) return;
  const buffer = term.buffer.active;
  const lines: string[] = [];
  for (let i = 0; i < buffer.length; i++) {
    const line = buffer.getLine(i);
    if (!line) continue;
    lines.push(line.translateToString(true));
  }
  const text = lines.join('\n');
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kosuzu-console-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function writeBanner() {
  writeLine('Kosuzu Console');
  writeLine('输入 :help 查看命令与快捷键（:clear 清屏）');
}

function writeLine(text: string) {
  term?.writeln(text);
}

function stringifyOne(v: unknown) {
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function collectPropertyNames(obj: unknown) {
  const out = new Set<string>();
  if (!obj) return out;
  let cur: unknown = obj;
  for (let i = 0; i < 8 && cur; i++) {
    for (const k of Reflect.ownKeys(cur as object)) {
      if (typeof k === 'string') out.add(k);
    }
    cur = Object.getPrototypeOf(cur);
  }
  return out;
}

function completionCandidates(base: unknown, prefix: string) {
  const names = Array.from(collectPropertyNames(base));
  return names.filter((n) => n.startsWith(prefix)).sort();
}

function parseCompletionTarget(s: string) {
  const m1 = /([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)?$/.exec(s);
  if (m1?.[1]) return { kind: 'prop' as const, baseName: m1[1], propPrefix: m1[2] ?? '' };
  const m2 = /([A-Za-z_$][\w$]*)$/.exec(s);
  if (m2?.[1]) return { kind: 'global' as const, baseName: m2[1] };
  return null;
}

function globalCompletions(prefix: string) {
  const globals = [
    'ctx',
    'stage',
    'runtime',
    'store',
    'log',
    'sleep',
    'console',
    'BackgroundActor',
    'AudioActor',
    'CharacterActor',
    'Josei06Sailor',
    'Josei07Sailor',
    'AkamafuGirl',
    'NekoAnimal',
  ];
  return globals.filter((n) => n.startsWith(prefix)).sort();
}

function resetCompletion() {
  completionSession = null;
}

function resetLine() {
  input = '';
  cursor = 0;
  historyIndex = history.length;
  historyDraft = '';
  resetCompletion();
}

function renderLine() {
  if (!term) return;
  const safeCursor = Math.max(0, Math.min(cursor, input.length));
  cursor = safeCursor;
  term.write('\r\x1b[2K' + prompt + input);
  const moveLeft = input.length - cursor;
  if (moveLeft > 0) term.write(`\x1b[${moveLeft}D`);
}

function replaceRange(start: number, end: number, replacement: string) {
  const s = Math.max(0, Math.min(start, input.length));
  const e = Math.max(0, Math.min(end, input.length));
  const a = Math.min(s, e);
  const b = Math.max(s, e);
  input = input.slice(0, a) + replacement + input.slice(b);
  cursor = a + replacement.length;
  renderLine();
}

async function runCode(code: string) {
  if (running.value) return;
  running.value = true;
  try {
    const log = (...args: unknown[]) => writeLine(args.map(stringifyOne).join(' '));
    const consoleLike = {
      log: (...args: unknown[]) => writeLine(args.map(stringifyOne).join(' ')),
      warn: (...args: unknown[]) => writeLine(args.map(stringifyOne).join(' ')),
      error: (...args: unknown[]) => writeLine(args.map(stringifyOne).join(' ')),
    };
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
      ...args: string[]
    ) => (...fnArgs: unknown[]) => Promise<unknown>;
    const argNames = [
      'ctx',
      'stage',
      'runtime',
      'store',
      'log',
      'sleep',
      'console',
      'BackgroundActor',
      'AudioActor',
      'CharacterActor',
      'Josei06Sailor',
      'Josei07Sailor',
      'AkamafuGirl',
      'NekoAnimal',
    ];
    const fn = new AsyncFunction(...argNames, code);
    const result = await fn(
      ctx,
      stage,
      runtime,
      store,
      log,
      sleep,
      consoleLike,
      BackgroundActor,
      AudioActor,
      CharacterActor,
      Josei06Sailor,
      Josei07Sailor,
      AkamafuGirl,
      NekoAnimal,
    );
    if (result !== undefined) writeLine(stringifyOne(result));
  } catch (e) {
    writeLine(e instanceof Error ? `${e.name}: ${e.message}` : stringifyOne(e));
  } finally {
    running.value = false;
  }
}

function runCommand(line: string) {
  const cmd = line.trim().slice(1).trim();
  if (!cmd || cmd === 'help') {
    writeLine('Commands:');
    const allCommands = getAllCommandNames();
    allCommands.forEach((c) => {
      const manual = getManual(c);
      if (manual) {
        writeLine(`  :${c.padEnd(14)} ${manual.description}`);
      }
    });
    writeLine('');
    writeLine('Use :man <command> to view detailed manual for a command.');
    writeLine('Shortcuts:');
    writeLine('  Tab/Shift+Tab   补全并循环候选');
    writeLine('  ←/→/Home/End    光标移动');
    writeLine('  ↑/↓             历史命令');
    writeLine('  Ctrl/Cmd+L      清屏');
    return;
  }
  if (cmd.startsWith('man ')) {
    const cmdName = cmd.slice(4).trim();
    if (!cmdName) {
      writeLine('Usage: :man <command>');
      writeLine('');
      writeLine('Available commands: ' + getAllCommandNames().join(', '));
      return;
    }
    const manual = getManual(cmdName);
    if (!manual) {
      writeLine(`No manual found for command: ${cmdName}`);
      const similar = searchCommands(cmdName);
      if (similar.length > 0) {
        writeLine('');
        writeLine('Did you mean?');
        similar.slice(0, 5).forEach((m) => {
          writeLine(`  :man ${m.name}`);
        });
      }
      return;
    }
    writeLine(formatManual(manual));
    return;
  }
  if (cmd === 'clear') {
    clearTerminal();
    return;
  }
  if (cmd === 'env') {
    writeLine(
      [
        'ctx',
        'stage',
        'runtime',
        'store',
        'log',
        'sleep',
        'BackgroundActor',
        'AudioActor',
        'CharacterActor',
        'Josei06Sailor',
        'Josei07Sailor',
        'AkamafuGirl',
        'NekoAnimal',
      ].join(' / '),
    );
    return;
  }
  if (cmd === 'vars') {
    const vars = runtime.state.vars ?? {};
    if (Object.keys(vars).length === 0) {
      writeLine('(empty)');
    } else {
      writeLine(JSON.stringify(vars, null, 2));
    }
    return;
  }
  if (cmd.startsWith('var ')) {
    const key = cmd.slice(4).trim();
    if (!key) {
      writeLine('Usage: :var <key>');
      return;
    }
    const value = ctx.var(key);
    writeLine(JSON.stringify(value, null, 2));
    return;
  }
  if (cmd.startsWith('set ')) {
    const args = cmd.slice(4).trim();
    const spaceIndex = args.indexOf(' ');
    if (spaceIndex === -1) {
      writeLine('Usage: :set <key> <value>');
      return;
    }
    const key = args.slice(0, spaceIndex).trim();
    const valueStr = args.slice(spaceIndex + 1).trim();
    // 尝试解析为 JSON，如果失败则作为字符串
    let value: unknown;
    try {
      value = JSON.parse(valueStr);
    } catch {
      value = valueStr;
    }
    void ctx.setVar(key, value);
    writeLine(`Set ${key} = ${JSON.stringify(value)}`);
    return;
  }
  if (cmd.startsWith('del ')) {
    const key = cmd.slice(4).trim();
    if (!key) {
      writeLine('Usage: :del <key>');
      return;
    }
    void ctx.delVar(key);
    writeLine(`Deleted ${key}`);
    return;
  }
  if (cmd.startsWith('store ')) {
    const ns = cmd.slice(6).trim();
    if (!ns) {
      writeLine('Usage: :store <namespace>');
      return;
    }
    const storeObj = ctx.store(ns);
    const allVars = storeObj.getAll();
    if (Object.keys(allVars).length === 0) {
      writeLine(`(empty namespace: ${ns})`);
    } else {
      writeLine(JSON.stringify(allVars, null, 2));
    }
    return;
  }
  if (cmd === 'scene') {
    writeLine(String(runtime.state.scene ?? ''));
    return;
  }
  if (cmd === 'actors') {
    writeLine((runtime.state.actorIds ?? Object.keys(runtime.state.actors ?? {})).join(', '));
    return;
  }
  if (cmd === 'state') {
    writeLine(JSON.stringify(runtime.state, null, 2));
    return;
  }
  if (cmd === 'saves') {
    void (async () => {
      const saves = await runtime.listSaves();
      if (saves.length === 0) {
        writeLine('(no saves)');
      } else {
        saves.forEach((s) => {
          writeLine(`${s.slot} - ${s.scene || 'Unknown'} - ${new Date(s.time || 0).toLocaleString()}`);
        });
      }
    })();
    return;
  }
  if (cmd.startsWith('save ')) {
    const slot = cmd.slice(5).trim() || undefined;
    void (async () => {
      await runtime.save(slot);
      writeLine(`Saved to: ${slot || 'auto slot'}`);
    })();
    return;
  }
  if (cmd === 'save') {
    void (async () => {
      await runtime.save();
      writeLine('Saved to: auto slot');
    })();
    return;
  }
  if (cmd.startsWith('load ')) {
    const slot = cmd.slice(5).trim();
    if (!slot) {
      writeLine('Usage: :load <slot>');
      return;
    }
    void (async () => {
      const result = await runtime.load(slot);
      if (result.ok) {
        writeLine(`Loaded from: ${slot}`);
      } else {
        writeLine(`Failed to load: ${result.error || 'unknown error'}`);
      }
    })();
    return;
  }
  if (cmd.startsWith('indexeddb ')) {
    const action = cmd.slice(11).trim();
    if (action === 'status') {
      writeLine(`IndexedDB: ${runtime.isUsingIndexedDB() ? 'enabled' : 'disabled'}`);
      return;
    }
    if (action === 'enable') {
      runtime.setUseIndexedDB(true);
      writeLine('IndexedDB enabled');
      return;
    }
    if (action === 'disable') {
      runtime.setUseIndexedDB(false);
      writeLine('IndexedDB disabled');
      return;
    }
    writeLine('Usage: :indexeddb <status|enable|disable>');
    return;
  }
  if (cmd.startsWith('show ')) {
    const args = cmd.slice(5).trim();
    if (!args) {
      writeLine('Usage: :show <expr> [depth]');
      return;
    }
    // 解析表达式和深度参数
    const parts = args.split(/\s+/);
    const expr = parts[0]!;
    const depth = parts[1] ? parseInt(parts[1], 10) : 2;
    void showExpression(expr, isNaN(depth) ? 2 : depth);
    return;
  }
  if (cmd === 'back') {
    store.back();
    return;
  }
  if (cmd === 'restart') {
    runtime.reset();
    return;
  }
  writeLine(`Unknown command: ${cmd}`);
}

async function showExpression(expr: string, depth: number = 2) {
  try {
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
      ...args: string[]
    ) => (...fnArgs: unknown[]) => Promise<unknown>;
    const fn = new AsyncFunction(
      'ctx',
      'stage',
      'runtime',
      'store',
      'BackgroundActor',
      'AudioActor',
      'CharacterActor',
      'Josei06Sailor',
      'Josei07Sailor',
      'AkamafuGirl',
      'NekoAnimal',
      `return (${expr})`,
    );
    const result = await fn(
      ctx,
      stage,
      runtime,
      store,
      BackgroundActor,
      AudioActor,
      CharacterActor,
      Josei06Sailor,
      Josei07Sailor,
      AkamafuGirl,
      NekoAnimal,
    );
    if (result === undefined) {
      writeLine('undefined');
    } else if (result === null) {
      writeLine('null');
    } else if (typeof result === 'object') {
      writeLine(JSON.stringify(result, null, Math.max(0, Math.min(10, depth))));
    } else {
      writeLine(stringifyOne(result));
    }
  } catch (e) {
    writeLine(e instanceof Error ? `${e.name}: ${e.message}` : String(e));
  }
}

function insertText(text: string) {
  if (!text) return;
  resetCompletion();
  replaceRange(cursor, cursor, text);
}

function backspace() {
  if (cursor <= 0) return;
  resetCompletion();
  replaceRange(cursor - 1, cursor, '');
}

function del() {
  if (cursor >= input.length) return;
  resetCompletion();
  replaceRange(cursor, cursor + 1, '');
}

function moveCursor(delta: number) {
  if (!delta) return;
  cursor = Math.max(0, Math.min(input.length, cursor + delta));
  resetCompletion();
  renderLine();
}

function setCursor(pos: number) {
  cursor = Math.max(0, Math.min(input.length, pos));
  resetCompletion();
  renderLine();
}

function handleTabComplete(backward = false) {
  if (!term) return;
  const left = input.slice(0, cursor);
  const right = input.slice(cursor);

  if (
    completionSession &&
    input.startsWith(completionSession.before) &&
    input.endsWith(completionSession.after) &&
    cursor === input.length - completionSession.after.length
  ) {
    const step = backward ? -1 : 1;
    completionSession.index =
      (completionSession.index + step + completionSession.candidates.length) %
      completionSession.candidates.length;
    const next = completionSession.candidates[completionSession.index]!;
    const start = completionSession.before.length;
    const end = input.length - completionSession.after.length;
    replaceRange(start, end, next);
    completionSession.before = input.slice(0, start);
    completionSession.after = input.slice(end);
    return;
  }

  const t = parseCompletionTarget(left);
  if (!t) return;
  const env: Record<string, unknown> = {
    ctx,
    stage,
    runtime,
    store,
    log: () => undefined,
    sleep,
    console: console,
    BackgroundActor,
    AudioActor,
    CharacterActor,
    Josei06Sailor,
    Josei07Sailor,
    AkamafuGirl,
    NekoAnimal,
  };

  if (t.kind === 'global') {
    const prefix = t.baseName;
    const list = globalCompletions(prefix);
    if (!list.length) return;
    const start = left.length - prefix.length;
    const before = input.slice(0, start);
    const after = right;
    completionSession = { before, after, candidates: list, index: 0, kind: 'global' };
    replaceRange(start, cursor, list[0]!);
    return;
  }

  const base = env[t.baseName];
  if (!base) return;
  const prefix = t.propPrefix;
  const props = completionCandidates(base, prefix);
  if (!props.length) return;
  const start = left.length - prefix.length;
  const before = input.slice(0, start);
  const after = right;
  completionSession = { before, after, candidates: props, index: 0, kind: 'prop' };
  replaceRange(start, cursor, props[0]!);
}

function setupTerminal() {
  const el = terminalEl.value;
  if (!el || term) return;
  term = new Terminal({
    convertEol: true,
    cursorBlink: true,
    fontSize: 12,
    scrollback: 100000,
    theme: {
      background: '#0b0e14',
      foreground: '#e6e1cf',
    },
  });
  fit = new FitAddon();
  term.loadAddon(fit);
  term.open(el);
  fit.fit();
  term.focus();
  writeBanner();
  resetLine();
  renderLine();

  ro = new ResizeObserver(() => {
    fit?.fit();
  });
  ro.observe(el);

  term.onKey(({ key, domEvent }) => {
    if (!term) return;
    const ctrlOrCmd = domEvent.ctrlKey || domEvent.metaKey;
    if (ctrlOrCmd && (domEvent.key === 'l' || domEvent.key === 'L')) {
      domEvent.preventDefault();
      clearTerminal();
      return;
    }
    if (domEvent.key === 'Tab') {
      domEvent.preventDefault();
      handleTabComplete(domEvent.shiftKey);
      return;
    }
    if (domEvent.key === 'Backspace') {
      domEvent.preventDefault();
      backspace();
      return;
    }
    if (domEvent.key === 'Delete') {
      domEvent.preventDefault();
      del();
      return;
    }
    if (domEvent.key === 'ArrowLeft') {
      domEvent.preventDefault();
      moveCursor(-1);
      return;
    }
    if (domEvent.key === 'ArrowRight') {
      domEvent.preventDefault();
      moveCursor(1);
      return;
    }
    if (domEvent.key === 'Home') {
      domEvent.preventDefault();
      setCursor(0);
      return;
    }
    if (domEvent.key === 'End') {
      domEvent.preventDefault();
      setCursor(input.length);
      return;
    }
    if (domEvent.key === 'ArrowUp') {
      domEvent.preventDefault();
      if (!history.length) return;
      if (historyIndex === history.length) historyDraft = input;
      historyIndex = Math.max(0, historyIndex - 1);
      input = history[historyIndex] ?? '';
      cursor = input.length;
      resetCompletion();
      renderLine();
      return;
    }
    if (domEvent.key === 'ArrowDown') {
      domEvent.preventDefault();
      if (!history.length) return;
      if (historyIndex >= history.length) return;
      historyIndex = Math.min(history.length, historyIndex + 1);
      input = historyIndex === history.length ? historyDraft : (history[historyIndex] ?? '');
      cursor = input.length;
      resetCompletion();
      renderLine();
      return;
    }
    if (domEvent.key === 'Enter') {
      domEvent.preventDefault();
      const runText = input.trim();
      term.write('\r\n');
      if (runText) history.push(runText);
      historyIndex = history.length;
      historyDraft = '';
      resetCompletion();
      resetLine();
      if (!runText) {
        renderLine();
        return;
      }
      const runPromise = runText.startsWith(':') ? runCommand(runText) : runCode(runText);
      void Promise.resolve(runPromise).finally(() => {
        resetLine();
        renderLine();
      });
      return;
    }
    if (running.value) return;
    if (key.length === 1 && !ctrlOrCmd && !domEvent.altKey) {
      insertText(key);
    }
  });
}

function disposeTerminal() {
  if (ro && terminalEl.value) ro.unobserve(terminalEl.value);
  ro = null;
  fit?.dispose();
  fit = null;
  term?.dispose();
  term = null;
}

onMounted(() => {
  if (visible.value) setupTerminal();
});

onBeforeUnmount(() => {
  disposeTerminal();
});

watch(
  () => visible.value,
  async (v) => {
    if (v) {
      await nextTick();
      setupTerminal();
    } else {
      disposeTerminal();
    }
  },
);
</script>

<style scoped>
.script-console {
  height: 100%;
  overflow: hidden;
}
.panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.85);
  color: rgba(255, 255, 255, 0.9);
}
.help {
  font-size: 12px;
  opacity: 0.85;
}
.terminal {
  flex: 1 1 auto;
  min-height: 0;
  padding: 0;
}
.terminal-host {
  height: 100%;
  background: #000;
}
.toolbar {
  padding: 4px 8px;
}
:deep(.toolbar .q-btn) {
  min-height: 24px;
  min-width: 24px;
}
</style>
