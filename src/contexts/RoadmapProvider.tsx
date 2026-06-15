import { useState, useEffect, ReactNode } from 'react';
import { RoadmapItem, Swimlane } from '../types/roadmap';
import { DEFAULT_SWIMLANES, DEFAULT_ITEMS } from '../constants/roadmap';
import { RoadmapContext } from './RoadmapContext';

export function RoadmapProvider({ children }: { children: ReactNode }) {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [swimlanes, setSwimlanes] = useState<Swimlane[]>(() => {
    const savedSwimlanes = localStorage.getItem(`roadmap_swimlanes_${new Date().getFullYear()}`);
    return savedSwimlanes ? JSON.parse(savedSwimlanes) : DEFAULT_SWIMLANES;
  });
  const [items, setItems] = useState<RoadmapItem[]>(() => {
    const saved = localStorage.getItem(`roadmap_data_${new Date().getFullYear()}`);
    return saved ? JSON.parse(saved) : DEFAULT_ITEMS;
  });
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Ensure 'dark' class is removed on mount
  useEffect(() => {
    document.body.classList.remove('dark');
  }, []);

  const toggleTheme = () => {
    // Mantém sempre no modo claro
    setTheme('light');
    document.body.classList.remove('dark');
  };

  // Change year and load data directly
  const handleSetYear = (newYear: number) => {
    setYear(newYear);

    const savedSwimlanes = localStorage.getItem(`roadmap_swimlanes_${newYear}`);
    setSwimlanes(savedSwimlanes ? JSON.parse(savedSwimlanes) : DEFAULT_SWIMLANES);

    const saved = localStorage.getItem(`roadmap_data_${newYear}`);
    setItems(saved ? JSON.parse(saved) : (newYear === new Date().getFullYear() ? DEFAULT_ITEMS : []));
  };

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
      setYear: handleSetYear,
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
