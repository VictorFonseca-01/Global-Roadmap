import { addDays, differenceInDays, isBefore, parseISO } from 'date-fns';
import type { Priority, RiskLevel, CompatibilityStatus } from '@/types';

export const deterministicEngineService = {
  calculatePriority(endOfSupport: string, businessCriticality?: string): Priority {
    const today = new Date();
    const eolDate = parseISO(endOfSupport);
    const daysRemaining = differenceInDays(eolDate, today);

    let priority: Priority = 'low';
    if (isBefore(eolDate, today) || daysRemaining <= 90) {
      priority = 'critical';
    } else if (daysRemaining <= 180) {
      priority = 'high';
    } else if (daysRemaining <= 365) {
      priority = 'medium';
    } else {
      priority = 'low';
    }

    // Escalonamento por criticidade de negócio
    if (businessCriticality === 'critical') {
      if (priority === 'low') return 'medium';
      if (priority === 'medium') return 'high';
      if (priority === 'high') return 'critical';
    }

    return priority;
  },

  calculateMigrationWindow(endOfSupport: string) {
    const today = new Date();
    const eolDate = parseISO(endOfSupport);
    const daysRemaining = differenceInDays(eolDate, today);
    
    let startDate: Date;
    let endDate: Date;

    if (daysRemaining < 0) {
      // EoL Vencido
      startDate = today;
      endDate = addDays(today, 90);
    } else if (daysRemaining <= 90) {
      // EoL <= 90 dias
      startDate = today;
      endDate = addDays(eolDate, -15);
    } else if (daysRemaining <= 180) {
      // EoL 91-180 dias
      startDate = addDays(today, 30);
      endDate = addDays(eolDate, -30);
    } else if (daysRemaining <= 365) {
      // EoL 181-365 dias
      startDate = addDays(today, 90);
      endDate = addDays(eolDate, -45);
    } else {
      // EoL > 365 dias
      startDate = addDays(today, 180);
      endDate = addDays(eolDate, -60);
    }

    // Regra: Nunca permitir end_date depois do EoL (exceto se já estiver vencido, onde usamos a janela de 90 dias de fôlego)
    if (daysRemaining >= 0 && isBefore(eolDate, endDate)) {
      endDate = eolDate;
    }

    // Regra: Se end_date < start_date, usar start_date + 30 dias
    if (isBefore(endDate, startDate)) {
      endDate = addDays(startDate, 30);
    }

    // Regra: Garantir mínimo de 30 dias de janela
    if (differenceInDays(endDate, startDate) < 30) {
      endDate = addDays(startDate, 30);
    }

    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    };
  },

  calculateRiskLevel(compatibilities: CompatibilityStatus[]): RiskLevel {
    if (compatibilities.includes('incompatible')) return 'critical';
    if (compatibilities.includes('needs_testing')) return 'medium';
    return 'low';
  },

  generateJustification(priority: Priority, product: string, version: string, eol: string): string {
    const today = new Date();
    const eolDate = parseISO(eol);
    const days = differenceInDays(eolDate, today);
    
    if (days < 0) {
      return `CRÍTICO: O produto ${product} ${version} está fora de suporte desde ${eol}. A janela de migração foi aberta hoje com prazo de 90 dias para regularização emergencial.`;
    }
    
    return `O suporte do produto ${product} ${version} encerra em ${eol} (${days} dias restantes). Prioridade definida como ${priority.toUpperCase()}. O cronograma foi ajustado para garantir que a migração termine antes do prazo final do fabricante.`;
  },

  getExecutiveInsights(stats: any, plans: any[]): string[] {
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

