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
          <q-select
            v-model="profileId"
            dense
            filled
            emit-value
            map-options
            label="Playground Profile"
            :options="profileOptions"
          />
          <div class="row q-gutter-sm q-mt-sm">
            <q-input v-model="profileName" dense filled class="col" label="Profile Name" />
            <q-btn dense color="primary" label="Save New" @click="saveNewProfile" />
            <q-btn
              dense
              color="primary"
              outline
              label="Overwrite"
              @click="overwriteSelectedProfile"
            />
            <q-btn dense color="negative" outline label="Delete" @click="deleteSelectedProfile" />
            <q-btn dense color="secondary" outline label="Apply" @click="applySelectedProfile" />
          </div>
          <q-toggle
            v-model="showHitArea"
            label="Show Hit Areas"
            @update:model-value="updateHitArea"
          />
          <q-toggle v-model="followMouse" label="Follow Mouse (Context Driven)" />
          <q-toggle v-model="banExpressionsInControl" label="Ban Expressions in __CONTROL__" />
          <q-toggle v-model="banIdleInControl" label="Ban Auto Idle in __CONTROL__" />
          <q-toggle v-model="banMotionsInControl" label="Ban Motions in __CONTROL__" />
          <q-toggle v-model="banFocusInControl" label="Ban Focus in __CONTROL__" />
          <q-toggle v-model="banNaturalInControl" label="Ban Natural Move in __CONTROL__" />
          <q-toggle v-model="banEyeBlinkInControl" label="Ban EyeBlink in __CONTROL__" />
          <q-toggle v-model="banBreathInControl" label="Ban Breath in __CONTROL__" />
          <q-toggle v-model="banPhysicsInControl" label="Ban Physics in __CONTROL__" />
          <q-toggle v-model="banPoseInControl" label="Ban Pose in __CONTROL__" />
          <div class="q-mt-sm text-caption">
            <div>Control Mode: {{ debugControlMode }}</div>
            <div>Idle Group: {{ debugIdleGroup }}</div>
            <div>
              Expression: available={{ debugExprAvailable }},
              {{ debugExprPresent ? 'present' : 'none' }}, active={{ debugExprActive }}, finished={{
                debugExprFinished
              }}, reserve={{ debugExprReserve }}
            </div>
          </div>
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
                @click.stop="$emit('copy', motionCopyCmd(m))"
              />
            </q-item-section>
            <q-tooltip style="white-space: nowrap">{{ motionCopyCmd(m) }}</q-tooltip>
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
                @click.stop="$emit('copy', expressionCopyCmd(e))"
              />
            </q-item-section>
            <q-tooltip style="white-space: nowrap">{{ expressionCopyCmd(e) }}</q-tooltip>
          </q-item>
          <q-item v-if="expressionList.length === 0" class="text-grey italic">
            <q-item-section>No expressions found</q-item-section>
          </q-item>
        </q-list>
      </q-expansion-item>

      <q-expansion-item label="Hit Areas" header-class="text-primary">
        <q-list dense separator dark>
          <q-item clickable v-ripple v-for="h in hitAreaList" :key="h" @click="triggerHitArea(h)">
            <q-item-section>
              <div class="row items-center">
                <q-icon name="ads_click" size="xs" class="q-mr-xs" />
                <span>{{ h }}</span>
              </div>
            </q-item-section>
            <q-item-section side>
              <q-btn
                flat
                round
                dense
                icon="content_copy"
                size="sm"
                @click.stop="$emit('copy', hitAreaCopyCmd(h))"
              />
            </q-item-section>
            <q-tooltip style="white-space: nowrap">{{ hitAreaCopyCmd(h) }}</q-tooltip>
          </q-item>
          <q-item v-if="hitAreaList.length === 0" class="text-grey italic">
            <q-item-section>No hit areas found</q-item-section>
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
                    @click="$emit('copy', paramCopyCmd(p.id, p.value))"
                  />
                  <q-tooltip style="white-space: nowrap">{{
                    paramCopyCmd(p.id, p.value)
                  }}</q-tooltip>
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
                <div v-else class="row items-center q-gutter-sm">
                  <q-input
                    dense
                    filled
                    type="number"
                    style="width: 90px"
                    :model-value="getCustomRange(p).min"
                    @update:model-value="
                      (val) =>
                        setCustomRange(p, {
                          min: Number(val),
                          max: getCustomRange(p).max,
                        })
                    "
                  />
                  <q-slider
                    class="col"
                    v-model="p.value"
                    :min="getCustomRange(p).min"
                    :max="getCustomRange(p).max"
                    :step="0.01"
                    dense
                    @update:model-value="(val) => setParam(p.id, val)"
                  />
                  <q-input
                    dense
                    filled
                    type="number"
                    style="width: 90px"
                    :model-value="getCustomRange(p).max"
                    @update:model-value="
                      (val) =>
                        setCustomRange(p, {
                          min: getCustomRange(p).min,
                          max: Number(val),
                        })
                    "
                  />
                </div>
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
import { usePlaygroundLive2DStore } from 'stores/playground-live2d-store';
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
const playgroundStore = usePlaygroundLive2DStore();
const inspection = computed(() => live2dStore.inspections[props.modelId]);
const snapshot = computed(() => live2dStore.snapshots[props.modelId]);
const motionList = computed(() => inspection.value?.motions ?? []);
const expressionList = computed(() => inspection.value?.expressions ?? []);
const hitAreaList = computed(() => inspection.value?.hitAreas ?? []);
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
const banExpressionsInControl = computed({
  get: () => engineStore.state.actors?.[props.modelId]?.live2d?.controlBanExpressions ?? true,
  set: (val: boolean) => {
    if (props.actor?.setControlBanExpressions) {
      void props.actor.setControlBanExpressions(val);
    }
  },
});
const banIdleInControl = computed({
  get: () => engineStore.state.actors?.[props.modelId]?.live2d?.controlBanIdle ?? true,
  set: (val: boolean) => {
    if (props.actor?.setControlBanIdle) void props.actor.setControlBanIdle(val);
  },
});
const banMotionsInControl = computed({
  get: () => engineStore.state.actors?.[props.modelId]?.live2d?.controlBanMotions ?? true,
  set: (val: boolean) => {
    if (props.actor?.setControlBanMotions) void props.actor.setControlBanMotions(val);
  },
});
const banFocusInControl = computed({
  get: () => engineStore.state.actors?.[props.modelId]?.live2d?.controlBanFocus ?? true,
  set: (val: boolean) => {
    if (props.actor?.setControlBanFocus) void props.actor.setControlBanFocus(val);
  },
});
const banNaturalInControl = computed({
  get: () => engineStore.state.actors?.[props.modelId]?.live2d?.controlBanNatural ?? true,
  set: (val: boolean) => {
    if (props.actor?.setControlBanNatural) void props.actor.setControlBanNatural(val);
  },
});
const banEyeBlinkInControl = computed({
  get: () => engineStore.state.actors?.[props.modelId]?.live2d?.controlBanEyeBlink ?? true,
  set: (val: boolean) => {
    if (props.actor?.setControlBanEyeBlink) void props.actor.setControlBanEyeBlink(val);
  },
});
const banBreathInControl = computed({
  get: () => engineStore.state.actors?.[props.modelId]?.live2d?.controlBanBreath ?? true,
  set: (val: boolean) => {
    if (props.actor?.setControlBanBreath) void props.actor.setControlBanBreath(val);
  },
});
const banPhysicsInControl = computed({
  get: () => engineStore.state.actors?.[props.modelId]?.live2d?.controlBanPhysics ?? true,
  set: (val: boolean) => {
    if (props.actor?.setControlBanPhysics) void props.actor.setControlBanPhysics(val);
  },
});
const banPoseInControl = computed({
  get: () => engineStore.state.actors?.[props.modelId]?.live2d?.controlBanPose ?? true,
  set: (val: boolean) => {
    if (props.actor?.setControlBanPose) void props.actor.setControlBanPose(val);
  },
});

