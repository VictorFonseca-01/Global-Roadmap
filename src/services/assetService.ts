import { supabase } from '@/lib/supabase';
import type { Asset } from '@/types';
import { userService } from './userService';

export interface PageParams {
  limit?: number;
  offset?: number;
  cursor?: string;
  filters?: Record<string, any>;
  organizationId?: string;
}

export const assetService = {
  /**
   * @deprecated Use getPage() or async export jobs. This method is tenant-safe but not scale-safe.
   */
  async getAll_DEPRECATED() {
    console.warn('DEPRECATED: getAll_DEPRECATED called in assetService. Use getPage() instead.');
    const profile = await userService.getProfile();
    if (!profile?.organization_id) throw new Error("Unauthorized: organization_id is missing.");

    const { data, error } = await supabase
      .from('assets')
      .select('*, asset_categories(*), lifecycle_catalog(*), applications(*)')
      .eq('organization_id', profile.organization_id)
      .limit(2000)
      .order('hostname');
    if (error) throw error;
    return data as Asset[];
  },

  async getPage({ limit = 100, offset = 0, organizationId, filters }: PageParams) {
    let orgId = organizationId;
    if (!orgId) {
      const profile = await userService.getProfile();
      orgId = profile?.organization_id;
    }
    if (!orgId) throw new Error("Unauthorized: organization_id is missing.");

    const maxLimit = Math.min(limit, 500);

    let query = supabase
      .from('assets')
      .select('id, hostname, asset_tag, serial_number, device_type, os_name, os_version, vendor, model, status, notes, revision_version, organization_id, updated_at', { count: 'exact' })
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
      data: data as any[],
      count: count || 0,
      page: Math.floor(offset / maxLimit) + 1,
      hasMore: (count || 0) > offset + maxLimit
    };
  },

  async create(asset: Omit<Asset, 'id' | 'created_at' | 'updated_at' | 'asset_categories' | 'lifecycle_catalog' | 'applications'>) {
    const profile = await userService.getProfile();
    if (!profile?.organization_id) throw new Error("Unauthorized: organization_id is missing.");

    const { data, error } = await supabase
      .from('assets')
      .insert([{
        ...asset,
        organization_id: profile.organization_id,
        revision_version: 1
      }])
      .select()
      .single();
    if (error) throw error;
    return data as Asset;
  },

  async update(id: string, asset: Partial<Asset> & { revision_version: number }) {
    const profile = await userService.getProfile();
    if (!profile?.organization_id) throw new Error("Unauthorized: organization_id is missing.");
    if (asset.revision_version === undefined) throw new Error("ConflictError: revision_version is required for updates.");

    const currentRevision = asset.revision_version;
    const updates: any = { ...asset };
    delete updates.revision_version;
    updates.revision_version = currentRevision + 1;

    const { data, error } = await supabase
      .from('assets')
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
    return data as Asset;
  },

  async delete(id: string) {
    const profile = await userService.getProfile();
    if (!profile?.organization_id) throw new Error("Unauthorized: organization_id is missing.");

    const { error } = await supabase
      .from('assets')
      .delete()
      .eq('id', id)
      .eq('organization_id', profile.organization_id);
    if (error) throw error;
  },

  async bulkCreate(assets: any[]) {
    const profile = await userService.getProfile();
    if (!profile?.organization_id) throw new Error("Unauthorized: organization_id is missing.");

    const withOrg = assets.map(a => ({
        ...a, 
        organization_id: profile.organization_id,
        revision_version: 1
    }));

    const { data, error } = await supabase
      .from('assets')
      .insert(withOrg)
      .select();
    if (error) throw error;
    return data;
  }
};
