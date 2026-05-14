import { useQuery } from "@tanstack/react-query";
import { migrationPlanService } from "@/services/migrationPlanService";
import { 
  format, 
  parseISO, 
  isBefore 
} from "date-fns";
import { motion } from "framer-motion";
import { 
  ShieldAlert, 
  ShieldCheck, 
  Clock, 
  AlertTriangle,
  ChevronRight,
  Target,
  Rocket,
  CheckCircle2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function ExecutivePresentation({ projectId }: { projectId?: string }) {
  const { data: allPlans = [], isLoading } = useQuery({
    queryKey: ["migration-plans"],
    queryFn: () => migrationPlanService.getAll(),
  });

  const plans = projectId 
    ? allPlans.filter(p => p.roadmap_project_id === projectId)
    : allPlans;

  const today = new Date();

  if (isLoading) return <div className="p-20 text-center animate-pulse font-black text-slate-300 uppercase tracking-widest">Gerando Relatório Executivo...</div>;

  return (
    <div className="p-10 space-y-12 bg-slate-50/30 dark:bg-slate-900/30">
      <div className="max-w-4xl">
        <h2 className="text-4xl font-black tracking-tighter mb-4">Relatório Estratégico de Migração</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
          Este documento apresenta a síntese executiva dos ativos contemplados no projeto, 
          priorizando ações baseadas em risco de conformidade e integridade tecnológica.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {plans.map((plan, idx) => {
          const eol = plan.assets?.lifecycle_catalog?.end_of_support;
          const eolDate = eol ? parseISO(eol) : null;
          const isExpired = eolDate && isBefore(eolDate, today);

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className="rounded-[2.5rem] border-none shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden group">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    {/* Lateral de Status */}
                    <div className={`w-full md:w-48 p-8 flex flex-col justify-between items-center text-center ${
                      plan.priority === 'critical' ? 'bg-rose-500' : 
                      plan.priority === 'high' ? 'bg-orange-500' : 
                      'bg-primary'
                    } text-white`}>
                      <div className="space-y-2">
                        <div className="p-3 bg-white/20 rounded-2xl inline-block mb-2">
                          {isExpired ? <ShieldAlert className="h-8 w-8" /> : <ShieldCheck className="h-8 w-8" />}
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-widest opacity-80">Risco</div>
                        <div className="text-xl font-black uppercase">{plan.priority}</div>
                      </div>
                      
                      <div className="mt-8 md:mt-0">
                        <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Status</div>
                        <Badge className="bg-white text-slate-900 border-none hover:bg-white/90 rounded-full px-4 font-black uppercase text-[9px]">
                          {plan.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>

                    {/* Conteúdo Principal */}
                    <div className="flex-1 p-8 md:p-10 space-y-8 bg-white dark:bg-slate-950">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
                        <div>
                          <h3 className="text-3xl font-black tracking-tighter group-hover:text-primary transition-colors">{plan.assets?.hostname}</h3>
                          <div className="flex items-center gap-2 mt-1 text-slate-500 font-bold">
                            <span className="text-xs uppercase">{plan.assets?.lifecycle_catalog?.product_name}</span>
                            <ChevronRight className="h-3 w-3" />
                            <span className="text-xs font-black text-primary">{plan.assets?.lifecycle_catalog?.version}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Fim do Suporte</div>
                          <div className={`text-xl font-black ${isExpired ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                            {eolDate ? format(eolDate, "MMMM yyyy") : "N/A"}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                              <Target className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Ação Recomendada</span>
                              <p className="text-sm font-bold leading-snug">
                                Atualizar para <span className="text-primary">{plan.assets?.lifecycle_catalog?.successor_version || "Próxima Versão Estável"}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                              <Rocket className="h-4 w-4 text-emerald-600" />
                            </div>
                            <div>
                              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Benefício Estratégico</span>
                              <p className="text-sm font-bold text-slate-600 dark:text-slate-300 leading-snug">
                                {plan.priority === 'critical' ? 'Mitigação imediata de vulnerabilidades críticas.' : 'Aumento de performance e suporte oficial.'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                              <Clock className="h-4 w-4 text-orange-600" />
                            </div>
                            <div>
                              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Prazo Sugerido</span>
                              <p className="text-sm font-black italic">
                                {plan.recommended_start_date ? format(parseISO(plan.recommended_start_date), "MMMM 'de' yyyy") : "A definir"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
                              <CheckCircle2 className="h-4 w-4 text-slate-500" />
                            </div>
                            <div>
                              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Conformidade GRC</span>
                              <p className="text-[10px] font-bold text-slate-400 leading-relaxed">
                                Este ativo impacta diretamente o score de segurança da unidade de negócio.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-slate-50 dark:border-slate-900 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-400">
                          <AlertTriangle className="h-3 w-3" />
                          <span className="text-[9px] font-bold uppercase tracking-widest">Justificativa Automática via Motor Determinístico</span>
                        </div>
                        <div className="text-right">
                          <div className="text-[9px] font-black uppercase text-slate-400 mb-1">Custo Projetado</div>
                          <div className="text-lg font-black text-primary">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(plan.estimated_cost || 0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
