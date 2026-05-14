import { useState, useRef } from "react";
import { User, Mail, Briefcase, Building, Shield, Save, Camera, Palette, LogOut, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { userService } from "@/services/userService";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTheme } from "@/components/theme-provider";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useNavigate } from "react-router-dom";

const profileSchema = z.object({
  full_name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  role: z.string().min(2, "Cargo é obrigatório"),
  department: z.string().min(2, "Departamento é obrigatório"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Usar o hook robusto
  const { profile, isLoading, isAuthenticated, userId, initials } = useUserProfile();

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: profile ? {
      full_name: profile.full_name,
      email: profile.email,
      role: profile.role,
      department: profile.department,
    } : undefined
  });

  const updateMutation = useMutation({
    mutationFn: (values: ProfileFormValues) => {
      if (!userId) throw new Error("Sessão não encontrada. Faça login novamente.");
      return userService.updateProfile(userId, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      toast.success("Perfil atualizado com sucesso.");
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar perfil: ${error.message}`);
      if (error.message.includes("Sessão não encontrada")) {
        navigate("/login");
      }
    }
  });

  const avatarMutation = useMutation({
    mutationFn: (file: File) => {
      if (!userId) throw new Error("Sessão não encontrada. Faça login novamente.");
      return userService.uploadAvatar(userId, file);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      toast.success("Avatar atualizado com sucesso.");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
    onSettled: () => setUploading(false)
  });

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error("Formato inválido. Use JPG, PNG ou WEBP.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 5MB.");
      return;
    }

    setUploading(true);
    avatarMutation.mutate(file);
  };

  const onSave = (values: ProfileFormValues) => {
    updateMutation.mutate(values);
  };

  const handleLogout = async () => {
    try {
      toast.info("Encerrando sessão...");
      await userService.logout();
      queryClient.clear();
      navigate("/login");
      toast.success("Sessão encerrada com sucesso.");
    } catch (error) {
      toast.error("Erro ao sair.");
    }
  };

  // Estado de Carregamento
  if (isLoading) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-bold text-muted-foreground animate-pulse">Carregando sua identidade...</p>
      </div>
    );
  }

  // Estado de Sessão Inválida
  if (!isAuthenticated || !userId) {
    return (
      <Card className="max-w-md mx-auto mt-20 rounded-[2.5rem] border-none shadow-2xl bg-white dark:bg-slate-900 overflow-hidden">
        <div className="h-2 bg-red-500 w-full" />
        <CardContent className="p-12 text-center space-y-6">
          <div className="mx-auto w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black">Sessão Inválida</h2>
            <p className="text-muted-foreground text-sm">Não conseguimos identificar sua sessão. Por favor, realize o login novamente para acessar seu perfil.</p>
          </div>
          <Button onClick={() => navigate("/login")} className="w-full h-12 rounded-full font-bold shadow-lg shadow-primary/20">
            Ir para Login
          </Button>
        </CardContent>
      </Card>
    );
  }

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
        <Button 
          onClick={handleSubmit(onSave)} 
          disabled={updateMutation.isPending || !isDirty || isLoading}
          className="rounded-full px-8 h-12 shadow-lg shadow-primary/20 font-bold hover:scale-105 active:scale-95 transition-all"
        >
          {updateMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar Alterações
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-6">
          <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white dark:bg-slate-900">
            <CardContent className="p-8 flex flex-col items-center text-center">
              <div className="relative group mb-6">
                <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-primary/20 group-hover:border-primary transition-all duration-300 bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-inner">
                  {uploading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  ) : profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary to-primary/80 text-white text-3xl font-black">
                      {initials}
                    </div>
                  )}
                </div>
                <button 
                  onClick={handleAvatarClick}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 p-2.5 bg-primary text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all disabled:opacity-50"
                  aria-label="Alterar foto de perfil"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                />
              </div>
              <h2 className="text-xl font-bold mb-1">{profile?.full_name || "Usuário"}</h2>
              <Badge variant="outline" className="rounded-full mb-6 px-4 py-1 bg-primary/5 text-primary border-primary/20 font-bold">
                <Shield className="h-3 w-3 mr-1" /> {profile?.role || "Administrador"}
              </Badge>
              
              <div className="w-full space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between text-sm items-center">
                  <span className="text-muted-foreground font-medium italic">Último Acesso</span>
                  <span className="font-bold text-primary">
                    {profile?.last_login ? format(new Date(profile.last_login), "dd/MM/yyyy HH:mm", { locale: ptBR }) : 'Sessão Atual'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button 
            variant="destructive" 
            className="w-full rounded-2xl h-14 font-bold shadow-lg shadow-red-500/10 hover:bg-red-600 transition-colors"
            onClick={() => setIsLogoutModalOpen(true)}
          >
            <LogOut className="h-5 w-5 mr-2" /> Sair da Conta
          </Button>
        </div>

        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handleSubmit(onSave)} className="space-y-6">
            <Card className="rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-slate-900">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-xl font-black">Informações Pessoais</CardTitle>
                <CardDescription className="font-medium italic">Estes dados serão visíveis em seus relatórios e planos de migração.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="full_name" className="text-sm font-black ml-1 opacity-70">Nome Completo</Label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input 
                        id="full_name" 
                        {...register("full_name")}
                        className={`rounded-2xl h-12 pl-12 bg-slate-50 dark:bg-slate-950/50 border-none focus-visible:ring-primary shadow-inner font-medium ${errors.full_name ? 'ring-2 ring-red-500' : ''}`} 
                      />
                    </div>
                    {errors.full_name && <p className="text-xs text-red-500 ml-1 font-bold">{errors.full_name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-black ml-1 opacity-70">Email Corporativo</Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input 
                        id="email" 
                        {...register("email")}
                        className={`rounded-2xl h-12 pl-12 bg-slate-50 dark:bg-slate-950/50 border-none focus-visible:ring-primary shadow-inner font-medium ${errors.email ? 'ring-2 ring-red-500' : ''}`} 
                      />
                    </div>
                    {errors.email && <p className="text-xs text-red-500 ml-1 font-bold">{errors.email.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-sm font-black ml-1 opacity-70">Cargo / Função</Label>
                    <div className="relative">
                      <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input 
                        id="role" 
                        {...register("role")}
                        className={`rounded-2xl h-12 pl-12 bg-slate-50 dark:bg-slate-950/50 border-none focus-visible:ring-primary shadow-inner font-medium ${errors.role ? 'ring-2 ring-red-500' : ''}`} 
                      />
                    </div>
                    {errors.role && <p className="text-xs text-red-500 ml-1 font-bold">{errors.role.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department" className="text-sm font-black ml-1 opacity-70">Departamento</Label>
                    <div className="relative">
                      <Building className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input 
                        id="department" 
                        {...register("department")}
                        className={`rounded-2xl h-12 pl-12 bg-slate-50 dark:bg-slate-950/50 border-none focus-visible:ring-primary shadow-inner font-medium ${errors.department ? 'ring-2 ring-red-500' : ''}`} 
                      />
                    </div>
                    {errors.department && <p className="text-xs text-red-500 ml-1 font-bold">{errors.department.message}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>

          <Card className="rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-slate-900">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-xl font-black flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" /> Preferências de Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-6">
              <div className="flex items-center justify-between p-6 bg-slate-50/50 dark:bg-slate-950/30 rounded-3xl">
                <div>
                  <h4 className="font-black text-sm uppercase tracking-tight">Tema da Interface</h4>
                  <p className="text-xs text-muted-foreground italic mt-0.5">Alternar entre modo claro e escuro automaticamente ou pelo sistema.</p>
                </div>
                <div className="flex gap-1 bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-inner border border-slate-100 dark:border-slate-800">
                  <Button 
                    variant={theme === "light" ? "secondary" : "ghost"} 
                    size="sm" 
                    className={`rounded-xl h-9 px-4 font-bold transition-all ${theme === "light" ? "shadow-md bg-white dark:bg-slate-800" : ""}`}
                    onClick={() => setTheme("light")}
                  >
                    Claro
                  </Button>
                  <Button 
                    variant={theme === "dark" ? "secondary" : "ghost"} 
                    size="sm" 
                    className={`rounded-xl h-9 px-4 font-bold transition-all ${theme === "dark" ? "shadow-md bg-white dark:bg-slate-800" : ""}`}
                    onClick={() => setTheme("dark")}
                  >
                    Escuro
                  </Button>
                  <Button 
                    variant={theme === "system" ? "secondary" : "ghost"} 
                    size="sm" 
                    className={`rounded-xl h-9 px-4 font-bold transition-all ${theme === "system" ? "shadow-md bg-white dark:bg-slate-800" : ""}`}
                    onClick={() => setTheme("system")}
                  >
                    Auto
                  </Button>
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
        title="Deseja realmente sair?"
        description="Sua sessão será encerrada com segurança e todos os dados não salvos poderão ser perdidos."
        confirmLabel="Sim, Sair Agora"
        cancelLabel="Não, Continuar"
        variant="destructive"
      />
    </div>
  );
}
