import React, { useRef, useState, useEffect } from 'react';
import { useRoadmap } from '../context/RoadmapContext';
import { TimelineItem } from './TimelineItem';
import { RoadmapItem, Swimlane } from '../types/roadmap';
import { Plus, Settings, X, Search, ZoomIn } from 'lucide-react';

const ROW_HEIGHT = 38; // Linhas compactas para densidade extrema de informação (Project/Smartsheet style)

interface Props {
  onEditItem: (item: RoadmapItem) => void;
  onEditCategory: (swimlane: Swimlane | null) => void;
}

type ZoomLevel = 'week' | 'month' | 'quarter' | 'year';

export function TimelineGrid({ onEditItem, onEditCategory }: Props) {
  const { swimlanes, items, updateItem, year } = useRoadmap();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('month');
  
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
      const targetItem = items.find(i => i.id === targetId);

      if (!sourceItem || !targetItem) {
        setConnectingFrom(null);
        return;
      }

      // Regra 1: Auto-dependência
      if (connectingFrom === targetId) {
        alert('Erro: Uma iniciativa não pode depender dela mesma.');
        setConnectingFrom(null);
        return;
      }

      // Regra 2: Conexão Duplicada
      if (sourceItem.dependsOn.includes(targetId)) {
        alert('Erro: Esta conexão de dependência já existe.');
        setConnectingFrom(null);
        return;
      }

      // Regra 3: Dependência Circular
      // Função recursiva de DFS para checar se targetId já depende de connectingFrom direta ou indiretamente
      const checkCircular = (currentId: string, visited: Set<string>): boolean => {
        if (currentId === connectingFrom) return true;
        if (visited.has(currentId)) return false;
        visited.add(currentId);
        
        const currentItem = items.find(i => i.id === currentId);
        if (!currentItem) return false;

        for (const depId of currentItem.dependsOn) {
          if (checkCircular(depId, visited)) return true;
        }
        return false;
      };

      if (checkCircular(targetId, new Set<string>())) {
        alert('Erro de Dependência Circular detectado. O item destino já depende da origem (direta ou indiretamente).');
        setConnectingFrom(null);
        return;
      }

      // Válido: Atualiza
      updateItem(connectingFrom, { dependsOn: [...sourceItem.dependsOn, targetId] });
    }
    setConnectingFrom(null);
  };

  const handleRemoveDependency = (itemId: string, depId: string) => {
    const item = items.find(i => i.id === itemId);
    if (item) {
      updateItem(itemId, { dependsOn: item.dependsOn.filter(id => id !== depId) });
    }
  };  // Controla o modo de visualização executivo vs detalhado
  const [viewMode, setViewMode] = useState<'executive' | 'detailed'>('detailed');

  // Adicionar manipulador de Ctrl + Scroll para Zoom no container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const directions: ZoomLevel[] = ['year', 'quarter', 'month', 'week'];
        const currentIndex = directions.indexOf(zoomLevel);
        if (e.deltaY < 0 && currentIndex < directions.length - 1) {
          setZoomLevel(directions[currentIndex + 1]);
        } else if (e.deltaY > 0 && currentIndex > 0) {
          setZoomLevel(directions[currentIndex - 1]);
        }
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [zoomLevel]);

  // Conversão de data real em percentual horizontal dentro do ano de visualização
  const getDatePercentage = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 0;
      const start = new Date(year, 0, 1).getTime();
      const end = new Date(year, 11, 31).getTime();
      const target = date.getTime();
      if (target <= start) return 0;
      if (target >= end) return 100;
      return ((target - start) / (end - start)) * 100;
    } catch {
      return 0;
    }
  };

  const getItemCoords = (item: RoadmapItem) => {
    const sIndex = swimlanes.findIndex(s => s.id === item.swimlaneId);
    
    // Obter posições baseadas em datas reais se existirem, senão usar porcentagens antigas
    const xStartPct = item.startDate ? getDatePercentage(item.startDate) : item.startPercentage;
    const xEndPct = item.endDate ? getDatePercentage(item.endDate) : (item.startPercentage + item.widthPercentage);
    
    const xStart = (xStartPct / 100) * containerWidth;
    const xEnd = (xEndPct / 100) * containerWidth;

    return {
      xStart,
      xEnd,
      y: sIndex * ROW_HEIGHT + ROW_HEIGHT / 2
    };
  };

  const getTodayPercentage = () => {
    const now = new Date();
    const start = new Date(year, 0, 1).getTime();
    const end = new Date(year, 11, 31).getTime();
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

  // Geração de colunas conforme o nível de Zoom e Modo de Visão (Executivo vs Detalhado)
  const getTimelineColumns = () => {
    if (viewMode === 'executive') {
      return ['1º Semestre (H1)', '2º Semestre (H2)'];
    }
    if (zoomLevel === 'week') {
      return Array.from({ length: 52 }, (_, i) => `Semana ${i + 1}`);
    }
    if (zoomLevel === 'quarter') {
      return ['Q1 (Jan-Mar)', 'Q2 (Apr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dec)'];
    }
    if (zoomLevel === 'year') {
      return ['1º Semestre (H1)', '2º Semestre (H2)'];
    }
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  };

  const columns = getTimelineColumns();

  return (
    <div className="flex-1 flex flex-col overflow-hidden m-4 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 shadow-lg">
      {/* Filtering Toolbar */}
      <div className="px-4 py-2 border-b border-slate-200 dark:border-white/5 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/20">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar iniciativa..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Toggle de Modo de Visão (Executivo vs Detalhado) */}
          <div className="flex bg-slate-100 dark:bg-slate-950/40 p-0.5 rounded-lg border border-slate-200 dark:border-white/10 shrink-0">
            <button
              onClick={() => setViewMode('executive')}
              className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${
                viewMode === 'executive' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Executivo
            </button>
            <button
              onClick={() => setViewMode('detailed')}
              className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${
                viewMode === 'detailed' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Detalhado
            </button>
          </div>

          {/* Zoom Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950/40 px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10">
            <ZoomIn className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={zoomLevel}
              onChange={e => setZoomLevel(e.target.value as ZoomLevel)}
              className="bg-transparent border-0 text-xs font-semibold focus:outline-none cursor-pointer text-slate-700 dark:text-slate-300"
              disabled={viewMode === 'executive'}
            >
              <option value="week">Semanal</option>
              <option value="month">Mensal</option>
              <option value="quarter">Trimestral</option>
              <option value="year">Anual</option>
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none cursor-pointer"
          >
            <option value="all">Status</option>
            <option value="on_track">No Prazo</option>
            <option value="at_risk">Em Risco</option>
            <option value="delayed">Atrasado</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none cursor-pointer"
          >
            <option value="all">Prioridade</option>
            <option value="low">Baixa</option>
            <option value="medium">Média</option>
            <option value="high">Alta</option>
            <option value="critical">Crítica</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none cursor-pointer"
          >
            <option value="all">Categoria</option>
            {swimlanes.map(s => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Header timeline */}
      <div className="flex h-8 border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20">
        <div className="w-56 shrink-0 border-r border-slate-200 dark:border-white/5 bg-slate-100/30 dark:bg-slate-950/40 flex items-center px-3 font-bold text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Estrutura Governança (Categorias)
        </div>
        <div className="flex-1 flex relative">
          {columns.map((col) => (
            <div key={col} className="flex-1 border-r border-slate-200 dark:border-white/5 flex items-center justify-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
              {col}
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-y-auto">
        {/* Left Sidebar (Swimlane Labels) */}
        <div className="w-56 shrink-0 border-r border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20 backdrop-blur-md relative z-20 flex flex-col">
          {swimlanes.map((s) => {
            const laneItemsCount = items.filter(i => i.swimlaneId === s.id).length;
            return (
              <div 
                key={s.id} 
                className="px-3 flex items-center justify-between text-xs font-black text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-white/5 group/lane cursor-pointer hover:bg-slate-100/50 dark:hover:bg-white/5 transition-colors"
                style={{ height: ROW_HEIGHT, borderLeftWidth: 3, borderLeftColor: s.color }}
                onClick={() => onEditCategory(s)}
              >
                <div className="flex flex-col min-w-0 pr-1">
                  <span className="truncate text-[11px] font-bold tracking-tight">{s.title}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400 px-1 rounded font-bold">{laneItemsCount}</span>
                  <span className="opacity-0 group-hover/lane:opacity-100 transition-opacity text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5">
                    <Settings className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
          
          <button
            onClick={() => onEditCategory(null)}
            className="w-full hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-blue-600 dark:hover:text-blue-400 text-[10px] font-bold text-slate-500 transition-colors flex items-center gap-1 justify-center border-b border-slate-200 dark:border-white/5"
            style={{ height: ROW_HEIGHT }}
          >
            <Plus className="w-3 h-3" />
            Nova Categoria
          </button>
        </div>

        {/* Timeline Canvas */}
        <div 
          ref={containerRef}
          className="flex-1 relative overflow-hidden cursor-crosshair bg-slate-100/10 dark:bg-slate-950/5"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <div className="relative w-full" style={{ height: swimlanes.length * ROW_HEIGHT }}>
            {/* Vertical grid lines */}
            <div className="absolute inset-0 flex pointer-events-none">
              {columns.map((col) => (
                <div key={col} className="flex-1 border-r border-slate-200/40 dark:border-white/[0.03] h-full" />
              ))}
            </div>

            {/* Horizontal swimlane lines */}
            <div className="absolute inset-0 pointer-events-none">
              {swimlanes.map((s) => (
                <div key={s.id} className="border-b border-slate-200/40 dark:border-white/[0.03]" style={{ height: ROW_HEIGHT }} />
              ))}
            </div>

            {/* Today Line Indicator (Fina e Discreta) */}
            {containerWidth > 0 && (
              <div 
                className="absolute top-0 bottom-0 border-l border-blue-500/50 z-10 pointer-events-none"
                style={{ left: `${getTodayPercentage()}%` }}
              >
                <div className="absolute top-1 -translate-x-1/2 bg-blue-600 text-white text-[8px] font-bold px-1 py-0.5 rounded shadow">
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
                  <marker
                    id="arrow-red"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="4"
                    markerHeight="4"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 7 5 L 0 8.5 z" fill="#ef4444" opacity="0.6" />
                  </marker>
                  <marker
                    id="arrow-red-hover"
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
                    id="arrow-blue"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 7 5 L 0 8.5 z" fill="#3b82f6" />
                  </marker>
                </defs>

                {/* Existing dependencies - Finas e Discretas */}
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
                        yFrom = fromCoords.y + 12;
                        xTo = overlapX;
                        yTo = toCoords.y - 12;
                      } else {
                        xFrom = overlapX;
                        yFrom = fromCoords.y - 12;
                        xTo = overlapX;
                        yTo = toCoords.y + 12;
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

                    const dx = xTo - xFrom;
                    const controlDist = Math.min(80, Math.abs(dx) / 2 || 30);
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
                          strokeWidth="10" 
                          className="cursor-pointer"
                        />
                        {/* Base path - Muito discreta para não poluir */}
                        <path 
                          d={path} 
                          fill="none" 
                          stroke={isHovered ? "#ef4444" : "#94a3b8"} 
                          strokeWidth={isHovered ? "1.5" : "1"} 
                          strokeDasharray={isHovered ? "none" : "3 3"}
                          markerEnd={isHovered ? "url(#arrow-red-hover)" : "url(#arrow-red)"}
                          opacity={isHovered ? "1" : "0.25"}
                          className="transition-all"
                        />
                        {/* Starting Node */}
                        <circle cx={xFrom} cy={yFrom} r={isHovered ? "3.5" : "2"} fill={isHovered ? "#ef4444" : "#94a3b8"} opacity={isHovered ? "1" : "0.4"} />
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
                    const controlDist = Math.min(80, Math.abs(dx) / 2);
                    const path = `M ${coords.xEnd} ${coords.y} C ${coords.xEnd + (dx > 0 ? controlDist : -controlDist)} ${coords.y}, ${mousePos.x + (dx > 0 ? -controlDist : controlDist)} ${mousePos.y}, ${mousePos.x} ${mousePos.y}`;
                    return (
                      <path 
                        d={path} 
                        fill="none" 
                        stroke="#3b82f6" 
                        strokeWidth="1.5" 
                        strokeDasharray="3 3" 
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
                    xFrom = overlapX; yFrom = fromCoords.y + 12;
                    xTo = overlapX; yTo = toCoords.y - 12;
                  } else {
                    xFrom = overlapX; yFrom = fromCoords.y - 12;
                    xTo = overlapX; yTo = toCoords.y + 12;
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
                      left: mx - 8, 
                      top: my - 8, 
                      zIndex: 40,
                      pointerEvents: 'auto'
                    }}
                    className="w-4.5 h-4.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center shadow border border-white transition-transform active:scale-95 cursor-pointer animate-in fade-in zoom-in-75 duration-75 text-[10px]"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleRemoveDependency(itemId, depId);
                      setHoveredConnection(null);
                    }}
                    onMouseEnter={() => setHoveredConnection(hoveredConnection)}
                    onMouseLeave={() => setHoveredConnection(null)}
                  >
                    <X className="w-2.5 h-2.5" />
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
