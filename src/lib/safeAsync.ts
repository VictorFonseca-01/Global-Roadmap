import { toast } from 'sonner';
import { telemetry } from './telemetry';
import { RequestContext } from './requestContext';

export interface SafeAsyncOptions {
  severity?: 'info' | 'warning' | 'error' | 'critical';
  showToast?: boolean;
  customErrorMessage?: string;
  context?: any;
}

/**
 * Invólucro centralizador e seguro para tratamento e telemetria de promessas assíncronas.
 * Captura exceções, correlaciona via Request ID, dispara alertas sonner unificados e salva na telemetria Supabase.
 * 
 * @param promise A promessa a ser resolvida de forma segura.
 * @param options Configurações adicionais de notificação, gravidade e contexto.
 */
export async function safeAsync<T>(
  promise: Promise<T>,
  options: SafeAsyncOptions = {}
): Promise<T | null> {
  const {
    severity = 'error',
    showToast = true,
    customErrorMessage,
    context = {}
  } = options;

  const requestId = RequestContext.getOrGenerateId();

  try {
    return await promise;
  } catch (error: any) {
    const originalMessage = error?.message || 'Erro operacional desconhecido';
    const userMessage = customErrorMessage || originalMessage;

    // Registra automaticamente a ocorrência na telemetria do Supabase
    await telemetry.log(
      'workflow_error',
      severity,
      `Falha Assíncrona: ${userMessage}`,
      {
        requestId,
        originalError: originalMessage,
        errorStack: error?.stack,
        ...context
      }
    );

    // Dispara notificação sonner premium baseada na gravidade
    if (showToast) {
      const toastMeta = {
        description: `Transação ID: ${requestId.slice(0, 8)}...`,
        duration: severity === 'critical' ? 8000 : 4000
      };

      switch (severity) {
        case 'critical':
          toast.error(`FALHA CRÍTICA: ${userMessage}`, toastMeta);
          break;
        case 'warning':
          toast.warning(`Aviso: ${userMessage}`, toastMeta);
          break;
        default:
          toast.error(userMessage, toastMeta);
          break;
      }
    }

    return null;
  }
}
