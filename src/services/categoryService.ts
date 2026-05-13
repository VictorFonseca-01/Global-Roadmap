import { supabase } from '@/lib/supabase';
import type { AssetCategory } from '@/types';

export const categoryService = {
  async getAll() {
    const { data, error } = await supabase
      .from('asset_categories')
      .select('*')
      .order('name');
    if (error) throw error;
    return data as AssetCategory[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('asset_categories')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as AssetCategory;
  },

  async create(category: Omit<AssetCategory, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('asset_categories')
      .insert([category])
      .select()
      .single();
    if (error) throw error;
    return data as AssetCategory;
  },

  async update(id: string, category: Partial<AssetCategory>) {
    const { data, error } = await supabase
      .from('asset_categories')
      .update(category)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as AssetCategory;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('asset_categories')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};
