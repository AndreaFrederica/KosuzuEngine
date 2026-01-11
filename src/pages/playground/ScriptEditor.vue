<template>
  <div class="column full-height">
    <div class="col relative-position" ref="editorContainer"></div>
    <div class="q-pa-sm bg-grey-10 row justify-end">
      <q-btn
        color="primary"
        label="Run Script"
        icon="play_arrow"
        @click="runScript"
        :loading="running"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import * as ts from 'typescript';
import { defaultRuntime } from '../../engine/core/Runtime';

const props = defineProps<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actor: any;
}>();

const editorContainer = ref<HTMLElement | null>(null);
let editor: monaco.editor.IStandaloneCodeEditor | null = null;
const running = ref(false);

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

onMounted(() => {
  ensureMonacoWorkers();
  if (editorContainer.value) {
    editor = monaco.editor.create(editorContainer.value, {
      value:
        '// Write your script here\nawait actor.say("Hello Live2D!");\nawait actor.motion("tap_body");',
      language: 'typescript',
      theme: 'vs-dark',
      automaticLayout: true,
    });
  }
});

onBeforeUnmount(() => {
  if (editor) editor.dispose();
});

async function runScript() {
  if (!editor) return;
  const tsCode = editor.getValue();
  running.value = true;

  try {
    const jsCode = ts.transpile(tsCode);

    // Create async wrapper
    const wrapped = `return (async (actor, runtime) => { ${jsCode} })`;
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const func = new Function(wrapped)();

    await func(props.actor, defaultRuntime);
  } catch (e) {
    console.error('Script Error:', e);
    alert('Script Error: ' + String(e));
  } finally {
    running.value = false;
  }
}

function setValue(code: string) {
  if (editor) editor.setValue(code);
}

defineExpose({ setValue });
</script>
