/**
 * 游戏注册表
 * 管理所有可用的游戏配置
 */

import type { GameConfig } from './config';

class GameRegistryManager {
  private games: Map<string, GameConfig> = new Map();
  private defaultGameId: string | null = null;

  /**
   * 注册游戏配置
   */
  register(config: GameConfig): void {
    this.games.set(config.id, config);
    console.log(`[GameRegistry] 注册游戏: ${config.id} - ${config.name}`);
  }

  /**
   * 获取游戏配置
   */
  get(id: string): GameConfig | undefined {
    return this.games.get(id);
  }

  /**
   * 获取默认游戏
   */
  getDefault(): GameConfig | undefined {
    if (this.defaultGameId) {
      return this.games.get(this.defaultGameId);
    }
    // 如果没有设置默认游戏，返回第一个注册的游戏
    return this.games.values().next().value;
  }

  /**
   * 设置默认游戏
   */
  setDefault(id: string): void {
    if (this.games.has(id)) {
      this.defaultGameId = id;
      console.log(`[GameRegistry] 设置默认游戏: ${id}`);
    } else {
      console.warn(`[GameRegistry] 游戏不存在: ${id}`);
    }
  }

  /**
   * 获取所有游戏
   */
  getAll(): GameConfig[] {
    return Array.from(this.games.values());
  }

  /**
   * 检查游戏是否存在
   */
  has(id: string): boolean {
    return this.games.has(id);
  }
}

// 导出全局单例
export const gameRegistry = new GameRegistryManager();
