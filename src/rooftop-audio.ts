import type {GameAudio} from './audio';import type {View} from '../shared/types';
let lastCycle=-1,lastHit=-1;
export function rooftopAudio(a:GameAudio,r?:View){if(r?.rules.background!=='rooftop')return;const now=Date.now(),cycle=Math.floor(now/32000),part=(now%32000)/32000;if(cycle!==lastCycle){lastCycle=cycle;lastHit=-1;}const hit=part>=.595?1:part>=.48?0:-1;if(hit>=0&&hit!==lastHit){lastHit=hit;a.noise(.45,0,.14,180);a.tone(65,.4,0,'triangle',.04);}}
