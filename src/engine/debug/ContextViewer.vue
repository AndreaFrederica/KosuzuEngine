<template>
  <div v-if="visible" class="context-viewer">
    <div class="section">
      <div class="title">Background</div>
      <div class="line">name: {{ bg?.name }}</div>
      <div class="line">src: {{ bgSrc }}</div>
    </div>
    <div class="section">
      <div class="title">BGM</div>
      <div class="line">name: {{ bgm?.name }}</div>
      <div class="line">volume: {{ bgm?.volume }}</div>
    </div>
    <div class="section">
      <div class="title">Actors ({{ actorCount }})</div>
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
      <div class="title">Raw State</div>
      <pre class="raw">{{ stateJson }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useEngineStore } from 'stores/engine-store';
const { visible = false } = defineProps<{ visible?: boolean }>();
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
  left: 8px;
  bottom: 90px;
  right: 8px;
  max-height: 40vh;
  overflow: auto;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 12px;
  padding: 8px;
  z-index: 98;
}
.section {
  margin-bottom: 8px;
}
.title {
  font-weight: 600;
  margin-bottom: 4px;
}
.line {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.raw {
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}
</style>
