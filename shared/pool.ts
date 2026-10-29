export type PoolVariant='eight'|'nine'|'cutthroat';
export interface PoolBall{n:number;x:number;y:number;down:boolean}
export interface PoolFrame{t:number;balls:number[][]}
export interface PoolResult{balls:PoolBall[];potted:{n:number;pocket:number}[];first:number|null;rail:boolean}
export interface PoolState{variant:PoolVariant;phase:'aim'|'rolling'|'rackEnd';balls:PoolBall[];serial:number;ends:number;rack:number;break:boolean;groups:Record<string,'solids'|'stripes'>;wins:Record<string,number>;fouls:Record<string,number>;ballInHand:boolean;last:string;shot?:{at:number;duration:number;frames:PoolFrame[]};pending?:PoolResult&{player:string;called:number;wasBreak:boolean};rackWinner?:string;voteAt?:number}
export const POOL_R=.06;
export const poolPockets=[[-2,-1],[0,-1],[2,-1],[-2,1],[0,1],[2,1]] as const;
export const poolColors=['#f7f1db','#e7bd35','#3975bf','#d55342','#8754a4','#e49636','#479169','#8b3c3c','#242c2c'];
export function poolGroup(n:number){return n<8?'solids':'stripes';}
export function cutGroup(index:number){return Array.from({length:5},(_,i)=>index*5+i+1);}
export function poolRack(variant:PoolVariant):PoolBall[]{const balls:PoolBall[]=[{n:0,x:-1.15,y:0,down:false}],spots:{x:number;y:number}[]=[];
 if(variant==='nine'){for(let row=0;row<5;row++){const count=[1,2,3,2,1][row];for(let c=0;c<count;c++)spots.push({x:.55+row*Math.sqrt(3)*POOL_R*1.015,y:(c-(count-1)/2)*POOL_R*2.03});}}
 else for(let row=0;row<5;row++)for(let c=0;c<=row;c++)spots.push({x:.55+row*Math.sqrt(3)*POOL_R*1.015,y:(c-row/2)*POOL_R*2.03});
 const order=variant==='nine'?[1,2,3,4,9,5,6,7,8]:[1,9,2,10,8,3,11,4,12,5,6,13,7,14,15];spots.forEach((p,i)=>balls.push({n:order[i],...p,down:false}));return balls;
}
/** Deterministic fixed-step, equal-mass rolling discs. No client-supplied outcomes. */
export function simulatePool(input:PoolBall[],angle:number,power:number){const balls=input.map(b=>({...b,vx:0,vy:0})),cue=balls.find(b=>b.n===0)!;cue.vx=Math.cos(angle)*(1+power*5);cue.vy=Math.sin(angle)*(1+power*5);const frames:PoolFrame[]=[],potted:{n:number;pocket:number}[]=[];let first:number|null=null,rail=false,step=0;const dt=1/180;
 const frame=()=>frames.push({t:Math.round(step*1000/180),balls:balls.map(b=>[b.n,+b.x.toFixed(4),+b.y.toFixed(4),b.down?1:0])});frame();
 for(step=1;step<=2160;step++){
  for(const b of balls){if(b.down)continue;b.x+=b.vx*dt;b.y+=b.vy*dt;const pocket=poolPockets.findIndex(([x,y])=>Math.hypot(b.x-x,b.y-y)<.145);if(pocket>=0){b.down=true;b.vx=b.vy=0;potted.push({n:b.n,pocket});continue;}
   if(Math.abs(b.x)>2-POOL_R){b.x=Math.sign(b.x)*(2-POOL_R);b.vx*=-.86;if(first!==null)rail=true;}if(Math.abs(b.y)>1-POOL_R){b.y=Math.sign(b.y)*(1-POOL_R);b.vy*=-.86;if(first!==null)rail=true;}
  }
  for(let i=0;i<balls.length;i++)for(let j=i+1;j<balls.length;j++){const a=balls[i],b=balls[j];if(a.down||b.down)continue;const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d>=POOL_R*2||d<.000001)continue;const nx=dx/d,ny=dy/d,over=(POOL_R*2-d)/2;a.x-=nx*over;a.y-=ny*over;b.x+=nx*over;b.y+=ny*over;const speed=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;if(speed>0){if(first===null&&(a.n===0||b.n===0))first=a.n===0?b.n:a.n;const impulse=speed*.975;a.vx-=impulse*nx;a.vy-=impulse*ny;b.vx+=impulse*nx;b.vy+=impulse*ny;}}
  let moving=false;for(const b of balls){const speed=Math.hypot(b.vx,b.vy);if(speed<.025){b.vx=b.vy=0;}else{const factor=Math.max(0,(speed-1.1*dt)/speed);b.vx*=factor;b.vy*=factor;moving=true;}}
  if(step%6===0)frame();if(!moving){frame();break;}
 }
 const result:PoolResult={balls:balls.map(({vx,vy,...b})=>b),potted,first,rail};return{...result,frames,duration:Math.max(400,Math.min(step,2160)*1000/180)};
}
export function poolFrameBalls(p:PoolState,now=Date.now()):PoolBall[]{if(!p.shot||p.phase!=='rolling')return p.balls;const t=Math.max(0,now-p.shot.at),frames=p.shot.frames;let i=0;while(i<frames.length-2&&frames[i+1].t<t)i++;const a=frames[i],b=frames[Math.min(i+1,frames.length-1)],f=Math.min(1,Math.max(0,(t-a.t)/Math.max(1,b.t-a.t)));return a.balls.map((v,n)=>({n:v[0],x:v[1]+(b.balls[n][1]-v[1])*f,y:v[2]+(b.balls[n][2]-v[2])*f,down:!!(f>=1?b.balls[n][3]:v[3])}));}
