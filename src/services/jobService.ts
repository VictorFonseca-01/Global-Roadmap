import { supabase } from '@/lib/supabase';
import type { BackgroundJob, JobType, JobStatus } from '@/types';
import { auditService } from './auditService';

export const jobService = {
  async createJob(type: JobType, payload: any = {}): Promise<BackgroundJob> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('background_jobs')
      .insert([{
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

  async getJobs(limit = 50, status?: JobStatus): Promise<BackgroundJob[]> {
    let query = supabase
      .from('background_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as BackgroundJob[];
  },

  async getJob(id: string): Promise<BackgroundJob> {
    const { data, error } = await supabase
      .from('background_jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as BackgroundJob;
  },

  async deleteJob(id: string): Promise<void> {
    const { error } = await supabase
      .from('background_jobs')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async updateJobStatus(
    id: string,
    status: JobStatus,
    result?: any,
    errorMsg?: any
  ): Promise<BackgroundJob> {
    const updates: any = { status };
    if (result) updates.result = result;
    if (errorMsg) updates.error = errorMsg;
    if (status === 'running') updates.started_at = new Date().toISOString();
    if (status === 'completed' || status === 'failed') updates.finished_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('background_jobs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await auditService.log({
      action: 'job_status_changed',
      entity_type: 'background_job',
      entity_id: id,
      description: `Job ${id} status changed to ${status}`,
      metadata: { status, result, error: errorMsg }
    });

    return data as BackgroundJob;
  },

  async retryJob(id: string): Promise<BackgroundJob> {
    const { data: job, error: fetchError } = await supabase
      .from('background_jobs')
      .select('attempts')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const { data, error } = await supabase
      .from('background_jobs')
      .update({
        status: 'queued',
        attempts: job.attempts + 1,
        error: null,
        started_at: null,
        finished_at: null
      })
      .eq('id', id)
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
