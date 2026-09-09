/** Original adaptive ambient score and synthesized game effects. No recordings or third-party compositions. */
export type SoundCue =
  | 'click'
  | 'build'
  | 'warn'
  | 'dig'
  | 'gold'
  | 'heal'
  | 'bolt'
  | 'hit'
  | 'spawn'
  | 'capture'
  | 'torment'
  | 'ritual';
export interface AudioSettings {
  musicVolume: number;
  effectsVolume: number;
  musicMuted: boolean;
  effectsMuted: boolean;
}
export const DEFAULT_AUDIO: AudioSettings = {
  musicVolume: 40,
  effectsVolume: 65,
  musicMuted: false,
  effectsMuted: false,
};
export const AUDIO_KEY = 'kluftkrone-audio-v1';
export function readAudioSettings(): AudioSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(AUDIO_KEY) ?? 'null');
    if (
      raw &&
      [raw.musicVolume, raw.effectsVolume].every(
        (n) =>
          typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100,
      ) &&
      typeof raw.musicMuted === 'boolean' &&
      typeof raw.effectsMuted === 'boolean'
    )
      return raw;
  } catch {}
  return { ...DEFAULT_AUDIO };
}
export class DungeonAudio {
  private context: AudioContext | null = null;
  private music: GainNode | null = null;
  private effects: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private settings: AudioSettings;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextNote = 0;
  private step = 0;
  private suspended = false;
  private tension = 0;
  private lastCue = new Map<string, number>();
  private ambience: AudioBufferSourceNode | null = null;
  private disposed = false;
  constructor(settings: AudioSettings) {
    this.settings = { ...settings };
  }
  start() {
    if (this.disposed) return;
    try {
      if (!this.context) {
        const ctx = new AudioContext();
        this.context = ctx;
        const master = ctx.createDynamicsCompressor();
        master.threshold.value = -20;
        master.knee.value = 18;
        master.ratio.value = 5;
        master.connect(ctx.destination);
        this.music = ctx.createGain();
        this.effects = ctx.createGain();
        this.music.connect(master);
        this.effects.connect(master);
        const impulse = ctx.createBuffer(2, ctx.sampleRate * 3, ctx.sampleRate);
        for (let channel = 0; channel < 2; channel++) {
          const data = impulse.getChannelData(channel);
          let smooth = 0;
          for (let i = 0; i < data.length; i++) {
            smooth = 0.6 * smooth + 0.4 * (Math.random() * 2 - 1);
            data[i] = smooth * Math.pow(1 - i / data.length, 2.8) * 0.5;
          }
        }
        this.reverb = ctx.createConvolver();
        this.reverb.buffer = impulse;
        const wet = ctx.createGain();
        wet.gain.value = 0.34;
        this.reverb.connect(wet);
        wet.connect(this.music);
        const noise = ctx.createBuffer(1, ctx.sampleRate * 6, ctx.sampleRate);
        let brown = 0;
        const data = noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          brown = (brown + 0.018 * (Math.random() * 2 - 1)) / 1.018;
          data[i] = brown * 3;
        }
        const breeze = ctx.createBufferSource();
        breeze.buffer = noise;
        breeze.loop = true;
        const low = ctx.createBiquadFilter();
        low.type = 'lowpass';
        low.frequency.value = 330;
        const ambientGain = ctx.createGain();
        ambientGain.gain.value = 0.09;
        breeze.connect(low).connect(ambientGain).connect(this.music);
        breeze.start();
        this.ambience = breeze;
        this.nextNote = ctx.currentTime + 0.1;
        this.timer = setInterval(() => this.schedule(), 300);
        this.applySettings();
      }
      if (this.context.state === 'suspended')
        void this.context.resume().catch(() => {});
      this.suspended = false;
      this.applySettings();
      this.schedule();
    } catch {
      /* Sound is optional if Web Audio is unavailable. */
    }
  }
  update(settings: AudioSettings) {
    this.settings = { ...settings };
    this.applySettings();
    try {
      localStorage.setItem(AUDIO_KEY, JSON.stringify(settings));
    } catch {}
  }
  private applySettings() {
    if (!this.context || !this.music || !this.effects) return;
    const now = this.context.currentTime;
    this.music.gain.setTargetAtTime(
      this.suspended || this.settings.musicMuted
        ? 0
        : (this.settings.musicVolume / 100) * 0.8,
      now,
      0.3,
    );
    this.effects.gain.setTargetAtTime(
      this.suspended || this.settings.effectsMuted
        ? 0
        : (this.settings.effectsVolume / 100) * 0.6,
      now,
      0.08,
    );
  }
  setPaused(paused: boolean) {
    this.suspended = paused;
    this.applySettings();
  }
  setTension(value: number) {
    this.tension = Math.max(0, Math.min(1, value));
  }
  private note(
    freq: number,
    when: number,
    duration: number,
    volume: number,
    type: OscillatorType = 'sine',
    pan = 0,
  ) {
    const ctx = this.context;
    if (!ctx || !this.music) return;
    const osc = ctx.createOscillator(),
      gain = ctx.createGain(),
      panner = ctx.createStereoPanner();
    osc.type = type;
    osc.frequency.value = freq;
    panner.pan.value = pan;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(
      volume,
      when + Math.min(duration * 0.3, 0.8),
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    osc.connect(gain).connect(panner);
    panner.connect(this.music);
    if (this.reverb) panner.connect(this.reverb);
    osc.start(when);
    osc.stop(when + duration + 0.1);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
      panner.disconnect();
    };
  }
  private schedule() {
    const ctx = this.context;
    if (!ctx || this.disposed) return;
    if (this.nextNote < ctx.currentTime) this.nextNote = ctx.currentTime + 0.08;
    while (this.nextNote < ctx.currentTime + 1.4) {
      const beat = 1.3;
      const phrase = Math.floor(this.step / 16) % 4;
      const roots = [55, 48.999, 58.27, 51.913];
      const root = roots[phrase];
      if (this.step % 4 === 0) {
        this.note(root, this.nextNote, 7, 0.105);
        this.note(
          root * 1.4983,
          this.nextNote + 0.03,
          6,
          0.037,
          'triangle',
          -0.25,
        );
        this.note(root * 2.001, this.nextNote + 0.12, 5, 0.025, 'sine', 0.3);
      }
      // Slow original motif in an aeolian mode, with empty beats and a distant bell voice.
      const melody = [
        0,
        null,
        7,
        null,
        10,
        7,
        null,
        3,
        null,
        2,
        null,
        7,
        5,
        null,
        3,
        null,
      ];
      const degree = melody[this.step % 16];
      if (degree !== null) {
        const frequency = root * 4 * Math.pow(2, degree / 12);
        this.note(
          frequency,
          this.nextNote + 0.25,
          3.9,
          0.037,
          'sine',
          Math.sin(this.step) * 0.55,
        );
        this.note(
          frequency * 2.01,
          this.nextNote + 0.25,
          2,
          0.007,
          'sine',
          -0.25,
        );
      }
      if (this.tension > 0.2 && this.step % 2 === 0)
        this.note(
          root * 0.5,
          this.nextNote,
          0.6,
          0.11 * this.tension,
          'triangle',
        );
      this.step++;
      this.nextNote += beat;
    }
  }
  cue(cue: SoundCue, x = 13) {
    const ctx = this.context;
    if (!ctx || !this.effects || this.disposed || this.suspended) return;
    const now = ctx.currentTime;
    const minimum = {
      click: 0.08,
      build: 0.12,
      warn: 1,
      dig: 0.35,
      gold: 0.3,
      heal: 0.25,
      bolt: 0.18,
      hit: 0.19,
      spawn: 0.5,
      capture: 0.6,
      torment: 2,
      ritual: 1.5,
    }[cue];
    if (now - (this.lastCue.get(cue) ?? -99) < minimum) return;
    this.lastCue.set(cue, now);
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.max(-0.7, Math.min(0.7, (x - 13) / 13));
    pan.connect(this.effects);
    let tail = 0.8;
    const tone = (
      freq: number,
      end: number,
      duration: number,
      volume: number,
      type: OscillatorType = 'sine',
      delay = 0,
    ) => {
      const osc = ctx.createOscillator(),
        gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + delay);
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, end),
        now + delay + duration,
      );
      gain.gain.setValueAtTime(0.0001, now + delay);
      gain.gain.exponentialRampToValueAtTime(volume, now + delay + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);
      osc.connect(gain).connect(pan);
      osc.start(now + delay);
      osc.stop(now + delay + duration + 0.02);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
      tail = Math.max(tail, delay + duration + 0.2);
    };
    const noise = (duration: number, frequency: number, volume: number) => {
      const buffer = ctx.createBuffer(
          1,
          Math.ceil(ctx.sampleRate * duration),
          ctx.sampleRate,
        ),
        data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++)
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
      const source = ctx.createBufferSource(),
        filter = ctx.createBiquadFilter(),
        gain = ctx.createGain();
      source.buffer = buffer;
      filter.type = 'lowpass';
      filter.frequency.value = frequency;
      gain.gain.value = volume;
      source.connect(filter).connect(gain).connect(pan);
      source.start(now);
      source.onended = () => {
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
      };
    };
    if (cue === 'dig') {
      noise(0.18, 950, 0.21);
      tone(130, 44, 0.16, 0.18, 'triangle');
    } else if (cue === 'hit') {
      noise(0.17, 1500, 0.23);
      tone(190, 42, 0.17, 0.15, 'triangle');
      tone(670, 250, 0.12, 0.028, 'square');
    } else if (cue === 'gold') {
      [880, 1174, 1568].forEach((f, i) =>
        tone(f, f * 0.99, 0.4, 0.07, 'sine', i * 0.075),
      );
    } else if (cue === 'build') {
      noise(0.23, 800, 0.12);
      tone(100, 45, 0.25, 0.18, 'triangle');
      tone(350, 175, 0.4, 0.055, 'sine', 0.07);
    } else if (cue === 'heal') {
      [261.63, 329.63, 392, 523.25].forEach((f, i) =>
        tone(f, f * 1.005, 1.1, 0.055, 'sine', i * 0.07),
      );
    } else if (cue === 'bolt') {
      noise(0.35, 3500, 0.23);
      tone(90, 800, 0.28, 0.08, 'sawtooth');
    } else if (cue === 'capture') {
      noise(0.16, 2600, 0.07);
      [620, 930, 1240].forEach((f, i) =>
        tone(f, f * 0.7, 0.3, 0.055, 'triangle', i * 0.05),
      );
      tone(85, 42, 0.8, 0.09, 'sine');
    } else if (cue === 'torment') {
      tone(110, 83, 1.1, 0.06, 'triangle');
      tone(164, 123, 0.9, 0.045, 'sine', 0.12);
      noise(0.2, 1800, 0.025);
    } else if (cue === 'ritual') {
      [65.4, 98, 130.8, 196].forEach((f, i) =>
        tone(f, f * 1.04, 2.1, 0.05, 'sine', i * 0.16),
      );
    } else if (cue === 'warn') {
      [73.42, 110, 146.83].forEach((f) =>
        tone(f, f * 0.99, 1.4, 0.06, 'triangle'),
      );
    } else if (cue === 'spawn') {
      tone(165, 330, 0.7, 0.055, 'sine');
      tone(220, 440, 0.7, 0.04, 'sine', 0.08);
    } else tone(200, 110, 0.1, 0.07, 'sine');
    setTimeout(() => pan.disconnect(), tail * 1000);
  }
  voice(kind: string, event: 'grab' | 'hurt' | 'drop') {
    const ctx = this.context;
    if (!ctx || !this.effects || this.disposed || this.suspended) return;
    const now = ctx.currentTime;
    const key = 'voice-' + kind;
    if (now - (this.lastCue.get(key) ?? -99) < 0.45) return;
    this.lastCue.set(key, now);
    const base =
      (
        {
          worker: 185,
          guard: 87,
          scholar: 220,
          brute: 48,
          invader: 105,
        } as Record<string, number>
      )[kind] ?? 110;
    const duration = event === 'grab' ? 0.6 : event === 'hurt' ? 0.34 : 0.45,
      osc = ctx.createOscillator(),
      gain = ctx.createGain(),
      filter = ctx.createBiquadFilter(),
      second = ctx.createBiquadFilter(),
      vibrato = ctx.createOscillator(),
      depth = ctx.createGain();
    osc.type = kind === 'scholar' ? 'triangle' : 'sawtooth';
    osc.frequency.setValueAtTime(base * (event === 'hurt' ? 1.8 : 1.25), now);
    osc.frequency.exponentialRampToValueAtTime(
      base * (event === 'grab' ? 1.9 : 0.7),
      now + duration * 0.45,
    );
    osc.frequency.exponentialRampToValueAtTime(base * 0.8, now + duration);
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(
      kind === 'brute' ? 300 : kind === 'worker' ? 1200 : 700,
      now,
    );
    filter.frequency.linearRampToValueAtTime(
      event === 'grab' ? 950 : 400,
      now + duration,
    );
    filter.Q.value = 1.2;
    second.type = 'lowpass';
    second.frequency.value = 2400;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.15, now + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    vibrato.frequency.value = kind === 'brute' ? 17 : 29;
    depth.gain.value = base * 0.08;
    vibrato.connect(depth).connect(osc.frequency);
    osc.connect(filter).connect(second).connect(gain).connect(this.effects);
    osc.start(now);
    vibrato.start(now);
    osc.stop(now + duration + 0.02);
    vibrato.stop(now + duration + 0.02);
    osc.onended = () => {
      osc.disconnect();
      filter.disconnect();
      second.disconnect();
      gain.disconnect();
      vibrato.disconnect();
      depth.disconnect();
    };
  }
  dispose() {
    this.disposed = true;
    if (this.timer) clearInterval(this.timer);
    this.ambience?.stop();
    void this.context?.close();
    this.context = null;
  }
}
