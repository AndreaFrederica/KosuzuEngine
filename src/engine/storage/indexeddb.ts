/**
 * IndexedDB 存储系统
 * 为存档系统提供大容量、结构化的存储支持
 */

interface SaveMetadata {
  slot: string;
  scene?: string;
  text?: string;
  time: number;
  frame?: number;
}

export interface SaveData {
  meta: SaveMetadata;
  state: unknown;
  entryVars?: Record<string, unknown>;
  actions?: unknown[];
  choices?: string[];
}

const DB_NAME = 'KosuzuEngineSaves';
const DB_VERSION = 1;
const STORE_NAME = 'saves';

let db: IDBDatabase | null = null;

/**
 * 初始化 IndexedDB 数据库
 */
async function initDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error(`Failed to open IndexedDB: ${request.error}`));
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'meta.slot' });
        // 创建索引以便快速查询
        store.createIndex('time', 'meta.time', { unique: false });
        store.createIndex('scene', 'meta.scene', { unique: false });
      }
    };
  });
}

/**
 * 保存存档到 IndexedDB
 */
export async function saveToIndexedDB(saveData: SaveData): Promise<void> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(saveData);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error(`Failed to save: ${request.error}`));
  });
}

/**
 * 从 IndexedDB 加载存档
 */
export async function loadFromIndexedDB(slot: string): Promise<SaveData | null> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(slot);

    request.onsuccess = () => {
      resolve(request.result || null);
    };
    request.onerror = () => reject(new Error(`Failed to load: ${request.error}`));
  });
}

/**
 * 列出所有存档
 */
export async function listIndexedDBSaves(): Promise<SaveMetadata[]> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('time');
    const request = index.openCursor(null, 'prev'); // 按时间倒序

    const results: SaveMetadata[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        results.push(cursor.value.meta as SaveMetadata);
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    request.onerror = () => reject(new Error(`Failed to list saves: ${request.error}`));
  });
}

/**
 * 删除存档
 */
export async function deleteFromIndexedDB(slot: string): Promise<void> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(slot);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error(`Failed to delete: ${request.error}`));
  });
}

/**
 * 清空所有存档
 */
export async function clearIndexedDBSaves(): Promise<void> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error(`Failed to clear: ${request.error}`));
  });
}

/**
 * 检查 IndexedDB 是否可用
 */
export function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

/**
 * 获取数据库存储使用情况（估算）
 */
export async function getIndexedDBUsage(): Promise<{ count: number; estimatedSize: number }> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const countRequest = store.count();

    countRequest.onsuccess = () => {
      const count = countRequest.result;
      // 粗略估算：每个存档平均 10KB
      const estimatedSize = count * 10 * 1024;
      resolve({ count, estimatedSize });
    };

    countRequest.onerror = () => reject(new Error(`Failed to get usage: ${countRequest.error}`));
  });
}

/**
 * 导出所有存档为 JSON（用于备份）
 */
export async function exportAllSaves(): Promise<string> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const saves = request.result;
      resolve(JSON.stringify(saves, null, 2));
    };

    request.onerror = () => reject(new Error(`Failed to export: ${request.error}`));
  });
}

/**
 * 从 JSON 导入存档（用于恢复备份）
 */
export async function importSaves(jsonString: string): Promise<{ imported: number; failed: number }> {
  const saves = JSON.parse(jsonString) as SaveData[];
  const result = { imported: 0, failed: 0 };

  for (const save of saves) {
    try {
      await saveToIndexedDB(save);
      result.imported++;
    } catch {
      result.failed++;
    }
  }

  return result;
}
