import { supabase } from '@/lib/supabase';
import type { RoadmapProject } from '@/types';

export const roadmapService = {
  async getAll() {
    const { data, error } = await supabase
      .from('roadmap_projects')
      .select('*, migration_plans(priority, estimated_cost)')
      .order('created_at', { ascending: false });
    
    if (error) throw error;

    return (data || []).map(project => {
      const plans = (project.migration_plans as unknown as any[]) || [];
      return {
        ...project,
        total_migration_plans: plans.length > 0 ? (plans[0] as any).count : 0,
        total_assets: plans.length,
        critical_count: plans.filter(p => p.priority === 'critical').length,
        estimated_budget: plans.reduce((acc: number, p) => acc + (Number(p.estimated_cost) || 0), 0)
      };
    }) as RoadmapProject[];

  },

  async create(project: Partial<RoadmapProject>) {
    const { name, category, scope, status, description, owner, start_date, end_date } = project;
    const payload = Object.fromEntries(
      Object.entries({ name, category, scope, status, description, owner, start_date, end_date }).filter(([_, v]) => v !== undefined)
    );
    const { data, error } = await supabase
      .from('roadmap_projects')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data as RoadmapProject;
  },

  async update(id: string, project: Partial<RoadmapProject>) {
    const { name, category, scope, status, description, owner, start_date, end_date } = project;
    const payload = Object.fromEntries(
      Object.entries({ name, category, scope, status, description, owner, start_date, end_date }).filter(([_, v]) => v !== undefined)
    );
    const { data, error } = await supabase
      .from('roadmap_projects')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as RoadmapProject;
  },

  async delete(id: string) {
    // Apaga dependências para evitar erro de Foreign Key
    await supabase.from('migration_plans').delete().eq('roadmap_project_id', id);

    const { error } = await supabase
      .from('roadmap_projects')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};
