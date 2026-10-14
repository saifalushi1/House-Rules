import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {TableEnvironment} from '../src/environments';

test('speakeasy patrons keep clearance from all furniture, walls and other patrons in every pose',()=>{
 const env=new TableEnvironment(new THREE.Scene());env.update('speakeasy');env.group.updateMatrixWorld(true);
 const fixtures=env.group.children.filter(o=>o!==env.group.children[0]&&!env.walkers.includes(o as THREE.Group)).map(o=>new THREE.Box3().setFromObject(o).expandByScalar(.2));
 for(let time=0;time<90000;time+=100){env.animate(time);env.group.updateMatrixWorld(true);const bodies=env.walkers.map(o=>new THREE.Box3().setFromObject(o));
  bodies.forEach((body,i)=>{fixtures.forEach((fixture,j)=>assert.ok(!body.intersectsBox(fixture),`patron ${i} overlaps fixture ${j} at ${time}ms`));for(let j=i+1;j<bodies.length;j++)assert.ok(!body.clone().expandByScalar(.1).intersectsBox(bodies[j]),`patrons ${i} and ${j} overlap`);});
 }
});

test('ambient actors stay outside the table and player area throughout their activity loops',()=>{
 const env=new TableEnvironment(new THREE.Scene());
 for(const theme of ['forest','speakeasy'] as const){env.update(theme);const positions=env.walkers.map(actor=>actor.position.clone());
  for(let time=0;time<90000;time+=250){env.animate(time);env.group.updateMatrixWorld(true);
   env.walkers.forEach((actor,i)=>{assert.ok(actor.position.equals(positions[i]));const b=new THREE.Box3().setFromObject(actor);const x=b.min.x>0?b.min.x:b.max.x<0?-b.max.x:0,z=b.min.z>0?b.min.z:b.max.z<0?-b.max.z:0;assert.ok(Math.hypot(x,z)>4.75,`${theme} actor ${i} intrudes into player space`);assert.ok(b.min.y>-.5,'actor sinks through ground');});
  }
 }
});
test('forest animals graze or sniff; speakeasy patrons drink or laugh with animated joints',()=>{
 const env=new TableEnvironment(new THREE.Scene());env.update('forest');assert.deepEqual(new Set(env.walkers.map(a=>a.userData.activity)),new Set(['graze','sniff']));env.animate(0);const first=env.walkers[0].userData.head.rotation.x;env.animate(2500);assert.notEqual(env.walkers[0].userData.head.rotation.x,first);
 env.update('speakeasy');assert.deepEqual(new Set(env.walkers.map(a=>a.userData.activity)),new Set(['drink','laugh']));env.animate(0);const arm=env.walkers[0].userData.arms[0].rotation.x;env.animate(2500);assert.notEqual(env.walkers[0].userData.arms[0].rotation.x,arm);
});
