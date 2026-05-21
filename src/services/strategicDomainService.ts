import type { ConsolidatedTechnologyGroup } from './timelineAggregationService';
import { differenceInDays, parseISO } from 'date-fns';

export interface StrategicDomain {
  name: string;
  healthScore: number;
  complianceScore: number;
  totalRiskCost: number;
  nextCriticalEol: {
    techName: string;
    eolDate: string | null;
  } | null;
  estimatedCapex: number;
  technologies: ConsolidatedTechnologyGroup[];
}

export const APPROVED_DOMAINS = [
  'Operating Systems',
  'Workstations',
  'Servers',
  'Virtualization',
  'Network',
  'Security',
  'Infrastructure',
  'Applications',
  'Cloud',
  'Compliance'
] as const;

export const strategicDomainService = {
  /**
   * Categoriza uma tecnologia consolidada em um dos 10 domínios estratégicos oficiais.
   */
  classifyDomain(tech: ConsolidatedTechnologyGroup): typeof APPROVED_DOMAINS[number] | 'Other / Review' {
    const prod = (tech.product || '').toLowerCase().trim();
    const vend = (tech.vendor || '').toLowerCase().trim();
    const label = `${vend} ${prod}`.toLowerCase();

    // 1. Operating Systems (Qualquer SO)
    if (
      prod.includes('windows server') || 
      prod.includes('linux') || 
      prod.includes('ubuntu') || 
      prod.includes('debian') || 
      prod.includes('red hat') || 
      prod.includes('rhel') || 
      prod.includes('centos') || 
      prod.includes('windows 11') || 
      prod.includes('windows 10') || 
      prod.includes('windows 7') || 
      prod.includes('windows 8') ||
      vend.includes('canonical') || 
      vend.includes('redhat') ||
      label.includes('sistema operacional')
    ) {
      return 'Operating Systems';
    }

    // 2. Virtualization
    if (
      prod.includes('vmware') || 
      prod.includes('esxi') || 
      prod.includes('vsphere') || 
      prod.includes('hypervisor') || 
      prod.includes('virtualbox') || 
      prod.includes('proxmox') || 
      prod.includes('kvm') || 
      prod.includes('xen') || 
      prod.includes('nutanix')
    ) {
      return 'Virtualization';
    }

    // 3. Security
    if (
      prod.includes('fortinet') || 
      prod.includes('fortigate') || 
      prod.includes('defender') || 
      prod.includes('mfa') || 
      prod.includes('firewall') || 
      prod.includes('antivirus') || 
      prod.includes('security') || 
      prod.includes('kaspersky') || 
      prod.includes('symantec') || 
      prod.includes('crowdstrike')
    ) {
      return 'Security';
    }

    // 4. Network
    if (
      prod.includes('cisco') || 
      prod.includes('switch') || 
      prod.includes('vlan') || 
      prod.includes('router') || 
      prod.includes('access point') || 
      prod.includes('wireless') || 
      prod.includes('mikrotik') || 
      prod.includes('ubiquiti') || 
      prod.includes('juniper') || 
      prod.includes('aruba')
    ) {
      return 'Network';
    }

    // 5. Infrastructure
    if (
      prod.includes('backup') || 
      prod.includes('storage') || 
      prod.includes('san') || 
      prod.includes('nas') || 
      prod.includes('dell enterprise') || 
      prod.includes('ups') || 
      prod.includes('nobreak') || 
      prod.includes('rack') ||
      prod.includes('veeam')
    ) {
      return 'Infrastructure';
    }

    // 6. Cloud
    if (
      prod.includes('aws') || 
      prod.includes('azure') || 
      prod.includes('gcp') || 
      prod.includes('cloud') || 
      prod.includes('saas') || 
      prod.includes('office 365') || 
      prod.includes('google workspace')
    ) {
      return 'Cloud';
    }

    // 7. Compliance
    if (
      prod.includes('lgpd') || 
      prod.includes('compliance') || 
      prod.includes('audit') || 
      prod.includes('auditoria') || 
      prod.includes('regulatório')
    ) {
      return 'Compliance';
    }

    // 8. Applications
    if (
      prod.includes('sql server') || 
      prod.includes('oracle') || 
      prod.includes('java') || 
      prod.includes('sap') || 
      prod.includes('office') || 
      prod.includes('database') || 
      prod.includes('banco de dados') ||
      prod.includes('postgres') ||
      prod.includes('mysql') ||
      prod.includes('chrome') ||
      prod.includes('firefox')
    ) {
      return 'Applications';
    }

    // Fallbacks baseados na categoria bruta ou tipo de ativo
    const isServer = tech.assets.some(a => a.deviceType === 'server');
    const isWorkstation = tech.assets.some(a => a.deviceType === 'workstation' || a.deviceType === 'client');

    if (isServer) {
      return 'Servers';
    }

    if (isWorkstation) {
      return 'Workstations';
    }

    return 'Other / Review';
  },

  /**
   * Organiza tecnologias consolidadas em Swimlanes por Domínios Estratégicos.
   * Calcula também as métricas executivas agregadas (Health, Compliance, EoL, Risco, CAPEX) de cada domínio.
   * @param technologies Lista de tecnologias consolidadas da timeline.
   * @param activeConflicts Lista de IDs de dependências que possuem conflito de data ativo.
   */
  organizeByDomains(
    technologies: ConsolidatedTechnologyGroup[],
    activeConflicts: string[] = []
  ): StrategicDomain[] {
    const domainMap = new Map<string, ConsolidatedTechnologyGroup[]>();

    // Inicializar grupos dos domínios oficiais e 'Other / Review'
    APPROVED_DOMAINS.forEach(d => domainMap.set(d, []));
    domainMap.set('Other / Review', []);

    // Classificar cada tecnologia no seu respectivo domínio
    technologies.forEach(tech => {
      const domain = this.classifyDomain(tech);
      domainMap.get(domain)!.push(tech);
    });

    const result: StrategicDomain[] = [];
    const today = new Date();

    domainMap.forEach((techs, domainName) => {
      // Ignorar domínios que não possuem nenhuma tecnologia mapeada para não poluir a timeline
      if (techs.length === 0) return;

      let totalAssets = 0;
      let weightedHealthSum = 0;
      let weightedComplianceSum = 0;
      let totalRiskCost = 0;
      let estimatedCapex = 0;
      let nextCriticalEol: StrategicDomain['nextCriticalEol'] = null;

      techs.forEach(tech => {
        const count = tech.assetCount;
        totalAssets += count;
        totalRiskCost += tech.riskCost;
        estimatedCapex += tech.estimatedCost;

        // --- CÁLCULO DE HEALTH SCORE INDIVIDUAL ---
        // Base: 100
        let techHealth = 100;
        const eolDateStr = tech.eolDate;
        
        let isExpired = false;
        let isSoon = false;

        if (eolDateStr) {
          try {
            const eol = parseISO(eolDateStr);
            if (eol <= today) {
              isExpired = true;
              techHealth -= 30; // EoL expirado: -30
            } else {
              const diffDays = differenceInDays(eol, today);
              if (diffDays <= 180) {
                isSoon = true;
                techHealth -= 20; // EoL em até 180 dias: -20
              }
            }
          } catch {}
        } else {
          techHealth -= 15; // Sem lifecycle confirmado: -15
        }

        // Verificar se há conflito de cronograma ativo para alguma das assets deste grupo tecnológico
        const hasConflict = tech.assets.some(asset => 
          activeConflicts.some(conflictId => conflictId.includes(asset.planId))
        );
        if (hasConflict) {
          techHealth -= 15; // Dependência crítica bloqueada: -15
        }

        if (tech.criticality === 'critical' || tech.criticality === 'high') {
          techHealth -= 10; // Criticidade alta/critical: -10
        }

        techHealth = Math.max(0, Math.min(100, techHealth));
        weightedHealthSum += techHealth * count;

        // --- CÁLCULO DE COMPLIANCE SCORE INDIVIDUAL ---
        let techCompliance = 100;
        if (isExpired) {
          if (tech.criticality === 'critical' || tech.criticality === 'high') {
            techCompliance = 20; // Expirado e crítico: 20%
          } else {
            techCompliance = 50; // Expirado não crítico: 50%
          }
        } else if (isSoon) {
          techCompliance = 80; // Próximo do vencimento: 80%
        } else if (!eolDateStr) {
          techCompliance = 70; // Sem ciclo de vida: 70%
        }
        weightedComplianceSum += techCompliance * count;

        // --- PRÓXIMO EOL CRÍTICO ---
        if (eolDateStr && (tech.criticality === 'critical' || tech.criticality === 'high')) {
          if (!nextCriticalEol) {
            nextCriticalEol = { techName: `${tech.vendor} ${tech.product}`, eolDate: eolDateStr };
          } else {
            const curDate = parseISO(eolDateStr);
            const prevDate = parseISO(nextCriticalEol.eolDate!);
            if (curDate < prevDate) {
              nextCriticalEol = { techName: `${tech.vendor} ${tech.product}`, eolDate: eolDateStr };
            }
          }
        }
      });

      const healthScore = totalAssets > 0 ? Math.round(weightedHealthSum / totalAssets) : 100;
      const complianceScore = totalAssets > 0 ? Math.round(weightedComplianceSum / totalAssets) : 100;

      result.push({
        name: domainName,
        healthScore,
        complianceScore,
        totalRiskCost,
        nextCriticalEol,
        estimatedCapex,
        technologies: techs
      });
    });

    // Ordenar os domínios para que Operating Systems e os mais críticos fiquem no topo
    const domainOrder = [...APPROVED_DOMAINS, 'Other / Review'];
    return result.sort((a, b) => domainOrder.indexOf(a.name) - domainOrder.indexOf(b.name));
  }
};
