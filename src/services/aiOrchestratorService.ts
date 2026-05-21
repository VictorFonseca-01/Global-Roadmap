import { supabase } from '@/lib/supabase';
import { geminiService, getLocalLifecycle } from './geminiService';
import { deterministicEngineService } from './deterministicEngineService';
import type { AIReviewData, AIReviewItem } from '@/types';
import { differenceInDays, parseISO, format, addDays } from 'date-fns';
import { telemetry } from '@/lib/telemetry';
import { normalizeOperatingSystemName } from './importService';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isRetryableError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || error).toLowerCase();
  
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('failed to fetch') || msg.includes('load failed') || msg.includes('connection')) {
    return true;
  }
  
  if (msg.includes('timeout') || msg.includes('aborted') || msg.includes('deadline')) {
    return true;
  }
  
  const status = error.status || (error.context && error.context.status);
  if (status && [429, 500, 502, 503, 504].includes(status)) {
    return true;
  }
  
  if (/\b(429|500|502|503|504)\b/.test(msg)) {
    return true;
  }
  
  return false;
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// ─── Types ───────────────────────────────────────────────────────────────────
interface InventoryGroup {
  vendor: string;
  product_name: string;
  version: string;
  asset_type: 'client' | 'server' | 'other';
  count: number;
  hostnames: string[];
  asset_ids: string[];
}

interface OrchestratorResult {
  reviewData: AIReviewData;
  inventoryBased: boolean;
  totalAssetsAnalyzed: number;
  uniqueTechnologies: number;
}

// ─── Lifecycle Fallback Catalog (EoL dates, successors, costs) ──────────────
const LIFECYCLE_CATALOG: Record<string, { eol: string; successor: string; extendedEol?: string; capexPerUnit: number; opexPerUnit: number }> = {
  'windows_10': { eol: '2025-10-14', successor: 'Windows 11 24H2', extendedEol: '2028-10-14', capexPerUnit: 1200, opexPerUnit: 300 },
  'windows_11': { eol: '2025-11-11', successor: 'Windows 11 24H2', capexPerUnit: 800, opexPerUnit: 200 },
  'windows_11_24h2': { eol: '2026-11-10', successor: 'Next Windows Release', capexPerUnit: 500, opexPerUnit: 150 },
  'windows_server_2012': { eol: '2023-10-10', successor: 'Windows Server 2022', capexPerUnit: 8000, opexPerUnit: 2000 },
  'windows_server_2012_r2': { eol: '2023-10-10', successor: 'Windows Server 2022', capexPerUnit: 8000, opexPerUnit: 2000 },
  'windows_server_2016': { eol: '2027-01-12', successor: 'Windows Server 2025', extendedEol: '2027-01-12', capexPerUnit: 6000, opexPerUnit: 1500 },
  'windows_server_2019': { eol: '2024-01-09', successor: 'Windows Server 2025', extendedEol: '2029-01-09', capexPerUnit: 5000, opexPerUnit: 1200 },
  'windows_server_2022': { eol: '2026-10-13', successor: 'Windows Server 2025', extendedEol: '2031-10-14', capexPerUnit: 4000, opexPerUnit: 1000 },
  'windows_server_2025': { eol: '2029-10-09', successor: 'Next Windows Server', extendedEol: '2034-10-10', capexPerUnit: 3000, opexPerUnit: 800 },
};

function normalizeKey(vendor: string, product: string, version: string): string {
  const full = `${vendor} ${product} ${version}`.toLowerCase();
  if (full.includes('windows 11') && full.includes('24h2')) return 'windows_11_24h2';
  if (full.includes('windows 11') || full.includes('win 11')) return 'windows_11';
  if (full.includes('windows 10') || full.includes('win 10')) return 'windows_10';
  if (full.includes('server') && full.includes('2025')) return 'windows_server_2025';
  if (full.includes('server') && full.includes('2022')) return 'windows_server_2022';
  if (full.includes('server') && full.includes('2019')) return 'windows_server_2019';
  if (full.includes('server') && full.includes('2016')) return 'windows_server_2016';
  if (full.includes('server') && full.includes('2012') && full.includes('r2')) return 'windows_server_2012_r2';
  if (full.includes('server') && full.includes('2012')) return 'windows_server_2012';
  return 'other';
}

