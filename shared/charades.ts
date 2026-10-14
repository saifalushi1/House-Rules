export const charadeCategories = {
  countries:'Countries', brands:'Brands', fictional:'Fictional characters', accents:'Accents · voice round', heroes:'Superheroes & villains', cars:'Cars', anime:'Anime', historical:'Historical figures', screen:'Movies & TV shows',
  animals:'Animals & wildlife', jobs:'Jobs & professions', sports:'Sports & movement', daily:'Everyday life', food:'Food & cooking',
  travel:'Travel & adventure', fantasy:'Fantasy & science fiction', objects:'Objects & gadgets', emotions:'Emotions & reactions', celebrations:'Parties & celebrations',
} as const;
export type CharadeCategory = keyof typeof charadeCategories;
