import * as THREE from 'three';
import type {TableEnvironment} from './environments';
/** Small, distant polygon set piece. All scenery remains outside the play area. */
export function rooftopFlight(e:TableEnvironment){
 const towers=new THREE.Group();towers.userData.roofTowers=true;
 for(const x of [-5.5,-2.5]){const tower=e.mesh(new THREE.BoxGeometry(1.35,8.5,1.35),0x9aa8b5,x,2.25,-13);towers.add(tower);for(let j=0;j<5;j++)e.box(.055,8.3,.035,0x657784,x-.5+j*.25,2.25,-12.31,towers);e.box(1.45,.18,1.45,0xc4cbd0,x,6.58,-13,towers);}
 towers.position.z=4.8;e.group.add(towers);
 const flight=new THREE.Group(),plane=new THREE.Group(),smoke=new THREE.Group();flight.userData={roofFlight:true,plane,smoke,towers};
 plane.add(e.mesh(new THREE.BoxGeometry(1.5,.18,.2),0xe2e5d8));plane.add(e.mesh(new THREE.ConeGeometry(.13,.35,5),0xe2e5d8,.88,0,0));plane.children[1].rotation.z=-Math.PI/2;
 plane.add(e.mesh(new THREE.BoxGeometry(.5,.045,1.3),0xc4ced2,-.1,0,0));plane.add(e.mesh(new THREE.BoxGeometry(.2,.35,.04),0x657e9d,-.62,.2,0));plane.add(e.mesh(new THREE.BoxGeometry(.3,.04,.6),0x657e9d,-.62,.06,0));
 for(let i=0;i<18;i++){const puff=e.mesh(new THREE.IcosahedronGeometry(.18+(i%3)*.1,0),i%3?0x6c7582:0xf3bc70);smoke.add(puff);}
 flight.add(plane,smoke);flight.position.z=4.8;e.group.add(flight);e.decor.push(flight);
}
export function animateRooftop(flight:THREE.Object3D,time:number){
 const t=(time%32000)/32000,plane=flight.userData.plane as THREE.Group,smoke=flight.userData.smoke as THREE.Group;
 plane.visible=t<.61;plane.position.set(-18+t*26,Math.sin(t*7)*.08,-12.7);plane.rotation.x=Math.sin(t*10)*.07;
 smoke.children.forEach((p,i)=>{const impact=i<9?.48:.595,age=t-impact,visible=age>=0&&age<.2;p.visible=visible;if(!visible)return;const n=i%9,a=n*2.399,progress=age/.2;p.position.set((i<9?-5.5:-2.5)+Math.sin(a)*progress*1.7,progress*(1+n*.12),-12.45+Math.cos(a)*progress);p.scale.setScalar(Math.sin(progress*Math.PI)*(n%3?2.5:1.5));p.rotation.set(progress*3,a,progress*2);});
}
