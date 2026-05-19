import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { migrationPlanService } from "@/services/migrationPlanService";
import { lifecycleIntelligenceEngine } from "@/services/lifecycleIntelligenceEngine";
import { 
  format, 
  parseISO, 
  isBefore,
  differenceInDays
} from "date-fns";
import { motion } from "framer-motion";
import { 
  ShieldAlert, 
  ShieldCheck, 
  ChevronRight,
  Target,
  Rocket,
  CheckCircle2,
  TrendingDown,
  Info,
  DollarSign,
  Award,
  Calendar,
  AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ExecutivePresentation({ projectId }: { projectId?: string }) {
  const { data: allPlans = [], isLoading } = useQuery({
    queryKey: ["migration-plans"],
    queryFn: () => migrationPlanService.getAll(),
  });

  const plans = projectId 
    ? allPlans.filter(p => p.roadmap_project_id === projectId)
    : allPlans;

  const today = new Date();
  const [simulatedDelays, setSimulatedDelays] = useState<Record<string, number>>({});

  if (isLoading) return <div className="p-20 text-center animate-pulse font-black text-slate-300 uppercase tracking-widest">Gerando Relatório Executivo...</div>;

  // 1. Memoizar o cálculo de métricas consolidadas do Dashboard
  const {
    healthScore,
    simulatedHealthScore,
    activeSimulationsCount,
    securityScore,
    complianceScore,
    stabilityScore,
    governanceScore,
    readinessScore,
    totalCost
  } = useMemo(() => {
    const strategicInput = plans.map(p => ({
      product_name: p.assets?.lifecycle_catalog?.product_name || '',
      asset_type: p.assets?.device_type || 'client',
      business_criticality: p.assets?.business_criticality || p.priority || 'low',
      end_of_support: p.assets?.lifecycle_catalog?.end_of_support || null,
      estimated_cost: p.estimated_cost || 0
    }));

    const computedHealth = lifecycleIntelligenceEngine.calculateInfrastructureHealthScore(strategicInput, today);

    // Calcular score simulado
    const computedSimulated = Math.round(
      plans.reduce((acc, p) => {
        const eol = p.assets?.lifecycle_catalog?.end_of_support || null;
        const delay = simulatedDelays[p.id] || 0;
        const todaySimulated = delay > 0 ? new Date(today.getTime() + delay * 30 * 24 * 60 * 60 * 1000) : today;
        return acc + lifecycleIntelligenceEngine.calculateInfrastructureHealthScore([{
          product_name: p.assets?.lifecycle_catalog?.product_name || '',
          asset_type: p.assets?.device_type || 'client',
          business_criticality: p.assets?.business_criticality || p.priority || 'low',
          end_of_support: eol,
          estimated_cost: p.estimated_cost || 0
        }], todaySimulated);
      }, 0) / (plans.length || 1)
    );

    const simCount = Object.values(simulatedDelays).filter(d => d > 0).length;

    // Calcular pilares determinísticos baseados nos itens
    let sec = 100;
    let comp = 100;
    let stab = 100;
    let gov = 100;
    let read = 100;

    plans.forEach(p => {
      const eolStr = p.assets?.lifecycle_catalog?.end_of_support || null;
      const eolDate = eolStr ? parseISO(eolStr) : null;
      const product = (p.assets?.lifecycle_catalog?.product_name || '').toLowerCase();
      const assetType = (p.assets?.device_type || 'client').toLowerCase();
      const criticality = (p.assets?.business_criticality || p.priority || 'low').toLowerCase();

      const isServer = assetType === 'server' || product.includes('server');
      const isCritical = criticality === 'critical';
      const hasSuccessor = !!eolStr && !!(product.includes('10') ? 'Windows 11 24H2' : product.includes('2012') ? 'Windows Server 2022' : product.includes('2016') ? 'Windows Server 2022' : product.includes('sql') ? 'SQL Server 2022' : '');

      let support_status: 'supported' | 'near_eol' | 'out_of_support' = 'supported';
      if (eolDate) {
        if (isBefore(eolDate, today)) {
          support_status = 'out_of_support';
        } else if (differenceInDays(eolDate!, today) <= 180) {
          support_status = 'near_eol';
        }
      }

      if (support_status === 'out_of_support') {
        sec -= 15;
        comp -= 15;
      }
      if (support_status === 'near_eol') {
        comp -= 10;
      }
      if (isServer && isCritical) {
        stab -= 10;
      }
      if (!hasSuccessor) {
        gov -= 10;
      }

      let isBlocked = !hasSuccessor && !product.includes('11') && !product.includes('2016') && !product.includes('2022') && !product.includes('2019');
      if (isBlocked) {
        read -= 15;
      }

      if (eolStr && support_status !== 'out_of_support') {
        const timeline = lifecycleIntelligenceEngine.generateStrategicTimeline({
          product_name: product,
          asset_type: assetType,
          business_criticality: criticality,
          end_of_support: eolStr,
          estimated_cost: p.estimated_cost || 0
        });
        const rolloutPhase = timeline.phases.find(ph => ph.type === 'rollout');
        if (rolloutPhase) {
          const rEnd = parseISO(rolloutPhase.end_date);
          if (isBefore(eolDate!, rEnd)) {
            read -= 20;
          }
        }
      }
    });

    const totCost = plans.reduce((acc, p) => acc + (p.estimated_cost || 0), 0);

    return {
      healthScore: computedHealth,
      simulatedHealthScore: computedSimulated,
      activeSimulationsCount: simCount,
      securityScore: Math.max(15, Math.min(100, sec)),
      complianceScore: Math.max(15, Math.min(100, comp)),
      stabilityScore: Math.max(15, Math.min(100, stab)),
      governanceScore: Math.max(15, Math.min(100, gov)),
      readinessScore: Math.max(15, Math.min(100, read)),
      totalCost: totCost
    };
  }, [plans, simulatedDelays, today]);
  
  let totalOpexSavings = 0;
  let totalDependencies = 0;
  let totalGRCRisk = 0;
  
  const aggregatedBreakdown: Record<string, { penalty: number; count: number }> = {};

  plans.forEach(p => {
    const eolStr = p.assets?.lifecycle_catalog?.end_of_support;
    const strategicTimeline = lifecycleIntelligenceEngine.generateStrategicTimeline({
      product_name: p.assets?.lifecycle_catalog?.product_name || '',
      asset_type: p.assets?.device_type || 'client',
      business_criticality: p.assets?.business_criticality || p.priority || 'low',
      end_of_support: eolStr || null,
      estimated_cost: p.estimated_cost || 0
    });

    const intel = lifecycleIntelligenceEngine.computeIntelligence({
      product_name: p.assets?.lifecycle_catalog?.product_name,
      asset_type: p.assets?.device_type,
      estimated_cost: p.estimated_cost
    } as any);

    const rec = lifecycleIntelligenceEngine.getRecommendation(
      p.assets?.lifecycle_catalog?.product_name || '',
      p.assets?.device_type
    );
    
    totalOpexSavings += intel.opex_savings || 0;
    totalDependencies += rec.dependencies?.length || 0;
    totalGRCRisk += strategicTimeline.operational_risk_cost || 0;

    // Acumular deduções do health score
    strategicTimeline.health_score_breakdown?.forEach(item => {
      if (!aggregatedBreakdown[item.reason]) {
        aggregatedBreakdown[item.reason] = { penalty: 0, count: 0 };
      }
      aggregatedBreakdown[item.reason].penalty += item.penalty;
      aggregatedBreakdown[item.reason].count += 1;
    });
  });

  const overdueCount = plans.filter(p => {
    const eol = p.assets?.lifecycle_catalog?.end_of_support;
    return eol ? isBefore(parseISO(eol), today) : false;
  }).length;

  return (
    <TooltipProvider>
      <div className="p-10 space-y-12 bg-slate-50/30 dark:bg-slate-900/30">
        
        {/* 2. DASHBOARD EXECUTIVO DE TOP LEVEL */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
          
          {/* Card do Health Score */}
          <Card className="rounded-[2rem] border-none bg-gradient-to-br from-slate-900 to-slate-950 dark:from-slate-950 dark:to-black text-white p-6 col-span-1 md:col-span-2 shadow-2xl relative overflow-hidden group">
            <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-700" />
            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-3 max-w-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Score de Saúde GRC</span>
                  {activeSimulationsCount > 0 && (
                    <Badge className="bg-amber-500 text-white font-black text-[8px] animate-pulse rounded-full px-2 py-0 border-none">
                      SIMULADO
                    </Badge>
                  )}
                </div>
                <h3 className="text-xl font-black tracking-tight leading-tight">Saúde Geral da Infraestrutura</h3>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                  Reflete suporte, expiração EoL, criticidade de servidores e prontidão de migração.
                </p>
                
                {/* Detalhamento Explicável do Score */}
                <div className="pt-2 space-y-1">
                  {Object.keys(aggregatedBreakdown).length > 0 ? (
                    <>
                      <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block mb-1">Deduções Identificadas:</span>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(aggregatedBreakdown).slice(0, 2).map(([reason, data]) => (
                          <Badge key={reason} variant="outline" className="text-[8px] font-bold bg-white/5 border-white/10 text-rose-300">
                            {reason}: {data.penalty} pts ({data.count}x)
                          </Badge>
                        ))}
                        {Object.keys(aggregatedBreakdown).length > 2 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-[8px] font-bold bg-white/5 border-white/10 text-slate-400 cursor-pointer">
                                +{Object.keys(aggregatedBreakdown).length - 2} mais
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="bg-slate-950 border border-slate-800 text-white p-4 rounded-xl space-y-2">
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Penalidades Completas</h4>
                              {Object.entries(aggregatedBreakdown).map(([reason, data]) => (
                                <div key={reason} className="flex justify-between text-xs gap-4 border-b border-white/5 pb-1">
                                  <span>{reason}</span>
                                  <span className="text-rose-400 font-bold">{data.penalty} ({data.count}x)</span>
                                </div>
                              ))}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </>
                  ) : (
                    <span className="text-[8px] font-black uppercase text-emerald-400">✓ Nenhuma penalidade detectada</span>
                  )}
                </div>

                {/* 5 pillars breakdown */}
                <div className="mt-4 pt-3 border-t border-white/10 space-y-1.5 text-[9px] font-semibold text-slate-350">
                  <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block mb-1">Pilares GRC de Infraestrutura:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center justify-between bg-white/5 px-2 py-1 rounded-md border border-white/5">
                      <span>🛡️ Security:</span>
                      <span className={securityScore >= 80 ? "text-emerald-400 font-black" : securityScore >= 50 ? "text-amber-400 font-black" : "text-rose-400 font-black"}>{securityScore}%</span>
                    </div>
                    <div className="flex items-center justify-between bg-white/5 px-2 py-1 rounded-md border border-white/5">
                      <span>⚖️ Compliance:</span>
                      <span className={complianceScore >= 80 ? "text-emerald-400 font-black" : complianceScore >= 50 ? "text-amber-400 font-black" : "text-rose-400 font-black"}>{complianceScore}%</span>
                    </div>
                    <div className="flex items-center justify-between bg-white/5 px-2 py-1 rounded-md border border-white/5">
                      <span>⚙️ Stability:</span>
                      <span className={stabilityScore >= 80 ? "text-emerald-400 font-black" : stabilityScore >= 50 ? "text-amber-400 font-black" : "text-rose-400 font-black"}>{stabilityScore}%</span>
                    </div>
                    <div className="flex items-center justify-between bg-white/5 px-2 py-1 rounded-md border border-white/5">
                      <span>📋 Governance:</span>
                      <span className={governanceScore >= 80 ? "text-emerald-400 font-black" : governanceScore >= 50 ? "text-amber-400 font-black" : "text-rose-400 font-black"}>{governanceScore}%</span>
                    </div>
                    <div className="flex items-center justify-between bg-white/5 px-2 py-1 rounded-md border border-white/5 col-span-2">
                      <span>🚀 Readiness:</span>
                      <span className={readinessScore >= 80 ? "text-emerald-400 font-black" : readinessScore >= 50 ? "text-amber-400 font-black" : "text-rose-400 font-black"}>{readinessScore}%</span>
                    </div>
                  </div>
                </div>

              </div>
              
              <div className="flex flex-col items-center justify-center">
                <div className="relative flex items-center justify-center">
                  <svg className="w-28 h-28 transform -rotate-90">
                    <circle cx="56" cy="56" r="44" className="stroke-slate-850 dark:stroke-slate-900 fill-none" strokeWidth="6" />
                    <circle cx="56" cy="56" r="44" className="stroke-primary fill-none transition-all duration-1000" strokeWidth="6" strokeDasharray={`${(activeSimulationsCount > 0 ? simulatedHealthScore : healthScore) * 2.76}, 276`} />
                  </svg>
                  <div className="absolute text-2xl font-black">
                    {activeSimulationsCount > 0 ? simulatedHealthScore : healthScore}%
                  </div>
                </div>
                <Badge className={`mt-2 font-black uppercase text-[8px] border-none ${
                  (activeSimulationsCount > 0 ? simulatedHealthScore : healthScore) >= 80 ? 'bg-emerald-500 text-white' :
                  (activeSimulationsCount > 0 ? simulatedHealthScore : healthScore) >= 50 ? 'bg-amber-500 text-white' :
                  'bg-rose-500 text-white'
                }`}>
                  {(activeSimulationsCount > 0 ? simulatedHealthScore : healthScore) >= 80 ? 'SAUDÁVEL' : (activeSimulationsCount > 0 ? simulatedHealthScore : healthScore) >= 50 ? 'ATENÇÃO CRÍTICA' : 'RISCO DE SEGURANÇA'}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Card do Custo Geral */}
          <Card className="rounded-[2rem] border-none bg-white dark:bg-slate-900 p-6 shadow-xl flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block">Capex Estimado</span>
                <h3 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalCost)}
                </h3>
              </div>
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="pt-4 border-t flex justify-between items-center text-[10px] text-muted-foreground font-bold">
              <span>Ativos em Risco EoL</span>
              <span className="text-rose-500 font-black">{overdueCount} Pendentes</span>
            </div>
          </Card>

          {/* Card de Opex Savings */}
          <Card className="rounded-[2rem] border-none bg-white dark:bg-slate-900 p-6 shadow-xl flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block">OPEX Savings (Ano)</span>
                <h3 className="text-2xl font-black tracking-tighter text-emerald-500">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalOpexSavings)}
                </h3>
              </div>
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950 rounded-xl">
                <TrendingDown className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
            <div className="pt-4 border-t flex justify-between items-center text-[10px] text-muted-foreground font-bold">
              <span>Dependências</span>
              <span className="text-primary font-black">{totalDependencies} Mapeadas</span>
            </div>
          </Card>

          {/* Card de Risco GRC Evitado */}
          <Card className="rounded-[2rem] border-none bg-white dark:bg-slate-900 p-6 shadow-xl flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block">Risco GRC Evitado</span>
                <h3 className="text-2xl font-black tracking-tighter text-rose-500">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalGRCRisk)}
                </h3>
              </div>
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950 rounded-xl">
                <ShieldAlert className="h-5 w-5 text-rose-600" />
              </div>
            </div>
            <div className="pt-4 border-t flex justify-between items-center text-[10px] text-muted-foreground font-bold">
              <span>Avaliação de Impacto</span>
              <span className="text-rose-500 font-black">Crítico</span>
            </div>
          </Card>

        </div>

        <div className="max-w-4xl pt-4">
          <h2 className="text-4xl font-black tracking-tighter mb-4 text-slate-900 dark:text-white">Síntese Estratégica Corporativa</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            Análise detalhada por ativo de infraestrutura contendo parecer de ciclo de vida corporativo, conformidade regulatória GRC e recomendações de mitigação.
          </p>
        </div>

        {/* 3. LISTA DE CARDS DETALHADOS INDIVIDUAIS COM TODOS OS INSIGHTS */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {plans.map((plan, idx) => {
            const eol = plan.assets?.lifecycle_catalog?.end_of_support;
            const eolDate = eol ? parseISO(eol) : null;
            const isExpired = eolDate && isBefore(eolDate, today);

            const strategicTimeline = lifecycleIntelligenceEngine.generateStrategicTimeline({
              product_name: plan.assets?.lifecycle_catalog?.product_name || '',
              asset_type: plan.assets?.device_type || 'client',
              business_criticality: plan.assets?.business_criticality || plan.priority || 'low',
              end_of_support: eol || null,
              estimated_cost: plan.estimated_cost || 0
            });

            const recInfo = lifecycleIntelligenceEngine.getRecommendation(
              plan.assets?.lifecycle_catalog?.product_name || '',
              plan.assets?.device_type
            );

            const currentDelay = simulatedDelays[plan.id] || 0;
            const simulation = lifecycleIntelligenceEngine.simulateStrategicDelay({
              product_name: plan.assets?.lifecycle_catalog?.product_name || '',
              asset_type: plan.assets?.device_type || 'client',
              business_criticality: plan.assets?.business_criticality || plan.priority || 'low',
              end_of_support: eol || null,
              estimated_cost: plan.estimated_cost || 0
            }, currentDelay);

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="rounded-[2.5rem] border-none shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden group">
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      {/* Lateral de Status */}
                      <div className={`w-full md:w-48 p-8 flex flex-col justify-between items-center text-center ${
                        plan.priority === 'critical' ? 'bg-gradient-to-b from-rose-500 to-red-600 shadow-[inset_-5px_0_15px_rgba(0,0,0,0.1)]' : 
                        plan.priority === 'high' ? 'bg-gradient-to-b from-orange-500 to-amber-600 shadow-[inset_-5px_0_15px_rgba(0,0,0,0.1)]' : 
                        'bg-gradient-to-b from-blue-500 to-indigo-600 shadow-[inset_-5px_0_15px_rgba(0,0,0,0.1)]'
                      } text-white`}>
                        <div className="space-y-2">
                          <div className="p-3 bg-white/20 rounded-2xl inline-block mb-2">
                            {isExpired ? <ShieldAlert className="h-8 w-8 animate-bounce" /> : <ShieldCheck className="h-8 w-8" />}
                          </div>
                          <div className="text-[10px] font-black uppercase tracking-widest opacity-80">Criticidade</div>
                          <div className="text-xl font-black uppercase">{plan.priority}</div>
                        </div>
                        
                        <div className="mt-8 md:mt-0 space-y-1">
                          <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Readiness</div>
                          <Badge className="bg-white text-slate-900 border-none hover:bg-white/90 rounded-full px-4 font-black uppercase text-[8px] tracking-tight">
                            {(strategicTimeline.migration_readiness || 'ready').replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>

                      {/* Conteúdo Principal */}
                      <div className="flex-1 p-8 md:p-10 space-y-6 bg-white dark:bg-slate-950">
                        
                        {/* Título e Header */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                          <div>
                            <h3 className="text-2xl font-black tracking-tighter group-hover:text-primary transition-colors">{plan.assets?.hostname}</h3>
                            <div className="flex items-center gap-2 mt-1 text-slate-500 font-bold">
                              <span className="text-xs uppercase">{plan.assets?.lifecycle_catalog?.product_name}</span>
                              <ChevronRight className="h-3 w-3" />
                              <span className="text-xs font-black text-primary">{plan.assets?.lifecycle_catalog?.version}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Fim do Suporte</div>
                            <div className={`text-lg font-black ${isExpired ? 'text-rose-500 animate-pulse' : 'text-slate-900 dark:text-white'}`}>
                              {eolDate ? format(eolDate, "MMMM yyyy") : "N/A"}
                            </div>
                          </div>
                        </div>

                        {/* Prioridade de Badges Integrados */}
                        <div className="flex flex-wrap gap-1">
                          {strategicTimeline.badges?.map((badge, bIdx) => {
                            let style = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
                            let hasGlow = false;
                            if (badge === 'Bloqueado') {
                              style = 'bg-red-500/20 text-red-600 dark:text-red-400 font-black border-red-300';
                              hasGlow = true;
                            } else if (badge === 'Compliance Crítico') {
                              style = 'bg-rose-500/20 text-rose-600 dark:text-rose-400 font-black border-rose-300';
                              hasGlow = true;
                            } else if (badge === 'Ultrapassa EoL') {
                              style = 'bg-pink-500/20 text-pink-600 dark:text-pink-400 font-black border-pink-300';
                              hasGlow = true;
                            } else if (badge === 'High Operational Risk') {
                              style = 'bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold border-orange-200';
                            } else if (badge === 'Requires Assessment') {
                              style = 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 font-bold border-yellow-200';
                            } else if (badge === 'Safe Window') {
                              style = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border-emerald-200';
                            }
                            return (
                              <Badge 
                                key={bIdx} 
                                variant="outline" 
                                className={`text-[8px] uppercase font-black tracking-tighter transition-all ${style} ${hasGlow ? 'shadow-[0_0_8px_rgba(239,68,68,0.2)] animate-pulse' : ''}`}
                              >
                                {badge}
                              </Badge>
                            );
                          })}
                        </div>

                        {/* Narrativa Executiva (max 450 chars) */}
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <span className="text-[9px] font-black uppercase tracking-widest text-primary block mb-1">Parecer de Governança Estratégica</span>
                          <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed whitespace-pre-line">
                            {strategicTimeline.executive_narrative}
                          </p>
                        </div>

                        {/* DECISION SIMULATION PANEL */}
                        <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <span className="text-[9px] font-black uppercase tracking-widest text-primary block">Simulador de Impacto Temporal</span>
                              <span className="text-[10px] text-slate-400 font-semibold">Simule o impacto de adiar a decisão de migração</span>
                            </div>
                            <select 
                              value={simulatedDelays[plan.id] || 0} 
                              onChange={(e) => setSimulatedDelays(prev => ({ ...prev, [plan.id]: Number(e.target.value) }))}
                              className="text-xs font-black uppercase bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer text-slate-750 dark:text-slate-200"
                            >
                              <option value={0}>0 Meses (No Delay)</option>
                              <option value={3}>3 Meses de Atraso</option>
                              <option value={6}>6 Meses de Atraso</option>
                              <option value={12}>12 Meses de Atraso</option>
                            </select>
                          </div>

                          {currentDelay > 0 && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200/50 dark:border-slate-700/50"
                            >
                              <div className="space-y-1">
                                <span className="text-[8px] font-black uppercase text-rose-500 tracking-wider">Aumento de Risco Financeiro</span>
                                <p className="text-xs font-black text-rose-600 dark:text-rose-455">
                                  +{simulation.projected_risk_increase}% de exposição ({new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format((strategicTimeline.operational_risk_cost || 0) * (1 + simulation.projected_risk_increase / 100))})
                                </p>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[8px] font-black uppercase text-amber-500 tracking-wider">Perda Financeira OPEX</span>
                                <p className="text-xs font-black text-amber-600 dark:text-amber-400">
                                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(simulation.projected_opex_loss)} perdido em OPEX
                                </p>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[8px] font-black uppercase text-purple-500 tracking-wider">Status Compliance Simulado</span>
                                <div>
                                  <Badge className={`text-[8px] font-black uppercase border-none text-white ${
                                    simulation.projected_compliance_impact === 'critical' ? 'bg-red-500' :
                                    simulation.projected_compliance_impact === 'high' ? 'bg-orange-500' :
                                    'bg-blue-500'
                                  }`}>
                                    {simulation.projected_compliance_impact}
                                  </Badge>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[8px] font-black uppercase text-blue-500 tracking-wider">Queda de Health Score</span>
                                <p className="text-xs font-black text-blue-600 dark:text-blue-400">
                                  {simulation.original_health_score}% → <span className="text-rose-500 font-extrabold">{simulation.simulated_health_score}%</span> (-{simulation.projected_health_score_drop} pts)
                                </p>
                              </div>
                            </motion.div>
                          )}
                        </div>

                        {/* Grade de Informações Estratégicas */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                          <div className="space-y-4">
                            
                            {/* Target Platform & Target Version (Separated) */}
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-xl">
                                <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-0.5">Plataforma & Versão Alvo</span>
                                <p className="text-xs font-bold leading-snug">
                                  Plataforma: <span className="text-slate-800 dark:text-slate-200">{strategicTimeline.recommended_platform}</span>
                                </p>
                                <p className="text-xs font-bold leading-snug">
                                  Versão: <span className="text-primary">{strategicTimeline.recommended_target_version}</span>
                                </p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-semibold leading-normal">
                                  <strong>Estratégia:</strong> {strategicTimeline.migration_strategy}
                                </p>
                              </div>
                            </div>

                            {/* Janela de Migração Segura */}
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-amber-50 dark:bg-amber-950 rounded-xl">
                                <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                              </div>
                              <div className="space-y-1">
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-0.5">Prazos de Governança e Janelas Reais</span>
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                  {strategicTimeline.safe_window_remaining_days} dias na Janela de Segurança
                                </p>
                                <div className="space-y-0.5 text-[9px] text-slate-500 dark:text-slate-400 font-semibold">
                                  <div>📅 Início Recomendado: <strong className="text-slate-700 dark:text-slate-350">{strategicTimeline.recommended_start_date ? parseISO(strategicTimeline.recommended_start_date).toLocaleDateString() : 'N/A'}</strong></div>
                                  <div>🚀 Cutover (Virada): <strong className="text-slate-700 dark:text-slate-350">{strategicTimeline.recommended_cutover_date ? parseISO(strategicTimeline.recommended_cutover_date).toLocaleDateString() : 'N/A'}</strong></div>
                                  <div>⚠️ Limite Rollback: <strong className="text-rose-500 dark:text-rose-400">{strategicTimeline.rollback_deadline ? parseISO(strategicTimeline.rollback_deadline).toLocaleDateString() : 'N/A'}</strong></div>
                                </div>
                              </div>
                            </div>

                            {/* Risco Operacional Matrix */}
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-rose-50 dark:bg-rose-950 rounded-xl">
                                <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                              </div>
                              <div>
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-0.5">Risco Financeiro Operacional</span>
                                <p className="text-xs font-black text-rose-650 dark:text-rose-400">
                                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(strategicTimeline.operational_risk_cost || 0)}
                                </p>
                                <p className="text-[10px] text-slate-400 font-semibold leading-normal">
                                  Custo calculado caso ocorra incidente no ativo legado.
                                </p>
                              </div>
                            </div>

                          </div>

                          <div className="space-y-4">
                            
                            {/* Compliance GRC */}
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-emerald-50 dark:bg-emerald-950 rounded-xl">
                                <Award className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                              </div>
                              <div>
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Conformidade Regulatória (GRC)</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {recInfo.compliance.map((cName, cIdx) => (
                                    <Badge key={cIdx} className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none text-[8px] font-black uppercase px-2 py-0">
                                      {cName}
                                    </Badge>
                                  ))}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                                  Evita sanções e não conformidades em auditorias.
                                </p>
                              </div>
                            </div>

                            {/* Dependências Técnicas Mapeadas */}
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-purple-50 dark:bg-purple-950 rounded-xl">
                                <Info className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                              </div>
                              <div className="space-y-2 flex-1">
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">Governança de Dependências</span>
                                
                                {strategicTimeline.dependencies && strategicTimeline.dependencies.length > 0 && (
                                  <div>
                                    <span className="text-[8px] font-black uppercase text-slate-400 block mb-0.5">Dependências:</span>
                                    <div className="flex flex-wrap gap-1">
                                      {strategicTimeline.dependencies.map((depName, dIdx) => (
                                        <Badge key={dIdx} variant="outline" className="text-[8px] font-bold px-2 py-0 border-purple-200 dark:border-purple-900 bg-purple-500/5">
                                          {depName}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {strategicTimeline.migration_prerequisites && strategicTimeline.migration_prerequisites.length > 0 && (
                                  <div>
                                    <span className="text-[8px] font-black uppercase text-slate-400 block mb-0.5">Pré-requisitos:</span>
                                    <div className="flex flex-wrap gap-1">
                                      {strategicTimeline.migration_prerequisites.map((prereq, pIdx) => (
                                        <Badge key={pIdx} variant="secondary" className="text-[8px] font-bold px-2 py-0">
                                          {prereq}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {strategicTimeline.blocked_by && strategicTimeline.blocked_by.length > 0 && (
                                  <div>
                                    <span className="text-[8px] font-black uppercase text-rose-500 block mb-0.5">Bloqueadores Ativos:</span>
                                    <div className="flex flex-wrap gap-1">
                                      {strategicTimeline.blocked_by.map((blocker, bIdx) => (
                                        <Badge key={bIdx} className="bg-rose-500/20 text-rose-600 dark:text-rose-450 border border-rose-350 text-[8px] font-black uppercase px-2 py-0">
                                          ⚠️ {blocker}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Benefício Operacional */}
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                <Rocket className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                              </div>
                              <div>
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-0.5">Retorno de OPEX Projetado</span>
                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                  Economia anual: <span className="text-emerald-500 font-bold">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(plan.estimated_cost ? plan.estimated_cost * 0.25 : 0)}</span>
                                </p>
                              </div>
                            </div>

                          </div>
                        </div>

                        {/* Footer com Custo e Justificativa */}
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-2 text-slate-400">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Validação Concluída via Inteligência Strategic</span>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-[9px] font-black uppercase text-slate-400 mb-0.5">Investimento Projetado (CAPEX)</div>
                            <div className="text-xl font-black text-primary">
                              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(plan.estimated_cost || 0)}
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
