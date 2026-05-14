import { GanttView } from "@/components/roadmap/GanttView";
import { ExecutivePresentation } from "@/components/roadmap/ExecutivePresentation";
import { Map, Download, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function RoadmapTimelinePage() {
  const [view, setView] = useState<"gantt" | "presentation">("gantt");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Map className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-black tracking-tight">Roadmap Timeline</h1>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={view} onValueChange={(v: any) => setView(v)} className="bg-slate-100 dark:bg-slate-800 p-1 rounded-full">
            <TabsList className="bg-transparent h-8">
              <TabsTrigger value="gantt" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <List className="h-3.5 w-3.5 mr-2" /> Gantt
              </TabsTrigger>
              <TabsTrigger value="presentation" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <LayoutGrid className="h-3.5 w-3.5 mr-2" /> Apresentação
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" className="rounded-full">
            <Download className="h-4 w-4 mr-2" /> Exportar
          </Button>
        </div>
      </div>

      {view === "gantt" ? <GanttView /> : <ExecutivePresentation />}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
          <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-1">Visão Trimestral</h3>
          <p className="text-sm text-blue-700 dark:text-blue-300">A timeline acima está configurada para exibir o horizonte de 24 meses com detalhamento mensal.</p>
        </div>
        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
          <h3 className="font-bold text-amber-900 dark:text-amber-100 mb-1">Ações Críticas</h3>
          <p className="text-sm text-amber-700 dark:text-amber-300">As barras em vermelho representam ativos cujo suporte já expirou ou expira nos próximos 90 dias.</p>
        </div>
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
          <h3 className="font-bold text-green-900 dark:text-green-100 mb-1">Planejamento Estratégico</h3>
          <p className="text-sm text-green-700 dark:text-green-300">As datas sugeridas são calculadas automaticamente para evitar sobreposição de projetos críticos.</p>
        </div>
      </div>
    </div>
  );
}
