import { z } from "zod";
import type { Criticality } from "./index";

export const AIRoadmapParsedItemSchema = z.object({
  vendor: z.string().default('Microsoft'),
  product_name: z.string().default('Windows'),
  version: z.string().default('unknown'),
  asset_type: z.preprocess((val) => {
    if (typeof val === 'string') {
      const v = val.toLowerCase();
      if (v.includes('client') || v.includes('desktop') || v.includes('pc') || v.includes('win10') || v.includes('win11')) return 'client';
      if (v.includes('server') || v.includes('win server')) return 'server';
    }
    return 'other';
  }, z.enum(['client', 'server', 'other']).default('other')),
  implemented_at: z.string().nullable().optional(),
  current_usage: z.string().optional(),
  business_criticality: z.preprocess((val) => {
    if (typeof val === 'string') {
      const v = val.toLowerCase();
      if (['low', 'medium', 'high', 'critical'].includes(v)) return v;
    }
    return 'medium';
  }, z.enum(['low', 'medium', 'high', 'critical']).default('medium')),
  confidence_score: z.number().min(0).max(100).optional().describe('Pontuação de confiança gerada pela IA (0-100)')
});

export const AIRoadmapParseResponseSchema = z.object({
  project_name: z.string().default('Roadmap de Tecnologia'),
  category: z.string().default('Infraestrutura'),
  items: z.array(AIRoadmapParsedItemSchema).default([]),
  assumptions: z.array(z.string()).default([]),
  missing_information: z.array(z.string()).default([]),
  warning_message: z.string().optional()
});

export type AIRoadmapParsedItem = z.infer<typeof AIRoadmapParsedItemSchema>;
export type AIRoadmapParseResponse = z.infer<typeof AIRoadmapParseResponseSchema>;

export interface AIReviewItem extends AIRoadmapParsedItem {
  id: string; // Gerado no frontend para controle de lista
  end_of_support?: string | null;
  successor_version?: string | null;
  calculated_criticality: Criticality;
  recommended_start_date?: string;
  planned_end_date?: string;
  estimated_cost: number;
  compatibility_risk: 'low' | 'medium' | 'high';
  confidence_source?: 'ai' | 'deterministic_fallback';
  notes?: string;
}

export interface AIReviewData {
  project_name: string;
  category: string;
  items: AIReviewItem[];
  assumptions: string[];
  missing_information: string[];
  warning_message?: string;
}
