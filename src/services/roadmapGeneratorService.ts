import { supabase } from '@/lib/supabase';
import { roadmapService } from './roadmapService';
import { deterministicEngineService } from './deterministicEngineService';
import { auditService } from './auditService';
import { differenceInDays } from 'date-fns';

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

    // 2. Chamar a geração para o projeto recém criado
    const results = await this.generate(project.id);
    
    return {
      project,
      results
    };
  },

  async generate(projectId: string) {
    const today = new Date();
    const results = {
      success: false,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      notificationsCreated: 0,
      errors: [] as string[],
      skippedReasons: {} as Record<string, number>
    };

    try {
      // 1. Buscar detalhes do projeto
      const { data: project, error: projectError } = await supabase
        .from('roadmap_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError || !project) throw new Error('Projeto não encontrado');

      // 2. Mapear nome da categoria para ID
      const { data: categories } = await supabase.from('asset_categories').select('*');
      const targetCategory = categories?.find(c => c.name === project.category);
      
      // 3. Buscar Ativos Elegíveis
      let query = supabase.from('assets').select('*, asset_categories(*), lifecycle_catalog(*), applications(*)');
      
      if (targetCategory) {
        query = query.eq('category_id', targetCategory.id);
      }

      const { data: assets, error: assetsError } = await query;
      if (assetsError) throw assetsError;

      if (!assets || assets.length === 0) {
        results.errors.push(`Nenhum ativo encontrado para a categoria "${project.category}".`);
        return results;
      }

      // 4. Preparar planos de migração
      const plansToUpsert = [];

      for (const asset of assets) {
        const lifecycle = asset.lifecycle_catalog;
        
        if (!lifecycle) {
          results.skippedCount++;
          results.skippedReasons['Sem catálogo de lifecycle'] = (results.skippedReasons['Sem catálogo de lifecycle'] || 0) + 1;
          continue;
        }

        if (!lifecycle.end_of_support) {
          results.skippedCount++;
          results.skippedReasons['Sem data de End of Support (EoL)'] = (results.skippedReasons['Sem data de End of Support (EoL)'] || 0) + 1;
          continue;
        }

        const priority = deterministicEngineService.calculatePriority(lifecycle.end_of_support, asset.business_criticality);
        const window = deterministicEngineService.calculateMigrationWindow(lifecycle.end_of_support);
        
        plansToUpsert.push({
          roadmap_project_id: projectId,
          asset_id: asset.id,
          priority: priority,
          risk_level: priority === 'critical' ? 'high' : 'low',
          status: 'planned',
          recommended_start_date: window.start,
          planned_start_date: window.start,
          planned_end_date: window.end,
          justification: deterministicEngineService.generateJustification(
            priority,
            lifecycle.product_name,
            lifecycle.version || '',
            lifecycle.end_of_support
          ),
          estimated_cost: asset.device_type === 'server' ? 5000 : 1200
        });
      }

      // 5. Salvar Planos
      if (plansToUpsert.length > 0) {
        // Limpar planos antigos do projeto
        await supabase.from('migration_plans').delete().eq('roadmap_project_id', projectId);

        const { error: insertError } = await supabase
          .from('migration_plans')
          .insert(plansToUpsert);

        if (insertError) throw insertError;

        results.createdCount = plansToUpsert.length;
        results.success = true;

        // 6. Criar Notificações com severidade refinada
        for (const plan of plansToUpsert) {
          const { data: user } = await supabase.auth.getUser();
          if (user?.user) {
            const eolDate = new Date(assets.find(a => a.id === plan.asset_id)?.lifecycle_catalog?.end_of_support || '');
            const daysRemaining = differenceInDays(eolDate, today);
            
            let severity: 'critical' | 'warning' | 'info' = 'info';
            if (daysRemaining <= 90) severity = 'critical';
            else if (daysRemaining <= 180) severity = 'warning';
            else if (daysRemaining <= 365) severity = 'info';

            await supabase.from('notifications').insert({
              user_id: user.user.id,
              type: 'lifecycle_warning',
              priority: plan.priority,
              severity: severity,
              title: `Planejamento de Migração: ${assets.find(a => a.id === plan.asset_id)?.hostname}`,
              description: `O ativo atingirá o EoL em ${eolDate.toLocaleDateString()}. Prioridade ${plan.priority.toUpperCase()}.`,
              metadata: { asset_id: plan.asset_id, project_id: projectId }
            });
            results.notificationsCreated++;
          }
        }
      }

      // 7. Auditoria
      await auditService.log({
        action: 'GENERATE_ROADMAP',
        entity_type: 'roadmap_projects',
        entity_id: projectId,
        description: `Roadmap gerado: ${results.createdCount} planos criados, ${results.skippedCount} pulados.`,
        metadata: results
      });

      return results;
    } catch (error: any) {
      console.error('Erro na geração do roadmap:', error);
      results.errors.push(error.message);
      return results;
    }
  }
};
