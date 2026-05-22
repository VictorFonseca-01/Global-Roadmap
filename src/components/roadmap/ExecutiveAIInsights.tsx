import { useState, useEffect } from 'react';
import { Loader2, Sparkles, BrainCircuit } from 'lucide-react';
import type { ConsolidatedTechnologyGroup } from '@/services/timelineAggregationService';
import type { IntelligenceScore } from '@/services/operationalIntelligenceEngine';

interface ExecutiveAIInsightsProps {
  group: ConsolidatedTechnologyGroup;
  metrics: IntelligenceScore;
}

export function ExecutiveAIInsights({ group, metrics }: ExecutiveAIInsightsProps) {
  const [insights, setInsights] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    // Simulate AI generation with fallback to deterministic local insights
    const generateInsights = async () => {
      try {
        // Fast deterministic logic for 60fps responsiveness
        const deterministicBullets: string[] = [];
        
        if (metrics.riskScore > 75) {
          deterministicBullets.push(`Risco Crítico: Postergação inviável. Risco de interrupção operacional atingiu ${metrics.riskScore}%.`);
        } else if (metrics.riskScore > 40) {
          deterministicBullets.push(`Alerta de Risco: O cronograma atual apresenta ${metrics.riskScore}% de risco de exposição.`);
        } else {
          deterministicBullets.push(`Cenário Seguro: Transição dentro da janela operacional com baixo risco (${metrics.riskScore}%).`);
        }

        if (metrics.delayCost > 0) {
          deterministicBullets.push(`Impacto Financeiro: O atraso em relação ao EoL está gerando ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(metrics.delayCost)} de custo extra.`);
        }

        if (metrics.priorityScore > 80) {
          deterministicBullets.push(`Prioridade Executiva: Ação imediata requerida. Alto impacto na governança global.`);
        }

        deterministicBullets.push(`Mitigação Recomendada: Atualizar para a versão homologada "${group.recommendedUpgrade}" o mais rápido possível.`);

        // Limit to max 5 bullets as requested
        setInsights(deterministicBullets.slice(0, 5));
      } finally {
        setIsLoading(false);
      }
    };

    generateInsights();
  }, [group, metrics]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
        <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
        <span className="text-xs text-indigo-300">Gerando parecer executivo...</span>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#0d1b33] to-slate-900 border border-indigo-500/30 rounded-xl overflow-hidden shadow-lg">
      <div className="bg-indigo-500/20 border-b border-indigo-500/20 px-3 py-2 flex items-center gap-2">
        <BrainCircuit className="w-4 h-4 text-indigo-400" />
        <h4 className="text-xs font-bold text-indigo-300 tracking-wide">Parecer Executivo AI</h4>
        <Sparkles className="w-3 h-3 text-amber-400 ml-auto" />
      </div>
      <div className="p-4 space-y-2.5">
        {insights.map((bullet, idx) => (
          <div key={idx} className="flex gap-2 items-start">
            <span className="text-indigo-400 text-[10px] mt-0.5 font-black">▶</span>
            <span className="text-xs text-slate-300 leading-snug">{bullet}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
