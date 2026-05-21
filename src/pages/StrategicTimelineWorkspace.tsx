import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { 
  Activity, ShieldAlert, Clock, 
  RefreshCw, BarChart4, Cpu, 
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

// Services
import { aiOrchestratorService } from "@/services/aiOrchestratorService";
import { aiRoadmapGeneratorService } from "@/services/aiRoadmapGeneratorService";

import { TimelineExecutiveView } from "@/components/roadmap/TimelineExecutiveView";

export default function StrategicTimelineWorkspace() {
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState("executive");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingStep, setGeneratingStep] = useState("");

  // 1. Fetch Global Project
  const { data: globalProject } = useQuery({
    queryKey: ["global-roadmap-project"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data: profile } = await supabase.from('user_profiles').select('organization_id').eq('id', user.id).single();
      if (!profile?.organization_id) return null;

      const { data } = await supabase
        .from('roadmap_projects')
        .select('id')
        .eq('organization_id', profile.organization_id)
        .eq('name', 'Global Strategic Timeline')
        .limit(1)
        .single();
        
      return data;
    }
  });

  const globalProjectId = globalProject?.id;

  // 2. Simulate KPIs (In a real scenario, this would aggregate from the plans data)
  const kpis = {
    healthScore: 78,
    complianceScore: 82,
    capex: 1250000,
    opex: 450000,
    nextCriticalEol: "Windows Server 2012 R2",
    expiredTechs: 14,
    blockers: 3
  };

  const handleGlobalGeneration = async () => {
    setIsGenerating(true);
    try {
      setGeneratingStep("Analisando inventário global...");
      await new Promise(r => setTimeout(r, 500)); 

      const result = await aiOrchestratorService.orchestrateFromInventory(undefined, undefined, (status) => {
        setGeneratingStep(status);
      });

      setGeneratingStep("Gerando timeline executiva...");
      // Override project name to force Global
      result.reviewData.project_name = "Global Strategic Timeline";
      
      const genResult = await aiRoadmapGeneratorService.generateRoadmapFromAIReview(result.reviewData);
      if (!genResult.success) throw new Error(genResult.errors.join(", "));

      toast.success("Timeline Estratégica atualizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["global-roadmap-project"] });
      queryClient.invalidateQueries({ queryKey: ["migration-plans"] });
    } catch (err: any) {
      if (err.message === 'EMPTY_INVENTORY') {
        toast.error("Inventário vazio. Importe seus dados primeiro.");
      } else {
        toast.error("Erro ao atualizar timeline: " + (err.message || "Erro desconhecido"));
      }
    } finally {
      setIsGenerating(false);
      setGeneratingStep("");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] gap-4">
      {/* ─── TOPO EXECUTIVO (KPIs) ─── */}
      <div className="flex-shrink-0 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
          <CardContent className="p-4 flex flex-col items-center justify-center h-full">
            <span className="text-xs text-slate-400 font-semibold mb-1">Health Score</span>
            <div className="text-2xl font-bold text-emerald-400">{kpis.healthScore}%</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 flex flex-col items-center justify-center h-full">
            <span className="text-xs text-slate-400 font-semibold mb-1">Compliance</span>
            <div className="text-2xl font-bold text-blue-400">{kpis.complianceScore}%</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 flex flex-col items-center justify-center h-full">
            <span className="text-xs text-slate-400 font-semibold mb-1">CAPEX Global</span>
            <div className="text-xl font-bold text-slate-200">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(kpis.capex)}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 flex flex-col items-center justify-center h-full">
            <span className="text-xs text-slate-400 font-semibold mb-1">EoL Crítico</span>
            <div className="text-sm font-bold text-rose-400 text-center">{kpis.nextCriticalEol}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 flex flex-col items-center justify-center h-full">
            <span className="text-xs text-slate-400 font-semibold mb-1">Expirados</span>
            <div className="text-2xl font-bold text-rose-500">{kpis.expiredTechs}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 flex flex-col items-center justify-center h-full">
            <span className="text-xs text-slate-400 font-semibold mb-1">Bloqueadores</span>
            <div className="text-2xl font-bold text-amber-500">{kpis.blockers}</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-900/20 border-blue-500/30 border-dashed flex items-center justify-center">
          <CardContent className="p-2 w-full h-full flex items-center justify-center relative">
            <Button 
              variant="ghost" 
              onClick={handleGlobalGeneration} 
              disabled={isGenerating}
              className="w-full h-full flex flex-col gap-2 hover:bg-blue-900/40 text-blue-400"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span className="text-[10px] font-semibold text-center leading-tight">{generatingStep || "Processando..."}</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  <span className="text-xs font-semibold">Atualizar Timeline</span>
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* ─── SIDEBAR ESQUERDA (VIEWS E FILTROS) ─── */}
        <div className="w-64 flex-shrink-0 flex flex-col gap-4 overflow-y-auto pr-1">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">Views Estratégicas</h3>
            
            <Button 
              variant={activeView === "executive" ? "secondary" : "ghost"} 
              className={`w-full justify-start ${activeView === "executive" ? "bg-slate-800 text-white" : "text-slate-400"}`}
              onClick={() => setActiveView("executive")}
            >
              <BarChart4 className="w-4 h-4 mr-3" /> Executive
            </Button>
            <Button 
              variant={activeView === "operations" ? "secondary" : "ghost"} 
              className={`w-full justify-start ${activeView === "operations" ? "bg-slate-800 text-white" : "text-slate-400"}`}
              onClick={() => setActiveView("operations")}
            >
              <Activity className="w-4 h-4 mr-3" /> Operations
            </Button>
            <Button 
              variant={activeView === "security" ? "secondary" : "ghost"} 
              className={`w-full justify-start ${activeView === "security" ? "bg-slate-800 text-white" : "text-slate-400"}`}
              onClick={() => setActiveView("security")}
            >
              <ShieldAlert className="w-4 h-4 mr-3" /> Security
            </Button>
            <Button 
              variant={activeView === "infrastructure" ? "secondary" : "ghost"} 
              className={`w-full justify-start ${activeView === "infrastructure" ? "bg-slate-800 text-white" : "text-slate-400"}`}
              onClick={() => setActiveView("infrastructure")}
            >
              <Cpu className="w-4 h-4 mr-3" /> Infrastructure
            </Button>
            <Button 
              variant={activeView === "compliance" ? "secondary" : "ghost"} 
              className={`w-full justify-start ${activeView === "compliance" ? "bg-slate-800 text-white" : "text-slate-400"}`}
              onClick={() => setActiveView("compliance")}
            >
              <ShieldCheck className="w-4 h-4 mr-3" /> Compliance
            </Button>
          </div>

          <div className="pt-4 border-t border-slate-800 mt-2 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">Ações</h3>
            <Link to="/legacy-roadmaps" className="block">
              <Button variant="outline" size="sm" className="w-full justify-start text-xs text-slate-400 border-slate-800">
                <Clock className="w-3.5 h-3.5 mr-2" /> Modo Legado (V1)
              </Button>
            </Link>
          </div>
        </div>

        {/* ─── ÁREA CENTRAL (TIMELINE) ─── */}
        <div className="flex-1 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden relative shadow-inner">
           {/* Timeline component wrapper */}
           <div className="absolute inset-0">
             <TimelineExecutiveView projectId={globalProjectId || undefined} view={activeView} />
           </div>
        </div>
      </div>
    </div>
  );
}
