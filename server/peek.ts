import type {Action,Room} from '../shared/types.js';
import {emit} from './interactions.js';
import {recordMessage} from './messages.js';
function need(ok:unknown,text:string):asserts ok{if(!ok)throw Error(text);}
export const isCardGame=(r:Room)=>['bluff','tarneeb','cards','poker'].includes(r.rules.game)&&!r.solitaire;
export function clearPeeks(r:Room){for(const p of r.players){p.peekTarget=undefined;p.peekingUntil=0;p.catchUntil=0;p.peekRevealsAt=0;p.peekRevealed=false;}}
export function handlePeek(r:Room,id:string,a:Action){if(!['peek','catch'].includes(a.type))return false;need(r.phase==='playing'&&isCardGame(r)&&r.rules.allowPeeking,'Peeking is disabled.');
 const p=r.players.find(p=>p.id===id)!,target=r.players.find(p=>p.id===a.target);need(target&&target.id!==id,'Choose another player.');
 if(a.type==='peek'){
  need(!r.busyUntil||r.busyUntil<=Date.now(),'Wait for the table animation.');
  need(r.rules.game!=='tarneeb'||r.players.indexOf(p)%2!==r.players.indexOf(target)%2,'You cannot peek at your teammate’s cards.');
  need(r.rules.game!=='poker'||r.poker?.street!=='handEnd'&&!r.poker?.seats.find(s=>s.id===target.id)?.folded,'They are not holding a live poker hand.');
  need(target.hand.length>0,'They have no cards to peek at.');need(p.peekingUntil<=Date.now(),'Finish your current peek first.');need(p.peekBlockedUntil<=r.bluffPlays,`Peek cooldown: ${p.peekBlockedUntil-r.bluffPlays} hands left.`);
  const delay=r.rules.catchPeeking?1000:0;p.peekTarget=target.id;p.peekRevealsAt=Date.now()+delay;p.catchUntil=delay?p.peekRevealsAt:0;p.peekRevealed=!delay;p.peekingUntil=p.peekRevealsAt+4000;emit(r,'peek',id,target.id,{reaction:delay,ends:p.peekingUntil});return true;
 }
 need(r.rules.catchPeeking,'Catching peekers is disabled.');need(target.peekTarget===id&&target.catchUntil>Date.now()&&target.peekingUntil>Date.now(),'Your one-second slap opportunity has closed.');
 target.peekTarget=undefined;target.peekRevealed=false;target.peekRevealsAt=0;target.peekingUntil=0;target.catchUntil=0;target.peekBlockedUntil=r.bluffPlays+8;
 emit(r,'slap',id,target.id,{reason:'peek',hands:8});recordMessage(r,`${p.name} caught ${target.name} peeking! Eight-hand cooldown. Penalty: ${r.rules.penalty}`);return true;
}
