/**
 * Generic HTTP Cloud Inference Adapter
 * Connects Cloudflare Worker to remote GPU/CPU hosted voice inference endpoints.
 */

export interface CloudProviderConfig {
  endpointUrl: string;
  apiKey?: string;
  providerName: string;
}

export class GenericHttpCloudAdapter {
  constructor(private config: CloudProviderConfig) {}

  async healthCheck(): Promise<boolean> {
    if (!this.config.endpointUrl) return false;
    try {
      const res = await fetch(`${this.config.endpointUrl}/health`, {
        headers: this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {}
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async generateSpeech(payload: any): Promise<any> {
    if (!this.config.endpointUrl) {
      throw new Error('Cloud provider endpoint URL is not configured.');
    }
    const res = await fetch(`${this.config.endpointUrl}/v1/audio/speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {})
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Cloud inference error (${res.status}): ${err}`);
    }
    return await res.json();
  }
}
