import type {View} from '../shared/types';import {musicPosition,musicVideo} from '../shared/music';import {RoomMedia} from './room-media';
type Media={src:string;volume:number;readonly paused:boolean;currentTime:number;readonly readyState:number;preload:string;play():Promise<void>;pause():void;load():void;removeAttribute(name:string):void;addEventListener(name:string,listener:()=>void):void}&{duration?:number;buffering?:boolean;suppressing?:boolean;sample?:()=>void;create?:()=>Promise<void>};
export function musicVolume(value:unknown){const n=Number(value);return value===null||value===undefined||!Number.isFinite(n)?.35:Math.max(0,Math.min(1,n));}
/** Transport follows the server clock; volume and autoplay permission are local. */
export class MusicPlayback {
 room?:Pick<View,'code'|'music'|'serverNow'>;connected=true;blocked=false;problem='';onControl?:(type:string,entry:string,position:number,revision:number)=>void;
 private offset=0;private key='';private revision=-1;private pending=false;private waitingUntil=0;private ended='';
 constructor(readonly media:Media=new RoomMedia(),private storage:Pick<Storage,'getItem'|'setItem'>=localStorage){let value:string|null=null;try{value=storage.getItem('house-music-volume');}catch{}media.volume=musicVolume(value);media.preload='metadata';
 media.addEventListener('loadedmetadata',()=>this.sync(true));media.addEventListener('error',()=>{if(this.key)this.problem='This music stream could not play here. Try enabling music, or choose another song.';});
 media.addEventListener('identity-error',()=>{this.problem='YouTube could not identify this page. Open House Rules through its normal http/https address and allow the YouTube player.';});
 media.addEventListener('blocked',()=>{this.blocked=true;});
 for(const [event,type] of [['userplay','musicPlay'],['userpause','musicPause'],['userseek','musicSeek'],['ended','musicEnded']])media.addEventListener(event,()=>this.control(type));
 }
 private control(type:string){if(type==='musicPlay')this.blocked=false;const m=this.room?.music,c=m?.current;if(!m||!c||!this.connected)return;
  if(type==='musicPlay'&&m.playing||type==='musicPause'&&!m.playing)return;
  if(type==='musicEnded'){const token=c.entry+':'+m.revision;if(!m.playing||this.ended===token)return;this.ended=token;}
  this.waitingUntil=Date.now()+1400;this.onControl?.(type,c.entry,this.media.currentTime,m.revision);
 }
 setVolume(value:number){this.media.volume=musicVolume(value);try{this.storage.setItem('house-music-volume',String(this.media.volume));}catch{}}
 update(room:Pick<View,'code'|'music'|'serverNow'>|undefined,connected=true){const changed=this.room?.music?.revision!==room?.music?.revision||this.room?.code!==room?.code;this.room=room;this.connected=connected;this.offset=(room?.serverNow||Date.now())-Date.now();if(changed)this.waitingUntil=0;this.sync();}
 enable(){this.blocked=false;this.problem='';void this.media.create?.();this.waitingUntil=0;this.sync(true);}
 sync(force=false){const m=this.room?.music,c=m?.current,key=c?this.room!.code+':'+c.entry:'';
  if(key!==this.key){this.media.pause();this.key=key;this.revision=-1;this.pending=false;this.waitingUntil=0;this.problem='';if(c)this.media.src=c.playbackUrl||musicVideo(c.id);else{this.media.removeAttribute('src');this.media.load();}}
  if(!c||!m||!this.connected){this.media.pause();return;}
  this.media.sample?.();if(Date.now()<this.waitingUntil)return;
  const position=musicPosition(m,Date.now()+this.offset),changed=this.revision!==m.revision;
  if(this.media.readyState>=1&&(force||changed||!this.media.buffering&&!this.media.suppressing&&Math.abs(this.media.currentTime-position)>3)){try{this.media.currentTime=position;this.revision=m.revision;}catch{}}
  if(!m.playing){this.media.pause();return;}
  if(this.media.paused&&!this.media.buffering&&!this.blocked&&!this.pending){this.pending=true;const expected=key;void this.media.play().catch((e:Error)=>{if(this.key===expected&&e.name==='NotAllowedError')this.blocked=true;else if(this.key===expected&&e.name!=='AbortError')this.problem='Playback failed here. Try enabling music or choose another song.';}).finally(()=>{if(this.key===expected)this.pending=false;});}
 }
}
