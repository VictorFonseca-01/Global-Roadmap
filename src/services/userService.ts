import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types';
import { storageService } from './storageService';
import { auditService } from './auditService';

export const userService = {
  async getProfile(): Promise<UserProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Perfil não existe, vamos retornar os dados básicos do Auth como fallback
        // mas não criar automaticamente aqui para evitar escritas desnecessárias em GETs
        return {
          id: user.id,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
          email: user.email || '',
          role: 'Membro',
          department: 'Geral',
          preferred_theme: 'system'
        };
      }
      console.error('Error fetching profile:', error);
      return null;
    }

    return data as UserProfile;
  },

  async updateProfile(id: string, updates: Partial<UserProfile>): Promise<void> {
    // 1. Validar Sessão Internamente
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Sessão não encontrada. Faça login novamente.");
    }

    const targetId = id || user.id;

    // 2. Executar UPSERT Resiliente
    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        ...updates,
        id: targetId,
        email: updates.email || user.email,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) throw error;

    // 3. Log de Auditoria
    await auditService.log({
      action: 'UPDATE_PROFILE',
      entity_type: 'user_profile',
      entity_id: targetId,
      description: 'Usuário atualizou informações de perfil (UPSERT)'
    });
  },

  async updateLastLogin(id: string): Promise<void> {
    const { error } = await supabase
      .from('user_profiles')
      .update({ last_login: new Date().toISOString() })
      .eq('id', id);

    if (error) console.error('Error updating last login:', error);
  },

  async uploadAvatar(id: string, file: File): Promise<string> {
    // Validar Sessão
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Sessão não encontrada. Faça login novamente.");

    const targetId = id || user.id;

    const url = await storageService.uploadAvatar(targetId, file);
    
    await this.updateProfile(targetId, { avatar_url: url });

    await auditService.log({
      action: 'UPLOAD_AVATAR',
      entity_type: 'user_profile',
      entity_id: targetId,
      description: 'Usuário alterou foto de perfil'
    });

    return url;
  },

  async logout(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await auditService.log({
        action: 'LOGOUT',
        user_id: user.id,
        description: 'Usuário encerrou a sessão'
      });
    }
    await supabase.auth.signOut();
    localStorage.removeItem('global-parts-theme');
  }
};
