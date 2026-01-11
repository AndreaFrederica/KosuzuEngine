import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

type ParamRange = { min: number; max: number };

export type PlaygroundLive2DProfile = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  settings: {
    showHitArea?: boolean;
    followMouse?: boolean;
    controlBanExpressions?: boolean;
    controlBanIdle?: boolean;
    controlBanMotions?: boolean;
    controlBanFocus?: boolean;
    controlBanNatural?: boolean;
    controlBanEyeBlink?: boolean;
    controlBanBreath?: boolean;
    controlBanPhysics?: boolean;
    controlBanPose?: boolean;
  };
  paramRangesByModel: Record<string, Record<string, ParamRange>>;
};

type Persisted = {
  version: 1;
  activeProfileId?: string;
  profiles: Record<string, PlaygroundLive2DProfile>;
  paramRangesByModel: Record<string, Record<string, ParamRange>>;
};

const STORAGE_KEY = 'playground:live2d';

function now() {
  return Date.now();
}

function genId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `p_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
  }
}

function clampRange(r: ParamRange) {
  const min = Number.isFinite(r.min) ? r.min : -1;
  const max = Number.isFinite(r.max) ? r.max : 1;
  if (min === max) return { min, max: min + 1 };
  if (min > max) return { min: max, max: min };
  return { min, max };
}

export const usePlaygroundLive2DStore = defineStore('playground-live2d', () => {
  const activeProfileId = ref<string | undefined>(undefined);
  const profiles = ref<Record<string, PlaygroundLive2DProfile>>({});
  const paramRangesByModel = ref<Record<string, Record<string, ParamRange>>>({});

  function persist() {
    const payload: Persisted = {
      version: 1,
      profiles: profiles.value,
      paramRangesByModel: paramRangesByModel.value,
    };
    if (typeof activeProfileId.value === 'string') payload.activeProfileId = activeProfileId.value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  function load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Partial<Persisted>;
      if (parsed.version !== 1) return;
      if (parsed.activeProfileId) activeProfileId.value = parsed.activeProfileId;
      if (parsed.profiles) profiles.value = parsed.profiles;
      if (parsed.paramRangesByModel) paramRangesByModel.value = parsed.paramRangesByModel;
    } catch {
      return;
    }
  }

  load();

  const profileList = computed(() =>
    Object.values(profiles.value).sort((a, b) => b.updatedAt - a.updatedAt),
  );

  function getParamRange(modelKey: string, paramId: string): ParamRange | undefined {
    return paramRangesByModel.value[modelKey]?.[paramId];
  }

  function setParamRange(modelKey: string, paramId: string, range: ParamRange) {
    const nextRange = clampRange(range);
    const model = { ...(paramRangesByModel.value[modelKey] ?? {}) };
    model[paramId] = nextRange;
    paramRangesByModel.value = { ...paramRangesByModel.value, [modelKey]: model };
    persist();
  }

  function deleteParamRange(modelKey: string, paramId: string) {
    const model = { ...(paramRangesByModel.value[modelKey] ?? {}) };
    if (!(paramId in model)) return;
    delete model[paramId];
    paramRangesByModel.value = { ...paramRangesByModel.value, [modelKey]: model };
    persist();
  }

  function setActiveProfile(id?: string) {
    activeProfileId.value = id;
    persist();
  }

  function saveNewProfile(input: { name: string; settings: PlaygroundLive2DProfile['settings'] }) {
    const id = genId();
    const t = now();
    const profile: PlaygroundLive2DProfile = {
      id,
      name: input.name,
      createdAt: t,
      updatedAt: t,
      settings: { ...input.settings },
      paramRangesByModel: { ...paramRangesByModel.value },
    };
    profiles.value = { ...profiles.value, [id]: profile };
    activeProfileId.value = id;
    persist();
    return id;
  }

  function overwriteProfile(id: string, input: { name?: string; settings: PlaygroundLive2DProfile['settings'] }) {
    const prev = profiles.value[id];
    if (!prev) return;
    const next: PlaygroundLive2DProfile = {
      ...prev,
      name: typeof input.name === 'string' ? input.name : prev.name,
      updatedAt: now(),
      settings: { ...input.settings },
      paramRangesByModel: { ...paramRangesByModel.value },
    };
    profiles.value = { ...profiles.value, [id]: next };
    persist();
  }

  function deleteProfile(id: string) {
    const next = { ...profiles.value };
    if (!(id in next)) return;
    delete next[id];
    profiles.value = next;
    if (activeProfileId.value === id) activeProfileId.value = undefined;
    persist();
  }

  function applyProfile(id: string) {
    const profile = profiles.value[id];
    if (!profile) return;
    paramRangesByModel.value = { ...profile.paramRangesByModel };
    activeProfileId.value = id;
    persist();
    return profile;
  }

  return {
    activeProfileId,
    profiles,
    profileList,
    paramRangesByModel,
    getParamRange,
    setParamRange,
    deleteParamRange,
    setActiveProfile,
    saveNewProfile,
    overwriteProfile,
    deleteProfile,
    applyProfile,
  };
});
