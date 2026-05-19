import { supabase } from '@/lib/supabase';
import { geminiService } from './geminiService';
import { lifecycleIntelligenceEngine } from './lifecycleIntelligenceEngine';
import type { AIReviewItem } from '@/types';
import { format, differenceInDays } from 'date-fns';

interface FallbackMetadata {
  eol: string;
  successor: string;
  status: 'supported' | 'near_eol' | 'out_of_support' | 'extended_support' | 'unknown';
  url: string;
  insights: string[];
  compatibility: string[];
}

const MICROSOFT_FALLBACK_CATALOG: Record<string, FallbackMetadata> = {
  'windows_10': {
    eol: '2025-10-14',
    successor: 'Windows 11 24H2',
    status: 'near_eol',
    url: 'https://learn.microsoft.com/lifecycle/products/windows-10-home-and-pro',
    insights: ['Próximo do fim do suporte mainstream', 'Necessário planejamento preventivo acelerado', 'Pode exigir renovação de hardware para TPM 2.0'],
    compatibility: ['TPM 2.0 requerido para upgrade', 'Requer processadores compatíveis com Windows 11']
  },
  'windows_11': {
    eol: '2025-11-11',
    successor: 'Windows 11 24H2',
    status: 'supported',
    url: 'https://learn.microsoft.com/lifecycle/products/windows-11-home-and-pro',
    insights: ['Ambiente suportado e atualizado', 'Baixo risco operacional de segurança'],
    compatibility: ['Garantir que TPM 2.0 e UEFI Secure Boot estão habilitados']
  },
  'windows_server_2012_r2': {
    eol: '2023-10-10',
    successor: 'Windows Server 2022',
    status: 'out_of_support',
    url: 'https://learn.microsoft.com/lifecycle/products/windows-server-2012-r2',
    insights: ['Sem patches de segurança oficiais', 'Risco crítico elevado de ransomware / malware', 'Não conformidade direta com LGPD', 'Alto impacto em auditorias operacionais'],
    compatibility: ['Validar compatibilidade de aplicações legadas (.NET antigo)', 'Homologar serviços críticos como Active Directory e DNS']
  },
  'windows_server_2012': {
    eol: '2023-10-10',
    successor: 'Windows Server 2022',
    status: 'out_of_support',
    url: 'https://learn.microsoft.com/lifecycle/products/windows-server-2012',
    insights: ['Sem patches de segurança oficiais', 'Risco crítico elevado de ransomware / malware', 'Não conformidade direta com LGPD', 'Alto impacto em auditorias operacionais'],
    compatibility: ['Validar compatibilidade de aplicações legadas (.NET antigo)', 'Homologar serviços críticos como Active Directory e DNS']
  },
  'windows_server_2016': {
    eol: '2027-01-12',
    successor: 'Windows Server 2022',
    status: 'extended_support',
    url: 'https://learn.microsoft.com/lifecycle/products/windows-server-2016',
    insights: ['Suporte mainstream encerrado. Sob suporte estendido', 'Necessário planejar migração preventiva a médio prazo', 'Patches apenas de segurança crítica'],
    compatibility: ['Homologar containers IIS antigos', 'Testar drivers de armazenamento legados']
  },
  'sql_server_2014': {
    eol: '2024-07-09',
    successor: 'SQL Server 2022',
    status: 'out_of_support',
    url: 'https://learn.microsoft.com/lifecycle/products/sql-server-2014',
    insights: ['Sem suporte mainstream ou estendido', 'Elevado risco de segurança para dados corporativos', 'Vulnerabilidade de exploits de banco de dados'],
    compatibility: ['Alto risco de incompatibilidade com drivers modernos (.NET Core)', 'Necessário testar compatibilidade de procedures legadas']
  }
};

function normalizeProductKey(vendor: string, product: string, version: string): string {
  const full = `${vendor} ${product} ${version}`.toLowerCase();
  if (full.includes('win10') || full.includes('windows 10')) return 'windows_10';
  if (full.includes('win11') || full.includes('windows 11')) return 'windows_11';
  if (full.includes('2012 r2') || full.includes('2012r2')) return 'windows_server_2012_r2';
  if (full.includes('2012')) return 'windows_server_2012';
  if (full.includes('2016')) return 'windows_server_2016';
  if (full.includes('sql') && full.includes('2014')) return 'sql_server_2014';
  return 'other';
}

