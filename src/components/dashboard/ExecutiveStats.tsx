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

import { motion } from "framer-motion"

export function ExecutiveStats({ stats }: StatsProps) {
  const cards = [
    { title: "Total Roadmaps", value: stats.totalRoadmaps, icon: BarChart3, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Total Assets", value: stats.totalAssets, icon: Monitor, color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { title: "Itens Críticos", value: stats.critical, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10" },
    { title: "Itens High", value: stats.high, icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-500/10" },
    { title: "Itens Medium", value: stats.medium, icon: Clock, color: "text-yellow-500", bg: "bg-yellow-500/10" },
    { title: "Itens Low", value: stats.low, icon: Clock, color: "text-green-500", bg: "bg-green-500/10" },
    { title: "Fora de Suporte", value: stats.outOfSupport, icon: AlertTriangle, color: "text-red-700", bg: "bg-red-700/10" },
    { title: "Próximos 180 dias", value: stats.next180Days, icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-600/10" },
    { title: "Total Servidores", value: stats.totalServers, icon: Server, color: "text-purple-500", bg: "bg-purple-500/10" },
    { title: "Workstations", value: stats.totalWorkstations, icon: Monitor, color: "text-cyan-500", bg: "bg-cyan-500/10" },
    { title: "Categorias", value: stats.totalCategories, icon: Layers, color: "text-slate-500", bg: "bg-slate-500/10" },
    { title: "Orçamento Estimado", value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.estimatedBudget), icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-600/10" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          whileHover={{ y: -5, scale: 1.02 }}
          className="group"
        >
          <Card className="border-none shadow-lg rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">{card.title}</CardTitle>
              <div className={`p-2 rounded-xl ${card.bg}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black tracking-tight">{card.value}</div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
