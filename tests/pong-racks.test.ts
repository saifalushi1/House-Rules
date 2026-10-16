import {scoringAction as act} from './aim-fixture.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {makeRoom,player,start,view} from '../server/engine.js';
import {defaults,type GameEvent} from '../shared/types.js';
import {cupPositions,pongRackPosition} from '../shared/club.js';
import {ClubVisuals} from '../src/club-visuals.js';
import {clubPlay} from '../src/club-ui.js';

function room(){const r=makeRoom('PONG','p0');r.rules={...defaults,game:'beerpong',pongBallsBack:false};r.players=[player('p0','Red',0),player('p1','Blue',1)];start(r);return r;}

test('opponents remove cups from different racks and events retain their target after the turn advances',t=>{
 t.mock.method(Date,'now',()=>10000);const r=room(),pos=cupPositions(6)[0];
 act(r,'p0',{type:'pongThrow',...pos,power:.7});
 assert.equal(r.pong!.cups[1][0],false);assert.equal(r.pong!.cups[0][0],true);
 r.busyUntil=0;act(r,'p0',{type:'pongThrow',x:1.2,y:1.2,power:.7});
 assert.equal(r.pong!.team,1);
 r.busyUntil=0;act(r,'p1',{type:'pongThrow',...pos,power:.7});
 assert.equal(r.pong!.cups[0][0],false);
 const events=r.events.filter(e=>e.kind==='pongThrow');
 assert.deepEqual(events.map(e=>e.data.targetTeam),[1,1,0]);
 assert.deepEqual(events.map(e=>e.data.team),[0,0,1]);
});

test('cup racks and ball landings use identical world coordinates for both viewers and shuffled seats',()=>{
 const r=room(),pos=cupPositions(6)[1];
 for(const viewer of [0,1])for(const shuffled of [false,true]){
  const mesh=(geometry:THREE.BufferGeometry,color:number,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color}));m.position.set(x,y,z);return m;};
  const s:any={game:'beerpong',room:view(r,'p'+viewer),self:viewer,scene:new THREE.Scene(),pieces:new THREE.Group(),fx:new THREE.Group(),actorMap:new Map(),seatAngle:(i:number)=>(shuffled?1-i:i)*Math.PI,clear:(g:THREE.Group)=>g.clear(),label:()=>new THREE.Group(),mesh,tween:(_ms:number,step:(t:number)=>void)=>step(1),star:()=>{},burst:()=>{}};
  const visuals=new ClubVisuals(s);visuals.update(s.room);const layout=visuals.group.children[0];
  assert.equal(layout.rotation.y,0,'The viewer must not rotate the shared racks.');
  for(const throwingTeam of [0,1]){
   const target=1-throwingTeam,rim=pongRackPosition(target,pos.x,pos.y),cup=layout.children.find(c=>c.userData.pongTeam===target&&c.userData.pongCup===1)!;
   assert.ok(cup);assert.equal(cup.position.x,rim.x);assert.equal(cup.position.z,rim.z);
   assert.equal(Math.sign(cup.position.z),target===0?1:-1);
   s.fx.clear();visuals.play({id:1,at:Date.now(),kind:'pongThrow',actor:'p'+throwingTeam,data:{team:throwingTeam,targetTeam:target,x:pos.x,y:pos.y,hit:true}} as GameEvent);
   const ball=s.fx.children[0];assert.ok(ball.position.distanceTo(new THREE.Vector3(rim.x,rim.y,rim.z))<1e-9,'Ball must land at the opposing cup rim in every client.');
   s.fx.clear();visuals.play({id:2,at:Date.now(),kind:'pongThrow',actor:'p'+throwingTeam,data:{team:throwingTeam,x:pos.x,y:pos.y,hit:true}} as GameEvent);
   assert.ok(s.fx.children[0].position.distanceTo(new THREE.Vector3(rim.x,rim.y,rim.z))<1e-9,'Existing event payloads remain compatible.');
  }
 }
});

test('compact status identifies the opponent without a separate aiming panel',()=>{const r=room();let html=clubPlay(view(r,'p0'),'p0');assert.ok(html.includes('Target: Team 2 · blue cups'));r.pong!.team=1;r.turn=1;html=clubPlay(view(r,'p1'),'p1');assert.ok(html.includes('Target: Team 1 · red cups'));assert.ok(!html.includes('<svg'));});