// ─── Orchestrator Service ────────────────────────────────────────────────────
export const aiOrchestratorService = {

  /**
   * MAIN ENTRY POINT — Generates a complete roadmap from inventory data.
   * No prompt required. The AI reads the inventory and builds everything.
   * An optional prompt can refine/complement the analysis.
   */
  async orchestrateFromInventory(
    adoptionDatesByTechnology?: Record<string, string | null>, 
    optionalPrompt?: string,
    onStatusChange?: (status: string) => void
  ): Promise<OrchestratorResult> {
    // 1. Fetch current tenant's inventory
    onStatusChange?.("Analisando inventário...");
    const assets = await this.fetchInventory();

    if (!assets || assets.length === 0) {
      throw new Error('EMPTY_INVENTORY');
    }

    // 2. Group assets by technology (vendor + product + version)
    onStatusChange?.("Identificando tecnologias...");
    const groups = this.groupAssetsByTechnology(assets);

    // 3. Enrich each group with lifecycle data (AI first, fallback local)
    onStatusChange?.("Conectando à IA...");
    const enrichedItems = await this.enrichGroups(groups, adoptionDatesByTechnology, onStatusChange);

    // 4. Apply optional prompt context (user refinements)
    if (optionalPrompt && optionalPrompt.trim().length > 10) {
      this.applyPromptRefinements(enrichedItems, optionalPrompt);
    }

    // 5. Build the AIReviewData structure
    const reviewData: AIReviewData = {
      project_name: `Roadmap de Infraestrutura — ${format(new Date(), 'dd/MM/yyyy')}`,
      category: this.detectPrimaryCategory(groups),
      items: enrichedItems,
      assumptions: [
        `Baseado em ${assets.length} ativos do inventário importado.`,
        `${groups.length} tecnologias únicas identificadas.`,
        optionalPrompt ? 'Contexto adicional do usuário aplicado.' : 'Gerado automaticamente a partir do inventário sem input manual.'
      ],
      missing_information: []
    };

    return {
      reviewData,
      inventoryBased: true,
      totalAssetsAnalyzed: assets.length,
      uniqueTechnologies: groups.length
    };
  },

  /**
   * Fetch all assets from the current tenant's inventory
   */
  async fetchInventory() {
    const { data, error } = await supabase
      .from('assets')
      .select('*, lifecycle_catalog(*)')
      .order('hostname');

    if (error) throw error;
    return data || [];
  },

  groupAssetsByTechnology(assets: any[]): InventoryGroup[] {
    const map = new Map<string, InventoryGroup>();

    for (const asset of assets) {
      let vendor = 'Unknown';
      let product = 'Unknown';
      let version = '';

      if (asset.lifecycle_catalog) {
        vendor = asset.lifecycle_catalog.vendor || 'Unknown';
        product = asset.lifecycle_catalog.product_name || 'Unknown';
        version = asset.lifecycle_catalog.version || '';
      } else {
        // Try parsing from asset.notes (raw_inventory_data)
        let parsedNotes = null;
        if (asset.notes) {
          try {
            const parsed = JSON.parse(asset.notes);
            if (parsed && parsed.raw_inventory_data) {
              parsedNotes = parsed.raw_inventory_data;
            }
          } catch (e) {
            // ignore JSON parsing errors
          }
        }

        if (parsedNotes && parsedNotes.os && parsedNotes.os !== 'Unknown') {
          const normalized = normalizeOperatingSystemName(parsedNotes.os);
          vendor = normalized.vendor;
          product = normalized.product;
          version = normalized.version || normalized.version_hint || '';
        } else {
          // Fall back to parsing asset.hostname or other fields via normalizeOperatingSystemName
          const parsed = normalizeOperatingSystemName(asset.hostname || '');
          vendor = parsed.vendor;
          product = parsed.product;
          version = parsed.version || parsed.version_hint || '';
        }
      }

      // Skip unknown/unidentified assets if they really are completely unknown
      if (vendor === 'Unknown' && product === 'Unknown') continue;

      const key = `${vendor}|${product}|${version}`.toLowerCase();

      if (!map.has(key)) {
        map.set(key, {
          vendor,
          product_name: product,
          version,
          asset_type: asset.device_type === 'server' ? 'server' : 'client',
          count: 0,
          hostnames: [],
          asset_ids: []
        });
      }

      const group = map.get(key)!;
      group.count++;
      if (asset.hostname) group.hostnames.push(asset.hostname);
      if (asset.id) group.asset_ids.push(asset.id);
    }

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  },

  /**
   * Enrich each technology group with lifecycle data.
   * Strategy: AI/Edge Function FIRST → Local fallback ONLY on failure.
   */
  async enrichGroups(
    groups: InventoryGroup[], 
    adoptionDatesByTechnology?: Record<string, string | null>,
    onStatusChange?: (status: string) => void
  ): Promise<AIReviewItem[]> {
    const today = new Date();
    const items: AIReviewItem[] = [];

    for (const group of groups) {
      let eol: string | null = null;
      let successor: string | null = null;
      let confidenceScore = 85;
      let confidenceSource: 'ai' | 'deterministic_fallback' = 'ai';
      let capex = group.asset_type === 'server' ? 5000 : 1200;

      // ── Step 1: Try AI/Edge Function enrichment with auto-retry & resilience ──
      let aiResult = null;
      let retries = 0;
      let edgeStatus: 'success' | 'failed_after_retry' | 'error_non_retryable' = 'success';
      let lastError: any = null;

      try {
        // Tentativa 1 — Request normal
        aiResult = await geminiService.enrichLifecycle(group.vendor, group.product_name, group.version, 'General', true);
      } catch (err: any) {
        lastError = err;
        
        if (isRetryableError(err)) {
          retries = 1;
          onStatusChange?.("Tentando novamente...");
          await delay(2000);
          
          try {
            // Tentativa 2 — Retry automático
            aiResult = await geminiService.enrichLifecycle(group.vendor, group.product_name, group.version, 'General', true);
          } catch (retryErr: any) {
            lastError = retryErr;
            retries = 2;
            edgeStatus = 'failed_after_retry';
          }
        } else {
          edgeStatus = 'error_non_retryable';
        }
      }

      // Se a IA respondeu com sucesso
      if (aiResult) {
        eol = aiResult.end_of_support;
        successor = aiResult.successor_version;
        confidenceScore = aiResult.confidence_score || 85;
        if (confidenceScore < 60) {
          confidenceSource = 'deterministic_fallback';
        }
      } else {
        // Falha na IA — ativa fallback local determinístico
        confidenceSource = 'deterministic_fallback';
        onStatusChange?.("Usando análise local segura...");
        
        // Registrar telemetria
        telemetry.log('api_error', 'warning', 'IA Edge Function falhou. Ativando fallback local determinístico.', {
          retry_count: retries,
          fallback_reason: lastError?.message || String(lastError || 'Desconhecido'),
          edge_function_status: edgeStatus,
          vendor: group.vendor,
          product_name: group.product_name,
          version: group.version
        });

        // Tenta obter do catálogo local ou fallback getLocalLifecycle
        const key = normalizeKey(group.vendor, group.product_name, group.version);
        const local = LIFECYCLE_CATALOG[key];
        if (local) {
          eol = local.eol;
          successor = local.successor;
          capex = local.capexPerUnit;
          confidenceScore = 90;
        } else {
          const localFallback = getLocalLifecycle(group.vendor, group.product_name, group.version);
          eol = localFallback.end_of_support;
          successor = localFallback.successor_version;
          confidenceScore = localFallback.confidence_score;
        }
      }

      // ── Step 3: Calculate roadmap fields ──
      const daysRemaining = eol ? differenceInDays(parseISO(eol), today) : null;

      let calculatedCriticality: 'low' | 'medium' | 'high' | 'critical' = 'medium'; // Default for no EoL
      let supportStatus: 'supported' | 'near_eol' | 'out_of_support' | 'extended_support' | 'unknown' = 'supported';

      if (!eol) {
        supportStatus = 'unknown';
        confidenceSource = 'deterministic_fallback';
        calculatedCriticality = 'medium';
      } else if (daysRemaining !== null) {
        if (daysRemaining <= 0) {
          supportStatus = 'out_of_support';
          calculatedCriticality = 'critical';
        } else if (daysRemaining <= 180) {
          supportStatus = 'near_eol';
          calculatedCriticality = 'critical';
        } else if (daysRemaining <= 365) {
          supportStatus = 'supported';
          calculatedCriticality = 'medium';
        } else {
          supportStatus = 'supported';
          calculatedCriticality = 'low';
        }
      }

      let compatibilityRisk: 'low' | 'medium' | 'high' = 'low';
      if (group.asset_type === 'server') compatibilityRisk = 'medium';
      if (daysRemaining !== null && daysRemaining <= 0) compatibilityRisk = 'high';

      const window = eol ? deterministicEngineService.calculateMigrationWindow(eol) : {
        start: format(addDays(today, 30), 'yyyy-MM-dd'),
        end: format(addDays(today, 180), 'yyyy-MM-dd')
      };

      // ── Step 4: Build notes ──
      const notes = eol && daysRemaining !== null
        ? (daysRemaining <= 0
          ? `CRÍTICO: ${group.count} ativo(s) fora de suporte. Migração emergencial recomendada.`
          : daysRemaining <= 180
            ? `${group.count} ativo(s) perdem suporte em ${daysRemaining} dias. Planejamento urgente.`
            : `${group.count} ativo(s) com suporte ativo. Planejamento preventivo sugerido.`)
        : `Revisar lifecycle — ${group.count} ativo(s). Sem EoL definido no catálogo, revisão recomendada.`;

      // Use provided adoption date if any
      const key = normalizeKey(group.vendor, group.product_name, group.version);
      const implementedAt = adoptionDatesByTechnology?.[key] || null;

      items.push({
        id: `inv-${Date.now()}-${items.length}`,
        vendor: group.vendor,
        product_name: group.product_name,
        version: group.version,
        asset_type: group.asset_type,
        implemented_at: implementedAt,
        business_criticality: calculatedCriticality,
        calculated_criticality: calculatedCriticality,
        compatibility_risk: compatibilityRisk,
        estimated_cost: capex * group.count,
        confidence_score: confidenceScore,
        confidence_source: confidenceSource,
        end_of_support: eol || null,
        successor_version: successor,
        recommended_start_date: window.start,
        support_status: supportStatus,
        notes,
        current_usage: `${group.count} ativo(s): ${group.hostnames.slice(0, 5).join(', ')}${group.hostnames.length > 5 ? ` +${group.hostnames.length - 5} mais` : ''}`,
        asset_ids: group.asset_ids
      });
    }

    return items;
  },

  /**
   * Apply user prompt refinements to enriched items.
   * Parse simple directives like dates, priorities, exclusions.
   */
  applyPromptRefinements(items: AIReviewItem[], prompt: string) {
    const lower = prompt.toLowerCase();

    // Detect date overrides (e.g., "implementado em 01/01/2024")
    const dateMatch = prompt.match(/implementad[oa]\s+em\s+(\d{2})\/(\d{2})\/(\d{4})/i);
    if (dateMatch) {
      const implDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
      items.forEach(item => {
        if (!item.implemented_at) item.implemented_at = implDate;
      });
    }

    // Detect priority overrides
    if (lower.includes('prioriz') && lower.includes('servidor')) {
      items.forEach(item => {
        if (item.asset_type === 'server') {
          item.calculated_criticality = 'critical';
          item.business_criticality = 'critical';
        }
      });
    }

    // Detect exclusions
    if (lower.includes('desconsider') && lower.includes('laboratório')) {
      // Mark lab machines as low priority
      items.forEach(item => {
        const usage = (item.current_usage || '').toLowerCase();
        if (usage.includes('lab') || usage.includes('laboratório')) {
          item.calculated_criticality = 'low';
          item.business_criticality = 'low';
        }
      });
    }
  },

  /**
   * Detect the primary category based on the most common technology
   */
  detectPrimaryCategory(groups: InventoryGroup[]): string {
    const hasServer = groups.some(g => g.asset_type === 'server');
    const hasClient = groups.some(g => g.asset_type === 'client');

    if (hasServer && hasClient) return 'Microsoft Infrastructure';
    if (hasServer) return 'Windows Server';
    return 'Windows Client';
  }
};
