import { supabase } from '@/lib/supabase';
import { auditService } from './auditService';

export const roadmapWorkflowService = {
  async transitionStatus(projectId: string, newStatus: string, justification?: string) {
    // 1. Atualizar o status
    const { data, error } = await supabase
      .from('roadmap_projects')
      .update({ status: newStatus })
      .eq('id', projectId)
      .select()
      .single();

    if (error) throw error;

    // 2. Registrar no log de auditoria
    await auditService.log({
      action: `STATUS_CHANGE_TO_${newStatus.toUpperCase()}`,
      entity_type: 'roadmap_projects',
      entity_id: projectId,
      description: `Status do roadmap alterado para ${newStatus}. ${justification ? `Justificativa: ${justification}` : ''}`.trim()
    });

    return data;
  }
};
