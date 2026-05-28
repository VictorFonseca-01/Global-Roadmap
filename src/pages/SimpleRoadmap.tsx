import { useState, useEffect } from 'react';
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Bot, GripVertical, Trash2 } from 'lucide-react';
import { AIAssistant } from '../components/AIAssistant';

type Item = {
  id: string;
  title: string;
  description: string;
  columnId: string;
};

type Column = {
  id: string;
  title: string;
};

const COLUMNS: Column[] = [
  { id: 'todo', title: 'A Fazer' },
  { id: 'in_progress', title: 'Em Andamento' },
  { id: 'done', title: 'Concluído' }
];

const INITIAL_ITEMS: Item[] = [
  { id: '1', title: 'Migrar Windows Server 2012', description: 'Atualizar para Windows Server 2022', columnId: 'todo' },
  { id: '2', title: 'Avaliar EoL do VMWare', description: 'Levantar alternativas como Hyper-V', columnId: 'todo' }
];

function SortableItem({ item, onDelete }: { item: Item, onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, data: { type: 'Item', item } });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="bg-slate-800 p-3 rounded-lg shadow-sm border border-slate-700 group flex gap-2 relative"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing pt-1 text-slate-500 hover:text-slate-300">
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <h4 className="text-sm font-bold text-slate-200">{item.title}</h4>
        {item.description && <p className="text-xs text-slate-400 mt-1">{item.description}</p>}
      </div>
      <button 
        onClick={() => onDelete(item.id)}
        className="opacity-0 group-hover:opacity-100 text-rose-500 hover:bg-rose-500/20 p-1.5 rounded transition-all absolute right-2 top-2"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function SimpleRoadmap() {
  const [items, setItems] = useState<Item[]>(() => {
    const saved = localStorage.getItem('roadmap_items');
    return saved ? JSON.parse(saved) : INITIAL_ITEMS;
  });
  
  const [activeItem, setActiveItem] = useState<Item | null>(null);
  const [isAIOpen, setIsAIOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('roadmap_items', JSON.stringify(items));
  }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const item = items.find(i => i.id === active.id);
    if (item) setActiveItem(item);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveItem(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (COLUMNS.find(c => c.id === overId)) {
      setItems(prev => prev.map(item => item.id === activeId ? { ...item, columnId: overId as string } : item));
      return;
    }

    const activeIndex = items.findIndex(i => i.id === activeId);
    const overIndex = items.findIndex(i => i.id === overId);

    if (activeIndex !== overIndex && activeIndex !== -1 && overIndex !== -1) {
      setItems(prev => {
        const newItems = [...prev];
        const overItem = newItems[overIndex];
        
        if (newItems[activeIndex].columnId !== overItem.columnId) {
          newItems[activeIndex] = { ...newItems[activeIndex], columnId: overItem.columnId };
        }
        
        return arrayMove(newItems, activeIndex, overIndex);
      });
    }
  };

  const addItem = (columnId: string) => {
    const title = prompt('Título do item:');
    if (!title) return;
    
    const description = prompt('Descrição (opcional):') || '';
    
    const newItem: Item = {
      id: Date.now().toString(),
      title,
      description,
      columnId
    };
    
    setItems(prev => [...prev, newItem]);
  };

  const deleteItem = (id: string) => {
    if (confirm('Deletar este item?')) {
      setItems(prev => prev.filter(i => i.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans">
      <header className="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Basic Roadmap Planner</h1>
          <p className="text-xs text-slate-400 font-medium">Simple Drag & Drop Board</p>
        </div>
        <button 
          onClick={() => setIsAIOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
        >
          <Bot className="w-4 h-4" />
          Pesquisar com IA
        </button>
      </header>

      <main className="flex-1 p-6 overflow-x-auto">
        <DndContext 
          sensors={sensors} 
          collisionDetection={closestCorners} 
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-6 h-full items-start">
            {COLUMNS.map(col => {
              const columnItems = items.filter(i => i.columnId === col.id);
              
              return (
                <div key={col.id} className="w-80 shrink-0 bg-slate-900 rounded-xl flex flex-col border border-slate-800 shadow-xl">
                  <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-800/50 rounded-t-xl">
                    <h3 className="font-black text-slate-300 uppercase tracking-wider text-xs">{col.title}</h3>
                    <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {columnItems.length}
                    </span>
                  </div>
                  
                  <div className="p-3 flex-1 flex flex-col gap-3 min-h-[150px]">
                    <SortableContext items={columnItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                      {columnItems.map(item => (
                        <SortableItem key={item.id} item={item} onDelete={deleteItem} />
                      ))}
                    </SortableContext>
                    
                    <button 
                      onClick={() => addItem(col.id)}
                      className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 hover:bg-slate-800 p-2 rounded-lg transition-colors border border-dashed border-slate-700 w-full justify-center mt-2"
                    >
                      <Plus className="w-4 h-4" /> Adicionar Item
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <DragOverlay>
            {activeItem ? (
              <div className="bg-slate-700 p-3 rounded-lg shadow-2xl border border-slate-600 rotate-3 cursor-grabbing opacity-90 scale-105">
                <h4 className="text-sm font-bold text-white">{activeItem.title}</h4>
                {activeItem.description && <p className="text-xs text-slate-300 mt-1">{activeItem.description}</p>}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>

      <AIAssistant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
    </div>
  );
}
