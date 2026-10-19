import {randomUUID} from 'node:crypto';import type {Room,Action} from '../shared/types.js';import {MUSIC_QUEUE_LIMIT,musicPosition,type MusicTrack,type MusicState} from '../shared/music.js';
const need=(ok:unknown,message:string)=>{if(!ok)throw Error(message);};
const edits=new WeakMap<Room,Map<string,number>>();
export function authorizeMusic(r:Room,id:string){need(r.players.some(p=>p.id===id&&p.connected)||r.spectators?.some(p=>p.id===id&&p.connected),'Join this room to control its shared music.');}
function throttle(r:Room,id:string){let m=edits.get(r);if(!m){m=new Map();edits.set(r,m);}need(Date.now()>=(m.get(id)||0),'Give the music controls a moment.');m.set(id,Date.now()+500);}
function state(r:Room):MusicState{return r.music??={queue:[],playing:false,position:0,updatedAt:Date.now(),revision:0};}
function next(r:Room){const m=state(r);m.current=m.queue.shift();m.position=0;m.updatedAt=Date.now();m.playing=!!m.current;m.revision++;}
export function queueMusic(r:Room,id:string,track:MusicTrack){authorizeMusic(r,id);const m=state(r);need(m.queue.length<MUSIC_QUEUE_LIMIT,'The music queue is full (30 songs).');throttle(r,id);const p=(r.players.find(p=>p.id===id)||r.spectators?.find(p=>p.id===id))!;const song={...track,entry:randomUUID(),addedBy:id,addedByName:p.name};
 const begin=!m.current||!m.playing&&musicPosition(m,Date.now())>=m.current.duration;m.queue.push(song);if(begin)next(r);
}
export function handleMusic(r:Room,id:string,a:Action){authorizeMusic(r,id);need(['musicPlay','musicPause','musicSkip','musicRestart','musicRemove'].includes(a.type),'Unknown music control.');const m=state(r);
 if(a.type==='musicRemove'){const at=m.queue.findIndex(q=>q.entry===a.entry);need(at>=0,'That queued song has changed.');need(r.host===id||m.queue[at]?.addedBy===id,'Remove your own songs, or ask the host.');throttle(r,id);m.queue.splice(at,1);return;}
 need(m.current&&a.entry===m.current.entry,'The current song changed. Try again.');throttle(r,id);
 if(a.type==='musicSkip'){next(r);return;}
 const now=Date.now(),position=musicPosition(m,now);m.position=a.type==='musicRestart'||a.type==='musicPlay'&&position>=m.current!.duration?0:position;m.updatedAt=now;m.playing=a.type!=='musicPause';m.revision++;
}
export function tickMusic(r:Room){const m=r.music;if(!m?.current||!m.playing||musicPosition(m,Date.now())<m.current.duration)return false;if(m.queue.length)next(r);else{m.position=m.current.duration;m.playing=false;m.updatedAt=Date.now();m.revision++;}return true;}
