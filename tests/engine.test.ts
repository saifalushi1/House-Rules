import { test } from 'node:test';
import assert from 'node:assert/strict';
import { act, makeDeck, makeRoom, player, start, tick, validateRules, view } from '../server/engine.js';
import { defaults, type Game } from '../shared/types.js';
function setup(game: Game = 'bluff', count = 2) { const r = makeRoom('TEST', 'p0'); r.rules = { ...defaults, game, boxingDuels: false }; r.players = Array.from({ length: count }, (_, i) => player('p' + i, 'Player ' + i, i)); return r; }
test('each shuffled deck has 52 unique cards; multiple decks stay unique', () => { const deck = makeDeck(3); assert.equal(deck.length, 156); assert.equal(new Set(deck.map(c => c.id)).size, 156); });
test('non-host cannot change rules or start', () => { const r = setup(); assert.throws(() => act(r, 'p1', { type: 'rules', rules: defaults })); assert.throws(() => act(r, 'p1', { type: 'start' })); });
test('rules reject unknown games, invalid numeric values and non-boolean toggles', () => { for (const bad of [{ game: 'bad' }, { decks: 0 }, { maxPlayers: 100 }, { allowPeeking: 'true' }, { handSize: 1.5 }, { rentMultiplier: NaN }])
    assert.throws(() => validateRules({ ...defaults, ...bad })); });
test('Tarneeb requires four players and always a single deck', () => { const r = setup('tarneeb', 3); assert.throws(() => start(r)); assert.equal(r.phase, 'lobby'); assert.equal(validateRules({ ...defaults, game: 'tarneeb', decks: 3 }).decks, 1); });
test('private views conceal opponents hands, hidden bluff pile and prompt', () => { const r = setup(); start(r); const a = r.players[0].hand[0]; act(r, 'p0', { type: 'play', cards: [a.id], claim: 1 }); const v = view(r, 'p1'); assert.equal(v.hand.length, r.players[1].hand.length); assert.ok(!('hand' in v.players[0])); assert.equal(v.pile.length, 0); assert.ok(!('cards' in v.lastPlay!)); assert.ok(!('deck' in v)); assert.equal(v.pileCount, 1); const c = setup('charades'); start(c); assert.ok(view(c, 'p1').charade?.prompt); assert.ok(!view(c, 'p0').charade?.prompt); });
test('caught lie gives entire pile to liar; true claim punishes caller', () => { for (const truthful of [false, true]) {
    const r = setup();
    start(r);
    r.players[0].hand = [{ id: 'one', rank: truthful ? 1 : 9, suit: '♠' }, { id: 'extra', rank: 3, suit: '♦' }];
    const before = r.players[1].hand.length;
    act(r, 'p0', { type: 'play', cards: ['one'], claim: 1 });
    act(r, 'p1', { type: 'challenge' });
    assert.equal(r.pile.length, 0);
    assert.equal(r.lastPlay, undefined);
    assert.equal(r.players[0].hand.length, truthful ? 1 : 2);
    assert.equal(r.players[1].hand.length, truthful ? before + 1 : before);
} });
test('empty bluff hand wins only after challenge deadline', () => { const r = setup(); start(r); r.players[0].hand = [{ id: 'last', rank: 1, suit: '♠' }]; act(r, 'p0', { type: 'play', cards: ['last'], claim: 1 }); assert.equal(r.phase, 'playing'); r.lastPlay!.expires = Date.now() - 1; tick(r); assert.equal(r.phase, 'finished'); assert.equal(r.winner, 'Player 0'); });
test('duplicate or unowned cards and out-of-turn actions are rejected', () => { const r = setup(); start(r); const id = r.players[0].hand[0].id; assert.throws(() => act(r, 'p0', { type: 'play', cards: [id, id], claim: 1 })); assert.throws(() => act(r, 'p1', { type: 'play', cards: ['fake'], claim: 1 })); assert.throws(() => act(r, 'p0', { type: 'play', cards: ['fake'], claim: 1 })); });
test('peeking requires enabled rule; catching announces configured penalty', () => { const r = setup(); start(r); assert.throws(() => act(r, 'p0', { type: 'peek', target: 'p1' })); r.rules.allowPeeking = true; const peek = act(r, 'p0', { type: 'peek', target: 'p1' }); assert.equal(peek?.peek, undefined); assert.equal(view(r,'p0').peek,undefined); act(r, 'p1', { type: 'catch', target: 'p0' }); assert.equal(r.players[0].peekingUntil, 0); assert.match(r.log[0], /pirate/); assert.throws(() => act(r, 'p1', { type: 'catch', target: 'p0' })); });
test('Tarneeb auction, follow-suit and all thirteen tricks finish a scored hand', () => { const r = setup('tarneeb', 4); start(r); assert.ok(r.players.every(p => p.hand.length === 13)); act(r, 'p0', { type: 'bid', value: 7 }); for (const id of ['p1', 'p2', 'p3'])
    act(r, id, { type: 'bid', value: 0 }); assert.equal(r.tarneebPhase, 'trump'); assert.equal(r.turn, 0); act(r, 'p0', { type: 'trump', suit: '♠' }); for (let i = 0; i < 52; i++) {
    r.busyUntil=0; // Simulate completion of the previous trick collection animation.
    const p = r.players[r.turn];
    const led = r.trick[0]?.card.suit;
    const card = p.hand.find(c => c.suit === led) || p.hand[0];
    act(r, p.id, { type: 'play', cards: [card.id] });
} assert.equal(r.tarneebPhase, 'handEnd'); assert.equal(r.tricks[0] + r.tricks[1], 13); assert.ok(r.players.every(p => !p.hand.length)); assert.notDeepEqual(r.teamScores, [0, 0]); });
test('Tarneeb rejects breaking suit when holding led suit', () => { const r = setup('tarneeb', 4); start(r); r.tarneebPhase = 'play'; r.trick = [{ player: 'p3', card: { id: 'played', rank: 3, suit: '♥' } }]; r.players[0].hand = [{ id: 'heart', rank: 4, suit: '♥' }, { id: 'spade', rank: 5, suit: '♠' }]; assert.throws(() => act(r, 'p0', { type: 'play', cards: ['spade'] }), /follow/); });
test('charades scores the guesser, retains the timer, swaps roles at timeout and respects skip rules',()=>{const r=setup('charades');r.rules.charadePrompts='Making a pizza';start(r);assert.throws(()=>act(r,'p1',{type:'guess',text:'Making a pizza'}));act(r,'p0',{type:'guess',text:'making a pizza!'});assert.equal(r.players[0].score,1);assert.equal(r.players[1].score,0);assert.equal(r.turn,1);r.rules.allowSkipping=false;assert.throws(()=>act(r,'p1',{type:'skip'}));r.charadeSession!.turnEnds=Date.now()-1;tick(r);assert.equal(r.turn,0);assert.equal(r.charade!.guesser,'p1');});

