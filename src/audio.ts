import type { GameEvent } from '../shared/types';
/** Original synthesized effects; no audio downloads or third-party assets. */
export class GameAudio {
  context?: AudioContext;
  master?: GainNode;
  muted = localStorage.getItem('house-muted') === 'true';
  volume = Number(localStorage.getItem('house-volume') || '.35');
  async unlock() {
    try { this.context ||= new AudioContext(); if (!this.master) { this.master = this.context.createGain(); this.master.gain.value = this.muted ? 0 : 1; this.master.connect(this.context.destination); } if (this.context.state === 'suspended') await this.context.resume(); } catch { /* Sound remains optional. */ }
  }
  toggle() { this.muted = !this.muted; if(this.master)this.master.gain.value=this.muted?0:1; localStorage.setItem('house-muted', String(this.muted)); }
  tone(frequency: number, duration = .12, delay = 0, type: OscillatorType = 'sine', strength = .25) {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running' || this.muted) return;
    const oscillator = ctx.createOscillator(), gain = ctx.createGain(), start = ctx.currentTime + delay;
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(.001, start); gain.gain.exponentialRampToValueAtTime(Math.max(.001, strength * this.volume), start + .01); gain.gain.exponentialRampToValueAtTime(.001, start + duration);
    oscillator.connect(gain).connect(this.master || ctx.destination); oscillator.start(start); oscillator.stop(start + duration + .02);
  }
  noise(duration = .09, delay = 0, strength = .3, frequency = 1400) {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running' || this.muted) return;
    const source = ctx.createBufferSource(), buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
    const samples = buffer.getChannelData(0); for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / samples.length);
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter(), gain = ctx.createGain(); filter.type = 'bandpass'; filter.frequency.value = frequency; gain.gain.value = strength * this.volume;
    source.connect(filter).connect(gain).connect(this.master || ctx.destination); source.start(ctx.currentTime + delay);
  }
  play(e: GameEvent) {
    switch (e.kind) {
      case 'deal':
        for (let i = 0; i < 10; i++) this.noise(.06, i * .09, .25, 1700);
        for (let i = 0; i < 18; i++) this.noise(.04, 1.1 + i * .095, .18, 2400);
        this.tone(523, .2, 3.2); break;
      case 'roll':
        for (let i = 0; i < 8; i++) { this.noise(.06, i * .105, .5, 800); this.tone(180 + i * 12, .055, i * .105, 'triangle', .2); }
        for (let i = 0; i < Number(e.data.steps || 1); i++) this.tone(420 + i * 18, .055, 1 + i * .16, 'triangle', .15);
        break;
      case 'slap': for(let i=0;i<6;i++)this.noise(.05,i*.17,.25,300); this.noise(.1, 1.2, .9, 1600); this.tone(100, .16, 1.2, 'triangle', .6); break;
      case 'duelRound': this.noise(.1, .12, .6, 650); this.tone(85, .15, .12, 'sine', .6); break;
      case 'duelStart': case 'clash': this.tone(400, .35, 0, 'triangle'); this.tone(600, .35, .2, 'triangle'); break;
      case 'win': case 'duelEnd': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, .35, i * .13, 'triangle')); break;
      case 'triviaCorrect': case 'correct': case 'tradeAccept': case 'trick': [523, 659, 784].forEach((f, i) => this.tone(f, .18, i * .1)); break;
      case 'buy': case 'sell': case 'lifeChoice': this.tone(800, .1); this.tone(1200, .18, .09); break;
      case 'play': case 'draw': case 'collect': this.noise(.09, 0, .4, 2200); break;
      case 'challenge': case 'catch': this.noise(.08); this.tone(220, .22, .06, 'sawtooth', .08); break;
      case 'timeout': case 'skip': case 'tradeReject': this.tone(330, .17); this.tone(220, .22, .15); break;
      case 'chat': case 'guess': this.tone(520, .04, 0, 'sine', .06); break;
      default: this.tone(440, .09, 0, 'triangle', .12); this.tone(560, .1, .06, 'triangle', .1);
    }
  }
}
