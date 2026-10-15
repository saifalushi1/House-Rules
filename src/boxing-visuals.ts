import * as THREE from 'three';
import type {GameScene} from './scene';
/** The whole room watches each synchronized, server-timed boxing beat. */
export class BoxingVisuals {
 ring=new THREE.Group();private active=false;private arenaLight=new THREE.HemisphereLight(0xffedd1,0x243345,2.5);
 constructor(private s:GameScene){
  this.ring.add(this.arenaLight,s.mesh(new THREE.BoxGeometry(40,.16,40),0x1f2d39,0,-.54,0));
  this.ring.add(s.mesh(new THREE.BoxGeometry(8,.28,8),0x354858,0,-.18,0));
  this.ring.add(s.mesh(new THREE.BoxGeometry(7.5,.035,7.5),0xd6cba7,0,-.02,0));
  for(const x of [-3.7,3.7])for(const z of [-3.7,3.7]){this.ring.add(s.mesh(new THREE.CylinderGeometry(.1,.1,2.6,8),x<0?0xb55d50:0x527fac,x,1.18,z));}
  for(const y of [.65,1.15,1.65])for(const side of [-1,1]){
   const front=s.mesh(new THREE.CylinderGeometry(.035,.035,7.4,6),0xe9d8b5,0,y,side*3.7);front.rotation.z=Math.PI/2;this.ring.add(front);
   const rail=s.mesh(new THREE.CylinderGeometry(.035,.035,7.4,6),0xe9d8b5,side*3.7,y,0);rail.rotation.x=Math.PI/2;this.ring.add(rail);
  }
  const logo=s.label('HOUSE RULES','BOXING CLUB','#41586a',2.8,2);logo.position.set(0,.01,0);this.ring.add(logo);this.ring.visible=false;s.scene.add(this.ring);
 }
 update(){
  const s=this.s,d=s.room?.phase==='playing'?s.room.raid:undefined,on=!!d&&d.phase!=='offer';
  this.ring.visible=on;if(on)this.arenaLight.intensity=2.5;if(!on&&!this.active)return;this.active=on;
  s.environment.group.visible=!on;s.group.visible=!on;s.pieces.visible=!on&&!s.room?.solitaire&&s.game!=='rpg';s.tokens.visible=!on&&!s.room?.solitaire&&s.game!=='rpg';s.dice.visible=!on;s.expansionFX.group.visible=!on;s.pokerFX.group.visible=!on;s.clubFX.group.visible=!on&&['werewolf','blackjack','darts','beerpong'].includes(s.game);
  if(!on){s.actorKey='';s.handKey='';return;}s.ownHand.visible=false;
  const fighters=[d!.from,d!.to],spectators=[...s.actorMap.keys()].filter(id=>!fighters.includes(id));
  for(const [id,g] of s.actorMap){g.visible=true;g.userData.chairParts.forEach((o:THREE.Object3D)=>o.visible=false);g.rotation.set(0,0,0);const side=fighters.indexOf(id);
   if(side>=0){const sign=side===0?-1:1;g.position.set(sign*1.15,-.02,0);g.rotation.y=sign<0?-Math.PI/2:Math.PI/2;
    const arms=g.userData.arms as THREE.Group[];for(const arm of arms)arm.rotation.set(1.5,0,0);
    if(d!.phase==='reveal'&&d!.lastBeat){const t=Math.max(0,Math.min(1,(Date.now()-d!.lastBeat.at)/2400)),move=side===0?d!.lastBeat.a:d!.lastBeat.b,opponent=side===0?d!.lastBeat.b:d!.lastBeat.a,punch=Math.sin(Math.min(1,t/.65)*Math.PI);g.position.x-=sign*punch*(move==='block'?.12:.6);
     if(move==='block'){arms.forEach((arm,i)=>arm.rotation.set(2.5,0,i===0?-.45:.45));}
     else if(move==='jab'||move==='hook'){arms[0].rotation.x=1.5+punch*1.2;arms[0].rotation.z=move==='hook'?sign*punch*1.25:0;arms[1].rotation.x=2;}
     if(d!.lastBeat.winner===1-side&&opponent!=='block'&&t>.25&&t<.7)g.rotation.z=sign*Math.sin((t-.25)/.45*Math.PI)*.32;
    }
   }else{const a=spectators.indexOf(id)*Math.PI*2/Math.max(1,spectators.length);g.position.set(Math.sin(a)*5,-.38,Math.cos(a)*5);g.rotation.y=a;g.userData.arms.forEach((arm:THREE.Group)=>arm.rotation.set(.5,0,0));}
  }
 }
}
