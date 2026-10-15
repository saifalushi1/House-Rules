import type {Card} from './types.js';
export const backgrounds={garage:'Big garage',forest:'Forest clearing',speakeasy:'Speakeasy',beach:'Sunset beach',rooftop:'City rooftop',space:'Space lounge',dungeon:'Dungeon hall'} as const;
export interface SolitaireState{stock:Card[];waste:Card[];tableau:{cards:Card[];hidden:number}[];foundations:Card[][];moves:number}
export interface SolitaireView{stockCount:number;waste:Card[];tableau:{cards:(Card|null)[];hidden:number}[];foundations:Card[][];moves:number}
export interface Stroke{color:string;size:number;points:[number,number][]}
export interface ScribbleState{order:string[];scores:Record<string,{guess:number;drawing:number;correct:number}>;lastAward?:{guesser:string;drawer:string;guessPoints:number;drawingPoints:number};drawer:string;word:string;choices:string[];phase:'choose'|'draw'|'result';ends:number;index:number;total:number;strokes:Stroke[];guessed:string[]}
export interface ScribbleView extends Omit<ScribbleState,'word'|'choices'>{word?:string;choices?:string[];letters:number}
export const classes={fighter:'Fighter',rogue:'Rogue',wizard:'Wizard',cleric:'Cleric'} as const;
export type RpgClass=keyof typeof classes;
export interface Character{owner:string;name:string;class:RpgClass;level:number;xp:number;gold:number;hp:number;maxHp:number;ac:number;stats:Record<'str'|'dex'|'con'|'int'|'wis'|'cha',number>;slots:number;inventory:string;notes:string}
export interface RpgPawn{id:string;owner?:string;name:string;kind:'hero'|'enemy';hp:number;maxHp:number;ac:number;x:number;y:number}
export interface RpgState{dm:string;characters:Character[];pawns:RpgPawn[];walls:number[];map:'crypt'|'ruins'|'cavern';combat:boolean;initiative:{id:string;roll:number}[];index:number;moved:boolean;acted:boolean;narrative:string;encounter:number;lastRoll?:{player:string;sides:number;value:number;total:number;label:string}}
export interface Raid{from:string;to:string;stake:'hand'|'score'|'cash';phase:'offer'|'fight';pausedAt:number;ends:number;round:number;wins:[number,number];choices:Record<string,'jab'|'hook'|'block'>}
export interface RaidView extends Omit<Raid,'choices'>{ready:string[]}
