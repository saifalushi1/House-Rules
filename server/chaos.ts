import {charadePair,charadeTeamMembers} from '../shared/charades.js';
import {beginBlackout,resetBlackout} from './blackout.js';
import {randomUUID,randomInt} from 'node:crypto';
import type {Action,Room,Card} from '../shared/types.js';
import {chaosRules,dieModifiers} from '../shared/chaos.js';
import {emit} from './interactions.js';
import {recordMessage} from './messages.js';

interface PrivateChaos {word:string; snapshot?:Room; savedAt:number; label:string;undoWord?:string}
const privateState=new WeakMap<Room,PrivateChaos>();
const forcedActions=new WeakMap<Room,string>();
const snapshotWords=new WeakMap<Room,string>();
const enabled=(r:Room)=>Object.keys(chaosRules).some(k=>r.rules[k as keyof typeof chaosRules]);
const cardGame=(r:Room)=>!r.solitaire&&['cards','bluff','tarneeb'].includes(r.rules.game);
const safe=(r:Room)=>(r.rules.game!=='poker'||r.poker?.street==='handEnd')&&(r.rules.game!=='blackjack'||r.blackjack?.phase==='result')&&!r.raid&&!r.lastPlay&&!r.clash&&!r.duel&&!r.pendingLife&&r.busyUntil<=Date.now()&&r.trick.length===0;
const need=(ok:unknown,text:string)=>{if(!ok)throw Error(text);};
function shuffle<T>(a:T[]){for(let i=a.length-1;i>0;i--){const j=randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
function effect(r:Room,kind:string,actor?:string,target?:string,data:Record<string,unknown>={}){emit(r,'chaos'+kind,actor,target,data);}
export function chaosUnits(r:Room):{id:string;value:number;players:string[]}[]{
  if(r.rules.game==='tarneeb')return r.teamScores.map((value,i)=>({id:'team'+i,value,players:r.players.filter((_,j)=>j%2===i).map(p=>p.id)}));
  if(r.rules.game==='charades')return r.charadeScores.map((value,i)=>({id:'pair'+i,value,players:charadeTeamMembers(r,i)}));
  return r.players.filter(p=>!p.bankrupt&&(r.rules.game!=='trivia'||p.id!==r.triviaMaster)).map(p=>({id:p.id,value:r.rules.game==='rpg'?(r.rpg?.characters.find(c=>c.owner===p.id)?.xp||0):['property','life'].includes(r.rules.game)?p.cash:(cardGame(r)||['poker','werewolf','blackjack','darts','beerpong'].includes(r.rules.game))?r.chaos?.points[p.id]||0:p.score,players:[p.id]}));
}
export function setChaosUnit(r:Room,id:string,value:number){setUnit(r,id,value);}
function setUnit(r:Room,id:string,value:number){
  if(id.startsWith('team')&&r.rules.game==='tarneeb')r.teamScores[Number(id.slice(4))]=value;
  else if(id.startsWith('pair')&&r.rules.game==='charades'){const i=Number(id.slice(4)),delta=value-r.charadeScores[i];r.charadeScores[i]=value;const members=charadeTeamMembers(r,i),p=r.players.find(p=>p.id===(members.includes(r.charade?.guesser||'')?r.charade!.guesser:members[0]));if(p)p.score+=delta;}
  else {const p=r.players.find(p=>p.id===id);if(!p)return;if(r.rules.game==='rpg'){const c=r.rpg?.characters.find(c=>c.owner===id);if(c){c.xp=Math.max(0,value);c.level=1+Math.floor(c.xp/100);}}else if(['property','life'].includes(r.rules.game))p.cash=value;else if(cardGame(r)||['poker','werewolf','blackjack','darts','beerpong'].includes(r.rules.game))r.chaos!.points[id]=value;else p.score=value;}
}
function unitFor(r:Room,id:string){return chaosUnits(r).find(u=>u.players.includes(id));}
function change(r:Room,id:string,delta:number){const u=unitFor(r,id);if(u)setUnit(r,u.id,u.value+delta);}
function dare(r:Room,id:string,force=false){if((!force&&!r.rules.chaosDare)||r.chaos?.modifier?.face===12)return;const list=r.rules.chaosDares.split('\n').map(s=>s.trim()).filter(Boolean);const index=randomInt(list.length);r.chaos!.lastDare={player:id,text:list[index]};effect(r,'Dare',id,undefined,{text:list[index],index,count:list.length});recordMessage(r,`${r.players.find(p=>p.id===id)?.name} spins a dare: ${list[index]}`);}
export function chaosPenalty(r:Room,id:string,reason:string,draw=false){
  if(!r.chaos)return;if(r.chaos.modifier?.face===12){effect(r,'Shield',id,undefined,{text:'Shield round · penalty blocked'});return;}const p=r.players.find(p=>p.id===id);if(!p)return;
  const beforeCount=p.hand.length;if(draw&&r.rules.game==='cards'&&r.deck.length)p.hand.push(r.deck.pop()!);
  else if(draw&&r.rules.game==='bluff'&&r.pile.length&&!r.lastPlay)p.hand.push(r.pile.pop()!);
  else change(r,id,-1);
  effect(r,'Penalty',id,undefined,{reason});recordMessage(r,`${p.name}: ${reason} · ${p.hand.length>beforeCount?'one card added':'−1 point/coin'}.`);dare(r,id);
}
function rotate(r:Room,right=r.rules.chaosDirection==='right'){
  const c=r.chaos!;const ids=c.seats,step=right?1:-1;
  if(cardGame(r)){const hands=ids.map(id=>r.players.find(p=>p.id===id)!.hand);ids.forEach((id,i)=>r.players.find(p=>p.id===id)!.hand=hands[(i-step+ids.length)%ids.length]);}
  else {const points=ids.map(id=>c.points[id]||0);ids.forEach((id,i)=>c.points[id]=points[(i-step+ids.length)%ids.length]);}
  r.busyUntil=Math.max(r.busyUntil,Date.now()+2200);effect(r,'Cyclone',undefined,undefined,{right,cards:cardGame(r)});recordMessage(r,cardGame(r)?'Cyclone! Hands pass '+(right?'right.':'left.'):'Cyclone! Bonus chaos tallies pass around the table.');
}
function seats(r:Room){const c=r.chaos!,old=[...c.seats],updated=shuffle([...old]);if(updated.length>1&&updated.every((id,i)=>id===old[i]))updated.push(updated.shift()!);
  if(!r.rules.chaosHandsTravel&&cardGame(r)){const hands=old.map(id=>r.players.find(p=>p.id===id)!.hand);updated.forEach((id,i)=>r.players.find(p=>p.id===id)!.hand=hands[i]);}
  c.seats=updated;c.order=[...updated];if(r.scribble){const s=r.scribble,i=s.index%s.order.length;s.order=[...s.order.slice(0,i+1),...s.order.slice(i+1).sort((a,b)=>updated.indexOf(a)-updated.indexOf(b))];}
  if(r.charadeSession){const s=r.charadeSession,n=r.players.length,currentPair=charadePair(r,s.order[s.index]);let from=s.index+1;while(from<s.order.length&&Math.floor(from/n)===Math.floor(s.index/n)&&charadePair(r,s.order[from])===currentPair)from++;
   while(from<s.order.length){const end=Math.min(s.order.length,(Math.floor(from/n)+1)*n),groups=new Map<number,string[]>();for(const id of s.order.slice(from,end)){const pair=charadePair(r,id);groups.set(pair,[...(groups.get(pair)||[]),id]);}const remaining=[...groups.values()].sort((a,b)=>Math.min(...a.map(id=>updated.indexOf(id)))-Math.min(...b.map(id=>updated.indexOf(id)))).flat();s.order.splice(from,end-from,...remaining);from=end;}}
 r.busyUntil=Math.max(r.busyUntil,Date.now()+1800);effect(r,'Seats',undefined,undefined,{from:old,to:updated});recordMessage(r,'Seat Roulette! Seats and turn order shuffled. Team identities stay with their owners.');
}
function blackout(r:Room){if(r.chaos!.blackoutUntil>Date.now())return;r.chaos!.blackoutUntil=Date.now()+10000;r.chaos!.blackoutPlayer=r.players[r.turn]?.id;beginBlackout(r);effect(r,'Blackout',r.chaos!.blackoutPlayer);}
function roundKey(r:Room){if(r.werewolf)return r.werewolf.day+':'+r.werewolf.phase;if(r.blackjack)return r.blackjack.round+':'+r.blackjack.phase;if(r.rules.game==='scribble')return 'sketch'+(r.scribble?.index??-1);if(r.rules.game==='rpg')return 'rpg'+r.round;if(r.rules.game==='trivia')return 'quiz'+(r.trivia?.index??-1);if(r.rules.game==='charades')return 'prompt'+(r.charade?.actor||'')+':'+(r.charade?.ends||0)+':'+r.charadeBag.length;if(r.rules.game==='tarneeb')return `${r.round}:${r.tricks.join('-')}`;return String(r.round);}
function chooseWord(r:Room){const words=r.rules.chaosWords.split('\n').map(w=>w.trim().toLowerCase()).filter(Boolean);privateState.get(r)!.word=words[randomInt(words.length)];effect(r,'Word',undefined,undefined,{text:'SECRET WORD SEALED'});}
function roundStart(r:Room){const c=r.chaos!;if(r.rules.chaosBanned)chooseWord(r);if(!r.rules.chaosDie)return;const face=randomInt(1,13);c.modifier={face,name:dieModifiers[face-1]};effect(r,'Die',undefined,undefined,{face,text:c.modifier.name});recordMessage(r,`Chaos Die: ${face} · ${c.modifier.name}.`);
  if(face===3)c.reversed=!c.reversed;if(face===6)blackout(r);if(face===7||face===8)c.pendingCyclone=true;if(face===9)c.pendingSeats=true;if(face===10)r.players.forEach(p=>dare(r,p.id,true));if(face===11)for(const u of chaosUnits(r)){setUnit(r,u.id,u.value+1);if(!['cards','bluff','poker','werewolf','blackjack','darts','beerpong'].includes(r.rules.game))u.players.forEach(id=>{c.points[id]=(c.points[id]||0)+1;});}
}
function turnStart(r:Room){const c=r.chaos!;c.turns++;const active=r.rules.game==='trivia'?r.trivia?.activePlayer||r.trivia?.master||r.players[r.turn]?.id:r.players[r.turn]?.id;
  if((r.rules.chaosHotPotato||c.modifier?.face===4)&&active){const duration=Math.max(r.rules.chaosMinSeconds,r.rules.chaosHotSeconds-(c.turns-1)*r.rules.chaosShrinkSeconds)*(c.modifier?.face===4?.5:1);c.hot={player:active,ends:Date.now()+duration*1000,duration:duration*1000};effect(r,'Hot',active,undefined,{duration});}
  if(r.rules.chaosSeatRoulette&&c.turns>1&&(c.turns-1)%r.rules.chaosSeatEvery===0)c.pendingSeats=true;
  if(r.rules.chaosBlackout&&randomInt(100)<r.rules.chaosRandomPercent)blackout(r);
  if(r.rules.chaosCyclone&&r.rules.chaosCycloneTrigger==='random'&&randomInt(100)<r.rules.chaosRandomPercent)c.pendingCyclone=true;
}
export function initChaos(r:Room){resetBlackout(r);privateState.delete(r);forcedActions.delete(r);r.chaos=undefined;if(!enabled(r))return;r.chaos={seats:r.players.map(p=>p.id),order:r.players.map(p=>p.id),turns:0,roundKey:roundKey(r),points:Object.fromEntries(r.players.map(p=>[p.id,0])),blackoutUntil:0,flipUsed:false,reversed:false,canUndo:false,undoUntil:0,pendingCyclone:false,pendingSeats:false};privateState.set(r,{word:'',savedAt:0,label:''});roundStart(r);turnStart(r);}
export function chaosWord(r:Room,id:string){return r.rules.chaosBanned&&id===r.host?privateState.get(r)?.word:undefined;}
export function chaosBefore(r:Room){return {phase:r.phase,turn:r.turn,round:roundKey(r),charade:r.charade?.ends,trivia:r.trivia?.phase,event:r.eventSequence,units:chaosUnits(r)};}
export function chaosAfter(r:Room,before:ReturnType<typeof chaosBefore>,actionType=""){const c=r.chaos;if(!c||before.phase!=='playing')return;
  const face=c.modifier?.face;
  for(const u of chaosUnits(r)){const old=before.units.find(x=>x.id===u.id)?.value??u.value,gain=u.value-old;if(gain<=0)continue;
    let amount=gain;if(r.rules.chaosDouble&&face!==12&&!(['cards','bluff','poker'].includes(r.rules.game))&&randomInt(100)<r.rules.chaosDoublePercent){const won=randomInt(2)===1;amount=won?gain*2:0;effect(r,'Coin',u.players[0],undefined,{won,gain,result:amount});}
    if(face===1)amount*=2;if(face===2)amount=0;setUnit(r,u.id,old+amount);
  }
  if((r.rules.chaosRobin&&face!==12)||face===5){const ranked=chaosUnits(r).sort((a,b)=>b.value-a.value),top=ranked[0],bottom=ranked.at(-1);if(top&&bottom&&top.id!==bottom.id&&top.value>bottom.value&&top.value>(before.units.find(u=>u.id===top.id)?.value??top.value)){setUnit(r,top.id,top.value-1);setUnit(r,bottom.id,bottom.value+1);effect(r,'Robin',top.players[0],bottom.players[0]);}}
  const events=r.events.filter(e=>e.id>before.event);if(r.rules.chaosDare&&face!==12){const offenders=new Set<string>();if(['roll','lifeChoice'].includes(actionType)||r.rules.game==='tarneeb')for(const u of chaosUnits(r))if(u.value<(before.units.find(old=>old.id===u.id)?.value??u.value))offenders.add(u.players[0]);for(const e of events){if(e.kind==='challenge')offenders.add(String(e.data.loser));if(e.kind==='slap'&&e.data.reason==='peek'&&e.target)offenders.add(e.target);if(['timeout','skip','tradeReject'].includes(e.kind)&&e.actor)offenders.add(e.actor);}for(const id of offenders)if(r.players.some(p=>p.id===id))dare(r,id);}
  const key=roundKey(r),changed=key!==before.round,ended=events.some(e=>e.kind==='trick')||(before.trivia==='question'&&r.trivia?.phase==='result');
  if(r.phase==='playing'&&(changed||ended)){if(r.rules.chaosCyclone&&r.rules.chaosCycloneTrigger==='round')c.pendingCyclone=true;if(changed){c.roundKey=key;roundStart(r);}}
  if(r.phase==='playing'&&(r.turn!==before.turn||r.charade?.ends!==before.charade||changed||events.some(e=>['triviaQuestion','trick','scribbleTurn','rpgTurn','pokerStreet'].includes(e.kind))))turnStart(r);
  if(r.phase==='playing')flush(r);else {c.hot=undefined;c.blackoutUntil=0;c.vote=undefined;}
  if(r.phase==='finished'&&!r.endedEarly&&r.rules.game==='tarneeb'&&!r.teamScores.some(score=>score>=r.rules.targetScore)){r.phase='playing';r.winner=undefined;r.events=r.events.filter(e=>!(e.id>before.event&&e.kind==='win'));recordMessage(r,'Chaos changed the contract score. No team has reached the target yet.');}
  if(r.phase==='finished'&&!r.endedEarly&&['trivia','charades','scribble','property','life','tarneeb'].includes(r.rules.game)){const units=chaosUnits(r);if(units.length){const value=(u:typeof units[number])=>['property','life'].includes(r.rules.game)?u.value+r.tiles.filter(t=>t.owner===u.id).reduce((n,t)=>n+t.price,0):u.value;const high=Math.max(...units.map(value)),winners=units.filter(u=>value(u)===high);r.winner=winners.map(u=>u.id.startsWith('team')?'Team '+(Number(u.id.slice(4))+1):u.id.startsWith('pair')?'Pair '+(Number(u.id.slice(4))+1):r.players.find(p=>p.id===u.id)?.name).join(' + ')+(winners.length>1?' (tie)':'');for(const event of r.events.filter(e=>e.id>before.event&&e.kind==='win'))event.data.winner=r.winner;recordMessage(r,'Final chaos-adjusted winner: '+r.winner);}}
}
function flush(r:Room){const c=r.chaos!;if(!safe(r))return;if(c.pendingSeats){c.pendingSeats=false;seats(r);}if(c.pendingCyclone){c.pendingCyclone=false;rotate(r,c.modifier?.face===7?false:c.modifier?.face===8?true:undefined);}}
export function tickChaos(r:Room){const c=r.chaos;if(!c||r.phase==='lobby')return false;let changed=false;if(c.vote)for(const g of [r.werewolf,r.blackjack,r.darts,r.pong])if(g)g.ends=Math.max(g.ends,Date.now()+15000);if(c.vote&&r.poker?.ends)r.poker.ends=Math.max(r.poker.ends,Date.now()+r.rules.pokerSeconds*1000);
  if(c.vote&&(c.vote.ends<=Date.now()||c.vote.voters.some(id=>!r.players.find(p=>p.id===id)?.connected))){c.vote=undefined;effect(r,'VoteEnd',undefined,undefined,{text:'Time Warp vote expired or a voter left.'});changed=true;}
  if(c.canUndo&&Date.now()>c.undoUntil){c.canUndo=false;changed=true;}
  if(c.blackoutUntil&&c.blackoutUntil<=Date.now()){c.blackoutUntil=0;changed=true;}
  if(c.hot){const blocked=!!r.raid||!!c.vote||r.busyUntil>Date.now()||!!r.lastPlay||!!r.duel||!!r.clash||(r.rules.game==='trivia'&&r.trivia?.phase!=='question')||(r.rules.game==='tarneeb'&&r.tarneebPhase==='handEnd')||(r.rules.game==='poker'&&r.poker?.street==='handEnd')||(r.rules.game==='blackjack'&&['dealer','result'].includes(r.blackjack?.phase||''));if(blocked){c.hot.ends=Date.now()+c.hot.duration;changed=true;}
    else if(c.hot.ends<=Date.now()){const id=c.hot.player;c.hot=undefined;const forced=true;if(c.modifier?.face===12)chaosPenalty(r,id,'Hot Potato blocked');else if(forced){forcedActions.set(r,id);dare(r,id);recordMessage(r,'Hot Potato forces a legal action for '+r.players.find(p=>p.id===id)?.name);}else chaosPenalty(r,id,'Hot Potato exploded',randomInt(2)===1);effect(r,'Boom',id);invalidate(r);changed=true;}}
  const pending=c.pendingSeats||c.pendingCyclone;if(r.phase==='playing')flush(r);return changed||pending!==!!(c.pendingSeats||c.pendingCyclone);
}
const ignored=new Set(['chat','ready','rules','start','restart','endGame','lobby','kick','peek','catch','triviaVolunteer']);
export function saveChaosAction(r:Room,a:Action){if(a.type==='wolfNight'||a.type==='scribbleStroke'||!r.rules.chaosWarp||r.phase!=='playing'||a.type.startsWith('chaos')||ignored.has(a.type))return;const snapshot=structuredClone(r);snapshotWords.set(snapshot,privateState.get(r)?.word||'');return snapshot;}
export function commitChaosAction(r:Room,a:Action,snapshot:Room|undefined){if(!snapshot||!r.chaos)return;const state=privateState.get(r)!;state.snapshot=snapshot;state.savedAt=Date.now();state.label=a.type;state.undoWord=snapshotWords.get(snapshot);r.chaos.canUndo=true;r.chaos.undoLabel=a.type;r.chaos.undoUntil=Date.now()+30000;r.chaos.vote=undefined;}
export function invalidateChaos(r:Room){invalidate(r);}
function invalidate(r:Room){const s=privateState.get(r);if(s)s.snapshot=undefined;if(r.chaos){r.chaos.canUndo=false;r.chaos.vote=undefined;}}
function undo(r:Room){const state=privateState.get(r)!;need(state.snapshot,'Nothing left to rewind.');const snapshot=state.snapshot!,delta=Date.now()-state.savedAt,players=new Map(r.players.map(p=>[p.id,{name:p.name,connected:p.connected,ready:p.ready}])),events=r.events,eventSequence=r.eventSequence,messages=r.messages,messageSequence=r.messageSequence,log=r.log,host=r.host;const word=state.undoWord??state.word;
  const shifted=(n:number)=>n?n+delta:0;snapshot.busyUntil=shifted(snapshot.busyUntil);snapshot.trickCollectUntil=shifted(snapshot.trickCollectUntil);snapshot.charadeMatchEnds=shifted(snapshot.charadeMatchEnds);if(snapshot.charadeSession)snapshot.charadeSession.turnEnds=shifted(snapshot.charadeSession.turnEnds);if(snapshot.charade)snapshot.charade.ends=shifted(snapshot.charade.ends);if(snapshot.lastPlay)snapshot.lastPlay.expires=shifted(snapshot.lastPlay.expires);if(snapshot.trivia){snapshot.trivia.ends=shifted(snapshot.trivia.ends);if(snapshot.trivia.nextAt)snapshot.trivia.nextAt=shifted(snapshot.trivia.nextAt);}for(const g of [snapshot.werewolf,snapshot.blackjack,snapshot.darts,snapshot.pong])if(g)g.ends=shifted(g.ends);for(const g of [snapshot.darts,snapshot.pong])if(g)g.aimAt=shifted(g.aimAt);if(snapshot.poker)snapshot.poker.ends=shifted(snapshot.poker.ends);if(snapshot.scribble)snapshot.scribble.ends=shifted(snapshot.scribble.ends);if(snapshot.clash)snapshot.clash.expires=shifted(snapshot.clash.expires);if(snapshot.duel)snapshot.duel.ends=shifted(snapshot.duel.ends);snapshot.tradeOffers.forEach(t=>t.expires=shifted(t.expires));snapshot.players.forEach(p=>{Object.assign(p,players.get(p.id));p.peekingUntil=shifted(p.peekingUntil);p.catchUntil=shifted(p.catchUntil);p.peekRevealsAt=shifted(p.peekRevealsAt);});
  Object.assign(r,snapshot,{events,eventSequence,messages,messageSequence,log,host});const c=r.chaos!;c.vote=undefined;c.canUndo=false;c.blackoutUntil=shifted(c.blackoutUntil);if(c.hot)c.hot.ends=shifted(c.hot.ends);privateState.set(r,{word,savedAt:0,label:''});effect(r,'Warp',undefined,undefined,{text:'Last action undone'});recordMessage(r,'Time Warp passed. Last gameplay action undone; revealed information cannot be forgotten.');
}
export function handleChaos(r:Room,id:string,a:Action){
  if(!a.type.startsWith('chaos'))return false;need(r.phase==='playing'||(['chaosRequestWarp','chaosVote'].includes(a.type)&&r.phase==='finished'),'Start an active game first.');need(r.chaos,'Enable chaos rules in the lobby.');const c=r.chaos!;
  if(a.type==='chaosRequestWarp'){need(!r.players.some(p=>p.peekTarget&&p.catchUntil>Date.now()),'Finish the peek reaction before starting a Time Warp vote.');need(r.rules.chaosWarp&&c.canUndo&&Date.now()<=c.undoUntil,'No recent action to undo.');need(!c.vote,'A vote is already running.');const saved=privateState.get(r)?.snapshot;need(saved&&saved.players.length===r.players.length&&saved.players.every(p=>r.players.some(q=>q.id===p.id)),'The players changed; this action cannot be rewound.');const voters=r.players.filter(p=>p.connected).map(p=>p.id);c.vote={requester:id,yes:[id],no:[],voters,ends:Date.now()+12000};effect(r,'Vote',id);if(voters.length===1)undo(r);return true;}
  if(a.type==='chaosVote'){need(c.vote&&c.vote.ends>Date.now(),'No open vote.');const vote=c.vote!;need(vote.voters.includes(id),'You cannot vote.');need(typeof a.yes==='boolean','Choose yes or no.');need(!vote.yes.includes(id)&&!vote.no.includes(id),'You already voted.');(a.yes?vote.yes:vote.no).push(id);if(vote.yes.length>vote.voters.length/2)undo(r);else if(vote.no.length>=Math.ceil(vote.voters.length/2)){c.vote=undefined;effect(r,'VoteEnd',undefined,undefined,{text:'Time Warp refused'});}return true;}
  need(!c.vote,'Finish the Time Warp vote first.');
  if(a.type==='chaosFlip'){need(r.rules.chaosTableFlip&&!c.flipUsed,'The table flip is unavailable.');need(safe(r),'Wait until the table is clear.');const unit=unitFor(r,id),units=chaosUnits(r);need(unit&&unit.value===Math.min(...units.map(u=>u.value)),'Only a lowest scorer can flip.');const face=randomInt(1,7);c.flipUsed=true;c.hot=undefined;c.vote=undefined;c.blackoutUntil=0;c.pendingCyclone=false;c.pendingSeats=false;r.phase='finished';for(const p of r.players){p.peekingUntil=0;p.catchUntil=0;p.peekTarget=undefined;p.peekRevealed=false;}r.endedEarly=true;r.endReason='tableFlip';r.winner=undefined;r.lastPlay=undefined;r.clash=undefined;r.duel=undefined;r.tradeOffers=[];r.raid=undefined;r.charade=undefined;if(r.charadeSession)r.charadeSession.turnEnds=0;r.charadeMatchEnds=0;r.pendingLife=undefined;r.busyUntil=Date.now()+3000;effect(r,'Flip',id,undefined,{face,ends:r.busyUntil,text:'d6 · '+face+' · TABLE FLIPPED. NOBODY WINS.'});recordMessage(r,'TABLE FLIP! d6 rolled '+face+'. Game over. Nobody wins.');invalidate(r);return true;}
  if(a.type==='chaosReportWord'){need(r.rules.chaosBanned&&r.host===id,'Only the host can report a spoken banned word.');need(typeof a.target==='string'&&r.players.some(p=>p.id===a.target),'Choose a player.');chaosPenalty(r,String(a.target),'Spoken banned word reported by host');effect(r,'Offender',String(a.target),undefined,{word:privateState.get(r)!.word});invalidate(r);return true;}
  throw Error('Unknown chaos action.');
}
export function checkBanned(r:Room,id:string,text:string,acceptedDuringPlay=false){const word=privateState.get(r)?.word;if((r.phase!=='playing'&&!acceptedDuringPlay)||!r.rules.chaosBanned||!word)return;const words:string[]=text.normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]+/gu)||[];if(words.includes(word)){chaosPenalty(r,id,'Banned word: '+word);effect(r,'Offender',id,undefined,{word});invalidate(r);}}
export function chaosGuard(r:Room,a:Action){if(r.chaos?.vote&&!['chat','endGame','lobby','restart'].includes(a.type))throw Error('Finish the Time Warp vote before playing.');}

