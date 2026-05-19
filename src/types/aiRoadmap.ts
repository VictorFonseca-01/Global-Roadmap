import { z } from "zod";
import type { Criticality } from "./index";

export const AIRoadmapParsedItemSchema = z.object({
  vendor: z.string(),
  product_name: z.string(),
  version: z.string(),
  asset_type: z.enum(['client', 'server', 'other']),
  implemented_at: z.string().nullable().describe('ISO date or YYYY-MM-DD. Null se não informado.'),
  current_usage: z.string().optional(),
  business_criticality: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  confidence_score: z.number().min(0).max(100).describe('Pontuação de confiança gerada pela IA (0-100)')
});

export const AIRoadmapParseResponseSchema = z.object({
  project_name: z.string(),
  category: z.string(),
  items: z.array(AIRoadmapParsedItemSchema),
  assumptions: z.array(z.string()),
  missing_information: z.array(z.string())
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
  notes?: string;
}

export interface AIReviewData {
  project_name: string;
  category: string;
  items: AIReviewItem[];
  assumptions: string[];
  missing_information: string[];
}
