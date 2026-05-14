import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

import { 
  LayoutDashboard, 
  Map, 
  Tag, 
  BookOpen, 
  Monitor, 
  AppWindow, 
  ArrowRightCircle, 
  FileText, 
  Settings,
  Bot,
  Bell,
  ChevronLeft,
  ChevronRight
} from "lucide-react"

import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { notificationService } from "@/services/notificationService"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useUserProfile } from "@/hooks/useUserProfile"
import { motion } from "framer-motion"

export function Sidebar({ className }: { className?: string }) {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const { initials, avatarUrl } = useUserProfile()

  const menuItems = [
    { name: "Dashboard", icon: LayoutDashboard, path: "/" },
    { name: "Roadmaps", icon: Map, path: "/roadmaps" },
    { name: "Categorias", icon: Tag, path: "/categories" },
    { name: "Lifecycle Catalog", icon: BookOpen, path: "/lifecycle" },
    { name: "Assets", icon: Monitor, path: "/assets" },
    { name: "Notificações", icon: Bell, path: "/notifications", badge: true },
    { name: "Applications", icon: AppWindow, path: "/applications" },
    { name: "Migration Plans", icon: ArrowRightCircle, path: "/migration-plans" },
    { name: "Roadmap Timeline", icon: FileText, path: "/roadmap-timeline" },
    { name: "IA Intelligence", icon: Bot, path: "/settings/ai" },
    { name: "Configurações", icon: Settings, path: "/settings" },
  ]

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationService.getAll(),
    refetchInterval: 30000
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <motion.div 
      initial={false}
      animate={{ width: collapsed ? 64 : 256 }}
      className={cn(
        "relative flex flex-col border-r bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl transition-all duration-300 ease-in-out z-30",
        className
      )}
    >
      <div className="flex h-20 items-center px-4 border-b">
        <Link to="/" className="flex items-center gap-3 overflow-hidden w-full">
          <div className="flex shrink-0 items-center justify-center p-1 bg-slate-50 dark:bg-slate-900 rounded-xl shadow-sm">
            <img 
              src="/logo-preta.png" 
              alt="Logo" 
              className={cn("block dark:hidden object-contain transition-all", collapsed ? "h-6" : "h-8")} 
            />
            <img 
              src="/logo-branca.png" 
              alt="Logo" 
              className={cn("hidden dark:block object-contain transition-all", collapsed ? "h-6" : "h-8")} 
            />
          </div>
          {!collapsed && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-black text-xl tracking-tighter whitespace-nowrap bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400 bg-clip-text text-transparent"
            >
              Global Parts
            </motion.span>
          )}
        </Link>
      </div>

      <ScrollArea className="flex-1 px-3 py-6">
        <div className="space-y-1.5">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 px-3 relative group rounded-xl transition-all h-10",
                    isActive ? "bg-primary/5 text-primary font-bold shadow-sm" : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-900",
                    collapsed && "justify-center px-0"
                  )}
                  title={collapsed ? item.name : ""}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="active-nav"
                      className="absolute left-0 w-1 h-6 bg-primary rounded-full"
                    />
                  )}
                  <item.icon className={cn("h-5 w-5 shrink-0 transition-transform group-hover:scale-110", isActive && "text-primary")} />
                  {!collapsed && <span className="text-sm tracking-tight flex-1">{item.name}</span>}
                  {item.badge && unreadCount > 0 && !collapsed && (
                    <Badge className="h-5 min-w-[20px] px-1 bg-primary text-white rounded-full text-[10px] font-black border-none">
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </Link>
            );
          })}
        </div>
      </ScrollArea>

      <div className="p-3 border-t bg-slate-50/50 dark:bg-slate-900/50 space-y-1">
        <Link to="/profile">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 px-3 rounded-xl transition-all h-10",
              location.pathname === "/profile" ? "bg-primary/5 text-primary font-bold" : "text-muted-foreground",
              collapsed && "justify-center px-0"
            )}
          >
            <Avatar className="h-5 w-5 shrink-0">
              <AvatarImage src={avatarUrl} className="object-cover" />
              <AvatarFallback className="text-[8px] bg-primary/10 text-primary font-black">{initials}</AvatarFallback>
            </Avatar>
            {!collapsed && <span className="text-sm tracking-tight">Meu Perfil</span>}
          </Button>
        </Link>
      </div>

      <div className="p-4 border-t bg-slate-50/50 dark:bg-slate-900/50">
        <Button 
          variant="ghost" 
          size="icon" 
          className="w-full rounded-xl hover:bg-white dark:hover:bg-slate-800 shadow-none border border-transparent hover:border-slate-200 dark:hover:border-slate-700 h-8" 
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
    </motion.div>
  )
}
