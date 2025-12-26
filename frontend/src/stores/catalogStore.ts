import { create } from 'zustand';

interface CatalogState {
  query: string;
  categories: string[];
  
  // Advanced filters
  series?: string;
  title?: string;
  theme?: string;
  actor?: string;
  director?: string;
  genre?: string;
  mood?: string;
  era?: string;

  page: number;

  setQuery: (query: string) => void;
  setCategories: (categories: string[]) => void;
  toggleCategory: (category: string) => void;
  clearCategories: () => void;
  
  setFilter: (key: keyof CatalogState, value: string | undefined) => void;

  setPage: (page: number) => void;
  resetFilters: () => void;
}

export const useCatalogStore = create<CatalogState>((set) => ({
  query: '',
  categories: [],
  page: 0,

  setQuery: (query) => set({ query, page: 0 }),
  setCategories: (categories) => set({ categories, page: 0 }),
  toggleCategory: (category) =>
    set((state) => ({
      categories: state.categories.includes(category)
        ? state.categories.filter((c) => c !== category)
        : [...state.categories, category],
      page: 0,
    })),
  clearCategories: () => set({ categories: [], page: 0 }),
  
  setFilter: (key, value) => set((state) => ({ ...state, [key]: value, page: 0 })),

  setPage: (page) => set({ page }),
  resetFilters: () => set({ 
    query: '', 
    categories: [], 
    series: undefined,
    title: undefined,
    theme: undefined,
    actor: undefined,
    director: undefined,
    genre: undefined,
    mood: undefined,
    era: undefined,
    page: 0 
  }),
}));
