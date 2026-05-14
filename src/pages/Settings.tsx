import { useState } from "react";
import { 
  Settings as SettingsIcon, 
  Brain, 
  Bell, 
  Palette, 
  Shield, 
  Globe, 
  Cpu,
  ChevronRight,
  Save,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function SettingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success("Configurações salvas com sucesso!");
    }, 1000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <SettingsIcon className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">Configurações</h1>
            <p className="text-muted-foreground text-sm font-medium">Controle as preferências globais da plataforma.</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={loading} className="rounded-full px-8 h-12 shadow-lg shadow-primary/20 font-bold">
          {loading ? "Salvando..." : <><Save className="h-4 w-4 mr-2" /> Salvar Configurações</>}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl h-14 border border-slate-200 dark:border-slate-800">
          <TabsTrigger value="general" className="rounded-xl px-6 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm">
            <Globe className="h-4 w-4 mr-2" /> Geral
          </TabsTrigger>
          <TabsTrigger value="ai" className="rounded-xl px-6 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm">
            <Brain className="h-4 w-4 mr-2" /> Inteligência Artificial
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-xl px-6 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm">
            <Bell className="h-4 w-4 mr-2" /> Notificações
          </TabsTrigger>
          <TabsTrigger value="appearance" className="rounded-xl px-6 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm">
            <Palette className="h-4 w-4 mr-2" /> Aparência
          </TabsTrigger>
          <TabsTrigger value="system" className="rounded-xl px-6 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm">
            <Cpu className="h-4 w-4 mr-2" /> Sistema
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 outline-none">
          <Card className="rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-slate-900">
            <CardHeader className="p-8">
              <CardTitle className="text-xl font-black">Informações da Organização</CardTitle>
              <CardDescription>Configure os dados principais da Global Parts no sistema.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-bold ml-1">Nome da Empresa</Label>
                  <Input defaultValue="Global Parts Technology" className="rounded-2xl h-12 bg-slate-50 dark:bg-slate-950 border-none" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold ml-1">Domínio Principal</Label>
                  <Input defaultValue="globalparts.com" className="rounded-2xl h-12 bg-slate-50 dark:bg-slate-950 border-none" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-6 outline-none">
          <Card className="rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-slate-900">
            <CardHeader className="p-8">
              <CardTitle className="text-xl font-black flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" /> Configuração do Motor Gemini
              </CardTitle>
              <CardDescription>Gerencie as chaves e o comportamento da inteligência artificial.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-6">
              <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-500/10 rounded-xl">
                    <Shield className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <h4 className="font-bold">Painel de Controle de IA</h4>
                    <p className="text-sm text-muted-foreground">Acesse as ferramentas avançadas de enriquecimento e telemetria.</p>
                  </div>
                </div>
                <Button variant="outline" className="rounded-full px-6 font-bold" onClick={() => navigate("/settings/ai")}>
                  Abrir Painel IA <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6 outline-none">
          <Card className="rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-slate-900">
            <CardHeader className="p-8">
              <CardTitle className="text-xl font-black">Preferências de Notificação</CardTitle>
              <CardDescription>Escolha como e quando você deseja ser notificado.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl">
                  <div className="space-y-0.5">
                    <Label className="text-base font-bold">Alertas de Ciclo de Vida</Label>
                    <p className="text-sm text-muted-foreground italic">Notificar quando ativos estiverem a 90 dias do EoL.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl">
                  <div className="space-y-0.5">
                    <Label className="text-base font-bold">Relatórios Mensais</Label>
                    <p className="text-sm text-muted-foreground italic">Enviar resumo executivo por email todo dia 1º.</p>
                  </div>
                  <Switch />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6 outline-none">
          <Card className="rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-slate-900">
            <CardHeader className="p-8">
              <CardTitle className="text-xl font-black">Personalização Visual</CardTitle>
              <CardDescription>Ajuste a interface para o seu estilo de trabalho.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border-2 border-primary rounded-2xl bg-primary/5 cursor-pointer">
                  <div className="h-20 bg-slate-900 rounded-lg mb-3" />
                  <p className="text-center font-bold text-sm">Escuro Moderno</p>
                </div>
                <div className="p-4 border-2 border-slate-100 dark:border-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer">
                  <div className="h-20 bg-slate-100 rounded-lg mb-3" />
                  <p className="text-center font-bold text-sm">Claro Minimalista</p>
                </div>
                <div className="p-4 border-2 border-slate-100 dark:border-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer">
                  <div className="h-20 bg-gradient-to-br from-slate-900 to-primary/40 rounded-lg mb-3" />
                  <p className="text-center font-bold text-sm">Auto (Sistema)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6 outline-none">
          <Card className="rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-slate-900">
            <CardHeader className="p-8">
              <CardTitle className="text-xl font-black text-red-500 flex items-center gap-2">
                <Shield className="h-5 w-5" /> Zona Crítica
              </CardTitle>
              <CardDescription>Ações destrutivas e manutenção global do sistema.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-4">
              <div className="flex items-center justify-between p-6 border-2 border-red-500/10 bg-red-500/5 rounded-[2rem]">
                <div>
                  <h4 className="font-bold text-red-600">Resetar Banco de Dados</h4>
                  <p className="text-sm text-red-600/70">Apaga todos os roadmaps, ativos e planos de migração. Esta ação é irreversível.</p>
                </div>
                <Button variant="destructive" className="rounded-full px-6 font-bold shadow-lg shadow-red-500/20">
                  Resetar Tudo
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex items-center gap-2 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
        <Info className="h-4 w-4 text-blue-500" />
        <p className="text-xs text-blue-500 font-medium">Versão da Plataforma: v1.0.0-hardened | Global Parts Technology Roadmap</p>
      </div>
    </div>
  );
}
