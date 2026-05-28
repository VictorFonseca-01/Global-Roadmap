import { useState, useEffect } from 'react';
import { RoadmapItem } from '../types/roadmap';
import { useRoadmap } from '../context/RoadmapContext';
import { Trash2, X } from 'lucide-react';

interface Props {
  item: RoadmapItem;
  onClose: () => void;
}

export function ItemModal({ item, onClose }: Props) {
  const { updateItem, deleteItem, swimlanes } = useRoadmap();
  
  const [title, setTitle] = useState(item.title);
  const [color, setColor] = useState(item.color);
  const [swimlaneId, setSwimlaneId] = useState(item.swimlaneId);

  useEffect(() => {
    setTitle(item.title);
    setColor(item.color);
    setSwimlaneId(item.swimlaneId);
  }, [item]);

  const handleSave = () => {
    updateItem(item.id, { title, color, swimlaneId });
    onClose();
  };

  const handleDelete = () => {
    if (confirm('Deletar este item?')) {
      deleteItem(item.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="font-bold text-slate-800">Editar Item</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
            <input 
              type="text" 
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Categoria (Swimlane)</label>
            <select 
              value={swimlaneId}
              onChange={e => setSwimlaneId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {swimlanes.map(s => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cor Base</label>
            <div className="flex gap-2">
              <input 
                type="color" 
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-10 h-10 border-0 p-0 rounded cursor-pointer"
              />
              <input 
                type="text" 
                value={color}
                onChange={e => setColor(e.target.value)}
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
          <button 
            onClick={handleDelete}
            className="text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Deletar
          </button>
          
          <div className="flex gap-2">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
