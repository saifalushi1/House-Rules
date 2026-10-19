/** Keep a stable chat node: follow new messages and layout changes until the reader scrolls up. */
export function followChat(log:HTMLElement){
 let following=true,programmatic=false,frame=0;
 const bottom=()=>{if(log.clientHeight)log.scrollTop=log.scrollHeight;};
 const settle=()=>{cancelAnimationFrame(frame);programmatic=true;frame=requestAnimationFrame(()=>{if(following)bottom();programmatic=false;});};
 const onScroll=()=>{if(!programmatic&&log.clientHeight)following=log.scrollHeight-log.clientHeight-log.scrollTop<12;};
 log.addEventListener('scroll',onScroll,{passive:true});
 const resize=new ResizeObserver(settle);resize.observe(log);settle();
 return {
  update(html:string){if(log.innerHTML===html)return;const top=log.scrollTop;
   const anchor=Array.from(log.children).find(el=>el.getBoundingClientRect().bottom>log.getBoundingClientRect().top) as HTMLElement|undefined;
   const anchorId=anchor?.dataset.messageId,offset=anchor?.getBoundingClientRect().top;
   programmatic=true;log.innerHTML=html;
   if(following)bottom();else{log.scrollTop=top;const same=Array.from(log.children).find(el=>(el as HTMLElement).dataset.messageId===anchorId);if(same&&offset!==undefined)log.scrollTop+=same.getBoundingClientRect().top-offset;}
   settle();
  },
  destroy(){cancelAnimationFrame(frame);resize.disconnect();log.removeEventListener('scroll',onScroll);}
 };
}
