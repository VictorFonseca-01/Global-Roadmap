import { supabase } from './supabase';

type EventType = 'react_crash' | 'performance_warning' | 'api_error' | 'workflow_error';
type Severity = 'info' | 'warning' | 'error' | 'critical';

export const telemetry = {
  async log(eventType: EventType, severity: Severity, message: string, metadata: any = {}, durationMs?: number) {
    try {
      // 1. Sanitização Básica
      const safeMetadata = { ...metadata };
      if (safeMetadata.prompt) {
        // Redact prompt to prevent sensitive data leak
        safeMetadata.prompt = `[REDACTED_PROMPT_LENGTH_${String(safeMetadata.prompt).length}]`;
      }
      if (safeMetadata.error && safeMetadata.error instanceof Error) {
        safeMetadata.errorStack = safeMetadata.error.stack;
        safeMetadata.errorMessage = safeMetadata.error.message;
        delete safeMetadata.error; // remove complex object
      }

      const { data: { user } } = await supabase.auth.getUser();

      // 2. Fire and Forget insert
      supabase.from('system_telemetry').insert({
        event_type: eventType,
        severity,
        message,
        duration_ms: durationMs,
        metadata: safeMetadata,
        user_id: user?.id || null
      }).then(({ error }) => {
        if (error) console.error("Telemetry failed to save:", error);
      });

    } catch (e) {
      // Falhas no log não devem quebrar a aplicação
      console.error("Telemetry internal error", e);
    }
  },

  async logError(message: string, error?: any) {
    return this.log('api_error', 'error', message, { error });
  },

  async logCrash(error: Error, componentStack: string) {
    return this.log('react_crash', 'critical', error.message, { errorStack: error.stack, componentStack });
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
