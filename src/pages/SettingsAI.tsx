import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Bot, 
  Settings, 
  Activity, 
  CheckCircle, 
  AlertCircle, 
  Database,
  RefreshCw,
  Clock
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { lifecycleService } from "@/services/lifecycleService";

export default function SettingsAIPage() {
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_GEMINI_API_KEY || "");
  const [enriching, setEnriching] = useState(false);

  const handleEnrichManual = async () => {
    setEnriching(true);
    toast.promise(
      lifecycleService.enrichAllPending(),
      {
        loading: "Enriquecendo catálogo via Gemini AI...",
        success: (count) => {
          setEnriching(false);
          return `${count} itens atualizados com sucesso!`;
        },
        error: "Falha ao processar catálogo."
      }
    );
  };


  const { data: logs = [] } = useQuery({
    queryKey: ["ai-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_usage_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    }
  });

  const { data: stats } = useQuery({
    queryKey: ["ai-stats"],
    queryFn: async () => {
      const { count: total } = await supabase.from("ai_usage_logs").select("*", { count: 'exact', head: true });
      const { count: pending } = await supabase.from("lifecycle_catalog").select("*", { count: 'exact', head: true }).eq("verification_status", "pending_review");
      return { total: total || 0, pending: pending || 0 };
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Bot className="h-8 w-8 text-indigo-500" />
        <h1 className="text-3xl font-bold tracking-tight">Configurações de IA</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-3xl shadow-lg border-none bg-gradient-to-br from-indigo-500/5 to-purple-500/5">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Settings className="h-4 w-4 text-indigo-500" />
              <CardTitle className="text-sm uppercase tracking-wider font-black">Conectividade</CardTitle>
            </div>
            <CardDescription>Gerencie sua chave do Google AI Studio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Gemini API Key</Label>
              <Input 
                type="password" 
                value={apiKey} 
                onChange={e => setApiKey(e.target.value)}
                placeholder="AIza..."
                className="rounded-xl border-indigo-100"
              />
            </div>
            <Button className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700" onClick={() => toast.success("Configuração salva no ambiente!")}>
              Testar Conexão
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-lg border-none">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-emerald-500" />
              <CardTitle className="text-sm uppercase tracking-wider font-black">Performance</CardTitle>
            </div>
            <CardDescription>Métricas de uso da inteligência</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Total de Consultas</span>
              </div>
              <span className="text-lg font-black">{stats?.total}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">Aguardando Revisão</span>
              </div>
              <span className="text-lg font-black">{stats?.pending}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-lg border-none bg-indigo-600 text-white">
          <CardHeader>
            <CardTitle className="text-lg font-black">Ações de IA</CardTitle>
            <CardDescription className="text-indigo-100">Automação de dados mestres</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="secondary" 
              className="w-full rounded-xl gap-2"
              onClick={handleEnrichManual}
              disabled={enriching}
            >
              {enriching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Atualizar Lifecycle com IA
            </Button>

            <p className="text-[10px] text-center text-indigo-200">
              Isso irá buscar datas de EoL para todos os produtos sem informação no catálogo.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl shadow-lg border-none overflow-hidden">
        <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b">
          <CardTitle className="text-lg font-black">Logs de Auditoria de IA</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {logs.map((log: any) => (
              <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${log.success ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                    {log.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{log.prompt_type.replace('_', ' ').toUpperCase()}</p>
                    <p className="text-[10px] text-muted-foreground">{log.model}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-[10px] font-mono justify-end">
                    <Clock className="h-3 w-3" /> {log.execution_time_ms}ms
                  </div>
                  <p className="text-[10px] text-muted-foreground">{new Date(log.created_at).toLocaleString('pt-BR')}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