const debugControlMode = computed(() => inspection.value?.debug?.controlMode ?? '-');
const debugIdleGroup = computed(() => inspection.value?.debug?.motion?.idleGroup ?? '-');
const debugExprPresent = computed(() => inspection.value?.debug?.expression?.present ?? false);
const debugExprAvailable = computed(() => inspection.value?.debug?.expression?.available ?? false);
const debugExprActive = computed(() => inspection.value?.debug?.expression?.active ?? '-');
const debugExprFinished = computed(() => inspection.value?.debug?.expression?.isFinished ?? '-');
const debugExprReserve = computed(() => inspection.value?.debug?.expression?.reserveIndex ?? '-');

const modelKey = computed(
  () => engineStore.state.actors?.[props.modelId]?.live2d?.modelId ?? props.modelId,
);

const profileId = computed({
  get: () => playgroundStore.activeProfileId,
  set: (val: string | undefined) => playgroundStore.setActiveProfile(val),
});

const profileName = ref('');
const profileOptions = computed(() =>
  playgroundStore.profileList.map((p) => ({ label: p.name, value: p.id })),
);

function currentSettingsForProfile() {
  const a = engineStore.state.actors?.[props.modelId]?.live2d;
  return {
    showHitArea: showHitArea.value,
    followMouse: a?.followMouse ?? false,
    controlBanExpressions: a?.controlBanExpressions ?? true,
    controlBanIdle: a?.controlBanIdle ?? true,
    controlBanMotions: a?.controlBanMotions ?? true,
    controlBanFocus: a?.controlBanFocus ?? true,
    controlBanNatural: a?.controlBanNatural ?? true,
    controlBanEyeBlink: a?.controlBanEyeBlink ?? true,
    controlBanBreath: a?.controlBanBreath ?? true,
    controlBanPhysics: a?.controlBanPhysics ?? true,
    controlBanPose: a?.controlBanPose ?? true,
  };
}

