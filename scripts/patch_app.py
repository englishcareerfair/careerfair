with open('careerfair/public/app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Update speak() status handling for ElevenLabs & Auto-Healed playback
old_speak_block = """      if (targetBtn && targetBtn.id === 'btn-test-tts-voice') {
        const testStatus = $('#admin-tts-test-status');
        if (testStatus) {
          testStatus.textContent = `✅ Playing ElevenLabs (${activeVoiceName})!`;
          testStatus.style.color = 'var(--accent-green, #10b981)';
        }
      }

      await currentTtsAudio.play();
      return;
    } else {
      let errInfo = '';
      let errStatus = '';
      try {
        const errJson = await res.json();
        errInfo = errJson.message || errJson.error || errJson.details || '';
        errStatus = errJson.status || '';
      } catch (e) {}

      if (errInfo) {
        console.warn('ElevenLabs TTS response info:', res.status, errInfo);
        if (targetBtn && targetBtn.id === 'btn-test-tts-voice') {
          const testStatus = $('#admin-tts-test-status');
          if (testStatus) {
            testStatus.textContent = `⚠️ Fallback to Browser Indian Voice (${errInfo})`;
            testStatus.style.color = 'var(--accent-amber, #f59e0b)';
          }
          showToast(`⚠️ ElevenLabs: ${errInfo}`, 5000);
        }
      }
    }"""

new_speak_block = """      if (targetBtn && targetBtn.id === 'btn-test-tts-voice') {
        const testStatus = $('#admin-tts-test-status');
        if (testStatus) {
          const isHealed = res.headers.get('x-eleven-healed') === 'true';
          testStatus.textContent = `✅ Playing ElevenLabs (${activeVoiceName}${isHealed ? ' · Studio Free Tier Compatible' : ''})!`;
          testStatus.style.color = 'var(--accent-green, #10b981)';
        }
      }

      await currentTtsAudio.play();
      return;
    } else {
      let errInfo = '';
      let errStatus = '';
      try {
        const errJson = await res.json();
        errInfo = errJson.message || errJson.error || errJson.details || '';
        errStatus = errJson.status || '';
      } catch (e) {}

      if (targetBtn && targetBtn.id === 'btn-test-tts-voice') {
        const testStatus = $('#admin-tts-test-status');
        if (testStatus) {
          if (errStatus === 'free_tier_library_notice' || errInfo.includes('Free users') || errInfo.includes('library voices')) {
            testStatus.textContent = `🇮🇳 Playing On-Device Indian Voice (en-IN) · Free Plan Notice`;
            testStatus.style.color = 'var(--accent-cyan)';
            showToast('ℹ️ ElevenLabs Free Plan restricts Community VoiceLab voices via API. Playing Indian Neural Voice.', 4000);
          } else {
            testStatus.textContent = `🇮🇳 Playing On-Device Indian Voice (en-IN)`;
            testStatus.style.color = 'var(--accent-cyan)';
          }
        }
      }
    }"""

js = js.replace(old_speak_block, new_speak_block)

# 2. Add blitz and slap to renderGameArena
old_arena_switch = """  if (gameKey === 'jobtris') {
    renderJobtris(mount);
  } else if (gameKey === 'gaming-hall') {"""

new_arena_switch = """  if (gameKey === 'jobtris') {
    renderJobtris(mount);
  } else if (gameKey === 'blitz') {
    renderWordBlitz(mount);
  } else if (gameKey === 'slap') {
    renderGrammarSlap(mount);
  } else if (gameKey === 'gaming-hall') {"""

js = js.replace(old_arena_switch, new_arena_switch)

# 3. Add high-dopamine bite-sized games code
games_code = """
// =========================================================================
// HIGH-DOPAMINE BITE-SIZED ARCADE GAMES (15s & 20s ROUNDS)
// =========================================================================

// --- Sound Synthesis Utility (Web Audio API) ---
let audioCtx = null;
function playSynthesizedSound(type) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'correct') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === 'streak') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      osc.frequency.setValueAtTime(783.99, now + 0.16);
      osc.frequency.setValueAtTime(1046.50, now + 0.24);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'wrong') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(160, now + 0.15);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'fanfare') {
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.connect(g);
        g.connect(audioCtx.destination);
        o.type = 'triangle';
        o.frequency.setValueAtTime(freq, now + i * 0.1);
        g.gain.setValueAtTime(0.2, now + i * 0.1);
        g.gain.linearRampToValueAtTime(0.01, now + i * 0.1 + 0.25);
        o.start(now + i * 0.1);
        o.stop(now + i * 0.1 + 0.25);
      });
    }
  } catch (e) {}
}

// ── GAME A: WORD BLITZ 15s (SPEED LEXICAL RUSH) ───────────────────────────
const WORD_BLITZ_POOL = [
  { word: 'RHETORIC', meaning: 'Persuasive speaking or writing', options: ['Persuasive speaking or writing', 'Ancient architecture', 'Silent meditation', 'Musical rhythm'] },
  { word: 'ELOQUENT', meaning: 'Fluent, expressive and persuasive', options: ['Fluent, expressive and persuasive', 'Extremely quiet', 'Arrogant and blunt', 'Cautious and hesitant'] },
  { word: 'ARTICULATE', meaning: 'Expressing ideas clearly and coherently', options: ['Expressing ideas clearly', 'Painting portraits', 'Working slowly', 'Running fast'] },
  { word: 'BREVITY', meaning: 'Concise and exact use of words', options: ['Concise and exact use of words', 'Extreme lengthiness', 'Hesitant speaking', 'Loud volume'] },
  { word: 'ADVOCACY', meaning: 'Active public support for a cause', options: ['Active support for a cause', 'Private doubt', 'Corporate audit', 'Strict silence'] },
  { word: 'PRAGMATIC', meaning: 'Dealing with things sensibly and realistically', options: ['Sensible and realistic', 'Overly idealistic', 'Completely passive', 'Easily angered'] },
  { word: 'SYNTHESIZE', meaning: 'Combine diverse ideas into a coherent whole', options: ['Combine ideas into a whole', 'Divide into fragments', 'Memorize without thinking', 'Ignore contrasts'] },
  { word: 'LUCID', meaning: 'Expressed clearly; easy to understand', options: ['Expressed clearly and easy to understand', 'Dark and confusing', 'Harsh and bitter', 'Lacking meaning'] },
  { word: 'NUANCE', meaning: 'A subtle distinction in meaning or expression', options: ['A subtle distinction in meaning', 'A massive disagreement', 'A legal penalty', 'An obvious mistake'] },
  { word: 'RESILIENT', meaning: 'Able to withstand or recover quickly', options: ['Able to recover quickly', 'Fragile and brittle', 'Easily defeated', 'Rigid and stubborn'] },
  { word: 'DIPLOMATIC', meaning: 'Tactful and skilled in handling relations', options: ['Tactful and skilled in relations', 'Aggressive and confrontational', 'Indifferent to others', 'Careless with words'] },
  { word: 'TENACIOUS', meaning: 'Persistent and determined', options: ['Persistent and determined', 'Giving up easily', 'Indecisive and slow', 'Carefree and lazy'] }
];

function renderWordBlitz(mount) {
  let score = 0;
  let streak = 0;
  let timeLeft = 15;
  let timerInterval = null;
  let currentIdx = 0;
  let shuffledPool = [...WORD_BLITZ_POOL].sort(() => Math.random() - 0.5);

  mount.innerHTML = `
    <div class="blitz-arena">
      <div class="blitz-header">
        <div>
          <h3 style="font-size:22px;margin:0;display:flex;align-items:center;gap:8px;">
            <span>⚡</span> Word Blitz 15s (Speed Rush)
          </h3>
          <span style="font-size:13px;color:var(--text-muted);">Match vocabulary synonyms at lightning speed! Fast reflexes earn multiplier streaks!</span>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <div class="blitz-hud-pill" id="blitz-streak-pill">Streak: 0 🔥</div>
          <div class="blitz-hud-pill" style="color:var(--accent-cyan);" id="blitz-score-pill">Score: 0</div>
          <div class="blitz-hud-pill" style="color:var(--accent-magenta);font-weight:800;" id="blitz-time-pill">15.0s</div>
        </div>
      </div>

      <div class="blitz-timer-bar-wrap">
        <div class="blitz-timer-bar" id="blitz-progress-bar"></div>
      </div>

      <div id="blitz-stage-content">
        <div class="blitz-word-stage">
          <div class="blitz-target-word" id="blitz-word-label">READY?</div>
          <div class="blitz-question-sub" id="blitz-prompt-label">Tap "Start Sprint" when ready!</div>
        </div>
        <div style="text-align:center;padding:20px;">
          <button class="btn btn-primary" id="btn-start-blitz" style="font-size:17px;min-height:52px;padding:12px 32px;font-weight:800;">🚀 Start 15s Sprint</button>
        </div>
      </div>
    </div>
  `;

  const stage = $('#blitz-stage-content');
  const streakPill = $('#blitz-streak-pill');
  const scorePill = $('#blitz-score-pill');
  const timePill = $('#blitz-time-pill');
  const progressBar = $('#blitz-progress-bar');
  const startBtn = $('#btn-start-blitz');

  const showQuestion = () => {
    if (currentIdx >= shuffledPool.length) {
      shuffledPool = [...WORD_BLITZ_POOL].sort(() => Math.random() - 0.5);
      currentIdx = 0;
    }
    const q = shuffledPool[currentIdx];
    const opts = [...q.options].sort(() => Math.random() - 0.5);

    stage.innerHTML = `
      <div class="blitz-word-stage">
        <div class="blitz-target-word">${escapeHtml(q.word)}</div>
        <div class="blitz-question-sub">Select the exact definition or closest synonym:</div>
      </div>
      <div class="blitz-choices-grid">
        ${opts.map(opt => `<button type="button" class="blitz-choice-btn" data-answer="${escapeHtml(opt)}">${escapeHtml(opt)}</button>`).join('')}
      </div>
    `;

    $$('.blitz-choice-btn').forEach(btn => {
      btn.onclick = () => {
        const picked = btn.dataset.answer;
        if (picked === q.meaning) {
          streak++;
          const multiplier = streak >= 5 ? 5 : (streak >= 3 ? 3 : (streak >= 2 ? 2 : 1));
          score += 100 * multiplier;
          btn.classList.add('correct-burst');
          if (multiplier >= 3) playSynthesizedSound('streak');
          else playSynthesizedSound('correct');
        } else {
          streak = 0;
          btn.classList.add('wrong-burst');
          playSynthesizedSound('wrong');
        }

        streakPill.textContent = `Streak: ${streak} ${streak >= 3 ? '🔥 (x' + (streak >= 5 ? 5 : (streak >= 3 ? 3 : 2)) + ')' : ''}`;
        streakPill.classList.toggle('blitz-streak-active', streak >= 2);
        scorePill.textContent = `Score: ${score}`;

        currentIdx++;
        setTimeout(showQuestion, 160);
      };
    });
  };

  const endGame = async () => {
    clearInterval(timerInterval);
    progressBar.style.width = '0%';
    playSynthesizedSound('fanfare');

    const grade = score >= 1200 ? 'S (Master Rhetorician)' : (score >= 700 ? 'A (Articulate Achiever)' : 'B (Rising Orator)');

    stage.innerHTML = `
      <div style="text-align:center;padding:24px 16px;">
        <div style="font-size:48px;margin-bottom:8px;">🏆</div>
        <h3 style="font-size:26px;color:var(--accent-cyan);margin:0 0 6px 0;">15-Second Blitz Complete!</h3>
        <p style="font-size:15px;color:var(--text-main);margin-bottom:16px;">
          Final Score: <strong style="color:#fbbf24;font-size:22px;">${score}</strong> · Grade: <strong>${grade}</strong>
        </p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
          <button class="btn btn-primary" id="btn-blitz-replay">🔄 Play Again (15s)</button>
          <button class="btn btn-secondary" id="btn-blitz-leaderboard">🏅 Save to Leaderboard</button>
        </div>
      </div>
    `;

    $('#btn-blitz-replay')?.addEventListener('click', () => renderWordBlitz(mount));
    $('#btn-blitz-leaderboard')?.addEventListener('click', async () => {
      const name = ($('#student-name-input')?.value || localStorage.getItem('cf_student_name') || 'Word Blitz Champion').trim();
      try {
        await fetchApi('attempt', {
          method: 'POST',
          body: JSON.stringify({
            name,
            pack: 'Everyday',
            level: 3,
            acc: Math.min(100, Math.round((score / 1500) * 100)),
            class_name: 'Class 10',
            target_career: 'Lexical Sprinter'
          })
        });
        showToast('🏆 Score saved to Exhibition Leaderboard!');
      } catch (e) {
        showToast('Score saved locally!');
      }
    });
  };

  startBtn?.addEventListener('click', () => {
    timeLeft = 15;
    score = 0;
    streak = 0;
    showQuestion();

    const startTime = Date.now();
    const duration = 15000;

    timerInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const rem = Math.max(0, (duration - elapsed) / 1000);
      timePill.textContent = `${rem.toFixed(1)}s`;
      progressBar.style.width = `${(rem / 15) * 100}%`;

      if (rem <= 0) {
        endGame();
      }
    }, 100);
  });
}

// ── GAME B: GRAMMAR SLAP 20s (REFLEX SURVIVAL) ─────────────────────────────
const SLAP_CHALLENGES = [
  { text: "Neither of the solutions is feasible.", valid: true, explanation: "Correct! 'Neither' takes a singular verb." },
  { text: "She don't understand the assignment.", valid: false, explanation: "Error! Should be 'She doesn't understand'." },
  { text: "Between you and I, the decision is final.", valid: false, explanation: "Error! Objective case required: 'Between you and me'." },
  { text: "The team of advocates was well prepared.", valid: true, explanation: "Correct! Collective noun 'team' is singular here." },
  { text: "Every student must submit their draft.", valid: true, explanation: "Correct! Singular 'their' is widely accepted standard English." },
  { text: "He speaks more clearer than his peer.", valid: false, explanation: "Error! Double comparative: should be 'more clearly'." },
  { text: "She was affected deeply by the inspirational speech.", valid: true, explanation: "Correct! 'Affect' is the verb meaning to influence." },
  { text: "The data shows a consistent trend.", valid: true, explanation: "Correct! Accepted in contemporary academic English." },
  { text: "I could care less about the rumor.", valid: false, explanation: "Error! The idiom is 'couldn't care less'." },
  { text: "Whom did you invite to the symposium?", valid: true, explanation: "Correct! 'Whom' functions as the objective pronoun." }
];

function renderGrammarSlap(mount) {
  let score = 0;
  let streak = 0;
  let qIdx = 0;
  let timerInterval = null;
  let shuffled = [...SLAP_CHALLENGES].sort(() => Math.random() - 0.5);

  mount.innerHTML = `
    <div class="slap-arena">
      <div class="blitz-header" style="border-bottom-color:rgba(255,42,133,0.3);">
        <div>
          <h3 style="font-size:22px;margin:0;display:flex;align-items:center;gap:8px;">
            <span>💥</span> Grammar Slap 20s (Reflex Check)
          </h3>
          <span style="font-size:13px;color:var(--text-muted);">Decide: VALID or ERROR in under 2 seconds! Fast judgment wins!</span>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <div class="blitz-hud-pill" id="slap-streak-pill">Streak: 0 🔥</div>
          <div class="blitz-hud-pill" style="color:var(--accent-magenta);" id="slap-score-pill">Score: 0</div>
          <div class="blitz-hud-pill" style="color:#fbbf24;font-weight:800;" id="slap-time-pill">20.0s</div>
        </div>
      </div>

      <div class="blitz-timer-bar-wrap">
        <div class="blitz-timer-bar" id="slap-progress-bar" style="background:linear-gradient(90deg, #ff2a85, #fbbf24);"></div>
      </div>

      <div id="slap-stage-content">
        <div class="slap-card-box">
          <div class="slap-sentence-text">Ready to test your grammatical reflexes?</div>
        </div>
        <div style="text-align:center;padding:16px;">
          <button class="btn btn-primary" id="btn-start-slap" style="font-size:17px;min-height:52px;padding:12px 32px;font-weight:800;background:linear-gradient(135deg, #e11d48, #ff2a85);">⚡ Start 20s Slap Challenge</button>
        </div>
      </div>
    </div>
  `;

  const stage = $('#slap-stage-content');
  const streakPill = $('#slap-streak-pill');
  const scorePill = $('#slap-score-pill');
  const timePill = $('#slap-time-pill');
  const progressBar = $('#slap-progress-bar');
  const startBtn = $('#btn-start-slap');

  const showItem = () => {
    if (qIdx >= shuffled.length) {
      shuffled = [...SLAP_CHALLENGES].sort(() => Math.random() - 0.5);
      qIdx = 0;
    }
    const item = shuffled[qIdx];

    stage.innerHTML = `
      <div class="slap-card-box">
        <div class="slap-sentence-text">"${escapeHtml(item.text)}"</div>
      </div>
      <div class="slap-buttons-row">
        <button type="button" class="btn-slap-valid" id="btn-slap-yes">
          <span>✅</span> VALID SENTENCE
        </button>
        <button type="button" class="btn-slap-error" id="btn-slap-no">
          <span>❌</span> GRAMMAR ERROR
        </button>
      </div>
    `;

    const handleChoice = (choseValid) => {
      const isCorrect = (choseValid === item.valid);
      if (isCorrect) {
        streak++;
        score += 150 * (streak >= 3 ? 2 : 1);
        playSynthesizedSound(streak >= 3 ? 'streak' : 'correct');
      } else {
        streak = 0;
        playSynthesizedSound('wrong');
      }

      streakPill.textContent = `Streak: ${streak} 🔥`;
      streakPill.classList.toggle('blitz-streak-active', streak >= 2);
      scorePill.textContent = `Score: ${score}`;

      qIdx++;
      setTimeout(showItem, 140);
    };

    $('#btn-slap-yes')?.addEventListener('click', () => handleChoice(true));
    $('#btn-slap-no')?.addEventListener('click', () => handleChoice(false));
  };

  const endSlapGame = () => {
    clearInterval(timerInterval);
    progressBar.style.width = '0%';
    playSynthesizedSound('fanfare');

    stage.innerHTML = `
      <div style="text-align:center;padding:24px 16px;">
        <div style="font-size:48px;margin-bottom:8px;">⚡</div>
        <h3 style="font-size:26px;color:var(--accent-magenta);margin:0 0 6px 0;">20s Survival Complete!</h3>
        <p style="font-size:15px;color:var(--text-main);margin-bottom:16px;">
          Final Score: <strong style="color:#fbbf24;font-size:22px;">${score}</strong> · Reflex Accuracy Certified!
        </p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
          <button class="btn btn-primary" id="btn-slap-replay">🔄 Slap Again (20s)</button>
        </div>
      </div>
    `;

    $('#btn-slap-replay')?.addEventListener('click', () => renderGrammarSlap(mount));
  };

  startBtn?.addEventListener('click', () => {
    score = 0;
    streak = 0;
    showItem();

    const startTime = Date.now();
    const duration = 20000;

    timerInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const rem = Math.max(0, (duration - elapsed) / 1000);
      timePill.textContent = `${rem.toFixed(1)}s`;
      progressBar.style.width = `${(rem / 20) * 100}%`;

      if (rem <= 0) {
        endSlapGame();
      }
    }, 100);
  });
}
"""

js += games_code

# 4. Enhance verifyAndLoadElevenVoices in Admin Settings
old_verify_code = """          data.voices.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.id;
            let badge = '';
            if (v.isIndian) badge = '✨ [Indian Accent - VoiceLab] ';
            else if (v.category === 'premade') badge = '🟢 [Free API Ready] ';
            opt.textContent = `${badge}${v.name} (${v.accent || v.category || 'voice'})`;
            if (savedVoice && (savedVoice === v.id || savedVoice === v.name)) {
              opt.selected = true;
            }
            selectEl.appendChild(opt);
          });"""

new_verify_code = """          const freeGroup = document.createElement('optgroup');
          freeGroup.label = '🟢 Free-Tier Ready (Studio Premade Voices - Zero 402 Errors)';
          const paidGroup = document.createElement('optgroup');
          paidGroup.label = '🔒 Paid Plan Required (Community VoiceLab Voices)';

          data.voices.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.id;
            const isFree = (v.freeTierReady || v.category === 'premade');
            const prefix = isFree ? '🟢 ' : '🔒 ';
            opt.textContent = `${prefix}${v.name} (${v.accent || (isFree ? 'Studio Premade' : 'VoiceLab')})`;
            if (savedVoice && (savedVoice === v.id || savedVoice === v.name)) {
              opt.selected = true;
            }
            if (isFree) freeGroup.appendChild(opt);
            else paidGroup.appendChild(opt);
          });

          if (freeGroup.children.length > 0) selectEl.appendChild(freeGroup);
          if (paidGroup.children.length > 0) selectEl.appendChild(paidGroup);"""

js = js.replace(old_verify_code, new_verify_code)

# 5. Wire the quick select free tier voice button
old_wire_btn = """  $('#btn-verify-eleven')?.addEventListener('click', () => {
    verifyAndLoadElevenVoices(false);
  });"""

new_wire_btn = """  $('#btn-verify-eleven')?.addEventListener('click', () => {
    verifyAndLoadElevenVoices(false);
  });

  $('#btn-quick-select-free-voice')?.addEventListener('click', () => {
    // Select George (JBFqnCBsd6RMkjVDRZzb) or first premade studio voice
    const bestVoice = 'JBFqnCBsd6RMkjVDRZzb'; // George (Warm, Articulate)
    if (elevenVoiceInput) elevenVoiceInput.value = bestVoice;
    if (selectEl) {
      const opt = selectEl.querySelector(`option[value="${bestVoice}"]`);
      if (opt) selectEl.value = bestVoice;
    }
    localStorage.setItem('cf_eleven_voice', bestVoice);
    STATE.config.eleven_voice = bestVoice;
    showToast('⚡ Auto-selected George (Studio Free-Tier Voice)!');
  });"""

js = js.replace(old_wire_btn, new_wire_btn)

with open('careerfair/public/app.js', 'w', encoding='utf-8', newline='') as f:
    f.write(js)

print("Updated public/app.js with games, voice categorization, auto-selection, and graceful status handling")
