/** Official visible YouTube IFrame player. No audio extraction or proxying. */
export interface YouTubePlayer {
 cueVideoById(v:{videoId:string;startSeconds:number}):void;playVideo():void;pauseVideo():void;stopVideo():void;
 seekTo(n:number,allow:boolean):void;setVolume(n:number):void;getCurrentTime():number;getDuration():number;
 getPlayerState():number;getVideoData():{video_id?:string};destroy():void;
}
type API={Player:new(el:HTMLElement,options:any)=>YouTubePlayer};
let loading:Promise<API>|undefined;
function loadAPI():Promise<API>{
 const w=window as unknown as {YT?:API;onYouTubeIframeAPIReady?:()=>void};if(w.YT?.Player)return Promise.resolve(w.YT);
 if(loading)return loading;
 loading=new Promise<API>((resolve,reject)=>{const previous=w.onYouTubeIframeAPIReady;const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;
 const fail=()=>{clearTimeout(timer);script.remove();loading=undefined;reject(Error('YouTube could not load. Check your connection or content blocker, then enable music again.'));};
 const timer=setTimeout(fail,15000);script.onerror=fail;
 w.onYouTubeIframeAPIReady=()=>{previous?.();clearTimeout(timer);if(w.YT?.Player)resolve(w.YT);else fail();};document.head.append(script);
 });return loading;
}
export class YouTubeMedia {
 readonly element=document.createElement('aside');private host=document.createElement('div');private player?:YouTubePlayer;private ready=false;private creating=false;
 private events=new Map<string,(()=>void)[]>();private source='';private video='';private level=.35;private desiredTime=0;private quietUntil=0;private wasPlaying=false;private sampledTime=0;private sampledAt=0;
 preload:'metadata'='metadata';
 constructor(){this.element.id='youtube-music-dock';this.host.id='youtube-room-video';this.element.hidden=true;this.element.setAttribute('aria-label','YouTube music player');const label=document.createElement('div');label.className='youtube-dock-label';label.textContent='YOUTUBE · SHARED ROOM MUSIC';this.element.append(label,this.host);document.body.append(this.element);}
 addEventListener(type:string,f:()=>void){this.events.set(type,[...(this.events.get(type)||[]),f]);}
 private emit(type:string){this.events.get(type)?.forEach(f=>f());}
 get src(){return this.source;}set src(value:string){this.source=value;this.video=new URL(value).searchParams.get('v')||'';this.desiredTime=0;this.wasPlaying=false;this.element.hidden=false;if(this.ready)this.cue();else void this.create();}
 get volume(){return this.level;}set volume(n:number){this.level=n;if(this.ready)this.player!.setVolume(n*100);}
 get paused(){return !this.ready||this.player!.getPlayerState()!==1;}
 get readyState(){return this.ready?1:0;}
 get currentTime(){return this.ready?this.player!.getCurrentTime()||0:this.desiredTime;}set currentTime(n:number){this.desiredTime=n;if(this.ready){this.quietUntil=Date.now()+1800;this.player!.seekTo(n,true);this.sampledAt=0;}}
 get duration(){return this.ready?this.player!.getDuration()||0:0;}
 get buffering(){return this.ready&&this.player!.getPlayerState()===3;}
 get suppressing(){return Date.now()<this.quietUntil;}
 private cue(){this.quietUntil=Date.now()+1800;this.sampledAt=0;this.player!.cueVideoById({videoId:this.video,startSeconds:this.desiredTime});}
 async create(){if(this.creating||this.ready||!this.video)return;this.creating=true;this.element.dataset.state='loading-api';try{const api=await loadAPI();this.element.dataset.state='creating-player';if(!this.video){this.creating=false;this.element.dataset.state='idle';return;}
 this.player=new api.Player(this.host,{videoId:this.video,width:'100%',height:'200',host:'https://www.youtube.com',playerVars:{playsinline:1,origin:location.origin,controls:1},events:{
 onReady:()=>{this.element.dataset.state='ready';this.ready=true;this.creating=false;this.player!.setVolume(this.level*100);if(this.video)this.cue();else this.player!.stopVideo();this.emit('loadedmetadata');},
 onStateChange:(event:{data:number})=>{if(this.player?.getVideoData().video_id!==this.video)return;const state=event.data;
  if(state===1){this.wasPlaying=true;if(!this.suppressing)this.emit('userplay');}
  if(state===2&&this.wasPlaying&&!this.suppressing)this.emit('userpause');
  if(state===0&&this.wasPlaying&&!this.suppressing)this.emit('ended');
 },onAutoplayBlocked:()=>this.emit('blocked'),onError:(e:{data:number})=>{this.element.dataset.errorCode=String(e.data);this.emit(e.data===153?'identity-error':'error');}
 }});
 }catch(e){this.element.dataset.state='error';this.element.dataset.error=String(e);this.emit('error');this.creating=false;}}
 async play(){if(!this.ready){void this.create();return;}this.quietUntil=Date.now()+1000;this.player!.playVideo();}
 pause(){if(this.ready&&this.player!.getPlayerState()!==2){this.quietUntil=Date.now()+1000;this.player!.pauseVideo();}}
 removeAttribute(){this.source='';this.video='';this.wasPlaying=false;this.element.hidden=true;if(this.ready)this.player!.stopVideo();}
 load(){}
 /** Detect a deliberate scrub in native controls without treating normal playback as a seek. */
 sample(){if(!this.ready||!this.video)return;const now=Date.now(),at=this.currentTime,state=this.player!.getPlayerState();if(this.sampledAt&&!this.suppressing&&state===1&&Math.abs(at-this.sampledTime-(now-this.sampledAt)/1000)>2.5)this.emit('userseek');this.sampledTime=at;this.sampledAt=now;}
}
