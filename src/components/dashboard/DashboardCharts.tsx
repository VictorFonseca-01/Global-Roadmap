import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Legend, 
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-xl">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{label || payload[0].payload.name || payload[0].name}</p>
        <div className="flex flex-col gap-1.5">
          {payload.map((p: any, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.fill || '#000' }} />
              <span className="font-bold text-slate-700 dark:text-slate-200">{p.value} {p.name !== 'value' ? p.name : 'Ativos'}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const ChartEmptyState = ({ title }: { title: string }) => (
  <Card className="col-span-1 rounded-[2rem] border-slate-200/60 dark:border-slate-800/60 shadow-sm bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl flex flex-col items-center justify-center p-6 min-h-[300px]">
    <AlertCircle className="h-8 w-8 text-slate-300 mb-3" />
    <h3 className="text-sm font-bold text-slate-500">{title}</h3>
    <p className="text-xs text-slate-400 text-center mt-1">Dados insuficientes para exibição</p>
  </Card>
);

export function RiskChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <ChartEmptyState title="Distribuição por Criticidade" />;
  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-1 rounded-[2rem] border-slate-200/60 dark:border-slate-800/60 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl">
      <CardHeader className="pb-0">
        <CardTitle className="text-[11px] font-black uppercase tracking-widest text-slate-500">Distribuição por Criticidade</CardTitle>
      </CardHeader>
      <CardContent className="h-[280px] mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={65}
              outerRadius={85}
              paddingAngle={6}
              dataKey="value"
              stroke="none"
              cornerRadius={6}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingTop: '10px' }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function MigrationStatusChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <ChartEmptyState title="Status das Migrações" />;
  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-1 rounded-[2rem] border-slate-200/60 dark:border-slate-800/60 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl">
      <CardHeader className="pb-0">
        <CardTitle className="text-[11px] font-black uppercase tracking-widest text-slate-500">Status das Migrações</CardTitle>
      </CardHeader>
      <CardContent className="h-[280px] mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={65}
              outerRadius={85}
              paddingAngle={6}
              dataKey="value"
              stroke="none"
              cornerRadius={6}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingTop: '10px' }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function CategoryDistributionChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <ChartEmptyState title="Ativos por Categoria" />;
  return (
    <Card className="col-span-1 lg:col-span-2 rounded-[2rem] border-slate-200/60 dark:border-slate-800/60 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl">
      <CardHeader className="pb-0">
        <CardTitle className="text-[11px] font-black uppercase tracking-widest text-slate-500">Ativos por Categoria</CardTitle>
      </CardHeader>
      <CardContent className="h-[280px] mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.6}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
            <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} dy={10} fontWeight={600} />
            <YAxis fontSize={10} tickLine={false} axisLine={false} dx={-10} fontWeight={600} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)', radius: 8 }} />
            <Bar dataKey="value" fill="url(#barGradient)" radius={[6, 6, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function EolTimelineChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <ChartEmptyState title="End of Support (Time-series)" />;
  return (
    <Card className="col-span-1 lg:col-span-2 rounded-[2rem] border-slate-200/60 dark:border-slate-800/60 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl">
      <CardHeader className="pb-0">
        <CardTitle className="text-[11px] font-black uppercase tracking-widest text-slate-500">Projeção End of Support (Timeline)</CardTitle>
      </CardHeader>
      <CardContent className="h-[280px] mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
            <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} dy={10} fontWeight={600} />
            <YAxis fontSize={10} tickLine={false} axisLine={false} dx={-10} fontWeight={600} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} fill="url(#areaGradient)" activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
