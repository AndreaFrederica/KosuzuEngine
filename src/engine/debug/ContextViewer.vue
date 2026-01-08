<template>
  <div v-if="visible" class="context-viewer" @click.stop>
    <div class="cv-header">
      <div class="header-title">上下文查看器</div>
      <button class="close-btn" @click="$emit('close')">关闭</button>
    </div>
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
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useEngineStore } from 'stores/engine-store';
const { visible = false } = defineProps<{ visible?: boolean }>();
defineEmits<{ (e: 'close'): void }>();
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
</script>

<style scoped>
.context-viewer {
  position: absolute;
  left: 50%;
  bottom: 100px;
  transform: translateX(-50%);
  width: min(680px, calc(100% - 32px));
  background: rgba(0, 0, 0, 0.85);
  color: #fff;
  border-radius: 8px;
  padding: 10px;
  z-index: 1002;
  max-height: 50vh;
  overflow: auto;
}
.cv-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
}
.header-title {
  font-weight: 600;
  font-size: 14px;
}
.close-btn {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 12px;
}
.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
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
