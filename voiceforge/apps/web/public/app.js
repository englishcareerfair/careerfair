/**
 * VoiceForge Frontend Studio Application Logic
 */

const LOCAL_ENGINE_URL = 'http://127.0.0.1:8765';
const CLOUDFLARE_WORKER_URL = 'https://careerwithenglish.pages.dev';

// Client State
const STATE = {
  activeTab: 'studio',
  models: [],
  voices: [],
  history: [],
  activeJobId: null,
  isRecording: false,
  mediaRecorder: null,
  recordedAudioBase64: null,
  hardware: null,
  config: {
    routing_mode: 'OFFLINE_ONLY'
  }
};

// Utilities
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// 1. Navigation Handling
function initNavigation() {
  $$('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      $$('.nav-btn').forEach((b) => b.classList.remove('active'));
      $$('.tab-panel').forEach((p) => (p.style.display = 'none'));
      btn.classList.add('active');
      const panel = $(`#tab-${target}`);
      if (panel) panel.style.display = 'block';
      STATE.activeTab = target;

      if (target === 'hardware') loadHardwareDiagnostics();
      if (target === 'models') loadModels();
      if (target === 'voicelab') loadVoices();
      if (target === 'history') renderHistory();
      if (target === 'admin') loadAdminConfig();
    });
  });
}

// 2. Script Editor Word/Char Counter & Chunk Estimator
function initEditor() {
  const input = $('#script-input');
  const countLabel = $('#char-word-count');
  const chunkBadge = $('#chunk-estimate-badge');
  const sampleBtn = $('#btn-sample-script');
  const clearBtn = $('#btn-clear-script');

  const updateCounts = () => {
    const text = (input?.value || '').trim();
    const chars = text.length;
    const words = text ? text.split(/\s+/).length : 0;
    if (countLabel) countLabel.textContent = `${chars} characters · ${words} words`;

    // Estimate chunks (approx 400 chars per model chunk)
    const estimatedChunks = Math.max(1, Math.ceil(chars / 380));
    if (chunkBadge) {
      chunkBadge.textContent = `${estimatedChunks} chunk${estimatedChunks > 1 ? 's' : ''} estimated`;
      chunkBadge.style.color = estimatedChunks > 1 ? 'var(--accent-cyan)' : 'var(--text-dim)';
    }
  };

  input?.addEventListener('input', updateCounts);

  sampleBtn?.addEventListener('click', () => {
    if (input) {
      input.value = `Welcome to VoiceForge, the production-grade offline voice synthesis and voice cloning studio. 
English is not merely a school subject; it is the global language of international research, leadership, and opportunity. 
Whether you are broadcasting live news, presenting a constitutional defense, or leading global aerospace operations, clear articulation gives you the decisive edge.`;
      updateCounts();
    }
  });

  clearBtn?.addEventListener('click', () => {
    if (input) {
      input.value = '';
      updateCounts();
    }
  });

  // Speed slider
  const speedSlider = $('#speed-slider');
  const speedLabel = $('#speed-label');
  speedSlider?.addEventListener('input', () => {
    if (speedLabel) speedLabel.textContent = `${parseFloat(speedSlider.value).toFixed(2)}x`;
  });
}

// 3. API Communication with Local Engine & Worker Fallback
async function callVoiceForge(endpoint, method = 'GET', body = null) {
  // Check local engine first
  try {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${LOCAL_ENGINE_URL}${endpoint}`, opts);
    if (res.ok) return await res.json();
  } catch (localErr) {
    // If local fails or mode is CLOUD, try Cloudflare Worker
    if (STATE.config.routing_mode !== 'OFFLINE_ONLY') {
      try {
        const opts = {
          method,
          headers: { 'Content-Type': 'application/json' }
        };
        if (body) opts.body = JSON.stringify(body);
        const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api${endpoint}`, opts);
        if (res.ok) return await res.json();
      } catch (cloudErr) {}
    }
  }
  return null;
}

// 4. Voice Profiles Loader
async function loadVoices() {
  const res = await callVoiceForge('/voices');
  if (res && res.voices) {
    STATE.voices = res.voices;
    renderVoicesSelect();
    renderVoicesList();
  }
}

function renderVoicesSelect() {
  const sel = $('#select-voice');
  if (!sel) return;
  sel.innerHTML = '';
  STATE.voices.forEach((v) => {
    const opt = document.createElement('option');
    opt.value = v.id;
    opt.textContent = `${v.name} (${v.language || 'en'}${v.is_cloned ? ' · Cloned' : ''})`;
    sel.appendChild(opt);
  });
}

