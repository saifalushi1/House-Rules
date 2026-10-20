import type {MusicTrack} from '../shared/music.js';import {youtubeId} from './youtube-provider.js';import {musicConfig,musicConfigKey,allowedMusicURL} from './music-config.js';import {musicPlaybackURL} from './music-access.js';
type Details={track:MusicTrack;url:string;mime:string};
const tracks=new Map<string,{at:number;details:Details}>(),searches=new Map<string,{at:number;tracks:MusicTrack[]}>(),pending=new Map<string,Promise<Details>>();
const valid=(id:unknown):id is string=>typeof id==='string'&&/^[\w-]{11}$/.test(id);
function unavailable(){return Error('The configured music instance is unavailable or blocked upstream. Try again later or ask the host to check it.');}
async function request(route:string,params:Record<string,string>={}){const c=musicConfig();if(!c.base)throw Error('Configure a Piped or Invidious instance.');const u=new URL(route,c.base);for(const [k,v] of Object.entries(params))u.searchParams.set(k,v);
 try{const res=await fetch(u,{signal:AbortSignal.timeout(10000),redirect:'error'});if(!res.ok)throw Error();const data=await res.json();if(data?.error)throw Error();return data;}catch{throw unavailable();}
}
export function normalizeAlternativeTrack(t:any,provider:'invidious'|'piped'):MusicTrack|undefined{
 const id=provider==='invidious'?t?.videoId:youtubeId('https://www.youtube.com'+String(t?.url||'')),duration=Number(provider==='invidious'?t?.lengthSeconds:t?.duration);
 if(!valid(id)||typeof t?.title!=='string'||!t.title.trim()||!Number.isFinite(duration)||duration<1||duration>21600||t?.liveNow||t?.isUpcoming||t?.livestream||t?.paid||t?.premium||t?.isShort||t?.type&&t.type!=='video'&&t.type!=='stream')return;
 return{id,title:t.title.trim().slice(0,180),artist:String(provider==='invidious'?t.author||'Unknown artist':t.uploaderName||t.uploader||'Unknown artist').slice(0,100),duration:Math.ceil(duration),permalink:'https://www.youtube.com/watch?v='+id,source:provider,playbackUrl:musicPlaybackURL(id)};
}
export async function searchAlternative(query:string){
 const c=musicConfig();if(c.provider==='youtube')throw Error('Configure a Piped or Invidious instance.');const id=youtubeId(query);if(id)return[(await alternativeDetails(id)).track];
 if(/^https?:\/\//i.test(query.trim()))throw Error('Paste a YouTube video link, or enter a song or artist.');
 const key=musicConfigKey()+':'+query.trim().toLowerCase(),cached=searches.get(key);if(cached&&Date.now()-cached.at<60000)return cached.tracks;
 const data=c.provider==='invidious'?await request('api/v1/search',{q:query,type:'video',sort:'relevance'}):await request('search',{q:query,filter:'music_songs'});
 const list=c.provider==='invidious'?data:data.items;if(!Array.isArray(list))throw Error('The music instance returned invalid search results.');
 const result:MusicTrack[]=[],seen=new Set<string>();for(const raw of list){const track=normalizeAlternativeTrack(raw,c.provider);if(track&&!seen.has(track.id)){seen.add(track.id);result.push(track);}if(result.length===20)break;}
 if(searches.size>=100)searches.delete(searches.keys().next().value!);searches.set(key,{at:Date.now(),tracks:result});return result;
}
export async function alternativeDetails(id:string,refresh=false):Promise<Details>{
 if(!valid(id))throw Error('Choose a song from search results or paste a YouTube video link.');
 const key=musicConfigKey()+':'+id,existing=pending.get(key);if(existing)return existing;
 const cached=tracks.get(key);if(!refresh&&cached&&Date.now()-cached.at<30000)return cached.details;
 const work=(async()=>{const c=musicConfig();if(c.provider==='youtube')throw Error('Configure a Piped or Invidious instance.');const data=c.provider==='invidious'?await request('api/v1/videos/'+id,{local:'true'}):await request('streams/'+id);
 const track=normalizeAlternativeTrack({...data,videoId:id,url:'/watch?v='+id},c.provider);if(!track)throw Error('This song is unavailable, live, restricted or over six hours long. Choose another.');
 const formats=c.provider==='invidious'?data.adaptiveFormats:data.audioStreams;if(!Array.isArray(formats))throw Error('This song has no playable audio stream.');
 const candidates=formats.map((f:any)=>({url:f?.url,mime:String(f?.mimeType||f?.type||'').split(';')[0].trim().toLowerCase(),bitrate:Number(f?.bitrate)||0})).filter((f:any)=>typeof f.url==='string'&&['audio/mp4','audio/webm','audio/ogg','audio/mpeg','audio/wav'].includes(f.mime)).sort((a:any,b:any)=>Number(b.mime==='audio/mp4')-Number(a.mime==='audio/mp4')||b.bitrate-a.bitrate);
 let selected:{url:string;mime:string}|undefined;for(const candidate of candidates){try{selected={url:allowedMusicURL(candidate.url).href,mime:candidate.mime};break;}catch{}}
 if(!selected){if(candidates.length)throw Error('No audio stream uses an approved origin. The host should check MUSIC_STREAM_ORIGINS.');throw Error('This song has no supported audio stream.');}
 const details={track,...selected};if(tracks.size>=500)tracks.delete(tracks.keys().next().value!);tracks.set(key,{at:Date.now(),details});return details;})();pending.set(key,work);try{return await work;}finally{pending.delete(key);}
}
