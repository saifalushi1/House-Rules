import {YouTubeMedia} from './youtube-media';
/** Piped/Invidious use native audio; the older official embed remains an explicit opt-in. */
export class RoomMedia {
 private audio:HTMLAudioElement;private youtube?:YouTubeMedia;private audioMode=true;private source='';private level=.35;private quietUntil=0;private events=new Map<string,(()=>void)[]>();
 constructor(audio:HTMLAudioElement=new Audio()){this.audio=audio;audio.id='room-music-audio';audio.hidden=true;audio.preload='metadata';document.body.append(audio);
 for(const type of ['loadedmetadata','error','ended'])audio.addEventListener(type,()=>{if(this.audioMode)this.emit(type);});
 audio.addEventListener('playing',()=>{if(this.audioMode&&Date.now()>=this.quietUntil)this.emit('userplay');});audio.addEventListener('pause',()=>{if(this.audioMode&&!audio.ended&&Date.now()>=this.quietUntil)this.emit('userpause');});
 }
 addEventListener(type:string,f:()=>void){this.events.set(type,[...(this.events.get(type)||[]),f]);}private emit(type:string){this.events.get(type)?.forEach(f=>f());}
 private get media(){return this.audioMode?this.audio:this.youtube!;}
 get src(){return this.source;}set src(value:string){this.pause();this.source=value;this.audioMode=value.startsWith('/music/stream/');
 if(this.audioMode){this.youtube?.removeAttribute();this.audio.src=value;document.body.classList.remove('has-youtube-music');}
 else{this.audio.removeAttribute('src');this.audio.load();if(!this.youtube){this.youtube=new YouTubeMedia();for(const event of ['loadedmetadata','error','identity-error','blocked','userplay','userpause','userseek','ended'])this.youtube.addEventListener(event,()=>{if(!this.audioMode)this.emit(event);});}this.youtube.src=value;document.body.classList.add('has-youtube-music');}
 this.media.volume=this.level;
 }
 get volume(){return this.level;}set volume(n:number){this.level=n;this.audio.volume=n;if(this.youtube)this.youtube.volume=n;}
 get paused(){return this.media.paused;}get readyState(){return this.media.readyState;}get duration(){return this.media.duration||0;}
 get currentTime(){return this.media.currentTime;}set currentTime(n:number){this.quietUntil=Date.now()+1000;this.media.currentTime=n;}
 get preload(){return this.audio.preload;}set preload(value:string){this.audio.preload=value as HTMLMediaElement['preload'];}
 get buffering(){return this.audioMode?!this.audio.paused&&this.audio.readyState<3:this.youtube!.buffering;}
 get suppressing(){return this.audioMode?Date.now()<this.quietUntil:this.youtube!.suppressing;}
 async play(){this.quietUntil=Date.now()+1000;await this.media.play();}pause(){this.quietUntil=Date.now()+1000;this.media.pause();}
 removeAttribute(){this.pause();this.source='';this.audio.removeAttribute('src');this.youtube?.removeAttribute();document.body.classList.remove('has-youtube-music');}
 load(){if(this.audioMode)this.audio.load();}sample(){if(!this.audioMode)this.youtube?.sample();}
 async create(){if(this.audioMode){if(this.audio.error)this.audio.load();}else await this.youtube?.create();}
}
