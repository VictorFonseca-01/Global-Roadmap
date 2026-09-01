/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { RoadmapItem, Swimlane } from '../types/roadmap';

const DEFAULT_SWIMLANES: Swimlane[] = [
  { id: 'infrastructure', title: 'INFRASTRUCTURE & SERVERS', color: '#3b82f6', description: 'Lifecycle, hardware and OS upgrade timelines', icon: 'Server' },
  { id: 'security', title: 'CYBERSECURITY & RISK', color: '#ef4444', description: 'Zero Trust, audits, compliance and SOC hardening', icon: 'ShieldAlert' },
  { id: 'governance', title: 'GOVERNANCE & COMPLIANCE', color: '#10b981', description: 'LGPD, SOC2 audit, policies and operational controls', icon: 'Layers' },
  { id: 'cloud', title: 'CLOUD & HYBRID ENVIRONMENTS', color: '#06b6d4', description: 'Kubernetes, cloud migration and multi-region failovers', icon: 'Cloud' },
  { id: 'lifecycle', title: 'APPLICATION LIFECYCLE (EOL)', color: '#a855f7', description: 'Database and legacy software deprecation roadmaps', icon: 'Cpu' },
];

const DEFAULT_ITEMS: RoadmapItem[] = [
  { 
    id: '1', 
    title: 'Migração Windows Server 2025', 
    swimlaneId: 'infrastructure', 
    startDate: '2026-01-15',
    endDate: '2026-04-15',
    startPercentage: 5, 
    widthPercentage: 25, 
    color: '#3b82f6', // Azul -> Em Produção / Upgrade Ativo
    dependsOn: [], 
    progress: 85, 
    status: 'on_track', 
    priority: 'high', 
    ownerName: 'Sarah Jenkins', 
    ownerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    description: 'Upgrade dos servidores centrais AD e arquivos corporativos para a versão 2025.'
  },
  { 
    id: '2', 
    title: 'Descontinuação Windows Server 2012 R2', 
    swimlaneId: 'infrastructure', 
    startDate: '2026-04-20',
    endDate: '2026-07-01',
    startPercentage: 32, 
    widthPercentage: 20, 
    color: '#ef4444', // Vermelho -> EOL Crítico
    dependsOn: ['1'], 
    progress: 10, 
    status: 'at_risk', 
    priority: 'critical', 
    ownerName: 'Sarah Jenkins', 
    ownerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    description: 'Remoção definitiva e descarte de servidores core antigos em final de suporte.'
  },
  { 
    id: '3', 
    title: 'Implementação Zero Trust Network Access', 
    swimlaneId: 'security', 
    startDate: '2026-02-01',
    endDate: '2026-06-30',
    startPercentage: 10, 
    widthPercentage: 40, 
    color: '#10b981', // Verde -> Suportado / Hardening
    dependsOn: [], 
    progress: 60, 
    status: 'on_track', 
    priority: 'critical', 
    ownerName: 'Alex Rivers', 
    ownerAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    description: 'Eliminação da VPN corporativa legada, migrando para acesso verificado contínuo.'
  },
  { 
    id: '4', 
    title: 'Auditoria de Compliance LGPD / RGPD', 
    swimlaneId: 'governance', 
    startDate: '2026-07-15',
    endDate: '2026-11-01',
    startPercentage: 55, 
    widthPercentage: 30, 
    color: '#a855f7', // Roxo -> Planejamento Estratégico
    dependsOn: ['3'], 
    progress: 5, 
    status: 'on_track', 
    priority: 'medium', 
    ownerName: 'Marcus Brody', 
    ownerAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    description: 'Mapeamento de inventário de dados sensíveis e auditoria de RLS policies em produção.'
  },
  { 
    id: '5', 
    title: 'Descontinuação Banco Oracle 11g', 
    swimlaneId: 'lifecycle', 
    startDate: '2026-05-01',
    endDate: '2026-09-01',
    startPercentage: 40, 
    widthPercentage: 35, 
    color: '#ef4444', // Vermelho -> EOL Crítico
    dependsOn: [], 
    progress: 40, 
    status: 'delayed', 
    priority: 'high', 
    ownerName: 'Daniel Vance', 
    ownerAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
    description: 'Migração de sistemas satélite legados do Oracle Database 11g para Postgres AWS RDS.'
  },
  { 
    id: '6', 
    title: 'Estratégia Cloud Disaster Recovery (AWS)', 
    swimlaneId: 'cloud', 
    startDate: '2026-03-01',
    endDate: '2026-08-31',
    startPercentage: 20, 
    widthPercentage: 50, 
    color: '#eab308', // Amarelo -> Migração / Replicação Ativa
    dependsOn: [], 
    progress: 50, 
    status: 'on_track', 
    priority: 'high', 
    ownerName: 'Elena Rostova', 
    ownerAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    description: 'Configuração e teste anual de Disaster Recovery multi-região para o core bancário.'
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
  const currentYear = new Date().getFullYear();
  const [year, _setYear] = useState<number>(currentYear);
  const [swimlanes, setSwimlanes] = useState<Swimlane[]>(() => {
    const saved = localStorage.getItem(`roadmap_swimlanes_${currentYear}`);
    try {
      return saved ? JSON.parse(saved) : DEFAULT_SWIMLANES;
    } catch {
      return DEFAULT_SWIMLANES;
    }
  });
  const [items, setItems] = useState<RoadmapItem[]>(() => {
    const saved = localStorage.getItem(`roadmap_data_${currentYear}`);
    try {
      return saved ? JSON.parse(saved) : DEFAULT_ITEMS;
    } catch {
      return DEFAULT_ITEMS;
    }
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

  const setYear = (y: number) => {
    _setYear(y);

    const savedSwimlanes = localStorage.getItem(`roadmap_swimlanes_${y}`);
    if (savedSwimlanes) {
      try {
        setSwimlanes(JSON.parse(savedSwimlanes));
      } catch {
        setSwimlanes(DEFAULT_SWIMLANES);
      }
    } else {
      setSwimlanes(DEFAULT_SWIMLANES);
    }

    const saved = localStorage.getItem(`roadmap_data_${y}`);
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch {
        setItems(y === currentYear ? DEFAULT_ITEMS : []);
      }
    } else {
      setItems(y === currentYear ? DEFAULT_ITEMS : []);
    }
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
