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
        // Perfil não existe, vamos criar um inicial baseado no Auth
        const newProfile: UserProfile = {
          id: user.id,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
          email: user.email || '',
          role: 'Membro',
          department: 'Geral',
          preferred_theme: 'system'
        };
        
        const { data: created, error: createError } = await supabase
          .from('user_profiles')
          .insert([newProfile])
          .select()
          .single();
        
        if (createError) throw createError;
        return created as UserProfile;
      }
      console.error('Error fetching profile:', error);
      return null;
    }

    return data as UserProfile;
  },

  async updateProfile(id: string, updates: Partial<UserProfile>): Promise<void> {
    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    await auditService.log({
      action: 'UPDATE_PROFILE',
      entity_type: 'user_profile',
      entity_id: id,
      description: 'Usuário atualizou informações de perfil'
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
    const url = await storageService.uploadAvatar(id, file);
    
    await this.updateProfile(id, { avatar_url: url });

    await auditService.log({
      action: 'UPLOAD_AVATAR',
      entity_type: 'user_profile',
      entity_id: id,
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
