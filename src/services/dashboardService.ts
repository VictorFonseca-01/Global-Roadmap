import { assetService } from './assetService';
import { roadmapService } from './roadmapService';
import { categoryService } from './categoryService';
import { migrationPlanService } from './migrationPlanService';
import { deterministicEngineService } from './deterministicEngineService';

export const dashboardService = {
  async getDashboardData(projectId?: string) {
    // 1. Carga principal dos dados em paralelo
    const [allAssets, roadmaps, categories, allMigrationPlans] = await Promise.all([
      assetService.getAll(),
      roadmapService.getAll(),
      categoryService.getAll(),
      migrationPlanService.getAll(),
    ]);

    // Filtrar por projeto se necessário
    const assets = projectId 
      ? allAssets.filter(a => allMigrationPlans.some(p => p.roadmap_project_id === projectId && p.asset_id === a.id))
      : allAssets;
    
    const migrationPlans = projectId
      ? allMigrationPlans.filter(p => p.roadmap_project_id === projectId)
      : allMigrationPlans;


    // 2. Processamento O(N) em uma única passagem
    const stats = {
      totalRoadmaps: roadmaps.length,
      totalAssets: assets.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      outOfSupport: 0,
      next180Days: 0,
      totalServers: 0,
      totalWorkstations: 0,
      totalCategories: categories.length,
      estimatedBudget: 0
    };

    // Mapeamento de criticidade para o gráfico
    const criticalityCounts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    
    // Mapeamento de status para o gráfico
    const statusCounts: Record<string, number> = {};
    
    // Mapeamento de categorias para o gráfico
    const categoryCounts: Record<string, number> = {};
    
    // Timeline de EoL
    const timelineMap: Record<string, number> = {};

    const today = new Date();
    const next180Days = new Date();
    next180Days.setDate(today.getDate() + 180);

    // Processar Planos de Migração O(N)
    migrationPlans.forEach(p => {
      // KPIs de Prioridade
      if (p.priority === 'critical') stats.critical++;
      if (p.priority === 'high') stats.high++;
      if (p.priority === 'medium') stats.medium++;
      if (p.priority === 'low') stats.low++;

      criticalityCounts[p.priority] = (criticalityCounts[p.priority] || 0) + 1;
      
      // Status
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;

      // Orçamento
      stats.estimatedBudget += (Number(p.estimated_cost) || 0);

      // Timeline & Out of Support
      if (p.recommended_start_date) {
        const date = new Date(p.recommended_start_date);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        timelineMap[key] = (timelineMap[key] || 0) + 1;

        if (date < today) stats.outOfSupport++;
        if (date > today && date <= next180Days) stats.next180Days++;
      }
    });

    // Processar Ativos O(N)
    assets.forEach(a => {
      if (a.device_type === 'server') stats.totalServers++;
      if (a.device_type === 'workstation') stats.totalWorkstations++;

      const cat = a.asset_categories?.name || 'Uncategorized';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    // 3. Formatação para o Frontend (Gráficos)
    const riskData = [
      { name: 'Critical', value: criticalityCounts.critical, color: '#ef4444' },
      { name: 'High', value: criticalityCounts.high, color: '#f97316' },
      { name: 'Medium', value: criticalityCounts.medium, color: '#eab308' },
      { name: 'Low', value: criticalityCounts.low, color: '#22c55e' },
    ].filter(d => d.value > 0);

    const colors: Record<string, string> = {
      planned: '#94a3b8',
      testing: '#8b5cf6',
      pilot: '#06b6d4',
      in_progress: '#3b82f6',
      completed: '#22c55e',
      blocked: '#ef4444'
    };

    const statusData = Object.entries(statusCounts).map(([s, value]) => ({
      name: s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' '),
      value,
      color: colors[s] || '#ccc'
    })).filter(d => d.value > 0);

    const categoryData = Object.entries(categoryCounts).map(([name, value]) => ({ name, value }));

    const timelineData = Object.entries(timelineMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, value]) => ({ name, value }));

    // 4. Insights Determinísticos
    const insights = deterministicEngineService.getExecutiveInsights(stats, migrationPlans);

    return {
      stats,
      riskData,
      statusData,
      categoryData,
      timelineData,
      insights
    };
  }
};

