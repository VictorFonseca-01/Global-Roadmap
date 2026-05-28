import { Rnd } from 'react-rnd';
import { RoadmapItem } from '../types/roadmap';
import { useRoadmap } from '../context/RoadmapContext';
import { CircleDot } from 'lucide-react';

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
  const yPx = swimlaneIndex * rowHeight + (rowHeight - 32) / 2;
  const widthPx = (item.widthPercentage / 100) * containerWidth;

  const incomingCount = item.dependsOn.length;
  const outgoingCount = items.filter(i => i.dependsOn.includes(item.id)).length;

  return (
    <Rnd
      size={{ width: widthPx, height: 32 }}
      position={{ x: xPx, y: yPx }}
      bounds="parent"
      enableResizing={{ right: true, left: true, top: false, bottom: false, topRight: false, bottomRight: false, bottomLeft: false, topLeft: false }}
      dragAxis="both"
      className="z-10 group"
      onDragStop={(_e, d) => {
        const newStart = Math.max(0, Math.min(100 - item.widthPercentage, (d.x / containerWidth) * 100));
        let droppedRowIndex = Math.floor((d.y + 16) / rowHeight);
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
        className="w-full h-full rounded shadow-sm text-white text-xs font-bold px-2 flex items-center justify-between cursor-pointer border border-black/10 relative"
        style={{ backgroundColor: item.color }}
      >
        {/* Incoming Badge on Left */}
        {incomingCount > 0 && (
          <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-rose-500 text-white border border-white rounded-full flex items-center justify-center text-[9px] font-black shadow-sm z-30 select-none">
            {incomingCount}
          </div>
        )}

        <span className="truncate pr-2 select-none">{item.title}</span>
        
        {/* Outgoing Badge on Right / Connection Port */}
        <div 
          className="p-1 hover:bg-white/20 rounded cursor-crosshair flex items-center justify-center relative"
          onMouseDown={(e) => {
            e.stopPropagation();
            onConnectionStart(item.id, e);
          }}
        >
          {outgoingCount > 0 ? (
            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-4 h-4 bg-rose-500 text-white border border-white rounded-full flex items-center justify-center text-[9px] font-black shadow-sm z-30 select-none">
              {outgoingCount}
            </div>
          ) : (
            <CircleDot className="w-3.5 h-3.5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </div>
    </Rnd>
  );
}
