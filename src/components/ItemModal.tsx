import { useState, useEffect } from 'react';
import { RoadmapItem } from '../types/roadmap';
import { useRoadmap } from '../context/RoadmapContext';
import { ConfirmModal } from './ConfirmModal';
import { Trash2, X } from 'lucide-react';

interface Props {
  item: RoadmapItem;
  onClose: () => void;
}

const AVATAR_OPTIONS = [
  { name: 'Sarah Jenkins', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
  { name: 'Alex Rivers', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150' },
  { name: 'Daniel Vance', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150' },
  { name: 'Elena Rostova', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150' },
  { name: 'Marcus Brody', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150' }
];

export function ItemModal({ item, onClose }: Props) {
  const { updateItem, deleteItem, swimlanes, items } = useRoadmap();
  
  const [title, setTitle] = useState(item.title);
  const [color, setColor] = useState(item.color);
  const [swimlaneId, setSwimlaneId] = useState(item.swimlaneId);
  const [startDate, setStartDate] = useState(item.startDate || '2026-01-01');
  const [endDate, setEndDate] = useState(item.endDate || '2026-03-31');
  const [isMilestone, setIsMilestone] = useState(item.isMilestone || false);
  const [progress, setProgress] = useState(item.progress || 0);
  const [status, setStatus] = useState<RoadmapItem['status']>(item.status || 'on_track');
  const [priority, setPriority] = useState<RoadmapItem['priority']>(item.priority || 'medium');
  const [ownerName, setOwnerName] = useState(item.ownerName || AVATAR_OPTIONS[0].name);
  const [ownerAvatar, setOwnerAvatar] = useState(item.ownerAvatar || AVATAR_OPTIONS[0].avatar);
  const [description, setDescription] = useState(item.description || '');
  const [dependsOn, setDependsOn] = useState<string[]>(item.dependsOn || []);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTitle(item.title);
    setColor(item.color);
    setSwimlaneId(item.swimlaneId);
    setStartDate(item.startDate || '2026-01-01');
    setEndDate(item.endDate || '2026-03-31');
    setIsMilestone(item.isMilestone || false);
    setProgress(item.progress || 0);
    setStatus(item.status || 'on_track');
    setPriority(item.priority || 'medium');
    setOwnerName(item.ownerName || AVATAR_OPTIONS[0].name);
    setOwnerAvatar(item.ownerAvatar || AVATAR_OPTIONS[0].avatar);
    setDescription(item.description || '');
    setDependsOn(item.dependsOn || []);
  }, [item]);

  const handleSave = () => {
    updateItem(item.id, { 
      title, 
      color, 
      swimlaneId,
      startDate,
      endDate,
      isMilestone,
      progress,
      status,
      priority,
      ownerName,
      ownerAvatar,
      description,
      dependsOn
    });
    onClose();
  };

  const handleDeleteConfirm = () => {
    deleteItem(item.id);
    setShowConfirm(false);
    onClose();
  };

  const handleOwnerChange = (name: string) => {
    const matched = AVATAR_OPTIONS.find(opt => opt.name === name);
    if (matched) {
      setOwnerName(matched.name);
      setOwnerAvatar(matched.avatar);
    }
  };

  const toggleDependency = (depId: string) => {
    if (dependsOn.includes(depId)) {
      setDependsOn(prev => prev.filter(id => id !== depId));
    } else {
      setDependsOn(prev => [...prev, depId]);
    }
  };

  // Filtrar itens elegíveis para dependência (não pode ser ele mesmo)
  const dependencyCandidates = items.filter(i => i.id !== item.id);

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
            <div>
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Editar Iniciativa</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">ID: {item.id}</p>
            </div>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Body */}
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Título */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Título da Iniciativa</label>
              <input 
                type="text" 
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-950 dark:text-slate-100 placeholder-slate-400"
                placeholder="Ex: Migração Windows Server 2025"
              />
            </div>

            {/* Configurações Temporais Reais */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Data Início</label>
                <input 
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Data Término</label>
                <input 
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Checkbox de Milestone */}
            <div className="flex items-center gap-2 px-1">
              <input 
                type="checkbox" 
                id="isMilestoneCheckbox"
                checked={isMilestone}
                onChange={e => setIsMilestone(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-850 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <label htmlFor="isMilestoneCheckbox" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                Definir como Milestone (Marco Diamond de entrega)
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Categoria */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Categoria</label>
                <select 
                  value={swimlaneId}
                  onChange={e => setSwimlaneId(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-950 dark:text-slate-100"
                >
                  {swimlanes.map(s => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              </div>

              {/* Cor Base */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Cor Base</label>
                <div className="flex gap-2">
                  <div className="relative shrink-0">
                    <input 
                      type="color" 
                      value={color}
                      onChange={e => setColor(e.target.value)}
                      className="w-10 h-10 border-0 p-0 rounded-xl cursor-pointer overflow-hidden"
                    />
                  </div>
                  <input 
                    type="text" 
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    className="flex-1 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-950 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Status</label>
                <select 
                  value={status}
                  onChange={e => setStatus(e.target.value as RoadmapItem['status'])}
                  className="w-full border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-950 dark:text-slate-100"
                >
                  <option value="on_track">No Prazo</option>
                  <option value="at_risk">Em Risco</option>
                  <option value="delayed">Atrasado</option>
                </select>
              </div>

              {/* Prioridade */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Prioridade</label>
                <select 
                  value={priority}
                  onChange={e => setPriority(e.target.value as RoadmapItem['priority'])}
                  className="w-full border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-950 dark:text-slate-100"
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                  <option value="critical">Crítica</option>
                </select>
              </div>

              {/* Progresso % */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Progresso (%)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    min="0" 
                    max="100"
                    value={progress}
                    onChange={e => setProgress(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-full border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-950 dark:text-slate-100 pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">%</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Responsável */}
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Responsável</label>
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl">
                  <img 
                    src={ownerAvatar} 
                    alt={ownerName} 
                    className="w-8 h-8 rounded-full border border-white/20 shadowobject-cover" 
                  />
                  <select 
                    value={ownerName}
                    onChange={e => handleOwnerChange(e.target.value)}
                    className="flex-1 bg-transparent border-0 text-sm focus:outline-none dark:text-slate-100"
                  >
                    {AVATAR_OPTIONS.map(opt => (
                      <option key={opt.name} value={opt.name}>{opt.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Descrição / Escopo</label>
              <textarea 
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Insira detalhes sobre as entregas, riscos ou arquitetura técnica..."
                className="w-full border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-950 dark:text-slate-100 placeholder-slate-400"
              />
            </div>

            {/* Dependências (Predecessores) */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Bloqueado por (Dependências)</label>
              {dependencyCandidates.length === 0 ? (
                <p className="text-xs text-slate-500 italic mt-1">Nenhum outro item disponível para criar dependência.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto mt-1.5 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                  {dependencyCandidates.map(dep => {
                    const isChecked = dependsOn.includes(dep.id);
                    return (
                      <label 
                        key={dep.id} 
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isChecked 
                            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400' 
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => toggleDependency(dep.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="truncate">{dep.title}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          
          {/* Footer */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
            <button 
              onClick={() => setShowConfirm(true)}
              className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors border border-transparent hover:border-rose-200 dark:hover:border-rose-500/30"
            >
              <Trash2 className="w-4 h-4" /> Deletar
            </button>
            
            <div className="flex gap-2">
              <button 
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-lg shadow-indigo-600/20"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal 
        isOpen={showConfirm}
        title="Deletar Iniciativa"
        message="Tem certeza que deseja remover esta iniciativa do roadmap? Esta ação também removerá quaisquer conexões de dependência vinculadas."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowConfirm(false)}
        confirmText="Deletar"
      />
    </>
  );
}
