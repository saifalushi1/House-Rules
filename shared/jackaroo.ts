import type {Card,Rules} from './types.js';
export interface JackMarble {id:string;owner:string;index:number;pos:number}
export interface JackarooState {marbles:JackMarble[];dealer:number;deal:number;handNumber:number;ends:number;burns:Record<string,number>}
export interface JackStep {marble:string;count:number}
export interface JackMove {key:string;kind:'enter'|'move'|'swap'|'burn';steps:JackStep[];target?:string;label:string}
export const jackHome=(j:JackarooState,id:string)=>j.marbles.filter(m=>m.owner===id&&m.pos>=64).length;
export const jackPartner=(ids:string[],id:string)=>ids[(ids.indexOf(id)+2)%4];
export const jackCell=(m:JackMarble,ids:string[])=>m.pos>=0&&m.pos<64?(ids.indexOf(m.owner)*16+m.pos)%64:-1;
export function jackControlled(j:JackarooState,ids:string[],actor:string){return jackHome(j,actor)===4?jackPartner(ids,actor):actor;}
function copy(j:JackarooState):JackarooState{return{...j,marbles:j.marbles.map(m=>({...m}))};}
/** Validate and execute a segment on a private simulation; never mutate the input on failure. */
function segment(j:JackarooState,ids:string[],r:Rules,id:string,count:number,enter=false,sweep=false){
 const m=j.marbles.find(m=>m.id===id);if(!m)return false;
 if(enter){if(m.pos!==-1)return false;const at=ids.indexOf(m.owner)*16,other=j.marbles.find(o=>o.id!==id&&jackCell(o,ids)===at);if(other&&(r.jackarooProtectedStart&&other.pos===0||other.owner===m.owner))return false;if(other)other.pos=-1;m.pos=0;return true;}
 if(m.pos<0||count<0&&m.pos>=64)return false;
 for(let n=0;n<Math.abs(count);n++){
  let next=m.pos+(count<0?-1:1);if(next<0)next=63;if(next>67)return false;
  if(next>=64){if(count<0||j.marbles.some(o=>o.id!==id&&o.owner===m.owner&&o.pos===next))return false;}
  else{const cell=(ids.indexOf(m.owner)*16+next)%64,other=j.marbles.find(o=>o.id!==id&&jackCell(o,ids)===cell);if(other){if(r.jackarooProtectedStart&&other.pos===0)return false;const last=n===Math.abs(count)-1;if(sweep)other.pos=-1;else if(other.owner===m.owner)return false;else if(last)other.pos=-1;}}
  m.pos=next;
 }
 return true;
}
export function jackSimulate(j:JackarooState,ids:string[],r:Rules,move:JackMove,card:Card):JackarooState|undefined{
 const next=copy(j);
 if(move.kind==='burn')return next;
 if(move.kind==='swap'){const a=next.marbles.find(m=>m.id===move.steps[0]?.marble),b=next.marbles.find(m=>m.id===move.target);if(!a||!b||a.owner===b.owner||a.pos<0||b.pos<0||a.pos>=64||b.pos>=64||r.jackarooProtectedStart&&(a.pos===0||b.pos===0))return;const ac=jackCell(a,ids),bc=jackCell(b,ids);a.pos=(bc-ids.indexOf(a.owner)*16+64)%64;b.pos=(ac-ids.indexOf(b.owner)*16+64)%64;return next;}
 for(const step of move.steps)if(!segment(next,ids,r,step.marble,step.count,move.kind==='enter',card.rank===13&&r.jackarooKingSweep))return;
 return next;
}
export function jackMoves(j:JackarooState,ids:string[],r:Rules,actor:string,card:Card):JackMove[]{
 const owner=jackControlled(j,ids,actor),own=j.marbles.filter(m=>m.owner===owner),moves:JackMove[]=[];
 const add=(kind:JackMove['kind'],steps:JackStep[],label:string,target?:string)=>{const move={key:kind+':'+steps.map(s=>s.marble+'/'+s.count).join(',')+(target?':'+target:''),kind,steps,label,target};if(jackSimulate(j,ids,r,move,card))moves.push(move);};
 const name=(m:JackMarble)=>'Marble '+(m.index+1)+(m.owner!==actor?' · '+(m.owner===owner?'partner':'seat '+(ids.indexOf(m.owner)+1)):'');
 if(card.rank===1||card.rank===13)for(const m of own)if(m.pos===-1)add('enter',[{marble:m.id,count:0}],'Enter '+name(m));
 if(card.rank===11){for(const a of own.filter(m=>m.pos>=0&&m.pos<64))for(const b of j.marbles.filter(m=>m.owner!==owner&&m.pos>=0&&m.pos<64))add('swap',[{marble:a.id,count:0}],name(a)+' ↔ '+name(b),b.id);return moves;}
 const redQueen=card.rank===12&&(card.suit==='♥'||card.suit==='♦')&&r.jackarooRedQueenBurn;
 if(redQueen||card.rank===10&&r.jackarooTenBurn)add('burn',[],'Force next player to burn one card');
 if(redQueen)return moves;
 const counts=card.rank===1?[1,11]:[card.rank===4?-4:card.rank];
 const candidates=card.rank===5&&r.jackarooFiveAny?j.marbles.filter(m=>m.owner===owner||m.pos>0&&m.pos<64):own;
 for(const m of candidates)if(m.pos>=0)for(const count of counts)add('move',[{marble:m.id,count}],name(m)+' · '+(count<0?'back ':'forward ')+Math.abs(count));
 if(card.rank===7&&r.jackarooSplitSeven)for(const a of own.filter(m=>m.pos>=0))for(let n=1;n<=6;n++){
  const first:JackMove={key:'',kind:'move',steps:[{marble:a.id,count:n}],label:''},mid=jackSimulate(j,ids,r,first,card);if(!mid)continue;const secondOwner=jackControlled(mid,ids,actor);
  for(const b of mid.marbles.filter(m=>m.id!==a.id&&m.owner===secondOwner&&m.pos>=0))add('move',[{marble:a.id,count:n},{marble:b.id,count:7-n}],name(a)+' + '+name(b)+' · '+n+' + '+(7-n));
 }
 return moves;
}
export function jackPoint(m:JackMarble,ids:string[]){const seat=ids.indexOf(m.owner),angle=seat*Math.PI/2;if(m.pos>=0&&m.pos<64){const a=jackCell(m,ids)*Math.PI/32;return{x:Math.sin(a)*2.12,z:Math.cos(a)*2.12};}const radius=m.pos<0?2.65:1.85-(m.pos-64)*.25,side=m.pos<0?(m.index-1.5)*.23:0;return{x:Math.sin(angle)*radius+Math.cos(angle)*side,z:Math.cos(angle)*radius-Math.sin(angle)*side};}
