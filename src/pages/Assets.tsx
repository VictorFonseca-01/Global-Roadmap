import { useQuery, useQueryClient } from "@tanstack/react-query";
import { assetService } from "@/services/assetService";
import { DataTable } from "@/components/ui/data-table-custom";
import type { ColumnDef } from "@tanstack/react-table";
import type { Asset } from "@/types";
import { Monitor, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ImportWizard } from "@/components/inventory/ImportWizard";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function AssetsPage() {
  const queryClient = useQueryClient();

  const { data: assets = [] } = useQuery({
    queryKey: ["assets"],
    queryFn: () => assetService.getAll(),
  });

  const columns: ColumnDef<Asset>[] = [
    {
      accessorKey: "hostname",
      header: "Hostname",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-bold">{row.original.hostname}</span>
          <span className="text-xs text-muted-foreground">{row.original.asset_tag || "S/N"}</span>
        </div>
      ),
    },
    {
      accessorKey: "device_type",
      header: "Tipo",
      cell: ({ row }) => (
        <Badge variant="secondary" className="capitalize">
          {row.original.device_type}
        </Badge>
      ),
    },
    {
      accessorKey: "asset_categories.name",
      header: "Categoria",
    },
    {
      accessorKey: "lifecycle_catalog.product_name",
      header: "Lifecycle (SO/HW)",
      cell: ({ row }) => {
        const item = row.original.lifecycle_catalog;
        if (!item) return <span className="text-muted-foreground text-xs italic">Não identificado</span>;
        return (
          <div className="flex flex-col">
            <span className="text-sm font-medium">{item.product_name} {item.version}</span>
            <span className="text-[10px] text-muted-foreground uppercase">{item.vendor}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "business_criticality",
      header: "Criticidade Negócio",
      cell: ({ row }) => {
        const criticality = row.original.business_criticality;
        const colors = {
          critical: "bg-red-500 hover:bg-red-600",
          high: "bg-orange-500 hover:bg-orange-600",
          medium: "bg-yellow-500 hover:bg-yellow-600",
          low: "bg-green-500 hover:bg-green-600",
        };
        return (
          <Badge className={`${colors[criticality]} text-white`}>
            {criticality.toUpperCase()}
          </Badge>
        );
      },
    },
    {
      accessorKey: "owner_department",
      header: "Departamento",
    },
    {
      id: "details",
      cell: ({ row }) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <div className="p-2 space-y-1 text-xs">
                <p><strong>CPU:</strong> {row.original.cpu || "N/A"}</p>
                <p><strong>RAM:</strong> {row.original.ram_gb ? `${row.original.ram_gb} GB` : "N/A"}</p>
                <p><strong>Storage:</strong> {row.original.storage_gb ? `${row.original.storage_gb} GB` : "N/A"}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Monitor className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Inventário de Ativos</h1>
        </div>
        <div className="flex gap-2">
          <ImportWizard onComplete={() => queryClient.invalidateQueries({ queryKey: ["assets"] })} />
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={assets} 
        searchKey="hostname" 
      />
    </div>
  );
}
