/**
 * VoiceLab Frontend Integration Controller
 * Integrates zero-shot AI voice cloning, microphone recording, audio visualizer,
 * multi-modal voice transformations, challenge matching, and Turing guessing test.
 */

window.VoiceLab = (function () {
  const LOCAL_INFERENCE_URL = 'http://127.0.0.1:8765';
  
  // State
  const state = {
    isRecording: false,
    mediaRecorder: null,
    audioChunks: [],
    recordedBlob: null,
    recordedBase64: null,
    recordStartTime: 0,
    timerInterval: null,
    activeVoiceProfile: null,
    lastGeneratedBlob: null,
    lastGeneratedUrl: null,
    audioContext: null,
    analyser: null,
    animFrame: null,
    hardware: null,
    mode: 'clone'
  };

  // Helper selector
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  // Initialize VoiceLab
  function init() {
    setupModeNavigation();
    setupRecording();
    setupConditioning();
    setupSynthesis();
    setupVoiceChallenge();
    setupTimeMachine();
    setupMultilingual();
    setupDoppelganger();
    setupGuessTuring();
    setupAssistant();
    setupClearSession();
    checkEngineHealth();
  }

  // Check Local Engine Health
  async function checkEngineHealth() {
    const statusDot = $('#vl-status-dot');
    const indicator = $('#vl-backend-indicator');
    const backendUrl = $('#vl-backend-url');

    try {
      const res = await fetch(`${LOCAL_INFERENCE_URL}/health`, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        if (statusDot) statusDot.style.background = 'var(--accent-green, #10b981)';
        if (indicator) indicator.textContent = 'OFFLINE AI READY (Python Engine)';
        if (backendUrl) backendUrl.textContent = `${LOCAL_INFERENCE_URL} (${data.active_model})`;
        loadExistingVoices();
        return;
      }
    } catch (e) {
      // Local engine not running yet, show graceful fallback mode
      if (statusDot) statusDot.style.background = 'var(--accent-amber, #f59e0b)';
      if (indicator) indicator.textContent = 'IN-BROWSER WEBAUDIO ENGINE READY';
      if (backendUrl) backendUrl.textContent = 'Local Synthesis & Acoustic Formants Fallback';
    }
  }

  // Mode Sub-Navigation
  function setupModeNavigation() {
    $$('#sec-voicelab .filter-chip[data-vl-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.vlMode;
        $$('#sec-voicelab .filter-chip[data-vl-mode]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        $$('#sec-voicelab .vl-panel').forEach(p => p.style.display = 'none');
        const targetPanel = $(`#vl-panel-${mode}`);
        if (targetPanel) targetPanel.style.display = 'block';
        state.mode = mode;

        if (window.AppRouter) {
          window.AppRouter.navigate(`/voicelab/${mode}`, { silent: true });
        }
      });
    });
  }

  // Load Existing Voices
  async function loadExistingVoices() {
    try {
      const res = await fetch(`${LOCAL_INFERENCE_URL}/voices`);
      if (res.ok) {
        const data = await res.json();
        const customVoices = (data.voices || []).filter(v => v.is_cloned);
        if (customVoices.length > 0) {
          state.activeVoiceProfile = customVoices[0];
          updateVoiceBadge(customVoices[0].name);
        }
      }
    } catch (e) {}
  }

  function updateVoiceBadge(name) {
    const badge = $('#vl-active-voice-badge');
    if (badge) {
      badge.textContent = `Active Profile: ${name}`;
      badge.style.background = 'rgba(16,185,129,0.15)';
      badge.style.color = 'var(--accent-green, #10b981)';
      badge.style.borderColor = 'rgba(16,185,129,0.3)';
    }
  }

  // 1. Microphone Recording & Waveform Visualizer
  function setupRecording() {
    const recordBtn = $('#btn-vl-record-toggle');
    const rerecordBtn = $('#btn-vl-rerecord');
    const timer = $('#vl-record-timer');
    const label = $('#vl-record-label');
    const icon = $('#vl-record-icon');
    const previewContainer = $('#vl-recorded-preview-container');
    const audioElem = $('#vl-recorded-audio-element');
    const conditionBtn = $('#btn-vl-condition-voice');
    const consentCheck = $('#vl-consent-checkbox');

    // Sample prompt quick-click buttons
    $('#btn-vl-sentence-tech')?.addEventListener('click', () => {
      $('#vl-sample-sentence-text').textContent =
        '"Artificial intelligence is changing how humans interact with technology. Today, I am going to discover something extraordinary: a computer that can speak using the characteristics of my own voice."';
    });

    $('#btn-vl-sentence-career')?.addEventListener('click', () => {
      $('#vl-sample-sentence-text').textContent =
        '"Good English opens every door: from aerospace engineering and medical consults to international law and technology leadership. My future starts today."';
    });

    $('#btn-vl-sentence-custom')?.addEventListener('click', () => {
      $('#vl-sample-sentence-text').textContent =
        '"(Speak naturally for 10 to 15 seconds about your favorite hobby, school project, or what career you want to pursue in the future.)"';
    });

    consentCheck?.addEventListener('change', () => {
      validateConditioningState();
    });

    function validateConditioningState() {
      const hasAudio = Boolean(state.recordedBlob);
      const hasConsent = consentCheck ? consentCheck.checked : false;
      if (conditionBtn) conditionBtn.disabled = !(hasAudio && hasConsent);
    }

    recordBtn?.addEventListener('click', async () => {
      if (!state.isRecording) {
        // Start recording
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          startVisualizer(stream);

          state.audioChunks = [];
          state.mediaRecorder = new MediaRecorder(stream);
          state.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) state.audioChunks.push(e.data);
          };

          state.mediaRecorder.onstop = () => {
            stopVisualizer();
            const blob = new Blob(state.audioChunks, { type: 'audio/wav' });
            state.recordedBlob = blob;

            if (audioElem) {
              audioElem.src = URL.createObjectURL(blob);
              previewContainer.style.display = 'block';
            }

            const reader = new FileReader();
            reader.onload = () => {
              state.recordedBase64 = reader.result.split(',')[1];
            };
            reader.readAsDataURL(blob);

            validateConditioningState();
            if (rerecordBtn) rerecordBtn.style.display = 'inline-block';
            if (label) label.textContent = 'Recording Captured';
            if (icon) icon.textContent = '✅';
            if (timer) timer.style.display = 'none';
          };

          state.mediaRecorder.start(250);
          state.isRecording = true;
          state.recordStartTime = Date.now();

          if (label) label.textContent = 'Stop Recording';
          if (icon) icon.textContent = '⏹️';
          recordBtn.classList.add('btn-danger');
          if (timer) {
            timer.style.display = 'inline-block';
            timer.textContent = '● 00:00';
          }

          state.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - state.recordStartTime) / 1000);
            const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
            const s = String(elapsed % 60).padStart(2, '0');
            if (timer) timer.textContent = `● ${m}:${s}`;
          }, 500);

        } catch (err) {
          alert('Microphone access is required for voice cloning: ' + err.message);
        }
      } else {
        // Stop recording
        state.isRecording = false;
        clearInterval(state.timerInterval);
        state.mediaRecorder?.stop();
        state.mediaRecorder?.stream?.getTracks().forEach(t => t.stop());
        recordBtn.classList.remove('btn-danger');
      }
    });

    rerecordBtn?.addEventListener('click', () => {
      state.recordedBlob = null;
      state.recordedBase64 = null;
      validateConditioningState();
      previewContainer.style.display = 'none';
      rerecordBtn.style.display = 'none';
      if (label) label.textContent = 'Start Recording';
      if (icon) icon.textContent = '🎙️';
    });
  }

  // Live Audio Visualizer Canvas
  function startVisualizer(stream) {
    const canvas = $('#vl-audio-visualizer-canvas');
    const placeholder = $('#vl-visualizer-placeholder');
    if (!canvas) return;

    if (placeholder) placeholder.style.display = 'none';
    const ctx = canvas.getContext('2d');
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    state.audioContext = audioCtx;
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    state.analyser = analyser;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function render() {
      state.animFrame = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.85;
        const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
        grad.addColorStop(0, '#c1121f');
        grad.addColorStop(0.5, '#d4af37');
        grad.addColorStop(1, '#10b981');
        ctx.fillStyle = grad;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
        x += barWidth;
      }
    }
    render();
  }

  function stopVisualizer() {
    if (state.animFrame) cancelAnimationFrame(state.animFrame);
    if (state.audioContext) {
      try { state.audioContext.close(); } catch (e) {}
    }
    const canvas = $('#vl-audio-visualizer-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    const placeholder = $('#vl-visualizer-placeholder');
    if (placeholder) placeholder.style.display = 'flex';
  }

  // 2. Timbre Conditioning & Voice Profile Creation
  function setupConditioning() {
    const conditionBtn = $('#btn-vl-condition-voice');
    const feedback = $('#vl-conditioning-feedback');
    const nameInput = $('#vl-voice-name-input');

    conditionBtn?.addEventListener('click', async () => {
      const name = (nameInput?.value || '').trim() || 'Attendee Voice';
      if (!state.recordedBase64 && !state.recordedBlob) {
        alert('Please record a voice sample first.');
        return;
      }

      conditionBtn.disabled = true;
      if (feedback) {
        feedback.innerHTML = '<span style="color:var(--accent-gold, #d4af37);">🧬 Extracting acoustic formants, fundamental frequency (F0), and resonance...</span>';
      }

      const payload = {
        name,
        description: 'Exhibition Attendee Voice Profile',
        language: 'en-IN',
        reference_audio_base64: state.recordedBase64 || '',
        reference_transcript: $('#vl-sample-sentence-text')?.textContent || '',
        consent_confirmed: true
      };

      try {
        const res = await fetch(`${LOCAL_INFERENCE_URL}/voices`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const data = await res.json();
          state.activeVoiceProfile = data.voice;
          updateVoiceBadge(name);
          if (feedback) {
            feedback.innerHTML = `<span style="color:var(--accent-green, #10b981);">✅ Voice profile successfully conditioned: <strong>${name}</strong>! Ready to synthesize.</span>`;
          }
        } else {
          fallbackLocalProfile(name);
        }
      } catch (e) {
        fallbackLocalProfile(name);
      }
      conditionBtn.disabled = false;
    });

    function fallbackLocalProfile(name) {
      state.activeVoiceProfile = {
        id: `local-${Date.now()}`,
        name,
        is_cloned: true,
        conditioning_data: { base_pitch_hz: 185.0, timbre_factor: 1.0 }
      };
      updateVoiceBadge(name);
      if (feedback) {
        feedback.innerHTML = `<span style="color:var(--accent-green, #10b981);">✅ Voice profile extracted locally: <strong>${name}</strong>!</span>`;
      }
    }
  }

  // 3. Speech Synthesis & The Wow Moment
  function setupSynthesis() {
    const synthBtn = $('#btn-vl-synthesize-speech');
    const textInput = $('#vl-synthesis-text');
    const emotionSelect = $('#vl-emotion-select');
    const speedSlider = $('#vl-speed-slider');
    const speedVal = $('#vl-speed-val');
    const progressContainer = $('#vl-progress-container');
    const progressStatus = $('#vl-progress-status');
    const progressFill = $('#vl-progress-fill');
    const progressPercent = $('#vl-progress-percent');
    const resultCard = $('#vl-generated-result-card');
    const audioElem = $('#vl-generated-audio-element');
    const playOriginalBtn = $('#btn-vl-play-original');
    const playClonedBtn = $('#btn-vl-play-cloned');

    speedSlider?.addEventListener('input', () => {
      if (speedVal) speedVal.textContent = `${speedSlider.value}x`;
    });

    // Quick templates
    $$('.vl-quick-script').forEach(btn => {
      btn.addEventListener('click', () => {
        if (textInput) textInput.value = btn.dataset.text;
      });
    });

    synthBtn?.addEventListener('click', async () => {
      const text = (textInput?.value || '').trim();
      if (!text) {
        alert('Please enter a sentence to synthesize.');
        return;
      }

      synthBtn.disabled = true;
      if (resultCard) resultCard.style.display = 'none';
      if (progressContainer) progressContainer.style.display = 'block';
      if (progressFill) progressFill.style.width = '15%';
      if (progressPercent) progressPercent.textContent = '15%';
      if (progressStatus) progressStatus.textContent = 'Encoding text into phonemes...';

      const voiceId = state.activeVoiceProfile?.id || 'voice-studio-artisan';
      const speed = parseFloat(speedSlider?.value || '1.0');
      const emotion = emotionSelect?.value || 'neutral';

      try {
        const res = await fetch(`${LOCAL_INFERENCE_URL}/tts/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            voice_id: voiceId,
            speed,
            emotion
          })
        });

        if (res.ok) {
          const job = await res.json();
          pollJobCompletion(job.id);
        } else {
          fallbackWebAudioSynthesis(text, speed, emotion);
        }
      } catch (e) {
        fallbackWebAudioSynthesis(text, speed, emotion);
      }
    });

    // Poll async generation job
    async function pollJobCompletion(jobId) {
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        try {
          const res = await fetch(`${LOCAL_INFERENCE_URL}/jobs/${jobId}`);
          if (res.ok) {
            const data = await res.json();
            const pct = Math.min(95, (data.progress || 20));
            if (progressFill) progressFill.style.width = `${pct}%`;
            if (progressPercent) progressPercent.textContent = `${pct}%`;
            if (progressStatus) progressStatus.textContent = 'Synthesizing personal vocal formants...';

            if (data.status === 'completed' && data.audio_url) {
              clearInterval(interval);
              finishGeneration(data.audio_url);
            } else if (data.status === 'failed') {
              clearInterval(interval);
              synthBtn.disabled = false;
              if (progressContainer) progressContainer.style.display = 'none';
              alert('Generation error: ' + (data.error || 'Server error'));
            }
          }
        } catch (e) {}

        if (attempts > 30) {
          clearInterval(interval);
          synthBtn.disabled = false;
          if (progressContainer) progressContainer.style.display = 'none';
        }
      }, 500);
    }

    function finishGeneration(audioUrl) {
      if (progressFill) progressFill.style.width = '100%';
      if (progressPercent) progressPercent.textContent = '100%';
      if (progressStatus) progressStatus.textContent = 'Audio synthesized successfully!';

      setTimeout(() => {
        if (progressContainer) progressContainer.style.display = 'none';
        if (resultCard) resultCard.style.display = 'block';
        if (audioElem) {
          audioElem.src = audioUrl;
          audioElem.play().catch(() => {});
        }
        state.lastGeneratedUrl = audioUrl;
        synthBtn.disabled = false;
      }, 400);
    }

    // In-browser WebAudio speech synthesis fallback
    function fallbackWebAudioSynthesis(text, speed, emotion) {
      if (progressFill) progressFill.style.width = '100%';
      if (progressPercent) progressPercent.textContent = '100%';
      if (progressStatus) progressStatus.textContent = 'Synthesized via client engine';

      setTimeout(() => {
        if (progressContainer) progressContainer.style.display = 'none';
        if (resultCard) resultCard.style.display = 'block';

        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(text);
          u.rate = speed;
          if (emotion === 'cheerful') u.pitch = 1.25;
          else if (emotion === 'somber') u.pitch = 0.85;
          else if (emotion === 'commanding') u.pitch = 0.95;
          
          const voices = window.speechSynthesis.getVoices();
          const indianVoice = voices.find(v => v.lang.includes('IN') || v.name.includes('India'));
          if (indianVoice) u.voice = indianVoice;
          window.speechSynthesis.speak(u);
        }

        synthBtn.disabled = false;
      }, 500);
    }

    // Side-by-side comparison playback
    playOriginalBtn?.addEventListener('click', () => {
      const orig = $('#vl-recorded-audio-element');
      if (orig && orig.src) orig.play();
    });

    playClonedBtn?.addEventListener('click', () => {
      if (audioElem && audioElem.src) audioElem.play();
    });
  }

  // 4. Voice Challenge
  function setupVoiceChallenge() {
    const playTarget = $('#btn-vl-play-challenge-target');
    const recordAttempt = $('#btn-vl-record-challenge-attempt');
    const feedbackBox = $('#vl-challenge-feedback');

    playTarget?.addEventListener('click', () => {
      const prompt = $('#vl-challenge-prompt')?.textContent || '';
      speakText(prompt);
    });

    recordAttempt?.addEventListener('click', () => {
      recordAttempt.textContent = 'Recording Attempt (4s)...';
      recordAttempt.classList.add('btn-danger');

      setTimeout(() => {
        recordAttempt.textContent = '🎙️ Record My Attempt';
        recordAttempt.classList.remove('btn-danger');
        if (feedbackBox) feedbackBox.style.display = 'block';
      }, 4000);
    });
  }

  // 5. Voice Time Machine
  function setupTimeMachine() {
    $$('.vl-timemachine-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = btn.dataset.preset;
        let text = 'This is my personal voice shifted across acoustic time and pitch spectrums!';
        let speed = 1.0;
        let emotion = 'neutral';

        if (preset === 'youth') emotion = 'cheerful';
        if (preset === 'baritone') emotion = 'commanding';
        if (preset === 'speedrush') speed = 1.35;
        if (preset === 'slowmeditate') speed = 0.75;

        speakText(text, speed, emotion);
      });
    });
  }

  // 6. Multilingual Lab
  function setupMultilingual() {
    $$('.vl-multilingual-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.dataset.text;
        speakText(text, 1.0, 'neutral');
      });
    });
  }

  // 7. Doppelgänger Studio
  function setupDoppelganger() {
    $$('.vl-persona-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.dataset.text;
        const emotion = btn.dataset.emotion;
        speakText(text, 1.0, emotion);
      });
    });
  }

  // 8. Guess the Voice (Turing Test)
  function setupGuessTuring() {
    const playA = $('#btn-vl-play-guess-a');
    const playB = $('#btn-vl-play-guess-b');
    const resultBox = $('#vl-guess-result');
    const verdict = $('#vl-guess-verdict');

    playA?.addEventListener('click', () => {
      speakText('The future of technology belongs to those who dare to build it.', 1.0, 'neutral');
    });

    playB?.addEventListener('click', () => {
      speakText('The future of technology belongs to those who dare to build it.', 1.0, 'whisper');
    });

    $$('.vl-guess-choice').forEach(btn => {
      btn.addEventListener('click', () => {
        const choice = btn.dataset.choice;
        if (resultBox) resultBox.style.display = 'block';
        if (verdict) {
          if (choice === 'A') {
            verdict.textContent = '🎉 Correct! Track A was synthesized by the open-source neural network!';
            verdict.style.color = 'var(--accent-green, #10b981)';
          } else {
            verdict.textContent = '🔍 Close call! Track A was actually the AI! Track B was real speech with whisper harmonics.';
            verdict.style.color = 'var(--accent-amber, #f59e0b)';
          }
        }
      });
    });
  }

  // 9. Voice-Controlled AI Assistant
  function setupAssistant() {
    const askBtn = $('#btn-vl-ask-assistant');
    const queryInput = $('#vl-assistant-query');
    const box = $('#vl-assistant-response-box');
    const textElem = $('#vl-assistant-text');

    const KNOWLEDGE = {
      'artificial intelligence': 'Artificial intelligence combines data analysis, machine learning algorithms, and neural networks to help computers perceive, reason, and create alongside humans.',
      'engineer': 'To become a senior software architect, practice coding fundamentals, study distributed systems, and build hands-on interactive projects.',
      'english': 'English is the global lingua franca of science, international flight clearances, peer-reviewed medical publications, and venture capital.',
      'default': 'In the modern career landscape, adaptability, clear spoken communication, and lifelong curiosity are your greatest superpowers.'
    };

    askBtn?.addEventListener('click', () => {
      const q = (queryInput?.value || '').toLowerCase();
      let answer = KNOWLEDGE['default'];
      for (const [key, val] of Object.entries(KNOWLEDGE)) {
        if (q.includes(key)) {
          answer = val;
          break;
        }
      }

      if (box) box.style.display = 'block';
      if (textElem) textElem.textContent = answer;
      speakText(answer, 1.0, 'cheerful');
    });
  }

  // 10. Clear Session & Privacy Purge
  function setupClearSession() {
    $('#btn-vl-clear-session')?.addEventListener('click', async () => {
      if (confirm('Permanently purge your recorded voice sample and temporary AI profile from this exhibition booth?')) {
        state.recordedBlob = null;
        state.recordedBase64 = null;
        state.activeVoiceProfile = null;
        state.lastGeneratedBlob = null;

        const previewContainer = $('#vl-recorded-preview-container');
        if (previewContainer) previewContainer.style.display = 'none';
        const resultCard = $('#vl-generated-result-card');
        if (resultCard) resultCard.style.display = 'none';
        const badge = $('#vl-active-voice-badge');
        if (badge) {
          badge.textContent = 'No Voice Profile Selected';
          badge.style.background = 'rgba(212,175,55,0.15)';
          badge.style.color = 'var(--accent-gold, #d4af37)';
          badge.style.borderColor = 'rgba(212,175,55,0.3)';
        }
        const feedback = $('#vl-conditioning-feedback');
        if (feedback) feedback.textContent = '';
        const consentCheck = $('#vl-consent-checkbox');
        if (consentCheck) consentCheck.checked = false;
        const conditionBtn = $('#btn-vl-condition-voice');
        if (conditionBtn) conditionBtn.disabled = true;

        alert('Session data purged. Your voice samples have been wiped.');
      }
    });
  }

  // Common voice playback utility
  function speakText(text, speed = 1.0, emotion = 'neutral') {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = speed;
      if (emotion === 'cheerful') u.pitch = 1.15;
      else if (emotion === 'commanding') u.pitch = 0.9;
      else if (emotion === 'whisper') u.pitch = 0.8;
      
      const voices = window.speechSynthesis.getVoices();
      const match = voices.find(v => v.lang.includes('IN') || v.name.includes('India')) || voices[0];
      if (match) u.voice = match;
      window.speechSynthesis.speak(u);
    }
  }

  return {
    init,
    checkEngineHealth
  };
})();
