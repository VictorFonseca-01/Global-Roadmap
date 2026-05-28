import { Rnd } from 'react-rnd';
import { RoadmapItem } from '../types/roadmap';
import { useRoadmap } from '../context/RoadmapContext';

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
  const { updateItem, swimlanes } = useRoadmap();
  
  const xPx = (item.startPercentage / 100) * containerWidth;
  const yPx = swimlaneIndex * rowHeight + (rowHeight - 24) / 2; // Altura super compacta de 24px
  const widthPx = Math.max(120, (item.widthPercentage / 100) * containerWidth);

  // Status mapping simples e executivo
  const statusColors = {
    on_track: 'bg-emerald-600',
    at_risk: 'bg-amber-500',
    delayed: 'bg-rose-600'
  };

  const statusBg = statusColors[item.status || 'on_track'];

  return (
    <Rnd
      size={{ width: widthPx, height: 24 }}
      position={{ x: xPx, y: yPx }}
      bounds="parent"
      enableResizing={{ right: true, left: true, top: false, bottom: false, topRight: false, bottomRight: false, bottomLeft: false, topLeft: false }}
      dragAxis="both"
      className="z-10 group"
      onDragStop={(_e, d) => {
        const newStart = Math.max(0, Math.min(100 - item.widthPercentage, (d.x / containerWidth) * 100));
        let droppedRowIndex = Math.floor((d.y + 12) / rowHeight);
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
        className="w-full h-full rounded-md border border-slate-300/40 dark:border-white/10 bg-slate-100 dark:bg-slate-900/90 shadow-sm flex items-center justify-between px-2 cursor-grab active:cursor-grabbing relative overflow-hidden select-none hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
      >
        {/* Barra de Progresso Interna como background sutil */}
        <div 
          className="absolute left-0 top-0 bottom-0 bg-slate-200 dark:bg-slate-800/80 transition-all duration-300 pointer-events-none"
          style={{ width: `${item.progress || 0}%`, zIndex: 1 }}
        />

        {/* Indicador lateral de Status */}
        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${statusBg} z-10`} />

        {/* Conteúdo Textual com Alta Densidade */}
        <div className="flex items-center justify-between w-full z-10 pl-1">
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-[11px] truncate leading-none">
            {item.title}
          </span>
          <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 font-bold shrink-0 ml-2">
            {item.progress || 0}%
          </span>
        </div>

        {/* Conector Esquerdo / Entrada invisível com alça hover discreta */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-2 hover:bg-blue-500/20 cursor-pointer z-20"
          title="Conectar entrada"
          onMouseUp={(e) => {
            e.stopPropagation();
            onConnectionEnd(item.id);
          }}
        />

        {/* Conector Direito / Saída invisível com alça hover discreta */}
        <div 
          className="absolute right-0 top-0 bottom-0 w-2 hover:bg-blue-500/20 cursor-crosshair z-20"
          title="Arrastar saída"
          onMouseDown={(e) => {
            e.stopPropagation();
            onConnectionStart(item.id, e);
          }}
        />
      </div>
    </Rnd>
  );
}