function saveNewProfile() {
  const name = profileName.value.trim() || `Profile ${new Date().toLocaleString()}`;
  playgroundStore.saveNewProfile({ name, settings: currentSettingsForProfile() });
}

function overwriteSelectedProfile() {
  const id = profileId.value;
  if (!id) return;
  const name = profileName.value.trim();
  const input: { name?: string; settings: ReturnType<typeof currentSettingsForProfile> } = {
    settings: currentSettingsForProfile(),
  };
  if (name) input.name = name;
  playgroundStore.overwriteProfile(id, input);
}

function deleteSelectedProfile() {
  const id = profileId.value;
  if (!id) return;
  playgroundStore.deleteProfile(id);
}

function applySelectedProfile() {
  const id = profileId.value;
  if (!id) return;
  const p = playgroundStore.applyProfile(id);
  if (!p) return;
  profileName.value = p.name;
  if (typeof p.settings.followMouse === 'boolean' && props.actor?.setFollowMouse) {
    void props.actor.setFollowMouse(p.settings.followMouse);
  }
  if (
    typeof p.settings.controlBanExpressions === 'boolean' &&
    props.actor?.setControlBanExpressions
  ) {
    void props.actor.setControlBanExpressions(p.settings.controlBanExpressions);
  }
  if (typeof p.settings.controlBanIdle === 'boolean' && props.actor?.setControlBanIdle) {
    void props.actor.setControlBanIdle(p.settings.controlBanIdle);
  }
  if (typeof p.settings.controlBanMotions === 'boolean' && props.actor?.setControlBanMotions) {
    void props.actor.setControlBanMotions(p.settings.controlBanMotions);
  }
  if (typeof p.settings.controlBanFocus === 'boolean' && props.actor?.setControlBanFocus) {
    void props.actor.setControlBanFocus(p.settings.controlBanFocus);
  }
  if (typeof p.settings.controlBanNatural === 'boolean' && props.actor?.setControlBanNatural) {
    void props.actor.setControlBanNatural(p.settings.controlBanNatural);
  }
  if (typeof p.settings.controlBanEyeBlink === 'boolean' && props.actor?.setControlBanEyeBlink) {
    void props.actor.setControlBanEyeBlink(p.settings.controlBanEyeBlink);
  }
  if (typeof p.settings.controlBanBreath === 'boolean' && props.actor?.setControlBanBreath) {
    void props.actor.setControlBanBreath(p.settings.controlBanBreath);
  }
  if (typeof p.settings.controlBanPhysics === 'boolean' && props.actor?.setControlBanPhysics) {
    void props.actor.setControlBanPhysics(p.settings.controlBanPhysics);
  }
  if (typeof p.settings.controlBanPose === 'boolean' && props.actor?.setControlBanPose) {
    void props.actor.setControlBanPose(p.settings.controlBanPose);
  }
  if (typeof p.settings.showHitArea === 'boolean') {
    showHitArea.value = p.settings.showHitArea;
    updateHitArea(p.settings.showHitArea);
  }
}

