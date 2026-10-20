import {MUSIC_QUEUE_LIMIT,musicPosition,type MusicState,type MusicTrack} from '../shared/music';
/** Personal playback on the home screen; no room is silently created. */
export class LocalMusic {
 private sequence=0;
 state:MusicState={queue:[],playing:false,position:0,updatedAt:Date.now(),revision:0};
 reset(){this.state={queue:[],playing:false,position:0,updatedAt:Date.now(),revision:0};}
 private next(){const m=this.state;m.current=m.queue.shift();m.position=0;m.playing=!!m.current;m.updatedAt=Date.now();m.revision++;}
 add(track:MusicTrack){const m=this.state;if(m.queue.length>=MUSIC_QUEUE_LIMIT)throw Error('The music queue is full (30 songs).');const start=!m.current||!m.playing&&musicPosition(m,Date.now())>=m.current.duration;m.queue.push({...track,entry:'personal-'+ ++this.sequence,addedBy:'local',addedByName:'You'});if(start)this.next();}
 control(type:string,entry?:string,position?:number,revision?:number){const m=this.state;if(type==='musicRemove'){m.queue=m.queue.filter(s=>s.entry!==entry);return;}if(!m.current||entry!==m.current.entry)return;if(type==='musicEnded'){if(revision!==m.revision||!m.playing)return;if(m.queue.length)this.next();else{m.position=m.current.duration;m.playing=false;m.revision++;}return;}if(type==='musicSeek'){if(typeof position==='number'&&Number.isFinite(position)&&position>=0&&position<=m.current.duration){m.position=position as number;m.updatedAt=Date.now();m.revision++;}return;}if(type==='musicSkip'){this.next();return;}const pos=musicPosition(m,Date.now());m.position=type==='musicRestart'||type==='musicPlay'&&pos>=m.current.duration?0:pos;m.playing=type!=='musicPause';m.updatedAt=Date.now();m.revision++;}
 tick(){const m=this.state;if(!m.current||!m.playing||musicPosition(m,Date.now())<m.current.duration)return false;if(m.queue.length)this.next();else{m.position=m.current.duration;m.playing=false;m.updatedAt=Date.now();m.revision++;}return true;}
}
