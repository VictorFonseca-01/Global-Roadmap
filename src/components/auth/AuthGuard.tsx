import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { Loader2 } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-slate-950 text-white">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-bold animate-pulse uppercase tracking-widest opacity-50">Autenticando sessão...</p>
      </div>
    );
  }

  if (!session) {
    // Redireciona para o login, mas salva a localização atual para voltar depois
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
