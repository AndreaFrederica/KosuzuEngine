<template>
  <div class="engine-stage" ref="stageRef" @click="emitStageClick">
    <div class="engine-background">
      <img v-if="bgName" class="bg-img" :src="bgSrc" />
    </div>
    <div class="engine-layers">
      <img
        v-for="id in actorIds"
        :key="id"
        class="actor-img"
        :src="spriteSrcById(id)"
        :style="actorStyleById(id)"
        @error="onImgErrorById(id)"
      />
      <div class="overlay" :style="{ zIndex: overlayLayer }">
        <slot name="overlay"></slot>
      </div>
    </div>
    <div v-if="debug" class="engine-debug">
      <div>BG: {{ bgName }} → {{ bgSrc }}</div>
      <div v-for="d in debugInfo" :key="d.id">
        [{{ d.id }}] {{ d.name }} pose={{ d.pose }} x={{ d.t?.x }} y={{ d.t?.y }} scale={{
          d.t?.scale
        }}
        src={{ d.src }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watchEffect, type CSSProperties } from 'vue';
// no-op
import { useEngineStore } from 'stores/engine-store';
const props = defineProps<{ debug?: boolean }>();
const emit = defineEmits<{ (e: 'stage-click'): void }>();
const store = useEngineStore();
const bgName = computed(() => store.background()?.name);
const bgSrc = computed(() => (bgName.value ? `/assets/bg/${bgName.value}` : ''));
const stageRef = ref<HTMLElement | null>(null);
const overlayLayer = computed(() => store.overlayLayer());
const stageSize = ref({ width: 0, height: 0 });
let ro: ResizeObserver | null = null;
onMounted(() => {
  const el = stageRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  stageSize.value = { width: rect.width, height: rect.height };
  void store.dispatch('stage', { width: rect.width, height: rect.height });
  ro = new ResizeObserver(() => {
    const r = el.getBoundingClientRect();
    if (stageSize.value.width !== r.width || stageSize.value.height !== r.height) {
      stageSize.value = { width: r.width, height: r.height };
      void store.dispatch('stage', { width: r.width, height: r.height });
    }
  });
  ro.observe(el);
});
onBeforeUnmount(() => {
  if (ro && stageRef.value) ro.unobserve(stageRef.value);
  ro = null;
});
const actorIds = computed(() => store.actorIds());
const debugInfo = computed(() =>
  actorIds.value.map((id) => {
    const a = store.state.actors[id];
    return {
      id,
      name: a?.name,
      pose: a?.pose?.emote,
      t: a?.transform,
      src: spriteSrcById(id),
    };
  }),
);
watchEffect(() => {
  if (!props.debug) return;

  console.log('BG', bgName.value, bgSrc.value);
  actorIds.value.forEach((id) => {
    const a = store.state.actors[id];
    const src = store.spriteForActor(id) || spriteSrcById(id);

    console.log('ACTOR', id, a?.name, a?.transform, a?.pose, src);
  });
});

function emitStageClick() {
  emit('stage-click');
}

function actorStyleById(id: string): CSSProperties {
  const a = store.state.actors[id];
  const t = a?.transform || {};
  const opacity = t.opacity ?? 1;
  const scale = t.scale ?? 1;
  const z = t.layer ?? 1;
  return {
    position: 'absolute',
    transform: `translate(-50%, -50%) scale(${scale})`,
    left: `${(t.x ?? 0) * 100}%`,
    top: `${(1 - (t.y ?? 0)) * 100}%`,
    opacity,
    zIndex: z,
    maxWidth: '40%',
  };
}

function spriteSrcById(id: string) {
  const a = store.state.actors[id];
  const src = store.spriteForActor(id);
  if (src) return src;
  const name = a?.name;
  if (!name) return '';
  const folder = name.startsWith('animal_') ? 'png' : 'PNG';
  const parts = name.split('_');
  const prefix = parts.length >= 2 ? `${parts[0]}_${parts[1]}` : parts[0];
  const key = a?.pose?.emote;
  const file = key ? `${prefix}_${key}.png` : `${prefix}.png`;
  return `/assets/characters/${name}/${folder}/${file}`;
}
function onImgErrorById(id: string) {
  const src = store.spriteForActor(id) || spriteSrcById(id);

  console.error('Image failed', id, store.state.actors[id]?.name, src);
}
</script>

<style scoped>
.engine-stage {
  position: relative;
  width: 100%;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}
.engine-background {
  position: absolute;
  inset: 0;
  z-index: 0;
}
.bg-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.engine-layers {
  position: absolute;
  inset: 0;
}
.actor-img {
  pointer-events: none;
}
.overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.overlay > * {
  pointer-events: auto;
}
.engine-debug {
  position: absolute;
  left: 8px;
  bottom: 8px;
  right: 8px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.4);
  color: #fff;
  font-size: 12px;
  z-index: 99;
}
</style>
