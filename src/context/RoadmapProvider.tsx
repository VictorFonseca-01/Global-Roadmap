import { useState, useEffect, ReactNode, useCallback } from 'react';
import { RoadmapItem, Swimlane } from '../types/roadmap';
import { RoadmapContext } from './RoadmapContext';
import { DEFAULT_SWIMLANES, DEFAULT_ITEMS } from './RoadmapConstants';

export function RoadmapProvider({ children }: { children: ReactNode }) {
  const currentYear = new Date().getFullYear();
  const [year, setYearState] = useState<number>(currentYear);
  const [swimlanes, setSwimlanes] = useState<Swimlane[]>(() => {
    const savedSwimlanes = localStorage.getItem(`roadmap_swimlanes_${currentYear}`);
    if (savedSwimlanes) {
      return JSON.parse(savedSwimlanes);
    }
    return DEFAULT_SWIMLANES;
  });
  const [items, setItems] = useState<RoadmapItem[]>(() => {
    const saved = localStorage.getItem(`roadmap_data_${currentYear}`);
    if (saved) {
      return JSON.parse(saved);
    }
    return DEFAULT_ITEMS;
  });
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    document.body.classList.remove('dark');
  }, []);

  const toggleTheme = () => {
    setTheme('light');
    document.body.classList.remove('dark');
  };

  const setYear = useCallback((newYear: number) => {
    setYearState(newYear);
    const savedSwimlanes = localStorage.getItem(`roadmap_swimlanes_${newYear}`);
    if (savedSwimlanes) {
      setSwimlanes(JSON.parse(savedSwimlanes));
    } else {
      setSwimlanes(DEFAULT_SWIMLANES);
    }

    const saved = localStorage.getItem(`roadmap_data_${newYear}`);
    if (saved) {
      setItems(JSON.parse(saved));
    } else {
      setItems(newYear === new Date().getFullYear() ? DEFAULT_ITEMS : []);
    }
  }, []);

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
