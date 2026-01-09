<template>
  <div class="settings-screen">
    <!-- 背景图 -->
    <div class="settings-background" :style="{ backgroundImage: `url(${backgroundImage})` }"></div>

    <!-- 遮罩层 -->
    <div class="settings-overlay"></div>

    <!-- 设置内容 -->
    <div class="settings-content">
      <div class="settings-panel">
        <!-- 标题栏 -->
        <div class="settings-header">
          <h2 class="settings-title">设置 / Settings</h2>
          <button class="back-button" @click="goBack">
            <span>返回</span>
          </button>
        </div>

        <!-- 设置选项 -->
        <div class="settings-body">
          <!-- 文字速度 -->
          <div class="setting-section">
            <h3 class="section-title">文字 / Text</h3>
            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-label">启用打字机效果</div>
                <div class="setting-desc">Enable Typewriter Effect</div>
              </div>
              <div class="setting-control">
                <q-toggle
                  :model-value="typewriterEnabled"
                  @update:model-value="setTypewriterEnabled"
                  color="positive"
                  size="md"
                />
              </div>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-label">文字速度</div>
                <div class="setting-desc">Text Speed</div>
              </div>
              <div class="setting-control">
                <input
                  type="range"
                  min="1"
                  max="100"
                  v-model.number="textSpeed"
                  @input="(e: Event) => setTextSpeed((e.target as HTMLInputElement).valueAsNumber)"
                  :disabled="!typewriterEnabled"
                  class="setting-slider"
                />
                <div class="setting-value">{{ textSpeed }}%</div>
              </div>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-label">自动播放速度</div>
                <div class="setting-desc">Auto Speed</div>
              </div>
              <div class="setting-control">
                <input
                  type="range"
                  min="1"
                  max="100"
                  v-model.number="autoSpeed"
                  @input="(e: Event) => setAutoSpeed((e.target as HTMLInputElement).valueAsNumber)"
                  :disabled="!typewriterEnabled"
                  class="setting-slider"
                />
                <div class="setting-value">{{ autoSpeed }}%</div>
              </div>
            </div>
          </div>

          <!-- 音频 -->
          <div class="setting-section">
            <h3 class="section-title">音频 / Audio</h3>
            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-label">主音量</div>
                <div class="setting-desc">Master Volume</div>
              </div>
              <div class="setting-control">
                <input
                  type="range"
                  min="0"
                  max="100"
                  :value="masterVolume"
                  @input="setMasterVolume"
                  class="setting-slider"
                />
                <div class="setting-value">{{ masterVolume }}%</div>
              </div>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-label">BGM 音量</div>
                <div class="setting-desc">BGM Volume</div>
              </div>
              <div class="setting-control">
                <input
                  type="range"
                  min="0"
                  max="100"
                  :value="bgmVolume"
                  @input="setBgmVolume"
                  class="setting-slider"
                />
                <div class="setting-value">{{ bgmVolume }}%</div>
              </div>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-label">音效音量</div>
                <div class="setting-desc">SFX Volume</div>
              </div>
              <div class="setting-control">
                <input
                  type="range"
                  min="0"
                  max="100"
                  :value="sfxVolume"
                  @input="setSfxVolume"
                  class="setting-slider"
                />
                <div class="setting-value">{{ sfxVolume }}%</div>
              </div>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-label">语音音量</div>
                <div class="setting-desc">Voice Volume</div>
              </div>
              <div class="setting-control">
                <input
                  type="range"
                  min="0"
                  max="100"
                  :value="voiceVolume"
                  @input="setVoiceVolume"
                  class="setting-slider"
                />
                <div class="setting-value">{{ voiceVolume }}%</div>
              </div>
            </div>
          </div>

          <!-- 语音 -->
          <div class="setting-section">
            <h3 class="section-title">语音 / Voice</h3>
            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-label">启用语音</div>
                <div class="setting-desc">Enable Voice</div>
              </div>
              <div class="setting-control">
                <q-toggle
                  :model-value="voiceEnabled"
                  @update:model-value="setVoiceEnabled"
                  color="positive"
                  size="md"
                />
              </div>
            </div>
          </div>

          <!-- 其他 -->
          <div class="setting-section">
            <h3 class="section-title">其他 / Other</h3>
            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-label">跳过已读文本</div>
                <div class="setting-desc">Skip Read Text</div>
              </div>
              <div class="setting-control">
                <q-toggle
                  :model-value="skipRead"
                  @update:model-value="setSkipRead"
                  color="positive"
                  size="md"
                />
              </div>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-label">避免文本重复刷新</div>
                <div class="setting-desc">Prevent Text Refresh</div>
              </div>
              <div class="setting-control">
                <q-toggle
                  :model-value="dialogDiffEnabled"
                  @update:model-value="setDialogDiffEnabled"
                  color="positive"
                  size="md"
                />
              </div>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-label">读档后自动继续</div>
                <div class="setting-desc">Auto Continue After Load</div>
              </div>
              <div class="setting-control">
                <q-toggle
                  :model-value="autoContinueAfterLoad"
                  @update:model-value="setAutoContinueAfterLoad"
                  color="positive"
                  size="md"
                />
              </div>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-label">隐藏继续按钮</div>
                <div class="setting-desc">Hide Continue Button</div>
              </div>
              <div class="setting-control">
                <q-toggle
                  :model-value="hideContinueButton"
                  @update:model-value="setHideContinueButton"
                  color="positive"
                  size="md"
                />
              </div>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-label">继续按键</div>
                <div class="setting-desc">Continue Key: {{ continueKeyBinding }}</div>
              </div>
              <div class="setting-control">
                <q-btn
                  :label="isBindingKey ? '按下任意键...' : '设置按键'"
                  color="primary"
                  outline
                  @click="startKeyBinding"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 底部按钮 -->
        <div class="settings-footer">
          <button class="footer-button reset-button" @click="resetToDefaults">
            恢复默认 / Reset
          </button>
          <button class="footer-button save-button" @click="goBack">确定 / OK</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { gameRegistry } from '../registry';

