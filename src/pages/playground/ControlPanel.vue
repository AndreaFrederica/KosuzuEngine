<template>
  <div class="control-panel q-pa-none column full-height">
    <q-scroll-area class="col">
      <!-- Transform (Controlled by Parent usually, but can be here) -->
      <!-- We leave transform to parent or another component?
           Actually, let's keep Transform here as well for completeness if parent passes props.
           But usually transform is "Actor" state, not "Model" internal state.
           Let's skip Transform here and focus on Model Internals. -->

      <!-- Motions -->
      <q-expansion-item label="Settings" header-class="text-primary">
        <div class="q-pa-sm">
          <q-toggle
            v-model="showHitArea"
            label="Show Hit Areas"
            @update:model-value="updateHitArea"
          />
          <q-toggle v-model="followMouse" label="Follow Mouse (Context Driven)" />
        </div>
      </q-expansion-item>

      <q-expansion-item label="Motions" header-class="text-primary" default-opened>
        <q-list dense separator dark>
          <q-item
            clickable
            v-ripple
            v-for="m in motionList"
            :key="m"
            @click="playMotion(m)"
            :active="currentMotion === m"
            active-class="text-primary bg-grey-9"
          >
            <q-item-section>
              <div class="row items-center">
                <q-icon v-if="currentMotion === m" name="play_arrow" size="xs" class="q-mr-xs" />
                <span>{{ m }}</span>
              </div>
            </q-item-section>
            <q-item-section side>
              <q-btn
                flat
                round
                dense
                icon="content_copy"
                size="sm"
                @click.stop="$emit('copy', `await actor.motion('${m}');`)"
              />
            </q-item-section>
          </q-item>
          <q-item v-if="motionList.length === 0" class="text-grey italic">
            <q-item-section>No motions found</q-item-section>
          </q-item>
        </q-list>
      </q-expansion-item>

      <!-- Expressions -->
      <q-expansion-item label="Expressions" header-class="text-primary">
        <q-list dense separator dark>
          <q-item
            clickable
            v-ripple
            v-for="e in expressionList"
            :key="e"
            @click="playExpression(e)"
          >
            <q-item-section>{{ e }}</q-item-section>
            <q-item-section side>
              <q-btn
                flat
                round
                dense
                icon="content_copy"
                size="sm"
                @click.stop="$emit('copy', `await actor.pose('${e}');`)"
              />
            </q-item-section>
          </q-item>
          <q-item v-if="expressionList.length === 0" class="text-grey italic">
            <q-item-section>No expressions found</q-item-section>
          </q-item>
        </q-list>
      </q-expansion-item>

      <!-- Parameters -->
      <q-expansion-item label="Parameters" default-opened header-class="text-primary">
        <div v-for="(group, name) in paramGroups" :key="name">
          <q-expansion-item
            :label="name"
            dense
            header-style="font-size: 0.9em; opacity: 0.8"
            default-opened
          >
            <div class="q-pa-sm">
              <div v-for="p in group" :key="p.id" class="q-mb-xs">
                <div class="row items-center justify-between text-caption">
                  <span>{{ p.id }}</span>
                  <span>{{ p.value.toFixed(2) }}</span>
                  <q-btn
                    flat
                    round
                    dense
                    icon="content_copy"
                    size="xs"
                    @click="
                      $emit('copy', `await actor.setParam('${p.id}', ${p.value.toFixed(2)});`)
                    "
                  />
                </div>
                <q-slider
                  v-if="typeof p.min === 'number' && typeof p.max === 'number'"
                  v-model="p.value"
                  :min="p.min"
                  :max="p.max"
                  :step="0.01"
                  dense
                  @update:model-value="(val) => setParam(p.id, val)"
                />
                <q-input
                  v-else
                  filled
                  dense
                  type="number"
                  v-model.number="p.value"
                  @update:model-value="(val) => setParam(p.id, val as number | null)"
                />
              </div>
            </div>
          </q-expansion-item>
        </div>
      </q-expansion-item>
    </q-scroll-area>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useEngineStore } from 'stores/engine-store';
