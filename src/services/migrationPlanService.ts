import { supabase } from '@/lib/supabase';
import type { MigrationPlan } from '@/types';

export const migrationPlanService = {
  async getAll() {
    const { data, error } = await supabase
      .from('migration_plans')
      .select('*, assets(*, lifecycle_catalog(*)), roadmap_projects(*)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as MigrationPlan[];
  },

  async create(plan: Omit<MigrationPlan, 'id' | 'created_at' | 'updated_at' | 'assets' | 'roadmap_projects'>) {
    const { data, error } = await supabase
      .from('migration_plans')
      .insert([plan])
      .select()
      .single();
    if (error) throw error;
    return data as MigrationPlan;
  },

  async update(id: string, plan: Partial<MigrationPlan>) {
    const { data, error } = await supabase
      .from('migration_plans')
      .update(plan)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as MigrationPlan;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('migration_plans')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async bulkCreate(plans: any[]) {
    const { data, error } = await supabase
      .from('migration_plans')
      .insert(plans)
      .select();
    if (error) throw error;
    return data;
  }
};
