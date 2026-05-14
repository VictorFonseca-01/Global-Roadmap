import { useQuery, useQueryClient } from "@tanstack/react-query";
import { migrationPlanService } from "@/services/migrationPlanService";
import { roadmapGeneratorService } from "@/services/roadmapGeneratorService";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, addMonths, startOfMonth, differenceInMonths, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowRight, Map as MapIcon, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";

export function GanttView({ projectId }: { projectId?: string }) {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  
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
        toast.success(`Roadmap gerado! ${results.createdCount} planos criados.`, {
          description: results.notificationsCreated > 0 ? `${results.notificationsCreated} notificações enviadas.` : undefined
        });
        queryClient.invalidateQueries({ queryKey: ["migration-plans"] });
      } else {
        const errorMsg = results.errors[0] || "Nenhum ativo elegível encontrado.";
        toast.error("Geração incompleta", {
          description: errorMsg
        });
      }
    } catch (error) {
      toast.error("Erro ao gerar roadmap");
    } finally {
      setIsGenerating(false);
    }
  };

  const startDate = startOfMonth(new Date());
  const months = Array.from({ length: 24 }).map((_, i) => addMonths(startDate, i));

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'critical': return 'bg-red-500 shadow-red-200 dark:shadow-red-900/20';
      case 'high': return 'bg-orange-500 shadow-orange-200 dark:shadow-orange-900/20';
      case 'medium': return 'bg-yellow-500 shadow-yellow-200 dark:shadow-yellow-900/20';
      case 'low': return 'bg-green-500 shadow-green-200 dark:shadow-green-900/20';
      default: return 'bg-slate-400';
    }
  };

  if (isLoading || isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <RefreshCw className="h-12 w-12 text-primary animate-spin" />
        <div className="text-center">
          <h3 className="text-lg font-bold">Processando Estratégia...</h3>
          <p className="text-sm text-muted-foreground italic">
            {isGenerating ? "O Motor Determinístico está calculando janelas de migração baseadas em EoL oficial." : "Carregando cronograma..."}
          </p>
        </div>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center p-12"
      >
        <div className="p-6 bg-slate-100 dark:bg-slate-800 rounded-full mb-6">
          <MapIcon className="h-16 w-16 text-slate-400" />
        </div>
        <h3 className="text-2xl font-black mb-2 text-center">Timeline Vazia</h3>
        <p className="text-muted-foreground mb-8 text-center max-w-md">
          Não foram encontrados planos de migração para este projeto. Isso ocorre quando não há ativos importados ou o catálogo de lifecycle está incompleto.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg mb-10">
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800 flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="text-xs">
              <span className="font-bold block text-amber-900 dark:text-amber-100 mb-1">Diagnóstico</span>
              <p className="text-amber-700 dark:text-amber-300">Verifique se os ativos possuem a categoria correta e se o EoL está preenchido no catálogo.</p>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 flex gap-3">
            <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0" />
            <div className="text-xs">
              <span className="font-bold block text-blue-900 dark:text-blue-100 mb-1">Dica</span>
              <p className="text-blue-700 dark:text-blue-300">Use a geração automática para que o sistema identifique as melhores janelas de migração.</p>
            </div>
          </div>
        </div>

        <Button 
          onClick={handleGenerate} 
          disabled={!projectId}
          className="rounded-full px-10 h-12 text-md font-bold shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 transition-all"
        >
          <RefreshCw className="h-5 w-5 mr-2" /> Gerar Roadmap Automático
        </Button>
      </motion.div>
    );
  }

  return (
    <TooltipProvider>
      <Card className="overflow-hidden border-none shadow-2xl rounded-3xl bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl">
        <CardContent className="p-0 overflow-x-auto">
          <div className="min-w-[1400px]">
            {/* Header de Meses */}
            <div className="grid grid-cols-[400px_1fr] border-b bg-slate-50/80 dark:bg-slate-900/80 sticky top-0 z-20 backdrop-blur-md">
              <div className="grid grid-cols-[1fr_80px_80px] p-4 border-r font-bold text-xs uppercase tracking-wider text-muted-foreground">
                <span>Ativo / Solução</span>
                <span className="text-center">EoL</span>
                <span className="text-center">Status</span>
              </div>
              <div className="grid grid-cols-24">
                {months.map((m, i) => (
                  <div key={i} className="p-3 text-[10px] text-center border-r font-bold uppercase truncate text-muted-foreground">
                    {format(m, "MMM", { locale: ptBR })}
                    <div className="text-[8px] opacity-50">{format(m, "yy")}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Linhas de Ativos */}
            <div className="max-h-[700px] overflow-y-auto">
              <AnimatePresence>
                {plans.map((plan, idx) => {
                  const start = plan.recommended_start_date ? parseISO(plan.recommended_start_date) : new Date();
                  const startOffset = Math.max(0, differenceInMonths(start, startDate));
                  const duration = 4;
                  const eolDate = plan.assets?.lifecycle_catalog?.end_of_support;
                  const daysToEol = eolDate ? differenceInDays(parseISO(eolDate), new Date()) : null;
                  
                  return (
                    <motion.div 
                      key={plan.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="grid grid-cols-[400px_1fr] border-b hover:bg-slate-50/80 dark:hover:bg-slate-900/80 transition-all group"
                    >
                      <div className="grid grid-cols-[1fr_80px_80px] items-center border-r bg-white/40 dark:bg-slate-950/40">
                        <div className="p-4 flex flex-col gap-1 min-w-0">
                          <span className="font-bold text-sm truncate group-hover:text-primary transition-colors">{plan.assets?.hostname}</span>
                          <div className="flex gap-2 items-center">
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-medium truncate">
                              {plan.assets?.lifecycle_catalog?.product_name} {plan.assets?.lifecycle_catalog?.version}
                            </span>
                          </div>
                        </div>
                        <div className="text-[10px] text-center font-mono font-bold">
                          {eolDate ? format(parseISO(eolDate), "MM/yy") : "-"}
                        </div>
                        <div className="flex justify-center">
                          <Badge variant="outline" className="text-[9px] uppercase h-5 px-1 font-bold">
                            {plan.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>

                      <div className="relative h-20 grid grid-cols-24 group-hover:bg-primary/[0.02] transition-colors">
                        {months.map((_, i) => (
                          <div key={i} className="border-r h-full bg-slate-50/10 dark:bg-slate-900/10" />
                        ))}
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <motion.div 
                              whileHover={{ scale: 1.01, zIndex: 10 }}
                              className={`absolute top-1/2 -translate-y-1/2 h-10 rounded-xl shadow-lg border-2 border-white dark:border-slate-800 flex flex-col justify-center px-4 overflow-hidden transition-all ${getPriorityColor(plan.priority)}`}
                              style={{ 
                                gridColumnStart: startOffset + 1,
                                gridColumnEnd: `span ${duration}`,
                                marginLeft: '8px',
                                marginRight: '8px'
                              }}
                            >
                              <div className="flex items-center gap-2 text-[10px] text-white font-black leading-tight">
                                <span className="truncate">{plan.assets?.lifecycle_catalog?.version}</span>
                                <ArrowRight className="h-3 w-3 shrink-0" />
                                <span className="truncate">{plan.assets?.lifecycle_catalog?.successor_version || 'Next Gen'}</span>
                              </div>
                              <div className="text-[8px] text-white/80 font-bold uppercase tracking-tighter">
                                {daysToEol !== null && daysToEol < 0 ? 'EXPIRED' : `${daysToEol} dias p/ EoL`}
                              </div>
                            </motion.div>
                          </TooltipTrigger>
                          <TooltipContent className="w-80 p-0 rounded-2xl overflow-hidden shadow-2xl border-none">
                            <div className={`p-4 ${getPriorityColor(plan.priority)} text-white`}>
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-black text-lg">{plan.assets?.hostname}</h4>
                                <Badge variant="secondary" className="text-[10px]">{plan.priority.toUpperCase()}</Badge>
                              </div>
                              <div className="text-xs font-bold opacity-90">
                                {plan.assets?.lifecycle_catalog?.product_name}
                              </div>
                            </div>
                            <div className="p-4 space-y-3 bg-white dark:bg-slate-900">
                              <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                  <span className="text-muted-foreground block mb-1">Versão Atual</span>
                                  <span className="font-bold">{plan.assets?.lifecycle_catalog?.version}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block mb-1">Versão Alvo</span>
                                  <span className="font-bold text-primary">{plan.assets?.lifecycle_catalog?.successor_version || "TBD"}</span>
                                </div>
                              </div>
                              <div className="pt-2 border-t">
                                <span className="text-muted-foreground text-[10px] block mb-1">Justificativa Executiva</span>
                                <p className="text-xs leading-relaxed italic">"{plan.justification}"</p>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
