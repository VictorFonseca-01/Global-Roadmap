import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, AlertTriangle, Bug, ServerCrash, CheckCircle2, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TelemetryEvent {
  id: string;
  event_type: string;
  severity: string;
  message: string;
  duration_ms: number;
  created_at: string;
}

export function SystemHealthTab() {
  const { data: telemetry, isLoading } = useQuery({
    queryKey: ['system-telemetry'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_telemetry')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as TelemetryEvent[];
    },
    refetchInterval: 30000 // atualiza a cada 30s para monitoramento ativo
  });

  if (isLoading) {
    return <div className="flex h-40 items-center justify-center animate-pulse"><Activity className="h-8 w-8 text-slate-300" /></div>;
  }

  const crashes = telemetry?.filter(t => t.event_type === 'react_crash') || [];
  const slowQueries = telemetry?.filter(t => t.event_type === 'performance_warning') || [];
  const apiErrors = telemetry?.filter(t => t.event_type === 'api_error') || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-red-50/50 dark:bg-red-950/20 border-red-100 dark:border-red-900 shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-full text-red-600">
              <ServerCrash className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-red-600/70 uppercase">Crashes de UI</p>
              <h4 className="text-2xl font-black text-red-700 dark:text-red-500">{crashes.length}</h4>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50/50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900 shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/50 rounded-full text-orange-600">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-orange-600/70 uppercase">Lentidão &gt; 5s</p>
              <h4 className="text-2xl font-black text-orange-700 dark:text-orange-500">{slowQueries.length}</h4>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900 shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-full text-blue-600">
              <Bug className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-blue-600/70 uppercase">Falhas de API/IA</p>
              <h4 className="text-2xl font-black text-blue-700 dark:text-blue-500">{apiErrors.length}</h4>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-xl bg-white dark:bg-slate-900/50 backdrop-blur-sm rounded-[2rem] overflow-hidden">
        <CardHeader className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 p-8 pb-6">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" /> Log de Telemetria (Live)
          </CardTitle>
          <CardDescription>
            Últimos eventos do sistema em tempo real. Monitoramento crítico de falhas e performance.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {telemetry?.length === 0 ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center">
              <CheckCircle2 className="h-10 w-10 text-green-500 mb-3" />
              <p className="font-medium">Nenhum evento crítico registrado.</p>
              <p className="text-sm">O sistema está operando perfeitamente.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[400px] overflow-y-auto">
              {telemetry?.map(item => (
                <div key={item.id} className="p-4 px-8 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors flex items-start gap-4">
                  <div className="mt-1 shrink-0">
                    {item.severity === 'critical' ? <ServerCrash className="h-5 w-5 text-red-500" /> :
                     item.severity === 'warning' ? <Clock className="h-5 w-5 text-orange-500" /> :
                     <AlertTriangle className="h-5 w-5 text-blue-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold capitalize">{item.event_type.replace('_', ' ')}</p>
                      <span className="text-xs font-medium text-slate-400">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 truncate">{item.message}</p>
                    {item.duration_ms && (
                      <p className="text-xs text-slate-400 mt-1 font-mono">Duração: {item.duration_ms}ms</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
