import { supabase } from '@/lib/supabase';
import type { RoadmapProject } from '@/types';

export const roadmapService = {
  async getAll() {
    const { data, error } = await supabase
      .from('roadmap_projects')
      .select('*, migration_plans(count, priority, estimated_cost)')
      .order('created_at', { ascending: false });
    
    if (error) throw error;

    return (data as any[]).map(project => {
      const plans = project.migration_plans || [];
      return {
        ...project,
        total_migration_plans: plans.length > 0 ? project.migration_plans[0].count : 0,
        total_assets: plans.length,
        critical_count: plans.filter((p: any) => p.priority === 'critical').length,
        estimated_budget: plans.reduce((acc: number, p: any) => acc + (Number(p.estimated_cost) || 0), 0)
      };
    }) as RoadmapProject[];
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
