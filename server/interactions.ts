import { randomBytes } from 'node:crypto';
import type { Action, BoxingMove, Card, Player, Room } from '../shared/types.js';
import { recordMessage } from './messages.js';
export type Commit = (room: Room, id: string, card: Card) => void;
const require = (ok: unknown, message: string) => { if (!ok) throw new Error(message); };
export function emit(r: Room, kind: string, actor?: string, target?: string, data: Record<string, unknown> = {}) {
  r.events.push({ id: ++r.eventSequence, kind, at: Date.now(), actor, target, data });
  r.events = r.events.slice(-50);
}
const log = recordMessage;
function tiles(value: unknown): number[] {
  require(Array.isArray(value) && value.length <= 24, 'Choose valid properties.');
  const list = value as number[];
  require(list.every(n => Number.isInteger(n) && n >= 0 && n < 24) && new Set(list).size === list.length, 'Choose unique properties.');
  return list;
}
function cash(value: unknown): number {
  require(typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 1000000, 'Cash offers must be nonnegative whole dollars.');
  return value as number;
}
export function handleInteraction(r: Room, p: Player, a: Action, commit: Commit): boolean {
  if (['tradeOffer', 'tradeAccept', 'tradeReject', 'tradeCancel'].includes(a.type)) {
    require(r.phase === 'playing' && r.rules.game === 'property' && r.rules.allowTrading, 'Negotiation is unavailable.');
    require(!p.bankrupt, 'Retired players cannot negotiate.');
    if (a.type === 'tradeOffer') {
      const other = r.players.find(q => q.id === a.target && q.id !== p.id && !q.bankrupt && q.connected);
      require(other, 'Choose a connected player.');
      const target = other!;
      const giveTiles = tiles(a.giveTiles), wantTiles = tiles(a.wantTiles), giveCash = cash(a.giveCash), wantCash = cash(a.wantCash);
      require(giveCash + wantCash + giveTiles.length + wantTiles.length > 0, 'Add cash or property to the offer.');
      require(p.cash >= giveCash && target.cash >= wantCash, 'One player cannot afford this offer.');
      require(giveTiles.every(i => r.tiles[i].owner === p.id) && wantTiles.every(i => r.tiles[i].owner === target.id), 'You can only offer properties each player owns.');
      require(!r.tradeOffers.some(t => t.from === p.id && t.to === target.id), 'Wait for your existing offer or cancel it.');
      require(r.tradeOffers.filter(t => t.from === p.id).length < 4, 'Resolve your other offers first.');
      const offer = { id: randomBytes(8).toString('hex'), from: p.id, to: target.id, giveCash, wantCash, giveTiles, wantTiles, expires: Date.now() + 90000 };
      r.tradeOffers.push(offer);
      log(r, `${p.name} offers a deal to ${target.name}.`);
      emit(r, 'tradeOffer', p.id, target.id);
      return true;
    }
    const offer = r.tradeOffers.find(t => t.id === a.offer);
    require(offer && offer.expires > Date.now(), 'That offer expired.');
    const o = offer!;
    if (a.type === 'tradeCancel') { require(o.from === p.id, 'Only the sender can cancel.'); r.tradeOffers = r.tradeOffers.filter(t => t.id !== o.id); emit(r, 'tradeCancel', p.id, o.to); return true; }
    require(o.to === p.id, 'Only the recipient can answer this offer.');
    const sender = r.players.find(q => q.id === o.from)!;
    if (a.type === 'tradeAccept') {
      require(!sender.bankrupt && sender.cash >= o.giveCash && p.cash >= o.wantCash, 'Balances changed. Send a fresh offer.');
      require(o.giveTiles.every(i => r.tiles[i].owner === sender.id) && o.wantTiles.every(i => r.tiles[i].owner === p.id), 'Property ownership changed. Send a fresh offer.');
      sender.cash += o.wantCash - o.giveCash; p.cash += o.giveCash - o.wantCash;
      o.giveTiles.forEach(i => r.tiles[i].owner = p.id); o.wantTiles.forEach(i => r.tiles[i].owner = sender.id);
      log(r, `${p.name} accepts ${sender.name}’s deal. Cash and property exchanged!`);
      emit(r, 'tradeAccept', p.id, sender.id, { tiles: [...o.giveTiles, ...o.wantTiles] });
    } else {
      log(r, `${p.name} refuses ${sender.name}’s deal${r.rules.tradeSlaps ? ' and delivers a cartoon slap!' : '.'}`);
      emit(r, r.rules.tradeSlaps ? 'slap' : 'tradeReject', p.id, sender.id);
    }
    r.tradeOffers = r.tradeOffers.filter(t => t.id !== o.id);
    return true;
  }
  if (a.type === 'box' || a.type === 'allowTrump') {
    const clash = r.clash;
    require(r.phase === 'playing' && clash && clash.acePlayer === p.id && Date.now() < clash.expires, 'Only the ace holder can answer this clash.');
    const c = clash!;
    r.clash = undefined;
    if (a.type === 'allowTrump') { commit(r, c.trumpPlayer, c.card); emit(r, 'clashPass', p.id, c.trumpPlayer); }
    else {
      r.duel = { ...c, round: 1, score: [0, 0], ends: Date.now() + 8000, choices: {} };
      log(r, `${p.name} challenges the trump! Best of three: jab beats hook, hook beats block, block beats jab.`);
      emit(r, 'duelStart', c.acePlayer, c.trumpPlayer);
    }
    return true;
  }
  if (a.type === 'punch') {
    const duel = r.duel;
    require(r.phase === 'playing' && duel && [duel.acePlayer, duel.trumpPlayer].includes(p.id), 'You are not in this bout.');
    const d = duel!;
    require(Date.now() < d.ends && !d.choices[p.id], 'Your move is locked for this beat.');
    require(['jab', 'hook', 'block'].includes(String(a.move)), 'Choose jab, hook, or block.');
    d.choices[p.id] = a.move as BoxingMove;
    if (d.choices[d.acePlayer] && d.choices[d.trumpPlayer]) resolveBeat(r, commit);
    return true;
  }
  return false;
}
function resolveBeat(r: Room, commit: Commit) {
  const d = r.duel!;
  const ace = d.choices[d.acePlayer], trump = d.choices[d.trumpPlayer];
  const beats: Record<BoxingMove, BoxingMove> = { jab: 'hook', hook: 'block', block: 'jab' };
  const outcome = ace && !trump ? 0 : trump && !ace ? 1 : ace && trump && ace !== trump ? beats[ace] === trump ? 0 : 1 : -1;
  if (outcome === 0 || outcome === 1) d.score[outcome]++;
  emit(r, 'duelRound', d.acePlayer, d.trumpPlayer, { ace: ace || 'miss', trump: trump || 'miss', outcome, round: d.round });
  log(r, `Boxing beat ${d.round}: ${ace || 'missed move'} vs ${trump || 'missed move'}. Score ${d.score.join(' / ')}.`);
  if (d.round === 3) {
    const aceWins = d.score[0] > d.score[1];
    if (aceWins) r.deniedTrumps.push(d.card.id);
    const winner = aceWins ? d.acePlayer : d.trumpPlayer;
    log(r, `${r.players.find(p => p.id === winner)!.name} wins the bout${d.score[0] === d.score[1] ? ' on the defender’s tie-break' : ''}. ${aceWins ? 'This trump cannot win the trick.' : 'Trump keeps its normal strength.'}`);
    r.duel = undefined;
    commit(r, d.trumpPlayer, d.card);
    emit(r, 'duelEnd', winner, aceWins ? d.trumpPlayer : d.acePlayer, { aceWins });
  } else { d.round++; d.choices = {}; d.ends = Date.now() + 8000; }
}
export function tickInteractions(r: Room, commit: Commit): boolean {
  let changed = false;
  if (r.busyUntil && Date.now() >= r.busyUntil) { r.busyUntil = 0; changed = true; }
  const active = r.tradeOffers.filter(t => t.expires > Date.now());
  if (active.length !== r.tradeOffers.length) { r.tradeOffers = active; changed = true; }
  if (r.clash && Date.now() >= r.clash.expires) {
    const c = r.clash; r.clash = undefined; commit(r, c.trumpPlayer, c.card); emit(r, 'clashPass', c.acePlayer, c.trumpPlayer); changed = true;
  }
  if (r.duel && Date.now() >= r.duel.ends) { resolveBeat(r, commit); changed = true; }
  return changed;
}

