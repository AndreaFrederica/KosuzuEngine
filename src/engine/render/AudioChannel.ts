
/**
 * 音频通道类型
 */
export type ChannelType = 'bgm' | 'sfx' | 'voice';

/**
 * 音频通道配置
 */
export interface ChannelConfig {
  type: ChannelType;
  loop?: boolean;
  volume?: number;
  fadeInMs?: number;
  fadeOutMs?: number;
}

/**
 * 音频通道状态
 */
export interface ChannelStatus {
  channelId: string;
  type: ChannelType;
  isPlaying: boolean;
  currentTrack: string | null;
  volume: number;
  targetVolume: number;
  audioPaused: boolean;
  audioCurrentTime: number;
  audioReady: boolean;
  hasAudioElement: boolean;
  loop: boolean;
  level: number; // 实时电平值 0-1
}

/**
 * 音频通道类，管理单个音频流
 */
export class AudioChannel {
  private audioElement: HTMLAudioElement | null = null;
  private currentTrack: string | null = null;
  private targetVolume: number = 1.0;
  private currentVolume: number = 0.0;
  private isPlaying: boolean = false;
  private fadeInterval: ReturnType<typeof setInterval> | null = null;
  private channelId: string;
  private channelType: ChannelType;
  private loop: boolean = false;

  // 实时电平分析
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private timeDataArray: Float32Array | null = null;
  private currentLevel: number = 0;
  private levelUpdateInterval: ReturnType<typeof setInterval> | null = null;

  constructor(channelId: string, config: ChannelConfig) {
    this.channelId = channelId;
    this.channelType = config.type;
    this.loop = config.loop ?? false;

    // 延迟初始化音频元素
    if (typeof window !== 'undefined' && typeof Audio !== 'undefined') {
      this.initAudioElement(config.volume);
    }
  }

  /**
   * 初始化音频元素
   */
  private initAudioElement(initialVolume = 1.0) {
    if (this.audioElement) return;

    console.log(`[AudioChannel:${this.channelId}] 初始化音频元素`);
    this.audioElement = new Audio();
    this.audioElement.loop = this.loop;
    this.audioElement.volume = initialVolume;
    this.currentVolume = initialVolume;
    this.targetVolume = initialVolume;

    // 设置音频分析器用于实时电平
    this.setupAudioAnalyzer();

    // 监听音频结束事件（仅单次播放模式）
    if (!this.loop) {
      this.audioElement.addEventListener('ended', () => {
        console.log(`[AudioChannel:${this.channelId}] 音频播放结束`);
        this.isPlaying = false;
        this.stopLevelAnalysis();
      });
    }

    // 监听错误事件
    this.audioElement.addEventListener('error', (e) => {
      console.error(`[AudioChannel:${this.channelId}] 音频播放错误:`, e);
    });

    console.log(`[AudioChannel:${this.channelId}] 音频元素初始化完成`);
  }

