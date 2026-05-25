import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { format, parseISO, differenceInMonths, addMonths, startOfMonth, addDays, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Rnd } from "react-rnd";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "sonner";
import { TimelineCanvasLinks } from "./TimelineCanvasLinks";
import { 
  Monitor, 
  Server, 
  Loader2, 
  ChevronDown,
  ChevronUp,
  Activity, 
  ShieldCheck, 
  Coins, 
  Info,
  TrendingUp,
  Link,
  ExternalLink,
  Eye,
  EyeOff
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { timelineAggregationService, type ConsolidatedTechnologyGroup } from "@/services/timelineAggregationService";
import { migrationPlanService } from "@/services/migrationPlanService";
import { strategicDomainService } from "@/services/strategicDomainService";
import { dependencyAnalysisService } from "@/services/dependencyAnalysisService";
import { operationalIntelligenceEngine } from "@/services/operationalIntelligenceEngine";
import { ExecutiveAIInsights } from "./ExecutiveAIInsights";
import { MiniDependencyGraph } from "./MiniDependencyGraph";

function VirtualAssetsList({ assets }: { assets: any[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: assets.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="max-h-[160px] overflow-y-auto pr-1 border-t border-white/5 pt-2">
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const asset = assets[virtualRow.index];
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
              className="flex items-center justify-between text-xs py-1 hover:bg-white/5 px-2 rounded-lg transition-colors"
            >
              <span className="font-semibold text-slate-300 truncate max-w-[200px]">{asset.hostname}</span>
              <span className="text-[9px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded capitalize shrink-0 flex items-center gap-1">
                {asset.deviceType === 'server' ? (
                  <Server className="w-2.5 h-2.5 text-purple-400" />
                ) : (
                  <Monitor className="w-2.5 h-2.5 text-blue-400" />
                )}
                {asset.deviceType === 'server' ? 'Servidor' : 'Estação'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TimelineExecutiveView({ projectId, view = "executive" }: { projectId?: string, view?: string }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedGroup, setSelectedGroup] = useState<ConsolidatedTechnologyGroup | null>(null);
  const [isAssetsExpanded, setIsAssetsExpanded] = useState(false);
  const [collapsedDomains, setCollapsedDomains] = useState<Record<string, boolean>>({});
  const [showDependencies, setShowDependencies] = useState(true);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { data: plansData, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["migration-plans-infinite", projectId],
    queryFn: ({ pageParam = 0 }) => migrationPlanService.getPage({ limit: 500, offset: pageParam, filters: projectId ? { roadmap_project_id: projectId } : undefined }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page * 500 : undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allPlans = plansData?.pages.flatMap(p => p.data) || [];

  const plans = useMemo(() => {
    return projectId 
      ? allPlans.filter(p => p.roadmap_project_id === projectId)
      : allPlans;
  }, [allPlans, projectId]);

  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationDeltas, setSimulationDeltas] = useState<{ capex: number; risk: number; compliance: number; opex: number } | null>(null);

  // Keep a local copy of plans to support optimistic updates (instant render during drag/resize)
  const [localPlans, setLocalPlans] = useState<any[]>([]);

  useEffect(() => {
    if (!isSimulating) {
      setLocalPlans(plans);
    }
  }, [plans, isSimulating]);

  const [workerResult, setWorkerResult] = useState<{ groups: ConsolidatedTechnologyGroup[], deps: any[] } | null>(null);

  useEffect(() => {
    if (!localPlans || localPlans.length === 0) {
      setWorkerResult({ groups: [], deps: [] });
      return;
    }

    let isSubscribed = true;
    const worker = new Worker(new URL('../../workers/timelineAggregation.worker.ts', import.meta.url), { type: 'module' });
    
    const timeoutId = setTimeout(() => {
      console.warn('Worker timed out, falling back to sync calculation');
      worker.terminate();
      if (isSubscribed) {
        const groups = timelineAggregationService.consolidate(localPlans);
        const deps = dependencyAnalysisService.analyzeDependencies(groups);
        setWorkerResult({ groups, deps });
      }
    }, 5000);

    worker.onmessage = (e) => {
      clearTimeout(timeoutId);
      if (isSubscribed) {
        if (e.data.status === 'success') {
          setWorkerResult({ groups: e.data.consolidatedGroups, deps: e.data.dependencies });
        } else {
          console.error('Worker failed, falling back to sync', e.data.message);
          const groups = timelineAggregationService.consolidate(localPlans);
          const deps = dependencyAnalysisService.analyzeDependencies(groups);
          setWorkerResult({ groups, deps });
        }
      }
      worker.terminate();
    };

    worker.postMessage({ type: 'CONSOLIDATE_AND_ANALYZE', plans: localPlans });

    return () => {
      isSubscribed = false;
      clearTimeout(timeoutId);
      worker.terminate();
    };
  }, [localPlans]);

  // Consolidate groups from plans (uses local copy for snappy dragging)
  const consolidatedGroups = useMemo(() => {
    let groups = workerResult?.groups || [];

    // Apply View Filters
    if (view === "security") {
      groups = groups.filter(g => {
        const domain = strategicDomainService.classifyDomain(g).toLowerCase();
        return domain.includes("security") || domain.includes("compliance") || g.criticality === "high" || g.criticality === "critical";
      });
    } else if (view === "infrastructure") {
      groups = groups.filter(g => {
        const domain = strategicDomainService.classifyDomain(g).toLowerCase();
        return ["servers", "network", "infrastructure", "virtualization", "storage"].some(d => domain.includes(d));
      });
    } else if (view === "compliance") {
      groups = groups.filter(g => {
        const hasExpiredEol = g.eolDate && new Date(g.eolDate) < new Date();
        return hasExpiredEol || g.criticality === "high" || g.criticality === "critical";
      });
    }
    // "executive" and "operations" show all
    
    return groups;
  }, [workerResult?.groups, view]);

  // Analyze dependencies
  const dependencies = useMemo(() => {
    return workerResult?.deps || [];
  }, [workerResult?.deps]);

  // Slice to max 20 for SVG rendering performance
  const renderableDependencies = useMemo(() => {
    return dependencyAnalysisService.sliceForRendering(dependencies);
  }, [dependencies]);

  // Detect chronological conflicts
  const alerts = useMemo(() => {
    return dependencyAnalysisService.detectAlerts(consolidatedGroups, dependencies);
  }, [consolidatedGroups, dependencies]);

  const activeConflictIds = useMemo(() => {
    return alerts.map(a => a.id);
  }, [alerts]);

  // Organize by strategic domains
  const domains = useMemo(() => {
    return strategicDomainService.organizeByDomains(consolidatedGroups, activeConflictIds);
  }, [consolidatedGroups, activeConflictIds]);

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ planIds, startDate, endDate }: { planIds: string[], startDate: string, endDate: string }) => {
      await timelineAggregationService.bulkUpdatePlansDates(planIds, startDate, endDate);
    },
    onSuccess: (_, variables) => {
      queryClient.setQueryData(["migration-plans"], (old: any) => {
        if (!old) return old;
        return old.map((plan: any) => {
          if (variables.planIds.includes(plan.id)) {
            return { ...plan, planned_start_date: variables.startDate, planned_end_date: variables.endDate, recommended_start_date: variables.startDate };
          }
          return plan;
        });
      });
    },
    onError: (err: any) => {
      toast.error("Falha ao salvar no banco de dados: " + (err.message || err));
      setLocalPlans(plans);
    }
  });

  const handleApplySimulation = () => {
    // Collect all plans that differ from original 'plans'
    const changedPlans = localPlans.filter(lp => {
      const orig = plans.find(p => p.id === lp.id);
      return orig && (orig.recommended_start_date !== lp.recommended_start_date || orig.planned_end_date !== lp.planned_end_date);
    });

    if (changedPlans.length > 0) {
      changedPlans.forEach(p => {
        bulkUpdateMutation.mutate({ planIds: [p.id], startDate: p.recommended_start_date, endDate: p.planned_end_date });
      });
      toast.success("Cenário de simulação aplicado com sucesso!");
    } else {
      toast.info("Nenhuma alteração detectada no cenário.");
    }
    setIsSimulating(false);
    setSimulationDeltas(null);
  };

  const handleDiscardSimulation = () => {
    setLocalPlans(plans);
    setIsSimulating(false);
    setSimulationDeltas(null);
    toast.info("Cenário de simulação descartado.");
  };

  const today = new Date();
  const timelineStart = startOfMonth(addMonths(today, -1));
  const colWidth = 72; 
  const months = Array.from({ length: 36 }).map((_, i) => addMonths(timelineStart, i));
  const timelineWidth = months.length * colWidth;

  const dateToX = useCallback((dateStr: string | null) => {
    if (!dateStr) return 0;
    try {
      const date = parseISO(dateStr);
      const monthsDiff = differenceInMonths(date, timelineStart);
      const preciseMonths = monthsDiff + (date.getDate() / 30);
      return Math.max(0, preciseMonths * colWidth);
    } catch {
      return 0;
    }
  }, [timelineStart]);

  const xToDate = useCallback((x: number) => {
    const totalDays = (x / colWidth) * 30;
    return addDays(timelineStart, Math.max(0, totalDays)).toISOString().split('T')[0];
  }, [timelineStart]);

  const getStatusAndColor = (group: ConsolidatedTechnologyGroup) => {
    if (
      group.version && 
      group.recommendedUpgrade && 
      (
        group.version.toLowerCase().trim() === group.recommendedUpgrade.toLowerCase().trim() || 
        group.recommendedUpgrade.toLowerCase().includes("atualizado") || 
        group.recommendedUpgrade.toLowerCase().includes("sem sucessor")
      )
    ) {


      return { 
        label: "Nova Geração", 
        color: "bg-emerald-500",
        gradientColor: `bg-gradient-to-r from-emerald-500/90 via-teal-500/90 to-emerald-600/90 border border-emerald-400/30 text-white ${isSimulating ? 'border-dashed border-2 opacity-80' : ''}`
      };
    }

    if (!group.eolDate) {
      return { 
        label: "Suportado", 
        color: "bg-blue-500",
        gradientColor: `bg-gradient-to-r from-blue-500/90 via-indigo-500/90 to-blue-600/90 border border-blue-400/30 text-white ${isSimulating ? 'border-dashed border-2 opacity-80' : ''}`
      };
    }

    const eol = parseISO(group.eolDate);
    const now = new Date();

    if (eol < now) {
      return { 
        label: "EoL Expirado", 
        color: "bg-red-500",
        gradientColor: `bg-gradient-to-r from-red-500/90 via-rose-500/90 to-red-600/90 border border-red-400/30 text-white ${isSimulating ? 'border-dashed border-2 opacity-80' : ''}`
      };
    }

    const diffDays = differenceInDays(eol, now);
    if (diffDays <= 180) {
      return { 
        label: "Próximo EoL", 
        color: "bg-amber-500",
        gradientColor: `bg-gradient-to-r from-amber-500/90 via-orange-500/90 to-amber-600/90 border border-amber-400/30 text-white ${isSimulating ? 'border-dashed border-2 opacity-80' : ''}`
      };
    }

    return { 
      label: "Suportado", 
      color: "bg-blue-500",
      gradientColor: `bg-gradient-to-r from-blue-500/90 via-indigo-500/90 to-blue-600/90 border border-blue-400/30 text-white ${isSimulating ? 'border-dashed border-2 opacity-80' : ''}`
    };
  };

  const handleGroupClick = (group: ConsolidatedTechnologyGroup) => {
    setIsAssetsExpanded(false);
    setSelectedGroup(group);
  };

  const toggleDomain = (name: string) => {
    setCollapsedDomains(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  // Static coordinate calculations for visible domains/technologies
  const layout = useMemo(() => {
    let currentY = 0;
    const techYCoords: Record<string, number> = {};
    const visibleTechsList: { tech: ConsolidatedTechnologyGroup; domainName: string }[] = [];
    const virtualRows: any[] = [];

    domains.forEach(domain => {
      // Domain header Y-offset
      virtualRows.push({
        type: 'domain',
        domain,
        y: currentY,
        height: 48
      });
      currentY += 48; // Domain Header height
      
      const isCollapsed = collapsedDomains[domain.name];
      if (!isCollapsed) {
        domain.technologies.forEach(tech => {
          const techKey = `${tech.vendor}|${tech.product}|${tech.version}`.toLowerCase();
          techYCoords[techKey] = currentY;
          visibleTechsList.push({ tech, domainName: domain.name });
          
          virtualRows.push({
            type: 'tech',
            tech,
            domainName: domain.name,
            techKey,
            y: currentY,
            height: 64
          });
          currentY += 64; // Technology Row height
        });
      }
    });

    return {
      techYCoords,
      visibleTechsList,
      virtualRows,
      totalHeight: currentY
    };
  }, [domains, collapsedDomains]);

  const { techYCoords, virtualRows, totalHeight } = layout;

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: virtualRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) => virtualRows[i].height,
    overscan: 5,
  });

  // Filter and map dependencies to draw SVG Bézier curves
  const visibleDependencies = useMemo(() => {
    if (!showDependencies) return [];
    
    // Map of active technology items in current project
    const activeTechKeys = new Set(consolidatedGroups.map(g => `${g.vendor}|${g.product}|${g.version}`.toLowerCase()));
    
    const filtered = renderableDependencies.filter(d => {
      // Filter out low confidence to avoid spaghetti look
      if (d.confidence === 'low') return false;
      // Only keep connections where both sides are in current roadmap
      return activeTechKeys.has(d.sourceTechKey) && activeTechKeys.has(d.targetTechKey);
    });

    // Keep only those where both source and target rows are expanded/visible in UI
    const visible = filtered.filter(d => techYCoords[d.sourceTechKey] !== undefined && techYCoords[d.targetTechKey] !== undefined);
    
    return visible;
  }, [renderableDependencies, showDependencies, techYCoords, consolidatedGroups]);

  // Slice to max 20 connections to prevent visual pollution
  const renderedDeps = useMemo(() => {
    return visibleDependencies.slice(0, 20);
  }, [visibleDependencies]);

  const hiddenDepsCount = useMemo(() => {
    return Math.max(0, visibleDependencies.length - 20);
  }, [visibleDependencies]);

  // Set default dependency visibility depending on complexity
  useEffect(() => {
    const highMedDeps = dependencies.filter(d => d.confidence === 'high' || d.confidence === 'medium').length;
    if (highMedDeps > 10) {
      setShowDependencies(false);
    } else {
      setShowDependencies(true);
    }
  }, [dependencies]);

  // Performance optimized debounced drag-and-resize handler
  const handleBarMoveOrResize = useCallback((
    group: ConsolidatedTechnologyGroup, 
    newStart: string, 
    newEnd: string
  ) => {
    const planIds = group.assets.map(a => a.planId);
    
    // 1. Optimistic instant state update on localPlans
    setLocalPlans(prev => 
      prev.map(p => {
        if (planIds.includes(p.id)) {
          return {
            ...p,
            recommended_start_date: newStart,
            planned_end_date: newEnd
          };
        }
        return p;
      })
    );

    // 2. Debounced save & impact toast analysis
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      // Avoid mutating database if in simulation mode
      if (!isSimulating) {
        bulkUpdateMutation.mutate({ planIds, startDate: newStart, endDate: newEnd });
      }
      
      // Calculate impact & display Toast (or update deltas if simulating)
      const nextGroups = timelineAggregationService.consolidate(
        localPlans.map(p => {
          if (planIds.includes(p.id)) {
            return {
              ...p,
              recommended_start_date: newStart,
              planned_end_date: newEnd
            };
          }
          return p;
        })
      );
      
      const nextDeps = dependencyAnalysisService.analyzeDependencies(nextGroups);
      const impact = dependencyAnalysisService.calculateImpact(
        group,
        newStart,
        newEnd,
        nextGroups,
        nextDeps
      );

      if (isSimulating) {
        setSimulationDeltas(prev => ({
          capex: (prev?.capex || 0) + impact.capexChange,
          risk: (prev?.risk || 0) + impact.addedRiskCost,
          compliance: 0,
          opex: (prev?.opex || 0) + (impact.addedRiskCost * 0.1)
        }));
      } else {
        if (impact.hasImpact && impact.warnings.length > 0) {
          toast.warning(`Impacto em Cadeia Detectado!`, {
            description: `O adiamento estratégico de "${group.vendor} ${group.product}" impactou ${impact.affectedTechsCount} dependências indiretas. Risco financeiro: +${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(impact.addedRiskCost)}. CAPEX adicional: +${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(impact.capexChange)}.`,
            duration: 8500,
            action: {
              label: "Ver Alertas",
              onClick: () => handleGroupClick(group)
            }
          });
        } else {
          toast.success(`Timeline sincronizada.`, {
            description: `Novo agendamento de "${group.vendor} ${group.product}" gravado com sucesso.`,
            duration: 3000
          });
        }
      }
    }, 600);
  }, [isSimulating, localPlans, bulkUpdateMutation]);

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 bg-slate-900/10">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-semibold">Carregando timeline executiva...</p>
      </div>
    </div>
  );

  if (plans.length === 0) return (
    <div className="flex flex-col items-center justify-center h-64 text-center p-10 bg-slate-900/5 rounded-2xl border border-white/5">
      <Loader2 className="h-12 w-12 text-slate-400 mb-4 animate-bounce" />
      <h3 className="text-lg font-bold mb-1 text-slate-300">Nenhum plano de migração encontrado</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        {projectId 
          ? "Este projeto ainda não possui planos de migração. Gere um roadmap automático para preencher a timeline."
          : "Nenhum roadmap gerado ainda. Importe seu inventário e use o Smart Lifecycle AI."}
      </p>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#050b16] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
      
      {/* Top Interactive Toolbar */}
      <div className="flex items-center justify-between bg-[#081225]/90 border-b border-white/10 px-6 py-4 z-30">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-bold text-white tracking-tight">Timeline de Governança Estratégica</span>
          </div>

          {/* Simulation Mode Toggle / Controls */}
          {isSimulating ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-[11px] font-bold text-amber-400 animate-pulse">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Modo Simulação: {simulationDeltas ? `Risco +${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(simulationDeltas.risk)}` : 'Alterações não salvas'}</span>
              </div>
              <Button size="sm" variant="default" onClick={handleApplySimulation} className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500">
                Aplicar Cenário
              </Button>
              <Button size="sm" variant="outline" onClick={handleDiscardSimulation} className="h-8 text-xs border-white/10 text-slate-300">
                Descartar
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsSimulating(true);
                setSimulationDeltas({ capex: 0, risk: 0, compliance: 0, opex: 0 });
                toast.info("Modo de simulação ativado. As alterações não afetarão a produção até serem aplicadas.");
              }}
              className="h-8 text-xs border-blue-500/30 text-blue-400 hover:bg-blue-500/10 bg-transparent"
            >
              Ativar Simulação
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDependencies(!showDependencies)}
            className={`h-9 px-4 rounded-full text-xs font-semibold flex items-center gap-2 border border-white/10 transition-all ${
              showDependencies 
                ? "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border-blue-500/20" 
                : "bg-slate-900/50 text-slate-400 hover:bg-slate-800"
            }`}
          >
            {showDependencies ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {showDependencies ? "Dependências Ativas" : "Exibir Dependências"}
          </Button>

          {/* Omitted connections warning */}
          {showDependencies && hiddenDepsCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 animate-pulse">
              <Info className="w-3.5 h-3.5" />
              <span>+{hiddenDepsCount} dependências ocultas para evitar poluição visual</span>
            </div>
          )}
        </div>

        {/* Global Project KPIs */}
        <div className="hidden lg:flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[11px] font-bold text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Saúde Geral: {domains.length > 0 ? Math.round(domains.reduce((acc, d) => acc + d.healthScore, 0) / domains.length) : 100}%</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[11px] font-bold text-blue-400">
            <Coins className="w-3.5 h-3.5" />
            <span>CAPEX Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(domains.reduce((acc, d) => acc + d.estimatedCapex, 0))}</span>
          </div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="flex-1 overflow-hidden flex flex-col relative min-h-[600px]">
        
        {/* Months Time Header */}
        <div className="flex bg-[#081225]/80 border-b border-white/10 sticky top-0 z-20 backdrop-blur-md">
          <div className="w-[380px] flex-shrink-0 border-r border-white/10 p-4 font-bold text-xs text-slate-400 uppercase tracking-widest flex items-center">
            Domínios &amp; Tecnologia
          </div>
          <div className="flex-1 overflow-hidden relative h-14">
            <div className="flex absolute top-0 bottom-0" style={{ width: timelineWidth }}>
              {months.map((month, i) => (
                <div key={i} className="flex flex-col items-center justify-center border-r border-white/5 bg-slate-900/20 text-[10px] text-slate-500 font-bold uppercase tracking-wider" style={{ width: colWidth }}>
                  {format(month, "MMM", { locale: ptBR })}
                  <span className="text-[9px] opacity-50 mt-0.5">{format(month, "yy")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scrollable Container mapping left & right perfectly */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col relative" ref={parentRef}>
          
          <div className="flex relative" style={{ height: totalHeight }}>
            
            {/* 1. LEFT PANEL: Technologies categorized by Domain */}
            <div className="w-[380px] flex-shrink-0 border-r border-white/10 bg-[#060e1c]/40 z-10 relative select-none">
              
              {rowVirtualizer.getVirtualItems().map(virtualRow => {
                const item = virtualRows[virtualRow.index];
                
                if (item.type === 'domain') {
                  const domain = item.domain;
                  const isCollapsed = collapsedDomains[domain.name];
                  
                  return (
                    <div 
                      key={`domain-${domain.name}`}
                      onClick={() => toggleDomain(domain.name)}
                      className="absolute left-0 w-[380px] h-12 flex items-center justify-between px-4 bg-[#0d1f3d]/90 hover:bg-[#122b54] border-b border-white/10 cursor-pointer transition-all z-20 group"
                      style={{ top: item.y }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isCollapsed ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
                        <span className="font-extrabold text-xs text-white uppercase tracking-wider truncate group-hover:text-blue-400 transition-colors">
                          {domain.name}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded-full shrink-0">
                          {domain.technologies.length}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div 
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            domain.healthScore >= 80 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                            domain.healthScore >= 50 ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                            "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}
                        >
                          H: {domain.healthScore}%
                        </div>
                        {domain.nextCriticalEol && (
                          <div className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                }

                if (item.type === 'tech') {
                  const group = item.tech;
                  const statusInfo = getStatusAndColor(group);
                  
                  return (
                    <div
                      key={`tech-${item.techKey}`}
                      onClick={() => handleGroupClick(group)}
                      className="absolute left-0 w-[380px] h-16 flex flex-col justify-center px-4 hover:bg-white/5 cursor-pointer border-b border-white/5 group transition-all duration-200 z-10"
                      style={{ top: item.y }}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex-1 min-w-0 pr-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusInfo.color}`} />
                            <span className="font-extrabold text-white text-xs truncate group-hover:text-blue-400 transition-colors">
                              {group.vendor} {group.product}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                            <span className="font-bold bg-white/5 px-1.5 py-0.5 rounded text-white/70">
                              v{group.version || "N/A"}
                            </span>
                            <span>•</span>
                            <span className="font-semibold text-slate-400">{group.assetCount} ativos</span>
                            {group.criticality === 'critical' && (
                              <span className="text-[9px] font-black text-red-400 bg-red-500/10 px-1 rounded border border-red-500/20 uppercase">CRÍTICO</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[10px] font-bold text-rose-400 uppercase">
                            EoL: {group.eolDate ? format(parseISO(group.eolDate), "MMM/yy", { locale: ptBR }) : "N/D"}
                          </div>
                          <div className="text-[9px] text-slate-400 font-semibold mt-1 truncate max-w-[120px]">
                            {group.recommendedUpgrade ? `→ ${group.recommendedUpgrade}` : "Sem recomendação"}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                
                return null;
              })}
            </div>

            {/* 2. RIGHT PANEL: Horizontal Timeline with Rnd drag and drop & SVG dependencies */}
            <div className="flex-1 overflow-x-auto relative bg-[#040811]/40">
              <div style={{ width: timelineWidth, height: totalHeight }} className="relative">
                
                {/* HTML Canvas Connections Layer (Quiet Enterprise UI) */}
                {showDependencies && renderedDeps.length > 0 && (
                  <TimelineCanvasLinks 
                    width={timelineWidth} 
                    viewportHeight={parentRef.current?.clientHeight || window.innerHeight} 
                    scrollTop={rowVirtualizer.scrollOffset || 0}
                    links={renderedDeps.map(dep => {
                      const sourceY = techYCoords[dep.sourceTechKey] + 32;
                      const targetY = techYCoords[dep.targetTechKey] + 32;

                      const sourceGroup = consolidatedGroups.find(g => `${g.vendor}|${g.product}|${g.version}`.toLowerCase() === dep.sourceTechKey)!;
                      const targetGroup = consolidatedGroups.find(g => `${g.vendor}|${g.product}|${g.version}`.toLowerCase() === dep.targetTechKey)!;

                      const sourceStartStr = sourceGroup.plannedStartDate || sourceGroup.eolDate || today.toISOString().split('T')[0];
                      const targetEndStr = targetGroup.plannedEndDate || addDays(parseISO(targetGroup.plannedStartDate || today.toISOString().split('T')[0]), 90).toISOString().split('T')[0];

                      const sourceX = dateToX(sourceStartStr);
                      const targetX = dateToX(targetEndStr);

                      const isConflict = new Date(sourceStartStr) < new Date(targetEndStr);

                      return {
                        id: dep.id,
                        sourceX,
                        sourceY,
                        targetX,
                        targetY,
                        isConflict,
                        sourceLabel: dep.sourceLabel,
                        targetLabel: dep.targetLabel
                      };
                    })}
                  />
                )}

                {/* Vertical grid line markers */}
                {months.map((_, i) => (
                  <div key={i} className="absolute top-0 bottom-0 border-r border-white/5 pointer-events-none" style={{ left: (i + 1) * colWidth, width: colWidth }} />
                ))}

                {/* Today Line */}
                <div 
                  className="absolute top-0 bottom-0 w-[1.5px] bg-blue-500/30 border-l border-blue-400/50 pointer-events-none z-10 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                  style={{ left: dateToX(today.toISOString().split('T')[0]) }}
                />

                {/* Sticky Right Part for Domain Swimlanes Headers */}
                {rowVirtualizer.getVirtualItems().map(virtualRow => {
                  const item = virtualRows[virtualRow.index];
                  
                  if (item.type === 'domain') {
                    return (
                      <div
                        key={`right-domain-${item.domain.name}`}
                        className="absolute left-0 h-12 bg-[#0d1f3d]/90 border-b border-white/10 pointer-events-none z-10"
                        style={{ width: timelineWidth, top: item.y }}
                      />
                    );
                  }

                  if (item.type === 'tech') {
                    const group = item.tech;
                    const statusInfo = getStatusAndColor(group);
                    
                    const startDateStr = group.plannedStartDate || group.eolDate || today.toISOString().split('T')[0];
                    const endDateStr = group.plannedEndDate || addDays(parseISO(startDateStr), 90).toISOString().split('T')[0];

                    const startX = dateToX(startDateStr);
                    const endX = dateToX(endDateStr);
                    const width = Math.max(endX - startX, 48);

                    return (
                      <div
                        key={`right-tech-${item.techKey}`}
                        className="absolute border-b border-white/5 bg-transparent"
                        style={{ top: item.y, height: 64, width: timelineWidth }}
                      >
                        <Rnd
                          defaultPosition={{ x: startX, y: 14 }}
                          size={{ width, height: 36 }}
                          bounds="parent"
                          enableResizing={{ left: true, right: true, top: false, bottom: false, topRight: false, bottomRight: false, bottomLeft: false, topLeft: false }}
                          dragAxis="x"
                          onDragStop={(_e, d) => {
                            const newStart = xToDate(d.x);
                            const newEnd = xToDate(d.x + width);
                            handleBarMoveOrResize(group, newStart, newEnd);
                          }}
                          onResizeStop={(_e, _direction, ref, _delta, position) => {
                            const newStart = xToDate(position.x);
                            const newEnd = xToDate(position.x + ref.offsetWidth);
                            handleBarMoveOrResize(group, newStart, newEnd);
                          }}
                          className={`rounded-md shadow flex items-center px-4 cursor-ew-resize group/bar transition-all select-none hover:shadow-md ${statusInfo.gradientColor}`}
                        >
                          <div className="w-full flex items-center justify-between overflow-hidden">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <span className="text-[10px] text-white font-extrabold truncate drop-shadow">
                                {group.vendor} {group.product} {group.version}
                              </span>
                              {(() => {
                                const metrics = operationalIntelligenceEngine.calculateMetrics(group);
                                return metrics.priorityScore > 75 ? (
                                  <span className="shrink-0 text-[8px] bg-red-500/20 text-red-100 border border-red-500/30 px-1.5 py-0.5 rounded font-black hidden xl:inline">
                                    P{metrics.priorityScore}
                                  </span>
                                ) : null;
                              })()}
                            </div>
                            <span className="text-[9px] text-white/70 font-bold truncate ml-2 hidden xl:inline">
                              {format(parseISO(startDateStr), "dd/MMM", { locale: ptBR })} - {format(parseISO(endDateStr), "dd/MMM", { locale: ptBR })}
                            </span>
                          </div>
                        </Rnd>
                      </div>
                    );
                  }
                  
                  return null;
                })}
              </div>
            </div>

          </div>
        </div>

        {/* Scrollbar instruction/scrollbar custom spacer */}
        <div className="bg-[#081225]/90 border-t border-white/10 px-6 py-2.5 flex items-center justify-between z-30">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Use o scroll horizontal moderno para navegar pelos quarters</span>
          </div>
          <div className="text-[10px] text-slate-400 font-bold bg-[#0d1f3d] px-2.5 py-1 rounded-full border border-white/5">
            Janela de 3 anos de Governança corporativa
          </div>
        </div>

      </div>

      {/* Lateral Executive Sheet */}
      <Sheet open={!!selectedGroup} onOpenChange={(open) => { if (!open) setSelectedGroup(null); }}>
        <SheetContent className="bg-[#081225]/95 border-l border-white/10 text-white w-[480px] sm:max-w-[480px] overflow-y-auto backdrop-blur-xl">
          {selectedGroup && (
            <>
              <SheetHeader className="mb-6 border-b border-white/5 pb-4">
                <SheetTitle className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${getStatusAndColor(selectedGroup).color}`} />
                  {selectedGroup.vendor} {selectedGroup.product}
                </SheetTitle>
                <SheetDescription className="text-slate-400 text-xs mt-1 text-left">
                  Análise de ciclo de vida executiva consolidada por grupo tecnológico.
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6">
                
                {/* Domain & Assets Count details */}
                <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 space-y-3.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Domínio Estratégico:</span>
                    <span className="font-bold text-blue-400">
                      {strategicDomainService.classifyDomain(selectedGroup)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Total de Ativos:</span>
                    <span className="font-bold text-white">{selectedGroup.assetCount} ativos mapeados</span>
                  </div>
                </div>

                {/* Metric Summary Grid (CAPEX, OPEX, Health, Risk) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Custo (CAPEX)</p>
                    <p className="text-lg font-black text-emerald-400 mt-1">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedGroup.estimatedCost)}
                    </p>
                  </div>
                  <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Custo Operacional (OPEX)</p>
                    <p className="text-lg font-black text-blue-400 mt-1">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedGroup.riskCost * 0.25)}
                    </p>
                  </div>
                  <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Risco Financeiro Agregado</p>
                    <p className="text-lg font-black text-rose-400 mt-1">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedGroup.riskCost)}
                    </p>
                  </div>
                  <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Janela Segura de Execução</p>
                    <p className="text-xs font-bold text-slate-300 mt-2 truncate">
                      {selectedGroup.plannedStartDate ? format(parseISO(selectedGroup.plannedStartDate), "dd/MM/yyyy") : "Imediata"} - {selectedGroup.plannedEndDate ? format(parseISO(selectedGroup.plannedEndDate), "dd/MM/yyyy") : "Conclusão"}
                    </p>
                  </div>
                </div>

                {/* Technical Dates and Info */}
                <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 space-y-3.5">
                  <h4 className="text-xs font-bold text-slate-200 border-b border-white/5 pb-2">Ciclo de Vida &amp; Janelas</h4>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Fim de Suporte (EoL):</span>
                    <span className="font-bold text-rose-400">
                      {selectedGroup.eolDate ? format(parseISO(selectedGroup.eolDate), "dd/MM/yyyy") : "Não especificado"}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Upgrade Recomendado:</span>
                    <span className="font-bold text-emerald-400">{selectedGroup.recommendedUpgrade || "Não informado"}</span>
                  </div>
                </div>

                {/* Strategic Advice (Executive AI Insights) */}
                {(() => {
                  const currentGroup = consolidatedGroups.find(g => `${g.vendor}|${g.product}|${g.version}`.toLowerCase() === `${selectedGroup.vendor}|${selectedGroup.product}|${selectedGroup.version}`.toLowerCase()) || selectedGroup;
                  const metrics = operationalIntelligenceEngine.calculateMetrics(currentGroup);
                  return <ExecutiveAIInsights group={currentGroup} metrics={metrics} />;
                })()}

                {/* Mini Dependency Graph */}
                <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-200 border-b border-white/5 pb-2 flex items-center gap-1.5">
                    <Link className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    Grafo de Dependência (Local)
                  </h4>
                  <MiniDependencyGraph 
                    group={selectedGroup} 
                    allGroups={consolidatedGroups} 
                    allDependencies={dependencies} 
                  />
                </div>

                {/* Active Dependencies Section */}
                {dependencies.filter(d => d.sourceTechKey === `${selectedGroup.vendor}|${selectedGroup.product}|${selectedGroup.version}`.toLowerCase()).length > 0 && (
                  <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 space-y-2">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Link className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      Dependências Técnicas Exigidas
                    </h4>
                    <div className="space-y-2 pt-1 border-t border-white/5">
                      {dependencies
                        .filter(d => d.sourceTechKey === `${selectedGroup.vendor}|${selectedGroup.product}|${selectedGroup.version}`.toLowerCase())
                        .map(d => (
                          <div key={d.id} className="text-xs bg-[#0d1f3d]/60 border border-white/5 rounded p-2.5">
                            <div className="font-bold text-blue-400 flex items-center gap-1">
                              <span>Requisito: {d.targetLabel}</span>
                              <span className="text-[9px] bg-blue-500/10 border border-blue-500/20 text-blue-400 px-1 py-0.5 rounded capitalize">{d.type}</span>
                            </div>
                            <p className="text-slate-400 text-[11px] mt-1 leading-normal">{d.description}</p>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}

                {/* Grouped Assets Collapsible */}
                <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">
                      Ativos Afetados ({selectedGroup.assetCount})
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsAssetsExpanded(!isAssetsExpanded)}
                      className="text-xs text-blue-400 hover:text-blue-300 font-bold p-0 h-auto hover:bg-transparent"
                    >
                      {isAssetsExpanded ? "Ocultar" : "Ver ativos"}
                    </Button>
                  </div>
                  {isAssetsExpanded && (
                    <VirtualAssetsList assets={selectedGroup.assets} />
                  )}
                </div>

                {/* Redirect Button to Inventory with Search Params */}
                <Button
                  onClick={() => {
                    const os = encodeURIComponent(selectedGroup.product);
                    const version = encodeURIComponent(selectedGroup.version);
                    const vendor = encodeURIComponent(selectedGroup.vendor);
                    navigate(`/assets?os=${os}&version=${version}&vendor=${vendor}`);
                  }}
                  className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 font-extrabold text-xs rounded-xl shadow-lg border border-white/10 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Ver ativos no Inventário
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