watch(
  () => profileId.value,
  (id) => {
    if (!id) return;
    const p = playgroundStore.profiles[id];
    if (p) profileName.value = p.name;
  },
  { immediate: true },
);

interface ParamInfo {
  id: string;
  min?: number;
  max?: number;
  value: number;
}
const params = ref<ParamInfo[]>([]);

function defaultRangeForParam(id: string) {
  const upper = id.toUpperCase();
  if (upper.includes('ANGLE')) return { min: -30, max: 30 };
  if (upper.includes('MOUTH_OPEN') || upper.includes('OPEN')) return { min: 0, max: 1 };
  if (upper.includes('SMILE')) return { min: 0, max: 1 };
  if (upper.includes('EYE') && upper.includes('OPEN')) return { min: 0, max: 1 };
  return { min: -1, max: 1 };
}

function getCustomRange(p: ParamInfo) {
  const key = modelKey.value;
  const saved = playgroundStore.getParamRange(key, p.id);
  return saved ?? defaultRangeForParam(p.id);
}

function setCustomRange(p: ParamInfo, next: { min: number; max: number }) {
  playgroundStore.setParamRange(modelKey.value, p.id, next);
}

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
    await props.actor.expression(e);
  }
}

function motionCopyCmd(m: string) {
  return `await actor.motion('${m}');`;
}

function expressionCopyCmd(e: string) {
  return `await actor.expression('${e}');`;
}

function hitAreaCopyCmd(h: string) {
  return `await runtime.dispatch({ type: 'var', payload: { key: 'live2d.hitArea', value: { actorId: '${props.modelId}', name: '${h}', ts: Date.now() } } });`;
}

function paramCopyCmd(id: string, value: number) {
  return `await actor.setParam('${id}', ${value.toFixed(2)});`;
}

function normalizeKey(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function findMotionForHitArea(hitAreaName: string) {
  const area = normalizeKey(hitAreaName);
  const motions = motionList.value.filter((m) => m !== '__CONTROL__');
  const byArea = motions.filter((m) => normalizeKey(m).includes(area));
  const byTapAndArea = byArea.filter((m) => normalizeKey(m).includes('tap'));
  return byTapAndArea[0] ?? byArea[0] ?? null;
}

async function triggerHitArea(hitAreaName: string) {
  void engineStore.dispatch('var', {
    key: 'live2d.hitArea',
    value: { actorId: props.modelId, name: hitAreaName, ts: Date.now() },
  });

  const motion = findMotionForHitArea(hitAreaName);
  if (motion && props.actor?.motion) {
    await props.actor.motion(motion);
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
