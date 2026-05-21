import { useState, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { migrationPlanService } from "@/services/migrationPlanService";
import { supabase } from "@/lib/supabase";
import { format, parseISO, differenceInMonths, addMonths, startOfMonth, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Rnd } from "react-rnd";
import { toast } from "sonner";
import { ChevronRight, ChevronDown, Monitor, Server, Map as MapIcon } from "lucide-react";
import type { MigrationPlan } from "@/types";

export function TimelineExecutiveView({ projectId }: { projectId?: string }) {
  const queryClient = useQueryClient();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Debounce ref to prevent Supabase flood on drag
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: allPlans = [], isLoading } = useQuery({
    queryKey: ["migration-plans"],
    queryFn: () => migrationPlanService.getAll(),
  });

  const plans = useMemo(() => {
    return projectId 
      ? allPlans.filter(p => p.roadmap_project_id === projectId)
      : allPlans;
  }, [allPlans, projectId]);

  // Group by technology
  const groups = useMemo(() => {
    const map = new Map<string, MigrationPlan[]>();
    plans.forEach(plan => {
      const vendor = plan.assets?.lifecycle_catalog?.vendor || "Unknown";
      const product = plan.assets?.lifecycle_catalog?.product_name || "Unknown";
      const version = plan.assets?.lifecycle_catalog?.version || "";
      const groupKey = `${vendor} ${product} ${version}`.trim();
      
      if (!map.has(groupKey)) map.set(groupKey, []);
      map.get(groupKey)!.push(plan);
    });
    const result: { name: string; plans: MigrationPlan[] }[] = [];
    map.forEach((groupPlans: MigrationPlan[], name: string) => result.push({ name, plans: groupPlans }));
    return result;
  }, [plans]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const updatePlanDates = useMutation({
    mutationFn: async ({ id, startDate, endDate }: { id: string, startDate: string, endDate: string }) => {
      const { error } = await supabase.from('migration_plans').update({
        planned_start_date: startDate,
        planned_end_date: endDate,
        recommended_start_date: startDate
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Roadmap atualizado");
      queryClient.invalidateQueries({ queryKey: ["migration-plans"] });
    },
    onError: () => {
      toast.error("Erro ao salvar alteração no Supabase.");
    }
  });

  // Debounced wrapper — prevents Supabase flood during drag
  const debouncedUpdate = useCallback((id: string, startDate: string, endDate: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updatePlanDates.mutate({ id, startDate, endDate });
    }, 600);
  }, [updatePlanDates]);

  const today = new Date();
  const timelineStart = startOfMonth(addMonths(today, -1));
  const colWidth = 60;
  const months = Array.from({ length: 36 }).map((_, i) => addMonths(timelineStart, i));
  const timelineWidth = months.length * colWidth;

  const dateToX = useCallback((dateStr: string) => {
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

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Carregando timeline executiva...</p>
      </div>
    </div>
  );

  if (plans.length === 0) return (
    <div className="flex flex-col items-center justify-center h-64 text-center p-10">
      <MapIcon className="h-12 w-12 text-slate-300 mb-4" />
      <h3 className="text-lg font-bold mb-1">Nenhum plano de migração encontrado</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        {projectId 
          ? "Este projeto ainda não possui planos de migração. Gere um roadmap automático para preencher a timeline."
          : "Nenhum roadmap gerado ainda. Importe seu inventário e use o Smart Lifecycle AI."}
      </p>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
        <div className="w-[350px] flex-shrink-0 border-r border-slate-200 dark:border-slate-800 p-4 font-bold text-sm flex items-center">
          Tecnologias &amp; Ativos
        </div>
        <div className="flex-1 overflow-hidden relative">
          <div className="flex absolute top-0 bottom-0" style={{ width: timelineWidth }}>
            {months.map((month, i) => (
              <div key={i} className="flex flex-col items-center justify-center border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs text-slate-500 font-medium" style={{ width: colWidth }}>
                {format(month, "MMM", { locale: ptBR })}
                <span className="text-[10px] opacity-70">{format(month, "yy")}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto flex">
        {/* Left panel: Tech list */}
        <div className="w-[350px] flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-10 relative">
          {groups.map(group => {
            const isExpanded = expandedGroups[group.name];
            return (
              <div key={group.name} className="flex flex-col">
                <div 
                  className="flex items-center gap-2 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer border-b border-slate-100 dark:border-slate-800/50 group"
                  onClick={() => toggleGroup(group.name)}
                >
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-blue-500" /> : <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />}
                  <div className="flex-1 overflow-hidden">
                    <div className="font-bold text-sm truncate">{group.name}</div>
                    <div className="text-xs text-muted-foreground">{group.plans.length} ativos</div>
                  </div>
                </div>
                {isExpanded && group.plans.map(plan => (
                  <div key={plan.id} className="flex items-center gap-2 p-3 pl-8 bg-slate-50/30 dark:bg-slate-900/30 border-b border-slate-50 dark:border-slate-800/30">
                    {plan.assets?.device_type === 'server' ? <Server className="w-3 h-3 text-slate-400" /> : <Monitor className="w-3 h-3 text-slate-400" />}
                    <div className="flex-1 overflow-hidden">
                      <div className="text-xs font-medium truncate">{plan.assets?.hostname || 'N/A'}</div>
                      <div className="text-[10px] text-muted-foreground flex gap-2">
                        <span className="text-rose-500 font-medium">EoL: {plan.assets?.lifecycle_catalog?.end_of_support || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Right panel: Timeline bars */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden relative">
          <div style={{ width: timelineWidth, minHeight: '100%' }} className="relative">
            {/* Grid lines */}
            {months.map((_, i) => (
              <div key={i} className="absolute top-0 bottom-0 border-r border-slate-100 dark:border-slate-800/30 pointer-events-none" style={{ left: (i + 1) * colWidth, width: colWidth }} />
            ))}

            {/* Today marker */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-blue-500/50 pointer-events-none z-10"
              style={{ left: dateToX(today.toISOString()) }}
            />

            {groups.map((group, gIdx) => {
              const isExpanded = expandedGroups[group.name];

              let yOffset = 0;
              for (let i = 0; i < gIdx; i++) {
                yOffset += 61;
                if (expandedGroups[groups[i].name]) {
                  yOffset += groups[i].plans.length * 52;
                }
              }

              return (
                <div key={group.name}>
                  <div className="absolute w-full pointer-events-none" style={{ top: yOffset, height: 60 }} />
                  
                  {isExpanded && group.plans.map((plan, pIdx) => {
                    const rowY = yOffset + 61 + (pIdx * 52);
                    const startDateStr = plan.planned_start_date || plan.recommended_start_date || "";
                    const endDateStr = plan.planned_end_date || (startDateStr ? addDays(parseISO(startDateStr), 30).toISOString() : "");
                    const startX = dateToX(startDateStr);
                    const endX = dateToX(endDateStr);
                    const width = Math.max(endX - startX, 20);

                    // Color by priority
                    const priorityColor = 
                      plan.priority === 'critical' ? 'bg-rose-500 hover:bg-rose-600' :
                      plan.priority === 'high' ? 'bg-amber-500 hover:bg-amber-600' :
                      plan.priority === 'medium' ? 'bg-blue-500 hover:bg-blue-600' :
                      'bg-emerald-500 hover:bg-emerald-600';

                    return (
                      <div key={plan.id} className="absolute w-full" style={{ top: rowY, height: 52 }}>
                        <Rnd
                          default={{ x: startX, y: 10, width, height: 32 }}
                          bounds="parent"
                          enableResizing={{ left: true, right: true, top: false, bottom: false, topRight: false, bottomRight: false, bottomLeft: false, topLeft: false }}
                          dragAxis="x"
                          onDragStop={(_e, d) => {
                            const newStart = xToDate(d.x);
                            const newEnd = xToDate(d.x + width);
                            debouncedUpdate(plan.id, newStart, newEnd);
                          }}
                          onResizeStop={(_e, _direction, ref, _delta, position) => {
                            const newStart = xToDate(position.x);
                            const newEnd = xToDate(position.x + ref.offsetWidth);
                            debouncedUpdate(plan.id, newStart, newEnd);
                          }}
                          className={`${priorityColor} rounded-md shadow-sm opacity-90 hover:opacity-100 transition-opacity flex items-center justify-center cursor-ew-resize group/bar`}
                        >
                          <div className="w-full h-full flex items-center px-2 overflow-hidden">
                            <span className="text-[10px] text-white font-bold truncate opacity-0 group-hover/bar:opacity-100 transition-opacity">
                              {plan.assets?.hostname || 'Migrar'} → {plan.assets?.lifecycle_catalog?.successor_version || 'Nova Versão'}
                            </span>
                          </div>
                        </Rnd>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
