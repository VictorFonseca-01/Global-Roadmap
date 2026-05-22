import { ConsolidatedTechnologyGroup } from './timelineAggregationService';
import { differenceInDays, parseISO } from 'date-fns';

export interface IntelligenceScore {
  riskScore: number;       // 0-100
  priorityScore: number;   // 0-100
  projectedCapex: number;
  projectedOpex: number;
  healthIndex: number;     // 0-100 (inverse of risk)
  delayCost: number;       // Cost of delaying the migration (financial risk delta)
}

export const operationalIntelligenceEngine = {
  /**
   * Calculates intelligence metrics for a technology group based on its dates.
   * If simulation dates are provided, it uses them instead of the group's planned dates.
   */
  calculateMetrics(
    group: ConsolidatedTechnologyGroup,
    simulatedStartDate?: string,
    _simulatedEndDate?: string
  ): IntelligenceScore {
    const startDate = simulatedStartDate || group.plannedStartDate;
    const eolDate = group.eolDate;
    
    // Baseline costs
    const baseCapex = group.estimatedCost || 0;
    
    // Multipliers based on criticality
    const criticalityMultipliers = {
      low: 1.0,
      medium: 1.2,
      high: 1.5,
      critical: 2.0
    };
    
    const critMult = criticalityMultipliers[group.criticality] || 1.0;
    
    // Base OPEX is roughly 25% of CAPEX historically, multiplied by criticality
    let projectedOpex = baseCapex * 0.25 * critMult;
    let riskScore = 0;
    let delayCost = 0;

    if (eolDate && startDate) {
      const eolDateObj = parseISO(eolDate);
      const startDateObj = parseISO(startDate);
      const daysDelay = differenceInDays(startDateObj, eolDateObj); // > 0 means delayed past EOL
      
      if (daysDelay > 0) {
        // Migration starts AFTER EOL -> Extreme Risk
        riskScore = Math.min(100, 50 + (daysDelay / 30) * 10 * critMult);
        
        // Extended support/penalty cost adds 5% OPEX per month delayed
        const penaltyMonths = daysDelay / 30;
        delayCost = projectedOpex * (penaltyMonths * 0.05) * critMult;
        projectedOpex += delayCost;
      } else {
        // Safe window, but how close to EOL?
        const safetyMargin = -daysDelay;
        if (safetyMargin < 90) {
          // Warning zone (less than 3 months before EOL)
          riskScore = Math.min(50, 20 + ((90 - safetyMargin) / 90) * 30 * critMult);
        } else {
          // Safe zone
          riskScore = Math.max(5, 10 * critMult);
        }
      }
    } else {
      // Missing dates, default risk based purely on criticality
      riskScore = critMult * 20;
    }

    // Auto Prioritization Engine
    // Score 0-100: Higher score means urgent execution required.
    // Depends heavily on risk score, asset count, and cape/opex impact.
    let priorityScore = (riskScore * 0.6) + (critMult * 10);
    
    // Adjust by asset footprint
    if (group.assetCount > 500) priorityScore += 10;
    else if (group.assetCount > 100) priorityScore += 5;
    
    priorityScore = Math.min(100, Math.max(0, priorityScore));
    
    const healthIndex = Math.max(0, 100 - riskScore);

    return {
      riskScore: Math.round(riskScore),
      priorityScore: Math.round(priorityScore),
      projectedCapex: baseCapex,
      projectedOpex: projectedOpex,
      healthIndex: Math.round(healthIndex),
      delayCost: delayCost
    };
  }
};
