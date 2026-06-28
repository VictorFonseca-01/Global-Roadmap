import { useState, useEffect } from 'react';
import { Swimlane } from '../types/roadmap';
import { useRoadmap } from '../contexts/RoadmapContext';
import { ConfirmModal } from './ConfirmModal';
import { Trash2, X, Folder, AlignLeft } from 'lucide-react';

interface Props {
  swimlane: Swimlane | null;
  onClose: () => void;
}

const ICON_OPTIONS = [
  { value: 'Server', label: 'Servidor' },
  { value: 'ShieldAlert', label: 'Segurança' },
  { value: 'Smartphone', label: 'Mobile' },
  { value: 'Cpu', label: 'IA / Computação' },
  { value: 'Layers', label: 'Governança' },
  { value: 'Cloud', label: 'Cloud / Kubernetes' },
  { value: 'Headphones', label: 'Suporte / HelpDesk' },
  { value: 'Globe', label: 'Web Platform' }
];

export function CategoryModal({ swimlane, onClose }: Props) {
  const { addSwimlane, updateSwimlane, deleteSwimlane } = useRoadmap();
  
  const [title, setTitle] = useState(swimlane?.title || '');
  const [color, setColor] = useState(swimlane?.color || '#3b82f6');
  const [description, setDescription] = useState(swimlane?.description || '');
  const [icon, setIcon] = useState(swimlane?.icon || 'Server');
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (swimlane) {
      setTitle(swimlane.title);
      setColor(swimlane.color);
      setDescription(swimlane.description || '');
      setIcon(swimlane.icon || 'Server');
    } else {
      setTitle('');
      setColor('#3b82f6');
      setDescription('');
      setIcon('Server');
    }
  }, [swimlane]);

  const handleSave = () => {
    if (!title.trim()) return;

    if (swimlane) {
      updateSwimlane(swimlane.id, { 
        title: title.trim().toUpperCase(), 
        color,
        description: description.trim(),
        icon
      });
    } else {
      addSwimlane({
        id: Date.now().toString(),
        title: title.trim().toUpperCase(),
        color,
        description: description.trim(),
        icon
      });
    }
    onClose();
  };

  const handleDeleteConfirm = () => {
    if (swimlane) {
      deleteSwimlane(swimlane.id);
      setShowConfirm(false);
      onClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
            <h2 className="font-bold text-slate-800 dark:text-slate-100 text-lg">
              {swimlane ? 'Editar Categoria' : 'Nova Categoria'}
            </h2>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Body */}
          <div className="p-6 space-y-4">
            {/* Nome da Categoria */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5" /> Nome da Categoria
              </label>
              <input 
                type="text" 
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: INFRASTRUCTURE, SECURITY"
                className="w-full border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-950 dark:text-slate-100 placeholder-slate-400"
              />
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <AlignLeft className="w-3.5 h-3.5" /> Descrição
              </label>
              <input 
                type="text" 
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ex: Sistemas e hardware core..."
                className="w-full border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-950 dark:text-slate-100 placeholder-slate-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Ícone */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Ícone</label>
                <select 
                  value={icon}
                  onChange={e => setIcon(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-950 dark:text-slate-100"
                >
                  {ICON_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Cor da Categoria */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Cor da Categoria</label>
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
                    className="flex-1 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-950 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
            <div>
              {swimlane && (
                <button 
                  onClick={() => setShowConfirm(true)}
                  className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors border border-transparent hover:border-rose-200 dark:hover:border-rose-500/30"
                >
                  <Trash2 className="w-4 h-4" /> Deletar
                </button>
              )}
            </div>
            
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
        title="Deletar Categoria"
        message={`Tem certeza que deseja deletar a categoria "${swimlane?.title}"? Todos os itens associados a esta categoria serão permanentemente removidos.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowConfirm(false)}
        confirmText="Deletar"
      />
    </>
  );
}
