import {randomInt} from 'node:crypto';
import type {Action,Card,Room,Suit} from '../shared/types.js';
import {compareHands,evaluateHand,handLabel,type PokerSeat,type PokerView} from '../shared/poker.js';
import {emit} from './interactions.js';
import {recordMessage} from './messages.js';
function need(ok:unknown,text:string):asserts ok{if(!ok)throw Error(text);}
const alive=(r:Room)=>r.poker!.seats.filter(s=>!s.folded);
const stack=(r:Room,s:PokerSeat)=>r.players.find(p=>p.id===s.id)!.cash;
function after(r:Room,index:number,eligible:(i:number)=>boolean){const order=r.chaos?.order||r.players.map(p=>p.id),direction=r.rules.reverseTurns!==!!r.chaos?.reversed?-1:1,from=order.indexOf(r.players[index].id);for(let n=1;n<=order.length;n++){const id=order[(from+direction*n+order.length*2)%order.length],i=r.players.findIndex(p=>p.id===id);if(eligible(i))return i;}return -1;}
function clock(r:Room){r.poker!.ends=Math.max(Date.now(),r.busyUntil)+r.rules.pokerSeconds*1000;}
function commit(r:Room,s:PokerSeat,amount:number){const p=r.players.find(p=>p.id===s.id)!;const paid=Math.min(p.cash,amount);p.cash-=paid;s.bet+=paid;s.total+=paid;r.poker!.pot+=paid;return paid;}
function deck():Card[]{const cards=(['♠','♥','♦','♣'] as Suit[]).flatMap(suit=>Array.from({length:13},(_,i)=>({id:`p-${suit}-${i+1}`,rank:i+1,suit})));for(let i=51;i>0;i--){const j=randomInt(i+1);[cards[i],cards[j]]=[cards[j],cards[i]];}return cards;}
export function pokerView(r:Room):PokerView|undefined{if(r.rules.game!=='poker'||!r.poker)return;const {burned,...publicState}=r.poker;return publicState;}
export function initPoker(r:Room){r.players.forEach(p=>{p.cash=r.rules.pokerStack;p.bankrupt=false;});newHand(r,0);}
function newHand(r:Room,dealer:number){
  const funded=r.players.filter(p=>p.cash>0);
  if(funded.length<2){finishGame(r);return;}
  const hand=(r.poker?.hand||0)+1;r.round=hand;r.deck=deck();r.pile=[];
  r.players.forEach(p=>{p.hand=[];p.bankrupt=p.cash<=0;p.peekTarget=undefined;p.peekingUntil=0;p.catchUntil=0;p.peekRevealed=false;});
  const sb=funded.length===2?dealer:after(r,dealer,i=>r.players[i].cash>0),bb=after(r,sb,i=>r.players[i].cash>0);
  r.poker={hand,street:'preflop',dealer,smallBlind:sb,bigBlind:bb,board:[],burned:[],seats:funded.map(p=>({id:p.id,folded:false,bet:0,total:0,actedAt:-1,lastAction:''})),currentBet:r.rules.pokerBigBlind,minRaise:r.rules.pokerBigBlind,pot:0,ends:0,lastPot:0,payouts:[],pots:[],revealed:[]};
  // Deal clockwise from the button, one card at a time, including heads-up.
  for(let n=0;n<2;n++)for(let k=1;k<=r.players.length;k++){const p=r.players[(dealer+k)%r.players.length];if(p.cash>0)p.hand.push(r.deck.pop()!);}
  for(const [i,amount,label] of [[sb,r.rules.pokerSmallBlind,'Small blind'],[bb,r.rules.pokerBigBlind,'Big blind']] as const){const s=r.poker.seats.find(s=>s.id===r.players[i].id)!;commit(r,s,amount);s.lastAction=label;}
  r.busyUntil=Date.now()+3400;advance(r,bb);
  emit(r,'deal',undefined,undefined,{ends:r.busyUntil,text:`Hold’em · hand ${hand}`});
  recordMessage(r,`Poker hand ${hand}. ${r.players[dealer].name} has the button. Blinds ${r.rules.pokerSmallBlind}/${r.rules.pokerBigBlind}.`);
}
function finishGame(r:Room){const high=Math.max(...r.players.map(p=>p.cash));r.phase='finished';r.winner=r.players.filter(p=>p.cash===high).map(p=>p.name).join(' + ');if(r.poker)r.poker.ends=0;emit(r,'win',undefined,undefined,{winner:r.winner});recordMessage(r,`${r.winner} wins poker with ${high} chips.`);}
function payout(r:Room,player:string,amount:number,label:string,refund=false){if(!amount)return;r.players.find(p=>p.id===player)!.cash+=amount;r.poker!.payouts.push({player,amount,label,...(refund?{refund:true}:{})});}
function settle(r:Room){
  const g=r.poker!,live=alive(r);g.lastPot=g.pot;g.payouts=[];g.pots=[];
  if(live.length===1){payout(r,live[0].id,g.pot,'Everyone else folded');g.pots.push({amount:g.pot,winners:[live[0].id]});}
  else {
    const ranked=new Map(live.map(s=>[s.id,evaluateHand([...r.players.find(p=>p.id===s.id)!.hand,...g.board])]));
    g.revealed=live.map(s=>({player:s.id,cards:[...r.players.find(p=>p.id===s.id)!.hand],label:handLabel(ranked.get(s.id)!)}));
    let previous=0;
    for(const level of [...new Set(g.seats.map(s=>s.total).filter(Boolean))].sort((a,b)=>a-b)){
      const contributors=g.seats.filter(s=>s.total>=level),amount=(level-previous)*contributors.length;previous=level;
      if(contributors.length===1){payout(r,contributors[0].id,amount,'Uncalled chips returned',true);continue;}
      const eligible=contributors.filter(s=>!s.folded);need(eligible.length,'A pot must have an eligible player.');
      const best=eligible.reduce((a,b)=>compareHands(ranked.get(a.id)!,ranked.get(b.id)!)>=0?a:b);
      const winners=eligible.filter(s=>compareHands(ranked.get(s.id)!,ranked.get(best.id)!)===0);
      // Each pot is split separately. Odd chips go clockwise left of the button.
      winners.sort((a,b)=>((r.players.findIndex(p=>p.id===a.id)-g.dealer+r.players.length-1)%r.players.length)-((r.players.findIndex(p=>p.id===b.id)-g.dealer+r.players.length-1)%r.players.length));
      const share=Math.floor(amount/winners.length),odd=amount%winners.length;
      winners.forEach((s,i)=>payout(r,s.id,share+(i<odd?1:0),handLabel(ranked.get(s.id)!)));g.pots.push({amount,winners:winners.map(s=>s.id)});
    }
  }
  r.bluffPlays++;for(const p of r.players){p.peekTarget=undefined;p.peekingUntil=0;p.catchUntil=0;p.peekRevealed=false;}
  g.pot=0;g.ends=0;g.street='handEnd';g.seats.forEach(s=>{s.bet=0;s.total=0;});r.players.forEach(p=>p.bankrupt=p.cash<=0);
  r.busyUntil=Math.max(r.busyUntil,Date.now()+1600);
  const wins=g.payouts.filter(p=>!p.refund);for(const id of new Set(wins.map(w=>w.player))){r.players.find(p=>p.id===id)!.score++;if(r.chaos)r.chaos.points[id]=(r.chaos.points[id]||0)+1;}emit(r,'pokerWin',wins[0]?.player,undefined,{payouts:wins,pot:g.lastPot,text:wins.map(w=>`${r.players.find(p=>p.id===w.player)!.name} +${w.amount}`).join(' · ')});
  for(const w of g.payouts)recordMessage(r,`${r.players.find(p=>p.id===w.player)!.name}: +${w.amount} chips · ${w.label}.`);
  if(r.players.filter(p=>p.cash>0).length<2||(r.rules.pokerHands>0&&g.hand>=r.rules.pokerHands))finishGame(r);
}
function street(r:Room){
  const g=r.poker!;if(g.street==='river'){settle(r);return;}
  g.burned.push(r.deck.pop()!);const count=g.street==='preflop'?3:1;for(let i=0;i<count;i++)g.board.push(r.deck.pop()!);
  g.street=g.street==='preflop'?'flop':g.street==='flop'?'turn':'river';g.currentBet=0;g.minRaise=r.rules.pokerBigBlind;g.seats.forEach(s=>{s.bet=0;s.actedAt=-1;});
  emit(r,'pokerStreet',undefined,undefined,{street:g.street,count,boardCount:g.board.length,text:g.street.toUpperCase()});
  advance(r,g.dealer);
}
function advance(r:Room,previous:number){
  const g=r.poker!;if(alive(r).length===1){settle(r);return;}
  const actionable=alive(r).filter(s=>stack(r,s)>0);
  const pending=actionable.filter(s=>s.bet<g.currentBet||s.actedAt<0);
  // With nobody left to bet against, only an outstanding call needs a decision.
  if(!pending.length||(actionable.length<=1&&actionable.every(s=>s.bet>=g.currentBet))){street(r);return;}
  r.turn=after(r,previous,i=>pending.some(s=>s.id===r.players[i].id));clock(r);
}
export function pokerCanRaise(r:Room,id:string){const g=r.poker!,s=g.seats.find(s=>s.id===id);return !!s&&!s.folded&&alive(r).some(o=>o.id!==id&&stack(r,o)>0)&&(s.actedAt<0||g.currentBet-s.actedAt>=g.minRaise||(s.actedAt===0&&g.currentBet<r.rules.pokerBigBlind));}
export function handlePoker(r:Room,id:string,a:Action){
  if(!a.type.startsWith('poker'))return false;
  need(r.rules.game==='poker'&&r.poker&&r.phase==='playing','Start a poker game first.');const g=r.poker;
  need(r.busyUntil<=Date.now(),'Wait for the table animation.');
  if(a.type==='pokerNextHand'){need(id===r.host&&g.street==='handEnd','Only the host can deal after a completed hand.');need(r.players.filter(p=>p.cash>0).every(p=>p.connected),'Wait for funded players to reconnect, or end the game.');newHand(r,after(r,g.dealer,i=>r.players[i].cash>0));return true;}
  need(a.type==='pokerAct'&&g.street!=='handEnd','Wait for the next poker hand.');
  need(a.hand===undefined||a.hand===g.hand,'That action belongs to an earlier hand.');need(a.street===undefined||a.street===g.street,'That action belongs to an earlier betting round.');
  need(r.players[r.turn]?.id===id,'Wait for your poker turn.');
  const s=g.seats.find(s=>s.id===id),p=r.players[r.turn];need(s&&!s.folded&&p.cash>0,'You cannot bet in this hand.');
  const owed=Math.max(0,g.currentBet-s.bet);let amount=0;
  need(['fold','check','call','raise','allin'].includes(String(a.move)),'Choose fold, check, call, raise or all-in.');
  if(a.move==='fold'){s.folded=true;s.lastAction='Fold';}
  else if(a.move==='check'){need(owed===0,'Call the bet or fold.');s.actedAt=g.currentBet;s.lastAction='Check';}
  else if(a.move==='call'){need(owed>0,'You can check.');amount=commit(r,s,owed);s.actedAt=g.currentBet;s.lastAction=p.cash===0?'All-in call':'Call';}
  else {
    const target=a.move==='allin'?s.bet+p.cash:a.amount;
    need(typeof target==='number'&&Number.isSafeInteger(target)&&target>s.bet&&target<=s.bet+p.cash,'Choose a whole-chip total within your stack.');
    if(target<=g.currentBet){need(a.move==='allin','Use call to match the bet.');amount=commit(r,s,target-s.bet);s.lastAction='All-in call';}
    else {
      need(pokerCanRaise(r,id),'Betting has not reopened, or no opponent has chips to call.');
      const minimum=g.currentBet<r.rules.pokerBigBlind?r.rules.pokerBigBlind:g.currentBet+g.minRaise;
      need(target>=minimum||target===s.bet+p.cash,`Minimum raise is to ${minimum}; a smaller raise must be all-in.`);
      const full=target>=minimum;if(full)g.minRaise=g.currentBet<r.rules.pokerBigBlind?target:target-g.currentBet;
      amount=commit(r,s,target-s.bet);g.currentBet=target;s.lastAction=p.cash===0?'All-in':s.actedAt<0?'Bet / raise':'Raise';
    }
    s.actedAt=g.currentBet;
  }
  emit(r,'pokerAction',id,undefined,{move:a.move,amount,text:`${p.name} · ${s.lastAction}${amount?' '+amount:''}`});recordMessage(r,`${p.name}: ${s.lastAction}${amount?' '+amount+' chips':''}.`);
  r.busyUntil=Math.max(r.busyUntil,Date.now()+550);advance(r,r.turn);return true;
}
export function tickPoker(r:Room){if(r.rules.game!=='poker'||!r.poker||r.phase!=='playing'||r.poker.street==='handEnd'||r.busyUntil>Date.now()||r.poker.ends>Date.now())return false;
  const p=r.players[r.turn],s=r.poker.seats.find(s=>s.id===p.id)!;handlePoker(r,p.id,{type:'pokerAct',move:s.bet>=r.poker.currentBet?'check':'fold'});return true;
}
export function abortPoker(r:Room){if(r.rules.game!=='poker'||!r.poker||r.poker.street==='handEnd')return;for(const s of r.poker.seats){r.players.find(p=>p.id===s.id)!.cash+=s.total;s.total=0;s.bet=0;}r.poker.pot=0;r.poker.ends=0;r.poker.street='handEnd';r.players.forEach(p=>p.bankrupt=p.cash<=0);}
