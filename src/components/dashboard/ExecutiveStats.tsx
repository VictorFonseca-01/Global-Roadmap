import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Monitor,
  AlertTriangle, 
  DollarSign, 
  Zap
} from "lucide-react"

interface StatsProps {
  stats: any;
}

import { motion } from "framer-motion"

export function ExecutiveStats({ stats }: StatsProps) {
  const mainCards = [
    { 
      title: "Ativos Monitorados", 
      value: stats.totalAssets, 
      subtitle: `${stats.totalServers} Servidores · ${stats.totalWorkstations} Workstations`,
      icon: Monitor, 
      color: "text-blue-500", 
      bg: "bg-blue-500/10",
      trend: "Estável"
    },
    { 
      title: "Risco Iminente (EOL)", 
      value: stats.outOfSupport + stats.next180Days, 
      subtitle: `${stats.outOfSupport} Expirados · ${stats.next180Days} nos próximos 180 dias`,
      icon: AlertTriangle, 
      color: "text-rose-500", 
      bg: "bg-rose-500/10",
      trend: "Ação Necessária"
    },
    { 
      title: "Prioridade de Migração", 
      value: stats.critical + stats.high, 
      subtitle: `${stats.critical} Críticos · ${stats.high} Altos`,
      icon: Zap, 
      color: "text-amber-500", 
      bg: "bg-amber-500/10",
      trend: "Crítico"
    },
    { 
      title: "Orçamento Base Projetado", 
      value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(stats.estimatedBudget), 
      subtitle: `Distribuído em ${stats.totalRoadmaps} Roadmaps`,
      icon: DollarSign, 
      color: "text-emerald-500", 
      bg: "bg-emerald-500/10",
      trend: "Estimativa"
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
      {mainCards.map((card, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          whileHover={{ y: -5 }}
          className="group"
        >
          <Card className="relative overflow-hidden border border-slate-200/60 dark:border-slate-800/60 shadow-lg rounded-[2rem] hover:shadow-2xl hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl">
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-30 group-hover:opacity-50 transition-opacity ${card.bg.replace('/10', '')}`} />
            
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                {card.title}
              </CardTitle>
              <div className={`p-2.5 rounded-2xl ${card.bg}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} strokeWidth={2.5} />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-4xl font-black tracking-tighter mb-2 bg-gradient-to-br from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
                {card.value}
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{card.subtitle}</span>
                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${card.bg} ${card.color}`}>
                  {card.trend}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
