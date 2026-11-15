<template>
  <FloatingWindow
    :model-value="visible"
    title="脚本执行位置"
    storage-key="panel:scriptExecution"
    window-id="panel:scriptExecution"
    window-class="bg-grey-10 text-white"
    :initial-size="{ w: 800, h: 540 }"
    :min-width="360"
    :min-height="280"
    @update:model-value="!$event && emit('close')"
  >
    <section class="execution-viewer" aria-label="实时脚本执行位置">
      <header class="execution-toolbar">
        <div class="execution-location">
          <q-badge :color="statusColor" :label="statusLabel" />
          <span v-if="location" class="execution-file" :title="location.file">
            {{ displayFile(location.file) }}:{{ location.line }}
          </span>
          <span v-else class="execution-muted">尚无执行位置</span>
        </div>
        <div class="execution-controls">
          <q-toggle v-model="follow" dense size="sm" label="自动跟随" />
          <q-btn
            flat
            dense
            icon="my_location"
            aria-label="定位当前行"
            :disable="!source"
            @click="revealLine"
          >
            <q-tooltip>定位当前行</q-tooltip>
          </q-btn>
        </div>
      </header>

      <div v-if="execution.pending.length" class="execution-waits" aria-live="polite">
        <div v-for="call in execution.pending" :key="call.id" class="execution-wait">
          <q-icon name="hourglass_top" size="16px" />
          <span>{{ describeWait(call) }}</span>
          <span v-if="call.location" class="execution-muted">
            {{ displayFile(call.location.file) }}:{{ call.location.line }}
          </span>
        </div>
      </div>
      <div v-if="execution.error" class="execution-error" role="alert">{{ execution.error }}</div>

      <div ref="sourceViewport" class="execution-source" tabindex="0" aria-label="脚本源码">
        <div v-if="source !== undefined" class="execution-lines">
          <div
            v-for="(text, index) in lines"
            :key="index"
            class="execution-line"
            :class="{ 'is-current': index + 1 === location?.line }"
            :aria-current="index + 1 === location?.line ? 'step' : undefined"
            :data-line="index + 1"
          >
            <span class="execution-arrow" aria-hidden="true">{{
              index + 1 === location?.line ? '▶' : ''
            }}</span
            ><span class="execution-number" aria-hidden="true">{{ index + 1 }}</span
            ><code>{{ text || ' ' }}</code>
          </div>
        </div>
        <p v-else class="execution-empty">
          {{
            location
              ? '当前脚本未附带原始源码。文件和行号仍会实时更新。'
              : '运行脚本后，这里会显示源码并高亮当前执行行。'
          }}
        </p>
      </div>
      <footer class="execution-footer">
        <span>高亮最近执行的语句；等待时保留调用位置</span>
        <span v-if="source !== undefined">{{ lines.length }} 行</span>
      </footer>
    </section>
  </FloatingWindow>
</template>

<script setup lang="ts">
import { computed, nextTick, onScopeDispose, ref, shallowRef, watch } from 'vue';
import FloatingWindow from 'components/FloatingWindow.vue';
import { scriptSession } from '../script/ScriptSession';
import type { PendingHostCall, ScriptExecutionState } from '../script/QuickJSScriptRuntime';

const props = withDefaults(defineProps<{ visible?: boolean }>(), { visible: false });
const emit = defineEmits<{ (e: 'close'): void }>();
const follow = ref(true);
const sourceViewport = ref<HTMLElement>();
const execution = shallowRef<ScriptExecutionState>(scriptSession.executionState);
let unsubscribe: (() => void) | undefined;

// Hidden windows do not subscribe, poll, or keep a rendered trace history.
watch(
  () => props.visible,
  (visible) => {
    unsubscribe?.();
    unsubscribe = visible
      ? scriptSession.subscribeExecution((state) => {
          execution.value = state;
        })
      : undefined;
  },
  { immediate: true },
);
onScopeDispose(() => unsubscribe?.());

