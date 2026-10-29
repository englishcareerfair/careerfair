/**
 * VoiceForge Cloudflare Worker Entry Point
 */
import { handleRequest, Env } from './router';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  }
};
