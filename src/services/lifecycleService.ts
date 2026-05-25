import { supabase } from '@/lib/supabase';
import type { LifecycleItem } from '@/types';
import { geminiService } from './geminiService';
import { userService } from './userService';

export interface LifecyclePageParams {
  limit?: number;
  offset?: number;
  cursor?: string;
  filters?: Record<string, any>;
  organizationId?: string;
}

export const lifecycleService = {
  /**
   * @deprecated Use getPage() or async export jobs. This method is tenant-safe but not scale-safe.
   */
  async getAll_DEPRECATED() {
    console.warn('DEPRECATED: getAll_DEPRECATED called in lifecycleService. Use getPage() instead.');
    const profile = await userService.getProfile();
    if (!profile?.organization_id) throw new Error("Unauthorized: organization_id is missing.");

    const { data, error } = await supabase
      .from('lifecycle_catalog')
      .select('*, asset_categories(*)')
      .eq('organization_id', profile.organization_id)
      .limit(1000)
      .order('vendor')
      .order('product_name');
    if (error) throw error;
    return data as LifecycleItem[];
  },

  async getPage({ limit = 100, offset = 0, organizationId, filters }: LifecyclePageParams) {
    let orgId = organizationId;
    if (!orgId) {
      const profile = await userService.getProfile();
      orgId = profile?.organization_id;
    }
    if (!orgId) throw new Error("Unauthorized: organization_id is missing.");

    const maxLimit = Math.min(limit, 500);

    let query = supabase
      .from('lifecycle_catalog')
      .select('id, vendor, product_name, version, asset_type, end_of_support, extended_support, replacement_available, successor_version, reference_url, reliability_score, verification_status, last_verified_at, expires_at, revision_version, organization_id, created_at, updated_at', { count: 'exact' })
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

  async enrichAllPending() {
    const profile = await userService.getProfile();
    if (!profile?.organization_id) throw new Error("Unauthorized: organization_id is missing.");

    const { data: pending } = await supabase
      .from('lifecycle_catalog')
      .select('*, asset_categories(name)')
      .eq('organization_id', profile.organization_id)
      .or(`last_verified_at.is.null,expires_at.lt.${new Date().toISOString()}`);

    if (!pending || pending.length === 0) return 0;

    console.log(`[Lifecycle] Enriquecendo ${pending.length} itens pendentes...`);
    
    const results = await Promise.all(pending.map(item => 
      geminiService.enrichLifecycle(
        item.vendor, 
        item.product_name, 
        item.version || '', 
        (item.asset_categories as any)?.name
      ).catch(err => console.error(`Erro ao enriquecer ${item.product_name}:`, err))
    ));

    return results.filter(Boolean).length;
  },

  async create(item: Omit<LifecycleItem, 'id' | 'created_at' | 'updated_at' | 'asset_categories'>) {
    const profile = await userService.getProfile();
    if (!profile?.organization_id) throw new Error("Unauthorized: organization_id is missing.");

    const { data, error } = await supabase
      .from('lifecycle_catalog')
      .insert([{
        ...item,
        organization_id: profile.organization_id,
        revision_version: 1
      }])
      .select()
      .single();
    if (error) throw error;
    return data as LifecycleItem;
  },

  async update(id: string, item: Partial<LifecycleItem> & { revision_version: number }) {
    const profile = await userService.getProfile();
    if (!profile?.organization_id) throw new Error("Unauthorized: organization_id is missing.");
    if (item.revision_version === undefined) throw new Error("ConflictError: revision_version is required for updates.");

    const currentRevision = item.revision_version;
    const updates: any = { ...item };
    delete updates.revision_version;
    updates.revision_version = currentRevision + 1;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('lifecycle_catalog')
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
    return data as LifecycleItem;
  },

  async delete(id: string) {
    const profile = await userService.getProfile();
    if (!profile?.organization_id) throw new Error("Unauthorized: organization_id is missing.");

    const { error } = await supabase
      .from('lifecycle_catalog')
      .delete()
      .eq('id', id)
      .eq('organization_id', profile.organization_id);
    if (error) throw error;
  }
};
