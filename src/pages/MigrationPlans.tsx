import { useQuery } from "@tanstack/react-query";
import { migrationPlanService } from "@/services/migrationPlanService";
import { DataTable } from "@/components/ui/data-table-custom";
import type { ColumnDef } from "@tanstack/react-table";
import type { MigrationPlan } from "@/types";
import { ArrowRightCircle, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";

export default function MigrationPlansPage() {
  const { data: plans = [] } = useQuery({
    queryKey: ["migration-plans"],
    queryFn: () => migrationPlanService.getAll(),
  });

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      planned: "bg-blue-100 text-blue-800",
      testing: "bg-purple-100 text-purple-800",
      pilot: "bg-indigo-100 text-indigo-800",
      in_progress: "bg-orange-100 text-orange-800",
      completed: "bg-green-100 text-green-800",
      blocked: "bg-red-100 text-red-800",
    };
    return <Badge variant="outline" className={styles[status as keyof typeof styles]}>{status.replace('_', ' ')}</Badge>;
  };

  const columns: ColumnDef<MigrationPlan>[] = [
    {
      accessorKey: "assets.hostname",
      header: "Ativo",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-bold">{row.original.assets?.hostname}</span>
          <span className="text-[10px] text-muted-foreground">ID: {row.original.asset_id.slice(0, 8)}</span>
        </div>
      ),
    },
    {
      accessorKey: "priority",
      header: "Prioridade",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {getPriorityIcon(row.original.priority)}
          <span className="capitalize font-medium">{row.original.priority}</span>
        </div>
      ),
    },
    {
      accessorKey: "recommended_target_os",
      header: "Destino Recomendado",
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original.recommended_target_os || "N/A"}</Badge>
      ),
    },
    {
      accessorKey: "recommended_start_date",
      header: "Início Recomendado",
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.recommended_start_date 
            ? format(parseISO(row.original.recommended_start_date), "dd/MM/yyyy")
            : "N/A"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      accessorKey: "justification",
      header: "Justificativa",
      cell: ({ row }) => (
        <p className="text-xs text-muted-foreground max-w-xs truncate" title={row.original.justification}>
          {row.original.justification}
        </p>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowRightCircle className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Planos de Renovação</h1>
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={plans} 
        searchKey="priority" 
      />
    </div>
  );
}
