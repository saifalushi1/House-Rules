import type {GameAudio} from './audio';
import type {GameEvent,View} from '../shared/types';
export function chaosSound(a:GameAudio,e:GameEvent){if(!e.kind.startsWith('chaos'))return false;const kind=e.kind.slice(5);
 if(kind==='Hot'){a.tone(800,.06);}
 else if(kind==='Boom'||kind==='Penalty'){a.noise(.5,0,.8,130);a.tone(55,.45,0,'sawtooth',.25);}
 else if(kind==='Seats'){a.noise(.4,0,.5,2200);a.tone(180,.2,.8,'triangle');a.tone(480,.3,1,'triangle');}
 else if(kind==='Cyclone'){for(let i=0;i<12;i++)a.noise(.09,i*.1,.25,1800);a.noise(1.5,0,.25,650);}
 else if(kind==='Coin'){for(let i=0;i<8;i++)a.tone(1400,.07,i*.16,'sine',.15);(e.data.won?[523,659,784,1047]:[392,330,262,196]).forEach((f,i)=>a.tone(f,.25,1.3+i*.17,'triangle'));}
 else if(kind==='Die'){for(let i=0;i<9;i++)a.noise(.08,i*.12,.35,450);a.tone(80,.3,1.3,'triangle',.5);}
 else if(kind==='Flip'){for(let i=0;i<8;i++)a.noise(.06,i*.1,.3,700);a.noise(.65,1,.7,300);a.noise(.5,1,.4,100);a.tone(55,.5,1,'sawtooth',.1);}
 else if(kind==='Blackout'){[220,160,80].forEach((f,i)=>a.tone(f,.3,i*.15,'sawtooth',.08));a.noise(.8,.5,.4,100);}
 else if(kind==='Robin'){a.tone(1300,.1);a.tone(1800,.2,.12);}
 else if(kind==='Word'){a.noise(.1,0,.5,250);}
 else if(kind==='Offender'){a.tone(140,.5,0,'square',.12);}
 else if(kind==='Dare'){for(let i=0;i<14;i++)a.tone(900,.025,2.4*(i/14)**.65,'square',.1);[523,784,1047].forEach((f,i)=>a.tone(f,.2,2.5+i*.1));}
 else if(kind==='Warp'){for(let i=0;i<20;i++)a.tone(1500-i*60,.09,i*.06,'sawtooth',.05);a.noise(1.2,0,.18,2500);}
 else {a.tone(440,.15);a.tone(660,.15,.1);}return true;
}
let lastTick=0;
export function tickChaosAudio(a:GameAudio,room?:View){const hot=room?.phase==='playing'?room.chaos?.hot:undefined;if(!hot)return;const left=Math.max(0,hot.ends-Date.now()),fraction=left/hot.duration,interval=Math.max(100,1000*Math.min(1,fraction));if(Date.now()-lastTick>=interval){lastTick=Date.now();a.tone(600+(1-fraction)*600,.025,0,'square',.08);}}
