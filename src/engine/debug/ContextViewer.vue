<template>
  <FloatingWindow
    :model-value="visible"
    @update:model-value="onUpdateOpen"
    title="上下文查看器"
    storage-key="panel:contextViewer"
    window-id="panel:contextViewer"
    window-class="bg-grey-10 text-white"
    :initial-size="{ w: 760, h: 520 }"
    :min-width="520"
    :min-height="320"
  >
    <div class="fw-content context-viewer">
      <div class="cv-body">
        <div class="section">
          <div class="section-title">Background</div>
          <div class="line">name: {{ bg?.name }}</div>
          <div class="line">src: {{ bgSrc }}</div>
        </div>
        <div class="section">
          <div class="section-title">BGM</div>
          <div class="line">name: {{ bgm?.name }}</div>
          <div class="line">volume: {{ bgm?.volume }}</div>
        </div>
        <div class="section">
          <div class="section-title">Actors ({{ actorCount }})</div>
          <div v-for="id in actorIds" :key="id" class="line">
            [{{ id }}] {{ actorById(id)?.name }} pose={{ actorById(id)?.pose?.emote }} x={{
              actorById(id)?.transform?.x
            }}
            y={{ actorById(id)?.transform?.y }} scale={{ actorById(id)?.transform?.scale }} src={{
              spriteFor(id)
            }}
          </div>
        </div>
        <div class="section">
          <div class="section-title">Raw State</div>
          <pre class="raw">{{ stateJson }}</pre>
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
const bg = computed(() => store.background());
const bgm = computed(() => store.bgm());
const bgSrc = computed(() => (bg.value?.name ? `/assets/bg/${bg.value.name}` : ''));
const actorIds = computed<string[]>(() => store.actorIds());
const actorCount = computed<number>(() => actorIds.value.length);
function actorById(id: string) {
  return store.state.actors[id];
}
const stateJson = computed<string>(() => JSON.stringify(store.state, null, 2));
function spriteFor(id: string) {
  return store.spriteForActor(id);
}

function onUpdateOpen(v: boolean) {
  if (!v) emit('close');
}
</script>

<style scoped>
.context-viewer {
  height: 100%;
  color: #fff;
  padding: 10px;
  overflow: auto;
}
.cv-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.section {
  padding: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}
.section-title {
  font-weight: 600;
  margin-bottom: 4px;
  font-size: 13px;
}
.line {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  opacity: 0.9;
}
.raw {
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
  font-size: 11px;
  opacity: 0.8;
}
</style>
