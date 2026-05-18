import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboardService";
import { ExecutiveStats } from "@/components/dashboard/ExecutiveStats";
import { 
  RiskChart, 
  MigrationStatusChart, 
  CategoryDistributionChart, 
  EolTimelineChart 
} from "@/components/dashboard/DashboardCharts";
import { FileDown, Monitor, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

import { exportService } from "@/services/exportService";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingDown, ShieldAlert, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";

import { toast } from "sonner";
import { useState } from "react";

import { useSearchParams } from "react-router-dom";
import { roadmapService } from "@/services/roadmapService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function DashboardPage() {
  const [exporting, setExporting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
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

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground italic">Processando dados do dashboard...</p>
      </div>
    );
  }
  
  const { stats, riskData, statusData, categoryData, timelineData, insights } = data;


  return (
    <div className="space-y-6" id="dashboard-content">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 text-white p-8 md:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-primary/30 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-blue-500/20 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 w-fit">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Inteligência Estratégica Ativa</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent">
              Executive Dashboard
            </h1>
            <p className="text-slate-400 font-medium max-w-xl text-sm md:text-base leading-relaxed">
              Visão consolidada do ciclo de vida tecnológico corporativo. Acompanhe riscos de obsolescência, orçamentos estimados e status de migrações em tempo real.
            </p>
          </div>
          
          <div className="flex flex-col gap-3 min-w-[280px]">
            <Select value={projectId || "all"} onValueChange={handleProjectChange}>
              <SelectTrigger className="w-full rounded-2xl h-12 bg-white/10 border-white/10 text-white hover:bg-white/20 transition-all backdrop-blur-md shadow-inner focus:ring-primary/50">
                <SelectValue placeholder="Visão Global (Todos os Projetos)" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-2xl">
                <SelectItem value="all">Visão Global (Todos)</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1 rounded-2xl h-11 bg-white/5 border-white/10 hover:bg-white/10 text-slate-200 transition-all shadow-none font-bold" 
                onClick={handlePdfExport}
                disabled={exporting}
              >
                {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
                Exportar PDF
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 rounded-2xl h-11 bg-white/5 border-white/10 hover:bg-white/10 text-slate-200 transition-all shadow-none font-bold" 
                onClick={() => exportService.exportToExcel(projectId)}
              >
                <FileDown className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>
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
          <EmptyState 
            icon={Monitor}
            title="Nenhum ativo importado"
            description="Sua jornada estratégica começa aqui. Importe seu inventário de TI para gerar insights automáticos baseados em ciclo de vida."
            actionLabel="Importar Inventário"
            onAction={() => navigate("/assets")}
          />
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

