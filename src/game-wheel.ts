import {games,type Game} from '../shared/types';
export function spinGameWheel(root:HTMLElement,choose:(game:Game)=>void,allowed:()=>boolean){
 if(!allowed()||root.querySelector('.game-wheel-modal'))return;
 const entries=Object.entries(games) as [Game,(typeof games)[Game]][],step=360/entries.length;
 // Rejection sampling keeps every game equally likely.
 const random=new Uint32Array(1),limit=Math.floor(2**32/entries.length)*entries.length;
 do{crypto.getRandomValues(random);}while(random[0]>=limit);
 const index=random[0]%entries.length,[game,meta]=entries[index];
 const overlay=document.createElement('div');overlay.className='modal-backdrop game-wheel-modal';
 overlay.innerHTML='<div class="modal wheel-modal" role="dialog" aria-modal="true" aria-labelledby="wheel-title"><h2 id="wheel-title">Let the wheel decide</h2><div class="game-wheel-wrap"><span class="wheel-pointer">▼</span><div class="game-wheel" aria-hidden="true"></div></div><p class="wheel-result" role="status" aria-live="polite">Picking from all '+entries.length+' games…</p><button class="secondary wheel-close">Cancel</button></div>';
 root.append(overlay);const close=overlay.querySelector<HTMLButtonElement>('.wheel-close')!,wheel=overlay.querySelector<HTMLElement>('.game-wheel')!,result=overlay.querySelector<HTMLElement>('.wheel-result')!;
 wheel.style.background='conic-gradient('+entries.map((_,i)=>(i%2?'#405d42':'#b58a4b')+' '+i*step+'deg '+(i+1)*step+'deg').join(',')+')';
 entries.forEach(([key,g],i)=>{const mark=document.createElement('span');mark.textContent=g.icon;mark.title=g.name;mark.style.transform='rotate('+(i*step+step/2)+'deg) translateY(-110px) rotate('+(-i*step-step/2)+'deg)';mark.dataset.game=key;wheel.append(mark);});
 const previous=document.activeElement as HTMLElement|null;let timer:ReturnType<typeof setTimeout>;
 const dismiss=()=>{clearTimeout(timer);overlay.remove();document.removeEventListener('keydown',onKey);(previous?.isConnected?previous:document.querySelector<HTMLElement>('[data-action="spinGame"]'))?.focus();};
 const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();dismiss();}if(e.key==='Tab'){e.preventDefault();close.focus();}};
 document.addEventListener('keydown',onKey);close.onclick=dismiss;close.focus();
 requestAnimationFrame(()=>requestAnimationFrame(()=>wheel.style.transform='rotate('+(1800+360-(index*step+step/2))+'deg)'));
 timer=setTimeout(()=>{if(!allowed()){result.textContent='The lobby changed. Spin again when you can choose a game.';}else{choose(game);result.textContent=meta.name+' · '+meta.players+' players. Selected!'+(document.querySelector('#chat-form')?' Apply your rules in the lobby when ready.':'');}close.textContent='Done';},3200);
}
