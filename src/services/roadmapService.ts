import { supabase } from '@/lib/supabase';
import type { RoadmapProject } from '@/types';
import { userService } from './userService';

export interface RoadmapPageParams {
  limit?: number;
  offset?: number;
  cursor?: string;
  filters?: Record<string, any>;
  organizationId?: string;
}

export const roadmapService = {
  /**
   * @deprecated Use getPage() or async export jobs. This method is tenant-safe but not scale-safe.
   */
  async getAll_DEPRECATED() {
    console.warn('DEPRECATED: getAll_DEPRECATED called in roadmapService. Use getPage() instead.');
    const profile = await userService.getProfile();
    const orgId = profile?.organization_id;
    if (!orgId) throw new Error("Unauthorized: organization_id is missing.");

    const { data, error } = await supabase
      .from('roadmap_projects')
      .select('*, migration_plans(priority, estimated_cost)')
      .eq('organization_id', orgId)
      .limit(1000)
      .order('created_at', { ascending: false });
    
    if (error) throw error;

    return (data || []).map(project => {
      const plans = (project.migration_plans as unknown as any[]) || [];
      return {
        ...project,
        total_migration_plans: plans.length > 0 ? plans.length : 0,
        total_assets: plans.length,
        critical_count: plans.filter(p => p.priority === 'critical').length,
        estimated_budget: plans.reduce((acc: number, p) => acc + (Number(p.estimated_cost) || 0), 0)
      };
    }) as RoadmapProject[];
  },

  async getPage({ limit = 100, offset = 0, organizationId, filters }: RoadmapPageParams) {
    let orgId = organizationId;
    if (!orgId) {
      const profile = await userService.getProfile();
      orgId = profile?.organization_id;
    }
    if (!orgId) throw new Error("Unauthorized: organization_id is missing.");

    const maxLimit = Math.min(limit, 500);

    let query = supabase
      .from('roadmap_projects')
      .select('id, name, category, scope, status, description, owner, start_date, end_date, revision_version, organization_id, created_at, updated_at', { count: 'exact' })
      .eq('organization_id', orgId);

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            query = query.ilike(key, `%${value}%`);
        }
      });
    }

    const { data, count, error } = await query
      .range(offset, offset + maxLimit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return {
      data: data as RoadmapProject[],
      count: count || 0,
      page: Math.floor(offset / maxLimit) + 1,
      hasMore: (count || 0) > offset + maxLimit
    };
  },

  async create(project: Partial<RoadmapProject>) {
    const profile = await userService.getProfile();
    const orgId = profile?.organization_id;
    if (!orgId) throw new Error("Unauthorized: organization_id is missing.");

    const { name, category, scope, status, description, owner, start_date, end_date } = project;
    const payload = Object.fromEntries(
      Object.entries({ name, category, scope, status, description, owner, start_date, end_date }).filter(([_, v]) => v !== undefined)
    );

    const { data, error } = await supabase
      .from('roadmap_projects')
      .insert([{
        ...payload,
        organization_id: orgId,
        revision_version: 1
      }])
      .select()
      .single();

    if (error) throw error;
    return data as RoadmapProject;
  },

  async update(id: string, project: Partial<RoadmapProject> & { revision_version: number }) {
    const profile = await userService.getProfile();
    const orgId = profile?.organization_id;
    if (!orgId) throw new Error("Unauthorized: organization_id is missing.");
    if (project.revision_version === undefined) throw new Error("ConflictError: revision_version is required for updates.");

    const currentRevision = project.revision_version;

    const { name, category, scope, status, description, owner, start_date, end_date } = project;
    const payload: any = Object.fromEntries(
      Object.entries({ name, category, scope, status, description, owner, start_date, end_date }).filter(([_, v]) => v !== undefined)
    );
    payload.revision_version = currentRevision + 1;
    payload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('roadmap_projects')
      .update(payload)
      .eq('id', id)
      .eq('organization_id', orgId)
      .eq('revision_version', currentRevision)
      .select()
      .single();

    if (error) {
       if (error.code === 'PGRST116') {
           throw new Error("ConflictError: Este registro foi alterado por outro usuário. Atualize os dados antes de continuar.");
       }
       throw error;
    }
    return data as RoadmapProject;
  },

  async delete(id: string) {
    const profile = await userService.getProfile();
    const orgId = profile?.organization_id;
    if (!orgId) throw new Error("Unauthorized: organization_id is missing.");

    // Verifica propriedade antes de deletar filhos
    const { data: proj, error: projError } = await supabase.from('roadmap_projects').select('id').eq('id', id).eq('organization_id', orgId).single();
    if (projError || !proj) throw new Error("Unauthorized or project not found");

    // Apaga dependências para evitar erro de Foreign Key
    // Precisa verificar orgId no plano de migração também (defense in depth), mas como fk tem cascade no DB? Se nao tiver, temos q forçar.
    await supabase.from('migration_plans').delete().eq('roadmap_project_id', id);

    const { error } = await supabase
      .from('roadmap_projects')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);
    if (error) throw error;
  }
};
