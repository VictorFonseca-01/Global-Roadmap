import { telemetry } from './telemetry';

export class RateLimiter {
  private static limits = new Map<string, number[]>();

  /**
   * Verifica se uma operação específica excedeu seu limite de taxa.
   * Se excedido, registra na telemetria de abuso e lança um erro transient.
   * 
   * @param key Identificador da operação (ex: 'login', 'ai_generation', 'pdf_export', 'system_reset')
   * @param limit Limite máximo de requisições na janela
   * @param windowMs Duração da janela deslizante (padrão: 1 minuto / 60000ms)
   */
  static async checkLimit(key: string, limit: number, windowMs: number = 60000): Promise<void> {
    const now = Date.now();
    const timestamps = this.limits.get(key) || [];
    
    // Filtra apenas as tentativas que ocorreram dentro da janela deslizante ativa
    const activeTimestamps = timestamps.filter(timestamp => now - timestamp < windowMs);
    
    if (activeTimestamps.length >= limit) {
      // Envia telemetria preventiva de abuso para o Supabase
      await telemetry.log(
        'rate_limit', 
        'warning', 
        `Tentativa bloqueada por excesso de requisições (Rate Limit) na operação: ${key}`, 
        { limit, windowMs, currentCount: activeTimestamps.length }
      );
      
      const oldestTimestamp = activeTimestamps[0];
      const msToWait = windowMs - (now - oldestTimestamp);
      const secondsToWait = Math.ceil(msToWait / 1000);
      
      throw new Error(`Taxa limite de operações atingida para: ${key}. Por favor, aguarde ${secondsToWait} segundo(s) antes de tentar novamente.`);
    }
    
    // Adiciona a requisição atual e atualiza a memória
    activeTimestamps.push(now);
    this.limits.set(key, activeTimestamps);
  }
}
