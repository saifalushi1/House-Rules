import {handleTrivia,initializeTrivia,tickTrivia,triviaView} from "./trivia.js";
import {charadePrompts} from "./charade-prompts.js";
import { emit, handleInteraction, tickInteractions } from './interactions.js';
import { recordMessage } from './messages.js';
import { validateRules } from '../shared/rules.js';
export { validateRules } from '../shared/rules.js';
import { randomInt } from 'node:crypto';
import { defaults, type Action, type Card, type Player, type Room, type Rules, type Suit, type View } from '../shared/types.js';
const colors = ['#e4a85a', '#7ea48b', '#87a5cf', '#bf88aa', '#ad9cd0', '#e1c879', '#80b7b0', '#db9279'];
export const suits: Suit[] = ['♠', '♥', '♦', '♣'];
export const rankName = (r: number) => ({ 1: 'A', 11: 'J', 12: 'Q', 13: 'K' }[r] || String(r));
export function shuffle<T>(list: T[]): T[] { for (let i = list.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [list[i], list[j]] = [list[j], list[i]];
} return list; }
export function makeDeck(count = 1): Card[] { return shuffle(Array.from({ length: count }, (_, d) => suits.flatMap(suit => Array.from({ length: 13 }, (_, i) => ({ id: `${d}-${suit}-${i + 1}`, rank: i + 1, suit })))).flat()); }
export function player(id: string, name: string, index: number): Player { return { id, name: name.trim().slice(0, 24) || 'Guest', color: colors[index % 8], connected: true, ready: false, hand: [], cash: 0, position: 0, score: 0, peekRevealed: false, peekRevealsAt: 0, correctAnswers: 0, peekingUntil: 0, catchUntil: 0, peekBlockedUntil: 0, bankrupt: false, career: '' }; }
export function makeRoom(code: string, host: string): Room { return { charadeMatchEnds:0, charadeCorrect:[], charadeScores:[], trickCollectUntil:0, lastTrickTeam:0, bluffPlays: 0, gameInstance: 0, endedEarly: false, messageSequence: 1, messages: [{id:1, at:Date.now(), text:'A new table. A fresh set of rules.'}], events: [], eventSequence: 0, busyUntil: 0, rollDice: [], tradeOffers: [], deniedTrumps: [], code, host, players: [], rules: { ...defaults }, phase: 'lobby', turn: 0, deck: [], pile: [], log: ['A new table. A fresh set of rules.'], round: 1, claim: 1, trick: [], tricks: [0, 0], teamScores: [0, 0], bid: 6, passes: 0, bidPassed: [], tarneebPhase: 'bid', trump: '♠', tiles: [], rolled: false, lastRoll: 0, charadeBag: [], boardPot: 0 }; }
export function note(r: Room, msg: string) { recordMessage(r, msg); }
export function next(r: Room) { const dir = r.rules.reverseTurns ? -1 : 1; for (let i = 0; i < r.players.length; i++) {
    r.turn = (r.turn + dir + r.players.length) % r.players.length;
    if (!r.players[r.turn].bankrupt)
        break;
} if (r.turn === 0 && r.rules.game !== 'tarneeb')
    r.round++; }
function need(ok: unknown, msg: string): asserts ok { if (!ok)
    throw new Error(msg); }
function num(x: unknown, min: number, max: number) { need(typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max, 'Parameter outside its allowed range.'); return x; }
function dealTarneeb(r: Room) { r.deck = makeDeck(); r.players.forEach(p => { p.hand = r.deck.splice(0, 13); }); r.bid = 6; r.bidder = undefined; r.bidPassed = []; r.passes = 0; r.tarneebPhase = 'bid'; r.tricks = [0, 0]; r.trick = []; r.lastTrick = undefined; r.trickCollectUntil=0; r.lastTrickTeam=0; }
const pairOf=(r:Room,id:string)=>Math.floor(r.players.findIndex(p=>p.id===id)/2);
function finishCharades(r:Room){const high=Math.max(...r.charadeScores),winners=r.charadeScores.flatMap((score,i)=>score===high?[i+1]:[]);r.charade=undefined;finish(r,winners.length===1?'Pair '+winners[0]:'Pairs '+winners.join(' + ')+' (tie)');}
function advanceCharades(r:Room){next(r);if(Date.now()>=r.charadeMatchEnds || r.round>r.rules.roundLimit)finishCharades(r);else newPrompt(r);}
function newPrompt(r: Room) { if (!r.charadeBag.length)
    r.charadeBag = shuffle(r.rules.charadePrompts.trim() ? r.rules.charadePrompts.split('\n').map(s => s.trim()).filter(Boolean) : [...charadePrompts[r.rules.charadeCategory]]); r.charade = { prompt: r.charadeBag.pop()!, ends: Math.min(r.charadeMatchEnds,Date.now() + r.rules.charadeSeconds * 1000), actor: r.players[r.turn].id }; }
