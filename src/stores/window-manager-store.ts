import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useWindowManagerStore = defineStore('windowManager', () => {
  const zIndexById = ref<Record<string, number>>({});
  const nextZ = ref(10_000);

  function ensureNextAtLeast(v: number) {
    if (v > nextZ.value) nextZ.value = v;
  }

  function allocate(id: string, minZ = 0) {
    ensureNextAtLeast(minZ);
    const existing = zIndexById.value[id];
    if (typeof existing === 'number') return existing;
    const z = nextZ.value++;
    zIndexById.value = { ...zIndexById.value, [id]: z };
    return z;
  }

  function bringToFront(id: string, minZ = 0) {
    ensureNextAtLeast(minZ);
    const z = nextZ.value++;
    zIndexById.value = { ...zIndexById.value, [id]: z };
    return z;
  }

  function getZIndex(id: string, minZ = 0) {
    return zIndexById.value[id] ?? allocate(id, minZ);
  }

  return { allocate, bringToFront, getZIndex };
});

