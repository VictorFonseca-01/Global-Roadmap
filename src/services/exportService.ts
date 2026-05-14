import * as XLSX from "xlsx";
import { migrationPlanService } from "./migrationPlanService";
import { assetService } from "./assetService";
import { dashboardService } from "./dashboardService";
import { pdfService } from "./pdfService";
import { geminiService } from "./geminiService";


export const exportService = {
  async exportToExcel(projectId?: string) {
    const [allPlans, allAssets] = await Promise.all([
      migrationPlanService.getAll(),
      assetService.getAll()
    ]);

    const plans = projectId ? allPlans.filter(p => p.roadmap_project_id === projectId) : allPlans;
    const assets = projectId 
      ? allAssets.filter(a => allPlans.some(p => p.roadmap_project_id === projectId && p.asset_id === a.id))
      : allAssets;

    const wb = XLSX.utils.book_new();
    
    // Aba Planos
    const plansData = plans.map(p => ({
      ID: p.id,
      Hostname: p.assets?.hostname,
      Prioridade: p.priority,
      Status: p.status,
      "Custo Est.": p.estimated_cost,
      Justificativa: p.justification
    }));
    const wsPlans = XLSX.utils.json_to_sheet(plansData);
    XLSX.utils.book_append_sheet(wb, wsPlans, "Migration Plans");

    // Aba Assets
    const assetsData = assets.map(a => ({
      Hostname: a.hostname,
      Fabricante: a.lifecycle_catalog?.vendor || "N/A",
      Modelo: a.lifecycle_catalog?.model || "N/A",
      OS: a.lifecycle_catalog?.product_name || "N/A",
      Criticidade: a.business_criticality
    }));
    const wsAssets = XLSX.utils.json_to_sheet(assetsData);
    XLSX.utils.book_append_sheet(wb, wsAssets, "Inventory");

    const fileName = projectId ? `GlobalParts_Roadmap_${projectId}.xlsx` : "GlobalParts_Technology_Roadmap.xlsx";
    XLSX.writeFile(wb, fileName);
  },

  async exportExecutivePdf(projectId?: string) {
    try {
      // 1. Buscar todos os dados necessários para o relatório
      const data = await dashboardService.getDashboardData(projectId);
      const allPlans = await migrationPlanService.getAll();
      const plans = projectId ? allPlans.filter(p => p.roadmap_project_id === projectId) : allPlans;

      // 2. Gerar insights de IA sob demanda para o PDF
      console.log("[Export] Gerando insights estratégicos via IA...");
      const aiInsights = await geminiService.getExecutiveInsights(data.stats, true);
      const combinedInsights = [...data.insights, ...aiInsights];

      // 3. Gerar o PDF Profissional
      await pdfService.generateExecutiveReport({
        stats: data.stats,
        plans: plans,
        insights: combinedInsights,
        riskData: data.riskData
      });
      
      return true;
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      throw error;
    }
  }
};



