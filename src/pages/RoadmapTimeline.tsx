import { GanttView } from "@/components/roadmap/GanttView";
import { Map, Filter, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RoadmapTimelinePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Map className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Roadmap Timeline</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" /> Filtros
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" /> Exportar Timeline
          </Button>
        </div>
      </div>

      <GanttView />
      
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
