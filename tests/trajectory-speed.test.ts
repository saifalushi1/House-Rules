import {test} from 'node:test';import assert from 'node:assert/strict';
import {act,makeRoom,player,start,validateRules} from '../server/engine.js';
import {defaults} from '../shared/types.js';import {sweepAim} from '../shared/club.js';
import {clubSettings} from '../src/club-ui.js';
test('speed settings validate bounds, preserve independent values and default older rules to 1x',()=>{
 const {dartsAimSpeed:_,pongAimSpeed:__,...old}=defaults;const r=validateRules(old);assert.equal(r.dartsAimSpeed,1);assert.equal(r.pongAimSpeed,1);
 const custom=validateRules({...defaults,dartsAimSpeed:.25,pongAimSpeed:2.75});assert.equal(custom.dartsAimSpeed,.25);assert.equal(custom.pongAimSpeed,2.75);
 for(const key of ['dartsAimSpeed','pongAimSpeed'])for(const value of [0,.24,3.01,NaN,Infinity,'2'])assert.throws(()=>validateRules({...defaults,[key]:value}));
});
test('the multiplier scales both sweeps without changing the locked height',()=>{
 const g={aimAt:1000};assert.deepEqual(sweepAim(g,1410,.5),sweepAim(g,1205,1));assert.deepEqual(sweepAim(g,1102.5,2),sweepAim(g,1205,1));
 const locked={aimAt:1000,aimLock:{y:.43,at:2000}};assert.deepEqual(sweepAim(locked,2340,.5),sweepAim(locked,2170,1));assert.equal(sweepAim(locked,2200,3).y,.43);
});
test('each game shows its own locked-or-editable speed slider',()=>{
 for(const game of ['darts','beerpong'] as const){const key=game==='darts'?'dartsAimSpeed':'pongAimSpeed',other=game==='darts'?'pongAimSpeed':'dartsAimSpeed';const r={...defaults,game,[key]:1.75};const html=clubSettings(r,false);assert.ok(html.includes('Trajectory speed'));assert.ok(html.includes('1.75×'));assert.ok(html.includes('data-rule="'+key+'"'));assert.ok(!html.includes('data-rule="'+other+'"'));assert.ok(clubSettings(r,true).includes('value="1.75" disabled'));}
});
test('server height and direction locks match the selected game speed at slow and fast settings',t=>{
 let now=10000;t.mock.method(Date,'now',()=>now);
 for(const game of ['darts','beerpong'] as const)for(const speed of [.25,.5,2,3]){
  now+=10000;const r=makeRoom('SPEED','p0');r.rules={...defaults,game,dartsAimSpeed:game==='darts'?speed:1,pongAimSpeed:game==='beerpong'?speed:1,rooftopAntics:false};r.players=[player('p0','One',0),player('p1','Two',1)];start(r);
  const g=r.darts||r.pong!,prefix=game==='darts'?'dart':'pong',packet=()=>({gameInstance:r.gameInstance,aimAt:g.aimAt,at:now});
  now+=615/speed;act(r,'p0',{type:prefix+'LockHeight',...packet()});assert.ok(Math.abs(g.aimLock!.y)<1e-8);
  now+=510/speed;act(r,'p0',{type:prefix+'Throw',...packet()});const hit=(r.darts?.recent||r.pong?.recent)!.at(-1)!;assert.ok(Math.abs(hit.x)<.01&&Math.abs(hit.y)<.01);
 }
});
