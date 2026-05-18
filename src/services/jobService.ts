import { supabase } from '@/lib/supabase';
import type { BackgroundJob, JobType, JobStatus } from '@/types';
import { auditService } from './auditService';

export const jobService = {
  async createJob(organizationId: string, type: JobType, payload: any = {}): Promise<BackgroundJob> {
    if (!organizationId) throw new Error('organization_id is required');

    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('background_jobs')
      .insert([{
        organization_id: organizationId,
        type,
        payload,
        created_by: user?.id,
        status: 'queued',
        attempts: 0,
        max_attempts: 3
      }])
      .select()
      .single();

    if (error) throw error;

    await auditService.log({
      action: 'job_created',
      entity_type: 'background_job',
      entity_id: data.id,
      description: `Job ${type} created`,
      metadata: { type, payload }
    });

    return data as BackgroundJob;
  },

  async getJobs(organizationId: string, limit = 50, status?: JobStatus): Promise<BackgroundJob[]> {
    if (!organizationId) throw new Error('organization_id is required');

    let query = supabase
      .from('background_jobs')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as BackgroundJob[];
  },

  async getJob(id: string, organizationId: string): Promise<BackgroundJob> {
    if (!organizationId) throw new Error('organization_id is required');

    const { data, error } = await supabase
      .from('background_jobs')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error) throw error;
    return data as BackgroundJob;
  },

  async markRunning(id: string, organizationId: string): Promise<BackgroundJob> {
    if (!organizationId) throw new Error('organization_id is required');

    const { data, error } = await supabase
      .from('background_jobs')
      .update({
        status: 'running',
        started_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw error;

    await auditService.log({
      action: 'job_status_changed',
      entity_type: 'background_job',
      entity_id: id,
      description: `Job ${id} marked as running`,
      metadata: { status: 'running' }
    });

    return data as BackgroundJob;
  },

  async markCompleted(id: string, organizationId: string, result?: any): Promise<BackgroundJob> {
    if (!organizationId) throw new Error('organization_id is required');

    const { data, error } = await supabase
      .from('background_jobs')
      .update({
        status: 'completed',
        result,
        finished_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw error;

    await auditService.log({
      action: 'job_status_changed',
      entity_type: 'background_job',
      entity_id: id,
      description: `Job ${id} marked as completed`,
      metadata: { status: 'completed', result }
    });

    return data as BackgroundJob;
  },

  async markFailed(id: string, organizationId: string, errorDetail?: any): Promise<BackgroundJob> {
    if (!organizationId) throw new Error('organization_id is required');

    // First fetch attempts to decide if retrying or failing
    const { data: job, error: fetchError } = await supabase
      .from('background_jobs')
      .select('attempts, max_attempts')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (fetchError) throw fetchError;

    const newAttempts = job.attempts + 1;
    const isRetrying = newAttempts < job.max_attempts;
    const newStatus = isRetrying ? 'retrying' : 'failed';

    const { data, error } = await supabase
      .from('background_jobs')
      .update({
        status: newStatus,
        error: errorDetail,
        attempts: newAttempts,
        ...(newStatus === 'failed' ? { finished_at: new Date().toISOString() } : {})
      })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw error;

    await auditService.log({
      action: 'job_status_changed',
      entity_type: 'background_job',
      entity_id: id,
      description: `Job ${id} marked as ${newStatus}`,
      metadata: { status: newStatus, error: errorDetail, attempts: newAttempts }
    });

    return data as BackgroundJob;
  },

  async retryJob(id: string, organizationId: string): Promise<BackgroundJob> {
    if (!organizationId) throw new Error('organization_id is required');

    const { data, error } = await supabase
      .from('background_jobs')
      .update({
        status: 'queued',
        error: null,
        started_at: null,
        finished_at: null
      })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw error;

    await auditService.log({
      action: 'job_status_changed',
      entity_type: 'background_job',
      entity_id: id,
      description: `Job ${id} queued for retry`,
      metadata: { status: 'queued', is_retry: true }
    });

    return data as BackgroundJob;
  }
};
