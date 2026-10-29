/**
 * VoiceForge Shared Types & Contracts
 */

export type RoutingMode = 'OFFLINE_ONLY' | 'LOCAL_FIRST' | 'CLOUD_FIRST' | 'CLOUD_ONLY' | 'MANUAL';

export interface ModelCapabilities {
  streaming: boolean;
  speed_control: boolean;
  pitch_control: boolean;
  emotion_control: boolean;
  chunking_max_chars: number;
}

export interface ModelCloningRequirements {
  min_audio_seconds: number;
  recommended_audio_seconds: number;
  max_audio_seconds: number;
  sample_rate_hz: number;
  transcription_required: boolean;
}

export interface ModelManifest {
  id: string;
  name: string;
  version: string;
  publisher: string;
  repository: string;
  license: string;
  license_url: string;
  description: string;
  parameters: string;
  estimated_download_mb: number;
  actual_download_mb?: number;
  required_ram_mb: number;
  recommended_vram_mb: number;
  cpu_compatible: boolean;
  gpu_compatible: boolean;
  supported_languages: string[];
  cloning_supported: boolean;
  cloning_requirements?: ModelCloningRequirements;
  capabilities: ModelCapabilities;
  installed?: boolean;
  active?: boolean;
  download_progress?: number;
  status?: 'installed' | 'incomplete' | 'downloading' | 'unavailable';
}

export interface VoiceProfile {
  id: string;
  name: string;
  description?: string;
  language: string;
  created_at: number;
  updated_at: number;
  model_id: string;
  sample_rate: number;
  reference_audio_url?: string;
  reference_audio_base64?: string;
  reference_transcript?: string;
  is_cloned: boolean;
  conditioning_data?: Record<string, unknown>;
  consent_confirmed: boolean;
}

export interface GenerationRequest {
  id?: string;
  text: string;
  voice_id: string;
  model_id: string;
  speed?: number; // 0.5 - 2.0
  pitch?: number; // -10 to +10
  emotion?: 'neutral' | 'expressive' | 'cheerful' | 'somber' | 'whisper' | 'commanding';
  language?: string;
  preferred_route?: 'local' | 'cloud';
  stream?: boolean;
  chunk_size?: number;
}

export interface AudioChunk {
  index: number;
  text: string;
  audio_base64?: string;
  duration_ms?: number;
  status: 'pending' | 'synthesizing' | 'completed' | 'failed';
  error?: string;
}

export interface GenerationJob {
  id: string;
  created_at: number;
  completed_at?: number;
  text: string;
  voice_id: string;
  model_id: string;
  route_taken: 'local' | 'cloud';
  provider_name: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0 - 100
  total_chunks: number;
  completed_chunks: number;
  audio_url?: string;
  audio_format: 'wav' | 'mp3';
  duration_ms?: number;
  error?: string;
  chunks?: AudioChunk[];
}

export interface HardwareReport {
  os_platform: string;
  os_version: string;
  arch: string;
  python_version: string;
  total_ram_mb: number;
  available_ram_mb: number;
  cpu_brand: string;
  cpu_cores: number;
  has_avx2: boolean;
  has_gpu: boolean;
  gpu_name?: string;
  vram_total_mb?: number;
  vram_free_mb?: number;
  cuda_available: boolean;
  cuda_version?: string;
  free_disk_space_mb: number;
  model_compatibility: Record<string, 'compatible' | 'reduced_performance' | 'insufficient_resources' | 'unsupported'>;
}

export interface AdminConfig {
  routing_mode: RoutingMode;
  cloud_enabled: boolean;
  cloud_fallback_enabled: boolean;
  cloud_storage_enabled: boolean;
  cloud_history_enabled: boolean;
  anonymous_analytics: boolean;
  default_route: 'local' | 'cloud';
  allowed_model_ids: string[];
  max_text_length: number;
  max_upload_size_mb: number;
  max_local_concurrency: number;
  generation_timeout_seconds: number;
  allow_user_voice_cloning: boolean;
  active_model_id: string;
  rate_limit_rpm: number;
  retention_days: number;
  updated_at: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  action: string;
  user_id: string;
  details: string;
  ip_address?: string;
}
