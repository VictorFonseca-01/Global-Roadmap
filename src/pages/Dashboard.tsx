import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboardService";
import { ExecutiveStats } from "@/components/dashboard/ExecutiveStats";
import { 
  RiskChart, 
  MigrationStatusChart, 
  CategoryDistributionChart, 
  EolTimelineChart 
} from "@/components/dashboard/DashboardCharts";
import { LayoutDashboard, FileDown, Monitor, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

import { exportService } from "@/services/exportService";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingDown, ShieldAlert, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useState } from "react";

import { useSearchParams } from "react-router-dom";
import { roadmapService } from "@/services/roadmapService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function DashboardPage() {
  const [exporting, setExporting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const projectId = searchParams.get("projectId") || undefined;

  const { data: projects = [] } = useQuery({
    queryKey: ["roadmaps"],
    queryFn: () => roadmapService.getAll(),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-data", projectId],
    queryFn: () => dashboardService.getDashboardData(projectId),
    staleTime: 1000 * 60 * 5,
  });

  const handleProjectChange = (id: string) => {
    if (id === "all") {
      searchParams.delete("projectId");
    } else {
      searchParams.set("projectId", id);
    }
    setSearchParams(searchParams);
  };



  const handlePdfExport = async () => {
    setExporting(true);
    toast.promise(
      exportService.exportExecutivePdf(projectId),
      {
        loading: "Gerando relatório executivo de alta fidelidade...",
        success: () => {
          setExporting(false);
          return "Relatório PDF gerado com sucesso!";
        },
        error: () => {
          setExporting(false);
          return "Erro ao gerar relatório.";
        }
      }
    );
  };


  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-10 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="flex gap-2">
            <div className="h-10 w-32 bg-slate-200 dark:bg-slate-800 rounded-full" />
            <div className="h-10 w-32 bg-slate-200 dark:bg-slate-800 rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
          <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center">
        <ShieldAlert className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold">Erro ao carregar Dashboard</h2>
        <p className="text-muted-foreground">Não foi possível sincronizar os dados com o Supabase.</p>
        <Button variant="outline" className="mt-4 rounded-full" onClick={() => window.location.reload()}>
          Tentar Novamente
        </Button>
      </div>
    );
  }

  const { stats, riskData, statusData, categoryData, timelineData, insights } = data!;

  return (
    <div className="space-y-6" id="dashboard-content">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-black tracking-tight">Dashboard Executivo</h1>
          </div>
          <Select value={projectId || "all"} onValueChange={handleProjectChange}>
            <SelectTrigger className="w-[250px] rounded-full h-10 border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
              <SelectValue placeholder="Todos os Projetos" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">Visão Global (Todos)</SelectItem>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">

          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-full shadow-sm hover:bg-slate-50 transition-all" 
            onClick={handlePdfExport}
            disabled={exporting}
          >
            {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
            Relatório PDF
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-full shadow-sm hover:bg-slate-50 transition-all" 
            onClick={() => exportService.exportToExcel(projectId)}
          >
            <FileDown className="h-4 w-4 mr-2" /> Planilha Excel
          </Button>

        </div>
      </div>

      {/* Local Insights Section (Deterministic) */}
      <AnimatePresence>
        {insights && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {insights.map((insight: string, i: number) => (
              <Card key={i} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden group hover:shadow-md transition-all border-l-4 border-l-primary">
                <CardContent className="p-4 flex gap-3 items-start">
                  <div className="p-2 bg-primary/10 rounded-xl mt-1">
                    {i === 0 ? <ShieldAlert className="h-4 w-4 text-primary" /> : 
                     i === 1 ? <TrendingDown className="h-4 w-4 text-primary" /> : 
                     <Zap className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">Insight Estratégico</span>
                    </div>
                    <p className="text-xs font-bold leading-tight text-slate-700 dark:text-slate-300">{insight}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {stats.totalAssets === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center p-20 border-2 border-dashed rounded-[3rem] bg-slate-50/50 dark:bg-slate-900/10 border-slate-200 dark:border-slate-800"
          >
            <div className="p-6 bg-white dark:bg-slate-950 rounded-full shadow-xl mb-6">
              <Monitor className="h-16 w-16 text-primary animate-pulse" />
            </div>
            <h2 className="text-3xl font-black mb-2">Nenhum ativo importado</h2>
            <p className="text-muted-foreground mb-8 text-center max-w-sm">
              Sua jornada estratégica começa aqui. Importe seu inventário de TI para gerar insights automáticos baseados em ciclo de vida.
            </p>
            <Button className="rounded-full px-10 h-12 text-lg shadow-lg hover:shadow-primary/20 transition-all">
              <Plus className="mr-2 h-5 w-5" /> Importar Inventário
            </Button>
          </motion.div>
        ) : (
          <>
            <ExecutiveStats stats={stats} />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <RiskChart data={riskData} />
              <MigrationStatusChart data={statusData} />
              <CategoryDistributionChart data={categoryData} />
              <EolTimelineChart data={timelineData} />
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

