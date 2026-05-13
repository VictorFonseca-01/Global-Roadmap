import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LayoutDashboard, Database, AlertTriangle, Calendar } from "lucide-react"

export default function Dashboard() {
  const stats = [
    { title: "Total Roadmaps", value: "12", icon: LayoutDashboard, color: "text-blue-500" },
    { title: "Total Assets", value: "1,248", icon: Database, color: "text-green-500" },
    { title: "Critical Items", value: "45", icon: AlertTriangle, color: "text-red-500" },
    { title: "Upcoming EoL", value: "18", icon: Calendar, color: "text-amber-500" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Executivo</h1>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                +2.5% em relação ao mês passado
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Visão Geral de Roadmaps</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center border-2 border-dashed rounded-md m-4">
            <p className="text-muted-foreground">Gráfico de Roadmaps (Recharts em breve)</p>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Itens Críticos Recentes</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center border-2 border-dashed rounded-md m-4">
            <p className="text-muted-foreground">Lista de alertas em breve</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
