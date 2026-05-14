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
  Info,
  Trash2,
  RefreshCw,
  Database
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

export default function SettingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success("Configurações globais atualizadas com sucesso!");
    }, 1000);
  };

  const handleResetSystem = () => {
    toast.info("Iniciando reset do sistema...");
    setTimeout(() => {
      toast.success("Sistema resetado com sucesso.");
      setIsResetModalOpen(false);
    }, 2000);
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
        <Button onClick={handleSave} disabled={loading} className="rounded-full px-8 h-12 shadow-lg shadow-primary/20 font-bold transition-all hover:scale-105 active:scale-95">
          {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar Configurações
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-[2rem] h-14 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md">
          <TabsTrigger value="general" className="rounded-full px-6 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-lg transition-all">
            <Globe className="h-4 w-4 mr-2" /> Geral
          </TabsTrigger>
          <TabsTrigger value="ai" className="rounded-full px-6 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-lg transition-all">
            <Brain className="h-4 w-4 mr-2" /> Inteligência Artificial
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-full px-6 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-lg transition-all">
            <Bell className="h-4 w-4 mr-2" /> Notificações
          </TabsTrigger>
          <TabsTrigger value="appearance" className="rounded-full px-6 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-lg transition-all">
            <Palette className="h-4 w-4 mr-2" /> Aparência
          </TabsTrigger>
          <TabsTrigger value="system" className="rounded-full px-6 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-lg transition-all">
            <Cpu className="h-4 w-4 mr-2" /> Sistema
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 outline-none">
          <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white dark:bg-slate-900/50 backdrop-blur-sm overflow-hidden">
            <CardHeader className="p-10 pb-4">
              <CardTitle className="text-2xl font-black">Informações da Organização</CardTitle>
              <CardDescription className="text-base">Configure os dados principais da Global Parts no sistema.</CardDescription>
            </CardHeader>
            <CardContent className="p-10 pt-0 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-sm font-bold ml-1 opacity-70">Nome da Empresa</Label>
                  <Input defaultValue="Global Parts Technology" className="rounded-2xl h-14 bg-slate-50 dark:bg-slate-950/50 border-none focus-visible:ring-primary shadow-inner" />
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-bold ml-1 opacity-70">Domínio Principal</Label>
                  <Input defaultValue="globalparts.com" className="rounded-2xl h-14 bg-slate-50 dark:bg-slate-950/50 border-none focus-visible:ring-primary shadow-inner" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-6 outline-none">
          <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white dark:bg-slate-900/50 backdrop-blur-sm">
            <CardHeader className="p-10 pb-4">
              <CardTitle className="text-2xl font-black flex items-center gap-3">
                <Brain className="h-7 w-7 text-primary" /> Configuração do Motor Gemini
              </CardTitle>
              <CardDescription className="text-base">Gerencie as chaves e o comportamento da inteligência artificial.</CardDescription>
            </CardHeader>
            <CardContent className="p-10 pt-0 space-y-8">
              <div className="p-8 bg-gradient-to-br from-primary/5 to-transparent rounded-[2.5rem] border border-primary/10 flex items-center justify-between group hover:border-primary/30 transition-all">
                <div className="flex items-center gap-6">
                  <div className="p-5 bg-primary/10 rounded-[1.5rem] group-hover:scale-110 transition-transform">
                    <Shield className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black">Painel de Controle de IA</h4>
                    <p className="text-sm text-muted-foreground italic mt-1">Acesse as ferramentas avançadas de enriquecimento e telemetria.</p>
                  </div>
                </div>
                <Button variant="outline" className="rounded-full px-8 h-12 font-bold shadow-sm" onClick={() => navigate("/settings/ai")}>
                  Abrir Painel IA <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6 outline-none">
          <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white dark:bg-slate-900/50 backdrop-blur-sm">
            <CardHeader className="p-10 pb-4">
              <CardTitle className="text-2xl font-black">Preferências de Notificação</CardTitle>
              <CardDescription className="text-base">Escolha como e quando a organização deve receber alertas.</CardDescription>
            </CardHeader>
            <CardContent className="p-10 pt-0 space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-6 bg-slate-50/50 dark:bg-slate-950/30 rounded-[1.8rem] hover:bg-slate-50 dark:hover:bg-slate-950/50 transition-colors">
                  <div className="space-y-1">
                    <Label className="text-base font-black">Alertas de Ciclo de Vida</Label>
                    <p className="text-sm text-muted-foreground italic">Notificar gestores quando ativos estiverem a 90 dias do EoL.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-6 bg-slate-50/50 dark:bg-slate-950/30 rounded-[1.8rem] hover:bg-slate-50 dark:hover:bg-slate-950/50 transition-colors">
                  <div className="space-y-1">
                    <Label className="text-base font-black">Relatórios Automáticos</Label>
                    <p className="text-sm text-muted-foreground italic">Enviar resumo executivo por email todo dia 1º.</p>
                  </div>
                  <Switch />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6 outline-none">
          <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white dark:bg-slate-900/50 backdrop-blur-sm">
            <CardHeader className="p-10 pb-4">
              <CardTitle className="text-2xl font-black">Personalização Visual</CardTitle>
              <CardDescription className="text-base">Ajuste o branding e as cores globais da plataforma.</CardDescription>
            </CardHeader>
            <CardContent className="p-10 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: "Escuro Moderno", class: "bg-slate-950", active: true },
                  { label: "Claro Minimalista", class: "bg-slate-100", active: false },
                  { label: "Auto (Sistema)", class: "bg-gradient-to-br from-slate-950 to-primary/40", active: false }
                ].map((t) => (
                  <div 
                    key={t.label} 
                    className={`p-5 border-2 rounded-[2rem] cursor-pointer transition-all hover:scale-[1.02] ${t.active ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'}`}
                  >
                    <div className={`h-24 rounded-2xl mb-4 shadow-inner ${t.class}`} />
                    <p className="text-center font-black text-sm">{t.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6 outline-none">
          <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white dark:bg-slate-900/50 backdrop-blur-sm overflow-hidden">
            <div className="h-2 bg-red-500/20 w-full" />
            <CardHeader className="p-10 pb-4">
              <CardTitle className="text-2xl font-black text-red-500 flex items-center gap-3">
                <Shield className="h-7 w-7" /> Zona Crítica & Manutenção
              </CardTitle>
              <CardDescription className="text-base">Ações de alto impacto que afetam todos os usuários e dados da plataforma.</CardDescription>
            </CardHeader>
            <CardContent className="p-10 pt-0 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="flex items-center justify-between p-8 border-2 border-red-500/10 bg-red-500/5 rounded-[2.5rem] group hover:border-red-500/30 transition-all">
                  <div className="flex items-center gap-6">
                    <div className="p-5 bg-red-500/10 rounded-[1.5rem] group-hover:scale-110 transition-transform">
                      <Database className="h-8 w-8 text-red-500" />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-red-600">Resetar Banco de Dados</h4>
                      <p className="text-sm text-red-600/70 max-w-md italic mt-1">Apaga todos os roadmaps, ativos e planos de migração. Esta ação é irreversível.</p>
                    </div>
                  </div>
                  <Button 
                    variant="destructive" 
                    className="rounded-full px-10 h-14 font-black shadow-xl shadow-red-500/20 transition-all hover:scale-105 active:scale-95"
                    onClick={() => setIsResetModalOpen(true)}
                  >
                    <Trash2 className="h-5 w-5 mr-2" /> Resetar Tudo
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex items-center gap-3 p-5 bg-primary/5 rounded-[1.5rem] border border-primary/10 backdrop-blur-sm">
        <Info className="h-5 w-5 text-primary" />
        <p className="text-sm text-primary/80 font-bold tracking-tight">Versão da Plataforma: v1.0.0-hardened | Global Parts Technology Roadmap</p>
      </div>

      <ConfirmationModal 
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleResetSystem}
        title="Deseja mesmo resetar o sistema?"
        description="Esta ação irá apagar permanentemente todos os dados da plataforma. Não há como desfazer isso."
        confirmLabel="Sim, Resetar Tudo"
        cancelLabel="Cancelar"
        variant="destructive"
      />
    </div>
  );
}
