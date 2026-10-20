import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';import {musicConfigKey} from './music-config.js';
const secret=randomBytes(32),lifetime=9*24*60*60*1000;
const sign=(id:string,expires:number)=>createHmac('sha256',secret).update(id+'|'+expires+'|'+musicConfigKey()).digest('hex');
/** An opaque, process-scoped capability; never accepts a URL from a listener. */
export function musicPlaybackURL(id:string){const expires=Date.now()+lifetime;return '/music/stream/'+id+'?expires='+expires+'&signature='+sign(id,expires);}
export function authorizeMusicStream(u:URL){const id=/^\/music\/stream\/([\w-]{11})$/.exec(u.pathname)?.[1],raw=u.searchParams.get('expires'),signature=u.searchParams.get('signature');
 if(!id||!raw||!/^\d+$/.test(raw)||!signature||!/^[a-f0-9]{64}$/.test(signature))return;
 const expires=Number(raw);if(!Number.isSafeInteger(expires)||expires<Date.now()||expires>Date.now()+lifetime)return;
 try{if(timingSafeEqual(Buffer.from(signature,'hex'),Buffer.from(sign(id,expires),'hex')))return id;}catch{return;}
}
