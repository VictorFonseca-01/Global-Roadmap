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

export interface MigrationPhases {
  homologation_start?: string;
  homologation_end?: string;
  pilot_start?: string;
  pilot_end?: string;
  rollout_start?: string;
  rollout_end?: string;
  coexistence_start?: string;
  coexistence_end?: string;
  deactivation_start?: string;
  deactivation_end?: string;
}

export interface AIReviewItem extends AIRoadmapParsedItem {
  id: string; // Gerado no frontend para controle de lista
  end_of_support?: string | null;
  successor_version?: string | null;
  calculated_criticality: Criticality;
  recommended_start_date?: string;
  planned_end_date?: string;
  estimated_cost: number;
  compatibility_risk: 'low' | 'medium' | 'high';
  confidence_source?: 'ai' | 'deterministic_fallback' | 'lifecycle_catalog';
  support_status?: 'supported' | 'near_eol' | 'out_of_support' | 'extended_support' | 'unknown';
  suggested_start?: string;
  suggested_deadline?: string;
  risk_insights?: string[];
  compatibility_notes?: string[];
  lifecycle_url?: string;
  last_verified?: string;
  vendor_source?: string;
  
  // Enterprise Evolution Fields
  migration_strategy?: string;
  migration_complexity?: 'low' | 'medium' | 'high' | 'critical';
  rollback_plan?: string;
  opex_savings?: number;
  requirements?: string[];
  phases?: MigrationPhases;
  strategic_timeline?: StrategicTimelineResult;
  
  notes?: string;
  asset_ids?: string[];
}

export interface StrategicPhase {
  type: 'homologation' | 'pilot' | 'rollout' | 'coexistence' | 'decommission';
  start_date: string;
  end_date: string;
  duration_days: number;
  status: 'planned' | 'active' | 'completed' | 'delayed';
  objective?: string;
  risks?: string[];
  dependencies?: string[];
  compliance_notes?: string[];
}

export interface StrategicTimelineResult {
  phases: StrategicPhase[];
  critical_path_status: 'on_track' | 'at_risk' | 'overdue' | 'blocked';
  compliance_impact: 'low' | 'medium' | 'high' | 'critical';
  migration_readiness?: 'ready' | 'requires_assessment' | 'blocked' | 'high_risk';
  health_score_impact?: number;
  
  // V2 Hardened decision properties
  recommended_target_version?: string;
  migration_strategy?: string;
  recommended_platform?: string;
  migration_target_label?: string;
  recommended_start_date?: string;
  safe_migration_window_days?: number;
  contingency_buffer_days?: number;
  urgency_level?: 'immediate' | 'high' | 'medium' | 'low';
  migration_window_status?: 'safe' | 'warning' | 'critical' | 'expired';
  operational_risk_cost?: number;
  badges?: string[];
  executive_narrative?: string;
  health_score_breakdown?: Array<{ penalty: number; reason: string }>;
  
  // Simulation layer
  simulation_impact?: string;
  predicted_health_score?: number;
  predicted_opex_savings?: number;
  predicted_risk_reduction?: number;

  // V3 Decision Simulation and Deadline properties
  recommended_cutover_date?: string;
  rollback_deadline?: string;
  safe_window_remaining_days?: number;
  migration_prerequisites?: string[];
  blocked_by?: string[];
  dependencies?: string[];
}

export interface AIReviewData {
  project_name: string;
  category: string;
  items: AIReviewItem[];
  assumptions: string[];
  missing_information: string[];
  warning_message?: string;
}
