import type { Notification } from '@/types';

// Mock de notificações para simular o comportamento enterprise
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'lifecycle_warning',
    priority: 'warning',
    title: 'Windows 10 Pro Expira em 90 dias',
    description: 'O suporte oficial para o Windows 10 Pro (22H2) está chegando ao fim. Planeje a migração para o Windows 11.',
    is_read: false,
    context_url: '/roadmap-timeline?projectId=win11-migration',
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString() // 30 min atrás
  },
  {
    id: '2',
    type: 'critical_asset',
    priority: 'critical',
    title: 'Servidor SRV-DB-01 em Risco',
    description: 'Este ativo foi identificado com hardware obsoleta e sem contrato de suporte ativo.',
    is_read: false,
    context_url: '/assets',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() // 2 horas atrás
  },
  {
    id: '3',
    type: 'import_completed',
    priority: 'success',
    title: 'Importação Concluída',
    description: '150 novos ativos foram importados e enriquecidos com IA com sucesso.',
    is_read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() // 1 dia atrás
  }
];

export const notificationService = {
  async getAll(): Promise<Notification[]> {
    // No futuro, isso virá do Supabase
    return [...mockNotifications].sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async markAsRead(id: string): Promise<void> {
    const n = mockNotifications.find(x => x.id === id);
    if (n) n.is_read = true;
  },

  async markAllAsRead(): Promise<void> {
    mockNotifications.forEach(n => n.is_read = true);
  },

  async delete(id: string): Promise<void> {
    const idx = mockNotifications.findIndex(x => x.id === id);
    if (idx > -1) mockNotifications.splice(idx, 1);
  }
};
