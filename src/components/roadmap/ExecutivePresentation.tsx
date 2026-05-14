import { useQuery } from "@tanstack/react-query";
import { migrationPlanService } from "@/services/migrationPlanService";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  Calendar, 
  ShieldCheck, 
  TrendingUp,
  Info
} from "lucide-react";
import { format, parseISO } from "date-fns";

export function ExecutivePresentation({ projectId }: { projectId?: string }) {
  const { data: allPlans = [] } = useQuery({
    queryKey: ["migration-plans"],
    queryFn: () => migrationPlanService.getAll(),
  });

  const plans = projectId 
    ? allPlans.filter(p => p.roadmap_project_id === projectId)
    : allPlans;


  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'critical': return 'border-red-500 bg-red-500/5';
      case 'high': return 'border-orange-500 bg-orange-500/5';
      case 'medium': return 'border-yellow-500 bg-yellow-500/5';
      case 'low': return 'border-green-500 bg-green-500/5';
      default: return 'border-slate-200';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
      {plans.filter(p => p.priority === 'critical' || p.priority === 'high').map((plan, i) => (
        <motion.div
          key={plan.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <Card className={`border-l-8 rounded-3xl shadow-xl overflow-hidden ${getPriorityColor(plan.priority)}`}>
            <CardContent className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-black tracking-tight mb-1">{plan.assets?.hostname}</h3>
                  <Badge variant="outline" className="uppercase font-black text-[10px] tracking-widest">
                    {plan.assets?.lifecycle_catalog?.product_name}
                  </Badge>
                </div>
                <Badge className={`${plan.priority === 'critical' ? 'bg-red-500' : 'bg-orange-500'} text-white font-black px-4 py-1 rounded-full`}>
                  {plan.priority.toUpperCase()}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-muted-foreground block">Fim do Suporte</span>
                      <span className="font-bold">
                        {plan.assets?.lifecycle_catalog?.end_of_support ? format(parseISO(plan.assets.lifecycle_catalog.end_of_support), "dd/MM/yyyy") : "N/A"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                      <Calendar className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-muted-foreground block">Janela de Migração</span>
                      <span className="font-bold">
                        {plan.recommended_start_date ? format(parseISO(plan.recommended_start_date), "MMM/yy") : "TBD"} a Mar/27
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                      <ShieldCheck className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-muted-foreground block">Destino Recomendado</span>
                      <span className="font-bold text-emerald-600">
                        {plan.assets?.lifecycle_catalog?.successor_version || "Próxima Geração"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-muted-foreground block">Custo Estimado</span>
                      <span className="font-bold">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(plan.estimated_cost || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/50 dark:bg-slate-900/50 p-6 rounded-2xl border border-white dark:border-slate-800">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Justificativa Estratégica</span>
                </div>
                <p className="text-sm leading-relaxed font-medium italic">
                  "{plan.justification}"
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
