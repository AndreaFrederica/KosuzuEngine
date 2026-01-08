/**
 * 音频管理器，负责背景音乐的播放和控制
 */

// 全局回调类型，用于显示用户交互提示
type ShowInteractionCallback = () => void;

let showInteractionCallback: ShowInteractionCallback | null = null;

export function setShowInteractionCallback(callback: ShowInteractionCallback | null) {
  showInteractionCallback = callback;
}

export class AudioManager {
  private audioElement: HTMLAudioElement | null = null;
  private currentTrack: string | null = null;
  private targetVolume: number = 1.0;
  private currentVolume: number = 0.0;
  private isPlaying: boolean = false;
  private fadeInterval: ReturnType<typeof setInterval> | null = null;
  private pendingPlay: { name: string; fadeInMs: number } | null = null;
  private hasUserInteracted: boolean = false;
  private interactionHandlerBound: boolean = false;

  constructor() {
    // 创建音频元素
    this.audioElement = new Audio();
    this.audioElement.loop = true;
    this.audioElement.volume = 0;

    // 监听音频结束事件（虽然我们设置了 loop，但为了保险）
    if (this.audioElement) {
      this.audioElement.addEventListener('ended', () => {
        if (this.audioElement && this.isPlaying) {
          this.audioElement.currentTime = 0;
          void this.audioElement.play();
        }
      });

      // 监听错误事件
      this.audioElement.addEventListener('error', (e) => {
        console.error('[AudioManager] 音频播放错误:', e);
      });
    }
  }

  /**
   * 绑定用户交互监听器
   */
  private bindInteractionHandler() {
    if (this.interactionHandlerBound) return;
    this.interactionHandlerBound = true;

    const events = ['click', 'keydown', 'touchstart', 'mousedown'];
    const handler = () => {
      if (!this.hasUserInteracted) {
        console.log('[AudioManager] 检测到用户交互');
        this.hasUserInteracted = true;

        // 隐藏交互提示（如果存在）
        if (showInteractionCallback) {
          showInteractionCallback = null;
        }

        // 尝试播放待处理的音频
        if (this.pendingPlay) {
          const { name, fadeInMs } = this.pendingPlay;
          this.pendingPlay = null;
          console.log('[AudioManager] 用户交互后重试播放:', name);
          void this.play(name, fadeInMs);
        }
      }

      // 移除事件监听
      events.forEach(event => {
        window.removeEventListener(event, handler);
      });
      this.interactionHandlerBound = false;
    };

    events.forEach(event => {
      window.addEventListener(event, handler, { once: true, passive: true });
    });
  }

  /**
   * 播放背景音乐
   * @param name 音频文件名
   * @param fadeInMs 淡入时间（毫秒）
   */
  async play(name: string, fadeInMs = 0): Promise<boolean> {
    console.log('[AudioManager] 播放背景音乐:', name, '淡入:', fadeInMs);

    // 如果正在播放相同的音乐，不做处理
    if (this.currentTrack === name && this.isPlaying) {
      return true;
    }

    // 如果有正在播放的音乐，先停止
    if (this.isPlaying && this.currentTrack !== name) {
      await this.stop(0);
    }

    // 构建音频文件路径
    const audioPath = `/assets/audio/bgm/${name}`;

    if (!this.audioElement) {
      console.error('[AudioManager] 音频元素未初始化');
      return false;
    }

    try {
      // 设置音频源
      this.audioElement.src = audioPath;
      this.currentTrack = name;

      // 开始播放
      await this.audioElement.play();
      this.isPlaying = true;
      this.hasUserInteracted = true;

      // 隐藏交互提示
      if (showInteractionCallback) {
        showInteractionCallback = null;
      }

      console.log('[AudioManager] 音频开始播放');

      // 如果需要淡入
      if (fadeInMs > 0) {
        await this.fadeTo(1.0, fadeInMs);
      } else {
        this.audioElement.volume = 1.0;
        this.currentVolume = 1.0;
        this.targetVolume = 1.0;
      }

      return true;
    } catch (error: unknown) {
      const errorName = error instanceof Error ? error.name : String(error);
      if (errorName === 'NotAllowedError') {
        console.log('[AudioManager] 需要用户交互才能播放音频');
        // 保存播放请求，等待用户交互
        this.pendingPlay = { name, fadeInMs };
        // 绑定交互监听器
        this.bindInteractionHandler();
        // 显示交互提示
        if (showInteractionCallback) {
          showInteractionCallback();
        }
        return false;
      }
      console.error('[AudioManager] 播放失败:', error);
      return false;
    }
  }

  /**
   * 停止背景音乐
   * @param fadeOutMs 淡出时间（毫秒）
   */
  async stop(fadeOutMs = 0): Promise<boolean> {
    console.log('[AudioManager] 停止背景音乐, 淡出:', fadeOutMs);

    if (!this.isPlaying || !this.audioElement) {
      return true;
    }

    // 如果需要淡出
    if (fadeOutMs > 0) {
      await this.fadeTo(0, fadeOutMs);
    }

    try {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.isPlaying = false;
      this.currentTrack = null;

      // 清除源
      this.audioElement.src = '';

      console.log('[AudioManager] 音频已停止');
      return true;
    } catch (error) {
      console.error('[AudioManager] 停止失败:', error);
      return false;
    }
  }

  /**
   * 渐变调整音量
   * @param volume 目标音量 (0-1)
   * @param ms 渐变时间（毫秒）
   */
  async fadeTo(volume: number, ms: number): Promise<boolean> {
    console.log(`[AudioManager] 音量渐变: ${this.currentVolume} -> ${volume}, 时间: ${ms}ms`);

    // 清除之前的渐变
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }

    if (!this.audioElement) {
      return false;
    }

    // 限制音量范围
    this.targetVolume = Math.max(0, Math.min(1, volume));

    // 如果时间太短，直接设置
    if (ms < 10) {
      this.audioElement.volume = this.targetVolume;
      this.currentVolume = this.targetVolume;
      return true;
    }

    // 计算步长
    const startVolume = this.currentVolume;
    const volumeDiff = this.targetVolume - startVolume;
    const steps = Math.ceil(ms / 16); // 每 16ms 更新一次（约 60fps）
    const stepSize = volumeDiff / steps;

    return new Promise((resolve) => {
      let currentStep = 0;

      this.fadeInterval = setInterval(() => {
        currentStep++;
        this.currentVolume = startVolume + stepSize * currentStep;

        // 确保音量在有效范围内
        this.currentVolume = Math.max(0, Math.min(1, this.currentVolume));

        if (this.audioElement) {
          this.audioElement.volume = this.currentVolume;
        }

        // 检查是否完成
        if (currentStep >= steps) {
          if (this.fadeInterval) {
            clearInterval(this.fadeInterval);
            this.fadeInterval = null;
          }
          this.currentVolume = this.targetVolume;
          if (this.audioElement) {
            this.audioElement.volume = this.targetVolume;
          }
          console.log(`[AudioManager] 音量渐变完成: ${this.targetVolume}`);
          resolve(true);
        }
      }, 16);
    });
  }

  /**
   * 获取当前播放状态
   */
  getStatus() {
    return {
      isPlaying: this.isPlaying,
      currentTrack: this.currentTrack,
      volume: this.currentVolume,
    };
  }

  /**
   * 清理资源
   */
  dispose() {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement = null;
    }
  }
}

// 导出单例实例
export const audioManager = new AudioManager();
