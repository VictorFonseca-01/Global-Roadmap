import { supabase } from '@/lib/supabase';
import { roadmapService } from './roadmapService';
import { deterministicEngineService } from './deterministicEngineService';
import { auditService } from './auditService';
import { differenceInDays, addDays, parseISO } from 'date-fns';
import { parseOsFromText } from './importService';
import { geminiService } from './geminiService';

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
      status: 'in_progress',
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

  async repairMissingAssetRelations(): Promise<number> {
    try {
      console.log('[Auto-Repair] Iniciando verificação de ativos órfãos...');
      
      // 1. Obter organização ativa
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      let organizationId = "d290f1ee-6c54-4b01-90e6-d701748f0851"; // Fallback default
      
      if (userId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', userId)
          .maybeSingle();
        if (profile?.organization_id) {
          organizationId = profile.organization_id;
        }
      }

      // 2. Buscar ativos que não têm categoria ou lifecycle associados
      const { data: orphanedAssets, error: fetchError } = await supabase
        .from('assets')
        .select('*')
        .or('category_id.is.null,lifecycle_id.is.null')
        .eq('organization_id', organizationId);

      if (fetchError) throw fetchError;
      if (!orphanedAssets || orphanedAssets.length === 0) {
        console.log('[Auto-Repair] Nenhum ativo órfão encontrado.');
        return 0;
      }

      console.log(`[Auto-Repair] Encontrados ${orphanedAssets.length} ativos órfãos. Iniciando reparo...`);

      // 3. Buscar categorias para mapeamento
      const { data: categories } = await supabase
        .from('asset_categories')
        .select('*');

      const serverCategory = categories?.find(c => c.name === 'Servers');
      const computerCategory = categories?.find(c => c.name === 'Computers');
      const osCategory = categories?.find(c => c.name === 'Operating Systems');

      let repairedCount = 0;

      // 4. Agrupar por assinatura única de OS para otimizar chamadas de IA/Enriquecimento
      const uniqueSignatures = new Map<string, { vendor: string; product: string; version: string }>();
      
      for (const asset of orphanedAssets) {
        const parsed = parseOsFromText(asset.hostname);
        const signature = `${parsed.vendor}|${parsed.product}|${parsed.version}`.toLowerCase();
        if (!uniqueSignatures.has(signature)) {
          uniqueSignatures.set(signature, parsed);
        }
      }

      // 5. Enriquecer assinaturas únicas em lote
      console.log(`[Auto-Repair] Processando ${uniqueSignatures.size} assinaturas de OS exclusivas...`);
      const enrichedMap = new Map<string, string>(); // assinatura -> lifecycle_id

      for (const [sig, parsed] of uniqueSignatures.entries()) {
        try {
          // Isso chama a IA ou o fallback local e persiste no banco
          await geminiService.enrichLifecycle(parsed.vendor, parsed.product, parsed.version);
          
          // Buscar o registro criado no banco para obter o id
          const { data: catalogItem } = await supabase
            .from('lifecycle_catalog')
            .select('id')
            .eq('vendor', parsed.vendor)
            .eq('product_name', parsed.product)
            .eq('version', parsed.version)
            .eq('organization_id', organizationId)
            .limit(1)
            .maybeSingle();

          if (catalogItem?.id) {
            enrichedMap.set(sig, catalogItem.id);
            
            // Opcional: Atualizar a categoria do item de catálogo se estiver nula
            if (osCategory?.id) {
              await supabase
                .from('lifecycle_catalog')
                .update({ category_id: osCategory.id })
                .eq('id', catalogItem.id);
            }
          }
        } catch (err) {
          console.error(`[Auto-Repair] Falha ao enriquecer OS "${sig}":`, err);
        }
      }

      // 6. Atualizar cada ativo órfão com o lifecycle_id e category_id corretos
      for (const asset of orphanedAssets) {
        const parsed = parseOsFromText(asset.hostname);
        const signature = `${parsed.vendor}|${parsed.product}|${parsed.version}`.toLowerCase();
        const lifecycleId = enrichedMap.get(signature);

        let categoryId = asset.category_id;
        if (!categoryId) {
          if (asset.device_type === 'server') {
            categoryId = serverCategory?.id || null;
          } else {
            categoryId = computerCategory?.id || null;
          }
        }

        if (lifecycleId || categoryId) {
          const { error: updateError } = await supabase
            .from('assets')
            .update({
              category_id: categoryId,
              lifecycle_id: lifecycleId || asset.lifecycle_id,
              updated_at: new Date().toISOString()
            })
            .eq('id', asset.id);

          if (updateError) {
            console.error(`[Auto-Repair] Erro ao atualizar ativo ${asset.hostname}:`, updateError);
          } else {
            repairedCount++;
          }
        }
      }

      console.log(`[Auto-Repair] Concluído! ${repairedCount} de ${orphanedAssets.length} ativos reparados.`);
      
      // Registrar log de auditoria
      if (repairedCount > 0) {
        await auditService.log({
          action: 'REPAIR_ASSETS',
          entity_type: 'assets',
          description: `Auto-reparo automático executado. ${repairedCount} ativos órfãos mapeados com categoria/lifecycle com sucesso.`,
          metadata: { total_orphaned: orphanedAssets.length, repaired_count: repairedCount }
        });
      }

      return repairedCount;
    } catch (error) {
      console.error('[Auto-Repair] Erro geral na rotina de auto-reparo:', error);
      return 0;
    }
  },

  async generate(projectId: string, selectedSos?: string[], safetyMarginDays?: number) {
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
      // 0. Auto-reparar ativos com categoria/lifecycle faltantes antes de gerar o roadmap
      await this.repairMissingAssetRelations().catch(err => 
        console.error('[Auto-Repair-Trigger] Erro no trigger automático:', err)
      );

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

      // Filtrar assets com base nos SOs selecionados
      const filteredAssets = assets.filter(asset => {
        const lifecycle = asset.lifecycle_catalog;
        if (!lifecycle) return false;
        
        if (selectedSos && selectedSos.length > 0) {
          const soName = `${lifecycle.vendor || ''} ${lifecycle.product_name} ${lifecycle.version || ''}`.replace(/\s+/g, ' ').trim().toLowerCase();
          // Verifica se o SO do asset bate com algum dos SOs selecionados
          return selectedSos.some(so => {
            const cleanSo = so.trim().toLowerCase();
            return soName.includes(cleanSo) || cleanSo.includes(soName);
          });
        }
        return true;
      });

      if (filteredAssets.length === 0) {
        results.errors.push(`Nenhum ativo corresponde aos Sistemas Operacionais selecionados.`);
        return results;
      }

      // 4. Preparar planos de migração
      const plansToUpsert = [];

      for (const asset of filteredAssets) {
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

        // Aplicar a folga de segurança subtraindo dias do EoL original para fins de planejamento
        let plannedEol = lifecycle.end_of_support;
        if (safetyMarginDays && safetyMarginDays > 0) {
          const originalEolDate = parseISO(lifecycle.end_of_support);
          const adjustedEolDate = addDays(originalEolDate, -safetyMarginDays);
          plannedEol = adjustedEolDate.toISOString().split('T')[0];
        }

        const priority = deterministicEngineService.calculatePriority(plannedEol, asset.business_criticality);
        const window = deterministicEngineService.calculateMigrationWindow(plannedEol);
        
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
          ) + (safetyMarginDays ? ` [Planejado com folga de segurança de ${safetyMarginDays} dias]` : ''),
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
        description: `Roadmap gerado: ${results.createdCount} planos criados, ${results.skippedCount} pulados. Filtros: SOs=${selectedSos?.join(', ') || 'Nenhum'}, Folga=${safetyMarginDays || 0}d.`,
        metadata: { ...results, selectedSos, safetyMarginDays }
      });

      return results;
    } catch (error: any) {
      console.error('Erro na geração do roadmap:', error);
      results.errors.push(error.message);
      return results;
    }
  }
};
