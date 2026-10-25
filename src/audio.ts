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
    if(e.kind==='spectatorTomato'){this.noise(.12,0,.3,1600);this.tone(300,.08);this.noise(.2,.85,.5,450);return;}
    if(e.kind==='spectatorGhost'){[440,554,659,880,659,554,440,330].forEach((f,i)=>this.tone(f,.2,i*.65,'triangle',.2));for(let i=0;i<12;i++)this.noise(.06,i*.45,.15,500);return;}
    if(e.kind.startsWith('puzzle')){if(e.kind==='puzzleCorrect'){[523,659,784].forEach((f,i)=>this.tone(f,.14,i*.08));}else if(e.kind==='puzzleMiss'||e.kind==='puzzleTimeout'){this.tone(180,.18);this.noise(.08,0,.12,700);}else{this.tone(523,.08);this.tone(784,.12,.1);}return;}
    if(e.kind.startsWith('jackaroo')){if(e.kind==='jackarooDeal'){for(let i=0;i<12;i++)this.noise(.06,i*.1,.2,2100);}else if(e.kind==='jackarooCapture'){this.tone(210,.16);this.noise(.12,.1,.3,550);}else if(e.kind==='jackarooMove'){this.noise(.06,0,.2,2400);for(let i=0;i<5;i++)this.tone(440+i*80,.06,i*.14,'triangle',.14);}else{this.noise(.15,0,.2,1200);}return;}
    if(chaosSound(this,e))return;if(e.kind==='dartLockHeight'||e.kind==='pongLockHeight'){this.tone(660,.07);this.tone(990,.09,.07);return;}
    if(e.kind.startsWith('wolf')){if(e.kind==='wolfPhase'){const night=e.data.phase==='night';[night?220:523,night?330:659,night?440:784].forEach((f,i)=>this.tone(f,.4,i*.2,'triangle',.2));}else if(e.kind==='wolfVote'){this.noise(.08,0,.3,500);this.tone(160,.1);}else {this.tone(330,.4);this.tone(220,.5,.2);}return;}
    if(e.kind.startsWith('bj')){if(e.kind==='bjShuffle'){for(let i=0;i<10;i++)this.noise(.06,i*.07,.25,1900);}else if(['bjDeal','bjHit','bjDealerHit'].includes(e.kind)){for(let i=0;i<(e.kind==='bjDeal'?5:1);i++)this.noise(.07,i*.12,.3,2400);}else if(e.kind==='bjResult'){[523,659,784].forEach((f,i)=>this.tone(f,.16,i*.1));}else {this.tone(1000,.06);this.noise(.03,.07,.3,2800);}return;}
    if(e.kind==='dartThrow'){this.noise(.11,0,.25,2500);this.noise(.08,.5,.4,600);this.tone(e.data.bust?180:e.data.points===50?1047:350,.2,.55);return;}
    if(e.kind==='pongThrow'){this.tone(480,.07);this.tone(370,.06,.4);this.noise(.25,.9,.3,e.data.hit?1400:650);if(e.data.hit)this.tone(880,.16,1);return;}
    if(e.kind.startsWith('pong')||e.kind==='dartStart'){this.tone(523,.15);this.tone(784,.2,.15);return;}
    switch (e.kind) {
      case 'rooftopJump':this.noise(.8,0,.3,800);this.tone(500,.3);this.tone(350,.4,.3);this.noise(.3,4.1,.3,1500);break;
      case 'soreLoserShot':this.noise(.12,0,.5,1400);this.tone(200,.1);this.noise(.15,.65,.5,500);this.tone(700,.15,1);break;
      case 'charadeTurn':this.tone(523,.15);this.tone(784,.2,.18);break;
      case 'pokerAction':if(e.data.move==='fold')this.noise(.13,0,.25,2000);else if(e.data.move==='check'){this.tone(140,.05);this.tone(140,.05,.12);}else for(let i=0;i<5;i++){this.noise(.025,i*.07,.25,3000);this.tone(1100+i*130,.055,i*.07,'triangle',.12);}break;
      case 'pokerStreet':for(let i=0;i<Number(e.data.count);i++)this.noise(.08,i*.14,.3,1800);break;
      case 'pokerWin':[523,659,784,1047].forEach((f,i)=>this.tone(f,.22,i*.09));break;
      case 'scribbleInk':this.noise(.035,0,.08,2400);break;
      case 'rpgRoll': case 'rpgInitiative':for(let i=0;i<8;i++)this.noise(.08,i*.11,.3,700);this.tone(110,.2,.9);break;
      case 'rpgAttack':case 'raidBeat':this.noise(.12,0,.5,600);this.tone(90,.2);break;
      case 'rpgSpell':[440,660,880,1320].forEach((f,i)=>this.tone(f,.2,i*.08));this.noise(.4,0,.2,3000);break;
      case 'scribbleChime':[659,880,1175].forEach((f,i)=>this.tone(f,.16,i*.085,'triangle',.55));break;
      case 'scribbleIntermission':this.tone(392,.16);this.tone(523,.22,.2);break;
      case 'raidReady':case 'raidFight':this.tone(800,.1,0,'triangle',.45);this.tone(1100,.16,.15);break;
      case 'rpgHeal':case 'rpgVictory':case 'raidEnd':[523,659,784,1047].forEach((f,i)=>this.tone(f,.2,i*.1));break;
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