const router = useRouter();

// 获取游戏配置
const gameConfig = gameRegistry.getDefault() || {
  titleBackground: '/assets/bg/haikei_01_sora/jpg/sora_01.jpg',
};

// 使用自定义背景或默认背景
const backgroundImage = gameConfig.titleBackground || '/assets/bg/haikei_01_sora/jpg/sora_01.jpg';

// 设置项状态
const textSpeed = ref(50);
const autoSpeed = ref(50);
const masterVolume = ref(80);
const bgmVolume = ref(80);
const sfxVolume = ref(80);
const voiceVolume = ref(100);
const voiceEnabled = ref(false);
const skipRead = ref(false);
const dialogDiffEnabled = ref(true);
const autoContinueAfterLoad = ref(false);
const hideContinueButton = ref(false);
const continueKeyBinding = ref('Enter');
const isBindingKey = ref(false);
const typewriterEnabled = ref(true);

// 对话框 diff 设置 key
const DIALOG_DIFF_KEY = 'engine:dialogDiffEnabled';
const AUTO_CONTINUE_AFTER_LOAD_KEY = 'engine:autoContinueAfterLoad';
const HIDE_CONTINUE_BUTTON_KEY = 'engine:hideContinueButton';
const CONTINUE_KEY_BINDING_KEY = 'engine:continueKeyBinding';
const TYPEWRITER_ENABLED_KEY = 'engine:typewriterEnabled';
const TEXT_SPEED_KEY = 'engine:textSpeed';
const AUTO_SPEED_KEY = 'engine:autoSpeed';

// 加载设置
onMounted(() => {
  loadSettings();
  // 加载对话框 diff 设置
  dialogDiffEnabled.value = localStorage.getItem(DIALOG_DIFF_KEY) !== 'false';
  // 加载读档后自动继续设置
  autoContinueAfterLoad.value = localStorage.getItem(AUTO_CONTINUE_AFTER_LOAD_KEY) === 'true';
  // 加载隐藏继续按钮设置
  hideContinueButton.value = localStorage.getItem(HIDE_CONTINUE_BUTTON_KEY) === 'true';
  // 加载继续按键绑定设置
  continueKeyBinding.value = localStorage.getItem(CONTINUE_KEY_BINDING_KEY) || 'Enter';
  // 加载打字机设置
  typewriterEnabled.value = localStorage.getItem(TYPEWRITER_ENABLED_KEY) !== 'false';
  textSpeed.value = parseInt(localStorage.getItem(TEXT_SPEED_KEY) || String(textSpeed.value), 10);
  autoSpeed.value = parseInt(localStorage.getItem(AUTO_SPEED_KEY) || String(autoSpeed.value), 10);
});

