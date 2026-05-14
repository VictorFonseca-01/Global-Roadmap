import { useState } from "react";
import { User, Mail, Briefcase, Building, Shield, Save, Camera, Palette, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

export default function ProfilePage() {
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [profile] = useState({

    name: "Victor Fonseca",
    email: "victor.fonseca@globalparts.com",
    role: "IT Director",
    department: "Infrastructure & Security",
    avatar: "https://github.com/shadcn.png",
    lastLogin: "14/05/2026 10:30",
    theme: "dark"
  });

  const handleSave = () => {
    toast.success("Perfil atualizado com sucesso!");
  };

  const handleLogout = () => {
    toast.info("Encerrando sessão...");
    // window.location.href = "/login";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <User className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">Meu Perfil</h1>
            <p className="text-muted-foreground text-sm font-medium">Gerencie suas informações e preferências do sistema.</p>
          </div>
        </div>
        <Button onClick={handleSave} className="rounded-full px-8 h-12 shadow-lg shadow-primary/20 font-bold">
          <Save className="h-4 w-4 mr-2" /> Salvar Alterações
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Lado Esquerdo: Avatar e Status */}
        <div className="space-y-6">
          <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white dark:bg-slate-900">
            <CardContent className="p-8 flex flex-col items-center text-center">
              <div className="relative group mb-6">
                <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-primary/20 group-hover:border-primary transition-all duration-300">
                  <img src={profile.avatar} alt="Avatar" className="h-full w-full object-cover" />
                </div>
                <button className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full shadow-lg hover:scale-110 transition-all">
                  <Camera className="h-4 w-4" />
                </button>
              </div>
              <h2 className="text-xl font-bold mb-1">{profile.name}</h2>
              <Badge variant="outline" className="rounded-full mb-6 px-4 bg-primary/5 text-primary border-primary/20">
                <Shield className="h-3 w-3 mr-1" /> Administrador
              </Badge>
              
              <div className="w-full space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Último Acesso</span>
                  <span className="font-medium">{profile.lastLogin}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button 
            variant="destructive" 
            className="w-full rounded-2xl h-14 font-bold shadow-lg shadow-red-500/10"
            onClick={() => setIsLogoutModalOpen(true)}
          >
            <LogOut className="h-5 w-5 mr-2" /> Sair da Conta
          </Button>
        </div>

        {/* Lado Direito: Formulário */}
        <div className="md:col-span-2 space-y-6">
          <Card className="rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-slate-900">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-xl font-black">Informações Pessoais</CardTitle>
              <CardDescription>Estes dados serão visíveis em seus relatórios e planos de migração.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-bold ml-1">Nome Completo</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input id="name" defaultValue={profile.name} className="rounded-2xl h-12 pl-12 bg-slate-50 dark:bg-slate-950 border-none focus-visible:ring-primary" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-bold ml-1">Email Corporativo</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input id="email" defaultValue={profile.email} className="rounded-2xl h-12 pl-12 bg-slate-50 dark:bg-slate-950 border-none focus-visible:ring-primary" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-bold ml-1">Cargo / Função</Label>
                  <div className="relative">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input id="role" defaultValue={profile.role} className="rounded-2xl h-12 pl-12 bg-slate-50 dark:bg-slate-950 border-none focus-visible:ring-primary" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dept" className="text-sm font-bold ml-1">Departamento</Label>
                  <div className="relative">
                    <Building className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input id="dept" defaultValue={profile.department} className="rounded-2xl h-12 pl-12 bg-slate-50 dark:bg-slate-950 border-none focus-visible:ring-primary" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-slate-900">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-xl font-black flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" /> Preferências de Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl">
                <div>
                  <h4 className="font-bold">Tema da Interface</h4>
                  <p className="text-xs text-muted-foreground text-slate-500">Alternar entre modo claro e escuro automaticamente.</p>
                </div>
                <div className="flex gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl shadow-inner border border-slate-100 dark:border-slate-800">
                  <Button variant="ghost" size="sm" className="rounded-lg h-8 px-4 font-bold">Claro</Button>
                  <Button variant="secondary" size="sm" className="rounded-lg h-8 px-4 font-bold shadow-sm">Escuro</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmationModal 
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
        title="Deseja mesmo sair?"
        description="Sua sessão será encerrada e você precisará fazer login novamente para acessar a plataforma."
        confirmLabel="Sim, Sair agora"
        cancelLabel="Não, quero ficar"
        variant="destructive"
      />
    </div>
  );
}
