import * as THREE from 'three';
import type {GameScene} from './scene';import type {GameEvent,View} from '../shared/types';
/** Audience props never touch the table, player models, hitboxes or gameplay state. */
export class SpectatorVisuals {
 readonly group=new THREE.Group();private key='';private ghost?:THREE.Group;private body?:THREE.Group;private arms:THREE.Group[]=[];private label?:THREE.Object3D;private state?:View['spectatorGhost'];private offset=0;
 constructor(private s:GameScene){s.scene.add(this.group);}
 update(r?:View){this.offset=(r?.serverNow||Date.now())-Date.now();const g=r?.phase==='playing'?r.spectatorGhost:undefined,key=g&&g.ends>(r?.serverNow||Date.now())?g.actor+':'+g.starts:'';
  this.state=g;if(key===this.key)return;this.s.clear(this.group);this.ghost=undefined;this.key=key;if(!key||!g)return;
  const ghost=new THREE.Group(),body=new THREE.Group();this.ghost=ghost;this.body=body;ghost.add(body);this.arms=[];
  const make=(geo:THREE.BufferGeometry,color:number,x=0,y=0,z=0)=>{const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color,transparent:true,opacity:.76,flatShading:true,depthWrite:false,emissive:0x264b41,emissiveIntensity:.4}));mesh.position.set(x,y,z);return mesh;};
  body.add(make(new THREE.SphereGeometry(.3,8,6),0xc8ffe7,0,.64,0),make(new THREE.CylinderGeometry(.28,.4,.63,8),0xc8ffe7,0,.23,0));
  for(let i=0;i<7;i++){const a=i*Math.PI*2/7;body.add(make(new THREE.ConeGeometry(.12,.25,4),0xc8ffe7,Math.sin(a)*.27,-.14,Math.cos(a)*.27));}
  for(const x of [-.11,.11])body.add(make(new THREE.SphereGeometry(.055,5,4),0x182a2b,x,.67,.255));body.add(make(new THREE.SphereGeometry(.055,5,4),0x324b4a,0,.51,.28));
  for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*.31,.38,0);arm.add(make(new THREE.CylinderGeometry(.075,.1,.4,5),0xb0f5df,side*.12,-.1,0));arm.rotation.z=side*.7;body.add(arm);this.arms.push(arm);}
  this.label=this.s.label(g.name,g.dance==='twerk'?'SURPRISE TWERK!':g.dance.toUpperCase(),'#d4ffe8',1.2,.7);this.label.position.set(0,1.3,0);ghost.add(this.label);this.group.add(ghost);this.frame();
 }
 frame(){const g=this.state,ghost=this.ghost;if(!g||!ghost)return;const now=Date.now()+this.offset,t=(now-g.starts)/1000;if(now>=g.ends){this.s.clear(this.group);this.ghost=undefined;this.key='';return;}
  const envelope=Math.min(1,t*4,(g.ends-now)/250);ghost.scale.setScalar(Math.max(0,envelope));ghost.position.set(0,1.65+Math.sin(t*3)*.09,0);ghost.rotation.y=t*.5;
  const b=this.body!;b.position.set(0,0,0);b.rotation.set(0,0,0);
  if(g.dance==='twerk'){b.rotation.x=.7;b.position.y=-.13+Math.sin(t*22)*.085;b.rotation.z=Math.sin(t*11)*.13;ghost.rotation.y=Math.PI+Math.sin(t*2)*.3;this.arms.forEach((a,i)=>a.rotation.z=(i?1:-1)*1.2);}
  else if(g.dance==='disco'){b.rotation.z=Math.sin(t*7)*.18;this.arms.forEach((a,i)=>a.rotation.z=(i?1:-1)*(.6+Math.sin(t*7+i*Math.PI)*1.1));}
  else{b.position.x=Math.sin(t*9)*.2;b.rotation.z=Math.sin(t*9)*.15;this.arms.forEach((a,i)=>a.rotation.x=Math.sin(t*9+i*Math.PI));}
  this.label?.quaternion.copy(this.s.camera.quaternion);
 }
 play(e:GameEvent){if(e.kind!=='spectatorTomato')return;const target=this.s.actorMap.get(e.target||'');if(!target)return;const a=Number(e.data.seat||0)*2.4+.6,from=new THREE.Vector3(Math.sin(a)*(this.s.radius+1.5),2.5,Math.cos(a)*(this.s.radius+1.5)),to=target.position.clone().add(new THREE.Vector3(0,1.65,0));
  const tomato=new THREE.Group();tomato.add(this.s.mesh(new THREE.IcosahedronGeometry(.14,1),0xe43c32));const leaf=this.s.mesh(new THREE.ConeGeometry(.13,.08,5),0x4e8d48,0,.15,0);tomato.add(leaf);this.s.fx.add(tomato);
  this.s.tween(850,t=>{tomato.position.lerpVectors(from,to,t);tomato.position.y+=Math.sin(t*Math.PI)*1.4;tomato.rotation.set(t*8,t*7,0);},()=>{this.s.remove(tomato);this.s.burst(to,0xea4c3e);const splat=this.s.mesh(new THREE.CircleGeometry(.29,9),0xd93b32);splat.position.copy(to);splat.quaternion.copy(this.s.camera.quaternion);this.s.fx.add(splat);this.s.tween(900,t=>{splat.scale.setScalar(1-t*.3);splat.position.y=to.y-t*.25;},()=>this.s.remove(splat));});
 }
}
