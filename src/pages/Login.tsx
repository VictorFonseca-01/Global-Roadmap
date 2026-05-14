import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  Loader2, 
  Eye, 
  EyeOff, 
  ArrowRight
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();

  // Redirecionar se já estiver logado
  useEffect(() => {
    if (session) {
      const from = (location.state as any)?.from?.pathname || "/";
      navigate(from, { replace: true });
    }
  }, [session, navigate, location]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Por favor, preencha todos os campos.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success("Login realizado com sucesso!");
      // O useEffect acima cuidará do redirecionamento
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "Erro ao realizar login. Verifique suas credenciais.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" />

      <div className="w-full max-w-md p-6 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="flex flex-col items-center mb-10 space-y-4">
          <div className="p-4 bg-primary/10 rounded-[2.5rem] border border-primary/20 backdrop-blur-xl shadow-2xl shadow-primary/20 overflow-hidden w-28 h-28 flex items-center justify-center">
            <img src="/logo-branca.png" alt="Global Parts Logo" className="w-24 h-24 object-contain drop-shadow-2xl" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-black tracking-tighter text-white">GLOBAL PARTS</h1>
            <p className="text-slate-400 font-bold text-sm tracking-[0.2em] uppercase">Roadmap Platform</p>
          </div>
        </div>

        <Card className="border-none bg-slate-900/50 backdrop-blur-2xl shadow-2xl rounded-[2.5rem] overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-primary via-blue-500 to-primary animate-gradient" />
          <CardHeader className="p-10 pb-2">
            <CardTitle className="text-2xl font-black text-white">Bem-vindo de volta</CardTitle>
            <CardDescription className="text-slate-400 font-medium">Acesse a governança de ativos e roadmaps da organização.</CardDescription>
          </CardHeader>
          <CardContent className="p-10 pt-6">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">E-mail Corporativo</Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="nome@globalp.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-14 pl-12 rounded-2xl bg-slate-950/50 border-none text-white focus-visible:ring-primary shadow-inner"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <Label htmlFor="password" className="text-xs font-black uppercase tracking-widest text-slate-500">Senha de Acesso</Label>
                  <button type="button" className="text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-80 transition-opacity">
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-14 pl-12 pr-12 rounded-2xl bg-slate-950/50 border-none text-white focus-visible:ring-primary shadow-inner"
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2 ml-1">
                <input type="checkbox" id="remember" className="rounded border-slate-800 bg-slate-950 text-primary focus:ring-primary" />
                <label htmlFor="remember" className="text-xs font-bold text-slate-400 cursor-pointer">Lembrar neste dispositivo</label>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-14 rounded-2xl font-black text-base shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all bg-primary hover:bg-primary/90"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Acessar Plataforma <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-8 pt-8 border-t border-slate-800/50 text-center">
              <p className="text-xs text-slate-500 font-bold flex items-center justify-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" /> Conexão protegida por criptografia enterprise
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-slate-600 text-[10px] font-black uppercase tracking-[0.3em]">
          © 2026 Global Parts Technology Group
        </p>
      </div>
    </div>
  );
}
