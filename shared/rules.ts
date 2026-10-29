import {normalizeChaos} from './chaos-policy.js';
import {backgrounds} from './expansion.js';
import {triviaCategories} from './trivia.js';
import {chaosRules} from './chaos.js';
import {charadeCategories} from "./charades.js";
import { defaults, type Rules } from './types.js';

/** Shared display order: Tarneeb aces are high within each suit. */
export function orderCards(cards:import('./types.js').Card[],game:import('./types.js').Game){
  const suits=['♠','♥','♦','♣'];const value=(rank:number)=>game==='tarneeb'&&rank===1?14:rank;
  return [...cards].sort((a,b)=>game==='bluff'?a.rank-b.rank||suits.indexOf(a.suit)-suits.indexOf(b.suit):suits.indexOf(a.suit)-suits.indexOf(b.suit)||value(a.rank)-value(b.rank));
}
/** Only known, validated settings reach the renderer or game engine. */
export function validateRules(input: unknown): Rules {
  const require = (ok: unknown, message: string) => { if (!ok) throw new Error(message); };
  require(input && typeof input === 'object', 'Invalid rules.');
  const x: Record<string, unknown> = { ...defaults, ...(input as Record<string, unknown>) };
  require(['pool','sudoku','wordle','jackaroo','bluff', 'tarneeb', 'cards', 'charades', 'trivia', 'property', 'life', 'scribble', 'rpg', 'poker', 'werewolf', 'blackjack', 'darts', 'beerpong'].includes(String(x.game)), 'Unknown game.');
  require(['first', 'third'].includes(String(x.camera)), 'Unknown camera.');
  require(Object.hasOwn(backgrounds,String(x.background)), 'Unknown background.');
  require(typeof x.charadeCategory==='string' && Object.hasOwn(charadeCategories,x.charadeCategory), 'Unknown charades category.');
  require(['ffa','turns'].includes(String(x.triviaMode)), 'Unknown trivia answer mode.');
  const r = { ...defaults, game: x.game, camera: x.camera, background:x.background, charadeCategory:x.charadeCategory, triviaMode:x.triviaMode } as Rules;
  for(const key of [...Object.keys(chaosRules),'chaosHandsTravel']) { require(typeof x[key]==='boolean','Invalid chaos toggle.'); (r as unknown as Record<string,unknown>)[key]=x[key]; }
  for(const [key,values] of Object.entries({poolVariant:['eight','nine','cutthroat'],sudokuDifficulty:['easy','medium','hard'],triviaFormat:['typed','choices'],triviaDifficulty:['easy','mixed'],triviaHostMode:['everyone','master'],cardLayout:['free','solitaire'],rpgMap:['crypt','ruins','cavern'],chaosHotOutcome:['penalty','forced','random'],chaosDirection:['left','right'],chaosCycloneTrigger:['round','random'],chaosFlipMode:['scores','order']})){require(values.includes(String(x[key])),'Unknown chaos option.');(r as unknown as Record<string,unknown>)[key]=x[key];}
  for(const key of ['chaosWords','chaosDares']){require(typeof x[key]==='string'&&(x[key] as string).length<=4000,'Chaos lists must be text up to 4000 characters.');const list=(x[key] as string).split('\n').map(v=>v.trim()).filter(Boolean);require(list.length>0&&list.length<=50&&list.every(v=>v.length<=120),'Use 1–50 entries, at most 120 characters each.');if(key==='chaosWords')require(list.every(v=>/^[\p{L}\p{N}]+$/u.test(v)),'Banned words must be single words.');(r as unknown as Record<string,unknown>)[key]=list.join('\n');}
  require(typeof x.triviaCategory==='string'&&Object.hasOwn(triviaCategories,x.triviaCategory),'Unknown trivia category.');r.triviaCategory=x.triviaCategory as Rules['triviaCategory'];
  const ranges: Record<string, [number, number]> = {poolRace:[1,5],poolSeconds:[15,180],puzzleSeconds:[10,180],sudokuMinutes:[1,60],wordleRounds:[1,10],wolfCount:[1,2],wolfNightSeconds:[10,120],wolfDaySeconds:[15,300],wolfVoteSeconds:[10,120],blackjackDecks:[1,6],blackjackSeconds:[10,120],blackjackRounds:[1,50],blackjackMin:[1,1000],blackjackMax:[1,10000],dartsAimSpeed:[.25,3],pongAimSpeed:[.25,3],aimSeconds:[10,120],aimRounds:[0,100],dartsStart:[301,501],pongCups:[6,10],
    jackarooSeconds:[10,120],chaosHotSeconds:[5,120],chaosMinSeconds:[2,30],chaosShrinkSeconds:[0,10],chaosSeatEvery:[1,20],chaosRandomPercent:[0,100],chaosDoublePercent:[0,100],
    pokerStack:[100,10000],pokerSmallBlind:[1,100],pokerBigBlind:[2,200],pokerSeconds:[10,120],pokerHands:[0,100],
    charadeRounds:[1,5],scribbleSeconds:[20,180],scribbleRounds:[1,8],
    maxPlayers: [2, 8], decks: [1, 3], handSize: [1, 20], targetScore: [10, 100],
    triviaQuestions: [1,100], triviaSeconds:[5,180], charadeMatchSeconds: [30,1200], challengeSeconds: [5, 30], charadeSeconds: [15, 180], skipPenalty: [0, 5],
    startingCash: [100, 10000], salary: [0, 2000], rentMultiplier: [.25, 5], roundLimit: [3, 50],
  };
  for (const [key, [min, max]] of Object.entries(ranges)) {
    const value = x[key];
    require(typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max, 'Parameter outside its allowed range.');
    require(['rentMultiplier','dartsAimSpeed','pongAimSpeed'].includes(key) || Number.isInteger(value), 'Use a whole number.');
    (r as unknown as Record<string, unknown>)[key] = value;
  }
  for (const key of ['poolCallPocket','poolCutRestore','jackarooSplitSeven','jackarooFiveAny','jackarooTenBurn','jackarooKingSweep','jackarooProtectedStart','wolfSeer','wolfDoctor','wolfReveal','wolfRepeatSave','blackjackSideBets','blackjackHitSoft17','dartsDoubleOut','pongRedemption','pongBallsBack','rooftopAntics','soreLoser','allowTrading', 'tradeSlaps', 'boxingDuels', 'allowPeeking', 'catchPeeking', 'followSuit', 'reverseTurns', 'allowSkipping', 'freeParking']) {
    require(typeof x[key] === 'boolean', 'Invalid toggle.');
    (r as unknown as Record<string, unknown>)[key] = x[key];
  }
  for (const key of ['penalty', 'charadePrompts', 'customNotes']) {
    require(typeof x[key] === 'string', 'Invalid text.');
    (r as unknown as Record<string, unknown>)[key] = (x[key] as string).slice(0, key === 'charadePrompts' ? 6000 : 1000);
  }
  require(r.chaosMinSeconds<=r.chaosHotSeconds,'Minimum fuse must not exceed starting fuse.');
  require(r.pokerSmallBlind<r.pokerBigBlind,'Small blind must be below the big blind.');
  require(r.pokerStack>=r.pokerBigBlind,'Starting chips must cover the big blind.');
  if(r.game==='poker')r.decks=1;
  if(r.game==='jackaroo'){r.decks=1;r.maxPlayers=4;}
  if (r.game === 'tarneeb') { r.decks = 1; r.maxPlayers = 4; }
  if(r.cardLayout==='solitaire'&&r.game==='cards')r.decks=1;
  require([301,501].includes(r.dartsStart),'Choose 301 or 501.');require([6,10].includes(r.pongCups),'Choose six or ten cups.');require(r.blackjackMin<=r.blackjackMax&&r.blackjackMin<=r.pokerStack,'Blackjack minimum must fit the maximum and starting stack.');return normalizeChaos(r);
}
