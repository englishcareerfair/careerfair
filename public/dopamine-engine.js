/**
 * English Careers Forum 2026 — Dopamine Engine & FOMO Gamification Suite
 * Powers Reels-style psychological feedback loops, mystery trajectory unlocks,
 * live social proof pulses, Web Audio micro-chimes, confetti, and story cards.
 */

(function (window) {
  'use strict';

  // ── 1. Web Audio Synthesizer (Zero External Audio File Dependencies) ────────
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function playSynthesizedChime(type = 'ding') {
    // Respect user feature flag
    if (window.STATE?.config?.flags?.dopamine_fx === false) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      if (type === 'ding') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now); // A5
        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.15); // A6
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
      } else if (type === 'fanfare') {
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startTime = now + idx * 0.08;
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.2, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + 0.4);
        });
      } else if (type === 'levelUp') {
        const chords = [440, 554.37, 659.25, 880];
        chords.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const st = now + i * 0.06;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, st);
          gain.gain.setValueAtTime(0.15, st);
          gain.gain.exponentialRampToValueAtTime(0.001, st + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(st);
          osc.stop(st + 0.35);
        });
      } else if (type === 'pop') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      }
    } catch (e) {
      // Audio autoplay policy catch
    }
  }

  // ── 2. Confetti Particle Bursts ─────────────────────────────────────────────
  function triggerConfettiBurst(originX = 0.5, originY = 0.6) {
    if (window.STATE?.config?.flags?.dopamine_fx === false) return;
    if (typeof window.confetti === 'function') {
      window.confetti({
        particleCount: 65,
        spread: 70,
        origin: { x: originX, y: originY },
        colors: ['#00f0ff', '#e8a04a', '#10b981', '#a855f7', '#ffd700']
      });
    }
  }

  // ── 3. Live Social Proof Pulse Ticker (FOMO Mechanics) ──────────────────────
  const SOCIAL_PULSES = [
    { text: '🔥 38 students from Class 10 explored Commercial Aviation Captain today!', icon: '✈️' },
    { text: '⚡ Aarav P. scored 98% Accuracy in 6D AI Speech Studio!', icon: '🎙️' },
    { text: '🌟 29 students bookmarked AI & Quantum Systems Architect!', icon: '💻' },
    { text: '🏆 Jobtris High Score broken: 1,840 pts by Ananya (Class 9)!', icon: '🎮' },
    { text: '🩺 44 parents reviewed Chief Surgical Consults curriculum!', icon: '🩺' },
    { text: '⚖️ Supreme Court Advocate moot scenario completed with A+ honors!', icon: '⚖️' },
    { text: '📜 52 official Student Dossiers generated & printed today!', icon: '📄' },
    { text: '🎓 Top-tier accreditation: 8 students matched with IIT/NLSIU paths!', icon: '🏛️' }
  ];

  let pulseInterval = null;
  let pulseIndex = 0;

  function initSocialProofPulses() {
    if (document.getElementById('social-proof-toast')) return;
    const toast = document.createElement('div');
    toast.id = 'social-proof-toast';
    toast.className = 'social-proof-toast';
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = `
      <div class="pulse-indicator-dot"></div>
      <div class="pulse-content" id="social-proof-content">
        <span class="pulse-icon">🔥</span>
        <span class="pulse-msg">Welcome to English Careers Forum 2026!</span>
      </div>
      <button class="pulse-dismiss" id="social-proof-dismiss" aria-label="Dismiss live alert">✕</button>
    `;
    document.body.appendChild(toast);

    toast.querySelector('#social-proof-dismiss').onclick = () => {
      toast.classList.remove('visible');
    };

    const cyclePulse = () => {
      // Check feature flag
      if (window.STATE?.config?.flags?.dopamine_fx === false) {
        toast.classList.remove('visible');
        return;
      }
      const item = SOCIAL_PULSES[pulseIndex % SOCIAL_PULSES.length];
      pulseIndex++;
      const content = document.getElementById('social-proof-content');
      if (!content) return;
      content.innerHTML = `<span class="pulse-icon">${item.icon}</span> <span class="pulse-msg">${item.text}</span>`;
      toast.classList.add('visible');
      setTimeout(() => {
        toast.classList.remove('visible');
      }, 7000);
    };

    setTimeout(cyclePulse, 3500);
    pulseInterval = setInterval(cyclePulse, 16000);
  }

  // ── 4. Mystery Trajectory Card Reveal (Gacha Unboxing Sequence) ─────────────
  const RARITY_TIERS = [
    { tier: 'Legendary', rarity: 'Top 1% Precision Tier', color: '#ffd700', bg: 'linear-gradient(135deg, rgba(255,215,0,0.25), rgba(245,158,11,0.15))', glow: 'rgba(255,215,0,0.6)' },
    { tier: 'Mythic', rarity: 'Top 2% Visionary Tier', color: '#a855f7', bg: 'linear-gradient(135deg, rgba(168,85,247,0.25), rgba(99,102,241,0.15))', glow: 'rgba(168,85,247,0.6)' },
    { tier: 'Epic', rarity: 'Top 5% Articulation Tier', color: '#00f0ff', bg: 'linear-gradient(135deg, rgba(0,240,255,0.25), rgba(14,165,233,0.15))', glow: 'rgba(0,240,255,0.6)' },
    { tier: 'Mastery', rarity: 'Top 8% Leadership Tier', color: '#10b981', bg: 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(5,150,105,0.15))', glow: 'rgba(16,185,129,0.6)' }
  ];

  function openMysteryTrajectoryModal(career = null) {
    if (window.STATE?.config?.flags?.dopamine_fx === false) return;

    // Pick career or use fallback
    const resolvedCareer = career || (window.CAREERS_DATA && window.CAREERS_DATA[Math.floor(Math.random() * window.CAREERS_DATA.length)]) || {
      title: 'Commercial Airline Pilot',
      icon: '🧑‍✈️',
      cat: 'Aviation',
      salary: '₹18L – ₹50L+/yr',
      englishSuperpower: 'ICAO Operational English Level 4+ Phraseology with zero radio ambiguity.'
    };

    const tier = RARITY_TIERS[Math.floor(Math.random() * RARITY_TIERS.length)];
    const studentName = (window.STATE && window.STATE.studentName) ? window.STATE.studentName : (localStorage.getItem('cf_student_name') || 'Kanakia Scholar');

    // Create Modal Backdrop
    let modal = document.getElementById('mystery-card-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'mystery-card-modal';
      modal.className = 'mystery-modal-backdrop';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="mystery-modal-card" style="border: 2px solid ${tier.color}; box-shadow: 0 0 35px ${tier.glow};">
        <button class="mystery-modal-close" id="btn-close-mystery" aria-label="Close card">✕</button>
        
        <div class="mystery-header">
          <div class="mystery-sparkle">✨ REELS DISCOVERY UNLOCK ✨</div>
          <span class="mystery-badge" style="background:${tier.color};color:#000;">${tier.tier.toUpperCase()} · ${tier.rarity}</span>
        </div>

        <div class="mystery-flip-container">
          <div class="mystery-card-body" style="background:${tier.bg};">
            <div class="mystery-career-icon">${resolvedCareer.icon || '🎯'}</div>
            <h3 class="mystery-career-title">${resolvedCareer.title}</h3>
            <div class="mystery-student-tag">Certified for: <strong>${escapeHtml(studentName)}</strong></div>
            
            <div class="mystery-stat-grid">
              <div class="mystery-stat-pill">
                <span class="m-stat-lbl">Global Compensation</span>
                <span class="m-stat-val" style="color:${tier.color};">${resolvedCareer.salary || 'Competitive'}</span>
              </div>
              <div class="mystery-stat-pill">
                <span class="m-stat-lbl">English Superpower</span>
                <span class="m-stat-val">Mandatory Fluency</span>
              </div>
            </div>

            <p class="mystery-superpower-desc">
              "${resolvedCareer.englishSuperpower || 'Precision communication unlocks global professional pathways.'}"
            </p>

            <div class="mystery-actions">
              <button class="btn btn-primary btn-sm" id="btn-mystery-add-dossier" style="background:${tier.color};color:#000;font-weight:800;">
                ⭐ Pin to My Career Dossier
              </button>
              <button class="btn btn-secondary btn-sm" id="btn-mystery-story-card">
                📸 Download Story Card
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    modal.classList.add('active');
    playSynthesizedChime('fanfare');
    triggerConfettiBurst(0.5, 0.5);

    // Wire actions
    modal.querySelector('#btn-close-mystery').onclick = () => {
      modal.classList.remove('active');
    };
    modal.onclick = (e) => {
      if (e.target === modal) modal.classList.remove('active');
    };

    modal.querySelector('#btn-mystery-add-dossier').onclick = () => {
      if (window.STATE) {
        if (!window.STATE.studentProfile) window.STATE.studentProfile = {};
        window.STATE.studentProfile.chosenCareer = resolvedCareer;
        try {
          localStorage.setItem('cf_chosen_career', JSON.stringify(resolvedCareer));
        } catch (e) {}
      }
      playSynthesizedChime('ding');
      triggerConfettiBurst(0.5, 0.4);
      if (typeof window.showToast === 'function') {
        window.showToast(`✨ ${resolvedCareer.title} added to your official Dossier!`);
      }
      modal.classList.remove('active');
    };

    modal.querySelector('#btn-mystery-story-card').onclick = () => {
      generateStoryGraphic(resolvedCareer, tier, studentName);
    };
  }

  // ── 5. Instagram Story / WhatsApp Status Card Generator (Canvas 9:16) ────────
  function generateStoryGraphic(career, tier, studentName) {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dark sleek background
    const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1920);
    bgGrad.addColorStop(0, '#090d16');
    bgGrad.addColorStop(0.5, '#0d1527');
    bgGrad.addColorStop(1, '#05070d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1920);

    // Decorative neon circles
    ctx.save();
    ctx.filter = 'blur(90px)';
    ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
    ctx.beginPath();
    ctx.arc(300, 400, 250, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(232, 160, 74, 0.15)';
    ctx.beginPath();
    ctx.arc(800, 1200, 300, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Border Frame
    ctx.strokeStyle = tier.color || '#00f0ff';
    ctx.lineWidth = 14;
    ctx.strokeRect(50, 50, 980, 1820);

    // Header branding
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('KANAKIA INTERNATIONAL SCHOOL MIRA ROAD', 540, 180);

    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 28px "Space Grotesk", sans-serif';
    ctx.fillText('ENGLISH CAREERS FORUM 2026 · OFFICIAL CAREER MATCH', 540, 240);

    // Rarity Badge Box
    ctx.fillStyle = tier.color || '#00f0ff';
    roundRect(ctx, 340, 320, 400, 64, 32, true, false);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 26px "Space Grotesk", sans-serif';
    ctx.fillText(`${tier.tier.toUpperCase()} · ${tier.rarity}`, 540, 362);

    // Big Icon
    ctx.font = '160px sans-serif';
    ctx.fillText(career.icon || '🎯', 540, 600);

    // Career Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 56px "Space Grotesk", sans-serif';
    wrapText(ctx, career.title, 540, 740, 840, 68);

    // Student Badge
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    roundRect(ctx, 160, 920, 760, 110, 20, true, false);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '32px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('STUDENT TRAJECTORY FOR:', 540, 965);
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 40px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(studentName, 540, 1010);

    // English Superpower Box
    ctx.fillStyle = 'rgba(0, 240, 255, 0.07)';
    roundRect(ctx, 120, 1100, 840, 380, 24, true, false);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
    ctx.lineWidth = 3;
    roundRect(ctx, 120, 1100, 840, 380, 24, false, true);

    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 30px "Space Grotesk", sans-serif';
    ctx.fillText('WHY ENGLISH IS THE GLOBAL SUPERPOWER:', 540, 1160);

    ctx.fillStyle = '#ffffff';
    ctx.font = '28px "Plus Jakarta Sans", sans-serif';
    wrapText(ctx, career.englishSuperpower || 'Flawless English articulation turns local potential into international careers.', 540, 1220, 760, 44);

    // Footer Watermark
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '24px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Every modern career speaks English · Explore yours at English Careers Forum', 540, 1780);

    // Trigger download
    const link = document.createElement('a');
    link.download = `CareerMatch_${career.title.replace(/[^a-z0-9]/gi, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    playSynthesizedChime('pop');
    if (typeof window.showToast === 'function') {
      window.showToast('📸 Instagram/WhatsApp Story Card downloaded!');
    }
  }

  function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = String(text || '').split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line.trim(), x, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), x, y);
  }

  function escapeHtml(str) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };
    return String(str || '').replace(/[&<>"']/g, tag => map[tag] || tag);
  }

  // ── 6. Achievement Badge Tracker ───────────────────────────────────────────
  function unlockBadge(badgeKey, badgeName, badgeIcon) {
    if (window.STATE?.config?.flags?.dopamine_fx === false) return;
    const existing = JSON.parse(localStorage.getItem('cf_user_badges') || '[]');
    if (!existing.includes(badgeKey)) {
      existing.push(badgeKey);
      localStorage.setItem('cf_user_badges', JSON.stringify(existing));
      playSynthesizedChime('fanfare');
      triggerConfettiBurst(0.5, 0.5);
      if (typeof window.showToast === 'function') {
        window.showToast(`🏅 Badge Unlocked: ${badgeIcon} ${badgeName}!`);
      }
    }
  }

  function showLivePulse(text, icon = '🔥') {
    if (window.STATE?.config?.flags?.dopamine_fx === false) return;
    initSocialProofPulses();
    const toast = document.getElementById('social-proof-toast');
    const content = document.getElementById('social-proof-content');
    if (!toast || !content) return;
    content.innerHTML = `<span class="pulse-icon">${icon}</span> <span class="pulse-msg">${escapeHtml(text)}</span>`;
    toast.classList.add('visible');
    setTimeout(() => {
      toast.classList.remove('visible');
    }, 7000);
  }

  // Initialize immediately on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSocialProofPulses);
  } else {
    initSocialProofPulses();
  }

  // Export public API
  window.DopamineEngine = {
    playChime: playSynthesizedChime,
    confetti: triggerConfettiBurst,
    openMysteryTrajectory: openMysteryTrajectoryModal,
    showMysteryCard: openMysteryTrajectoryModal,
    showLivePulse: showLivePulse,
    generateStoryGraphic: generateStoryGraphic,
    unlockBadge: unlockBadge
  };

})(window);
