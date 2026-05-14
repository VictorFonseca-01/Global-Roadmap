import { supabase } from '@/lib/supabase';
import type { LifecycleItem } from '@/types';
import { geminiService } from './geminiService';

export const lifecycleService = {
  async getAll() {
    const { data, error } = await supabase
      .from('lifecycle_catalog')
      .select('*, asset_categories(*)')
      .order('vendor')
      .order('product_name');
    if (error) throw error;
    return data as LifecycleItem[];
  },

  async enrichAllPending() {
    // Buscar itens que nunca foram verificados ou cuja verificação expirou
    const { data: pending } = await supabase
      .from('lifecycle_catalog')
      .select('*, asset_categories(name)')
      .or(`last_verified_at.is.null,expires_at.lt.${new Date().toISOString()}`);

    if (!pending || pending.length === 0) return 0;

    console.log(`[Lifecycle] Enriquecendo ${pending.length} itens pendentes...`);
    
    const results = await Promise.all(pending.map(item => 
      geminiService.enrichLifecycle(
        item.vendor, 
        item.product_name, 
        item.version || '', 
        item.asset_categories?.name
      ).catch(err => console.error(`Erro ao enriquecer ${item.product_name}:`, err))
    ));

    return results.filter(Boolean).length;
  },

  async create(item: Omit<LifecycleItem, 'id' | 'created_at' | 'updated_at' | 'asset_categories'>) {
    const { data, error } = await supabase
      .from('lifecycle_catalog')
      .insert([item])
      .select()
      .single();
    if (error) throw error;
    return data as LifecycleItem;
  },

  async update(id: string, item: Partial<LifecycleItem>) {
    const { data, error } = await supabase
      .from('lifecycle_catalog')
      .update(item)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as LifecycleItem;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('lifecycle_catalog')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

