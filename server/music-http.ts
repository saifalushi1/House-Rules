import type {IncomingMessage,ServerResponse} from 'node:http';import {Readable} from 'node:stream';import {pipeline} from 'node:stream/promises';
import {authorizeMusicStream} from './music-access.js';import {alternativeDetails} from './alternative-provider.js';import {allowedMusicURL,publicMusicConfig} from './music-config.js';
let active=0;const maxStreams=64;
async function streamFetch(url:string,headers:Record<string,string>,signal:AbortSignal){let next=allowedMusicURL(url);
 for(let i=0;i<4;i++){const res=await fetch(next,{headers,redirect:'manual',signal});if([301,302,303,307,308].includes(res.status)){const location=res.headers.get('location');await res.body?.cancel();if(!location)throw Error('Invalid music redirect.');next=allowedMusicURL(new URL(location,next).href);continue;}return res;}
 throw Error('Too many music redirects.');
}
export async function musicHTTP(req:IncomingMessage,res:ServerResponse){const u=new URL(req.url||'/','http://house-rules.local');if(!u.pathname.startsWith('/music/'))return false;
 const fail=(code:number,message:string)=>{if(!res.headersSent){res.writeHead(code,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end(message);}else res.destroy();};
 if(!['GET','HEAD'].includes(req.method||'')){fail(405,'Use GET or HEAD.');return true;}
 if(u.pathname==='/music/config'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:JSON.stringify(publicMusicConfig()));return true;}
 const id=authorizeMusicStream(u);if(!id){fail(403,'This music link is invalid or expired. Search and queue the song again.');return true;}
 if(active>=maxStreams){fail(503,'Too many music streams. Try again shortly.');return true;}
 const range=req.headers.range;if(range&&!/^(?:bytes=\d+-\d*|bytes=-\d+)$/.test(range)){fail(416,'Use a single byte range.');return true;}
 active++;const controller=new AbortController();const disconnect=()=>controller.abort();res.once('close',disconnect);let timer:ReturnType<typeof setTimeout>|undefined;
 try{const headers:Record<string,string>={};if(range)headers.Range=range;
 let response:Response|undefined,mime='';for(let attempt=0;attempt<2;attempt++){const details=await alternativeDetails(id,attempt>0);mime=details.mime;timer=setTimeout(()=>controller.abort(),15000);try{response=await streamFetch(details.url,headers,controller.signal);}finally{clearTimeout(timer);}if(attempt===0&&[403,410].includes(response.status)){await response.body?.cancel();continue;}break;}
 if(!response)throw Error('No stream response.');
 if(response.status===416){const contentRange=response.headers.get('content-range');await response.body?.cancel();res.writeHead(416,contentRange?{'Content-Range':contentRange}:{});res.end();return true;}
 if(![200,206].includes(response.status)||!response.body){await response.body?.cancel();throw Error('The music stream could not load.');}
 const type=(response.headers.get('content-type')||mime).split(';')[0].trim().toLowerCase();if(!type.startsWith('audio/')&&type!=='application/octet-stream'){await response.body.cancel();throw Error('The music instance did not return audio.');}
 const out:Record<string,string>={'Content-Type':type==='application/octet-stream'?mime:type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 for(const name of ['content-length','content-range','accept-ranges']){const value=response.headers.get(name);if(value)out[name]=value;}
 res.writeHead(response.status,out);if(req.method==='HEAD'){await response.body.cancel();res.end();return true;}
 await pipeline(Readable.fromWeb(response.body as any),res,{signal:controller.signal});
 }catch{if(!res.destroyed&&!res.writableEnded)fail(502,'The music instance or stream is unavailable. Try another song or ask the host to check it.');}
 finally{clearTimeout(timer);res.off('close',disconnect);controller.abort();active--;}
 return true;
}