import { useLive2DDebugStore } from 'stores/live2d-debug-store';
import { getLive2DBackend } from '../../engine/live2d/runtime';

const props = defineProps<{
  modelId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actor?: any; // Pass actor for high-level actions
}>();

defineEmits<{
  (e: 'copy', code: string): void;
}>();

const backend = getLive2DBackend();
const engineStore = useEngineStore();
const live2dStore = useLive2DDebugStore();
const inspection = computed(() => live2dStore.inspections[props.modelId]);
const snapshot = computed(() => live2dStore.snapshots[props.modelId]);
const motionList = computed(() => inspection.value?.motions ?? []);
const expressionList = computed(() => inspection.value?.expressions ?? []);
const currentMotion = computed(
  () => engineStore.state.actors?.[props.modelId]?.live2d?.motionId ?? '',
);
const showHitArea = ref(false);
const followMouse = computed({
  get: () => !!engineStore.state.actors?.[props.modelId]?.live2d?.followMouse,
  set: (val: boolean) => {
    if (props.actor?.setFollowMouse) {
      void props.actor.setFollowMouse(val);
    }
  },
});

interface ParamInfo {
  id: string;
  min?: number;
  max?: number;
  value: number;
}
const params = ref<ParamInfo[]>([]);

function groupFromParamId(id: string) {
  let s = id;
  s = s.replace(/^PARAM_/, '');
  s = s.replace(/^Param/, '');
  s = s.replace(/[^A-Za-z0-9_]+/g, '_');
  const parts = s.includes('_')
    ? s.split('_').filter(Boolean)
    : s
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .split('_')
        .filter(Boolean);
  const head = (parts[0] ?? '').toLowerCase();
  if (!head) return 'Other';
  return head.charAt(0).toUpperCase() + head.slice(1);
}

const paramGroups = computed(() => {
  const groups = new Map<string, ParamInfo[]>();
  for (const p of params.value) {
    const group = groupFromParamId(p.id);
    const arr = groups.get(group) ?? [];
    arr.push(p);
    groups.set(group, arr);
  }

  for (const arr of groups.values()) {
    arr.sort((a, b) => a.id.localeCompare(b.id));
  }

  const sortedNames = [...groups.keys()].sort((a, b) => {
    if (a === 'Other') return 1;
    if (b === 'Other') return -1;
    return a.localeCompare(b);
  });

  const out: Record<string, ParamInfo[]> = {};
  for (const name of sortedNames) out[name] = groups.get(name) ?? [];
  return out;
});

watch(
  inspection,
  (v) => {
    const list = v?.parameters ?? [];
    params.value = list.map((p) => {
      const base: ParamInfo = { id: p.id, value: p.value };
      if (typeof p.min === 'number') base.min = p.min;
      if (typeof p.max === 'number') base.max = p.max;
      return base;
    });
  },
  { immediate: true },
);

watch(
  snapshot,
  (v) => {
    const values = new Map((v?.parameters ?? []).map((p) => [p.id, p.value]));
    params.value = params.value.map((p) => {
      const nv = values.get(p.id);
      return typeof nv === 'number' ? { ...p, value: nv } : p;
    });
  },
  { immediate: true },
);

async function playMotion(m: string) {
  if (props.actor) {
    await props.actor.motion(m);
  }
}

async function playExpression(e: string) {
  if (props.actor) {
    await props.actor.pose(e);
  }
}

function setParam(id: string, val: number | null) {
  if (val === null) return;
  if (props.actor?.setParam) {
    void props.actor.setParam(id, val);
  }
}

function updateHitArea(val: boolean) {
  const b = backend as unknown as {
    setHitAreasVisible?: (actorId: string, visible: boolean) => void;
  };
  b.setHitAreasVisible?.(props.modelId, val);
}
</script>
