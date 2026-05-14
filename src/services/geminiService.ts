import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "@/lib/supabase";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;
const MODEL_NAME = "gemini-1.5-flash";


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

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const delay = Math.pow(2, i) * 1000;
      console.warn(`[Gemini] Tentativa ${i + 1} falhou. Tentando novamente em ${delay}ms...`);
      await sleep(delay);
    }
  }
  throw lastError;
}

export const geminiService = {
  async enrichLifecycle(vendor: string, product: string, version: string, category: string = 'General'): Promise<LifecycleAIResponse> {
    const prompt = `Return ONLY JSON: {vendor,product_name,version,end_of_support,extended_support_end,successor_version,source_url,confidence_score,notes}. Product: ${vendor} ${product} ${version}`.trim();
    const promptHash = await generateHash(prompt);
    
    // 1. Check Cache
    const { data: cached } = await supabase
      .from("lifecycle_catalog")
      .select("*")
      .eq("prompt_hash", promptHash)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (cached) {
      console.log(`[Gemini] Cache hit for ${vendor} ${product}`);
      return cached.raw_response as LifecycleAIResponse;
    }

    // 2. Acquire Token for Concurrency
    await acquireToken();
    const startTime = Date.now();
    
    try {
      const data = await withRetry(async () => {
        if (!genAI) throw new Error("VITE_GEMINI_API_KEY não configurada.");
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const cleanJson = text.replace(/```json|```/g, "").trim();
        return JSON.parse(cleanJson) as LifecycleAIResponse;
      });

      // 3. Persist and Cache

      const ttlDays = getTTLDays(vendor, category);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + ttlDays);

      await supabase.from("lifecycle_catalog").upsert({
        vendor: data.vendor,
        product_name: data.product_name,
        version: data.version,
        end_of_support: data.end_of_support,
        extended_support_end: data.extended_support_end,
        successor_version: data.successor_version,
        source_url: data.source_url,
        confidence_score: data.confidence_score,
        notes: data.notes,
        prompt_hash: promptHash,
        model_name: MODEL_NAME,
        expires_at: expiresAt.toISOString(),
        raw_response: data,
        last_verified_at: new Date().toISOString()
      }, { onConflict: 'vendor,product_name,version' });

      await this.logUsage(MODEL_NAME, "lifecycle_enrichment", startTime, true, promptHash);
      return data;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Gemini Error:", error);
      await this.logUsage(MODEL_NAME, "lifecycle_enrichment", startTime, false, promptHash, errorMessage);
      throw error;
    } finally {
      releaseToken();
    }
  },


  async getExecutiveInsights(kpis: Record<string, unknown>, onDemand: boolean = false): Promise<string[]> {
    if (!onDemand) return []; // Only generate on demand to save tokens

    const prompt = `As CTO advisor, analyze KPIs and return JSON array of 3 short strategic insights: ${JSON.stringify(kpis)}`;
    const promptHash = await generateHash(prompt);
    const startTime = Date.now();

    try {
      const insights = await withRetry(async () => {
        if (!genAI) throw new Error("VITE_GEMINI_API_KEY não configurada.");
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return JSON.parse(response.text().replace(/```json|```/g, "").trim());
      });

      await this.logUsage(MODEL_NAME, "executive_insights", startTime, true, promptHash);
      return insights;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.logUsage(MODEL_NAME, "executive_insights", startTime, false, promptHash, errorMessage);
      return ["Análise estratégica indisponível no momento."];
    }
  },


  async logUsage(model: string, type: string, startTime: number, success: boolean, promptHash?: string, error?: string) {
    try {
      await supabase.from("ai_usage_logs").insert({
        model,
        prompt_type: type,
        execution_time_ms: Date.now() - startTime,
        latency_ms: Date.now() - startTime,
        success,
        status: success ? 'success' : 'error',
        error_message: error,
        prompt_hash: promptHash,
        tokens_used: 0 
      });
    } catch (e) {
      console.error("Log Error:", e);
    }
  }
};
