<template>
  <div class="engine-stage" ref="stageRef" @click="emitStageClick">
    <div class="engine-background">
      <img
        v-if="bgPrevSrc"
        class="bg-img bg-prev"
        :class="bgClassPrev"
        :src="bgPrevSrc"
        :style="bgStylePrev"
      />
      <img
        v-if="bgCurrSrc"
        class="bg-img bg-curr"
        :class="bgClassCurr"
        :src="bgCurrSrc"
        :style="bgStyleCurr"
      />
    </div>
    <div class="engine-layers">
      <div v-for="id in actorIds" :key="id" class="actor-node" :style="actorNodeStyleById(id)">
        <img
          class="actor-img"
          :src="spriteSrcById(id)"
          :style="actorImgStyleById(id)"
          @error="onImgErrorById(id)"
        />
      </div>
      <div class="overlay" :style="{ zIndex: overlayLayer }">
        <slot name="overlay"></slot>
      </div>
    </div>
    <div v-if="debug" class="engine-debug">
      <div>BG: {{ bgName }} → {{ bgCurrSrc }}</div>
      <div v-for="d in debugInfo" :key="d.id">
        [{{ d.id }}] {{ d.name }} pose={{ d.pose }} x={{ d.t?.x }} y={{ d.t?.y }} scale={{
          d.t?.scale
        }}
        src={{ d.src }}
      </div>
    </div>
    <!-- 用户交互提示：点击启用音频 -->
    <transition name="audio-prompt">
      <div v-if="showAudioPrompt" class="audio-prompt" @click="handleAudioPromptClick">
        <div class="audio-prompt-content">
          <svg class="audio-prompt-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
          <span class="audio-prompt-text">点击启用音频</span>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watchEffect, watch, type CSSProperties } from 'vue';
// no-op
import { useEngineStore } from 'stores/engine-store';
import { audioManager, setShowInteractionCallback } from './AudioManager';
const props = defineProps<{ debug?: boolean }>();
const emit = defineEmits<{ (e: 'stage-click'): void }>();
const store = useEngineStore();
const bg = computed(() => store.background());

// 音频提示状态
const showAudioPrompt = ref(false);

// 设置交互提示回调
setShowInteractionCallback(() => {
  showAudioPrompt.value = true;
});

// 处理音频提示点击
function handleAudioPromptClick() {
  console.log('[StageView] 用户点击音频提示');
  showAudioPrompt.value = false;
}

// BGM 状态
const bgm = computed(() => store.state.bgm);
const bgmName = computed(() => bgm.value?.name);
const bgmVolume = computed(() => bgm.value?.volume ?? 1.0);
const bgmFadeDuration = computed(() => bgm.value?.fadeDuration);

// 监听 BGM 状态变化并播放
watch(
  () => ({ name: bgmName.value, volume: bgmVolume.value, fadeDuration: bgmFadeDuration.value }),
  async ({ name, volume, fadeDuration }) => {
    console.log('[StageView] BGM 状态变化:', { name, volume, fadeDuration });

    if (name) {
      // 播放新的背景音乐，使用脚本指定的淡入时间（如果没有则使用默认 800ms）
      await audioManager.play(name, fadeDuration ?? 800);
    } else {
      // 停止背景音乐，使用脚本指定的淡出时间（如果没有则使用默认 500ms）
      await audioManager.stop(fadeDuration ?? 500);
    }
  },
  { deep: true, immediate: true },
);
const bgName = computed(() => bg.value?.name);
const bgEffect = computed(() => bg.value?.effect ?? 'cut');
const bgDuration = computed(() => bg.value?.duration ?? 0);
const bgCurrSrc = computed(() => (bgName.value ? `/assets/bg/${bgName.value}` : ''));
const bgPrevSrc = ref<string>('');
const bgClassPrev = ref<Record<string, boolean>>({});
const bgClassCurr = ref<Record<string, boolean>>({});
const bgStylePrev = ref<CSSProperties>({});
const bgStyleCurr = ref<CSSProperties>({});
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
  // 清理音频资源
  audioManager.dispose();
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

  console.log('BG', bgName.value, bgCurrSrc.value);
  actorIds.value.forEach((id) => {
    const a = store.state.actors[id];
    const src = store.spriteForActor(id) || spriteSrcById(id);

    console.log('ACTOR', id, a?.name, a?.transform, a?.pose, src);
  });
});

