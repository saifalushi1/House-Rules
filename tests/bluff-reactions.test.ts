import test from 'node:test';
import assert from 'node:assert/strict';
import {act,makeRoom,player,start,tick,view} from '../server/engine';
function setup(){const r=makeRoom('TEST','p0');r.players=Array.from({length:3},(_,i)=>player('p'+i,'Player '+i,i));r.rules.allowPeeking=true;start(r);return r;}
test('only the peeked-at player can slap within two seconds; cooldown lasts eight subsequent plays',()=>{
 const r=setup();act(r,'p0',{type:'peek',target:'p1'});
 assert.ok(r.players[0].catchUntil-Date.now()<=2000);
 assert.throws(()=>act(r,'p2',{type:'catch',target:'p0'}));
 act(r,'p1',{type:'catch',target:'p0'});
 assert.equal(r.players[0].peekBlockedUntil,8);assert.equal(r.players[0].peekingUntil,0);
 assert.ok(r.events.some(e=>e.kind==='slap'&&e.actor==='p1'&&e.target==='p0'));
 for(let i=0;i<8;i++){
   assert.throws(()=>act(r,'p0',{type:'peek',target:'p1'}));
   const p=r.players[r.turn];act(r,p.id,{type:'play',cards:[p.hand[0].id],claim:r.claim});
   r.lastPlay!.expires=Date.now()-1;tick(r);
 }
 assert.equal(r.bluffPlays,8);assert.equal(act(r,'p0',{type:'peek',target:'p1'})?.peek,undefined);
});
test('late slap is rejected and repeated peeks cannot reset the reaction deadline',()=>{
 const r=setup();act(r,'p0',{type:'peek',target:'p1'});const deadline=r.players[0].catchUntil;
 assert.throws(()=>act(r,'p0',{type:'peek',target:'p2'}));assert.equal(r.players[0].catchUntil,deadline);
 r.players[0].catchUntil=Date.now()-1;assert.throws(()=>act(r,'p1',{type:'catch',target:'p0'}));
 assert.ok(r.players[0].peekingUntil>Date.now());assert.equal(r.players[0].peekBlockedUntil,0);
});
test('both bluff outcomes preserve the next seat and reveal only challenged cards in the effect',()=>{
 for(const truthful of [true,false]){const r=setup();r.players[1].hand=[{id:'played',rank:truthful?1:9,suit:'♠'},{id:'private',rank:6,suit:'♥'}];r.turn=1;
 r.pile=[{id:'older',rank:5,suit:'♣'}];act(r,'p1',{type:'play',cards:['played'],claim:1});assert.equal(r.turn,2);
 act(r,'p0',{type:'challenge'});assert.equal(r.turn,2);const e=r.events.at(-1)!;
 assert.equal(e.kind,'challenge');assert.equal(e.data.liar,!truthful);assert.equal(e.data.count,2);assert.equal(e.data.loser,truthful?'p0':'p1');
 assert.deepEqual((e.data.cards as {id:string}[]).map(c=>c.id),['played']);assert.ok(!JSON.stringify(view(r,'p2')).includes('private'));
 }
});
test('restart clears peek reaction and cooldown',()=>{const r=setup();act(r,'p0',{type:'peek',target:'p1'});act(r,'p1',{type:'catch',target:'p0'});act(r,'p0',{type:'restart'});assert.equal(r.bluffPlays,0);assert.equal(r.players[0].peekBlockedUntil,0);assert.equal(r.players[0].catchUntil,0);});
test('peek expiration clears the lean and prompts a state broadcast',()=>{const r=setup();act(r,'p0',{type:'peek',target:'p1'});r.players[0].peekingUntil=Date.now()-1;assert.equal(tick(r),true);assert.equal(r.players[0].peekTarget,undefined);assert.equal(r.players[0].catchUntil,0);assert.equal(r.players[0].peekingUntil,0);});
