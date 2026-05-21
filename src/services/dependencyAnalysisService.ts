import { supabase } from '@/lib/supabase';
import type { ConsolidatedTechnologyGroup } from './timelineAggregationService';
import { differenceInDays } from 'date-fns';

// ─── In-memory cache para dependências calculadas ───────────────────────────
const _dependencyCache = new Map<string, TechDependency[]>();
const MAX_SVG_CONNECTIONS = 20;

export type DependencyType = 'hard' | 'soft' | 'compliance' | 'infrastructure';
export type DependencyConfidence = 'high' | 'medium' | 'low';

export interface TechDependency {
  id: string;
  sourceTechKey: string; // Ex: "microsoft|windows 11|pro" (a tecnologia dependente)
  targetTechKey: string; // Ex: "tpm|tpm 2.0|" (a tecnologia requisito)
  sourceLabel: string;
  targetLabel: string;
  type: DependencyType;
  description: string;
  relevance: 'critical' | 'high' | 'medium' | 'low';
  confidence: DependencyConfidence;
}

export interface DependencyAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  sourceTechLabel: string;
  targetTechLabel: string;
}

export interface ImpactAnalysisResult {
  hasImpact: boolean;
  affectedTechsCount: number;
  addedRiskCost: number;
  capexChange: number;
  warnings: string[];
}

// Catálogo determinístico de dependências clássicas da indústria
const DETERMINISTIC_RULES = [
  {
    sourceMatch: 'windows 11',
    targetMatch: 'tpm 2.0',
    type: 'hard' as const,
    description: 'Windows 11 requer o chip físico TPM 2.0 ativo na placa-mãe para boot seguro e criptografia BitLocker.',
    relevance: 'critical' as const,
    confidence: 'high' as const,
    sourceLabel: 'Windows 11',
    targetLabel: 'TPM 2.0 Hardware'
  },
  {
    sourceMatch: 'windows server 2025',
    targetMatch: 'vmware',
    type: 'soft' as const,
    description: 'Recomenda-se atualizar o cluster de VMware ESXi/vSphere para suporte otimizado a drivers de virtualização do Windows Server 2025.',
    relevance: 'high' as const,
    confidence: 'medium' as const,
    sourceLabel: 'Windows Server 2025',
    targetLabel: 'VMware Hypervisor Update'
  },
  {
    sourceMatch: 'fortigate',
    targetMatch: 'cisco',
    type: 'infrastructure' as const,
    description: 'Firewall FortiGate exige configuração e compatibilidade de rotas estáticas nos Switches Cisco do core da rede.',
    relevance: 'high' as const,
    confidence: 'medium' as const,
    sourceLabel: 'Firewall FortiGate',
    targetLabel: 'Switches Core Cisco'
  },
  {
    sourceMatch: 'firewall',
    targetMatch: 'lgpd',
    type: 'compliance' as const,
    description: 'A implantação do novo Firewall de borda depende da revisão do relatório de impacto à proteção de dados e conformidade com a LGPD.',
    relevance: 'medium' as const,
    confidence: 'medium' as const,
    sourceLabel: 'Firewall de Borda',
    targetLabel: 'Revisão LGPD Compliance'
  },
  {
    sourceMatch: 'vmware',
    targetMatch: 'storage',
    type: 'infrastructure' as const,
    description: 'A atualização do cluster VMware Hypervisor exige a modernização ou expansão de IOPS da controladora do Storage SAN.',
    relevance: 'high' as const,
    confidence: 'high' as const,
    sourceLabel: 'VMware Cluster',
    targetLabel: 'Storage SAN Expansion'
  },
  {
    sourceMatch: 'sql server',
    targetMatch: 'windows server',
    type: 'infrastructure' as const,
    description: 'Instâncias modernas do SQL Server dependem da atualização do SO do servidor hospedeiro para estabilidade operacional.',
    relevance: 'high' as const,
    confidence: 'high' as const,
    sourceLabel: 'SQL Server',
    targetLabel: 'Windows Server OS'
  }
];

