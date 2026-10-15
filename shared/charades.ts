export const charadeCategories = {
  countries:'Countries', brands:'Brands', fictional:'Fictional characters', accents:'Accents · voice round', heroes:'Superheroes & villains', cars:'Cars', anime:'Anime', historical:'Historical figures', screen:'Movies & TV shows',
  animals:'Animals & wildlife', jobs:'Jobs & professions', sports:'Sports & movement', daily:'Everyday life', food:'Food & cooking',
  travel:'Travel & adventure', fantasy:'Fantasy & science fiction', objects:'Objects & gadgets', emotions:'Emotions & reactions', celebrations:'Parties & celebrations',
} as const;
export type CharadeCategory = keyof typeof charadeCategories;

export function charadePair(r:{players:{id:string}[];charadeTeams?:string[][]},id:string){const selected=r.charadeTeams?.findIndex(t=>t.includes(id));return selected!==undefined&&selected>=0?selected:Math.floor(r.players.findIndex(p=>p.id===id)/2);}
export function charadeTeamMembers(r:{players:{id:string}[];charadeTeams?:string[][]},team:number){return r.charadeTeams?.[team]||r.players.slice(team*2,team*2+2).map(p=>p.id);}
