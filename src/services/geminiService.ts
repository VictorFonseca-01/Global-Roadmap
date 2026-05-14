import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "@/lib/supabase";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

export const geminiService = {
  async enrichLifecycle(vendor: string, product: string, version: string) {
    const startTime = Date.now();
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = `
        Search for official End of Support (EoL/EoS) information for the following technology product:
        Vendor: ${vendor}
        Product: ${product}
        Version: ${version}

        Return ONLY a JSON object with the following structure:
        {
          "vendor": "string",
          "product_name": "string",
          "version": "string",
          "end_of_support": "YYYY-MM-DD",
          "extended_support_end": "YYYY-MM-DD or null",
          "successor_version": "string or null",
          "source_url": "string (official source URL)",
          "confidence_score": number (0-100),
          "notes": "short strategic note"
        }
        Use official data from the vendor's lifecycle page. If you are not sure, set confidence_score lower than 70.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Limpar o texto para garantir que é um JSON válido (removendo markdown se houver)
      const cleanJson = text.replace(/```json|```/g, "").trim();
      const data = JSON.parse(cleanJson);

      // Log de sucesso
      await this.logUsage("gemini-1.5-flash", "lifecycle_enrichment", startTime, true);

      return data;
    } catch (error: any) {
      console.error("Gemini Error:", error);
      await this.logUsage("gemini-1.5-flash", "lifecycle_enrichment", startTime, false, error.message);
      throw error;
    }
  },

  async getExecutiveInsights(kpis: any) {
    const startTime = Date.now();
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = `
        As a CTO advisor, analyze these Technology Roadmap KPIs and provide 3 executive insights (one sentence each):
        ${JSON.stringify(kpis)}
        
        Focus on:
        1. Risk exposure (critical assets)
        2. Budget impact
        3. Strategic urgency
        
        Return the insights as a simple string array: ["insight 1", "insight 2", "insight 3"]
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const cleanJson = text.replace(/```json|```/g, "").trim();
      const insights = JSON.parse(cleanJson);

      await this.logUsage("gemini-1.5-flash", "executive_insights", startTime, true);
      return insights;
    } catch (error: any) {
      await this.logUsage("gemini-1.5-flash", "executive_insights", startTime, false, error.message);
      return ["Análise de risco pendente.", "Verifique ativos críticos no dashboard.", "Planejamento sugerido para os próximos 180 dias."];
    }
  },

  async logUsage(model: string, type: string, startTime: number, success: boolean, error?: string) {
    try {
      await supabase.from("ai_usage_logs").insert({
        model,
        prompt_type: type,
        execution_time_ms: Date.now() - startTime,
        success,
        error_message: error,
        tokens_used: 0 // Simplificado
      });
    } catch (e) {
      console.error("Log Error:", e);
    }
  }
};
