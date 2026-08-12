import React, { useState } from 'react';
import { 
  Bot, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  LayoutDashboard,
  GitFork,
  BarChart3,
  FileSpreadsheet,
  FileText,
  FileDown
} from 'lucide-react';
import { RoadmapProvider, useRoadmap } from '../context/RoadmapContext';
import { TimelineGrid } from '../components/TimelineGrid';
import { ItemModal } from '../components/ItemModal';
import { CategoryModal } from '../components/CategoryModal';
import { AIAssistant } from '../components/AIAssistant';
import { RoadmapItem, Swimlane } from '../types/roadmap';

function StrategicTimelineInner() {
  const { year, setYear, addItem, swimlanes, items } = useRoadmap();
  const [activeTab, setActiveTab] = useState<'timeline' | 'dashboard' | 'reports'>('timeline');
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RoadmapItem | null>(null);
  const [editingCategory, setEditingCategory] = useState<Swimlane | null | undefined>(undefined);

  // KPI Calculations
  const totalRoadmaps = items.length;
  
  // KPIs de Governança Real (Project/Smartsheet style)
  const eolCriticalCount = items.filter(i => i.color === '#ef4444').length; // Vermelho -> EOL Crítico
  const activeMigrations = items.filter(i => i.color === '#eab308' || i.color === '#3b82f6').length; // Amarelo/Azul -> Migração/Produção Ativa
  const supportedAssets = items.filter(i => i.color === '#10b981').length; // Verde -> Suportado
  
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
      title: 'Nova Iniciativa de Migração',
      color: '#3b82f6',
      swimlaneId: swimlanes[0].id,
      startDate: `${year}-01-01`,
      endDate: `${year}-03-31`,
      startPercentage: 15,
      widthPercentage: 20,
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

  // Simulação de exportações executivas
  const triggerExport = (type: 'pdf' | 'excel' | 'powerpoint') => {
    const messages = {
      pdf: 'Relatório Executivo PDF gerado e pronto para download corporativo.',
      excel: 'Planilha de Roadmap Excel (Smartsheet format) exportada com sucesso.',
      powerpoint: 'Apresentação PowerPoint de Governança Estratégica gerada com sucesso.'
    };
    alert(messages[type]);
  };

  return (
    <div className="h-screen w-screen bg-transparent flex overflow-hidden font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Sidebar - Linear/Smartsheet style */}
      <aside className="w-44 bg-slate-100/90 dark:bg-slate-950/45 backdrop-blur-md border-r border-slate-200 dark:border-white/5 flex flex-col py-2 shrink-0 z-20">
        {/* Brand Logo */}
        <div className="px-3 pb-3 border-b border-slate-200 dark:border-white/5 flex items-center gap-1.5">
          <div className="w-5.5 h-5.5 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xs shadow">
            G
          </div>
          <span className="font-extrabold text-[9px] tracking-wider text-slate-800 dark:text-slate-200">IT GOVERNANCE</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-1.5 py-3 space-y-0.5 overflow-y-auto">
          {[
            { id: 'timeline', label: 'Timeline Real (Gantt)', icon: GitFork },
            { id: 'dashboard', label: 'Dashboard Executivo', icon: LayoutDashboard },
            { id: 'reports', label: 'Relatórios & EOL', icon: BarChart3 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'timeline' | 'dashboard' | 'reports')}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] font-semibold transition-all ${
                activeTab === tab.id 
                  ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400 border-l-2 border-blue-600' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </nav>

        {/* User profile info */}
        <div className="px-3 pt-2 border-t border-slate-200 dark:border-white/5 flex items-center gap-2">
          <img className="w-6.5 h-6.5 rounded-full border border-slate-300 dark:border-white/10" src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150" alt="Avatar" />
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-bold text-slate-700 dark:text-slate-200 truncate">Victor Fonseca</p>
            <p className="text-[7.5px] text-slate-400 truncate">IT Director</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-transparent">
        {/* Topbar Header */}
        <header className="h-10 bg-white/60 dark:bg-slate-950/40 backdrop-blur-md border-b border-slate-200 dark:border-white/5 px-4 flex justify-between items-center shrink-0 z-10">
          <div className="flex items-center gap-3">
            <h1 className="text-xs font-bold tracking-tight text-slate-800 dark:text-slate-200">
              {activeTab === 'timeline' && 'Timeline Gantt - Governança de TI'}
              {activeTab === 'dashboard' && 'Dashboard Executivo - Ativos e Riscos'}
              {activeTab === 'reports' && 'Exportações e Relatórios de Compliance'}
            </h1>
            
            {activeTab === 'timeline' && (
              <>
                <div className="h-3.5 w-px bg-slate-200 dark:bg-white/10" />
                {/* Year Navigator */}
                <div className="flex items-center gap-1 bg-slate-200/50 dark:bg-white/5 border border-slate-300/50 dark:border-white/10 rounded p-0.5 backdrop-blur-sm">
                  <button onClick={() => setYear(year - 1)} className="p-0.5 hover:bg-white dark:hover:bg-white/10 rounded text-slate-600 dark:text-slate-400 transition-all"><ChevronLeft className="w-3 h-3" /></button>
                  <input 
                    type="number" 
                    value={year} 
                    onChange={handleYearChange}
                    className="w-10 text-center font-bold text-[11px] text-slate-800 dark:text-slate-200 bg-transparent border-none focus:outline-none"
                  />
                  <button onClick={() => setYear(year + 1)} className="p-0.5 hover:bg-white dark:hover:bg-white/10 rounded text-slate-600 dark:text-slate-400 transition-all"><ChevronRight className="w-3 h-3" /></button>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {activeTab === 'timeline' && (
              <button 
                onClick={handleCreateNewItem}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded font-bold transition-all text-[10px]"
              >
                <Plus className="w-3 h-3" />
                Nova Iniciativa
              </button>
            )}

            <button 
              onClick={() => setIsAIOpen(true)}
              className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded font-bold hover:bg-indigo-100 dark:hover:bg-indigo-600/20 transition-all border border-indigo-200 dark:border-indigo-500/10 text-[10px]"
            >
              <Bot className="w-3 h-3" />
              IA Gov Assistant
            </button>
          </div>
        </header>

        {/* Tab CONTENT 1: TIMELINE */}
        {activeTab === 'timeline' && (
          <div className="flex-1 min-h-0 flex flex-col">
            <TimelineGrid 
              onEditItem={setEditingItem} 
              onEditCategory={setEditingCategory}
            />
          </div>
        )}

        {/* Tab CONTENT 2: DASHBOARD EXECUTIVO */}
        {activeTab === 'dashboard' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* KPIs de Governança Real */}
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 shadow-sm">
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ativos Críticos / EOL</p>
                <p className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">{eolCriticalCount}</p>
                <span className="text-[9px] text-slate-400">Servidores ou bancos obsoletos</span>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 shadow-sm">
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Migrações Ativas</p>
                <p className="text-xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">{activeMigrations}</p>
                <span className="text-[9px] text-slate-400 font-medium">Projetos em upgrade</span>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 shadow-sm">
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sistemas Suportados</p>
                <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{supportedAssets}</p>
                <span className="text-[9px] text-slate-400">Compliance Zero Trust ativo</span>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 shadow-sm">
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Progresso Geral</p>
                <p className="text-xl font-extrabold text-slate-800 dark:text-slate-200 mt-1">{avgProgress}%</p>
                <span className="text-[9px] text-slate-400">Percentual de conclusão médio</span>
              </div>
            </div>

            {/* Visualização de Resumo e Lifecycle */}
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Status das Iniciativas de Infraestrutura</h3>
                <div className="space-y-3">
                  {items.map(item => (
                    <div key={item.id} className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-white/5 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{item.title}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-slate-500">{item.progress}% concluído</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          item.status === 'on_track' ? 'bg-emerald-500/10 text-emerald-500' :
                          item.status === 'at_risk' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'
                        }`}>{item.status.replace('_', ' ')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Ambientes em Risco / EOL</h3>
                <div className="space-y-3.5">
                  <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20">
                    <p className="text-xs font-bold text-rose-600 dark:text-rose-400">Windows Server 2012 R2</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Fim de Suporte Estendido atingido. Risco de Segurança Alto.</p>
                  </div>
                  <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20">
                    <p className="text-xs font-bold text-rose-600 dark:text-rose-400">Banco Oracle 11g</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Descontinuação pendente. Migração atrasada para Postgres RDS.</p>
                  </div>
                  <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Zero Trust AD hardening</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Controle de acessos e VPNs finalizado e homologado.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab CONTENT 3: RELATÓRIOS */}
        {activeTab === 'reports' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Centro de Exportação de Governança</h2>
              <p className="text-xs text-slate-500">Exporte timelines consolidadas e roadmaps de conformidade de infraestrutura para apresentação executiva (PMO/Diretoria).</p>
              
              <div className="grid grid-cols-3 gap-4 pt-2">
                <button 
                  onClick={() => triggerExport('pdf')}
                  className="p-4 rounded-xl border border-slate-200 dark:border-white/5 hover:border-blue-500 dark:hover:border-blue-500 flex flex-col items-center justify-center gap-2 text-slate-700 dark:text-slate-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/10 transition-all font-semibold"
                >
                  <FileText className="w-8 h-8 text-rose-500" />
                  <span className="text-xs">PDF Executivo do Roadmap</span>
                </button>
                
                <button 
                  onClick={() => triggerExport('excel')}
                  className="p-4 rounded-xl border border-slate-200 dark:border-white/5 hover:border-blue-500 dark:hover:border-blue-500 flex flex-col items-center justify-center gap-2 text-slate-700 dark:text-slate-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/10 transition-all font-semibold"
                >
                  <FileSpreadsheet className="w-8 h-8 text-emerald-500" />
                  <span className="text-xs">Planilha Excel (Smartsheet)</span>
                </button>
                
                <button 
                  onClick={() => triggerExport('powerpoint')}
                  className="p-4 rounded-xl border border-slate-200 dark:border-white/5 hover:border-blue-500 dark:hover:border-blue-500 flex flex-col items-center justify-center gap-2 text-slate-700 dark:text-slate-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/10 transition-all font-semibold"
                >
                  <FileDown className="w-8 h-8 text-orange-500" />
                  <span className="text-xs">Apresentação PowerPoint (.pptx)</span>
                </button>
              </div>
            </div>

            {/* Relatório de Lifecycle e EOL */}
            <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Inventário de Ciclo de Vida do Ativos</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 uppercase tracking-wider text-[10px]">
                      <th className="py-2.5">Ativo / Iniciativa</th>
                      <th className="py-2.5">Lifecycle Stage</th>
                      <th className="py-2.5">Responsável</th>
                      <th className="py-2.5">Criticidade</th>
                      <th className="py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {items.map(item => (
                      <tr key={item.id} className="text-slate-700 dark:text-slate-300">
                        <td className="py-3 font-semibold">{item.title}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            item.color === '#ef4444' ? 'bg-rose-500/10 text-rose-500' :
                            item.color === '#eab308' ? 'bg-amber-500/10 text-amber-500' :
                            item.color === '#3b82f6' ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'
                          }`}>
                            {item.color === '#ef4444' ? 'Depreciado / EOL' :
                             item.color === '#eab308' ? 'Em Migração' :
                             item.color === '#3b82f6' ? 'Em Produção' : 'Suportado'}
                          </span>
                        </td>
                        <td className="py-3">{item.ownerName}</td>
                        <td className="py-3 font-mono uppercase font-semibold">{item.priority}</td>
                        <td className="py-3 font-medium">{item.status.replace('_', ' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals & Overlays */}
      <AIAssistant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
      {editingItem && (
        <ItemModal 
          key={editingItem?.id || 'new'}
          item={editingItem} 
          onClose={() => setEditingItem(null)} 
        />
      )}
      {editingCategory !== undefined && (
        <CategoryModal 
          key={editingCategory?.id || 'new'}
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

