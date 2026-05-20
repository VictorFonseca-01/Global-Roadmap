import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { assetService } from "@/services/assetService";
import { aiOrchestratorService } from "@/services/aiOrchestratorService";
import { aiRoadmapGeneratorService } from "@/services/aiRoadmapGeneratorService";
import { DataTable } from "@/components/ui/data-table-custom";
import type { ColumnDef } from "@tanstack/react-table";
import type { Asset, AIReviewData } from "@/types";
import { Monitor, Info, Filter, RefreshCw, Server, Laptop, AlertCircle, Loader2, Zap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ImportWizard } from "@/components/inventory/ImportWizard";
import { AIReviewPreview } from "@/components/roadmap/AIReviewPreview";
import { AIChatGenerator } from "@/components/roadmap/AIChatGenerator";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "@/components/ui/EmptyState";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function AssetsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Filters State
  const [selectedOS, setSelectedOS] = useState<string>("all");
  const [selectedVersion, setSelectedVersion] = useState<string>("all");

  // Auto Roadmap Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingStep, setGeneratingStep] = useState("");
  const [autoReviewData, setAutoReviewData] = useState<AIReviewData | null>(null);
  const [showAutoReview, setShowAutoReview] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["assets"],
    queryFn: () => assetService.getAll(),
  });

  // Extract unique OS types and Versions dynamically from the assets data
  const uniqueOSList = useMemo(() => {
    const list = new Set<string>();
    assets.forEach(asset => {
      if (asset.lifecycle_catalog?.product_name) {
        list.add(asset.lifecycle_catalog.product_name);
      }
    });
    return Array.from(list).sort();
  }, [assets]);

  const uniqueVersionsList = useMemo(() => {
    const list = new Set<string>();
    assets.forEach(asset => {
      if (asset.lifecycle_catalog?.version) {
        list.add(asset.lifecycle_catalog.version);
      }
    });
    return Array.from(list).sort();
  }, [assets]);

  // Apply filters
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const matchOS = selectedOS === "all" || asset.lifecycle_catalog?.product_name === selectedOS;
      const matchVersion = selectedVersion === "all" || asset.lifecycle_catalog?.version === selectedVersion;
      return matchOS && matchVersion;
    });
  }, [assets, selectedOS, selectedVersion]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = assets.length;
    const servers = assets.filter(a => a.device_type === "server").length;
    const workstations = assets.filter(a => a.device_type === "workstation").length;
    const vulnerable = assets.filter(a => a.lifecycle_catalog && !a.lifecycle_catalog.is_supported).length;

    return { total, servers, workstations, vulnerable };
  }, [assets]);

  const resetFilters = () => {
    setSelectedOS("all");
    setSelectedVersion("all");
    toast.success("Filtros limpos com sucesso");
  };

  const handleAutoGenerate = async () => {
    if (assets.length === 0) {
      toast.error("Importe seu inventário primeiro.");
      return;
    }

    setIsGenerating(true);
    try {
      setGeneratingStep("Analisando inventário...");
      await new Promise(r => setTimeout(r, 500)); // UX breathing

      setGeneratingStep("Identificando tecnologias...");
      const result = await aiOrchestratorService.orchestrateFromInventory();

      setGeneratingStep("Preparando prévia...");
      await new Promise(r => setTimeout(r, 300));

      setAutoReviewData(result.reviewData);
      setShowAutoReview(true);

      toast.success(`${result.uniqueTechnologies} tecnologias identificadas em ${result.totalAssetsAnalyzed} ativos.`);
    } catch (err: any) {
      if (err.message === 'EMPTY_INVENTORY') {
        toast.error("Inventário vazio. Importe seus dados primeiro.");
      } else {
        toast.error("Erro ao gerar roadmap: " + (err.message || "Erro desconhecido"));
      }
    } finally {
      setIsGenerating(false);
      setGeneratingStep("");
    }
  };

  const handleAutoConfirm = async (data: AIReviewData) => {
    setIsGenerating(true);
    setGeneratingStep("Gerando roadmap oficial...");
    try {
      const result = await aiRoadmapGeneratorService.generateRoadmapFromAIReview(data);
      if (!result.success) throw new Error(result.errors.join(", "));

      toast.success("Roadmap gerado com sucesso a partir do inventário!");
      setShowAutoReview(false);
      setAutoReviewData(null);

      if (result.roadmapProjectId) {
        navigate(`/roadmaps`);
      }
    } catch (err: any) {
      toast.error("Erro ao confirmar roadmap: " + (err.message || "Erro desconhecido"));
    } finally {
      setIsGenerating(false);
      setGeneratingStep("");
    }
  };

  const columns: ColumnDef<Asset>[] = [
    {
      accessorKey: "hostname",
      header: "Hostname",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-100">{row.original.hostname}</span>
          <span className="text-xs text-slate-500 font-mono">{row.original.asset_tag || "S/N"}</span>
        </div>
      ),
    },
    {
      accessorKey: "device_type",
      header: "Tipo",
      cell: ({ row }) => {
        const isServer = row.original.device_type === "server";
        return (
          <div className="flex items-center gap-1.5">
            {isServer ? (
              <Server className="h-3.5 w-3.5 text-purple-400" />
            ) : (
              <Laptop className="h-3.5 w-3.5 text-blue-400" />
            )}
            <Badge variant="secondary" className={`capitalize text-xs font-semibold ${isServer ? "bg-purple-950/40 text-purple-300 border-purple-800/30" : "bg-blue-950/40 text-blue-300 border-blue-800/30"}`}>
              {row.original.device_type === "server" ? "Servidor" : "Workstation"}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "lifecycle_catalog.product_name",
      header: "SO",
      cell: ({ row }) => {
        const item = row.original.lifecycle_catalog;
        if (!item) return <span className="text-slate-500 text-xs italic">Não identificado</span>;
        return <span className="text-sm font-semibold text-slate-200">{item.product_name}</span>;
      },
    },
    {
      accessorKey: "lifecycle_catalog.version",
      header: "Versão",
      cell: ({ row }) => {
        const item = row.original.lifecycle_catalog;
        if (!item) return <span className="text-slate-500 text-xs">-</span>;
        return <span className="text-xs font-mono text-slate-300">{item.version}</span>;
      },
    },
    {
      accessorKey: "business_criticality",
      header: "Criticidade",
      cell: ({ row }) => {
        const criticality = row.original.business_criticality;
        if (!criticality) return <span className="text-slate-500 text-xs">Pendente (IA)</span>;
        
        const colors: Record<string, string> = {
          critical: "bg-rose-950/40 text-rose-300 border-rose-800/30",
          high: "bg-amber-950/40 text-amber-300 border-amber-800/30",
          medium: "bg-blue-950/40 text-blue-300 border-blue-800/30",
          low: "bg-slate-950/40 text-slate-300 border-slate-800/30",
        };

        const labels: Record<string, string> = {
          critical: "Crítico",
          high: "Alto",
          medium: "Médio",
          low: "Baixo",
        };
        
        return (
          <Badge variant="secondary" className={`text-xs font-semibold ${colors[criticality] || colors.low}`}>
            {labels[criticality] || "IA"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "updated_at",
      header: "Última Análise",
      cell: ({ row }) => {
        const dateStr = row.original.updated_at || row.original.created_at;
        if (!dateStr) return <span className="text-slate-500 text-xs">-</span>;
        try {
          const date = new Date(dateStr);
          return (
            <span className="text-xs text-slate-400">
              {date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </span>
          );
        } catch {
          return <span className="text-slate-500 text-xs">-</span>;
        }
      },
    },
    {
      id: "details",
      cell: ({ row }) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="p-1 rounded-lg hover:bg-slate-800 transition-colors">
                <Info className="h-4 w-4 text-slate-400" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 border-white/10 text-white rounded-xl shadow-2xl p-3 max-w-[220px]">
              <div className="space-y-1.5 text-xs">
                <p className="font-semibold text-slate-200 border-b border-white/5 pb-1 mb-1">Especificações Técnicas</p>
                <p className="text-slate-400"><strong className="text-slate-300">CPU:</strong> {row.original.cpu || "N/A"}</p>
                <p className="text-slate-400"><strong className="text-slate-300">RAM:</strong> {row.original.ram_gb ? `${row.original.ram_gb} GB` : "N/A"}</p>
                <p className="text-slate-400"><strong className="text-slate-300">Disco:</strong> {row.original.storage_gb ? `${row.original.storage_gb} GB` : "N/A"}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    },
  ];

  return (
    <div className="space-y-8 pb-10">
      {/* Header Panel */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Monitor className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">Inventário</h1>
            <p className="text-slate-400 text-sm mt-0.5 max-w-xl">
              Importe seu GLPI, SCCM, Intune ou planilha Excel. A IA analisará automaticamente o ambiente e gerará roadmaps com base nos ativos encontrados.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <ImportWizard 
            onComplete={() => queryClient.invalidateQueries({ queryKey: ["assets"] })} 
            triggerClassName="rounded-xl border-white/10 bg-slate-900/40 hover:bg-white/5 text-slate-200 font-bold transition-all gap-2 h-10"
          />
          <Button 
            onClick={handleAutoGenerate}
            disabled={isGenerating || assets.length === 0}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 gap-2 border border-indigo-500/20 transition-all h-10"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{generatingStep || "Gerando..."}</span>
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 text-cyan-300" />
                <span>Gerar Roadmap Automático</span>
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsChatOpen(true)}
            className="rounded-xl border-white/10 hover:bg-white/5 text-slate-300 font-bold transition-all gap-2 h-10"
          >
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span>Complementar com IA</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards Panel */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total de Ativos</p>
          <p className="mt-2 text-3xl font-black text-white">{isLoading ? "..." : stats.total}</p>
        </div>
        {/* Card 2 */}
        <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Servidores</p>
          <p className="mt-2 text-3xl font-black text-purple-400">{isLoading ? "..." : stats.servers}</p>
        </div>
        {/* Card 3 */}
        <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estações de Trabalho</p>
          <p className="mt-2 text-3xl font-black text-blue-400">{isLoading ? "..." : stats.workstations}</p>
        </div>
        {/* Card 4 */}
        <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sistemas Obsoletos</p>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-3xl font-black text-red-500">{isLoading ? "..." : stats.vulnerable}</p>
            {stats.vulnerable > 0 && <AlertCircle className="h-5 w-5 text-red-500 animate-bounce" />}
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between p-5 rounded-2xl border border-white/5 bg-[#070c19]/60 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-sm text-slate-400 font-bold self-start lg:self-auto">
          <Filter className="h-4 w-4 text-primary" />
          <span>Filtros Ágeis:</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto lg:flex-1 lg:max-w-4xl">
          {/* OS Filter */}
          <select
            value={selectedOS}
            onChange={(e) => setSelectedOS(e.target.value)}
            className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer hover:bg-slate-950/80 transition-colors"
          >
            <option value="all" className="bg-slate-950 text-slate-200">Todos os Sistemas Operacionais</option>
            {uniqueOSList.map(os => (
              <option key={os} value={os} className="bg-slate-950 text-slate-200">{os}</option>
            ))}
          </select>

          {/* Version Filter */}
          <select
            value={selectedVersion}
            onChange={(e) => setSelectedVersion(e.target.value)}
            className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer hover:bg-slate-950/80 transition-colors"
          >
            <option value="all" className="bg-slate-950 text-slate-200">Todas as Versões</option>
            {uniqueVersionsList.map(v => (
              <option key={v} value={v} className="bg-slate-950 text-slate-200">{v}</option>
            ))}
          </select>


        </div>
        
        {(selectedOS !== "all" || selectedVersion !== "all") && (
          <Button 
            variant="ghost" 
            onClick={resetFilters}
            className="text-slate-400 hover:text-white text-xs gap-1.5 self-end lg:self-auto h-9"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Resetar Filtros</span>
          </Button>
        )}
      </div>

      {/* Main Table or Empty State */}
      {assets.length === 0 ? (
        <EmptyState 
          icon={Monitor}
          title="Nenhum ativo importado"
          description="Importe seu inventário para começar. Depois disso, a IA poderá gerar roadmaps automaticamente."
        />
      ) : (
        <div className="rounded-2xl border border-white/5 overflow-hidden bg-slate-950/20">
          <DataTable 
            columns={columns} 
            data={filteredAssets} 
            searchKey="hostname" 
          />
        </div>
      )}

      {/* Auto Roadmap Review Dialog */}
      <Dialog open={showAutoReview} onOpenChange={(open) => {
        if (!open && !isGenerating) {
          setShowAutoReview(false);
          setAutoReviewData(null);
        }
      }}>
        <DialogContent className="max-w-[95vw] h-[95vh] p-0 flex flex-col overflow-hidden">
          <DialogTitle className="sr-only">Revisão de Roadmap</DialogTitle>
          <DialogDescription className="sr-only">Painel de revisão de roadmap antes da geração oficial.</DialogDescription>
          {autoReviewData && (
            <AIReviewPreview
              data={autoReviewData}
              onConfirm={handleAutoConfirm}
              onCancel={() => {
                setShowAutoReview(false);
                setAutoReviewData(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* AI Chat Generator Modal */}
      <AIChatGenerator open={isChatOpen} onOpenChange={setIsChatOpen} />
    </div>
  );
}
