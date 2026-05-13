import { supabase } from '@/lib/supabase';
import type { AssetCategory } from '@/types';

export const categoryService = {
  async getAll() {
    console.log("Iniciando busca de categorias...");
    const { data, error } = await supabase
      .from('asset_categories')
      .select('*')
      .order('name');
    
    if (error) {
      console.error("Erro Supabase (Categorias):", error);
      throw error;
    }
    
    console.log("Categorias retornadas:", data);
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
  },

  async seed() {
    const defaultCategories = [
      { name: 'Operating Systems', icon: 'monitor', color: '#3b82f6', description: 'Sistemas Operacionais' },
      { name: 'Software Licenses', icon: 'key', color: '#ef4444', description: 'Licenciamento' },
      { name: 'Computers', icon: 'laptop', color: '#10b981', description: 'Workstations e Laptops' },
      { name: 'Servers', icon: 'server', color: '#8b5cf6', description: 'Servidores Físicos e Virtuais' },
      { name: 'Network Equipment', icon: 'network', color: '#06b6d4', description: 'Switches e Roteadores' },
      { name: 'Storage', icon: 'database', color: '#f97316', description: 'HDDs, SSDs e Storage' },
    ];

    const { data, error } = await supabase
      .from('asset_categories')
      .insert(defaultCategories)
      .select();

    if (error) throw error;
    return data;
  }
};
