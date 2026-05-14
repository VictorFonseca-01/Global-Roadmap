import { useQuery } from "@tanstack/react-query";
import { userService } from "@/services/userService";
import { getUserInitials } from "@/lib/user-utils";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";

export function useUserProfile() {
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // 1. Monitorar Sessão do Supabase
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAuthUserId(user?.id || null);
      setIsAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Buscar Perfil
  const { data: profile, isLoading: isProfileLoading, error } = useQuery({
    queryKey: ["user-profile", authUserId],
    queryFn: () => userService.getProfile(),
    enabled: !!authUserId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  const isLoading = isAuthLoading || isProfileLoading;

  return {
    profile,
    isLoading,
    isAuthenticated: !!authUserId,
    userId: authUserId,
    error,
    initials: getUserInitials(profile?.full_name),
    displayName: profile?.full_name || "Usuário",
    displayEmail: profile?.email || "Sem email",
    avatarUrl: profile?.avatar_url,
    badge: profile?.role || "Membro",
  };
}
