<template>
  <div class="choice-panel q-pa-md">
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
function onClick(goto?: string) {
  store.choose(goto);
}
</script>

<style scoped>
.choice-panel {
  position: absolute;
  left: 50%;
  bottom: 10%;
  transform: translateX(-50%);
}
</style>