export function chaosPenaltiesForAction(r:Room,id:string,a:Action,loser:string){if(!r.chaos||!r.rules.chaosDare)return;if(a.type==='challenge')dare(r,loser);if(a.type==='skip')dare(r,id);}

export function takeChaosForcedAction(r:Room){const id=forcedActions.get(r);forcedActions.delete(r);return id;}

/** Variable-hand games wager the actual incoming cards, before victory is checked. */
export function chaosCardGain(r:Room,id:string,cards:Card[]):Card[]{
 if(!r.chaos||!r.rules.chaosDouble||r.solitaire||!['cards','bluff'].includes(r.rules.game)||r.chaos.modifier?.face===12||!cards.length||randomInt(100)>=r.rules.chaosDoublePercent)return cards;
 // Bound generated cards to keep repeated doubling within a playable room size.
 if(r.players.reduce((n,p)=>n+p.hand.length,0)+r.deck.length+r.pile.length+cards.length>1040)return cards;
 const won=randomInt(2)===1,result=won?[...cards,...cards.map(c=>({...c,id:'chaos-'+randomUUID()}))]:[];
 if(!won)r.deck.unshift(...cards);
 effect(r,'Coin',id,undefined,{won,gain:cards.length,result:result.length,cards:true});
 recordMessage(r,`${r.players.find(p=>p.id===id)?.name}: Double or Nothing · ${cards.length} card${cards.length===1?'':'s'} → ${result.length}.`);return result;
}
