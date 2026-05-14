import { UserProfile } from "@/types";

/**
 * Gera as iniciais do usuário com base no nome completo.
 * Ex: "Victor Fonseca" -> "VF"
 * Ex: "João Pedro Silva" -> "JS"
 * Ex: "Admin" -> "A"
 */
export function getUserInitials(name: string | undefined | null): string {
  if (!name) return "GP";
  
  const parts = name.trim().split(/\s+/);
  
  if (parts.length === 0) return "GP";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  
  const firstInitial = parts[0].charAt(0);
  const lastInitial = parts[parts.length - 1].charAt(0);
  
  return (firstInitial + lastInitial).toUpperCase();
}

/**
 * Formata o cargo e departamento para exibição.
 */
export function formatUserBadge(profile: UserProfile | undefined | null): string {
  if (!profile) return "Usuário";
  if (!profile.role && !profile.department) return "Membro da Equipe";
  if (profile.role && profile.department) return `${profile.role} • ${profile.department}`;
  return profile.role || profile.department;
}
