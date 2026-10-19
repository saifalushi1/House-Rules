import {randomInt} from 'node:crypto';
import type {Room,Action} from '../shared/types.js';
import {TOMATO_COOLDOWN,GHOST_COOLDOWN,GHOST_DURATION,MAX_SPECTATORS,type GhostDance} from '../shared/spectators.js';
import {emit} from './interactions.js';import {recordMessage} from './messages.js';
const need=(ok:unknown,text:string)=>{if(!ok)throw Error(text);};
// Retain deadlines when someone leaves/rejoins or changes lobby roles. Never rewind them.
const deadlines=new WeakMap<Room,Map<string,{tomatoAt:number;ghostAt:number}>>();
function ledger(r:Room){let l=deadlines.get(r);if(!l){l=new Map();deadlines.set(r,l);}return l;}
export function addSpectator(r:Room,id:string,name:string){
 r.spectators??=[];need(!r.players.some(p=>p.id===id)&&!r.spectators.some(p=>p.id===id),'You already belong to this table.');need(r.spectators.length<MAX_SPECTATORS,'The audience is full.');
 const clocks=ledger(r).get(id)||{tomatoAt:0,ghostAt:0};const s={id,name:name.trim().slice(0,24)||'Guest',connected:true,...clocks};r.spectators.push(s);return s;
}
export function removeSpectator(r:Room,id:string){r.spectators=(r.spectators||[]).filter(s=>s.id!==id);if(r.spectatorGhost?.actor===id)r.spectatorGhost=undefined;}
export function pickGhostDance(roll:number):GhostDance{return roll===0?'twerk':roll<3?'shuffle':'disco';}
export function handleSpectator(r:Room,id:string,a:Action){
 const s=r.spectators?.find(s=>s.id===id);need(s?.connected,'Join as a spectator first.');if(!s)return;
 if(a.type==='chat'){need(!(r.phase==='playing'&&r.werewolf),'Spectators keep quiet during Werewolf.');need(typeof a.text==='string'&&a.text.trim(),'Write a message first.');recordMessage(r,'[Spectator] '+s.name+': '+String(a.text).trim().slice(0,240));return;}
 need(['spectatorTomato','spectatorGhost'].includes(a.type),'Spectators can watch, chat or use audience reactions.');need(r.phase==='playing','Audience reactions are available during a game.');
 const now=Date.now(),clocks=ledger(r).get(id)||{tomatoAt:s.tomatoAt,ghostAt:s.ghostAt};
 if(a.type==='spectatorTomato'){
  need(now>=clocks.tomatoAt,'Tomatoes are on cooldown.');need(typeof a.target==='string'&&r.players.some(p=>p.id===a.target),'Choose a player at the table.');
  s.tomatoAt=clocks.tomatoAt=now+TOMATO_COOLDOWN;emit(r,'spectatorTomato',id,String(a.target),{name:s.name,seat:(r.spectators||[]).indexOf(s),text:s.name+' throws a tomato!'});
 }else{
  need(now>=clocks.ghostAt,'Your ghost dance is on cooldown.');need(!r.spectatorGhost||r.spectatorGhost.ends<=now,'There is already a ghost on the dance floor.');
  const dance=pickGhostDance(randomInt(5));s.ghostAt=clocks.ghostAt=now+GHOST_COOLDOWN;r.spectatorGhost={actor:id,name:s.name,dance,starts:now,ends:now+GHOST_DURATION};
  emit(r,'spectatorGhost',id,undefined,{dance,text:s.name+(dance==='twerk'?' unlocked the surprise twerk!':' is haunting the dance floor!')});
 }
 ledger(r).set(id,{...clocks});
}
