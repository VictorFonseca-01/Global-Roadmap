import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  BarChart3, 
  Monitor, 
  AlertTriangle, 
  Clock, 
  Layers, 
  DollarSign, 
  TrendingUp,
  Server
} from "lucide-react"

interface StatsProps {
  stats: any;
}

export function ExecutiveStats({ stats }: StatsProps) {
  const cards = [
    { title: "Total Roadmaps", value: stats.totalRoadmaps, icon: BarChart3, color: "text-blue-500" },
    { title: "Total Assets", value: stats.totalAssets, icon: Monitor, color: "text-indigo-500" },
    { title: "Itens Críticos", value: stats.critical, icon: AlertTriangle, color: "text-red-500" },
    { title: "Itens High", value: stats.high, icon: AlertTriangle, color: "text-orange-500" },
    { title: "Itens Medium", value: stats.medium, icon: Clock, color: "text-yellow-500" },
    { title: "Itens Low", value: stats.low, icon: Clock, color: "text-green-500" },
    { title: "Fora de Suporte", value: stats.outOfSupport, icon: AlertTriangle, color: "text-red-700" },
    { title: "Próximos 180 dias", value: stats.next180Days, icon: TrendingUp, color: "text-amber-600" },
    { title: "Total Servidores", value: stats.totalServers, icon: Server, color: "text-purple-500" },
    { title: "Workstations", value: stats.totalWorkstations, icon: Monitor, color: "text-cyan-500" },
    { title: "Categorias", value: stats.totalCategories, icon: Layers, color: "text-slate-500" },
    { title: "Orçamento Estimado", value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.estimatedBudget), icon: DollarSign, color: "text-emerald-600" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, i) => (
        <Card key={i} className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
