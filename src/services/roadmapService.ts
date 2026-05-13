import { supabase } from '@/lib/supabase';
import type { RoadmapProject } from '@/types';

export const roadmapService = {
  async getAll() {
    const { data, error } = await supabase
      .from('roadmap_projects')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as RoadmapProject[];
  },

  async create(project: Omit<RoadmapProject, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('roadmap_projects')
      .insert([project])
      .select()
      .single();
    if (error) throw error;
    return data as RoadmapProject;
  },

  async update(id: string, project: Partial<RoadmapProject>) {
    const { data, error } = await supabase
      .from('roadmap_projects')
      .update(project)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as RoadmapProject;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('roadmap_projects')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};
