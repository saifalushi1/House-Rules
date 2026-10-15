import {blackoutView,traceBlackout,recordBlackout} from './blackout.js';
import {initCharades,prepareCharadeTeams,handleCharades,tickCharades} from './charades.js';
import {handlePeek,clearPeeks} from './peek.js';
import {handleAftermath,finishEffects} from './aftermath.js';
import {initPoker,handlePoker,tickPoker,pokerView,abortPoker} from './poker.js';
import {initSolitaire,solitaireView,handleSolitaire} from './solitaire.js';
import {initScribble,scribbleView,handleScribble,tickScribble} from './scribble.js';
import {initRpg,handleRpg} from './rpg.js';
import {handleRaid,tickRaid} from './raid.js';
import {chaosCardGain,initChaos,chaosWord,chaosBefore,chaosAfter,tickChaos,handleChaos,saveChaosAction,commitChaosAction,checkBanned,chaosGuard,invalidateChaos,chaosPenaltiesForAction,takeChaosForcedAction,chaosPenalty} from './chaos.js';
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
export function makeRoom(code: string, host: string): Room { return { retaliated:[],finishEffectsDone:false,charadeMatchEnds:0, charadeCorrect:[], charadeScores:[], trickCollectUntil:0, lastTrickTeam:0, bluffPlays: 0, gameInstance: 0, endedEarly: false, messageSequence: 1, messages: [{id:1, at:Date.now(), text:'A new table. A fresh set of rules.'}], events: [], eventSequence: 0, busyUntil: 0, rollDice: [], tradeOffers: [], deniedTrumps: [], code, host, players: [], rules: { ...defaults }, phase: 'lobby', turn: 0, deck: [], pile: [], log: ['A new table. A fresh set of rules.'], round: 1, claim: 1, trick: [], tricks: [0, 0], teamScores: [0, 0], bid: 6, passes: 0, bidPassed: [], tarneebPhase: 'bid', trump: '♠', tiles: [], rolled: false, lastRoll: 0, charadeBag: [], boardPot: 0 }; }
export function note(r: Room, msg: string) { recordMessage(r, msg); }
export function next(r: Room) {
 const dir=r.rules.reverseTurns!==!!r.chaos?.reversed?-1:1,order=r.chaos?.order||r.players.map(p=>p.id);
 let index=order.indexOf(r.players[r.turn].id);
 for(let i=0;i<order.length;i++){index=(index+dir+order.length)%order.length;r.turn=r.players.findIndex(p=>p.id===order[index]);if(!r.players[r.turn].bankrupt)break;}
 if(index===0&&r.rules.game!=='tarneeb')r.round++;
}
function need(ok: unknown, msg: string): asserts ok { if (!ok)
    throw new Error(msg); }
