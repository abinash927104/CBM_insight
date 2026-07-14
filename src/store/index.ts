import { create } from 'zustand';
import { CBMStore, CNDataRecord } from '@/types';
import { normalizeData, applyDynamicMappings } from '@/lib/data/parser';

export const useCBMStore = create<CBMStore>((set, get) => ({
  rawData: [],
  data: [],
  filteredData: [],
  
  plants: [],
  areas: [],
  equipment: [],
  
  filters: {
    plant: null,
    area: null,
    status: 'ALL',
    month: null,
    cause: null,
    technology: null,
  },
  
  setData: (rawData: any[]) => {
    // Process and normalize raw data using parser
    const processedData = applyDynamicMappings(normalizeData(rawData));
    
    set({
      rawData,
      data: processedData,
      filteredData: processedData,
      // Compute dynamic aggregations
      plants: Array.from(new Set(processedData.map((d) => d.plantName))).sort(),
      areas: Array.from(new Set(processedData.map((d) => d.area))).sort(),
      equipment: Array.from(new Set(processedData.map((d) => d.equipment))).sort(),
    });
  },
  
  setFilter: (key, value) => {
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value,
      },
    }));
    get().computeFilteredData();
  },
  
  resetFilters: () => {
    set((state) => ({
      filters: {
        plant: null,
        area: null,
        status: 'ALL',
        month: null,
        cause: null,
        technology: null,
      }
    }));
    get().computeFilteredData();
  },

  computeFilteredData: () => {
    const { data, filters } = get();
    
    let result = data;
    
    if (filters.plant) {
      result = result.filter(d => d.plantName === filters.plant);
    }
    if (filters.area) {
      result = result.filter(d => d.area === filters.area);
    }
    if (filters.status !== 'ALL') {
      const isOpen = filters.status === 'OPEN';
      result = result.filter(d => d.isOpen === isOpen);
    }
    if (filters.cause) {
      result = result.filter(d => d.causeCode === filters.cause);
    }
    if (filters.technology) {
      result = result.filter(d => d.technology === filters.technology);
    }
    
    set({ filteredData: result });
  }
}));