function loadSettings() {
  const settings = localStorage.getItem('game_settings');
  if (settings) {
    try {
      const parsed = JSON.parse(settings);
      textSpeed.value = parsed.textSpeed ?? 50;
      autoSpeed.value = parsed.autoSpeed ?? 50;
      masterVolume.value = parsed.masterVolume ?? 80;
      bgmVolume.value = parsed.bgmVolume ?? 80;
      sfxVolume.value = parsed.sfxVolume ?? 80;
      voiceVolume.value = parsed.voiceVolume ?? 100;
      voiceEnabled.value = parsed.voiceEnabled ?? false;
      skipRead.value = parsed.skipRead ?? false;
      dialogDiffEnabled.value = parsed.dialogDiffEnabled ?? true;
      autoContinueAfterLoad.value = parsed.autoContinueAfterLoad ?? false;
      hideContinueButton.value = parsed.hideContinueButton ?? false;
      continueKeyBinding.value = parsed.continueKeyBinding ?? 'Enter';
    } catch {
      // 使用默认值
    }
  }
  // 同步对话框 diff 设置到专用key
  dialogDiffEnabled.value = localStorage.getItem(DIALOG_DIFF_KEY) !== 'false';
  // 同步读档后自动继续设置到专用 key
  autoContinueAfterLoad.value = localStorage.getItem(AUTO_CONTINUE_AFTER_LOAD_KEY) === 'true';
  // 同步隐藏继续按钮设置到专用 key
  hideContinueButton.value = localStorage.getItem(HIDE_CONTINUE_BUTTON_KEY) === 'true';
  // 同步继续按键绑定设置到专用 key
  continueKeyBinding.value = localStorage.getItem(CONTINUE_KEY_BINDING_KEY) || 'Enter';

  // 同步打字机设置到专用 key
  typewriterEnabled.value = localStorage.getItem(TYPEWRITER_ENABLED_KEY) !== 'false';
  textSpeed.value = parseInt(localStorage.getItem(TEXT_SPEED_KEY) || String(textSpeed.value), 10);
  autoSpeed.value = parseInt(localStorage.getItem(AUTO_SPEED_KEY) || String(autoSpeed.value), 10);
}

function saveSettings() {
  const settings = {
    textSpeed: textSpeed.value,
    autoSpeed: autoSpeed.value,
    typewriterEnabled: typewriterEnabled.value,
    masterVolume: masterVolume.value,
    bgmVolume: bgmVolume.value,
    sfxVolume: sfxVolume.value,
    voiceVolume: voiceVolume.value,
    autoContinueAfterLoad: autoContinueAfterLoad.value,
    voiceEnabled: voiceEnabled.value,
    skipRead: skipRead.value,
    dialogDiffEnabled: dialogDiffEnabled.value,
    hideContinueButton: hideContinueButton.value,
    continueKeyBinding: continueKeyBinding.value,
  };
  localStorage.setItem('game_settings', JSON.stringify(settings));
}

function setTypewriterEnabled(value: boolean) {
  typewriterEnabled.value = value;
  localStorage.setItem(TYPEWRITER_ENABLED_KEY, String(value));
  window.dispatchEvent(
    new CustomEvent('engine-setting-changed', {
      detail: { key: TYPEWRITER_ENABLED_KEY, value: String(value) },
    }),
  );
  saveSettings();
}

function setTextSpeed(value: number | null) {
  if (value != null) {
    textSpeed.value = value;
  }
  localStorage.setItem(TEXT_SPEED_KEY, String(textSpeed.value));
  window.dispatchEvent(
    new CustomEvent('engine-setting-changed', {
      detail: { key: TEXT_SPEED_KEY, value: String(textSpeed.value) },
    }),
  );
  saveSettings();
}

function setAutoSpeed(value: number | null) {
  if (value != null) {
    autoSpeed.value = value;
  }
  localStorage.setItem(AUTO_SPEED_KEY, String(autoSpeed.value));
  window.dispatchEvent(
    new CustomEvent('engine-setting-changed', {
      detail: { key: AUTO_SPEED_KEY, value: String(autoSpeed.value) },
    }),
  );
  saveSettings();
}

function setMasterVolume(event: Event) {
  const target = event.target as HTMLInputElement;
  masterVolume.value = parseInt(target.value, 10);
  saveSettings();
}

function setBgmVolume(event: Event) {
  const target = event.target as HTMLInputElement;
  bgmVolume.value = parseInt(target.value, 10);
  saveSettings();
}

function setSfxVolume(event: Event) {
  const target = event.target as HTMLInputElement;
  sfxVolume.value = parseInt(target.value, 10);
  saveSettings();
}

function setVoiceVolume(event: Event) {
  const target = event.target as HTMLInputElement;
  voiceVolume.value = parseInt(target.value, 10);
  saveSettings();
}

function setVoiceEnabled(value: boolean) {
  voiceEnabled.value = value;
  saveSettings();
}

function setSkipRead(value: boolean) {
  skipRead.value = value;
  saveSettings();
}

