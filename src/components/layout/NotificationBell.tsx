import { Bell, ShieldAlert, Zap, Info, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationService } from "@/services/notificationService";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

export function NotificationBell() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationService.getAll(),
    refetchInterval: 30000 // Atualiza a cada 30s
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
  });

  const getIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <ShieldAlert className="h-4 w-4 text-red-500" />;
      case 'warning': return <Zap className="h-4 w-4 text-amber-500" />;
      case 'success': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
          <Bell className="h-5 w-5" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1"
              >
                <Badge className="h-5 min-w-[20px] px-1 flex items-center justify-center bg-red-500 text-white border-2 border-white dark:border-slate-950 rounded-full text-[10px] font-black">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 rounded-2xl border-none shadow-2xl overflow-hidden bg-white dark:bg-slate-900">
        <div className="p-4 bg-slate-50 dark:bg-slate-950 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-black text-sm uppercase tracking-wider">Notificações</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-[10px] font-bold uppercase rounded-full hover:bg-white dark:hover:bg-slate-900"
              onClick={() => markAllReadMutation.mutate()}
            >
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 text-slate-200 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Nenhuma notificação por enquanto.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <DropdownMenuItem 
                key={n.id} 
                className={`p-4 cursor-pointer focus:bg-slate-50 dark:focus:bg-slate-800/50 transition-colors border-b border-slate-50 dark:border-slate-800/50 last:border-0 ${!n.is_read ? 'bg-primary/5 dark:bg-primary/5' : ''}`}
                onClick={() => {
                  if (!n.is_read) markReadMutation.mutate(n.id);
                  if (n.context_url) navigate(n.context_url);
                }}
              >
                <div className="flex gap-3 items-start w-full">
                  <div className={`p-2 rounded-xl mt-0.5 ${!n.is_read ? 'bg-white dark:bg-slate-900 shadow-sm' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    {getIcon(n.priority)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className={`text-xs font-black ${!n.is_read ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500'}`}>{n.title}</p>
                      {!n.is_read && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    </div>
                    <p className="text-[11px] leading-tight text-slate-500 line-clamp-2">{n.description}</p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <Button 
          variant="ghost" 
          className="w-full rounded-none h-10 text-xs font-bold text-primary hover:bg-primary/5"
          onClick={() => navigate("/notifications")}
        >
          Ver histórico completo
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
