import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { migrationPlanService } from "@/services/migrationPlanService";
import { roadmapGeneratorService } from "@/services/roadmapGeneratorService";
import { lifecycleIntelligenceEngine } from "@/services/lifecycleIntelligenceEngine";
import { Badge } from "@/components/ui/badge";
import { 
  format, 
  parseISO, 
  addMonths, 
  startOfMonth, 
  differenceInMonths, 
  differenceInDays,
  isBefore
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Map as MapIcon, 
  RefreshCw, 
  AlertTriangle,
  Clock,
  ChevronRight,
  Info,
  Maximize2,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVirtualizer } from "@tanstack/react-virtual";

type ZoomLevel = 'month' | 'quarter' | 'year';

const GanttRow = React.memo(({ plan, timelineStart, colWidth, months, today }: { plan: any, timelineStart: Date, colWidth: number, months: Date[], today: Date }) => {
  const eolStr = plan.assets?.lifecycle_catalog?.end_of_support;
  const eolDate = eolStr ? parseISO(eolStr) : null;

  const strategicTimeline = useMemo(() => {
    return lifecycleIntelligenceEngine.generateStrategicTimeline({
      product_name: plan.assets?.lifecycle_catalog?.product_name || '',
      asset_type: plan.assets?.device_type || 'client',
      business_criticality: plan.assets?.business_criticality || plan.priority || 'low',
      end_of_support: eolStr || null,
      estimated_cost: plan.estimated_cost || 0
    }, today);
  }, [plan.assets, eolStr, plan.priority, plan.estimated_cost, today]);

  const getPixelOffsetOfDate = useCallback((date: Date) => {
    const monthsDiff = differenceInMonths(date, timelineStart);
    const day = date.getDate();
    const daysInMonth = 30;
    const preciseMonths = monthsDiff + (day / daysInMonth);
    return preciseMonths * colWidth;
  }, [timelineStart, colWidth]);

  const eolOffset = useMemo(() => eolDate ? getPixelOffsetOfDate(eolDate) : -1, [eolDate, getPixelOffsetOfDate]);

  const phases = strategicTimeline.phases;
  if (!phases || phases.length === 0) return null;

  const pipelineStart = parseISO(phases[0].start_date);
  const pipelineEnd = parseISO(phases[phases.length - 1].end_date);
  const totalPipelineDays = differenceInDays(pipelineEnd, pipelineStart) || 1;

  const pipelineLeft = getPixelOffsetOfDate(pipelineStart);
  const pipelineWidth = getPixelOffsetOfDate(pipelineEnd) - pipelineLeft;

  return (
    <div className="h-20 border-b relative group/row hover:bg-primary/[0.02] transition-colors w-full flex items-center">
      {/* Linha vermelha com glow sutil de EoL por Ativo */}
      {eolDate && eolOffset >= 0 && eolOffset < months.length * colWidth && (
        <div 
          className="absolute top-0 bottom-0 border-l-2 border-rose-500/80 z-20 flex flex-col pointer-events-none"
          style={{ 
            left: eolOffset,
            boxShadow: '0 0 8px rgba(244,63,94,0.4)' 
          }}
        >
          <div className="opacity-0 group-hover/row:opacity-100 bg-rose-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded absolute top-2 -left-8 uppercase tracking-wider transition-opacity shadow-lg z-30">
            EOL: {format(eolDate, "dd MMM yy").toUpperCase()}
          </div>
        </div>
      )}

      {/* Renderizar as Fases no Gantt como pipeline conectado (altura fixa 10px, gap zero) */}
      <div 
        className="absolute h-2.5 flex items-center bg-slate-100 dark:bg-slate-800/50 rounded-full p-0.5 border border-slate-200 dark:border-slate-800"
        style={{ 
          left: Math.max(0, pipelineLeft),
          width: Math.max(40, pipelineWidth),
        }}
      >
        {phases.map((phase, pIdx) => {
          let color = 'from-blue-500 to-indigo-600';
          let border = 'border-blue-400';
          
          if (phase.type === 'pilot') {
            color = 'from-purple-500 to-violet-600';
            border = 'border-purple-400';
          } else if (phase.type === 'rollout') {
            color = 'from-emerald-500 to-teal-600';
            border = 'border-emerald-400';
          } else if (phase.type === 'coexistence') {
            color = 'from-amber-500 to-orange-600';
            border = 'border-amber-400';
          } else if (phase.type === 'decommission') {
            color = 'from-slate-500 to-slate-600';
            border = 'border-slate-400';
          }

          const widthPercent = (phase.duration_days / totalPipelineDays) * 100;
          const isFirst = pIdx === 0;
          const isLast = pIdx === phases.length - 1;

          return (
            <Tooltip key={pIdx}>
              <TooltipTrigger asChild>
                <motion.div
                  whileHover={{ scaleY: 1.6, zIndex: 40 }}
                  className={`h-full bg-gradient-to-r ${color} ${border} cursor-pointer relative transition-all ${
                    isFirst ? 'rounded-l-full' : ''
                  } ${
                    isLast ? 'rounded-r-full' : ''
                  }`}
                  style={{ 
                    width: `${widthPercent}%`,
                    minWidth: '16px'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent" />
                </motion.div>
              </TooltipTrigger>
              <TooltipContent className="w-[320px] p-5 rounded-2xl shadow-2xl border border-slate-800 bg-slate-950 text-slate-200" side="top" sideOffset={10}>
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-[11px] font-black uppercase text-primary">Plano de Migração</span>
                    <Badge variant="outline" className="text-[9px] font-bold border-slate-700 bg-slate-900">{plan.assets?.hostname}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-[11px]">
                    <div className="col-span-2">
                      <span className="text-[9px] font-black uppercase text-slate-500 block">EoL (Fim de Suporte)</span>
                      <span className="font-bold text-rose-400">{eolStr ? format(parseISO(eolStr), "dd/MM/yyyy") : "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-500 block">Versão Alvo</span>
                      <span className="font-bold text-slate-100">{strategicTimeline.recommended_target_version}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-500 block">Início Recomendado</span>
                      <span className="font-bold text-slate-100">{format(parseISO(phase.start_date), "dd/MM/yyyy")}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-500 block">Custo Projetado</span>
                      <span className="font-bold text-emerald-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(plan.estimated_cost || 0)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-500 block">Risco</span>
                      <span className="font-bold capitalize text-amber-400">{plan.priority || 'Baixo'}</span>
                    </div>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
});

GanttRow.displayName = "GanttRow";

export function GanttView({ projectId }: { projectId?: string }) {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [zoom, setZoom] = useState<ZoomLevel>('quarter');
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  // Prevenção de memory leaks em unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const { data: allPlans = [], isLoading } = useQuery({
    queryKey: ["migration-plans"],
    queryFn: () => migrationPlanService.getAll(),
  });

  const plans = useMemo(() => {
    return projectId 
      ? allPlans.filter(p => p.roadmap_project_id === projectId)
      : allPlans;
  }, [allPlans, projectId]);

  const handleGenerate = async () => {
    if (!projectId) return;
    setIsGenerating(true);
    
    // Cancela requisição anterior se houver
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const results = await roadmapGeneratorService.generate(projectId);
      if (results.success) {
        toast.success(`Roadmap gerado! ${results.createdCount} planos criados.`);
        queryClient.invalidateQueries({ queryKey: ["migration-plans"] });
      } else {
        toast.error("Geração incompleta", { description: results.errors[0] });
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        toast.error("Erro ao gerar roadmap");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const today = useMemo(() => new Date(), []);
  const timelineStart = useMemo(() => startOfMonth(addMonths(today, -3)), [today]);
  
  const totalMonths = useMemo(() => {
    return zoom === 'year' ? 48 : (zoom === 'quarter' ? 36 : 24);
  }, [zoom]);

  const months = useMemo(() => {
    return Array.from({ length: totalMonths }).map((_, i) => addMonths(timelineStart, i));
  }, [timelineStart, totalMonths]);

  const colWidth = useMemo(() => {
    switch(zoom) {
      case 'month': return 120;
      case 'quarter': return 180;
      case 'year': return 80;
      default: return 150;
    }
  }, [zoom]);

  const timelineWidth = useMemo(() => months.length * colWidth, [months, colWidth]);

  const getPriorityBadge = useCallback((p: string) => {
    switch (p) {
      case 'critical': return 'bg-rose-500/10 text-rose-600 border-rose-200';
      case 'high': return 'bg-orange-500/10 text-orange-600 border-orange-200';
      case 'medium': return 'bg-amber-500/10 text-amber-600 border-amber-200';
      case 'low': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
      default: return 'bg-slate-100 text-slate-600';
    }
  }, []);

  // Sincronização de rolagem vertical entre a coluna fixa de Ativos e a área de Gantt
  const isScrollingLeft = useRef(false);
  const isScrollingRight = useRef(false);

  const handleLeftScroll = useCallback(() => {
    if (isScrollingRight.current) return;
    isScrollingLeft.current = true;
    if (leftScrollRef.current && rightScrollRef.current) {
      rightScrollRef.current.scrollTop = leftScrollRef.current.scrollTop;
    }
    setTimeout(() => {
      isScrollingLeft.current = false;
    }, 50);
  }, []);

  const handleRightScroll = useCallback(() => {
    if (isScrollingLeft.current) return;
    isScrollingRight.current = true;
    if (leftScrollRef.current && rightScrollRef.current) {
      leftScrollRef.current.scrollTop = rightScrollRef.current.scrollTop;
    }
    setTimeout(() => {
      isScrollingRight.current = false;
    }, 50);
  }, []);

  // Virtualização de lista automatizada caso plans > 150 itens
  const isVirtualized = plans.length > 150;

  const leftVirtualizer = useVirtualizer({
    count: isVirtualized ? plans.length : 0,
    getScrollElement: () => leftScrollRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  const rightVirtualizer = useVirtualizer({
    count: isVirtualized ? plans.length : 0,
    getScrollElement: () => rightScrollRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  if (isLoading || isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center p-40 gap-6">
        <div className="relative">
          <RefreshCw className="h-16 w-16 text-primary animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-4 w-4 bg-primary rounded-full animate-ping" />
          </div>
        </div>
        <div className="text-center">
          <h3 className="text-2xl font-black tracking-tighter">Processando Roadmap Estratégico</h3>
          <p className="text-sm text-muted-foreground italic max-w-xs mx-auto">
            Calculando janelas de oportunidade e mitigação baseadas em inteligência de lifecycle.
          </p>
        </div>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-24 text-center">
        <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-inner">
          <MapIcon className="h-12 w-12 text-slate-300" />
        </div>
        <h3 className="text-3xl font-black tracking-tighter mb-4">Timeline de Migração Vazia</h3>
        <p className="text-muted-foreground max-w-md mb-10 leading-relaxed">
          Nenhum plano de migração foi gerado para este projeto. Isso pode ocorrer por falta de ativos elegíveis ou ausência de datas de suporte no catálogo.
        </p>
        <div className="flex flex-wrap gap-4 justify-center mb-10">
          <div className="p-4 px-6 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/50 rounded-2xl flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <span className="text-xs font-bold text-amber-900 dark:text-amber-100">Verifique os Ativos</span>
          </div>
          <div className="p-4 px-6 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/50 rounded-2xl flex items-center gap-3">
            <Info className="h-5 w-5 text-blue-600" />
            <span className="text-xs font-bold text-blue-900 dark:text-blue-100">Atualize o Lifecycle</span>
          </div>
        </div>
        <Button 
          onClick={handleGenerate}
          className="h-14 px-10 rounded-full font-black text-lg shadow-2xl shadow-primary/30 hover:shadow-primary/40 transition-all"
        >
          <Zap className="h-5 w-5 mr-2" /> Gerar Roadmap Agora
        </Button>
      </div>
    );
  }

  // Elementos de linha da esquerda
  const renderLeftRow = (plan: any) => {
    const eolStr = plan.assets?.lifecycle_catalog?.end_of_support;
    const strategicTimeline = lifecycleIntelligenceEngine.generateStrategicTimeline({
      product_name: plan.assets?.lifecycle_catalog?.product_name || '',
      asset_type: plan.assets?.device_type || 'client',
      business_criticality: plan.assets?.business_criticality || plan.priority || 'low',
      end_of_support: eolStr || null,
      estimated_cost: plan.estimated_cost || 0
    });

    const rolloutPhase = strategicTimeline.phases.find(p => p.type === 'rollout');
    const eolDate = eolStr ? parseISO(eolStr) : null;
    const rolloutEndsAfterEol = eolDate && rolloutPhase && isBefore(eolDate, parseISO(rolloutPhase.end_date));

    return (
      <div className="flex flex-col justify-center px-6 hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors group relative w-full h-full">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-black tracking-tight group-hover:text-primary transition-colors truncate max-w-[220px]">
            {plan.assets?.hostname}
          </span>
          <div className="flex items-center gap-1 flex-wrap max-w-[200px]">
            <Badge variant="outline" className={`text-[8px] uppercase font-black tracking-tighter ${getPriorityBadge(plan.priority)}`}>
              {plan.priority}
            </Badge>
            {strategicTimeline.badges?.slice(0, 1).map((badge, bIdx) => {
              let style = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
              let hasGlow = false;
              if (badge === 'Bloqueado') {
                style = 'bg-red-500/20 text-red-600 dark:text-red-400 font-black border-red-300';
                hasGlow = true;
              } else if (badge === 'Compliance Crítico') {
                style = 'bg-rose-500/20 text-rose-600 dark:text-rose-400 font-black border-rose-300';
                hasGlow = true;
              } else if (badge === 'Ultrapassa EoL') {
                style = 'bg-pink-500/20 text-pink-600 dark:text-pink-400 font-black border-pink-300';
                hasGlow = true;
              } else if (badge === 'High Operational Risk') {
                style = 'bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold border-orange-200';
              } else if (badge === 'Requires Assessment') {
                style = 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 font-bold border-yellow-200';
              } else if (badge === 'Safe Window') {
                style = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border-emerald-200';
              }
              return (
                <Badge 
                  key={bIdx} 
                  variant="outline" 
                  className={`text-[8px] uppercase font-black tracking-tighter transition-all ${style} ${hasGlow ? 'shadow-[0_0_8px_rgba(239,68,68,0.2)] animate-pulse' : ''}`}
                >
                  {badge}
                </Badge>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold text-slate-500 truncate max-w-[200px]">
            {plan.assets?.lifecycle_catalog?.product_name} {plan.assets?.lifecycle_catalog?.version}
          </span>
          <ChevronRight className="h-3 w-3 text-slate-300" />
          <span className="text-[10px] font-black text-primary truncate max-w-[120px]">
            {plan.assets?.lifecycle_catalog?.successor_version || "TBD"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-slate-400" />
            <span className="text-[9px] font-bold text-muted-foreground">
              EoL: {eolStr ? format(parseISO(eolStr), "MM/yyyy") : "-"}
            </span>
          </div>
          <div className="h-1 w-1 rounded-full bg-slate-300" />
          <Badge variant="secondary" className="text-[8px] h-4 font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-500">
            {plan.status.replace('_', ' ')}
          </Badge>
          {rolloutEndsAfterEol ? (
            <Badge className="bg-rose-500 text-white text-[8px] h-4 font-black uppercase border-none animate-pulse">
              Ultrapassa EoL
            </Badge>
          ) : eolStr ? (
            <Badge className="bg-emerald-500 text-white text-[8px] h-4 font-black uppercase border-none">
              Janela Segura
            </Badge>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-white dark:bg-slate-900 select-none overflow-hidden">
        {/* Toolbar Superior */}
        <div className="p-4 border-b flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 rounded-full border shadow-sm">
              <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-black uppercase text-muted-foreground">Zoom:</span>
              <Select value={zoom} onValueChange={(v: ZoomLevel) => setZoom(v)}>
                <SelectTrigger className="h-6 border-none shadow-none bg-transparent focus:ring-0 p-0 text-[10px] font-black uppercase w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Mensal</SelectItem>
                  <SelectItem value="quarter">Trimestral</SelectItem>
                  <SelectItem value="year">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                <span className="text-[9px] font-black uppercase text-muted-foreground">Hoje</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                <span className="text-[9px] font-black uppercase text-muted-foreground">End of Support</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
             <Button variant="ghost" size="sm" onClick={handleGenerate} className="rounded-full text-[10px] font-black uppercase h-8">
               <RefreshCw className="h-3 w-3 mr-2" /> Atualizar Motor
             </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden h-full">
          {/* Coluna Fixa Esquerda: Ativos */}
          <div className="w-[450px] border-r flex-shrink-0 flex flex-col bg-white dark:bg-slate-900 z-40 shadow-xl overflow-hidden h-full">
            <div className="h-16 border-b flex items-center px-6 bg-slate-50/50 dark:bg-slate-950/50 flex-shrink-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Inventário / Detalhes Estratégicos</span>
            </div>
            <div 
              ref={leftScrollRef}
              onScroll={handleLeftScroll}
              className="flex-1 overflow-y-auto scrollbar-none h-full"
            >
              {isVirtualized ? (
                <div 
                  style={{ height: `${leftVirtualizer.getTotalSize()}px`, position: 'relative', width: '100%' }}
                >
                  {leftVirtualizer.getVirtualItems().map((virtualRow) => {
                    const plan = plans[virtualRow.index];
                    return (
                      <div 
                        key={virtualRow.key}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                        className="border-b"
                      >
                        {renderLeftRow(plan)}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col">
                  {plans.map((plan) => (
                    <div key={plan.id} className="h-20 border-b flex-shrink-0">
                      {renderLeftRow(plan)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Área do Gantt: Timeline Horizontal e Vertical */}
          <div 
            ref={rightScrollRef}
            onScroll={handleRightScroll}
            className="flex-1 overflow-auto relative scrollbar-thin h-full"
          >
            <div style={{ width: timelineWidth, minHeight: '100%' }} className="relative flex flex-col">
              {/* Header de Tempo */}
              <div className="sticky top-0 z-30 flex h-16 border-b bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md flex-shrink-0" style={{ width: timelineWidth }}>
                {months.map((month, i) => {
                  const isStartOfYear = month.getMonth() === 0;
                  return (
                    <div 
                      key={i} 
                      className={`flex flex-col items-center justify-center border-r transition-colors h-full ${isStartOfYear ? 'bg-primary/[0.03]' : ''}`}
                      style={{ width: colWidth }}
                    >
                      {isStartOfYear && (
                        <span className="text-[10px] font-black text-primary absolute top-2">{format(month, "yyyy")}</span>
                      )}
                      <span className={`text-[10px] font-black uppercase ${month.getMonth() % 3 === 0 ? 'text-slate-900 dark:text-slate-100' : 'text-muted-foreground'}`}>
                        {format(month, "MMM", { locale: ptBR })}
                      </span>
                      <span className="text-[8px] font-bold text-slate-400">{format(month, "yy")}</span>
                    </div>
                  );
                })}
              </div>

              {/* Grid de Linhas e Barras */}
              <div className="relative flex-1" style={{ width: timelineWidth }}>
                {/* Linhas Verticais de Fundo */}
                <div className="absolute inset-0 flex pointer-events-none z-0">
                  {months.map((_, i) => (
                    <div key={i} className="border-r h-full opacity-30 dark:opacity-10" style={{ width: colWidth }} />
                  ))}
                </div>

                {/* Marcador "Hoje" */}
                {(() => {
                  const todayOffset = differenceInMonths(today, timelineStart);
                  const dayOfMonth = today.getDate();
                  const totalDaysInMonth = 30; // Simplificado
                  const preciseOffset = todayOffset + (dayOfMonth / totalDaysInMonth);
                  
                  if (preciseOffset >= 0 && preciseOffset < months.length) {
                    return (
                      <div 
                        className="absolute top-0 bottom-0 z-20 border-l-2 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] flex flex-col pointer-events-none"
                        style={{ left: preciseOffset * colWidth }}
                      >
                        <div className="bg-blue-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full absolute -top-12 -left-6 uppercase shadow-lg">Hoje</div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Linhas dos Ativos (Gantt Rows) */}
                <div className="relative z-10 w-full h-full">
                  {isVirtualized ? (
                    <div 
                      style={{ height: `${rightVirtualizer.getTotalSize()}px`, position: 'relative', width: '100%' }}
                    >
                      {rightVirtualizer.getVirtualItems().map((virtualRow) => {
                        const plan = plans[virtualRow.index];
                        return (
                          <div 
                            key={virtualRow.key}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: `${virtualRow.size}px`,
                              transform: `translateY(${virtualRow.start}px)`,
                            }}
                          >
                            <GanttRow 
                              plan={plan}
                              timelineStart={timelineStart}
                              colWidth={colWidth}
                              months={months}
                              today={today}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col w-full">
                      {plans.map((plan) => (
                        <GanttRow 
                          key={plan.id}
                          plan={plan}
                          timelineStart={timelineStart}
                          colWidth={colWidth}
                          months={months}
                          today={today}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
