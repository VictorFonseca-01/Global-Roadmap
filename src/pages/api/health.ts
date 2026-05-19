import { createClient } from '@supabase/supabase-js';

// Vercel Serverless Function Handler
export default async function handler(req: any, res: any) {
  // Configurar headers CORS para acesso seguro de homologação
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const startTime = Date.now();
  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(), // Retorna o uptime do processo serverless em segundos
    totalDurationMs: 0,
    services: {
      database: { status: 'unknown', latencyMs: 0 },
      gemini_edge: { status: 'unknown', latencyMs: 0 }
    }
  };

  try {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials missing in environment variables.");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // 1. Validar conexão com banco de dados
    const dbStartTime = Date.now();
    const { error: dbError } = await supabase.from('roadmap_projects').select('count', { count: 'exact', head: true });
    healthStatus.services.database.latencyMs = Date.now() - dbStartTime;

    if (dbError) {
      healthStatus.status = 'degraded';
      healthStatus.services.database.status = 'error';
      (healthStatus.services.database as any).error = dbError.message;
    } else {
      healthStatus.services.database.status = 'healthy';
    }

    // 2. Validar conexão com as Edge Functions
    const edgeStartTime = Date.now();
    const { error: edgeError } = await supabase.functions.invoke('ai-roadmap-parser', {
      body: { action: 'ping' }
    });
    healthStatus.services.gemini_edge.latencyMs = Date.now() - edgeStartTime;

    // Se der erro de método ou não autorizado, pelo menos a rota respondeu (está de pé)
    if (edgeError && edgeError.message.includes('Failed to fetch')) {
      healthStatus.status = 'degraded';
      healthStatus.services.gemini_edge.status = 'unreachable';
      (healthStatus.services.gemini_edge as any).error = edgeError.message;
    } else {
      healthStatus.services.gemini_edge.status = 'healthy';
    }

  } catch (err: any) {
    healthStatus.status = 'unhealthy';
    (healthStatus as any).error = err.message || 'Unknown integration error';
  }

  healthStatus.totalDurationMs = Date.now() - startTime;
  const statusCode = healthStatus.status === 'healthy' ? 200 : 500;
  return res.status(statusCode).json(healthStatus);
}
