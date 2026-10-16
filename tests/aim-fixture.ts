import {chaosAimSpeed} from '../shared/chaos-policy.js';
import {act} from '../server/engine.js';
import type {Action,Room} from '../shared/types.js';
import {aimPeriods} from '../shared/club.js';
/** Set up a known locked aim for scoring-only engine tests; protocol tests use real clicks. */
export function scoringAction(r:Room,id:string,a:Action){
 if(a.type==='dartThrow'||a.type==='pongThrow'){
  const x=Number(a.x),y=Number(a.y);if(!Number.isFinite(x)||!Number.isFinite(y))throw Error('Invalid test aim.');
  const g=r.darts||r.pong!;g.aimAt=Date.now()-1000;
  g.aimLock={y:Math.max(-1.12,Math.min(1.12,y)),at:Date.now()-(Math.max(-1.12,Math.min(1.12,x))/1.12+1 )*aimPeriods.horizontal/4/chaosAimSpeed(r.rules,r.chaos)};
  return act(r,id,{...a,aimAt:g.aimAt,gameInstance:r.gameInstance,at:Date.now()});
 }
 return act(r,id,a);
}
