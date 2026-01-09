<template>
  <div v-if="visible" class="settings-panel" @click.stop>
    <div class="settings-header">
      <div class="title">{{ uiText.settings }}</div>
      <button class="close-btn" @click="$emit('close')">{{ uiText.close }}</button>
    </div>
    <div class="settings-body">
      <!-- 语言设置 -->
      <div class="setting-section">
        <div class="section-title">{{ uiText.language }}</div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">{{ uiText.language }}</div>
            <div class="setting-desc">选择界面和对话文本的语言 / Select UI and dialog language</div>
          </div>
          <select v-model="currentLocale" @change="onLocaleChange" class="setting-select">
            <option v-for="lang in supportedLocales" :key="lang.code" :value="lang.code">
              {{ lang.name }} / {{ lang.nativeName }}
            </option>
          </select>
        </div>
      </div>

      <!-- 语音设置 -->
      <div class="setting-section">
        <div class="section-title">{{ uiText.voiceSettings }} / Voice</div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">{{ uiText.voiceEnabled }}</div>
            <div class="setting-desc">自动播放角色语音 / Auto-play character voice</div>
          </div>
          <q-toggle
            :model-value="voiceEnabled"
            @update:model-value="onVoiceEnabledChange"
            color="primary"
            keep-color
          />
        </div>

        <div v-if="voiceEnabled" class="setting-item">
          <div class="setting-info">
            <div class="setting-label">{{ uiText.ttsEngine }}</div>
            <div class="setting-desc">选择文字转语音服务 / Select TTS service</div>
          </div>
          <select v-model="ttsEngine" @change="onTTSEngineChange" class="setting-select">
            <option value="browser">{{ uiText.ttsEngineBrowser }}</option>
            <option value="openai">{{ uiText.ttsEngineOpenai }}</option>
            <option value="azure">{{ uiText.ttsEngineAzure }}</option>
            <option value="google">{{ uiText.ttsEngineGoogle }}</option>
          </select>
        </div>

        <div v-if="voiceEnabled && ttsEngine === 'browser'" class="setting-item">
          <div class="setting-info">
            <div class="setting-label">{{ uiText.browserVoice }}</div>
            <div class="setting-desc">选择浏览器 TTS 语音 / Select browser TTS voice</div>
          </div>
          <select v-model="browserVoice" @change="onBrowserVoiceChange" class="setting-select">
            <option value="">默认 / Default</option>
            <option v-for="voice in browserVoices" :key="voice.name" :value="voice.name">
              {{ voice.name }} ({{ voice.lang }})
            </option>
          </select>
        </div>
      </div>

      <!-- 显示设置 -->
      <div class="setting-section">
        <div class="section-title">{{ uiText.displaySettings }}</div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">{{ uiText.dialogDiff }}</div>
            <div class="setting-desc">{{ uiText.dialogDiffDesc }}</div>
          </div>
          <q-toggle
            :model-value="dialogDiffEnabled"
            @update:model-value="onDialogDiffChange"
            color="primary"
            keep-color
          />
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">{{ uiText.autoContinueAfterLoad }}</div>
            <div class="setting-desc">{{ uiText.autoContinueAfterLoadDesc }}</div>
          </div>
          <q-toggle
            :model-value="autoContinueAfterLoad"
            @update:model-value="onAutoContinueAfterLoadChange"
            color="primary"
            keep-color
          />
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">{{ uiText.hideContinueButton }}</div>
            <div class="setting-desc">{{ uiText.hideContinueButtonDesc }}</div>
          </div>
          <q-toggle
            :model-value="hideContinueButton"
            @update:model-value="onHideContinueButtonChange"
            color="primary"
            keep-color
          />
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">{{ uiText.continueKeyBinding }}</div>
            <div class="setting-desc">{{ uiText.continueKeyBindingDesc }}</div>
          </div>
          <q-btn
            :label="continueKeyBinding || uiText.pressKeyToBind"
            color="primary"
            outline
            @click="startKeyBinding"
          />
        </div>
      </div>

      <!-- 开发模式设置 -->
      <div class="setting-section">
        <div class="section-title">开发 / Development</div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">开发模式</div>
            <div class="setting-desc">开启后恢复位置时将跳过所有动画效果</div>
          </div>
          <q-toggle
            :model-value="isDevMode"
            @update:model-value="onDevModeChange"
            color="primary"
            keep-color
          />
        </div>
        <div v-if="isDevMode" class="dev-mode-info">
          <div class="info-title">开发模式已启用</div>
          <div class="info-desc">恢复位置时角色移动、背景切换和特效动画将被跳过</div>
        </div>
      </div>

      <!-- 系统信息 -->
      <div class="setting-section">
        <div class="section-title">系统信息</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">场景:</span>
            <span class="info-value">{{ store.state.scene || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">当前帧:</span>
            <span class="info-value">{{ store.state.history?.length ?? 0 }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useEngineStore } from 'stores/engine-store';
import { getI18nManager, getSupportedLocales, type SupportedLocale } from '../../engine/i18n';
import { getVoiceManager } from '../../engine/i18n';

defineProps<{ visible?: boolean }>();
defineEmits<{ (e: 'close'): void }>();

const store = useEngineStore();
const i18n = getI18nManager();
const voiceManager = getVoiceManager();

// 语言设置（用于触发 computed 重新计算）
const currentLocale = ref<SupportedLocale>(i18n.getLocale());
const supportedLocales = getSupportedLocales();

// 监听语言变化以更新 UI
let unlistenLocale: (() => void) | null = null;
onMounted(() => {
  unlistenLocale = i18n.onLocaleChange(() => {
    currentLocale.value = i18n.getLocale();
  });
});
onUnmounted(() => {
  unlistenLocale?.();
});

// i18n 翻译函数
const t = (key: string): string => {
  try {
    const result = i18n.getTranslation(`@ui:${key}`);
    return result.text !== `@ui:${key}` ? result.text : key;
  } catch {
    return key;
  }
};

// 响应式翻译（依赖 currentLocale 以在语言切换时更新）
const uiText = computed(() => {
  // 触发 computed 重新计算
  void currentLocale.value;
  return {
    settings: t('settings'),
    close: t('close'),
    language: t('language'),
    voiceSettings: t('voice_settings'),
    voiceEnabled: t('voice_enabled'),
    ttsEngine: t('tts_engine'),
    browserVoice: t('browser_voice'),
    ttsEngineBrowser: t('tts_engine_browser'),
    ttsEngineOpenai: t('tts_engine_openai'),
    ttsEngineAzure: t('tts_engine_azure'),
    ttsEngineGoogle: t('tts_engine_google'),
    displaySettings: t('display_settings'),
    dialogDiff: t('dialog_diff'),
    dialogDiffDesc: t('dialog_diff_desc'),
    autoContinueAfterLoad: t('auto_continue_after_load'),
    autoContinueAfterLoadDesc: t('auto_continue_after_load_desc'),
    hideContinueButton: t('hide_continue_button'),
    hideContinueButtonDesc: t('hide_continue_button_desc'),
    continueKeyBinding: t('continue_key_binding'),
    continueKeyBindingDesc: t('continue_key_binding_desc'),
    pressKeyToBind: t('press_key_to_bind'),
  };
});

// 语音设置
const voiceEnabled = ref(false);
const ttsEngine = ref<'browser' | 'openai' | 'azure' | 'google'>('browser');
const browserVoice = ref('');
const browserVoices = ref<SpeechSynthesisVoice[]>([]);

// 开发模式设置
const isDevMode = computed(() => store.devMode());

// 对话框 diff 设置
const DIALOG_DIFF_KEY = 'engine:dialogDiffEnabled';
const dialogDiffEnabled = ref(localStorage.getItem(DIALOG_DIFF_KEY) !== 'false');
// 读档后自动继续设置
const AUTO_CONTINUE_AFTER_LOAD_KEY = 'engine:autoContinueAfterLoad';
const autoContinueAfterLoad = ref(localStorage.getItem(AUTO_CONTINUE_AFTER_LOAD_KEY) === 'true'); // 默认禁用

// 隐藏继续按钮设置
const HIDE_CONTINUE_BUTTON_KEY = 'engine:hideContinueButton';
const hideContinueButton = ref(localStorage.getItem(HIDE_CONTINUE_BUTTON_KEY) === 'true');

// 继续按键绑定设置
const CONTINUE_KEY_BINDING_KEY = 'engine:continueKeyBinding';
const continueKeyBinding = ref(localStorage.getItem(CONTINUE_KEY_BINDING_KEY) || 'Enter');
const isBindingKey = ref(false);
// 初始化语音设置
onMounted(() => {
  const voiceSettings = voiceManager.getSettings();
  voiceEnabled.value = voiceSettings.enabled;
  ttsEngine.value = voiceSettings.engine;
  browserVoice.value = voiceSettings.browserVoiceId || '';

  // 加载浏览器语音列表
  loadBrowserVoices();
});

function loadBrowserVoices() {
  if ('speechSynthesis' in window) {
    browserVoices.value = speechSynthesis.getVoices();

    // 监听语音列表变化
    speechSynthesis.onvoiceschanged = () => {
      browserVoices.value = speechSynthesis.getVoices();
    };
  }
}

function onLocaleChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  const locale = target.value as SupportedLocale;
  i18n.setLocale(locale);
  // 更新 currentLocale 以触发 computed 重新计算
  currentLocale.value = locale;
  // 语言切换后，i18n 系统会自动重新翻译当前对话和历史记录
}

function onVoiceEnabledChange(value: boolean) {
  voiceEnabled.value = value;
  voiceManager.updateSettings({ enabled: value });

  // 如果启用语音，预加载语音列表
  if (value && ttsEngine.value === 'browser') {
    void voiceManager.preloadVoices();
  }
}

function onTTSEngineChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  const engine = target.value as 'browser' | 'openai' | 'azure' | 'google';
  ttsEngine.value = engine;
  voiceManager.updateSettings({ engine });

  if (engine === 'browser') {
    void voiceManager.preloadVoices();
  }
}

function onBrowserVoiceChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  const voiceId = target.value;
  browserVoice.value = voiceId;
  if (voiceId) {
    voiceManager.updateSettings({ browserVoiceId: voiceId });
  }
  // 不更新 browserVoiceId 为空字符串，保持原值
}

function onDevModeChange(value: boolean) {
  store.setDevMode(value);
}

function onDialogDiffChange(value: boolean) {
  dialogDiffEnabled.value = value;
  localStorage.setItem(DIALOG_DIFF_KEY, String(value));
  window.dispatchEvent(
    new StorageEvent('storage', {
      key: DIALOG_DIFF_KEY,
      newValue: String(value),
      storageArea: localStorage,
    }),
  );
}

function onAutoContinueAfterLoadChange(value: boolean) {
  autoContinueAfterLoad.value = value;
  localStorage.setItem(AUTO_CONTINUE_AFTER_LOAD_KEY, String(value));
}

function onHideContinueButtonChange(value: boolean) {
  hideContinueButton.value = value;
  localStorage.setItem(HIDE_CONTINUE_BUTTON_KEY, String(value));
  // 使用 CustomEvent 替代 StorageEvent
  window.dispatchEvent(
    new CustomEvent('engine-setting-changed', {
      detail: { key: HIDE_CONTINUE_BUTTON_KEY, value: String(value) },
    }),
  );
}

