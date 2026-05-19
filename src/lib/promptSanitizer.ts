import { telemetry } from './telemetry';

/**
 * Padrões comuns de injeção de prompt e jailbreak em LLMs
 */
const INJECTION_PATTERNS = [
  /ignore\s+(?:the\s+)?(?:previous\s+)?instructions?/i,
  /system\s+prompt\s+bypass/i,
  /reveal\s+(?:your\s+)?(?:system\s+)?prompt/i,
  /secrets?/i,
  /export\s+token/i,
  /you\s+are\s+now\s+an\s+unrestricted/i,
  /dan\s+mode/i,
  /jailbreak/i,
  /bypass\s+restrictions/i,
  /forget\s+everything/i,
  /do\s+anything\s+now/i
];

/**
 * Sanitiza e valida o input do usuário para a API de IA / Gemini.
 * Detecta padrões de injeção de prompt e registra incidentes de segurança.
 * 
 * @param prompt O input de texto bruto do usuário.
 * @returns O prompt higienizado e livre de comandos de controle.
 */
export function sanitizePromptInput(prompt: string): string {
  if (!prompt || typeof prompt !== 'string') {
    return '';
  }

  const trimmedPrompt = prompt.trim();
  let hasSuspiciousPattern = false;
  let matchedPattern = '';

  // 1. Detectar padrões suspeitos
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmedPrompt)) {
      hasSuspiciousPattern = true;
      matchedPattern = pattern.toString();
      break;
    }
  }

  // 2. Se um padrão de injeção for detectado, emitir logs de segurança preventiva na telemetria
  if (hasSuspiciousPattern) {
    telemetry.log(
      'security_event',
      'warning',
      `Bloqueio de Prompt Injection: Padrão suspeito detectado e neutralizado.`,
      {
        matchedPattern,
        promptLength: trimmedPrompt.length,
        // Evitamos salvar o prompt inteiro para segurança, apenas os primeiros 100 caracteres se necessário
        promptSnippet: trimmedPrompt.slice(0, 100) + '...'
      }
    );

    // Lança um erro para interromper a execução de forma elegante
    throw new Error('O texto inserido contém termos que violam as políticas de segurança da plataforma. Por favor, reformule sua solicitação.');
  }

  // 3. Higienização adicional: remover caracteres de escape problemáticos ou strings de injeção
  // e neutralizar qualquer caractere de controle
  return trimmedPrompt
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove caracteres de controle ASCII
    .replace(/\\/g, '\\\\')              // Escapa barras invertidas
    .replace(/"/g, '\\"')                // Escapa aspas duplas
    .replace(/'/g, "\\'");               // Escapa aspas simples
}
