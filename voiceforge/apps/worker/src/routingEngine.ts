/**
 * VoiceForge Cloudflare Worker Routing Engine
 * Enforces strict routing policies: OFFLINE ONLY, LOCAL FIRST, CLOUD FIRST, CLOUD ONLY, MANUAL.
 */

export type RoutingMode = 'OFFLINE_ONLY' | 'LOCAL_FIRST' | 'CLOUD_FIRST' | 'CLOUD_ONLY' | 'MANUAL';

export interface RouteResolution {
  target: 'local' | 'cloud';
  allowed: boolean;
  provider_name: string;
  reason?: string;
  data_disclosure?: string;
}

export function resolveInferenceRoute(
  mode: RoutingMode,
  requestedRoute?: 'local' | 'cloud',
  cloudConfigured: boolean = false,
  localHealthy: boolean = true
): RouteResolution {
  switch (mode) {
    case 'OFFLINE_ONLY':
      if (requestedRoute === 'cloud') {
        return {
          target: 'local',
          allowed: false,
          provider_name: 'None',
          reason: 'Cloud inference is strictly prohibited by OFFLINE ONLY mode. All audio and text remains on your machine.'
        };
      }
      return {
        target: 'local',
        allowed: localHealthy,
        provider_name: 'VoiceForge Local Python Engine',
        reason: 'Operating under strict OFFLINE ONLY policy.'
      };

    case 'LOCAL_FIRST':
      if (localHealthy) {
        return {
          target: 'local',
          allowed: true,
          provider_name: 'VoiceForge Local Python Engine'
        };
      }
      if (cloudConfigured) {
        return {
          target: 'cloud',
          allowed: true,
          provider_name: 'Cloud Hosted Inference',
          data_disclosure: 'Local engine unavailable. Data will be transmitted to configured cloud provider.',
          reason: 'Automatic fallback to cloud provider because local engine is offline.'
        };
      }
      return {
        target: 'local',
        allowed: false,
        provider_name: 'VoiceForge Local Python Engine',
        reason: 'Local engine is offline and no cloud provider is configured.'
      };

    case 'CLOUD_FIRST':
      if (cloudConfigured) {
        return {
          target: 'cloud',
          allowed: true,
          provider_name: 'Cloud Hosted Inference',
          data_disclosure: 'Generating via remote cloud inference provider.'
        };
      }
      if (localHealthy) {
        return {
          target: 'local',
          allowed: true,
          provider_name: 'VoiceForge Local Python Engine',
          reason: 'Cloud provider not configured; falling back to local engine.'
        };
      }
      return {
        target: 'cloud',
        allowed: false,
        provider_name: 'None',
        reason: 'Neither cloud nor local inference engine is reachable.'
      };

    case 'CLOUD_ONLY':
      if (!cloudConfigured) {
        return {
          target: 'cloud',
          allowed: false,
          provider_name: 'None',
          reason: 'CLOUD ONLY mode active, but cloud provider credentials are not configured. Local fallback is forbidden.'
        };
      }
      return {
        target: 'cloud',
        allowed: true,
        provider_name: 'Cloud Hosted Inference',
        data_disclosure: 'Operating in CLOUD ONLY mode.'
      };

    case 'MANUAL':
      const preferred = requestedRoute || 'local';
      if (preferred === 'cloud') {
        if (!cloudConfigured) {
          return {
            target: 'cloud',
            allowed: false,
            provider_name: 'None',
            reason: 'Manual cloud generation selected, but cloud provider is not configured.'
          };
        }
        return {
          target: 'cloud',
          allowed: true,
          provider_name: 'Cloud Hosted Inference',
          data_disclosure: 'Manual cloud route chosen by user.'
        };
      }
      return {
        target: 'local',
        allowed: localHealthy,
        provider_name: 'VoiceForge Local Python Engine'
      };

    default:
      return {
        target: 'local',
        allowed: true,
        provider_name: 'VoiceForge Local Python Engine'
      };
  }
}
