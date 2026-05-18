import { useQuery, useQueryClient } from "@tanstack/react-query";
import { migrationPlanService } from "@/services/migrationPlanService";
import { roadmapGeneratorService } from "@/services/roadmapGeneratorService";
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
  ArrowRight, 
  Map as MapIcon, 
  RefreshCw, 
  AlertTriangle,
  Clock,
  ChevronRight,
  Info,
  Maximize2,
  Calendar,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState, useRef } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ZoomLevel = 'month' | 'quarter' | 'year';

export function GanttView({ projectId }: { projectId?: string }) {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [zoom, setZoom] = useState<ZoomLevel>('quarter');
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { data: allPlans = [], isLoading } = useQuery({
    queryKey: ["migration-plans"],
    queryFn: () => migrationPlanService.getAll(),
  });

  const plans = projectId 
    ? allPlans.filter(p => p.roadmap_project_id === projectId)
    : allPlans;

  const handleGenerate = async () => {
    if (!projectId) return;
    setIsGenerating(true);
    try {
      const results = await roadmapGeneratorService.generate(projectId);
      if (results.success) {
        toast.success(`Roadmap gerado! ${results.createdCount} planos criados.`);
        queryClient.invalidateQueries({ queryKey: ["migration-plans"] });
      } else {
        toast.error("Geração incompleta", { description: results.errors[0] });
      }
    } catch (error) {
      toast.error("Erro ao gerar roadmap");
    } finally {
      setIsGenerating(false);
    }
  };

  const today = new Date();
  const timelineStart = startOfMonth(addMonths(today, -3)); // Começa 3 meses atrás
  const totalMonths = zoom === 'year' ? 48 : (zoom === 'quarter' ? 36 : 24);
  const months = Array.from({ length: totalMonths }).map((_, i) => addMonths(timelineStart, i));

  // Configuração de largura das colunas baseada no zoom
  const getColWidth = () => {
    switch(zoom) {
      case 'month': return 120;
      case 'quarter': return 180;
      case 'year': return 80;
      default: return 150;
    }
  };

  const colWidth = getColWidth();
  const timelineWidth = months.length * colWidth;

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'critical': return 'bg-gradient-to-r from-rose-500 to-rose-600 border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)]';
      case 'high': return 'bg-gradient-to-r from-orange-500 to-orange-600 border-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.4)]';
      case 'medium': return 'bg-gradient-to-r from-amber-500 to-amber-600 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]';
      case 'low': return 'bg-gradient-to-r from-emerald-500 to-emerald-600 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]';
      default: return 'bg-gradient-to-r from-slate-400 to-slate-500 border-slate-400 shadow-[0_0_15px_rgba(148,163,184,0.4)]';
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'critical': return 'bg-rose-500/10 text-rose-600 border-rose-200';
      case 'high': return 'bg-orange-500/10 text-orange-600 border-orange-200';
      case 'medium': return 'bg-amber-500/10 text-amber-600 border-amber-200';
      case 'low': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

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

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-white dark:bg-slate-900">
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

        <div className="flex flex-1 overflow-hidden">
          {/* Coluna Fixa Esquerda: Ativos */}
          <div className="w-[450px] border-r flex-shrink-0 flex flex-col bg-white dark:bg-slate-900 z-40 shadow-xl">
            <div className="h-16 border-b flex items-center px-6 bg-slate-50/50 dark:bg-slate-950/50">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Inventário / Detalhes Estratégicos</span>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              {plans.map((plan) => (
                <div key={plan.id} className="h-20 border-b flex flex-col justify-center px-6 hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors group relative">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-black tracking-tight group-hover:text-primary transition-colors">{plan.assets?.hostname}</span>
                    <Badge variant="outline" className={`text-[8px] uppercase font-black tracking-tighter ${getPriorityBadge(plan.priority)}`}>
                      {plan.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-bold text-slate-500 truncate max-w-[200px]">
                      {plan.assets?.lifecycle_catalog?.product_name} {plan.assets?.lifecycle_catalog?.version}
                    </span>
                    <ChevronRight className="h-3 w-3 text-slate-300" />
                    <span className="text-[10px] font-black text-primary">
                      {plan.assets?.lifecycle_catalog?.successor_version || "TBD"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      <span className="text-[9px] font-bold text-muted-foreground">EoL: {plan.assets?.lifecycle_catalog?.end_of_support ? format(parseISO(plan.assets.lifecycle_catalog.end_of_support), "MM/yyyy") : "-"}</span>
                    </div>
                    <div className="h-1 w-1 rounded-full bg-slate-300" />
                    <Badge variant="secondary" className="text-[8px] h-4 font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {plan.status.replace('_', ' ')}
                    </Badge>
                    {plan.assets?.lifecycle_catalog?.end_of_support && isBefore(parseISO(plan.assets.lifecycle_catalog.end_of_support), today) && (
                      <Badge className="bg-rose-500 text-white text-[8px] h-4 font-black uppercase border-none animate-pulse">
                        EOL Expired
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Área do Gantt: Timeline Horizontal */}
          <div className="flex-1 overflow-x-auto relative scrollbar-thin" ref={scrollRef}>
            {/* Header de Tempo */}
            <div className="sticky top-0 z-30 flex h-16 border-b bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md" style={{ width: timelineWidth }}>
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
            <div className="relative" style={{ width: timelineWidth }}>
              {/* Linhas Verticais de Fundo */}
              <div className="absolute inset-0 flex pointer-events-none">
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

              {/* Linhas dos Ativos */}
              <div className="relative z-10">
                {plans.map((plan) => {
                  const eolStr = plan.assets?.lifecycle_catalog?.end_of_support;
                  const eolDate = eolStr ? parseISO(eolStr) : null;
                  const planStart = plan.planned_start_date ? parseISO(plan.planned_start_date) : null;
                  const planEnd = plan.planned_end_date ? parseISO(plan.planned_end_date) : null;

                  // Cálculo de posicionamento da barra
                  const startOffset = planStart ? differenceInMonths(planStart, timelineStart) : -1;
                  const duration = (planStart && planEnd) ? Math.max(1, differenceInMonths(planEnd, planStart)) : 4;
                  
                  // Marcador de EoL para este ativo
                  let eolOffset = -1;
                  if (eolDate) {
                    eolOffset = differenceInMonths(eolDate, timelineStart);
                  }

                  return (
                    <div key={plan.id} className="h-20 border-b relative group/row hover:bg-primary/[0.02] transition-colors">
                      {/* Marcador EoL do Ativo */}
                      {eolOffset >= 0 && eolOffset < months.length && (
                        <div 
                          className="absolute top-0 bottom-0 border-l border-rose-500/50 border-dashed z-0 flex flex-col"
                          style={{ left: eolOffset * colWidth }}
                        >
                          <div className="opacity-0 group-row:opacity-100 bg-rose-500 text-white text-[7px] font-black px-1 py-0.5 rounded absolute top-2 -left-3 uppercase transition-opacity">EoL</div>
                        </div>
                      )}

                      {/* Barra de Migração */}
                      {planStart && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <motion.div
                              initial={{ opacity: 0, x: -50 }}
                              animate={{ opacity: 1, x: 0 }}
                              whileHover={{ scale: 1.01, zIndex: 30 }}
                              className={`absolute top-1/2 -translate-y-1/2 h-10 rounded-2xl border-2 flex flex-col justify-center px-4 cursor-pointer overflow-hidden backdrop-blur-sm ${getPriorityColor(plan.priority)}`}
                              style={{ 
                                left: Math.max(0, startOffset) * colWidth + 10,
                                width: Math.max(1.5, duration) * colWidth - 20,
                              }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent" />
                              <div className="relative z-10 flex flex-col text-white">
                                <div className="flex items-center gap-2 text-[10px] font-black leading-tight truncate">
                                  <span className="truncate">{plan.assets?.lifecycle_catalog?.product_name} {plan.assets?.lifecycle_catalog?.version}</span>
                                  <ArrowRight className="h-3 w-3 shrink-0 opacity-50" />
                                  <span className="truncate font-black">{plan.assets?.lifecycle_catalog?.successor_version || "Next Gen"}</span>
                                </div>
                                <div className="text-[8px] font-black uppercase opacity-80 tracking-tighter mt-0.5">
                                  Janela de Migração: {format(planStart, "MMM/yy")} - {planEnd ? format(planEnd, "MMM/yy") : "TBD"}
                                </div>
                              </div>
                            </motion.div>
                          </TooltipTrigger>
                          <TooltipContent className="w-[420px] p-0 rounded-[2rem] overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] border-none bg-white dark:bg-slate-900" side="top" sideOffset={10}>
                            <div className={`p-8 ${getPriorityColor(plan.priority).replace('shadow-[0_0_15px_rgba', 'shadow-none').replace(' border-', ' border-none ')} text-white relative overflow-hidden`}>
                              <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 translate-x-4 -translate-y-4">
                                <Zap className="h-32 w-32" />
                              </div>
                              <div className="relative z-10">
                                <div className="flex justify-between items-start mb-2">
                                  <Badge className="bg-white/20 text-white border-none text-[9px] font-black uppercase">{plan.priority}</Badge>
                                  <span className="text-[10px] font-black uppercase opacity-60">ID: {plan.assets?.asset_tag || "N/A"}</span>
                                </div>
                                <h4 className="text-2xl font-black tracking-tighter mb-1">{plan.assets?.hostname}</h4>
                                <p className="text-xs font-bold opacity-80 uppercase tracking-widest">{plan.assets?.lifecycle_catalog?.product_name} v{plan.assets?.lifecycle_catalog?.version}</p>
                              </div>
                            </div>
                            <div className="p-8 space-y-6">
                              <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-1">
                                  <span className="text-[9px] font-black uppercase text-muted-foreground block">Fim do Suporte</span>
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-rose-500" />
                                    <span className="text-sm font-black">{eolDate ? format(eolDate, "dd/MM/yyyy") : "Não cadastrado"}</span>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[9px] font-black uppercase text-muted-foreground block">Dias Restantes</span>
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-amber-500" />
                                    <span className={`text-sm font-black ${eolDate && isBefore(eolDate, today) ? 'text-rose-500' : 'text-slate-900 dark:text-slate-100'}`}>
                                      {eolDate ? differenceInDays(eolDate, today) : "N/A"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="space-y-1">
                                <span className="text-[9px] font-black uppercase text-muted-foreground block">Justificativa Estratégica</span>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border italic text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                                  "{plan.justification}"
                                </div>
                              </div>

                              <div className="pt-4 border-t flex justify-between items-center">
                                <div>
                                  <span className="text-[9px] font-black uppercase text-muted-foreground block">Custo Estimado</span>
                                  <span className="text-lg font-black text-primary">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(plan.estimated_cost || 0)}
                                  </span>
                                </div>
                                <Button size="sm" className="rounded-full px-6 font-black text-[10px] uppercase">
                                  Gerenciar Plano
                                </Button>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
