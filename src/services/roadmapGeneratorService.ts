import { supabase } from '@/lib/supabase';
import { assetService } from './assetService';
import { roadmapService } from './roadmapService';
import { deterministicEngineService } from './deterministicEngineService';

export const roadmapGeneratorService = {
  async generateAuto(params: {
    name: string;
    category: string;
    scope: string;
    horizon: 12 | 24 | 36;
    filters?: {
      department?: string;
      device_type?: string;
      priority?: string;
    }
  }) {
    // 1. Criar o Projeto de Roadmap
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + params.horizon);
    
    const project = await roadmapService.create({
      name: params.name,
      category: params.category,
      scope: params.scope,
      status: 'active',
      start_date: startDate,
      end_date: endDate.toISOString().split('T')[0],
      owner: 'System Auto-Generator'
    });

    // 2. Buscar Ativos Elegíveis
    let assets = await assetService.getAll();
    
    // Aplicar filtros
    if (params.filters?.device_type) {
      assets = assets.filter(a => a.device_type === params.filters?.device_type);
    }
    
    // 3. Processar cada ativo e criar Migration Plans vinculados ao projeto
    const plansToCreate = assets.map(asset => {
      const eol = asset.lifecycle_catalog?.end_of_support || new Date().toISOString();
      const priority = deterministicEngineService.calculatePriority(eol);
      const recommendedDate = deterministicEngineService.calculateRecommendedStartDate(priority);
      const justification = deterministicEngineService.generateJustification(
        priority, 
        asset.lifecycle_catalog?.product_name || 'Asset', 
        asset.lifecycle_catalog?.version || '', 
        eol
      );
      
      return {
        roadmap_project_id: project.id,
        asset_id: asset.id,
        priority: priority,
        risk_level: 'low', // Default para automação inicial
        status: 'planned',
        recommended_start_date: recommendedDate,
        justification: justification,
        estimated_cost: asset.device_type === 'server' ? 5000 : 1200
      };
    });

    // 4. Salvar em lote
    if (plansToCreate.length > 0) {
      const { error } = await supabase
        .from('migration_plans')
        .insert(plansToCreate);
      
      if (error) throw error;
    }

    return project;
  }
};