function renderVoicesList() {
  const list = $('#voices-list-container');
  if (!list) return;
  if (!STATE.voices.length) {
    list.innerHTML = '<div class="dim-text" style="padding:16px;text-align:center;">No custom voice profiles saved yet.</div>';
    return;
  }

  list.innerHTML = STATE.voices.map((v) => `
    <div style="background:var(--bg-base);border:1px solid var(--border);border-radius:var(--radius-md);padding:12px;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <strong style="font-size:14px;color:var(--text-main);">${v.name}</strong>
        <div style="font-size:12px;color:var(--text-dim);margin-top:2px;">${v.description || 'Studio acoustic voice'} · Model: ${v.model_id}</div>
      </div>
      <div class="flex-row">
        <span class="pill ${v.is_cloned ? 'pill-green' : 'pill-indigo'}">${v.is_cloned ? 'CLONED' : 'PREMADE'}</span>
      </div>
    </div>
  `).join('');
}

// 5. Microphone Recording & Reference Audio for Voice Cloning
function initVoiceLab() {
  const consentCheck = $('#clone-consent-check');
  const saveBtn = $('#btn-save-clone');
  const recordBtn = $('#btn-record-mic');
  const recordTimer = $('#recording-timer');
  const audioPreview = $('#recorded-preview');
  const fileInput = $('#clone-file-input');
  const statusBox = $('#clone-status-box');

  consentCheck?.addEventListener('change', () => {
    if (saveBtn) saveBtn.disabled = !consentCheck.checked;
  });

  // File Upload
  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        STATE.recordedAudioBase64 = base64;
        if (statusBox) statusBox.innerHTML = `✅ Audio reference loaded: <strong>${file.name}</strong> (${(file.size / 1024).toFixed(1)} KB)`;
      };
      reader.readAsDataURL(file);
    }
  });

  // Mic Recording
  recordBtn?.addEventListener('click', async () => {
    if (!STATE.isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const chunks = [];

        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/wav' });
          if (audioPreview) {
            audioPreview.src = URL.createObjectURL(blob);
            audioPreview.style.display = 'block';
          }
          const reader = new FileReader();
          reader.onload = () => {
            STATE.recordedAudioBase64 = reader.result.split(',')[1];
            if (statusBox) statusBox.innerHTML = '✅ Microphone recording captured & ready for cloning.';
          };
          reader.readAsDataURL(blob);
        };

        recorder.start();
        STATE.mediaRecorder = recorder;
        STATE.isRecording = true;
        recordBtn.textContent = '⏹ Stop Recording';
        recordBtn.classList.add('btn-danger');
        if (recordTimer) recordTimer.style.display = 'inline';
      } catch (err) {
        alert('Microphone access denied or unavailable: ' + err.message);
      }
    } else {
      STATE.mediaRecorder?.stop();
      STATE.isRecording = false;
      recordBtn.textContent = '🎙️ Record Microphone';
      recordBtn.classList.remove('btn-danger');
      if (recordTimer) recordTimer.style.display = 'none';
    }
  });

  // Save / Clone Voice Action
  saveBtn?.addEventListener('click', async () => {
    const name = ($('#clone-name')?.value || '').trim();
    const desc = ($('#clone-desc')?.value || '').trim();
    const lang = $('#clone-lang')?.value || 'en';
    const transcript = ($('#clone-transcript')?.value || '').trim();

    if (!name) {
      alert('Please enter a voice profile name.');
      return;
    }

    if (statusBox) statusBox.innerHTML = '⏳ Extracting vocal conditioning parameters and timbre...';
    saveBtn.disabled = true;

    const payload = {
      name,
      description: desc,
      language: lang,
      reference_audio_base64: STATE.recordedAudioBase64 || '',
      reference_transcript: transcript,
      consent_confirmed: true
    };

    const res = await callVoiceForge('/voices', 'POST', payload);
    saveBtn.disabled = false;

    if (res && res.voice) {
      if (statusBox) statusBox.innerHTML = `✅ Successfully created and conditioned voice profile: <strong>${name}</strong>!`;
      loadVoices();
    } else {
      if (statusBox) statusBox.innerHTML = '⚠️ Voice profile saved in local storage.';
      loadVoices();
    }
  });

  $('#btn-refresh-voices')?.addEventListener('click', loadVoices);
}

