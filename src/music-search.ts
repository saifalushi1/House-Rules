import type {MusicTrack} from '../shared/music';
type SearchEvent={type:'clear'}|{type:'searching'}|{type:'results';tracks:MusicTrack[]}|{type:'error';message:string};
/** Debounce typing, serialize requests, and discard responses for older text. */
export class LiveMusicSearch {
 query='';private enabled=false;private generation=0;private settled=-1;private sequence=0;private pending=false;private due=0;private lastSent=-Infinity;
 private timer?:ReturnType<typeof setTimeout>;private flight?:{request:string;generation:number;timer:ReturnType<typeof setTimeout>};
 constructor(private send:(query:string,request:string)=>void,private changed:(event:SearchEvent)=>void){}
 change(value:string,immediate=false){const query=value.trim();if(query===this.query&&!immediate)return;
  if(query===this.query&&this.flight?.generation===this.generation)return;
  this.query=query;this.generation++;this.settled=-1;this.pending=query.length>=2&&query.length<=500;this.due=Date.now()+(immediate?0:350);this.clearTimer();this.changed({type:'clear'});
  if(this.pending){this.changed({type:'searching'});this.schedule();}
 }
 setEnabled(enabled:boolean){if(this.enabled===enabled)return;this.enabled=enabled;this.clearTimer();if(enabled&&this.query.length>=2&&this.query.length<=500&&this.settled!==this.generation){this.pending=true;this.changed({type:'searching'});this.schedule();}}
 private clearTimer(){clearTimeout(this.timer);this.timer=undefined;}
 private schedule(){this.clearTimer();if(!this.enabled||!this.pending||this.flight)return;const wait=Math.max(0,this.due-Date.now(),this.lastSent+850-Date.now());this.timer=setTimeout(()=>this.start(),wait);}
 private start(){this.timer=undefined;if(!this.enabled||!this.pending||this.flight)return;this.pending=false;const request='live-music-'+ ++this.sequence;this.lastSent=Date.now();const generation=this.generation;
  this.flight={request,generation,timer:setTimeout(()=>this.fail(request,'Music search took too long. Try again.'),30000)};this.send(this.query,request);
 }
 receive(request:string,tracks:MusicTrack[]){this.finish(request,{type:'results',tracks});}
 fail(request:string,message:string){this.finish(request,{type:'error',message});}
 private finish(request:string,event:SearchEvent){const flight=this.flight;if(!flight||flight.request!==request)return;clearTimeout(flight.timer);this.flight=undefined;
  if(flight.generation===this.generation){if(this.enabled){this.pending=false;this.settled=this.generation;this.changed(event);}else this.pending=this.query.length>=2;}
  this.schedule();
 }
 reset(){this.generation++;this.settled=-1;this.query='';this.pending=false;this.clearTimer();this.changed({type:'clear'});}
 disconnect(){this.enabled=false;if(this.flight)clearTimeout(this.flight.timer);this.flight=undefined;this.generation++;this.settled=-1;this.pending=this.query.length>=2;this.clearTimer();this.changed({type:'clear'});}
}
