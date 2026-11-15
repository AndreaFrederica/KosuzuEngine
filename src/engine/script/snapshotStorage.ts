import type { ScriptSnapshot } from './QuickJSScriptRuntime';

function toBase64(bytes: Uint8Array) {
  let result = '';
  for (let i = 0; i < bytes.length; i += 0x8000) result += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(result);
}

/** Capture synchronously, then compress the detached bytes without moving the save point. */
export async function compressSnapshot(snapshot: ScriptSnapshot): Promise<ScriptSnapshot> {
  if (snapshot.compression || typeof CompressionStream === 'undefined') return snapshot;
  const bytes = Uint8Array.from(atob(snapshot.memory), (c) => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
  const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
  return { ...snapshot, memory: toBase64(compressed), compression: 'gzip' };
}

export async function decompressSnapshot(snapshot: ScriptSnapshot): Promise<ScriptSnapshot> {
  if (!snapshot.compression) return snapshot;
  if (snapshot.compression !== 'gzip' || typeof DecompressionStream === 'undefined') {
    throw new Error('此浏览器不支持该存档的 gzip 解压');
  }
  const bytes = Uint8Array.from(atob(snapshot.memory), (c) => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const uncompressed = new Uint8Array(await new Response(stream).arrayBuffer());
  return {
    abi: snapshot.abi, pending: snapshot.pending, memory: toBase64(uncompressed),
    ...(snapshot.location ? { location: snapshot.location } : {}),
  };
}