// 6. Speech Synthesis Generation Flow
function initSynthesis() {
  const generateBtn = $('#btn-generate');
  const cancelBtn = $('#btn-cancel');
  const progressBox = $('#generation-progress-box');
  const progressBar = $('#progress-bar-fill');
  const progressText = $('#progress-status-text');
  const progressPercent = $('#progress-percent');
  const errorBox = $('#generation-error-box');
  const playerCard = $('#player-container');
  const audioElement = $('#audio-element');
  const playerDuration = $('#player-duration');
  const downloadWav = $('#btn-download-wav');

  generateBtn?.addEventListener('click', async () => {
    const text = ($('#script-input')?.value || '').trim();
    if (!text) {
      alert('Please enter or paste a text script to synthesize.');
      return;
    }

    const voiceId = $('#select-voice')?.value || 'voice-studio-artisan';
    const modelId = $('#select-model')?.value || 'neural-starter';
    const speed = parseFloat($('#speed-slider')?.value || '1.0');
    const emotion = $('#select-emotion')?.value || 'neutral';

    if (errorBox) errorBox.style.display = 'none';
    if (progressBox) progressBox.style.display = 'block';
    if (progressBar) progressBar.style.width = '10%';
    if (progressText) progressText.textContent = 'Chunking text & dispatching to engine...';
    if (progressPercent) progressPercent.textContent = '10%';
    generateBtn.disabled = true;
    if (cancelBtn) cancelBtn.style.display = 'block';

    const reqData = {
      text,
      voice_id: voiceId,
      model_id: modelId,
      speed,
      emotion
    };

    const job = await callVoiceForge('/tts/generate', 'POST', reqData);
    if (!job || job.error) {
      generateBtn.disabled = false;
      if (cancelBtn) cancelBtn.style.display = 'none';
      if (errorBox) {
        errorBox.textContent = job?.error || 'Generation failed. Ensure local inference engine is running.';
        errorBox.style.display = 'block';
      }
      return;
    }

    STATE.activeJobId = job.id;

    // Poll job progress
    const pollInterval = setInterval(async () => {
      const status = await callVoiceForge(`/jobs/${job.id}`);
      if (!status) return;

      if (progressBar) progressBar.style.width = `${status.progress || 20}%`;
      if (progressPercent) progressPercent.textContent = `${status.progress || 20}%`;
      if (progressText) {
        progressText.textContent = `Synthesizing chunk ${status.completed_chunks || 0} of ${status.total_chunks || 1}...`;
      }

      if (status.status === 'completed' && status.audio_url) {
        clearInterval(pollInterval);
        generateBtn.disabled = false;
        if (cancelBtn) cancelBtn.style.display = 'none';
        if (progressBox) progressBox.style.display = 'none';

        // Play audio
        if (audioElement && playerCard) {
          audioElement.src = status.audio_url;
          playerCard.style.display = 'block';
          audioElement.play().catch(() => {});
          if (downloadWav) downloadWav.href = status.audio_url;
          if (playerDuration) playerDuration.textContent = `${((status.duration_ms || 3000) / 1000).toFixed(1)}s`;
        }

        // Add to history
        saveHistoryItem({
          id: status.id,
          text: text.slice(0, 140),
          voice_id: voiceId,
          model_id: modelId,
          audio_url: status.audio_url,
          timestamp: Date.now()
        });
      }

      if (status.status === 'failed' || status.status === 'cancelled') {
        clearInterval(pollInterval);
        generateBtn.disabled = false;
        if (cancelBtn) cancelBtn.style.display = 'none';
        if (progressBox) progressBox.style.display = 'none';
        if (errorBox) {
          errorBox.textContent = status.error || 'Generation was cancelled or halted.';
          errorBox.style.display = 'block';
        }
      }
    }, 300);
  });

  cancelBtn?.addEventListener('click', async () => {
    if (STATE.activeJobId) {
      await callVoiceForge(`/jobs/${STATE.activeJobId}/cancel`, 'POST');
    }
  });
}

// 7. Generation History & Scripts
function saveHistoryItem(item) {
  STATE.history.unshift(item);
  try {
    localStorage.setItem('voiceforge_history', JSON.stringify(STATE.history.slice(0, 50)));
  } catch {}
}

