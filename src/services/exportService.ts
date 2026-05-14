import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { migrationPlanService } from "./migrationPlanService";
import { assetService } from "./assetService";
import { dashboardService } from "./dashboardService";
import { pdfService } from "./pdfService";

export const exportService = {
  async exportToExcel() {
    const [plans, assets] = await Promise.all([
      migrationPlanService.getAll(),
      assetService.getAll()
    ]);

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

    XLSX.writeFile(wb, "GlobalParts_Technology_Roadmap.xlsx");
  },

  async exportExecutivePdf() {
    try {
      // 1. Buscar todos os dados necessários para o relatório
      const data = await dashboardService.getDashboardData();
      const plans = await migrationPlanService.getAll();

      // 2. Gerar o PDF Profissional
      await pdfService.generateExecutiveReport({
        stats: data.stats,
        plans: plans,
        insights: data.insights,
        riskData: data.riskData
      });
      
      return true;
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      throw error;
    }
  }
};

