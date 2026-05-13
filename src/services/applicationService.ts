import { supabase } from '@/lib/supabase';
import type { Application, ApplicationCompatibility } from '@/types';

export const applicationService = {
  async getAll() {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .order('name');
    if (error) throw error;
    return data as Application[];
  },

  async create(app: Omit<Application, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('applications')
      .insert([app])
      .select()
      .single();
    if (error) throw error;
    return data as Application;
  },

  async update(id: string, app: Partial<Application>) {
    const { data, error } = await supabase
      .from('applications')
      .update(app)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Application;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('applications')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // Compatibility
  async getCompatibility(appId: string) {
    const { data, error } = await supabase
      .from('application_compatibility')
      .select('*, lifecycle_catalog(*)')
      .eq('application_id', appId);
    if (error) throw error;
    return data as ApplicationCompatibility[];
  },

  async setCompatibility(comp: Omit<ApplicationCompatibility, 'id'>) {
    const { data, error } = await supabase
      .from('application_compatibility')
      .upsert(comp, { onConflict: 'application_id, lifecycle_id' })
      .select()
      .single();
    if (error) throw error;
    return data as ApplicationCompatibility;
  }
};
