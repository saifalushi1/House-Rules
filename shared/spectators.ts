export const TOMATO_COOLDOWN=8000,GHOST_COOLDOWN=45000,GHOST_DURATION=6000,MAX_SPECTATORS=32;
export type GhostDance='shuffle'|'disco'|'twerk';
export interface Spectator {id:string;name:string;connected:boolean;tomatoAt:number;ghostAt:number}
export interface SpectatorGhost {actor:string;name:string;dance:GhostDance;starts:number;ends:number}
