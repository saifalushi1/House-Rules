import {musicConfig} from './music-config.js';
import {searchMusic as searchYouTube,getMusicTrack as getYouTube} from './youtube-provider.js';
import {searchAlternative,alternativeDetails} from './alternative-provider.js';
export {normalizeMusicTrack,youtubeId} from './youtube-provider.js';
export async function searchMusic(query:string){return musicConfig().provider==='youtube'?searchYouTube(query):searchAlternative(query);}
export async function getMusicTrack(id:string){return musicConfig().provider==='youtube'?getYouTube(id):(await alternativeDetails(id)).track;}