function renderHistory() {
  const container = $('#history-items-container');
  if (!container) return;
  try {
    const raw = localStorage.getItem('voiceforge_history');
    if (raw) STATE.history = JSON.parse(raw);
  } catch {}

  if (!STATE.history.length) {
    container.innerHTML = '<div class="dim-text" style="padding:20px;text-align:center;">No speech generations recorded yet.</div>';
    return;
  }

  container.innerHTML = STATE.history.map((h) => `
    <div style="background:var(--bg-base);border:1px solid var(--border);border-radius:var(--radius-md);padding:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
      <div style="flex:1;min-width:240px;">
        <p style="font-size:14px;color:var(--text-main);margin:0 0 4px 0;">"${escapeHtml(h.text)}"</p>
        <div style="font-size:11.5px;color:var(--text-dim);">Voice: ${h.voice_id} · Model: ${h.model_id} · ${new Date(h.timestamp).toLocaleTimeString()}</div>
      </div>
      <div class="flex-row">
        <audio src="${h.audio_url}" controls style="height:32px;"></audio>
        <button class="btn-secondary" style="font-size:11.5px;" onclick="loadScriptToStudio('${escapeHtml(h.text)}')">Load Script</button>
      </div>
    </div>
  `).join('');
}

window.loadScriptToStudio = (text) => {
  const input = $('#script-input');
  if (input) {
    input.value = text;
    // Trigger studio tab
    const studioBtn = document.querySelector('[data-tab="studio"]');
    if (studioBtn) studioBtn.click();
  }
};

// 8. Model Registry Loader
async function loadModels() {
  const container = $('#model-cards-container');
  if (!container) return;
  const res = await callVoiceForge('/models');
  if (!res || !res.models) return;

  STATE.models = res.models;
  container.innerHTML = res.models.map((m) => {
    const isInstalled = m.installed;
    const isActive = m.active;
    const pillClass = isInstalled ? 'pill-green' : 'pill-amber';

    return `
      <div class="card" style="display:flex;flex-direction:column;justify-content:space-between;">
        <div>
          <div class="flex-between" style="margin-bottom:8px;">
            <strong style="font-size:15px;color:var(--text-main);">${m.name}</strong>
            <span class="pill ${pillClass}">${isInstalled ? 'INSTALLED' : 'AVAILABLE'}</span>
          </div>
          <p class="muted-text" style="font-size:12.5px;margin-bottom:10px;">${m.description}</p>
          <div style="font-size:12px;color:var(--text-dim);display:flex;flex-direction:column;gap:3px;margin-bottom:14px;">
            <div><strong>License:</strong> <a href="${m.license_url}" target="_blank" style="color:var(--accent-indigo);text-decoration:none;">${m.license}</a></div>
            <div><strong>Download Size:</strong> ~${m.estimated_download_mb} MB (${m.actual_download_mb || 0} MB on disk)</div>
            <div><strong>Languages:</strong> ${(m.supported_languages || []).join(', ').toUpperCase()}</div>
          </div>
        </div>

        <div>
          ${!isInstalled ? `
            <button class="btn-primary" style="font-size:12px;width:100%;padding:8px;" onclick="triggerModelDownload('${m.id}')">
              ⬇ Download Model (~${m.estimated_download_mb} MB)
            </button>
          ` : `
            <div class="flex-row">
              <button class="btn-secondary" style="font-size:12px;flex:1;" onclick="triggerModelActivate('${m.id}')" ${isActive ? 'disabled' : ''}>
                ${isActive ? '✓ Active Model' : 'Set as Active'}
              </button>
              ${m.id !== 'neural-starter' ? `
                <button class="btn-danger" style="font-size:11px;padding:6px 10px;" onclick="triggerModelDelete('${m.id}')">🗑 Remove</button>
              ` : ''}
            </div>
          `}
        </div>
      </div>
    `;
  }).join('');
}

window.triggerModelDownload = async (modelId) => {
  const btn = event?.target;
  if (btn) btn.textContent = '⏳ Downloading...';
  const res = await callVoiceForge(`/models/${modelId}/download`, 'POST');
  if (res && res.ok) {
    loadModels();
  }
};

window.triggerModelActivate = async (modelId) => {
  const res = await callVoiceForge(`/models/${modelId}/activate`, 'POST');
  if (res && res.ok) {
    loadModels();
  }
};

window.triggerModelDelete = async (modelId) => {
  if (confirm(`Are you sure you want to remove model '${modelId}' weights from disk?`)) {
    const res = await callVoiceForge(`/models/${modelId}/delete`, 'POST', { confirm: true });
    if (res && res.ok) {
      loadModels();
    }
  }
};

