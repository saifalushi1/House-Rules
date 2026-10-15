import {test} from 'node:test';
import assert from 'node:assert/strict';
import {act,makeRoom,player,start,tick,view} from '../server/engine.js';
import {chaosAfter,chaosBefore} from '../server/chaos.js';
import {defaults,type Game,type Rules} from '../shared/types.js';
function room(game:Game='bluff',rules:Partial<Rules>={},n=3){const r=makeRoom('DARK','p0');r.players=Array.from({length:n},(_,i)=>player('p'+i,'Player '+i,i));r.rules={...defaults,game,...rules};if(game==='trivia')r.triviaMaster='p0';start(r);r.busyUntil=0;return r;}

test('Double or Nothing is chance-based and ordinary card plays do not wager bonus tallies',()=>{
 const r=room('cards',{chaosDouble:true,chaosDoublePercent:0});const count=r.players[0].hand.length;act(r,'p0',{type:'draw'});assert.equal(r.players[0].hand.length,count+1);assert.equal(r.events.some(e=>e.kind==='chaosCoin'),false);
 const s=room('trivia',{chaosDouble:true,chaosDoublePercent:0});const before=chaosBefore(s);s.players[1].score=5;chaosAfter(s,before);assert.equal(s.players[1].score,5);assert.equal(s.events.some(e=>e.kind==='chaosCoin'),false);
});
test('Bluff coin outcomes change real pickup amounts before victory checks and preserve unique IDs',()=>{
 for(let i=0;i<30;i++){const r=room('bluff',{chaosDouble:true,chaosDoublePercent:100});const card=r.players[0].hand.find(c=>c.rank!==r.claim)!;act(r,'p0',{type:'play',cards:[card.id],claim:r.claim});const before=r.players[0].hand.length;act(r,'p1',{type:'challenge'});const event=r.events.find(e=>e.kind==='chaosCoin')!;assert.ok(event);assert.equal(event.data.cards,true);assert.equal(r.players[0].hand.length,before+(event.data.won?2:0));assert.equal(r.phase,'playing');assert.equal(r.turn,1);const all=[...r.players.flatMap(p=>p.hand),...r.deck,...r.pile];assert.equal(new Set(all.map(c=>c.id)).size,all.length);assert.equal(all.length,event.data.won?53:52);}
});
test('Blackout keeps one spotlight and conceals unlit Bluff plays in every observer channel',t=>{
 let now=10000;t.mock.method(Date,'now',()=>now);const r=room('bluff',{chaosBlackout:true,chaosRandomPercent:100,challengeSeconds:5});const spotlight=r.chaos!.blackoutPlayer;assert.equal(spotlight,'p0');
 act(r,'p0',{type:'play',cards:[r.players[0].hand[0].id],claim:r.claim});assert.equal(r.chaos!.blackoutPlayer,spotlight);assert.ok(view(r,'p2').events.some(e=>e.kind==='play'&&e.actor==='p0'));assert.equal(view(r,'p2').pileCount,1);
 now+=5001;tick(r);const oldCount=view(r,'p2').players[1].handCount;const eventBefore=r.eventSequence,messageBefore=r.messageSequence;
 act(r,'p1',{type:'play',cards:[r.players[1].hand[0].id],claim:r.claim});
 for(const observer of ['p0','p2']){const v=view(r,observer);assert.equal(v.players[1].handCount,oldCount);assert.equal(v.pileCount,1);assert.equal(v.lastPlay!.hidden,true);assert.equal(v.lastPlay!.count,0);assert.equal(v.lastPlay!.player,'');assert.ok(v.events.every(e=>e.id<=eventBefore));assert.ok(v.messages.every(m=>m.id<=messageBefore));assert.ok(!v.log.some(x=>x.startsWith('Player 1 claims')));assert.equal(v.chaos!.blackoutPlayer,spotlight);assert.equal(v.chaos!.blackoutUntil,20000);}
 const self=view(r,'p1');assert.equal(self.hand.length,oldCount-1);assert.equal(self.lastPlay!.hidden,undefined);assert.ok(self.events.some(e=>e.id>eventBefore));
 act(r,'p1',{type:'chat',text:'Can you see me?'});assert.ok(view(r,'p2').messages.some(m=>m.text.includes('Can you see me?')));
 now=20001;tick(r);const restored=view(r,'p2');assert.equal(restored.blackoutHidden,undefined);assert.equal(restored.players[1].handCount,oldCount-1);assert.ok(!restored.events.some(e=>e.id>eventBefore&&e.kind==='play'&&e.actor==='p1'));assert.ok(!restored.messages.some(m=>m.text.startsWith('Player 1 claims')));
 act(r,'p0',{type:'restart'});assert.ok(!view(r,'p2').messages.some(m=>m.text.startsWith('Player 1 claims')));
});
test('a hidden Bluff play can still be challenged without exposing its claim/count beforehand',t=>{
 let now=10000;t.mock.method(Date,'now',()=>now);const r=room('bluff',{chaosBlackout:true,chaosRandomPercent:100,challengeSeconds:5});act(r,'p0',{type:'play',cards:[r.players[0].hand[0].id],claim:r.claim});now+=5001;tick(r);act(r,'p1',{type:'play',cards:[r.players[1].hand[0].id],claim:r.claim});assert.equal(view(r,'p2').lastPlay!.hidden,true);act(r,'p2',{type:'challenge'});assert.equal(r.lastPlay,undefined);assert.equal(r.turn,2);assert.ok(!view(r,'p0').events.some(e=>e.kind==='challenge'&&e.actor==='p2'));
});
test('peek reaction lasts exactly one second and cannot reveal cards before the server reveal tick',t=>{
 let now=10000;t.mock.method(Date,'now',()=>now);for(const game of ['bluff','cards','tarneeb','poker'] as Game[]){const r=room(game,{allowPeeking:true},4);act(r,'p0',{type:'peek',target:'p1'});assert.equal(r.players[0].catchUntil-now,1000);now+=999;assert.equal(view(r,'p0').peek,undefined);now++;assert.throws(()=>act(r,'p1',{type:'catch',target:'p0'}));assert.equal(view(r,'p0').peek,undefined);tick(r);assert.ok(view(r,'p0').peek?.length);assert.equal(r.players[0].peekingUntil-now,4000);}
});

test('spotlight chat cannot reveal a pile removed by an earlier hidden challenge',t=>{
 let now=10000;t.mock.method(Date,'now',()=>now);const r=room('bluff',{chaosBlackout:true,chaosRandomPercent:100,challengeSeconds:5});act(r,'p0',{type:'play',cards:[r.players[0].hand[0].id],claim:r.claim});now+=5001;tick(r);act(r,'p1',{type:'play',cards:[r.players[1].hand[0].id],claim:r.claim});act(r,'p2',{type:'challenge'});assert.equal(view(r,'p0').pileCount,1);act(r,'p0',{type:'chat',text:'Still dark'});assert.equal(view(r,'p0').pileCount,1);assert.equal(view(r,'p2').pileCount,1);
});
test('unlit chat remains readable without revealing the accompanying banned-word penalty',()=>{
 const r=room('cards',{chaosBlackout:true,chaosRandomPercent:100,chaosBanned:true,chaosWords:'secret'});act(r,'p1',{type:'chat',text:'secret'});const observer=view(r,'p2');assert.ok(observer.messages.some(m=>m.text==='Player 1: secret'));assert.ok(!observer.messages.some(m=>m.text.includes('Banned word')));assert.ok(!observer.events.some(e=>e.kind==='chaosPenalty'&&e.actor==='p1'));
});
