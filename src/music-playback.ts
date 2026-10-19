import type {View} from '../shared/types';import {musicPosition,musicStream} from '../shared/music';
type Media=Pick<HTMLAudioElement,'src'|'volume'|'paused'|'currentTime'|'readyState'|'preload'|'play'|'pause'|'load'|'removeAttribute'|'addEventListener'>;
export function musicVolume(value:unknown){const n=Number(value);return value===null||value===undefined||!Number.isFinite(n)?.35:Math.max(0,Math.min(1,n));}
/** A separate media element and local preference; never sends volume to the room. */
export class MusicPlayback {
 room?:Pick<View,'code'|'music'|'serverNow'>;connected=true;blocked=false;problem='';private offset=0;private key='';private revision=-1;private pending=false;
 constructor(readonly media:Media=new Audio(),private storage:Pick<Storage,'getItem'|'setItem'>=localStorage){let value:string|null=null;try{value=storage.getItem('house-music-volume');}catch{}media.volume=musicVolume(value);media.preload='metadata';media.addEventListener('loadedmetadata',()=>this.sync(true));media.addEventListener('error',()=>{if(this.key)this.problem='This stream could not load here. Try another song or skip.';});}
 setVolume(value:number){this.media.volume=musicVolume(value);try{this.storage.setItem('house-music-volume',String(this.media.volume));}catch{}}
 update(room:Pick<View,'code'|'music'|'serverNow'>|undefined,connected=true){this.room=room;this.connected=connected;this.offset=(room?.serverNow||Date.now())-Date.now();this.sync();}
 enable(){this.blocked=false;this.sync();}
 sync(force=false){const m=this.room?.music,c=m?.current,key=c?this.room!.code+':'+c.entry:'';
  if(key!==this.key){this.media.pause();this.key=key;this.revision=-1;this.pending=false;this.problem='';if(c)this.media.src=musicStream(c.id);else{this.media.removeAttribute('src');this.media.load();}}
  if(!c||!m||!this.connected){this.media.pause();return;}
  const position=musicPosition(m,Date.now()+this.offset),changed=this.revision!==m.revision;
  if(this.media.readyState>=1&&(force||changed||Math.abs(this.media.currentTime-position)>1.25)){try{this.media.currentTime=position;this.revision=m.revision;}catch{}}
  if(!m.playing){this.media.pause();return;}
  if(this.media.paused&&!this.blocked&&!this.pending){this.pending=true;const expected=key;void this.media.play().catch((e:Error)=>{if(this.key===expected&&e.name==='NotAllowedError')this.blocked=true;else if(this.key===expected&&e.name!=='AbortError')this.problem='Playback failed here. Try enabling music or choose another song.';}).finally(()=>{if(this.key===expected)this.pending=false;});}
 }
}
