<template>
  <div class="dialog-box q-pa-md">
    <q-card>
      <q-card-section>
        <div class="row items-center">
          <div class="text-bold q-mr-md">{{ speaker }}</div>
          <div>{{ text }}</div>
        </div>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn label="继续" color="primary" @click="onNext" />
      </q-card-actions>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useEngineStore } from 'stores/engine-store';
const store = useEngineStore();
const dialog = computed(() => store.dialog());
const speaker = computed(() => dialog.value.speaker ?? '');
const text = computed(() => dialog.value.text ?? '');
function onNext() {
  store.advance();
}
</script>

<style scoped>
.dialog-box {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
}
</style>
