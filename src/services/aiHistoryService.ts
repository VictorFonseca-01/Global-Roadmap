import { supabase } from '@/lib/supabase';

export interface AIHistoryRecord {
  id: string;
  user_id: string;
  prompt: string;
  project_name: string;
  items_count: number;
  status: 'success' | 'failure';
  created_project_id?: string | null;
  metadata: any;
  created_at: string;
  user_profiles?: {
    full_name: string;
    email: string;
  };
}

export const aiHistoryService = {
  async getAll(): Promise<AIHistoryRecord[]> {
    const { data, error } = await supabase
      .from('ai_roadmap_history')
      .select(`
        *,
        user_profiles (
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Erro ao buscar histórico:", error);
      throw error;
    }
    return data as AIHistoryRecord[];
  },

  async logSuccess(data: { prompt: string; projectName: string; itemsCount: number; projectId?: string; metadata?: any }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('ai_roadmap_history').insert({
      user_id: user.id,
      prompt: data.prompt,
      project_name: data.projectName,
      items_count: data.itemsCount,
      status: 'success',
      created_project_id: data.projectId,
      metadata: data.metadata || {}
    });
  },

  async logFailure(data: { prompt: string; errorMsg: string; metadata?: any }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('ai_roadmap_history').insert({
      user_id: user.id,
      prompt: data.prompt,
      project_name: 'Failed Generation',
      items_count: 0,
      status: 'failure',
      metadata: { ...data.metadata, error: data.errorMsg }
    });
  }
};