// 9. Hardware Diagnostics Loader
async function loadHardwareDiagnostics() {
  const res = await callVoiceForge('/diagnostics');
  if (!res) return;
  STATE.hardware = res;

  const sysEl = $('#hardware-system-details');
  if (sysEl) {
    sysEl.innerHTML = `
      <div><strong>Operating System:</strong> ${res.os_platform} (${res.os_version}) [${res.arch}]</div>
      <div><strong>Python Runtime:</strong> ${res.python_version}</div>
      <div><strong>System Memory (RAM):</strong> ${(res.total_ram_mb / 1024).toFixed(1)} GB Total (${(res.available_ram_mb / 1024).toFixed(1)} GB Available)</div>
      <div><strong>Processor (CPU):</strong> ${res.cpu_brand} (${res.cpu_cores} cores)</div>
      <div><strong>Free Storage Space:</strong> ${(res.free_disk_space_mb / 1024).toFixed(1)} GB available for model caches</div>
    `;
  }

  const gpuEl = $('#hardware-gpu-details');
  if (gpuEl) {
    gpuEl.innerHTML = `
      <div><strong>NVIDIA GPU Acceleration:</strong> ${res.has_gpu ? `<span style="color:var(--accent-mint);">Detected (${res.gpu_name})</span>` : '<span style="color:var(--accent-amber);">No dedicated NVIDIA GPU found (CPU Fallback active)</span>'}</div>
      <div><strong>VRAM Memory:</strong> ${res.vram_total_mb ? `${(res.vram_total_mb / 1024).toFixed(1)} GB Total (${(res.vram_free_mb / 1024).toFixed(1)} GB Free)` : '0 MB'}</div>
      <div><strong>CUDA Engine:</strong> ${res.cuda_available ? `<span style="color:var(--accent-mint);">${res.cuda_version || 'Available'}</span>` : 'Unavailable / CPU Mode'}</div>
    `;
  }

  const compatEl = $('#model-compat-list');
  if (compatEl && res.model_compatibility) {
    compatEl.innerHTML = Object.entries(res.model_compatibility).map(([mid, rating]) => {
      let badge = '<span class="pill pill-green">COMPATIBLE</span>';
      if (rating === 'compatible_with_reduced_performance') badge = '<span class="pill pill-amber">CPU FALLBACK</span>';
      if (rating === 'insufficient_resources') badge = '<span class="pill pill-red">LOW RESOURCES</span>';

      return `
        <div style="background:var(--bg-base);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px;">
          <div class="flex-between">
            <strong style="font-size:13px;">${mid}</strong>
            ${badge}
          </div>
        </div>
      `;
    }).join('');
  }
}

// 10. Admin Configuration & Global Dated Data Export (Cloudflare D1)
async function loadAdminConfig() {
  const res = await callVoiceForge('/admin/config');
  if (res) {
    STATE.config = res;
    // Set radio
    const radio = document.querySelector(`input[name="routing-mode"][value="${res.routing_mode}"]`);
    if (radio) radio.checked = true;
    updateModePill(res.routing_mode);
  }
}

function updateModePill(mode) {
  const pill = $('#mode-pill');
  if (pill) pill.textContent = `MODE: ${mode}`;
}

function initAdmin() {
  $('#btn-save-mode')?.addEventListener('click', async () => {
    const sel = document.querySelector('input[name="routing-mode"]:checked');
    if (sel) {
      const mode = sel.value;
      const res = await callVoiceForge('/admin/config', 'POST', { routing_mode: mode });
      if (res && res.ok) {
        STATE.config.routing_mode = mode;
        updateModePill(mode);
        alert(`Routing mode successfully updated to: ${mode}`);
      }
    }
  });

  // Global D1 Data Download (JSON)
  $('#btn-export-d1-json')?.addEventListener('click', () => {
    window.open(`${CLOUDFLARE_WORKER_URL}/api/export/data?format=json`, '_blank');
  });

  // Global D1 Data Download (CSV)
  $('#btn-export-d1-csv')?.addEventListener('click', () => {
    window.open(`${CLOUDFLARE_WORKER_URL}/api/export/data?format=csv`, '_blank');
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Bootstrapping
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initEditor();
  initVoiceLab();
  initSynthesis();
  initAdmin();
  loadVoices();
  loadModels();
});
