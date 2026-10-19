import type {Room,View} from './types.js';
type Table=Room|View;
export function resultUnits(r:Table):{players:string[];value:number}[]{
 if(r.rules.game==='beerpong'&&r.pong)return r.pong.teams.map((players,i)=>({players,value:r.pong!.winningTeam!==undefined?(r.pong!.winningTeam===i?1:0):r.pong!.cups[i].filter(Boolean).length}));
 if(r.rules.game==='werewolf'&&r.werewolf)return r.players.map(p=>({players:[p.id],value:p.score}));
 if(r.rules.game==='darts'&&r.darts)return r.players.map(p=>({players:[p.id],value:-r.darts!.remaining[p.id]}));
 if(r.rules.game==='jackaroo'&&r.jackaroo)return [0,1].map(team=>({players:r.players.filter((_,i)=>i%2===team).map(p=>p.id),value:r.jackaroo!.marbles.filter(m=>r.players.findIndex(p=>p.id===m.owner)%2===team&&m.pos>=64).length}));
 if(r.rules.game==='tarneeb')return r.teamScores.map((value,i)=>({value,players:r.players.filter((_,j)=>j%2===i).map(p=>p.id)}));
 if(r.rules.game==='charades')return r.charadeScores.map((value,i)=>({value,players:r.charadeTeams?.[i]||r.players.slice(i*2,i*2+2).map(p=>p.id)}));
 return r.players.filter(p=>r.rules.game!=='trivia'||p.id!==r.trivia?.master&&p.id!==r.triviaMaster).map(p=>({players:[p.id],value:['poker','blackjack'].includes(r.rules.game)?p.cash:['property','life'].includes(r.rules.game)?(p.bankrupt?-1:p.cash+r.tiles.filter(t=>t.owner===p.id).reduce((s,t)=>s+t.price,0)):['bluff','tarneeb','cards'].includes(r.rules.game)?-('handCount' in p?p.handCount:p.hand.length):r.rules.game==='rpg'?(r.rpg?.characters.find(c=>c.owner===p.id)?.xp||0):p.score}));
}
export function resultLosers(r:Table){if(r.phase!=='finished'||r.endedEarly||!r.winner)return [];const units=resultUnits(r),high=Math.max(...units.map(u=>u.value));return units.filter(u=>u.value<high).flatMap(u=>u.players);}
export function canRetaliate(r:Table,id:string){if(!r.rules.soreLoser||!resultLosers(r).includes(id)||r.retaliated?.includes(id))return false;const units=resultUnits(r),mine=units.find(u=>u.players.includes(id));if(!mine)return false;const high=Math.max(...units.map(u=>u.value)),low=Math.min(...units.map(u=>u.value));const minimum=['poker','blackjack','property','life'].includes(r.rules.game)?['poker','blackjack'].includes(r.rules.game)?r.rules.pokerStack/2:r.rules.startingCash/2:['bluff','cards'].includes(r.rules.game)?10:3;return mine.value===low&&high-mine.value>=Math.max(minimum,Math.abs(high)*.5);}
