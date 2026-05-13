import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboardService";
import { ExecutiveStats } from "@/components/dashboard/ExecutiveStats";
import { 
  RiskChart, 
  MigrationStatusChart, 
  CategoryDistributionChart, 
  EolTimelineChart 
} from "@/components/dashboard/DashboardCharts";
import { LayoutDashboard, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";

import { exportService } from "@/services/exportService";

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["executive-stats"],
    queryFn: () => dashboardService.getExecutiveStats(),
  });

  const { data: riskData } = useQuery({
    queryKey: ["risk-distribution"],
    queryFn: () => dashboardService.getCriticalityDistribution(),
  });

  const { data: statusData } = useQuery({
    queryKey: ["status-distribution"],
    queryFn: () => dashboardService.getMigrationStatusDistribution(),
  });

  const { data: categoryData } = useQuery({
    queryKey: ["category-distribution"],
    queryFn: () => dashboardService.getCategoryDistribution(),
  });

  const { data: timelineData } = useQuery({
    queryKey: ["eol-timeline"],
    queryFn: () => dashboardService.getEolTimeline(),
  });

  if (statsLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando painel executivo...</div>;
  }

  return (
    <div className="space-y-6" id="dashboard-content">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Executivo</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportService.exportDashboardToPdf('dashboard-content')}>
            <FileDown className="h-4 w-4 mr-2" /> Exportar PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportService.exportToExcel()}>
            <FileDown className="h-4 w-4 mr-2" /> Exportar Excel
          </Button>
        </div>
      </div>

      {stats && <ExecutiveStats stats={stats} />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <RiskChart data={riskData || []} />
        <MigrationStatusChart data={statusData || []} />
        <CategoryDistributionChart data={categoryData || []} />
        <EolTimelineChart data={timelineData || []} />
      </div>
    </div>
  );
}
