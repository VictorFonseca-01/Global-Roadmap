import { supabase } from './supabase';
import { RequestContext } from './requestContext';

type EventType = 'react_crash' | 'performance_warning' | 'api_error' | 'workflow_error' | 'security_event' | 'pdf_failure' | 'rate_limit';
type Severity = 'info' | 'warning' | 'error' | 'critical';

// ─── Cached Organization ID ──────────────────────────────────────────────────
let _cachedOrgId: string | null = null;

async function getOrgId(): Promise<string | null> {
  if (_cachedOrgId) return _cachedOrgId;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle();
      if (profile?.organization_id) {
        _cachedOrgId = profile.organization_id;
        return _cachedOrgId!;
      }
    }
  } catch {
    // Silencioso
  }
  return null;
}

// ─── Sliding Window IA Flood Monitor ─────────────────────────────────────────
const _iaCallTimestamps: number[] = [];
const IA_FLOOD_WINDOW_MS = 60_000; // 1 minuto
const IA_FLOOD_THRESHOLD = 15;

function recordIaCall(): boolean {
  const now = Date.now();
  _iaCallTimestamps.push(now);
  // Limpar entradas fora da janela
  while (_iaCallTimestamps.length > 0 && _iaCallTimestamps[0] < now - IA_FLOOD_WINDOW_MS) {
    _iaCallTimestamps.shift();
  }
  return _iaCallTimestamps.length > IA_FLOOD_THRESHOLD;
}

export const telemetry = {
  async log(eventType: EventType, severity: Severity, message: string, metadata: any = {}, durationMs?: number) {
    try {
      // 1. Sanitização e Mascaramento
      let rawMetadata = '';
      try {
        rawMetadata = JSON.stringify(metadata || {});
      } catch {
        rawMetadata = '{}';
      }

      const redactedMetadataStr = rawMetadata
        .replace(/(AKIA[0-9A-Z]{16})/g, '[REDACTED_AWS_KEY]')
        .replace(/(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/g, '[REDACTED_IP]')
        .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]')
        .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, '[REDACTED_CPF]')
        .replace(/(?:"password"|"senha"|"token"|"secret"|"key"|"bearer")\s*:\s*"[^"]+"/gi, '"***":"[REDACTED]"');

      const safeMetadata = JSON.parse(redactedMetadataStr);

      if (safeMetadata.prompt) {
        safeMetadata.prompt = `[REDACTED]`;
      }
      
      if (metadata && metadata.error instanceof Error) {
        safeMetadata.errorStack = metadata.error.stack;
        safeMetadata.errorMessage = metadata.error.message;
        delete safeMetadata.error;
      }

      // 2. Correlation ID & Org ID
      const correlationId = RequestContext.getOrGenerateId();
      const organizationId = await getOrgId();
      safeMetadata.correlation_id = correlationId;

      const { data: { user } } = await supabase.auth.getUser();

      // 3. Fire and Forget insert — campos estruturados
      supabase.from('system_telemetry').insert({
        event_type: eventType,
        severity,
        message,
        duration_ms: durationMs,
        metadata: safeMetadata,
        user_id: user?.id || null,
        organization_id: organizationId
      }).then(({ error }) => {
        if (error) console.error("Telemetry falhou ao salvar:", error);
      });

    } catch (e) {
      // Falhas no log não devem quebrar a aplicação
      console.error("Erro interno de telemetria", e);
    }
  },

  async logError(message: string, error?: any) {
    return this.log('api_error', 'error', message, { error });
  },

  async logCrash(error: Error, componentStack: string) {
    return this.log('react_crash', 'critical', error.message, { errorStack: error.stack, componentStack });
  },

  /**
   * Registra uma chamada de IA e verifica flood.
   * Retorna true se o limite de flood foi excedido.
   */
  checkIaFlood(): boolean {
    const isFlooded = recordIaCall();
    if (isFlooded) {
      this.log('rate_limit', 'warning', `Flood de IA detectado: ${_iaCallTimestamps.length} chamadas em 60s (limite: ${IA_FLOOD_THRESHOLD})`, {
        calls_in_window: _iaCallTimestamps.length,
        threshold: IA_FLOOD_THRESHOLD
      });
    }
    return isFlooded;
  },

  async trackPerformance<T>(name: string, thresholdMs: number, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      if (duration > thresholdMs) {
        this.log('performance_warning', 'warning', `Lentidão detectada em ${name}`, { thresholdMs }, Math.round(duration));
      }
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.log('api_error', 'error', `Falha em ${name}`, { error }, Math.round(duration));
      throw error;
    }
  }
};
