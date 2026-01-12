import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Live2DInspection, Live2DSnapshot } from '../engine/live2d/backend';

export const useLive2DDebugStore = defineStore('live2d-debug', () => {
  const snapshots = ref<Record<string, Live2DSnapshot>>({});
  const inspections = ref<Record<string, Live2DInspection>>({});

  function setInspection(actorId: string, inspection: Live2DInspection | null) {
    if (!inspection) {
      delete inspections.value[actorId];
      return;
    }
    inspections.value[actorId] = inspection;
  }

  function setSnapshot(actorId: string, snapshot: Live2DSnapshot | null) {
    if (!snapshot) {
      delete snapshots.value[actorId];
      return;
    }
    snapshots.value[actorId] = snapshot;
  }

  function clearActor(actorId: string) {
    delete snapshots.value[actorId];
    delete inspections.value[actorId];
  }

  return {
    snapshots,
    inspections,
    setInspection,
    setSnapshot,
    clearActor,
  };
});
