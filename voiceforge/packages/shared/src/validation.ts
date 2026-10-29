/**
 * VoiceForge Shared Validation Helpers
 */
import { GenerationRequest, AdminConfig, RoutingMode } from './types';

export function validateGenerationRequest(req: Partial<GenerationRequest>, config?: Partial<AdminConfig>): { valid: boolean; error?: string } {
  if (!req.text || typeof req.text !== 'string' || req.text.trim().length === 0) {
    return { valid: false, error: 'Text prompt cannot be empty.' };
  }

  const maxLength = config?.max_text_length || 10000;
  if (req.text.length > maxLength) {
    return { valid: false, error: `Text exceeds maximum allowed length of ${maxLength} characters.` };
  }

  if (!req.model_id || typeof req.model_id !== 'string') {
    return { valid: false, error: 'Target model ID is required.' };
  }

  if (config?.allowed_model_ids && config.allowed_model_ids.length > 0) {
    if (!config.allowed_model_ids.includes(req.model_id)) {
      return { valid: false, error: `Model '${req.model_id}' is not enabled by administrator policy.` };
    }
  }

  if (req.speed !== undefined && (typeof req.speed !== 'number' || req.speed < 0.25 || req.speed > 3.0)) {
    return { valid: false, error: 'Speed multiplier must be between 0.25 and 3.0.' };
  }

  return { valid: true };
}

export function validateRoutingDecision(
  mode: RoutingMode,
  requestedRoute?: 'local' | 'cloud',
  cloudConfigured: boolean = false
): { route: 'local' | 'cloud'; allowed: boolean; reason?: string } {
  switch (mode) {
    case 'OFFLINE_ONLY':
      if (requestedRoute === 'cloud') {
        return { route: 'local', allowed: false, reason: 'Cloud inference is disabled by OFFLINE ONLY policy.' };
      }
      return { route: 'local', allowed: true };

    case 'LOCAL_FIRST':
      return { route: requestedRoute === 'cloud' && cloudConfigured ? 'cloud' : 'local', allowed: true };

    case 'CLOUD_FIRST':
      if (!cloudConfigured) {
        return { route: 'local', allowed: true, reason: 'Cloud provider not configured; falling back to local engine.' };
      }
      return { route: 'cloud', allowed: true };

    case 'CLOUD_ONLY':
      if (!cloudConfigured) {
        return { route: 'cloud', allowed: false, reason: 'Cloud inference is not configured and local fallback is prohibited.' };
      }
      return { route: 'cloud', allowed: true };

    case 'MANUAL':
      const target = requestedRoute || 'local';
      if (target === 'cloud' && !cloudConfigured) {
        return { route: 'cloud', allowed: false, reason: 'Requested cloud route but no cloud provider credentials set.' };
      }
      return { route: target, allowed: true };

    default:
      return { route: 'local', allowed: true };
  }
}
