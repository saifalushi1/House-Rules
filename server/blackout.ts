import type {Room,View} from '../shared/types.js';
// Private server ledger: a reconnect cannot recover concealed actions from history.
interface Darkness {baseline:Room;game:number;events:Map<number,string>;messages:Map<number,string>}
const ledgers=new WeakMap<Room,Darkness>();
export function resetBlackout(r:Room){const ledger=ledgers.get(r);if(ledger){ledger.game=r.gameInstance;ledger.baseline=structuredClone(r);}}
export function beginBlackout(r:Room){ledgers.set(r,{baseline:structuredClone(r),game:r.gameInstance,events:ledgers.get(r)?.events||new Map(),messages:ledgers.get(r)?.messages||new Map()});}
export function traceBlackout(r:Room){return {spot:r.chaos&&r.chaos.blackoutUntil>Date.now()?r.chaos.blackoutPlayer:undefined,event:r.eventSequence,message:r.messageSequence,actor:r.players[r.turn]?.id,hands:r.players.map(p=>({id:p.id,count:p.hand.length})),pile:r.pile.map(c=>c.id),deck:r.deck.length};}
export function recordBlackout(r:Room,b:ReturnType<typeof traceBlackout>,actor=b.actor,chat=false){
 const ledger=ledgers.get(r);if(!ledger||ledger.game!==r.gameInstance||!b.spot)return;
 if(actor===b.spot){
  for(const p of ledger.baseline.players){const live=r.players.find(x=>x.id===p.id),previous=b.hands.find(x=>x.id===p.id);if(!live||!previous)continue;const count=Math.max(0,p.hand.length+live.hand.length-previous.count);p.hand=Array.from({length:count},(_,i)=>live.hand[i]||{id:'concealed-'+i,rank:1,suit:'♠'});}
  const removed=b.pile.filter(id=>!r.pile.some(c=>c.id===id));ledger.baseline.pile=ledger.baseline.pile.filter(c=>!removed.includes(c.id));ledger.baseline.pile.push(...r.pile.filter(c=>!b.pile.includes(c.id)));
  ledger.baseline.deck=Array.from({length:Math.max(0,ledger.baseline.deck.length+r.deck.length-b.deck)},(_,i)=>({id:'concealed-stock-'+i,rank:1,suit:'♠'}));
 }
 for(const e of r.events)if(e.id>b.event){const who=e.actor||actor;if(who&&who!==b.spot&&!['chaosBlackout','win','endGame','restart','lobby','chaosFlip'].includes(e.kind))ledger.events.set(e.id,who);}
 if(actor&&actor!==b.spot)for(const m of r.messages)if(m.id>b.message&&(!chat||m.id!==b.message+1))ledger.messages.set(m.id,actor);
 const retainedEvents=new Set(r.events.map(e=>e.id)),retainedMessages=new Set(r.messages.map(m=>m.id));for(const key of ledger.events.keys())if(!retainedEvents.has(key))ledger.events.delete(key);for(const key of ledger.messages.keys())if(!retainedMessages.has(key))ledger.messages.delete(key);
}
export function blackoutView(r:Room,id:string,current:View,raw:(r:Room,id:string)=>View):View{
 const ledger=ledgers.get(r);if(!ledger||ledger.game!==r.gameInstance)return current;
 current.events=current.events.filter(e=>!ledger.events.has(e.id)||ledger.events.get(e.id)===id);
 current.messages=current.messages.filter(m=>!ledger.messages.has(m.id)||ledger.messages.get(m.id)===id);
 current.log=current.messages.slice(-35).reverse().map(m=>m.text);
 if(r.phase!=='playing'||!r.chaos||r.chaos.blackoutUntil<=Date.now())return current;
 const old=raw(ledger.baseline,id);current.blackoutHidden=true;
 // Freeze public card/board observations; retain private hands and live turn controls.
 current.players=current.players.map(p=>{const previous=old.players.find(x=>x.id===p.id);return p.id===id||!previous?p:{...previous,connected:p.connected};});
 const frozenKeys=['pile','pileCount','deckCount','trick','lastTrick','tricks','teamScores','tiles','rollDice','lastRoll','boardPot','trickCollectUntil','lastTrickTeam','charadeScores','charadeCorrect'] as const;Object.assign(current,Object.fromEntries(frozenKeys.map(key=>[key,structuredClone(old[key])])));
 if(current.poker&&old.poker){current.poker={...current.poker,board:old.poker.board,seats:current.poker.seats.map(p=>p.id===id?p:old.poker!.seats.find(x=>x.id===p.id)||p),pot:old.poker.pot,payouts:old.poker.payouts,pots:old.poker.pots,revealed:old.poker.revealed};}
 if(current.scribble&&old.scribble){current.scribble={...current.scribble,strokes:current.scribble.drawer===r.chaos.blackoutPlayer?current.scribble.strokes:old.scribble.strokes,scores:{...old.scribble.scores,[id]:current.scribble.scores[id]},guessed:current.scribble.guessed.filter(p=>p===id||old.scribble!.guessed.includes(p)),lastAward:current.scribble.lastAward?.guesser===id?current.scribble.lastAward:old.scribble.lastAward};}
 if(current.trivia&&current.trivia.winner!==id&&current.trivia.winner!==r.chaos.blackoutPlayer){current.trivia={...current.trivia,winner:undefined,reason:undefined};}
 if(current.clash&&![id,r.chaos.blackoutPlayer].includes(current.clash.trumpPlayer)&&current.clash.acePlayer!==id)current.clash=undefined;
 if(current.rpg&&old.rpg)current.rpg=old.rpg;
 if(current.solitaire&&old.solitaire)current.solitaire=old.solitaire;
 if(current.chaos&&old.chaos){current.chaos.points={...old.chaos.points};current.chaos.lastDare=old.chaos.lastDare;}
 if(current.lastPlay&&current.lastPlay.player!==id&&current.lastPlay.player!==r.chaos.blackoutPlayer)current.lastPlay={player:'',count:0,claim:0,expires:current.lastPlay.expires,hidden:true};
 return current;
}