const location = computed(() => execution.value.location);
const source = computed(() =>
  location.value ? scriptSession.sourceFor(location.value.file) : undefined,
);
const lines = computed(() => source.value?.split(/\r?\n/) ?? []);
const statusLabel = computed(
  () =>
    ({
      idle: '未启动',
      running: '执行中',
      waiting: '等待中',
      completed: '已结束',
      stopped: '已停止',
      error: '执行出错',
    })[execution.value.status],
);
const statusColor = computed(
  () =>
    ({
      idle: 'grey-7',
      running: 'positive',
      waiting: 'amber-9',
      completed: 'blue-7',
      stopped: 'grey-7',
      error: 'negative',
    })[execution.value.status],
);

function displayFile(file: string) {
  const index = file.indexOf('/src/');
  return index >= 0 ? file.slice(index + 1) : file;
}

function describeWait(call: PendingHostCall) {
  if (call.name === '__trace') return '断点 / 单步：等待继续';
  if (call.name === 'sleep') return `计时器：${Number(call.args[0])} ms`;
  if (call.name === 'runtime.dispatch' || call.name === 'store.dispatch') {
    const action = call.args[0] as { type?: string; payload?: unknown } | undefined;
    if (action?.type === 'say') return '对白：等待点击继续';
    if (action?.type === 'choice') return '选项：等待选择';
    if (action?.type === 'wait') {
      const ms = typeof action.payload === 'number' ? action.payload : undefined;
      return ms === undefined ? '等待计时器' : `等待：${ms} ms`;
    }
    return `引擎操作：${action?.type ?? call.name}`;
  }
  return `等待宿主函数：${call.name}`;
}

async function revealLine() {
  await nextTick();
  const viewport = sourceViewport.value;
  const current = viewport?.querySelector<HTMLElement>('.is-current');
  if (!viewport || !current) return;
  viewport.scrollTop = current.offsetTop - viewport.clientHeight / 2 + current.offsetHeight / 2;
}

watch(
  [() => props.visible, follow, location, source],
  () => {
    if (props.visible && follow.value) void revealLine();
  },
  { flush: 'post' },
);
</script>

<style scoped>
.execution-viewer {
  height: 100%;
  display: flex;
  flex-direction: column;
  color: #e1e5ed;
  font-size: 12px;
}
.execution-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid #ffffff18;
}
.execution-location,
.execution-controls,
.execution-wait {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.execution-location {
  flex: 1;
}
.execution-controls {
  flex-shrink: 0;
}
.execution-file {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: monospace;
}
.execution-muted {
  color: #9aa6b7;
}
.execution-waits {
  max-height: 100px;
  overflow: auto;
  padding: 8px 12px;
  background: #e5ab2310;
}
.execution-wait {
  flex-wrap: wrap;
  padding: 2px 0;
}
.execution-error {
  padding: 8px 12px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: #ffb4b4;
  background: #c31b1b20;
  max-height: 100px;
  overflow: auto;
}
.execution-source {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: #171b22;
}
.execution-lines {
  min-width: 100%;
  width: max-content;
  padding: 14px 0;
  font:
    13px/24px Consolas,
    'Cascadia Code',
    monospace;
}
.execution-line {
  display: flex;
  min-height: 24px;
  padding-right: 20px;
}
.execution-line.is-current {
  color: #fff;
  background: #3868a844;
  box-shadow: inset 3px 0 #7eb8ff;
}
.execution-arrow {
  width: 24px;
  text-align: center;
  flex-shrink: 0;
  color: #7eb8ff;
  user-select: none;
}
.execution-number {
  width: 44px;
  padding-right: 14px;
  flex-shrink: 0;
  text-align: right;
  color: #7d899b;
  user-select: none;
}
.is-current .execution-number {
  color: #a6ceff;
}
.execution-line code {
  font: inherit;
  white-space: pre;
  tab-size: 2;
}
.execution-empty {
  padding: 24px;
  color: #9aa6b7;
}
.execution-footer {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 12px;
  color: #9aa6b7;
  font-size: 11px;
  border-top: 1px solid #ffffff18;
}
</style>
