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
  require(['bluff', 'tarneeb', 'cards', 'charades', 'property', 'life'].includes(String(x.game)), 'Unknown game.');
  require(['first', 'third'].includes(String(x.camera)), 'Unknown camera.');
  require(['garage','forest','speakeasy'].includes(String(x.background)), 'Unknown background.');
  const r = { ...defaults, game: x.game, camera: x.camera, background:x.background } as Rules;
  const ranges: Record<string, [number, number]> = {
    maxPlayers: [2, 8], decks: [1, 3], handSize: [1, 20], targetScore: [10, 100],
    challengeSeconds: [5, 30], charadeSeconds: [15, 180], skipPenalty: [0, 5],
    startingCash: [100, 10000], salary: [0, 2000], rentMultiplier: [.25, 5], roundLimit: [3, 50],
  };
  for (const [key, [min, max]] of Object.entries(ranges)) {
    const value = x[key];
    require(typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max, 'Parameter outside its allowed range.');
    require(key === 'rentMultiplier' || Number.isInteger(value), 'Use a whole number.');
    (r as unknown as Record<string, unknown>)[key] = value;
  }
  for (const key of ['allowTrading', 'tradeSlaps', 'boxingDuels', 'allowPeeking', 'catchPeeking', 'followSuit', 'reverseTurns', 'allowSkipping', 'freeParking']) {
    require(typeof x[key] === 'boolean', 'Invalid toggle.');
    (r as unknown as Record<string, unknown>)[key] = x[key];
  }
  for (const key of ['penalty', 'charadePrompts', 'customNotes']) {
    require(typeof x[key] === 'string', 'Invalid text.');
    (r as unknown as Record<string, unknown>)[key] = (x[key] as string).slice(0, key === 'charadePrompts' ? 6000 : 1000);
  }
  if (r.game === 'tarneeb') { r.decks = 1; r.maxPlayers = 4; }
  return r;
}


