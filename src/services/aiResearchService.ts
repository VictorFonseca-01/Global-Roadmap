import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

export const aiResearchService = {
  async researchTopic(query: string): Promise<string> {
    if (!API_KEY) {
      return "⚠️ VITE_GEMINI_API_KEY não está configurada no ambiente.";
    }
    
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const prompt = `Você é um assistente de pesquisa técnica focado em TI, infraestrutura, software e roadmap. Responda de forma clara, concisa e técnica à seguinte pergunta:\n\n${query}`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error: unknown) {
      console.error("Erro na pesquisa:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      return `❌ Ocorreu um erro ao pesquisar: ${errorMessage}`;
    }
  }
};
