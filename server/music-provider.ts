import type {MusicTrack} from '../shared/music.js';
const cache=new Map<string,{at:number;track:MusicTrack}>(), searches=new Map<string,{at:number;tracks:MusicTrack[]}>();
const validId=(id:unknown):id is string=>typeof id==='string'&&/^[\w-]{11}$/.test(id);
export function youtubeId(value:string){
 const text=value.trim();if(validId(text))return text;
 try{const u=new URL(text);if(u.protocol!=='https:'&&u.protocol!=='http:')return;
 if(u.username||u.password||u.port)return;
 const host=u.hostname.toLowerCase();let id:string|null|undefined;
 if(host==='youtu.be')id=u.pathname.split('/')[1];
 else if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','www.youtube-nocookie.com'].includes(host))id=u.pathname==='/watch'?u.searchParams.get('v'):/^\/(shorts|embed|live)\//.test(u.pathname)?u.pathname.split('/')[2]:undefined;
 return validId(id)?id:undefined;}catch{return;}
}
function seconds(value:unknown){const m=typeof value==='string'&&/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value);return m?Number(m[1]||0)*3600+Number(m[2]||0)*60+Number(m[3]||0):0;}
function clean(value:string){return value.replace(/&(?:amp|quot|apos|lt|gt|#39|#x27|#\d+);/gi,s=>{const map:Record<string,string>={'&amp;':'&','&quot;':'"','&apos;':"'",'&#39;':"'",'&#x27;':"'",'&lt;':'<','&gt;':'>'};if(map[s.toLowerCase()])return map[s.toLowerCase()];const n=Number(s.slice(2,-1));return n>0&&n<=0x10ffff?String.fromCodePoint(n):s;});}
export function normalizeMusicTrack(t:any):MusicTrack|undefined{
 const duration=seconds(t?.contentDetails?.duration);
 if(!validId(t?.id)||t.status?.embeddable!==true||!['public','unlisted'].includes(t.status?.privacyStatus)||t.status?.uploadStatus!=='processed'||t.snippet?.liveBroadcastContent&&t.snippet.liveBroadcastContent!=='none'||t.contentDetails?.contentRating?.ytRating==='ytAgeRestricted'||!duration||duration>21600||typeof t.snippet?.title!=='string'||!t.snippet.title.trim())return;
 return{id:t.id,title:clean(t.snippet.title).slice(0,180),artist:clean(String(t.snippet.channelTitle||'YouTube')).slice(0,100),duration,permalink:'https://www.youtube.com/watch?v='+t.id};
}
function remember(t:MusicTrack){if(cache.size>=500)cache.delete(cache.keys().next().value!);cache.set(t.id,{at:Date.now(),track:t});return t;}
async function request(path:string,params:Record<string,string>){
 const key=process.env.YOUTUBE_API_KEY?.trim();if(!key)throw Error('Song search needs a YouTube API key on the host. You can paste a YouTube video link here instead.');
 const u=new URL('https://www.googleapis.com/youtube/v3/'+path);for(const [k,v] of Object.entries({...params,key}))u.searchParams.set(k,v);
 let res:Response;try{res=await fetch(u,{signal:AbortSignal.timeout(10000)});}catch{throw Error('YouTube is unavailable right now. Try again shortly.');}
 if(res.status===403||res.status===400)throw Error('YouTube search is unavailable. The host should check the API key, API access and quota.');
 if(!res.ok)throw Error('YouTube is unavailable right now. Try again shortly.');return res.json();
}
export async function searchMusic(query:string){
 const id=youtubeId(query);if(id)return[await getMusicTrack(id)];
 if(/^https?:\/\//i.test(query.trim()))throw Error('Paste a YouTube video link, or enter a song or artist.');
 const key=query.trim().toLowerCase(),cached=searches.get(key);if(cached&&Date.now()-cached.at<60000)return cached.tracks;
 const json=await request('search',{part:'snippet',q:query,type:'video',videoCategoryId:'10',videoEmbeddable:'true',videoSyndicated:'true',maxResults:'20'});
 if(!Array.isArray(json.items))throw Error('YouTube returned an unexpected search response.');
 const ids=json.items.map((x:any)=>x.id?.videoId).filter(validId);
 const detail=ids.length?await request('videos',{part:'snippet,contentDetails,status',id:ids.join(',')}):{items:[]};
 const tracks=(detail.items||[]).map(normalizeMusicTrack).filter((t:MusicTrack|undefined):t is MusicTrack=>!!t).map(remember);
 if(searches.size>=100)searches.delete(searches.keys().next().value!);searches.set(key,{at:Date.now(),tracks});return tracks;
}
export async function getMusicTrack(id:string){
 if(!validId(id))throw Error('Choose a song from search results or paste a YouTube video link.');
 const cached=cache.get(id);if(cached&&Date.now()-cached.at<300000)return cached.track;
 if(process.env.YOUTUBE_API_KEY?.trim()){
  const json=await request('videos',{part:'snippet,contentDetails,status',id}),track=normalizeMusicTrack(json.items?.[0]);
  if(!track)throw Error('This video cannot be embedded, is unavailable, is live or is over six hours long. Choose another.');return remember(track);
 }
 // oEmbed supports link imports without a search API key. Only YouTube receives this fixed, validated URL.
 let data:any;try{const u=new URL('https://www.youtube.com/oembed');u.searchParams.set('url','https://www.youtube.com/watch?v='+id);u.searchParams.set('format','json');const res=await fetch(u,{signal:AbortSignal.timeout(10000)});if(!res.ok)throw Error();data=await res.json();}catch{throw Error('This YouTube video could not be loaded. Check the link or choose another.');}
 if(typeof data.title!=='string'||!data.title.trim())throw Error('YouTube returned an invalid video.');
 return remember({id,title:data.title.slice(0,180),artist:String(data.author_name||'YouTube').slice(0,100),duration:21600,durationKnown:false,permalink:'https://www.youtube.com/watch?v='+id});
}
