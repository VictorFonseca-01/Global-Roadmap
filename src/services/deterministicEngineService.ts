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
  }
};
