export const chaosRules = {
  chaosHotPotato:['Hot Potato','A shrinking turn timer; expiry gives a random penalty or forces a legal action.'],
  chaosSeatRoulette:['Seat Roulette','Swap physical seats every N turns; keep hands or leave them at the seat.'],
  chaosCyclone:['Cyclone','Pass hands at safe round boundaries; other games pass chaos points.'],
  chaosDouble:['Double or Nothing','Flip a coin to double or erase each positive score/cash gain.'],
  chaosDie:['Chaos Die','A d12 chooses a shared modifier for each round.'],
  chaosTableFlip:['Table Flip','The lowest scorer gets one table flip per match.'],
  chaosBlackout:['Blackout','Random turn-start blackouts spotlight only the active player for 10 seconds.'],
  chaosRobin:['Robin Hood','A gaining leader pays one point or coin to last place.'],
  chaosBanned:['Banned Word','A secret host-visible word changes each round; chat slips cost a point/coin.'],
  chaosDare:['Dare Wheel','Every penalty spins a dare from the host’s list.'],
  chaosWarp:['Time Warp','Vote to undo the last gameplay action within 30 seconds.'],
} as const;
export type ChaosToggle = keyof typeof chaosRules;
export interface ChaosState {
  seats:string[]; order:string[]; turns:number; roundKey:string; points:Record<string,number>;
  hot?:{player:string;ends:number;duration:number}; blackoutUntil:number;
  modifier?:{face:number;name:string}; flipUsed:boolean; reversed:boolean;
  lastDare?:{player:string;text:string}; word?:string;
  vote?:{requester:string;yes:string[];no:string[];voters:string[];ends:number};
  canUndo:boolean; undoLabel?:string; undoUntil:number;
  pendingCyclone:boolean; pendingSeats:boolean;
}
export const dieModifiers = ['Double gains','Zero gains','Reverse turns','Hot fuse','Robin’s tax','Blackout','Cyclone left','Cyclone right','Seat shuffle','Dare everyone','Bonus point','Shield round'] as const;
