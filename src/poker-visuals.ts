import * as THREE from 'three';
import type {GameEvent,View} from '../shared/types';
import type {GameScene} from './scene';
export class PokerVisuals {
 group=new THREE.Group();key='';community:THREE.Object3D[]=[];
 constructor(private s:GameScene){s.scene.add(this.group);}
 update(r?:View){const s=this.s,active=s.game==='poker';this.group.visible=active;if(active)s.pieces.visible=false;
  const key=JSON.stringify([s.game,r?.gameInstance,r?.poker,r?.players.map(p=>[p.cash,p.handCount]),r?.chaos?.seats,s.self]);if(key===this.key)return;this.key=key;s.clear(this.group);this.community=[];if(!active)return;
  const g=r?.poker,angle=s.seatAngle(s.self),layout=new THREE.Group();layout.rotation.y=angle;this.group.add(layout);
  for(let i=0;i<5;i++){const c=s.card();c.position.set((i-2)*.46,1.04,-.38);c.scale.setScalar(1.35);c.rotation.x=.24;
   const v=g?.board[i];if(v){const f=s.handFace(String(v.rank===1?'A':v.rank===11?'J':v.rank===12?'Q':v.rank===13?'K':v.rank),v.suit);f.position.y=.012;c.add(f);}else (c.material as THREE.MeshStandardMaterial).color.setHex(0x436454);
   layout.add(c);this.community.push(c);
  }
  const pot=s.label('POT',String(g?.pot||g?.lastPot||0),'#f4d08a',.7,.52);pot.position.set(0,1.01,.3);layout.add(pot);
  const players=r?.players||[];players.forEach((p,i)=>{const a=s.seatAngle(i),seat=g?.seats.find(x=>x.id===p.id);
   for(let j=0;j<Math.min(8,Math.ceil(p.cash/150));j++)this.group.add(s.mesh(new THREE.CylinderGeometry(.12,.12,.035,12),j%2?0xe4c580:p.color,Math.sin(a+.32)*1.8,1.0+j*.037,Math.cos(a+.32)*1.8));
   if(seat&&!seat.folded&&p.handCount)for(let j=0;j<2;j++){if(i===s.self)continue;const c=s.card();const shown=g?.revealed.find(v=>v.player===p.id)?.cards[j];if(shown){const f=s.handFace(String(shown.rank===1?'A':shown.rank===11?'J':shown.rank===12?'Q':shown.rank===13?'K':shown.rank),shown.suit);f.position.y=.012;c.add(f);c.userData.pokerReveal=true;}else (c.material as THREE.MeshStandardMaterial).color.setHex(0x58798c);c.position.set(Math.sin(a)*1.4+Math.cos(a)*(j-.5)*.22,1.01,Math.cos(a)*1.4-Math.sin(a)*(j-.5)*.22);c.rotation.y=a;this.group.add(c);}
   if(g?.dealer===i){const d=s.mesh(new THREE.CylinderGeometry(.15,.15,.035,16),0xf3e4b8,Math.sin(a+.18)*1.95,1.02,Math.cos(a+.18)*1.95),t=s.label('D','','#284a3c',.25,.25);t.position.y=.023;d.add(t);this.group.add(d);}
   if(seat?.bet){const t=s.label(String(seat.bet),'BET','#e5c57e',.48,.4);t.position.set(Math.sin(a)*1.03,1.03,Math.cos(a)*1.03);t.rotation.z=-a;this.group.add(t);}
  });
 }
 chips(actor:string|undefined,toPot:boolean,count=6,delay=0){const s=this.s,seat=s.actorMap.get(actor||''),a=seat?.userData.baseAngle||0;
  for(let i=0;i<count;i++){const c=s.mesh(new THREE.CylinderGeometry(.1,.1,.035,12),i%2?0xe7be70:0x82a593),from=new THREE.Vector3(Math.sin(a)*1.65,1.1,Math.cos(a)*1.65),to=new THREE.Vector3((i%3-1)*.14,1.08+Math.floor(i/3)*.04,.35);s.fx.add(c);s.tween(600,t=>{c.position.lerpVectors(toPot?from:to,toPot?to:from,t);c.position.y+=Math.sin(Math.PI*t)*.6;c.rotation.z=t*7;},()=>s.remove(c),delay+i*45);}
 }
 play(e:GameEvent){const s=this.s;if(e.kind==='pokerAction'){if(e.data.move==='fold')s.fly(e.actor,false,2);else if(Number(e.data.amount)>0)this.chips(e.actor,true);else{const g=s.actorMap.get(e.actor||'');if(g){const arm=g.userData.arms[0] as THREE.Group;s.tween(500,t=>arm.rotation.x=.5+Math.sin(t*Math.PI*4)*.35,()=>arm.rotation.x=.5);}}}
  if(e.kind==='pokerStreet'){for(const c of this.community.slice(Number(e.data.boardCount)-Number(e.data.count),Number(e.data.boardCount))){const base=c.position.clone();s.tween(650,t=>{c.position.copy(base);c.position.y+=Math.sin(t*Math.PI)*.45;c.rotation.z=(1-t)*Math.PI;},()=>{c.position.copy(base);c.rotation.z=0;});}}
  if(e.kind==='pokerWin'){for(const c of this.group.children.filter(c=>c.userData.pokerReveal))s.tween(550,t=>c.rotation.z=(1-t)*Math.PI,()=>c.rotation.z=0);for(const p of (e.data.payouts||[]) as {player:string}[]){this.chips(p.player,false,8,300);s.star(p.player);}}
 }
}
