/**
 * 控制台命令手册系统
 * 提供命令的帮助文档和使用示例
 */

export interface CommandManual {
  name: string;
  description: string;
  usage: string;
  examples: string[];
  seeAlso?: string[];
}

export const commandManuals: Record<string, CommandManual> = {
  help: {
    name: 'help',
    description: '显示所有可用命令的帮助信息',
    usage: ':help',
    examples: [':help'],
    seeAlso: ['man'],
  },
  man: {
    name: 'man',
    description: '显示指定命令的详细手册',
    usage: ':man <command>',
    examples: [
      ':man vars',
      ':man set',
      ':man show',
    ],
    seeAlso: ['help'],
  },
  clear: {
    name: 'clear',
    description: '清空终端屏幕',
    usage: ':clear',
    examples: [':clear'],
  },
  env: {
    name: 'env',
    description: '显示脚本环境中可用的变量和函数',
    usage: ':env',
    examples: [':env'],
  },
  vars: {
    name: 'vars',
    description: '显示所有存储的变量（存储在 vars 字段中）',
    usage: ':vars',
    examples: [':vars'],
    seeAlso: ['var', 'set', 'del', 'store'],
  },
  var: {
    name: 'var',
    description: '显示指定变量的值',
    usage: ':var <key>',
    examples: [
      ':var playerLevel',
      ':var playerName',
    ],
    seeAlso: ['vars', 'set', 'del'],
  },
  set: {
    name: 'set',
    description: '设置变量的值（支持 JSON 格式）',
    usage: ':set <key> <value>',
    examples: [
      ':set playerLevel 5',
      ':set playerName "Alice"',
      ':set inventory ["sword","potion"]',
      ':set playerData {"level":5,"name":"Alice"}',
    ],
    seeAlso: ['vars', 'var', 'del'],
  },
  del: {
    name: 'del',
    description: '删除指定的变量',
    usage: ':del <key>',
    examples: [
      ':del tempData',
      ':del playerLevel',
    ],
    seeAlso: ['vars', 'var', 'set'],
  },
  store: {
    name: 'store',
    description: '显示指定命名空间中的所有变量',
    usage: ':store <namespace>',
    examples: [
      ':store player',
      ':store quest',
      ':store settings',
    ],
    seeAlso: ['vars', 'set'],
  },
  scene: {
    name: 'scene',
    description: '显示当前场景名称',
    usage: ':scene',
    examples: [':scene'],
  },
  actors: {
    name: 'actors',
    description: '显示当前所有角色的 ID',
    usage: ':actors',
    examples: [':actors'],
  },
  state: {
    name: 'state',
    description: '以 JSON 格式打印当前运行时完整状态',
    usage: ':state',
    examples: [':state'],
  },
  show: {
    name: 'show',
    description: '显示变量或表达式的详细内容，可控制展开层级',
    usage: ':show <expr> [depth]',
    examples: [
      ':show store',
      ':show runtime.state.actors',
      ':show ctx.store("player").getAll() 4',
      ':show runtime.state 0',
    ],
    seeAlso: ['vars', 'state'],
  },
  back: {
    name: 'back',
    description: '触发返回操作，回到上一个状态',
    usage: ':back',
    examples: [':back'],
  },
  restart: {
    name: 'restart',
    description: '重置运行时，清空所有进度',
    usage: ':restart',
    examples: [':restart'],
    seeAlso: ['back'],
  },
  indexeddb: {
    name: 'indexeddb',
    description: 'IndexedDB 存储管理 - 控制是否使用 IndexedDB 存储存档（需要显式启用）',
    usage: ':indexeddb <status|enable|disable>',
    examples: [
      ':indexeddb status    # 查看当前状态',
      ':indexeddb enable    # 启用 IndexedDB',
      ':indexeddb disable   # 禁用 IndexedDB',
    ],
    seeAlso: ['saves'],
  },
  saves: {
    name: 'saves',
    description: '列出所有存档',
    usage: ':saves',
    examples: [':saves'],
    seeAlso: ['indexeddb', 'save', 'load'],
  },
  save: {
    name: 'save',
    description: '保存当前游戏进度',
    usage: ':save [slot]',
    examples: [
      ':save',
      ':save slot1',
      ':save "Chapter 1 - Part 2"',
    ],
    seeAlso: ['load', 'saves'],
  },
  load: {
    name: 'load',
    description: '加载指定存档',
    usage: ':load <slot>',
    examples: [
      ':load slot1',
      ':load "Chapter 1 - Part 2"',
    ],
    seeAlso: ['save', 'saves'],
  },
};

/**
 * 获取命令的手册
 */
export function getManual(command: string): CommandManual | null {
  return commandManuals[command] || null;
}

/**
 * 获取所有命令名称列表
 */
export function getAllCommandNames(): string[] {
  return Object.keys(commandManuals).sort();
}

/**
 * 格式化输出命令手册
 */
export function formatManual(manual: CommandManual): string {
  const lines: string[] = [];

  lines.push(`COMMAND: ${manual.name}`);
  lines.push('');
  lines.push(`DESCRIPTION`);
  lines.push(`    ${manual.description}`);
  lines.push('');
  lines.push(`USAGE`);
  lines.push(`    ${manual.usage}`);
  lines.push('');
  lines.push(`EXAMPLES`);
  manual.examples.forEach((ex) => {
    lines.push(`    ${ex}`);
  });

  if (manual.seeAlso && manual.seeAlso.length > 0) {
    lines.push('');
    lines.push(`SEE ALSO`);
    lines.push(`    ${manual.seeAlso.map((c) => `:man ${c}`).join(', ')}`);
  }

  return lines.join('\n');
}

/**
 * 搜索命令（支持模糊搜索）
 */
export function searchCommands(query: string): CommandManual[] {
  const q = query.toLowerCase();
  return Object.values(commandManuals).filter((m) => {
    return (
      m.name.includes(q) ||
      m.description.toLowerCase().includes(q)
    );
  });
}
