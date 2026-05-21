import { supabase } from '@/lib/supabase';
import { auditService } from './auditService';
import type { AIReviewData } from '@/types';
import { differenceInDays } from 'date-fns';

export const aiRoadmapGeneratorService = {
  async generateRoadmapFromAIReview(reviewData: AIReviewData) {
    const results = {
      success: false,
      roadmapProjectId: null as string | null,
      createdPlans: 0,
      updatedPlans: 0,
      notificationsCreated: 0,
      errors: [] as string[]
    };

    try {
      // 1. Validar usuário autenticado
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Usuário não autenticado");

      // 2 & 3. Validar permissão (can_generate_roadmaps) e resolver organization_id
      // Como organization_id foi padronizado para RLS/user_id, usamos o ID do usuário para owner
      const { data: profile } = await supabase.from('user_profiles').select('role, organization_id').eq('id', user.id).single();
      const role = profile?.role?.toLowerCase().replace(/\s+/g, '_') || '';
      const organizationId = profile?.organization_id;
      
      const allowedRoles = ['admin', 'director', 'manager', 'super_admin'];
      const canGenerateRoadmaps = allowedRoles.includes(role);
      
      if (!canGenerateRoadmaps) {
        const { telemetry } = await import('@/lib/telemetry');
        await telemetry.log('security_event', 'critical', 'Acesso negado (RBAC denied): tentativa de gerar roadmap sem permissão', { role, userId: user.id });
        throw new Error("Usuário não possui permissão (can_generate_roadmaps) para gerar roadmaps.");
      }

      // Buscar Categoria para linkar lifecycle
      const { data: categories } = await supabase.from('asset_categories').select('*').eq('name', reviewData.category).limit(1);
      const categoryId = categories && categories.length > 0 ? categories[0].id : null;
      
      // 4. Criar roadmap_project
      const { data: project, error: projError } = await supabase.from('roadmap_projects').insert({
        name: reviewData.project_name,
        category: reviewData.category,
        description: reviewData.description || null,
        status: 'draft',
        owner: user.id,
        organization_id: organizationId
      }).select().single();

      if (projError) throw projError;
      results.roadmapProjectId = project.id;

      // Iterar os dados revisados que são a FONTE DE VERDADE agora
      for (const item of reviewData.items) {
        
        // 5. Criar / Reutilizar lifecycle_catalog
        let lifecycleId = null;
        const { data: existingLifecycle } = await supabase
          .from('lifecycle_catalog')
          .select('id')
          .eq('vendor', item.vendor)
          .eq('product_name', item.product_name)
          .eq('version', item.version)
          .limit(1);

        if (existingLifecycle && existingLifecycle.length > 0) {
          lifecycleId = existingLifecycle[0].id;
        } else if (categoryId) {
          const { data: newLifecycle, error: lcError } = await supabase.from('lifecycle_catalog').insert({
            organization_id: organizationId,
            category_id: categoryId,
            vendor: item.vendor,
            product_name: item.product_name,
            version: item.version,
            asset_type: item.asset_type,
            end_of_support: item.end_of_support || null,
            successor_version: item.successor_version,
            verification_status: 'verified' // Como o usuário revisou, já entra como verificado
          }).select().single();
          if (!lcError && newLifecycle) {
            lifecycleId = newLifecycle.id;
          }
        }

        // Late-Binding e geração de planos para ativos reais (se existirem) ou ativo genérico (caso contrário)
        const activeAssetIds: string[] = [];

        if (lifecycleId && item.asset_ids && item.asset_ids.length > 0) {
          // 1. Vincular lifecycle_id aos ativos reais
          const { error: updateAssetError } = await supabase
            .from('assets')
            .update({ lifecycle_id: lifecycleId })
            .in('id', item.asset_ids);
          
          if (updateAssetError) {
            console.error('[RoadmapGenerator] Erro ao vincular assets:', updateAssetError);
          }
          activeAssetIds.push(...item.asset_ids);
        } else if (lifecycleId) {
          // Criar um "Asset" agrupador genérico se não houver ativos físicos
          const { data: newAsset, error: assetError } = await supabase.from('assets').insert({
            organization_id: organizationId,
            hostname: `${item.vendor} ${item.product_name} (${item.asset_type}) [Gerado IA]`,
            device_type: item.asset_type === 'client' ? 'workstation' : 'server',
            category_id: categoryId,
            lifecycle_id: lifecycleId,
            business_criticality: item.calculated_criticality || 'medium'
          }).select().single();
          if (!assetError && newAsset) {
            activeAssetIds.push(newAsset.id);
          }
        }

        // 6. Criar/atualizar migration_plans para todos os activeAssetIds
        const priority = item.calculated_criticality || 'medium';
        const riskLevel = priority === 'critical' || item.compatibility_risk === 'high' ? 'high' : 'low';
        const costPerAsset = activeAssetIds.length > 0 ? (item.estimated_cost / activeAssetIds.length) : item.estimated_cost;

        for (const targetAssetId of activeAssetIds) {
          let planExists = false;
          
          const { data: existingPlan } = await supabase.from('migration_plans')
            .select('id')
            .eq('roadmap_project_id', project.id)
            .eq('asset_id', targetAssetId)
            .limit(1);
            
          if (existingPlan && existingPlan.length > 0) {
            planExists = true;
            await supabase.from('migration_plans').update({
              priority,
              risk_level: riskLevel,
              estimated_cost: costPerAsset,
              recommended_start_date: item.recommended_start_date || new Date().toISOString().split('T')[0]
            }).eq('id', existingPlan[0].id);
            results.updatedPlans++;
          }

          if (!planExists) {
            const { error: planError } = await supabase.from('migration_plans').insert({
              organization_id: organizationId,
              roadmap_project_id: project.id,
              asset_id: targetAssetId,
              priority,
              risk_level: riskLevel,
              status: 'planned',
              recommended_start_date: item.recommended_start_date || new Date().toISOString().split('T')[0],
              estimated_cost: costPerAsset,
              justification: `AI Generated via Review. Compatibilidade: ${item.compatibility_risk}.`
            });

            if (planError) {
              results.errors.push(`Erro ao criar plano para asset ${targetAssetId}: ${planError.message}`);
            } else {
              results.createdPlans++;
            }
          }
        }

        // 7. Criar Notifications
        if (item.end_of_support) {
          const eolDate = new Date(item.end_of_support);
          const daysRemaining = differenceInDays(eolDate, new Date());
          
          let severity: 'critical' | 'warning' | 'info' | null = null;
          if (daysRemaining <= 0) severity = 'critical'; // Vencido
          else if (daysRemaining <= 90) severity = 'critical';
          else if (daysRemaining <= 180) severity = 'warning';

          if (severity) {
            // 9. Evitar duplicidade de notificação
            const { data: existingNotif } = await supabase.from('notifications')
              .select('id')
              .eq('user_id', user.id)
              .eq('type', 'lifecycle_warning')
              .eq('metadata->>lifecycle_id', lifecycleId)
              .gte('created_at', new Date().toISOString().split('T')[0]) // Hoje
              .limit(1);

            if (!existingNotif || existingNotif.length === 0) {
              await supabase.from('notifications').insert({
                organization_id: organizationId,
                user_id: user.id,
                type: 'lifecycle_warning',
                priority,
                severity,
                title: `Alerta EoL: ${item.product_name} v${item.version}`,
                description: daysRemaining < 0 
                  ? `Ativo está fora de suporte há ${Math.abs(daysRemaining)} dias!` 
                  : `Ativo perderá suporte em ${daysRemaining} dias.`,
                metadata: { lifecycle_id: lifecycleId, roadmap_id: project.id }
              });
              results.notificationsCreated++;
            }
          }
        }
      }

      // 8. Audit Logs
      await auditService.log({
        action: 'AI_ROADMAP_GENERATED',
        entity_type: 'roadmap_projects',
        entity_id: project.id,
        description: `Roadmap gerado via AI Review. Planos criados: ${results.createdPlans}. Planos atualizados: ${results.updatedPlans}. Notificações: ${results.notificationsCreated}.`,
        metadata: { ai_items_count: reviewData.items.length }
      });

      results.success = true;
      return results;

    } catch (error: any) {
      console.error("AI Roadmap Generator Error:", error);
      results.errors.push(error.message);
      return results;
    }
  }
};
