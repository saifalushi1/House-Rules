export type MusicProvider='invidious'|'piped'|'youtube';
export function musicConfig(){
 const provider=(process.env.MUSIC_PROVIDER?.trim().toLowerCase()||'invidious') as MusicProvider;
 if(!['invidious','piped','youtube'].includes(provider))throw Error('MUSIC_PROVIDER must be invidious, piped or youtube.');
 if(provider==='youtube')return{provider,base:undefined};
 const raw=process.env.MUSIC_API_URL?.trim();if(!raw)throw Error('Music needs a configured '+provider+' instance. The host must set MUSIC_API_URL in .env and restart the server.');
 let base:URL;try{base=new URL(raw);}catch{throw Error('MUSIC_API_URL must be a valid http/https instance URL.');}
 if(!['http:','https:'].includes(base.protocol)||base.username||base.password||base.search||base.hash)throw Error('MUSIC_API_URL must be an http/https base URL without credentials, query or fragment.');
 if(!base.pathname.endsWith('/'))base.pathname+='/';return{provider,base};
}
export function publicMusicConfig(){try{const c=musicConfig();return{provider:c.provider,configured:true};}catch(e){return{provider:process.env.MUSIC_PROVIDER||'invidious',configured:false,message:(e as Error).message};}}
export function musicConfigKey(){const c=musicConfig();return c.provider+':'+(c.base?.href||'')+':'+(process.env.MUSIC_STREAM_ORIGINS||'');}
/** Only host-configured origins and YouTube's HTTPS media CDN may receive stream requests. */
export function allowedMusicURL(value:string){const c=musicConfig();if(!c.base)throw Error('Audio relay requires Piped or Invidious.');let u:URL;
 try{u=new URL(value,c.base);}catch{throw Error('The music instance returned an invalid audio URL.');}
 if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.hash)throw Error('The music instance returned an unsafe audio URL.');
 const origins=new Set([c.base.origin]);for(const raw of (process.env.MUSIC_STREAM_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean)){try{const extra=new URL(raw);if(!['http:','https:'].includes(extra.protocol)||extra.username||extra.password||extra.pathname!=='/'||extra.search||extra.hash)throw Error();origins.add(extra.origin);}catch{throw Error('MUSIC_STREAM_ORIGINS must contain comma-separated http/https origins.');}}
 if(!origins.has(u.origin)&&!(u.protocol==='https:'&&!u.port&&u.hostname.endsWith('.googlevideo.com')))throw Error('The music instance uses an unapproved stream host. Add its trusted origin to MUSIC_STREAM_ORIGINS.');
 return u;
}
