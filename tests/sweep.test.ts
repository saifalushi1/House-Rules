import {test} from 'node:test';import assert from 'node:assert/strict';
import {act,makeRoom,player,start,view,tick} from '../server/engine.js';
import {defaults,type Game} from '../shared/types.js';
import {aimWave,aimPeriods,sweepAim,dartBoardPoint} from '../shared/club.js';
import {clubPlay} from '../src/club-ui.js';
function setup(game:Game){const r=makeRoom('SWEEP','p0');r.rules={...defaults,game,rooftopAntics:false};r.players=[player('p0','One',0),player('p1','Two',1)];start(r);return r;}
test('fast sweeps span the whole target, hold vertical height and keep constant speed',()=>{assert.equal(aimWave(0,820),-1.12);assert.equal(aimWave(205,820),0);assert.equal(aimWave(410,820),1.12);assert.equal(aimWave(615,820),0);assert.equal(aimWave(820,820),-1.12);assert.ok(aimPeriods.vertical<1000&&aimPeriods.horizontal<aimPeriods.vertical);assert.deepEqual(sweepAim({aimAt:0,aimLock:{y:.4,at:1000}},1170),{x:0,y:.4});});
for(const game of ['darts','beerpong'] as const){
 test(game+' requires vertical then horizontal timing and ignores forged target coordinates',t=>{let now=10000;t.mock.method(Date,'now',()=>now);const r=setup(game),g=r.darts||r.pong!,prefix=game==='darts'?'dart':'pong',packet=()=>({gameInstance:r.gameInstance,aimAt:g.aimAt,at:now});
  assert.throws(()=>act(r,'p0',{type:prefix+'Throw',x:0,y:0,power:.7}),/changed/);
  now+=205;assert.throws(()=>act(r,'p0',{type:prefix+'Throw',...packet()}),/height/);
  act(r,'p0',{type:prefix+'LockHeight',...packet(),y:1});assert.equal(g.aimLock!.y,0);
  assert.throws(()=>act(r,'p0',{type:prefix+'LockHeight',...packet()}),/already locked/);
  assert.throws(()=>act(r,'p0',{type:prefix+'Throw',...packet()}),/height/);
  now+=170;act(r,'p0',{type:prefix+'Throw',...packet(),x:1.12,y:1.12,power:0});
  const hit=(r.darts?.recent||r.pong?.recent)!.at(-1)!;assert.ok(Math.abs(hit.x)<.01&&Math.abs(hit.y)<.01);assert.equal(g.aimLock,undefined);
  assert.throws(()=>act(r,'p0',{type:prefix+'Throw',...packet()}));
 });
 test(game+' rejects wrong players, forged clocks and stale throw instances without changing locks',t=>{let now=10000;t.mock.method(Date,'now',()=>now);const r=setup(game),g=r.darts||r.pong!,type=game==='darts'?'dartLockHeight':'pongLockHeight';now+=205;const packet={type,gameInstance:r.gameInstance,aimAt:g.aimAt,at:now};assert.throws(()=>act(r,'p1',packet));assert.throws(()=>act(r,'p0',{...packet,gameInstance:r.gameInstance-1}));assert.throws(()=>act(r,'p0',{...packet,aimAt:g.aimAt-1}));assert.throws(()=>act(r,'p0',{...packet,at:now-1000}));assert.throws(()=>act(r,'p0',{...packet,at:now+1000}));assert.equal(g.aimLock,undefined);});
 test(game+' keeps timeouts and Hot Potato functional without timing input',t=>{let now=10000;t.mock.method(Date,'now',()=>now);const r=setup(game),g=r.darts||r.pong!;now=g.ends+1;tick(r);assert.equal((r.darts?.recent||r.pong?.recent)!.length,1);assert.equal(g.aimLock,undefined);});
 test(game+' renders compact status instead of a duplicate target or power panel',()=>{const r=setup(game),html=clubPlay(view(r,'p0'),'p0');assert.ok(html.includes('aim-summary'));assert.ok(!html.includes('<svg')&&!html.includes('type="range"')&&!html.includes('data-club="dartThrow"')&&!html.includes('data-club="pongThrow"'));});
}
test('darts trajectory uses the physical face tilt and inverts screen-down height',()=>{const top=dartBoardPoint(0,-1),bottom=dartBoardPoint(0,1);assert.ok(top.y>bottom.y);assert.ok(top.z<bottom.z);});
