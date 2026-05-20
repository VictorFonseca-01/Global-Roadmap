import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Headers CORS dinâmicos serão definidos dentro da request

// Estrutura para controle de Rate Limit em memória por usuário
interface UserRateLimit {
  minuteRequests: number[];
  hourRequests: number[];
}

const rateLimitMap = new Map<string, UserRateLimit>();

function checkRateLimit(userId: string): { allowed: boolean; reason?: string } {
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  const oneHourAgo = now - 60 * 60 * 1000;

  if (!rateLimitMap.has(userId)) {
    rateLimitMap.set(userId, { minuteRequests: [now], hourRequests: [now] });
    return { allowed: true };
  }

  const limitData = rateLimitMap.get(userId)!;

  // Limpar timestamps antigos fora das janelas
  limitData.minuteRequests = limitData.minuteRequests.filter(t => t > oneMinuteAgo);
  limitData.hourRequests = limitData.hourRequests.filter(t => t > oneHourAgo);

  // Verificar se estourou os limites
  if (limitData.minuteRequests.length >= 10) {
    return { allowed: false, reason: "Rate limit excedido: Máximo de 10 requisições por minuto." };
  }
  if (limitData.hourRequests.length >= 50) {
    return { allowed: false, reason: "Rate limit excedido: Máximo de 50 requisições por hora." };
  }

  // Registrar a requisição atual
  limitData.minuteRequests.push(now);
  limitData.hourRequests.push(now);
  return { allowed: true };
}

// Sanitização de prompt robusta baseada em regex
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

