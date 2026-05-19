import { supabase } from '@/lib/supabase';

export interface AIHistoryRecord {
  id: string;
  user_id: string;
  prompt?: string | null;
  prompt_preview?: string | null;
  prompt_hash?: string | null;
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

// Otimização de segurança: algoritmo para gerar hash SHA-256 no browser
async function generateHash(text: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Otimização de segurança: função de sanitização de prompt robusta no client-side
function sanitizePrompt(text: string): string {
  if (!text) return text;
  let sanitized = text;

  // 1. Mascarar e-mails
  sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL_MASKED]");

  // 2. Mascarar IPs (IPv4)
  sanitized = sanitized.replace(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g, "[IP_MASKED]");

  // 3. Mascarar tokens, credenciais e chaves privadas
  sanitized = sanitized.replace(/(password|passwd|secret|token|api_key|apikey|private_key|auth_token)\s*[:=]\s*["']?[a-zA-Z0-9_\-\.\~]{10,}["']?/gi, "$1=[SECRET_MASKED]");
  
  // 4. Mascarar URLs de rede interna (.local, .internal, .lan)
  sanitized = sanitized.replace(/https?:\/\/[a-zA-Z0-9_\-\.]+\.(local|internal|lan)\b[^\s]*/gi, "[INTERNAL_URL_MASKED]");

  return sanitized;
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
      if (import.meta.env.DEV) {
        console.error("Erro ao buscar histórico:", error);
      }
      throw error;
    }
    return data as AIHistoryRecord[];
  },

  async logSuccess(data: { prompt: string; projectName: string; itemsCount: number; projectId?: string; metadata?: any }) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const sanitized = sanitizePrompt(data.prompt);
      const hash = await generateHash(data.prompt);
      const preview = sanitized.substring(0, 200) + (sanitized.length > 200 ? "..." : "");

      await supabase.from('ai_roadmap_history').insert({
        user_id: user.id,
        prompt: null, // NUNCA salvar o prompt completo em plaintext
        prompt_preview: preview,
        prompt_hash: hash,
        project_name: data.projectName,
        items_count: data.itemsCount,
        status: 'success',
        created_project_id: data.projectId,
        metadata: data.metadata || {}
      });
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error("Erro ao logar sucesso de IA:", err);
      }
    }
  },

  async logFailure(data: { prompt: string; errorMsg: string; metadata?: any }) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const sanitized = sanitizePrompt(data.prompt);
      const hash = await generateHash(data.prompt);
      const preview = sanitized.substring(0, 200) + (sanitized.length > 200 ? "..." : "");

      await supabase.from('ai_roadmap_history').insert({
        user_id: user.id,
        prompt: null, // NUNCA salvar o prompt completo em plaintext
        prompt_preview: preview,
        prompt_hash: hash,
        project_name: 'Failed Generation',
        items_count: 0,
        status: 'failure',
        metadata: { ...data.metadata, error: data.errorMsg }
      });
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error("Erro ao logar falha de IA:", err);
      }
    }
  }
};
