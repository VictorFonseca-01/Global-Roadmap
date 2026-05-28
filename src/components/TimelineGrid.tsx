import React, { useRef, useState, useEffect } from 'react';
import { useRoadmap } from '../context/RoadmapContext';
import { TimelineItem } from './TimelineItem';
import { RoadmapItem } from '../types/roadmap';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ROW_HEIGHT = 60;

interface Props {
  onEditItem: (item: RoadmapItem) => void;
}

export function TimelineGrid({ onEditItem }: Props) {
  const { swimlanes, items, updateItem, addItem } = useRoadmap();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  
  // Connection dragging state
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [hoveredConnection, setHoveredConnection] = useState<string | null>(null);

  const handleRemoveDependency = (itemId: string, depId: string) => {
    const item = items.find(i => i.id === itemId);
    if (item) {
      updateItem(itemId, { dependsOn: item.dependsOn.filter(id => id !== depId) });
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!connectingFrom || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top + containerRef.current.scrollTop
    });
  };

  const handleMouseUp = () => {
    setConnectingFrom(null); // Cancel connection if dropped on nothing
  };

  const handleConnectionStart = (itemId: string, e: React.MouseEvent) => {
    setConnectingFrom(itemId);
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top + containerRef.current.scrollTop
      });
    }
  };

  const handleConnectionEnd = (targetId: string) => {
    if (connectingFrom && connectingFrom !== targetId) {
      const sourceItem = items.find(i => i.id === connectingFrom);
      if (sourceItem && !sourceItem.dependsOn.includes(targetId)) {
        updateItem(connectingFrom, { dependsOn: [...sourceItem.dependsOn, targetId] });
      }
    }
    setConnectingFrom(null);
  };

  const handleBackgroundDoubleClick = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top + containerRef.current.scrollTop;
    
    const swimlaneIndex = Math.max(0, Math.min(swimlanes.length - 1, Math.floor(y / ROW_HEIGHT)));
    const startPercentage = (x / containerWidth) * 100;
    
    const newItem: RoadmapItem = {
      id: Date.now().toString(),
      title: 'New Item',
      color: swimlanes[swimlaneIndex].color,
      swimlaneId: swimlanes[swimlaneIndex].id,
      startPercentage: Math.min(90, startPercentage),
      widthPercentage: 10,
      dependsOn: []
    };
    
    addItem(newItem);
    onEditItem(newItem);
  };

  const getItemCoords = (item: RoadmapItem) => {
    const sIndex = swimlanes.findIndex(s => s.id === item.swimlaneId);
    return {
      xStart: (item.startPercentage / 100) * containerWidth,
      xEnd: ((item.startPercentage + item.widthPercentage) / 100) * containerWidth,
      y: sIndex * ROW_HEIGHT + ROW_HEIGHT / 2
    };
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white border border-slate-200 m-4 rounded-xl shadow-sm">
      {/* Header timeline */}
      <div className="flex h-12 border-b border-slate-200 bg-slate-50">
        <div className="w-48 shrink-0 border-r border-slate-200 bg-slate-100 flex items-center px-4 font-bold text-xs text-slate-500 uppercase">
          Categorias
        </div>
        <div className="flex-1 flex relative">
          {MONTHS.map((m) => (
            <div key={m} className="flex-1 border-r border-slate-200 flex items-center justify-center text-xs font-bold text-slate-400 uppercase">
              {m}
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-y-auto">
        {/* Left Sidebar (Swimlane Labels) */}
        <div className="w-48 shrink-0 border-r border-slate-200 bg-slate-50 relative z-20">
          {swimlanes.map((s) => (
            <div 
              key={s.id} 
              className="px-4 flex items-center text-xs font-black text-slate-600 border-b border-slate-200"
              style={{ height: ROW_HEIGHT, borderLeftWidth: 4, borderLeftColor: s.color }}
            >
              {s.title}
            </div>
          ))}
        </div>

        {/* Timeline Canvas */}
        <div 
          ref={containerRef}
          className="flex-1 relative overflow-hidden cursor-crosshair bg-slate-50/50"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onDoubleClick={handleBackgroundDoubleClick}
        >
          {/* Vertical grid lines */}
          <div className="absolute inset-0 flex pointer-events-none">
            {MONTHS.map((m) => (
              <div key={m} className="flex-1 border-r border-slate-100 h-full" />
            ))}
          </div>

          {/* Horizontal swimlane lines */}
          <div className="absolute inset-0 pointer-events-none">
            {swimlanes.map((s) => (
              <div key={s.id} className="border-b border-slate-200" style={{ height: ROW_HEIGHT }} />
            ))}
          </div>

          {containerWidth > 0 && (
            <>
              {/* Connections SVG Layer */}
              <svg className="absolute inset-0 pointer-events-none z-0 overflow-visible" style={{ width: '100%', height: swimlanes.length * ROW_HEIGHT }}>
                <defs>
                  <marker
                    id="arrow-red"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 7 5 L 0 8.5 z" fill="#ef4444" />
                  </marker>
                  <marker
                    id="arrow-red-hover"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 7 5 L 0 8.5 z" fill="#dc2626" />
                  </marker>
                  <marker
                    id="arrow-blue"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 7 5 L 0 8.5 z" fill="#3b82f6" />
                  </marker>
                </defs>

                {/* Existing dependencies */}
                {items.map(item => {
                  const toCoords = getItemCoords(item);
                  return item.dependsOn.map(depId => {
                    const depItem = items.find(i => i.id === depId);
                    if (!depItem) return null;
                    const fromCoords = getItemCoords(depItem);
                    
                    const dx = toCoords.xStart - fromCoords.xEnd;
                    const controlDist = Math.min(100, Math.abs(dx) / 2);
                    // Dynamically point curve control points based on flow direction to prevent loops
                    const p0x = fromCoords.xEnd;
                    const p0y = fromCoords.y;
                    const p1x = fromCoords.xEnd + (dx > 0 ? controlDist : -controlDist);
                    const p1y = fromCoords.y;
                    const p2x = toCoords.xStart + (dx > 0 ? -controlDist : controlDist);
                    const p2y = toCoords.y;
                    const p3x = toCoords.xStart;
                    const p3y = toCoords.y;

                    const path = `M ${p0x} ${p0y} C ${p1x} ${p1y}, ${p2x} ${p2y}, ${p3x} ${p3y}`;
                    
                    // Midpoint for delete button
                    const mx = 0.125 * p0x + 0.375 * p1x + 0.375 * p2x + 0.125 * p3x;
                    const my = 0.125 * p0y + 0.375 * p1y + 0.375 * p2y + 0.125 * p3y;

                    const connId = `${item.id}-${depId}`;
                    const isHovered = hoveredConnection === connId;

                    return (
                      <g 
                        key={connId} 
                        className="pointer-events-auto group/conn"
                        onMouseEnter={() => setHoveredConnection(connId)}
                        onMouseLeave={() => setHoveredConnection(null)}
                      >
                        {/* Wide invisible path for easier hovering */}
                        <path 
                          d={path} 
                          fill="none" 
                          stroke="transparent" 
                          strokeWidth="12" 
                          className="cursor-pointer"
                        />
                        {/* Visual path */}
                        <path 
                          d={path} 
                          fill="none" 
                          stroke={isHovered ? "#dc2626" : "#ef4444"} 
                          strokeWidth={isHovered ? "2.5" : "1.5"} 
                          strokeDasharray={isHovered ? "none" : "4 4"}
                          markerEnd={isHovered ? "url(#arrow-red-hover)" : "url(#arrow-red)"}
                          className="transition-all"
                        />
                        {/* Dot at start */}
                        <circle cx={fromCoords.xEnd} cy={fromCoords.y} r={isHovered ? "4" : "3"} fill={isHovered ? "#dc2626" : "#ef4444"} />

                        {/* Interactive Delete Button at Midpoint */}
                        {isHovered && (
                          <g 
                            className="cursor-pointer transition-transform duration-150 active:scale-95"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveDependency(item.id, depId);
                            }}
                          >
                            <circle cx={mx} cy={my} r="10" fill="#dc2626" stroke="#ffffff" strokeWidth="2" className="shadow-md" />
                            <path d={`M ${mx - 3.5} ${my - 3.5} L ${mx + 3.5} ${my + 3.5} M ${mx + 3.5} ${my - 3.5} L ${mx - 3.5} ${my + 3.5}`} stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                          </g>
                        )}
                      </g>
                    );
                  });
                })}

                {/* Dragging connection */}
                {connectingFrom && (
                  (() => {
                    const source = items.find(i => i.id === connectingFrom);
                    if (!source) return null;
                    const coords = getItemCoords(source);
                    const dx = mousePos.x - coords.xEnd;
                    const controlDist = Math.min(100, Math.abs(dx) / 2);
                    const path = `M ${coords.xEnd} ${coords.y} C ${coords.xEnd + (dx > 0 ? controlDist : -controlDist)} ${coords.y}, ${mousePos.x + (dx > 0 ? -controlDist : controlDist)} ${mousePos.y}, ${mousePos.x} ${mousePos.y}`;
                    return (
                      <path 
                        d={path} 
                        fill="none" 
                        stroke="#3b82f6" 
                        strokeWidth="2.5" 
                        strokeDasharray="4 4" 
                        markerEnd="url(#arrow-blue)" 
                      />
                    );
                  })()
                )}
              </svg>

              {/* Draggable Items */}
              {items.map(item => {
                const sIndex = swimlanes.findIndex(s => s.id === item.swimlaneId);
                if (sIndex === -1) return null;
                
                return (
                  <TimelineItem 
                    key={item.id}
                    item={item}
                    swimlaneIndex={sIndex}
                    rowHeight={ROW_HEIGHT}
                    containerWidth={containerWidth}
                    onEdit={onEditItem}
                    onConnectionStart={handleConnectionStart}
                    onConnectionEnd={handleConnectionEnd}
                  />
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
