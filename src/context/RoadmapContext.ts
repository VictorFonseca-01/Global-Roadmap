import { createContext, useContext } from 'react';
import { RoadmapItem, Swimlane } from '../types/roadmap';

export interface RoadmapContextData {
  year: number;
  setYear: (y: number) => void;
  swimlanes: Swimlane[];
  setSwimlanes: React.Dispatch<React.SetStateAction<Swimlane[]>>;
  items: RoadmapItem[];
  setItems: React.Dispatch<React.SetStateAction<RoadmapItem[]>>;
  updateItem: (id: string, updates: Partial<RoadmapItem>) => void;
  addItem: (item: RoadmapItem) => void;
  deleteItem: (id: string) => void;
  addSwimlane: (swimlane: Swimlane) => void;
  updateSwimlane: (id: string, updates: Partial<Swimlane>) => void;
  deleteSwimlane: (id: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const RoadmapContext = createContext<RoadmapContextData | undefined>(undefined);

export function useRoadmap() {
  const context = useContext(RoadmapContext);
  if (!context) throw new Error('useRoadmap must be used within RoadmapProvider');
  return context;
}
