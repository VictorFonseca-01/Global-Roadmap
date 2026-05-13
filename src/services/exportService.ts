import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import { migrationPlanService } from "./migrationPlanService";
import { assetService } from "./assetService";

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

  async exportDashboardToPdf(elementId: string) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false
    });
    
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save("GlobalParts_Executive_Dashboard.pdf");
  }
};
