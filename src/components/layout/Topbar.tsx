import { Button } from "@/components/ui/button"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/components/theme-provider"
import { Sun, Moon, LogOut, User, Settings as SettingsIcon, Briefcase, Building } from "lucide-react"
import { NotificationBell } from "./NotificationBell"
import { useNavigate } from "react-router-dom"
import { ConfirmationModal } from "../ui/ConfirmationModal"
import { useState } from "react"
import { toast } from "sonner"
import { userService } from "@/services/userService"
import { useUserProfile } from "@/hooks/useUserProfile"

import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from "@/components/ui/breadcrumb"
import { useLocation } from "react-router-dom"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip"

export function Topbar() {
  const { setTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const { profile, initials, displayName, displayEmail, avatarUrl } = useUserProfile()
  
  const pathnames = location.pathname.split("/").filter((x) => x)

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card/50 backdrop-blur-md px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            {pathnames.map((value, index) => {
              const href = `/${pathnames.slice(0, index + 1).join("/")}`
              const isLast = index === pathnames.length - 1
              const name = value.charAt(0).toUpperCase() + value.slice(1).replace("-", " ")
              
              return (
                <div key={href} className="flex items-center gap-2">
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage>{name}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={href}>{name}</BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </div>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Alternar tema</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            <DropdownMenuItem onClick={() => setTheme("light")} className="rounded-lg">Claro</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")} className="rounded-lg">Escuro</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")} className="rounded-lg">Sistema</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <TooltipProvider>
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Avatar className="h-10 w-10 border-2 border-transparent group-hover:border-primary/50 transition-all shadow-sm group-hover:shadow-primary/20 group-hover:scale-105">
                      <AvatarImage src={avatarUrl} className="object-cover" />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white font-black text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="end" className="rounded-xl p-3 shadow-xl border-none bg-slate-900 text-white">
                <div className="space-y-1">
                  <p className="font-black text-sm">{displayName}</p>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <Briefcase className="h-3 w-3" /> {profile?.role || "Cargo não definido"}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <Building className="h-3 w-3" /> {profile?.department || "Departamento não definido"}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>

            <DropdownMenuContent className="w-64 mt-2 p-2 rounded-[1.5rem] border-none shadow-2xl bg-white dark:bg-slate-900" align="end" forceMount>
              <DropdownMenuLabel className="font-normal p-4">
                <div className="flex flex-col space-y-1">
                  <p className="text-base font-black leading-none tracking-tight">{displayName}</p>
                  <p className="text-xs leading-none text-muted-foreground italic">{displayEmail}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="mx-2 bg-slate-100 dark:bg-slate-800" />
              <div className="p-1 space-y-1">
                <DropdownMenuItem onClick={() => navigate("/profile")} className="rounded-xl h-11 cursor-pointer">
                  <User className="h-4 w-4 mr-3 text-slate-500" /> Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings")} className="rounded-xl h-11 cursor-pointer">
                  <SettingsIcon className="h-4 w-4 mr-3 text-slate-500" /> Configurações
                </DropdownMenuItem>
              </div>
              <DropdownMenuSeparator className="mx-2 bg-slate-100 dark:bg-slate-800" />
              <div className="p-1">
                <DropdownMenuItem 
                  className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/10 rounded-xl h-11 cursor-pointer font-bold"
                  onClick={() => setIsLogoutModalOpen(true)}
                >
                  <LogOut className="h-4 w-4 mr-3" /> Sair da Plataforma
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </TooltipProvider>
      </div>

      <ConfirmationModal 
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={async () => {
          toast.info("Encerrando sessão...");
          await userService.logout();
          window.location.href = "/login";
        }}
        title="Deseja mesmo sair?"
        description="Sua sessão será encerrada com segurança e todos os dados não salvos poderão ser perdidos."
        confirmLabel="Sim, Sair Agora"
        cancelLabel="Cancelar"
        variant="destructive"
      />
    </header>
  )
}
