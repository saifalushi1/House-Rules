import {beginBlackout} from '../server/blackout.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {makeRoom,player,start,view} from '../server/engine.js';
import {scoringAction} from './aim-fixture.js';
import {defaults,type Rules,type Room} from '../shared/types.js';
import {cupPositions} from '../shared/club.js';
import {applyChaosDie} from '../server/chaos.js';
import {ClubVisuals} from '../src/club-visuals.js';

function setup(rules:Partial<Rules>={}){const r=makeRoom('IMPACT','p0');r.rules={...defaults,game:'beerpong',pongBallsBack:false,rooftopAntics:false,soreLoser:false,...rules};r.players=[player('p0','Red',0),player('p1','Blue',1)];start(r);r.busyUntil=0;return r;}
function throwAt(r:Room,cup=0){const pos=cupPositions(r.pong!.cups[1].length)[cup];scoringAction(r,'p0',{type:'pongThrow',...pos,power:.7});return r.events.filter(e=>e.kind==='pongThrow').at(-1)!;}
function visual(r:Room){
 const tweens:{ms:number;step:(t:number)=>void;done?:()=>void}[]=[],stars:string[]=[],bursts:THREE.Vector3[]=[];
 const s:any={game:'beerpong',room:view(r,'p0'),self:0,scene:new THREE.Scene(),pieces:new THREE.Group(),fx:new THREE.Group(),actorMap:new Map(),seatAngle:()=>0,clear:(g:THREE.Group)=>g.clear(),label:()=>new THREE.Group(),mesh:(geometry:THREE.BufferGeometry,color:number,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color}));m.position.set(x,y,z);return m;},tween:(ms:number,step:(t:number)=>void,done?:()=>void)=>tweens.push({ms,step,done}),star:(id:string)=>stars.push(id),burst:(at:THREE.Vector3)=>bursts.push(at.clone()),remove:(o:THREE.Object3D)=>o.removeFromParent()};
 const v=new ClubVisuals(s);v.update(s.room);return{s,v,tweens,stars,bursts};
}
function cups(v:ClubVisuals,team:number){return v.group.children[0].children.filter(c=>c.userData.pongTeam===team).length;}
function finish(tweens:ReturnType<typeof visual>['tweens']){const flight=tweens.find(t=>t.ms===950);assert.ok(flight,'Ball flight must have an impact callback');flight.step(1);flight.done?.();}

test('successful Pong shot keeps the struck cup visible until the ball lands, across room updates',()=>{
 const r=setup(),h=visual(r),e=throwAt(r);assert.equal(r.pong!.cups[1][0],false,'Server scores immediately');
 h.s.room=view(r,'p0');h.v.update(h.s.room);h.v.play(e);assert.equal(cups(h.v,1),6);assert.equal(h.stars.length,0);assert.equal(h.bursts.length,0);
 h.s.room=view(r,'p0');h.v.update(h.s.room);assert.equal(cups(h.v,1),6,'Network updates cannot remove a cup mid-flight');
 h.tweens.find(t=>t.ms===950)!.step(.99);assert.equal(cups(h.v,1),6);finish(h.tweens);assert.equal(cups(h.v,1),5);assert.deepEqual(h.stars,['p0']);assert.equal(h.bursts.length,1);
});
test('double-cup chaos hits remove both cups together at impact',()=>{const r=setup({chaosTableFlip:true});applyChaosDie(r,1);r.busyUntil=0;const h=visual(r),e=throwAt(r);assert.equal((e.data.cupsTaken as number[]).length,2);h.s.room=view(r,'p0');h.v.update(h.s.room);h.v.play(e);assert.equal(cups(h.v,1),6);finish(h.tweens);assert.equal(cups(h.v,1),4);});
test('winning shot preserves the final cup until impact on the results screen',()=>{const r=setup({pongRedemption:false});r.pong!.cups[1]=[true,false,false,false,false,false];const h=visual(r),e=throwAt(r);assert.equal(r.phase,'finished');h.v.reset();h.s.room=view(r,'p0');h.v.update(h.s.room);h.v.play(e);assert.equal(cups(h.v,1),1);finish(h.tweens);assert.equal(cups(h.v,1),0);});
test('redemption overtime reveals the new racks only after the last ball lands',()=>{const r=setup();r.pong!.cups[1]=[true,false,false,false,false,false];r.pong!.redemption=true;r.pong!.pendingWinner=1;const h=visual(r),e=throwAt(r);assert.equal(r.pong!.overtime,1);h.s.room=view(r,'p0');h.v.update(h.s.room);h.v.play(e);assert.equal(cups(h.v,1),1);assert.equal(cups(h.v,0),6);finish(h.tweens);assert.equal(cups(h.v,1),3);assert.equal(cups(h.v,0),3);});
test('misses carry no cup snapshot and resetting a game discards pending impact cups',()=>{const r=setup(),h=visual(r);scoringAction(r,'p0',{type:'pongThrow',x:1.12,y:1.12,power:.7});const miss=r.events.filter(e=>e.kind==='pongThrow').at(-1)!;assert.equal(miss.data.cupsBefore,undefined);h.s.room=view(r,'p0');h.v.update(h.s.room);h.v.play(miss);finish(h.tweens);assert.equal(cups(h.v,1),6);r.busyUntil=0;const e=throwAt(r);h.s.room=view(r,'p0');h.v.update(h.s.room);h.v.play(e);assert.equal(cups(h.v,1),6);h.v.reset();r.pong!.cups=[Array(3).fill(true),Array(3).fill(true)];h.s.room=view(r,'p0');h.v.update(h.s.room);assert.equal(cups(h.v,1),3);});

test('impact snapshots respect Blackout and cannot reveal an unlit opponent’s earlier shot',()=>{const r=setup({chaosTableFlip:true});r.chaos!.blackoutUntil=Date.now()+10000;r.chaos!.blackoutPlayer='p0';beginBlackout(r);r.turn=1;r.pong!.team=1;r.pong!.aimAt=Date.now();const pos=cupPositions(6)[0];scoringAction(r,'p1',{type:'pongThrow',...pos,power:.7});assert.equal(r.pong!.cups[0][0],false);r.busyUntil=0;r.turn=0;r.pong!.team=0;r.pong!.aimAt=Date.now();throwAt(r);const visible=view(r,'p0'),snapshot=visible.events.filter(e=>e.kind==='pongThrow').at(-1)!.data.cupsBefore as boolean[][];assert.ok(snapshot[0].every(Boolean));assert.equal(visible.events.filter(e=>e.kind==='pongThrow').length,1);});