function setDialogDiffEnabled(value: boolean) {
  dialogDiffEnabled.value = value;
  // 保存到专用 key
  localStorage.setItem(DIALOG_DIFF_KEY, String(value));
  // 使用 CustomEvent 通知（同标签页实时生效）
  window.dispatchEvent(
    new CustomEvent('engine-setting-changed', {
      detail: { key: DIALOG_DIFF_KEY, value: String(value) },
    }),
  );
  saveSettings();
}

function setAutoContinueAfterLoad(value: boolean) {
  autoContinueAfterLoad.value = value;
  // 保存到专用 key
  localStorage.setItem(AUTO_CONTINUE_AFTER_LOAD_KEY, String(value));
  saveSettings();
}

function setHideContinueButton(value: boolean) {
  hideContinueButton.value = value;
  localStorage.setItem(HIDE_CONTINUE_BUTTON_KEY, String(value));
  // 使用 CustomEvent 替代 StorageEvent，因为 StorageEvent 只在跨标签页时触发
  window.dispatchEvent(
    new CustomEvent('engine-setting-changed', {
      detail: { key: HIDE_CONTINUE_BUTTON_KEY, value: String(value) },
    }),
  );
  // 立即更新到 game_settings
  saveSettings();
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
    saveSettings();
  };
  window.addEventListener('keydown', handler);
}

function resetToDefaults() {
  textSpeed.value = 50;
  autoSpeed.value = 50;
  typewriterEnabled.value = true;
  masterVolume.value = 80;
  bgmVolume.value = 80;
  sfxVolume.value = 80;
  voiceVolume.value = 100;
  voiceEnabled.value = false;
  skipRead.value = false;
  dialogDiffEnabled.value = true;
  autoContinueAfterLoad.value = false;
  hideContinueButton.value = false;
  continueKeyBinding.value = 'Enter';
  // 同步到专用 key
  localStorage.setItem(DIALOG_DIFF_KEY, 'true');
  localStorage.setItem(AUTO_CONTINUE_AFTER_LOAD_KEY, 'false');
  localStorage.setItem(HIDE_CONTINUE_BUTTON_KEY, 'false');
  localStorage.setItem(CONTINUE_KEY_BINDING_KEY, 'Enter');
  localStorage.setItem(TYPEWRITER_ENABLED_KEY, 'true');
  localStorage.setItem(TEXT_SPEED_KEY, '50');
  localStorage.setItem(AUTO_SPEED_KEY, '50');
  // 派发自定义事件通知 DialogBox
  window.dispatchEvent(
    new CustomEvent('engine-setting-changed', {
      detail: { key: HIDE_CONTINUE_BUTTON_KEY, value: 'false' },
    }),
  );
  window.dispatchEvent(
    new CustomEvent('engine-setting-changed', {
      detail: { key: CONTINUE_KEY_BINDING_KEY, value: 'Enter' },
    }),
  );
  window.dispatchEvent(
    new CustomEvent('engine-setting-changed', {
      detail: { key: TYPEWRITER_ENABLED_KEY, value: 'true' },
    }),
  );
  window.dispatchEvent(
    new CustomEvent('engine-setting-changed', {
      detail: { key: TEXT_SPEED_KEY, value: '50' },
    }),
  );
  window.dispatchEvent(
    new CustomEvent('engine-setting-changed', {
      detail: { key: AUTO_SPEED_KEY, value: '50' },
    }),
  );
  window.dispatchEvent(
    new CustomEvent('engine-setting-changed', {
      detail: { key: DIALOG_DIFF_KEY, value: 'true' },
    }),
  );
  saveSettings();
}

function goBack() {
  router.back();
}
</script>

<style scoped>
.settings-screen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
}

.settings-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.settings-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
}

.settings-content {
  position: relative;
  z-index: 10;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.settings-panel {
  background: rgba(20, 20, 30, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  width: 100%;
  max-width: 700px;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.settings-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #fff;
}

.back-button {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 10px 20px;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.back-button:hover {
  background: rgba(255, 255, 255, 0.2);
}

.settings-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
}

.settings-body::-webkit-scrollbar {
  width: 8px;
}

.settings-body::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.settings-body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.settings-body::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

.setting-section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-info {
  flex: 1;
}

.setting-label {
  font-size: 16px;
  font-weight: 500;
  color: #fff;
  margin-bottom: 4px;
}

.setting-desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
}

.setting-control {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-left: 24px;
}

.setting-slider {
  width: 150px;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}

.setting-slider::-webkit-slider-runnable-track {
  height: 6px;
  border-radius: 3px;
}

.setting-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
  transition: transform 0.1s;
}

.setting-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.setting-value {
  min-width: 45px;
  text-align: right;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.settings-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 32px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.footer-button {
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.reset-button {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.reset-button:hover {
  background: rgba(255, 255, 255, 0.15);
}

.save-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.save-button:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}
</style>
