import { addDays, format, differenceInDays } from 'date-fns';
import type { AIReviewItem, MigrationPhases } from '@/types';

export const lifecycleIntelligenceEngine = {
  calculateMigrationPhases(
    item: AIReviewItem,
    eolDateStr: string | null
  ): { phases: MigrationPhases; suggested_start: string; suggested_deadline: string } {
    const today = new Date();
    let baseStart = today;
    
    const eolDate = eolDateStr ? new Date(eolDateStr) : null;
    const daysToEol = eolDate ? differenceInDays(eolDate, today) : 365;
    
    // Regras de início da IA:
    if (daysToEol < 90) {
      baseStart = today; // iniciar imediatamente
    } else if (daysToEol >= 90 && daysToEol <= 180) {
      baseStart = addDays(today, 15); // iniciar homologação
    } else {
      baseStart = addDays(today, 45); // iniciar planejamento
    }
    
    // Durações padrão:
    let homologationDays = 30;
    if (item.asset_type === 'server') {
      homologationDays += 90; // Server -> adicionar +90 dias de homologação!
    }
    
    let pilotDays = 15;
    let rolloutDays = 45;
    
    // Sistema crítico -> adicionar fase de coexistência!
    let coexistenceDays = 0;
    if (item.calculated_criticality === 'critical' || item.calculated_criticality === 'high') {
      coexistenceDays = 30; 
    }
    
    let deactivationDays = 15;
    
    // Homologation
    const homStart = baseStart;
    const homEnd = addDays(homStart, homologationDays);
    
    // Pilot
    const pilotStart = addDays(homEnd, 1);
    const pilotEnd = addDays(pilotStart, pilotDays);
    
    // Rollout
    const rolloutStart = addDays(pilotEnd, 1);
    const rolloutEnd = addDays(rolloutStart, rolloutDays);
    
    // Coexistence
    let coexStart: Date | undefined;
    let coexEnd: Date | undefined;
    let currentEnd = rolloutEnd;
    
    if (coexistenceDays > 0) {
      coexStart = addDays(rolloutEnd, 1);
      coexEnd = addDays(coexStart, coexistenceDays);
      currentEnd = coexEnd;
    }
    
    // Deactivation
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

  computeIntelligence(item: AIReviewItem): Partial<AIReviewItem> {
    const product = (item.product_name || '').toLowerCase();
    
    let migration_strategy = 'Migração gradual';
    let migration_complexity: AIReviewItem['migration_complexity'] = 'medium';
    let rollback_plan = 'Criar snapshot de máquina virtual anterior e plano de rollback no backup do storage.';
    let opex_savings = Math.round((item.estimated_cost || 1000) * 0.25); // Estimado 25%
    let requirements: string[] = ['Validar infraestrutura'];
    
    // Determinar dados de acordo com o produto
    if (product.includes('10')) {
      migration_strategy = 'Migração gradual de clientes';
      migration_complexity = 'medium';
      requirements = ['TPM 2.0 requerido', 'Secure Boot', 'Processador moderno compatível'];
      rollback_plan = 'Manter pasta Windows.old por 10 dias para rollback direto do SO.';
      opex_savings = 350; // Poupa manutenção
    } else if (product.includes('11')) {
      migration_strategy = 'Upgrade direto via WSUS / Intune';
      migration_complexity = 'low';
      requirements = ['Garantir TPM 2.0 ativo', 'Hardware homologado'];
      rollback_plan = 'Reversão de update via política do Intune.';
      opex_savings = 120;
    } else if (product.includes('server') && product.includes('2012')) {
      migration_strategy = 'Ambiente paralelo (Side-by-side) com migração gradual de serviços';
      migration_complexity = 'critical';
      requirements = ['Novas licenças Windows Server 2022', 'Homologar serviços no Active Directory', 'Testar integridade de DNS'];
      rollback_plan = 'Manter servidores antigos ativos em rede paralela e isolada durante 30 dias para failback.';
      opex_savings = 2500;
    } else if (product.includes('server') && product.includes('2016')) {
      migration_strategy = 'Upgrade in-place controlado ou migração side-by-side';
      migration_complexity = 'high';
      requirements = ['Validar compatibilidade de drivers legados', 'Homologar IIS e containers'];
      rollback_plan = 'Reverter snapshot do hipervisor VMware/Hyper-V.';
      opex_savings = 1500;
    } else if (product.includes('sql') && product.includes('2014')) {
      migration_strategy = 'Migração de banco com ambiente paralelo e replicação';
      migration_complexity = 'high';
      requirements = ['Upgrade compatibilidade do banco para level 150+', 'Testar concorrência de query legada'];
      rollback_plan = 'Restaurar backup Full + Log no servidor antigo e alterar string de conexão do app.';
      opex_savings = 3000;
    } else if (item.asset_type === 'server') {
      migration_strategy = 'Migração side-by-side de infraestrutura';
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
  }
};
