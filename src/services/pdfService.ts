import { jsPDF } from "jspdf";
import "jspdf-autotable";

export const pdfService = {
  async generateExecutiveReport(data: {
    stats: any;
    plans: any[];
    insights: string[];
    riskData: any[];
  }) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // --- CAPA ---
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("GLOBALPARTS TECHNOLOGY ROADMAP", 20, 25);

    doc.setTextColor(100, 116, 139); // Slate 500
    doc.setFontSize(10);
    doc.text(`GERADO EM: ${new Date().toLocaleDateString('pt-BR')} AS ${new Date().toLocaleTimeString('pt-BR')}`, 20, 35);

    // --- RESUMO EXECUTIVO ---
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(16);
    doc.text("1. Resumo Executivo", 20, 55);
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const summaryText = "Este documento apresenta a visão estratégica do parque tecnológico da GlobalParts, identificando ativos críticos que necessitam de migração devido ao fim do suporte oficial (EoL). O planejamento visa mitigar riscos de segurança e garantir a continuidade operacional.";
    const splitSummary = doc.splitTextToSize(summaryText, pageWidth - 40);
    doc.text(splitSummary, 20, 65);

    // --- KPIs ---
    doc.setFont("helvetica", "bold");
    doc.text("2. Indicadores de Risco (KPIs)", 20, 85);
    
    const kpiData = [
      ["Ativos Totais", data.stats.totalAssets.toString()],
      ["Risco Crítico", data.stats.critical.toString()],
      ["Fora de Suporte", data.stats.outOfSupport.toString()],
      ["Próximos 180 dias", data.stats.next180Days.toString()],
      ["Investimento Est.", new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.stats.estimatedBudget)]
    ];

    (doc as any).autoTable({
      startY: 90,
      head: [['Métrica', 'Valor']],
      body: kpiData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }, // Blue 500
      margin: { left: 20, right: 20 }
    });

    // --- INSIGHTS ESTRATÉGICOS ---
    let currentY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFont("helvetica", "bold");
    doc.text("3. Insights Estratégicos", 20, currentY);
    
    doc.setFont("helvetica", "normal");
    currentY += 8;
    data.insights.forEach((insight, index) => {
      const splitInsight = doc.splitTextToSize(`• ${insight}`, pageWidth - 40);
      doc.text(splitInsight, 20, currentY);
      currentY += (splitInsight.length * 6);
    });

    // --- ATIVOS CRÍTICOS ---
    if (currentY > 230) {
      doc.addPage();
      currentY = 20;
    } else {
      currentY += 10;
    }

    doc.setFont("helvetica", "bold");
    doc.text("4. Detalhamento de Ativos Críticos", 20, currentY);
    
    const criticalPlans = data.plans
      .filter(p => p.priority === 'critical' || p.priority === 'high')
      .slice(0, 15) // Top 15 para o PDF não ficar gigante
      .map(p => [
        p.assets?.hostname || 'N/A',
        p.assets?.lifecycle_catalog?.product_name || 'N/A',
        p.priority.toUpperCase(),
        p.recommended_start_date || 'N/A',
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.estimated_cost)
      ]);

    (doc as any).autoTable({
      startY: currentY + 5,
      head: [['Hostname', 'Produto', 'Prioridade', 'Data Recomendada', 'Custo Est.']],
      body: criticalPlans,
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42] },
      margin: { left: 20, right: 20 }
    });

    // --- RODAPÉ ---
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - 40, pageHeight - 10);
      doc.text("CONFIDENCIAL - GLOBALPARTS TECHNOLOGY STRATEGY", 20, pageHeight - 10);
    }

    doc.save("GlobalParts_Executive_Roadmap.pdf");
  }
};
