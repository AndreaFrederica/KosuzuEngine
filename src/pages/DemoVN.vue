<template>
  <q-page class="column items-stretch q-pa-none">
    <div class="col stage-container">
      <StageView :debug="showDebug" @stage-click="onStageClick">
        <template #overlay>
          <DialogBox
            v-if="showDialog"
            @back="store.back?.()"
            @open-context="showContext = !showContext"
            @open-debug="showDebug = !showDebug"
            @open-history="showHistory = !showHistory"
            @hide="showDialog = false"
          />
          <ChoicePanel />
          <ContextViewer :visible="showContext" />
          <HistoryPanel
            :visible="showHistory"
            @close="showHistory = false"
            @back="store.back?.()"
          />
        </template>
      </StageView>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import StageView from '../engine/render/StageView.vue';
import DialogBox from '../engine/render/DialogBox.vue';
import ChoicePanel from '../engine/render/ChoicePanel.vue';
import ContextViewer from '../engine/debug/ContextViewer.vue';
import HistoryPanel from '../engine/render/HistoryPanel.vue';
import { onMounted, ref } from 'vue';
import { useEngineStore } from 'stores/engine-store';
import { scene1 } from '../scripts/scene1';
const showDebug = ref(false);
const showContext = ref(false);
const showHistory = ref(false);
const showDialog = ref(true);
const store = useEngineStore();
onMounted(() => {
  void scene1();
});
function onStageClick() {
  if (!showDialog.value) showDialog.value = true;
}
</script>

<style scoped>
.stage-container {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
</style>
