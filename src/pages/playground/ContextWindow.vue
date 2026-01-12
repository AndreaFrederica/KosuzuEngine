<template>
  <FloatingWindow
    v-model="open"
    title="Context"
    storage-key="playground:contextWindow"
    window-class="bg-grey-10 text-white"
  >
    <q-tabs v-model="tab" dense active-color="primary" indicator-color="primary" class="bg-grey-9">
      <q-tab name="engine" label="Engine" />
      <q-tab name="live2d" label="Live2D Raw" />
    </q-tabs>
    <q-separator />
    <div class="fw-content">
      <div v-if="tab === 'engine'" class="q-pa-sm">
        <q-input v-model="filter" dense filled placeholder="Filter (JSON text)" class="q-mb-sm" />
        <pre class="fw-pre">{{ filteredEngineJson }}</pre>
      </div>
      <div v-else class="q-pa-sm">
        <div class="text-caption q-mb-sm">Actor: {{ actorId }}</div>
        <pre class="fw-pre">{{ live2dJson }}</pre>
      </div>
    </div>
  </FloatingWindow>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useEngineStore } from 'stores/engine-store';
import { useLive2DDebugStore } from 'stores/live2d-debug-store';
import FloatingWindow from 'components/FloatingWindow.vue';

const props = defineProps<{
  modelValue: boolean;
  actorId: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void;
}>();

const store = useEngineStore();
const live2dDebug = useLive2DDebugStore();

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const tab = ref<'engine' | 'live2d'>('engine');
const filter = ref('');

const engineJson = computed(() => {
  const state = store.state;
  return JSON.stringify(state, null, 2);
});

const filteredEngineJson = computed(() => {
  const f = filter.value.trim();
  if (!f) return engineJson.value;
  const lines = engineJson.value.split('\n');
  return lines.filter((l) => l.toLowerCase().includes(f.toLowerCase())).join('\n') || '// no match';
});

const live2dJson = computed(() => {
  const snap = live2dDebug.snapshots[props.actorId];
  return snap ? JSON.stringify(snap, null, 2) : '// no live2d snapshot';
});
</script>
