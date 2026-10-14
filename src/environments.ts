import * as THREE from 'three';
import type { Rules } from '../shared/types';

/** Procedural scenery shared by every seat; no downloaded models or textures. */
export class TableEnvironment {
  group=new THREE.Group(); key=''; walkers:THREE.Group[]=[];
  constructor(private scene:THREE.Scene){scene.add(this.group);}
  mesh(shape:THREE.BufferGeometry,color:number,x=0,y=0,z=0){const m=new THREE.Mesh(shape,new THREE.MeshStandardMaterial({color,flatShading:true,roughness:.85}));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return m;}
  box(w:number,h:number,d:number,c:number,x:number,y:number,z:number,parent:THREE.Group=this.group){const m=this.mesh(new THREE.BoxGeometry(w,h,d),c,x,y,z);parent.add(m);return m;}
  update(theme:Rules['background']){
    if(theme===this.key)return;this.key=theme;this.walkers=[];
    for(const child of [...this.group.children]){child.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});child.removeFromParent();}
    const forest=theme==='forest',garage=theme==='garage';this.scene.background=new THREE.Color(forest?0x9bb5a1:garage?0x6c797b:0x251b27);this.scene.fog=new THREE.Fog(this.scene.background,18,38);
    this.box(30,.2,30,forest?0x536c42:garage?0x606766:0x422b30,0,-.55,0);
    if(forest){
      for(let i=0;i<30;i++){const a=i*2.399,r=6+(i%5)*1.7,x=Math.sin(a)*r,z=Math.cos(a)*r;this.group.add(this.mesh(new THREE.CylinderGeometry(.14,.24,2,5),0x725339,x,.4,z));for(let j=0;j<3;j++)this.group.add(this.mesh(new THREE.ConeGeometry(1.2-j*.23,2.3,5),[0x284a38,0x3c6142,0x638252][j],x,1.6+j*.65,z));}
      for(let i=0;i<18;i++)this.group.add(this.mesh(new THREE.DodecahedronGeometry(.25+(i%4)*.1),0x869482,Math.sin(i*1.3)*7,-.2,Math.cos(i*1.3)*7));
      const spots=[[-5.4,-3.6],[5.8,-4],[-6,2.1],[6.4,2.8]];
      for(let i=0;i<spots.length;i++){
        const [x,z]=spots[i],animal=new THREE.Group(),head=new THREE.Group();animal.position.set(x,-.44,z);animal.rotation.y=i*.8;
        animal.userData={kind:'animal',activity:i%2?'sniff':'graze',phase:i*1.7,head};
        this.box(.55,.35,.9,i%2?0xc9b8a2:0x976847,0,.38,0,animal);head.position.set(0,.59,-.35);
        this.box(.35,.36,.38,i%2?0xc9b8a2:0x976847,0,0,-.13,head);for(const earX of [-.12,.12])this.box(.09,.26,.09,0xab9679,earX,.26,-.13,head);animal.add(head);
        for(const legX of [-.22,.22])for(const legZ of [-.28,.28])this.box(.1,.3,.1,0x674d38,legX,.14,legZ,animal);
        this.group.add(animal);this.walkers.push(animal);
        const patch=new THREE.Group();patch.position.set(x,-.44,z);patch.rotation.y=animal.rotation.y;
        for(let j=0;j<5;j++){const blade=this.mesh(new THREE.ConeGeometry(.06,.26,3),0x83a353,(j-2)*.12,.1,-.78);patch.add(blade);}
        if(i%2){this.box(.03,.42,.03,0x587548,0,.2,-.8,patch);patch.add(this.mesh(new THREE.OctahedronGeometry(.12),0xe6b4b7,0,.43,-.8));}
        this.group.add(patch);
      }
    }else{
      this.box(19,5,.25,garage?0x8b938b:0x39232a,0,1.95,-8);this.box(.25,5,16,garage?0x848a83:0x39232a,-9.5,1.95,0);this.box(.25,5,16,garage?0x848a83:0x39232a,9.5,1.95,0);
      if(garage){
        this.box(6.6,3.8,.2,0x667477,3,1.35,-7.78);for(let i=0;i<7;i++)this.box(6.5,.04,.07,0x9aabaa,3,-.3+i*.56,-7.6);
        this.box(1.35,2.5,1.1,0xd3d8c9,-6.8,.75,-6.7);this.box(1.3,.04,.04,0x64766b,-6.8,1.07,-6.11);this.box(.06,.5,.08,0x323c38,-6.28,.52,-6.08);this.box(.06,.27,.08,0x323c38,-6.28,1.4,-6.08);
        this.box(4,.2,1.4,0x987148,-3,.75,-6.3);for(const x of [-4.7,-1.3])this.box(.15,1.2,1.1,0x42534c,x,.1,-6.3);
        this.box(4,1.7,.13,0x967a55,-3,2.1,-7.5);for(let i=0;i<9;i++){const x=-4.7+i*.42;this.box(.08,.65,.13,0xb1bdba,x,2.15,-7.36);this.box(.22,.15,.15,i%2?0xb45e43:0x4c737e,x,2.52,-7.36);}
        this.box(1.8,1.2,.8,0xa74f3c,6,.2,-6);for(let i=0;i<4;i++)this.box(1.6,.06,.05,0xddd2b7,6,-.15+i*.27,-5.55);
        for(let i=0;i<4;i++){const tire=this.mesh(new THREE.TorusGeometry(.45,.16,5,12),0x29322f,7,-.22+i*.32,4);tire.rotation.x=Math.PI/2;this.group.add(tire);}
        for(const z of [-7])this.box(15,.17,.2,0xc1b991,0,4.2,z);this.box(1.8,.08,.6,0xf5ecc1,0,3.8,-3);
      }else{
        this.box(11,1.4,1.15,0x784b39,0,.18,-6.6);this.box(11.3,.13,1.4,0xba9660,0,.94,-6.6);for(let i=0;i<3;i++)this.box(10,.12,.6,0x6c493c,0,1.8+i*.65,-7.6);
        for(let i=0;i<24;i++){const x=-4.6+(i%12)*.82,y=2.05+Math.floor(i/12)*.65;this.group.add(this.mesh(new THREE.CylinderGeometry(.09,.13,.4,6),[0x53765b,0x997849,0x6b8391][i%3],x,y,-7.35));}
        for(let i=0;i<6;i++){const x=-4.5+i*1.8;this.group.add(this.mesh(new THREE.CylinderGeometry(.32,.32,.13,8),0x96484a,x,.45,-5.1));this.box(.12,.9,.12,0x95784e,x,0,-5.1);}
        for(const x of [-7,7]){this.box(1.9,.15,1.9,0x775141,x,.6,1);this.box(.15,1.1,.15,0x967f58,x,0,1);this.group.add(this.mesh(new THREE.ConeGeometry(.35,.5,8),0xe4bd71,x,1.32,1));}
        const chandelier=this.mesh(new THREE.TorusGeometry(1.3,.09,5,12),0xc6a16e,0,3.6,0);chandelier.rotation.x=Math.PI/2;this.group.add(chandelier);for(let i=0;i<8;i++)this.group.add(this.mesh(new THREE.OctahedronGeometry(.12),0xf9d689,Math.sin(i*Math.PI/4)*1.3,3.4,Math.cos(i*Math.PI/4)*1.3));
        // Standing groups use the open side aisles, clear of every stool and table.
        const spots=[[-6.4,-4.6],[-8.2,-4.6],[6.4,-4.6],[8.2,-4.6],[-7,3],[7,3],[-6.6,-1.1]];
        spots.forEach(([x,z],i)=>{
          const npc=new THREE.Group(),head=new THREE.Group(),arms:THREE.Group[]=[];npc.position.set(x,-.38,z);npc.rotation.y=i%3===1?(i%2?-Math.PI/2:Math.PI/2):0;
          const color=[0x725b76,0x466f69,0x8e664b][i%3];this.box(.45,.65,.32,color,0,.7,0,npc);head.position.y=1.2;head.add(this.mesh(new THREE.DodecahedronGeometry(.22),0xc5a28a));npc.add(head);
          for(const legX of [-.13,.13])this.box(.14,.5,.17,0x2a3031,legX,.18,0,npc);
          for(const armX of [-.3,.3]){const arm=new THREE.Group();arm.position.set(armX,.94,0);this.box(.13,.43,.14,color,0,-.22,0,arm);this.box(.14,.12,.15,0xc5a28a,0,-.43,0,arm);npc.add(arm);arms.push(arm);}
          const mug=new THREE.Group();mug.add(this.mesh(new THREE.CylinderGeometry(.08,.07,.18,8),0xd6ab56,0,-.47,-.08));mug.add(this.mesh(new THREE.CylinderGeometry(.075,.075,.025,8),0xf4e4bc,0,-.365,-.08));arms[0].add(mug);
          npc.userData={kind:'npc',activity:i%3===1?'laugh':'drink',phase:i*1.3,head,arms,mug};this.group.add(npc);this.walkers.push(npc);
        });
      }
    }
  }
  animate(time:number){
    for(const actor of this.walkers){
      const t=(time*.001+actor.userData.phase)%9,head=actor.userData.head as THREE.Group;
      if(actor.userData.kind==='animal'){
        const active=t<5.8,amount=active?Math.min(1,t/.8,(5.8-t)/.8):0;
        head.rotation.x=-amount*(actor.userData.activity==='graze'?.95:.5)+Math.sin(t*6)*.035*amount;
        head.rotation.y=actor.userData.activity==='sniff'?Math.sin(t*2)*.14*amount:0;
      }else{
        const arms=actor.userData.arms as THREE.Group[];
        if(actor.userData.activity==='drink'){
          const sip=t<5?Math.max(0,Math.min(1,(t-.6)/1.2,(5-t)/1.2)):0;
          arms[0].rotation.x=2.1*sip;head.rotation.x=-.12*sip;actor.rotation.z=0;
        }else{
          const laugh=t>1&&t<5.8?Math.sin(t*12):0;
          actor.rotation.z=laugh*.035;head.rotation.x=-.15+Math.abs(laugh)*.1;
          arms[0].rotation.x=.55+Math.abs(laugh)*.12;arms[1].rotation.x=.6+Math.abs(laugh)*.15;
        }
      }
    }
  }
}
