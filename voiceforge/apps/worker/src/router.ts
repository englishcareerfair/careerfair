/**
 * VoiceForge Cloudflare Worker API Router
 */
import { resolveInferenceRoute, RoutingMode } from './routingEngine';
import { LocalInferenceAdapter } from './adapters/localAdapter';
import { GenericHttpCloudAdapter } from './adapters/genericHttpAdapter';

export interface Env {
  DB?: any;
  AUDIO_BUCKET?: any;
  ENVIRONMENT?: string;
  DEFAULT_ROUTING_MODE?: string;
  LOCAL_INFERENCE_URL?: string;
  CLOUD_INFERENCE_URL?: string;
  CLOUD_API_KEY?: string;
}

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '');
  const method = request.method;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-token',
    'Content-Type': 'application/json'
  };

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const jsonResponse = (data: any, status = 200) => {
    return new Response(JSON.stringify(data), {
      status,
      headers: corsHeaders
    });
  };

  const localAdapter = new LocalInferenceAdapter({
    baseUrl: env.LOCAL_INFERENCE_URL || 'http://127.0.0.1:8765'
  });

  const cloudAdapter = new GenericHttpCloudAdapter({
    endpointUrl: env.CLOUD_INFERENCE_URL || '',
    apiKey: env.CLOUD_API_KEY || '',
    providerName: 'Cloud Provider'
  });

  try {
    // 1. Health check
    if (path === '/api/health' && method === 'GET') {
      const localHealthy = await localAdapter.healthCheck();
      const currentMode = (env.DEFAULT_ROUTING_MODE || 'OFFLINE_ONLY') as RoutingMode;
      return jsonResponse({
        status: 'ok',
        service: 'VoiceForge Cloudflare Gateway',
        routing_mode: currentMode,
        local_engine_healthy: localHealthy,
        cloud_configured: Boolean(env.CLOUD_INFERENCE_URL),
        timestamp: Date.now()
      });
    }

    // 2. Routing Mode Configuration
    if (path === '/api/routing/mode') {
      if (method === 'GET') {
        let mode = env.DEFAULT_ROUTING_MODE || 'OFFLINE_ONLY';
        if (env.DB) {
          try {
            const row = await env.DB.prepare('SELECT value FROM admin_config WHERE key = ?').bind('routing_mode').first();
            if (row && row.value) mode = row.value;
          } catch {}
        }
        return jsonResponse({ routing_mode: mode });
      }

      if (method === 'PUT' || method === 'POST') {
        const body: any = await request.json();
        const newMode = body.routing_mode as RoutingMode;
        if (!['OFFLINE_ONLY', 'LOCAL_FIRST', 'CLOUD_FIRST', 'CLOUD_ONLY', 'MANUAL'].includes(newMode)) {
          return jsonResponse({ error: 'Invalid routing mode' }, 400);
        }
        if (env.DB) {
          try {
            await env.DB.prepare(
              'INSERT INTO admin_config (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at'
            ).bind('routing_mode', newMode, Date.now()).run();

            // Log audit
            await env.DB.prepare(
              'INSERT INTO audit_logs (id, timestamp, action, user_id, details) VALUES (?, ?, ?, ?, ?)'
            ).bind(crypto.randomUUID(), Date.now(), 'UPDATE_ROUTING_MODE', 'admin', `Changed mode to ${newMode}`).run();
          } catch {}
        }
        return jsonResponse({ ok: true, routing_mode: newMode });
      }
    }

    // 3. Models list
    if (path === '/api/models' && method === 'GET') {
      try {
        const models = await localAdapter.listModels();
        return jsonResponse({ models });
      } catch {
        return jsonResponse({
          models: [
            {
              id: 'neural-starter',
              name: 'VoiceForge Neural Starter Engine',
              installed: true,
              active: true,
              license: 'MIT',
              capabilities: { streaming: true, speed_control: true, chunking_max_chars: 600 }
            }
          ]
        });
      }
    }

    // 4. Voice profiles list & creation
    if (path === '/api/voices') {
      if (method === 'GET') {
        let profiles = [];
        if (env.DB) {
          try {
            const rows = await env.DB.prepare('SELECT * FROM voice_profiles ORDER BY updated_at DESC').all();
            profiles = rows.results || [];
          } catch {}
        }
        return jsonResponse({ voices: profiles });
      }

      if (method === 'POST') {
        const body: any = await request.json();
        if (!body.consent_confirmed) {
          return jsonResponse({ error: 'Explicit voice ownership and consent required.' }, 400);
        }
        const profileId = body.id || `voice-${crypto.randomUUID().slice(0, 8)}`;
        if (env.DB) {
          try {
            await env.DB.prepare(
              `INSERT INTO voice_profiles (id, user_id, name, description, language, model_id, is_cloned, conditioning_json, consent_confirmed, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(
              profileId,
              body.user_id || 'local_user',
              body.name || 'Custom Voice',
              body.description || '',
              body.language || 'en',
              body.model_id || 'neural-starter',
              body.is_cloned ? 1 : 0,
              JSON.stringify(body.conditioning_data || {}),
              1,
              Date.now(),
              Date.now()
            ).run();
          } catch {}
        }
        return jsonResponse({ ok: true, voice: { id: profileId, name: body.name } });
      }
    }

    // 5. Speech Generation Router
    if (path === '/api/tts/generate' && method === 'POST') {
      const body: any = await request.json();
      let mode = (env.DEFAULT_ROUTING_MODE || 'OFFLINE_ONLY') as RoutingMode;
      if (env.DB) {
        try {
          const row = await env.DB.prepare('SELECT value FROM admin_config WHERE key = ?').bind('routing_mode').first();
          if (row && row.value) mode = row.value as RoutingMode;
        } catch {}
      }

      const localHealthy = await localAdapter.healthCheck();
      const cloudConfigured = Boolean(env.CLOUD_INFERENCE_URL);

      const decision = resolveInferenceRoute(mode, body.preferred_route, cloudConfigured, localHealthy);

      if (!decision.allowed) {
        return jsonResponse({
          error: decision.reason || 'Generation route disallowed by administrative policy.',
          routing_mode: mode
        }, 403);
      }

      let jobResult: any = null;
      if (decision.target === 'local') {
        jobResult = await localAdapter.generateSpeech(body);
      } else {
        jobResult = await cloudAdapter.generateSpeech(body);
      }

      // Record job in D1
      if (env.DB && jobResult) {
        try {
          await env.DB.prepare(
            `INSERT INTO generation_jobs (id, user_id, prompt_text, voice_id, model_id, route_taken, provider_name, status, audio_url, audio_format, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            jobResult.id || crypto.randomUUID(),
            body.user_id || 'anon',
            body.text.slice(0, 1000),
            body.voice_id || 'default',
            body.model_id || 'neural-starter',
            decision.target,
            decision.provider_name,
            jobResult.status || 'processing',
            jobResult.audio_url || '',
            jobResult.audio_format || 'wav',
            Date.now()
          ).run();
        } catch {}
      }

      return jsonResponse({
        ...jobResult,
        route_resolution: decision
      });
    }

    // 6. Job status polling
    if (path.startsWith('/api/tts/jobs/') && method === 'GET') {
      const jobId = path.split('/api/tts/jobs/')[1];
      try {
        const status = await localAdapter.getJobStatus(jobId);
        return jsonResponse(status);
      } catch (err: any) {
        return jsonResponse({ error: err.message }, 404);
      }
    }

    // 7. Global Dated Data Export (JSON or CSV format for permanent Cloudflare storage)
    if (path === '/api/export/data' && method === 'GET') {
      const format = url.searchParams.get('format') || 'json';
      let exportData: any = {
        export_timestamp: Date.now(),
        export_date_iso: new Date().toISOString(),
        feedback: [],
        scores: [],
        generation_jobs: [],
        audit_logs: []
      };

      if (env.DB) {
        try {
          const fb = await env.DB.prepare('SELECT * FROM feedback ORDER BY ts DESC').all();
          exportData.feedback = fb.results || [];
          const sc = await env.DB.prepare('SELECT * FROM scores ORDER BY ts DESC').all();
          exportData.scores = sc.results || [];
          const jb = await env.DB.prepare('SELECT * FROM generation_jobs ORDER BY created_at DESC LIMIT 500').all();
          exportData.generation_jobs = jb.results || [];
          const al = await env.DB.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 500').all();
          exportData.audit_logs = al.results || [];
        } catch (e: any) {
          exportData.error = e.message;
        }
      }

      if (format === 'csv') {
        // Return CSV of feedback & scores
        let csv = 'Type,ID,Name,Detail,Metric,Timestamp,ISO_Date\n';
        for (const f of exportData.feedback) {
          csv += `Feedback,"${f.id}","${(f.name || '').replace(/"/g, '""')}","${(f.comment || '').replace(/"/g, '""')}",${f.r_useful || 5},${f.ts},"${new Date(Number(f.ts)).toISOString()}"\n`;
        }
        for (const s of exportData.scores) {
          csv += `Score,"${s.id}","${(s.name || '').replace(/"/g, '""')}","${s.pack} (Level ${s.level})",${s.acc},${s.ts},"${new Date(Number(s.ts)).toISOString()}"\n`;
        }
        return new Response(csv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="voiceforge_data_${Date.now()}.csv"`,
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      return jsonResponse(exportData);
    }

    return jsonResponse({ error: `Not found: ${method} ${path}` }, 404);
  } catch (err: any) {
    return jsonResponse({ error: err.message || 'Internal Server Error' }, 500);
  }
}
