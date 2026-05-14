import { supabase } from '@/lib/supabase';
import type { AuditLog } from '@/types';

export const auditService = {
  async log(log: Omit<AuditLog, 'id' | 'created_at'>): Promise<void> {
    // Pegar usuário atual para enriquecer o log se necessário
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('audit_logs')
      .insert([{
        ...log,
        user_id: user?.id || log.user_id,
        user_name: user?.user_metadata?.full_name || log.user_name
      }]);

    if (error) console.error('Error writing audit log:', error);
  },

  async getAll(limit = 100): Promise<AuditLog[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as AuditLog[];
  }
};
