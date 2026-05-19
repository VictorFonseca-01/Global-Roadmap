import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { MigrationPlan } from "@/types";
import { lifecycleIntelligenceEngine } from "@/services/lifecycleIntelligenceEngine";
import { parseISO, format } from "date-fns";

interface PdfReportData {
  stats: {
    totalAssets: number;
    critical: number;
    outOfSupport: number;
    next180Days: number;
    estimatedBudget: number;
  };
  plans: MigrationPlan[];
  insights: string[];
  riskData: { name: string; value: number; color: string }[];
}

export const pdfService = {
  async generateExecutiveReport(data: PdfReportData) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // 1. Cálculos de Inteligência Consolidada
    let totalCapex = 0;
    let totalOpexSavings = 0;
    let totalRiskCostAvoided = 0;
    let totalBlockers = 0;
    const blockerList: string[] = [];
    const complianceStandards = new Set<string>();

    data.plans.forEach(p => {
      const eolStr = p.assets?.lifecycle_catalog?.end_of_support || null;
      const timeline = lifecycleIntelligenceEngine.generateStrategicTimeline({
        product_name: p.assets?.lifecycle_catalog?.product_name || '',
        asset_type: p.assets?.device_type || 'client',
        business_criticality: p.assets?.business_criticality || p.priority || 'low',
        end_of_support: eolStr,
        estimated_cost: p.estimated_cost || 0
      });

      totalCapex += p.estimated_cost || 0;
      totalOpexSavings += (p.estimated_cost || 0) * 0.25;
      totalRiskCostAvoided += timeline.operational_risk_cost || 0;

      if (timeline.blocked_by && timeline.blocked_by.length > 0) {
        timeline.blocked_by.forEach(b => {
          blockerList.push(`${p.assets?.hostname}: ${b}`);
          totalBlockers++;
        });
      }

      const rec = lifecycleIntelligenceEngine.getRecommendation(
        p.assets?.lifecycle_catalog?.product_name || '',
        p.assets?.device_type
      );
      rec.compliance.forEach(c => complianceStandards.add(c));
    });

    // --- CAPA SLATE ESTILO ENTERPRISE ---
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(0, 0, pageWidth, 42, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("GLOBALPARTS TECHNOLOGY ROADMAP", 20, 22);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(59, 130, 246); // Blue 500
    doc.text("PARECER ESTRATÉGICO DE RISCOS GRC E CICLO DE VIDA DE ATIVOS", 20, 30);

    doc.setTextColor(148, 163, 184); // Slate 400
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`EMISSÃO: ${new Date().toLocaleDateString('pt-BR')} AS ${new Date().toLocaleTimeString('pt-BR')}`, 20, 36);

    let currentY = 54;

    // --- SEÇÃO 1: RESUMO EXECUTIVO ---
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("1. Resumo Executivo (Corporate Lifecycle Narrative)", 20, currentY);
    
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    const summaryText = "Este relatório estratégico formaliza a governança de infraestrutura tecnológica da GlobalParts, cobrindo o ciclo de vida (EoL), suporte oficial e riscos corporativos. A análise centralizada mapeia ativos em desconformidade regulatória e prevê migrações imediatas para mitigar exposição cibernética, vulnerabilidades sem patch e interrupções sistêmicas nas operações globais.";
    const splitSummary = doc.splitTextToSize(summaryText, pageWidth - 40);
    doc.text(splitSummary, 20, currentY + 6);
    
    currentY += 6 + (splitSummary.length * 5) + 6;

    // --- SEÇÃO 2: KPI MATRIX ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("2. Matriz Consolidada de Indicadores GRC", 20, currentY);

    const kpiData = [
      ["Ativos de Infraestrutura Mapeados", `${data.stats.totalAssets} ativos`],
      ["Exposição GRC Crítica (Near EoL / Out of Support)", `${data.stats.outOfSupport + data.stats.next180Days} ativos`],
      ["Bloqueadores Ativos Identificados", `${totalBlockers} blockers`],
      ["Investimento Requerido (CAPEX)", new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalCapex)],
      ["Retorno Operacional Anualizado (OPEX Savings)", new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalOpexSavings)],
      ["Risco Financeiro Total Evitado (GRC Risk Avoided)", new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalRiskCostAvoided)]
    ];

    autoTable(doc, {
      startY: currentY + 5,
      head: [['Indicador de Performance Estratégica', 'Valor Mapeado']],
      body: kpiData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], fontSize: 9.5 },
      bodyStyles: { fontSize: 8.5 },
      columnStyles: {
        0: { cellWidth: 110, fontStyle: 'bold' },
        1: { cellWidth: 60, halign: 'right' }
      },
      margin: { left: 20, right: 20 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 12;

    // --- SEÇÃO 3: TOP RISKS & COMPLIANCE ---
    if (currentY > 230) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("3. Riscos Críticos e Padrões de Conformidade Expostos", 20, currentY);

    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    doc.text("Conformidade Regulatória Mapeada: " + Array.from(complianceStandards).join(", "), 20, currentY + 6);

    let riskY = currentY + 12;
    if (blockerList.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(220, 38, 38); // Red 600
      doc.text("Bloqueadores Tecnológicos Ativos:", 20, riskY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      
      riskY += 5;
      blockerList.slice(0, 4).forEach((blocker) => {
        const splitBlocker = doc.splitTextToSize(`• [ALERTA BLOQUEANTE] ${blocker}`, pageWidth - 40);
        doc.text(splitBlocker, 20, riskY);
        riskY += (splitBlocker.length * 4.5);
      });
    } else {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(16, 185, 129); // Emerald 500
      doc.text("✓ Nenhum bloqueador de hardware ou homologação detectado no parque tecnológico.", 20, riskY);
      doc.setTextColor(15, 23, 42);
      riskY += 6;
    }

    currentY = riskY + 12;

    // --- SEÇÃO 4: INVESTMENT PLAN ---
    if (currentY > 200) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("4. Planejamento Recomendado de Investimento e Prazos GRC", 20, currentY);

    const investmentTable = data.plans.map(p => {
      const eolStr = p.assets?.lifecycle_catalog?.end_of_support || null;
      const timeline = lifecycleIntelligenceEngine.generateStrategicTimeline({
        product_name: p.assets?.lifecycle_catalog?.product_name || '',
        asset_type: p.assets?.device_type || 'client',
        business_criticality: p.assets?.business_criticality || p.priority || 'low',
        end_of_support: eolStr,
        estimated_cost: p.estimated_cost || 0
      });

      return [
        p.assets?.hostname || 'N/A',
        p.assets?.lifecycle_catalog?.product_name || 'N/A',
        timeline.recommended_target_version || 'N/A',
        timeline.recommended_start_date ? format(parseISO(timeline.recommended_start_date), 'dd/MM/yyyy') : 'N/A',
        timeline.recommended_cutover_date ? format(parseISO(timeline.recommended_cutover_date), 'dd/MM/yyyy') : 'N/A',
        timeline.rollback_deadline ? format(parseISO(timeline.rollback_deadline), 'dd/MM/yyyy') : 'N/A',
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(p.estimated_cost || 0),
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format((p.estimated_cost || 0) * 0.25)
      ];
    });

    autoTable(doc, {
      startY: currentY + 5,
      head: [['Hostname', 'Legado', 'Alvo', 'Início Ideal', 'Cutover', 'Rollback Limite', 'CAPEX', 'OPEX Anual']],
      body: investmentTable.slice(0, 12), // Mostra até 12 para caber perfeitamente nas margens corporativas
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42], fontSize: 8 },
      bodyStyles: { fontSize: 7.5 },
      margin: { left: 20, right: 20 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 12;

    // --- SEÇÃO 5: DEFERRED RISKS & ROLLBACK STRATEGY ---
    if (currentY > 210) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("5. Riscos Adiados (Deferred Risks) e Política de Rollback", 20, currentY);

    // Calcular impacto de adiar 6 meses
    let deferredRiskCost = 0;
    let deferredOpexLoss = 0;
    data.plans.forEach(p => {
      const eolStr = p.assets?.lifecycle_catalog?.end_of_support || null;
      const sim = lifecycleIntelligenceEngine.simulateStrategicDelay({
        product_name: p.assets?.lifecycle_catalog?.product_name || '',
        asset_type: p.assets?.device_type || 'client',
        business_criticality: p.assets?.business_criticality || p.priority || 'low',
        end_of_support: eolStr,
        estimated_cost: p.estimated_cost || 0
      }, 6);
      
      const timeline = lifecycleIntelligenceEngine.generateStrategicTimeline({
        product_name: p.assets?.lifecycle_catalog?.product_name || '',
        asset_type: p.assets?.device_type || 'client',
        business_criticality: p.assets?.business_criticality || p.priority || 'low',
        end_of_support: eolStr,
        estimated_cost: p.estimated_cost || 0
      });
      deferredRiskCost += (timeline.operational_risk_cost || 0) * (sim.projected_risk_increase / 100);
      deferredOpexLoss += sim.projected_opex_loss;
    });

    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    const deferredText = `• [SIMULAÇÃO DE ADIAMENTO (6 MESES)]: Adiar a decisão estratégica de migração por 6 meses aumentará o passivo de risco financeiro em ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(deferredRiskCost)} devido à maior probabilidade de incidentes de conformidade e indisponibilidade sem suporte, gerando perdas em OPEX de ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(deferredOpexLoss)}.\n• [ESTRATÉGIA DE CONTINGÊNCIA E ROLLBACK]: A homologação inclui ambientes sandbox espelhados e checkpoints de Rollback. Em caso de anomalia crítica detectada pós-virada, o plano de reversão deve ser acionado estritamente dentro da janela limite calculada (Rollback Limite) para restabelecer os serviços legados de forma segura.`;
    
    const splitDeferred = doc.splitTextToSize(deferredText, pageWidth - 40);
    doc.text(splitDeferred, 20, currentY + 6);

    // --- RODAPÉ EM TODAS AS PÁGINAS ---
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // Slate 400
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - 35, pageHeight - 10);
      doc.text("CONFIDENCIAL — AUDIT-READY GLOBALPARTS TECHNOLOGY BRIEFING", 20, pageHeight - 10);
    }

    doc.save("GlobalParts_Executive_Technology_Roadmap.pdf");
  }
};