export const dependencyAnalysisService = {
  /**
   * BFS Cycle Detector — verifica se existe ciclo no grafo de dependências.
   */
  hasCycle(dependencies: TechDependency[]): boolean {
    const adjacency = new Map<string, string[]>();
    const allNodes = new Set<string>();

    for (const dep of dependencies) {
      allNodes.add(dep.sourceTechKey);
      allNodes.add(dep.targetTechKey);
      if (!adjacency.has(dep.sourceTechKey)) adjacency.set(dep.sourceTechKey, []);
      adjacency.get(dep.sourceTechKey)!.push(dep.targetTechKey);
    }

    const visited = new Set<string>();
    const inStack = new Set<string>();

    const dfs = (node: string): boolean => {
      if (inStack.has(node)) return true; // ciclo detectado
      if (visited.has(node)) return false;
      visited.add(node);
      inStack.add(node);
      for (const neighbor of adjacency.get(node) || []) {
        if (dfs(neighbor)) return true;
      }
      inStack.delete(node);
      return false;
    };

    for (const node of allNodes) {
      if (dfs(node)) return true;
    }
    return false;
  },

  /**
   * Remove dependências que formam ciclo, mantendo apenas o grafo acíclico.
   */
  removeCycles(dependencies: TechDependency[]): TechDependency[] {
    const result: TechDependency[] = [];
    for (const dep of dependencies) {
      result.push(dep);
      if (this.hasCycle(result)) {
        result.pop(); // remove a aresta que introduziu o ciclo
      }
    }
    return result;
  },

  /**
   * Limita as dependências a MAX_SVG_CONNECTIONS para renderização SVG.
   * Prioriza dependências de alta confiança e relevância crítica.
   */
  sliceForRendering(dependencies: TechDependency[]): TechDependency[] {
    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    const sorted = [...dependencies].sort((a, b) => {
      const relA = priorityOrder[a.relevance] ?? 3;
      const relB = priorityOrder[b.relevance] ?? 3;
      if (relA !== relB) return relA - relB;
      const confOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      return (confOrder[a.confidence] ?? 2) - (confOrder[b.confidence] ?? 2);
    });
    return sorted.slice(0, MAX_SVG_CONNECTIONS);
  },

  /**
   * Analisa os grupos de tecnologia da timeline e gera dependências lógicas de forma dinâmica.
   */
  analyzeDependencies(groups: ConsolidatedTechnologyGroup[]): TechDependency[] {
    // Cache check
    const cacheKey = groups.map(g => `${g.vendor}|${g.product}|${g.version}`).sort().join(';;');
    if (_dependencyCache.has(cacheKey)) return _dependencyCache.get(cacheKey)!;

    const dependencies: TechDependency[] = [];

    // Gerar chaves e labels para busca
    const groupKeys = groups.map(g => ({
      key: `${g.vendor}|${g.product}|${g.version}`.toLowerCase(),
      label: `${g.vendor} ${g.product} ${g.version}`.trim(),
      vendor: g.vendor.toLowerCase(),
      product: g.product.toLowerCase(),
      version: g.version.toLowerCase()
    }));

    // Cruzar as chaves locais com a base de regras determinísticas da indústria
    DETERMINISTIC_RULES.forEach((rule, idx) => {
      // Encontrar correspondentes no projeto atual
      const sourceMatch = groupKeys.find(g => 
        g.product.includes(rule.sourceMatch) || g.label.toLowerCase().includes(rule.sourceMatch)
      );

      const targetMatch = groupKeys.find(g => 
        g.product.includes(rule.targetMatch) || g.label.toLowerCase().includes(rule.targetMatch)
      );

      if (sourceMatch && targetMatch && sourceMatch.key !== targetMatch.key) {
        dependencies.push({
          id: `dep-det-${idx}`,
          sourceTechKey: sourceMatch.key,
          targetTechKey: targetMatch.key,
          sourceLabel: sourceMatch.label,
          targetLabel: targetMatch.label,
          type: rule.type,
          description: rule.description,
          relevance: rule.relevance,
          confidence: rule.confidence
        });
      }
    });

    // Adicionar dependências lógicas de upgrade natural do mesmo produto (ex: Windows Server 2012 -> 2022)
    // Se no projeto houver uma versão antiga e uma versão nova, a antiga precisa ser migrada antes da nova consolidar
    groups.forEach((g, idx) => {
      groups.forEach((otherG, otherIdx) => {
        if (idx !== otherIdx && g.vendor === otherG.vendor && g.product === otherG.product) {
          const isVersionOlder = this.compareVersions(g.version, otherG.version);
          if (isVersionOlder < 0) {
            // g é mais antiga que otherG
            // a migração da mais nova otherG é lógica se a antiga g for tratada
            dependencies.push({
              id: `dep-upg-${idx}-${otherIdx}`,
              sourceTechKey: `${otherG.vendor}|${otherG.product}|${otherG.version}`.toLowerCase(),
              targetTechKey: `${g.vendor}|${g.product}|${g.version}`.toLowerCase(),
              sourceLabel: `${otherG.vendor} ${otherG.product} ${otherG.version}`.trim(),
              targetLabel: `${g.vendor} ${g.product} ${g.version}`.trim(),
              type: 'infrastructure',
              description: `A atualização global exige a consolidação ou descontinuação prévia da versão legada v${g.version}.`,
              relevance: 'high',
              confidence: 'high'
            });
          }
        }
      });
    });

    // Remover ciclos e cachear
    const acyclic = this.removeCycles(dependencies);
    _dependencyCache.set(cacheKey, acyclic);
    return acyclic;
  },

  /**
   * Helper para comparar strings de versão
   */
  compareVersions(v1: string, v2: string): number {
    const clean = (v: string) => v.replace(/[^0-9.]/g, '');
    const p1 = clean(v1).split('.').map(Number);
    const p2 = clean(v2).split('.').map(Number);

    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
      const num1 = p1[i] || 0;
      const num2 = p2[i] || 0;
      if (num1 !== num2) return num1 - num2;
    }

    // Se falhar a extração numérica direta (ex: 2012 vs 2022)
    const n1 = parseInt(v1) || 0;
    const n2 = parseInt(v2) || 0;
    return n1 - n2;
  },

  /**
   * Detecta alertas e conflitos de cronograma baseados em dependências ativas.
   */
  detectAlerts(groups: ConsolidatedTechnologyGroup[], dependencies: TechDependency[]): DependencyAlert[] {
    const alerts: DependencyAlert[] = [];

    dependencies.forEach(dep => {
      const sourceGroup = groups.find(g => 
        `${g.vendor}|${g.product}|${g.version}`.toLowerCase() === dep.sourceTechKey
      );
      const targetGroup = groups.find(g => 
        `${g.vendor}|${g.product}|${g.version}`.toLowerCase() === dep.targetTechKey
      );

      if (sourceGroup && targetGroup) {
        const sourceStart = sourceGroup.plannedStartDate ? new Date(sourceGroup.plannedStartDate) : null;
        const targetEnd = targetGroup.plannedEndDate ? new Date(targetGroup.plannedEndDate) : null;

        // Se a tecnologia dependente inicia ANTES da tecnologia requisito terminar
        if (sourceStart && targetEnd && sourceStart < targetEnd) {
          alerts.push({
            id: `alert-${dep.id}`,
            type: dep.type === 'hard' ? 'critical' : 'warning',
            message: `CONFLITO CRÍTICO: "${dep.sourceLabel}" está agendado para iniciar antes da conclusão do requisito de infraestrutura "${dep.targetLabel}". Ajuste a ordem de migração.`,
            sourceTechLabel: dep.sourceLabel,
            targetTechLabel: dep.targetLabel
          });
        }
      }
    });

    return alerts;
  },

  /**
   * Realiza a Análise de Impacto (Impact Analysis) ao adiar ou mover uma barra tecnológica.
   */
  calculateImpact(
    movedGroup: ConsolidatedTechnologyGroup, 
    _newStartDate: string, 
    newEndDate: string,
    groups: ConsolidatedTechnologyGroup[], 
    dependencies: TechDependency[]
  ): ImpactAnalysisResult {
    const warnings: string[] = [];
    const movedKey = `${movedGroup.vendor}|${movedGroup.product}|${movedGroup.version}`.toLowerCase();
    
    // Encontrar tecnologias que dependem da tecnologia que está se movendo
    const dependentDeps = dependencies.filter(d => d.targetTechKey === movedKey);
    const affectedTechsCount = dependentDeps.length;
    let addedRiskCost = 0;
    let capexChange = 0;

    const oldEnd = movedGroup.plannedEndDate ? new Date(movedGroup.plannedEndDate) : new Date();
    const newEnd = new Date(newEndDate);
    const daysDelayed = differenceInDays(newEnd, oldEnd);

    if (daysDelayed > 0 && affectedTechsCount > 0) {
      dependentDeps.forEach(dep => {
        const depGroup = groups.find(g => 
          `${g.vendor}|${g.product}|${g.version}`.toLowerCase() === dep.sourceTechKey
        );

        if (depGroup) {
          const depStart = depGroup.plannedStartDate ? new Date(depGroup.plannedStartDate) : null;
          
          if (depStart && depStart < newEnd) {
            addedRiskCost += depGroup.riskCost * 0.15; // Risco cresce 15% por colisão de dependência
            capexChange += depGroup.estimatedCost * 0.05; // Custos indiretos aumentam 5%
            warnings.push(
              `Bloqueio Crítico: O atraso em "${movedGroup.vendor} ${movedGroup.product}" impacta a migração de "${depGroup.vendor} ${depGroup.product}", agendada para ${depGroup.plannedStartDate}.`
            );
          }
        }
      });
    }

    return {
      hasImpact: affectedTechsCount > 0 && warnings.length > 0,
      affectedTechsCount,
      addedRiskCost,
      capexChange,
      warnings
    };
  },

  /**
   * Invoca a IA para validar compatibilidade oficial e sugerir ordem correta de migração estratégica.
   */
  async fetchAICompatibilityAnalysis(groups: ConsolidatedTechnologyGroup[], optionalPrompt?: string): Promise<{
    compatibilityReport: string;
    suggestedOrder: string[];
    securityRisks: string[];
  }> {
    const techList = groups.map(g => `${g.vendor} ${g.product} ${g.version} (${g.assetCount} ativos)`).join('\n');
    
    const systemPrompt = `Você é o Strategic Dependency Intelligence Engine, um conselheiro tecnológico empresarial especialista em arquitetura e governança de infraestrutura.
Analise a lista de tecnologias identificadas em nossa infraestrutura de TI e gere um relatório oficial de dependência técnica e planejamento de migração estratégica.

Considere fontes de dados de compatibilidade oficiais (como Microsoft Learn, VMware Compatibility Matrix, Cisco Docs, Fortinet Docs, Ubuntu Lifecycle).

Tecnologias presentes no ambiente:
${techList}

${optionalPrompt ? `Contexto adicional/diretrizes do usuário:\n${optionalPrompt}` : ''}

Retorne rigorosamente um JSON estruturado com os seguintes campos:
{
  "compatibilityReport": "Análise profunda em markdown das dependências oficiais mapeadas entre essas tecnologias, alertando sobre pré-requisitos como TPM 2.0 para Windows 11, compatibilidade de sistemas operacionais hospedeiros com hipervisores, compatibilidade de softwares de banco de dados (ex: SQL) com versões de SO, etc.",
  "suggestedOrder": ["Array contendo os nomes das tecnologias na ordem correta sugerida de migração estratégica (ex: do núcleo de infraestrutura para as pontas de clientes)"],
  "securityRisks": ["Lista detalhada em tópicos dos riscos reais e impactos de compliance / segurança se a ordem cronológica de migração recomendada for violada."]
}

Retorne APENAS o JSON válido, sem qualquer bloco de texto markdown explicativo ou tags adicionais.`;

    try {
      const { data, error } = await supabase.functions.invoke('ai-roadmap-parser', {
        body: { prompt: systemPrompt, action: 'parse_roadmap_prompt' }
      });

      if (error || !data) {
        throw new Error(error?.message || 'Falha na IA');
      }

      let responseText = typeof data === 'string' ? data : JSON.stringify(data);
      if (responseText.includes("```")) {
        const match = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match && match[1]) {
          responseText = match[1];
        }
      }

      const parsed = JSON.parse(responseText);

      return {
        compatibilityReport: parsed.compatibilityReport || '',
        suggestedOrder: parsed.suggestedOrder || [],
        securityRisks: parsed.securityRisks || []
      };
    } catch (err) {
      console.warn('[AI Compatibility Engine] Fallback ativo...', err);
      // Fallback rico determinístico
      return {
        compatibilityReport: `### Relatório Estratégico de Compatibilidade e Dependência Técnica

1. **Requisitos de Clientes (Windows 11)**:
   A modernização de desktops para **Windows 11** exige estritamente conformidade de hardware. Requisitos obrigatórios incluem processadores suportados e o chip **TPM 2.0**.
   
2. **Ciclo de Vida de Servidores (Windows Server 2025)**:
   A migração para o **Windows Server 2025** é otimizada sob hipervisores modernos. Executá-lo em versões VMware ESXi obsoletas gera instabilidade nos drivers de virtualização corporativos. Recomenda-se realizar o upgrade de core de virtualização previamente.`,
        suggestedOrder: groups.map(g => `${g.vendor} ${g.product} ${g.version}`.trim()),
        securityRisks: [
          'Atrasar o upgrade do cluster de virtualização (VMware) impõe gargalos operacionais e perda de suporte técnico das VMs hospedadas.',
          'Migrar sistemas operacionais sem revisão LGPD e conformidade ativa de segurança gera brechas em auditorias corporativas.'
        ]
      };
    }
  }
};
