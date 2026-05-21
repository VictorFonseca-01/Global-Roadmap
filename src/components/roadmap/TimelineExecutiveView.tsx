import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, differenceInMonths, addMonths, startOfMonth, addDays, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Rnd } from "react-rnd";
import { toast } from "sonner";
import { Monitor, Server, Map as MapIcon, Sparkles, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { timelineAggregationService, type ConsolidatedTechnologyGroup } from "@/services/timelineAggregationService";
import { migrationPlanService } from "@/services/migrationPlanService";

export function TimelineExecutiveView({ projectId }: { projectId?: string }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedGroup, setSelectedGroup] = useState<ConsolidatedTechnologyGroup | null>(null);
  const [isAssetsExpanded, setIsAssetsExpanded] = useState(false);

  const { data: allPlans = [], isLoading } = useQuery({
    queryKey: ["migration-plans"],
    queryFn: () => migrationPlanService.getAll(),
  });

  const plans = useMemo(() => {
    return projectId 
      ? allPlans.filter(p => p.roadmap_project_id === projectId)
      : allPlans;
  }, [allPlans, projectId]);

  // Consolidate using the new service
  const consolidatedGroups = useMemo(() => {
    return timelineAggregationService.consolidate(plans);
  }, [plans]);

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ planIds, startDate, endDate }: { planIds: string[], startDate: string, endDate: string }) => {
      await timelineAggregationService.bulkUpdatePlansDates(planIds, startDate, endDate);
    },
    onSuccess: () => {
      toast.success("Timeline tecnológica atualizada com sucesso");
      queryClient.invalidateQueries({ queryKey: ["migration-plans"] });
    },
    onError: (err: any) => {
      toast.error("Falha ao salvar alteração: " + (err.message || err));
    }
  });

  const today = new Date();
  const timelineStart = startOfMonth(addMonths(today, -1));
  const colWidth = 72; // increased slightly for premium airy spacing
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
    // Nova Geração logic
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
        color: "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)] animate-pulse",
        gradientColor: "bg-gradient-to-r from-emerald-500/90 via-teal-500/90 to-emerald-600/90 border border-emerald-400/30 text-white"
      };
    }

    if (!group.eolDate) {
      return { 
        label: "Suportado", 
        color: "bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)] animate-pulse",
        gradientColor: "bg-gradient-to-r from-blue-500/90 via-indigo-500/90 to-blue-600/90 border border-blue-400/30 text-white"
      };
    }

    const eol = new Date(group.eolDate);
    const now = new Date();

    if (eol <= now) {
      return { 
        label: "Expirado", 
        color: "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)] animate-pulse",
        gradientColor: "bg-gradient-to-r from-red-500/90 via-rose-500/90 to-red-600/90 border border-red-400/30 text-white"
      };
    }

    const diffDays = differenceInDays(eol, now);
    if (diffDays <= 180) {
      return { 
        label: "Próximo EoL", 
        color: "bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.6)] animate-pulse",
        gradientColor: "bg-gradient-to-r from-amber-500/90 via-orange-500/90 to-amber-600/90 border border-amber-400/30 text-white"
      };
    }

    return { 
      label: "Suportado", 
      color: "bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)] animate-pulse",
      gradientColor: "bg-gradient-to-r from-blue-500/90 via-indigo-500/90 to-blue-600/90 border border-blue-400/30 text-white"
    };
  };

  const getStrategicInsight = (group: ConsolidatedTechnologyGroup) => {
    const isExpired = group.eolDate && new Date(group.eolDate) <= new Date();
    const critical = group.criticality === 'critical' || group.criticality === 'high';
    
    if (isExpired && critical) {
      return `🚨 ALERTA CRÍTICO: Esta tecnologia está operando fora do suporte oficial (EoL expirado) e possui criticidade elevada. A migração imediata para "${group.recommendedUpgrade}" é altamente recomendada para mitigar riscos de segurança, vulnerabilidades não corrigidas e multas de compliance. Janela de migração recomendada com caráter de urgência máxima.`;
    }
    if (isExpired) {
      return `⚠️ ATENÇÃO: Tecnologia em fim de vida útil (EoL expirado). Embora a criticidade seja moderada, recomenda-se planejar a transição para "${group.recommendedUpgrade}" no próximo ciclo de manutenção para evitar obsolescência técnica.`;
    }
    if (critical) {
      return `⚡ PLANEJAMENTO PRIORITÁRIO: Ativos altamente críticos detectados. O suporte expira em ${group.eolDate ? format(parseISO(group.eolDate), "dd/MM/yyyy") : "data não especificada"}. Recomenda-se iniciar a janela de homologação da versão "${group.recommendedUpgrade}" imediatamente para garantir uma transição suave antes do vencimento do suporte.`;
    }
    return `✅ STATUS SEGURO: Tecnologia operando em ciclo de vida estável. Monitorar as atualizações periódicas e manter o cronograma de migração planejado para a janela de suporte padrão.`;
  };

  const handleGroupClick = (group: ConsolidatedTechnologyGroup) => {
    setIsAssetsExpanded(false);
    setSelectedGroup(group);
  };

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
      <MapIcon className="h-12 w-12 text-slate-400 mb-4 animate-bounce" />
      <h3 className="text-lg font-bold mb-1 text-slate-300">Nenhum plano de migração encontrado</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        {projectId 
          ? "Este projeto ainda não possui planos de migração. Gere um roadmap automático para preencher a timeline."
          : "Nenhum roadmap gerado ainda. Importe seu inventário e use o Smart Lifecycle AI."}
      </p>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#050b16] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex bg-[#081225]/80 border-b border-white/10 sticky top-0 z-20 backdrop-blur-md">
        <div className="w-[380px] flex-shrink-0 border-r border-white/10 p-4 font-bold text-xs text-slate-400 uppercase tracking-widest flex items-center">
          Tecnologias &amp; Conformidade
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

      {/* Body */}
      <div className="flex-1 overflow-auto flex min-h-[500px]">
        {/* Left panel: Tech list */}
        <div className="w-[380px] flex-shrink-0 border-r border-white/10 bg-[#060e1c]/40 z-10 relative select-none">
          {consolidatedGroups.map(group => {
            const statusInfo = getStatusAndColor(group);
            return (
              <div 
                key={`${group.vendor}-${group.product}-${group.version}`}
                onClick={() => handleGroupClick(group)}
                className="h-16 flex flex-col justify-center px-4 hover:bg-white/5 cursor-pointer border-b border-white/5 group transition-all duration-200"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${statusInfo.color}`} />
                      <span className="font-bold text-white text-xs truncate group-hover:text-blue-400 transition-colors">
                        {group.vendor} {group.product}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                      <span className="font-bold bg-white/5 px-1.5 py-0.5 rounded text-white/70">
                        v{group.version || "N/A"}
                      </span>
                      <span>•</span>
                      <span className="font-semibold text-slate-400">{group.assetCount} {group.assetCount === 1 ? "ativo" : "ativos"}</span>
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
          })}
        </div>

        {/* Right panel: Timeline bars */}
        <div className="flex-1 overflow-x-auto relative bg-[#040811]/40">
          <div style={{ width: timelineWidth, minHeight: '100%' }} className="relative">
            {/* Grid lines */}
            {months.map((_, i) => (
              <div key={i} className="absolute top-0 bottom-0 border-r border-white/5 pointer-events-none" style={{ left: (i + 1) * colWidth, width: colWidth }} />
            ))}

            {/* Today marker */}
            <div 
              className="absolute top-0 bottom-0 w-[1.5px] bg-blue-500/30 border-l border-blue-400/50 pointer-events-none z-10 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
              style={{ left: dateToX(today.toISOString().split('T')[0]) }}
            />

            {consolidatedGroups.map((group, idx) => {
              const statusInfo = getStatusAndColor(group);
              const rowY = idx * 64; // matching h-16
              const startDateStr = group.plannedStartDate || group.eolDate || today.toISOString().split('T')[0];
              const endDateStr = group.plannedEndDate || addDays(parseISO(startDateStr), 90).toISOString().split('T')[0];
              
              const startX = dateToX(startDateStr);
              const endX = dateToX(endDateStr);
              const width = Math.max(endX - startX, 48);

              return (
                <div 
                  key={`${group.vendor}-${group.product}-${group.version}`}
                  className="absolute w-full border-b border-white/5" 
                  style={{ top: rowY, height: 64 }}
                >
                  <Rnd
                    size={{ width, height: 36 }}
                    position={{ x: startX, y: 14 }}
                    bounds="parent"
                    enableResizing={{ 
                      left: true, 
                      right: true, 
                      top: false, 
                      bottom: false, 
                      topRight: false, 
                      bottomRight: false, 
                      bottomLeft: false, 
                      topLeft: false 
                    }}
                    dragAxis="x"
                    onDragStop={(_e, d) => {
                      const newStart = xToDate(d.x);
                      const newEnd = xToDate(d.x + width);
                      const planIds = group.assets.map(a => a.planId);
                      bulkUpdateMutation.mutate({ planIds, startDate: newStart, endDate: newEnd });
                    }}
                    onResizeStop={(_e, _direction, ref, _delta, position) => {
                      const newStart = xToDate(position.x);
                      const newEnd = xToDate(position.x + ref.offsetWidth);
                      const planIds = group.assets.map(a => a.planId);
                      bulkUpdateMutation.mutate({ planIds, startDate: newStart, endDate: newEnd });
                    }}
                    className={`rounded-xl shadow-lg flex items-center px-4 cursor-ew-resize group/bar transition-all select-none hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] ${statusInfo.gradientColor}`}
                  >
                    <div className="w-full flex items-center justify-between overflow-hidden">
                      <span className="text-[10px] text-white font-extrabold truncate drop-shadow">
                        {group.vendor} {group.product} {group.version}
                      </span>
                      <span className="text-[9px] text-white/60 font-semibold truncate ml-2 hidden sm:inline">
                        {format(parseISO(startDateStr), "MMM/yy", { locale: ptBR })} - {format(parseISO(endDateStr), "MMM/yy", { locale: ptBR })}
                      </span>
                    </div>
                  </Rnd>
                </div>
              );
            })}
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
                {/* Metric Summary Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Ativos Afetados</p>
                    <p className="text-2xl font-black text-blue-400 mt-1">{selectedGroup.assetCount}</p>
                  </div>
                  <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Criticidade</p>
                    <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      selectedGroup.criticality === 'critical' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                      selectedGroup.criticality === 'high' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                      selectedGroup.criticality === 'medium' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                      'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    }`}>
                      {selectedGroup.criticality === 'critical' ? 'Crítica' : selectedGroup.criticality === 'high' ? 'Alta' : selectedGroup.criticality === 'medium' ? 'Média' : 'Baixa'}
                    </span>
                  </div>
                  <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Custo Agregado</p>
                    <p className="text-lg font-black text-emerald-400 mt-1">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedGroup.estimatedCost)}
                    </p>
                  </div>
                  <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Risco Estimado</p>
                    <p className="text-lg font-black text-rose-400 mt-1">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedGroup.riskCost)}
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
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Janela Segura de Execução:</span>
                    <span className="font-bold text-blue-400">
                      {selectedGroup.plannedStartDate ? format(parseISO(selectedGroup.plannedStartDate), "dd/MM/yyyy") : "Imediata"} até{" "}
                      {selectedGroup.plannedEndDate ? format(parseISO(selectedGroup.plannedEndDate), "dd/MM/yyyy") : "Conclusão"}
                    </span>
                  </div>
                </div>

                {/* Strategic Advice */}
                <div className="bg-blue-950/20 border border-blue-500/20 rounded-2xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    Observações Estratégicas da IA
                  </h4>
                  <p className="text-xs leading-relaxed text-slate-300">
                    {getStrategicInsight(selectedGroup)}
                  </p>
                </div>

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
                    <div className="max-h-[160px] overflow-y-auto pr-1 space-y-1.5 border-t border-white/5 pt-2">
                      {selectedGroup.assets.map(asset => (
                        <div key={asset.id} className="flex items-center justify-between text-xs py-1 hover:bg-white/5 px-2 rounded-lg transition-colors">
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
                      ))}
                    </div>
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
                  className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 font-bold text-xs rounded-xl shadow-lg border border-white/10 transition-all duration-200"
                >
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
