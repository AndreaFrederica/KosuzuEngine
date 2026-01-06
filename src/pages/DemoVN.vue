<template>
  <q-page class="column items-stretch">
    <div class="col">
      <StageView />
    </div>
    <div class="col-auto">
      <DialogBox />
      <ChoicePanel />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import StageView from '../engine/render/StageView.vue';
import DialogBox from '../engine/render/DialogBox.vue';
import ChoicePanel from '../engine/render/ChoicePanel.vue';
import { onMounted } from 'vue';
import { scene1 } from '../scripts/scene1';
onMounted(() => {
  void scene1();
});
</script>
