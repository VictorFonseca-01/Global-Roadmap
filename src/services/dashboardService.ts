import { assetService } from './assetService';
import { roadmapService } from './roadmapService';
import { categoryService } from './categoryService';
import { migrationPlanService } from './migrationPlanService';

export const dashboardService = {
  async getExecutiveStats() {
    const [assets, roadmaps, categories, migrationPlans] = await Promise.all([
      assetService.getAll(),
      roadmapService.getAll(),
      categoryService.getAll(),
      migrationPlanService.getAll(),
    ]);

    const criticalItems = migrationPlans.filter(p => p.priority === 'critical');
    const highItems = migrationPlans.filter(p => p.priority === 'high');
    const mediumItems = migrationPlans.filter(p => p.priority === 'medium');
    const lowItems = migrationPlans.filter(p => p.priority === 'low');
    
    const expired = migrationPlans.filter(p => {
      // Simulação baseada na prioridade ou data se disponível
      return p.priority === 'critical'; 
    });

    const totalCost = migrationPlans.reduce((acc, p) => acc + (Number(p.estimated_cost) || 0), 0);

    return {
      totalRoadmaps: roadmaps.length,
      totalAssets: assets.length,
      critical: criticalItems.length,
      high: highItems.length,
      medium: mediumItems.length,
      low: lowItems.length,
      outOfSupport: expired.length,
      next180Days: highItems.length, // Simulação
      totalServers: assets.filter(a => a.device_type === 'server').length,
      totalWorkstations: assets.filter(a => a.device_type === 'workstation').length,
      totalCategories: categories.length,
      estimatedBudget: totalCost
    };
  },

  async getCriticalityDistribution() {
    const plans = await migrationPlanService.getAll();
    const data = [
      { name: 'Critical', value: plans.filter(p => p.priority === 'critical').length, color: '#ef4444' },
      { name: 'High', value: plans.filter(p => p.priority === 'high').length, color: '#f97316' },
      { name: 'Medium', value: plans.filter(p => p.priority === 'medium').length, color: '#eab308' },
      { name: 'Low', value: plans.filter(p => p.priority === 'low').length, color: '#22c55e' },
    ];
    return data.filter(d => d.value > 0);
  },

  async getMigrationStatusDistribution() {
    const plans = await migrationPlanService.getAll();
    const statuses = ['planned', 'testing', 'pilot', 'in_progress', 'completed', 'blocked'];
    const colors: Record<string, string> = {
      planned: '#94a3b8',
      testing: '#8b5cf6',
      pilot: '#06b6d4',
      in_progress: '#3b82f6',
      completed: '#22c55e',
      blocked: '#ef4444'
    };

    return statuses.map(s => ({
      name: s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' '),
      value: plans.filter(p => p.status === s).length,
      color: colors[s]
    })).filter(d => d.value > 0);
  },

  async getCategoryDistribution() {
    const assets = await assetService.getAll();
    const counts: Record<string, number> = {};
    
    assets.forEach(a => {
      const cat = a.asset_categories?.name || 'Uncategorized';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  },

  async getEolTimeline() {
    const plans = await migrationPlanService.getAll();
    // Agrupar por mês/ano simplificado para o gráfico de área
    const timeline: Record<string, number> = {};
    
    plans.forEach(p => {
      if (p.recommended_start_date) {
        const date = new Date(p.recommended_start_date);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        timeline[key] = (timeline[key] || 0) + 1;
      }
    });

    return Object.entries(timeline)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, value]) => ({ name, value }));
  }
};