export function start(r: Room) {
    need(r.phase === 'lobby', 'Return to the lobby before starting.');
    const min = r.rules.game === 'cards' ? 1 : 2;
    need(r.players.length >= min, `This game needs at least ${min} players.`);
    need(r.players.every(p => p.connected), 'Wait for disconnected players or remove them.');
    need(r.rules.game !== 'tarneeb' || r.players.length === 4, 'Tarneeb needs exactly four players, with partners across the table.');
    need(r.rules.game !== 'charades' || [2,4,6,8].includes(r.players.length), 'Charades needs 2, 4, 6 or 8 players in pairs.');
    need(r.rules.game!=='trivia'||r.players.some(p=>p.id===r.triviaMaster&&p.connected),'Choose a trivia master before starting.');
    r.trivia=undefined;
    r.charadeMatchEnds=r.rules.game==='charades'?Date.now()+r.rules.charadeMatchSeconds*1000:0;r.charadeCorrect=Array(r.players.length/2|0).fill(0);r.charadeScores=Array(r.players.length/2|0).fill(0);
    r.bluffPlays = 0; r.tradeOffers = []; r.clash = undefined; r.duel = undefined; r.deniedTrumps = []; r.busyUntil = 0; r.rollDice = [];
    r.gameInstance++;
    r.endedEarly = false;
    r.phase = 'playing';
    r.turn = 0;
    r.round = 1;
    r.winner = undefined;
    r.pile = [];
    r.lastPlay = undefined;
    r.claim = 1;
    r.teamScores = [0, 0];
    r.trick = [];
    r.lastTrick = undefined; r.trickCollectUntil=0; r.lastTrickTeam=0;
    r.rolled = false;
    r.lastRoll = 0;
    r.charade = undefined;
    r.boardPot = 0;
    r.pendingLife = undefined;
    r.charadeBag = [];
    r.players.forEach(p => { p.hand = []; p.score = 0; p.cash = r.rules.startingCash; p.position = 0; p.bankrupt = false; p.career = ''; p.peekRevealed=false; p.peekRevealsAt = 0; p.correctAnswers = 0; p.peekingUntil = 0; p.catchUntil = 0; p.peekTarget = undefined; p.peekBlockedUntil = 0; });
    if (r.rules.game === 'tarneeb')
        dealTarneeb(r);
    else if (r.rules.game === 'bluff') {
        r.deck = makeDeck(r.rules.decks);
        let i = 0;
        while (r.deck.length)
            r.players[i++ % r.players.length].hand.push(r.deck.pop()!);
    }
    else if (r.rules.game === 'cards') {
        r.deck = makeDeck(r.rules.decks);
        need(r.rules.handSize * r.players.length <= r.deck.length, 'The deck is too small for these starting hands.');
        r.players.forEach(p => p.hand = r.deck.splice(0, r.rules.handSize));
    }
    else if (r.rules.game === 'charades')
        newPrompt(r);
    if(r.rules.game==='trivia')initializeTrivia(r);
    r.tiles = Array.from({ length: 24 }, (_, i) => ({ name: i === 0 ? 'Home' : i % 6 === 0 ? 'Rest stop' : i % 5 === 0 ? 'Plot twist' : i % 7 === 0 ? 'Taxes' : ['Maple Lane', 'Moon Market', 'Cedar Grove', 'Sunset Row', 'King’s Court', 'Cloud Corner'][i % 6], type: i === 0 ? 'start' : i % 6 === 0 ? 'rest' : i % 5 === 0 ? 'event' : i % 7 === 0 ? 'tax' : 'property', price: 100 + Math.floor(i / 3) * 50, rent: 20 + Math.floor(i / 3) * 10 }));
    note(r, `${r.players[0].name} opens the game. House rules are locked for this round.`);
}
function finish(r: Room, winner: string) { emit(r, 'win', undefined, undefined, { winner }); r.phase = 'finished'; r.winner = winner; note(r, `${winner} wins! The house has spoken.`); }
function boardFinish(r: Room) { const active = r.players.filter(p => !p.bankrupt); if (active.length <= 1)
    finish(r, active[0]?.name || 'The house');
else if (r.round > r.rules.roundLimit) {
    const winner = [...active].sort((a, b) => worth(r, b) - worth(r, a))[0];
    finish(r, winner.name);
} }
export function worth(r: Room, p: Player) { return p.cash + r.tiles.filter(t => t.owner === p.id).reduce((n, t) => n + t.price, 0); }
export function view(r: Room, id: string): View { const { deck, players, lastPlay, charadeBag: _, charade, duel, tradeOffers, trivia: privateTrivia, ...publicRoom } = r; const me=players.find(p=>p.id===id);const visiblePeek=r.phase==='playing'&&me&&me.peekTarget&&me.peekRevealed&&me.peekRevealsAt<=Date.now()&&me.peekingUntil>Date.now()?players.find(p=>p.id===me.peekTarget)?.hand.slice(0,3):undefined;return { ...publicRoom, trivia:triviaView(r,id), peek:visiblePeek, tradeOffers: tradeOffers.filter(t => t.from === id || t.to === id), duel: duel ? { acePlayer: duel.acePlayer, trumpPlayer: duel.trumpPlayer, card: duel.card, round: duel.round, score: duel.score, ends: duel.ends, ready: Object.keys(duel.choices) } : undefined, players: players.map(({ hand, ...p }) => ({ ...p, handCount: hand.length })), hand: players.find(p => p.id === id)?.hand || [], deckCount: deck.length, pileCount: r.pile.length, lastPlay: lastPlay ? { player: lastPlay.player, count: lastPlay.cards.length, claim: lastPlay.claim, expires: lastPlay.expires } : undefined, charade: charade ? { actor: charade.actor, ends: charade.ends, ...(id === charade.actor ? { prompt: charade.prompt } : {}) } : undefined, pile: r.rules.game === 'bluff' ? [] : r.pile }; }
export function tick(r: Room) {
    if (r.phase !== 'playing')
        return false;
    if(tickTrivia(r))return true;
    if(r.rules.game==='charades' && Date.now()>=r.charadeMatchEnds){finishCharades(r);return true;}
    let peekChanged=false;if(r.trickCollectUntil && r.trickCollectUntil<=Date.now()){r.trickCollectUntil=0;peekChanged=true;}for(const p of r.players){if(p.peekTarget&&!p.peekRevealed&&p.peekRevealsAt<=Date.now()&&p.peekingUntil>Date.now()){p.peekRevealed=true;p.peekingUntil=Date.now()+4000;peekChanged=true;}if(p.catchUntil && p.catchUntil<=Date.now()){p.catchUntil=0;peekChanged=true;}if(p.peekingUntil && p.peekingUntil<=Date.now()){p.peekingUntil=0;p.catchUntil=0;p.peekTarget=undefined;peekChanged=true;}}
    const interactionChanged = tickInteractions(r, commitTarneeb);
    if (r.rules.game === 'bluff' && r.lastPlay && Date.now() >= r.lastPlay.expires) {
        const p = r.players.find(p => p.id === r.lastPlay!.player)!;
        r.lastPlay = undefined;
        if (!p.hand.length)
            finish(r, p.name);
        return true;
    }
    if (r.rules.game === 'charades' && r.charade && Date.now() >= r.charade.ends) {
        emit(r, 'timeout', r.charade.actor);
        note(r, `Time! The prompt was “${r.charade.prompt}”.`);
        advanceCharades(r);
        return true;
    }
    return interactionChanged || peekChanged;
}
function actInternal(r: Room, id: string, a: Action): {
    peek?: Card[];
} | void {
    const p = r.players.find(p => p.id === id);
    need(p, 'Join this room first.');
    if(handleTrivia(r,p,a))return;
    if (a.type === 'endGame') {
        need(r.host === id && r.phase === 'playing', 'Only the host can end an active game.');
        r.phase = 'finished'; r.endedEarly = true; r.winner = undefined;
        r.clash = undefined; r.duel = undefined; r.tradeOffers = []; r.lastPlay = undefined;
        if(r.trivia){r.trivia.phase="result";r.trivia.ends=0;}
        r.charade = undefined; r.pendingLife = undefined; r.busyUntil = 0;
        note(r, `${p.name} ended the game early. No winner was declared.`);
        return;
    }
    if (a.type === 'restart') {
        need(r.host === id && r.phase !== 'lobby', 'Only the host can restart a started game.');
        need(r.players.every(q => q.connected), 'Wait for disconnected players or return to the lobby to remove them.');
        need(r.players.length >= (r.rules.game === 'cards' ? 1 : 2), 'Invite enough players first.');
        need(r.rules.game !== 'tarneeb' || r.players.length === 4, 'Tarneeb needs four players.');
        need(r.rules.game !== 'cards' || r.rules.handSize * r.players.length <= 52 * r.rules.decks, 'The deck is too small.');
        need(r.rules.game !== 'charades' || [2,4,6,8].includes(r.players.length), 'Charades needs 2, 4, 6 or 8 players in pairs.');
        need(r.rules.game!=='trivia'||r.players.some(q=>q.id===r.triviaMaster&&q.connected),'Choose a trivia master in the lobby.');
        r.phase = 'lobby'; start(r);
        note(r, `${p.name} restarted the game with the same house rules.`);
        return;
    }
    if (handleInteraction(r, p, a, commitTarneeb)) return;
    if (a.type === 'rules') {
        need(r.host === id && r.phase === 'lobby', 'Only the host can edit rules in the lobby.');
        const rules = validateRules(a.rules);
        need(rules.maxPlayers >= r.players.length, 'Remove players before lowering room capacity.');
        r.rules = rules;
        r.players.forEach(p => p.ready = false);
        note(r, 'The host updated the house rules.');
        return;
    }
    if (a.type === 'ready') {
        need(r.phase === 'lobby', 'The game has already started.');
        p.ready = !p.ready;
        return;
    }
    if (a.type === 'start') {
        need(r.host === id && r.phase === 'lobby', 'Only the host can start from the lobby.');
        if (a.rules) {
            const proposed = validateRules(a.rules);
            need(proposed.maxPlayers >= r.players.length, 'Remove players before lowering room capacity.');
            if (proposed.game === 'cards')
                need(proposed.handSize * r.players.length <= 52 * proposed.decks, 'The deck is too small for these starting hands.');
            need(r.players.length >= (proposed.game === 'cards' ? 1 : 2), 'Invite more players before starting.');
            need(r.players.every(p => p.connected), 'Wait for disconnected players or remove them.');
            need(proposed.game !== 'tarneeb' || r.players.length === 4, 'Tarneeb needs exactly four players.');
            need(proposed.game !== "charades" || [2,4,6,8].includes(r.players.length), "Charades needs 2, 4, 6 or 8 players in pairs.");
            need(proposed.game!=="trivia"||r.players.some(q=>q.id===r.triviaMaster&&q.connected),"Choose a trivia master before starting.");
            r.rules = proposed;
        }
        if (r.rules.game === 'cards')
            need(r.rules.handSize * r.players.length <= 52 * r.rules.decks, 'The deck is too small for these starting hands.');
        start(r);
        return;
    }
    if (a.type === 'lobby') {
        need(r.host === id, 'Only the host can return to the lobby.');
        r.tradeOffers = []; r.clash = undefined; r.duel = undefined; r.busyUntil = 0;
        r.trivia=undefined;
        r.phase = 'lobby';
        r.players.forEach(p => { p.hand = []; p.ready = false; });
        r.deck = [];
        r.pile = [];
        r.lastPlay = undefined;
        r.charade = undefined;
        note(r, 'Back at the table. Time to change the rules.');
        return;
    }
    if (a.type === 'kick') {
        need(r.host === id && r.phase === 'lobby', 'Only the host can remove players in the lobby.');
        need(a.target !== id, 'The host cannot remove themselves.');
        r.players = r.players.filter(p => p.id !== a.target);
        return;
    }
    if (a.type === 'chat') {
        need(typeof a.text === 'string' && a.text.trim(), 'Write a message first.');
        note(r, `${p.name}: ${a.text.trim().slice(0, 240)}`);
        return;
    }
    need(r.phase === 'playing', 'Start a game first.');
    if(r.rules.game==='charades' && Date.now()>=r.charadeMatchEnds){finishCharades(r);return;}
    if (a.type === 'peek') {
        need(r.rules.allowPeeking && ['bluff', 'tarneeb', 'cards'].includes(r.rules.game), 'Peeking is disabled.');
        const target = r.players.find(q => q.id === a.target);
        need(target && target.id !== id, 'Choose another player.');
        need(r.rules.game !== "tarneeb" || r.players.indexOf(p)%2 !== r.players.indexOf(target)%2, "You cannot peek at your teammate’s cards.");
        need(target.hand.length > 0, "They have no cards to peek at.");
        need(p.peekingUntil <= Date.now(), "Finish your current peek first.");
        need(r.rules.game !== "bluff" || p.peekBlockedUntil <= r.bluffPlays, `Peek cooldown: ${p.peekBlockedUntil-r.bluffPlays} hands left.`);
        p.peekTarget = target.id;
        const delay=r.rules.game==='bluff'&&r.rules.catchPeeking?2000:0;
        p.peekRevealed=!delay;
        p.peekRevealsAt=Date.now()+delay;
        p.catchUntil=delay?p.peekRevealsAt:r.rules.game==='bluff'?0:Date.now()+4000;
        p.peekingUntil=p.peekRevealsAt+4000;
        if(!delay)return { peek: target.hand.slice(0, 3) };return;
    }
    if (a.type === 'catch') {
        need(r.rules.allowPeeking && r.rules.catchPeeking, 'Catching peekers is disabled.');
        const target = r.players.find(q => q.id === a.target);
        need(target && target.id !== id, 'Choose another player.');
        need(target.peekingUntil > Date.now(), 'They are not peeking right now.');
        need(r.rules.game !== "bluff" || (target.peekTarget === id && target.catchUntil > Date.now()), "Your two-second slap opportunity has closed.");
        target.peekRevealed=false; target.peekRevealsAt=0; target.peekingUntil = 0; target.catchUntil = 0; target.peekTarget = undefined;
        if(r.rules.game === "bluff") { target.peekBlockedUntil = r.bluffPlays + 8; emit(r,"slap",id,target.id,{reason:"peek",hands:8}); }
        note(r, `${p.name} caught ${target.name} peeking! Penalty: ${r.rules.penalty || 'Do your best victory dance'}.`);
        return;
    }
    if (a.type === 'challenge') {
        need(r.rules.game === 'bluff' && r.lastPlay, 'There is no play to challenge.');
        need(r.lastPlay.player !== id, 'You cannot call your own bluff.');
        need(Date.now() < r.lastPlay.expires, 'The challenge window closed.');
        const last = r.lastPlay;
        const liar = last.cards.some(c => c.rank !== last.claim);
        const loser = liar ? r.players.find(q => q.id === last.player)! : p;
        loser.hand.push(...r.pile);
        note(r, `${p.name} called bluff. ${liar ? 'Caught a lie!' : 'They told the truth!'} ${loser.name} takes ${r.pile.length} cards. Revealed: ${last.cards.map(c => rankName(c.rank) + c.suit).join(', ')}.`);
        r.pile = [];
        r.lastPlay = undefined;
        r.busyUntil = Date.now()+2100;
        // The play already advanced the turn. Calling bluff never changes it.
        const empty = r.players.find(q => !q.hand.length);
        if (empty)
            finish(r, empty.name);
        return;
    }
    if (a.type === 'guess') {
        need(r.rules.game === 'charades' && r.charade, 'No active prompt.');
        need(id !== r.charade.actor, 'The actor cannot guess.');
        need(pairOf(r,id)===pairOf(r,r.charade.actor),'Only the actor’s partner can guess.');
        need(Date.now()<r.charade.ends,'The prompt timer has ended.');
        need(typeof a.text === 'string' && a.text.trim(), 'Enter a guess.');
        const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
        const correct = norm(a.text) === norm(r.charade.prompt);
        note(r, `${p.name} guesses: ${a.text.slice(0, 100)}${correct ? ' ✓' : ''}`);
        if (correct) {
            p.score++; p.correctAnswers++;r.charadeCorrect[pairOf(r,id)]++;r.charadeScores[pairOf(r,id)]++;
            r.players[r.turn].score++;
            note(r, `Correct! The prompt was “${r.charade.prompt}”.`);
            advanceCharades(r);
        }
        return;
    }
    if (a.type === 'award') {
        need(r.rules.game === 'charades' && r.charade && id === r.charade.actor, 'Only the actor can confirm a spoken answer.');
        const guesser = r.players.find(q => q.id === a.target);
        need(guesser && guesser.id !== id && pairOf(r,guesser.id)===pairOf(r,id), 'Choose your partner who guessed.');
        need(Date.now()<r.charade.ends,'The prompt timer has ended.');
        guesser.score++;guesser.correctAnswers++;r.charadeCorrect[pairOf(r,id)]++;r.charadeScores[pairOf(r,id)]++;
        p.score++;
        note(r, `${guesser.name} guessed “${r.charade.prompt}”!`);
        advanceCharades(r);
        return;
    }
    need(!r.clash && !r.duel, 'Resolve the boxing challenge first.');
    need(!r.busyUntil || Date.now() >= r.busyUntil, 'Let the table animation finish first.');
    need(r.players[r.turn]?.id === id, 'It is not your turn.');
    if (a.type === 'skip') {
        need(r.rules.game === 'charades' && r.rules.allowSkipping, 'Skipping is disabled.');
        p.score -= r.rules.skipPenalty; r.charadeScores[pairOf(r,id)]-=r.rules.skipPenalty;
        note(r, `${p.name} skipped “${r.charade?.prompt}”.`);
        newPrompt(r);
        return;
    }
    if (a.type === 'bid') {
        need(r.rules.game === 'tarneeb' && r.tarneebPhase === 'bid', 'Bidding is closed.');
        need(!r.bidPassed.includes(id), 'You already passed.');
        if (a.value === 0) {
            r.bidPassed.push(id);
            r.passes++;
            note(r, `${p.name} passes.`);
        }
        else {
            const bid = num(a.value, 7, 13);
            need(Number.isInteger(bid) && bid > r.bid, 'Bid above the current contract.');
            r.bid = bid;
            r.bidder = id;
            r.passes = 0;
            note(r, `${p.name} bids ${bid}.`);
        }
        if ((r.bidPassed.length === 3 && r.bidder) || r.bid === 13) {
            r.tarneebPhase = 'trump';
            r.turn = r.players.findIndex(q => q.id === r.bidder);
        }
        else if (r.bidPassed.length === 4) {
            dealTarneeb(r);
            note(r, 'Everyone passed. Fresh deal.');
        }
        else {
            do {
                next(r);
            } while (r.bidPassed.includes(r.players[r.turn].id));
        }
        return;
    }
    if (a.type === 'trump') {
        need(r.rules.game === 'tarneeb' && r.tarneebPhase === 'trump' && suits.includes(a.suit as Suit), 'Choose a valid trump suit.');
        r.trump = a.suit as Suit;
        r.tarneebPhase = 'play';
        note(r, `${p.name} names ${r.trump} as trump.`);
        return;
    }
    if (a.type === 'nextHand') {
        need(r.rules.game === 'tarneeb' && r.tarneebPhase === 'handEnd', 'Finish the current hand.');
        r.round++;
        dealTarneeb(r);
        return;
    }
    if (a.type === 'play') {
        need(['bluff', 'tarneeb', 'cards'].includes(r.rules.game), 'This game does not use cards.');
        need(Array.isArray(a.cards) && a.cards.length > 0 && a.cards.length <= 4 && new Set(a.cards).size === a.cards.length, 'Choose one to four unique cards.');
        const cards = a.cards.map(cardId => p.hand.find(c => c.id === cardId));
        need(cards.every(Boolean), 'You do not hold those cards.');
        const selected = cards as Card[];
        if (r.rules.game === 'bluff') {
            need(!r.lastPlay, 'Wait for the challenge window to close.');
            need(a.claim === r.claim, `The current rank is ${rankName(r.claim)}.`);
            p.hand = p.hand.filter(c => !(a.cards as string[]).includes(c.id));
            r.bluffPlays++;
            r.pile.push(...selected);
            r.lastPlay = { player: id, cards: selected, claim: r.claim, expires: Date.now() + r.rules.challengeSeconds * 1000 };
            note(r, `${p.name} claims ${selected.length} × ${rankName(r.claim)}. Call bluff?`);
            r.claim = r.claim % 13 + 1;
            next(r);
            return;
        }
        if (r.rules.game === 'tarneeb') {
            need(r.tarneebPhase === 'play' && selected.length === 1, 'Play one card after bidding.');
            const led = r.trick[0]?.card.suit;
            need(!r.rules.followSuit || !led || selected[0].suit === led || !p.hand.some(c => c.suit === led), 'You must follow the led suit.');
            const ace = r.trick.find(t => t.card.rank === 1 && t.card.suit === led && t.card.suit !== r.trump && r.players.findIndex(q => q.id === t.player) % 2 !== r.turn % 2);
            if (r.rules.boxingDuels && selected[0].suit === r.trump && ace && !r.trick.some(t => t.card.suit === r.trump && !r.deniedTrumps.includes(t.card.id))) {
                r.clash = { acePlayer: ace.player, trumpPlayer: id, card: selected[0], expires: Date.now() + r.rules.challengeSeconds * 1000 };
                note(r, `Trump on an ace! ${r.players.find(q => q.id === ace.player)!.name} can box for the trick or let it stand.`);
                return;
            }
            commitTarneeb(r, id, selected[0]);
            return;
        }
        p.hand = p.hand.filter(c => !(a.cards as string[]).includes(c.id));
        r.pile.push(...selected);
        note(r, `${p.name} plays ${selected.map(c => rankName(c.rank) + c.suit).join(', ')}.`);
        next(r);
        return;
    }
    if (a.type === 'draw') {
        need(r.rules.game === 'cards' && r.deck.length, 'The deck is empty or drawing is unavailable.');
        p.hand.push(r.deck.pop()!);
        note(r, `${p.name} draws a card.`);
        return;
    }
    if (a.type === 'pass') {
        need(r.rules.game === 'cards', 'Passing is only available in the card sandbox.');
        next(r);
        return;
    }
    if (a.type === 'collect') {
        need(r.rules.game === 'cards' && r.pile.length, 'There are no cards to collect.');
        p.hand.push(...r.pile);
        r.pile = [];
        note(r, `${p.name} collects the pile.`);
        return;
    }
    if (a.type === 'roll') {
        need(['property', 'life'].includes(r.rules.game) && !r.rolled && !r.pendingLife, 'Roll only once per turn.');
        r.rollDice = r.rules.game === 'property' ? [randomInt(1, 7), randomInt(1, 7)] : [randomInt(1, 7)];
        r.lastRoll = r.rollDice.reduce((sum, die) => sum + die, 0);
        const old = p.position;
        p.position = (p.position + r.lastRoll) % 24;
        r.rolled = true;
        if (old + r.lastRoll >= 24) {
            p.cash += r.rules.salary;
            note(r, `${p.name} passes Home and collects $${r.rules.salary}.`);
        }
        note(r, `${p.name} rolls ${r.lastRoll} and lands on ${r.tiles[p.position].name}.`);
        const t = r.tiles[p.position];
        if (r.rules.game === 'property') {
            if (t.owner && t.owner !== id) {
                const rent = Math.round(t.rent * r.rules.rentMultiplier);
                p.cash -= rent;
                r.players.find(q => q.id === t.owner)!.cash += rent;
                note(r, `${p.name} pays $${rent} rent.`);
            }
            else if (t.type === 'tax') {
                p.cash -= 100;
                r.boardPot += 100;
                note(r, `${p.name} pays $100 tax.`);
            }
            else if (t.type === 'rest' && r.rules.freeParking) {
                p.cash += r.boardPot;
                note(r, `${p.name} collects the $${r.boardPot} rest-stop pot.`);
                r.boardPot = 0;
            }
            else if (t.type === 'event') {
                const reward = randomInt(2) === 0 ? 150 : -75;
                p.cash += reward;
                note(r, `${p.name}: ${reward > 0 ? 'Neighborhood festival bonus +$150' : 'Roof repair −$75'}.`);
            }
        }
        else {
            if (!p.career)
                r.pendingLife = { player: id, kind: 'career' };
            else if (t.type === 'event' || t.type === 'rest')
                r.pendingLife = { player: id, kind: 'crossroads' };
            else {
                const reward = [-100, 150, 250, -75][randomInt(4)];
                p.cash += reward;
                note(r, `${p.name}: ${reward >= 0 ? 'Good fortune' : 'Unexpected bill'} ${reward >= 0 ? '+' : '−'}$${Math.abs(reward)}.`);
            }
        }
        return;
    }
    if (a.type === 'buy') {
        need(r.rules.game === 'property' && r.rolled, 'Roll before buying.');
        const t = r.tiles[p.position];
        need(t.type === 'property' && !t.owner, 'This property is unavailable.');
        need(p.cash >= t.price, 'Not enough cash.');
        p.cash -= t.price;
        t.owner = id;
        note(r, `${p.name} buys ${t.name} for $${t.price}.`);
        return;
    }
    if (a.type === 'sell') {
        need(r.rules.game === 'property', 'Selling is only available in Block Party.');
        const index = num(a.tile, 0, 23);
        const t = r.tiles[index];
        need(t && t.owner === id, 'You do not own that property.');
        p.cash += Math.floor(t.price * 0.75);
        t.owner = undefined;
        note(r, `${p.name} sells ${t.name} back to the bank.`);
        return;
    }
    if (a.type === 'lifeChoice') {
        need(r.rules.game === 'life' && r.pendingLife?.player === id, 'No life choice pending.');
        need(a.choice === 0 || a.choice === 1, 'Choose one of the two paths.');
        if (r.pendingLife.kind === 'career') {
            p.career = a.choice === 0 ? 'Maker' : 'Explorer';
            p.cash += a.choice === 0 ? 100 : 50;
            note(r, `${p.name} becomes a ${p.career}.`);
        }
        else {
            const reward = a.choice === 0 ? 100 : (randomInt(2) ? 350 : -150);
            p.cash += reward;
            note(r, `${p.name} takes ${a.choice === 0 ? 'the steady path' : 'a chance'}: ${reward < 0 ? '−' : '+'}$${Math.abs(reward)}.`);
        }
        r.pendingLife = undefined;
        return;
    }
    if (a.type === 'endTurn') {
        need(['property', 'life'].includes(r.rules.game) && r.rolled && !r.pendingLife, 'Roll and resolve any choices first.');
        if (p.cash < 0) {
            p.bankrupt = true;
            r.tiles.forEach(t => { if (t.owner === id)
                t.owner = undefined; });
            note(r, `${p.name} is out of funds and retires from the board.`);
        }
        next(r);
        r.rolled = false;
        boardFinish(r);
        return;
    }
    throw new Error('That action is unavailable in this game.');
}


