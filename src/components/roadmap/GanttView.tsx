import { useQuery } from "@tanstack/react-query";
import { migrationPlanService } from "@/services/migrationPlanService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, addMonths, startOfMonth, differenceInMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

export function GanttView() {
  const { data: plans = [] } = useQuery({
    queryKey: ["migration-plans"],
    queryFn: () => migrationPlanService.getAll(),
  });

  // Horizonte de 24 meses a partir de hoje
  const startDate = startOfMonth(new Date());
  const months = Array.from({ length: 24 }).map((_, i) => addMonths(startDate, i));

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-slate-400';
    }
  };

  return (
    <Card className="overflow-hidden border-none shadow-lg">
      <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Timeline de Migração (Gantt)</CardTitle>
          <div className="flex gap-4">
            {['Critical', 'High', 'Medium', 'Low'].map(p => (
              <div key={p} className="flex items-center gap-1.5 text-xs">
                <div className={`w-3 h-3 rounded-full ${getPriorityColor(p.toLowerCase())}`} />
                {p}
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <div className="min-w-[1200px]">
          {/* Header de Meses */}
          <div className="grid grid-cols-[300px_1fr] border-b bg-slate-50 dark:bg-slate-900">
            <div className="p-4 border-r font-bold">Ativo / Solução</div>
            <div className="grid grid-cols-24">
              {months.map((m, i) => (
                <div key={i} className="p-2 text-[10px] text-center border-r font-medium uppercase truncate">
                  {format(m, "MMM/yy", { locale: ptBR })}
                </div>
              ))}
            </div>
          </div>

          {/* Linhas de Ativos */}
          <div className="max-h-[600px] overflow-y-auto">
            {plans.map((plan) => {
              const start = plan.recommended_start_date ? parseISO(plan.recommended_start_date) : new Date();
              const startOffset = Math.max(0, differenceInMonths(start, startDate));
              const duration = 3; // Simulação de duração de 3 meses para cada migração
              
              return (
                <div key={plan.id} className="grid grid-cols-[300px_1fr] border-b hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                  <div className="p-4 border-r flex flex-col gap-1">
                    <span className="font-bold text-sm truncate">{plan.assets?.hostname}</span>
                    <div className="flex gap-2 items-center">
                      <Badge variant="outline" className="text-[10px] py-0">{plan.assets?.asset_categories?.name}</Badge>
                      <span className="text-[10px] text-muted-foreground">{plan.assets?.lifecycle_catalog?.product_name}</span>
                    </div>
                  </div>
                  <div className="relative h-full grid grid-cols-24">
                    {/* Grid Background */}
                    {months.map((_, i) => (
                      <div key={i} className="border-r h-full bg-slate-50/20 dark:bg-slate-900/20" />
                    ))}
                    
                    {/* Barra de Gantt */}
                    <div 
                      className={`absolute top-1/2 -translate-y-1/2 h-8 rounded-md shadow-sm flex items-center px-3 text-[10px] text-white font-bold transition-all hover:scale-[1.02] cursor-pointer ${getPriorityColor(plan.priority)}`}
                      style={{ 
                        gridColumnStart: startOffset + 1,
                        gridColumnEnd: `span ${duration}`,
                        marginLeft: '4px',
                        marginRight: '4px'
                      }}
                    >
                      <span className="truncate">{plan.priority.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
