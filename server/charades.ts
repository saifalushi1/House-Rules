import {randomInt} from 'node:crypto';
import type {Action,Room} from '../shared/types.js';
import {charadePrompts} from './charade-prompts.js';
import {emit} from './interactions.js';
import {recordMessage} from './messages.js';
import {charadePair} from '../shared/charades.js';
function need(ok:unknown,text:string):asserts ok{if(!ok)throw Error(text);}
function shuffle<T>(a:T[]){for(let i=a.length-1;i>0;i--){const j=randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
/** Preserve chosen partners, then fill open slots with unassigned players. */
export function prepareCharadeTeams(r:Room){
 need([2,4,6,8].includes(r.players.length),'Charades needs 2, 4, 6 or 8 players in pairs.');
 const ids=r.players.map(p=>p.id),seen=new Set<string>();
 const chosen=(r.charadeTeams||[]).map(t=>t.filter(id=>ids.includes(id)));
 need(chosen.slice(ids.length/2).every(t=>!t.length),'Some teams are incomplete. Join an open team or use automatic pairs.');
 const teams=Array.from({length:ids.length/2},(_,i)=>chosen[i]||[]);
 for(const t of teams){need(t.length<=2,'Each team needs exactly two people.');for(const id of t){need(!seen.has(id),'A player cannot belong to two teams.');seen.add(id);}}
 for(const id of ids.filter(id=>!seen.has(id))){let t=teams.find(t=>t.length<2);need(t,'No open team slot.');t.push(id);}
 need(teams.every(t=>t.length===2),'Each team needs exactly two people.');return teams;
}
function prompt(r:Room){
 if(!r.charadeBag.length)r.charadeBag=shuffle(r.rules.charadePrompts.trim()?r.rules.charadePrompts.split('\n').map(s=>s.trim()).filter(Boolean):[...charadePrompts[r.rules.charadeCategory]]);
 const c=r.charadeSession!,guesser=c.order[c.index],team=r.charadeTeams![charadePair(r,guesser)],actor=team.find(id=>id!==guesser)!;
 r.turn=r.players.findIndex(p=>p.id===actor);r.charade={prompt:r.charadeBag.pop()!,actor,guesser,ends:c.turnEnds};
}
function beginTurn(r:Room){const c=r.charadeSession!;c.turnEnds=Date.now()+r.rules.charadeSeconds*1000;r.charadeMatchEnds=c.turnEnds+(c.order.length-c.index-1)*r.rules.charadeSeconds*1000;r.round=Math.floor(c.index/r.players.length)+1;prompt(r);emit(r,'charadeTurn',r.charade!.actor,r.charade!.guesser,{team:charadePair(r,r.charade!.actor),ends:c.turnEnds,text:`${r.players.find(p=>p.id===r.charade!.guesser)!.name} guesses · ${r.rules.charadeSeconds}s`});}
export function initCharades(r:Room){r.charadeTeams=prepareCharadeTeams(r);r.charadeSession={order:Array.from({length:r.rules.charadeRounds},()=>r.charadeTeams!.flat()).flat(),index:0,turnEnds:0};r.charadeCorrect=Array(r.charadeTeams.length).fill(0);r.charadeScores=Array(r.charadeTeams.length).fill(0);beginTurn(r);}
function finish(r:Room){const high=Math.max(...r.charadeScores),winners=r.charadeScores.flatMap((s,i)=>s===high?[`Pair ${i+1}`]:[]);r.phase='finished';r.winner=winners.join(' + ')+(winners.length>1?' (tie)':'');r.charade=undefined;r.charadeMatchEnds=0;r.charadeSession!.turnEnds=0;emit(r,'win',undefined,undefined,{winner:r.winner});recordMessage(r,`${r.winner} wins Charades with ${high} points.`);}
export function tickCharades(r:Room){if(r.rules.game!=='charades'||r.phase!=='playing'||!r.charadeSession||Date.now()<r.charadeSession.turnEnds)return false;const c=r.charadeSession;emit(r,'timeout',r.charade?.guesser);recordMessage(r,`Time! ${r.players.find(p=>p.id===r.charade?.guesser)?.name}’s guessing turn is over.`);c.index++;if(c.index>=c.order.length)finish(r);else beginTurn(r);return true;}
export function handleCharades(r:Room,id:string,a:Action){
 if(a.type==='charadeTeam'||a.type==='charadeAutoTeams'){
  need(r.rules.game==='charades'&&r.phase==='lobby','Choose teammates in the Charades lobby.');
  if(a.type==='charadeAutoTeams'){need(id===r.host,'Only the host can automatically pair everyone.');const ids=shuffle(r.players.map(p=>p.id));r.charadeTeams=Array.from({length:Math.ceil(ids.length/2)},(_,i)=>ids.slice(i*2,i*2+2));}
  else {need(typeof a.team==='number'&&Number.isInteger(a.team)&&a.team>=-1&&a.team<4,'Choose a team.');const teams=Array.from({length:4},(_,i)=>(r.charadeTeams?.[i]||[]).filter(pid=>pid!==id&&r.players.some(p=>p.id===pid)));need(a.team===-1||teams[a.team].length<2,'That pair is full.');if(a.team>=0)teams[a.team].push(id);r.charadeTeams=teams;}
  r.players.forEach(p=>p.ready=false);recordMessage(r,a.type==='charadeAutoTeams'?'The host paired the players.':`${r.players.find(p=>p.id===id)!.name} updated their team.`);return true;
 }
 if(!['guess','award','skip'].includes(a.type)||r.rules.game!=='charades')return false;
 need(r.phase==='playing'&&r.charade&&r.charadeSession,'No active Charades turn.');need(Date.now()<r.charadeSession.turnEnds,'This turn ended. Wait for the next pair.');
 const c=r.charade,p=r.players.find(p=>p.id===id)!,team=charadePair(r,c.guesser);
 if(a.type==='skip'){need(id===c.actor&&r.rules.allowSkipping,'Only the actor may skip when skipping is enabled.');const guesser=r.players.find(p=>p.id===c.guesser)!;guesser.score-=r.rules.skipPenalty;r.charadeScores[team]-=r.rules.skipPenalty;recordMessage(r,`${p.name} skipped “${c.prompt}”.`);prompt(r);emit(r,'skip',id);return true;}
 if(a.type==='guess'){need(id===c.guesser,'Only the active guesser can answer.');need(typeof a.text==='string'&&a.text.trim()&&a.text.length<=180,'Enter a guess up to 180 characters.');const norm=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');if(norm(a.text)!==norm(c.prompt)){recordMessage(r,`${p.name} guesses: ${a.text}`);return true;}}
 else need(id===c.actor&&a.target===c.guesser,'Only the actor can award their active partner.');
 const guesser=r.players.find(p=>p.id===c.guesser)!;guesser.score++;guesser.correctAnswers++;r.charadeScores[team]++;r.charadeCorrect[team]++;
 recordMessage(r,`${guesser.name} guessed “${c.prompt}”! Pair ${team+1}: ${r.charadeScores[team]} points.`);emit(r,'correct',c.guesser,c.actor,{team});prompt(r);return true;
}
