import { Rnd } from 'react-rnd';
import { RoadmapItem } from '../types/roadmap';
import { useRoadmap } from '../context/RoadmapContext';
import { ArrowRight, ArrowLeft } from 'lucide-react';

interface Props {
  item: RoadmapItem;
  swimlaneIndex: number;
  rowHeight: number;
  containerWidth: number;
  onEdit: (item: RoadmapItem) => void;
  onConnectionStart: (itemId: string, e: React.MouseEvent) => void;
  onConnectionEnd: (itemId: string) => void;
}

export function TimelineItem({ 
  item, 
  swimlaneIndex, 
  rowHeight, 
  containerWidth, 
  onEdit,
  onConnectionStart,
  onConnectionEnd
}: Props) {
  const { updateItem, swimlanes, items } = useRoadmap();
  
  const xPx = (item.startPercentage / 100) * containerWidth;
  const yPx = swimlaneIndex * rowHeight + (rowHeight - 48) / 2; // Card um pouco maior (48px de altura)
  const widthPx = Math.max(140, (item.widthPercentage / 100) * containerWidth); // Mínimo de 140px para caber os metadados

  const incomingCount = item.dependsOn ? item.dependsOn.length : 0;
  const outgoingCount = items.filter(i => i.dependsOn && i.dependsOn.includes(item.id)).length;

  // Status mapping
  const statusStyles = {
    on_track: { bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', label: 'No Prazo', dot: 'bg-emerald-500' },
    at_risk: { bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30', label: 'Em Risco', dot: 'bg-amber-500' },
    delayed: { bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30', label: 'Atrasado', dot: 'bg-rose-500' }
  };

  // Priority mapping
  const priorityStyles = {
    low: { label: 'Baixa', class: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
    medium: { label: 'Média', class: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    high: { label: 'Alta', class: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    critical: { label: 'Crítica', class: 'bg-rose-500/30 text-rose-400 border-rose-500/40 animate-pulse' }
  };

  const statusInfo = statusStyles[item.status || 'on_track'];
  const priorityInfo = priorityStyles[item.priority || 'medium'];

  return (
    <Rnd
      size={{ width: widthPx, height: 48 }}
      position={{ x: xPx, y: yPx }}
      bounds="parent"
      enableResizing={{ right: true, left: true, top: false, bottom: false, topRight: false, bottomRight: false, bottomLeft: false, topLeft: false }}
      dragAxis="both"
      className="z-10 group"
      onDragStop={(_e, d) => {
        const newStart = Math.max(0, Math.min(100 - item.widthPercentage, (d.x / containerWidth) * 100));
        let droppedRowIndex = Math.floor((d.y + 24) / rowHeight);
        droppedRowIndex = Math.max(0, Math.min(swimlanes.length - 1, droppedRowIndex));
        
        updateItem(item.id, { 
          startPercentage: newStart,
          swimlaneId: swimlanes[droppedRowIndex].id
        });
      }}
      onResizeStop={(_e, _dir, ref, _delta, position) => {
        const newWidth = (ref.offsetWidth / containerWidth) * 100;
        const newStart = (position.x / containerWidth) * 100;
        updateItem(item.id, { 
          widthPercentage: newWidth,
          startPercentage: newStart
        });
      }}
    >
      <div 
        onDoubleClick={(e) => { e.stopPropagation(); onEdit(item); }}
        onMouseUp={() => onConnectionEnd(item.id)}
        className="w-full h-full rounded-xl border border-white/[0.08] dark:border-white/[0.05] bg-white/70 dark:bg-slate-900/60 backdrop-blur-md shadow-lg hover:shadow-2xl transition-all duration-200 flex flex-col justify-between p-2 cursor-grab active:cursor-grabbing relative overflow-hidden select-none hover:scale-[1.01] hover:border-indigo-500/30 dark:hover:border-indigo-400/30"
        style={{ borderTop: `2px solid ${item.color || '#4f46e5'}` }}
      >
        {/* Glow de Fundo Sutil */}
        <div 
          className="absolute -right-6 -top-6 w-12 h-12 rounded-full blur-xl opacity-20"
          style={{ backgroundColor: item.color }}
        />

        {/* Top Section: Title & Status Dot */}
        <div className="flex items-center justify-between gap-1.5 z-10">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
            <span className="font-semibold text-slate-800 dark:text-slate-200 text-[11px] truncate leading-tight">
              {item.title}
            </span>
          </div>
          
          {/* Owner Avatar */}
          {item.ownerAvatar && (
            <img 
              src={item.ownerAvatar} 
              alt={item.ownerName}
              title={item.ownerName}
              className="w-4.5 h-4.5 rounded-full border border-white/20 shadow-sm object-cover"
            />
          )}
        </div>

        {/* Bottom Section: Progress and Badges */}
        <div className="flex items-center justify-between gap-2 mt-0.5 z-10">
          {/* Progress Bar & Percentage */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${item.progress || 0}%`, backgroundColor: item.color }}
              />
            </div>
            <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400">
              {item.progress || 0}%
            </span>
          </div>

          {/* Priority Badge */}
          <span className={`px-1.5 py-0.5 rounded text-[8px] font-medium border leading-none shrink-0 ${priorityInfo.class}`}>
            {priorityInfo.label}
          </span>
        </div>

        {/* --- DEPENDENCY PORTS & BADGES --- */}
        
        {/* Conector Esquerdo (Entrada / Predecessores) */}
        <div 
          className="absolute -left-1 top-1/2 -translate-y-1/2 w-3.5 h-6 bg-slate-800/80 hover:bg-slate-700/90 text-white rounded-r-md flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity z-20 border border-l-0 border-white/10"
          title="Soltar dependência aqui"
          onMouseUp={(e) => {
            e.stopPropagation();
            onConnectionEnd(item.id);
          }}
        >
          <ArrowLeft className="w-2.5 h-2.5" />
        </div>

        {incomingCount > 0 && (
          <div 
            className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-4 h-4 bg-slate-800 dark:bg-slate-200 text-slate-200 dark:text-slate-800 border border-white/10 dark:border-black/10 rounded-full flex items-center justify-center text-[8px] font-bold shadow-md z-30 select-none cursor-pointer"
            title={`${incomingCount} dependências ativas`}
          >
            {incomingCount}
          </div>
        )}

        {/* Conector Direito (Saída / Sucessores) */}
        <div 
          className="absolute -right-1 top-1/2 -translate-y-1/2 w-3.5 h-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-l-md flex items-center justify-center cursor-crosshair opacity-0 group-hover:opacity-100 transition-opacity z-20 border border-r-0 border-white/10"
          title="Arrastar dependência"
          onMouseDown={(e) => {
            e.stopPropagation();
            onConnectionStart(item.id, e);
          }}
        >
          <ArrowRight className="w-2.5 h-2.5" />
        </div>

        {outgoingCount > 0 && (
          <div 
            className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 bg-indigo-600 text-white border border-white/10 rounded-full flex items-center justify-center text-[8px] font-bold shadow-md z-30 select-none cursor-pointer"
            title={`Bloqueia ${outgoingCount} item(ns)`}
            onMouseDown={(e) => {
              e.stopPropagation();
              onConnectionStart(item.id, e);
            }}
          >
            {outgoingCount}
          </div>
        )}
      </div>
    </Rnd>
  );
}

