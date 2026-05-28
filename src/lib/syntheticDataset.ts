import type { ConsolidatedTechnologyGroup } from '../services/timelineAggregationService';
import { addDays } from 'date-fns';

const VENDORS = ['Microsoft', 'Oracle', 'RedHat', 'VMware', 'Cisco', 'PaloAlto', 'SAP', 'Salesforce'];
const PRODUCTS = ['Windows Server', 'Database Enterprise', 'RHEL', 'vSphere', 'Catalyst', 'Firewall', 'ERP', 'CRM'];
const DOMAINS = ['Infrastructure', 'Security', 'Business Apps', 'Database'];

function deterministicRandom(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

export function generateSyntheticTimelineDataset(size: number = 50000): {
  groups: ConsolidatedTechnologyGroup[],
  dependencies: any[]
} {
  const groups: ConsolidatedTechnologyGroup[] = [];
  const dependencies: any[] = [];
  const today = new Date();
  
  // Create 500 consolidated groups that represent the 50,000 assets (approx 100 assets per group)
  const numGroups = Math.max(size / 100, 100);

  for (let i = 0; i < numGroups; i++) {
    const vendorIdx = Math.floor(deterministicRandom(i) * VENDORS.length);
    const productIdx = Math.floor(deterministicRandom(i + 1) * PRODUCTS.length);
    const domainIdx = Math.floor(deterministicRandom(i + 2) * DOMAINS.length);
    
    const isCritical = deterministicRandom(i + 3) > 0.8;
    const startOffsetDays = Math.floor((deterministicRandom(i + 4) - 0.5) * 365); // -180 to +180 days
    const durationDays = Math.floor(deterministicRandom(i + 5) * 90) + 30; // 30 to 120 days
    
    const plannedStart = addDays(today, startOffsetDays);
    const plannedEnd = addDays(plannedStart, durationDays);

    const assetCount = Math.floor(deterministicRandom(i + 6) * 500) + 10;
    
    const assets = Array.from({ length: Math.min(assetCount, 50) }).map((_, j) => ({
      id: `synthetic-asset-${i}-${j}`,
      hostname: `${DOMAINS[domainIdx].substring(0, 3).toUpperCase()}-SRV-${1000 + i * 100 + j}`,
      deviceType: deterministicRandom(i + j) > 0.8 ? 'workstation' : 'server',
      planId: `synthetic-plan-${i}`
    }));

    groups.push({
      vendor: VENDORS[vendorIdx],
      product: PRODUCTS[productIdx],
      version: `${Math.floor(deterministicRandom(i + 7) * 10) + 1}.0`,
      assetCount,
      estimatedCost: assetCount * 1500,
      criticality: isCritical ? 'critical' : deterministicRandom(i) > 0.5 ? 'high' : 'medium',
      eolDate: addDays(today, startOffsetDays - 30).toISOString(),
      recommendedUpgrade: `v${Math.floor(deterministicRandom(i + 7) * 10) + 2}.0`,
      plannedStartDate: plannedStart.toISOString(),
      plannedEndDate: plannedEnd.toISOString(),
      riskCost: assetCount * 5000,
      assets
    });
  }

  // Create some dependencies
  for (let i = 0; i < Math.min(numGroups, 500); i++) {
    if (deterministicRandom(i + 10) > 0.3) {
      const targetIdx = Math.floor(deterministicRandom(i + 11) * numGroups);
      if (targetIdx !== i) {
        const sourceGroup = groups[i];
        const targetGroup = groups[targetIdx];
        const sourceKey = `${sourceGroup.vendor}|${sourceGroup.product}|${sourceGroup.version}`.toLowerCase();
        const targetKey = `${targetGroup.vendor}|${targetGroup.product}|${targetGroup.version}`.toLowerCase();
        
        dependencies.push({
          id: `dep-${i}-${targetIdx}`,
          sourceTechKey: sourceKey,
          targetTechKey: targetKey,
          sourceLabel: `${sourceGroup.vendor} ${sourceGroup.product}`,
          targetLabel: `${targetGroup.vendor} ${targetGroup.product}`,
          type: deterministicRandom(i + 12) > 0.5 ? 'blocks' : 'requires',
          description: `Synthetic dependency between ${sourceGroup.product} and ${targetGroup.product}`
        });
      }
    }
  }

  return { groups, dependencies };
}
