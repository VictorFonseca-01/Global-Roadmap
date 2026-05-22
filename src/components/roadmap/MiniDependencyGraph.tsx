import { useMemo } from 'react';
import { Network } from 'lucide-react';
import type { ConsolidatedTechnologyGroup } from '@/services/timelineAggregationService';

interface DependencyNode {
  id: string;
  label: string;
  level: number;
  type: 'source' | 'target' | 'root';
}

interface DependencyLink {
  source: string;
  target: string;
}

interface MiniDependencyGraphProps {
  group: ConsolidatedTechnologyGroup;
  allGroups: ConsolidatedTechnologyGroup[];
  allDependencies: any[];
}

export function MiniDependencyGraph({ group, allGroups, allDependencies }: MiniDependencyGraphProps) {
  
  const rootKey = `${group.vendor}|${group.product}|${group.version}`.toLowerCase();

  const graphData = useMemo(() => {
    const nodes = new Map<string, DependencyNode>();
    const links: DependencyLink[] = [];

    // Add root
    nodes.set(rootKey, { id: rootKey, label: `${group.product}`, level: 0, type: 'root' });

    let edgeCount = 0;
    
    // Level 1: Direct connections
    const level1Sources = allDependencies.filter(d => d.targetTechKey === rootKey);
    const level1Targets = allDependencies.filter(d => d.sourceTechKey === rootKey);

    level1Sources.forEach(d => {
      if (edgeCount >= 16 || nodes.size >= 12) return;
      const tech = allGroups.find(g => `${g.vendor}|${g.product}|${g.version}`.toLowerCase() === d.sourceTechKey);
      if (tech) {
        nodes.set(d.sourceTechKey, { id: d.sourceTechKey, label: tech.product, level: -1, type: 'source' });
        links.push({ source: d.sourceTechKey, target: rootKey });
        edgeCount++;
      }
    });

    level1Targets.forEach(d => {
      if (edgeCount >= 16 || nodes.size >= 12) return;
      const tech = allGroups.find(g => `${g.vendor}|${g.product}|${g.version}`.toLowerCase() === d.targetTechKey);
      if (tech) {
        nodes.set(d.targetTechKey, { id: d.targetTechKey, label: tech.product, level: 1, type: 'target' });
        links.push({ source: rootKey, target: d.targetTechKey });
        edgeCount++;
      }
    });

    // We can stop here for performance, effectively rendering 1 level in each direction (which satisfies "max 2 levels" total depth).
    
    return {
      nodes: Array.from(nodes.values()),
      links
    };
  }, [rootKey, allDependencies, allGroups, group]);

  if (graphData.nodes.length <= 1) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-slate-900/50 border border-white/5 rounded-xl text-center">
        <Network className="w-8 h-8 text-slate-600 mb-2" />
        <span className="text-xs text-slate-400">Nenhuma dependência estratégica mapeada para este ativo.</span>
      </div>
    );
  }

  // Very simple static tree layout for mini map
  const sources = graphData.nodes.filter(n => n.type === 'source');
  const targets = graphData.nodes.filter(n => n.type === 'target');
  
  return (
    <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4 overflow-hidden relative min-h-[160px] flex items-center justify-center">
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, #3b82f6 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
      
      <div className="flex w-full items-stretch justify-between relative z-10">
        
        {/* Left Column (Sources) */}
        <div className="flex flex-col justify-center gap-2 w-1/3">
          {sources.map(n => (
            <div key={n.id} className="bg-slate-800 border border-slate-700 rounded p-1.5 text-[9px] text-center text-slate-300 font-bold truncate relative z-20">
              {n.label}
            </div>
          ))}
        </div>

        {/* Center (Root) */}
        <div className="flex flex-col justify-center items-center w-1/3 px-2 z-20 relative">
          {/* Simple CSS connector lines would be complex here, so we rely on spatial arrangement + an implicit flow */}
          <div className="bg-blue-600 border border-blue-400 rounded p-2 text-[10px] text-center text-white font-black shadow-[0_0_15px_rgba(37,99,235,0.5)] w-full truncate">
            {group.product}
          </div>
          <div className="absolute inset-y-0 w-full flex items-center justify-center -z-10">
             <div className="w-full h-0.5 bg-gradient-to-r from-slate-700 via-blue-500/50 to-slate-700" />
          </div>
        </div>

        {/* Right Column (Targets) */}
        <div className="flex flex-col justify-center gap-2 w-1/3">
          {targets.map(n => (
            <div key={n.id} className="bg-slate-800 border border-slate-700 rounded p-1.5 text-[9px] text-center text-slate-300 font-bold truncate relative z-20">
              {n.label}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
