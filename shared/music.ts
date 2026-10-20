export interface MusicTrack {id:string;title:string;artist:string;duration:number;permalink:string;durationKnown?:boolean;source?:'invidious'|'piped'|'youtube';playbackUrl?:string}
export interface QueuedSong extends MusicTrack {entry:string;addedBy:string;addedByName:string}
export interface MusicState {current?:QueuedSong;queue:QueuedSong[];playing:boolean;position:number;updatedAt:number;revision:number}
export const MUSIC_QUEUE_LIMIT=30;
export function musicPosition(m:MusicState,now:number){return Math.max(0,Math.min(m.current?.duration||0,m.position+(m.playing?Math.max(0,now-m.updatedAt)/1000:0)));}
export function musicVideo(id:string){return 'https://www.youtube.com/watch?v='+encodeURIComponent(id);}
