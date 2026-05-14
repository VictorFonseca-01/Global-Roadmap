import { supabase } from '@/lib/supabase';

export const storageService = {
  async uploadAvatar(userId: string, file: File): Promise<string> {
    // Validações básicas
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      throw new Error("Formato inválido. Use JPG, PNG ou WEBP.");
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error("Arquivo muito grande. Máximo 5MB.");
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`;
    const filePath = fileName;

    // Upload para o bucket 'profiles'
    const { error: uploadError } = await supabase.storage
      .from('profiles')
      .upload(filePath, file, {
        upsert: true
      });

    if (uploadError) {
      if (uploadError.message.includes('bucket not found')) {
        throw new Error('Configuração de Storage pendente: Bucket "profiles" não encontrado.');
      }
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('profiles')
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  async deleteAvatar(filePath: string): Promise<void> {
    const { error } = await supabase.storage
      .from('profiles')
      .remove([filePath]);
    
    if (error) throw error;
  }
};
