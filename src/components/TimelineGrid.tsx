import React, { useRef, useState, useEffect } from 'react';
import { useRoadmap } from '../context/RoadmapContext';
import { TimelineItem } from './TimelineItem';
import { RoadmapItem, Swimlane } from '../types/roadmap';
import { Plus, Settings, X, Search, Filter, Calendar } from 'lucide-react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ROW_HEIGHT = 72; // taller rows for enterprise metadata

interface Props {
  onEditItem: (item: RoadmapItem) => void;
  onEditCategory: (swimlane: Swimlane | null) => void;
}

export function TimelineGrid({ onEditItem, onEditCategory }: Props) {
  const { swimlanes, items, updateItem } = useRoadmap();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  
  // Connection dragging state
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [hoveredConnection, setHoveredConnection] = useState<string | null>(null);

  // Filters State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

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
    setConnectingFrom(null);
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

  const handleRemoveDependency = (itemId: string, depId: string) => {
    const item = items.find(i => i.id === itemId);
    if (item) {
      updateItem(itemId, { dependsOn: item.dependsOn.filter(id => id !== depId) });
    }
  };

  const getItemCoords = (item: RoadmapItem) => {
    const sIndex = swimlanes.findIndex(s => s.id === item.swimlaneId);
    return {
      xStart: (item.startPercentage / 100) * containerWidth,
      xEnd: ((item.startPercentage + item.widthPercentage) / 100) * containerWidth,
      y: sIndex * ROW_HEIGHT + ROW_HEIGHT / 2
    };
  };

  const getTodayPercentage = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const start = new Date(currentYear, 0, 1).getTime();
    const end = new Date(currentYear, 11, 31).getTime();
    const today = now.getTime();
    if (today < start) return 0;
    if (today > end) return 100;
    return ((today - start) / (end - start)) * 100;
  };

  // Filter Items
  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || 
                          (item.description && item.description.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || item.priority === priorityFilter;
    const matchesCategory = categoryFilter === 'all' || item.swimlaneId === categoryFilter;
    return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden m-4 rounded-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-lg border border-slate-200 dark:border-white/5 shadow-2xl">
      {/* Filtering Toolbar */}
      <div className="px-6 py-3 border-b border-slate-200 dark:border-white/5 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-950/20">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar roadmap..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">Todos Status</option>
              <option value="on_track">On Track</option>
              <option value="at_risk">At Risk</option>
              <option value="delayed">Delayed</option>
            </select>
          </div>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none cursor-pointer"
          >
            <option value="all">Todas Prioridades</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none cursor-pointer"
          >
            <option value="all">Todas Categorias</option>
            {swimlanes.map(s => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Header timeline */}
      <div className="flex h-12 border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20">
        <div className="w-48 shrink-0 border-r border-slate-200 dark:border-white/5 bg-slate-100/30 dark:bg-slate-950/40 flex items-center px-4 font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Categorias
        </div>
        <div className="flex-1 flex relative">
          {MONTHS.map((m) => (
            <div key={m} className="flex-1 border-r border-slate-200 dark:border-white/5 flex items-center justify-center text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">
              {m}
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-y-auto">
        {/* Left Sidebar (Swimlane Labels) */}
        <div className="w-48 shrink-0 border-r border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20 backdrop-blur-md relative z-20 flex flex-col">
          {swimlanes.map((s) => {
            const laneItemsCount = items.filter(i => i.swimlaneId === s.id).length;
            return (
              <div 
                key={s.id} 
                className="px-4 flex items-center justify-between text-xs font-black text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-white/5 group/lane cursor-pointer hover:bg-slate-200/50 dark:hover:bg-white/5 transition-colors"
                style={{ height: ROW_HEIGHT, borderLeftWidth: 4, borderLeftColor: s.color }}
                onClick={() => onEditCategory(s)}
              >
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="truncate">{s.title}</span>
                  <span className="text-[9px] font-normal text-slate-400 dark:text-slate-500 truncate">{s.description || 'Sem descrição'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded-md font-extrabold">{laneItemsCount}</span>
                  <span className="opacity-0 group-hover/lane:opacity-100 transition-opacity text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
                    <Settings className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
          
          <button
            onClick={() => onEditCategory(null)}
            className="w-full hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold text-slate-500 transition-colors flex items-center gap-1.5 justify-center border-b border-slate-200 dark:border-white/5"
            style={{ height: ROW_HEIGHT }}
          >
            <Plus className="w-3.5 h-3.5" />
            Categoria
          </button>
        </div>

        {/* Timeline Canvas */}
        <div 
          ref={containerRef}
          className="flex-1 relative overflow-hidden cursor-crosshair bg-slate-100/10 dark:bg-slate-950/10"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <div className="relative w-full" style={{ height: swimlanes.length * ROW_HEIGHT }}>
            {/* Vertical grid lines */}
            <div className="absolute inset-0 flex pointer-events-none">
              {MONTHS.map((m) => (
                <div key={m} className="flex-1 border-r border-slate-200/50 dark:border-white/5 h-full" />
              ))}
            </div>

            {/* Horizontal swimlane lines */}
            <div className="absolute inset-0 pointer-events-none">
              {swimlanes.map((s) => (
                <div key={s.id} className="border-b border-slate-200/50 dark:border-white/5" style={{ height: ROW_HEIGHT }} />
              ))}
            </div>

            {/* Today Line Indicator */}
            {containerWidth > 0 && (
              <div 
                className="absolute top-0 bottom-0 border-l border-indigo-500 z-10 pointer-events-none"
                style={{ left: `${getTodayPercentage()}%` }}
              >
                <div className="absolute top-0 -translate-x-1/2 bg-indigo-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded flex items-center gap-1 shadow-md">
                  <Calendar className="w-2.5 h-2.5" />
                  Hoje
                </div>
              </div>
            )}

            {containerWidth > 0 && (
              <>
              {/* Connections SVG Layer */}
              <svg 
                className="absolute inset-0 z-20 overflow-visible" 
                style={{ pointerEvents: 'none', width: '100%', height: swimlanes.length * ROW_HEIGHT }}
              >
                <defs>
                  <style>{`
                    @keyframes flow-dash {
                      to {
                        stroke-dashoffset: -20;
                      }
                    }
                    .flow-path {
                      animation: flow-dash 1.2s linear infinite;
                    }
                  `}</style>
                  <filter id="premium-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <marker
                    id="arrow-red"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
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
                {filteredItems.map(item => {
                  const toCoords = getItemCoords(item);
                  return item.dependsOn.map(depId => {
                    const depItem = items.find(i => i.id === depId);
                    if (!depItem) return null;
                    const fromCoords = getItemCoords(depItem);
                    
                    const overlapStart = Math.max(fromCoords.xStart, toCoords.xStart);
                    const overlapEnd = Math.min(fromCoords.xEnd, toCoords.xEnd);
                    const isOverlapping = fromCoords.y !== toCoords.y && overlapStart < overlapEnd;
                    
                    let xFrom, yFrom, xTo, yTo;

                    if (isOverlapping) {
                      const overlapX = (overlapStart + overlapEnd) / 2;
                      if (fromCoords.y < toCoords.y) {
                        xFrom = overlapX;
                        yFrom = fromCoords.y + 16;
                        xTo = overlapX;
                        yTo = toCoords.y - 16;
                      } else {
                        xFrom = overlapX;
                        yFrom = fromCoords.y - 16;
                        xTo = overlapX;
                        yTo = toCoords.y + 16;
                      }
                    } else if (fromCoords.xEnd <= toCoords.xStart) {
                      xFrom = fromCoords.xEnd;
                      yFrom = fromCoords.y;
                      xTo = toCoords.xStart;
                      yTo = toCoords.y;
                    } else {
                      xFrom = fromCoords.xStart;
                      yFrom = fromCoords.y;
                      xTo = toCoords.xEnd;
                      yTo = toCoords.y;
                    }

                    // Advanced dynamic cubic bezier curve flow
                    const dx = xTo - xFrom;
                    const controlDist = Math.min(120, Math.abs(dx) / 2 || 40);
                    const path = `M ${xFrom} ${yFrom} C ${xFrom + (dx > 0 ? controlDist : -controlDist)} ${yFrom}, ${xTo + (dx > 0 ? -controlDist : controlDist)} ${yTo}, ${xTo} ${yTo}`;

                    const connId = `${item.id}-${depId}`;
                    const isHovered = hoveredConnection === connId;

                    return (
                      <g 
                        key={connId} 
                        style={{ pointerEvents: 'auto' }}
                        className="group/conn"
                        onMouseEnter={() => setHoveredConnection(connId)}
                        onMouseLeave={() => setHoveredConnection(null)}
                      >
                        {/* Wide invisible hover boundary */}
                        <path 
                          d={path} 
                          fill="none" 
                          stroke="transparent" 
                          strokeWidth="14" 
                          className="cursor-pointer"
                        />
                        {/* Outer glowing path */}
                        {isHovered && (
                          <path 
                            d={path} 
                            fill="none" 
                            stroke="#ef4444" 
                            strokeWidth="5" 
                            opacity="0.3"
                            filter="url(#premium-glow)"
                          />
                        )}
                        {/* Base path */}
                        <path 
                          d={path} 
                          fill="none" 
                          stroke={isHovered ? "#dc2626" : "#ef4444"} 
                          strokeWidth={isHovered ? "2.5" : "1.5"} 
                          strokeDasharray={isHovered ? "none" : "5 5"}
                          markerEnd={isHovered ? "url(#arrow-red-hover)" : "url(#arrow-red)"}
                          opacity={isHovered ? "1" : "0.55"}
                          className="transition-all"
                        />
                        {/* Flowing motion overlay */}
                        {!isHovered && (
                          <path 
                            d={path} 
                            fill="none" 
                            stroke="#fca5a5" 
                            strokeWidth="1.2" 
                            strokeDasharray="4 12"
                            className="flow-path"
                            opacity="0.8"
                          />
                        )}
                        {/* Starting Node */}
                        <circle cx={xFrom} cy={yFrom} r={isHovered ? "4" : "3"} fill={isHovered ? "#dc2626" : "#ef4444"} />
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

              {/* Floating HTML Delete Button at Midpoint */}
              {hoveredConnection && (() => {
                const [itemId, depId] = hoveredConnection.split('-');
                const item = items.find(i => i.id === itemId);
                const depItem = items.find(i => i.id === depId);
                if (!item || !depItem) return null;
                const toCoords = getItemCoords(item);
                const fromCoords = getItemCoords(depItem);
                
                const overlapStart = Math.max(fromCoords.xStart, toCoords.xStart);
                const overlapEnd = Math.min(fromCoords.xEnd, toCoords.xEnd);
                const isOverlapping = fromCoords.y !== toCoords.y && overlapStart < overlapEnd;
                
                let xFrom, yFrom, xTo, yTo;

                if (isOverlapping) {
                  const overlapX = (overlapStart + overlapEnd) / 2;
                  if (fromCoords.y < toCoords.y) {
                    xFrom = overlapX; yFrom = fromCoords.y + 16;
                    xTo = overlapX; yTo = toCoords.y - 16;
                  } else {
                    xFrom = overlapX; yFrom = fromCoords.y - 16;
                    xTo = overlapX; yTo = toCoords.y + 16;
                  }
                } else if (fromCoords.xEnd <= toCoords.xStart) {
                  xFrom = fromCoords.xEnd; yFrom = fromCoords.y;
                  xTo = toCoords.xStart; yTo = toCoords.y;
                } else {
                  xFrom = fromCoords.xStart; yFrom = fromCoords.y;
                  xTo = toCoords.xEnd; yTo = toCoords.y;
                }

                const mx = (xFrom + xTo) / 2;
                const my = (yFrom + yTo) / 2;

                return (
                  <button
                    style={{ 
                      position: 'absolute', 
                      left: mx - 10, 
                      top: my - 10, 
                      zIndex: 40,
                      pointerEvents: 'auto'
                    }}
                    className="w-5 h-5 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center shadow-lg border border-white transition-transform active:scale-95 cursor-pointer animate-in fade-in zoom-in-75 duration-75"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleRemoveDependency(itemId, depId);
                      setHoveredConnection(null);
                    }}
                    onMouseEnter={() => setHoveredConnection(hoveredConnection)}
                    onMouseLeave={() => setHoveredConnection(null)}
                  >
                    <X className="w-3 h-3" />
                  </button>
                );
              })()}

              {/* Draggable Items */}
              {filteredItems.map(item => {
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
    </div>
  );
}
