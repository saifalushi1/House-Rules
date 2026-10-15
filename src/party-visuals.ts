import * as THREE from 'three';
import type {GameScene} from './scene';
import type {GameEvent} from '../shared/types';
export class PartyVisuals {
 constructor(private s:GameScene){}
 play(e:GameEvent){const s=this.s;if(e.kind==='charadeTurn'){s.star(e.target);return;}
  if(e.kind==='rooftopJump'){
   const g=s.actorMap.get(e.actor||'');if(!g)return;const from=g.position.clone(),angle=g.userData.baseAngle,edge=new THREE.Vector3(Math.sin(angle)*9.4,-.38,Math.cos(angle)*9.4);
   s.moving.add(e.actor!);s.rooftopShotUntil=performance.now()+7000;s.chaosShotUntil=performance.now()+7000;
   const canopy=new THREE.Group();canopy.add(s.mesh(new THREE.ConeGeometry(.9,.5,8),0xe4b263,0,2.8,0));for(const x of [-.6,.6]){const line=s.mesh(new THREE.CylinderGeometry(.014,.014,1.2,4),0xf3e7c7,x*.5,2.1,0);line.rotation.z=-x*.6;canopy.add(line);}s.fx.add(canopy);canopy.visible=false;
   s.tween(6800,t=>{if(t<.37){const k=t/.37;g.position.lerpVectors(from,edge,k);g.position.y+=Math.abs(Math.sin(k*30))*.12;g.rotation.y=Math.atan2(from.x-edge.x,from.z-edge.z);}else if(t<.62){const k=(t-.37)/.25;g.position.copy(edge);g.position.x+=Math.sin(angle)*k;g.position.z+=Math.cos(angle)*k;g.position.y=-.38+Math.sin(k*Math.PI)*1.1-k*4;g.rotation.z=k*.4;}else{const k=(t-.62)/.38,start=edge.clone().add(new THREE.Vector3(Math.sin(angle),-4,Math.cos(angle)));g.position.lerpVectors(start,from,k);g.position.y+=Math.sin(k*Math.PI)*4.5;g.rotation.z=(1-k)*.4;canopy.visible=true;canopy.position.copy(g.position);canopy.scale.setScalar(Math.min(1,k*8));}g.userData.arms.forEach((arm:THREE.Group)=>arm.rotation.x=t>.37?2.7:.5+Math.sin(t*70)*.5);},()=>{s.remove(canopy);g.position.copy(from);g.rotation.set(0,angle,0);g.userData.arms.forEach((arm:THREE.Group)=>arm.rotation.set(.5,0,0));s.moving.delete(e.actor!);});return;
  }
  if(e.kind==='soreLoserShot'){
   const actor=s.actorMap.get(e.actor||''),target=s.actorMap.get(e.target||'');if(!actor||!target)return;
   s.chaosShotUntil=performance.now()+3200;const cannon=new THREE.Group(),barrel=s.mesh(new THREE.CylinderGeometry(.12,.16,.6,8),0xd591bd);barrel.rotation.x=Math.PI/2;cannon.add(barrel);const start=actor.position.clone().add(new THREE.Vector3(0,1.2,0)),end=target.position.clone().add(new THREE.Vector3(0,1.1,0));cannon.position.copy(start);cannon.lookAt(end);s.fx.add(cannon);
   const ball=s.mesh(new THREE.IcosahedronGeometry(.11,0),0xf2a9dc);s.fx.add(ball);s.tween(650,t=>{ball.position.lerpVectors(start,end,t);ball.position.y+=Math.sin(t*Math.PI)*.2;},()=>{s.remove(ball);s.burst(end,0xef9cce);s.shake=.09;});
   const original=target.position.clone(),yaw=target.userData.baseAngle;s.moving.add(e.target!);s.tween(1900,t=>{const k=Math.sin(t*Math.PI);target.position.copy(original).add(new THREE.Vector3(Math.sin(yaw)*k*.65,-k*.2,Math.cos(yaw)*k*.65));target.rotation.z=k*1.2;},()=>{target.position.copy(original);target.rotation.z=0;s.moving.delete(e.target!);s.remove(cannon);},650);
  }
 }
}
