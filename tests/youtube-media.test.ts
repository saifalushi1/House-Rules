import {test} from 'node:test';import assert from 'node:assert/strict';import {YouTubeMedia} from '../src/youtube-media.js';
test('opening music with no song does not strand YouTube initialization; video and volume survive transport',async t=>{
 const saved=new Map<string,PropertyDescriptor|undefined>();for(const key of ['document','window','location'])saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));t.after(()=>{for(const [key,value] of saved){if(value)Object.defineProperty(globalThis,key,value);else Reflect.deleteProperty(globalThis,key);}});
 class Element {id='';hidden=false;className='';textContent='';dataset:Record<string,string>={};children:any[]=[];setAttribute(){}append(...els:any[]){this.children.push(...els);}}
 let creates=0,options:any,volume=0,state=5,time=0,video='';
 const player={cueVideoById(v:any){video=v.videoId;time=v.startSeconds;state=5;},playVideo(){state=1;},pauseVideo(){state=2;},stopVideo(){state=-1;},seekTo(n:number){time=n;},setVolume(n:number){volume=n;},getCurrentTime(){return time;},getDuration(){return 201;},getPlayerState(){return state;},getVideoData(){return{video_id:video};},destroy(){}};
 class Player {constructor(_el:unknown,opts:any){creates++;options=opts;return player as any;}}
 Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>new Element(),body:new Element()}});Object.defineProperty(globalThis,'window',{configurable:true,value:{YT:{Player}}});Object.defineProperty(globalThis,'location',{configurable:true,value:{origin:'http://localhost:3205'}});
 const media=new YouTubeMedia();await media.create();assert.equal(creates,0);assert.equal(media.element.hidden,true);
 media.volume=.08;media.src='https://www.youtube.com/watch?v=LinkedVid01';await new Promise(r=>setImmediate(r));assert.equal(creates,1);assert.equal(options.videoId,'LinkedVid01');assert.equal(options.playerVars.origin,'http://localhost:3205');assert.ok(Number(options.height)>=200);
 options.events.onReady();assert.equal(media.readyState,1);assert.equal(volume,8);assert.equal(video,'LinkedVid01');await media.play();assert.equal(media.paused,false);media.currentTime=42;assert.equal(media.currentTime,42);media.pause();assert.equal(media.paused,true);
 let blocked=false;media.addEventListener('blocked',()=>blocked=true);options.events.onAutoplayBlocked();assert.equal(blocked,true);media.removeAttribute();assert.equal(media.element.hidden,true);assert.equal(state,-1);
});
