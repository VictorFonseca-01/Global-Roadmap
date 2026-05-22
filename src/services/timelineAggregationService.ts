import { supabase } from '@/lib/supabase';
import type { MigrationPlan } from '@/types';

export interface ConsolidatedTechnologyGroup {
  vendor: string;
  product: string;
  version: string;
  assetCount: number;
  estimatedCost: number;
  criticality: 'low' | 'medium' | 'high' | 'critical';
  eolDate: string | null;
  recommendedUpgrade: string | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  riskCost: number;
  assets: {
    id: string;
    hostname: string;
    deviceType: string;
    planId: string;
  }[];
}

export const timelineAggregationService = {
  consolidate(plans: MigrationPlan[]): ConsolidatedTechnologyGroup[] {
    const map = new Map<string, MigrationPlan[]>();

    plans.forEach(plan => {
      const vendor = plan.assets?.lifecycle_catalog?.vendor || 'Unknown';
      const product = plan.assets?.lifecycle_catalog?.product_name || 'Unknown';
      const version = plan.assets?.lifecycle_catalog?.version || '';
      const key = `${vendor}|${product}|${version}`.toLowerCase();

      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(plan);
    });

    const result: ConsolidatedTechnologyGroup[] = [];

    const priorityWeights = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1
    };

    map.forEach((groupPlans, _key) => {
      const firstPlan = groupPlans[0];
      const vendor = firstPlan.assets?.lifecycle_catalog?.vendor || 'Unknown';
      const product = firstPlan.assets?.lifecycle_catalog?.product_name || 'Unknown';
      const version = firstPlan.assets?.lifecycle_catalog?.version || '';

      const assetCount = groupPlans.length;
      
      const estimatedCost = groupPlans.reduce((sum, p) => sum + Number(p.estimated_cost || 0), 0);

      let maxPriority: 'low' | 'medium' | 'high' | 'critical' = 'low';
      for (const p of groupPlans) {
        const priority = (p.priority || 'low') as 'low' | 'medium' | 'high' | 'critical';
        if (priorityWeights[priority] > priorityWeights[maxPriority]) {
          maxPriority = priority;
        }
      }

      let eolDate: string | null = null;
      for (const p of groupPlans) {
        const dateStr = p.assets?.lifecycle_catalog?.end_of_support;
        if (dateStr) {
          if (!eolDate || new Date(dateStr) < new Date(eolDate)) {
            eolDate = dateStr;
          }
        }
      }

      const recommendedUpgrade = firstPlan.assets?.lifecycle_catalog?.successor_version || firstPlan.recommended_target_os || 'Upgrade pendente';

      let plannedStartDate: string | null = null;
      let plannedEndDate: string | null = null;

      for (const p of groupPlans) {
        const start = p.planned_start_date || p.recommended_start_date;
        const end = p.planned_end_date;

        if (start) {
          if (!plannedStartDate || new Date(start) < new Date(plannedStartDate)) {
            plannedStartDate = start;
          }
        }
        if (end) {
          if (!plannedEndDate || new Date(end) > new Date(plannedEndDate)) {
            plannedEndDate = end;
          }
        }
      }

      const multiplier = maxPriority === 'critical' ? 1.5 : maxPriority === 'high' ? 1.25 : maxPriority === 'medium' ? 1.1 : 1.0;
      const riskCost = estimatedCost * multiplier;

      const assetsList = groupPlans.map(p => ({
        id: p.assets?.id || '',
        hostname: p.assets?.hostname || 'N/A',
        deviceType: p.assets?.device_type || 'workstation',
        planId: p.id
      }));

      result.push({
        vendor,
        product,
        version,
        assetCount,
        estimatedCost,
        criticality: maxPriority,
        eolDate,
        recommendedUpgrade,
        plannedStartDate,
        plannedEndDate,
        riskCost,
        assets: assetsList
      });
    });

    return result;
  },

  async bulkUpdatePlansDates(planIds: string[], startDate: string, endDate: string) {
    if (planIds.length === 0) return;
    
    const CHUNK_SIZE = 500;
    const chunks: string[][] = [];
    for (let i = 0; i < planIds.length; i += CHUNK_SIZE) {
      chunks.push(planIds.slice(i, i + CHUNK_SIZE));
    }

    const promises = chunks.map(chunk => 
      supabase
        .from('migration_plans')
        .update({
          planned_start_date: startDate,
          planned_end_date: endDate,
          recommended_start_date: startDate
        })
        .in('id', chunk)
    );

    const results = await Promise.allSettled(promises);
    const errors = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error));
    
    if (errors.length > 0) {
      console.error("Bulk update dates partially failed:", errors);
      throw new Error("Alguns lotes de atualização falharam.");
    }
  }
};
