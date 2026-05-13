import { supabase } from '@/lib/supabase';
import type { Asset } from '@/types';

export const assetService = {
  async getAll() {
    const { data, error } = await supabase
      .from('assets')
      .select('*, asset_categories(*), lifecycle_catalog(*), applications(*)')
      .order('hostname');
    if (error) throw error;
    return data as Asset[];
  },

  async create(asset: Omit<Asset, 'id' | 'created_at' | 'updated_at' | 'asset_categories' | 'lifecycle_catalog' | 'applications'>) {
    const { data, error } = await supabase
      .from('assets')
      .insert([asset])
      .select()
      .single();
    if (error) throw error;
    return data as Asset;
  },

  async update(id: string, asset: Partial<Asset>) {
    const { data, error } = await supabase
      .from('assets')
      .update(asset)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Asset;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('assets')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async bulkCreate(assets: any[]) {
    const { data, error } = await supabase
      .from('assets')
      .insert(assets)
      .select();
    if (error) throw error;
    return data;
  }
};
