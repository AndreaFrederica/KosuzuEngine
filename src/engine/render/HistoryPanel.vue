<template>
  <FloatingWindow
    :model-value="visible"
    @update:model-value="onUpdateOpen"
    title="历史对话"
    storage-key="panel:history"
    window-id="panel:history"
    window-class="bg-grey-10 text-white"
    :initial-size="{ w: 760, h: 420 }"
    :min-width="520"
    :min-height="260"
  >
    <div class="fw-content history-panel">
      <div class="history-body">
        <div v-for="(h, idx) in history" :key="idx" class="line">
          <span class="speaker">{{ h.speaker || '——' }}</span>
          <span v-if="h.html" class="text" v-html="h.text"></span>
          <span v-else class="text">{{ h.text }}</span>
        </div>
      </div>
    </div>
  </FloatingWindow>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useEngineStore } from 'stores/engine-store';
import FloatingWindow from 'components/FloatingWindow.vue';

const props = withDefaults(defineProps<{ visible?: boolean }>(), { visible: false });
const visible = computed(() => props.visible);
const emit = defineEmits<{ (e: 'close'): void }>();
const store = useEngineStore();
const history = computed(() => store.history());

function onUpdateOpen(v: boolean) {
  if (!v) emit('close');
}
</script>

<style scoped>
.history-panel {
  overflow: auto;
  color: #fff;
  font-size: 14px;
  padding: 8px;
}
.history-body .line {
  padding: 4px 0;
}
.speaker {
  display: inline-block;
  min-width: 120px;
  color: #9ad;
}
.text {
  color: #fff;
}
</style>
