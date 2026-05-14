import { useState } from "react";
import { Bell, Trash2, CheckCheck, Filter, Search, ShieldAlert, Zap, Info, CheckCircle2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationService } from "@/services/notificationService";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "@/components/ui/EmptyState";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationService.getAll(),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
  });

  const getIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <ShieldAlert className="h-5 w-5 text-red-500" />;
      case 'warning': return <Zap className="h-5 w-5 text-amber-500" />;
      case 'success': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      default: return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const filteredNotifications = notifications.filter(n => 
    n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    n.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <Bell className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">Centro de Notificações</h1>
            <p className="text-muted-foreground text-sm font-medium">Histórico completo de alertas e eventos do sistema.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="rounded-full px-6 font-bold"
            onClick={() => markAllReadMutation.mutate()}
            disabled={notifications.filter(n => !n.is_read).length === 0}
          >
            <CheckCheck className="h-4 w-4 mr-2" /> Marcar todas como lidas
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Buscar notificações..." 
            className="rounded-2xl h-12 pl-12 bg-white dark:bg-slate-900 border-none shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" className="rounded-2xl h-12 px-6">
          <Filter className="h-4 w-4 mr-2" /> Filtros
        </Button>
      </div>

      {filteredNotifications.length === 0 ? (
        <EmptyState 
          icon={Bell}
          title="Nenhuma notificação"
          description="Você está em dia com todos os seus alertas e eventos."
        />
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((n) => (
            <Card 
              key={n.id} 
              className={`rounded-[2rem] border-none shadow-sm hover:shadow-md transition-all group overflow-hidden ${!n.is_read ? 'bg-primary/5 dark:bg-primary/5' : 'bg-white dark:bg-slate-900'}`}
            >
              <CardContent className="p-6 flex items-center gap-6">
                <div className={`p-4 rounded-[1.5rem] ${!n.is_read ? 'bg-white dark:bg-slate-900 shadow-sm' : 'bg-slate-100 dark:bg-slate-800'}`}>
                  {getIcon(n.priority)}
                </div>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-lg font-black tracking-tight ${!n.is_read ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500'}`}>
                      {n.title}
                    </h3>
                    {!n.is_read && <Badge className="rounded-full bg-primary text-[10px] h-4 px-1.5 uppercase font-black">Novo</Badge>}
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">{n.description}</p>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    {format(new Date(n.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {n.context_url && (
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="rounded-full px-4 font-bold"
                      onClick={() => navigate(n.context_url!)}
                    >
                      Acessar Contexto
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-full">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                      {!n.is_read && (
                        <DropdownMenuItem onClick={() => markReadMutation.mutate(n.id)}>
                          <CheckCheck className="h-4 w-4 mr-2" /> Marcar como lida
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        className="text-red-600 focus:text-red-600"
                        onClick={() => deleteMutation.mutate(n.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
