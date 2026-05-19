import { supabase } from "@/lib/supabase";
import { AIRoadmapParseResponseSchema, type AIRoadmapParseResponse } from "@/types";
import { userService } from "./userService";
import { sanitizePromptInput } from "@/lib/promptSanitizer";

const MODEL_NAME = "gemini-1.5-flash-latest";

export interface LifecycleAIResponse {
  vendor: string;
  product_name: string;
  version: string;
  end_of_support: string | null;
  extended_support_end: string | null;
  successor_version: string | null;
  source_url: string | null;
  confidence_score: number;
  notes: string | null;
}

// Concurrency control
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 3;
const requestQueue: (() => void)[] = [];

async function acquireToken() {
  if (activeRequests < MAX_CONCURRENT_REQUESTS) {
    activeRequests++;
    return;
  }
  return new Promise<void>(resolve => requestQueue.push(resolve));
}

function releaseToken() {
  activeRequests--;
  if (requestQueue.length > 0) {
    activeRequests++;
    const next = requestQueue.shift();
    if (next) next();
  }
}

async function generateHash(text: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function getTTLDays(vendor: string, category: string): number {
  const v = vendor.toLowerCase();
  const c = category.toLowerCase();
  if (v.includes('microsoft')) return 90;
  if (v.includes('dell') || v.includes('hpe') || v.includes('lenovo')) return 180;
  if (c.includes('hardware')) return 180;
  return 90;
}

export function parseLocalDeterministicRegex(prompt: string): AIRoadmapParseResponse {
  if (import.meta.env.DEV) {
    console.log("[AI_PARSE_DEBUG] Executing local deterministic regex fallback...");
  }
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
      
      // Determine version precisely
      let finalVersion = rule.version;
      if (rule.product === "Windows Server") {
        if (/2012\s+R2/i.test(matchedText) || /2012\s+R2/i.test(prompt.substring(matchIndex, matchIndex + 40))) {
          finalVersion = "2012 R2";
        } else if (/2012/i.test(matchedText)) {
          finalVersion = "2012";
        }
      }

      // Look forward 60 characters for a date
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

export const geminiService = {
  async enrichLifecycle(vendor: string, product: string, version: string, category: string = 'General'): Promise<LifecycleAIResponse> {
    const prompt = `Return ONLY JSON: {vendor,product_name,version,end_of_support,extended_support_end,successor_version,source_url,confidence_score,notes}. Product: ${vendor} ${product} ${version}`.trim();
    const promptHash = await generateHash(prompt);
    
    // Obter perfil do usuário autenticado para cache multi-tenant isolado
    const profile = await userService.getProfile();
    const organizationId = profile?.organization_id || "d290f1ee-6c54-4b01-90e6-d701748f0851";

    // 1. Check Cache
    const { data: cached } = await supabase
      .from("lifecycle_catalog")
      .select("*")
      .eq("prompt_hash", promptHash)
      .eq("organization_id", organizationId)
      .gt("expires_at", new Date().toISOString())
      .limit(1)
      .maybeSingle();

    if (cached) {
      if (import.meta.env.DEV) {
        console.log(`[Gemini] Cache hit para ${vendor} ${product}`);
      }
      return cached.raw_response as unknown as LifecycleAIResponse;
    }

    // 2. Controle de Concorrência
    await acquireToken();
    
    try {
      // 3. Invocar Edge Function no Supabase de forma segura
      const { data, error: functionError } = await supabase.functions.invoke('ai-roadmap-parser', {
        body: { prompt, action: "enrich_lifecycle", category }
      });

      if (functionError || !data) {
        throw new Error(functionError?.message || "Falha ao enriquecer dados de ciclo de vida através da Edge Function.");
      }

      const responseData = data as LifecycleAIResponse;

      // 4. Persistir no Cache local por Tenant
      const ttlDays = getTTLDays(vendor, category);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + ttlDays);

      await supabase.from("lifecycle_catalog").upsert({
        vendor: responseData.vendor,
        product_name: responseData.product_name,
        version: responseData.version,
        end_of_support: responseData.end_of_support,
        extended_support_end: responseData.extended_support_end,
        successor_version: responseData.successor_version,
        source_url: responseData.source_url,
        confidence_score: responseData.confidence_score,
        notes: responseData.notes,
        prompt_hash: promptHash,
        model_name: MODEL_NAME,
        expires_at: expiresAt.toISOString(),
        raw_response: responseData,
        last_verified_at: new Date().toISOString(),
        organization_id: organizationId
      }, { onConflict: 'vendor,product_name,version,organization_id' });

      return responseData;

    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Gemini Enrich Error:", error);
      }
      throw error;
    } finally {
      releaseToken();
    }
  },

  async getExecutiveInsights(kpis: Record<string, unknown>, onDemand: boolean = false): Promise<string[]> {
    if (!onDemand) return [];

    const prompt = `As CTO advisor, analyze KPIs and return JSON array of 3 short strategic insights: ${JSON.stringify(kpis)}`;

    await acquireToken();
    try {
      const { data, error: functionError } = await supabase.functions.invoke('ai-roadmap-parser', {
        body: { prompt, action: "executive_insights" }
      });

      if (functionError || !data) {
        throw new Error(functionError?.message || "Erro ao obter insights executivos.");
      }

      return data as string[];
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Gemini Insights Error:", error);
      }
      return ["Análise estratégica indisponível no momento."];
    } finally {
      releaseToken();
    }
  },

  async parseRoadmapPrompt(prompt: string): Promise<AIRoadmapParseResponse> {
    const systemInstruction = `You are a strict IT Roadmap analyzer. 
Parse the following text and extract roadmap data in JSON format EXACTLY matching this schema:
{
  "project_name": "string",
  "category": "string",
  "items": [{
    "vendor": "string",
    "product_name": "string",
    "version": "string",
    "asset_type": "client|server|other",
    "implemented_at": "YYYY-MM-DD or null",
    "current_usage": "string (optional)",
    "business_criticality": "low|medium|high|critical",
    "confidence_score": "number between 0 and 100 based on data completeness"
  }],
  "assumptions": ["string"],
  "missing_information": ["string"]
}
If information like 'implemented_at' is missing, set it to null and add a note in 'missing_information' indicating what is missing. Do NOT invent dates or metrics.`;

    const sanitizedUserPrompt = sanitizePromptInput(prompt);
    const fullPrompt = `${systemInstruction}\n\nUser Input:\n${sanitizedUserPrompt}`;
    const startTime = Date.now();

    await acquireToken();
    try {
      const { data, error: functionError } = await supabase.functions.invoke('ai-roadmap-parser', {
        body: { prompt: fullPrompt, action: "parse_roadmap_prompt" }
      });

      if (functionError || !data) {
        throw new Error(functionError?.message || "Erro desconhecido ao processar o Roadmap.");
      }

      // Validar dados estruturados da resposta
      const validated = AIRoadmapParseResponseSchema.safeParse(data);
      if (!validated.success) {
        throw new Error("Resposta da IA está fora do formato estruturado esperado: " + validated.error.message);
      }

      const duration = Date.now() - startTime;
      if (duration > 5000) {
        import('@/lib/telemetry').then(({ telemetry }) => {
          telemetry.log('performance_warning', 'warning', 'Lentidão no parse do Roadmap IA', { duration }, duration);
        });
      }

      return validated.data;
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error("[AI_PARSE_DEBUG] Edge Function Parse Error:", error);
      }
      
      // Fallback determinístico de regex local se tudo falhar
      if (import.meta.env.DEV) {
        console.warn("[AI_PARSE_DEBUG] Executando parser determinístico de regex local...");
      }
      const localResult = parseLocalDeterministicRegex(prompt);
      
      if (localResult.items.length > 0) {
        return localResult;
      }

      throw new Error("A IA não conseguiu processar as informações do Roadmap. Tente simplificar o texto ou inserir itens em lotes menores.");
    } finally {
      releaseToken();
    }
  }
};
