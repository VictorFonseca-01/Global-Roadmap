import React, { useState } from 'react';
import { 
  Bot, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Sun, 
  Moon,
  LayoutDashboard,
  GitFork,
  Shield,
  Layers,
  BarChart3,
  Settings,
  AlertTriangle,
  FolderKanban,
  Milestone,
  TrendingUp
} from 'lucide-react';
import { RoadmapProvider, useRoadmap } from '../context/RoadmapContext';
import { TimelineGrid } from '../components/TimelineGrid';
import { ItemModal } from '../components/ItemModal';
import { CategoryModal } from '../components/CategoryModal';
import { AIAssistant } from '../components/AIAssistant';
import { RoadmapItem, Swimlane } from '../types/roadmap';

function StrategicTimelineInner() {
  const { year, setYear, addItem, swimlanes, items, theme, toggleTheme } = useRoadmap();
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RoadmapItem | null>(null);
  const [editingCategory, setEditingCategory] = useState<Swimlane | null | undefined>(undefined);

  // KPI Calculations
  const totalRoadmaps = items.length;
  const totalCategories = swimlanes.length;
  const milestonesCount = items.filter(i => i.status === 'on_track').length;
  const criticalCount = items.filter(i => i.status === 'delayed' || i.priority === 'critical').length;
  const avgProgress = totalRoadmaps > 0 
    ? Math.round(items.reduce((acc, i) => acc + i.progress, 0) / totalRoadmaps) 
    : 0;

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val)) setYear(val);
  };

  const handleCreateNewItem = () => {
    if (swimlanes.length === 0) return;
    const newItem: RoadmapItem = {
      id: Date.now().toString(),
      title: 'Novo Roadmap Item',
      color: swimlanes[0].color,
      swimlaneId: swimlanes[0].id,
      startPercentage: 10,
      widthPercentage: 15,
      dependsOn: [],
      progress: 0,
      status: 'on_track',
      priority: 'medium',
      ownerName: 'Sarah Jenkins',
      ownerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      description: ''
    };
    addItem(newItem);
    setEditingItem(newItem);
  };

  return (
    <div className="h-screen w-screen bg-transparent flex overflow-hidden font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Sidebar - Linear/Plane style */}
      <aside className="w-60 bg-slate-100/80 dark:bg-slate-950/40 backdrop-blur-lg border-r border-slate-200 dark:border-white/5 flex flex-col py-4 shrink-0 z-20">
        {/* Brand Logo */}
        <div className="px-6 pb-6 border-b border-slate-200 dark:border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-500/20">
            Ω
          </div>
          <span className="font-extrabold text-sm tracking-widest text-slate-800 dark:text-slate-200">GLOBAL ROADMAP</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          {[
            { label: 'Dashboard', icon: LayoutDashboard },
            { label: 'Roadmaps', icon: GitFork, active: true },
            { label: 'Governança', icon: Layers },
            { label: 'Segurança', icon: Shield },
            { label: 'Relatórios', icon: BarChart3 },
            { label: 'Configurações', icon: Settings },
          ].map((item, idx) => (
            <button
              key={idx}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                item.active 
                  ? 'bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border-l-4 border-indigo-600' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Bottom profile / placeholder */}
        <div className="px-6 pt-4 border-t border-slate-200 dark:border-white/5 flex items-center gap-3">
          <img className="w-8 h-8 rounded-full border border-slate-300 dark:border-white/10" src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150" alt="Avatar" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">Victor Fonseca</p>
            <p className="text-[10px] text-slate-400 truncate">Administrator</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-transparent">
        {/* Header */}
        <header className="h-16 bg-white/40 dark:bg-slate-950/40 backdrop-blur-lg border-b border-slate-200 dark:border-white/5 px-6 flex justify-between items-center shrink-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-indigo-200 dark:via-slate-100 dark:to-indigo-200 bg-clip-text text-transparent">
              Strategic Roadmaps
            </h1>
            
            <div className="h-5 w-px bg-slate-200 dark:bg-white/10 mx-2" />
            
            {/* Year Navigator */}
            <div className="flex items-center gap-2 bg-slate-200/50 dark:bg-white/5 border border-slate-300/50 dark:border-white/10 rounded-xl p-1 backdrop-blur-sm">
              <button onClick={() => setYear(year - 1)} className="p-1 hover:bg-white dark:hover:bg-white/10 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"><ChevronLeft className="w-4 h-4" /></button>
              <input 
                type="number" 
                value={year} 
                onChange={handleYearChange}
                className="w-16 text-center font-bold text-slate-800 dark:text-slate-200 bg-transparent border-none focus:outline-none"
              />
              <button onClick={() => setYear(year + 1)} className="p-1 hover:bg-white dark:hover:bg-white/10 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className="p-2 border border-slate-300 dark:border-white/10 hover:bg-slate-200/50 dark:hover:bg-white/5 rounded-xl text-slate-600 dark:text-slate-300 transition-all"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>

            <button 
              onClick={handleCreateNewItem}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-md shadow-blue-500/10 text-xs"
            >
              <Plus className="w-4 h-4" />
              Novo Item
            </button>

            <button 
              onClick={() => setIsAIOpen(true)}
              className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-xl font-bold hover:bg-indigo-100 dark:hover:bg-indigo-600/20 transition-all border border-indigo-200 dark:border-indigo-500/10 text-xs"
            >
              <Bot className="w-4 h-4" />
              IA Assistant
            </button>
          </div>
        </header>

        {/* Dashboard KPIs Bar */}
        <div className="px-6 py-4 grid grid-cols-5 gap-4 shrink-0">
          {[
            { label: 'Categorias Ativas', value: totalCategories, icon: FolderKanban, color: 'text-indigo-500' },
            { label: 'Total Roadmaps', value: totalRoadmaps, icon: GitFork, color: 'text-blue-500' },
            { label: 'Milestones (Ok)', value: milestonesCount, icon: Milestone, color: 'text-emerald-500' },
            { label: 'Progresso Geral', value: `${avgProgress}%`, icon: TrendingUp, color: 'text-cyan-500' },
            { label: 'Itens Críticos', value: criticalCount, icon: AlertTriangle, color: 'text-rose-500' },
          ].map((kpi, idx) => (
            <div 
              key={idx} 
              className="p-4 rounded-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-white/5 shadow-sm flex items-center justify-between transition-all hover:scale-[1.01] hover:border-slate-300 dark:hover:border-white/10"
            >
              <div>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{kpi.label}</p>
                <p className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-1">{kpi.value}</p>
              </div>
              <div className={`p-2.5 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5 ${kpi.color}`}>
                <kpi.icon className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>

        {/* Timeline Area */}
        <div className="flex-1 min-h-0 flex flex-col">
          <TimelineGrid 
            onEditItem={setEditingItem} 
            onEditCategory={setEditingCategory}
          />
        </div>
      </main>

      {/* Modals & Overlays */}
      <AIAssistant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
      {editingItem && (
        <ItemModal 
          item={editingItem} 
          onClose={() => setEditingItem(null)} 
        />
      )}
      {editingCategory !== undefined && (
        <CategoryModal 
          swimlane={editingCategory}
          onClose={() => setEditingCategory(undefined)}
        />
      )}
    </div>
  );
}

export default function StrategicTimeline() {
  return (
    <RoadmapProvider>
      <StrategicTimelineInner />
    </RoadmapProvider>
  );
}
