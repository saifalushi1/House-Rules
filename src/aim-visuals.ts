import {chaosAimSpeed} from '../shared/chaos-policy';
import * as THREE from 'three';
import type {Action} from '../shared/types';
import {dartBoardPoint,pongRackPosition,sweepAim,throwArcLift} from '../shared/club';
import type {GameScene} from './scene';

/** Aiming lives in the scene; only the two timing locks are clickable. */
export class AimVisuals {
 readonly dots:THREE.InstancedMesh;
 readonly reticle:THREE.Mesh;
 readonly overlay:HTMLDivElement;
 readonly button:HTMLButtonElement;
 private hint:HTMLElement;
 private offset=0;
 private lastServerTime=0;
 private pending='';
 private pendingUntil=0;
 private matrix=new THREE.Matrix4();
 private lastActor='';

 constructor(private s:GameScene,private el:HTMLElement){
  this.dots=new THREE.InstancedMesh(new THREE.SphereGeometry(.023,6,4),new THREE.MeshBasicMaterial({color:0xffe2a0,depthTest:true}),30);
  this.dots.frustumCulled=false;this.dots.visible=false;s.scene.add(this.dots);
  this.reticle=new THREE.Mesh(new THREE.TorusGeometry(.065,.007,5,24),new THREE.MeshBasicMaterial({color:0xffe2a0}));
  this.reticle.visible=false;s.scene.add(this.reticle);
  this.overlay=document.createElement('div');this.overlay.className='world-throw-control';this.overlay.hidden=true;
  this.button=document.createElement('button');this.button.className='world-throw-button';this.button.type='button';
  this.button.dataset.aimLock='true';this.hint=document.createElement('small');this.hint.className='world-throw-hint';
  this.overlay.append(this.button,this.hint);el.parentElement!.append(this.overlay);
  this.button.addEventListener('click',e=>{e.stopPropagation();this.lock();});
 }

 private state(){const r=this.s.room;return r?.rules.game==='darts'?r.darts:r?.rules.game==='beerpong'?r.pong:undefined;}
 private key(){const r=this.s.room,g=this.state();return r&&g?`${r.gameInstance}:${g.aimAt}:${g.aimLock?.at||0}`:'';}
 private lock(){
  const r=this.s.room,g=this.state(),now=Date.now()+this.offset;
  if(!r||r.spectating||!g||this.button.disabled||r.players[r.turn]?.id!==r.players[this.s.self]?.id)return;
  this.pending=this.key();this.pendingUntil=Date.now()+1200;
  const type=r.rules.game==='darts'?(g.aimLock?'dartThrow':'dartLockHeight'):(g.aimLock?'pongThrow':'pongLockHeight');
  this.s.onAim?.({type,aimAt:g.aimAt,gameInstance:r.gameInstance,at:now} as Action);
  this.button.disabled=true;
 }

 frame(){
  const s=this.s,r=s.room,g=this.state(),time=Date.now();
  if(r?.serverNow&&r.serverNow!==this.lastServerTime){this.offset=r.serverNow-time;this.lastServerTime=r.serverNow;}
  const now=time+this.offset,actorId=r?.players[r.turn]?.id,actor=s.actorMap.get(actorId||''),mine=!r?.spectating&&actorId===r?.players[s.self]?.id;
  const visible=!!r&&!!g&&!!actor&&r.phase==='playing'&&!r.raid&&!r.chaos?.vote&&r.busyUntil<=now&&g.ends>now;
  const concealed=r?.blackoutHidden&&!mine&&actorId!==r.chaos?.blackoutPlayer;
  this.dots.visible=this.reticle.visible=visible&&!concealed;
  this.overlay.hidden=!visible||!mine;
  if(!visible||!g||!r||!actor)return;
  const pong=r.rules.game==='beerpong',aim=sweepAim(g,now,chaosAimSpeed(r.rules,r.chaos)),point=pong?pongRackPosition(1-r.pong!.team,aim.x,aim.y):dartBoardPoint(aim.x,aim.y);
  const end=new THREE.Vector3(point.x,point.y,point.z),from=actor.position.clone().add(new THREE.Vector3(0,1.58,0));
  from.add(end.clone().sub(from).setY(0).normalize().multiplyScalar(.33));
  const color=g.aimLock?0x9be5d0:0xffdf9a;
  (this.dots.material as THREE.MeshBasicMaterial).color.setHex(color);(this.reticle.material as THREE.MeshBasicMaterial).color.setHex(color);
  for(let i=0;i<30;i++){const t=(i+1)/30,v=from.clone().lerp(end,t);v.y+=Math.sin(Math.PI*t)*throwArcLift(pong,aim.y);this.matrix.makeTranslation(v.x,v.y,v.z);this.dots.setMatrixAt(i,this.matrix);}
  this.dots.instanceMatrix.needsUpdate=true;this.reticle.position.copy(end);this.reticle.rotation.set(pong?-Math.PI/2:Math.PI/2-.72,0,0);
  if(this.lastActor&&this.lastActor!==actorId){const previous=s.actorMap.get(this.lastActor);previous?.userData.arms?.forEach((arm:THREE.Group)=>arm.rotation.set(.5,0,0));}
  this.lastActor=actorId||'';
  const arm=actor.userData.arms?.[0] as THREE.Group|undefined;if(arm){arm.rotation.x=1.25-aim.y*.18;arm.rotation.z=.24;}
  if(!mine)return;
  const pending=this.pending===this.key()&&time<this.pendingUntil;
  this.button.disabled=pending||now<(g.aimLock?.at||g.aimAt)+80;
  this.button.textContent=pending?'Locking…':g.aimLock?'Throw · lock direction ↔':'Lock height ↕';
  this.button.dataset.aimStep=g.aimLock?'horizontal':'vertical';
  this.hint.textContent=g.aimLock?'2 / 2 · Time the horizontal sweep':'1 / 2 · Time the vertical sweep';
  const anchor=actor.position.clone().add(new THREE.Vector3(0,1.3,0)).project(s.camera),box=this.el.getBoundingClientRect(),parent=this.el.parentElement!.getBoundingClientRect();
  const x=Math.max(100,Math.min(box.width-115,(anchor.x+1)*box.width/2+85)),y=Math.max(115,Math.min(box.height-145,(-anchor.y+1)*box.height/2));
  this.overlay.style.left=(x+box.left-parent.left)+'px';this.overlay.style.top=(y+box.top-parent.top)+'px';
 }
}
