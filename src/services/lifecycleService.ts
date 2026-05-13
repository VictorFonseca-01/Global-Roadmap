import { supabase } from '@/lib/supabase';
import type { LifecycleItem } from '@/types';

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
