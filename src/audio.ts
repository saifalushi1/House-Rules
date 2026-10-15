import {chaosSound} from './chaos-audio';
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
    if(chaosSound(this,e))return;
    switch (e.kind) {
      case 'pokerAction':if(e.data.move==='fold')this.noise(.13,0,.25,2000);else if(e.data.move==='check'){this.tone(140,.05);this.tone(140,.05,.12);}else for(let i=0;i<5;i++){this.noise(.025,i*.07,.25,3000);this.tone(1100+i*130,.055,i*.07,'triangle',.12);}break;
      case 'pokerStreet':for(let i=0;i<Number(e.data.count);i++)this.noise(.08,i*.14,.3,1800);break;
      case 'pokerWin':[523,659,784,1047].forEach((f,i)=>this.tone(f,.22,i*.09));break;
      case 'scribbleInk':this.noise(.035,0,.08,2400);break;
      case 'rpgRoll': case 'rpgInitiative':for(let i=0;i<8;i++)this.noise(.08,i*.11,.3,700);this.tone(110,.2,.9);break;
      case 'rpgAttack':case 'raidBeat':this.noise(.12,0,.5,600);this.tone(90,.2);break;
      case 'rpgSpell':[440,660,880,1320].forEach((f,i)=>this.tone(f,.2,i*.08));this.noise(.4,0,.2,3000);break;
      case 'rpgHeal':case 'scribbleCorrect':case 'rpgVictory':case 'raidEnd':[523,659,784,1047].forEach((f,i)=>this.tone(f,.2,i*.1));break;
      case 'rpgMove':this.tone(200,.05);this.tone(260,.05,.15);break;
      case 'solitaireDraw':case 'solitaireMove':case 'scribbleClear':this.noise(.12,0,.25,1800);break;
      case 'raidStart':this.tone(500,.3);this.tone(750,.3,.2);break;
      case 'raidDecline':case 'rpgDefeat':this.tone(330,.25);this.tone(220,.3,.2);break;
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
