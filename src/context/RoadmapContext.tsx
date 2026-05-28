import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { RoadmapItem, Swimlane } from '../types/roadmap';

const DEFAULT_SWIMLANES: Swimlane[] = [
  { id: 'infrastructure', title: 'INFRASTRUCTURE', color: '#3b82f6', description: 'Core server and hardware systems', icon: 'Server' },
  { id: 'security', title: 'SECURITY & COMPLIANCE', color: '#ef4444', description: 'Security hardening and RLS policies', icon: 'ShieldAlert' },
  { id: 'mobile', title: 'MOBILE APP', color: '#eab308', description: 'iOS and Android client apps', icon: 'Smartphone' },
  { id: 'ai_systems', title: 'AI SYSTEMS', color: '#a855f7', description: 'AI-driven monitoring and intelligence', icon: 'Cpu' },
  { id: 'governance', title: 'GOVERNANCE', color: '#10b981', description: 'IT Governance, legal, audit and controls', icon: 'Layers' },
  { id: 'cloud', title: 'CLOUD', color: '#06b6d4', description: 'Kubernetes and multi-cloud platforms', icon: 'Cloud' },
  { id: 'help_desk', title: 'HELP DESK', color: '#6366f1', description: 'Support platforms and portal development', icon: 'Headphones' },
  { id: 'web_platform', title: 'WEB PLATFORM', color: '#ec4899', description: 'Public site and web apps', icon: 'Globe' },
];

const DEFAULT_ITEMS: RoadmapItem[] = [
  { 
    id: '1', 
    title: 'Migração Windows Server 2025', 
    swimlaneId: 'infrastructure', 
    startPercentage: 10, 
    widthPercentage: 25, 
    color: '#3b82f6', 
    dependsOn: [], 
    progress: 75, 
    status: 'on_track', 
    priority: 'high', 
    ownerName: 'Sarah Jenkins', 
    ownerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    description: 'Migração de servidores core corporativos para a versão 2025.'
  },
  { 
    id: '2', 
    title: 'Descontinuação Windows Server 2012 R2', 
    swimlaneId: 'infrastructure', 
    startPercentage: 40, 
    widthPercentage: 30, 
    color: '#f43f5e', 
    dependsOn: ['1'], 
    progress: 20, 
    status: 'at_risk', 
    priority: 'critical', 
    ownerName: 'Sarah Jenkins', 
    ownerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    description: 'Remoção definitiva de instâncias obsoletas pós-migração.'
  },
  { 
    id: '3', 
    title: 'Implementação Zero Trust', 
    swimlaneId: 'security', 
    startPercentage: 15, 
    widthPercentage: 45, 
    color: '#10b981', 
    dependsOn: [], 
    progress: 45, 
    status: 'on_track', 
    priority: 'critical', 
    ownerName: 'Alex Rivers', 
    ownerAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    description: 'Arquitetura baseada em verificação contínua e privilégio mínimo.'
  },
  { 
    id: '4', 
    title: 'SOC Deployment', 
    swimlaneId: 'security', 
    startPercentage: 65, 
    widthPercentage: 25, 
    color: '#ef4444', 
    dependsOn: ['3'], 
    progress: 5, 
    status: 'delayed', 
    priority: 'high', 
    ownerName: 'Alex Rivers', 
    ownerAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    description: 'Implantação completa do Security Operations Center integrado.'
  },
  { 
    id: '5', 
    title: 'Kubernetes Infrastructure', 
    swimlaneId: 'cloud', 
    startPercentage: 20, 
    widthPercentage: 35, 
    color: '#06b6d4', 
    dependsOn: [], 
    progress: 90, 
    status: 'on_track', 
    priority: 'high', 
    ownerName: 'Daniel Vance', 
    ownerAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
    description: 'Implantação dos clusters principais para microsserviços.'
  },
  { 
    id: '6', 
    title: 'Plataforma IA de Monitoramento', 
    swimlaneId: 'ai_systems', 
    startPercentage: 30, 
    widthPercentage: 40, 
    color: '#a855f7', 
    dependsOn: ['5'], 
    progress: 50, 
    status: 'on_track', 
    priority: 'medium', 
    ownerName: 'Elena Rostova', 
    ownerAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    description: 'Análise de métricas e alertas baseada em modelos inteligentes.'
  },
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
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const RoadmapContext = createContext<RoadmapContextData | undefined>(undefined);

export function RoadmapProvider({ children }: { children: ReactNode }) {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [swimlanes, setSwimlanes] = useState<Swimlane[]>([]);
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Load and apply theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('roadmap_theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
      document.body.classList.toggle('dark', savedTheme === 'dark');
    } else {
      document.body.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('roadmap_theme', nextTheme);
    document.body.classList.toggle('dark', nextTheme === 'dark');
  };

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

export function useRoadmap() {
  const context = useContext(RoadmapContext);
  if (!context) throw new Error('useRoadmap must be used within RoadmapProvider');
  return context;
}
