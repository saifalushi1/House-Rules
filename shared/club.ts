import type {Card} from './types.js';
export type Role='werewolf'|'seer'|'doctor'|'villager';
export interface WerewolfState {
 phase:'night'|'day'|'vote';day:number;ends:number;roles:Record<string,Role>;alive:string[];
 night:Record<string,string>;votes:Record<string,string>;skipped:string[];lastProtected?:string;
 knowledge:Record<string,{day:number;player:string;wolf:boolean}[]>;
 revealed:Record<string,Role>;lastResult:string;winningTeam?:'village'|'werewolves';
}
export interface WerewolfView extends Omit<WerewolfState,'roles'|'night'|'votes'|'knowledge'|'skipped'|'lastProtected'> {
 role:Role;allies:string[];ownTarget?:string;ownVote?:string;ownSkipped:boolean;
 knowledge:{day:number;player:string;wolf:boolean}[];wolfTargets?:Record<string,string>;voteCounts:Record<string,number>;
}
export interface BlackjackSeat {id:string;bet:number;pairBet:number;trioBet:number;cards:Card[];status:'betting'|'waiting'|'playing'|'stand'|'bust'|'natural'|'sitout'|'forfeit';sideReturn:number;sideLabel:string;outcome?:string;returned?:number;startCash:number}
export interface BlackjackState {phase:'betting'|'playing'|'dealer'|'result';round:number;ends:number;dealer:Card[];seats:BlackjackSeat[]}
export interface BlackjackView extends Omit<BlackjackState,'dealer'|'seats'> {dealer:(Card|null)[];seats:Omit<BlackjackSeat,'startCash'>[]}
export interface DartHit {player:string;x:number;y:number;points:number;multiplier:number;label:string;bust:boolean;at:number}
export interface DartsState {remaining:Record<string,number>;turnStart:number;left:number;ends:number;aimAt:number;recent:DartHit[]}
export interface PongShot {player:string;team:number;x:number;y:number;cup?:number;hit:boolean;at:number}
export interface PongState {teams:string[][];cups:boolean[][];team:number;left:number;hits:number;shooters:number[];ends:number;aimAt:number;redemption:boolean;pendingWinner?:number;recent:PongShot[];overtime:number;winningTeam?:number}
export const dartNumbers=[20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];
export function dartScore(x:number,y:number){const radius=Math.hypot(x,y);if(radius>1)return{points:0,multiplier:0,label:'Miss'};if(radius<=.035)return{points:50,multiplier:2,label:'Bullseye'};if(radius<=.085)return{points:25,multiplier:1,label:'Outer bull'};const angle=(Math.atan2(x,-y)+Math.PI/20+Math.PI*2)%(Math.PI*2),n=dartNumbers[Math.floor(angle/(Math.PI/10))%20],multiplier=radius>=.9?2:radius>=.52&&radius<=.59?3:1;return{points:n*multiplier,multiplier,label:(multiplier===3?'Triple ':multiplier===2?'Double ':'')+n};}
export function cupPositions(count:number){const rows=count===10?4:count===6?3:2;const cups:{x:number;y:number}[]=[];for(let row=0;row<rows;row++)for(let col=0;col<=row;col++)cups.push({x:(col-row/2)*.38,y:(row-(rows-1)/2)*.34});return cups;}
export function blackjackTotal(cards:Card[]){let total=0,aces=0;for(const c of cards){total+=c.rank===1?11:Math.min(10,c.rank);if(c.rank===1)aces++;}while(total>21&&aces){total-=10;aces--;}return{total,soft:aces>0};}
export function sideBetReturns(cards:Card[],up:Card,pairBet:number,trioBet:number){
 const [a,b]=cards;let pair=0,trio=0;const labels:string[]=[];
 if(a.rank===b.rank){const red=(c:Card)=>c.suit==='♥'||c.suit==='♦';pair=a.suit===b.suit?25:red(a)===red(b)?12:5;labels.push('Pair '+pair+':1');}
 const three=[a,b,up],ranks=three.map(c=>c.rank).sort((a,b)=>a-b),flush=three.every(c=>c.suit===a.suit),trips=ranks[0]===ranks[2],straight=new Set(ranks).size===3&&(ranks[2]-ranks[0]===2||ranks.join(',')==='1,12,13');
 if(trips&&flush)trio=100;else if(straight&&flush)trio=40;else if(trips)trio=30;else if(straight)trio=10;else if(flush)trio=5;
 if(trio)labels.push('21+3 '+trio+':1');return{returned:(pair?pairBet*(pair+1):0)+(trio?trioBet*(trio+1):0),label:labels.join(' · ')||'No side-bet win'};
}

/** Fixed world-space rim position; independent of the viewing player's seat or camera. */
export function pongRackPosition(team:number,x:number,y:number){return{x,y:1.3,z:(team===0?1:-1)*(1.15+y*.75)};}