export const lifecycleEnrichmentService = {
  async enrichLifecycleData(items: AIReviewItem[]): Promise<AIReviewItem[]> {
    const today = new Date();
    const enrichedItems: AIReviewItem[] = [];

    for (const item of items) {
      let end_of_support = item.end_of_support || null;
      let successor_version = item.successor_version || null;
      let support_status: FallbackMetadata['status'] = 'unknown';
      let confidence_source: AIReviewItem['confidence_source'] = item.confidence_source || 'ai';
      let risk_insights: string[] = [];
      let compatibility_notes: string[] = [];
      let lifecycle_url = 'https://learn.microsoft.com/lifecycle/';
      
      const key = normalizeProductKey(item.vendor, item.product_name, item.version);
      
      // 1. Tentar Banco (lifecycle_catalog)
      try {
        const { data: dbCatalog } = await supabase
          .from('lifecycle_catalog')
          .select('*')
          .ilike('product_name', `%${item.product_name}%`)
          .single();
          
        if (dbCatalog) {
          end_of_support = dbCatalog.end_of_support;
          successor_version = dbCatalog.successor_version;
          confidence_source = 'lifecycle_catalog';
          if (dbCatalog.notes) {
            risk_insights.push(dbCatalog.notes);
          }
        }
      } catch (e) {
        // Ignora erros do banco no fallback
      }

      // 2. Se não achou no banco ou campos cruciais vazios, usar catálogo Microsoft estático
      if ((!end_of_support || !successor_version) && key !== 'other') {
        const fb = MICROSOFT_FALLBACK_CATALOG[key];
        end_of_support = fb.eol;
        successor_version = fb.successor;
        support_status = fb.status;
        risk_insights = fb.insights;
        compatibility_notes = fb.compatibility;
        lifecycle_url = fb.url;
        confidence_source = 'deterministic_fallback';
      }

      // 3. Se ainda assim estiver vazio, tentar o enriquecimento da IA Gemini (se ativo)
      if (!end_of_support || !successor_version) {
        try {
          const aiData = await geminiService.enrichLifecycle(item.vendor, item.product_name, item.version);
          if (aiData) {
            end_of_support = aiData.end_of_support;
            successor_version = aiData.successor_version;
            confidence_source = 'ai';
            if (aiData.notes) risk_insights.push(aiData.notes);
          }
        } catch (e) {
          // Mantém vazio
        }
      }

      // 4. Calcular suporte se não estiver predefinido
      if (support_status === 'unknown' && end_of_support) {
        const eolDate = new Date(end_of_support);
        const daysLeft = differenceInDays(eolDate, today);
        if (daysLeft < 0) {
          support_status = 'out_of_support';
        } else if (daysLeft <= 180) {
          support_status = 'near_eol';
        } else {
          support_status = 'supported';
        }
      }

      // Provisoriamente criamos o item com os campos que temos para rodar no motor de decisão
      const tempItem: AIReviewItem = {
        ...item,
        end_of_support,
        successor_version,
        support_status,
        confidence_source
      };

      // Chamar motor de datas/fases do Gantt
      const phaseResult = lifecycleIntelligenceEngine.calculateMigrationPhases(tempItem, end_of_support);
      
      // Chamar motor de dados técnicos e complexidade
      const intelResult = lifecycleIntelligenceEngine.computeIntelligence(tempItem);

      // Gerar a timeline estratégica centralizada da V2 de forma proativa
      const strategic_timeline = lifecycleIntelligenceEngine.generateStrategicTimeline({
        product_name: tempItem.product_name,
        asset_type: tempItem.asset_type,
        business_criticality: tempItem.business_criticality,
        end_of_support: tempItem.end_of_support,
        estimated_cost: tempItem.estimated_cost
      }, today);

      // Fallback de insights genéricos se estiver vazio
      let finalRisk = risk_insights.length > 0 ? risk_insights : (intelResult.requirements || []);
      if (finalRisk.length === 0) {
        if (support_status === 'out_of_support') {
          finalRisk = ['Sem atualizações de segurança críticas', 'Vulnerável a novos exploits', 'Problemas imediatos de conformidade'];
        } else {
          finalRisk = ['Acompanhamento de governança recomendado'];
        }
      }

      enrichedItems.push({
        ...item,
        end_of_support,
        successor_version,
        support_status,
        suggested_start: phaseResult.suggested_start,
        suggested_deadline: phaseResult.suggested_deadline,
        phases: phaseResult.phases,
        risk_insights: finalRisk,
        compatibility_notes: compatibility_notes.length > 0 ? compatibility_notes : (intelResult.requirements || []),
        lifecycle_url,
        last_verified: format(today, 'yyyy-MM-dd'),
        vendor_source: 'Microsoft Official Source',
        confidence_source,
        notes: item.notes || (compatibility_notes[0] || undefined),
        strategic_timeline,
        ...intelResult
      });
    }

    return enrichedItems;
  }
};
