<template>
  <div v-if="visible" class="choice-panel q-pa-md">
    <q-card>
      <q-card-section>
        <div class="column">
          <q-btn
            v-for="(c, i) in items"
            :key="i"
            class="q-mb-sm"
            :label="c.text"
            @click="onClick(c.goto)"
          />
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useEngineStore } from 'stores/engine-store';
const store = useEngineStore();
const choice = computed(() => store.choice());
const items = computed(() => choice.value.items);
const visible = computed(() => choice.value.visible);
function onClick(goto?: string) {
  store.choose(goto);
}
</script>

<style scoped>
.choice-panel {
  position: absolute;
  left: 50%;
  bottom: 240px;
  transform: translateX(-50%);
  z-index: 2000;
  width: min(520px, 92vw);
}
</style>
