import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { RoadmapItem, Swimlane } from '../types/roadmap';
import { DEFAULT_SWIMLANES, DEFAULT_ITEMS } from '../constants/roadmap';

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
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const RoadmapContext = createContext<RoadmapContextData | undefined>(undefined);

export function RoadmapProvider({ children }: { children: ReactNode }) {
  const [year, setYear] = useState<number>(new Date().getFullYear());

  const [swimlanes, setSwimlanes] = useState<Swimlane[]>(() => {
    const savedSwimlanes = localStorage.getItem(`roadmap_swimlanes_${new Date().getFullYear()}`);
    if (savedSwimlanes) {
      return JSON.parse(savedSwimlanes);
    }
    return DEFAULT_SWIMLANES;
  });

  const [items, setItems] = useState<RoadmapItem[]>(() => {
    const saved = localStorage.getItem(`roadmap_data_${new Date().getFullYear()}`);
    if (saved) {
      return JSON.parse(saved);
    }
    return DEFAULT_ITEMS;
  });

  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Load and apply theme (Sempre modo claro)
  useEffect(() => {
    document.body.classList.remove('dark');
  }, []);

  const toggleTheme = () => {
    // Mantém sempre no modo claro
    setTheme('light');
    document.body.classList.remove('dark');
  };

  // Carrega dados quando o ano muda
  // Nota: eslint reclama de setSwimlanes/setItems aqui, mas isso é
  // intencional pois reflete mudança de prop global. Ignoramos a regra
  // para sincronizar store externa de forma que não gere falhas de renderização.
  useEffect(() => {
    const savedSwimlanes = localStorage.getItem(`roadmap_swimlanes_${year}`);
    const nextSwimlanes = savedSwimlanes ? JSON.parse(savedSwimlanes) : DEFAULT_SWIMLANES;

    const saved = localStorage.getItem(`roadmap_data_${year}`);
    const nextItems = saved ? JSON.parse(saved) : (year === new Date().getFullYear() ? DEFAULT_ITEMS : []);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSwimlanes(nextSwimlanes);
    setItems(nextItems);
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
      deleteSwimlane,
      theme,
      toggleTheme
    }}>
      {children}
    </RoadmapContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRoadmap() {
  const context = useContext(RoadmapContext);
  if (!context) throw new Error('useRoadmap must be used within RoadmapProvider');
  return context;
}
