export interface CNDataRecord {
  plantId: string; // The raw ID, e.g. "3101"
  plantName: string; // The derived name, e.g. "Smelter 1"
  notification: string;
  notificationDate: string | Date;
  location: string;
  workCenter: string;
  plantSection: string; // Used to derive Area
  area: string; // The derived Area
  equipment: string;
  description: string;
  functionalLocation: string;
  userStatus: string;
  systemStatus: string;
  causeCode: string; // Normalized
  completionDate: string | Date | null;
  requiredStart: string | Date | null;
  requiredEnd: string | Date | null;
  ageing: number;
  isOpen: boolean;
  technology: string; // Derived from cause code, work center, or description if possible
  isCritical: boolean;
  isHotspot: boolean; // Flagged as hotspot
  isOnTime: boolean; // Flagged as closed on time
  // Fallback for dynamically added columns
  [key: string]: any;
}

export interface CBMStore {
  // Raw uploaded data
  rawData: any[];
  // Processed data
  data: CNDataRecord[];
  // Data after applying active filters
  filteredData: CNDataRecord[];
  
  // Dynamic aggregations
  plants: string[];
  areas: string[];
  equipment: string[];
  
  // Active Filters
  filters: {
    plant: string | null;
    area: string | null;
    status: 'ALL' | 'OPEN' | 'CLOSED';
    month: string | null;
    cause: string | null;
    technology: string | null;
  };
  
  // Actions
  setData: (rawData: any[]) => void;
  setFilter: (key: keyof CBMStore['filters'], value: any) => void;
  resetFilters: () => void;
  computeFilteredData: () => void;
}