test('property purchases, selling and rent use room parameters', () => { const r = setup('property'); start(r); r.rolled = true; r.players[0].position = 1; act(r, 'p0', { type: 'buy' }); assert.equal(r.tiles[1].owner, 'p0'); assert.equal(r.players[0].cash, 1400); act(r, 'p0', { type: 'sell', tile: 1 }); assert.equal(r.tiles[1].owner, undefined); assert.equal(r.players[0].cash, 1475); assert.throws(() => act(r, 'p1', { type: 'buy' })); });
test('board games finish after round limit and skip insolvent players', () => { const r = setup('property'); start(r); r.players[0].cash = -1; r.rolled = true; act(r, 'p0', { type: 'endTurn' }); assert.equal(r.players[0].bankrupt, true); assert.equal(r.phase, 'finished'); assert.equal(r.winner, 'Player 1'); const l = setup('life'); start(l); l.round = l.rules.roundLimit; l.turn = 1; l.rolled = true; act(l, 'p1', { type: 'endTurn' }); assert.equal(l.phase, 'finished'); });
test('failed oversized sandbox deal does not start; host start applies rules atomically', () => { const r = setup('cards', 8); assert.throws(() => act(r, 'p0', { type: 'start', rules: { ...defaults, game: 'cards', handSize: 20 } })); assert.equal(r.phase, 'lobby'); const s = setup('cards', 1); act(s, 'p0', { type: 'start', rules: { ...defaults, game: 'cards', handSize: 12 } }); assert.equal(s.players[0].hand.length, 12); });
