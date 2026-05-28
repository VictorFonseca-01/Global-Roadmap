import { Rnd } from 'react-rnd';
import { RoadmapItem } from '../types/roadmap';
import { useRoadmap } from '../context/RoadmapContext';
import { useState } from 'react';

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
  const { updateItem, year, swimlanes } = useRoadmap();
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Conversão de porcentagem para pixel e vice-versa
  const getPercentageFromDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 0;
      const start = new Date(year, 0, 1).getTime();
      const end = new Date(year, 11, 31).getTime();
      return ((date.getTime() - start) / (end - start)) * 100;
    } catch {
      return 0;
    }
  };

  const getDateFromPercentage = (pct: number) => {
    const start = new Date(year, 0, 1).getTime();
    const end = new Date(year, 11, 31).getTime();
    const time = start + (pct / 100) * (end - start);
    const date = new Date(time);
    return date.toISOString().split('T')[0];
  };

  const xStartPct = item.startDate ? getPercentageFromDate(item.startDate) : item.startPercentage;
  const xEndPct = item.endDate ? getPercentageFromDate(item.endDate) : (item.startPercentage + item.widthPercentage);

  const xPx = (xStartPct / 100) * containerWidth;
  const yPx = swimlaneIndex * rowHeight + (rowHeight - (item.isMilestone ? 14 : 20)) / 2;
  const widthPx = Math.max(item.isMilestone ? 14 : 80, ((xEndPct - xStartPct) / 100) * containerWidth);

  // Status mapping simples e executivo
  const statusColors = {
    on_track: 'bg-emerald-600',
    at_risk: 'bg-amber-500',
    delayed: 'bg-rose-600'
  };

  const statusBg = statusColors[item.status || 'on_track'];

  // Cálculos de duração da Tooltip
  const getDurationInDays = () => {
    if (!item.startDate || !item.endDate) return 0;
    const start = new Date(item.startDate).getTime();
    const end = new Date(item.endDate).getTime();
    return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
  };

  const getDaysRemaining = () => {
    if (!item.endDate) return 0;
    const end = new Date(item.endDate).getTime();
    const today = new Date().getTime();
    return Math.max(0, Math.round((end - today) / (1000 * 60 * 60 * 24)));
  };

  const duration = getDurationInDays();
  const remaining = getDaysRemaining();
  const isOverdue = remaining === 0 && item.progress < 100;

  // Formatação de data amigável
  const formatDateFriendly = (dateStr?: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${parts[2]} ${months[parseInt(parts[1]) - 1]} ${parts[0]}`;
  };

  return (
    <Rnd
      size={{ width: widthPx, height: item.isMilestone ? 14 : 20 }}
      position={{ x: xPx, y: yPx }}
      disableDragging={false}
      enableResizing={item.isMilestone ? false : { right: true, left: true, top: false, bottom: false, topRight: false, bottomRight: false, bottomLeft: false, topLeft: false }}
      dragAxis="both"
      className="z-10 group !overflow-visible"
      onDragStop={(_e, d) => {
        const totalDays = 365;
        const dayWidth = containerWidth / totalDays;
        const snappedX = Math.round(d.x / dayWidth) * dayWidth;
        
        const newStartPct = Math.max(0, Math.min(100 - (xEndPct - xStartPct), (snappedX / containerWidth) * 100));
        const newEndPct = newStartPct + (xEndPct - xStartPct);
        
        const newStart = getDateFromPercentage(newStartPct);
        const newEnd = getDateFromPercentage(newEndPct);

        const newLaneIndex = Math.max(0, Math.min(swimlanes.length - 1, Math.round(d.y / rowHeight)));
        const newSwimlaneId = swimlanes[newLaneIndex].id;

        updateItem(item.id, { 
          startDate: newStart,
          endDate: newEnd,
          startPercentage: newStartPct,
          swimlaneId: newSwimlaneId
        });
      }}
      onResizeStop={(_e, _dir, ref, _delta, position) => {
        const totalDays = 365;
        const dayWidth = containerWidth / totalDays;
        const snappedX = Math.round(position.x / dayWidth) * dayWidth;
        const snappedWidth = Math.round(ref.offsetWidth / dayWidth) * dayWidth;
        
        const newWidthPct = (snappedWidth / containerWidth) * 100;
        const newStartPct = (snappedX / containerWidth) * 100;
        
        const newStart = getDateFromPercentage(newStartPct);
        const newEnd = getDateFromPercentage(newStartPct + newWidthPct);

        updateItem(item.id, { 
          startDate: newStart,
          endDate: newEnd,
          widthPercentage: newWidthPct,
          startPercentage: newStartPct
        });
      }}
    >
      <div 
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="w-full h-full relative !overflow-visible"
      >
        {item.isMilestone ? (
          /* Renderização de Milestone (Diamond Marker) */
          <div 
            onDoubleClick={(e) => { e.stopPropagation(); onEdit(item); }}
            className={`w-3.5 h-3.5 rotate-45 border border-slate-350 dark:border-white/20 cursor-pointer shadow flex items-center justify-center transition-transform hover:scale-110 ${statusBg}`}
            title={item.title}
          />
        ) : (
          /* Renderização de Barra Normal */
          <div 
            onDoubleClick={(e) => { e.stopPropagation(); onEdit(item); }}
            onMouseUp={() => onConnectionEnd(item.id)}
            className={`w-full h-full rounded border bg-slate-100 dark:bg-slate-900/90 shadow-sm flex items-center justify-between px-2 cursor-grab active:cursor-grabbing relative !overflow-visible select-none transition-colors ${
              isOverdue 
                ? 'border-rose-500 hover:border-rose-600' 
                : 'border-slate-300/40 dark:border-white/10 hover:border-blue-500 dark:hover:border-blue-500'
            }`}
          >
            {/* Barra de Progresso Interna como background sutil */}
            <div 
              className="absolute left-0 top-0 bottom-0 bg-slate-200 dark:bg-slate-800/80 transition-all duration-300 pointer-events-none"
              style={{ width: `${item.progress || 0}%`, zIndex: 1 }}
            />

            {/* Indicador lateral de Status */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${statusBg} z-10`} />

            {/* Conteúdo Textual com Alta Densidade */}
            <div className="flex items-center justify-between w-full z-10 pl-1">
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-[10px] truncate leading-none">
                {item.title}
              </span>
              <span className="text-[8px] font-mono text-slate-500 dark:text-slate-400 font-bold shrink-0 ml-1.5">
                {item.progress || 0}%
              </span>
            </div>

            {/* Conector Esquerdo (Entrada de Predecessores) - Hitbox ampliada para 24px */}
            <div 
              className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center cursor-pointer z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
              title="Soltar dependência aqui"
              onMouseUp={(e) => {
                e.stopPropagation();
                onConnectionEnd(item.id);
              }}
            >
              {/* Círculo Visual elegante */}
              <div className="w-2.5 h-2.5 bg-slate-800 dark:bg-slate-200 rounded-full border border-slate-400 dark:border-slate-700 shadow-md flex items-center justify-center hover:scale-125 transition-transform duration-150">
                <div className="w-1 h-1 bg-blue-500 rounded-full" />
              </div>
            </div>

            {/* Conector Direito (Saída de Sucessores) - Hitbox ampliada para 24px */}
            <div 
              className="absolute right-[-12px] top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center cursor-crosshair z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
              title="Arrastar dependência"
              onMouseDown={(e) => {
                e.stopPropagation();
                onConnectionStart(item.id, e);
              }}
            >
              {/* Círculo Visual elegante */}
              <div className="w-2.5 h-2.5 bg-blue-600 rounded-full border border-white dark:border-slate-800 shadow-md flex items-center justify-center hover:scale-125 hover:bg-blue-500 hover:shadow-blue-500/50 transition-all duration-150">
                <div className="w-1 h-1 bg-white rounded-full" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tooltip Executiva de Governança */}
      {showTooltip && (
        <div className="absolute left-0 bottom-full mb-2 w-64 bg-slate-950/90 dark:bg-slate-950/95 border border-slate-800 backdrop-blur-md rounded-lg shadow-xl p-3 z-50 pointer-events-none text-slate-200 text-xs space-y-2 animate-in fade-in slide-in-from-bottom-1 duration-150">
          <div className="flex justify-between items-start gap-1">
            <span className="font-bold text-slate-100 truncate text-[11px]">{item.title}</span>
            <span className={`px-1 rounded text-[8px] uppercase tracking-wider font-bold ${
              item.status === 'on_track' ? 'bg-emerald-500/10 text-emerald-400' :
              item.status === 'at_risk' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'
            }`}>{item.status.replace('_', ' ')}</span>
          </div>

          <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 text-[10px] text-slate-400">
            <div>
              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wide">Data Início</p>
              <p className="text-slate-300 font-semibold">{formatDateFriendly(item.startDate)}</p>
            </div>
            <div>
              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wide">Data Fim</p>
              <p className="text-slate-300 font-semibold">{formatDateFriendly(item.endDate)}</p>
            </div>
            <div>
              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wide">Duração Total</p>
              <p className="text-slate-300 font-semibold font-mono">{duration} dias</p>
            </div>
            <div>
              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wide">Prazo Restante</p>
              <p className={`font-semibold font-mono ${isOverdue ? 'text-rose-400' : 'text-slate-300'}`}>
                {isOverdue ? 'Atrasado' : `${remaining} dias`}
              </p>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-1.5 flex items-center justify-between text-[10px]">
            <span className="text-slate-500">Progresso</span>
            <span className="font-bold font-mono text-slate-300">{item.progress}%</span>
          </div>
        </div>
      )}
    </Rnd>
  );
}


