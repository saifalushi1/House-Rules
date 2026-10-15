import {PartyVisuals} from './party-visuals';
import {PokerVisuals} from './poker-visuals';
import {ExpansionVisuals} from './expansion-visuals';
import {ChaosVisuals} from './chaos-visuals';
import * as THREE from 'three';
import { orderCards } from '../shared/rules';
import { TableEnvironment } from './environments';
import type { Game, GameEvent, View } from '../shared/types';
interface Tween { start: number; duration: number; step: (t: number) => void; done?: () => void }
export class GameScene {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(40, 1, .05, 100);
  group = new THREE.Group(); actors = new THREE.Group(); pieces = new THREE.Group(); tokens = new THREE.Group(); dice = new THREE.Group(); fx = new THREE.Group();
  environment = new TableEnvironment(this.scene);
  ownHand = new THREE.Group(); handKey=''; selectedCards=new Set<string>(); hoveredCard?:string;
  onPick?: (pick:{card?:string;action?:string;tile?:number;rpgTile?:{x:number;y:number};rpgPawn?:string})=>void;
  raycaster=new THREE.Raycaster();
  closeBoard = true; mode = 'third'; self = 0; room?: View; game: Game = 'bluff'; resize: ResizeObserver;
  actorMap = new Map<string, THREE.Group>(); tokenMap = new Map<string, THREE.Mesh>(); tweens: Tween[] = [];
  slapShot?:{until:number;actor:string;target:string};
  partyFX:PartyVisuals;rooftopShotUntil=0;pokerFX:PokerVisuals;expansionFX:ExpansionVisuals;chaosFX:ChaosVisuals; chaosShotUntil=0;
  seatAngle(index:number){const id=this.room?.players[index]?.id,seat=id?this.room?.chaos?.seats.indexOf(id):undefined;return (seat!==undefined&&seat>=0?seat:index)*Math.PI*2/(this.room?.players.length||4);}
  actorKey = ''; pieceKey = ''; shake = 0; moving = new Set<string>();
  constructor(private el: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; this.renderer.setClearColor(0, 0); el.append(this.renderer.domElement);
    this.scene.add(new THREE.HemisphereLight(0xe4eddf, 0x3c493d, 2.5));
    const sun = new THREE.DirectionalLight(0xffe3b7, 3.5); sun.position.set(-4, 10, 5); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12 }); sun.shadow.bias = -.001; this.scene.add(sun);
    this.scene.add(this.group, this.actors, this.pieces, this.tokens, this.dice, this.fx, this.ownHand);
    this.group.add(this.mesh(new THREE.CylinderGeometry(2.35, 2.45, .28, 8), 0x835737, 0, .75, 0));
    this.group.add(this.mesh(new THREE.CylinderGeometry(2.16, 2.16, .045, 8), 0x354f44, 0, .916, 0));
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; this.group.add(this.mesh(new THREE.BoxGeometry(.23, 1.25, .23), 0x583e2a, Math.sin(a) * 1.35, 0, Math.cos(a) * 1.35)); }
    this.resize = new ResizeObserver(() => { const w=el.clientWidth,h=el.clientHeight; this.renderer.setSize(w,h); this.camera.aspect=w/h; this.camera.updateProjectionMatrix(); this.handKey=''; this.updateOwnHand(); });
    this.renderer.domElement.addEventListener('pointerup',event=>{const pick=this.pick(event);if(pick)this.onPick?.(pick);});
    this.renderer.domElement.addEventListener('pointermove',event=>{const pick=this.pick(event);this.hoveredCard=pick?.card;this.renderer.domElement.style.cursor=pick?'pointer':'default';});
    this.chaosFX=new ChaosVisuals(this);this.expansionFX=new ExpansionVisuals(this);this.pokerFX=new PokerVisuals(this);this.partyFX=new PartyVisuals(this);
    this.resize.observe(el); this.update('bluff'); this.animate();
  }
  get board() { return this.game === 'property' || this.game === 'life'||this.game==='rpg'||!!this.room?.solitaire; }
  get radius() { return this.board ? 4.02 : 3.05; }
  mesh(g: THREE.BufferGeometry, color: number|string, x=0,y=0,z=0) { const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color,flatShading:true,roughness:.9})); m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true; return m; }
  clear(group: THREE.Group) { for (const child of [...group.children]) this.remove(child); }
  remove(child: THREE.Object3D) { child.removeFromParent(); child.traverse(o => { if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){if(m.map)m.map.dispose();m.dispose();}}}); }
  tween(duration: number, step: (t:number)=>void, done?:()=>void, delay=0) { this.tweens.push({start:performance.now()+delay,duration,step,done}); }
  label(text: string, sub: string, color='#273928', width=.5, height=.47) {
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const ctx=canvas.getContext('2d')!;
    ctx.fillStyle=color;ctx.textAlign='center';ctx.font='bold 32px sans-serif';const words=text.split(' ');const lines=words.length>2?[words.slice(0,2).join(' '),words.slice(2).join(' ')]:words;
    lines.forEach((line,i)=>ctx.fillText(line,128,83+i*39,240));ctx.font='28px sans-serif';ctx.fillText(sub,128,204);
    const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}));mesh.rotation.x=-Math.PI/2;return mesh;
  }
  avatar(id:string,color:string,angle:number) {
    const g=new THREE.Group();g.userData={id,angle,baseAngle:angle};g.position.set(Math.sin(angle)*this.radius,-.38,Math.cos(angle)*this.radius);g.rotation.y=angle;
    g.add(this.mesh(new THREE.BoxGeometry(.68,.11,.6),0x654d38,0,.64,.03));for(const x of [-.24,.24])g.add(this.mesh(new THREE.BoxGeometry(.09,.6,.09),0x4d3c2b,x,.3,.18));g.add(this.mesh(new THREE.BoxGeometry(.67,.65,.1),0x795b3d,0,1.02,.32));
    g.userData.chairParts=[...g.children];g.add(this.mesh(new THREE.CylinderGeometry(.3,.4,.65,5),color,0,1.08,0));const head=this.mesh(new THREE.DodecahedronGeometry(.27),0xd5b294,0,1.64,0),hat=this.mesh(new THREE.CylinderGeometry(.27,.27,.16,5),0x383d37,0,1.86,0);g.add(head,hat);for(const x of [-.075,.075])g.add(this.mesh(new THREE.BoxGeometry(.038,.035,.035),0x283c30,x,1.68,-.24));
    const arms:THREE.Group[]=[];
    for(const x of [-.25,.25]){const arm=new THREE.Group();arm.position.set(x*1.5,1.35,-.1);arm.add(this.mesh(new THREE.BoxGeometry(.19,.47,.19),color,0,-.24,0));arm.add(this.mesh(new THREE.BoxGeometry(.2,.18,.2),0xd5b294,0,-.47,0));arm.rotation.x=.5;g.add(arm);arms.push(arm);g.add(this.mesh(new THREE.BoxGeometry(.2,.53,.2),0x384046,x,.47,-.12));g.add(this.mesh(new THREE.BoxGeometry(.22,.17,.33),0x272e2c,x,.17,-.17));}
    const ring=this.mesh(new THREE.TorusGeometry(.56,.026,4,24),0xe7b770,0,.15,0);ring.rotation.x=Math.PI/2;g.add(ring);g.userData.arms=arms;g.userData.ring=ring;this.actorMap.set(id,g);this.actors.add(g);
  }
  tilePosition(i:number):[number,number] {const s=Math.floor(i/6),t=(i%6)/6*3.28;return s===0?[-1.64+t,1.64]:s===1?[1.64,1.64-t]:s===2?[1.64-t,-1.64]:[-1.64,-1.64+t];}
  update(game:Game,room?:View,id?:string) {
    const previous=this.room;if(previous?.gameInstance!==room?.gameInstance||previous?.phase!==room?.phase){for(const group of [this.group,this.pieces,this.dice,this.expansionFX.group,this.pokerFX.group]){group.rotation.set(0,0,0);group.position.set(0,0,0);}this.rooftopShotUntil=0;this.chaosShotUntil=0;this.slapShot=undefined;this.tweens=[];this.clear(this.fx);this.moving.clear();this.actorKey='';this.pieceKey='';this.handKey='';}this.game=game;this.room=room;this.environment.update(room?.rules.background||'forest');this.self=Math.max(0,room?.players.findIndex(p=>p.id===id)??0);this.group.scale.set(this.board?1.3:1,1,this.board?1.3:1);
    if((previous?.gameInstance!==room?.gameInstance||previous?.rules.game!==game)&&this.mode!=='first'&&(game==='rpg'||room?.solitaire))this.camera.position.set(0,game==='rpg'?12.7:7,game==='rpg'?6:1.2);
    this.el.parentElement?.classList.toggle('board-stage',this.board);
    const players=room?.players.length?room.players:[{id:'preview0',color:'#d9a658'},{id:'preview1',color:'#83a3a8'},{id:'preview2',color:'#bc8c83'},{id:'preview3',color:'#8ba177'}];
    const actorKey=game+players.map(p=>p.id+p.color).join('|');
    if(actorKey!==this.actorKey){this.clear(this.actors);this.clear(this.tokens);this.actorMap.clear();this.tokenMap.clear();this.actorKey=actorKey;players.forEach((p,i)=>this.avatar(p.id,p.color,this.seatAngle(i)));}
    players.forEach((p,i)=>{const g=this.actorMap.get(p.id)!;g.userData.baseAngle=this.seatAngle(i);g.userData.ring.visible=room?.phase==='playing'&&room.turn===i;});
    const key=this.board?game+JSON.stringify(room?.tiles||[]):game+JSON.stringify([room?.phase,room?.trickCollectUntil,room?.tricks,room?.trick,room?.lastTrick,room?.pileCount,room?.deckCount,room?.players.map(p=>p.handCount),room?.chaos?.seats]);
    if(key!==this.pieceKey){this.pieceKey=key;this.clear(this.pieces);
      if(this.board){this.pieces.add(this.mesh(new THREE.BoxGeometry(3.86,.035,3.86),0xd9cfa9,0,.97,0));for(let i=0;i<24;i++){const[x,z]=this.tilePosition(i),tile=room?.tiles[i];const color=tile?.owner?room?.players.find(p=>p.id===tile.owner)?.color||'#879c7c':['#a4b894','#e2bf8c','#a6c3cb','#d0b6c5'][Math.floor(i/6)];const space=this.mesh(new THREE.BoxGeometry(.52,.032,.52),color,x,1,z);space.userData.tile=i;this.pieces.add(space);const label=this.label(tile?.name||`Space ${i+1}`,tile?.type==='property'?'$'+tile.price:String(i+1));label.userData.tile=i;label.position.set(x,1.025,z);label.rotation.z=-Math.floor(i/6)*Math.PI/2;this.pieces.add(label);}
        const center=this.label(game==='property'?'BLOCK PARTY':'LIFE PATHS','YOUR NEXT MOVE', '#47634d',2.2,1.8);center.position.set(0,1.025,0);this.pieces.add(center);
      } else if(game==='charades'||game==='trivia'){this.pieces.add(this.mesh(new THREE.CylinderGeometry(.6,.65,.08,8),0xd5b269,0,.99,0));this.pieces.add(this.mesh(new THREE.DodecahedronGeometry(.17),0xf0d18e,0,1.32,0));}
      else {if(game==='cards'&&(room?.deckCount||!room)){const deck=this.mesh(new THREE.BoxGeometry(.35,.075,.5),0x527c89,-.75,1.02,-.3);deck.userData.action='draw';const deckLabel=this.label('DRAW','DECK','#eff0dc',.32,.47);deckLabel.position.y=.04;deck.add(deckLabel);this.pieces.add(deck);}
        if(room?.phase==='playing'){const playPad=this.mesh(new THREE.CylinderGeometry(.38,.38,.01,24),0x294e3e,0,.95,-.7);playPad.userData.action='play';const text=this.label('PLAY','SELECTED','#c4d0b8',.52,.45);text.position.y=.008;playPad.add(text);this.pieces.add(playPad);}const publicCards=game==='cards'?(room?.pile.slice(-4).map(card=>({card,player:''}))||[]):room?.trick.length?room.trick:room&&room.trickCollectUntil>Date.now()?room.lastTrick||[]:[];publicCards.forEach((entry,i)=>{const c=this.card();c.position.set((i%2-.5)*.68,1.13,Math.floor(i/2)*.64-.64);c.rotation.order='YXZ';c.rotation.set(.4,this.seatAngle(this.self),0);c.scale.setScalar(1.6);c.userData.centerTrick=game==='tarneeb';const rank=entry.card.rank===1?'A':entry.card.rank===13?'K':entry.card.rank===12?'Q':entry.card.rank===11?'J':String(entry.card.rank);const face=this.handFace(rank,entry.card.suit);face.position.y=.012;c.add(face);this.pieces.add(c);});
        if(game==='tarneeb'&&room){for(let team=0;team<2;team++){const pending=room.trickCollectUntil>Date.now()&&room.lastTrickTeam===team;for(let i=0;i<Math.min(13,room.tricks[team]-(pending?1:0));i++){const c=this.card();c.position.set(team===0?-1.42:1.42,1.02+i*.018,-.28);c.rotation.y=team===0?-.16:.16;this.pieces.add(c);}const label=this.label('TEAM '+(team+1),room.tricks[team]+' WON','#e6d3a6',.6,.5);label.position.set(team===0?-1.42:1.42,1.03,.38);this.pieces.add(label);}}
        if(!publicCards.length){for(let i=0;i<(room?.pileCount?Math.min(room.pileCount,8):0);i++){const c=this.card();c.position.set(Math.sin(i)*.15,1.0+i*.016,Math.cos(i)*.1);c.rotation.y=i*.4;this.pieces.add(c);}}
        players.forEach((p,i)=>{if(room&&room.players[i]?.handCount===0)return;const a=i*Math.PI*2/players.length;for(let j=0;j<3;j++){const c=this.card();c.position.set(Math.sin(a)*1.65+(j-1)*.1,1,Math.cos(a)*1.65);c.userData.seat=i;c.rotation.y=-a+j*.1;this.pieces.add(c);}});
      }
    }
    if(this.board){room?.players.forEach((p,i)=>{let token=this.tokenMap.get(p.id);if(!token){token=this.mesh(new THREE.ConeGeometry(.105,.27,5),p.color);const[x,z]=this.tilePosition(p.position);token.position.set(x+(i%3)*.08-.08,1.19,z);token.userData.logical=p.position;const ring=this.mesh(new THREE.TorusGeometry(.2,.024,4,20),0xe7b770,0,-.11,0);ring.rotation.x=Math.PI/2;token.add(ring);token.userData.ring=ring;this.tokens.add(token);this.tokenMap.set(p.id,token);}else if(token.userData.logical!==p.position){const old=token.userData.logical as number;token.userData.logical=p.position;const event=room.events.at(-1);const steps=event?.kind==='roll'&&event.actor===p.id?Number(event.data.steps):(p.position-old+24)%24;if(event?.kind==='chaosWarp'){const from=token.position.clone(),[x,z]=this.tilePosition(p.position);this.tween(1800,t=>{token!.position.lerpVectors(from,new THREE.Vector3(x+(i%3)*.08-.08,1.19,z),t);token!.position.y+=Math.sin(t*Math.PI)*.3;});}else this.moveToken(token,old,steps,i,event?.kind==='roll'?1000:0);}token.userData.ring.visible=p.id===room.players[this.self]?.id||room.players[room.turn]?.id===p.id;});}
    const diceCount=['property','life'].includes(game)?(game==='property'?2:1):0;
    if(this.dice.children.length!==diceCount||previous?.rules.game!==game||previous?.gameInstance!==room?.gameInstance){this.clear(this.dice);for(let i=0;i<diceCount;i++){const die=this.makeDie();die.userData.action='roll';die.position.set(.3+i*.55,1.19,-.25);this.orientDie(die,room?.rollDice[i]||1);this.dice.add(die);}}
    this.expansionFX.update(room);this.pokerFX.update(room);this.tokens.visible=!(room?.rules.game==='rpg'||room?.solitaire);
    this.updateOwnHand();
    if(previous?.duel&&!room?.duel){for(const g of this.actorMap.values()){const a=g.userData.baseAngle;g.position.set(Math.sin(a)*this.radius,-.38,Math.cos(a)*this.radius);g.rotation.set(0,a,0);g.userData.arms.forEach((arm:THREE.Group)=>arm.rotation.set(.5,0,0));}}
  }

  setSelected(cards:Iterable<string>){this.selectedCards=new Set(cards);}
  updateOwnHand(){
    const key=JSON.stringify([this.self,this.room?.gameInstance,this.room?.chaos?.seats,this.room?.hand]);if(key===this.handKey)return;this.handKey=key;this.clear(this.ownHand);
    if(this.board||(this.game==='charades'||this.game==='trivia')||!this.room)return;
    const cards=orderCards(this.room.hand,this.game),angle=this.seatAngle(this.self);const span=Math.min(2.4,2*Math.tan(THREE.MathUtils.degToRad(this.camera.fov/2))*2*this.camera.aspect*.84);
    cards.forEach((c,i)=>{const row=this.game==="bluff"?Math.floor(i/14):0, rowCount=this.game==="bluff"?Math.min(14,cards.length-row*14):cards.length, column=this.game==="bluff"?i%14:i, distance=this.game==="bluff"&&cards.length>14?1.25+row*.32:1.52;const t=rowCount===1?0:(column/(rowCount-1)-.5),offset=t*Math.min(span,rowCount*.36)*(1-row*.18)*(this.game==='bluff'?1:.78),mesh=this.card();mesh.userData.card=c.id;mesh.userData.baseY=1.06-row*.015+column*.002;mesh.position.set(Math.sin(angle)*distance+Math.cos(angle)*offset,mesh.userData.baseY,Math.cos(angle)*distance-Math.sin(angle)*offset);mesh.rotation.order='YXZ';mesh.rotation.set(.45,angle,0);mesh.scale.setScalar(this.game==="bluff"&&cards.length>14?.83:1.03);const rank=c.rank===1?'A':c.rank===11?'J':c.rank===12?'Q':c.rank===13?'K':String(c.rank);const face=this.handFace(rank,c.suit);face.position.y=.01;mesh.add(face);this.ownHand.add(mesh);});
  }
  handFace(rank:string,suit:string){
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=384;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#f1e8cf';ctx.fillRect(0,0,256,384);ctx.fillStyle=suit==='♥'||suit==='♦'?'#a34e3b':'#304937';ctx.textAlign='left';ctx.font='bold 58px sans-serif';ctx.fillText(rank,14,62,82);ctx.font='60px sans-serif';ctx.fillText(suit,14,120);ctx.textAlign='center';ctx.font='110px sans-serif';ctx.fillText(suit,128,257);const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;const face=new THREE.Mesh(new THREE.PlaneGeometry(.29,.42),new THREE.MeshBasicMaterial({map}));face.rotation.x=-Math.PI/2;return face;
  }
  pick(event:PointerEvent):{card?:string;action?:string;tile?:number;rpgTile?:{x:number;y:number};rpgPawn?:string}|undefined{
    if(this.room?.phase!=='playing')return;
    const rect=this.renderer.domElement.getBoundingClientRect();const mouse=new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);this.raycaster.setFromCamera(mouse,this.camera);
    const hit=this.raycaster.intersectObjects([this.ownHand,this.pieces,this.dice,this.actors,this.expansionFX.group],true).find(h=>{let p:THREE.Object3D|null=h.object;while(p){if(!p.visible)return false;p=p.parent;}return true;});
    if(!hit)return;let object:THREE.Object3D|null=hit.object;while(object){if(object.userData.rpgTile)return {rpgTile:object.userData.rpgTile};if(object.userData.rpgPawn)return {rpgPawn:object.userData.rpgPawn};if(object.userData.card)return{card:object.userData.card};if(object.userData.action)return{action:object.userData.action};if(object.userData.tile!==undefined)return{tile:object.userData.tile};object=object.parent;}
  }
  card(){return this.mesh(new THREE.BoxGeometry(.3,.016,.44),0xeadbb6);}
  orientDie(die:THREE.Object3D,value:number){const rotations:Record<number,[number,number,number]>={1:[0,0,0],2:[-Math.PI/2,0,0],3:[0,0,Math.PI/2],4:[0,0,-Math.PI/2],5:[Math.PI/2,0,0],6:[Math.PI,0,0]};die.rotation.set(...(rotations[value]||rotations[1]));}
  makeDie(){const materials=[];for(const face of [3,4,1,6,2,5]){const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#f4e8ce';ctx.fillRect(0,0,128,128);ctx.fillStyle='#344938';const pips:Record<number,number[][]>={1:[[64,64]],2:[[32,32],[96,96]],3:[[32,32],[64,64],[96,96]],4:[[32,32],[96,32],[32,96],[96,96]],5:[[32,32],[96,32],[64,64],[32,96],[96,96]],6:[[32,28],[96,28],[32,64],[96,64],[32,100],[96,100]]};pips[face].forEach(([x,y])=>{ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.fill();});const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;materials.push(new THREE.MeshStandardMaterial({map,roughness:.8}));}const die=new THREE.Mesh(new THREE.BoxGeometry(.34,.34,.34),materials);die.castShadow=true;return die;}
  moveToken(token:THREE.Mesh,from:number,steps:number,index:number,delay:number){const offset=(index%3)*.08-.08;this.tween(Math.max(160,steps*160),t=>{const progressed=t*steps,step=Math.min(steps-1,Math.floor(progressed)),fraction=t===1?1:progressed-step;const[a,b]=this.tilePosition((from+step)%24),[c,d]=this.tilePosition((from+step+1)%24);token.position.set(THREE.MathUtils.lerp(a,c,fraction)+offset,1.19+Math.sin(fraction*Math.PI)*.22,THREE.MathUtils.lerp(b,d,fraction));},()=>{this.burst(token.position,token.material instanceof THREE.MeshStandardMaterial?token.material.color.getHex():0xe3bd83);},delay);}
  burst(position:THREE.Vector3,color=0xe3bd83){for(let i=0;i<12;i++){const p=this.mesh(new THREE.TetrahedronGeometry(.055),color);p.position.copy(position);this.fx.add(p);const angle=i*Math.PI/6;this.tween(650,t=>{p.position.set(position.x+Math.sin(angle)*t*.7,position.y+Math.sin(t*Math.PI)*.6,position.z+Math.cos(angle)*t*.7);p.scale.setScalar(1-t);p.rotation.x=t*6;},()=>this.remove(p));}}
  fly(actor?:string,reverse=false,count=1){const seat=this.actorMap.get(actor||'');const a=seat?.userData.baseAngle||0;for(let i=0;i<Math.min(count,8);i++){const c=this.card(),start=new THREE.Vector3(Math.sin(a)*1.8,1.04,Math.cos(a)*1.8),end=new THREE.Vector3((i-(count-1)/2)*.16,1.04,0);if(reverse){const temp=start.clone();start.copy(end);end.copy(temp);}this.fx.add(c);this.tween(400,t=>{c.position.lerpVectors(start,end,t);c.position.y+=Math.sin(t*Math.PI)*.7;c.rotation.y=a+t*Math.PI;},()=>this.remove(c),i*65);}}
  deal(){const players=this.room?.players||[];for(let i=0;i<7;i++){const c=this.card();this.fx.add(c);this.tween(1050,t=>{c.position.set(Math.sin(t*Math.PI*6+i)*.3,1.1+i*.018+Math.abs(Math.sin(t*18))*.12,Math.cos(t*14+i)*.15);c.rotation.y=Math.sin(t*17+i)*.7;},()=>this.remove(c));}const cards=players.reduce((n,p)=>n+p.handCount,0);for(let i=0;i<cards;i++){const index=i%players.length,a=index*Math.PI*2/players.length,c=this.card();this.fx.add(c);c.visible=false;this.tween(330,t=>{c.visible=true;c.position.set(Math.sin(a)*1.75*t,1.12+Math.sin(t*Math.PI)*.35,Math.cos(a)*1.75*t);c.rotation.y=a+t*.3;c.scale.setScalar(1-t*.12);},()=>this.remove(c),1100+i*(1700/Math.max(cards,1)));}}
  slap(actor?:string,target?:string){const a=this.actorMap.get(actor||''),b=this.actorMap.get(target||'');if(!a||!b)return;if(this.mode==='first'&&[actor,target].includes(this.room?.players[this.self]?.id)){this.slapShot={until:performance.now()+3000,actor:actor!,target:target!};}this.moving.add(actor!);const from=a.userData.baseAngle,to=b.userData.baseAngle+.16;let delta=to-from;while(delta>Math.PI)delta-=Math.PI*2;while(delta<-Math.PI)delta+=Math.PI*2;const arm=a.userData.arms[0] as THREE.Group;this.tween(2200,t=>{const travel=t<.5?t*2:t>.72?(1-t)/.28:1;const angle=from+delta*travel;a.position.set(Math.sin(angle)*this.radius,-.38+Math.abs(Math.sin(t*45))*.04,Math.cos(angle)*this.radius);a.rotation.y=t>.48&&t<.72?Math.atan2(a.position.x-b.position.x,a.position.z-b.position.z):angle;arm.rotation.x=t>.48&&t<.68?1.6+Math.sin((t-.48)/.2*Math.PI)*.6:.5;b.rotation.z=t>.54&&t<.75?Math.sin((t-.54)/.21*Math.PI)*.3:0;},()=>{this.moving.delete(actor!);a.position.set(Math.sin(from)*this.radius,-.38,Math.cos(from)*this.radius);a.rotation.y=from;arm.rotation.x=.5;b.rotation.z=0;});this.tween(1,()=>{this.shake=.12;this.burst(b.position.clone().add(new THREE.Vector3(0,1.8,0)));},undefined,1200);}
  throwCards(actor?:string,target?:string,loser?:string,count=1){
    const a=this.actorMap.get(actor||''),b=this.actorMap.get(target||'');if(!a||!b)return;
    const from=a.position.clone().add(new THREE.Vector3(0,1.6,0)),face=b.position.clone().add(new THREE.Vector3(0,1.8,0));
    const arm=a.userData.arms[0] as THREE.Group;this.tween(700,t=>arm.rotation.x=.5+Math.sin(t*Math.PI)*1.3,()=>arm.rotation.x=.5);
    for(let i=0;i<Math.min(count,12);i++){const c=this.card();this.fx.add(c);this.tween(650,t=>{c.position.lerpVectors(from,face,t);c.position.y+=Math.sin(t*Math.PI)*.35;c.rotation.set(t*7,t*10,t*3);},()=>{this.remove(c);this.burst(face,0xeadbb6);},i*30);}
    this.tween(1,()=>{this.shake=.08;this.fly(loser,true,Math.min(count,12));},undefined,1050);
  }
  star(actor?:string){const seat=this.actorMap.get(actor||'');if(!seat)return;const vertices:number[]=[];for(let i=0;i<10;i++){const a=i*Math.PI/5+Math.PI/2,b=(i+1)*Math.PI/5+Math.PI/2,r=i%2?.16:.36,next=(i+1)%2?.16:.36;vertices.push(0,0,0,Math.cos(a)*r,Math.sin(a)*r,0,Math.cos(b)*next,Math.sin(b)*next,0);}const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();const star=this.mesh(geometry,0xffd05e);const start=seat.position.clone().add(new THREE.Vector3(0,2.1,0));this.fx.add(star);this.tween(1200,t=>{star.position.copy(start);star.position.y+=t*.7;star.scale.setScalar(Math.sin(t*Math.PI));star.quaternion.copy(this.camera.quaternion);star.rotateZ(t*.6);},()=>this.remove(star));this.burst(start,0xffd05e);}
  play(e:GameEvent){
    if(['rooftopJump','soreLoserShot','charadeTurn'].includes(e.kind)){this.partyFX.play(e);return;}
    if(e.kind.startsWith('poker')){this.pokerFX.play(e);return;}
    if(e.kind.startsWith('rpg')||e.kind.startsWith('scribble')||e.kind.startsWith('solitaire')||e.kind.startsWith('raid')){this.expansionFX.play(e);return;}
    if(e.kind.startsWith('chaos')){this.chaosFX.play(e);return;}
    if(e.kind==='triviaCorrect')this.star(e.actor);
    else if(e.kind==='deal')this.deal();
    else if(e.kind==='roll'){const values=e.data.dice as number[];this.dice.children.forEach((die,i)=>{const final=values?.[i]||1;const orientations:Record<number,[number,number,number]>={1:[0,0,0],2:[-Math.PI/2,0,0],3:[0,0,Math.PI/2],4:[0,0,-Math.PI/2],5:[Math.PI/2,0,0],6:[Math.PI,0,0]};const rotation=orientations[final];this.tween(950,t=>{die.position.set(.3+i*.55+Math.sin(t*13+i)*.35*(1-t),1.19+Math.abs(Math.sin(t*Math.PI*3))*.7*(1-t),-.25+Math.cos(t*11+i)*.25*(1-t));die.rotation.set(rotation[0]+(1-t)*Math.PI*8,rotation[1]+(1-t)*Math.PI*6,rotation[2]+(1-t)*Math.PI*10);});});}
    else if(e.kind==='trick'){const cards=this.pieces.children.filter(c=>c.userData.centerTrick);cards.forEach((card,i)=>{const from=card.position.clone(),to=new THREE.Vector3(Number(e.data.team)===0?-1.42:1.42,1.06+i*.018,-.28);this.tween(750,t=>{card.position.lerpVectors(from,to,t);card.position.y+=Math.sin(t*Math.PI)*.3;card.scale.setScalar(1.6-.6*t);card.rotation.y=t*.2;},undefined,650);});}
    else if(e.kind==='challenge')this.throwCards(e.actor,String(e.data.player),String(e.data.loser),Number(e.data.count)||1);
    else if(e.kind==='slap')this.slap(e.actor,e.target);
    else if(e.kind==='play'||e.kind==='clash')this.fly(e.actor,false,Number(e.data.count)||1);
    else if(e.kind==='draw'||e.kind==='collect')this.fly(e.actor,true,typeof e.data.count==='number'?e.data.count:e.kind==='collect'?4:1);
    else if(e.kind==='duelRound'){for(const [id,move] of [[e.actor,e.data.ace],[e.target,e.data.trump]]){const g=this.actorMap.get(String(id));if(!g)continue;const arms=g.userData.arms as THREE.Group[];this.tween(600,t=>{arms.forEach((arm,i)=>{arm.rotation.x=move==='block'?2.4:.5+Math.sin(t*Math.PI)*(i===0?1.6:.3);arm.rotation.z=move==='hook'?Math.sin(t*Math.PI)*1.2:0;});},()=>arms.forEach(arm=>arm.rotation.set(.5,0,0)));}this.shake=.07;this.burst(new THREE.Vector3(0,1.9,0),0xdd9979);}
    else if(['correct','win','duelEnd','buy','sell','tradeAccept','trick','lifeChoice'].includes(e.kind)){const actor=this.actorMap.get(e.actor||'');this.burst(actor?actor.position.clone().add(new THREE.Vector3(0,1.7,0)):new THREE.Vector3(0,1.3,0));}
    else{const g=this.actorMap.get(e.actor||'');if(g){const arms=g.userData.arms as THREE.Group[];this.tween(400,t=>arms.forEach(arm=>arm.rotation.x=.5-Math.sin(t*Math.PI)*.35));}}
  }
  animate=()=>{
    requestAnimationFrame(this.animate);const now=performance.now();this.environment.animate(now);this.chaosFX.update();for(const t of [...this.tweens]){if(now<t.start)continue;const progress=Math.min(1,(now-t.start)/t.duration);t.step(progress);if(progress===1){this.tweens.splice(this.tweens.indexOf(t),1);t.done?.();}}
    const pokerOffset=this.game==='poker'&&!!this.room&&this.room.phase!=='lobby',w=this.el.clientWidth,h=this.el.clientHeight;
    if(pokerOffset){if(!this.camera.view?.enabled||this.camera.view.fullWidth!==w||this.camera.view.fullHeight!==h)this.camera.setViewOffset(w,h,0,h*.23,w,h);}else if(this.camera.view?.enabled)this.camera.clearViewOffset();
    const angle=this.seatAngle(this.self);
    for(const card of this.pieces.children)if(card.userData.seat!==undefined)card.visible=!(this.mode==='first'&&card.userData.seat===this.self);
    this.ownHand.visible=now>=this.chaosShotUntil&&!(this.slapShot&&now<this.slapShot.until)&&this.mode==='first'&&this.room?.phase==='playing'&&!this.room.duel&&this.room.busyUntil<=Date.now();
    for(const object of this.ownHand.children){const c=object as THREE.Mesh<THREE.BoxGeometry,THREE.MeshStandardMaterial>,selected=this.selectedCards.has(c.userData.card),hovered=c.userData.card===this.hoveredCard;c.position.y=THREE.MathUtils.lerp(c.position.y,c.userData.baseY+(selected?.012:hovered?.006:0),.2);c.material.emissive.setHex(selected?0x60431c:hovered?0x263d29:0x000000);}

    for(const [i,g] of [...this.actorMap.values()].entries()){g.visible=!(this.mode==='first'&&now>=this.chaosShotUntil&&i===this.self&&!(this.slapShot&&now<this.slapShot.until));const inBout=!!this.room?.duel&&[this.room.duel.acePlayer,this.room.duel.trumpPlayer].includes(g.userData.id);g.userData.chairParts?.forEach((part:THREE.Object3D)=>part.visible=!inBout&&!this.moving.has(g.userData.id));if(this.room?.duel&&[this.room.duel.acePlayer,this.room.duel.trumpPlayer].includes(g.userData.id)){const side=g.userData.id===this.room.duel.acePlayer?-1:1;g.position.set(side*.75,.9+Math.sin(now*.006)*.035,0);g.rotation.y=side<0?-Math.PI/2:Math.PI/2;}else if(['charades','scribble'].includes(this.game)&&this.room?.phase==='playing'&&this.room.turn===i){const arms=g.userData.arms as THREE.Group[];arms[0].rotation.x=.7+Math.sin(now*.002)*.4;arms[1].rotation.z=Math.sin(now*.002)*.3;}}
    for(const [playerId,g] of this.actorMap){const p=this.room?.players.find(p=>p.id===playerId);if(this.moving.has(playerId)||this.room?.duel)continue;const a=g.userData.baseAngle;const victim=this.actorMap.get(p?.peekTarget||'');const leaning=['bluff','tarneeb','cards','poker'].includes(this.game)&&!!p&&p.peekingUntil>Date.now()&&!!victim;const base=new THREE.Vector3(Math.sin(a)*this.radius,-.38,Math.cos(a)*this.radius);if(leaning){base.lerp(victim!.position,.38);base.y=-.12;g.rotation.y=Math.atan2(base.x-victim!.position.x,base.z-victim!.position.z);}else g.rotation.y=a;g.position.lerp(base,.18);g.rotation.x=THREE.MathUtils.lerp(g.rotation.x,leaning?.42:0,.18);}
    let target:THREE.Vector3,look=new THREE.Vector3(0,this.mode==='first'?1:0,0);
    if(now<this.rooftopShotUntil){target=new THREE.Vector3(12,12,16);look.set(0,-.8,0);}
    else if(this.mode==='first'&&now<this.chaosShotUntil){target=new THREE.Vector3(6.7,7.4,8.8);look.set(0,1,0);}
    else if(this.slapShot&&now<this.slapShot.until){const a=this.actorMap.get(this.slapShot.actor),b=this.actorMap.get(this.slapShot.target),mid=a&&b?a.position.clone().add(b.position).multiplyScalar(.5):new THREE.Vector3();target=new THREE.Vector3(mid.x+6.7,7.4,mid.z+8.8);look.copy(mid).y=.4;}
    else if(this.room?.duel){target=this.mode==='first'?new THREE.Vector3(this.self===this.room.players.findIndex(p=>p.id===this.room!.duel!.acePlayer)?-.8:.8,2.3,1.2):new THREE.Vector3(0,4.5,6);look.set(0,1.8,0);}
    else target=this.mode==='first'?new THREE.Vector3(Math.sin(angle)*(this.radius+.15),this.board?2.65:1.72,Math.cos(angle)*(this.radius+.15)):this.board?(this.closeBoard&&!this.moving.size?new THREE.Vector3(0,this.game==='rpg'?12.7:7,this.game==='rpg'?6:1.2):new THREE.Vector3(.5,8.4,5.7)):new THREE.Vector3(6.7,7.4,8.8);
    if(this.board && this.mode!=='first'&&!this.room?.duel)look.y=.9;if(this.game==='rpg'&&this.mode!=='first')look.z=1.5;for(const token of this.tokenMap.values())if(token.userData.ring)token.userData.ring.scale.setScalar(1+Math.sin(now*.004)*.13);this.camera.position.lerp(target,this.slapShot&&now<this.slapShot.until?.3:.06);if(this.shake>.002){this.camera.position.x+=Math.sin(now*.13)*this.shake;this.shake*=.91;}this.camera.lookAt(look);this.renderer.render(this.scene,this.camera);
  };
}