function commitTarneeb(r: Room, id: string, card: Card) {
    const p = r.players.find(p => p.id === id)!;
    r.trick.push({ player: id, card });
    p.hand = p.hand.filter(c => c.id !== card.id);
    if (r.trick.length < 4) { next(r); return; }
    const ledSuit = r.trick[0].card.suit;
    const value = (c: Card) => r.deniedTrumps.includes(c.id) ? -1 : (c.suit === r.trump ? 100 : c.suit === ledSuit ? 50 : 0) + (c.rank === 1 ? 14 : c.rank);
    const win = r.trick.reduce((best, c) => value(c.card) > value(best.card) ? c : best);
    r.turn = r.players.findIndex(q => q.id === win.player);
    r.tricks[r.turn % 2]++;
    r.lastTrick = r.trick; r.lastTrickTeam=r.turn%2; r.trickCollectUntil=Date.now()+1600; r.busyUntil=Date.now()+1800;
    r.trick = []; r.deniedTrumps = [];
    note(r, `${r.players[r.turn].name} takes the trick (${r.tricks.join(' / ')}).`);
    emit(r, 'trick', win.player,undefined,{team:r.lastTrickTeam,cards:r.lastTrick});
    if (r.players.every(q => !q.hand.length)) {
        const team = r.players.findIndex(q => q.id === r.bidder) % 2;
        const made = r.tricks[team] >= r.bid;
        r.teamScores[team] += made ? (r.bid === 13 ? 26 : r.tricks[team] === 13 ? 16 : r.tricks[team]) : -r.bid;
        if (!made) r.teamScores[1 - team] += r.tricks[1 - team];
        r.tarneebPhase = 'handEnd';
        note(r, `${made ? 'Contract made' : 'Contract missed'}. Team scores: ${r.teamScores.join(' / ')}.`);
        const w = r.teamScores.findIndex(n => n >= r.rules.targetScore);
        if (w >= 0) finish(r, `Team ${w + 1}`);
    }
}
/** Every accepted action carries an explicit, privacy-safe presentation event. */
export function act(r: Room, id: string, a: Action): { peek?: Card[] } | void {
    const p = r.players.find(p => p.id === id);
    const from = p?.position, oldScore = p?.score;
    const challenged = a.type === "challenge" && r.lastPlay ? {player:r.lastPlay.player, liar:r.lastPlay.cards.some(c=>c.rank!==r.lastPlay!.claim), cards:r.lastPlay.cards.map(c=>({...c})), count:r.pile.length} : undefined;
    const allPassed = a.type === 'bid' && a.value === 0 && r.bidPassed.length === 3 && !r.bidder;
    const result = actInternal(r, id, a);
    if(a.type.startsWith('trivia'))return result;
    if (['tradeOffer','tradeAccept','tradeReject','tradeCancel','box','allowTrump','punch'].includes(a.type)) return result;
    let kind = a.type === 'bid' && a.value === 0 && !allPassed ? 'bidPass' : a.type;
    const data: Record<string, unknown> = {};
    if(challenged) Object.assign(data,challenged,{loser:challenged.liar?challenged.player:id});
    if (a.type === 'start' || a.type === 'restart' || a.type === 'nextHand' || allPassed) {
        if (['bluff','tarneeb','cards'].includes(r.rules.game)) { kind = 'deal'; r.busyUntil = Date.now() + 3400; data.ends = r.busyUntil; }
    }
    if (a.type === 'play') {
        if (r.clash) kind = 'clash';
        data.count = Array.isArray(a.cards) ? a.cards.length : 1;
    }
    if (a.type === 'roll') {
        r.busyUntil = Date.now() + 1000 + r.lastRoll * 160;
        Object.assign(data, { dice: r.rollDice, from, to: p?.position, steps: r.lastRoll, ends: r.busyUntil });
    }
    if (a.type === 'guess') kind = p?.score !== oldScore ? 'correct' : 'guess';
    if (a.type === 'award') kind = 'correct';
    if (a.type === 'buy' || a.type === 'sell') data.tile = a.type === 'buy' ? p?.position : a.tile;
    emit(r, kind, id, typeof a.target === 'string' ? a.target : undefined, data);
    return result;
}
