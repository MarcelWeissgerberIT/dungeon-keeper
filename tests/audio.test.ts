import test from 'node:test';
import assert from 'node:assert/strict';
import { DungeonAudio, DEFAULT_AUDIO, readAudioSettings } from '../app/audio';
class Param {
  value = 0;
  setTargetAtTime(v: number) {
    this.value = v;
  }
  setValueAtTime(v: number) {
    this.value = v;
  }
  exponentialRampToValueAtTime(v: number) {
    this.value = v;
  }
}
class Node {
  connections: unknown[] = [];
  gain = new Param();
  frequency = new Param();
  pan = new Param();
  threshold = new Param();
  knee = new Param();
  ratio = new Param();
  connect(node: unknown) {
    this.connections.push(node);
    return node;
  }
  disconnect() {}
  start() {}
  stop() {}
}
class AudioContextMock {
  currentTime = 0;
  sampleRate = 8000;
  state = 'running';
  destination = new Node();
  gains: Node[] = [];
  panners: Node[] = [];
  static latest: AudioContextMock;
  constructor() {
    AudioContextMock.latest = this;
  }
  createGain() {
    const n = new Node();
    this.gains.push(n);
    return n;
  }
  createDynamicsCompressor() {
    return new Node();
  }
  createBuffer(channels: number, length: number) {
    const data = Array.from(
      { length: channels },
      () => new Float32Array(length),
    );
    return { getChannelData: (i: number) => data[i] };
  }
  createConvolver() {
    return new Node();
  }
  createBufferSource() {
    return new Node();
  }
  createBiquadFilter() {
    return new Node();
  }
  createOscillator() {
    return new Node();
  }
  createStereoPanner() {
    const node = new Node();
    this.panners.push(node);
    return node;
  }
  resume() {
    return Promise.resolve();
  }
  close() {
    return Promise.resolve();
  }
}
test('music and effects volumes and mutes are independent audio gains', () => {
  Object.assign(globalThis, { AudioContext: AudioContextMock });
  const audio = new DungeonAudio(DEFAULT_AUDIO);
  try {
    audio.start();
    const [music, effects] = AudioContextMock.latest.gains;
    assert.ok(Math.abs(music.gain.value - 0.32) < 1e-10);
    assert.equal(effects.gain.value, 0.39);
    audio.update({ ...DEFAULT_AUDIO, musicMuted: true });
    assert.equal(music.gain.value, 0);
    assert.equal(effects.gain.value, 0.39);
    audio.update({ ...DEFAULT_AUDIO, effectsMuted: true, musicVolume: 75 });
    assert.ok(Math.abs(music.gain.value - 0.6) < 1e-10);
    assert.equal(effects.gain.value, 0);
    audio.update({ ...DEFAULT_AUDIO, musicVolume: 20, effectsVolume: 10 });
    assert.ok(Math.abs(music.gain.value - 0.16) < 1e-10);
    assert.ok(Math.abs(effects.gain.value - 0.06) < 1e-10);
    audio.setPaused(true);
    assert.equal(music.gain.value, 0);
    assert.equal(effects.gain.value, 0);
    audio.setPaused(false);
    assert.ok(music.gain.value > 0);
    const first = AudioContextMock.latest.panners.length;
    for (const cue of ['capture', 'torment', 'ritual'] as const) audio.cue(cue);
    const roomSounds = AudioContextMock.latest.panners.slice(first);
    assert.equal(roomSounds.length, 3);
    for (const panner of roomSounds)
      assert.deepEqual(panner.connections, [effects]);
  } finally {
    audio.dispose();
  }
});
test('invalid audio preferences fall back to useful separate defaults', () => {
  Object.assign(globalThis, {
    localStorage: { getItem: () => '{"musicVolume":9999}', setItem: () => {} },
  });
  assert.deepEqual(readAudioSettings(), DEFAULT_AUDIO);
});
