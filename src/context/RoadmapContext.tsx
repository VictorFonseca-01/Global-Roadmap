import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { RoadmapItem, Swimlane } from '../types/roadmap';

const DEFAULT_SWIMLANES: Swimlane[] = [
  { id: 'milestones', title: 'MILESTONES', color: '#3b82f6' }, // blue-500
  { id: 'self_serve', title: 'SELF SERVE', color: '#eab308' }, // yellow-500
  { id: 'mobile', title: 'MOBILE', color: '#ef4444' }, // red-500
  { id: 'webstore', title: 'WEBSTORE', color: '#22c55e' }, // green-500
  { id: 'help_desk', title: 'HELP DESK', color: '#6366f1' }, // indigo-500
  { id: 'infrastructure', title: 'INFRASTRUCTURE', color: '#ec4899' }, // pink-500
];

const DEFAULT_ITEMS: RoadmapItem[] = [
  { id: '1', title: 'Community Site Beta', swimlaneId: 'milestones', startPercentage: 10, widthPercentage: 15, color: '#f87171', dependsOn: [] },
  { id: '2', title: 'Android App', swimlaneId: 'mobile', startPercentage: 15, widthPercentage: 20, color: '#ef4444', dependsOn: ['1'] },
];

interface RoadmapContextData {
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
}

const RoadmapContext = createContext<RoadmapContextData | undefined>(undefined);

export function RoadmapProvider({ children }: { children: ReactNode }) {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [swimlanes, setSwimlanes] = useState<Swimlane[]>([]);
  const [items, setItems] = useState<RoadmapItem[]>([]);

  // Load data when year changes
  useEffect(() => {
    const savedSwimlanes = localStorage.getItem(`roadmap_swimlanes_${year}`);
    if (savedSwimlanes) {
      setSwimlanes(JSON.parse(savedSwimlanes));
    } else {
      setSwimlanes(DEFAULT_SWIMLANES);
    }

    const saved = localStorage.getItem(`roadmap_data_${year}`);
    if (saved) {
      setItems(JSON.parse(saved));
    } else {
      // Se for o ano atual e estiver vazio, carregar default, senão vazio.
      setItems(year === new Date().getFullYear() ? DEFAULT_ITEMS : []);
    }
  }, [year]);

  // Save data when items change
  useEffect(() => {
    localStorage.setItem(`roadmap_data_${year}`, JSON.stringify(items));
  }, [items, year]);

  useEffect(() => {
    if (swimlanes.length > 0) {
      localStorage.setItem(`roadmap_swimlanes_${year}`, JSON.stringify(swimlanes));
    }
  }, [swimlanes, year]);

  const updateItem = (id: string, updates: Partial<RoadmapItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const addItem = (item: RoadmapItem) => {
    setItems(prev => [...prev, item]);
  };

  const deleteItem = (id: string) => {
    setItems(prev => {
      // Also remove dependencies to this item
      return prev.filter(i => i.id !== id).map(i => ({
        ...i,
        dependsOn: i.dependsOn.filter(depId => depId !== id)
      }));
    });
  };

  const addSwimlane = (swimlane: Swimlane) => {
    setSwimlanes(prev => [...prev, swimlane]);
  };

  const updateSwimlane = (id: string, updates: Partial<Swimlane>) => {
    setSwimlanes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteSwimlane = (id: string) => {
    setSwimlanes(prev => prev.filter(s => s.id !== id));
    setItems(prev => {
      const remainingItems = prev.filter(i => i.swimlaneId !== id);
      const remainingIds = new Set(remainingItems.map(i => i.id));
      return remainingItems.map(i => ({
        ...i,
        dependsOn: i.dependsOn.filter(depId => remainingIds.has(depId))
      }));
    });
  };

  return (
    <RoadmapContext.Provider value={{ 
      year, 
      setYear, 
      swimlanes, 
      setSwimlanes, 
      items, 
      setItems, 
      updateItem, 
      addItem, 
      deleteItem,
      addSwimlane,
      updateSwimlane,
      deleteSwimlane
    }}>
      {children}
    </RoadmapContext.Provider>
  );
}

export function useRoadmap() {
  const context = useContext(RoadmapContext);
  if (!context) throw new Error('useRoadmap must be used within RoadmapProvider');
  return context;
}
