import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { assetService } from "@/services/assetService";
import { DataTable } from "@/components/ui/data-table-custom";
import type { ColumnDef } from "@tanstack/react-table";
import type { Asset } from "@/types";
import { Monitor, Info, Sparkles, Filter, RefreshCw, Server, Laptop, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ImportWizard } from "@/components/inventory/ImportWizard";
import { useNavigate } from "react-router-dom";
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
  const [selectedCriticality, setSelectedCriticality] = useState<string>("all");

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
      const matchCriticality = selectedCriticality === "all" || asset.business_criticality === selectedCriticality;
      return matchOS && matchVersion && matchCriticality;
    });
  }, [assets, selectedOS, selectedVersion, selectedCriticality]);

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
    setSelectedCriticality("all");
    toast.success("Filtros limpos com sucesso");
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
      header: "Sistema Operacional",
      cell: ({ row }) => {
        const item = row.original.lifecycle_catalog;
        if (!item) return <span className="text-slate-500 text-xs italic">Não identificado</span>;
        return (
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-200">{item.product_name} {item.version}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{item.vendor}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "business_criticality",
      header: "Criticidade",
      cell: ({ row }) => {
        const criticality = row.original.business_criticality;
        const badgeClasses = {
          critical: "bg-red-950/60 text-red-400 border-red-800/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]",
          high: "bg-orange-950/60 text-orange-400 border-orange-800/30",
          medium: "bg-yellow-950/60 text-yellow-400 border-yellow-800/30",
          low: "bg-green-950/60 text-green-400 border-green-800/30",
        };
        const labels = {
          critical: "CRÍTICA",
          high: "ALTA",
          medium: "MÉDIA",
          low: "BAIXA",
        };
        return (
          <Badge className={`border font-black text-[10px] tracking-widest px-2 py-0.5 ${badgeClasses[criticality]}`}>
            {labels[criticality]}
          </Badge>
        );
      },
    },
    {
      accessorKey: "owner_department",
      header: "Setor / Departamento",
      cell: ({ row }) => (
        <span className="text-slate-300 font-medium">{row.original.owner_department || "-"}</span>
      ),
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
            <h1 className="text-3xl font-black tracking-tight text-white">Inventário de Ativos</h1>
            <p className="text-slate-400 text-sm mt-0.5">Importe seu inventário do GLPI e gerencie o ciclo de vida dos seus sistemas.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ImportWizard onComplete={() => queryClient.invalidateQueries({ queryKey: ["assets"] })} />
          <Button 
            onClick={() => navigate("/roadmaps")}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 gap-2 border border-indigo-500/20 transition-all"
          >
            <Sparkles className="h-4 w-4 text-cyan-300 animate-pulse" />
            <span>Gerar Roadmap com IA</span>
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

          {/* Criticality Filter */}
          <select
            value={selectedCriticality}
            onChange={(e) => setSelectedCriticality(e.target.value)}
            className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer hover:bg-slate-950/80 transition-colors"
          >
            <option value="all" className="bg-slate-950 text-slate-200">Todas as Criticidades</option>
            <option value="critical" className="bg-slate-950 text-slate-200">Crítica</option>
            <option value="high" className="bg-slate-950 text-slate-200">Alta</option>
            <option value="medium" className="bg-slate-950 text-slate-200">Média</option>
            <option value="low" className="bg-slate-950 text-slate-200">Baixa</option>
          </select>
        </div>
        
        {(selectedOS !== "all" || selectedVersion !== "all" || selectedCriticality !== "all") && (
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

      {/* Main Table */}
      <div className="rounded-2xl border border-white/5 overflow-hidden bg-slate-950/20">
        <DataTable 
          columns={columns} 
          data={filteredAssets} 
          searchKey="hostname" 
        />
      </div>
    </div>
  );
}
