import type {Card} from './types.js';

export type PokerStreet = 'preflop'|'flop'|'turn'|'river'|'handEnd';
export interface PokerSeat {id:string;folded:boolean;bet:number;total:number;actedAt:number;lastAction:string}
export interface PokerPayout {player:string;amount:number;label:string;refund?:boolean}
export interface PokerPot {amount:number;winners:string[]}
export interface PokerState {
  hand:number;street:PokerStreet;dealer:number;smallBlind:number;bigBlind:number;
  board:Card[];burned:Card[];seats:PokerSeat[];currentBet:number;minRaise:number;
  pot:number;ends:number;lastPot:number;payouts:PokerPayout[];pots:PokerPot[];
  revealed:{player:string;cards:Card[];label:string}[];
}
export type PokerView = Omit<PokerState,'burned'>;

/** Lexicographic rank: category followed by the five-card hand's kickers. */
export function compareHands(a:number[],b:number[]){for(let i=0;i<Math.max(a.length,b.length);i++){const d=(a[i]||0)-(b[i]||0);if(d)return d;}return 0;}
const names=['High card','One pair','Two pair','Three of a kind','Straight','Flush','Full house','Four of a kind','Straight flush'];
export function handLabel(value:number[]){return value[0]===8&&value[1]===14?'Royal flush':names[value[0]];}
function five(cards:Card[]):number[]{
  const ranks=cards.map(c=>c.rank===1?14:c.rank).sort((a,b)=>b-a);
  const groups=[...new Set(ranks)].map(v=>({v,n:ranks.filter(r=>r===v).length})).sort((a,b)=>b.n-a.n||b.v-a.v);
  const flush=cards.every(c=>c.suit===cards[0].suit),unique=[...new Set(ranks)];
  const straight=unique.length===5?(unique[0]-unique[4]===4?unique[0]:unique.join(',')==='14,5,4,3,2'?5:0):0;
  if(flush&&straight)return [8,straight];
  if(groups[0].n===4)return [7,groups[0].v,groups[1].v];
  if(groups[0].n===3&&groups[1].n===2)return [6,groups[0].v,groups[1].v];
  if(flush)return [5,...ranks];if(straight)return [4,straight];
  if(groups[0].n===3)return [3,groups[0].v,...groups.slice(1).map(g=>g.v)];
  if(groups[0].n===2&&groups[1].n===2)return [2,...groups.slice(0,2).map(g=>g.v),groups[2].v];
  if(groups[0].n===2)return [1,groups[0].v,...groups.slice(1).map(g=>g.v)];
  return [0,...ranks];
}
export function evaluateHand(cards:Card[]):number[]{
  if(cards.length<5||cards.length>7)throw Error('Evaluate five to seven cards.');
  let best:number[]=[];
  for(let a=0;a<cards.length-4;a++)for(let b=a+1;b<cards.length-3;b++)for(let c=b+1;c<cards.length-2;c++)for(let d=c+1;d<cards.length-1;d++)for(let e=d+1;e<cards.length;e++){
    const value=five([cards[a],cards[b],cards[c],cards[d],cards[e]]);if(compareHands(value,best)>0)best=value;
  }
  return best;
}
