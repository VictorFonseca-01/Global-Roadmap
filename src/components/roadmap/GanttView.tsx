import { useQuery } from "@tanstack/react-query";
import { migrationPlanService } from "@/services/migrationPlanService";
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
import { ArrowRight, Map as MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function GanttView({ projectId }: { projectId?: string }) {
  const { data: allPlans = [], isLoading } = useQuery({
    queryKey: ["migration-plans"],
    queryFn: () => migrationPlanService.getAll(),
  });

  const plans = projectId 
    ? allPlans.filter(p => p.roadmap_project_id === projectId)
    : allPlans;


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

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-3xl bg-slate-50/50 dark:bg-slate-900/20"
      >
        <div className="p-4 bg-primary/10 rounded-full mb-4">
          <MapIcon className="h-12 w-12 text-primary" />
        </div>
        <h3 className="text-xl font-bold mb-2">Nenhum plano de migração encontrado</h3>
        <p className="text-muted-foreground mb-6 text-center max-w-md">
          Para visualizar a timeline, você precisa primeiro importar seus ativos e gerar um roadmap automático.
        </p>
        <Link to="/roadmaps">
          <Button className="rounded-full px-8">Gerar Roadmap Automático</Button>
        </Link>
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