function num(x: unknown, min: number, max: number) { need(typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max, 'Parameter outside its allowed range.'); return x; }
function dealTarneeb(r: Room) { clearPeeks(r); r.deck = makeDeck(); r.players.forEach(p => { p.hand = r.deck.splice(0, 13); }); r.bid = 6; r.bidder = undefined; r.bidPassed = []; r.passes = 0; r.tarneebPhase = 'bid'; r.tricks = [0, 0]; r.trick = []; r.lastTrick = undefined; r.trickCollectUntil=0; r.lastTrickTeam=0; }
export function start(r: Room) {
    need(r.phase === 'lobby', 'Return to the lobby before starting.');
    const min = ['cards','rpg'].includes(r.rules.game) ? 1 : 2;
    need(r.rules.game!=='cards'||r.rules.cardLayout!=='solitaire'||r.players.length===1,'Solitaire needs exactly one player.');
    need(r.players.length >= min, `This game needs at least ${min} players.`);
    need(r.players.every(p => p.connected), 'Wait for disconnected players or remove them.');
    need(r.rules.game !== 'tarneeb' || r.players.length === 4, 'Tarneeb needs exactly four players, with partners across the table.');
    need(r.rules.game !== 'charades' || [2,4,6,8].includes(r.players.length), 'Charades needs 2, 4, 6 or 8 players in pairs.');
    need(r.rules.game!=='trivia'||r.rules.triviaHostMode==='everyone'||r.players.some(p=>p.id===r.triviaMaster&&p.connected),'Choose a trivia master before starting.');
    if(r.rules.game==='charades')prepareCharadeTeams(r);
    r.retaliated=[];r.finishEffectsDone=false;r.endReason=undefined;r.charadeSession=undefined;
    r.chaos=undefined;r.poker=undefined;r.trivia=undefined;r.solitaire=undefined;r.scribble=undefined;r.raid=undefined;
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
        if(r.rules.cardLayout==='solitaire')initSolitaire(r,r.deck);else r.players.forEach(p => p.hand = r.deck.splice(0, r.rules.handSize));
    }
    else if (r.rules.game === 'charades')initCharades(r);
    if(r.rules.game==='poker')initPoker(r);
    if(r.rules.game==='trivia')initializeTrivia(r);
    if(r.rules.game==='scribble')initScribble(r);
    if(r.rules.game==='rpg')initRpg(r);
    r.tiles = Array.from({ length: 24 }, (_, i) => ({ name: i === 0 ? 'Home' : i % 6 === 0 ? 'Rest stop' : i % 5 === 0 ? 'Plot twist' : i % 7 === 0 ? 'Taxes' : ['Maple Lane', 'Moon Market', 'Cedar Grove', 'Sunset Row', 'King’s Court', 'Cloud Corner'][i % 6], type: i === 0 ? 'start' : i % 6 === 0 ? 'rest' : i % 5 === 0 ? 'event' : i % 7 === 0 ? 'tax' : 'property', price: 100 + Math.floor(i / 3) * 50, rent: 20 + Math.floor(i / 3) * 10 }));
    initChaos(r);
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
function rawView(r: Room, id: string): View { const { deck, players, lastPlay, charadeBag: _, charade, duel, tradeOffers, trivia: privateTrivia, solitaire:privateSolitaire,scribble:privateScribble,raid:privateRaid,poker:privatePoker, ...publicRoom } = r; const me=players.find(p=>p.id===id);const visiblePeek=r.phase==='playing'&&me&&me.peekTarget&&me.peekRevealed&&me.peekRevealsAt<=Date.now()&&me.peekingUntil>Date.now()?players.find(p=>p.id===me.peekTarget)?.hand.slice(0,3):undefined;return { ...publicRoom,poker:pokerView(r),rpg:r.rules.game==='rpg'?r.rpg:undefined,solitaire:solitaireView(r),scribble:scribbleView(r,id),raid:r.raid?{from:r.raid.from,to:r.raid.to,stake:r.raid.stake,phase:r.raid.phase,lastBeat:r.raid.lastBeat,pausedAt:r.raid.pausedAt,ends:r.raid.ends,round:r.raid.round,wins:r.raid.wins,ready:Object.keys(r.raid.choices)}:undefined, chaos:r.chaos?{...r.chaos,word:chaosWord(r,id)}:undefined, trivia:triviaView(r,id), peek:visiblePeek, tradeOffers: tradeOffers.filter(t => t.from === id || t.to === id), duel: duel ? { acePlayer: duel.acePlayer, trumpPlayer: duel.trumpPlayer, card: duel.card, round: duel.round, score: duel.score, ends: duel.ends, ready: Object.keys(duel.choices) } : undefined, players: players.map(({ hand, ...p }) => ({ ...p, handCount: hand.length })), hand: players.find(p => p.id === id)?.hand || [], deckCount: deck.length, pileCount: r.pile.length, lastPlay: lastPlay ? { player: lastPlay.player, count: lastPlay.cards.length, claim: lastPlay.claim, expires: lastPlay.expires } : undefined, charade: charade ? { actor: charade.actor,guesser:charade.guesser, ends: charade.ends, ...(id === charade.actor ? { prompt: charade.prompt } : {}) } : undefined, pile: r.rules.game === 'bluff' ? [] : r.pile }; }
function tickInternal(r: Room) {
    if (r.phase !== 'playing'){if(r.busyUntil&&r.busyUntil<=Date.now()){r.busyUntil=0;return true;}return false;}
    if(tickRaid(r))return true;
    if(r.raid)return false;
    if(tickPoker(r))return true;
    if(tickScribble(r))return true;
    if(tickTrivia(r))return true;
    if(tickCharades(r))return true;
    let peekChanged=false;if(r.trickCollectUntil && r.trickCollectUntil<=Date.now()){r.trickCollectUntil=0;peekChanged=true;}for(const p of r.players){if(p.peekTarget&&!p.peekRevealed&&p.peekRevealsAt<=Date.now()&&p.peekingUntil>Date.now()){p.peekRevealed=true;p.peekingUntil=Date.now()+4000;peekChanged=true;}if(p.catchUntil && p.catchUntil<=Date.now()){p.catchUntil=0;peekChanged=true;}if(p.peekingUntil && p.peekingUntil<=Date.now()){p.peekingUntil=0;p.catchUntil=0;p.peekTarget=undefined;peekChanged=true;}}
    const interactionChanged = tickInteractions(r, commitTarneeb);
    if (r.rules.game === 'bluff' && r.lastPlay && Date.now() >= r.lastPlay.expires) {
        const p = r.players.find(p => p.id === r.lastPlay!.player)!;
        r.lastPlay = undefined;
        if (!p.hand.length)
            finish(r, p.name);
        return true;
    }
    return interactionChanged || peekChanged;
}
function tickInternalChaos(r:Room){const before=chaosBefore(r);const changed=r.chaos?.vote?false:tickInternal(r);if(changed){invalidateChaos(r);chaosAfter(r,before);}const chaosChanged=tickChaos(r);const forced=takeChaosForcedAction(r);if(forced){forceChaosAction(r,forced);return true;}finishEffects(r);return chaosChanged||changed;}
function actInternal(r: Room, id: string, a: Action): {
    peek?: Card[];
} | void {
    const p = r.players.find(p => p.id === id);
    need(p, 'Join this room first.');
    if(handleAftermath(r,id,a)||handleCharades(r,id,a)||handlePeek(r,id,a))return;
    if(handlePoker(r,id,a)||handleSolitaire(r,id,a)||handleScribble(r,id,a)||handleRpg(r,id,a))return;
    if(handleTrivia(r,p,a))return;
    if (a.type === 'endGame') {
        need(r.host === id && r.phase === 'playing', 'Only the host can end an active game.');
        abortPoker(r);
        r.phase = 'finished'; r.endedEarly = true; r.winner = undefined;
        r.clash = undefined; r.duel = undefined; r.tradeOffers = []; r.lastPlay = undefined;r.raid=undefined;
        if(r.trivia){r.trivia.phase="result";r.trivia.ends=0;}
        r.charade = undefined; r.pendingLife = undefined; r.busyUntil = 0;
        note(r, `${p.name} ended the game early. No winner was declared.`);
        return;
    }
    if (a.type === 'restart') {
        need(r.rules.game!=='cards'||r.rules.cardLayout!=='solitaire'||r.players.length===1,'Solitaire needs exactly one player.');
        need(r.host === id && r.phase !== 'lobby', 'Only the host can restart a started game.');
        need(r.players.every(q => q.connected), 'Wait for disconnected players or return to the lobby to remove them.');
        need(r.players.length >= (['cards','rpg'].includes(r.rules.game) ? 1 : 2), 'Invite enough players first.');
        need(r.rules.game !== 'tarneeb' || r.players.length === 4, 'Tarneeb needs four players.');
        need(r.rules.game !== 'cards' || r.rules.handSize * r.players.length <= 52 * r.rules.decks, 'The deck is too small.');
        need(r.rules.game !== 'charades' || [2,4,6,8].includes(r.players.length), 'Charades needs 2, 4, 6 or 8 players in pairs.');
        need(r.rules.game!=='trivia'||r.rules.triviaHostMode==='everyone'||r.players.some(q=>q.id===r.triviaMaster&&q.connected),'Choose a trivia master in the lobby.');
        if(r.rules.game==='charades')prepareCharadeTeams(r);
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
            need(r.players.length >= (['cards','rpg'].includes(proposed.game) ? 1 : 2), 'Invite more players before starting.');
            need(r.players.every(p => p.connected), 'Wait for disconnected players or remove them.');
            need(proposed.game !== 'tarneeb' || r.players.length === 4, 'Tarneeb needs exactly four players.');
            need(proposed.game !== "charades" || [2,4,6,8].includes(r.players.length), "Charades needs 2, 4, 6 or 8 players in pairs.");
            need(proposed.game!=="trivia"||proposed.triviaHostMode==='everyone'||r.players.some(q=>q.id===r.triviaMaster&&q.connected),"Choose a trivia master before starting.");
            need(proposed.game!=='cards'||proposed.cardLayout!=='solitaire'||r.players.length===1,'Solitaire needs exactly one player.');
            if(proposed.game==='charades')prepareCharadeTeams(r);
            r.rules = proposed;
        }
        if (r.rules.game === 'cards')
            need(r.rules.handSize * r.players.length <= 52 * r.rules.decks, 'The deck is too small for these starting hands.');
        start(r);
        return;
    }
    if (a.type === 'lobby') {
        need(r.host === id, 'Only the host can return to the lobby.');
        r.tradeOffers = []; r.clash = undefined; r.duel = undefined; r.busyUntil = 0;r.raid=undefined;
        abortPoker(r);r.poker=undefined;
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
    need(!r.solitaire||!['play','draw','collect','pass','peek'].includes(a.type),'Use the Solitaire tableau and stock controls.');
    if (a.type === 'challenge') {
        need(r.rules.game === 'bluff' && r.lastPlay, 'There is no play to challenge.');
        need(r.lastPlay.player !== id, 'You cannot call your own bluff.');
        need(Date.now() < r.lastPlay.expires, 'The challenge window closed.');
        const last = r.lastPlay;
        const liar = last.cards.some(c => c.rank !== last.claim);
        const loser = liar ? r.players.find(q => q.id === last.player)! : p;
        const pickup=chaosCardGain(r,loser.id,r.pile);loser.hand.push(...pickup);
        note(r, `${p.name} called bluff. ${liar ? 'Caught a lie!' : 'They told the truth!'} ${loser.name} takes ${pickup.length} cards. Revealed: ${last.cards.map(c => rankName(c.rank) + c.suit).join(', ')}.`);
        r.pile = [];
        r.lastPlay = undefined;
        r.busyUntil = Date.now()+2100;
        // The play already advanced the turn. Calling bluff never changes it.
        const empty = r.players.find(q => !q.hand.length);
        if (empty)
            finish(r, empty.name);
        return;
    }
    need(!r.clash && !r.duel, 'Resolve the boxing challenge first.');
    need(!r.busyUntil || Date.now() >= r.busyUntil, 'Let the table animation finish first.');
    need(r.players[r.turn]?.id === id, 'It is not your turn.');
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
        const drawn=chaosCardGain(r,p.id,[r.deck.pop()!]);p.hand.push(...drawn);
        note(r, `${p.name} draws ${drawn.length} card${drawn.length===1?'':'s'}.`);
        return;
    }
    if (a.type === 'pass') {
        need(r.rules.game === 'cards', 'Passing is only available in the card sandbox.');
        next(r);
        return;
    }
    if (a.type === 'collect') {
        need(r.rules.game === 'cards' && r.pile.length, 'There are no cards to collect.');
        p.hand.push(...chaosCardGain(r,p.id,r.pile));
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
    r.bluffPlays++;
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
function actPresented(r: Room, id: string, a: Action): { peek?: Card[] } | void {
    const p = r.players.find(p => p.id === id);
    need(p&&p.connected,'Join this room first.');
    if(handleRaid(r,id,a))return;
    need(!r.raid||!a.type.startsWith('chaos'),'Finish the challenge before using other chaos controls.');
    if(handleChaos(r,id,a)){finishEffects(r);return;}
    need(!r.raid||['chat','endGame','lobby','restart'].includes(a.type),'Finish the challenge first.');
    chaosGuard(r,a);
    const chaosBeforeAction=chaosBefore(r),snapshot=saveChaosAction(r,a);
    const from = p?.position, oldScore = p?.score, oldHandLength=p.hand.length;
    const challenged = a.type === "challenge" && r.lastPlay ? {player:r.lastPlay.player, liar:r.lastPlay.cards.some(c=>c.rank!==r.lastPlay!.claim), cards:r.lastPlay.cards.map(c=>({...c})), count:r.pile.length} : undefined;
    const allPassed = a.type === 'bid' && a.value === 0 && r.bidPassed.length === 3 && !r.bidder;
    const result = actInternal(r, id, a);
    if(a.type==='play'&&r.rules.game==='cards')r.bluffPlays++;
    if(r.chaos&&!r.clash&&['play','award','triviaAward','triviaAnswer','guess','endTurn'].includes(a.type)){
      const gained=chaosBeforeAction.units.some(u=>u.value<(chaosBefore(r).units.find(n=>n.id===u.id)?.value??u.value));
      if(a.type==='play'||a.type==='endTurn'||gained)r.chaos.points[id]=(r.chaos.points[id]||0)+1;
    }
    if(['chat','guess','triviaAnswer','scribbleGuess'].includes(a.type)&&typeof a.text==='string')checkBanned(r,id,a.text,chaosBeforeAction.phase==='playing');
    chaosAfter(r,chaosBeforeAction,a.type);
    commitChaosAction(r,a,snapshot);finishEffects(r);

    if(['endGame','restart','lobby'].includes(a.type))invalidateChaos(r);
    if(a.type==='scribbleStroke'||a.type==='soreLoserShot'||a.type.startsWith('charade')||r.rules.game==='charades'&&['guess','award','skip'].includes(a.type)||['peek','catch'].includes(a.type))return result;
    if(a.type.startsWith('trivia')||a.type.startsWith('poker'))return result;
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
    if(a.type==='draw'||a.type==='collect')data.count=p.hand.length-oldHandLength;
    if (a.type === 'roll') {
        r.busyUntil = Date.now() + 1000 + r.lastRoll * 160;
        Object.assign(data, { dice: r.rollDice, from, to: p?.position, steps: r.lastRoll, ends: r.busyUntil });
    }
    if (a.type === 'guess') kind = p?.score !== oldScore ? 'correct' : 'guess';
    if (a.type === 'award') kind = 'correct';
    if (a.type === 'buy' || a.type === 'sell') data.tile = a.type === 'buy' ? p?.position : a.tile;
    if(r.rules.game==='poker'&&['start','restart'].includes(a.type))return result;
    emit(r, kind, id, typeof a.target === 'string' ? a.target : undefined, data);
    if(['challenge','skip','catch'].includes(a.type))chaosPenaltiesForAction(r,id,a,challenged?.liar?challenged.player:id);
    return result;
}

function forceChaosAction(r:Room,id:string){
 if(r.phase!=='playing'||r.players[r.turn]?.id!==id)return;
 const p=r.players[r.turn];let action:Action|undefined;
 if(r.rules.game==='poker'&&r.poker&&r.poker.street!=='handEnd'){const seat=r.poker.seats.find(s=>s.id===id);action={type:'pokerAct',move:'fold'};}
 if(r.rules.game==='cards')action={type:r.solitaire?'solitaireDraw':'pass'};
 if(r.rules.game==='bluff'&&!r.lastPlay){const before=chaosBefore(r);next(r);emit(r,'hotSkip',id,undefined,{text:p.name+' misses this turn'});note(r,p.name+' loses this turn to Hot Potato.');chaosAfter(r,before,'hotSkip');return;}
 if(r.rules.game==='tarneeb'){
  if(r.tarneebPhase==='bid')action={type:'bid',value:0};
  else if(r.tarneebPhase==='trump')action={type:'trump',suit:suits[randomInt(4)]};
  else if(r.tarneebPhase==='play'){const led=r.trick[0]?.card.suit,legal=r.rules.followSuit&&led&&p.hand.some(c=>c.suit===led)?p.hand.filter(c=>c.suit===led):p.hand;if(legal.length)action={type:'play',cards:[legal[randomInt(legal.length)].id]};}
 }
 if(r.rules.game==='scribble'&&r.scribble){r.scribble.ends=Date.now();tick(r);return;}
 if(r.rules.game==='rpg'){action=r.rpg?.combat?{type:'rpgEndTurn',pawn:r.rpg.initiative[r.rpg.index]?.id}:{type:'rpgRoll',sides:20,ability:'none'};}
 if(r.rules.game==='charades'&&r.charadeSession){r.charadeSession.turnEnds=Date.now();tick(r);return;}
 if(r.rules.game==='trivia'&&r.trivia?.phase==='question'){if(r.trivia.activePlayer||r.trivia.master===id){r.trivia.ends=Date.now();tick(r);}else{r.trivia.excluded=[...new Set([...(r.trivia.excluded||[]),id])];note(r,p.name+' is out for this question after Hot Potato.');const available=r.players.filter(p=>p.id!==r.trivia!.master&&!r.trivia!.excluded!.includes(p.id));if(!available.length){r.trivia.ends=Date.now();tick(r);}}return;}
 if(['property','life'].includes(r.rules.game)){if(!r.rolled)act(r,id,{type:'roll'});r.busyUntil=0;if(r.pendingLife)act(r,id,{type:'lifeChoice',choice:0});r.busyUntil=0;action={type:'endTurn'};}
 if(action&&r.rules.game==='tarneeb'&&action.type==='play'){const card=p.hand.find(c=>c.id===(action!.cards as string[])[0]);if(card){const before=chaosBefore(r);commitTarneeb(r,id,card);emit(r,'play',id,undefined,{count:1,forced:true});chaosAfter(r,before,'play');}return;}
 if(action){try{act(r,id,action);}catch{chaosPenalty(r,id,'Forced action unavailable');}}else chaosPenalty(r,id,'No legal forced action');
}

export function view(r:Room,id:string):View{return blackoutView(r,id,rawView(r,id),rawView);}
export function act(r:Room,id:string,a:Action){const before=traceBlackout(r);try{return actPresented(r,id,a);}finally{recordBlackout(r,before,id,a.type==='chat');}}
export function tick(r:Room){const before=traceBlackout(r);try{return tickInternalChaos(r);}finally{recordBlackout(r,before);}}
