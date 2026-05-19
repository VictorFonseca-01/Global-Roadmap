import { supabase } from '@/lib/supabase';

export const systemResetService = {
  async resetOperationalData(): Promise<void> {
    const { error } = await supabase.rpc('reset_operational_data');
    if (error) {
      console.error('[SystemResetService] Erro ao executar reset total seguro:', error);
      throw new Error(error.message || 'Falha ao resetar banco de dados operacionais');
    }
  }
};
