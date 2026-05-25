import { supabase } from '@/lib/supabase';
import type { MigrationPlan } from '@/types';
import { userService } from './userService';

export interface MigrationPlanPageParams {
  limit?: number;
  offset?: number;
  cursor?: string;
  filters?: Record<string, any>;
  organizationId?: string;
}

export const migrationPlanService = {
  /**
   * @deprecated Use getPage() or async export jobs. This method is tenant-safe but not scale-safe.
   */
  async getAll_DEPRECATED() {
    console.warn('DEPRECATED: getAll_DEPRECATED called in migrationPlanService. Use getPage() instead.');
    const profile = await userService.getProfile();
    if (!profile?.organization_id) throw new Error("Unauthorized: organization_id is missing.");

    const { data, error } = await supabase
      .from('migration_plans')
      .select('*, assets(*, lifecycle_catalog(*)), roadmap_projects(*)')
      .eq('organization_id', profile.organization_id)
      .limit(1000)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as MigrationPlan[];
  },

  async getPage({ limit = 100, offset = 0, organizationId, filters }: MigrationPlanPageParams) {
    let orgId = organizationId;
    if (!orgId) {
      const profile = await userService.getProfile();
      orgId = profile?.organization_id;
    }
    if (!orgId) throw new Error("Unauthorized: organization_id is missing.");

    const maxLimit = Math.min(limit, 500);

    let query = supabase
      .from('migration_plans')
      .select('*, assets(*, lifecycle_catalog(*)), roadmap_projects(*)', { count: 'exact' })
      .eq('organization_id', orgId);

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            query = query.eq(key, value);
        }
      });
    }

    const { data, count, error } = await query
      .range(offset, offset + maxLimit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return {
      data: data as any[],
      count: count || 0,
      page: Math.floor(offset / maxLimit) + 1,
      hasMore: (count || 0) > offset + maxLimit
    };
  },

  async create(plan: Omit<MigrationPlan, 'id' | 'created_at' | 'updated_at' | 'assets' | 'roadmap_projects'>) {
    const profile = await userService.getProfile();
    if (!profile?.organization_id) throw new Error("Unauthorized: organization_id is missing.");

    const { data, error } = await supabase
      .from('migration_plans')
      .insert([{
        ...plan,
        organization_id: profile.organization_id,
        revision_version: 1
      }])
      .select()
      .single();
    if (error) throw error;

    await supabase.from('timeline_change_log').insert([{
      organization_id: profile.organization_id,
      entity_type: 'migration_plan',
      entity_id: data.id,
      action: 'CREATE',
      after_state: data,
      changed_by: profile.id
    }]);

    return data as MigrationPlan;
  },

  async update(id: string, plan: Partial<MigrationPlan> & { revision_version: number }) {
    const profile = await userService.getProfile();
    if (!profile?.organization_id) throw new Error("Unauthorized: organization_id is missing.");
    if (plan.revision_version === undefined) throw new Error("ConflictError: revision_version is required for updates.");

    const currentRevision = plan.revision_version;
    const updates: any = { ...plan };
    delete updates.revision_version;
    updates.revision_version = currentRevision + 1;
    updates.updated_at = new Date().toISOString();

    const { data: beforeData } = await supabase.from('migration_plans').select('*').eq('id', id).single();

    const { data, error } = await supabase
      .from('migration_plans')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .eq('revision_version', currentRevision)
      .select()
      .single();

    if (error) {
       if (error.code === 'PGRST116') {
           throw new Error("ConflictError: Este registro foi alterado por outro usuário. Atualize os dados antes de continuar.");
       }
       throw error;
    }

    await supabase.from('timeline_change_log').insert([{
      organization_id: profile.organization_id,
      entity_type: 'migration_plan',
      entity_id: id,
      action: 'UPDATE',
      before_state: beforeData,
      after_state: data,
      changed_by: profile.id
    }]);

    return data as MigrationPlan;
  },

  async delete(id: string) {
    const profile = await userService.getProfile();
    if (!profile?.organization_id) throw new Error("Unauthorized: organization_id is missing.");

    const { data: beforeData } = await supabase.from('migration_plans').select('*').eq('id', id).single();

    const { error } = await supabase
      .from('migration_plans')
      .delete()
      .eq('id', id)
      .eq('organization_id', profile.organization_id);
    if (error) throw error;

    if (beforeData) {
      await supabase.from('timeline_change_log').insert([{
        organization_id: profile.organization_id,
        entity_type: 'migration_plan',
        entity_id: id,
        action: 'DELETE',
        before_state: beforeData,
        changed_by: profile.id
      }]);
    }
  },

  async bulkCreate(plans: any[]) {
    const profile = await userService.getProfile();
    if (!profile?.organization_id) throw new Error("Unauthorized: organization_id is missing.");

    const withOrg = plans.map(p => ({
        ...p, 
        organization_id: profile.organization_id,
        revision_version: 1
    }));

    const { data, error } = await supabase
      .from('migration_plans')
      .insert(withOrg)
      .select();
    if (error) throw error;
    return data;
  },

  async bulkUpdate(plans: Array<Partial<MigrationPlan> & { id: string, revision_version: number }>) {
    const profile = await userService.getProfile();
    if (!profile?.organization_id) throw new Error("Unauthorized: organization_id is missing.");

    const conflicts: any[] = [];
    const successes: any[] = [];

    // Processar em chunks para evitar bloqueio pesado (chunk de 50)
    const chunkSize = 50;
    for (let i = 0; i < plans.length; i += chunkSize) {
      const chunk = plans.slice(i, i + chunkSize);
      
      const promises = chunk.map(async (plan) => {
        try {
          const currentRevision = plan.revision_version;
          if (currentRevision === undefined) throw new Error("revision_version missing");

          const updates: any = { ...plan };
          delete updates.revision_version;
          updates.revision_version = currentRevision + 1;
          updates.updated_at = new Date().toISOString();

          const { data, error } = await supabase
            .from('migration_plans')
            .update(updates)
            .eq('id', plan.id)
            .eq('organization_id', profile.organization_id)
            .eq('revision_version', currentRevision)
            .select()
            .single();

          if (error || !data) {
             conflicts.push(plan.id);
          } else {
             successes.push(data);
          }
        } catch (e) {
          conflicts.push(plan.id);
        }
      });

      await Promise.all(promises);
    }

    if (successes.length > 0) {
      // Log single bulk action event instead of one per row
      await supabase.from('timeline_change_log').insert([{
        organization_id: profile.organization_id,
        entity_type: 'migration_plan',
        entity_id: successes[0].id, // tracking reference
        action: 'BULK_UPDATE',
        after_state: { success_count: successes.length, conflict_count: conflicts.length },
        changed_by: profile.id
      }]);
    }

    if (conflicts.length > 0) {
      throw new Error(`ConflictError: ${conflicts.length} itens foram alterados por outro usuário ou falharam.`);
    }

    return successes;
  }
};
