import { supabase } from '@/lib/supabase';
import type { SystemSettings } from '@/types';

export const settingsService = {
  async getSettings(): Promise<SystemSettings> {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .limit(1)
      .single();

    if (error) throw error;
    return data as SystemSettings;
  },

  async updateSettings(id: string, updates: Partial<SystemSettings>): Promise<void> {
    const { error } = await supabase
      .from('system_settings')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  }
};
