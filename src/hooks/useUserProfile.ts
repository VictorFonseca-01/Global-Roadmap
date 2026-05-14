import { useQuery } from "@tanstack/react-query";
import { userService } from "@/services/userService";
import { getUserInitials } from "@/lib/user-utils";

export function useUserProfile() {
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["user-profile"],
    queryFn: () => userService.getProfile(),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  return {
    profile,
    isLoading,
    error,
    initials: getUserInitials(profile?.full_name),
    displayName: profile?.full_name || "Usuário",
    displayEmail: profile?.email || "Sem email",
    avatarUrl: profile?.avatar_url,
    badge: profile?.role || "Membro",
  };
}