  /**
   * 设置音频分析器
   */
  private setupAudioAnalyzer() {
    if (!this.audioElement) return;

    try {
      // 创建 AudioContext
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) {
        console.warn(`[AudioChannel:${this.channelId}] 浏览器不支持 Web Audio API`);
        return;
      }

      this.audioContext = new AudioContextClass();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 1024; // 适中的 FFT 大小
      this.analyser.smoothingTimeConstant = 0.15; // 较低的平滑常数，响应更灵敏

      // 创建 GainNode 用于控制音量（放在 analyser 前面）
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.targetVolume;

      // 创建音频源并连接：source -> gain -> analyser -> destination
      this.source = this.audioContext.createMediaElementSource(this.audioElement);
      this.source.connect(this.gainNode);
      this.gainNode.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      // 初始化时域数据数组（用于 RMS 计算）
      this.timeDataArray = new Float32Array(new ArrayBuffer(this.analyser.fftSize * Float32Array.BYTES_PER_ELEMENT)) as Float32Array;

      console.log(`[AudioChannel:${this.channelId}] 音频分析器已设置(GainNode + TimeDomain)`);
    } catch (e) {
      console.warn(`[AudioChannel:${this.channelId}] 设置音频分析器失败:`, e);
    }
  }

  /**
   * 开始电平分析
   */
  private startLevelAnalysis() {
    if (this.levelUpdateInterval) return;
    if (!this.analyser || !this.timeDataArray) return;

    this.levelUpdateInterval = setInterval(() => {
      if (!this.analyser || !this.timeDataArray) return;

      // 获取时域数据（波形采样）
      // @ts-expect-error: TypeScript limitation: Float32Array defaults to ArrayBufferLike, but we created it with ArrayBuffer
      this.analyser.getFloatTimeDomainData(this.timeDataArray);

      // 计算 RMS（均方根）作为电平值
      let sum = 0;
      for (let i = 0; i < this.timeDataArray.length; i++) {
        const v = this.timeDataArray[i]!;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / this.timeDataArray.length);

      // 单层平滑（alpha = 0.25）
      const alpha = 0.25;
      this.currentLevel = this.currentLevel * (1 - alpha) + rms * alpha;
    }, 50); // 每 50ms 更新一次
  }

  /**
   * 停止电平分析
   */
  private stopLevelAnalysis() {
    if (this.levelUpdateInterval) {
      clearInterval(this.levelUpdateInterval);
      this.levelUpdateInterval = null;
    }
    this.currentLevel = 0;
  }

  /**
   * 应用音量（优先使用 GainNode，兜底使用 audioElement.volume）
   */
  private applyVolume(v: number): void {
    const volume = Math.max(0, Math.min(1, v));
    this.currentVolume = volume;
    this.targetVolume = volume;

    if (this.gainNode) {
      this.gainNode.gain.value = volume;
    } else if (this.audioElement) {
      // 兜底：如果没启用 WebAudio，就用元素音量
      this.audioElement.volume = volume;
    }
  }

  /**
   * 确保音频元素已初始化
   */
  private ensureAudioElement(): boolean {
    if (!this.audioElement) {
      this.initAudioElement();
    }
    return this.audioElement !== null;
  }

  /**
   * 播放音频
   * @param url 音频文件 URL
   * @param fadeInMs 淡入时间（毫秒）
   */
  async play(url: string, fadeInMs = 0): Promise<boolean> {
    console.log(`[AudioChannel:${this.channelId}] 播放音频:`, url, '淡入:', fadeInMs, '循环:', this.loop);

    if (!this.ensureAudioElement()) {
      console.error(`[AudioChannel:${this.channelId}] 音频元素初始化失败`);
      return false;
    }

    if (!this.audioElement) {
      console.error(`[AudioChannel:${this.channelId}] 音频元素未初始化`);
      return false;
    }

    // 检查是否已经在播放这首音乐
    if (this.currentTrack === url && !this.audioElement.paused && this.audioElement.currentTime > 0) {
      console.log(`[AudioChannel:${this.channelId}] 该音频已在播放中，跳过`);
      return true;
    }

    try {
      // 设置音频源
      this.audioElement.src = url;
      this.audioElement.loop = this.loop;
      this.currentTrack = url;

      // 重置音量为 0（使用 gainNode）
      this.currentVolume = 0;
      if (this.gainNode) {
        this.gainNode.gain.value = 0;
      }

      // 开始播放
      await this.audioElement.play();
      this.isPlaying = true;

      // 恢复 AudioContext（如果被挂起）
      if (this.audioContext && this.audioContext.state === 'suspended') {
        void this.audioContext.resume();
      }

      // 启动电平分析
      this.startLevelAnalysis();

      console.log(`[AudioChannel:${this.channelId}] 音频开始播放`);

      // 如果需要淡入
      if (fadeInMs > 0) {
        await this.fadeTo(this.targetVolume, fadeInMs);
      } else {
        this.applyVolume(this.targetVolume);
      }

      return true;
    } catch (error: unknown) {
      const errorName = error instanceof Error ? error.name : String(error);
      if (errorName === 'NotAllowedError') {
        console.log(`[AudioChannel:${this.channelId}] 需要用户交互才能播放音频`);
        // 重新抛出错误，让 AudioManager 处理
        throw error;
      }
      console.error(`[AudioChannel:${this.channelId}] 播放失败:`, error);
      this.isPlaying = false;
      this.currentTrack = null;
      return false;
    }
  }

  /**
   * 停止音频
   * @param fadeOutMs 淡出时间（毫秒）
   */
  async stop(fadeOutMs = 0): Promise<boolean> {
    console.log(`[AudioChannel:${this.channelId}] 停止音频, 淡出:`, fadeOutMs);

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

      // 停止电平分析
      this.stopLevelAnalysis();

      // 先移除 src 避免触发 error 事件，然后设置为空
      this.audioElement.removeAttribute('src');
      this.audioElement.load();

      console.log(`[AudioChannel:${this.channelId}] 音频已停止`);
      return true;
    } catch (error) {
      console.error(`[AudioChannel:${this.channelId}] 停止失败:`, error);
      return false;
    }
  }

  /**
   * 暂停音频（保持播放位置）
   */
  pause(): boolean {
    if (!this.audioElement || !this.isPlaying) {
      return false;
    }

    this.audioElement.pause();
    return true;
  }

  /**
   * 恢复暂停的音频
   */
  async resume(): Promise<boolean> {
    if (!this.audioElement) {
      return false;
    }

    try {
      await this.audioElement.play();
      this.isPlaying = true;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 设置音量
   * @param volume 目标音量 (0-1)
   * @param fadeMs 渐变时间（毫秒）
   */
  async setVolume(volume: number, fadeMs = 0): Promise<boolean> {
    this.targetVolume = Math.max(0, Math.min(1, volume));

    if (fadeMs > 0) {
      return await this.fadeTo(this.targetVolume, fadeMs);
    } else {
      this.applyVolume(this.targetVolume);
      return true;
    }
  }

  /**
   * 渐变调整音量
   * @param volume 目标音量 (0-1)
   * @param ms 渐变时间（毫秒）
   */
  async fadeTo(volume: number, ms: number): Promise<boolean> {
    console.log(`[AudioChannel:${this.channelId}] 音量渐变: ${this.currentVolume} -> ${volume}, 时间: ${ms}ms`);

    // 清除之前的渐变
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }

    // 限制音量范围
    this.targetVolume = Math.max(0, Math.min(1, volume));

    // 如果时间太短，直接设置
    if (ms < 10) {
      if (this.gainNode) {
        this.gainNode.gain.value = this.targetVolume;
      } else if (this.audioElement) {
        this.audioElement.volume = this.targetVolume;
      }
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

        // 优先使用 gainNode，兜底使用 audioElement.volume
        if (this.gainNode) {
          this.gainNode.gain.value = this.currentVolume;
        } else if (this.audioElement) {
          this.audioElement.volume = this.currentVolume;
        }

        // 检查是否完成
        if (currentStep >= steps) {
          if (this.fadeInterval) {
            clearInterval(this.fadeInterval);
            this.fadeInterval = null;
          }
          this.currentVolume = this.targetVolume;
          if (this.gainNode) {
            this.gainNode.gain.value = this.targetVolume;
          } else if (this.audioElement) {
            this.audioElement.volume = this.targetVolume;
          }
          console.log(`[AudioChannel:${this.channelId}] 音量渐变完成: ${this.targetVolume}`);
          resolve(true);
        }
      }, 16);
    });
  }

  /**
   * 设置循环模式
   */
  setLoop(loop: boolean): void {
    this.loop = loop;
    if (this.audioElement) {
      this.audioElement.loop = loop;
    }
  }

  /**
   * 获取通道 ID
   */
  getChannelId(): string {
    return this.channelId;
  }

  /**
   * 获取通道类型
   */
  getType(): ChannelType {
    return this.channelType;
  }

  /**
   * 获取当前播放状态
   */
  getStatus(): ChannelStatus {
    if (!this.audioElement) {
      return {
        channelId: this.channelId,
        type: this.channelType,
        isPlaying: false,
        currentTrack: this.currentTrack,
        volume: this.currentVolume,
        targetVolume: this.targetVolume,
        audioPaused: true,
        audioCurrentTime: 0,
        audioReady: false,
        hasAudioElement: false,
        loop: this.loop,
        level: 0,
      };
    }

    // 检查 audio 元素的实际播放状态
    const actuallyPlaying = !this.audioElement.paused && this.audioElement.currentTime > 0;
    const audioReady = this.audioElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;

    return {
      channelId: this.channelId,
      type: this.channelType,
      isPlaying: actuallyPlaying && this.isPlaying,
      currentTrack: this.currentTrack,
      volume: this.currentVolume,
      targetVolume: this.targetVolume,
      audioPaused: this.audioElement.paused,
      audioCurrentTime: this.audioElement.currentTime,
      audioReady,
      hasAudioElement: true,
      loop: this.loop,
      level: this.currentLevel,
    };
  }

  /**
   * 清理资源
   */
  dispose(): void {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
    this.stopLevelAnalysis();
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement = null;
    }
    // 清理音频上下文
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.audioContext) {
      void this.audioContext.close();
      this.audioContext = null;
    }
    this.timeDataArray = null;
  }
}
