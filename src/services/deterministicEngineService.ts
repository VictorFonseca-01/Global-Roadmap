import { addDays, differenceInDays, isBefore, parseISO } from 'date-fns';
import type { Priority, RiskLevel, CompatibilityStatus } from '@/types';

export const deterministicEngineService = {
  calculatePriority(endOfSupport: string): Priority {
    const today = new Date();
    const eolDate = parseISO(endOfSupport);
    const daysRemaining = differenceInDays(eolDate, today);

    if (isBefore(eolDate, today)) return 'critical';
    if (daysRemaining <= 180) return 'high';
    if (daysRemaining <= 365) return 'medium';
    return 'low';
  },

  calculateRecommendedStartDate(priority: Priority): string {
    const today = new Date();
    let startDate: Date;

    switch (priority) {
      case 'critical':
        startDate = today;
        break;
      case 'high':
        startDate = addDays(today, 30);
        break;
      case 'medium':
        startDate = addDays(today, 90);
        break;
      case 'low':
      default:
        startDate = addDays(today, 180);
        break;
    }

    return startDate.toISOString().split('T')[0];
  },

  calculateRiskLevel(compatibilities: CompatibilityStatus[]): RiskLevel {
    if (compatibilities.includes('incompatible')) return 'critical';
    if (compatibilities.includes('needs_testing')) return 'medium';
    return 'low';
  },

  generateJustification(priority: Priority, product: string, version: string, eol: string): string {
    const days = differenceInDays(parseISO(eol), new Date());
    if (days < 0) {
      return `O produto ${product} ${version} já está fora de suporte desde ${eol}. Substituição imediata é necessária por segurança.`;
    }
    return `O suporte do produto ${product} ${version} encerra em ${eol} (${days} dias restantes). Prioridade definida como ${priority}.`;
  },

  getExecutiveInsights(stats: any, plans: any[], assets: any[]): string[] {
    const insights: string[] = [];

    // Insight 1: Risco Crítico
    if (stats.critical > 0) {
      insights.push(`${stats.critical} ativos críticos exigem ação imediata para evitar paralisação ou falha de segurança.`);
    } else if (stats.high > 0) {
      insights.push(`${stats.high} ativos de alta prioridade devem ser migrados no próximo trimestre.`);
    }

    // Insight 2: Produto Específico de Risco
    const oldestCritical = plans
      .filter(p => p.priority === 'critical')
      .sort((a, b) => (a.recommended_start_date || '').localeCompare(b.recommended_start_date || ''))[0];
    
    if (oldestCritical && oldestCritical.assets?.hostname) {
      insights.push(`O ativo ${oldestCritical.assets.hostname} representa o maior risco operacional imediato.`);
    }

    // Insight 3: Projeção de Suporte
    if (stats.next180Days > 0) {
      insights.push(`${stats.next180Days} ativos perderão suporte oficial nos próximos 180 dias.`);
    }

    // Insight 4: Orçamento
    if (stats.estimatedBudget > 0) {
      const formattedBudget = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.estimatedBudget);
      insights.push(`Investimento total estimado em infraestrutura: ${formattedBudget}.`);
    }

    return insights.length > 0 ? insights : ["Sua infraestrutura está estável no momento.", "Nenhum risco crítico detectado.", "Planejamento sugerido para os próximos 180 dias."];
  }
};

