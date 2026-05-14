import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types';

export const userService = {
  async getProfile(): Promise<UserProfile | null> {
    // Pegar o usuário logado
    const { data: { user } } = await supabase.auth.getUser();
    
    // Se não houver usuário real, usamos o mock (apenas para este ambiente de demo)
    const userId = user?.id || '00000000-0000-0000-0000-000000000000';

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data;
  },

  async updateProfile(id: string, updates: Partial<UserProfile>): Promise<void> {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
  },

  async updateLastLogin(id: string): Promise<void> {
    const { error } = await supabase
      .from('user_profiles')
      .update({ last_login: new Date().toISOString() })
      .eq('id', id);

    if (error) console.error('Error updating last login:', error);
  },

  async uploadAvatar(id: string, file: File): Promise<string> {
    // Verificamos se o storage existe (neste caso simulamos ou usamos real se configurado)
    const fileExt = file.name.split('.').pop();
    const fileName = `${id}-${Math.random()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('profiles')
      .upload(filePath, file);

    if (uploadError) {
      // Se o bucket não existir, retornamos um erro específico para o UI tratar
      if (uploadError.message.includes('bucket not found')) {
        throw new Error('Upload de avatar requer Supabase Storage configurado.');
      }
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('profiles')
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  async logout(): Promise<void> {
    await supabase.auth.signOut();
    // Limpar caches locais se necessário
    localStorage.removeItem('global-parts-theme');
  }
};
