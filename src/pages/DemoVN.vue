<template>
  <q-page class="column items-stretch">
    <div class="col stage-container">
      <StageView :debug="showDebug">
        <template #overlay>
          <div class="overlay-toolbar">
            <button class="ov-btn" @click="showContext = !showContext">上下文</button>
            <button class="ov-btn" @click="showDebug = !showDebug">调试</button>
            <button class="ov-btn" @click="showHistory = !showHistory">历史</button>
          </div>
          <DialogBox />
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
const store = useEngineStore();
onMounted(() => {
  void scene1();
});
</script>

<style scoped>
.stage-container {
  flex: 1 1 auto;
  min-height: 0;
}
.overlay-toolbar {
  position: absolute;
  right: 12px;
  bottom: 160px;
  display: flex;
  gap: 8px;
  z-index: 1001;
}
.ov-btn {
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
}
</style>