function emitStageClick() {
  emit('stage-click');
}

function actorNodeStyleById(id: string): CSSProperties {
  const a = store.state.actors[id];
  const t = a?.transform || {};
  const opacity = t.opacity ?? 1;
  const scale = t.scale ?? 1;
  const scaleX = t.scaleX ?? 1;
  const scaleY = t.scaleY ?? 1;
  const rotate = t.rotate ?? 0;
  const z = t.layer ?? 1;
  // Dev 模式下恢复位置时禁用 CSS 动画
  const isRestoring = store.isRestoring?.() ?? false;
  const duration = isRestoring ? 0 : (a?.transition?.duration ?? 0);
  const trans = typeof duration === 'number' && duration > 0 ? `${Math.floor(duration)}ms` : '0ms';
  return {
    position: 'absolute',
    transform: `translate(-50%, -50%) rotate(${rotate}deg) scale(${scale * scaleX}, ${scale * scaleY})`,
    left: `${(t.x ?? 0) * 100}%`,
    top: `${(1 - (t.y ?? 0)) * 100}%`,
    opacity,
    zIndex: z,
    maxWidth: '40%',
    transition: `transform ${trans} ease, left ${trans} ease, top ${trans} ease, opacity ${trans} ease`,
  };
}

function actorImgStyleById(id: string): CSSProperties {
  const a = store.state.actors[id];
  const t = a?.transform || {};
  // Dev 模式下恢复位置时禁用 CSS 动画
  const isRestoring = store.isRestoring?.() ?? false;
  const duration = isRestoring ? 0 : (a?.transition?.duration ?? 0);
  const trans = typeof duration === 'number' && duration > 0 ? `${Math.floor(duration)}ms` : '0ms';
  const filters: string[] = [];
  if (typeof t.blur === 'number') filters.push(`blur(${t.blur}px)`);
  if (typeof t.brightness === 'number') filters.push(`brightness(${t.brightness})`);
  if (typeof t.grayscale === 'number') filters.push(`grayscale(${t.grayscale})`);
  if (typeof t.saturate === 'number') filters.push(`saturate(${t.saturate})`);
  if (typeof t.contrast === 'number') filters.push(`contrast(${t.contrast})`);
  if (typeof t.hueRotate === 'number') filters.push(`hue-rotate(${t.hueRotate}deg)`);

  const fx = a?.fx;
  const fxName = fx?.name;
  const fxDuration = typeof fx?.duration === 'number' && fx.duration > 0 ? fx.duration : 0;
  const token = typeof fx?.token === 'number' ? fx.token : 0;

  const styles: CSSProperties = {
    pointerEvents: 'none',
    filter: filters.length ? filters.join(' ') : undefined,
    transition: `filter ${trans} ease`,
  };

  // Dev 模式下恢复位置时禁用特效动画
  if (!isRestoring) {
    if (fxName === 'shake' && fxDuration > 0) {
      const p = fx?.params || {};
      const strengthX = Number(p.strengthX ?? 0.01);
      const strengthY = Number(p.strengthY ?? 0);
      const xPx = Math.max(0, strengthX) * (stageSize.value.width || 800);
      const yPx = Math.max(0, strengthY) * (stageSize.value.height || 450);
      (styles as Record<string, unknown>)['--shake-x'] = `${Math.round(xPx)}px`;
      (styles as Record<string, unknown>)['--shake-y'] = `${Math.round(yPx)}px`;
      styles.animation = `${token % 2 === 0 ? 'actor-shake' : 'actor-shake2'} ${Math.floor(fxDuration)}ms linear`;
      styles.animationIterationCount = 1;
      styles.animationFillMode = 'both';
    }
    if (fxName === 'jump' && fxDuration > 0) {
      const p = fx?.params || {};
      const height = Number(p.height ?? 0.06);
      const yPx = Math.max(0, height) * (stageSize.value.height || 450);
      (styles as Record<string, unknown>)['--jump-y'] = `${Math.round(yPx)}px`;
      styles.animation = `${token % 2 === 0 ? 'actor-jump' : 'actor-jump2'} ${Math.floor(fxDuration)}ms cubic-bezier(.2,.8,.2,1)`;
      styles.animationIterationCount = 1;
      styles.animationFillMode = 'both';
    }
  }
  return styles;
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

let bgPrevName: string | undefined = undefined;
let bgTransTimer: number | null = null;
watchEffect(() => {
  const next = bgName.value;
  const prev = bgPrevName;
  if (next === prev) return;
  bgPrevName = next;
  if (!next) {
    bgPrevSrc.value = '';
    bgStylePrev.value = {};
    bgStyleCurr.value = {};
    bgClassPrev.value = {};
    bgClassCurr.value = {};
    return;
  }
  const prevSrc = prev ? `/assets/bg/${prev}` : '';
  const effect = bgEffect.value;
  const duration = Math.max(0, Math.floor(bgDuration.value));

  // Dev 模式下恢复位置时禁用背景切换动画
  const isRestoring = store.isRestoring?.() ?? false;
  if (isRestoring || !prevSrc || effect === 'cut' || duration <= 0) {
    bgPrevSrc.value = '';
    bgStylePrev.value = {};
    bgStyleCurr.value = {};
    bgClassPrev.value = {};
    bgClassCurr.value = {};
    return;
  }
  bgPrevSrc.value = prevSrc;
  if (bgTransTimer) window.clearTimeout(bgTransTimer);
  const d = `${duration}ms`;

  bgStylePrev.value = { transition: `opacity ${d} ease`, opacity: 1 };
  bgStyleCurr.value = { transition: `opacity ${d} ease`, opacity: 0 };
  bgClassPrev.value = {};
  bgClassCurr.value = {};

  if (effect === 'fade') {
    bgStylePrev.value = { transition: `opacity ${d} ease`, opacity: 1 };
    bgStyleCurr.value = { transition: `opacity ${d} ease`, opacity: 0 };
  } else if (effect === 'wipeLeft') {
    bgStyleCurr.value = {
      transition: `clip-path ${d} ease`,
      clipPath: 'inset(0 100% 0 0)',
    } as CSSProperties;
  } else if (effect === 'wipeRight') {
    bgStyleCurr.value = {
      transition: `clip-path ${d} ease`,
      clipPath: 'inset(0 0 0 100%)',
    } as CSSProperties;
  } else if (effect === 'zoom') {
    bgStyleCurr.value = {
      transition: `transform ${d} ease, opacity ${d} ease`,
      transform: 'scale(1.08)',
      opacity: 0,
    };
  } else if (effect === 'blurFade') {
    bgStyleCurr.value = {
      transition: `filter ${d} ease, opacity ${d} ease`,
      filter: 'blur(14px)',
      opacity: 0,
    };
  }

  requestAnimationFrame(() => {
    if (effect === 'fade') {
      bgStylePrev.value = { transition: `opacity ${d} ease`, opacity: 0 };
      bgStyleCurr.value = { transition: `opacity ${d} ease`, opacity: 1 };
    } else if (effect === 'wipeLeft' || effect === 'wipeRight') {
      bgStyleCurr.value = {
        transition: `clip-path ${d} ease`,
        clipPath: 'inset(0 0 0 0)',
      } as CSSProperties;
      bgStylePrev.value = { transition: `opacity ${d} ease`, opacity: 0 };
    } else if (effect === 'zoom') {
      bgStylePrev.value = { transition: `opacity ${d} ease`, opacity: 0 };
      bgStyleCurr.value = {
        transition: `transform ${d} ease, opacity ${d} ease`,
        transform: 'scale(1)',
        opacity: 1,
      };
    } else if (effect === 'blurFade') {
      bgStylePrev.value = { transition: `opacity ${d} ease`, opacity: 0 };
      bgStyleCurr.value = {
        transition: `filter ${d} ease, opacity ${d} ease`,
        filter: 'blur(0px)',
        opacity: 1,
      };
    }
  });

  bgTransTimer = window.setTimeout(() => {
    bgPrevSrc.value = '';
    bgStylePrev.value = {};
    bgStyleCurr.value = {};
    bgClassPrev.value = {};
    bgClassCurr.value = {};
    bgTransTimer = null;
  }, duration + 30);
});
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
  width: 100%;
  height: auto;
  display: block;
}
.actor-node {
  pointer-events: none;
  will-change: transform, left, top, opacity;
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

<style>
@keyframes actor-shake {
  0% {
    transform: translate3d(0, 0, 0);
  }
  10% {
    transform: translate3d(var(--shake-x, 10px), calc(var(--shake-y, 0px) * -1), 0);
  }
  20% {
    transform: translate3d(calc(var(--shake-x, 10px) * -1), var(--shake-y, 0px), 0);
  }
  30% {
    transform: translate3d(var(--shake-x, 10px), var(--shake-y, 0px), 0);
  }
  40% {
    transform: translate3d(calc(var(--shake-x, 10px) * -1), calc(var(--shake-y, 0px) * -1), 0);
  }
  50% {
    transform: translate3d(var(--shake-x, 10px), 0, 0);
  }
  60% {
    transform: translate3d(calc(var(--shake-x, 10px) * -1), 0, 0);
  }
  70% {
    transform: translate3d(var(--shake-x, 10px), 0, 0);
  }
  80% {
    transform: translate3d(calc(var(--shake-x, 10px) * -1), 0, 0);
  }
  90% {
    transform: translate3d(var(--shake-x, 10px), 0, 0);
  }
  100% {
    transform: translate3d(0, 0, 0);
  }
}
@keyframes actor-shake2 {
  0% {
    transform: translate3d(0, 0, 0);
  }
  10% {
    transform: translate3d(var(--shake-x, 10px), calc(var(--shake-y, 0px) * -1), 0);
  }
  20% {
    transform: translate3d(calc(var(--shake-x, 10px) * -1), var(--shake-y, 0px), 0);
  }
  30% {
    transform: translate3d(var(--shake-x, 10px), var(--shake-y, 0px), 0);
  }
  40% {
    transform: translate3d(calc(var(--shake-x, 10px) * -1), calc(var(--shake-y, 0px) * -1), 0);
  }
  50% {
    transform: translate3d(var(--shake-x, 10px), 0, 0);
  }
  60% {
    transform: translate3d(calc(var(--shake-x, 10px) * -1), 0, 0);
  }
  70% {
    transform: translate3d(var(--shake-x, 10px), 0, 0);
  }
  80% {
    transform: translate3d(calc(var(--shake-x, 10px) * -1), 0, 0);
  }
  90% {
    transform: translate3d(var(--shake-x, 10px), 0, 0);
  }
  100% {
    transform: translate3d(0, 0, 0);
  }
}
@keyframes actor-jump {
  0% {
    transform: translate3d(0, 0, 0);
  }
  35% {
    transform: translate3d(0, calc(var(--jump-y, 20px) * -1), 0);
  }
  100% {
    transform: translate3d(0, 0, 0);
  }
}
@keyframes actor-jump2 {
  0% {
    transform: translate3d(0, 0, 0);
  }
  35% {
    transform: translate3d(0, calc(var(--jump-y, 20px) * -1), 0);
  }
  100% {
    transform: translate3d(0, 0, 0);
  }
}

/* 音频提示样式 */
.audio-prompt {
  position: absolute;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  cursor: pointer;
  animation: audio-prompt-pulse 2s ease-in-out infinite;
}

.audio-prompt-content {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 12px 24px;
  border-radius: 50px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  border: 2px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.audio-prompt:hover .audio-prompt-content {
  background: rgba(0, 0, 0, 0.9);
  border-color: rgba(255, 255, 255, 0.4);
  transform: scale(1.05);
}

.audio-prompt-icon {
  width: 24px;
  height: 24px;
  animation: audio-prompt-icon-bounce 1s ease-in-out infinite;
}

.audio-prompt-text {
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

@keyframes audio-prompt-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.85;
  }
}

@keyframes audio-prompt-icon-bounce {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.15);
  }
}

/* 音频提示过渡动画 */
.audio-prompt-enter-active,
.audio-prompt-leave-active {
  transition: all 0.4s ease;
}

.audio-prompt-enter-from,
.audio-prompt-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

.audio-prompt-enter-to,
.audio-prompt-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
</style>
