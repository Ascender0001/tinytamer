// @ts-nocheck
const MUTE_KEY = 'tiny-tamer-muted';

export class AudioManager {
  constructor() {
    this.context = null;
    this.master = null;
    this.musicGain = null;
    this.isMuted = localStorage.getItem(MUTE_KEY) === 'true';
    this.started = false;
    this.musicStarted = false;
    this.loopTimers = [];
  }

  get muted() {
    return this.isMuted;
  }

  async start() {
    if (this.started) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = this.isMuted ? 0 : 0.28;
    this.master.connect(this.context.destination);

    this.musicGain = this.context.createGain();
    this.musicGain.gain.value = 0.22;
    this.musicGain.connect(this.master);
    this.started = true;
    await this.context.resume();
    this.startProceduralMusic();
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem(MUTE_KEY, String(this.isMuted));
    if (this.master) this.master.gain.setTargetAtTime(this.isMuted ? 0 : 0.28, this.context.currentTime, 0.04);
    return this.isMuted;
  }

  playTone({ frequency = 440, duration = 0.12, type = 'sine', volume = 0.08 } = {}) {
    if (!this.started || this.isMuted || !this.context) return;
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  click() {
    this.playTone({ frequency: 620, duration: 0.06, type: 'triangle', volume: 0.045 });
  }

  encounter() {
    this.playTone({ frequency: 330, duration: 0.16, type: 'sine', volume: 0.07 });
    setTimeout(() => this.playTone({ frequency: 495, duration: 0.2, type: 'sine', volume: 0.065 }), 100);
  }

  action() {
    this.playTone({ frequency: 250, duration: 0.09, type: 'square', volume: 0.035 });
  }

  startProceduralMusic() {
    if (this.musicStarted) return;
    this.musicStarted = true;
    const melody = [392, 493.88, 523.25, 659.25, 587.33, 523.25, 440, 392];
    const bass = [130.81, 146.83, 164.81, 196];
    const chords = [[261.63, 329.63, 392], [293.66, 369.99, 440], [220, 329.63, 392], [246.94, 329.63, 493.88]];
    let step = 0;

    const playEnvOsc = (frequency, duration, type, volume, destination = this.musicGain, attack = 0.03) => {
      if (!this.started || !this.context) return;
      const now = this.context.currentTime;
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      osc.type = type;
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain).connect(destination);
      osc.start(now);
      osc.stop(now + duration + 0.03);
    };

    const playPad = () => {
      const filter = this.context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 700;
      filter.connect(this.musicGain);
      chords[step % chords.length].forEach((note) => playEnvOsc(note, 3.4, 'sine', 0.018, filter, 0.3));
    };

    const playMelody = () => {
      playEnvOsc(melody[step % melody.length], 0.42, 'triangle', 0.048, this.musicGain, 0.015);
      step += 1;
    };

    const playBass = () => {
      playEnvOsc(bass[Math.floor(step / 2) % bass.length], 0.85, 'sine', 0.04, this.musicGain, 0.04);
    };

    const playShaker = () => {
      if (!this.started || !this.context) return;
      const bufferSize = this.context.sampleRate * 0.045;
      const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      const source = this.context.createBufferSource();
      const gain = this.context.createGain();
      gain.gain.value = 0.018;
      source.buffer = buffer;
      source.connect(gain).connect(this.musicGain);
      source.start();
    };

    playPad();
    playBass();
    playMelody();
    this.loopTimers.push(setInterval(playPad, 3200));
    this.loopTimers.push(setInterval(playBass, 1600));
    this.loopTimers.push(setInterval(playMelody, 800));
    this.loopTimers.push(setInterval(playShaker, 400));
  }
}