// Função auxiliar para SHA-256 no Deno
async function generateHash(text: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Fallback determinístico de regex local
function parseLocalDeterministicRegex(prompt: string) {
  const items: any[] = [];
  const rules = [
    {
      regex: /(Windows\s+10(?:\s+22H2)?)/gi,
      vendor: "Microsoft",
      product: "Windows 10",
      version: "22H2",
      type: "client" as const
    },
    {
      regex: /(Windows\s+11(?:\s+23H2)?)/gi,
      vendor: "Microsoft",
      product: "Windows 11",
      version: "23H2",
      type: "client" as const
    },
    {
      regex: /(Windows\s+Server\s+2012(?:\s+R2)?|Win\s+Server\s+2012(?:\s+R2)?|Server\s+2012(?:\s+R2)?)/gi,
      vendor: "Microsoft",
      product: "Windows Server",
      version: "2012 R2",
      type: "server" as const
    },
    {
      regex: /(Windows\s+Server\s+2016|Win\s+Server\s+2016|Server\s+2016)/gi,
      vendor: "Microsoft",
      product: "Windows Server",
      version: "2016",
      type: "server" as const
    },
    {
      regex: /(Windows\s+Server\s+2019|Win\s+Server\s+2019|Server\s+2019)/gi,
      vendor: "Microsoft",
      product: "Windows Server",
      version: "2019",
      type: "server" as const
    },
    {
      regex: /(Windows\s+Server\s+2022|Win\s+Server\s+2022|Server\s+2022)/gi,
      vendor: "Microsoft",
      product: "Windows Server",
      version: "2022",
      type: "server" as const
    }
  ];

  rules.forEach(rule => {
    rule.regex.lastIndex = 0;
    let match;
    while ((match = rule.regex.exec(prompt)) !== null) {
      const matchedText = match[0];
      const matchIndex = match.index;
      
      let finalVersion = rule.version;
      if (rule.product === "Windows Server") {
        if (/2012\s+R2/i.test(matchedText) || /2012\s+R2/i.test(prompt.substring(matchIndex, matchIndex + 40))) {
          finalVersion = "2012 R2";
        } else if (/2012/i.test(matchedText)) {
          finalVersion = "2012";
        }
      }

      const context = prompt.substring(matchIndex, matchIndex + 100);
      const dateMatch = context.match(/(\d{2})\/(\d{2})\/(\d{4})|(\d{4})-(\d{2})-(\d{2})/);
      
      let implemented_at: string | null = null;
      if (dateMatch) {
        if (dateMatch[1] && dateMatch[2] && dateMatch[3]) {
          implemented_at = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
        } else if (dateMatch[4] && dateMatch[5] && dateMatch[6]) {
          implemented_at = `${dateMatch[4]}-${dateMatch[5]}-${dateMatch[6]}`;
        }
      }

      const alreadyExists = items.some(item => 
        item.product_name === rule.product && 
        item.version === finalVersion && 
        item.implemented_at === implemented_at
      );

      if (!alreadyExists) {
        items.push({
          vendor: rule.vendor,
          product_name: rule.product,
          version: finalVersion,
          asset_type: rule.type,
          implemented_at,
          business_criticality: rule.type === 'server' ? 'high' : 'medium',
          confidence_score: 90
        });
      }
    }
  });

  return {
    project_name: "Roadmap de Infraestrutura Microsoft",
    category: "Microsoft OS",
    items: items,
    assumptions: ["Identificado via parser determinístico de regex local devido a instabilidade no parsing de IA."],
    missing_information: [],
    warning_message: "Alguns dados precisarão de revisão manual. A IA falhou em estruturar o ambiente e usamos a extração por regex local."
  };
}

// Chamada à API Gemini com AbortController (timeout 25s) e no máximo 1 retry
async function fetchGeminiWithTimeoutAndRetry(prompt: string, apiKey: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
  const payload = {
    contents: [
      {
        parts: [
          {
            text: prompt
          }
        ]
      }
    ]
  };

  let attempt = 0;
  const maxAttempts = 2; // Tentativa inicial + 1 retry

  while (attempt < maxAttempts) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 25000); // 25 segundos timeout

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(id);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API retornou erro ${response.status}: ${errorText}`);
      }

      const responseData = await response.json();
      const text = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error("Resposta vazia da API Gemini.");
      }

      return text;
    } catch (err: any) {
      clearTimeout(id);
      attempt++;
      const isAbort = err.name === "AbortError";
      
      console.warn(`[Edge Function - Gemini] Tentativa ${attempt} falhou: ${err.message}. ${isAbort ? "Timeout alcançado." : ""}`);

      if (attempt >= maxAttempts) {
        throw err;
      }
    }
  }

  throw new Error("Falha após máximo de tentativas");
}

serve(async (req) => {
  const allowedOrigins = [
    'https://global-roadmap.vercel.app',
    'http://localhost:5173',
    'http://localhost:5174',
  ];

  const origin = req.headers.get('origin') ?? '';
  const allowedOrigin = allowedOrigins.includes(origin)
    ? origin
    : 'https://global-roadmap.vercel.app';

  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };

  // Tratar OPTIONS preflight requests para CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY") ?? "";

  // Inicializar Supabase Admin com bypass RLS para operações internas (logging/verificação)
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const startTime = Date.now();
  let userId = "anonymous";
  let organizationId: string | null = null;
  let actionType = "unknown";
  let rawPrompt = "";
  let promptHash = "";

  try {
    // 1. Validar cabeçalho Authorization JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Cabeçalho de autorização inválido ou ausente." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const token = authHeader.split(" ")[1];
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Token JWT inválido ou expirado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    userId = user.id;

    // 2. Buscar perfil para resolver Organização e Papel (RBAC)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("role, organization_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Perfil do usuário não encontrado." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const role = profile.role?.toLowerCase() || "";
    organizationId = profile.organization_id;

    // 3. Validar permissão can_generate_roadmaps
    const allowedRoles = ["admin", "director", "manager", "super_admin"];
    const canGenerateRoadmaps = allowedRoles.includes(role);

    if (!canGenerateRoadmaps) {
      // Registrar falha de RBAC na Telemetria de Segurança
      await supabaseAdmin.from("system_telemetry").insert({
        organization_id: organizationId,
        event_type: "security_event",
        severity: "critical",
        message: `Acesso negado (RBAC denied): usuário ${user.id} com papel ${profile.role} tentou gerar roadmap via Edge Function.`,
        metadata: { userId: user.id, role: profile.role, action: "ai-roadmap-parser" }
      });

      return new Response(JSON.stringify({ error: "Usuário não possui permissão (can_generate_roadmaps) para gerar roadmaps." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Parse do Body da Request
    let requestBody;
    try {
      requestBody = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "JSON de entrada malformado ou inválido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { prompt, action, category, scope } = requestBody;
    rawPrompt = prompt || "";
    actionType = action || "parse_roadmap_prompt";

    // 4. Validar payload vazio ou incorreto
    if (!rawPrompt || typeof rawPrompt !== "string" || rawPrompt.trim() === "") {
      return new Response(JSON.stringify({ error: "Payload vazio ou incorreto. O prompt é obrigatório." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    promptHash = await generateHash(rawPrompt);

    // 5. Validar tamanho máximo do prompt (6000 caracteres)
    if (rawPrompt.length > 6000) {
      // Registrar tentativa de abuso na Telemetria
      await supabaseAdmin.from("system_telemetry").insert({
        organization_id: organizationId,
        event_type: "security_event",
        severity: "warning",
        message: `Tentativa de abuso de tamanho de prompt na Edge Function: prompt de ${rawPrompt.length} caracteres recebido.`,
        metadata: { userId: user.id, promptLength: rawPrompt.length }
      });

      return new Response(JSON.stringify({ error: "O prompt excede o limite máximo de 6000 caracteres." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 6. Aplicar Rate Limit em memória
    const limitCheck = checkRateLimit(user.id);
    if (!limitCheck.allowed) {
      // Registrar abuse_attempts de excesso de requisições na Telemetria
      await supabaseAdmin.from("system_telemetry").insert({
        organization_id: organizationId,
        event_type: "rate_limit",
        severity: "warning",
        message: `Bloqueio de Rate Limit ativado para o usuário ${user.id}. Motivo: ${limitCheck.reason}`,
        metadata: { userId: user.id, reason: limitCheck.reason }
      });

      return new Response(JSON.stringify({ error: limitCheck.reason }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 7. Sanitizar o prompt antes de enviar à IA
    const sanitizedPrompt = sanitizePrompt(rawPrompt);

    // 8. Chamar a API Gemini com tratamento de timeout e retries
    let responseText = "";
    try {
      responseText = await fetchGeminiWithTimeoutAndRetry(sanitizedPrompt, geminiApiKey);
    } catch (apiError: any) {
      // Registrar falha crítica do Gemini na Telemetria
      await supabaseAdmin.from("system_telemetry").insert({
        organization_id: organizationId,
        event_type: "security_event",
        severity: "critical",
        message: `Falha na chamada da Gemini API: ${apiError.message}`,
        metadata: { userId: user.id, error: apiError.message, duration_ms: Date.now() - startTime }
      });

      // Se a ação for de parsing de roadmap, aplicar Fallback Determinístico Regex Local
      if (actionType === "parse_roadmap_prompt") {
        console.warn("[Edge Function] Invoking fallback deterministic local regex parser due to API error...");
        const fallbackResult = parseLocalDeterministicRegex(sanitizedPrompt);
        
        // Registrar log de sucesso com flag de regex fallback
        await supabaseAdmin.from("ai_usage_logs").insert({
          organization_id: organizationId,
          user_id: user.id,
          model: "gemini-1.5-flash-latest",
          prompt_type: actionType,
          execution_time_ms: Date.now() - startTime,
          latency_ms: Date.now() - startTime,
          success: true,
          status: "success",
          prompt_hash: promptHash,
          tokens_used: 0,
          error_message: `API Error: ${apiError.message}. Regex Fallback triggered.`
        });

        return new Response(JSON.stringify(fallbackResult), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      throw apiError; // Para outras ações, propaga a falha
    }

    // 9. Processar e limpar JSON de resposta
    const cleanJson = responseText.replace(/```json|```/gi, "").trim();
    let parsedJson;
    try {
      parsedJson = JSON.parse(cleanJson);
    } catch (e) {
      // Se falhar ao parsear o JSON retornado pela IA
      if (actionType === "parse_roadmap_prompt") {
        console.warn("[Edge Function] JSON inválido retornado pela IA. Executando Fallback Regex...");
        const fallbackResult = parseLocalDeterministicRegex(sanitizedPrompt);
        
        await supabaseAdmin.from("ai_usage_logs").insert({
          organization_id: organizationId,
          user_id: user.id,
          model: "gemini-1.5-flash-latest",
          prompt_type: actionType,
          execution_time_ms: Date.now() - startTime,
          latency_ms: Date.now() - startTime,
          success: true,
          status: "success",
          prompt_hash: promptHash,
          tokens_used: 0,
          error_message: "JSON Parse Error on IA response. Regex Fallback triggered."
        });

        return new Response(JSON.stringify(fallbackResult), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      throw new Error("A IA retornou um JSON malformado ou corrompido.");
    }

    // 10. Registrar log de uso com sucesso
    await supabaseAdmin.from("ai_usage_logs").insert({
      organization_id: organizationId,
      user_id: user.id,
      model: "gemini-1.5-flash-latest",
      prompt_type: actionType,
      execution_time_ms: Date.now() - startTime,
      latency_ms: Date.now() - startTime,
      success: true,
      status: "success",
      prompt_hash: promptHash,
      tokens_used: 0
    });

    return new Response(JSON.stringify(parsedJson), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    const errorMsg = error.message || String(error);
    console.error("[Edge Function Error]", error);

    // Registrar log de erro na tabela ai_usage_logs
    try {
      await supabaseAdmin.from("ai_usage_logs").insert({
        organization_id: organizationId,
        user_id: userId,
        model: "gemini-1.5-flash-latest",
        prompt_type: actionType,
        execution_time_ms: Date.now() - startTime,
        latency_ms: Date.now() - startTime,
        success: false,
        status: "error",
        error_message: errorMsg,
        prompt_hash: promptHash,
        tokens_used: 0
      });
    } catch (logErr) {
      console.error("Falha ao registrar log de erro no banco:", logErr);
    }

    // Registrar falha do sistema na telemetria
    try {
      await supabaseAdmin.from("system_telemetry").insert({
        organization_id: organizationId,
        event_type: "security_event",
        severity: "critical",
        message: `Erro na Edge Function: ${errorMsg}`,
        metadata: { userId, error: errorMsg, action: actionType }
      });
    } catch (telemetryErr) {
      console.error("Falha ao registrar telemetria de erro:", telemetryErr);
    }

    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
