import React, { useState } from 'react';
import { Bot, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { RoadmapProvider, useRoadmap } from '../context/RoadmapContext';
import { TimelineGrid } from '../components/TimelineGrid';
import { ItemModal } from '../components/ItemModal';
import { CategoryModal } from '../components/CategoryModal';
import { AIAssistant } from '../components/AIAssistant';
import { RoadmapItem, Swimlane } from '../types/roadmap';

function StrategicTimelineInner() {
  const { year, setYear, addItem, swimlanes } = useRoadmap();
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RoadmapItem | null>(null);
  const [editingCategory, setEditingCategory] = useState<Swimlane | null | undefined>(undefined);

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val)) setYear(val);
  };

  const handleCreateNewItem = () => {
    if (swimlanes.length === 0) return;
    const newItem: RoadmapItem = {
      id: Date.now().toString(),
      title: 'Novo Item',
      color: swimlanes[0].color,
      swimlaneId: swimlanes[0].id,
      startPercentage: 10,
      widthPercentage: 15,
      dependsOn: []
    };
    addItem(newItem);
    setEditingItem(newItem);
  };

  return (
    <div className="h-screen w-screen bg-slate-100 flex overflow-hidden font-sans text-slate-800">
      {/* Sidebar */}
      <aside className="w-16 bg-white border-r border-slate-200 flex flex-col items-center py-4 gap-6 shrink-0 z-20">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
          Z
        </div>
        <div className="flex-1" />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex justify-between items-center shrink-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Strategic Roadmaps</h1>
            
            <div className="h-6 w-px bg-slate-300 mx-2" />
            
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
              <button onClick={() => setYear(year - 1)} className="p-1 hover:bg-white rounded text-slate-500 shadow-sm"><ChevronLeft className="w-4 h-4" /></button>
              <input 
                type="number" 
                value={year} 
                onChange={handleYearChange}
                className="w-16 text-center font-bold text-slate-700 bg-transparent border-none focus:outline-none"
              />
              <button onClick={() => setYear(year + 1)} className="p-1 hover:bg-white rounded text-slate-500 shadow-sm"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleCreateNewItem}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm text-sm"
            >
              <Plus className="w-4 h-4" />
              Novo Item
            </button>

            <button 
              onClick={() => setIsAIOpen(true)}
              className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg font-bold hover:bg-indigo-100 transition-colors border border-indigo-200 text-sm"
            >
              <Bot className="w-4 h-4" />
              IA Assistant
            </button>
          </div>
        </header>

        {/* Timeline Area */}
        <TimelineGrid 
          onEditItem={setEditingItem} 
          onEditCategory={setEditingCategory}
        />
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
