import { GanttView } from "@/components/roadmap/GanttView";
import { ExecutivePresentation } from "@/components/roadmap/ExecutivePresentation";
import { Map, Download, LayoutGrid, List, ChevronLeft, Building2, ShieldAlert, Zap, CalendarDays, ClipboardCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { roadmapService } from "@/services/roadmapService";
import { migrationPlanService } from "@/services/migrationPlanService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays } from "date-fns";

export default function RoadmapTimelinePage() {
  const [view, setView] = useState<"gantt" | "presentation">("gantt");
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const projectId = searchParams.get("projectId");

  const { data: projects = [] } = useQuery({
    queryKey: ["roadmaps"],
    queryFn: () => roadmapService.getAll(),
  });

  const { data: allPlans = [] } = useQuery({
    queryKey: ["migration-plans"],
    queryFn: () => migrationPlanService.getAll(),
  });

  const selectedProject = projects.find(p => p.id === projectId);

  const plans = projectId 
    ? allPlans.filter(p => p.roadmap_project_id === projectId)
    : allPlans;

  // Estatísticas para os cards
  const stats = {
    total: plans.length,
    outOfSupport: plans.filter(p => {
      const eol = p.assets?.lifecycle_catalog?.end_of_support;
      return eol && new Date(eol) < new Date();
    }).length,
    critical: plans.filter(p => p.priority === 'critical').length,
    next180Days: plans.filter(p => {
      const eol = p.assets?.lifecycle_catalog?.end_of_support;
      if (!eol) return false;
      const days = differenceInDays(new Date(eol), new Date());
      return days >= 0 && days <= 180;
    }).length,
    planned: plans.filter(p => p.status === 'planned').length,
    maxRiskDate: plans.reduce((max, p) => {
      const eol = p.assets?.lifecycle_catalog?.end_of_support;
      if (!eol) return max;
      return !max || new Date(eol) < new Date(max) ? eol : max;
    }, null as string | null)
  };

  const handleProjectChange = (id: string) => {
    setSearchParams({ projectId: id });
  };

  if (!projectId) {
    return (
      <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed rounded-[3rem] bg-slate-50/50 dark:bg-slate-900/10 border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-500">
        <Building2 className="h-16 w-16 text-slate-400 mb-6" />
        <h2 className="text-2xl font-black mb-2">Selecione um Projeto</h2>
        <p className="text-muted-foreground mb-8 text-center max-w-sm">
          Escolha um projeto de roadmap para visualizar a timeline estratégica de migração.
        </p>
        <div className="w-full max-w-xs">
          <Select onValueChange={handleProjectChange}>
            <SelectTrigger className="rounded-full h-12 shadow-lg border-primary/20">
              <SelectValue placeholder="Selecionar Projeto..." />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-none shadow-2xl">
              {Array.from(new globalThis.Map(projects.map(p => [p.name, p])).values()).map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Corporativo */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full h-8 w-8 -ml-2 hover:bg-primary/10 transition-colors" 
              onClick={() => navigate("/roadmaps")}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Map className="h-6 w-6 text-primary" />
            <span className="text-xs font-black text-primary/60 uppercase tracking-[0.2em]">Estratégia & Ciclo de Vida</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter flex items-center gap-4">
            {selectedProject?.name || "Carregando..."}
            {selectedProject && (
              <Badge className="rounded-full px-5 py-1 bg-primary text-white text-[10px] font-black uppercase border-none shadow-lg shadow-primary/20">
                {selectedProject.category}
              </Badge>
            )}
          </h1>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <Tabs value={view} onValueChange={(v) => setView(v as "gantt" | "presentation")} className="bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-full border dark:border-slate-700/50 shadow-inner">
            <TabsList className="bg-transparent h-10 gap-2">
              <TabsTrigger 
                value="gantt" 
                className="rounded-full px-8 font-bold transition-all duration-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-primary data-[state=active]:shadow-sm"
              >
                <List className="h-4 w-4 mr-2" /> Timeline
              </TabsTrigger>
              <TabsTrigger 
                value="presentation" 
                className="rounded-full px-8 font-bold transition-all duration-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-primary data-[state=active]:shadow-sm"
              >
                <LayoutGrid className="h-4 w-4 mr-2" /> Executivo
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="default" className="rounded-full h-12 px-8 font-black shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 transition-all border-none">
            <Download className="h-5 w-5 mr-2" /> Exportar PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards Premium */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Total Ativos", value: stats.total, icon: List, color: "blue" },
          { label: "Fora de Suporte", value: stats.outOfSupport, icon: ShieldAlert, color: "rose", highlight: stats.outOfSupport > 0 },
          { label: "Prioridade Crítica", value: stats.critical, icon: Zap, color: "amber" },
          { label: "Próximos 180 Dias", value: stats.next180Days, icon: CalendarDays, color: "orange" },
          { label: "Planejados", value: stats.planned, icon: ClipboardCheck, color: "emerald" },
          { label: "Maior Risco", value: stats.maxRiskDate ? format(new Date(stats.maxRiskDate), "MMM/yy") : "N/A", icon: AlertTriangle, color: "slate" },
        ].map((item, i) => (
          <div 
            key={i} 
            className={`p-5 rounded-[2rem] border transition-all hover:scale-[1.02] duration-300 ${
              item.highlight 
                ? "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800" 
                : "bg-white dark:bg-slate-950/50 border-slate-100 dark:border-slate-800"
            } shadow-sm hover:shadow-xl`}
          >
            <div className={`p-2 w-10 h-10 rounded-xl mb-3 flex items-center justify-center bg-${item.color}-100 dark:bg-${item.color}-900/30`}>
              <item.icon className={`h-5 w-5 text-${item.color}-600`} />
            </div>
            <div className="text-2xl font-black tracking-tighter">{item.value}</div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden min-h-[650px] relative">
        {view === "gantt" ? <GanttView projectId={projectId} /> : <ExecutivePresentation projectId={projectId} />}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-[2rem] bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 transition-all hover:shadow-md">
          <h3 className="font-black text-blue-900 dark:text-blue-100 mb-2 uppercase text-xs tracking-widest">Visão Trimestral</h3>
          <p className="text-sm text-blue-700 dark:text-blue-300 font-medium leading-relaxed">A timeline acima está configurada para exibir o horizonte de 24 meses com detalhamento mensal e trimestral.</p>
        </div>
        <div className="p-6 rounded-[2rem] bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800 transition-all hover:shadow-md">
          <h3 className="font-black text-rose-900 dark:text-rose-100 mb-2 uppercase text-xs tracking-widest">Ações Críticas</h3>
          <p className="text-sm text-rose-700 dark:text-rose-300 font-medium leading-relaxed">As barras em vermelho representam ativos cujo suporte já expirou ou expira nos próximos 180 dias (Prioridade Crítica).</p>
        </div>
        <div className="p-6 rounded-[2rem] bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 transition-all hover:shadow-md">
          <h3 className="font-black text-emerald-900 dark:text-emerald-100 mb-2 uppercase text-xs tracking-widest">Planejamento Estratégico</h3>
          <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium leading-relaxed">As datas sugeridas são calculadas automaticamente pelo Motor Determinístico para mitigar riscos de segurança.</p>
        </div>
      </div>
    </div>
  );
}

