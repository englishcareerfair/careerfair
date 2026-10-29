/**
 * Local Inference Engine Adapter (Worker -> Local Python Engine)
 */

export interface LocalInferenceConfig {
  baseUrl: string; // e.g. http://127.0.0.1:8765 or authenticated local tunnel
  apiToken?: string;
  timeoutMs?: number;
}

export class LocalInferenceAdapter {
  constructor(private config: LocalInferenceConfig) {}

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${this.config.baseUrl}/health`, {
        headers: this.config.apiToken ? { 'x-api-token': this.config.apiToken } : {}
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<any[]> {
    const res = await fetch(`${this.config.baseUrl}/models`);
    if (!res.ok) throw new Error('Failed to fetch local models');
    const data: any = await res.json();
    return data.models || [];
  }

  async generateSpeech(payload: any): Promise<any> {
    const res = await fetch(`${this.config.baseUrl}/tts/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiToken ? { 'x-api-token': this.config.apiToken } : {})
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Local inference error: ${err}`);
    }
    return await res.json();
  }

  async cloneVoice(payload: any): Promise<any> {
    const res = await fetch(`${this.config.baseUrl}/voices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to clone voice on local engine');
    return await res.json();
  }

  async getJobStatus(jobId: string): Promise<any> {
    const res = await fetch(`${this.config.baseUrl}/jobs/${jobId}`);
    if (!res.ok) throw new Error(`Job '${jobId}' not found`);
    return await res.json();
  }

  async cancelJob(jobId: string): Promise<any> {
    const res = await fetch(`${this.config.baseUrl}/jobs/${jobId}/cancel`, { method: 'POST' });
    return await res.json();
  }
}