function startKeyBinding() {
  isBindingKey.value = true;
  const handler = (e: KeyboardEvent) => {
    e.preventDefault();
    continueKeyBinding.value = e.key;
    localStorage.setItem(CONTINUE_KEY_BINDING_KEY, e.key);
    // 使用 CustomEvent 替代 StorageEvent
    window.dispatchEvent(
      new CustomEvent('engine-setting-changed', {
        detail: { key: CONTINUE_KEY_BINDING_KEY, value: e.key },
      }),
    );
    isBindingKey.value = false;
    window.removeEventListener('keydown', handler);
  };
  window.addEventListener('keydown', handler);
}
</script>

<style scoped>
.settings-panel {
  position: absolute;
  left: 50%;
  bottom: 220px;
  transform: translateX(-50%);
  width: min(520px, calc(100% - 32px));
  max-height: 70vh;
  overflow: auto;
  background: rgba(0, 0, 0, 0.9);
  color: #fff;
  border-radius: 8px;
  padding: 16px;
  z-index: 1002;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.title {
  font-weight: 600;
  font-size: 18px;
}

.close-btn {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

.settings-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
}

.section-title {
  font-weight: 600;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 4px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  gap: 12px;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.setting-label {
  font-weight: 500;
  font-size: 14px;
}

.setting-desc {
  font-size: 12px;
  opacity: 0.65;
  line-height: 1.4;
}

.setting-select {
  background: rgba(0, 0, 0, 0.3);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 13px;
  cursor: pointer;
  min-width: 160px;
}

.setting-select:focus {
  outline: none;
  border-color: rgba(255, 255, 255, 0.4);
}

.setting-select option {
  background: #1a1a1a;
  color: #fff;
}

.dev-mode-info {
  padding: 10px 12px;
  background: rgba(76, 175, 80, 0.12);
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-title {
  font-weight: 500;
  color: #81c784;
  font-size: 13px;
}

.info-desc {
  font-size: 11px;
  opacity: 0.8;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  font-size: 12px;
}

.info-label {
  opacity: 0.7;
}

.info-value {
  font-weight: 500;
  opacity: 0.9;
}
</style>
