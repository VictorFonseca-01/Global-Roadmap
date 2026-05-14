import { GanttView } from "@/components/roadmap/GanttView";
import { ExecutivePresentation } from "@/components/roadmap/ExecutivePresentation";
import { Map, Download, LayoutGrid, List, ChevronLeft, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { roadmapService } from "@/services/roadmapService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function RoadmapTimelinePage() {
  const [view, setView] = useState<"gantt" | "presentation">("gantt");
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const projectId = searchParams.get("projectId");

  const { data: projects = [] } = useQuery({
    queryKey: ["roadmaps"],
    queryFn: () => roadmapService.getAll(),
  });

  const selectedProject = projects.find(p => p.id === projectId);

  const handleProjectChange = (id: string) => {
    setSearchParams({ projectId: id });
  };

  if (!projectId) {
    return (
      <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed rounded-[3rem] bg-slate-50/50 dark:bg-slate-900/10 border-slate-200 dark:border-slate-800">
        <Building2 className="h-16 w-16 text-slate-400 mb-6" />
        <h2 className="text-2xl font-black mb-2">Selecione um Projeto</h2>
        <p className="text-muted-foreground mb-8 text-center max-w-sm">
          Escolha um projeto de roadmap para visualizar a timeline estratégica de migração.
        </p>
        <div className="w-full max-w-xs">
          <Select onValueChange={handleProjectChange}>
            <SelectTrigger className="rounded-full h-12 shadow-md">
              <SelectValue placeholder="Selecionar Projeto..." />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full h-8 w-8 -ml-2" 
              onClick={() => navigate("/roadmaps")}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Map className="h-6 w-6 text-primary" />
            <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Roadmap Timeline</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            {selectedProject?.name || "Projeto não encontrado"}
            {selectedProject && (
              <Badge variant="outline" className="rounded-full px-4 border-primary/20 bg-primary/5 text-primary text-[10px] font-black uppercase">
                {selectedProject.category}
              </Badge>
            )}
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <Tabs value={view} onValueChange={(v: any) => setView(v)} className="bg-slate-100 dark:bg-slate-800 p-1 rounded-full border dark:border-slate-700">
            <TabsList className="bg-transparent h-9 gap-1">
              <TabsTrigger 
                value="gantt" 
                className="rounded-full px-6 transition-all duration-300 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg dark:text-slate-300 dark:data-[state=active]:text-white"
              >
                <List className="h-4 w-4 mr-2" /> Gantt
              </TabsTrigger>
              <TabsTrigger 
                value="presentation" 
                className="rounded-full px-6 transition-all duration-300 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg dark:text-slate-300 dark:data-[state=active]:text-white"
              >
                <LayoutGrid className="h-4 w-4 mr-2" /> Apresentação
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" className="rounded-full h-10 px-5 shadow-sm hover:shadow-md transition-all">
            <Download className="h-4 w-4 mr-2" /> Exportar Relatório
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden min-h-[600px]">
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

