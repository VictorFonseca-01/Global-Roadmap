import { addDays, subDays, format, differenceInDays, parseISO, isBefore } from 'date-fns';
import type { AIReviewItem, MigrationPhases, StrategicPhase, StrategicTimelineResult } from '@/types';
import { RISK_COST_MATRIX } from '@/constants/riskCostMatrix';

export interface StrategicTimelineInput {
  product_name?: string;
  asset_type?: string;
  business_criticality?: string;
  end_of_support?: string | null;
  estimated_cost?: number;
}

export const lifecycleIntelligenceEngine = {
  // Mantemos a função original para retrocompatibilidade completa com a geração de IA
  calculateMigrationPhases(
    item: AIReviewItem,
    eolDateStr: string | null
  ): { phases: MigrationPhases; suggested_start: string; suggested_deadline: string } {
    const today = new Date();
    let baseStart = today;
    
    const eolDate = eolDateStr ? new Date(eolDateStr) : null;
    const daysToEol = eolDate ? differenceInDays(eolDate, today) : 365;
    
    if (daysToEol < 90) {
      baseStart = today;
    } else if (daysToEol >= 90 && daysToEol <= 180) {
      baseStart = addDays(today, 15);
    } else {
      baseStart = addDays(today, 45);
    }
    
    let homologationDays = 30;
    if (item.asset_type === 'server') {
      homologationDays += 90;
    }
    
    let pilotDays = 15;
    let rolloutDays = 45;
    
    let coexistenceDays = 0;
    if (item.calculated_criticality === 'critical' || item.calculated_criticality === 'high') {
      coexistenceDays = 30; 
    }
    
    let deactivationDays = 15;
    
    const homStart = baseStart;
    const homEnd = addDays(homStart, homologationDays);
    
    const pilotStart = addDays(homEnd, 1);
    const pilotEnd = addDays(pilotStart, pilotDays);
    
    const rolloutStart = addDays(pilotEnd, 1);
    const rolloutEnd = addDays(rolloutStart, rolloutDays);
    
    let coexStart: Date | undefined;
    let coexEnd: Date | undefined;
    let currentEnd = rolloutEnd;
    
    if (coexistenceDays > 0) {
      coexStart = addDays(rolloutEnd, 1);
      coexEnd = addDays(coexStart, coexistenceDays);
      currentEnd = coexEnd;
    }
    
    const deactStart = addDays(currentEnd, 1);
    const deactEnd = addDays(deactStart, deactivationDays);
    
    const phases: MigrationPhases = {
      homologation_start: format(homStart, 'yyyy-MM-dd'),
      homologation_end: format(homEnd, 'yyyy-MM-dd'),
      pilot_start: format(pilotStart, 'yyyy-MM-dd'),
      pilot_end: format(pilotEnd, 'yyyy-MM-dd'),
      rollout_start: format(rolloutStart, 'yyyy-MM-dd'),
      rollout_end: format(rolloutEnd, 'yyyy-MM-dd'),
      deactivation_start: format(deactStart, 'yyyy-MM-dd'),
      deactivation_end: format(deactEnd, 'yyyy-MM-dd')
    };
    
    if (coexStart && coexEnd) {
      phases.coexistence_start = format(coexStart, 'yyyy-MM-dd');
      phases.coexistence_end = format(coexEnd, 'yyyy-MM-dd');
    }
    
    return {
      phases,
      suggested_start: format(homStart, 'yyyy-MM-dd'),
      suggested_deadline: format(deactEnd, 'yyyy-MM-dd')
    };
  },

  // Mantemos a função original para retrocompatibilidade completa com a geração de IA
  computeIntelligence(item: AIReviewItem): Partial<AIReviewItem> {
    const product = (item.product_name || '').toLowerCase();
    
    let migration_strategy = 'Migração gradual';
    let migration_complexity: AIReviewItem['migration_complexity'] = 'medium';
    let rollback_plan = 'Criar snapshot de máquina virtual anterior e plano de rollback no backup do storage.';
    let opex_savings = Math.round((item.estimated_cost || 1000) * 0.25);
    let requirements: string[] = ['Validar infraestrutura'];
    
    if (product.includes('10')) {
      migration_strategy = 'In-place upgrade via Intune';
      migration_complexity = 'medium';
      requirements = ['TPM 2.0 requerido', 'Secure Boot', 'Processador moderno compatível'];
      rollback_plan = 'Manter pasta Windows.old por 10 dias para rollback direto do SO.';
      opex_savings = 350;
    } else if (product.includes('11')) {
      migration_strategy = 'Upgrade direto via WSUS / Intune';
      migration_complexity = 'low';
      requirements = ['Garantir TPM 2.0 ativo', 'Hardware homologado'];
      rollback_plan = 'Reversão de update via política do Intune.';
      opex_savings = 120;
    } else if (product.includes('server') && product.includes('2012')) {
      migration_strategy = 'Side-by-side migration';
      migration_complexity = 'critical';
      requirements = ['Novas licenças Windows Server 2022', 'Homologar serviços no Active Directory', 'Testar integridade de DNS'];
      rollback_plan = 'Manter servidores antigos ativos em rede paralela e isolada durante 30 dias para failback.';
      opex_savings = 2500;
    } else if (product.includes('server') && product.includes('2016')) {
      migration_strategy = 'Side-by-side migration';
      migration_complexity = 'high';
      requirements = ['Validar compatibilidade de drivers legados', 'Homologar IIS e containers'];
      rollback_plan = 'Reverter snapshot do hipervisor VMware/Hyper-V.';
      opex_savings = 1500;
    } else if (product.includes('sql') && (product.includes('2014') || product.includes('2012'))) {
      migration_strategy = 'Side-by-side database upgrade';
      migration_complexity = 'high';
      requirements = ['Upgrade compatibilidade do banco para level 150+', 'Testar concorrência de query legada'];
      rollback_plan = 'Restaurar backup Full + Log no servidor antigo e alterar string de conexão do app.';
      opex_savings = 3000;
    } else if (item.asset_type === 'server') {
      migration_strategy = 'Side-by-side migration';
      migration_complexity = 'high';
      requirements = ['Novas licenças corporativas', 'Backup completo do volume'];
      rollback_plan = 'Reverter para máquina virtual de origem.';
      opex_savings = Math.round((item.estimated_cost || 5000) * 0.3);
    }
    
    return {
      migration_strategy,
      migration_complexity,
      rollback_plan,
      opex_savings,
      requirements
    };
  },

  getRecommendation(productName: string, assetType?: string) {
    const p = (productName || '').toLowerCase();
    
    let target = 'Próxima Versão Estável';
    let reason = 'Manter conformidade de suporte oficial e atualizações cumulativas de segurança.';
    let constraints = 'Nenhuma restrição detectada.';
    let prerequisites = 'Nenhum pré-requisito necessário.';
    let dependencies = ['Backup de dados', 'Homologação preliminar'];
    let compliance = ['ISO 27001', 'Microsoft Security Baseline'];

    if (p.includes('10')) {
      target = 'Windows 11 24H2 Enterprise';
      reason = 'Fim do suporte do Windows 10 em Outubro de 2025. A migração para o Windows 11 garante suporte oficial e atualizações mensais.';
      constraints = 'Requer suporte obrigatório a TPM 2.0 e Secure Boot ativo.';
      prerequisites = 'Processador Intel 8ª Geração ou superior, AMD Ryzen série 2000 ou superior, RAM mínima de 4GB.';
      dependencies = ['Intune/SCCM', 'Active Directory', 'GPO', 'Drivers homologados', 'Antivírus/EDR corporativo'];
      compliance = ['LGPD Art. 46', 'ISO 27001', 'CIS Controls V8'];
    } else if (p.includes('11')) {
      target = 'Windows 11 24H2 Enterprise';
      reason = 'Garantir alinhamento com a última release estável do Windows 11 para estender o ciclo de vida útil do ativo na rede.';
      constraints = 'Manter conformidade com as diretivas de atualização do Intune.';
      prerequisites = 'Compatibilidade de compilação da imagem corporativa.';
      dependencies = ['Intune/SCCM', 'Active Directory', 'GPO', 'Drivers homologados', 'Antivírus/EDR corporativo'];
      compliance = ['ISO 27001 Control A.12', 'Microsoft Security Baseline'];
    } else if (p.includes('server') && p.includes('2012')) {
      target = 'Windows Server 2022 Datacenter';
      reason = 'Windows Server 2012 R2 está fora de suporte desde Outubro de 2023. Risco crítico de exposição a exploits conhecidos.';
      constraints = 'Incompatibilidade potencial com sistemas de criptografia antigos e TLS legados.';
      prerequisites = 'Hardware com suporte a UEFI e firmware atualizado.';
      dependencies = ['Active Directory', 'Backup corporativo', 'DNS/DHCP local', 'Aplicações hospedadas homologadas', 'Monitoramento centralizado', 'Firewall/VPN'];
      compliance = ['LGPD Segurança e Boas Práticas', 'ISO 27001 Controle de Vulnerabilidades', 'CIS Controls V8'];
    } else if (p.includes('server') && p.includes('2016')) {
      target = 'Windows Server 2022 Datacenter';
      reason = 'Mitigar lentidão estrutural no processo de atualizações cumulativas do Server 2016 e garantir suporte estendido.';
      constraints = 'Homologar funções de Active Directory Domain Controller caso aplicável.';
      prerequisites = 'Backup prévio completo do sistema operacional e snapshot do hipervisor VMware/Hyper-V.';
      dependencies = ['Active Directory', 'Backup corporativo', 'DNS/DHCP local', 'Aplicações hospedadas homologadas', 'Monitoramento centralizado', 'Firewall/VPN'];
      compliance = ['ISO 27001', 'CIS Controls V8'];
    } else if (p.includes('sql') && (p.includes('2014') || p.includes('2012'))) {
      target = 'SQL Server 2022 Enterprise';
      reason = 'SQL Server 2014 atingiu o fim do suporte estendido. O upgrade garante recursos modernos de indexação e consultas seguras.';
      constraints = 'Necessário homologar nível de compatibilidade do banco de dados (Compatibility Level 150+).';
      prerequisites = 'Licenciamento core atualizado e capacidade de storage provisionada.';
      dependencies = ['Aplicações dependentes', 'Jobs SQL integrados', 'Plano de Backup corporativo', 'Processos de ETL', 'Relatórios integrados'];
      compliance = ['LGPD Criptografia de Dados', 'ISO 27001', 'CIS Benchmarks SQL Server'];
    } else if (assetType === 'server' || p.includes('server')) {
      target = 'Windows Server 2022 Datacenter';
      reason = 'Padronização da infraestrutura corporativa de servidores.';
      dependencies = ['Active Directory', 'Backup corporativo', 'DNS/DHCP local', 'Aplicações hospedadas homologadas', 'Monitoramento centralizado', 'Firewall/VPN'];
      compliance = ['ISO 27001'];
    }

    return { target, reason, constraints, prerequisites, dependencies, compliance };
  },

  doesRolloutExceedEol(
    eolDateStr: string | null,
    rolloutEndStr: string | null
  ): 'safe' | 'warning' | 'critical' | 'expired' {
    if (!eolDateStr) return 'safe';
    const today = new Date();
    const eolDate = parseISO(eolDateStr);
    
    if (isBefore(eolDate, today)) {
      return 'expired';
    }
    
    if (!rolloutEndStr) return 'safe';
    const rolloutEnd = parseISO(rolloutEndStr);
    
    if (isBefore(eolDate, rolloutEnd)) {
      return 'critical';
    }
    
    const daysToEol = differenceInDays(eolDate, today);
    if (daysToEol <= 90) {
      return 'warning';
    }
    
    return 'safe';
  },

  normalizeHealthScore(rawScore: number): number {
    const clamped = Math.max(1, Math.min(99, rawScore));
    if (clamped >= 90) return 95;
    if (clamped >= 75) return 80;
    if (clamped >= 55) return 60;
    if (clamped >= 35) return 40;
    if (clamped >= 15) return 25;
    return 15;
  },

  generateExecutiveNarrative(
    productName: string,
    version: string,
    supportStatus: string,
    eolDateStr: string | null,
    targetVersion: string,
    coexistenceDays: number
  ): string {
    const pName = productName || 'Ativo';
    const ver = version || 'vLegada';
    const target = targetVersion || 'Nova Versão';
    const coex = coexistenceDays || 30;

    let p1 = '';
    let p2 = '';

    if (supportStatus === 'out_of_support') {
      p1 = `${pName} ${ver} encontra-se fora de suporte desde ${eolDateStr ? format(parseISO(eolDateStr), 'yyyy') : 'anos anteriores'} e representa risco crítico imediato de vulnerabilidade cibernética.`;
      p2 = `Isso gera não conformidade de GRC direta contra normas LGPD e ISO 27001. Ação imediata é necessária para iniciar a homologação e migração paralela para o ${target} com coexistência de ${coex} dias.`;
    } else if (supportStatus === 'near_eol') {
      p1 = `${pName} ${ver} está próximo do fim de suporte oficial (${eolDateStr ? format(parseISO(eolDateStr), 'dd/MM/yyyy') : 'em breve'}). A continuidade operacional futura de segurança está sob risco.`;
      p2 = `Isso expõe a organização a vulnerabilidades sem patch. Recomenda-se iniciar a homologação e transição preventiva para o ${target} de forma priorizada e monitorada.`;
    } else {
      p1 = `${pName} ${ver} está em conformidade operacional e totalmente suportado. O planejamento preventivo do ciclo de vida deve ser mantido de forma rotineira.`;
      p2 = `A conformidade de segurança e LGPD está garantida. Sugere-se alinhar a migração programada e gradual para o ${target} para estender o ciclo tecnológico útil.`;
    }

    const narrative = `${p1}\n\n${p2}`;
    if (narrative.length > 450) {
      return narrative.substring(0, 447) + '...';
    }
    return narrative;
  },

  generateStrategicTimeline(
    input: StrategicTimelineInput,
    todayOverride?: Date
  ): StrategicTimelineResult {
    const today = todayOverride || new Date();
    const product = (input.product_name || '').toLowerCase();
    const assetType = (input.asset_type || '').toLowerCase() as 'server' | 'client';
    const criticality = (input.business_criticality || '').toLowerCase() as 'critical' | 'high' | 'medium' | 'low';
    const eolStr = input.end_of_support || null;
    const eolDate = eolStr ? parseISO(eolStr) : null;

    let support_status: 'supported' | 'near_eol' | 'out_of_support' = 'supported';
    let daysToEol = 365;

    if (eolDate) {
      daysToEol = differenceInDays(eolDate, today);
      if (isBefore(eolDate, today)) {
        support_status = 'out_of_support';
      } else if (daysToEol <= 180) {
        support_status = 'near_eol';
      }
    }

    let homologation_start: Date;
    let homologation_end: Date;
    let pilot_start: Date;
    let pilot_end: Date;
    let rollout_start: Date;
    let rollout_end: Date;
    let coexistence_start: Date | null = null;
    let coexistence_end: Date | null = null;
    let decommission_start: Date;
    let decommission_end: Date;

    const isServer = assetType === 'server' || product.includes('server');
    const isCritical = criticality === 'critical';

    // 1. Regras Cronológicas Oficiais
    if (support_status === 'out_of_support') {
      homologation_start = today;
      homologation_end = addDays(homologation_start, 30);

      pilot_start = addDays(homologation_end, 1);
      pilot_end = addDays(pilot_start, 15);

      rollout_start = addDays(pilot_end, 1);
      rollout_end = addDays(rollout_start, 30);

      let currentEnd = rollout_end;
      if (isServer) {
        coexistence_start = addDays(rollout_end, 1);
        coexistence_end = addDays(coexistence_start, 30);
        currentEnd = coexistence_end;
      }

      decommission_start = addDays(currentEnd, 1);
      decommission_end = addDays(decommission_start, 15);

    } else if (support_status === 'near_eol') {
      const baseStart = addDays(today, 30);

      homologation_start = baseStart;
      homologation_end = addDays(homologation_start, 30);

      pilot_start = addDays(homologation_end, 1);
      pilot_end = addDays(pilot_start, 15);

      rollout_start = addDays(pilot_end, 1);
      const suggestedRolloutEnd = eolDate ? subDays(eolDate, 30) : addDays(rollout_start, 30);
      rollout_end = isBefore(suggestedRolloutEnd, rollout_start) ? addDays(rollout_start, 30) : suggestedRolloutEnd;

      let currentEnd = rollout_end;
      if (isServer) {
        coexistence_start = addDays(rollout_end, 1);
        coexistence_end = addDays(coexistence_start, 30);
        currentEnd = coexistence_end;
      }

      decommission_start = eolDate ? subDays(eolDate, 15) : addDays(currentEnd, 1);
      decommission_end = eolDate ? eolDate : addDays(decommission_start, 15);
      
      if (isBefore(decommission_start, currentEnd)) {
        decommission_start = addDays(currentEnd, 1);
        decommission_end = addDays(decommission_start, 15);
      }

    } else {
      const baseHomStart = eolDate ? subDays(eolDate, 180) : addDays(today, 60);
      homologation_start = isBefore(baseHomStart, today) ? today : baseHomStart;
      homologation_end = addDays(homologation_start, 30);

      const basePilotStart = eolDate ? subDays(eolDate, 150) : addDays(homologation_end, 1);
      pilot_start = isBefore(basePilotStart, homologation_end) ? addDays(homologation_end, 1) : basePilotStart;
      pilot_end = addDays(pilot_start, 15);

      const baseRolloutStart = eolDate ? subDays(eolDate, 120) : addDays(pilot_end, 1);
      rollout_start = isBefore(baseRolloutStart, pilot_end) ? addDays(pilot_end, 1) : baseRolloutStart;
      
      const baseRolloutEnd = eolDate ? subDays(eolDate, 45) : addDays(rollout_start, 45);
      rollout_end = isBefore(baseRolloutEnd, rollout_start) ? addDays(rollout_start, 45) : baseRolloutEnd;

      let currentEnd = rollout_end;
      if (isServer) {
        coexistence_start = addDays(rollout_end, 1);
        coexistence_end = addDays(coexistence_start, 30);
        currentEnd = coexistence_end;
      }

      const baseDecomStart = eolDate ? subDays(eolDate, 30) : addDays(currentEnd, 1);
      decommission_start = isBefore(baseDecomStart, currentEnd) ? addDays(currentEnd, 1) : baseDecomStart;
      decommission_end = eolDate ? eolDate : addDays(decommission_start, 30);
    }

    const phasesList: StrategicPhase[] = [];
    
    // Homologation
    phasesList.push({
      type: 'homologation',
      start_date: format(homologation_start, 'yyyy-MM-dd'),
      end_date: format(homologation_end, 'yyyy-MM-dd'),
      duration_days: differenceInDays(homologation_end, homologation_start) || 1,
      status: isBefore(homologation_end, today) ? 'completed' : isBefore(homologation_start, today) ? 'active' : 'planned',
      objective: isCritical ? 'Homologação estendida com validação de contingência mandatória.' : 'Validar compatibilidade e estabilidade do ambiente no laboratório.',
      risks: isCritical ? ['Impacto de indisponibilidade de serviços críticos durante testes.'] : undefined,
      dependencies: isServer ? ['Active Directory', 'DNS local'] : ['Intune/SCCM']
    });

    // Pilot
    phasesList.push({
      type: 'pilot',
      start_date: format(pilot_start, 'yyyy-MM-dd'),
      end_date: format(pilot_end, 'yyyy-MM-dd'),
      duration_days: differenceInDays(pilot_end, pilot_start) || 1,
      status: isBefore(pilot_end, today) ? 'completed' : isBefore(pilot_start, today) ? 'active' : 'planned',
      objective: 'Validar implantação em grupo controlado de usuários e computadores não críticos.',
      risks: ['Problemas inesperados de compatibilidade em lote inicial.']
    });

    // Rollout
    phasesList.push({
      type: 'rollout',
      start_date: format(rollout_start, 'yyyy-MM-dd'),
      end_date: format(rollout_end, 'yyyy-MM-dd'),
      duration_days: differenceInDays(rollout_end, rollout_start) || 1,
      status: isBefore(rollout_end, today) ? 'completed' : isBefore(rollout_start, today) ? 'active' : 'planned',
      objective: 'Implantar a nova versão de forma faseada em toda a organização.',
      risks: ['Impacto na produtividade geral caso haja falha não detectada no piloto.'],
      compliance_notes: ['Reduz a superfície de ataque conforme diretrizes ISO 27001.']
    });

    // Coexistence (Server)
    if (isServer && coexistence_start && coexistence_end) {
      phasesList.push({
        type: 'coexistence',
        start_date: format(coexistence_start, 'yyyy-MM-dd'),
        end_date: format(coexistence_end, 'yyyy-MM-dd'),
        duration_days: differenceInDays(coexistence_end, coexistence_start) || 1,
        status: isBefore(coexistence_end, today) ? 'completed' : isBefore(coexistence_start, today) ? 'active' : 'planned',
        objective: 'Período híbrido com ambientes legados e novos operando em paralelo.',
        risks: ['Sincronização de dados e consistência entre servidores.'],
        dependencies: ['Backup corporativo', 'Monitoramento centralizado']
      });
    }

    // Decommission
    phasesList.push({
      type: 'decommission',
      start_date: format(decommission_start, 'yyyy-MM-dd'),
      end_date: format(decommission_end, 'yyyy-MM-dd'),
      duration_days: differenceInDays(decommission_end, decommission_start) || 1,
      status: isBefore(decommission_end, today) ? 'completed' : isBefore(decommission_start, today) ? 'active' : 'planned',
      objective: 'Remoção segura e desativação do ativo legado, liberando recursos.',
      risks: ['Descarte inseguro de hardware ou retenção incorreta de dados antigos.'],
      compliance_notes: ['Necessário para conformidade LGPD (descarte e expurgo de dados).']
    });

    const sanitizedPhases = this.normalizeStrategicTimeline(phasesList);

    // Caminho Crítico
    let critical_path_status: StrategicTimelineResult['critical_path_status'] = 'on_track';
    if (support_status === 'out_of_support') {
      critical_path_status = 'overdue';
    } else if (eolDate) {
      const rolloutEnd = parseISO(sanitizedPhases.find(p => p.type === 'rollout')?.end_date || '');
      if (isBefore(eolDate, rolloutEnd)) {
        critical_path_status = 'at_risk';
      }
    }
    
    const hasSuccessor = !!eolStr && !!(product.includes('10') ? 'Windows 11 24H2' : product.includes('2012') ? 'Windows Server 2022' : product.includes('2016') ? 'Windows Server 2022' : product.includes('sql') ? 'SQL Server 2022' : '');
    if (!hasSuccessor && !product.includes('11') && !product.includes('2016') && !product.includes('2022') && !product.includes('2019')) {
      critical_path_status = 'blocked';
    }

    // Compliance Impact
    let compliance_impact: StrategicTimelineResult['compliance_impact'] = 'low';
    if (support_status === 'out_of_support') {
      compliance_impact = isServer ? 'critical' : 'high';
    } else if (support_status === 'near_eol') {
      compliance_impact = isServer ? 'high' : 'medium';
    }

    // Migration Readiness
    let migration_readiness: StrategicTimelineResult['migration_readiness'] = 'ready';
    if (isCritical) {
      migration_readiness = 'high_risk';
    } else if (product.includes('10') && !product.includes('tpm')) {
      migration_readiness = 'requires_assessment';
    } else if (critical_path_status === 'blocked') {
      migration_readiness = 'blocked';
    } else if (product.includes('sql') && (product.includes('2014') || product.includes('2012'))) {
      migration_readiness = 'high_risk';
    } else if (support_status === 'supported') {
      migration_readiness = 'ready';
    } else {
      migration_readiness = 'requires_assessment';
    }

    // ETAPA 1, 3, 4, 6 - ENRIQUECIMENTO EOL VIOLATION & JANELA REALISTA & TARGET EXPLÍCITO
    const rolloutEndStr = sanitizedPhases.find(p => p.type === 'rollout')?.end_date || null;
    const rolloutExceedStatus = this.doesRolloutExceedEol(eolStr, rolloutEndStr);

    const rec = this.getRecommendation(input.product_name || '', input.asset_type);
    const intel = this.computeIntelligence({
      product_name: input.product_name,
      asset_type: input.asset_type,
      estimated_cost: input.estimated_cost
    } as any);

    // Duração real e custos com matriz
    const resolvedAssetType = isServer ? 'server' : 'client';
    const resolvedCriticality = criticality || 'low';
    const operational_risk_cost = RISK_COST_MATRIX[resolvedAssetType][resolvedCriticality];

    // Janela ideal de início
    let recommended_start_date = format(today, 'yyyy-MM-dd');
    let safe_migration_window_days = 0;
    let urgency_level: StrategicTimelineResult['urgency_level'] = 'low';
    let migration_window_status: StrategicTimelineResult['migration_window_status'] = 'safe';
    const contingency_buffer_days = 15;

    if (support_status === 'out_of_support') {
      recommended_start_date = format(today, 'yyyy-MM-dd');
      safe_migration_window_days = 0;
      urgency_level = 'immediate';
      migration_window_status = 'expired';
    } else if (support_status === 'near_eol') {
      recommended_start_date = format(addDays(today, 30), 'yyyy-MM-dd');
      safe_migration_window_days = Math.max(0, daysToEol) + contingency_buffer_days;
      urgency_level = 'high';
      migration_window_status = daysToEol < 90 ? 'critical' : 'warning';
    } else {
      const suggested = eolDate ? subDays(eolDate, 180) : addDays(today, 60);
      const start = isBefore(suggested, today) ? addDays(today, 15) : suggested;
      recommended_start_date = format(start, 'yyyy-MM-dd');
      safe_migration_window_days = Math.max(0, daysToEol) + contingency_buffer_days;
      urgency_level = 'medium';
      migration_window_status = 'safe';
    }

    // Prioridade de Badges
    const badges: string[] = [];
    if (critical_path_status === 'blocked') badges.push('Bloqueado');
    if (support_status === 'out_of_support' || (isServer && isCritical && support_status === 'near_eol')) badges.push('Compliance Crítico');
    if (rolloutExceedStatus === 'critical') badges.push('Ultrapassa EoL');
    if (intel.migration_complexity === 'critical' || intel.migration_complexity === 'high') badges.push('High Operational Risk');
    if (migration_readiness === 'requires_assessment') badges.push('Requires Assessment');
    if (migration_window_status === 'safe') badges.push('Safe Window');

    // Health Score Breakdown
    const health_score_breakdown: StrategicTimelineResult['health_score_breakdown'] = [];
    if (support_status === 'out_of_support') {
      health_score_breakdown.push({ penalty: -30, reason: 'Servidores fora de suporte' });
    }
    if (support_status === 'near_eol') {
      health_score_breakdown.push({ penalty: -15, reason: 'Near EoL' });
    }
    if (isServer && isCritical) {
      health_score_breakdown.push({ penalty: -10, reason: 'Server crítico' });
    }
    if (!hasSuccessor && !product.includes('11') && !product.includes('2016') && !product.includes('2022') && !product.includes('2019')) {
      health_score_breakdown.push({ penalty: -10, reason: 'Sem sucessor' });
    }
    if (critical_path_status === 'blocked') {
      health_score_breakdown.push({ penalty: -15, reason: 'Readiness bloqueado' });
    }
    if (rolloutExceedStatus === 'critical') {
      health_score_breakdown.push({ penalty: -20, reason: 'Rollout ultrapassa EoL' });
    }

    // Narrativa
    const executive_narrative = this.generateExecutiveNarrative(
      input.product_name || '',
      product.includes('10') ? '10 22H2' : product.includes('2012') ? '2012 R2' : product.includes('2016') ? '2016' : 'vLegada',
      support_status,
      eolStr,
      rec.target,
      isServer ? 30 : 0
    );

    let migration_prerequisites: string[] = ['Garantir Redundância de Rede', 'Validar Backup'];
    let blocked_by: string[] = [];
    let dependenciesList = ['Backup de dados', 'Homologação preliminar'];

    if (product.includes('10')) {
      dependenciesList = ['Intune/SCCM', 'Active Directory', 'GPO', 'Drivers homologados', 'Antivírus/EDR corporativo'];
      blocked_by = ['Hardware Incompatível (TPM 2.0)'];
      migration_prerequisites = ['Processador Intel 8ª Geração ou Ryzen série 2000', 'Secure Boot Ativo', 'Backup da Pasta Windows.old'];
    } else if (product.includes('11')) {
      dependenciesList = ['Intune/SCCM', 'Active Directory', 'GPO', 'Drivers homologados', 'Antivírus/EDR corporativo'];
      blocked_by = [];
      migration_prerequisites = ['Imagem corporativa homologada', 'Garantir TPM 2.0 ativo'];
    } else if (product.includes('server') && product.includes('2012')) {
      dependenciesList = ['Active Directory Domain Controller', 'DNS/DHCP Local', 'Backup corporativo Veeam', 'Firewall/VPN'];
      blocked_by = ['Falta de Licenciamento Datacenter', 'Serviços legados não suportados no WS2022'];
      migration_prerequisites = ['Snapshot completo de VM no VMware', 'Upgrade Schema do AD Domain Controller', 'Validação de Criptografia TLS 1.3'];
    } else if (product.includes('server') && product.includes('2016')) {
      dependenciesList = ['Active Directory', 'Backup corporativo Veeam', 'DNS/DHCP Local', 'Firewall/VPN', 'Hypervisor VMware'];
      blocked_by = ['Pendências de Homologação da Aplicação hospedada'];
      migration_prerequisites = ['Snapshot de VM', 'Backup Completo do Volume de Dados', 'Mapeamento de Regras de Firewall'];
    } else if (product.includes('sql') && (product.includes('2014') || product.includes('2012'))) {
      dependenciesList = ['Aplicações Clientes', 'Serviços de ETL (SSIS)', 'SQL Agent Jobs'];
      blocked_by = ['Incompatibilidade de Sintaxe Legada (Compatibility Level 150+)'];
      migration_prerequisites = ['Backup Full + Transaction Log', 'Testes de concorrência e indexação', 'Provedor OLEDB atualizado'];
    } else if (isServer) {
      dependenciesList = ['Active Directory', 'Backup corporativo Veeam', 'DNS/DHCP Local', 'Firewall/VPN'];
      blocked_by = [];
      migration_prerequisites = ['Snapshot de VM', 'Backup Completo'];
    }

    const recommended_cutover_date = sanitizedPhases.find(p => p.type === 'rollout')?.end_date || format(rollout_end, 'yyyy-MM-dd');
    const rollback_deadline = format(addDays(decommission_end, 15), 'yyyy-MM-dd');
    const safe_window_remaining_days = eolDate ? Math.max(0, differenceInDays(eolDate, today)) : 365;

    return {
      phases: sanitizedPhases,
      critical_path_status,
      compliance_impact,
      migration_readiness,
      
      recommended_target_version: rec.target,
      migration_strategy: intel.migration_strategy,
      recommended_platform: isServer ? 'Microsoft Server' : 'Microsoft Client',
      migration_target_label: rec.target,
      recommended_start_date,
      recommended_cutover_date,
      rollback_deadline,
      safe_migration_window_days,
      safe_window_remaining_days,
      migration_prerequisites,
      blocked_by,
      dependencies: dependenciesList,
      contingency_buffer_days,
      urgency_level,
      migration_window_status,
      operational_risk_cost,
      badges,
      executive_narrative,
      health_score_breakdown,
      
      // Simulation placeholders
      simulation_impact: 'Padrão corporativo sugerido',
      predicted_health_score: 95,
      predicted_opex_savings: intel.opex_savings,
      predicted_risk_reduction: 100
    };
  },

  normalizeStrategicTimeline(phases: StrategicPhase[]): StrategicPhase[] {
    if (!phases || phases.length === 0) return [];
    
    const sorted = [...phases].sort((a, b) => a.start_date.localeCompare(b.start_date));
    const normalized: StrategicPhase[] = [];
    
    for (let i = 0; i < sorted.length; i++) {
      const phase = sorted[i];
      let pStart = parseISO(phase.start_date);
      let pEnd = parseISO(phase.end_date);
      
      if (isBefore(pEnd, pStart)) {
        pEnd = addDays(pStart, Math.max(1, phase.duration_days));
      }
      
      if (i > 0) {
        const prevPhase = normalized[i - 1];
        const prevEnd = parseISO(prevPhase.end_date);
        
        pStart = addDays(prevEnd, 1);
        pEnd = addDays(pStart, Math.max(1, phase.duration_days));
      }
      
      normalized.push({
        ...phase,
        start_date: format(pStart, 'yyyy-MM-dd'),
        end_date: format(pEnd, 'yyyy-MM-dd'),
        duration_days: Math.max(1, differenceInDays(pEnd, pStart))
      });
    }
    
    return normalized;
  },

  calculateInfrastructureHealthScore(items: StrategicTimelineInput[], todayOverride?: Date): number {
    let score = 100;
    const today = todayOverride || new Date();

    for (const item of items) {
      const eolStr = item.end_of_support || null;
      const eolDate = eolStr ? parseISO(eolStr) : null;
      const product = (item.product_name || '').toLowerCase();
      const assetType = (item.asset_type || '').toLowerCase();
      const criticality = (item.business_criticality || '').toLowerCase();
      
      const isServer = assetType === 'server' || product.includes('server');
      const isCritical = criticality === 'critical';
      const hasSuccessor = !!eolStr && !!(product.includes('10') ? 'Windows 11 24H2' : product.includes('2012') ? 'Windows Server 2022' : product.includes('2016') ? 'Windows Server 2022' : product.includes('sql') ? 'SQL Server 2022' : '');

      let support_status: 'supported' | 'near_eol' | 'out_of_support' = 'supported';
      if (eolDate) {
        if (isBefore(eolDate, today)) {
          support_status = 'out_of_support';
        } else if (differenceInDays(eolDate, today) <= 180) {
          support_status = 'near_eol';
        }
      }

      // Penalidades Oficiais:
      if (support_status === 'out_of_support') score -= 30;
      if (support_status === 'near_eol') score -= 15;
      if (isServer && isCritical) score -= 10;
      if (!hasSuccessor) score -= 10;

      // Blocked Readiness (-15)
      let isBlocked = !hasSuccessor && !product.includes('11') && !product.includes('2016') && !product.includes('2022') && !product.includes('2019');
      if (isBlocked) score -= 15;

      // Rollout ultrapassa EoL (-20)
      if (eolDate && support_status !== 'out_of_support') {
        const timeline = this.generateStrategicTimeline(item, today);
        const rolloutPhase = timeline.phases.find(p => p.type === 'rollout');
        if (rolloutPhase) {
          const rEnd = parseISO(rolloutPhase.end_date);
          if (isBefore(eolDate, rEnd)) {
            score -= 20;
          }
        }
      }
    }

    return this.normalizeHealthScore(score);
  },

  simulateStrategicDelay(
    input: StrategicTimelineInput,
    delayMonths: number,
    todayOverride?: Date
  ): {
    projected_risk_increase: number;
    projected_opex_loss: number;
    projected_compliance_impact: 'low' | 'medium' | 'high' | 'critical';
    projected_health_score_drop: number;
    original_health_score: number;
    simulated_health_score: number;
  } {
    const today = todayOverride || new Date();
    const futureToday = addDays(today, delayMonths * 30);

    const simulatedTimeline = this.generateStrategicTimeline(input, futureToday);

    const originalScore = this.calculateInfrastructureHealthScore([input], today);
    const simulatedScore = this.calculateInfrastructureHealthScore([input], futureToday);

    const healthDrop = Math.max(0, originalScore - simulatedScore);

    // Risco Financeiro aumenta conforme o atraso e proximidade de EoL
    let riskIncreasePercent = 0;
    if (simulatedTimeline.migration_window_status === 'expired') {
      riskIncreasePercent = 50; 
    } else if (simulatedTimeline.migration_window_status === 'critical') {
      riskIncreasePercent = 35;
    } else if (simulatedTimeline.migration_window_status === 'warning') {
      riskIncreasePercent = 15;
    }

    const projectedOpexLoss = (input.estimated_cost || 1000) * 0.25 * (delayMonths / 12);

    return {
      projected_risk_increase: riskIncreasePercent,
      projected_opex_loss: Math.round(projectedOpexLoss),
      projected_compliance_impact: simulatedTimeline.compliance_impact,
      projected_health_score_drop: healthDrop,
      original_health_score: originalScore,
      simulated_health_score: simulatedScore
    };
  }
};
