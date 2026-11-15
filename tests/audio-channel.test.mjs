import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AudioChannel } from '../src/engine/render/AudioChannel.ts';

class DeferredAudio {
  static instances = [];
  sources = [];
  paused = true;
  ended = false;
  currentTime = 0;
  readyState = 0;
  volume = 1;
  pending = [];
  constructor() { DeferredAudio.instances.push(this); }
  set src(url) {
    this.sources.push(url);
    this.cancel();
    this.paused = true;
  }
  addEventListener() {}
  play() {
    return new Promise((resolve, reject) => this.pending.push({
      resolve: () => { this.paused = false; this.readyState = 2; resolve(); }, reject,
    }));
  }
  cancel() {
    for (const request of this.pending.splice(0)) {
      request.reject(new DOMException('Interrupted by load', 'AbortError'));
    }
  }
  pause() { this.paused = true; this.cancel(); }
  removeAttribute() {}
  load() { this.cancel(); }
}

globalThis.window = {};
globalThis.Audio = DeferredAudio;
globalThis.HTMLMediaElement = { HAVE_CURRENT_DATA: 2 };
const tick = () => new Promise(resolve => setImmediate(resolve));
const createChannel = () => {
  const channel = new AudioChannel('test_bgm', { type: 'bgm', loop: true });
  return { channel, audio: DeferredAudio.instances.at(-1) };
};

test('repeated requests during a slow load share playback without reloading the source', async () => {
  const { channel, audio } = createChannel();
  try {
    const first = channel.play('/music.ogg');
    await tick();
    const second = channel.play('/music.ogg');
    assert.equal(channel.getStatus().isLoading, true);
    assert.deepEqual(audio.sources, ['/music.ogg']);
    assert.equal(audio.pending.length, 1);
    audio.pending.shift().resolve();
    assert.deepEqual(await Promise.all([first, second]), [true, true]);
    // Zero playback time immediately after play() is a valid playing state.
    assert.equal(channel.getStatus().isPlaying, true);
    assert.equal(await channel.play('/music.ogg'), true);
    assert.deepEqual(audio.sources, ['/music.ogg']);
  } finally { channel.dispose(); }
});

test('a replaced load cannot clear the new track or report an obsolete failure', async () => {
  const { channel, audio } = createChannel();
  try {
    const old = channel.play('/old.ogg');
    const next = channel.play('/new.ogg');
    assert.equal(await old, false);
    assert.equal(channel.getStatus().currentTrack, '/new.ogg');
    assert.equal(channel.getStatus().isLoading, true);
    audio.pending.shift().resolve();
    assert.equal(await next, true);
    assert.equal(channel.getStatus().currentTrack, '/new.ogg');
  } finally { channel.dispose(); }
});

test('stop cancels a loading track even before playback has begun', async () => {
  const { channel, audio } = createChannel();
  try {
    const loading = channel.play('/music.ogg');
    assert.equal(await channel.stop(500), true);
    assert.equal(await loading, false);
    assert.equal(audio.pending.length, 0);
    assert.equal(channel.getStatus().currentTrack, null);
    assert.equal(channel.getStatus().isLoading, false);
  } finally { channel.dispose(); }
});

test('a new song cancels an old fade-out without stopping the replacement or hanging callers', async () => {
  for (const nextUrl of ['/new.ogg', '/old.ogg']) {
  const { channel, audio } = createChannel();
  try {
    const first = channel.play('/old.ogg');
    audio.pending.shift().resolve();
    await first;
    const stopping = channel.stop(500);
    const next = channel.play(nextUrl);
    audio.pending.shift().resolve();
    assert.deepEqual(await Promise.all([stopping, next]), [false, true]);
    assert.equal(channel.getStatus().currentTrack, nextUrl);
    assert.equal(channel.getStatus().isPlaying, true);
  } finally { channel.dispose(); }
  }
});

test('genuine media failures remain failures and autoplay blocks remain explicit', async () => {
  const { channel, audio } = createChannel();
  try {
    const failed = channel.play('/missing.ogg');
    audio.pending.shift().reject(new DOMException('Unsupported media', 'NotSupportedError'));
    assert.equal(await failed, false);
    assert.equal(channel.getStatus().currentTrack, null);
    const blocked = channel.play('/music.ogg');
    audio.pending.shift().reject(new DOMException('User gesture required', 'NotAllowedError'));
    await assert.rejects(blocked, { name: 'NotAllowedError' });
    assert.equal(channel.getStatus().isLoading, false);
  } finally { channel.dispose(); }
});
