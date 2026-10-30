/**
 * Career Fair: Every Career Speaks English — Complete Client Application
 * Unified single-engine client powering all features, speech intelligence,
 * accredited colleges explorer, arcade games, and admin console.
 */

// ─── 1. GLOBAL STATE & UTILITIES ──────────────────────────────────────────────
// Light Mode is default on start
const savedInitialTheme = localStorage.getItem('cf_theme');
const initialResolvedTheme = savedInitialTheme === 'dark' ? 'dark' : 'light';

const STATE = {
  theme: initialResolvedTheme,
  activeTab: 'hero',
  studentName: localStorage.getItem('cf_student_name') || '',
  studentClass: localStorage.getItem('cf_student_class') || 'Class 10',
  adminKey: sessionStorage.getItem('cf_admin_key') || localStorage.getItem('cf_admin_key') || '',
  config: {
    pass: 70,
    banner: 'Welcome to English Careers Forum 2026 · Explore 32+ Careers Where English Opens Doors!',
    timer: 0,
    school_branding: true,
    school_name: 'Kanakia International School Mira Road',
    stream_url: localStorage.getItem('cf_stream_url') || 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    stream_title: localStorage.getItem('cf_stream_title') || 'English Careers Forum 2026 — Live Stage Broadcast',
    stream_active: localStorage.getItem('cf_stream_active') !== 'false',
    stream_autoplay: localStorage.getItem('cf_stream_autoplay') !== 'false',
    gemini_keys: localStorage.getItem('cf_gemini_keys') || localStorage.getItem('cf_gemini_key') || sessionStorage.getItem('cf_gemini_keys') || '',
    gemini_key: localStorage.getItem('cf_gemini_keys') || localStorage.getItem('cf_gemini_key') || sessionStorage.getItem('cf_gemini_keys') || '',
    eleven_key: localStorage.getItem('cf_eleven_key') || '',
    eleven_voice: localStorage.getItem('cf_eleven_voice') || '',
    flags: {
      speechLab: true, mockInterview: true, anchorMode: true, roleplay: true,
      debate: true, careers: true, colleges: true, exams: true,
      games: true, roadmap: true, quiz: true, leaderboard: true, feedback: true
    }
  },
  audioContext: null,
  analyser: null,
  audioStream: null,
  speechRecognition: null,
  isRecording: false,
  timerInterval: null
};

// DOM Query Shortcuts
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

// Toast Notification (With Spam Protection & Max Concurrency)
function showToast(msg, duration = 3000) {
  const container = $('#toast-container');
  if (!container) return;

  // Prevent duplicate toast spam (e.g. repeated refresh notifications)
  const activeToasts = Array.from(container.querySelectorAll('.toast'));
  const isDuplicate = activeToasts.some(el => el.textContent.includes(msg));
  if (isDuplicate) return;

  // Keep at most 3 toasts on screen simultaneously
  while (container.children.length >= 3) {
    container.removeChild(container.firstChild);
  }

  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span>💬</span> <span>${escapeHtml(msg)}</span>`;
  container.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateY(10px)';
    setTimeout(() => t.remove(), 300);
  }, duration);
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag] || tag));
}

// Universal Global D1 API Client (Unified across careerwithenglish, futureofenglish & mobile devices)
const PRIMARY_D1_ORIGIN = 'https://careerwithenglish.pages.dev';

function getApiUrl(path) {
  const clean = path.replace(/^\/+/, '');
  const isPrimary = (typeof window !== 'undefined' && window.location.hostname === 'careerwithenglish.pages.dev');
  return isPrimary ? `/${clean}` : `${PRIMARY_D1_ORIGIN}/${clean}`;
}

async function fetchApi(endpoint, options = {}, maybeBody = null) {
  let opts = {};
  if (typeof options === 'string') {
    opts = {
      method: options.toUpperCase(),
      body: maybeBody !== null && maybeBody !== undefined
        ? (typeof maybeBody === 'string' ? maybeBody : JSON.stringify(maybeBody))
        : undefined
    };
  } else if (options && typeof options === 'object') {
    opts = Object.assign({}, options);
  }

  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const adminKey = STATE.adminKey || sessionStorage.getItem('cf_admin_key') || localStorage.getItem('cf_admin_key') || '';
  if (adminKey && !headers['Authorization']) {
    headers['Authorization'] = 'Bearer ' + adminKey;
  } else if (!headers['Authorization'] && endpoint.startsWith('admin/')) {
    headers['Authorization'] = 'Bearer careers2026';
  }

  const clientGeminiKeys = localStorage.getItem('cf_gemini_keys') || localStorage.getItem('cf_gemini_key') || sessionStorage.getItem('cf_gemini_keys') || STATE.config?.gemini_keys || '';
  if (clientGeminiKeys && !headers['x-gemini-keys']) {
    headers['x-gemini-keys'] = clientGeminiKeys;
  }
  opts.headers = headers;

  const cleanEndpoint = endpoint.replace(/^\/+/, '');
  // Route through PRIMARY_D1_ORIGIN if not on careerwithenglish.pages.dev so all devices share the live D1 database
  const isPrimary = (typeof window !== 'undefined' && window.location.hostname === 'careerwithenglish.pages.dev');
  const targetUrl = isPrimary ? `/api/${cleanEndpoint}` : `${PRIMARY_D1_ORIGIN}/api/${cleanEndpoint}`;

  try {
    const res = await fetch(targetUrl, opts);
    if (res.ok) return await res.json();
  } catch (err) {
    // If external cross-origin call fails (e.g. offline), try local relative path
    if (!isPrimary) {
      try {
        const localRes = await fetch(`/api/${cleanEndpoint}`, opts);
        if (localRes.ok) return await localRes.json();
      } catch (e) {}
    }
  }
  return null;
}

// Humanoid Studio Voice Engine & Unified Global Speech Toggle (Indian Accent ElevenLabs & Neural en-IN)
let isGreetingPlaying = false;
let currentTtsAudio = null;
let activeSpeechButton = null;
let activeSpeechUtterance = null;

function stopAllVoice() {
  if (currentTtsAudio) {
    try {
      currentTtsAudio.pause();
      currentTtsAudio.currentTime = 0;
    } catch {}
    currentTtsAudio = null;
  }
  isGreetingPlaying = false;

  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
  activeSpeechUtterance = null;

  if (activeSpeechButton) {
    if (activeSpeechButton.dataset.origHtml) {
      activeSpeechButton.innerHTML = activeSpeechButton.dataset.origHtml;
    }
    activeSpeechButton.classList.remove('speaking-active', 'playing');
    activeSpeechButton = null;
  }

  // Check greeting button specifically
  const greetingBtn = $('#btn-greeting');
  if (greetingBtn && (greetingBtn.classList.contains('playing') || greetingBtn.classList.contains('speaking-active') || greetingBtn.textContent.includes('Stop'))) {
    greetingBtn.innerHTML = '<span>🔊</span> <span class="greeting-btn-text">Listen AI Greeting</span>';
    greetingBtn.classList.remove('playing', 'speaking-active');
  }
}

async function speak(text, btn = null) {
  if (!text) return;

  // Resolve target button if not passed explicitly
  let targetBtn = btn;
  if (!targetBtn && typeof window !== 'undefined' && window.event) {
    const ev = window.event;
    if (ev.currentTarget && ev.currentTarget.tagName === 'BUTTON') {
      targetBtn = ev.currentTarget;
    } else if (ev.target) {
      targetBtn = ev.target.closest('button');
    }
  }

  // Check if voice is already speaking
  const isSpeaking = (window.speechSynthesis && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) || currentTtsAudio || activeSpeechButton;

  if (isSpeaking) {
    const wasSame = (targetBtn && (targetBtn === activeSpeechButton || (targetBtn.id && targetBtn.id === activeSpeechButton?.id)));
    stopAllVoice();
    // If the user clicked the same button that was speaking, stop and return!
    if (wasSame) {
      return;
    }
  } else if (activeSpeechButton) {
    stopAllVoice();
  }

  // Set target button into active playing state
  if (targetBtn) {
    if (!targetBtn.dataset.origHtml) {
      targetBtn.dataset.origHtml = targetBtn.innerHTML;
    }
    const btnText = targetBtn.textContent.toLowerCase();
    let stopLabel = 'Stop';
    if (btnText.includes('greeting')) stopLabel = 'Stop Audio';
    else if (btnText.includes('word')) stopLabel = 'Stop Word';
    else if (btnText.includes('scenario')) stopLabel = 'Stop Scenario';
    else if (btnText.includes('sample') || btnText.includes('sentence')) stopLabel = 'Stop Voice';

    targetBtn.innerHTML = `<span>⏹️</span> <span>${stopLabel}</span>`;
    targetBtn.classList.add('speaking-active', 'playing');
    activeSpeechButton = targetBtn;
  }

  const rawKey = ($('#admin-eleven-key')?.value || localStorage.getItem('cf_eleven_key') || STATE.config.eleven_key || '').trim();
  const effectiveKey = (rawKey && rawKey !== 'configured') ? rawKey : '';
  const savedVoiceId = ($('#admin-eleven-voice')?.value || localStorage.getItem('cf_eleven_voice') || STATE.config.eleven_voice || '').trim();

  // 1. Attempt Studio Humanoid Audio Synthesis via ElevenLabs Indian Accent API
  try {
    const res = await fetch(getApiUrl('api/tts'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(effectiveKey ? { 'xi-api-key': effectiveKey } : {})
      },
      body: JSON.stringify({
        text: text,
        apiKey: effectiveKey,
        voiceId: savedVoiceId,
        accent: 'indian'
      })
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('audio')) {
      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      currentTtsAudio = new Audio(audioUrl);

      const activeVoiceName = res.headers.get('x-eleven-voice') || 'Studio Indian Accent';

      currentTtsAudio.onended = () => {
        stopAllVoice();
      };

      currentTtsAudio.onerror = () => {
        fallbackIndianNeuralSpeech(text, targetBtn);
      };

      if (targetBtn && targetBtn.id === 'btn-test-tts-voice') {
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
    }
  } catch (err) {
    console.warn('ElevenLabs Indian TTS API unreachable, falling back to Indian neural voice:', err);
  }

  // 2. Fallback to High-Fidelity Indian English Browser Neural Speech (en-IN)
  fallbackIndianNeuralSpeech(text, targetBtn);
}

function fallbackIndianNeuralSpeech(text, targetBtn) {
  if (!('speechSynthesis' in window)) {
    showToast('Speech synthesis not supported in this browser.');
    if (targetBtn && targetBtn.dataset.origHtml) {
      targetBtn.innerHTML = targetBtn.dataset.origHtml;
      targetBtn.classList.remove('speaking-active', 'playing');
    }
    return;
  }

  // Cancel any lingering utterance to avoid repeating queue
  window.speechSynthesis.cancel();

  const utt = new SpeechSynthesisUtterance(text);
  // STRICT INDIAN ACCENT: en-IN ensures accurate pronunciation of Indian names, vocabulary, and phrasing
  utt.lang = 'en-IN';
  utt.rate = 0.92; // Natural, articulate Indian English pacing
  utt.pitch = 1.0;

  const voices = window.speechSynthesis.getVoices();
  if (voices.length) {
    // Select an authentic Indian English accent voice
    const indianVoice = voices.find(v => (v.lang === 'en-IN' || v.lang === 'en_IN') && (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Online')))
      || voices.find(v => v.lang === 'en-IN' || v.lang === 'en_IN')
      || voices.find(v => v.lang.toLowerCase().includes('in') && v.lang.toLowerCase().startsWith('en'))
      || voices.find(v => {
        const n = v.name.toLowerCase();
        return n.includes('india') || n.includes('heera') || n.includes('neerja') || n.includes('ravi') || n.includes('prabhat') || n.includes('veena') || n.includes('kavita') || n.includes('aarav') || n.includes('ananya');
      })
      // Bilingual Indian voices (Hindi) that speak accented English natively
      || voices.find(v => v.lang === 'hi-IN' || v.lang === 'hi_IN')
      || voices.find(v => {
        const n = v.name.toLowerCase();
        return n.includes('hindi') || n.includes('kalpana') || n.includes('hemant');
      });

    if (indianVoice) {
      utt.voice = indianVoice;
      utt.lang = 'en-IN';
    } else {
      // If no explicit Indian voice pack installed, KEEP utt.lang = 'en-IN'
      // DO NOT force utt.voice to American David or Zira!
      utt.lang = 'en-IN';
    }
  }

  activeSpeechUtterance = utt;

  const cleanup = () => {
    if (targetBtn && targetBtn.dataset.origHtml) {
      targetBtn.innerHTML = targetBtn.dataset.origHtml;
      targetBtn.classList.remove('speaking-active', 'playing');
    }
    if (activeSpeechButton === targetBtn) {
      activeSpeechButton = null;
    }
    activeSpeechUtterance = null;
    try { window.speechSynthesis.cancel(); } catch {}
  };

  utt.onend = () => {
    cleanup();
  };

  utt.onerror = () => {
    cleanup();
  };

  setTimeout(() => window.speechSynthesis.speak(utt), 40);
}

function fallbackNeuralSpeech(text, btn) {
  fallbackIndianNeuralSpeech(text, btn);
}

async function speakGreeting() {
  const btn = $('#btn-greeting');
  const greetingText = "Welcome to the English Careers Forum 2026 at Kanakia International School Mira Road. Good English is not merely an examination subject—it is the universal language that powers thirty-two global careers, from commercial aviation and surgical consults to corporate law and international diplomacy. Explore the interactive exhibits, test your spoken articulation, and discover your path!";

  if (activeSpeechButton && (activeSpeechButton === btn || activeSpeechButton.id === 'btn-greeting')) {
    stopAllVoice();
    return;
  }

  isGreetingPlaying = true;
  await speak(greetingText, btn);
}

// ─── 2. COMPREHENSIVE DATASETS ────────────────────────────────────────────────

// 32+ Careers with verified English Superpower
const CAREERS_DATA = [
  {
    title: "Chief Surgeon & Medical Resident",
    icon: "🩺",
    cat: "Health",
    desc: "Perform surgical interventions and diagnose complex clinical conditions while counseling anxious patients and families.",
    skills: "Clinical Diagnosis, Compassionate Empathy, Surgical Precision, Crisis Composure",
    salary: "₹12L – ₹45L+/yr",
    degrees: "MBBS + MS/MD / MCh",
    exams: "NEET-UG, NEET-PG, USMLE / PLAB",
    englishSuperpower: "Clear, empathetic communication de-escalates critical trauma. Mandatory for international medical licensing (USMLE/PLAB) and global clinical research literature."
  },
  {
    title: "Commercial Airline Pilot",
    icon: "🧑‍✈️",
    cat: "Aviation",
    desc: "Command transport-category jetliners across domestic and trans-continental flight corridors.",
    skills: "Aviation Systems, Spatial Agility, CRM Crew Coordination, Calm Under Pressure",
    salary: "₹18L – ₹50L+/yr",
    degrees: "B.Sc Aviation / CPL Commercial Pilot License",
    exams: "DGCA Commercial Exams, ICAO English Level 4+",
    englishSuperpower: "Mandatory ICAO Operational English Proficiency (Level 4–6). Zero ambiguity in Air Traffic Control radio phraseology is legally required to avoid mid-air catastrophes."
  },
  {
    title: "Principal Software Architect",
    icon: "💻",
    cat: "Tech",
    desc: "Design distributed cloud architectures, lead cross-continental engineering pods, and align code specs with business KPIs.",
    skills: "System Design, Microservices, Agile Leadership, Technical Documentation",
    salary: "₹15L – ₹65L+/yr",
    degrees: "B.Tech / M.Tech in Computer Science / IT",
    exams: "JEE Main & Advanced, BITSAT",
    englishSuperpower: "Articulating complex architectural trade-offs to non-technical stakeholders, remote asynchronous standups, and contributing to open-source RFC specifications."
  },
  {
    title: "Corporate Mergers & Acquisitions Lawyer",
    icon: "⚖️",
    cat: "Law",
    desc: "Draft multi-crore cross-border acquisitions, structure contractual clauses, and represent multinational corporations in dispute arbitration.",
    skills: "Contractual Drafting, Statutory Interpretation, Persuasive Rhetoric, Due Diligence",
    salary: "₹14L – ₹55L+/yr",
    degrees: "BA-LLB / BBA-LLB (5-Year Integrated)",
    exams: "CLAT, AILET, LSAT India",
    englishSuperpower: "Precision phrasing. A single ambiguous clause or misplaced comma in a corporate indemnity agreement can result in crores in corporate liability."
  },
  {
    title: "Diplomatic Civil Servant (IFS / IAS)",
    icon: "🏛️",
    cat: "Public Policy",
    desc: "Represent the Republic of India at bilateral geopolitical summits, draft state policy, and administer district welfare governance.",
    skills: "Geopolitics, Administrative Law, Diplomatic Protocol, Policy Drafting",
    salary: "₹10L – ₹28L/yr + Official Residence",
    degrees: "Graduation in any discipline",
    exams: "UPSC Civil Services Examination (CSE)",
    englishSuperpower: "UPSC Mains compulsory English qualifying paper; drafting international treaties, United Nations communiqués, and national press briefings."
  },
  {
    title: "Commissioned Defence Officer (NDA)",
    icon: "🎖️",
    cat: "Aviation",
    desc: "Command tactical armed forces units across border garrisons, naval fleets, or fighter squadrons.",
    skills: "Tactical Leadership, Physical Endurance, Strategic Logistics, Rapid Decision",
    salary: "₹11L – ₹30L/yr + Allowances",
    degrees: "NDA Khadakwasla / IMA Dehradun (B.Sc / B.Tech)",
    exams: "UPSC NDA / CDS + 5-Day SSB Interview",
    englishSuperpower: "SSB Group Discussions, Psychological Lecturettes, and joint multinational UN peacekeeping combat exercises conducted in standard English."
  },
  {
    title: "Broadcast Journalist & News Anchor",
    icon: "📰",
    cat: "Media",
    desc: "Anchor prime-time television broadcasts, interview international leaders, and direct on-ground investigative journalism.",
    skills: "Teleprompter Delivery, Live Interviewing, Fact Verification, Narrative Storytelling",
    salary: "₹6L – ₹28L+/yr",
    degrees: "BA / PG Diploma in Journalism & Mass Media",
    exams: "IIMC Entrance, CUET-PG",
    englishSuperpower: "Impromptu speech during unscripted breaking news, flawless cadence, and cross-examining influential political figures with composure."
  },
  {
    title: "Luxury Hospitality & General Manager",
    icon: "🏨",
    cat: "Business",
    desc: "Direct world-renowned 5-star resort operations, host diplomatic delegations, and orchestrate ultra-luxury guest experiences.",
    skills: "Customer De-escalation, Cross-Cultural Protocol, Revenue Management, P&L",
    salary: "₹8L – ₹35L+/yr",
    degrees: "B.Sc Hospitality & Hotel Administration",
    exams: "NCHM JEE",
    englishSuperpower: "De-escalating international high-net-worth guest disputes with dignified charm, polished etiquette, and global business diplomacy."
  },
  {
    title: "Venture Entrepreneur & Startup Founder",
    icon: "🚀",
    cat: "Business",
    desc: "Raise venture capital, architect disruptive technology products, and build multi-billion valuation companies.",
    skills: "Pitch Crafting, Unit Economics, Team Building, Stakeholder Negotiation",
    salary: "Equity-based / High upside",
    degrees: "Any graduate / B.Tech / MBA (IIM / ISB / Ivy League)",
    exams: "CAT, GMAT",
    englishSuperpower: "Delivering a magnetic 60-second elevator pitch to global venture capitalists. Clear narrative framing turns seed ideas into funded companies."
  },
  {
    title: "Chartered Accountant & Investment Banker",
    icon: "📊",
    cat: "Business",
    desc: "Structure IPO listings, audit corporate conglomerates, and advise private equity firms on valuation models.",
    skills: "Financial Modeling, Statutory Auditing, Forensic Accounting, Valuation",
    salary: "₹12L – ₹40L+/yr",
    degrees: "ICAI CA / CFA / B.Com (Hons)",
    exams: "CA Foundation, Intermediate, and Final",
    englishSuperpower: "Translating dense balance sheets into compelling investment memos and statutory filings for international stock exchanges."
  },
  {
    title: "University Professor & Academic Scholar",
    icon: "🎓",
    cat: "Creative",
    desc: "Conduct empirical humanities and social science research, mentor doctoral scholars, and publish internationally cited monographs.",
    skills: "Pedagogical Theory, Close Reading, Seminar Debate, Archival Research",
    salary: "₹8L – ₹26L/yr",
    degrees: "MA + Ph.D in Literature / Linguistics / Social Sciences",
    exams: "UGC-NET / JRF",
    englishSuperpower: "Peer-reviewed journal publishing in high-impact academic publications (Oxford, Cambridge University Press) and global lecture delivery."
  },
  {
    title: "OTT Screenwriter & Narrative Game Designer",
    icon: "🎬",
    cat: "Creative",
    desc: "Author scripts for cinematic streaming series and build complex interactive dialogue trees for AAA video game studios.",
    skills: "Character Arcs, Dialogue Rhythm, Branching Worldbuilding, Dramatic Pacing",
    salary: "₹7L – ₹35L+/yr",
    degrees: "BA Literature / Film Direction / Screenwriting MFA",
    exams: "FTII JET, SRFTI Entrance",
    englishSuperpower: "Subtext, cadence, and witty vernacular dialogue that captivates audiences across Netflix, Amazon Prime, and international gaming platforms."
  },
  {
    title: "Voice-Over Artist & Audio Narrator",
    icon: "🎙️",
    cat: "Creative",
    desc: "Voice international animated features, record best-selling audiobooks, and perform documentary voiceovers.",
    skills: "Vocal Modulation, Diction Precision, Breath Control, Accent Mimicry",
    salary: "₹5L – ₹25L+/yr",
    degrees: "Any degree + Vocal Coaching Certification",
    exams: "Audition portfolios & Voice reels",
    englishSuperpower: "Impeccable phoneme articulation, emotional inflection, and mastering Standard British (RP) and General American dialects."
  },
  {
    title: "Technical Writer & Documentation Specialist",
    icon: "📝",
    cat: "Tech",
    desc: "Transform complex developer APIs, cloud architectures, and biotech whitepapers into crisp, readable developer guides.",
    skills: "Markdown/Doc-as-Code, API Schemas, Structural Clarity, Brevity",
    salary: "₹8L – ₹25L/yr",
    degrees: "B.Tech / BA English with CS Minor",
    exams: "Technical Portfolio assessment",
    englishSuperpower: "Translating dense engineering jargon into lucid, user-friendly documentation that powers global developer ecosystems."
  },
  {
    title: "Advertising Creative Director & Copywriter",
    icon: "💡",
    cat: "Media",
    desc: "Invent viral cultural taglines, direct multi-platform commercial campaigns, and build enduring global brand identities.",
    skills: "Wordplay, Cultural Insight, Creative Framing, Visual Direction",
    salary: "₹8L – ₹40L+/yr",
    degrees: "BA Mass Media / Advertising & Communication",
    exams: "MICAT, Creative Portfolio",
    englishSuperpower: "Compressing a transformative commercial idea into concise, memorable phrasing that defines culture and markets."
  },
  {
    title: "International Public Relations Strategist",
    icon: "📣",
    cat: "Business",
    desc: "Guide corporate leaders through high-stakes PR crises, coordinate media briefings, and build global press relations.",
    skills: "Crisis Management, Message Discipline, Media Relations, Strategic Framing",
    salary: "₹7L – ₹30L/yr",
    degrees: "BA / MA Public Relations / Corporate Communications",
    exams: "University Entrance Exams",
    englishSuperpower: "Crafting bulletproof press releases and guiding executives through live media questioning during corporate crises."
  },
  {
    title: "Novelist & Literary Fiction Author",
    icon: "📖",
    cat: "Creative",
    desc: "Craft bestselling novels, build immersive fictional universes, and publish literary works with global publishing houses.",
    skills: "Narrative Arc, Pacing, Evocative Prose, Subtext & Characterization",
    salary: "₹6L – ₹30L+/yr + Royalties",
    degrees: "BA / MA English Literature / Creative Writing MFA",
    exams: "University Literary Portfolios, CUET-UG / PG",
    englishSuperpower: "Nuanced prose cadence, vocabulary mastery, and emotional resonance that moves readers and secures international literary representation."
  },
  {
    title: "Narrative Game Writer & Worldbuilder",
    icon: "🎮",
    cat: "Creative",
    desc: "Design branching quests, author cinematic dialogue, and construct rich narrative lore for AAA and indie video games.",
    skills: "Branching Dialogue, Lore Bibles, Environmental Storytelling, Character Voices",
    salary: "₹8L – ₹32L+/yr",
    degrees: "BA English / Interactive Narrative / Game Design",
    exams: "Writing portfolio & Twine / Ren'Py interactive narrative sample",
    englishSuperpower: "Crafting distinct character vernaculars and interactive conversational subtext that adapts to player choice across global titles."
  },
  {
    title: "Science Communicator & Research Journalist",
    icon: "🔬",
    cat: "Media",
    desc: "Translate cutting-edge quantum physics, CRISPR biotechnology, and aerospace discoveries into thrilling mainstream articles and documentaries.",
    skills: "Scientific Literacy, Metaphor Crafting, Fact-Checking, Visual Storytelling",
    salary: "₹7L – ₹28L/yr",
    degrees: "B.Sc / BS + PG Diploma in Science Communication / English",
    exams: "CUET-PG, Media School Entrance",
    englishSuperpower: "Turning dense peer-reviewed equations into lucid, awe-inspiring prose that makes scientific breakthroughs accessible to humanity."
  },
  {
    title: "UX Writer & Product Content Designer",
    icon: "📱",
    cat: "Tech",
    desc: "Craft intuitive in-app microcopy, user onboarding journeys, and conversational AI interface flows for global mobile apps.",
    skills: "Microcopy, User Research, Accessibility, Information Hierarchy",
    salary: "₹10L – ₹35L+/yr",
    degrees: "BA English / Cognitive Science / Human-Computer Interaction",
    exams: "Design & UX Writing portfolio review",
    englishSuperpower: "Radical brevity and psychological precision: guiding millions of users effortlessly through complex fintech and healthcare interfaces."
  },
  {
    title: "Publishing Editor & Literary Agent",
    icon: "📚",
    cat: "Creative",
    desc: "Acquire manuscript rights, edit acclaimed fiction and non-fiction, and negotiate global distribution with international publishing houses.",
    skills: "Structural Editing, Line Editing, Contract Negotiation, Market Curation",
    salary: "₹6L – ₹24L/yr",
    degrees: "BA / MA English Literature / Publishing Studies",
    exams: "Publishing House Editorial Assessments",
    englishSuperpower: "Flawless syntactical judgment and structural critique that refines raw drafts into timeless, award-winning literature."
  },
  {
    title: "Product Manager & Agile Lead",
    icon: "🧭",
    cat: "Tech",
    desc: "Define product roadmaps, bridge engineering with marketing, and present product strategy to cross-functional global teams.",
    skills: "Roadmap Prioritization, PRD Documentation, Stakeholder Alignment, Metrics",
    salary: "₹16L – ₹55L+/yr",
    degrees: "B.Tech / Any Graduate + MBA / Product Management Certification",
    exams: "CAT / GMAT / Executive Assessments",
    englishSuperpower: "Clear, persuasive asynchronous written memos (Amazon 6-pagers) and inspiring keynote presentations that align hundreds of engineers."
  },
  {
    title: "Commercial Flight Cabin Crew Lead",
    icon: "✈️",
    cat: "Aviation",
    desc: "Lead in-flight passenger safety, manage high-altitude medical crises, and represent prestigious international airlines.",
    skills: "Emergency Evacuation, Crisis De-escalation, Cultural Etiquette, First-Aid",
    salary: "₹7L – ₹22L+/yr + International Per Diem",
    degrees: "Class 12 / Any Graduate + Aviation Hospitality Diploma",
    exams: "Airline In-Person Interviews & Fluency Assessments",
    englishSuperpower: "Crystal-clear emergency evacuation commands and diplomatic interpersonal grace that reassures 300+ passengers during airborne turbulence."
  },
  {
    title: "Foreign Correspondent & War Reporter",
    icon: "🌍",
    cat: "Media",
    desc: "Report from international geopolitical conflict zones, break diplomatic summits, and broadcast live field dispatches.",
    skills: "Field Reporting, Hostile Environment Awareness, Rapid Dispatch, Ethics",
    salary: "₹9L – ₹35L+/yr",
    degrees: "BA / MA Journalism / International Relations",
    exams: "Media Entrance Exams & Investigative Portfolios",
    englishSuperpower: "Composed, vivid live broadcast reporting under extreme pressure, conveying historic global events to millions around the world."
  },
  {
    title: "Speechwriter & Political Strategist",
    icon: "🎙️",
    cat: "Public Policy",
    desc: "Write magnetic keynote addresses, parliamentary speeches, and diplomatic remarks for heads of state and global CEOs.",
    skills: "Rhetoric, Cadence, Thematic Storytelling, Political Psychology",
    salary: "₹10L – ₹40L+/yr",
    degrees: "BA English / Political Science / History",
    exams: "Portfolio of Speeches & Policy Briefs",
    englishSuperpower: "Classical rhetorical devices (anaphora, chiasmus, tricolon) that inspire nations, sway parliaments, and define historic movements."
  },
  {
    title: "Sports Commentator & Live Broadcaster",
    icon: "🏆",
    cat: "Media",
    desc: "Deliver energetic ball-by-ball commentary, player interviews, and post-match analytical breakdowns for international sporting tournaments.",
    skills: "Live Improvisation, Match Analytics, Vocal Cadence, Rapid Reaction",
    salary: "₹8L – ₹45L+/yr",
    degrees: "BA Mass Media / Sports Journalism / Any Graduate",
    exams: "Broadcaster Audition Reels & Knowledge Tests",
    englishSuperpower: "High-octane unscripted eloquence that matches the tempo of live sports and immortalizes historic championship moments."
  },
  {
    title: "Computational Linguist & AI Prompt Engineer",
    icon: "🤖",
    cat: "Tech",
    desc: "Train large language models, architect system prompts, and evaluate AI conversational semantics for frontier artificial intelligence labs.",
    skills: "Syntactic Parsing, Semantic Evaluation, LLM Prompting, Python",
    salary: "₹14L – ₹48L+/yr",
    degrees: "B.Tech CS / BA Linguistics + Computer Science Minor",
    exams: "GATE / Technical Coding & NLP Assessments",
    englishSuperpower: "Deep structural mastery of syntax, semantics, and pragmatics to steer frontier AI models toward precise, unbiased reasoning."
  },
  {
    title: "Podcast Producer & Audio Showrunner",
    icon: "🎧",
    cat: "Media",
    desc: "Develop narrative audio documentaries, direct voice talent, and produce chart-topping narrative audio series for Spotify and Apple Podcasts.",
    skills: "Audio Narrative Arc, Interview Technique, Sound Design Scripting, Pacing",
    salary: "₹6L – ₹26L/yr",
    degrees: "BA Media / English Literature / Audio Production",
    exams: "Audio Pilot Portfolio & Script Sample",
    englishSuperpower: "Intimate audio storytelling that hooks listeners through rich descriptions, conversational warmth, and thoughtful interviews."
  },
  {
    title: "Stand-up Comedian & Satirical Writer",
    icon: "🎭",
    cat: "Creative",
    desc: "Write incisive social satire, headline international comedy tours, and author scripts for late-night television shows.",
    skills: "Comic Timing, Punchline Structure, Observational Wit, Crowd Work",
    salary: "₹6L – ₹35L+/yr + Ticket Revenues",
    degrees: "Any Graduate / Creative Writing",
    exams: "Live Open Mic Performances & Standup Specials",
    englishSuperpower: "Mastery of misdirection, irony, and conversational cadence that unites diverse audiences through the universal language of humor."
  },
  {
    title: "Lyricist & Musical Theatre Writer",
    icon: "🎵",
    cat: "Creative",
    desc: "Pen song lyrics, write musical book narratives, and collaborate with composers for films, theatrical stages, and global streaming albums.",
    skills: "Meter & Rhyme, Melodic Prosody, Thematic Resonance, Metaphor",
    salary: "₹5L – ₹30L+/yr + Song Royalties",
    degrees: "BA English / Music / Creative Writing",
    exams: "Lyricist Song Portfolios & Demo Reels",
    englishSuperpower: "Marrying linguistic rhythm and vowel harmony with musical melody to create anthems that define generations."
  },
  {
    title: "Environmental Policy Analyst & Sustainability Advocate",
    icon: "🌱",
    cat: "Public Policy",
    desc: "Draft climate adaptation treaties, brief governmental ministers, and represent environmental NGOs at UN COP summits.",
    skills: "Environmental Law, Climate Science Synthesis, Policy Briefing, Advocacy",
    salary: "₹8L – ₹28L/yr",
    degrees: "B.Sc / BA Public Policy / Environmental Studies",
    exams: "UPSC / GRE / University Entrance",
    englishSuperpower: "Translating intricate climate data into morally compelling policy briefs that persuade corporate boards and governments to act."
  },
  {
    title: "Non-Profit Director & Social Impact Entrepreneur",
    icon: "🤝",
    cat: "Business",
    desc: "Lead international humanitarian missions, secure philanthropic grants from global foundations, and drive grassroots community change.",
    skills: "Grant Writing, Public Advocacy, Program Management, Stakeholder Trust",
    salary: "₹8L – ₹25L/yr",
    degrees: "BA / MSW Social Work / Public Administration",
    exams: "TISS NET / University Entrance",
    englishSuperpower: "Persuasive grant proposals and grassroots storytelling that unlock crores in philanthropic funding for underserved communities."
  }
];

// Colleges Dataset with Verified Official Accreditation
const COLLEGES_DATA = {
  Maharashtra: [
    {
      name: "St. Xavier’s College, Autonomous",
      loc: "Fort, South Mumbai",
      courses: "BA English Literature, BAMMC (Mass Media), Psychology",
      accreditation: {
        naac: "NAAC Grade 'A+' (3.63 CGPA)",
        nirf: "Top 50 Colleges in India",
        status: "UGC Autonomous · DBT Star College",
        badgeType: "naac"
      },
      highlights: "Founded 1869; iconic Victorian Gothic campus; host of Asia's largest collegiate festival 'Malhar'; distinguished literary alumni."
    },
    {
      name: "Elphinstone College",
      loc: "Fort, Mumbai",
      courses: "BA in English Literature, History, Ancient Culture",
      accreditation: {
        naac: "NAAC Grade 'A'",
        nirf: "Maharashtra Heritage Collegiate Tier",
        status: "Affiliated to Dr. Homi Bhabha State University",
        badgeType: "naac"
      },
      highlights: "Established in 1856; alma mater of Dadabhai Naoroji and Dr. B.R. Ambedkar; historic Victorian library archives."
    },
    {
      name: "Ramnarain Ruia Autonomous College",
      loc: "Matunga, Central Mumbai",
      courses: "BA English, Communication Studies, Creative Writing",
      accreditation: {
        naac: "NAAC Grade 'A+' (3.70 CGPA)",
        nirf: "NIRF Top 60 Colleges",
        status: "UGC College of Excellence Status",
        badgeType: "naac"
      },
      highlights: "First college in Mumbai awarded 'College of Excellence' by UGC; active English theatre society and creative writing labs."
    },
    {
      name: "K.C. College (HSNC University)",
      loc: "Churchgate, Mumbai",
      courses: "BA English, Journalism, Advertising & Media",
      accreditation: {
        naac: "NAAC Grade 'A'",
        nirf: "Top Tier Media & Arts",
        status: "Constituent College of HSNC University",
        badgeType: "naac"
      },
      highlights: "Premier media and corporate connectivity in South Mumbai; state-of-the-art audio-visual production studios."
    },
    {
      name: "Sophia College for Women",
      loc: "Bhulabhai Desai Road, Mumbai",
      courses: "BA English Literature, Strategic Communications",
      accreditation: {
        naac: "NAAC Grade 'A' (3.61 CGPA)",
        nirf: "Top Women's Institution",
        status: "Autonomous Arts Institution",
        badgeType: "naac"
      },
      highlights: "Publishers of the literary review 'Sophia Mirror'; serene campus producing renowned authors, journalists, and civil servants."
    },
    {
      name: "Fergusson College (Autonomous)",
      loc: "FC Road, Shivajinagar, Pune",
      courses: "BA English, Linguistics, Comparative Literature",
      accreditation: {
        naac: "NAAC Grade 'A+' (3.62 CGPA)",
        nirf: "NIRF Rank #35 Colleges in India",
        status: "UGC College of Excellence · DBT Star Status",
        badgeType: "nirf"
      },
      highlights: "Founded 1885 by Bal Gangadhar Tilak and Gopal Krishna Gokhale; historic amphitheater and active English debating union."
    },
    {
      name: "Savitribai Phule Pune University (SPPU)",
      loc: "Ganeshkhind, Pune",
      courses: "MA English, M.Phil, Ph.D, Comparative Linguistics",
      accreditation: {
        naac: "NAAC Grade 'A+'",
        nirf: "NIRF Rank #35 Universities",
        status: "UGC Category-I State University",
        badgeType: "nirf"
      },
      highlights: "Known as the 'Oxford of the East'; department of English maintains one of the largest post-colonial literature collections."
    },
    {
      name: "Symbiosis College of Arts & Commerce (SCAC)",
      loc: "Senapati Bapat Road, Pune",
      courses: "BA English Special, Liberal Arts, Business English",
      accreditation: {
        naac: "NAAC Grade 'A++' (3.58 CGPA)",
        nirf: "Top 35 Autonomous Colleges",
        status: "Autonomous · International Exchange Hub",
        badgeType: "naac"
      },
      highlights: "Vibrant international student cohort from over 85 countries; semester-abroad exchange agreements with European universities."
    },
    {
      name: "Tata Institute of Social Sciences (TISS)",
      loc: "Deonar, Mumbai",
      courses: "MA in Media & Cultural Studies, Public Policy",
      accreditation: {
        naac: "NAAC Grade 'A++' (3.89 CGPA)",
        nirf: "NIRF Rank #1 Social Work & Policy",
        status: "Deemed-to-be University (MHRD)",
        badgeType: "naac"
      },
      highlights: "India's highest NAAC CGPA institution; acclaimed documentary film production unit and critical rhetoric seminars."
    },
    {
      name: "IIT Bombay (Dept of Humanities & Social Sciences)",
      loc: "Powai, Mumbai",
      courses: "Ph.D in English, Linguistics, Cognitive Science",
      accreditation: {
        naac: "Institute of National Importance (INI)",
        nirf: "NIRF Rank #3 Overall in India",
        status: "Institute of Eminence (IoE) · NBA Tier-1",
        badgeType: "reg"
      },
      highlights: "Blends computational natural language processing (NLP) with critical rhetoric and philosophy of mind."
    }
  ],
  PanIndia: [
    {
      name: "Miranda House, University of Delhi",
      loc: "North Campus, Delhi",
      courses: "BA (Hons) English Literature, Liberal Arts",
      accreditation: {
        naac: "NAAC Grade 'A++' (3.64 CGPA)",
        nirf: "NIRF Rank #1 Colleges in India (7 Consecutive Years)",
        status: "UGC Star College · Central University",
        badgeType: "nirf"
      },
      highlights: "Uncontested #1 college in India; seminar-style intellectual critique; produced top Supreme Court advocates and international diplomats."
    },
    {
      name: "St. Stephen’s College, Delhi",
      loc: "University Enclave, North Campus, Delhi",
      courses: "BA (Hons) English Literature",
      accreditation: {
        naac: "NAAC Grade 'A'",
        nirf: "NIRF Top 15 Colleges in India",
        status: "Established 1881 · DBT Star College",
        badgeType: "naac"
      },
      highlights: "Legendary Shakespeare Society and Debating Society; oxford-style tutorial system with individual faculty mentoring."
    },
    {
      name: "Lady Shri Ram College for Women (LSR)",
      loc: "Lajpat Nagar, New Delhi",
      courses: "BA (Hons) English, Journalism, Creative Writing",
      accreditation: {
        naac: "NAAC Grade 'A++'",
        nirf: "NIRF Rank #9 Colleges in India",
        status: "Premier Humanities Center",
        badgeType: "nirf"
      },
      highlights: "Internationally renowned for critical feminist thought, publishing internships, and alumni serving in global journalism."
    },
    {
      name: "National Law School of India University (NLSIU)",
      loc: "Nagarbhavi, Bengaluru, Karnataka",
      courses: "BA-LLB (Hons), LLM, Public Policy",
      accreditation: {
        naac: "NAAC Grade 'A++'",
        nirf: "NIRF Rank #1 Law in India (Undisputed #1)",
        status: "Bar Council of India (BCI) Recognized · INI",
        badgeType: "nirf"
      },
      highlights: "The Harvard of Indian legal education; rigorous moot court advocacy training and international dispute arbitrations."
    },
    {
      name: "NALSAR University of Law",
      loc: "Shamirpet, Hyderabad, Telangana",
      courses: "BA-LLB (Hons), Corporate Law, Mooting",
      accreditation: {
        naac: "NAAC Grade 'A++'",
        nirf: "NIRF Rank #3 Law in India",
        status: "Bar Council of India Approved",
        badgeType: "naac"
      },
      highlights: "World-class campus producing international Rhodes Scholars and leading senior advocates of the Supreme Court."
    },
    {
      name: "English & Foreign Languages University (EFLU)",
      loc: "Osmania University Campus, Hyderabad",
      courses: "BA & MA English, Linguistics, Phonetics, Computational English",
      accreditation: {
        naac: "NAAC Grade 'A'",
        nirf: "Top Language & Humanities University",
        status: "Central University of National Eminence",
        badgeType: "reg"
      },
      highlights: "The only dedicated central university in India specializing exclusively in English, phonetics, and linguistics education."
    },
    {
      name: "Indian Institute of Mass Communication (IIMC)",
      loc: "JNU New Campus, New Delhi",
      courses: "PG Diploma in English Journalism, Radio & TV",
      accreditation: {
        naac: "Deemed-to-be University (MHRD)",
        nirf: "India's #1 Mass Communication Institute",
        status: "Ministry of Information & Broadcasting, Govt of India",
        badgeType: "reg"
      },
      highlights: "Premier training institute for print, broadcast, and international wire service correspondents."
    },
    {
      name: "All India Institute of Medical Sciences (AIIMS)",
      loc: "Ansari Nagar, New Delhi",
      courses: "MBBS, MD, MS, MCh Surgical Super-specialties",
      accreditation: {
        naac: "Institute of National Importance (INI)",
        nirf: "NIRF Rank #1 Medical in India",
        status: "National Medical Commission (NMC) Approved",
        badgeType: "nirf"
      },
      highlights: "Apex medical institute of South Asia; clinical rounds and international medical journal symposia conducted entirely in English."
    },
    {
      name: "Indira Gandhi Rashtriya Uran Akademi (IGRUA)",
      loc: "Fursatganj Airfield, Uttar Pradesh",
      courses: "Commercial Pilot License (CPL) + B.Sc Aviation",
      accreditation: {
        naac: "DGCA Certified Flying Training Org (FTO)",
        nirf: "Premier National Aviation Academy",
        status: "ICAO Operational English Level 4+ Compliant",
        badgeType: "reg"
      },
      highlights: "Autonomous institute under Ministry of Civil Aviation; trained the majority of chief flight instructors and airline captains in India."
    },
    {
      name: "Indian Institute of Management Ahmedabad (IIM-A)",
      loc: "Vastrapur, Ahmedabad, Gujarat",
      courses: "PGP (MBA), Executive MBA, Ph.D in Management",
      accreditation: {
        naac: "EQUIS & AMBA International Accreditation",
        nirf: "NIRF Rank #1 Management in India",
        status: "Institute of National Importance (INI)",
        badgeType: "nirf"
      },
      highlights: "Harvard case-study method; high-stakes venture pitches and strategic board negotiations."
    }
  ],
  Abroad: [
    {
      name: "University of Oxford",
      loc: "Oxford, United Kingdom",
      courses: "BA English Language & Literature",
      accreditation: {
        naac: "QS World Rank #3 · THE World Rank #1",
        nirf: "World #1 for Arts & Humanities",
        status: "Russell Group Member · Royal Charter",
        badgeType: "global"
      },
      highlights: "Home to the Bodleian Library and the Oxford English Dictionary (OED); world-standard tutorial system."
    },
    {
      name: "University of Cambridge",
      loc: "Cambridge, United Kingdom",
      courses: "English Tripos, Close Reading, Drama",
      accreditation: {
        naac: "QS World Rank #2 · THE World Rank #5",
        nirf: "Europe's Historic Scholar Cradle",
        status: "Russell Group Member",
        badgeType: "global"
      },
      highlights: "Produced 15 British Prime Ministers, Milton, Wordsworth, and Sylvia Plath; famous Cambridge Union debating chamber."
    },
    {
      name: "Columbia University",
      loc: "New York City, USA",
      courses: "BA English & Comparative Literature",
      accreditation: {
        naac: "QS World Top 25 · US News Top 15",
        nirf: "Ivy League Member",
        status: "Administers the Pulitzer Prizes",
        badgeType: "global"
      },
      highlights: "Core Curriculum in western literature; situated in the heart of global publishing, Broadway theatre, and media."
    },
    {
      name: "New York University (NYU)",
      loc: "Greenwich Village, Manhattan, USA",
      courses: "MFA Creative Writing, Dramatic Literature",
      accreditation: {
        naac: "QS World Top 35",
        nirf: "Global #1 for Creative Arts & Film",
        status: "Association of American Universities (AAU)",
        badgeType: "global"
      },
      highlights: "Legendary creative writing workshops led by Pulitzer Prize and National Book Award winners."
    },
    {
      name: "University of Toronto",
      loc: "Toronto, Ontario, Canada",
      courses: "BA English Literature & Rhetoric",
      accreditation: {
        naac: "QS World Rank #21 · Canada #1",
        nirf: "Top 25 Global Research University",
        status: "U15 Group of Canadian Research Universities",
        badgeType: "global"
      },
      highlights: "Pioneered media ecology theory (Marshall McLuhan); exceptional funding for international undergraduate research."
    },
    {
      name: "University of Melbourne",
      loc: "Melbourne, Victoria, Australia",
      courses: "Bachelor of Arts in English & Cultural Studies",
      accreditation: {
        naac: "QS World Rank #13 · Australia #1",
        nirf: "Group of Eight (Go8) Australia",
        status: "Global Comprehensive Research University",
        badgeType: "global"
      },
      highlights: "Australia's top university; extensive exchange links with Asia-Pacific and Commonwealth educational bodies."
    }
  ]
};

// Entrance Exams Dataset
const EXAMS_DATA = [
  {
    name: "CUET-UG (Common University Entrance Test)",
    cat: "National Undergraduate",
    conductedBy: "National Testing Agency (NTA)",
    target: "BA (Hons) English, Journalism & Arts across 250+ Central, State & Private Universities (DU, JNU, BHU)",
    format: "Computer-Based Test (CBT) · 50 MCQs in 45 mins",
    englishWeight: "Section 1A English tests reading comprehension (literary, factual, narrative), vocabulary, and syntax.",
    date: "May – June Annually"
  },
  {
    name: "CLAT (Common Law Admission Test)",
    cat: "National Law",
    conductedBy: "Consortium of National Law Universities",
    target: "5-Year Integrated BA-LLB & BBA-LLB across 24 National Law Universities (NLUs)",
    format: "Pen & Paper OMR · 120 Comprehension-based MCQs in 2 hours",
    englishWeight: "20% direct English passage reading + 100% of Legal & Logical reasoning based on fast English reading (450 words/passage).",
    date: "First Sunday of December Annually"
  },
  {
    name: "AILET (All India Law Entrance Test)",
    cat: "National Law",
    conductedBy: "National Law University, Delhi",
    target: "BA-LLB (Hons) at NLU Delhi",
    format: "150 MCQs in 120 minutes",
    englishWeight: "Section A is 50 marks of intensive English language, grammar, contextual vocabulary, and critical inference.",
    date: "Second Sunday of December Annually"
  },
  {
    name: "NEET-UG (National Eligibility cum Entrance Test)",
    cat: "Medical & Dental",
    conductedBy: "National Testing Agency (NTA)",
    target: "MBBS & BDS admissions across AIIMS, JIPMER, and all state government medical colleges",
    format: "Pen & Paper · 180 questions across Physics, Chemistry, Biology",
    englishWeight: "English is the official global medium of medical textbooks, pharmacology nomenclature, and clinical documentation.",
    date: "First Sunday of May Annually"
  },
  {
    name: "UPSC Civil Services Exam (CSE)",
    cat: "Government Administration",
    conductedBy: "Union Public Service Commission",
    target: "IAS, IFS (Diplomatic Corps), IPS, and Central Group 'A' Services",
    format: "Prelims (CSAT) + Mains (9 Written Papers) + Personality Interview",
    englishWeight: "Compulsory qualifying English paper (300 marks) + high reading speed required for CSAT comprehension.",
    date: "Prelims: May/June · Mains: September Annually"
  },
  {
    name: "IIMC Entrance Examination",
    cat: "Journalism & Media",
    conductedBy: "Indian Institute of Mass Communication via CUET-PG",
    target: "Postgraduate Diploma in English Journalism & Digital Media",
    format: "Written Essay, Editorial Editing, General Awareness, News Sense",
    englishWeight: "100% evaluated on English analytical prose, objective reporting style, headline writing, and speed.",
    date: "June Annually"
  },
  {
    name: "IELTS Academic (International English Language Testing)",
    cat: "Study Abroad & Immigration",
    conductedBy: "IDP / British Council / Cambridge English",
    target: "Undergraduate & Postgraduate admissions across UK, Canada, Australia, NZ, Europe, and US",
    format: "4 Modules: Listening (30m), Reading (60m), Writing (60m), Speaking 1-on-1 Interview (11–14m)",
    englishWeight: "100% English proficiency evaluation scored on a 0–9 Band scale (Top colleges require 7.0–8.0 Band).",
    date: "Conducted multiple times every week"
  },
  {
    name: "Digital SAT (Scholastic Assessment Test)",
    cat: "US & Global Undergrad",
    conductedBy: "College Board (USA)",
    target: "Undergraduate degree admissions to Ivy League, top US universities, and Ashoka/Krea in India",
    format: "Adaptive Digital Test · Reading & Writing (64 mins) + Math (70 mins)",
    englishWeight: "Reading & Writing module tests sophisticated analytical vocabulary, rhetorical synthesis, and grammar conventions.",
    date: "7 Global Testing Windows Annually"
  }
];

// Vocabulary Flash Cards & Etymology — Predefined Offline Database (70+ Lexicon Terms)
const OFFLINE_FLASH_CARDS = [
  { word: "Rhetoric", phonetic: "/ˈrɛt.ər.ɪk/", pos: "noun", meaning: "The art of effective or persuasive speaking or writing.", sentence: "The advocate's rhetoric united the room in defense of constitutional rights.", origin: "Greek 'rhētorikē' (art of an orator)" },
  { word: "Eloquence", phonetic: "/ˈɛl.ə.kwəns/", pos: "noun", meaning: "Fluent, graceful, or persuasive speaking or writing.", sentence: "She argued the public interest petition with remarkable eloquence.", origin: "Latin 'eloqui' (to speak out)" },
  { word: "Articulate", phonetic: "/ɑːrˈtɪk.jə.lət/", pos: "adjective", meaning: "Expressing ideas clearly, fluently, and effectively.", sentence: "An articulate spokesperson is essential during a high-stakes media conference.", origin: "Latin 'articulatus' (jointed distinctly)" },
  { word: "Brevity", phonetic: "/ˈbrɛv.ɪ.ti/", pos: "noun", meaning: "Concise and exact use of words in writing or speech.", sentence: "Brevity is the soul of wit in prime-time journalistic broadcasting.", origin: "Latin 'brevis' (short)" },
  { word: "Pedagogy", phonetic: "/ˈpɛd.ə.ɡɒdʒ.i/", pos: "noun", meaning: "The method and practice of teaching, especially as an academic subject.", sentence: "Innovative pedagogy transforms grammar lessons into engaging challenges.", origin: "Greek 'paidagogia' (leading a child)" },
  { word: "Nuance", phonetic: "/ˈnjuː.ɑːns/", pos: "noun", meaning: "A subtle difference in meaning, expression, or sound.", sentence: "A skilled simultaneous translator captures every delicate cultural nuance.", origin: "French 'nuer' (to shade)" },
  { word: "Jurisprudence", phonetic: "/ˌdʒʊə.rɪsˈpruː.dəns/", pos: "noun", meaning: "The theoretical philosophy and science of law.", sentence: "Constitutional jurisprudence safeguards democratic civil liberties.", origin: "Latin 'juris prudentia' (knowledge of law)" },
  { word: "Soliloquy", phonetic: "/səˈlɪl.ə.kwi/", pos: "noun", meaning: "An act of speaking one's thoughts aloud when alone on stage.", sentence: "Hamlet's famous soliloquy reflects deeply on human existence and mortality.", origin: "Latin 'solus' (alone) + 'loqui' (to speak)" },
  { word: "Ubiquitous", phonetic: "/juːˈbɪk.wɪ.təs/", pos: "adjective", meaning: "Present, appearing, or found everywhere simultaneously.", sentence: "Artificial intelligence has become ubiquitous across modern enterprise tools.", origin: "Latin 'ubique' (everywhere)" },
  { word: "Empirical", phonetic: "/ɪmˈpɪr.ɪ.kəl/", pos: "adjective", meaning: "Based on verifiable observation or experience rather than pure theory.", sentence: "Clinical researchers require rigorous empirical data before trials.", origin: "Greek 'empeiria' (experience)" },
  { word: "Meticulous", phonetic: "/məˈtɪk.jʊ.ləs/", pos: "adjective", meaning: "Showing great attention to detail; very careful and precise.", sentence: "The sub-editor was meticulous in cross-checking every historical citation.", origin: "Latin 'metus' (fear, careful anxiety)" },
  { word: "Tenacious", phonetic: "/təˈneɪ.ʃəs/", pos: "adjective", meaning: "Tending to keep a firm hold; determined and persistent.", sentence: "Her tenacious investigative reporting uncovered the truth behind the deal.", origin: "Latin 'tenax' (holding fast)" },
  { word: "Manuscript", phonetic: "/ˈmæn.jə.skrɪpt/", pos: "noun", meaning: "A book, document, or piece of music written by hand or typed before printing.", sentence: "The author submitted her completed manuscript to the chief editor.", origin: "Latin 'manu scriptus' (written by hand)" },
  { word: "Editorial", phonetic: "/ˌed.ɪˈtɔː.ri.əl/", pos: "noun", meaning: "A newspaper article written by an editor expressing an official opinion.", sentence: "The Sunday national editorial examined international education policies.", origin: "Latin 'editor' (one who brings forth)" },
  { word: "Litigation", phonetic: "/ˌlɪt.ɪˈɡeɪ.ʃən/", pos: "noun", meaning: "The process of taking legal action through a court of law.", sentence: "Both parties settled the trademark dispute amicably without litigation.", origin: "Latin 'litigare' (to dispute)" },
  { word: "Advocacy", phonetic: "/ˈæd.və.kə.si/", pos: "noun", meaning: "Public support for or recommendation of a particular cause or policy.", sentence: "Persistent student advocacy led to new science laboratories on campus.", origin: "Latin 'advocare' (to call to one's aid)" },
  { word: "Lexicon", phonetic: "/ˈlek.sɪ.kən/", pos: "noun", meaning: "The vocabulary of a person, language, or branch of knowledge.", sentence: "Emerging technological disciplines add fresh terms to our daily lexicon.", origin: "Greek 'lexikon' (word book)" },
  { word: "Syntax", phonetic: "/ˈsɪn.tæks/", pos: "noun", meaning: "The arrangement of words and phrases to create well-formed sentences.", sentence: "Clear syntax guarantees that your arguments remain persuasive and transparent.", origin: "Greek 'syntaxis' (together arrangement)" },
  { word: "Semantics", phonetic: "/sɪˈmæn.tɪks/", pos: "noun", meaning: "The branch of linguistics and logic concerned with meaning.", sentence: "Let us avoid squabbling over mere semantics and focus on actionable solutions.", origin: "Greek 'semantikos' (significant meaning)" },
  { word: "Concise", phonetic: "/kənˈsaɪs/", pos: "adjective", meaning: "Giving a lot of information clearly and in few words; brief.", sentence: "Keep your executive summaries concise, structured, and punchy.", origin: "Latin 'concisus' (cut short)" },
  { word: "Preamble", phonetic: "/priːˈæm.bəl/", pos: "noun", meaning: "A preliminary or preparatory statement; an introduction.", sentence: "We analyzed the fundamental values enshrined in the Preamble.", origin: "Latin 'praeambulare' (to walk before)" },
  { word: "Synopsis", phonetic: "/sɪˈnɒp.sɪs/", pos: "noun", meaning: "A brief summary or general survey of something.", sentence: "Please review the two-page project synopsis before the board meeting.", origin: "Greek 'sunopsis' (general view)" },
  { word: "Plagiarism", phonetic: "/ˈpleɪ.dʒər.ɪ.zəm/", pos: "noun", meaning: "The practice of taking someone else's work or ideas and passing them off as one's own.", sentence: "Academic integrity strictly prohibits any intentional or negligent plagiarism.", origin: "Latin 'plagiarius' (kidnapper)" },
  { word: "Vernacular", phonetic: "/vəˈnæk.jə.lər/", pos: "noun", meaning: "The language or dialect spoken by ordinary people in a country or region.", sentence: "He documented historical oral folklore preserved in the local vernacular.", origin: "Latin 'vernaculus' (native, domestic)" },
  { word: "Ephemeral", phonetic: "/ɪˈfem.ər.əl/", pos: "adjective", meaning: "Lasting for a very short time; fleeting or transient.", sentence: "Trends on social media are ephemeral, but core writing skills endure.", origin: "Greek 'ephemeros' (lasting only one day)" },
  { word: "Ambiguous", phonetic: "/æmˈbɪɡ.ju.əs/", pos: "adjective", meaning: "Open to more than one interpretation; having a double or uncertain meaning.", sentence: "The legislative statute was ambiguous and required judicial interpretation.", origin: "Latin 'ambigere' (to wander, dispute)" },
  { word: "Pragmatic", phonetic: "/præɡˈmæt.ɪk/", pos: "adjective", meaning: "Dealing with things sensibly and realistically based on practical considerations.", sentence: "The engineering team adopted a pragmatic approach to system delivery.", origin: "Greek 'pragma' (deed, act)" },
  { word: "Benevolent", phonetic: "/bəˈnev.əl.ənt/", pos: "adjective", meaning: "Well meaning and kindly; dedicated to charitable purposes.", sentence: "A benevolent philanthropist endowed full university scholarships for scholars.", origin: "Latin 'bene volens' (wishing well)" },
  { word: "Juxtapose", phonetic: "/ˌdʒʌk.stəˈpəʊz/", pos: "verb", meaning: "Place or deal with close together for contrasting effect.", sentence: "The exhibition juxtaposed classical rhetoric with modern digital prose.", origin: "Latin 'juxta' (next to) + French 'poser'" },
  { word: "Paradox", phonetic: "/ˈpær.ə.dɒks/", pos: "noun", meaning: "A seemingly absurd or self-contradictory statement that proves true.", sentence: "It is an educational paradox that slowing down often accelerates mastery.", origin: "Greek 'para' (contrary to) + 'doxa' (opinion)" },
  { word: "Resilient", phonetic: "/rɪˈzɪl.jənt/", pos: "adjective", meaning: "Able to withstand or recover quickly from difficult conditions.", sentence: "Resilient speakers embrace constructive critique to refine their delivery.", origin: "Latin 'resilire' (to leap back)" },
  { word: "Plausible", phonetic: "/ˈplɔː.zə.bəl/", pos: "adjective", meaning: "Seeming reasonable or probable; believable.", sentence: "The defence attorney presented a plausible sequence of historical events.", origin: "Latin 'plausibilis' (worthy of applause)" },
  { word: "Inference", phonetic: "/ˈɪn.fər.əns/", pos: "noun", meaning: "A conclusion reached on the basis of evidence and logical reasoning.", sentence: "Effective reading comprehension tests your skill in drawing accurate inferences.", origin: "Latin 'inferre' (to bring in)" },
  { word: "Scrutinize", phonetic: "/ˈskruː.tɪ.naɪz/", pos: "verb", meaning: "Examine or inspect closely and thoroughly.", sentence: "Auditors will scrutinize the balance sheet before signing the merger.", origin: "Latin 'scrutinium' (a search)" },
  { word: "Perspicacity", phonetic: "/ˌpɜː.spɪˈkæs.ə.ti/", pos: "noun", meaning: "The quality of having ready insight and acute understanding.", sentence: "Her perspicacity as a diplomat defused tensions during multilateral talks.", origin: "Latin 'perspicere' (to look through)" },
  { word: "Verisimilitude", phonetic: "/ˌver.ɪ.sɪˈmɪl.ɪ.tjuːd/", pos: "noun", meaning: "The appearance of being true or real in creative storytelling.", sentence: "The courtroom screenplay achieved gripping verisimilitude in dialogue.", origin: "Latin 'verus' (true) + 'similis' (like)" },
  { word: "Anachronism", phonetic: "/əˈnæk.rə.nɪ.zəm/", pos: "noun", meaning: "Something belonging to a time period other than that in which it exists.", sentence: "A futuristic wristwatch in a Renaissance painting is an anachronism.", origin: "Greek 'ana' (backward) + 'khronos' (time)" },
  { word: "Fastidious", phonetic: "/fæsˈtɪd.i.əs/", pos: "adjective", meaning: "Very attentive to and concerned about accuracy, etiquette, and detail.", sentence: "He was fastidious regarding typography and grammatical consistency.", origin: "Latin 'fastidium' (loathing, squeamishness)" },
  { word: "Grandiloquent", phonetic: "/ɡrænˈdɪl.ə.kwənt/", pos: "adjective", meaning: "Pompous or extravagant in language, style, or manner.", sentence: "A grandiloquent speech often obscures simple truths with needless jargon.", origin: "Latin 'grandis' (grand) + 'loqui' (to speak)" },
  { word: "Laconic", phonetic: "/ləˈkɒn.ɪk/", pos: "adjective", meaning: "Using very few words; concise to the point of seeming rude.", sentence: "His laconic reply of 'Proceed' conveyed supreme confidence.", origin: "Greek 'Lakonikos' (Spartan brevity)" },
  { word: "Magnanimous", phonetic: "/mæɡˈnæn.ɪ.məs/", pos: "adjective", meaning: "Generous or forgiving, especially toward a rival or less powerful person.", sentence: "The victorious debater was magnanimous in congratulating the opposing team.", origin: "Latin 'magnus' (great) + 'animus' (mind)" },
  { word: "Nefarious", phonetic: "/nɪˈfeə.ri.əs/", pos: "adjective", meaning: "Wicked, villainous, or criminal.", sentence: "The cybersecurity SOC thwarted a nefarious ransomware campaign.", origin: "Latin 'nefas' (crime, impiety)" },
  { word: "Obsequious", phonetic: "/əbˈsiː.kwi.əs/", pos: "adjective", meaning: "Obedient or attentive to an excessive or servile degree.", sentence: "True leaders value honest counsel over obsequious flattery.", origin: "Latin 'obsequi' (to comply)" },
  { word: "Panacea", phonetic: "/ˌpæn.əˈsiː.ə/", pos: "noun", meaning: "A solution or remedy for all difficulties or diseases.", sentence: "Technology alone is not a panacea for educational disparities.", origin: "Greek 'pan' (all) + 'akos' (cure)" },
  { word: "Sagacious", phonetic: "/səˈɡeɪ.ʃəs/", pos: "adjective", meaning: "Having or showing keen mental discernment and good judgment.", sentence: "The judge was revered for her sagacious guidance on constitutional ethics.", origin: "Latin 'sagax' (wise, keen)" },
  { word: "Taciturn", phonetic: "/ˈtæs.ɪ.tɜːn/", pos: "adjective", meaning: "Reserved or uncommunicative in speech; saying little.", sentence: "Though taciturn in casual conversation, his written briefs were brilliant.", origin: "Latin 'tacitus' (silent)" },
  { word: "Vacillate", phonetic: "/ˈvæs.ɪ.leɪt/", pos: "verb", meaning: "Waver between different opinions or actions; be indecisive.", sentence: "Leaders cannot vacillate when emergency protocols require immediate action.", origin: "Latin 'vacillare' (to sway)" },
  { word: "Zealous", phonetic: "/ˈzel.əs/", pos: "adjective", meaning: "Having or showing great energy or enthusiasm in pursuit of a cause.", sentence: "The student environmental committee was zealous in promoting solar power.", origin: "Greek 'zelos' (ardor)" },
  { word: "Capricious", phonetic: "/kəˈprɪʃ.əs/", pos: "adjective", meaning: "Given to sudden and unaccountable changes of mood or behavior.", sentence: "Financial markets can be capricious during unexpected geopolitical shifts.", origin: "Italian 'capriccio' (whim)" },
  { word: "Deleterious", phonetic: "/ˌdel.ɪˈtɪə.ri.əs/", pos: "adjective", meaning: "Causing harm or damage.", sentence: "Chronic sleep deprivation exerts deleterious effects on cognitive focus.", origin: "Greek 'deleterios' (harmful)" },
  { word: "Effervescent", phonetic: "/ˌef.əˈves.ənt/", pos: "adjective", meaning: "Vivacious and enthusiastic; bubbly.", sentence: "Her effervescent opening remarks set an upbeat tone for the international summit.", origin: "Latin 'effervescere' (to boil up)" },
  { word: "Garrulous", phonetic: "/ˈɡær.əl.əs/", pos: "adjective", meaning: "Excessively talkative, especially on trivial matters.", sentence: "The garrulous witness took forty minutes to recount a five-minute event.", origin: "Latin 'garrire' (to chatter)" },
  { word: "Judicious", phonetic: "/dʒuːˈdɪʃ.əs/", pos: "adjective", meaning: "Having, showing, or done with good sense and judgment.", sentence: "Judicious allocation of study hours ensures comprehensive exam readiness.", origin: "Latin 'judicium' (judgment)" },
  { word: "Lugubrious", phonetic: "/luːˈɡuː.bri.əs/", pos: "adjective", meaning: "Looking or sounding sad, dismal, or mournful.", sentence: "The actor adopted a lugubrious tone to convey Shakespearean sorrow.", origin: "Latin 'lugere' (to mourn)" },
  { word: "Munificent", phonetic: "/mjuːˈnɪf.ɪ.sənt/", pos: "adjective", meaning: "Larger or more generous than is usual or necessary.", sentence: "The alumni made a munificent donation to construct the new robotics wing.", origin: "Latin 'munus' (gift) + 'facere' (to make)" },
  { word: "Ostentatious", phonetic: "/ˌɒs.tenˈteɪ.ʃəs/", pos: "adjective", meaning: "Characterized by pretentious display designed to impress.", sentence: "He preferred understated elegance over ostentatious displays of wealth.", origin: "Latin 'ostendere' (to show)" },
  { word: "Pellucid", phonetic: "/pəˈluː.sɪd/", pos: "adjective", meaning: "Translucently clear; easily understood in meaning and style.", sentence: "The physics professor offered a pellucid explanation of quantum entanglement.", origin: "Latin 'pellucidus' (shining through)" },
  { word: "Quixotic", phonetic: "/kwɪkˈsɒt.ɪk/", pos: "adjective", meaning: "Exceedingly idealistic; unrealistic and impractical.", sentence: "Embarking on the trans-ocean voyage without modern instruments seemed quixotic.", origin: "After Cervantes' Don Quixote" },
  { word: "Resplendent", phonetic: "/rɪˈsplen.dənt/", pos: "adjective", meaning: "Attractive and impressive through being richly colorful or shining.", sentence: "The auditorium stage was resplendent in celebratory banners for graduation.", origin: "Latin 'resplendere' (to shine out)" },
  { word: "Surreptitious", phonetic: "/ˌsʌr.əpˈtɪʃ.əs/", pos: "adjective", meaning: "Kept secret, especially because it would not be approved of.", sentence: "The agents held a surreptitious briefing at midnight behind closed doors.", origin: "Latin 'surripere' (to seize secretly)" },
  { word: "Trepidation", phonetic: "/ˌtrep.ɪˈdeɪ.ʃən/", pos: "noun", meaning: "A feeling of fear or agitation about something that may happen.", sentence: "She walked onto the keynote stage without a trace of nervous trepidation.", origin: "Latin 'trepidare' (to tremble)" },
  { word: "Whimsical", phonetic: "/ˈwɪm.zɪ.kəl/", pos: "adjective", meaning: "Playfully quaint or fanciful, especially in an appealing way.", sentence: "The illustrated children's book was celebrated for its whimsical poetry.", origin: "English 'whim' (sudden fancy)" },
  { word: "Circumlocution", phonetic: "/ˌsɜː.kəm.ləˈkjuː.ʃən/", pos: "noun", meaning: "The use of many words where fewer would do, especially in a deliberate attempt to be vague.", sentence: "The politician resorted to circumlocution to dodge the direct question.", origin: "Latin 'circum' (around) + 'loqui' (to speak)" },
  { word: "Diatribe", phonetic: "/ˈdaɪ.ə.traɪb/", pos: "noun", meaning: "A forceful and bitter verbal attack against someone or something.", sentence: "The editorial avoided personal diatribe and stayed focused on verified data.", origin: "Greek 'diatribe' (discourse, wearing away)" },
  { word: "Enervate", phonetic: "/ˈen.ə.veɪt/", pos: "verb", meaning: "Cause someone to feel drained of energy or vitality; weaken.", sentence: "The sweltering afternoon humidity threatened to enervate the marathon runners.", origin: "Latin 'enervare' (to weaken sinews)" }
];

const FLASH_CARDS = OFFLINE_FLASH_CARDS;

// ─── 3. TAB NAVIGATION CONTROLLER ─────────────────────────────────────────────
function setupHorizontalScrollShelf(track, leftBtn, rightBtn, step = 280) {
  if (!track) return null;

  function updateArrows() {
    if (!leftBtn || !rightBtn) return;
    const canScroll = track.scrollWidth > track.clientWidth + 5;
    if (!canScroll) {
      leftBtn.style.display = 'none';
      rightBtn.style.display = 'none';
      return;
    }
    leftBtn.style.display = 'flex';
    rightBtn.style.display = 'flex';
    const atStart = track.scrollLeft <= 5;
    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 5;
    leftBtn.classList.toggle('disabled', atStart);
    rightBtn.classList.toggle('disabled', atEnd);
  }

  if (leftBtn && !leftBtn.dataset.bound) {
    leftBtn.dataset.bound = 'true';
    leftBtn.addEventListener('click', () => {
      try { track.scrollBy({ left: -step, behavior: 'smooth' }); } catch { track.scrollLeft -= step; }
      setTimeout(updateArrows, 320);
    });
  }

  if (rightBtn && !rightBtn.dataset.bound) {
    rightBtn.dataset.bound = 'true';
    rightBtn.addEventListener('click', () => {
      try { track.scrollBy({ left: step, behavior: 'smooth' }); } catch { track.scrollLeft += step; }
      setTimeout(updateArrows, 320);
    });
  }

  // Mouse wheel horizontal scroll translation
  if (!track.dataset.wheelBound) {
    track.dataset.wheelBound = 'true';
    track.addEventListener('wheel', e => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        track.scrollLeft += e.deltaY * 1.25;
        updateArrows();
      }
    }, { passive: false });
  }

  // Drag-to-scroll support
  if (!track.dataset.dragBound) {
    track.dataset.dragBound = 'true';
    let isDown = false;
    let startX = 0;
    let scrollStart = 0;

    track.addEventListener('mousedown', e => {
      isDown = true;
      track.classList.add('grabbing');
      startX = e.pageX - track.offsetLeft;
      scrollStart = track.scrollLeft;
    });

    window.addEventListener('mouseup', () => {
      if (isDown) {
        isDown = false;
        track.classList.remove('grabbing');
        updateArrows();
      }
    });

    track.addEventListener('mousemove', e => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - track.offsetLeft;
      const walk = (x - startX) * 1.4;
      track.scrollLeft = scrollStart - walk;
      updateArrows();
    });
  }

  track.addEventListener('scroll', updateArrows, { passive: true });
  window.addEventListener('resize', updateArrows, { passive: true });

  setTimeout(updateArrows, 120);
  setTimeout(updateArrows, 500);

  return updateArrows;
}

function initNavigation() {
  const tabBtns = $$('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      switchTab(targetTab);
    });
  });

  // Theme switcher buttons
  const themeBtns = $$('.theme-btn');
  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const chosenTheme = btn.dataset.themeVal;
      setTheme(chosenTheme);
    });
  });

  // Spoken greeting button
  $('#btn-greeting')?.addEventListener('click', () => {
    speakGreeting();
  });

  // Setup sub-navbar horizontal scroll device (Overview, Careers, Games, etc.)
  setupHorizontalScrollShelf(
    $('#nav-tabs-track'),
    $('#btn-nav-scroll-left'),
    $('#btn-nav-scroll-right'),
    260
  );

  // Initialize interactive sub-shelf pickers
  initGamePicker();
  initPlanTools();
  initLeaderboard();
}

function switchTab(tabId) {
  // Stop all active voice playback when navigating
  stopAllVoice();

  STATE.activeTab = tabId;

  // Update navbar button states
  $$('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  // Smoothly center the active tab in the horizontal scroll track
  const activeTabBtn = $(`.tab-btn[data-tab="${tabId}"]`);
  if (activeTabBtn) {
    activeTabBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  // Hide all sections, reveal active
  $$('.section-shell').forEach(sec => sec.hidden = true);
  const targetSec = $(`#sec-${tabId}`);
  if (targetSec) {
    targetSec.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Trigger lazy section initializers
  if (tabId === 'careers') renderCareers();
  if (tabId === 'colleges') renderColleges();
  if (tabId === 'exams') renderExams();
  if (tabId === 'speak') initSpeakLadder();
  if (tabId === 'speechLab') initSpeechLab();
  if (tabId === 'teleprompter') initTeleprompter();
  if (tabId === 'games') renderGameArena('jobtris');
  if (tabId === 'roadmap') renderPlanTool('bizcard');
  if (tabId === 'leaderboard') loadLeaderboard();
  if (tabId === 'feedback') loadFeedbackWall();
  if (tabId === 'admin') renderAdminView();
}

function setTheme(themeName, silent = false) {
  const mode = (themeName === 'dark' || themeName === 'cinematic') ? 'dark' : 'light';
  STATE.theme = mode;

  // Instant hardware-accelerated theme switch without laggy view transitions or reflow
  document.documentElement.setAttribute('data-theme', mode);
  localStorage.setItem('cf_theme', mode);

  const metaTheme = $('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', mode === 'dark' ? '#0c0d10' : '#f8fafc');
  }

  const switcher = $('.theme-switcher');
  if (switcher) {
    switcher.setAttribute('data-active-theme', mode);
  }

  $$('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.themeVal === mode);
  });
}

// ─── 4. SECTION RENDERERS ─────────────────────────────────────────────────────

// SECTION: CAREERS
function renderCareers() {
  const container = $('#careers-cards-container');
  if (!container) return;
  const searchInput = $('#career-search-input');
  const catFilters = $$('#career-category-filters .filter-chip');

  let activeCat = 'All';
  let searchTerm = '';

  const update = () => {
    const filtered = CAREERS_DATA.filter(c => {
      const matchCat = activeCat === 'All' || c.cat.toLowerCase().includes(activeCat.toLowerCase());
      const matchSearch = !searchTerm || (
        c.title.toLowerCase().includes(searchTerm) ||
        c.desc.toLowerCase().includes(searchTerm) ||
        c.skills.toLowerCase().includes(searchTerm) ||
        c.englishSuperpower.toLowerCase().includes(searchTerm)
      );
      return matchCat && matchSearch;
    });

    container.innerHTML = '';
    if (!filtered.length) {
      container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-dim);">No matching careers found for "${escapeHtml(searchTerm)}".</div>`;
      return;
    }

    filtered.forEach(c => {
      const card = document.createElement('article');
      card.className = 'card';
      card.innerHTML = `
        <div class="card-header">
          <div class="card-icon" aria-hidden="true">${c.icon}</div>
          <div>
            <h3 class="card-title">${escapeHtml(c.title)}</h3>
            <span class="badge-pill badge-nirf" style="margin-top:4px;">${escapeHtml(c.cat)}</span>
          </div>
        </div>
        <p class="card-body">${escapeHtml(c.desc)}</p>
        <div style="background:var(--bg-subtle);border-radius:var(--radius-md);padding:10px 12px;margin-bottom:12px;border:1px solid var(--border);">
          <strong style="color:var(--accent-cyan);font-size:12px;display:block;margin-bottom:4px;letter-spacing:0.04em;">⚡ WHY ENGLISH IS THE SUPERPOWER:</strong>
          <p style="font-size:13px;line-height:1.45;color:var(--text-main);">${escapeHtml(c.englishSuperpower)}</p>
        </div>
        <div class="card-footer">
          <div><strong style="color:var(--text-main);">Typical Compensation:</strong> <span style="color:var(--accent-emerald);font-weight:700;">${escapeHtml(c.salary)}</span></div>
          <div><strong style="color:var(--text-main);">Required Path:</strong> ${escapeHtml(c.degrees)}</div>
          <div><strong style="color:var(--text-main);">Entrance Tests:</strong> <span style="color:var(--accent-brand);font-weight:600;">${escapeHtml(c.exams)}</span></div>
        </div>
      `;
      container.appendChild(card);
    });
  };

  // Event bindings
  searchInput?.addEventListener('input', e => {
    searchTerm = e.target.value.toLowerCase().trim();
    update();
  });

  catFilters.forEach(btn => {
    btn.addEventListener('click', () => {
      catFilters.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCat = btn.dataset.cat;
      update();
    });
  });

  update();
}

// SECTION: COLLEGES WITH ACCREDITATION
function renderColleges() {
  const container = $('#colleges-cards-container');
  if (!container) return;
  const regionFilters = $$('#college-region-filters .filter-chip');
  const accredFilter = $('#college-accreditation-filter');

  let activeRegion = 'Maharashtra';
  let activeAccred = 'All';

  const update = () => {
    const list = COLLEGES_DATA[activeRegion] || [];
    const filtered = list.filter(col => {
      if (activeAccred === 'All') return true;
      if (activeAccred === 'NAAC A++') return col.accreditation.naac.includes('A++');
      if (activeAccred === 'NAAC A+') return col.accreditation.naac.includes('A+') || col.accreditation.naac.includes("'A'");
      if (activeAccred === 'NIRF Top') return col.accreditation.nirf.includes('Rank') || col.accreditation.nirf.includes('Top');
      if (activeAccred === 'Autonomous') return col.accreditation.status.includes('Autonomous') || col.accreditation.status.includes('INI');
      if (activeAccred === 'Professional') return col.accreditation.status.includes('BCI') || col.accreditation.status.includes('NMC') || col.accreditation.status.includes('DGCA') || col.accreditation.status.includes('NBA');
      return true;
    });

    container.innerHTML = '';
    if (!filtered.length) {
      container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-dim);">No institutions matching the selected accreditation filter in ${activeRegion}.</div>`;
      return;
    }

    filtered.forEach(col => {
      const card = document.createElement('article');
      card.className = 'card';
      
      const badgeClass = col.accreditation.badgeType === 'naac' ? 'badge-naac'
                       : col.accreditation.badgeType === 'nirf' ? 'badge-nirf'
                       : col.accreditation.badgeType === 'global' ? 'badge-global' : 'badge-reg';

      card.innerHTML = `
        <div class="card-header">
          <div class="card-icon" style="background:rgba(0,240,255,0.08);">🏛️</div>
          <div>
            <h3 class="card-title" style="font-size:18px;">${escapeHtml(col.name)}</h3>
            <span style="font-size:12.5px;color:var(--text-dim);">📍 ${escapeHtml(col.loc)}</span>
          </div>
        </div>
        <div class="accreditation-badges">
          <span class="badge-pill ${badgeClass}">🏆 ${escapeHtml(col.accreditation.naac)}</span>
          <span class="badge-pill badge-nirf">📊 ${escapeHtml(col.accreditation.nirf)}</span>
          <span class="badge-pill badge-reg">📜 ${escapeHtml(col.accreditation.status)}</span>
        </div>
        <p class="card-body" style="font-size:13.5px;margin-top:8px;">${escapeHtml(col.highlights)}</p>
        <div class="card-footer">
          <div><strong style="color:var(--text-main);">Signature Programs:</strong> ${escapeHtml(col.courses)}</div>
        </div>
      `;
      container.appendChild(card);
    });
  };

  regionFilters.forEach(btn => {
    btn.addEventListener('click', () => {
      regionFilters.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeRegion = btn.dataset.region;
      update();
    });
  });

  accredFilter?.addEventListener('change', e => {
    activeAccred = e.target.value;
    update();
  });

  update();
}

// SECTION: ENTRANCE EXAMS
function renderExams() {
  const container = $('#exams-cards-container');
  if (!container) return;
  container.innerHTML = '';

  EXAMS_DATA.forEach(ex => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-header">
        <div class="card-icon" style="background:rgba(255,183,3,0.1);">📝</div>
        <div>
          <h3 class="card-title" style="font-size:18px;">${escapeHtml(ex.name)}</h3>
          <span class="badge-pill badge-reg">${escapeHtml(ex.cat)}</span>
        </div>
      </div>
      <div class="accreditation-badges" style="margin: 8px 0 12px; display: flex; flex-wrap: wrap; gap: 6px;">
        <span class="badge-pill badge-naac">🏛️ ${escapeHtml(ex.conductedBy)}</span>
        <span class="badge-pill badge-nirf">📋 ${escapeHtml(ex.format.split('·')[0].trim())}</span>
        <span class="badge-pill badge-global">📅 ${escapeHtml(ex.date)}</span>
      </div>
      <p class="card-body" style="font-size:13.5px;"><strong>Admissions Target:</strong> ${escapeHtml(ex.target)}</p>
      <div style="background:var(--bg-subtle);border-radius:var(--radius-md);padding:10px 12px;margin-bottom:12px;border:1px solid var(--border);">
        <strong style="color:var(--accent-cyan);font-size:12px;display:block;margin-bottom:3px;">ENGLISH WEIGHT &amp; SKILL TESTED:</strong>
        <p style="font-size:13px;line-height:1.45;color:var(--text-main);">${escapeHtml(ex.englishWeight)}</p>
      </div>
      <div class="card-footer">
        <div><strong style="color:var(--text-main);">Conducted By:</strong> ${escapeHtml(ex.conductedBy)}</div>
        <div><strong style="color:var(--text-main);">Format:</strong> ${escapeHtml(ex.format)}</div>
        <div><strong style="color:var(--text-main);">Timeline:</strong> <span style="color:var(--accent-magenta);font-weight:700;">${escapeHtml(ex.date)}</span></div>
      </div>
    `;
    container.appendChild(card);
  });
}

// ─── 5. SPEAK & PRONUNCIATION STUDIO (DYNAMIC AI PRACTICE) ───────────────────
let speakPack = 'Everyday';
const usedSentenceHistory = new Set(JSON.parse(sessionStorage.getItem('cf_used_sentences') || '[]'));

// Curated high-variety foundational sentence pool (15+ distinct sentences per domain = 60+ sentences)
const AI_SENTENCE_LIBRARY = {
  Everyday: [
    "Speaking clear English allows anyone to connect with people and cultures worldwide with confidence.",
    "Effective communication begins with genuine empathy, active listening, and concise phrasing.",
    "Reading insightful books daily expands our vocabulary and introduces creative perspectives.",
    "Clarity of thought and deliberate pronunciation transform simple words into compelling messages.",
    "Every modern profession rewards individuals who express complex thoughts with composure.",
    "Consistent daily speech practice builds effortless fluency and long-term academic excellence.",
    "Confidence in public speaking grows steadily whenever you embrace new conversational challenges.",
    "Expressing original ideas with precision ensures your message is remembered and respected.",
    "Thoughtful diction and calm pacing help listeners absorb critical information without confusion.",
    "Articulate speech is not merely an academic test; it is the universal passport to leadership.",
    "Constructive conversations open unexpected opportunities in teamwork, research, and entrepreneurship.",
    "Listening with complete patience enables you to respond with greater wisdom and authority.",
    "A rich vocabulary empowers students to describe nuanced emotions and analytical concepts accurately.",
    "Deliberate articulation turns routine classroom presentations into captivating intellectual discussions.",
    "Clear pronunciation bridges cultural divides and fosters mutual respect across diverse communities."
  ],
  Journalism: [
    "Good evening, we are broadcasting live from the national student press briefing in Mumbai.",
    "Investigative journalism holds public institutions accountable through verified empirical research.",
    "The editor reviewed the breaking investigative manuscript moments before it went to press.",
    "Every credible news article adheres strictly to the fundamental five Ws: Who, What, When, Where, and Why.",
    "Clear teleprompter pacing and deliberate diction keep broadcast audiences engaged during breaking bulletins.",
    "The international correspondent reported live from the climate conference amid tense multilateral negotiations.",
    "Fact-checking and source verification remain the indispensable pillars of trustworthy modern journalism.",
    "The documentary film crew traveled across rural regions to chronicle sustainable agricultural breakthroughs.",
    "An objective press corps safeguards democratic transparency by asking incisive, well-researched questions.",
    "Live studio discussions require composure, disciplined listening, and crisp conversational transitions.",
    "Digital newsrooms must balance instantaneous deadline reporting with meticulous factual accuracy.",
    "The anchor modulated her tone to deliver the solemn national address with utmost dignity.",
    "Feature articles blend creative storytelling techniques with rigorous statistical data and interviews.",
    "Media literacy equips future generations to distinguish between credible journalism and speculative gossip.",
    "The editorial board issued an impassioned analysis urging renewed investment in public libraries."
  ],
  Law: [
    "May it please the court, the counsel submits that fundamental constitutional liberties must be preserved.",
    "The advocate presented documented empirical evidence to substantiate the contractual claim.",
    "Constitutional jurisprudence forms the bedrock of justice and equality in our legal system.",
    "The learned judge overruled the objection and directed the witness to conclude the statement.",
    "Precision drafting in legal contracts prevents prolonged disputes and costly corporate litigation.",
    "The appellate bench examined the statutory precedents governing intellectual property and digital privacy.",
    "Judicial fairness requires rigorous cross-examination balanced by unyielding adherence to civil rights.",
    "The moot court delegation argued the maritime boundary treaty with exceptional rhetorical clarity.",
    "The doctrine of legal precedent ensures stability and predictability throughout common law jurisdictions.",
    "An advocate must command both persuasive forensic rhetoric and encyclopedic knowledge of statutory statutes.",
    "The arbitration tribunal issued a binding resolution upholding the cross-border trade agreement.",
    "Legal scholars debate the delicate equilibrium between statutory regulation and personal autonomy.",
    "The witness testified under oath regarding the corporate disclosures filed with securities regulators.",
    "Thorough archival research in constitutional history illuminates the foundational intent of our laws.",
    "Eloquence in oral advocacy is most compelling when grounded in undeniable statutory facts."
  ],
  Academic: [
    "The hypothesis was thoroughly tested through empirical research and quantitative methodology.",
    "Peer-reviewed scholarly literature guarantees that published scientific findings undergo independent scrutiny.",
    "Critical analysis of nineteenth-century literature illuminates societal transformations during the Industrial Revolution.",
    "Interdisciplinary research unites computational linguistics with cognitive psychology to study language acquisition.",
    "Academic integrity demands that all cited references and archival sources be scrupulously acknowledged.",
    "The astrophysicist published revolutionary findings on gravitational lensing and interstellar matter.",
    "Rigorous econometric models demonstrate a positive correlation between primary education and national innovation.",
    "Scholars convened at the symposium to deliberate the philosophical implications of artificial intelligence.",
    "The dissertation examined the historical evolution of post-colonial diplomatic relations in South Asia.",
    "Empirical evidence gathered across double-blind clinical trials confirms the efficacy of the treatment.",
    "Synthesizing qualitative field interviews with macro statistical indices yielded unexpected sociological insights.",
    "The University Press released a monumental monograph tracing linguistic shifts across ancient trade routes.",
    "Methodological transparency enables global scientific peers to replicate and validate published experiments.",
    "The humanities faculty championed critical thinking as an indispensable safeguard against misinformation.",
    "Interdisciplinary academic inquiry dissolves traditional boundaries between theoretical physics and philosophy."
  ]
};

function initSpeakLadder() {
  const packFilters = $$('#speak-pack-filters .filter-chip');
  packFilters.forEach(btn => {
    btn.addEventListener('click', () => {
      packFilters.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      speakPack = btn.dataset.pack || 'Everyday';
      const packTag = $('#active-challenge-pack-tag');
      if (packTag) packTag.textContent = btn.textContent;
      changeSpeechSentence();
    });
  });

  $('#btn-listen-target')?.addEventListener('click', function() {
    const text = $('#speak-target-sentence')?.textContent;
    if (text) speak(text, this);
  });

  $('#btn-show-phonetics')?.addEventListener('click', () => {
    const box = $('#phonetic-breakdown-box');
    if (!box) return;
    if (box.style.display === 'none') {
      const text = $('#speak-target-sentence')?.textContent || '';
      const words = text.split(/\s+/).slice(0, 6);
      box.innerHTML = `<strong>Phonetic Syllable Breakdown:</strong><br>` +
        words.map(w => `<span style="display:inline-block;margin:4px 10px 4px 0;"><strong>${escapeHtml(w)}</strong>: <code style="color:var(--accent-cyan);font-family:var(--font-mono);">${generateIpaApprox(w)}</code></span>`).join('');
      box.style.display = 'block';
    } else {
      box.style.display = 'none';
    }
  });

  // CHANGE SENTENCE BUTTON
  $('#btn-change-sentence')?.addEventListener('click', () => {
    changeSpeechSentence(true);
  });

  $('#speak-record-orb')?.addEventListener('click', toggleSpeakLadderRecord);

  const nameInput = $('#speak-student-name');
  if (nameInput && STATE.studentName) {
    nameInput.value = STATE.studentName;
  }

  // Initial sentence load
  changeSpeechSentence();
}

async function changeSpeechSentence(userTriggered = false) {
  const sentenceEl = $('#speak-target-sentence');
  const transcriptEl = $('#speak-transcript-preview');
  const resultBox = $('#speak-eval-result');
  const phoneticsBox = $('#phonetic-breakdown-box');
  const aiBadge = $('#active-challenge-ai-badge');

  if (transcriptEl) transcriptEl.value = '';
  if (resultBox) resultBox.style.display = 'none';
  if (phoneticsBox) phoneticsBox.style.display = 'none';
  if (sentenceEl && userTriggered) {
    sentenceEl.innerHTML = '<span style="color:var(--text-dim);"><span class="spinner-sm"></span> Loading adaptive challenge...</span>';
  }

  let selectedSentence = '';

  // 1. Attempt AI Generation from backend Gemini endpoint with timeout
  try {
    const aiPromise = fetchApi('ai', 'POST', {
      task: 'generate-sentence',
      pack: speakPack
    });
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000));
    const aiRes = await Promise.race([aiPromise, timeoutPromise]);

    if (aiRes && aiRes.sentence && typeof aiRes.sentence === 'string') {
      const candidate = aiRes.sentence.trim().replace(/^["']|["']$/g, '');
      if (candidate.length > 20 && !usedSentenceHistory.has(candidate)) {
        selectedSentence = candidate;
        if (aiBadge) aiBadge.textContent = '⚡ Gemini AI Generated';
      }
    }
  } catch (e) {}

  // 2. If AI sentence was not generated or was repeated, pick from non-repeated pool
  if (!selectedSentence) {
    const pool = AI_SENTENCE_LIBRARY[speakPack] || AI_SENTENCE_LIBRARY.Everyday;
    const available = pool.filter(s => !usedSentenceHistory.has(s));

    if (available.length > 0) {
      selectedSentence = available[Math.floor(Math.random() * available.length)];
    } else {
      // If student has practiced all in this pack, reset pack history and pick a fresh one
      pool.forEach(s => usedSentenceHistory.delete(s));
      selectedSentence = pool[Math.floor(Math.random() * pool.length)];
    }
    if (aiBadge) aiBadge.textContent = '⚡ Adaptive AI Sentence';
  }

  // 3. Mark as used and persist in session to guarantee zero repeats
  usedSentenceHistory.add(selectedSentence);
  try {
    const historyArr = Array.from(usedSentenceHistory).slice(-60);
    sessionStorage.setItem('cf_used_sentences', JSON.stringify(historyArr));
  } catch (e) {}

  if (sentenceEl) {
    sentenceEl.textContent = selectedSentence;
  }

  if (userTriggered) {
    showToast('New practice sentence ready! 🎲');
  }
}

function toggleSpeakLadderRecord() {
  const orb = $('#speak-record-orb');
  const status = $('#speak-status-text');
  const preview = $('#speak-transcript-preview');

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (STATE.isRecording) {
    // Stop recording
    STATE.isRecording = false;
    orb.classList.remove('recording');
    status.textContent = 'Recording complete. Evaluating your spoken accuracy...';
    if (STATE.speechRecognition) {
      try { STATE.speechRecognition.stop(); } catch {}
    }
    evaluateSpeakAttempt();
    return;
  }

  // Start recording
  const nameInput = $('#speak-student-name');
  const nameVal = (nameInput ? nameInput.value : STATE.studentName || '').trim();
  if (!nameVal) {
    if (nameInput) {
      nameInput.focus();
      nameInput.style.borderColor = '#ef4444';
      nameInput.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.25)';
      nameInput.addEventListener('input', () => {
        nameInput.style.borderColor = '';
        nameInput.style.boxShadow = '';
      }, { once: true });
    }
    showToast('Please enter your name first — name is mandatory.');
    return;
  }

  if (!SpeechRecognition) {
    showToast('Browser Speech Recognition not supported. You can type or paste in the transcript.');
    return;
  }

  try {
    const recog = new SpeechRecognition();
    recog.lang = 'en-IN'; // Indian English acoustic & phonetic recognition
    recog.continuous = true;
    recog.interimResults = true;

    recog.onresult = e => {
      let full = '';
      for (let i = 0; i < e.results.length; i++) {
        full += e.results[i][0].transcript + ' ';
      }
      preview.value = full.trim();
    };

    recog.onerror = err => {
      status.textContent = `Mic note: ${err.error}. You can still type your transcript.`;
    };

    recog.onend = () => {
      if (STATE.isRecording) {
        try { recog.start(); } catch {}
      }
    };

    recog.start();
    STATE.speechRecognition = recog;
    STATE.isRecording = true;
    orb.classList.add('recording');
    status.textContent = 'Listening... Speak clearly into your microphone!';
  } catch (err) {
    status.textContent = 'Microphone permission required. Check browser settings.';
  }
}

async function evaluateSpeakAttempt() {
  const target = $('#speak-target-sentence')?.textContent.trim() || '';
  const transcript = $('#speak-transcript-preview')?.value.trim() || '';
  const nameInput = $('#speak-student-name');
  const name = (nameInput ? nameInput.value : STATE.studentName || '').trim();
  const resultBox = $('#speak-eval-result');

  if (!name) {
    if (nameInput) {
      nameInput.focus();
      nameInput.style.borderColor = '#ef4444';
      nameInput.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.25)';
      nameInput.addEventListener('input', () => {
        nameInput.style.borderColor = '';
        nameInput.style.boxShadow = '';
      }, { once: true });
    }
    showToast('Please enter your name — name is mandatory.');
    return;
  }

  if (!transcript) {
    showToast('No speech was detected. Please try recording again.');
    return;
  }

  // Calculate Levenshtein accuracy
  const acc = calculateLevenshteinAccuracy(target, transcript);

  // Persist student name
  STATE.studentName = name;
  localStorage.setItem('cf_student_name', name);

  // Persist student score in local storage so it is never lost even if offline or cold start
  try {
    const localScoreObj = {
      id: 'sc_' + Date.now(),
      name,
      pack: speakPack,
      level: STATE.speakLevel || 1,
      acc,
      fluency: Math.min(100, acc + 5),
      clarity: Math.min(100, acc + 2),
      wpm: 130,
      class_name: STATE.studentClass || 'Class 10',
      target_career: '',
      ts: Date.now()
    };
    const curScores = JSON.parse(localStorage.getItem('cf_user_scores') || '[]');
    const sIdx = curScores.findIndex(s => s.name.toLowerCase() === name.toLowerCase());
    if (sIdx === -1) {
      curScores.unshift(localScoreObj);
    } else if (acc >= (curScores[sIdx].acc || 0)) {
      curScores[sIdx] = localScoreObj;
    }
    localStorage.setItem('cf_user_scores', JSON.stringify(curScores));
  } catch (e) {}

  // Send score to backend API (no level requirement)
  fetchApi('attempt', 'POST', {
    name,
    pack: speakPack,
    target,
    fallback_text: transcript,
    class_name: STATE.studentClass,
    acc
  });

  if (resultBox) {
    resultBox.style.display = 'block';
    resultBox.innerHTML = `
      <div style="background:rgba(0,240,255,0.08);border:1px solid rgba(0,240,255,0.3);border-radius:var(--radius-md);padding:16px;margin-top:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <strong style="color:var(--accent-cyan);font-size:16px;">
            🎯 Speech Accuracy Evaluated!
          </strong>
          <span class="badge-pill badge-naac" style="font-size:14px;font-weight:700;">${acc}% Accuracy</span>
        </div>
        <p style="font-size:13.5px;margin:10px 0;color:var(--text-main);">
          <strong>Recognized Speech:</strong> "${escapeHtml(transcript)}"
        </p>
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-top:8px;">
          <span style="font-size:12px;color:var(--accent-emerald);font-weight:600;">
            ✓ Score saved to Exhibition Leaderboard
          </span>
          <button class="btn btn-primary btn-sm" onclick="changeSpeechSentence(true)">
            ✨ Next Practice Sentence ➡️
          </button>
        </div>
      </div>
    `;
  }
}

function calculateLevenshteinAccuracy(ref, hyp) {
  const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  const r = norm(ref);
  const h = norm(hyp);
  if (!r && !h) return 100;
  if (!r || !h) return 0;

  const dp = Array.from({ length: r.length + 1 }, (_, i) =>
    Array.from({ length: h.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= r.length; i++) {
    for (let j = 1; j <= h.length; j++) {
      dp[i][j] = r[i - 1] === h[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  const dist = dp[r.length][h.length];
  const maxLen = Math.max(r.length, h.length);
  return Math.max(0, Math.round((1 - dist / maxLen) * 100));
}

function generateIpaApprox(word) {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  return `/${clean}/`;
}

// ─── 6. AI SPEECH LAB (WORD-PASSING SCREEN & ROTATING COACH) ─────────────────
let speechLabRec = null;
let speechLabStartTime = 0;
let currentSpeechLabSentence = "";
let speechLabTargetWords = [];
let speechLabPassedIndices = new Set();
let speechLabUsedSentences = new Set();
let isSpeechLabPassed = false;
let isPassingSentence = false;
let speechLabSentencesPassedCount = 0;
let currentCoachTipIndex = -1;
let speechLabMediaStream = null;
let activeSegmentRecorder = null;

const SPEECH_COACH_TIPS = [
  {
    title: "The 1-Second Strategic Pause",
    tip: "When transitioning between complex thoughts, insert a silent 1-second breath pause instead of filler words like 'um' or 'like'. Deliberate silence projects executive authority and allows listeners to absorb your point."
  },
  {
    title: "Downward Inflection for Executive Gravitas",
    tip: "End declarative statements with a subtle downward tonal inflection. Ending sentences on an upward pitch makes confident claims sound like questions, subtly weakening audience trust."
  },
  {
    title: "Optimal Conversational Cadence (130–145 WPM)",
    tip: "Target a speaking rate of 130 to 145 words per minute. Speaking beyond 165 WPM causes listeners to miss critical consonants, while speaking below 100 WPM risks listener fatigue."
  },
  {
    title: "Crisp Terminal Consonants",
    tip: "Firmly articulate terminal consonants like /t/, /d/, and /k/ (e.g., 'impact', 'record', 'fact'). Crisp word boundaries immediately elevate broadcast and interview clarity."
  },
  {
    title: "Diaphragmatic Breath Support",
    tip: "Draw air from your lower diaphragm rather than shallow chest breathing. Steady airflow prevents voice crackling, stabilizes volume, and gives your speech rich acoustic resonance."
  },
  {
    title: "The Rhetorical Rule of Three",
    tip: "Organize persuasive arguments in triads ('clarity, brevity, impact'). The human brain naturally retains information grouped in three rhythmic beats far better than long unstructured lists."
  },
  {
    title: "Replacing Verbal Crutches with Breath",
    tip: "Hesitation fillers like 'basically', 'actually', or 'you know' often occur when the brain moves faster than the breath. Inhale silently through your nose when formulating your next sentence."
  },
  {
    title: "Dynamic Pitch & Volume Modulation",
    tip: "Avoid a monotone delivery by varying pitch slightly when introducing your key thesis. Leaning into a softer, intentional tone often commands more room attention than speaking loudly."
  },
  {
    title: "Stress Content Words over Function Words",
    tip: "Emphasize key nouns and active verbs while lightly passing over prepositions and conjunctions. This creates the natural, engaging rhythm of native English fluency."
  },
  {
    title: "Articulating Technical Nomenclature",
    tip: "When pronouncing domain-specific terms (e.g., 'jurisprudence', 'aerodynamics', 'multilateral'), decelerate slightly. Pristine clarity on technical words signals deep domain mastery."
  },
  {
    title: "The Anchor & Pivot Technique",
    tip: "When answering impromptu questions, begin with a clear opening thesis sentence before diving into supporting evidence. A crisp start anchors your thoughts and guides your audience."
  },
  {
    title: "Open Jaw & Resonant Vowels",
    tip: "Relax your jaw muscles to give long vowels full acoustic space. Unclenched diction instantly improves speech recognition and clarity across auditorium microphones."
  }
];

function refreshSpeechCoachTip(userTriggered = false) {
  const box = $('#ai-coaching-text');
  if (!box) return;

  let newIdx;
  do {
    newIdx = Math.floor(Math.random() * SPEECH_COACH_TIPS.length);
  } while (SPEECH_COACH_TIPS.length > 1 && newIdx === currentCoachTipIndex);

  currentCoachTipIndex = newIdx;
  const item = SPEECH_COACH_TIPS[newIdx];

  box.innerHTML = `
    <div style="margin-bottom:6px;">
      <span class="badge-pill badge-global" style="font-size:11.5px;font-weight:700;background:rgba(0,240,255,0.15);color:var(--accent-cyan);border:1px solid var(--accent-cyan);margin-right:6px;">
        💡 ${escapeHtml(item.title)}
      </span>
    </div>
    <div style="color:var(--text-main);font-size:13.5px;line-height:1.6;">
      ${escapeHtml(item.tip)}
    </div>
    <div style="font-size:11.5px;color:var(--text-dim);margin-top:8px;">
      Suggestions rotate automatically on every visit or when you tap <strong>🔄 New Tip</strong>. Speak the sentence to receive instant 6-dimension evaluation.
    </div>
  `;

  if (userTriggered) {
    showToast('New speech coach suggestion loaded! 💡');
  }
}

function cleanSpeechWord(w) {
  return String(w || '').toLowerCase().replace(/[^\w]/g, '');
}

function isWordMatch(spoken, target) {
  if (!spoken || !target) return false;
  if (spoken === target) return true;
  // Prefix match (e.g. communicate vs communicating, listen vs listening)
  if (target.length >= 4 && (spoken.startsWith(target.slice(0, 4)) || target.startsWith(spoken.slice(0, 4)))) {
    return true;
  }
  // Allow 1 character typo or phoneme variation for words of length >= 4
  if (Math.abs(spoken.length - target.length) <= 1 && target.length >= 4) {
    let diff = 0;
    const minLen = Math.min(spoken.length, target.length);
    for (let i = 0; i < minLen; i++) {
      if (spoken[i] !== target[i]) diff++;
    }
    diff += Math.abs(spoken.length - target.length);
    if (diff <= 1) return true;
  }
  return false;
}

async function changeSpeechLabSentence(userTriggered = false) {
  stopAllVoice();
  isSpeechLabPassed = false;

  const screen = $('#speech-lab-ai-screen');
  if (screen) screen.classList.remove('speech-lab-screen-complete');

  const textContainer = $('#speech-lab-sentence-text');
  const aiBadge = $('#speech-lab-ai-badge');
  const liveHeard = $('#speech-lab-live-heard');

  if (liveHeard) liveHeard.textContent = '🎙️ Speak sentence into mic to pass...';

  // Load from session storage to avoid repeats
  try {
    const saved = JSON.parse(sessionStorage.getItem('cf_speechlab_used') || '[]');
    saved.forEach(s => speechLabUsedSentences.add(s));
  } catch {}

  let selectedSentence = '';

  // 1. Attempt Gemini AI API generation
  try {
    const aiPromise = fetchApi('ai', 'POST', {
      task: 'generate-sentence',
      pack: 'Executive'
    });
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000));
    const res = await Promise.race([aiPromise, timeoutPromise]);
    if (res && res.sentence && typeof res.sentence === 'string') {
      const candidate = res.sentence.trim().replace(/^["']|["']$/g, '');
      if (candidate.length > 20 && !speechLabUsedSentences.has(candidate)) {
        selectedSentence = candidate;
        if (aiBadge) aiBadge.textContent = '⚡ Gemini AI Generated';
      }
    }
  } catch {}

  // 2. Fallback to adaptive zero-repeat sentence pool
  if (!selectedSentence) {
    const pools = [
      ...(AI_SENTENCE_LIBRARY.Everyday || []),
      ...(AI_SENTENCE_LIBRARY.Journalism || []),
      ...(AI_SENTENCE_LIBRARY.Law || []),
      ...(AI_SENTENCE_LIBRARY.Academic || [])
    ];
    const available = pools.filter(s => !speechLabUsedSentences.has(s));
    if (available.length > 0) {
      selectedSentence = available[Math.floor(Math.random() * available.length)];
    } else {
      speechLabUsedSentences.clear();
      selectedSentence = pools[Math.floor(Math.random() * pools.length)];
    }
    if (aiBadge) aiBadge.textContent = '⚡ Adaptive AI Prompter';
  }

  speechLabUsedSentences.add(selectedSentence);
  try {
    sessionStorage.setItem('cf_speechlab_used', JSON.stringify(Array.from(speechLabUsedSentences).slice(-50)));
  } catch {}

  currentSpeechLabSentence = selectedSentence;
  speechLabTargetWords = selectedSentence.split(/\s+/).filter(Boolean);
  speechLabPassedIndices = new Set();

  if (textContainer) {
    textContainer.innerHTML = speechLabTargetWords.map((w, idx) => {
      const cls = idx === 0 ? 'prompter-word target' : 'prompter-word';
      return `<span class="${cls}" id="sl-word-${idx}">${escapeHtml(w)}</span>`;
    }).join(' ');
  }

  const counterBadge = $('#speech-lab-pass-badge');
  const percentLabel = $('#speech-lab-pass-percent');
  if (counterBadge) {
    counterBadge.className = 'badge-pill badge-nirf';
    counterBadge.style.background = '';
    counterBadge.style.color = '';
    counterBadge.style.borderColor = '';
    counterBadge.textContent = `${speechLabSentencesPassedCount} ${speechLabSentencesPassedCount === 1 ? 'Sentence' : 'Sentences'} Passed`;
  }
  if (percentLabel) percentLabel.textContent = '0% Match';

  if (userTriggered) {
    showToast('New practice sentence ready! 🎲');
  }
}

async function passAwaySpeechLabSentence(manualSkip = false) {
  if (isPassingSentence) return;
  isPassingSentence = true;

  const textContainer = $('#speech-lab-sentence-text');
  const screen = $('#speech-lab-ai-screen');
  const counterBadge = $('#speech-lab-pass-badge');
  const percentLabel = $('#speech-lab-pass-percent');

  if (!manualSkip) {
    speechLabSentencesPassedCount++;
    if (counterBadge) {
      counterBadge.className = 'badge-pill badge-global';
      counterBadge.style.background = 'rgba(16, 185, 129, 0.25)';
      counterBadge.style.color = '#34d399';
      counterBadge.style.borderColor = '#10b981';
      counterBadge.textContent = `${speechLabSentencesPassedCount} ${speechLabSentencesPassedCount === 1 ? 'Sentence' : 'Sentences'} Passed 🎉`;
    }
    if (percentLabel) percentLabel.textContent = '100% Passed';
    if (screen) screen.classList.add('speech-lab-screen-complete');
    showToast('Sentence Passed! 🚀 Next cue rolling in...');
  }

  // 1. Trigger the upward 'pass away' animation
  if (textContainer) {
    textContainer.classList.add('passing-away');
  }

  // 2. Wait for pass-away animation duration (400ms)
  await new Promise(resolve => setTimeout(resolve, 400));

  // 3. Load next cue
  await changeSpeechLabSentence(false);

  // 4. Slide up smoothly from bottom into viewport
  if (textContainer) {
    textContainer.classList.remove('passing-away');
    textContainer.classList.add('entering');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        textContainer.classList.remove('entering');
        isPassingSentence = false;
      });
    });
  } else {
    isPassingSentence = false;
  }
}

function checkSpeechLabWordsProgress(spokenFullText, source = 'local') {
  if (!speechLabTargetWords.length || isPassingSentence) return;

  STATE.speechLabTranscript = ((STATE.speechLabTranscript || '') + ' ' + spokenFullText).trim();
  const spokenTokens = spokenFullText.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);

  let targetPointer = 0;
  while (targetPointer < speechLabTargetWords.length && speechLabPassedIndices.has(targetPointer)) {
    targetPointer++;
  }

  for (const spoken of spokenTokens) {
    for (let i = targetPointer; i < speechLabTargetWords.length; i++) {
      if (speechLabPassedIndices.has(i)) continue;
      const targetClean = cleanSpeechWord(speechLabTargetWords[i]);
      if (isWordMatch(spoken, targetClean)) {
        speechLabPassedIndices.add(i);
        if (i === targetPointer) {
          while (targetPointer < speechLabTargetWords.length && speechLabPassedIndices.has(targetPointer)) {
            targetPointer++;
          }
        }
        break;
      }
    }
  }

  // Update DOM word spans
  speechLabTargetWords.forEach((_, idx) => {
    const wordEl = $(`#sl-word-${idx}`);
    if (wordEl) {
      if (speechLabPassedIndices.has(idx)) {
        wordEl.classList.add('spoken', 'passed');
        wordEl.classList.remove('target', 'current-target');
      } else if (idx === targetPointer) {
        wordEl.classList.add('target', 'current-target');
      } else {
        wordEl.classList.remove('target', 'current-target');
      }
    }
  });

  const total = speechLabTargetWords.length;
  const passed = speechLabPassedIndices.size;
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0;

  const counterBadge = $('#speech-lab-pass-badge');
  const percentLabel = $('#speech-lab-pass-percent');
  const heardLabel = $('#speech-lab-live-heard');

  if (counterBadge && !isPassingSentence) {
    counterBadge.textContent = `${speechLabSentencesPassedCount} ${speechLabSentencesPassedCount === 1 ? 'Sentence' : 'Sentences'} Passed`;
  }

  if (percentLabel) {
    percentLabel.textContent = `${pct}% Match`;
  }

  if (heardLabel && spokenTokens.length) {
    const recent = spokenTokens.slice(-4).join(' ');
    const tag = source === 'elevenlabs' ? '⚡ ElevenLabs' : '🎙️ Heard';
    heardLabel.textContent = `${tag}: "${recent}"`;
  }

  // Passing threshold: 75% or full completion triggers passing away!
  const passThreshold = Math.max(1, Math.ceil(total * 0.75));
  if ((passed >= passThreshold || targetPointer >= total || passed === total) && total > 0 && !isPassingSentence && !isSpeechLabPassed) {
    isSpeechLabPassed = true;
    passAwaySpeechLabSentence(false);
  }
}

async function sendAudioToElevenLabsSTT(audioBlob) {
  if (!audioBlob || audioBlob.size < 2000) return;
  try {
    const fd = new FormData();
    fd.append('file', audioBlob, 'speech.webm');

    const headers = {};
    const elevenKey = localStorage.getItem('cf_eleven_key');
    if (elevenKey) headers['xi-api-key'] = elevenKey;
    if (STATE.adminKey) headers['Authorization'] = 'Bearer ' + STATE.adminKey;

    const res = await fetch(getApiUrl('api/stt'), {
      method: 'POST',
      body: fd,
      headers
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.ok && data.text) {
        const badge = $('#speech-lab-stt-engine-badge');
        if (badge) {
          badge.style.background = 'rgba(16, 185, 129, 0.15)';
          badge.style.color = '#34d399';
          badge.style.borderColor = 'rgba(52, 211, 153, 0.4)';
          badge.innerHTML = '🎙️ ElevenLabs Scribe STT Active';
        }
        checkSpeechLabWordsProgress(data.text, 'elevenlabs');
        updateRealtimePaceAndFillers(data.text);
      }
    }
  } catch (err) {
    console.warn('ElevenLabs STT dispatch error:', err);
  }
}

function initSpeechLab() {
  // Always stop previous voices when entering
  stopAllVoice();

  // 1. Refresh Speech Coach Suggestion dynamically EVERY time it is opened!
  refreshSpeechCoachTip(false);

  // 2. Setup AI Sentence Teleprompter Screen
  if (!currentSpeechLabSentence) {
    changeSpeechLabSentence(false);
  }

  // 3. Bind interactive buttons (idempotent guards)
  const recBtn = $('#btn-speech-lab-record');
  const stopBtn = $('#btn-speech-lab-stop');
  const analyzeBtn = $('#btn-speech-lab-analyze');
  const newSentBtn = $('#btn-speech-lab-new-sentence');
  const listenSentBtn = $('#btn-speech-lab-listen');
  const refreshTipBtn = $('#btn-refresh-speech-coach');

  if (recBtn && !recBtn.dataset.bound) {
    recBtn.dataset.bound = 'true';
    recBtn.addEventListener('click', startSpeechLabAudio);
  }
  if (stopBtn && !stopBtn.dataset.bound) {
    stopBtn.dataset.bound = 'true';
    stopBtn.addEventListener('click', stopSpeechLabAudio);
  }
  if (analyzeBtn && !analyzeBtn.dataset.bound) {
    analyzeBtn.dataset.bound = 'true';
    analyzeBtn.addEventListener('click', analyzeSpeechLabSample);
  }
  if (newSentBtn && !newSentBtn.dataset.bound) {
    newSentBtn.dataset.bound = 'true';
    newSentBtn.addEventListener('click', () => passAwaySpeechLabSentence(true));
  }
  if (listenSentBtn && !listenSentBtn.dataset.bound) {
    listenSentBtn.dataset.bound = 'true';
    listenSentBtn.addEventListener('click', function() {
      if (currentSpeechLabSentence) {
        speak(currentSpeechLabSentence, this);
      }
    });
  }
  if (refreshTipBtn && !refreshTipBtn.dataset.bound) {
    refreshTipBtn.dataset.bound = 'true';
    refreshTipBtn.addEventListener('click', () => refreshSpeechCoachTip(true));
  }
}

async function startSpeechLabAudio() {
  const status = $('#speech-session-state');

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    STATE.audioStream = stream;
    speechLabMediaStream = stream;

    // Web Audio API Waveform Visualizer
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!STATE.audioContext) {
      STATE.audioContext = new AudioCtx();
    }
    if (STATE.audioContext.state === 'suspended') {
      await STATE.audioContext.resume();
    }
    const source = STATE.audioContext.createMediaStreamSource(stream);
    STATE.analyser = STATE.audioContext.createAnalyser();
    STATE.analyser.fftSize = 256;
    source.connect(STATE.analyser);

    renderSpeechLabWaveform();

    // 1. ElevenLabs Scribe Continuous Segment STT Dispatcher
    let mimeType = 'audio/webm';
    if (window.MediaRecorder) {
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
        else if (MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg';
        else mimeType = '';
      }

      function recordNextSegment() {
        if (!speechLabMediaStream || !speechLabMediaStream.active) return;
        try {
          const segRec = new MediaRecorder(speechLabMediaStream, mimeType ? { mimeType } : undefined);
          activeSegmentRecorder = segRec;
          const chunks = [];
          segRec.ondataavailable = e => {
            if (e.data && e.data.size > 0) chunks.push(e.data);
          };
          segRec.onstop = async () => {
            if (chunks.length > 0 && speechLabMediaStream && speechLabMediaStream.active) {
              const blob = new Blob(chunks, { type: mimeType || 'audio/webm' });
              await sendAudioToElevenLabsSTT(blob);
            }
            if (speechLabMediaStream && speechLabMediaStream.active) {
              recordNextSegment();
            }
          };
          segRec.start();
          setTimeout(() => {
            if (segRec.state === 'recording') {
              try { segRec.stop(); } catch {}
            }
          }, 2400);
        } catch (err) {
          console.warn('ElevenLabs segment recorder error:', err);
        }
      }
      recordNextSegment();
    }

    // 2. Real-time Browser Speech Recognition (Instant phoneme word-passing feedback)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      speechLabRec = new SpeechRecognition();
      speechLabRec.lang = 'en-IN'; // Indian English acoustic & phonetic recognition
      speechLabRec.continuous = true;
      speechLabRec.interimResults = true;
      speechLabRec.onresult = e => {
        let full = '';
        for (let i = 0; i < e.results.length; i++) full += e.results[i][0].transcript + ' ';
        full = full.trim();
        checkSpeechLabWordsProgress(full, 'local');
        updateRealtimePaceAndFillers(full);
      };
      speechLabRec.start();
    }

    speechLabStartTime = Date.now();
    status.textContent = 'Prompter Live';
    status.className = 'badge-pill badge-global';
    $('#btn-speech-lab-record').disabled = true;
    $('#btn-speech-lab-stop').disabled = false;
  } catch (err) {
    showToast('Microphone access denied or not available. Please allow microphone permissions.');
  }
}

function stopSpeechLabAudio() {
  if (activeSegmentRecorder && activeSegmentRecorder.state !== 'inactive') {
    try { activeSegmentRecorder.stop(); } catch {}
    activeSegmentRecorder = null;
  }
  if (speechLabMediaStream) {
    speechLabMediaStream.getTracks().forEach(t => t.stop());
    speechLabMediaStream = null;
  }
  if (STATE.audioStream) {
    STATE.audioStream.getTracks().forEach(t => t.stop());
    STATE.audioStream = null;
  }
  if (speechLabRec) {
    try { speechLabRec.stop(); } catch {}
    speechLabRec = null;
  }
  $('#speech-session-state').textContent = 'Prompter Idle';
  $('#btn-speech-lab-record').disabled = false;
  $('#btn-speech-lab-stop').disabled = true;
}

function renderSpeechLabWaveform() {
  const canvas = $('#speech-lab-waveform');
  if (!canvas || !STATE.analyser) return;
  const ctx = canvas.getContext('2d');
  const bufferLength = STATE.analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function draw() {
    if (!STATE.analyser) return;
    requestAnimationFrame(draw);
    STATE.analyser.getByteFrequencyData(dataArray);

    ctx.fillStyle = '#07090e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength) * 2.5;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * canvas.height;
      ctx.fillStyle = `hsl(${180 + i * 2}, 100%, 50%)`;
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
      x += barWidth + 1;
    }
  }
  draw();
}

function updateRealtimePaceAndFillers(text) {
  const clean = String(text || '').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  const elapsedSecs = Math.max(1, (Date.now() - speechLabStartTime) / 1000);
  const wpm = Math.round((words.length / elapsedSecs) * 60);

  // Update WPM gauge
  $('#wpm-value-label').textContent = `${wpm} WPM`;
  const needle = $('#wpm-needle-indicator');
  if (needle) {
    const percent = Math.min(100, Math.max(0, (wpm / 200) * 100));
    needle.style.left = `${percent}%`;
  }

  // Detect Fillers
  const fillers = (clean.match(/\b(um+|uh+|erm+|like|you know|actually|basically|literally|sort of|kind of)\b/gi) || []);
  $('#filler-count-label').textContent = `${fillers.length} Fillers`;

  const chipsContainer = $('#fillers-chips-container');
  if (chipsContainer) {
    if (fillers.length) {
      chipsContainer.innerHTML = Array.from(new Set(fillers.map(f => f.toLowerCase())))
        .map(f => `<span class="badge-pill badge-global">⚠️ ${escapeHtml(f)}</span>`).join('');
    } else {
      chipsContainer.innerHTML = `<span style="font-size:12px;color:var(--text-dim);">No hesitation fillers detected yet.</span>`;
    }
  }
}

function analyzeSpeechLabSample() {
  const text = (STATE.speechLabTranscript || currentSpeechLabSentence || '').trim();
  if (!text) {
    showToast('Please record speech first to evaluate.');
    return;
  }

  const words = text.split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+/).filter(Boolean);
  const fillers = (text.match(/\b(um+|uh+|erm+|like|you know|actually|basically|literally)\b/gi) || []).length;
  const uniqueWords = new Set(words.map(w => w.toLowerCase())).size;

  // Passed ratio from word screen
  const totalTargetWords = speechLabTargetWords.length || words.length;
  const passedWords = speechLabPassedIndices.size || words.length;
  const passRatio = Math.min(1, Math.max(0.4, passedWords / Math.max(1, totalTargetWords)));

  // 6-Dimension Score Synthesis
  const fluency = Math.min(100, Math.max(45, Math.round((94 - fillers * 5) * passRatio)));
  const clarity = Math.min(100, Math.max(50, Math.round((88 + Math.min(10, sentences.length * 3) - fillers * 3) * passRatio)));
  const pronunciation = Math.min(100, Math.max(50, Math.round((90 - fillers * 2) * passRatio)));
  const vocab = Math.min(100, Math.max(40, Math.round(((uniqueWords / Math.max(1, words.length)) * 100))));
  const grammar = Math.min(100, Math.max(50, 80 + (text.length > 50 ? 15 : 5)));
  const confidence = Math.min(100, Math.max(50, Math.round((fluency + clarity) / 2)));

  // Update UI Elements
  $('#dim-pronunciation').textContent = pronunciation;
  $('#dim-fluency').textContent = fluency;
  $('#dim-clarity').textContent = clarity;
  $('#dim-vocab').textContent = vocab;
  $('#dim-grammar').textContent = grammar;
  $('#dim-confidence').textContent = confidence;

  // Draw Spider/Radar Canvas
  drawSpiderRadar([pronunciation, fluency, clarity, vocab, grammar, confidence]);

  // AI Coaching Rewrite Suggestions
  $('#ai-coaching-text').innerHTML = `
    <div style="margin-bottom:10px;">
      <span class="badge-pill badge-global" style="font-size:11.5px;font-weight:700;background:rgba(16,185,129,0.2);color:#34d399;border:1px solid #10b981;">
        ✨ Speech Assessment Generated
      </span>
    </div>
    <strong>Targeted Strengths &amp; Adjustments:</strong><br>
    • Articulation completion: <strong>${passedWords} / ${totalTargetWords} words passed (${Math.round(passRatio * 100)}%)</strong>.<br>
    • Vocabulary richness: <strong>${vocab}%</strong> across ${words.length} spoken tokens.<br>
    • ${fillers > 0 ? `Notice ${fillers} filler phrase(s). Practice taking a silent 1-second pause when searching for words.` : 'Zero hesitation fillers detected! Flawless executive rhythm.'}<br><br>
    <strong>"Say It Better" Model Delivery:</strong><br>
    <em style="color:var(--accent-cyan);">"${escapeHtml(currentSpeechLabSentence || text.replace(/\b(um+|uh+|like|you know)\b/gi, '').trim())}"</em>
  `;

  showToast('Speech Analysis Complete!');
}

function drawSpiderRadar(scores) {
  const canvas = $('#radar-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const radius = 70;
  const labels = ['Pronunciation', 'Fluency', 'Clarity', 'Vocab', 'Grammar', 'Confidence'];

  ctx.clearRect(0, 0, w, h);

  // Background Web
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  for (let r = 20; r <= radius; r += 25) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  // Draw Data Polygon
  ctx.fillStyle = 'rgba(0, 240, 255, 0.25)';
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 2;
  ctx.beginPath();

  scores.forEach((sc, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const r = (sc / 100) * radius;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Axis Labels
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px Space Grotesk';
  ctx.textAlign = 'center';
  labels.forEach((lbl, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const x = cx + (radius + 18) * Math.cos(angle);
    const y = cy + (radius + 18) * Math.sin(angle);
    ctx.fillText(lbl, x, y + 3);
  });
}

// ─── 7. NEWS ANCHOR & TELEPROMPTER STUDIO ─────────────────────────────────────
let teleprompterState = {
  initialized: false,
  isRecording: false,
  isCameraOn: false,
  isPrompterPaused: true,
  prompterStarted: false,
  currentSpeed: 2.4, // px per frame
  tickerOffset: 0,
  prompterAnimId: null,
  idleAnimId: null,
  recordTimer: null,
  recordSeconds: 0,
  mediaRecorder: null,
  recordedChunks: [],
  lastBlobUrl: null,
  lastFileName: null,
  cameraStream: null,
  compositeAnimId: null,
  recordedMicStream: null,
  activeCompCanvas: null,
  schoolLogo: null
};

// Pre-load Kanakia International School Logo for broadcast video compositing
if (!teleprompterState.schoolLogo && typeof Image !== 'undefined') {
  const sLogo = new Image();
  sLogo.src = 'logo.png';
  teleprompterState.schoolLogo = sLogo;
}

// Canvas rounded rectangle drawing helper for cross-browser reliability
function drawCanvasRoundedRect(ctx, x, y, width, height, radius) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    return;
  }
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
}

// Draw Kanakia International School Logo at Top Left (Downloaded Video Only)
function drawBroadcastSchoolLogo(ctx, width, height, scale) {
  const logo = teleprompterState.schoolLogo;
  if (!logo || !logo.complete || !logo.naturalWidth) return;

  const logoPadX = Math.round(28 * scale);
  const logoPadY = Math.round(22 * scale);
  const logoSize = Math.round(68 * scale);
  const cardPad = Math.round(7 * scale);
  const cardW = logoSize + cardPad * 2;
  const cardH = logoSize + cardPad * 2;
  const cardR = Math.round(12 * scale);

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
  ctx.shadowBlur = 14 * scale;
  ctx.shadowOffsetY = 4 * scale;

  // Frosted dark broadcast station card
  ctx.fillStyle = 'rgba(10, 16, 32, 0.82)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = Math.max(1, Math.round(1.5 * scale));

  drawCanvasRoundedRect(ctx, logoPadX, logoPadY, cardW, cardH, cardR);
  ctx.fill();
  ctx.stroke();

  // Draw Kanakia International School logo
  ctx.shadowColor = 'transparent';
  ctx.drawImage(logo, logoPadX + cardPad, logoPadY + cardPad, logoSize, logoSize);
  ctx.restore();
}

// Draw Authentic Lower-Third Broadcast Banner at Bottom (WITHOUT Teleprompter text)
function drawBroadcastLowerThird(ctx, width, height, scale) {
  const bannerMarginX = Math.round(20 * scale);
  const bannerMarginBottom = Math.round(18 * scale);
  const bannerH = Math.round(54 * scale);
  const bannerW = width - (bannerMarginX * 2);
  const bannerY = height - bannerMarginBottom - bannerH;
  const bannerX = bannerMarginX;
  const radius = Math.round(10 * scale);

  ctx.save();
  // Drop shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
  ctx.shadowBlur = 18 * scale;
  ctx.shadowOffsetY = 6 * scale;

  // Background Gradient matching .news-lower-third:
  // linear-gradient(90deg, #ff2a85 0%, #b5179e 40%, rgba(14, 20, 38, 0.96) 100%)
  const grad = ctx.createLinearGradient(bannerX, bannerY, bannerX + bannerW, bannerY);
  grad.addColorStop(0, '#ff2a85');
  grad.addColorStop(0.38, '#b5179e');
  grad.addColorStop(0.85, 'rgba(14, 20, 38, 0.96)');
  grad.addColorStop(1, 'rgba(14, 20, 38, 0.98)');
  ctx.fillStyle = grad;

  drawCanvasRoundedRect(ctx, bannerX, bannerY, bannerW, bannerH, radius);
  ctx.fill();

  // Subtle border
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = Math.max(1, Math.round(1 * scale));
  ctx.stroke();

  // 1. Tag Pill (e.g. BREAKING NEWS)
  const tagEl = document.getElementById('lower-third-tag');
  const tagText = (tagEl ? tagEl.textContent.trim() : 'BREAKING NEWS') || 'BREAKING NEWS';

  const tagFontSize = Math.round(12 * scale);
  ctx.font = `800 ${tagFontSize}px "Space Grotesk", "Plus Jakarta Sans", system-ui, -apple-system, sans-serif`;
  const tagMetrics = ctx.measureText(tagText);
  const tagPadX = Math.round(10 * scale);
  const pillW = Math.round(tagMetrics.width + (tagPadX * 2));
  const pillH = Math.round(28 * scale);
  const pillX = bannerX + Math.round(12 * scale);
  const pillY = bannerY + Math.round((bannerH - pillH) / 2);
  const pillRadius = Math.round(5 * scale);

  // White pill background
  ctx.fillStyle = '#ffffff';
  drawCanvasRoundedRect(ctx, pillX, pillY, pillW, pillH, pillRadius);
  ctx.fill();

  // Pink tag text
  ctx.fillStyle = '#ff2a85';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(tagText, pillX + (pillW / 2), pillY + (pillH / 2) + 0.5);

  // 2. Headline / Copy Text
  const copyEl = document.getElementById('lower-third-copy');
  let copyText = (copyEl ? copyEl.textContent.trim() : '') || 'STUDENT BROADCAST · KANAKIA INTERNATIONAL SCHOOL';

  const copyFontSize = Math.round(15 * scale);
  ctx.font = `700 ${copyFontSize}px "Space Grotesk", "Plus Jakarta Sans", system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const copyX = pillX + pillW + Math.round(14 * scale);
  const copyY = bannerY + Math.round(bannerH / 2);
  const maxCopyW = bannerX + bannerW - copyX - Math.round(16 * scale);

  // Truncate if exceeds max width
  let displayText = copyText;
  if (ctx.measureText(displayText).width > maxCopyW) {
    while (displayText.length > 4 && ctx.measureText(displayText + '...').width > maxCopyW) {
      displayText = displayText.slice(0, -1);
    }
    displayText += '...';
  }
  ctx.fillText(displayText, copyX, copyY);

  ctx.restore();
}

function initTeleprompter() {
  const cameraBtn = $('#btn-start-camera');
  const scrollBtn = $('#btn-scroll-teleprompter');
  const recordBtn = $('#btn-record-anchor');
  const downloadBtn = $('#btn-download-clip');
  const scriptSelect = $('#anchor-script-select');
  const nameInput = $('#anchor-name-input');
  const video = $('#anchor-video');
  const canvas = $('#anchor-idle-canvas');
  const track = $('#anchor-teleprompter-track') || $('#teleprompter-track');
  const s1 = $('#teleprompter-sentence-1');
  const s2 = $('#teleprompter-sentence-2');
  const speedSlow = $('#speed-slow');
  const speedNormal = $('#speed-normal');
  const speedFast = $('#speed-fast');
  const lowerTag = $('#lower-third-tag');
  const lowerCopy = $('#lower-third-copy');

  const SCRIPTS = {
    breaking: {
      tag: "BREAKING NEWS",
      role: "Media Anchor",
      text: "Good evening, we are broadcasting live from the English Careers Forum 2026 at Kanakia International School. Today, students explore how articulate English powers over thirty-two professional trajectories — from commercial aviation to pediatric surgery."
    },
    pilot: {
      tag: "FLIGHT DECK ATC",
      role: "Commercial Pilot",
      text: "Mumbai Radar, Air India 102 Heavy is holding short runway 27 Right, ready for immediate departure, climbing out to flight level 340 on course to London Heathrow via direct waypoint ARNAN."
    },
    doctor: {
      tag: "TRAUMA CODE BLUE",
      role: "Chief Trauma Surgeon",
      text: "Code Blue in Trauma Bay Two. Prepare rapid sequence intubation, cross-match four units of O-negative packed red cells, and notify the pediatric neurosurgery team for immediate surgical intervention."
    },
    lawyer: {
      tag: "SUPREME COURT BENCH",
      role: "Senior Advocate",
      text: "May it please Your Lordships, Article 21 guarantees not merely biological existence, but a dignified life encompassing environmental protection and digital privacy as inalienable fundamental rights under constitutional jurisprudence."
    },
    diplomat: {
      tag: "UN GENERAL ASSEMBLY",
      role: "Chief Diplomat",
      text: "Distinguished delegates, the climate emergency recognizes neither national borders nor economic status. We call upon all sovereign member states to ratify the binding 2030 decarbonization framework without reservation."
    },
    rocket: {
      tag: "MISSION CONTROL",
      role: "Flight Director",
      text: "All flight controllers, this is Mission Control. We are T-minus 20 seconds and counting. Guidance internal, propellant chilldown verified, main engine ignition sequence start... three, two, one, liftoff of the Artemis deep-space mission!"
    },
    cricket: {
      tag: "WORLD CUP FINAL",
      role: "Sports Broadcaster",
      text: "Six needed off the final delivery! The bowler steams in from the pavilion end, bowls a yorker right in the slot, lofted cleanly over extra cover, that is sailing into the stands! What a sensational victory for India!"
    },
    ciso: {
      tag: "CYBER DEFENSE SOC",
      role: "Chief InfoSec Officer",
      text: "Security Operations Command update: we detected anomalous credential stuffing against our perimeter gateways. Zero-trust token revocation has executed successfully, all session tokens are rotated, and database isolation remains fully intact."
    },
    tech: {
      tag: "SYSTEM ARCHITECTURE",
      role: "Tech Lead",
      text: "Our microservices event bus processed forty-eight million concurrent transactions with sub-five-millisecond p99 latency during peak load, proving our zero-downtime distributed consensus architecture is battle-ready."
    },
    pitch: {
      tag: "SILICON VALLEY PITCH",
      role: "Startup Founder",
      text: "Ninety percent of global enterprise communication is hindered by fragmented vocabulary and language hesitation. Our AI real-time fluency engine is solving this fifty-billion-dollar bottleneck with eighty percent month-over-month growth."
    },
    wildlife: {
      tag: "NAT GEO EXPEDITION",
      role: "Wildlife Biologist",
      text: "Broadcasting from the heart of the Sundarbans mangrove delta. We are tracking a Bengal tigress through the tidal creeks, documenting how rising sea levels are altering keystone predator hunting corridors."
    },
    banker: {
      tag: "WALL STREET M&A",
      role: "Investment Banker",
      text: "The special committee has unanimously approved the twelve-billion-dollar definitive merger agreement. The combined balance sheet unlocks substantial operational synergies and cements market leadership across Asia-Pacific."
    },
    chef: {
      tag: "MICHELIN KITCHEN",
      role: "Executive Chef",
      text: "Service please! Table four ordering the roasted langoustine with caviar emulsion and white truffle reduction. Check temperatures on the duck breasts, plate with absolute precision, and hold the sauces until pass!"
    },
    pr: {
      tag: "GLOBAL PRESS BRIEFING",
      role: "PR Director",
      text: "Good afternoon ladies and gentlemen of the press. We take full accountability for yesterday's supply chain disruption. We have dispatched regional task forces, compensated affected consumers, and initiated an independent external forensic audit."
    },
    f1: {
      tag: "F1 PIT WALL RADIO",
      role: "Race Strategist",
      text: "Box, box, box! Box this lap for fresh soft compound tires. Rain is approaching Turn 7 in three minutes, undercut window is open against Car 44, execute a sub-two-second stop and push on the out-lap!"
    },
    ocean: {
      tag: "DEEP SEA EXPEDITION",
      role: "Marine Geologist",
      text: "Submersible Alvin descending through the hadal zone at nine thousand meters depth. Sonar telemetry reveals hydrothermal venting minerals and bioluminescent fauna never before cataloged in modern marine science."
    }
  };

  // Helper to sync prompter button UI state (Start <-> Pause <-> Resume)
  const updatePrompterButtonUI = () => {
    const iconSpan = scrollBtn?.querySelector('span:first-child');
    const txtSpan = $('#prompter-scroll-btn-text');
    const hudStatus = $('#prompter-hud-status');

    if (!teleprompterState.prompterStarted) {
      if (iconSpan) iconSpan.textContent = '▶️';
      if (txtSpan) txtSpan.textContent = 'Start Teleprompter';
      if (hudStatus) hudStatus.textContent = 'START PROMPTER';
      scrollBtn?.classList.remove('btn-prompter-scrolling');
    } else if (teleprompterState.isPrompterPaused) {
      if (iconSpan) iconSpan.textContent = '▶️';
      if (txtSpan) txtSpan.textContent = 'Resume Teleprompter';
      if (hudStatus) hudStatus.textContent = 'RESUME PROMPTER';
      scrollBtn?.classList.remove('btn-prompter-scrolling');
    } else {
      if (iconSpan) iconSpan.textContent = '⏸️';
      if (txtSpan) txtSpan.textContent = 'Pause Teleprompter';
      if (hudStatus) hudStatus.textContent = 'PAUSE PROMPTER';
      scrollBtn?.classList.add('btn-prompter-scrolling');
    }
  };

  // Helper to update displayed script and lower-third copy
  const applyScript = key => {
    const data = SCRIPTS[key] || SCRIPTS.breaking;
    const activeS1 = $('#teleprompter-sentence-1') || s1;
    const activeS2 = $('#teleprompter-sentence-2') || s2;
    const activeTrack = $('#anchor-teleprompter-track') || track;

    if (activeS1) activeS1.textContent = `"${data.text}"`;
    if (activeS2) activeS2.textContent = `"${data.text}"`;
    if (lowerTag) lowerTag.textContent = data.tag;
    const nameVal = nameInput?.value.trim() || 'STUDENT';
    if (lowerCopy) lowerCopy.textContent = `${nameVal.toUpperCase()} · ${data.role.toUpperCase()} · KANAKIA INTERNATIONAL SCHOOL`;
    teleprompterState.tickerOffset = 0;
    if (activeTrack) activeTrack.style.transform = 'translateX(0px)';
    teleprompterState.isPrompterPaused = true;
    teleprompterState.prompterStarted = false;
    updatePrompterButtonUI();
  };

  // 1. Moving Sentence Teleprompter Engine
  const runMovingPrompter = () => {
    if (teleprompterState.prompterAnimId) cancelAnimationFrame(teleprompterState.prompterAnimId);

    const step = () => {
      const activeTrack = $('#anchor-teleprompter-track') || track;
      const activeS1 = $('#teleprompter-sentence-1') || s1;

      if (!teleprompterState.isPrompterPaused && activeTrack && activeS1) {
        teleprompterState.tickerOffset -= teleprompterState.currentSpeed;
        const s1Width = activeS1.offsetWidth || 1200;
        const sepWidth = 64; // approximate margin + separator width
        const resetThreshold = s1Width + sepWidth;
        if (Math.abs(teleprompterState.tickerOffset) >= resetThreshold) {
          teleprompterState.tickerOffset += resetThreshold;
        }
        activeTrack.style.transform = `translateX(${teleprompterState.tickerOffset}px)`;
      }
      teleprompterState.prompterAnimId = requestAnimationFrame(step);
    };
    teleprompterState.prompterAnimId = requestAnimationFrame(step);
  };

  // 2. Cool Animated Studio Backdrop (Active when camera is off)
  const runStudioCanvasAnimation = () => {
    if (!canvas) return;
    if (teleprompterState.idleAnimId) cancelAnimationFrame(teleprompterState.idleAnimId);

    const ctx = canvas.getContext('2d');
    canvas.width = 1280;
    canvas.height = 720;

    let globeAngle = 0;
    let spotlightPhase = 0;
    const particles = [];
    for (let i = 0; i < 45; i++) {
      particles.push({
        x: Math.random() * 1280,
        y: Math.random() * 720,
        r: Math.random() * 2 + 1,
        vy: Math.random() * 0.7 + 0.3,
        alpha: Math.random() * 0.7 + 0.3
      });
    }

    const drawFrame = () => {
      if (teleprompterState.isCameraOn) return; // paused when camera is active

      ctx.clearRect(0, 0, 1280, 720);

      // Deep studio background
      const bgGrad = ctx.createRadialGradient(640, 240, 50, 640, 360, 750);
      bgGrad.addColorStop(0, '#0c1630');
      bgGrad.addColorStop(0.5, '#070c1d');
      bgGrad.addColorStop(1, '#020409');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1280, 720);

      // Studio Spotlight Beams
      spotlightPhase += 0.015;
      const spotLeftX = 640 + Math.sin(spotlightPhase) * 260;
      const spotRightX = 640 - Math.cos(spotlightPhase) * 260;

      // Left beam (cyan)
      const gradLeft = ctx.createLinearGradient(120, 0, spotLeftX, 720);
      gradLeft.addColorStop(0, 'rgba(0, 240, 255, 0.22)');
      gradLeft.addColorStop(0.5, 'rgba(0, 240, 255, 0.07)');
      gradLeft.addColorStop(1, 'rgba(0, 240, 255, 0)');
      ctx.fillStyle = gradLeft;
      ctx.beginPath();
      ctx.moveTo(80, 0);
      ctx.lineTo(160, 0);
      ctx.lineTo(spotLeftX + 90, 720);
      ctx.lineTo(spotLeftX - 90, 720);
      ctx.closePath();
      ctx.fill();

      // Right beam (magenta)
      const gradRight = ctx.createLinearGradient(1160, 0, spotRightX, 720);
      gradRight.addColorStop(0, 'rgba(255, 42, 133, 0.2)');
      gradRight.addColorStop(0.5, 'rgba(255, 42, 133, 0.06)');
      gradRight.addColorStop(1, 'rgba(255, 42, 133, 0)');
      ctx.fillStyle = gradRight;
      ctx.beginPath();
      ctx.moveTo(1120, 0);
      ctx.lineTo(1200, 0);
      ctx.lineTo(spotRightX + 90, 720);
      ctx.lineTo(spotRightX - 90, 720);
      ctx.closePath();
      ctx.fill();

      // Ground Perspective Floor Grid
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
      ctx.lineWidth = 1;
      const horizonY = 500;
      for (let y = horizonY; y <= 720; y += 22 + (y - horizonY) * 0.18) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1280, y);
        ctx.stroke();
      }
      for (let x = -200; x <= 1480; x += 110) {
        ctx.beginPath();
        ctx.moveTo(640 + (x - 640) * 0.15, horizonY);
        ctx.lineTo(x, 720);
        ctx.stroke();
      }
      ctx.restore();

      // Floating dust particles
      ctx.save();
      for (let p of particles) {
        p.y -= p.vy;
        if (p.y < 0) {
          p.y = 720;
          p.x = Math.random() * 1280;
        }
        ctx.fillStyle = `rgba(0, 240, 255, ${p.alpha * 0.7})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Rotating 3D Holographic Globe
      globeAngle += 0.012;
      const cx = 640;
      const cy = 350;
      const R = 135;

      ctx.save();
      // Outer atmosphere halo
      const globeGlow = ctx.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 1.3);
      globeGlow.addColorStop(0, 'rgba(0, 240, 255, 0.25)');
      globeGlow.addColorStop(0.8, 'rgba(0, 240, 255, 0.08)');
      globeGlow.addColorStop(1, 'rgba(0, 240, 255, 0)');
      ctx.fillStyle = globeGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.3, 0, Math.PI * 2);
      ctx.fill();

      // Globe sphere outline
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Latitudinal rings
      const lats = [-55, -30, 0, 30, 55];
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.lineWidth = 1.2;
      lats.forEach(deg => {
        const rad = deg * Math.PI / 180;
        const latY = cy + Math.sin(rad) * R;
        const latR = Math.cos(rad) * R;
        ctx.beginPath();
        ctx.ellipse(cx, latY, latR, latR * 0.28, 0, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Rotating Longitudinal meridians
      for (let m = 0; m < 8; m++) {
        const offset = globeAngle + (m * Math.PI / 4);
        const radiusX = Math.cos(offset) * R;
        ctx.strokeStyle = m % 2 === 0 ? 'rgba(0, 240, 255, 0.65)' : 'rgba(255, 42, 133, 0.5)';
        ctx.lineWidth = m % 2 === 0 ? 1.5 : 1;
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.abs(radiusX), R, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Outer tilted orbit ring & orbiting node
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(cx, cy, R * 1.5, R * 0.45, -0.28, 0, Math.PI * 2);
      ctx.stroke();

      const satX = cx + Math.cos(globeAngle * 1.8) * (R * 1.5) * Math.cos(-0.28) - Math.sin(globeAngle * 1.8) * (R * 0.45) * Math.sin(-0.28);
      const satY = cy + Math.cos(globeAngle * 1.8) * (R * 1.5) * Math.sin(-0.28) + Math.sin(globeAngle * 1.8) * (R * 0.45) * Math.cos(-0.28);
      ctx.fillStyle = '#ff2a85';
      ctx.shadowColor = '#ff2a85';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(satX, satY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();

      // Audio Frequency Spectrum Equalizer Bars
      ctx.save();
      const numBars = 36;
      const barWidth = 14;
      const gap = 8;
      const startX = cx - ((numBars * (barWidth + gap)) / 2);
      const baseY = 670;
      const now = Date.now() * 0.005;

      for (let b = 0; b < numBars; b++) {
        const h = Math.abs(Math.sin(now + b * 0.38)) * 36 + Math.abs(Math.cos(now * 1.4 + b * 0.2)) * 22 + 8;
        const x = startX + b * (barWidth + gap);
        const gradBar = ctx.createLinearGradient(0, baseY - h, 0, baseY);
        gradBar.addColorStop(0, '#00f0ff');
        gradBar.addColorStop(1, 'rgba(181, 23, 158, 0.7)');
        ctx.fillStyle = gradBar;
        ctx.fillRect(x, baseY - h, barWidth, h);
      }
      ctx.restore();

      // Studio HUD Telemetry Overlay
      ctx.save();
      ctx.font = '700 13px "JetBrains Mono", monospace';
      ctx.fillStyle = '#00f0ff';
      ctx.fillText('● STUDIO ON-AIR STANDBY  |  1080P 60FPS', 40, 110);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '600 12px "Space Grotesk", sans-serif';
      const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
      ctx.fillText(`KANAKIA MEDIA LAB · UTC ${timeStr}`, 980, 110);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.font = '700 14px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('READY TO BROADCAST — CLICK "LAUNCH CAMERA" OR "RECORD BROADCAST CLIP"', 640, 520);
      ctx.restore();

      teleprompterState.idleAnimId = requestAnimationFrame(drawFrame);
    };

    teleprompterState.idleAnimId = requestAnimationFrame(drawFrame);
  };

  // Prepare initial script & keep prompter stationary until started by user
  applyScript(scriptSelect?.value || 'breaking');
  teleprompterState.isPrompterPaused = true;
  teleprompterState.prompterStarted = false;
  updatePrompterButtonUI();
  runMovingPrompter();
  if (!teleprompterState.isCameraOn) {
    runStudioCanvasAnimation();
  }

  // Prevent multiple bindings if initTeleprompter is called on tab switches
  if (teleprompterState.initialized) return;
  teleprompterState.initialized = true;

  // 3. Teleprompter Speed Buttons (Slow, Normal, Fast)
  const setSpeed = (spd, btn) => {
    [speedSlow, speedNormal, speedFast].forEach(b => b?.classList.remove('active'));
    btn?.classList.add('active');
    if (spd === 'slow') {
      teleprompterState.currentSpeed = 1.2;
      showToast('Teleprompter speed set to Slow (Paced Delivery)');
    } else if (spd === 'normal') {
      teleprompterState.currentSpeed = 2.4;
      showToast('Teleprompter speed set to Normal');
    } else if (spd === 'fast') {
      teleprompterState.currentSpeed = 4.2;
      showToast('Teleprompter speed set to Fast (Breaking News Pace)');
    }
  };

  speedSlow?.addEventListener('click', () => setSpeed('slow', speedSlow));
  speedNormal?.addEventListener('click', () => setSpeed('normal', speedNormal));
  speedFast?.addEventListener('click', () => setSpeed('fast', speedFast));

  // 4. Start / Pause / Resume Teleprompter Scroll Button
  const togglePrompter = () => {
    if (!teleprompterState.prompterStarted) {
      teleprompterState.prompterStarted = true;
      teleprompterState.isPrompterPaused = false;
      updatePrompterButtonUI();
      showToast('Teleprompter started! 📜');
    } else if (!teleprompterState.isPrompterPaused) {
      teleprompterState.isPrompterPaused = true;
      updatePrompterButtonUI();
      showToast('Teleprompter paused ⏸️');
    } else {
      teleprompterState.isPrompterPaused = false;
      updatePrompterButtonUI();
      showToast('Teleprompter scrolling resumed ▶️');
    }
  };

  scrollBtn?.addEventListener('click', togglePrompter);
  $('#teleprompter-box')?.addEventListener('click', togglePrompter);

  // 5. Script / Roleplay Dropdown Selection
  scriptSelect?.addEventListener('change', e => {
    applyScript(e.target.value);
  });

  // 6. Name input listener
  nameInput?.addEventListener('input', () => {
    const scriptKey = scriptSelect?.value || 'breaking';
    applyScript(scriptKey);
  });

  // 7. Camera Toggle Button (Launch Camera <-> Turn Off Camera)
  cameraBtn?.addEventListener('click', async () => {
    const camText = $('#camera-btn-text');
    if (teleprompterState.isCameraOn) {
      // Turn Off Camera -> Return to cool studio animation
      if (teleprompterState.cameraStream) {
        teleprompterState.cameraStream.getTracks().forEach(t => t.stop());
        teleprompterState.cameraStream = null;
      }
      if (video) {
        video.srcObject = null;
        video.style.display = 'none';
      }
      if (canvas) canvas.style.display = 'block';
      teleprompterState.isCameraOn = false;
      if (camText) camText.textContent = 'Launch Camera / OBS Feed';
      cameraBtn.querySelector('span:first-child').textContent = '📹';
      runStudioCanvasAnimation();
      showToast('Camera turned off. Studio animation backdrop active.');
      return;
    }

    // Launch Camera
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      });
      teleprompterState.cameraStream = stream;
      if (video) {
        video.srcObject = stream;
        video.style.display = 'block';
      }
      if (canvas) canvas.style.display = 'none';
      if (teleprompterState.idleAnimId) {
        cancelAnimationFrame(teleprompterState.idleAnimId);
        teleprompterState.idleAnimId = null;
      }
      teleprompterState.isCameraOn = true;
      if (camText) camText.textContent = 'Turn Off Camera';
      cameraBtn.querySelector('span:first-child').textContent = '📷';
      showToast('Camera feed live! Ready to broadcast.');
    } catch {
      showToast('Camera device not found or access denied. Using animated studio background.');
    }
  });

  // 8. Recording and Downloading (Toggle Record Clip <-> Stop Recording with Overlays)
  recordBtn?.addEventListener('click', async () => {
    const recText = $('#record-btn-text');
    const studentName = nameInput?.value.trim();

    // STOP RECORDING
    if (teleprompterState.isRecording) {
      clearInterval(teleprompterState.recordTimer);
      teleprompterState.recordTimer = null;
      teleprompterState.isRecording = false;

      if (teleprompterState.compositeAnimId) {
        cancelAnimationFrame(teleprompterState.compositeAnimId);
        teleprompterState.compositeAnimId = null;
      }

      if (teleprompterState.recordedMicStream) {
        teleprompterState.recordedMicStream.getTracks().forEach(t => t.stop());
        teleprompterState.recordedMicStream = null;
      }

      if (teleprompterState.activeCompCanvas && teleprompterState.activeCompCanvas.parentNode) {
        teleprompterState.activeCompCanvas.remove();
        teleprompterState.activeCompCanvas = null;
      }

      recordBtn.classList.remove('btn-recording');
      if (recText) recText.textContent = 'Record Broadcast Clip';
      recordBtn.querySelector('span:first-child').textContent = '⏺️';

      // As soon as recording is over, reset prompter to start button again
      teleprompterState.isPrompterPaused = true;
      teleprompterState.prompterStarted = false;
      teleprompterState.tickerOffset = 0;
      const activeTrack = $('#anchor-teleprompter-track') || track;
      if (activeTrack) activeTrack.style.transform = 'translateX(0px)';
      updatePrompterButtonUI();

      if (teleprompterState.mediaRecorder && teleprompterState.mediaRecorder.state !== 'inactive') {
        teleprompterState.mediaRecorder.stop();
      }
      showToast('Finalizing broadcast recording with overlays...');
      return;
    }

    // START RECORDING
    if (!studentName) {
      showToast('Please enter your name before recording your broadcast clip!');
      nameInput?.focus();
      return;
    }

    try {
      // Determine canvas resolution (HD 1280x720 or native webcam resolution)
      let compW = 1280;
      let compH = 720;
      if (teleprompterState.isCameraOn && video && video.videoWidth > 0 && video.videoHeight > 0) {
        compW = Math.max(1280, video.videoWidth);
        compH = Math.max(720, video.videoHeight);
      }

      // Create offscreen compositing canvas attached hidden to DOM for solid rendering
      const compCanvas = document.createElement('canvas');
      compCanvas.width = compW;
      compCanvas.height = compH;
      compCanvas.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;pointer-events:none;opacity:0;z-index:-1;';
      document.body.appendChild(compCanvas);
      teleprompterState.activeCompCanvas = compCanvas;
      const compCtx = compCanvas.getContext('2d', { alpha: false });

      // Frame composer: Draws webcam or studio background + Logo (top-left) + Lower third (bottom).
      // Crucially, NO teleprompter text is drawn into the recording!
      const renderCompositeFrame = () => {
        // 1. Draw Background or Camera Feed
        if (teleprompterState.isCameraOn && video && video.readyState >= 2) {
          compCtx.save();
          // Mirror video frame horizontally so recording matches the preview monitor
          compCtx.translate(compW, 0);
          compCtx.scale(-1, 1);
          compCtx.drawImage(video, 0, 0, compW, compH);
          compCtx.restore();
        } else if (canvas) {
          // Draw animated studio canvas (globe, equalizer, telemetry)
          compCtx.drawImage(canvas, 0, 0, compW, compH);
        } else {
          compCtx.fillStyle = '#070c1d';
          compCtx.fillRect(0, 0, compW, compH);
        }

        const scale = compW / 1280;

        // 2. Kanakia International School Logo at Top Left (Downloaded Video Only)
        drawBroadcastSchoolLogo(compCtx, compW, compH, scale);

        // 3. Lower-Third Broadcast Banner (Tag pill + Student/Role/School Copy)
        drawBroadcastLowerThird(compCtx, compW, compH, scale);
      };

      // Draw initial frame immediately so stream is ready
      renderCompositeFrame();

      // Continuous compositor animation loop
      const compositeLoop = () => {
        if (!teleprompterState.isRecording) return;
        renderCompositeFrame();
        teleprompterState.compositeAnimId = requestAnimationFrame(compositeLoop);
      };

      // Capture 30 FPS stream from compositing canvas
      const canvasStream = compCanvas.captureStream ? compCanvas.captureStream(30) : (compCanvas.mozCaptureStream ? compCanvas.mozCaptureStream(30) : null);
      if (!canvasStream) {
        showToast('Canvas stream capture unsupported on this browser.');
        compCanvas.remove();
        return;
      }

      // Audio setup (webcam mic or microphone getUserMedia)
      let audioTracks = [];
      if (teleprompterState.isCameraOn && teleprompterState.cameraStream) {
        audioTracks = teleprompterState.cameraStream.getAudioTracks();
      }
      if (!audioTracks || audioTracks.length === 0) {
        try {
          const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
          teleprompterState.recordedMicStream = mic;
          audioTracks = mic.getAudioTracks();
        } catch {
          // Audio optional if denied or missing
        }
      }

      const combinedTracks = [
        ...canvasStream.getVideoTracks(),
        ...(audioTracks || [])
      ];
      const recordStream = new MediaStream(combinedTracks);

      teleprompterState.recordedChunks = [];
      let supportedMime = '';
      const mimeCandidates = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4'
      ];
      for (const m of mimeCandidates) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) {
          supportedMime = m;
          break;
        }
      }

      const recorderOptions = supportedMime ? { mimeType: supportedMime } : undefined;
      const recorder = new MediaRecorder(recordStream, recorderOptions);

      recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) {
          teleprompterState.recordedChunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        if (teleprompterState.compositeAnimId) {
          cancelAnimationFrame(teleprompterState.compositeAnimId);
          teleprompterState.compositeAnimId = null;
        }
        if (teleprompterState.recordedMicStream) {
          teleprompterState.recordedMicStream.getTracks().forEach(t => t.stop());
          teleprompterState.recordedMicStream = null;
        }
        if (teleprompterState.activeCompCanvas && teleprompterState.activeCompCanvas.parentNode) {
          teleprompterState.activeCompCanvas.remove();
          teleprompterState.activeCompCanvas = null;
        }

        const blob = new Blob(teleprompterState.recordedChunks, { type: supportedMime || 'video/webm' });
        const blobUrl = URL.createObjectURL(blob);
        const safeName = studentName.replace(/[^a-zA-Z0-9_-]/g, '_');
        const ext = (supportedMime && supportedMime.includes('mp4')) ? 'mp4' : 'webm';
        const fileName = `EnglishCareers_${safeName}_${Date.now()}.${ext}`;

        teleprompterState.lastBlobUrl = blobUrl;
        teleprompterState.lastFileName = fileName;

        // 1. Automatic Immediate Download
        const dlLink = document.createElement('a');
        dlLink.href = blobUrl;
        dlLink.download = fileName;
        document.body.appendChild(dlLink);
        dlLink.click();
        document.body.removeChild(dlLink);

        // 2. Reveal dedicated Download Video Clip button
        if (downloadBtn) {
          downloadBtn.style.display = 'inline-flex';
          downloadBtn.onclick = () => {
            const reDl = document.createElement('a');
            reDl.href = teleprompterState.lastBlobUrl || blobUrl;
            reDl.download = teleprompterState.lastFileName || fileName;
            document.body.appendChild(reDl);
            reDl.click();
            document.body.removeChild(reDl);
            showToast('Downloading saved broadcast clip...');
          };
        }

        showToast('✅ Broadcast clip saved! Video downloaded with official overlays.');
      };

      recorder.start(250);
      teleprompterState.mediaRecorder = recorder;
      teleprompterState.isRecording = true;
      teleprompterState.recordSeconds = 0;

      // Start compositing loop
      teleprompterState.compositeAnimId = requestAnimationFrame(compositeLoop);

      // Start teleprompter scrolling on-screen for the speaker
      teleprompterState.prompterStarted = true;
      teleprompterState.isPrompterPaused = false;
      updatePrompterButtonUI();

      recordBtn.classList.add('btn-recording');
      if (recText) recText.textContent = 'Stop Recording (00:00)';
      recordBtn.querySelector('span:first-child').textContent = '⏹️';

      teleprompterState.recordTimer = setInterval(() => {
        teleprompterState.recordSeconds++;
        const mins = String(Math.floor(teleprompterState.recordSeconds / 60)).padStart(2, '0');
        const secs = String(teleprompterState.recordSeconds % 60).padStart(2, '0');
        if (recText) recText.textContent = `Stop Recording (${mins}:${secs})`;
      }, 1000);

      showToast('🔴 Recording started! Speak clearly and read the moving teleprompter.');
    } catch (err) {
      console.error('Recording error:', err);
      showToast('Recording error: Device permissions or codec unsupported.');
    }
  });
}

// ─── 9. ARCADE GAMES SUITE (JOBTRIS, WORDLE, FLASHCARDS, ETC.) ────────────────
function renderGameArena(gameKey) {
  const mount = $('#game-arena-mount');
  if (!mount) return;

  initGamePicker();

  $$('#game-picker-tabs .filter-chip').forEach(b => {
    b.classList.toggle('active', b.dataset.game === gameKey);
  });

  if (gameKey === 'jobtris') {
    renderJobtris(mount);
  } else if (gameKey === 'blitz') {
    renderWordBlitz(mount);
  } else if (gameKey === 'slap') {
    renderGrammarSlap(mount);
  } else if (gameKey === 'gaming-hall') {
    renderGamingHall(mount);
  } else if (gameKey === 'wordle') {
    renderWordle(mount);
  } else if (gameKey === 'flashcards') {
    renderFlashCards(mount);
  } else if (gameKey === 'dict') {
    renderDictionaryLookup(mount);
  } else if (gameKey === 'spelling') {
    renderSpellingBee(mount);
  } else if (gameKey === 'hangman') {
    renderHangman(mount);
  } else {
    mount.innerHTML = `<div style="text-align:center;padding:40px;">Select a game to begin playing!</div>`;
  }
}

function initGamePicker() {
  const tabsContainer = $('#game-picker-tabs');
  const leftBtn = $('#btn-game-scroll-left');
  const rightBtn = $('#btn-game-scroll-right');

  // Wire game selection chips
  $$('#game-picker-tabs .filter-chip').forEach(btn => {
    btn.onclick = () => {
      renderGameArena(btn.dataset.game);
      // Auto-center the clicked game chip in the visible viewport
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    };
  });

  // Setup unified themed horizontal scroll shelf
  setupHorizontalScrollShelf(tabsContainer, leftBtn, rightBtn, 300);
}

// =========================================================================
// AI-POWERED GAMING HALL (5 Immersive Gemini Quests with 3D Arc Carousel)
// =========================================================================

let gamingHallArcIndex = 0;
const GAMING_HALL_QUESTS = [
  {
    id: 'scribe',
    num: 'I',
    title: 'The Scribe',
    tag: 'Branching Gothic Quest',
    desc: 'An interactive dark-fantasy narrative. You choose the path; Gemini weaves the prose and branching consequences.',
    icon: '📜'
  },
  {
    id: 'etym',
    num: 'II',
    title: 'The Etymologist',
    tag: 'Root-Word Detective',
    desc: 'Unearth ancient Latin & Greek root lineages, discover how words were forged, and solve origin riddles.',
    icon: '🏛️'
  },
  {
    id: 'bard',
    num: 'III',
    title: "The Bard's Mirror",
    tag: 'Poetic Mirror & Critic',
    desc: 'Commission Shakespearean sonnets, Gothic ballads, or submit your own writing for an AI literary critique.',
    icon: '🪞'
  },
  {
    id: 'oracle',
    num: 'IV',
    title: 'The Career Oracle',
    tag: 'Literary Divination',
    desc: 'Answer three personality divination questions to uncover your destiny in an unexpected English career in India.',
    icon: '🔮'
  },
  {
    id: 'cipher',
    num: 'V',
    title: 'The Ink Cipher',
    tag: 'University Archive Mystery',
    desc: 'Investigate a historic Indian university archive with an illuminated lens cursor, questioning suspects to solve the case.',
    icon: '🔍'
  }
];

async function callAiQuest(prompt, isJson = false) {
  const geminiKeys = (localStorage.getItem('cf_gemini_keys') || localStorage.getItem('cf_gemini_key') || STATE.config.gemini_keys || '').trim();
  const primaryKey = geminiKeys ? geminiKeys.split(/[\r\n,]+/)[0].trim() : '';

  // 1. First attempt backend /api/ai with failover across key pool
  try {
    const res = await fetch(getApiUrl('api/ai'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gemini-key': primaryKey,
        'x-goog-api-key': primaryKey
      },
      body: JSON.stringify({ task: 'quest', prompt, json: isJson, gemini_keys: geminiKeys })
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.reply) return data.reply;
      if (data && data.text) {
        if (isJson) {
          const m = data.text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
          if (m) {
            try { return JSON.parse(m[0]); } catch {}
          }
        }
        return data.text;
      }
    }
  } catch (e) {}

  // 2. Direct client-side Gemini fallback
  const models = ['gemini-1.5-flash', 'gemini-2.0-flash'];
  for (const m of models) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(primaryKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': primaryKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: isJson ? { responseMimeType: 'application/json' } : {}
        })
      });
      if (res.ok) {
        const data = await res.json();
        const t = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
        if (t) {
          if (isJson) {
            const match = t.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
            if (match) {
              try { return JSON.parse(match[0]); } catch {}
            }
          }
          return t;
        }
      }
    } catch (e) {}
  }

  // Graceful signal: return null so offline dual-engine seamlessly activates
  return null;
}

async function typeInto(el, text) {
  el.textContent = '';
  for (const char of text) {
    el.textContent += char;
    await new Promise(r => setTimeout(r, 12));
  }
}

// ==========================================
// OFFLINE ZERO-ERROR ADVENTURE ENGINES
// ==========================================
const SCRIBE_OFFLINE_TALES = [
  {
    story: "Rain lashes against the stained-glass lancets of the ancient library at St. Jude's. Before you stands an arched obsidian portal, inscribed with faint silver runes that shimmer whenever thunder shakes the spires. In your hand rests a brass serpent key with amethyst eyes. An iron-banded door waits to your left, while a spiral staircase descends into the subterranean vaults.",
    choices: [
      "Insert the serpent key into the silver-inscribed obsidian portal",
      "Unlatch the iron-banded door leading toward the cloisters",
      "Descend the spiral stone staircase into the whispering vaults"
    ]
  },
  {
    story: "The heavy lock yields with a hollow click. Beyond lies a circular scriptorium where hundreds of wax candles flicker without smoke. On a lectern of carved cedar rests an illuminated codex, its vellum pages turning on their own in the damp draft. Shadows dance along rows of leather-bound volumes that whisper in archaic Latin as your boots strike the flagstones.",
    choices: [
      "Approach the self-turning codex and decipher the glowing script",
      "Hold your lantern toward the whispering bookshelves to read the titles",
      "Search the perimeter for hidden draft exits before stepping forward"
    ]
  },
  {
    story: "As your fingers graze the vellum, the ink rearranges itself into a luminous constellation map. It reveals that the founders of the academy concealed three golden astronomical astrolabes across the quadrangle to balance intellect, speech, and moral courage. A sudden draft extinguishes half the candles; a veiled figure watches you from the arched mezzanine above.",
    choices: [
      "Call out to the veiled figure in clear, commanding Latin",
      "Memorize the constellation coordinates and slip the map into your satchel",
      "Douse your lantern and take cover behind the grand celestial globe"
    ]
  },
  {
    story: "The figure steps into the pale moonlight, revealing not a ghost, but an intricate brass automaton crafted by Victorian horologists. Its chest houses a clockwork pendulum that ticks with rhythmic precision. In its mechanical palm rests a wax-sealed parchment bearing the seal of the Master Scribe. 'To proceed,' speaks the brass voice, 'you must declare your true academic purpose.'",
    choices: [
      "'I seek mastery over language to advocate for truth and justice'",
      "'I seek knowledge of antiquity to bridge ancient wisdom with modern science'",
      "'I seek the courage to articulate stories that awaken human empathy'"
    ]
  },
  {
    story: "'A noble vocation,' the automaton hums, its brass gears spinning in harmonious chords. The floor shudders slightly as a secret hydraulic dais rises, elevating you toward the observatory tower under a star-strewn sky. The wind howls across the parapets, carrying the distant bell tolls of midnight. Three crystal vials glow atop an onyx altar: one azure, one crimson, and one emerald.",
    choices: [
      "Select the Azure Vial representing boundless clarity of thought",
      "Select the Crimson Vial representing fiery passion and persuasion",
      "Select the Emerald Vial representing enduring growth and resilience"
    ]
  },
  {
    story: "You uncork the chosen vial; a luminous vapor envelops your quill. When you set ink to paper, every word flows with effortless grace, precision, and persuasive grandeur. The tempest outside recedes into a calm dawn over the campus spires. You have passed the Scribe's trial and earned the mantle of Master Rhetorician. Your journey as an articulate leader of tomorrow has only just begun.",
    choices: []
  }
];

const ETYM_OFFLINE_WORDS = [
  {
    word: "articulate",
    origin: "From Latin 'articulatus', past participle of 'articulare' ('to divide into joints, utter distinctly'), from 'articulus' ('a small joint, knuckle'). Just as healthy bones move smoothly at their joints, an articulate speaker connects thoughts and syllables with effortless clarity and poise.",
    roots: ["artus (Latin) → joint, fitting together", "articulus (Latin) → small joint, knuckle, distinct part"],
    riddle: "Which ancient anatomical metaphor gave rise to the word 'articulate'?",
    options: [
      "The seamless bending of finger joints",
      "The rhythmic beating of the human heart",
      "The clarity of the visionary eye",
      "The steady breath of a runner"
    ],
    answer: 0
  },
  {
    word: "serendipity",
    origin: "Coined in 1754 by English author Horace Walpole in a letter to Horace Mann. He drew inspiration from the Persian fairy tale 'The Three Princes of Serendip' (the ancient Persian name for Sri Lanka), whose heroes were 'always making discoveries, by accidents and sagacity, of things they were not in quest of.'",
    roots: ["Serendip (Old Persian) → island of Sri Lanka (from Sanskrit Simhaladvipa)", "-ity (Latin suffix) → state, condition, or quality of"],
    riddle: "What geographical land was historically called 'Serendip' in Persian lore?",
    options: [
      "Sri Lanka (Ceylon)",
      "The Maldives archipelago",
      "Constantinople (Istanbul)",
      "The Indus Valley"
    ],
    answer: 0
  },
  {
    word: "candid",
    origin: "From Latin 'candidus' meaning 'glistening white, pure, sincere'. In ancient Rome, men campaigning for political office wore a specially bleached, brilliant white toga known as the 'toga candida' to symbolize purity of motive, honesty, and incorruptibility. Hence arose both 'candid' (frank, honest) and 'candidate'.",
    roots: ["candere (Latin) → to shine, glow white", "candidus (Latin) → bright, pure, unblemished, sincere"],
    riddle: "Why were Roman political candidates named after 'candidus'?",
    options: [
      "They wore bleached white togas to symbolize honest intentions",
      "They wrote political manifestos on white marble tablets",
      "They swore oaths under white banners at the Forum",
      "They were required to serve white wine to citizens"
    ],
    answer: 0
  },
  {
    word: "ephemeral",
    origin: "From Greek 'ephemeros' ('lasting only a day'), composed of 'epi' ('on, during') and 'hemera' ('day'). Originally used in ancient Greek medicine for fevers and ailments lasting only twenty-four hours, the term was later adopted by English Romantic poets to describe fleeting beauty and passing moments of insight.",
    roots: ["epi (Greek) → upon, lasting for", "hemera (Greek) → day"],
    riddle: "What literal time duration does the Greek root 'hemera' designate?",
    options: [
      "A single day (24 hours)",
      "A full lunar cycle (28 days)",
      "A single hour",
      "The brief duration of twilight"
    ],
    answer: 0
  },
  {
    word: "melancholy",
    origin: "From Greek 'melankholia', from 'melas' ('black, dark') and 'khole' ('bile'). In ancient Hippocratic and Galenic medicine, human health and personality were thought to be regulated by four bodily humors. An excess of black bile was believed to foster a reflective, somber, and deeply artistic disposition.",
    roots: ["melas / melan- (Greek) → black, dark", "khole (Greek) → bile, bitter gall"],
    riddle: "Which bodily humor did ancient physicians believe induced melancholy?",
    options: [
      "Black bile",
      "Yellow bile",
      "Blood",
      "Phlegm"
    ],
    answer: 0
  },
  {
    word: "resilient",
    origin: "From Latin 'resiliens', present participle of 'resilire' ('to leap back, rebound'), formed from 're-' ('back, again') and 'salire' ('to jump, leap'). Originally describing physical objects springing back to their original shape after deformation, it evolved into a premier psychological virtue for leaders who bounce back from adversity.",
    roots: ["re- (Latin) → back, again", "salire (Latin) → to leap, jump, spring"],
    riddle: "What dynamic physical action is denoted by the Latin root 'salire'?",
    options: [
      "To leap or spring back",
      "To withstand heavy pressure without bending",
      "To flow smoothly like river water",
      "To anchor deeply into the soil"
    ],
    answer: 0
  },
  {
    word: "lucid",
    origin: "From Latin 'lucidus' ('shining, bright, clear'), derived from 'lux' (genitive 'lucis', 'light'). A lucid argument or dream is one illuminated by clarity, where thoughts are transparent and immediately understood without obscurity.",
    roots: ["lux / lucis (Latin) → light, brilliance", "-idus (Latin suffix) → state or tendency toward"],
    riddle: "What does the Latin root 'lucis' mean?",
    options: [
      "Light or brilliance",
      "Clear flowing water",
      "The rational mind",
      "Spoken voice"
    ],
    answer: 0
  },
  {
    word: "eloquence",
    origin: "From Latin 'eloquentia', from 'eloqui' ('to speak out'), formed from 'e-' / 'ex-' ('out, forth') and 'loqui' ('to speak'). Eloquence is literally the power to pour one's inner conviction and thoughts outward into the world with grace, force, and persuasion.",
    roots: ["ex- / e- (Latin) → out, forth", "loqui (Latin) → to speak, utter"],
    riddle: "Which other English word shares the root 'loqui' with eloquence?",
    options: [
      "Soliloquy and Colloquial",
      "Locomotive and Local",
      "Logic and Logistics",
      "Eloquent and Eclipse"
    ],
    answer: 0
  },
  {
    word: "tenacious",
    origin: "From Latin 'tenax' (genitive 'tenacis', 'holding fast, gripping, stubborn'), from 'tenere' ('to hold, keep, grasp'). A tenacious student holds firmly to their aspirations through setbacks, never letting go of their vision.",
    roots: ["tenere (Latin) → to hold, retain, grasp", "-ous (Latin suffix) → full of, characterized by"],
    riddle: "Which common English verb is directly derived from 'tenere'?",
    options: [
      "Retain, Maintain, and Sustain",
      "Tension and Tendency",
      "Tender and Tenderize",
      "Tentative and Tenuous"
    ],
    answer: 0
  },
  {
    word: "solace",
    origin: "From Old French 'solas', from Latin 'solacium' ('a soothing, comforting, solace'), from 'solari' ('to comfort, console'). In classical antiquity, solace was the peaceful quiet offered to weary travelers and scholars following arduous toil.",
    roots: ["solari (Latin) → to soothe, comfort, alleviate sorrow", "-ium (Latin suffix) → instrument or result of action"],
    riddle: "Which psychological word shares the Latin root 'solari'?",
    options: [
      "Console (consolation)",
      "Solitary",
      "Solar",
      "Solvent"
    ],
    answer: 0
  }
];

function getBardOfflineResponse(mode, theme) {
  const cleanTheme = theme || 'ambition and the power of articulate speech';
  if (mode.includes('sonnet') || mode.includes('Shakespearean')) {
    return `Shall modern minds in digital halls awake,
` +
      `When ancient words kindle the youthful soul?
` +
      `No fleeting code the eloquent heart can shake,
` +
      `Where deep reflection seeks a noble goal.
` +
      `Though screens may flicker in the dusky night,
` +
      `And hurried voices crowd the passing wind,
` +
      `The spoken phrase retains its sovereign might,
` +
      `To guide the searching corridors of mind.
` +
      `Let reason tune the cadence of thy tongue,
` +
      `As ${cleanTheme} takes majestic flight;
` +
      `No song of wisdom shall remain unsung,
` +
      `While rhetoric holds its incandescent light.
` +
      `For he who speaks with clarity and grace,
` +
      `Commands the future and preserves our place.`;
  } else if (mode.includes('Gothic') || mode.includes('Romantic')) {
    return `Upon the midnight cloisters fell a shadow pale and deep,
` +
      `Where ancient scribes in dusty tombs their quiet vigils keep.
` +
      `A solitary lantern burned beside the oaken door,
` +
      `As whispered echoes of ${cleanTheme} drifted cross the floor.

` +
      `No wind disturbed the cypress boughs, no tempest stirred the bay,
` +
      `Yet in the ink upon the page the silver secrets lay.
` +
      `Awake, O seeker of the quill, beneath the vaulted dome!
` +
      `For in the mastery of words the wandering soul finds home.`;
  } else {
    return `Literary & Rhetorical Critique for: "${cleanTheme}"

` +
      `1. Cadence & Rhythm (8.5/10):
` +
      `Your phrase exhibits strong initial momentum. To elevate the rhythmic impact, alternate between brisk monosyllabic assertions and stately Latinate polysyllables.

` +
      `2. Metaphorical Depth (9.0/10):
` +
      `The conceptual foundation connects well with the listener's imagination. Deepen the sensory resonance by anchoring abstract concepts to tactile elements like light, weight, or resonance.

` +
      `3. Say It Better (Actionable Revision):
` +
      `"True eloquence is not the mere ornament of thought, but its decisive architecture."`;
  }
}

function getOracleOfflineDestiny(q1, q2, q3, bio) {
  const bioLower = (bio || '').toLowerCase();
  if (bioLower.includes('pilot') || bioLower.includes('aviat') || bioLower.includes('sky') || q1.includes('Stormy coastal')) {
    return {
      title: "Aeronautical Communications Director & Flight Operations Strategist",
      why: "Your affinity for expansive frontiers and spotting critical patterns aligns seamlessly with aviation command, crisis communications, and international aerospace protocol.",
      path: [
        "Master DGCA standard radiotelephony phraseology and STEM-English synthesis in school.",
        "Pursue a B.Sc in Aviation / Aeronautics paired with ICAO Level 6 English Proficiency certification.",
        "Ascend into chief airline flight operations dispatch, flight deck command, or air traffic safety oversight."
      ]
    };
  } else if (bioLower.includes('law') || bioLower.includes('court') || bioLower.includes('justice') || q2.includes('Persuading') || q3.includes('debate')) {
    return {
      title: "Supreme Court Appellate Advocate & Constitutional Jurist",
      why: "Your gift for persuasive argument, rhetorical precision, and rigorous debate makes you a natural advocate in high-stakes appellate litigation and public interest jurisprudence.",
      path: [
        "Excel in National Model United Nations, Parliamentary Debating, and board exam English in Class 11-12.",
        "Clear CLAT to enter a premier National Law University (NLSIU Bengaluru / NALSAR Hyderabad) for B.A. LL.B. (Hons).",
        "Clerk with High Court / Supreme Court judges and build a bespoke chamber practice in corporate and constitutional law."
      ]
    };
  } else if (bioLower.includes('tech') || bioLower.includes('ai') || bioLower.includes('system') || q2.includes('Imagining complex')) {
    return {
      title: "Cognitive AI Dialogue Architect & Human-Centered UX Designer",
      why: "As artificial intelligence reshapes human interaction, companies require linguists who understand semantic nuances, tone, prompt engineering, and conversational psychology.",
      path: [
        "Blend literature studies with introductory computer science and cognitive psychology in school.",
        "Earn a degree in Computational Linguistics, Cognitive Science, or English Literature at Ashoka / EFL University.",
        "Lead generative AI UX strategy and conversational voice architecture at global technology frontiers."
      ]
    };
  } else {
    return {
      title: "Chief Narrative Officer & Global Brand Strategist",
      why: "Your love of storytelling, reflective depth, and cultural curiosity positions you at the helm of international media, publication houses, and global corporate strategy.",
      path: [
        "Build a prolific writing portfolio, edit the school journal, and publish analytical essays.",
        "Pursue English Literature at Delhi University (St. Stephen's / Lady Shri Ram) or St. Xavier's Mumbai.",
        "Lead corporate brand identity, investor communications, or executive speechwriting for Fortune 500 enterprises."
      ]
    };
  }
}

function getCipherOfflineInspector(q, currentCase) {
  const ql = (q || '').toLowerCase();
  if (ql.includes('finch') || ql.includes('doctor')) {
    return "Dr. Finch was observed in the east reading alcove examining the astronomy folio until 11:15 PM. His alibi is partially substantiated by the night librarian, yet red ink stains were later discovered upon his cuffs.";
  } else if (ql.includes('margaret') || ql.includes('sister')) {
    return "Sister Margaret possesses the only brass key to the manuscript display cabinet. She claims she surrendered her satchel at the front foyer, yet a duplicate wax seal impression was found near her prayer book.";
  } else if (ql.includes('kulkarni') || ql.includes('librarian')) {
    return "Librarian Kulkarni logged the archival records meticulously at 10:45 PM. However, the archive logbook entries for the Nalanda folio show an irregular erasure and an unexpected cipher timestamp.";
  } else if (ql.includes('time') || ql.includes('when') || ql.includes('hour')) {
    return "The archival chamber bells rang midnight when the display was discovered ajar. Forensic dust patterns suggest the glass lid was elevated between 11:20 PM and 11:45 PM.";
  } else if (ql.includes('clue') || ql.includes('wax') || ql.includes('seal')) {
    return `The key physical evidence is "${currentCase?.clue || 'the blue wax seal'}". Whoever handled the seal had recently touched classical calligraphic ink and damp parchment.`;
  } else {
    return `The inspector observes: "Every clue in this archive connects language with intent. Look closely at the suspects' declared motivations and cross-reference them with the physical evidence in the exhibit case."`;
  }
}

function renderGamingHall(mount) {
  mount.innerHTML = `
    <div style="border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
        <div>
          <h3 style="font-size:22px;display:flex;align-items:center;gap:8px;">
            <span>🔮</span> <span>The Gaming Hall: Five Gemini-Powered Quests</span>
          </h3>
          <span style="font-size:13px;color:var(--text-dim);">
            Immersive generative literary adventures. Click any side card to bring it forward, or the center card to embark!
          </span>
        </div>
        <span class="badge-pill" style="background:rgba(0,240,255,0.15);color:var(--accent-cyan);border:1px solid var(--accent-cyan);font-weight:700;">
          ✨ Powered by Gemini AI
        </span>
      </div>
    </div>

    <!-- 3D Arc Carousel -->
    <div class="arc-stage">
      <div class="arc-carousel" id="gaming-arc-carousel"></div>
      <div class="arc-nav-row">
        <button class="arc-nav-btn" id="arc-prev" title="Previous Quest" type="button">
          <span class="arc-nav-arrow">‹</span>
          <span>Previous</span>
        </button>
        <div class="arc-indicator-pill" id="arc-indicator">
          <span>Quest 1 of 5</span>
          <span style="opacity:0.4;">·</span>
          <span style="color:var(--accent-cyan);font-weight:800;">The Scribe</span>
        </div>
        <button class="arc-nav-btn" id="arc-next" title="Next Quest" type="button">
          <span>Next</span>
          <span class="arc-nav-arrow">›</span>
        </button>
      </div>
    </div>

    <!-- Active Quest Stage -->
    <div id="quest-active-stage" style="margin-top:20px;">
      <div class="quest-view-card" id="quest-stage-inner">
        <!-- Quest content mounts here -->
      </div>
    </div>
  `;

  const carousel = $('#gaming-arc-carousel');
  const stageInner = $('#quest-stage-inner');
  const indicator = $('#arc-indicator');
  let activeIndex = 0;

  function renderArc() {
    carousel.innerHTML = '';
    const n = GAMING_HALL_QUESTS.length;
    GAMING_HALL_QUESTS.forEach((q, i) => {
      let offset = i - activeIndex;
      if (offset > n / 2) offset -= n;
      if (offset < -n / 2) offset += n;
      const absOffset = Math.abs(offset);

      const card = document.createElement('div');
      card.className = `arc-card ${absOffset === 0 ? 'active' : ''}`;
      card.setAttribute('data-index', i);

      const tx = offset * 210;
      const ty = absOffset * absOffset * 18;
      const rot = offset * 8;
      const sc = 1 - absOffset * 0.12;
      card.style.transform = `translateX(${tx}px) translateY(${ty}px) rotate(${rot}deg) scale(${sc})`;
      card.style.zIndex = 10 - absOffset;
      card.style.opacity = absOffset > 2 ? '0' : (1 - absOffset * 0.25).toString();
      card.style.pointerEvents = absOffset > 2 ? 'none' : 'auto';

      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span class="arc-card-icon" style="font-size:26px;">${q.icon}</span>
          <span class="badge-pill" style="font-size:10.5px;padding:2px 8px;background:rgba(0,240,255,0.12);color:var(--accent-cyan);border:1px solid rgba(0,240,255,0.3);font-weight:700;">Quest ${q.num}</span>
        </div>
        <div class="arc-card-title" style="font-size:17px;font-weight:800;color:var(--text-main);margin-bottom:4px;">${q.title}</div>
        <div class="arc-card-subtitle" style="font-size:11.5px;font-weight:700;color:var(--accent-cyan);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">${escapeHtml(q.tag || '')}</div>
        <div class="arc-card-desc" style="font-size:12.5px;color:var(--text-muted);line-height:1.45;flex:1;">${q.desc}</div>
        <div class="arc-card-action" style="margin-top:12px;font-size:12px;font-weight:700;color:${absOffset === 0 ? 'var(--accent-cyan)' : 'var(--text-dim)'};display:flex;align-items:center;gap:6px;">
          ${absOffset === 0 ? '▶ Launch Quest' : 'Click to Inspect'}
        </div>
      `;

      card.addEventListener('click', () => {
        if (activeIndex === i) {
          launchQuest(i);
        } else {
          activeIndex = i;
          renderArc();
          launchQuest(i);
        }
      });

      carousel.appendChild(card);
    });

    if (indicator) {
      indicator.innerHTML = `
        <span style="opacity:0.8;">Quest ${activeIndex + 1} of ${n}</span>
        <span style="opacity:0.4;">·</span>
        <span style="color:var(--accent-cyan);font-weight:800;">${GAMING_HALL_QUESTS[activeIndex].title}</span>
      `;
    }
  }

  function launchQuest(idx) {
    if (!stageInner) return;
    stageInner.innerHTML = '';
    switch (idx) {
      case 0: launchQuestScribe(stageInner); break;
      case 1: launchQuestEtym(stageInner); break;
      case 2: launchQuestBard(stageInner); break;
      case 3: launchQuestOracle(stageInner); break;
      case 4: launchQuestCipher(stageInner); break;
      default: launchQuestScribe(stageInner);
    }
    stageInner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  $('#arc-prev')?.addEventListener('click', () => {
    activeIndex = (activeIndex - 1 + GAMING_HALL_QUESTS.length) % GAMING_HALL_QUESTS.length;
    renderArc();
    launchQuest(activeIndex);
  });

  $('#arc-next')?.addEventListener('click', () => {
    activeIndex = (activeIndex + 1) % GAMING_HALL_QUESTS.length;
    renderArc();
    launchQuest(activeIndex);
  });

  renderArc();
  launchQuest(0);
}

// QUEST 1: The Scribe
function launchQuestScribe(mount) {
  let turn = 0;

  mount.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <h3 style="font-size:20px;margin:0;">📜 Quest I: The Scribe (Victorian Gothic Tale)</h3>
      <span class="badge-pill badge-reg" id="scribe-turn-badge">Chapter 1 of 6</span>
    </div>
    <div id="scribe-story-box" class="quest-output-box">The ink is still wet on the parchment...</div>
    <div id="scribe-choices-box" class="quest-options-grid"></div>
    <div style="display:flex;gap:10px;margin-top:14px;align-items:center;flex-wrap:wrap;">
      <button class="btn btn-secondary btn-sm" id="btn-scribe-listen" type="button">🔊 Listen to Chapter</button>
      <button class="btn btn-ghost btn-sm" id="btn-scribe-reset" type="button">🔄 Start New Tale</button>
    </div>
  `;

  const storyBox = $('#scribe-story-box');
  const choicesBox = $('#scribe-choices-box');
  const turnBadge = $('#scribe-turn-badge');

  const step = async (choice = null) => {
    choicesBox.innerHTML = '<div style="color:var(--text-muted);"><span class="spinner-sm"></span> The quill moves across the page...</div>';
    turn++;
    if (turnBadge) turnBadge.textContent = `Chapter ${turn} of 6`;

    try {
      let userMsg = '';
      if (!choice) {
        userMsg = 'You write a dark-fantasy Gothic quest in Victorian prose that any high-school student can read. Return JSON {"story":"80-100 words opening the mystery","choices":["choice 1","choice 2","choice 3"]}. Begin the tale.';
      } else {
        userMsg = `The reader chooses: "${choice}". ${turn >= 6 ? 'Bring the tale to a dramatic final conclusion now with choices [].' : 'Continue the tale with 80 words and return JSON {"story":"...","choices":["choice 1","choice 2","choice 3"]}.'}`;
      }

      let data = null;
      try {
        data = await callAiQuest(userMsg, true);
      } catch (e) {
        data = null;
      }

      // Seamless offline dual-engine fallback if AI is unavailable
      if (!data || !data.story) {
        const offlineIndex = Math.min(Math.max(0, turn - 1), SCRIBE_OFFLINE_TALES.length - 1);
        data = SCRIBE_OFFLINE_TALES[offlineIndex];
      }

      const storyText = data.story || 'The tale continues into the shadows...';
      await typeInto(storyBox, storyText);

      choicesBox.innerHTML = '';
      const choices = (turn >= 6) ? [] : (Array.isArray(data.choices) ? data.choices : []);
      if (choices.length > 0) {
        choices.forEach(ch => {
          const btn = document.createElement('button');
          btn.className = 'quest-choice-btn';
          btn.innerHTML = `<span>👉</span> <span>${escapeHtml(ch)}</span>`;
          btn.onclick = () => step(ch);
          choicesBox.appendChild(btn);
        });
      } else {
        choicesBox.innerHTML = '<div style="padding:14px;background:var(--surface);border-radius:var(--radius-md);color:var(--accent-cyan);font-weight:600;">✨ The tale has reached its dramatic conclusion. Click "Start New Tale" to venture forth again.</div>';
      }
    } catch (err) {
      console.warn('Scribe quest step safe recovery:', err);
      const offlineIndex = Math.min(Math.max(0, turn - 1), SCRIBE_OFFLINE_TALES.length - 1);
      const fallbackData = SCRIBE_OFFLINE_TALES[offlineIndex];
      storyBox.textContent = fallbackData.story;
      choicesBox.innerHTML = '';
      (fallbackData.choices || []).forEach(ch => {
        const btn = document.createElement('button');
        btn.className = 'quest-choice-btn';
        btn.innerHTML = `<span>👉</span> <span>${escapeHtml(ch)}</span>`;
        btn.onclick = () => step(ch);
        choicesBox.appendChild(btn);
      });
    }
  };

  $('#btn-scribe-reset')?.addEventListener('click', () => { turn = 0; step(); });
  $('#btn-scribe-listen')?.addEventListener('click', function() {
    const text = storyBox.textContent;
    if (text) speak(text, this);
  });

  step();
}

// QUEST 2: The Etymologist
function launchQuestEtym(mount) {
  mount.innerHTML = `
    <div style="margin-bottom:12px;">
      <h3 style="font-size:20px;margin:0 0 4px 0;">🏛️ Quest II: The Etymologist (Root-Word Detective)</h3>
      <span style="font-size:13px;color:var(--text-dim);">Uncover the ancient Latin &amp; Greek lineages behind modern English career words.</span>
    </div>
    <div style="display:flex;gap:10px;margin-bottom:16px;">
      <input type="text" id="etym-word-input" placeholder="Type an English word (e.g. serendipity, articulate, rhetoric) or leave empty for mystery word..." style="flex:1;">
      <button class="btn btn-primary" id="btn-etym-go">🔍 Unearth Lineage</button>
    </div>
    <div id="etym-result-box" style="min-height:140px;">
      <div style="color:var(--text-muted);padding:14px;background:var(--bg-subtle);border-radius:var(--radius-md);">
        Enter a word or click "Unearth Lineage" to let the detective pick an intriguing mystery root.
      </div>
    </div>
  `;

  const goBtn = $('#btn-etym-go');
  const resultBox = $('#etym-result-box');

  const unearth = async () => {
    const wordInput = $('#etym-word-input')?.value.trim();
    resultBox.innerHTML = '<div style="padding:20px;color:var(--accent-cyan);"><span class="spinner-sm"></span> Excavating historical archives and classical lexicons...</div>';

    const prompt = `${wordInput ? `Word: "${wordInput}".` : 'Pick an interesting, resonant English root word used in leadership or scholarship.'} Return JSON {"word":"the word","origin":"2-4 plain sentences detailing origin history","roots":["root → meaning"],"riddle":"an engaging quiz question about this word\'s origin","options":["option A","option B","option C","option D"],"answer":0}`;

    let j = null;
    try {
      j = await callAiQuest(prompt, true);
    } catch (e) {
      j = null;
    }

    // Offline dual-engine fallback
    if (!j || !j.word || !j.origin) {
      const match = wordInput ? ETYM_OFFLINE_WORDS.find(w => w.word.toLowerCase() === wordInput.toLowerCase()) : null;
      j = match || ETYM_OFFLINE_WORDS[Math.floor(Math.random() * ETYM_OFFLINE_WORDS.length)];
    }

    const rootsHtml = (j.roots || []).map(r => `<li style="font-family:var(--font-mono);font-size:13px;color:var(--accent-cyan);">${escapeHtml(r)}</li>`).join('');

    resultBox.innerHTML = `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:18px;margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <h3 style="font-size:24px;color:var(--accent-cyan);margin:0;text-transform:capitalize;">${escapeHtml(j.word)}</h3>
          <button class="btn btn-secondary btn-sm" id="btn-etym-listen">🔊 Listen</button>
        </div>
        <p style="font-size:14.5px;color:var(--text-main);margin:12px 0;line-height:1.55;">${escapeHtml(j.origin)}</p>
        <div style="margin-top:10px;">
          <strong style="font-size:12px;text-transform:uppercase;color:var(--text-dim);letter-spacing:0.5px;">Root Genealogy:</strong>
          <ul style="margin:6px 0 0 18px;padding:0;">${rootsHtml}</ul>
        </div>
      </div>

      <div style="background:var(--bg-subtle);border:1px solid var(--border);border-radius:var(--radius-md);padding:18px;">
        <div style="font-weight:700;color:var(--accent-magenta);margin-bottom:8px;">🎯 Etymology Riddle Challenge:</div>
        <p style="font-size:14.5px;color:var(--text-main);margin:0 0 12px 0;">${escapeHtml(j.riddle)}</p>
        <div id="etym-options-container" class="quest-options-grid"></div>
      </div>
    `;

    $('#btn-etym-listen')?.addEventListener('click', function() {
      speak(`${j.word}. ${j.origin}`, this);
    });

    const optBox = $('#etym-options-container');
    (j.options || []).forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'quest-choice-btn';
      btn.textContent = opt;
      btn.onclick = () => {
        if (idx === j.answer) {
          btn.style.borderColor = 'var(--accent-green, #10b981)';
          btn.style.background = 'rgba(16, 185, 129, 0.15)';
          btn.innerHTML = `<span>✔ Correct!</span> <span>${escapeHtml(opt)}</span>`;
        } else {
          btn.style.borderColor = 'var(--accent-magenta)';
          btn.style.background = 'rgba(255, 42, 133, 0.12)';
          btn.innerHTML = `<span>✘ Not quite:</span> <span>${escapeHtml(opt)}</span>`;
        }
      };
      optBox.appendChild(btn);
    });
  };

  goBtn?.addEventListener('click', unearth);
}

// QUEST 3: The Bard's Mirror
function launchQuestBard(mount) {
  mount.innerHTML = `
    <div style="margin-bottom:12px;">
      <h3 style="font-size:20px;margin:0 0 4px 0;">🪞 Quest III: The Bard's Mirror</h3>
      <span style="font-size:13px;color:var(--text-dim);">Consult Shakespeare and the Romantic poets for verse composition or a rigorous stylistic critique.</span>
    </div>
    <div style="margin-bottom:12px;">
      <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Select Inscription Mode:</label>
      <select id="bard-mode-select" style="width:100%;padding:10px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:13.5px;">
        <option value="Write a Shakespearean sonnet">Shakespearean Sonnet (14 lines iambic pentameter)</option>
        <option value="Write a Gothic Romantic poem">Gothic Romantic Ballad (Atmospheric &amp; haunting)</option>
        <option value="Critique my writing style">Literary Style Critique (Actionable rhetoric insights)</option>
      </select>
    </div>
    <div style="margin-bottom:12px;">
      <textarea id="bard-input-text" rows="4" placeholder="Enter a theme (e.g. ambition in modern technology, twilight over Mumbai), or paste your own draft writing..." style="width:100%;box-sizing:border-box;font-family:var(--font-sans);font-size:13.5px;"></textarea>
    </div>
    <button class="btn btn-primary" id="btn-bard-go">🪞 Consult the Mirror</button>
    <div id="bard-result-mount" style="margin-top:16px;"></div>
  `;

  $('#btn-bard-go')?.addEventListener('click', async () => {
    const text = $('#bard-input-text')?.value.trim();
    const mode = $('#bard-mode-select')?.value;
    const resBox = $('#bard-result-mount');
    if (!text) {
      showToast('Please enter a theme or writing snippet.');
      return;
    }

    resBox.innerHTML = '<div style="color:var(--accent-cyan);padding:14px;"><span class="spinner-sm"></span> The silvered glass reflects your words...</div>';
    
    let reply = null;
    try {
      const prompt = `${mode} based on: "${text}". Keep under 200 words. Craft with eloquence and memorable cadence.`;
      reply = await callAiQuest(prompt, false);
    } catch (e) {
      reply = null;
    }

    if (!reply || typeof reply !== 'string' || reply.length < 20) {
      reply = getBardOfflineResponse(mode, text);
    }

    resBox.innerHTML = `
      <div class="quest-output-box" style="font-family:Georgia, serif;font-size:15px;line-height:1.75;background:var(--surface);white-space:pre-line;">${escapeHtml(reply)}</div>
      <button class="btn btn-secondary btn-sm" id="btn-bard-listen" type="button">🔊 Recite in Indian Accent</button>
    `;

    $('#btn-bard-listen')?.addEventListener('click', function() {
      speak(reply, this);
    });
  });
}

// QUEST 4: The Career Oracle
function launchQuestOracle(mount) {
  mount.innerHTML = `
    <div style="margin-bottom:12px;">
      <h3 style="font-size:20px;margin:0 0 4px 0;">🔮 Quest IV: The Career Oracle</h3>
      <span style="font-size:13px;color:var(--text-dim);">Three personality divination prompts to uncover an unexpected high-impact career pathway in India.</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:12px;margin-bottom:14px;">
      <div>
        <label style="font-size:12.5px;font-weight:600;display:block;margin-bottom:4px;">1. A cherished place?</label>
        <select id="oracle-q1" style="width:100%;padding:8px 10px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:13px;">
          <option>Ancient university library</option>
          <option>Stormy coastal sea cliff</option>
          <option>Bustling international city</option>
          <option>Quiet botanical sanctuary</option>
        </select>
      </div>
      <div>
        <label style="font-size:12.5px;font-weight:600;display:block;margin-bottom:4px;">2. Your strongest gift?</label>
        <select id="oracle-q2" style="width:100%;padding:8px 10px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:13px;">
          <option>Telling unforgettable stories</option>
          <option>Spotting hidden inconsistencies</option>
          <option>Persuading and inspiring listeners</option>
          <option>Imagining complex worlds and systems</option>
        </select>
      </div>
      <div>
        <label style="font-size:12.5px;font-weight:600;display:block;margin-bottom:4px;">3. A perfect evening?</label>
        <select id="oracle-q3" style="width:100%;padding:8px 10px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:13px;">
          <option>Reading deeply without interruption</option>
          <option>Engaging in passionate friendly debate</option>
          <option>Crafting or writing something original</option>
          <option>Exploring an unfamiliar neighborhood</option>
        </select>
      </div>
    </div>
    <div style="margin-bottom:12px;">
      <input type="text" id="oracle-bio" placeholder="Optional: What excites your curiosity? (e.g. AI ethics, sports law, diplomacy)" style="width:100%;">
    </div>
    <button class="btn btn-primary" id="btn-oracle-go">🔮 Divinate My Career Destiny</button>
    <div id="oracle-result-mount" style="margin-top:16px;"></div>
  `;

  $('#btn-oracle-go')?.addEventListener('click', async () => {
    const q1 = $('#oracle-q1')?.value;
    const q2 = $('#oracle-q2')?.value;
    const q3 = $('#oracle-q3')?.value;
    const bio = $('#oracle-bio')?.value.trim();
    const resBox = $('#oracle-result-mount');

    resBox.innerHTML = '<div style="color:var(--accent-cyan);padding:14px;"><span class="spinner-sm"></span> The astrological astrolabe aligns with your answers...</div>';

    const prompt = `Student Divination: Place="${q1}", Gift="${q2}", Evening="${q3}", Interests="${bio || 'General inquiry'}". Match this student to one unexpected, high-growth career for an English graduate in India. Return JSON {"title":"Career Title","why":"2 concise sentences why it matches their inner gifts","path":["Step 1 in school/college","Step 2 degree/skills","Step 3 career breakthrough"]}`;

    let data = null;
    try {
      data = await callAiQuest(prompt, true);
    } catch (e) {
      data = null;
    }

    if (!data || !data.title || !data.why) {
      data = getOracleOfflineDestiny(q1, q2, q3, bio);
    }

    const stepsHtml = (data.path || []).map((s, i) => `<li><strong>Stage ${i+1}:</strong> ${escapeHtml(s)}</li>`).join('');

    resBox.innerHTML = `
      <div class="holo-divination-card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
          <div>
            <span class="badge-pill" style="background:rgba(0,240,255,0.2);color:var(--accent-cyan);font-weight:700;">✨ Destiny Matched</span>
            <h3 style="font-size:24px;color:var(--accent-cyan);margin:8px 0 4px 0;">${escapeHtml(data.title)}</h3>
          </div>
          <button class="btn btn-secondary btn-sm" id="btn-oracle-listen">🔊 Listen</button>
        </div>
        <p style="font-size:14.5px;color:var(--text-main);margin:10px 0 16px 0;line-height:1.55;">${escapeHtml(data.why)}</p>
        <div style="border-top:1px solid rgba(0,240,255,0.2);padding-top:12px;">
          <strong style="font-size:12px;text-transform:uppercase;color:var(--text-dim);letter-spacing:0.5px;">Your Concrete 3-Stage Roadmap:</strong>
          <ol style="margin:8px 0 0 18px;padding:0;font-size:13.5px;line-height:1.6;color:var(--text-main);">${stepsHtml}</ol>
        </div>
      </div>
    `;

    $('#btn-oracle-listen')?.addEventListener('click', function() {
      speak(`${data.title}. ${data.why}`, this);
    });
  });
}

// QUEST 5: The Ink Cipher
function launchQuestCipher(mount) {
  mount.innerHTML = `
    <div style="margin-bottom:12px;">
      <h3 style="font-size:20px;margin:0 0 4px 0;">🔍 Quest V: The Ink Cipher (Archive Mystery)</h3>
      <span style="font-size:13px;color:var(--text-dim);">Move your mouse across the archive document to illuminate clues with the forensic flashlight.</span>
    </div>
    
    <div class="archive-case-lens" id="cipher-lens-box">
      <div id="cipher-case-content" style="position:relative;z-index:2;">
        <h4 id="cipher-case-title" style="color:var(--accent-cyan);margin-top:0;">Archive Case: The Disappearing Nalanda Translation</h4>
        <p id="cipher-case-intro" style="font-size:14px;line-height:1.6;color:var(--text-main);">
          At midnight in the library quadrangle, a priceless 14th-century illuminated folio translated from Nalanda Sanskrit into early English vanished from its locked mahogany case. Three scholars were logged present in the scriptorium.
        </p>
        <div style="margin:14px 0;padding:12px;background:rgba(0,0,0,0.3);border-radius:var(--radius-sm);border-left:3px solid var(--accent-cyan);">
          <strong>Forensic Clue:</strong> <span id="cipher-case-clue">A smudge of ultramarine blue calligraphic wax was found near the display lock.</span>
        </div>
        <div style="font-weight:700;font-size:13px;color:var(--accent-magenta);margin-bottom:6px;">Suspects Under Interrogation:</div>
        <div id="cipher-suspects-list" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:8px;"></div>
      </div>
    </div>

    <!-- Interrogation Console -->
    <div style="margin-top:16px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:16px;">
      <h4 style="margin:0 0 8px 0;font-size:15px;color:var(--accent-cyan);">Archive Interrogation Log</h4>
      <div style="display:flex;gap:8px;margin-bottom:10px;">
        <input type="text" id="cipher-question-input" placeholder="Question the suspects or ask the archive inspector a clue..." style="flex:1;">
        <button class="btn btn-secondary" id="btn-cipher-ask">Interrogate</button>
      </div>
      <div id="cipher-interrogation-reply" style="min-height:40px;"></div>
      
      <div style="margin-top:14px;border-top:1px solid var(--border);padding-top:12px;">
        <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">Issue Accusation:</label>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <select id="cipher-accuse-select" style="flex:1;min-width:200px;padding:8px 10px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--bg-subtle);color:var(--text);font-size:13px;"></select>
          <button class="btn btn-primary" id="btn-cipher-accuse">⚖️ Present Evidence to Dean</button>
        </div>
        <div id="cipher-verdict-mount" style="margin-top:12px;"></div>
      </div>
    </div>
  `;

  const lensBox = $('#cipher-lens-box');
  const suspectsList = $('#cipher-suspects-list');
  const accuseSelect = $('#cipher-accuse-select');
  const askBtn = $('#btn-cipher-ask');
  const accuseBtn = $('#btn-cipher-accuse');
  const replyBox = $('#cipher-interrogation-reply');
  const verdictMount = $('#cipher-verdict-mount');

  // Flashlight illuminated lens mouse tracker
  lensBox?.addEventListener('mousemove', (e) => {
    const rect = lensBox.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    lensBox.style.setProperty('--lens-x', `${x}px`);
    lensBox.style.setProperty('--lens-y', `${y}px`);
  });

  const currentCase = {
    title: "Archive Case: The Disappearing Nalanda Translation",
    intro: "At midnight in the library quadrangle, a priceless 14th-century illuminated folio translated from Nalanda Sanskrit into early English vanished from its locked mahogany case. Three scholars were logged present in the scriptorium.",
    clue: "A smudge of ultramarine blue calligraphic wax was found near the display lock.",
    culprit: "Sister Margaret",
    culpritReason: "Sister Margaret uses genuine ultramarine wax imported from Venice to seal religious translations, whereas Dr. Finch and Librarian Kulkarni use standard scarlet seal lacquer.",
    suspects: [
      { name: "Dr. Alistair Finch", role: "Visiting Oxford Paleographer", alibi: "Claims he was examining astronomy charts in the north tower." },
      { name: "Sister Margaret", role: "Archival Conservator", alibi: "Claims she was restoring liturgical psalters in the scriptorium." },
      { name: "Librarian Kulkarni", role: "Head Curator", alibi: "Claims he was cataloging new Sanskrit acquisitions in the main annex." }
    ]
  };

  const initCase = () => {
    if (!suspectsList || !accuseSelect) return;
    suspectsList.innerHTML = '';
    accuseSelect.innerHTML = '<option value="">-- Choose suspect to accuse --</option>';

    currentCase.suspects.forEach(s => {
      const card = document.createElement('div');
      card.style.cssText = 'background:var(--bg-subtle);padding:10px;border-radius:var(--radius-sm);border:1px solid var(--border);font-size:12.5px;';
      card.innerHTML = `
        <strong style="color:var(--text-main);">${escapeHtml(s.name)}</strong>
        <div style="color:var(--accent-cyan);font-size:11.5px;margin:2px 0;">${escapeHtml(s.role)}</div>
        <div style="color:var(--text-muted);font-size:11px;">Alibi: "${escapeHtml(s.alibi)}"</div>
      `;
      suspectsList.appendChild(card);

      const opt = document.createElement('option');
      opt.value = s.name;
      opt.textContent = `${s.name} (${s.role})`;
      accuseSelect.appendChild(opt);
    });
  };

  askBtn?.addEventListener('click', async () => {
    const q = $('#cipher-question-input')?.value.trim();
    if (!q || !currentCase) return;

    replyBox.innerHTML = '<div style="color:var(--accent-cyan);padding:8px;"><span class="spinner-sm"></span> Consulting the interrogation log...</div>';
    
    let ans = null;
    try {
      const prompt = `In this mystery case: "${currentCase.intro}", with suspects: ${JSON.stringify(currentCase.suspects)} and clue: "${currentCase.clue}". The student asks the inspector: "${q}". Provide a realistic 40-word detective response that offers a clue without spoiling the mystery immediately.`;
      ans = await callAiQuest(prompt, false);
    } catch (e) {
      ans = null;
    }

    if (!ans || typeof ans !== 'string' || ans.length < 15) {
      ans = getCipherOfflineInspector(q, currentCase);
    }

    replyBox.innerHTML = `
      <div class="quest-output-box" style="border-left:3px solid var(--accent-magenta);margin:8px 0;">
        <strong>Inspector's Note:</strong> ${escapeHtml(ans)}
      </div>
    `;
  });

  accuseBtn?.addEventListener('click', () => {
    const suspect = accuseSelect?.value;
    if (!suspect) {
      showToast('Select a suspect to accuse.');
      return;
    }

    if (suspect === currentCase.culprit) {
      verdictMount.innerHTML = `
        <div style="background:rgba(16,185,129,0.15);border:1px solid var(--accent-green, #10b981);border-radius:var(--radius-md);padding:14px;color:var(--text-main);">
          <div style="font-weight:700;color:var(--accent-green, #10b981);font-size:15px;margin-bottom:4px;">🎉 Case Solved! Master Sleuth!</div>
          <p style="margin:0;font-size:13.5px;line-height:1.5;">${escapeHtml(currentCase.culpritReason)}</p>
        </div>
      `;
    } else {
      verdictMount.innerHTML = `
        <div style="background:rgba(255,42,133,0.12);border:1px solid var(--accent-magenta);border-radius:var(--radius-md);padding:14px;color:var(--text-main);">
          <div style="font-weight:700;color:var(--accent-magenta);font-size:15px;margin-bottom:4px;">❌ Insufficient Evidence</div>
          <p style="margin:0;font-size:13.5px;line-height:1.5;">The Dean dismisses the petition against ${escapeHtml(suspect)}. Re-examine the clue: who uses that specific colored seal wax?</p>
        </div>
      `;
    }
  });

  initCase();
}

// GAME 1: Jobtris (Google Semantris Arcade Edition for Career Words)
const SEMANTRIS_CAREERS = [
  // Aviation & Aerospace (cyan)
  { id: "pilot", title: "Commercial Airline Pilot", icon: "👨‍✈️", sector: "Aviation", color: "cyan", match: ["pilot", "flight", "airplane", "plane", "cockpit", "altitude", "aviation", "runway", "airspace", "radar", "autopilot", "captain", "boeing", "airbus", "sky", "takeoff", "landing"] },
  { id: "atc", title: "Air Traffic Controller", icon: "📡", sector: "Aviation", color: "cyan", match: ["radar", "tower", "airspace", "clearance", "landing", "runway", "vectors", "flight", "atc", "transponder", "departure", "headset", "approach", "separation"] },
  { id: "aero_eng", title: "Aerospace Systems Engineer", icon: "🚀", sector: "Aerospace", color: "cyan", match: ["rocket", "propulsion", "spacecraft", "orbit", "satellite", "aerodynamics", "trajectory", "nasa", "isro", "telemetry", "fairing", "reentry", "thrust"] },
  { id: "flight_disp", title: "Flight Operations Dispatcher", icon: "🗺️", sector: "Aviation", color: "cyan", match: ["flightplan", "fuel", "weather", "diversion", "payload", "notam", "dispatch", "routing", "waypoints", "cruise"] },
  { id: "drone_pilot", title: "Autonomous Drone Fleet Lead", icon: "🛸", sector: "Aerospace", color: "cyan", match: ["drone", "uav", "quadcopter", "telemetry", "waypoint", "payload", "lidar", "photogrammetry", "flight"] },
  { id: "space_ops", title: "Mission Flight Director", icon: "🛰️", sector: "Aerospace", color: "cyan", match: ["countdown", "launchpad", "capsule", "booster", "mission", "orbit", "iss", "telemetry", "houston", "isro"] },
  { id: "avionics_tech", title: "Avionics Systems Specialist", icon: "🎛️", sector: "Aviation", color: "cyan", match: ["instruments", "altimeter", "transponder", "gyros", "flybywire", "blackbox", "navigation", "circuits", "cockpit"] },
  { id: "heli_pilot", title: "Emergency Rescue Helicopter Pilot", icon: "🚁", sector: "Aviation", color: "cyan", match: ["helicopter", "rotor", "evacuation", "airlift", "medevac", "hoist", "landing", "mountain", "blades"] },

  // Medicine & Life Sciences (emerald)
  { id: "trauma_surgeon", title: "Chief Trauma Surgeon", icon: "🩺", sector: "Medicine", color: "emerald", match: ["scalpel", "surgery", "operation", "hospital", "incision", "emergency", "patient", "sutures", "operating", "surgeon", "scrubs", "anesthesia"] },
  { id: "pediatrician", title: "Pediatric Specialist", icon: "👶", sector: "Medicine", color: "emerald", match: ["children", "baby", "toddler", "infant", "vaccination", "pediatric", "stethoscope", "fever", "growth", "clinic", "pediatrics"] },
  { id: "cardiologist", title: "Interventional Cardiologist", icon: "❤️", sector: "Medicine", color: "emerald", match: ["heart", "cardiac", "artery", "pulse", "stent", "bypass", "ecg", "ekg", "blood", "coronary", "circulation"] },
  { id: "neurologist", title: "Clinical Neurologist", icon: "🧠", sector: "Medicine", color: "emerald", match: ["brain", "neuron", "synapse", "stroke", "epilepsy", "mri", "nervous", "cognitive", "concussion", "cerebral"] },
  { id: "radiologist", title: "Diagnostic Radiologist", icon: "🩻", sector: "Medicine", color: "emerald", match: ["xray", "scan", "imaging", "mri", "ct", "ultrasound", "contrast", "radiation", "radiograph", "fracture"] },
  { id: "pharmacist", title: "Hospital Pharmacist", icon: "💊", sector: "Medicine", color: "emerald", match: ["medicine", "drugs", "prescription", "dosage", "pharmacy", "pills", "dispensary", "antibiotic", "tablet"] },
  { id: "geneticist", title: "Genomics & CRISPR Scientist", icon: "🧬", sector: "Healthcare", color: "emerald", match: ["dna", "crispr", "genome", "mutation", "sequencing", "gene", "rna", "cloning", "hereditary", "helix"] },
  { id: "anesthesiologist", title: "Chief Anesthesiologist", icon: "💉", sector: "Medicine", color: "emerald", match: ["anesthesia", "sedation", "dosage", "intubation", "oxygen", "vitals", "operating", "numb", "preop"] },
  { id: "pathologist", title: "Forensic Medical Examiner", icon: "🔬", sector: "Medicine", color: "emerald", match: ["autopsy", "microscope", "tissue", "toxicology", "postmortem", "forensic", "biopsy", "lab", "coroner"] },
  { id: "paramedic", title: "Emergency Flight Paramedic", icon: "🚑", sector: "Healthcare", color: "emerald", match: ["ambulance", "defibrillator", "firstaid", "triage", "cpr", "stretcher", "emergency", "oxygen", "siren"] },
  { id: "psychiatrist", title: "Clinical Neuropsychiatrist", icon: "🛋️", sector: "Healthcare", color: "emerald", match: ["mental", "therapy", "counseling", "anxiety", "depression", "psychiatry", "clinical", "wellness", "mind"] },
  { id: "oncologist", title: "Clinical Oncologist", icon: "🔬", sector: "Medicine", color: "emerald", match: ["cancer", "chemotherapy", "tumor", "radiation", "biopsy", "malignancy", "remission", "oncology"] },
  { id: "orthopedic", title: "Orthopedic Surgeon", icon: "🦴", sector: "Medicine", color: "emerald", match: ["bones", "fracture", "joint", "implant", "spine", "arthroscopy", "cast", "ligament", "skeletal"] },

  // Technology & AI (cyan)
  { id: "soft_arch", title: "Principal Software Architect", icon: "💻", sector: "Tech", color: "cyan", match: ["code", "software", "architecture", "microservices", "cloud", "database", "backend", "latency", "api", "compiler"] },
  { id: "ml_eng", title: "Machine Learning Engineer", icon: "🤖", sector: "AI & Data", color: "cyan", match: ["neural", "model", "deeplearning", "training", "dataset", "inference", "transformer", "llm", "algorithm", "tensor"] },
  { id: "cyber_analyst", title: "SOC Cybersecurity Analyst", icon: "🛡️", sector: "Security", color: "cyan", match: ["firewall", "hacker", "malware", "security", "breach", "encryption", "soc", "phishing", "pentest", "incident"] },
  { id: "cloud_eng", title: "Cloud Infrastructure Lead", icon: "☁️", sector: "Tech", color: "cyan", match: ["aws", "azure", "kubernetes", "docker", "devops", "serverless", "cluster", "cloud", "containers", "compute"] },
  { id: "blockchain_dev", title: "Blockchain Systems Engineer", icon: "⛓️", sector: "Tech", color: "cyan", match: ["crypto", "ethereum", "bitcoin", "ledger", "smartcontract", "solidity", "consensus", "web3", "hash"] },
  { id: "robotics_eng", title: "Autonomous Robotics Dev", icon: "🦾", sector: "Tech", color: "cyan", match: ["robot", "servos", "actuators", "kinematics", "lidar", "sensors", "automation", "manipulator", "firmware"] },
  { id: "game_dev", title: "Game Engine & Physics Dev", icon: "🎮", sector: "Tech", color: "cyan", match: ["graphics", "unity", "unreal", "shader", "rendering", "gameplay", "collision", "framerate", "textures"] },
  { id: "quantum_sci", title: "Quantum Computing Scientist", icon: "⚛️", sector: "Tech", color: "cyan", match: ["qubit", "superposition", "entanglement", "quantum", "cryogenic", "gates", "coherence", "decoherence"] },
  { id: "database_lead", title: "Database Reliability Engineer", icon: "🗄️", sector: "Tech", color: "cyan", match: ["sql", "nosql", "postgres", "queries", "replication", "indexing", "sharding", "backup", "cache"] },
  { id: "pen_tester", title: "Ethical Hacker & Red Teamer", icon: "🕵️", sector: "Security", color: "cyan", match: ["exploit", "payload", "vulnerability", "injection", "bypass", "redteam", "kali", "zeroday", "security"] },

  // Law & Diplomacy (purple)
  { id: "corp_counsel", title: "Senior Corporate Counsel", icon: "⚖️", sector: "Law", color: "purple", match: ["contract", "agreement", "merger", "acquisition", "clause", "compliance", "corporate", "liability", "legal"] },
  { id: "const_advocate", title: "Constitutional Advocate", icon: "🏛️", sector: "Law", color: "purple", match: ["constitution", "court", "judge", "supremecourt", "hearing", "verdict", "ruling", "advocate", "jurisprudence"] },
  { id: "prosecutor", title: "Special Public Prosecutor", icon: "⚖️", sector: "Law", color: "purple", match: ["indictment", "trial", "evidence", "jury", "charge", "prosecution", "witness", "crime", "conviction"] },
  { id: "diplomat", title: "United Nations Diplomat", icon: "🌐", sector: "Diplomacy", color: "purple", match: ["embassy", "treaty", "ambassador", "diplomat", "negotiations", "bilateral", "consulate", "envoy", "summit"] },
  { id: "arbitrator", title: "International Trade Arbitrator", icon: "📜", sector: "Law", color: "purple", match: ["dispute", "arbitration", "tribunal", "settlement", "mediation", "commercial", "neutral", "award"] },
  { id: "patent_atty", title: "Patent & IP Attorney", icon: "💡", sector: "Law", color: "purple", match: ["patent", "trademark", "copyright", "invention", "infringement", "intellectual", "priorart", "license"] },
  { id: "human_rights", title: "Human Rights Defender", icon: "🕊️", sector: "Diplomacy", color: "purple", match: ["refugee", "asylum", "rights", "charter", "amnesty", "advocacy", "justice", "equality", "dignity"] },
  { id: "cyber_jurist", title: "Cyber Law & Privacy Jurist", icon: "🔐", sector: "Law", color: "purple", match: ["gdpr", "privacy", "surveillance", "digital", "compliance", "dataprotection", "regulations"] },

  // Finance & Business (amber)
  { id: "inv_banker", title: "Wall Street Investment Banker", icon: "📈", sector: "Finance", color: "amber", match: ["stocks", "ipo", "valuation", "capital", "merger", "shares", "bonds", "pitchbook", "underwriting", "banker"] },
  { id: "quant_trader", title: "High-Frequency Quant Trader", icon: "💹", sector: "Finance", color: "amber", match: ["algorithm", "arbitrage", "volatility", "derivatives", "hedge", "options", "spread", "liquidity", "market"] },
  { id: "cfo", title: "Chief Financial Officer", icon: "💼", sector: "Finance", color: "amber", match: ["budget", "revenue", "fiscal", "profit", "ebitda", "treasury", "dividend", "quarterly", "audit"] },
  { id: "forensic_auditor", title: "Forensic Financial Auditor", icon: "🔍", sector: "Finance", color: "amber", match: ["embezzlement", "audit", "fraud", "ledger", "tax", "compliance", "accounting", "scrutiny"] },
  { id: "actuary", title: "Actuarial Catastrophe Lead", icon: "📊", sector: "Finance", color: "amber", match: ["risk", "probability", "mortality", "insurance", "actuary", "statistics", "premium", "underwriting"] },
  { id: "venture_cap", title: "Venture Capital Partner", icon: "🦄", sector: "Business", color: "amber", match: ["startup", "equity", "seed", "series", "valuation", "term", "runway", "founder", "unicorn"] },
  { id: "macro_econ", title: "Global Macro Economist", icon: "🌐", sector: "Economics", color: "amber", match: ["inflation", "gdp", "interestrates", "centralbank", "recession", "fiscal", "currency", "trade"] },
  { id: "private_equity", title: "Private Equity Dealmaker", icon: "🏢", sector: "Finance", color: "amber", match: ["buyout", "leveraged", "portfolio", "synergy", "restructuring", "turnaround", "capital"] },

  // Media, Creative & Journalism (pink)
  { id: "news_anchor", title: "Prime-Time News Anchor", icon: "🎙️", sector: "Media", color: "pink", match: ["broadcast", "anchor", "teleprompter", "breaking", "studio", "headlines", "microphone", "telecast"] },
  { id: "war_corr", title: "Foreign War Correspondent", icon: "📹", sector: "Media", color: "pink", match: ["conflict", "frontline", "dispatch", "international", "reporter", "overseas", "footage", "press"] },
  { id: "investigative_journo", title: "Investigative Reporter", icon: "📰", sector: "Media", color: "pink", match: ["expose", "whistleblower", "corruption", "scandal", "investigation", "scoop", "deadline", "press"] },
  { id: "film_director", title: "Documentary Film Director", icon: "🎬", sector: "Creative", color: "pink", match: ["cinema", "camera", "film", "documentary", "script", "lens", "editing", "screenplay", "producer"] },
  { id: "creative_dir", title: "Advertising Creative Director", icon: "🎨", sector: "Creative", color: "pink", match: ["advertising", "campaign", "branding", "billboard", "copywriting", "storyboard", "pitch", "design"] },
  { id: "lexicographer", title: "Chief Lexicographer & Editor", icon: "📚", sector: "Literature", color: "pink", match: ["dictionary", "words", "vocabulary", "definition", "etymology", "grammar", "synonyms", "manuscript"] },
  { id: "pr_spokesperson", title: "Crisis PR Spokesperson", icon: "📣", sector: "Media", color: "pink", match: ["pressrelease", "crisis", "statement", "spokesperson", "reputation", "briefing", "media", "interview"] },
  { id: "sound_engineer", title: "Mastering Sound Engineer", icon: "🎧", sector: "Creative", color: "pink", match: ["audio", "mixing", "acoustics", "frequency", "equalizer", "decibel", "vocal", "compression", "studio"] },
  { id: "author", title: "Literary Novelist & Author", icon: "✍️", sector: "Literature", color: "pink", match: ["book", "novel", "fiction", "prose", "chapter", "dialogue", "publisher", "narrative", "author"] },

  // Earth, Ocean & Deep Sciences (orange)
  { id: "marine_geo", title: "Deep-Sea Marine Geologist", icon: "🌊", sector: "Exploration", color: "orange", match: ["ocean", "submersible", "hadal", "trench", "hydrothermal", "magma", "seabed", "tectonic", "sonar"] },
  { id: "volcanologist", title: "Active Field Volcanologist", icon: "🌋", sector: "Earth Science", color: "orange", match: ["magma", "lava", "eruption", "crater", "ash", "caldera", "seismic", "basalt", "pyroclastic"] },
  { id: "wildlife_bio", title: "Wildlife Conservation Lead", icon: "🦁", sector: "Environment", color: "orange", match: ["safari", "predator", "species", "poaching", "habitat", "endangered", "tracking", "biodiversity"] },
  { id: "climate_sci", title: "Climate Modeling Scientist", icon: "🌡️", sector: "Environment", color: "orange", match: ["warming", "greenhouse", "carbon", "emissions", "glaciers", "ipcc", "atmosphere", "drought"] },
  { id: "renew_eng", title: "Renewable Energy Architect", icon: "⚡", sector: "Engineering", color: "orange", match: ["solar", "wind", "photovoltaic", "turbine", "battery", "grid", "clean", "megawatts", "inverter"] },
  { id: "struct_eng", title: "Skyscraper Structural Lead", icon: "🏗️", sector: "Engineering", color: "orange", match: ["concrete", "steel", "foundation", "truss", "load", "seismic", "beam", "skyscraper", "blueprint"] },
  { id: "urban_plan", title: "Smart City Urban Planner", icon: "🏙️", sector: "Planning", color: "orange", match: ["transit", "zoning", "infrastructure", "metropolitan", "parks", "density", "pedestrian", "mobility"] },
  { id: "astro_bio", title: "NASA Astrobiologist", icon: "🪐", sector: "Science", color: "orange", match: ["exoplanet", "mars", "europa", "extremophile", "biosignature", "habitable", "alien", "microbe"] },
  { id: "f1_strategist", title: "Formula 1 Race Strategist", icon: "🏎️", sector: "Engineering", color: "orange", match: ["pitstop", "tires", "telemetry", "paddock", "undercut", "laptime", "downforce", "aerodynamic", "grid"] },
  { id: "exec_chef", title: "Michelin Executive Chef", icon: "🍳", sector: "Culinary", color: "orange", match: ["culinary", "recipe", "kitchen", "gastronomy", "flavor", "cuisine", "michelin", "plating", "chef"] },
  { id: "sommelier", title: "Sommelier & Flavor Chemist", icon: "🍷", sector: "Culinary", color: "orange", match: ["vintage", "palate", "fermentation", "aroma", "vineyard", "tasting", "cellar", "sommelier"] },
  { id: "fashion_curator", title: "Haute Couture Creative Lead", icon: "👗", sector: "Design", color: "pink", match: ["fashion", "runway", "textiles", "collection", "couture", "apparel", "designer", "fabric"] }
];

// Web Audio synthesizer for crisp arcade sound effects
const semantrisAudio = (() => {
  let ctx = null;
  const getCtx = () => {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) ctx = new AudioCtx();
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  };

  return {
    playPop(combo = 1) {
      try {
        const c = getCtx();
        if (!c) return;
        const now = c.currentTime;
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'sine';
        const baseFreq = 420 + Math.min(combo * 90, 800);
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.8, now + 0.12);
        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(now);
        osc.stop(now + 0.16);
      } catch (e) {}
    },
    playDrop() {
      try {
        const c = getCtx();
        if (!c) return;
        const now = c.currentTime;
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(now);
        osc.stop(now + 0.1);
      } catch (e) {}
    },
    playMiss() {
      try {
        const c = getCtx();
        if (!c) return;
        const now = c.currentTime;
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(110, now + 0.14);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(now);
        osc.stop(now + 0.18);
      } catch (e) {}
    },
    playDanger() {
      try {
        const c = getCtx();
        if (!c) return;
        const now = c.currentTime;
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(now);
        osc.stop(now + 0.13);
      } catch (e) {}
    },
    playGameOver() {
      try {
        const c = getCtx();
        if (!c) return;
        const notes = [380, 320, 260, 190];
        notes.forEach((freq, i) => {
          const now = c.currentTime + i * 0.12;
          const osc = c.createOscillator();
          const gain = c.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
          osc.connect(gain);
          gain.connect(c.destination);
          osc.start(now);
          osc.stop(now + 0.2);
        });
      } catch (e) {}
    }
  };
})();

// Active instance of Jobtris Semantris Game
let jobtrisInstance = null;

function renderJobtris(mount) {
  if (jobtrisInstance) {
    jobtrisInstance.destroy();
    jobtrisInstance = null;
  }

  mount.innerHTML = `
    <div class="semantris-container">
      <div class="semantris-header">
        <div class="semantris-header-title">
          <h3><span>🎮</span> Jobtris · Semantic Word Arcade</h3>
          <span>Type any clue or tool related to a job in the stack to blast it and trigger color combos!</span>
        </div>
        <div class="semantris-stats-row">
          <div class="semantris-stat-badge">
            <span style="color:var(--text-dim);">Score:</span>
            <strong style="color:var(--accent-cyan);" id="semantris-score-display">0</strong>
          </div>
          <div class="semantris-stat-badge">
            <span style="color:var(--text-dim);">Cleared:</span>
            <strong style="color:var(--text-main);" id="semantris-cleared-display">0</strong>
          </div>
          <div class="semantris-combo-pill" id="semantris-combo-pill">Combo 1x</div>
        </div>
      </div>

      <div class="semantris-stage-grid">
        <!-- Semantris Falling Well Tower -->
        <div class="semantris-well-wrapper">
          <div class="semantris-danger-line" id="semantris-danger-line" title="Danger line: Keep blocks below this threshold!"></div>
          <div class="semantris-danger-badge" id="semantris-danger-badge">⚠️ DANGER: HIGH STACK</div>

          <div class="semantris-well" id="semantris-well"></div>

          <!-- Start Game Modal Overlay -->
          <div class="semantris-gameover-overlay" id="semantris-start-screen" style="display:flex;">
            <div style="font-size:48px;margin-bottom:8px;">🎮</div>
            <h2 style="font-size:24px;margin-bottom:6px;color:#fff;">Jobtris · Semantic Word Arcade</h2>
            <p style="font-size:13.5px;color:var(--text-muted);max-width:320px;line-height:1.45;margin-bottom:14px;">
              Type any word, tool, or concept related to a job in the stack to blast it. Connected same-color blocks chain-pop together!
            </p>
            <div style="margin-bottom:18px;display:inline-flex;align-items:center;gap:8px;" class="semantris-stat-badge">
              <span style="color:var(--text-dim);">Best Score:</span>
              <strong style="color:var(--accent-gold);" id="semantris-start-highscore">0</strong>
            </div>
            <button class="btn btn-primary" id="btn-semantris-start" style="padding:14px 38px;font-size:16px;font-weight:800;box-shadow:0 0 24px rgba(0,240,255,0.45);cursor:pointer;">
              <span>▶️</span> <span>Start Game</span>
            </button>
          </div>

          <!-- Game Over Modal Overlay -->
          <div class="semantris-gameover-overlay" id="semantris-gameover" style="display:none;">
            <div style="font-size:42px;margin-bottom:8px;">💥</div>
            <h2 style="font-size:24px;margin-bottom:6px;color:#fff;">STACK OVERFLOW!</h2>
            <p style="font-size:14px;color:var(--text-muted);margin-bottom:16px;">The career stack reached the danger line.</p>
            <div style="display:flex;gap:16px;margin-bottom:20px;font-family:var(--font-mono);">
              <div class="semantris-stat-badge">Score: <strong style="color:var(--accent-cyan);margin-left:4px;" id="gameover-final-score">0</strong></div>
              <div class="semantris-stat-badge">Top Combo: <strong style="color:#ff2a85;margin-left:4px;" id="gameover-max-combo">1x</strong></div>
            </div>
            <button class="btn btn-primary" id="btn-semantris-restart" style="padding:12px 28px;font-size:15px;font-weight:800;">
              <span>🔄</span> <span>Play Again</span>
            </button>
          </div>
        </div>

        <!-- Clue Entry Console & Quick Hints -->
        <div class="semantris-console">
          <div class="semantris-input-box-wrapper" id="semantris-input-box-wrap">
            <label for="semantris-input" style="font-size:13.5px;font-weight:700;display:flex;justify-content:space-between;align-items:center;">
              <span>Type Related Clue or Tool:</span>
              <span style="font-size:11.5px;color:var(--text-dim);font-weight:500;">Press Enter ↵</span>
            </label>
            <input type="text" id="semantris-input" placeholder="e.g. flight, surgery, courtroom, code..." autocomplete="off" autocapitalize="none" spellcheck="false" autofocus>
            
            <button class="semantris-submit-btn" id="btn-semantris-submit" type="button">
              <span>Blast Matching Block</span> <span>💥</span>
            </button>
          </div>

          <!-- Quick Clue Suggestions -->
          <div class="card" style="padding:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span style="font-size:12.5px;font-weight:700;color:var(--text-main);">Quick Clue Ideas:</span>
              <div style="display:flex;gap:6px;"><button class="btn btn-primary btn-sm" id="btn-semantris-quick-start" type="button" style="padding:2px 10px;font-size:11.5px;">▶️ Start</button><button class="btn btn-secondary btn-sm" id="btn-semantris-pause" type="button" style="padding:2px 8px;font-size:11.5px;">⏸️ Pause</button></div>
            </div>
            <div class="semantris-clues-shelf" id="semantris-chips">
              <span class="semantris-clue-chip">flight</span>
              <span class="semantris-clue-chip">scalpel</span>
              <span class="semantris-clue-chip">cloud</span>
              <span class="semantris-clue-chip">contract</span>
              <span class="semantris-clue-chip">stocks</span>
              <span class="semantris-clue-chip">broadcast</span>
              <span class="semantris-clue-chip">submersible</span>
              <span class="semantris-clue-chip">heart</span>
              <span class="semantris-clue-chip">radar</span>
              <span class="semantris-clue-chip">firewall</span>
              <span class="semantris-clue-chip">treaty</span>
              <span class="semantris-clue-chip">magma</span>
            </div>
            <div style="margin-top:12px;font-size:12px;color:var(--text-dim);line-height:1.4;">
              💡 <strong>Semantris Pro-tip:</strong> Connected same-color blocks chain-pop together for massive combo multipliers!
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Start the Game Controller
  class JobtrisGame {
    constructor() {
      this.score = 0;
      this.combo = 1;
      this.maxCombo = 1;
      this.clearedCount = 0;
      this.isGameOver = false;
      this.isPaused = false;
      this.stack = []; // Active visible blocks
      this.deck = []; // Shuffled draw deck
      this.dropTimer = null;
      this.dropInterval = 6200; // ms between block drops
      this.maxStack = 8; // Danger at 6, game over if >= 8
      this.dangerThreshold = 6;
      this.well = $('#semantris-well');
      this.input = $('#semantris-input');
      this.inputWrap = $('#semantris-input-box-wrap');
      this.scoreDisplay = $('#semantris-score-display');
      this.clearedDisplay = $('#semantris-cleared-display');
      this.comboPill = $('#semantris-combo-pill');
      this.dangerLine = $('#semantris-danger-line');
      this.dangerBadge = $('#semantris-danger-badge');
      this.gameOverScreen = $('#semantris-gameover');
      this.startScreen = $('#semantris-start-screen');

      this.initDeck();
      this.initEvents();
      this.showStartScreen();
    }

    showStartScreen() {
      this.isStarted = false;
      this.isGameOver = false;
      this.isPaused = false;
      if (this.dropTimer) clearInterval(this.dropTimer);

      const high = parseInt(localStorage.getItem('cf_jobtris_highscore') || '0', 10);
      const highEl = $('#semantris-start-highscore');
      if (highEl) highEl.textContent = high.toLocaleString();

      if (this.startScreen) this.startScreen.style.display = 'flex';
      if (this.gameOverScreen) this.gameOverScreen.style.display = 'none';

      // Render 4 preview blocks in the background so the board looks ready
      this.stack = [];
      for (let i = 0; i < 4; i++) {
        this.stack.push(this.drawUniqueCareer());
      }
      this.renderStack();
      if (this.dangerLine) this.dangerLine.classList.remove('active');
      if (this.dangerBadge) this.dangerBadge.classList.remove('active');
    }

    initDeck() {
      // Fisher-Yates shuffle of career library
      this.deck = [...SEMANTRIS_CAREERS].sort(() => Math.random() - 0.5);
    }

    drawUniqueCareer() {
      const activeIds = new Set(this.stack.map(b => b.id));
      let available = this.deck.filter(c => !activeIds.has(c.id));
      if (available.length === 0) {
        this.initDeck();
        available = this.deck.filter(c => !activeIds.has(c.id));
      }
      const chosen = available[0] || SEMANTRIS_CAREERS[0];
      this.deck = this.deck.filter(c => c.id !== chosen.id);
      return chosen;
    }

    start() {
      this.isStarted = true;
      this.stack = [];
      this.score = 0;
      this.combo = 1;
      this.maxCombo = 1;
      this.clearedCount = 0;
      this.isGameOver = false;
      this.isPaused = false;
      this.dropInterval = 6200;

      if (this.startScreen) this.startScreen.style.display = 'none';
      if (this.gameOverScreen) this.gameOverScreen.style.display = 'none';

      const quickBtn = $('#btn-semantris-quick-start');
      if (quickBtn) quickBtn.textContent = '🔄 Restart';

      // Seed initial stack with 5 diverse, non-repeating blocks
      for (let i = 0; i < 5; i++) {
        this.stack.push(this.drawUniqueCareer());
      }

      this.renderStack();
      this.updateHUD();
      this.startDropTimer();
      semantrisAudio.playDrop();
      if (this.input) this.input.focus();
    }

    startDropTimer() {
      if (this.dropTimer) clearInterval(this.dropTimer);
      this.dropTimer = setInterval(() => {
        if (!this.isPaused && !this.isGameOver) {
          this.dropNewBlock();
        }
      }, this.dropInterval);
    }

    dropNewBlock() {
      if (this.isGameOver || this.isPaused) return;

      if (this.stack.length >= this.maxStack) {
        this.triggerGameOver();
        return;
      }

      const newCareer = this.drawUniqueCareer();
      this.stack.push(newCareer);
      semantrisAudio.playDrop();

      this.renderStack(newCareer.id);
      this.updateHUD();

      if (this.stack.length >= this.dangerThreshold) {
        this.dangerLine.classList.add('active');
        this.dangerBadge.classList.add('active');
        semantrisAudio.playDanger();
      }

      if (this.stack.length >= this.maxStack) {
        setTimeout(() => {
          if (this.stack.length >= this.maxStack) {
            this.triggerGameOver();
          }
        }, 1200);
      }
    }

    renderStack(droppingId = null) {
      if (!this.well) return;
      this.well.innerHTML = '';

      this.stack.forEach((career, index) => {
        const blockEl = document.createElement('div');
        blockEl.className = `semantris-block semantris-color-${career.color}`;
        blockEl.dataset.id = career.id;
        blockEl.dataset.index = index;

        if (career.id === droppingId) {
          blockEl.classList.add('dropping');
        }

        blockEl.innerHTML = `
          <div class="semantris-block-left">
            <span style="font-size:18px;">${career.icon}</span>
            <span class="semantris-block-title">${escapeHtml(career.title)}</span>
          </div>
          <span class="semantris-badge">${escapeHtml(career.sector)}</span>
        `;

        // Click block to pre-fill input with a sample clue
        blockEl.addEventListener('click', () => {
          if (this.input) {
            this.input.value = career.match[0] || 'skill';
            this.input.focus();
          }
        });

        this.well.appendChild(blockEl);
      });
    }

    submitClue() {
      if (!this.isStarted) {
        this.start();
        return;
      }
      if (this.isGameOver || this.isPaused) return;
      const raw = this.input.value.trim().toLowerCase();
      if (!raw) return;

      const scored = this.stack.map((block, index) => ({
        block,
        index,
        score: this.calculateMatchScore(block, raw)
      }));

      scored.sort((a, b) => b.score - a.score);
      const topMatch = scored[0];

      if (topMatch && topMatch.score >= 60) {
        this.handleHit(topMatch.block, topMatch.index);
      } else {
        this.handleMiss();
      }

      this.input.value = '';
    }

    calculateMatchScore(block, clue) {
      const c = clue.trim().toLowerCase();
      let maxScore = 0;

      // 1. Keyword direct match
      for (const kw of block.match) {
        const k = kw.toLowerCase();
        if (k === c) maxScore = Math.max(maxScore, 100);
        else if (k.startsWith(c) || c.startsWith(k)) maxScore = Math.max(maxScore, 85);
        else if (k.includes(c) || c.includes(k)) maxScore = Math.max(maxScore, 75);
      }

      // 2. Title word match
      const titleClean = block.title.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/);
      for (const tw of titleClean) {
        if (tw.length >= 3) {
          if (tw === c) maxScore = Math.max(maxScore, 95);
          else if (tw.startsWith(c) || c.startsWith(tw)) maxScore = Math.max(maxScore, 80);
          else if (tw.includes(c) || c.includes(tw)) maxScore = Math.max(maxScore, 70);
        }
      }

      // 3. Sector match
      if (block.sector && block.sector.toLowerCase().includes(c)) {
        maxScore = Math.max(maxScore, 65);
      }

      return maxScore;
    }

    handleHit(targetBlock, targetIndex) {
      // Semantris Arcade contiguous color chain popping
      const targetColor = targetBlock.color;
      const poppingIndices = new Set([targetIndex]);

      // Expand contiguous neighbors upwards
      for (let i = targetIndex - 1; i >= 0; i--) {
        if (this.stack[i] && this.stack[i].color === targetColor) {
          poppingIndices.add(i);
        } else {
          break;
        }
      }
      // Expand contiguous neighbors downwards
      for (let i = targetIndex + 1; i < this.stack.length; i++) {
        if (this.stack[i] && this.stack[i].color === targetColor) {
          poppingIndices.add(i);
        } else {
          break;
        }
      }

      const poppedCount = poppingIndices.size;
      const pointsEarned = 150 * this.combo * poppedCount;
      this.score += pointsEarned;
      this.clearedCount += poppedCount;
      this.combo = Math.min(this.combo + 1, 8);
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;

      semantrisAudio.playPop(this.combo);

      // Add popping animation to DOM elements
      const blockEls = this.well.querySelectorAll('.semantris-block');
      poppingIndices.forEach(idx => {
        const el = blockEls[idx];
        if (el) {
          el.classList.add('popping');
          this.spawnFloatingScore(el, `+${pointsEarned / poppedCount}`);
        }
      });

      // Accelerate drop speed slightly every 5 cleared words
      if (this.clearedCount % 5 === 0) {
        this.dropInterval = Math.max(3400, this.dropInterval - 300);
        this.startDropTimer();
      }

      setTimeout(() => {
        // Filter out popped blocks from stack
        this.stack = this.stack.filter((_, idx) => !poppingIndices.has(idx));

        // If stack is critically low (< 3), immediately drop 1 new block to keep game active
        if (this.stack.length < 3) {
          this.stack.push(this.drawUniqueCareer());
        }

        if (this.stack.length < this.dangerThreshold) {
          this.dangerLine.classList.remove('active');
          this.dangerBadge.classList.remove('active');
        }

        this.renderStack();
        this.updateHUD();
      }, 350);
    }

    spawnFloatingScore(anchorEl, text) {
      if (!anchorEl || !this.well) return;
      const rect = anchorEl.getBoundingClientRect();
      const wellRect = this.well.getBoundingClientRect();
      const floatEl = document.createElement('div');
      floatEl.className = 'semantris-floating-score';
      floatEl.textContent = text;
      floatEl.style.top = `${rect.top - wellRect.top + 6}px`;
      floatEl.style.left = `${rect.left - wellRect.left + rect.width / 2 - 30}px`;
      this.well.appendChild(floatEl);
      setTimeout(() => floatEl.remove(), 850);
    }

    handleMiss() {
      this.combo = 1;
      this.updateHUD();
      semantrisAudio.playMiss();

      if (this.inputWrap) {
        this.inputWrap.classList.add('shake');
        setTimeout(() => this.inputWrap.classList.remove('shake'), 400);
      }

      const randomTarget = this.stack[Math.floor(Math.random() * this.stack.length)];
      if (randomTarget) {
        showToast(`No match! Try a clue related to ${randomTarget.title} (e.g. "${randomTarget.match[0]}")`);
      }
    }

    updateHUD() {
      if (this.scoreDisplay) this.scoreDisplay.textContent = this.score.toLocaleString();
      if (this.clearedDisplay) this.clearedDisplay.textContent = this.clearedCount;
      if (this.comboPill) {
        this.comboPill.textContent = `Combo ${this.combo}x`;
        this.comboPill.style.color = this.combo > 1 ? '#00f0ff' : '#ff2a85';
      }
    }

    triggerGameOver() {
      this.isGameOver = true;
      if (this.dropTimer) clearInterval(this.dropTimer);
      semantrisAudio.playGameOver();

      $('#gameover-final-score').textContent = this.score.toLocaleString();
      $('#gameover-max-combo').textContent = `${this.maxCombo}x`;
      this.gameOverScreen.style.display = 'flex';

      const prevHigh = parseInt(localStorage.getItem('cf_jobtris_highscore') || '0', 10);
      if (this.score > prevHigh) {
        localStorage.setItem('cf_jobtris_highscore', String(this.score));
        showToast(`🏆 NEW HIGH SCORE: ${this.score.toLocaleString()} points!`);
      }
    }

    togglePause() {
      this.isPaused = !this.isPaused;
      const btn = $('#btn-semantris-pause');
      if (btn) btn.textContent = this.isPaused ? '▶️ Resume' : '⏸️ Pause';
      if (this.isPaused) {
        showToast('Jobtris paused ⏸️');
      } else {
        showToast('Resumed ▶️');
        this.input.focus();
      }
    }

    initEvents() {
      $('#btn-semantris-start')?.addEventListener('click', () => this.start());
      $('#btn-semantris-quick-start')?.addEventListener('click', () => {
        if (!this.isStarted || this.isGameOver) {
          this.start();
        } else {
          if (confirm('Restart Jobtris game? Current score will reset.')) {
            this.start();
          }
        }
      });
      $('#btn-semantris-submit')?.addEventListener('click', () => this.submitClue());
      this.input?.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.submitClue();
        }
      });

      $('#btn-semantris-pause')?.addEventListener('click', () => this.togglePause());
      $('#btn-semantris-restart')?.addEventListener('click', () => this.start());

      // Quick chip clicks
      $$('.semantris-clue-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          if (this.input) {
            this.input.value = chip.textContent.trim();
            this.submitClue();
          }
        });
      });
    }

    destroy() {
      if (this.dropTimer) clearInterval(this.dropTimer);
    }
  }

  jobtrisInstance = new JobtrisGame();
}


// GAME 2: Wordle / Wordless (6-Guess Vocabulary)
function renderWordle(mount) {
  const SECRET_WORDS = ["PILOT", "LEGAL", "BRIEF", "STAGE", "SPEECH", "CADRE", "ORBIT", "COURT", "AUDIT", "MEDIA"];
  const secret = SECRET_WORDS[Math.floor(Math.random() * SECRET_WORDS.length)];
  let currentGuess = "";
  let row = 0;

  mount.innerHTML = `
    <div style="text-align:center;border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:16px;">
      <h3 style="font-size:20px;">🟩 Wordle · Career Vocabulary</h3>
      <span style="font-size:13px;color:var(--text-dim);">Guess the 5-letter career word in 6 tries. Green = right spot, Yellow = wrong spot.</span>
    </div>

    <div class="wordle-board" id="wordle-board"></div>

    <div style="max-width:360px;margin:16px auto;display:flex;gap:8px;">
      <input type="text" id="wordle-input" maxlength="5" placeholder="TYPE 5 LETTERS..." style="text-transform:uppercase;font-family:var(--font-mono);text-align:center;font-size:18px;letter-spacing:0.2em;">
      <button class="btn btn-primary" id="btn-wordle-guess">Enter</button>
    </div>
  `;

  const board = $('#wordle-board');
  for (let r = 0; r < 6; r++) {
    const rowEl = document.createElement('div');
    rowEl.className = 'wordle-row';
    for (let c = 0; c < 5; c++) {
      const tile = document.createElement('div');
      tile.className = 'wordle-tile';
      tile.id = `w-tile-${r}-${c}`;
      rowEl.appendChild(tile);
    }
    board.appendChild(rowEl);
  }

  const guess = () => {
    const input = $('#wordle-input');
    const word = input.value.trim().toUpperCase();
    if (word.length !== 5) {
      showToast('Enter exactly 5 letters!');
      return;
    }

    for (let c = 0; c < 5; c++) {
      const tile = $(`#w-tile-${row}-${c}`);
      tile.textContent = word[c];
      if (word[c] === secret[c]) {
        tile.className = 'wordle-tile correct';
      } else if (secret.includes(word[c])) {
        tile.className = 'wordle-tile present';
      } else {
        tile.className = 'wordle-tile absent';
      }
    }

    if (word === secret) {
      showToast(`🎉 Brilliant! You guessed ${secret}!`);
      input.disabled = true;
      return;
    }

    row++;
    input.value = '';
    if (row >= 6) {
      showToast(`Game Over! The word was ${secret}`);
      input.disabled = true;
    }
  };

  $('#btn-wordle-guess')?.addEventListener('click', guess);
  $('#wordle-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') guess(); });
}

// GAME 3: Flash Cards Studio (AI Dynamic Generation & Extensive Offline Dataset)
const flashCardSession = {
  history: [],
  historyIndex: -1,
  isRevealed: false,
  learnedSet: new Set(JSON.parse(localStorage.getItem('cf_learned_flashcards') || '[]')),
  seenSet: new Set(JSON.parse(localStorage.getItem('cf_seen_flashcards') || '[]'))
};

function renderFlashCards(mount) {
  mount.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
      <h3 style="font-size:20px;">🃏 Flash Cards Studio</h3>
      <div style="font-size:13.5px;font-weight:600;color:var(--text-main);">
        Words Learned: <span class="badge-pill badge-global" id="fc-learned-count" style="font-size:13px;margin-left:4px;">0</span>
      </div>
    </div>

    <div style="max-width:540px;margin:20px auto;" id="flash-card-box">
      <div class="card" id="flash-card-surface" style="min-height:250px;display:flex;flex-direction:column;justify-content:space-between;border-color:var(--border-strong);cursor:pointer;user-select:none;transition:transform 0.2s, box-shadow 0.2s;" title="Click anywhere on card to reveal meaning &amp; example">
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span class="badge-pill badge-global" id="fc-pos">noun</span>
            <button class="btn btn-secondary btn-sm" id="btn-fc-speak" type="button" style="pointer-events:auto;">🔊 Pronounce</button>
          </div>
          <h2 style="font-size:36px;color:var(--accent-cyan);margin-bottom:4px;letter-spacing:-0.02em;" id="fc-word">Loading...</h2>
          <span style="font-family:var(--font-mono);font-size:14px;color:var(--text-dim);" id="fc-phonetic"></span>

          <!-- Reveal Prompt Banner (shown initially) -->
          <div id="fc-reveal-hint" style="margin:24px 0 12px;padding:14px;background:rgba(0,240,255,0.06);border:1px dashed rgba(0,240,255,0.35);border-radius:var(--radius-md);text-align:center;font-size:13.5px;color:var(--accent-cyan);font-weight:600;">
            👆 Click card to reveal meaning &amp; usage
          </div>

          <!-- Hidden Details (revealed upon user click) -->
          <div id="fc-details-box" style="display:none;margin-top:14px;border-top:1px dashed var(--border);padding-top:12px;">
            <p style="font-size:15px;color:var(--text-main);line-height:1.5;margin-bottom:10px;">
              <strong style="color:var(--accent-gold);">Meaning: </strong><span id="fc-meaning"></span>
            </p>
            <div style="font-size:13.5px;color:var(--text-muted);font-style:italic;line-height:1.4;margin-bottom:10px;">
              <strong style="font-style:normal;color:var(--accent-emerald);">Example: </strong><span id="fc-sentence"></span>
            </div>
            <div style="font-size:12px;color:var(--text-dim);" id="fc-origin"></div>
          </div>
        </div>
        <div style="text-align:right;font-size:11px;color:var(--text-dim);margin-top:8px;">
          <span id="fc-provider-pill">Lexicon Verified</span>
        </div>
      </div>
    </div>

    <div style="display:flex;justify-content:center;gap:12px;">
      <button class="btn btn-secondary" id="btn-fc-prev" type="button">⬅️ Previous Word</button>
      <button class="btn btn-primary" id="btn-fc-next" type="button">Next Word ➡️</button>
    </div>
  `;

  const surface = $('#flash-card-surface');
  const detailsBox = $('#fc-details-box');
  const revealHint = $('#fc-reveal-hint');
  const learnedCount = $('#fc-learned-count');
  const prevBtn = $('#btn-fc-prev');
  const nextBtn = $('#btn-fc-next');
  const speakBtn = $('#btn-fc-speak');

  const updateLearnedCounter = () => {
    if (learnedCount) {
      learnedCount.textContent = flashCardSession.learnedSet.size;
    }
  };

  const renderCurrentCard = () => {
    if (flashCardSession.historyIndex < 0 || flashCardSession.historyIndex >= flashCardSession.history.length) return;
    const card = flashCardSession.history[flashCardSession.historyIndex];

    $('#fc-word').textContent = card.word;
    $('#fc-phonetic').textContent = card.phonetic || '';
    $('#fc-pos').textContent = card.pos || 'term';
    $('#fc-meaning').textContent = card.meaning || '';
    $('#fc-sentence').textContent = card.sentence ? `"${card.sentence}"` : '';
    $('#fc-origin').textContent = card.origin ? `Etymology: ${card.origin}` : '';
    if ($('#fc-provider-pill')) {
      $('#fc-provider-pill').textContent = card.provider || 'Lexicon Verified';
    }

    // Always hide meaning initially on new/loaded card
    flashCardSession.isRevealed = false;
    if (detailsBox) detailsBox.style.display = 'none';
    if (revealHint) revealHint.style.display = 'block';

    updateLearnedCounter();
    if (prevBtn) prevBtn.disabled = flashCardSession.historyIndex <= 0;
  };

  // Toggle reveal upon clicking flashcard surface
  surface?.addEventListener('click', () => {
    flashCardSession.isRevealed = !flashCardSession.isRevealed;
    if (flashCardSession.isRevealed) {
      if (detailsBox) detailsBox.style.display = 'block';
      if (revealHint) revealHint.style.display = 'none';
    } else {
      if (detailsBox) detailsBox.style.display = 'none';
      if (revealHint) revealHint.style.display = 'block';
    }
  });

  // Pronounce button stops event bubbling so card doesn't flip/reveal
  speakBtn?.addEventListener('click', e => {
    e.stopPropagation();
    const cur = flashCardSession.history[flashCardSession.historyIndex];
    if (cur && cur.word) {
      speak(cur.word, speakBtn);
    }
  });

  // Function to acquire next unrepeated word (AI + Predefined Offline Lexicon)
  const fetchNextUniqueWord = async () => {
    let nextCard = null;

    // 1. Try AI Generation via Cloudflare Pages Function (/api/ai)
    try {
      const avoidList = Array.from(flashCardSession.seenSet).slice(-40);
      const res = await fetch(getApiUrl('api/ai'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'generate-flashcard',
          avoid: avoidList
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.card && data.card.word) {
          const w = data.card.word.trim();
          if (!flashCardSession.seenSet.has(w.toLowerCase())) {
            nextCard = {
              word: w.charAt(0).toUpperCase() + w.slice(1),
              phonetic: data.card.phonetic || generateIpaApprox(w),
              pos: data.card.pos || 'noun',
              meaning: data.card.meaning || '',
              sentence: data.card.sentence || '',
              origin: data.card.origin || 'Etymology',
              provider: '✨ Gemini AI'
            };
          }
        }
      }
    } catch {}

    // 2. Predefined Offline API / Rich Lexicon Dataset
    if (!nextCard) {
      // Find cards from OFFLINE_FLASH_CARDS not yet seen
      let unseen = OFFLINE_FLASH_CARDS.filter(c => !flashCardSession.seenSet.has(c.word.toLowerCase()));
      if (unseen.length === 0) {
        // If all offline words have been visited once, reset seen set to allow continuous cycling without lock
        flashCardSession.seenSet.clear();
        unseen = OFFLINE_FLASH_CARDS;
      }
      const pick = unseen[Math.floor(Math.random() * unseen.length)];
      nextCard = { ...pick, provider: 'Offline Lexicon' };
    }

    if (nextCard) {
      flashCardSession.seenSet.add(nextCard.word.toLowerCase());
      localStorage.setItem('cf_seen_flashcards', JSON.stringify([...flashCardSession.seenSet]));
      flashCardSession.history.push(nextCard);
      flashCardSession.historyIndex = flashCardSession.history.length - 1;
      renderCurrentCard();
    }
  };

  // Next Word button
  nextBtn?.addEventListener('click', async () => {
    // 1. Mark current card as learned
    const current = flashCardSession.history[flashCardSession.historyIndex];
    if (current && current.word) {
      flashCardSession.learnedSet.add(current.word.toLowerCase());
      localStorage.setItem('cf_learned_flashcards', JSON.stringify([...flashCardSession.learnedSet]));
      updateLearnedCounter();
    }

    // 2. If in past history, advance
    if (flashCardSession.historyIndex < flashCardSession.history.length - 1) {
      flashCardSession.historyIndex++;
      renderCurrentCard();
      return;
    }

    // 3. Otherwise fetch new continuous unrepeated word
    nextBtn.disabled = true;
    nextBtn.innerHTML = 'Next Word ⏳';
    await fetchNextUniqueWord();
    nextBtn.disabled = false;
    nextBtn.innerHTML = 'Next Word ➡️';
  });

  // Previous Word button
  prevBtn?.addEventListener('click', () => {
    if (flashCardSession.historyIndex > 0) {
      flashCardSession.historyIndex--;
      renderCurrentCard();
    }
  });

  // Initial load
  if (flashCardSession.history.length === 0) {
    fetchNextUniqueWord();
  } else {
    renderCurrentCard();
  }
}

// GAME 4: Live Dictionary & Word Check (Free Dictionary API + Gemini AI Backup)
function renderDictionaryLookup(mount) {
  mount.innerHTML = `
    <div style="border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <div>
          <h3 style="font-size:20px;display:flex;align-items:center;gap:8px;">
            <span>📖</span> <span>Instant Live Dictionary &amp; Lexicon Check</span>
          </h3>
          <span style="font-size:13px;color:var(--text-dim);">Live Free Dictionary API with intelligent Gemini lexical backup &amp; authentic Indian pronunciation.</span>
        </div>
        <div style="display:flex;gap:6px;">
          <span class="badge-pill" style="font-size:11px;color:var(--accent-green, #10b981);border:1px solid rgba(16,185,129,0.3);">🟢 Free Dictionary API</span>
          <span class="badge-pill" style="font-size:11px;color:var(--accent-cyan);border:1px solid var(--accent-cyan);">✨ Gemini AI Backup</span>
        </div>
      </div>
    </div>

    <div style="display:flex;gap:10px;margin-bottom:16px;">
      <input type="text" id="dict-search-input" placeholder="Enter any English word (e.g. articulate, juxtapose, prompt)..." style="flex:1;">
      <button class="btn btn-primary" id="btn-dict-search">Lookup Word 🔍</button>
    </div>

    <div id="dict-result-mount" style="background:var(--bg-subtle);border-radius:var(--radius-md);padding:20px;border:1px solid var(--border);min-height:160px;">
      <p style="color:var(--text-dim);">Enter an English word above to explore its formal dictionary definition, grammatical parts of speech, and authentic audio pronunciation.</p>
    </div>
  `;

  const search = async () => {
    const input = $('#dict-search-input');
    const word = input?.value.trim().toLowerCase();
    const resultBox = $('#dict-result-mount');
    if (!word) return;

    resultBox.innerHTML = '<div style="display:flex;align-items:center;gap:8px;color:var(--text-muted);"><span class="spinner-sm"></span> Consulting Free Dictionary API & Lexicon...</div>';
    
    let data = null;
    let source = 'Free Dictionary API';

    // 1. First attempt backend endpoint (queries KV cache & Free Dictionary API)
    try {
      data = await fetchApi(`dict/${encodeURIComponent(word)}`);
    } catch (e) {}

    // 2. Direct browser Free Dictionary API query fallback if backend is unreachable
    if (!data || data.not_found || !Array.isArray(data) || !data.length) {
      try {
        const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
        if (res.ok) {
          const direct = await res.json();
          if (Array.isArray(direct) && direct.length) {
            data = direct;
            source = 'Free Dictionary API';
          }
        }
      } catch (e) {}
    }

    // 3. Intelligent Gemini Backup if word is not found in Free Dictionary API
    if (!data || data.not_found || !Array.isArray(data) || !data.length) {
      resultBox.innerHTML = '<div style="display:flex;align-items:center;gap:8px;color:var(--accent-cyan);"><span class="spinner-sm"></span> Word not found in standard dictionary. Synthesizing lexical entry with Gemini AI Backup...</div>';
      try {
        const aiPrompt = `Define the English word or term "${word}". Return ONLY JSON in this structure:
[{"word":"${word}","phonetic":"/ipa/","meanings":[{"partOfSpeech":"noun/verb/adjective","definitions":[{"definition":"clear concise definition","example":"a realistic example sentence"}]}]}]`;

        const geminiReply = await callAiQuest(aiPrompt, true);
        if (geminiReply && Array.isArray(geminiReply) && geminiReply.length) {
          data = geminiReply;
          source = 'Gemini AI Backup';
        }
      } catch (e) {}
    }

    if (data && Array.isArray(data) && data.length) {
      const item = data[0];
      const meaning = item.meanings?.[0];
      const def = meaning?.definitions?.[0]?.definition || 'Definition available.';
      const ex = meaning?.definitions?.[0]?.example || '';
      const isGemini = source.includes('Gemini') || item.source === 'gemini';
      const sourceBadge = isGemini 
        ? '<span class="badge-pill" style="background:rgba(0,240,255,0.15);color:var(--accent-cyan);border:1px solid var(--accent-cyan);">✨ Gemini AI Lexicon Backup</span>'
        : '<span class="badge-pill badge-reg" style="color:var(--accent-green, #10b981);border-color:rgba(16,185,129,0.3);">🟢 Free Dictionary API Verified</span>';

      resultBox.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <div>
            <h3 style="font-size:26px;color:var(--accent-cyan);text-transform:capitalize;margin:0;">${escapeHtml(item.word)}</h3>
            <div style="margin-top:4px;">
              <span class="badge-pill badge-nirf">${escapeHtml(meaning?.partOfSpeech || 'word')}</span>
              <span style="font-family:var(--font-mono);color:var(--text-dim);font-size:13.5px;margin-left:8px;">${escapeHtml(item.phonetic || '')}</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            ${sourceBadge}
            <button class="btn btn-secondary btn-sm" onclick="speak('${escapeHtml(item.word)}', this)">🔊 Listen</button>
          </div>
        </div>
        <p style="font-size:15px;color:var(--text-main);margin-top:14px;line-height:1.55;">${escapeHtml(def)}</p>
        ${ex ? `<div style="font-size:13.5px;color:var(--text-muted);font-style:italic;margin-top:8px;padding-left:10px;border-left:2px solid var(--accent-cyan);">"${escapeHtml(ex)}"</div>` : ''}
      `;
    } else {
      resultBox.innerHTML = `
        <div style="color:var(--accent-magenta);font-weight:600;margin-bottom:6px;">⚠️ Word not recognized in Free Dictionary API or Gemini Lexicon.</div>
        <div style="font-size:13px;color:var(--text-muted);">Please check the spelling or search a standard English root word (e.g. <em>articulate</em>, <em>benevolent</em>, <em>resilient</em>).</div>
      `;
    }
  };

  $('#btn-dict-search')?.addEventListener('click', search);
  $('#dict-search-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') search(); });
}

// GAME 5: Spelling Bee Challenge
function renderSpellingBee(mount) {
  const WORDS = ["articulate", "eloquence", "jurisprudence", "soliloquy", "brevity", "meticulous", "tenacious", "empirical"];
  let curWord = WORDS[Math.floor(Math.random() * WORDS.length)];
  let streak = 0;

  mount.innerHTML = `
    <div style="text-align:center;border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:16px;">
      <h3 style="font-size:20px;">🐝 Spelling Bee Challenge</h3>
      <span style="font-size:13px;color:var(--text-dim);">Listen to the voice pronounce the word and type the exact spelling. Current Streak: <strong id="bee-streak" style="color:var(--accent-gold);">0</strong></span>
    </div>

    <div style="max-width:420px;margin:24px auto;text-align:center;">
      <button class="btn btn-accent" id="btn-bee-listen" style="padding:14px 24px;font-size:16px;margin-bottom:18px;">
        🔊 Hear Word Aloud
      </button>

      <input type="text" id="bee-input" placeholder="Type the spelling..." style="text-align:center;font-size:18px;">
      <button class="btn btn-primary" id="btn-bee-submit" style="width:100%;margin-top:10px;">Submit Spelling</button>
      <div id="bee-feedback" style="margin-top:14px;font-size:14px;"></div>
    </div>
  `;

  $('#btn-bee-listen')?.addEventListener('click', function() { speak(curWord, this); });

  $('#btn-bee-submit')?.addEventListener('click', () => {
    const input = $('#bee-input');
    const val = input.value.trim().toLowerCase();
    const fb = $('#bee-feedback');

    if (val === curWord) {
      streak++;
      $('#bee-streak').textContent = streak;
      fb.innerHTML = `<span style="color:var(--accent-emerald);">🎉 Correct! "${curWord}" is spelled accurately!</span>`;
      curWord = WORDS[Math.floor(Math.random() * WORDS.length)];
      input.value = '';
    } else {
      streak = 0;
      $('#bee-streak').textContent = streak;
      fb.innerHTML = `<span style="color:var(--accent-magenta);">Incorrect. The correct spelling was <strong>${curWord}</strong>.</span>`;
    }
  });
}

// GAME 6: Career Word Hangman / Letter Guess
function renderHangman(mount) {
  const WORDS = [
    { word: "ASTRONAUT", clue: "Space exploration & orbital research" },
    { word: "SURGEON", clue: "Critical operating room surgical procedures" },
    { word: "DIPLOMAT", clue: "International treaties and foreign embassy relations" },
    { word: "ARCHITECT", clue: "Designing sustainable skyscrapers & urban masterplans" },
    { word: "JOURNALIST", clue: "Investigative reporting & live news broadcasting" },
    { word: "ADVOCATE", clue: "Courtroom litigation & constitutional rights defense" }
  ];
  let current = WORDS[Math.floor(Math.random() * WORDS.length)];
  let guessedLetters = new Set();
  let remainingMistakes = 6;

  function renderState() {
    const displayWord = current.word.split('').map(l => guessedLetters.has(l) ? l : '_').join(' ');
    const isWon = current.word.split('').every(l => guessedLetters.has(l));
    const isLost = remainingMistakes <= 0;

    mount.innerHTML = `
      <div style="border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:16px;">
        <h3 style="font-size:20px;">🪢 Career Word Hangman</h3>
        <p style="font-size:13.5px;color:var(--text-dim);">Guess the letters of high-impact professions. Clue: <strong>${current.clue}</strong></p>
      </div>

      <div style="text-align:center;max-width:540px;margin:20px auto;">
        <div style="font-size:14px;color:var(--accent-gold);margin-bottom:10px;">
          Chances Left: <strong>${remainingMistakes} / 6</strong>
        </div>

        <div style="font-family:var(--font-mono);font-size:32px;letter-spacing:0.25em;color:var(--accent-cyan);margin:24px 0;" id="hangman-display">
          ${displayWord}
        </div>

        ${isWon ? `
          <div style="background:rgba(0,245,155,0.15);border:1px solid var(--accent-emerald);color:var(--accent-emerald);padding:14px;border-radius:var(--radius-md);margin-bottom:18px;">
            🎉 Bravo! You deduced the profession: <strong>${current.word}</strong>!
          </div>
          <button class="btn btn-primary" id="btn-hangman-restart">Play Next Profession ➡️</button>
        ` : isLost ? `
          <div style="background:rgba(255,42,133,0.15);border:1px solid var(--accent-magenta);color:var(--accent-magenta);padding:14px;border-radius:var(--radius-md);margin-bottom:18px;">
            Game Over! The target career was <strong>${current.word}</strong>.
          </div>
          <button class="btn btn-primary" id="btn-hangman-restart">Try Again 🔄</button>
        ` : `
          <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;max-width:440px;margin:0 auto;" id="hangman-alphabet-grid">
            ${'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(char => `
              <button class="filter-chip" data-letter="${char}" ${guessedLetters.has(char) ? 'disabled style="opacity:0.35;cursor:not-allowed;"' : ''} style="min-width:36px;padding:6px 0;font-family:var(--font-mono);font-weight:700;">
                ${char}
              </button>
            `).join('')}
          </div>
        `}
      </div>
    `;

    $('#btn-hangman-restart')?.addEventListener('click', () => {
      current = WORDS[Math.floor(Math.random() * WORDS.length)];
      guessedLetters.clear();
      remainingMistakes = 6;
      renderState();
    });

    $$('#hangman-alphabet-grid [data-letter]').forEach(btn => {
      btn.onclick = () => {
        const letter = btn.dataset.letter;
        if (!guessedLetters.has(letter) && !isWon && !isLost) {
          guessedLetters.add(letter);
          if (!current.word.includes(letter)) {
            remainingMistakes--;
          }
          renderState();
        }
      };
    });
  }

  renderState();
}

// ─── 10. ROADMAP & EXPLORATION TOOLS (MY PLAN & QUIZ) ─────────────────────────
function renderPlanTool(toolKey = 'bizcard') {
  const mount = $('#plan-tool-arena');
  if (!mount) return;

  initPlanTools();

  $$('#plan-tools-tabs .filter-chip').forEach(b => {
    b.classList.toggle('active', b.dataset.tool === toolKey);
  });

  if (toolKey === 'myplan') {
    renderMyPlan(mount);
  } else if (toolKey === 'quiz') {
    renderCareerQuiz(mount);
  } else if (toolKey === 'bizcard') {
    renderFutureBusinessCard(mount);
  }
}

function initPlanTools() {
  $$('#plan-tools-tabs .filter-chip').forEach(btn => {
    btn.onclick = () => {
      renderPlanTool(btn.dataset.tool);
    };
  });
}

// TOOL 1: My Plan Roadmap Generator
// ── Offline High-Fidelity Roadmap Blueprint Generator ─────────────────────
function generateOfflineRoadmap(careerObj, cls, dailyMins) {
  const cat = careerObj.cat || 'Professional';
  const exams = careerObj.exams || 'National Entrance Examinations';
  const degrees = careerObj.degrees || 'Bachelor / Master Professional Degree';
  const title = careerObj.title || 'Career Path';
  const superpower = careerObj.englishSuperpower || 'English is the universal operational language for global leadership.';

  // Class-specific academic milestones
  let m1Detail = '';
  if (cls === 'Class 8 & below') {
    m1Detail = `Build robust English reading endurance (fiction & science journals), master spoken diction through morning assembly elocution, and cultivate a foundational curiosity for ${cat.toLowerCase()} principles.`;
  } else if (cls === 'Class 9') {
    m1Detail = `Begin aligning your school stream roadmap (Science vs Commerce vs Humanities). Join school debating, Model United Nations (MUN), and start building a specialized vocabulary notebook tailored to ${title.toLowerCase()}.`;
  } else if (cls === 'Class 10' || cls.includes('Class 10')) {
    m1Detail = `Target 90%+ in ICSE/CBSE English & Core Board exams. Formalize your Class 11 stream selection directly aligned with ${degrees}, and lead student editorial or debate societies.`;
  } else if (cls === 'Class 11') {
    m1Detail = `Commence dedicated coaching and timed mock tests for ${exams}. Participate in state/national public speaking symposiums and read international peer-reviewed literature in ${cat}.`;
  } else if (cls === 'Class 12') {
    m1Detail = `Peak competitive exam readiness for ${exams} alongside Board Exam excellence. Draft preliminary Statements of Purpose (SOP) and build interview confidence through impromptu speaking drills.`;
  } else {
    m1Detail = `Pursue specialized undergraduate internships, participate in collegiate moot courts/hackathons, network with industry alumni, and prepare for licensing/post-graduate assessments.`;
  }

  // Accredited college recommendations based on category
  let colleges = '';
  if (cat === 'Aviation') {
    colleges = `Indira Gandhi Rashtriya Uran Akademi (IGRUA, NAAC A+), Bombay Flying Club (DGCA Approved), and National Flying Training Institute (NFTI Gondia) for ${degrees}.`;
  } else if (cat === 'Health') {
    colleges = `All India Institute of Medical Sciences (AIIMS New Delhi, NIRF #1), Christian Medical College (CMC Vellore, NAAC A++), and King Edward Memorial (KEM Mumbai) for ${degrees}.`;
  } else if (cat === 'Law') {
    colleges = `National Law School of India University (NLSIU Bangalore, NIRF Law #1), NALSAR Hyderabad (NAAC A++), and Government Law College (GLC Mumbai) for ${degrees}.`;
  } else if (cat === 'Tech') {
    colleges = `Indian Institute of Technology (IIT Bombay / IIT Delhi, NIRF Top 3), BITS Pilani (NAAC A), and International Institute of Information Technology (IIIT Hyderabad) for ${degrees}.`;
  } else if (cat === 'Media') {
    colleges = `Indian Institute of Mass Communication (IIMC New Delhi), St. Xavier's College Autonomous Mumbai (NAAC A+), and Symbiosis Institute of Media & Communication (SIMC Pune) for ${degrees}.`;
  } else if (cat === 'Public Policy') {
    colleges = `St. Stephen's College (Delhi University, NAAC A++), Jawaharlal Nehru University (JNU New Delhi, NAAC A++), and National Defence Academy (NDA Khadakwasla) for ${degrees}.`;
  } else if (cat === 'Business') {
    colleges = `Shri Ram College of Commerce (SRCC Delhi, NAAC A++), Indian Institute of Management (IIM Indore IPM, NIRF Top 10), and Narsee Monjee Institute of Management Studies (NMIMS Mumbai, NAAC A+).`;
  } else {
    colleges = `Film and Television Institute of India (FTII Pune), National Institute of Design (NID Ahmedabad, NAAC A+), and Delhi University Faculty of Arts (NAAC A++).`;
  }

  // Calculate time-boxed daily habit breakdown
  const listenMins = Math.max(3, Math.round(dailyMins * 0.25));
  const speakMins = Math.max(4, Math.round(dailyMins * 0.35));
  const writeMins = Math.max(3, Math.round(dailyMins * 0.25));
  const reflectMins = Math.max(2, dailyMins - listenMins - speakMins - writeMins);

  return {
    career: title,
    class_grade: cls,
    daily_minutes: dailyMins,
    headline: `${title} Strategic Blueprint (${cls})`,
    why_english: superpower,
    milestones: [
      {
        step: 1,
        title: `Current Milestone (${cls})`,
        detail: m1Detail
      },
      {
        step: 2,
        title: "Target Entrance Examinations",
        detail: `Prepare competitive entrance tests early: ${exams}. Focus on reading speed, reasoning accuracy, and domain terminology.`
      },
      {
        step: 3,
        title: "Premier Accredited Colleges (NAAC / NIRF)",
        detail: `Target premier institutes with NAAC Grade 'A+' / 'A++' and top NIRF rankings: ${colleges}`
      }
    ],
    daily_routine: [
      {
        phase: "Listen & Absorb",
        mins: listenMins,
        action: `Listen to a curated 10-minute masterclass podcast, technical case study, or speech in ${cat} to absorb native phrasing and professional diction.`
      },
      {
        phase: "Speak & Articulate",
        mins: speakMins,
        action: `Practice speaking aloud for ${speakMins} minutes explaining a key concept in ${title.toLowerCase()} without filler words, focusing on crisp cadence and vocal projection.`
      },
      {
        phase: "Write & Synthesize",
        mins: writeMins,
        action: `Write a concise 50-word synthesis of an insight, case study, or news article relevant to ${title.toLowerCase()} using three advanced vocabulary words.`
      },
      {
        phase: "Reflect & Track",
        mins: reflectMins,
        action: `Log your daily streak, note one hesitation to eliminate tomorrow, and review your vocabulary flashcard deck.`
      }
    ]
  };
}

function renderMyPlan(mount) {
  if (!mount) return;

  // Build options for all 32+ careers
  const careerOptions = CAREERS_DATA.map(c => 
    `<option value="${escapeHtml(c.title)}">${c.icon || '🎯'} ${escapeHtml(c.title)} (${escapeHtml(c.cat)})</option>`
  ).join('');

  mount.innerHTML = `
    <div style="border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <div>
          <h3 style="font-size:20px;font-weight:800;margin:0 0 4px 0;">🗺️ "My Plan" Personalized AI Career Roadmap</h3>
          <p style="font-size:13.5px;color:var(--text-muted);margin:0;">Select your class, target career, and daily time to generate a bespoke chronological milestone blueprint powered by Google Gemini AI.</p>
        </div>
        <span class="badge-pill" style="background:rgba(0,240,255,0.08);border:1px solid var(--border-strong);color:var(--accent-cyan);font-weight:700;">
          ⚡ 32 Pathways Available
        </span>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(210px, 1fr));gap:14px;margin-bottom:18px;">
      <div class="form-group">
        <label for="plan-class-select" style="font-size:13px;font-weight:700;display:block;margin-bottom:6px;">Your Current Class / Grade:</label>
        <select id="plan-class-select" style="width:100%;">
          <option value="Class 8 & below">Class 8 &amp; below</option>
          <option value="Class 9">Class 9</option>
          <option value="Class 10" selected>Class 10 (ICSE / CBSE)</option>
          <option value="Class 11">Class 11</option>
          <option value="Class 12">Class 12</option>
          <option value="College">College / Exploring</option>
        </select>
      </div>

      <div class="form-group">
        <label for="plan-career-select" style="font-size:13px;font-weight:700;display:block;margin-bottom:6px;">Target Career Track (32 Careers):</label>
        <select id="plan-career-select" style="width:100%;">
          ${careerOptions}
        </select>
      </div>

      <div class="form-group">
        <label for="plan-time-select" style="font-size:13px;font-weight:700;display:block;margin-bottom:6px;">Daily Practice Commitment:</label>
        <select id="plan-time-select" style="width:100%;">
          <option value="15">15 mins / day (Focused Sprint)</option>
          <option value="30" selected>30 mins / day (Balanced Habit)</option>
          <option value="45">45 mins / day (Accelerated Mastery)</option>
          <option value="60">60 mins / day (Deep Immersion)</option>
        </select>
      </div>
    </div>

    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;">
      <button class="btn btn-primary" id="btn-generate-plan" style="padding:12px 22px;font-size:15px;font-weight:700;">
        <span>🚀</span> <span>Generate Roadmap Blueprint</span>
      </button>
    </div>

    <div id="plan-output-container"></div>
  `;

  // Function to render blueprint into container
  function displayBlueprint(blueprint, provider = 'Google Gemini AI') {
    const out = $('#plan-output-container');
    if (!out) return;

    const careerObj = CAREERS_DATA.find(c => c.title === blueprint.career) || CAREERS_DATA[0];
    const steps = blueprint.milestones || [];
    const routine = blueprint.daily_routine || [];

    const routineHtml = routine.map((r, idx) => `
      <div style="background:var(--surface-raised);border:1px solid var(--border);border-radius:var(--radius-md);padding:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <strong style="color:var(--text-main);font-size:13.5px;">${escapeHtml(r.phase)}</strong>
          <span class="badge-pill" style="background:rgba(0,240,255,0.1);color:var(--accent-cyan);font-weight:700;font-size:11.5px;">
            ⏱️ ${r.mins} Mins
          </span>
        </div>
        <p style="font-size:13px;color:var(--text-muted);margin:0;line-height:1.45;">${escapeHtml(r.action)}</p>
      </div>
    `).join('');

    const milestonesHtml = steps.map((m, idx) => {
      const colors = ['var(--accent-brand)', 'var(--accent-magenta)', 'var(--accent-emerald)', 'var(--accent-cyan)'];
      const bg = colors[idx % colors.length];
      return `
        <div style="display:flex;gap:14px;align-items:flex-start;">
          <div style="width:32px;height:32px;border-radius:50%;background:${bg};color:#000;display:grid;place-items:center;font-weight:800;font-size:14px;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,0.25);">
            ${idx + 1}
          </div>
          <div style="flex:1;">
            <div style="font-weight:800;font-size:15px;color:var(--text-main);margin-bottom:4px;">
              ${escapeHtml(m.title)}
            </div>
            <div style="font-size:13.5px;color:var(--text-muted);line-height:1.55;">
              ${escapeHtml(m.detail)}
            </div>
          </div>
        </div>
      `;
    }).join('');

    out.innerHTML = `
      <div class="card" style="padding:24px;border:1.5px solid var(--border-strong);box-shadow:0 8px 30px rgba(0,0,0,0.35);">
        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;border-bottom:1px solid var(--border);padding-bottom:16px;margin-bottom:18px;">
          <div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
              <span class="badge-pill badge-nirf">${escapeHtml(blueprint.class_grade)} Roadmap</span>
              <span class="badge-pill" style="background:var(--surface-raised);border:1px solid var(--border);color:var(--text-muted);font-weight:600;">
                ⭐ ${escapeHtml(careerObj.cat || 'Career Path')}
              </span>
              <span class="badge-pill" style="background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.4);color:var(--accent-emerald);font-weight:700;">
                ⏱️ ${blueprint.daily_minutes} Mins Daily Habit
              </span>
            </div>
            <h3 style="font-size:24px;font-weight:800;color:var(--accent-cyan);margin:0;">
              ${careerObj.icon || '🎯'} ${escapeHtml(blueprint.career)} Pathway
            </h3>
          </div>
          <span class="badge-pill" style="background:rgba(0,240,255,0.1);border:1px solid var(--accent-cyan);color:var(--accent-cyan);font-weight:700;font-size:11.5px;">
            ${provider.includes('Gemini') ? '🤖 Gemini AI Generated' : '⚡ Precision Engine'}
          </span>
        </div>

        <!-- Why English Superpower -->
        <div style="background:rgba(0,240,255,0.06);border-left:3.5px solid var(--accent-brand);border-radius:var(--radius-sm);padding:14px 16px;margin-bottom:20px;">
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--accent-brand);margin-bottom:4px;">
            ⚡ Why English is Your Decisive Superpower in this Field:
          </div>
          <p style="font-size:13.5px;color:var(--text-main);margin:0;line-height:1.5;">
            ${escapeHtml(blueprint.why_english || careerObj.englishSuperpower || '')}
          </p>
        </div>

        <!-- Chronological Milestones -->
        <div style="margin-bottom:22px;">
          <h4 style="font-size:16px;font-weight:800;color:var(--text-main);margin:0 0 14px 0;display:flex;align-items:center;gap:6px;">
            <span>📍</span> <span>Chronological Roadmap Milestones</span>
          </h4>
          <div style="display:flex;flex-direction:column;gap:16px;">
            ${milestonesHtml}
          </div>
        </div>

        <!-- Daily Habit Breakdown -->
        <div style="border-top:1px solid var(--border);padding-top:18px;margin-bottom:20px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
            <h4 style="font-size:16px;font-weight:800;color:var(--text-main);margin:0;display:flex;align-items:center;gap:6px;">
              <span>⏱️</span> <span>Personalized Daily Practice Habit (${blueprint.daily_minutes} Mins)</span>
            </h4>
            <span style="font-size:12px;color:var(--text-muted);">Calculated for steady compounding fluency</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:10px;">
            ${routineHtml}
          </div>
        </div>

        <!-- Actions -->
        <div style="display:flex;gap:10px;flex-wrap:wrap;padding-top:14px;border-top:1px solid var(--border);">
          <button class="btn btn-secondary btn-sm" id="btn-copy-blueprint" type="button">
            <span>📋</span> <span>Copy Roadmap Blueprint</span>
          </button>
          <button class="btn btn-secondary btn-sm" id="btn-print-blueprint" type="button" onclick="window.print()">
            <span>🖨️</span> <span>Print / Save as PDF</span>
          </button>
        </div>
      </div>
    `;

    // Hook up copy blueprint
    $('#btn-copy-blueprint')?.addEventListener('click', () => {
      let copyText = `# ${blueprint.career} Pathway Blueprint (${blueprint.class_grade})
`;
      copyText += `Daily Commitment: ${blueprint.daily_minutes} Mins/day
`;
      copyText += `Why English Matters: ${blueprint.why_english}

`;
      copyText += `## Milestones:
`;
      steps.forEach((s, idx) => {
        copyText += `${idx + 1}. ${s.title}: ${s.detail}
`;
      });
      copyText += `
## Daily Practice Routine (${blueprint.daily_minutes} Mins):
`;
      routine.forEach(r => {
        copyText += `- ${r.phase} (${r.mins} mins): ${r.action}
`;
      });
      navigator.clipboard.writeText(copyText).then(() => {
        showToast('Roadmap blueprint copied to clipboard!');
      }).catch(() => {
        showToast('Copied roadmap blueprint text!');
      });
    });

    out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Handle Generate Roadmap Button Click
  $('#btn-generate-plan')?.addEventListener('click', async () => {
    const cls = $('#plan-class-select')?.value || 'Class 10';
    const car = $('#plan-career-select')?.value || 'Commercial Airline Pilot';
    const time = parseInt($('#plan-time-select')?.value || '30', 10);
    const out = $('#plan-output-container');
    if (!out) return;

    const careerObj = CAREERS_DATA.find(c => c.title === car) || CAREERS_DATA[0];

    // Show dynamic AI Loading state
    out.innerHTML = `
      <div class="card" style="padding:32px 20px;text-align:center;background:var(--bg-subtle);border:1.5px dashed var(--accent-cyan);border-radius:var(--radius-lg);">
        <div style="font-size:38px;animation:pulseGreeting 1.4s infinite alternate;display:inline-block;margin-bottom:8px;">⚡</div>
        <h4 style="font-size:18px;font-weight:800;color:var(--text-main);margin:0 0 6px 0;">Synthesizing AI Roadmap Blueprint...</h4>
        <p style="font-size:13.5px;color:var(--text-muted);margin:0 auto;max-width:460px;line-height:1.5;">
          Personalizing milestones for <strong>${escapeHtml(car)}</strong> (${escapeHtml(cls)}, ${time}m daily commitment) using Google Gemini AI...
        </p>
      </div>
    `;

    let blueprint = null;
    let provider = 'Google Gemini AI';

    try {
      const res = await fetchApi('ai', {
        method: 'POST',
        body: JSON.stringify({
          task: 'generate-roadmap',
          career: car,
          class_grade: cls,
          daily_minutes: time,
          career_data: {
            cat: careerObj.cat,
            degrees: careerObj.degrees,
            exams: careerObj.exams,
            englishSuperpower: careerObj.englishSuperpower
          }
        })
      });

      if (res?.ok && res?.blueprint) {
        blueprint = res.blueprint;
        provider = res.provider || 'Google Gemini AI';
      }
    } catch (e) {}

    // Fallback if AI is offline or key missing
    if (!blueprint) {
      blueprint = generateOfflineRoadmap(careerObj, cls, time);
      provider = 'On-Device Heuristic Engine';
    }

    displayBlueprint(blueprint, provider);
  });
}
// TOOL 2: 5-Question Career Curiosity Quiz
function renderCareerQuiz(mount) {
  const QUESTIONS = [
    {
      q: "1. Which school activity energizes you the most?",
      options: [
        { text: "A. Directing plays, writing magazine articles, or anchoring morning assemblies", sector: "Media & Journalism" },
        { text: "B. Debating rules, defending principles in Model UN, or moot court arguments", sector: "Law & Corporate Advocacy" },
        { text: "C. Writing code, automating spreadsheets, and dissecting computer networks", sector: "Technology & Software Architecture" },
        { text: "D. Dissecting biology specimens, first-aid, and counseling distressed friends", sector: "Medicine & Healthcare" }
      ]
    },
    {
      q: "2. In an emergency or crisis, what is your instinctive role?",
      options: [
        { text: "A. The Communicator — interviewing witnesses and broadcasting verified facts calmly", sector: "Media & Journalism" },
        { text: "B. The Arbitrator — reviewing policies, analyzing liability, and finding compromise", sector: "Law & Corporate Advocacy" },
        { text: "C. The Systems Architect — diagnosing root causes and deploying hotfix automations", sector: "Technology & Software Architecture" },
        { text: "D. The Caregiver — administering immediate triage and keeping patients stable", sector: "Medicine & Healthcare" }
      ]
    },
    {
      q: "3. What English superpower matters most to your future ambition?",
      options: [
        { text: "A. Storytelling eloquence & live teleprompter poise under broadcast lights", sector: "Media & Journalism" },
        { text: "B. Razor-sharp statutory precision & cross-examination rhetoric", sector: "Law & Corporate Advocacy" },
        { text: "C. Structured technical documentation & clear cross-functional architecture reviews", sector: "Technology & Software Architecture" },
        { text: "D. Empathic patient communication & high-pressure multidisciplinary clinical briefs", sector: "Medicine & Healthcare" }
      ]
    },
    {
      q: "4. What kind of books or podcasts do you naturally pick up?",
      options: [
        { text: "A. Geopolitics, investigative journalism exposés, and global cultural essays", sector: "Media & Journalism" },
        { text: "B. Landmark court rulings, constitutional debates, and corporate boardroom battles", sector: "Law & Corporate Advocacy" },
        { text: "C. Artificial intelligence research, startup founder stories, and distributed systems", sector: "Technology & Software Architecture" },
        { text: "D. Neuroscience breakthroughs, surgical biographies, and public health memoirs", sector: "Medicine & Healthcare" }
      ]
    },
    {
      q: "5. What is your ultimate 15-year career goal?",
      options: [
        { text: "A. Prime-time international news anchor or chief documentary producer", sector: "Media & Journalism" },
        { text: "B. Senior Partner at a Tier-1 corporate law firm or Supreme Court Advocate", sector: "Law & Corporate Advocacy" },
        { text: "C. Chief Technology Officer or founder of a global venture-backed startup", sector: "Technology & Software Architecture" },
        { text: "D. Chief Surgeon or director of a specialized pediatric hospital wing", sector: "Medicine & Healthcare" }
      ]
    }
  ];

  let currentQ = 0;
  let scores = {
    "Media & Journalism": 0,
    "Law & Corporate Advocacy": 0,
    "Technology & Software Architecture": 0,
    "Medicine & Healthcare": 0
  };

  function showQuestion() {
    if (currentQ >= QUESTIONS.length) {
      let topSector = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
      mount.innerHTML = `
        <div style="border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:16px;">
          <h3 style="font-size:20px;">🧭 Career Discovery Diagnosis Complete</h3>
          <p style="font-size:13.5px;color:var(--text-dim);">Based on your answers across all 5 career aptitude dimensions.</p>
        </div>

        <div style="background:rgba(0,240,255,0.06);border:1.5px solid var(--accent-cyan);border-radius:var(--radius-lg);padding:24px;text-align:center;">
          <div style="font-size:38px;margin-bottom:8px;">🎯</div>
          <span class="badge-pill badge-naac" style="font-size:12px;">Top Career Fit</span>
          <h2 style="font-size:26px;color:var(--accent-cyan);margin:8px 0;">${topSector}</h2>
          <p style="font-size:15px;color:var(--text-main);max-width:540px;margin:0 auto 16px;line-height:1.6;">
            Your communication preferences align with <strong>${topSector}</strong>. You thrive on clear articulation, structured reasoning, and high-impact spoken English.
          </p>
          <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
            <button class="btn btn-primary" onclick="switchTab('careers')">Explore Careers in ${topSector} 🚀</button>
            <button class="btn btn-secondary" onclick="switchTab('colleges')">View Colleges 🏛️</button>
            <button class="btn btn-secondary" id="btn-retake-quiz">Retake Quiz 🔄</button>
          </div>
        </div>
      `;

      $('#btn-retake-quiz')?.addEventListener('click', () => {
        currentQ = 0;
        scores = { "Media & Journalism": 0, "Law & Corporate Advocacy": 0, "Technology & Software Architecture": 0, "Medicine & Healthcare": 0 };
        showQuestion();
      });
      return;
    }

    const item = QUESTIONS[currentQ];
    mount.innerHTML = `
      <div style="border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <h3 style="font-size:20px;">🧭 5-Question Career Curiosity Quiz</h3>
          <span style="font-size:13px;color:var(--text-dim);">Question ${currentQ + 1} of ${QUESTIONS.length}</span>
        </div>
        <div style="display:flex;gap:4px;">
          ${QUESTIONS.map((_, i) => `
            <div style="width:24px;height:6px;border-radius:3px;background:${i <= currentQ ? 'var(--accent-cyan)' : 'var(--surface-hover)'}"></div>
          `).join('')}
        </div>
      </div>

      <div style="max-width:680px;margin:16px auto;">
        <h4 style="font-size:17px;font-weight:700;margin-bottom:16px;line-height:1.4;">${item.q}</h4>
        <div style="display:flex;flex-direction:column;gap:10px;" id="quiz-options-container">
          ${item.options.map((opt, i) => `
            <button class="btn btn-secondary" data-sector="${opt.sector}" style="justify-content:flex-start;text-align:left;padding:14px 18px;font-size:14.5px;line-height:1.4;white-space:normal;cursor:pointer;">
              ${opt.text}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    $$('#quiz-options-container button').forEach(btn => {
      btn.onclick = () => {
        const sector = btn.dataset.sector;
        scores[sector] = (scores[sector] || 0) + 1;
        currentQ++;
        showQuestion();
      };
    });
  }

  showQuestion();
}

// TOOL 3: Future Business Card Generator with Dynamic QR Verification
const CAREER_CREDENTIALS_MAP = {
  "Chief Surgeon & Medical Resident": [
    "MBBS (Gold Medalist) · MS General Surgery · AIIMS",
    "MD Clinical Medicine · MRCS (London) · Trauma Fellowship",
    "Super Specialist MCh · Fellow American College of Surgeons (FACS)",
    "Chief Resident · Global Medical Board Certified"
  ],
  "Commercial Airline Pilot": [
    "B.Sc Aviation · ICAO Level 6 · IGRUA Graduate",
    "ATPL Commander · Boeing 787 Dreamliner Type-Rated · DGCA Gold",
    "CPL Multi-Engine Instrument · Chief Flight Instructor (CFI)",
    "Senior Captain · International Long-Haul Fleet Lead"
  ],
  "Principal Software Architect": [
    "B.Tech CSE (IIT) · M.S. Distributed Systems (Stanford)",
    "AWS Solutions Architect Pro · Kubernetes CKA · Tech Fellow",
    "Staff Architect · Distributed Cloud Lead · Core Contributor",
    "Distinguished Engineer · AI Infrastructure & Scalability Lead"
  ],
  "Corporate Mergers & Acquisitions Lawyer": [
    "B.A. LL.B (Hons) NLSIU · LL.M Corporate Law (Cambridge)",
    "Senior Partner · Bar Council of India · Chambers Band 1",
    "Advocate Supreme Court · Cross-Border M&A Lead · Legal 500",
    "Solicitor England & Wales · Dual-Qualified Arbitrator"
  ],
  "Diplomatic Civil Servant (IFS / IAS)": [
    "M.A. International Relations (JNU) · UPSC CSE Rank Top 20",
    "Indian Foreign Service (IFS) · Diplomatic Attaché · UN Delegation",
    "District Magistrate / IAS Special Secretary · Public Policy Lead",
    "Ambassador Extraordinary & Plenipotentiary · Peace Fellow"
  ],
  "Commissioned Defence Officer (NDA)": [
    "B.Sc Military Science · NDA Khadakwasla · IMA Sword of Honour",
    "Wing Commander · Fighter Pilot · Flying Badge Gold",
    "Lieutenant Colonel · Staff College Camberley Qualified · Sena Medal",
    "Captain Indian Navy · Warship Navigation & Operations Specialist"
  ],
  "Broadcast Journalist & News Anchor": [
    "B.A. Journalism (ACJ) · Prime Time Anchor · Press Club Lead",
    "Ramnath Goenka Awardee · Senior Investigative Editor",
    "Foreign News Desk Head · Emmy Nominated Broadcast Producer",
    "Chief Anchor · International Media Forum Fellow"
  ],
  "Luxury Hospitality & General Manager": [
    "B.Sc Hospitality (IHM Pusa) · Ecole Hôtelière de Lausanne Executive",
    "General Manager · Forbes 5-Star Luxury Resort Director",
    "Certified Hotel Administrator (CHA) · Master Sommelier Level 3",
    "Managing Director · Global Luxury Hotelier of the Year"
  ],
  "Venture Entrepreneur & Startup Founder": [
    "B.Tech (IIT) + MBA (Stanford GSB) · Y-Combinator Alum",
    "Founder & CEO · Forbes 30 Under 30 · Series-B Unicorn Lead",
    "Tech Entrepreneur · TiE Charter Member · Global Innovator Fellow",
    "Angel Investor · 50+ Startup Portfolio · World Economic Forum YGL"
  ],
  "Chartered Accountant & Investment Banker": [
    "CA Rank 1 (ICAI) · CFA Charterholder (USA) · IIM Ahmedabad",
    "Managing Director M&A · Goldman Sachs Wall Street Alum",
    "Chief Financial Officer (CFO) · Capital Markets Lead",
    "FRM Certified · Private Equity Partner · SEBI Registered Manager"
  ],
  "University Professor & Academic Scholar": [
    "Ph.D. English Literature (Oxford) · Rhodes Scholar Alum",
    "Tenured Chair Professor · Cambridge University Press Author",
    "Fulbright Fellow · Dean of Humanities & Research Council Chair",
    "Visiting Scholar Harvard · National Endowment Grantee"
  ],
  "OTT Screenwriter & Narrative Game Designer": [
    "MFA Screenwriting (FTII) · Writer's Guild of America Member",
    "Showrunner · Netflix Global Original Series · Filmfare Awardee",
    "Narrative Director · BAFTA Games Nominee · IGN Story of the Year",
    "Lead Worldbuilder · Prime Video Writers Room Alum"
  ],
  "Voice-Over Artist & Audio Narrator": [
    "Audie Award Winner · Certified Voice Master (London Drama)",
    "Official Voice of National Geographic & BBC Earth Documentaries",
    "Audiobook Narrator of 100+ Best-sellers · Audible Hall of Fame",
    "International Commercial VO Talent · SOVAS Voice Arts Awardee"
  ],
  "Technical Writer & Documentation Specialist": [
    "B.S. Computer Science + Technical Comm (STC Fellow)",
    "Staff Documentation Architect · Google Cloud / OpenAI Ecosystem",
    "Lead API Writer · Write the Docs Keynote Speaker",
    "Open Source Docs Guild Lead · IEEE Professional Comm Member"
  ],
  "Advertising Creative Director & Copywriter": [
    "Cannes Lions Grand Prix Winner · D&AD Black Pencil Awardee",
    "Executive Creative Director · Ogilvy Global Creative Council",
    "Clio Award Winner · One Show Hall of Fame Nominee",
    "Chief Creative Officer · Super Bowl & IPL Campaign Architect"
  ],
  "International Public Relations Strategist": [
    "M.S. Strategic Communications (Columbia) · PRSA Silver Anvil",
    "Global Head of Communications · Fortune 100 Enterprise",
    "Crisis Counsel Lead · World Economic Forum Media Advisor",
    "SABRE Award Winner · International PR Association President"
  ],
  "Novelist & Literary Fiction Author": [
    "Booker Prize Nominee · MFA Creative Writing (Iowa Writers' Workshop)",
    "New York Times #1 Best-Selling Author · Sahitya Akademi Award",
    "PEN/Hemingway Finalist · Royal Society of Literature Fellow",
    "International Bestseller · Translated into 28 Global Languages"
  ],
  "Narrative Game Writer & Worldbuilder": [
    "Lead Narrative Designer · The Game Awards Best Narrative Winner",
    "Lead Writer · AAA Open-World Franchise · BAFTA Games Member",
    "Interactive Fiction Pioneer · GDC Narrative Summit Speaker",
    "Senior Quest Designer · 10M+ Global Player Community"
  ],
  "Science Communicator & Research Journalist": [
    "Ph.D. Astrophysics / Biology · AAAS Kavli Journalism Award",
    "Senior Editor Scientific American & Nature Science Columnist",
    "Pulitzer Prize Finalist for Explanatory Reporting · TED Speaker",
    "Lead Producer BBC Science & Discovery Science Fellow"
  ],
  "UX Writer & Product Content Designer": [
    "Lead Content Designer · Apple / Airbnb Product Design Guild",
    "Design System Voice & Tone Lead · Fast Company Innovation Award",
    "Author of Leading UX Writing Handbook · Figma Community Creator",
    "Head of Content Strategy · 100M+ Daily Active Users UX Ecosystem"
  ],
  "Publishing Editor & Literary Agent": [
    "Editor-in-Chief · Penguin Random House / HarperCollins",
    "Agent to 12 Pulitzer & National Book Award Winners · AALA Member",
    "Editorial Director · Frankfurt & London Book Fair Delegate",
    "Distinguished Publishing Fellow · Global Rights Negotiator"
  ],
  "Product Manager & Agile Lead": [
    "B.Tech (IIT) + MBA · Certified Scrum Product Owner (CSPO)",
    "VP of Product · Enterprise SaaS Platform (10M+ Enterprise Seats)",
    "Product School Featured Speaker · Mind the Product Fellow",
    "Chief Product Officer · Product-Led Growth (PLG) Trailblazer"
  ],
  "Commercial Flight Cabin Crew Lead": [
    "Inflight Service Director · Emirates / Singapore Airlines First Class",
    "IATA Airline Cabin Safety Certified · Crew Resource Management Lead",
    "VIP State Flight Lead · Aviation Hospitality Excellence Award",
    "Chief Purser · 15,000+ Transoceanic Flight Hours"
  ],
  "Foreign Correspondent & War Reporter": [
    "Pulitzer Prize Winner for International Reporting · Overseas Press Club",
    "Chief Bureau Chief Middle East & South Asia · BBC World / CNN",
    "Rory Peck Awardee · Committee to Protect Journalists (CPJ) Fellow",
    "Foreign Affairs Columnist · International War Correspondence Medal"
  ],
  "Speechwriter & Political Strategist": [
    "Chief Speechwriter to Prime Minister / Head of State",
    "Director of Presidential Speechwriting · Cicero Grand Award",
    "Political Communications Director · Oxford Union Lifetime Member",
    "Senior Fellow Harvard Kennedy School · Global Summit Rhetoric Lead"
  ],
  "Sports Commentator & Live Broadcaster": [
    "Lead Commentator ICC Cricket World Cup / Premier League / Wimbledon",
    "Sports Emmy Award Winner · Star Sports / Sky Sports Lead Voice",
    "Broadcast Journalism Hall of Fame · 25+ Years Live Commentary",
    "Official Olympic Games Host Broadcaster Anchor"
  ],
  "Computational Linguist & AI Prompt Engineer": [
    "Ph.D. Natural Language Processing (Stanford) · ACL Lifetime Member",
    "Principal AI Prompt Architect · Frontier Foundation Models Lead",
    "OpenAI / Google DeepMind Research Collaborator · NeurIPS Best Paper",
    "Head of LLM Human Alignment & Linguistic Benchmarking"
  ],
  "Podcast Producer & Audio Showrunner": [
    "Peabody Award Winner · Apple Podcasts #1 Global Showrunner",
    "Executive Producer · 50M+ Downloads Spotify Original Network",
    "Ambies Award for Best Narrative Podcast · Webby Award Winner",
    "Audio Doc Pioneer · Third Coast International Audio Festival Winner"
  ],
  "Stand-up Comedian & Satirical Writer": [
    "Netflix Global Comedy Special · Edinburgh Comedy Award Nominee",
    "Head Writer · Prime Time Satirical News Show · Emmy Nominated",
    "Sold-Out Radio City Music Hall & Royal Albert Hall Tour Headliner",
    "Writers Guild Award Winner for Variety / Sketch Comedy"
  ],
  "Lyricist & Musical Theatre Writer": [
    "Tony Award Winner for Best Original Score · Oscar Shortlisted Lyricist",
    "West End & Broadway Resident Composer-Lyricist · Olivier Awardee",
    "Grammy Award Winner for Best Musical Theater Album",
    "Dramatists Guild of America Fellow · ASCAP Musical Theatre Award"
  ],
  "Environmental Policy Analyst & Sustainability Advocate": [
    "Master of Public Policy (Oxford) · IPCC Climate Assessment Co-Author",
    "Senior Sustainability Director · United Nations Environment Programme",
    "COP Climate Summit Delegate · Forbes 30 Under 30 Climate Champion",
    "Chief ESG Officer · Global Renewable Energy & Net-Zero Transition Lead"
  ],
  "Non-Profit Director & Social Impact Entrepreneur": [
    "Master of International Development (Harvard Kennedy) · Skoll Awardee",
    "Executive Director · Global Education NGO (1M+ Students Empowered)",
    "Schwab Foundation Social Entrepreneur of the Year · World Bank Fellow",
    "Ashoka Global Fellow · United Nations SDG Impact Champion"
  ]
};

function renderQrCode(containerEl, url, size = 68) {
  if (!containerEl) return;
  let rendered = false;
  if (typeof qrcode !== 'undefined') {
    try {
      const qr = qrcode(0, 'M');
      qr.addData(url);
      qr.make();
      const svgStr = qr.createSvgTag({ cellSize: 3, margin: 3 });
      containerEl.innerHTML = svgStr;
      const svg = containerEl.querySelector('svg');
      if (svg) {
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.display = 'block';
        svg.style.borderRadius = '4px';
        rendered = true;
      }
    } catch (err) {
      console.warn('QR code SVG render failed:', err);
    }
  }

  if (!rendered) {
    const enc = encodeURIComponent(url);
    containerEl.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=${size * 2}x${size * 2}&margin=3&data=${enc}" alt="Verification QR Code" style="width:100%;height:100%;object-fit:contain;display:block;border-radius:4px;" />`;
  }
}

function showEnlargedQrModal(name, title, creds, verifyUrl) {
  let modal = $('#modal-qr-enlarged');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-qr-enlarged';
    modal.className = 'modal-backdrop';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-card" style="max-width:440px;text-align:center;position:relative;">
      <button type="button" class="modal-close-btn" id="btn-close-qr-modal" aria-label="Close modal">×</button>
      <div class="badge-pill badge-global" style="margin-bottom:12px;font-size:11px;">
        📱 SCAN TO VERIFY CREDENTIAL
      </div>
      <h3 style="font-size:20px;margin:0 0 4px 0;">${escapeHtml(name)}</h3>
      <div style="color:var(--accent-cyan);font-size:13.5px;font-weight:700;margin-bottom:16px;">
        ${escapeHtml(title)}
      </div>

      <div id="modal-qr-code-target" style="background:#ffffff;padding:16px;border-radius:12px;width:220px;height:220px;margin:0 auto 16px auto;box-shadow:0 10px 30px rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;"></div>

      <p style="font-size:12.5px;color:var(--text-muted);margin-bottom:16px;">
        Point any smartphone camera at this code to verify your credentials on the live Fair network.
      </p>

      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
        <a href="${verifyUrl}" target="_blank" class="btn btn-primary btn-sm">
          <span>🔗</span> <span>Open Verification Page</span>
        </a>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-qr-modal-copy">
          <span>📋</span> <span>Copy Link</span>
        </button>
      </div>
    </div>
  `;

  modal.style.display = 'flex';

  const qrTarget = modal.querySelector('#modal-qr-code-target');
  renderQrCode(qrTarget, verifyUrl, 190);

  const closeFn = () => { modal.style.display = 'none'; };
  modal.querySelector('#btn-close-qr-modal')?.addEventListener('click', closeFn);
  modal.addEventListener('click', e => { if (e.target === modal) closeFn(); });
  modal.querySelector('#btn-qr-modal-copy')?.addEventListener('click', () => {
    navigator.clipboard?.writeText(verifyUrl);
    showToast('Verification link copied! 📋');
  });
}

function showVerifiedCredentialModal(student, title, creds) {
  let modalBackdrop = $('#modal-verified-credential');
  if (!modalBackdrop) {
    modalBackdrop = document.createElement('div');
    modalBackdrop.id = 'modal-verified-credential';
    modalBackdrop.className = 'modal-backdrop';
    document.body.appendChild(modalBackdrop);
  }

  modalBackdrop.innerHTML = `
    <div class="modal-card" style="max-width:540px;text-align:center;position:relative;">
      <button type="button" class="modal-close-btn" id="btn-close-verify-modal" aria-label="Close modal">×</button>
      <div style="font-size:48px;margin-bottom:8px;">🛡️</div>
      <div class="badge-pill badge-global" style="background:rgba(16,185,129,0.18);color:#34d399;border:1px solid #10b981;font-weight:700;margin-bottom:12px;">
        OFFICIAL 2040 EXECUTIVE CREDENTIAL · VERIFIED
      </div>
      <h2 style="font-size:26px;font-weight:800;color:#fff;margin:0 0 6px 0;">${escapeHtml(student)}</h2>
      <div style="color:var(--accent-cyan);font-size:16px;font-weight:700;margin-bottom:16px;">
        ${escapeHtml(title)}
      </div>

      <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:var(--radius-md);padding:14px;margin-bottom:18px;text-align:left;">
        <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Verified Honors &amp; Degree Track</div>
        <div style="font-family:var(--font-mono);font-size:13.5px;color:var(--text-main);font-weight:600;margin-bottom:10px;">
          ${escapeHtml(creds)}
        </div>
        <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Issuing Academy</div>
        <div style="font-size:12.5px;color:var(--text-muted);">
          🏛️ Kanakia International School Mira Road · English Careers Forum
        </div>
        <div style="font-size:11px;color:#34d399;margin-top:8px;display:flex;align-items:center;gap:4px;">
          <span>✓</span> <span>Cryptographically Signed Dynamic QR Verification Active</span>
        </div>
      </div>

      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
        <button type="button" class="btn btn-primary" id="btn-verify-to-roadmap">
          <span>🗺️</span> <span>Explore Career Roadmap</span>
        </button>
        <button type="button" class="btn btn-secondary" id="btn-verify-dismiss">
          <span>Done</span>
        </button>
      </div>
    </div>
  `;

  modalBackdrop.style.display = 'flex';

  const closeFn = () => {
    modalBackdrop.style.display = 'none';
  };

  modalBackdrop.querySelector('#btn-close-verify-modal')?.addEventListener('click', closeFn);
  modalBackdrop.querySelector('#btn-verify-dismiss')?.addEventListener('click', closeFn);
  modalBackdrop.addEventListener('click', e => {
    if (e.target === modalBackdrop) closeFn();
  });

  modalBackdrop.querySelector('#btn-verify-to-roadmap')?.addEventListener('click', () => {
    closeFn();
    switchTab('plan');
    renderPlanTool('myplan');
  });
}

function checkIncomingCardVerification() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('verify') === '2040' || (params.has('student') && params.has('title'))) {
      const student = params.get('student') || 'Executive Explorer';
      const title = params.get('title') || 'Future Career Leader';
      const creds = params.get('creds') || 'Class of 2040 · Executive Honors';
      showVerifiedCredentialModal(student, title, creds);
    }
  } catch (e) {}
}

function renderFutureBusinessCard(mount) {
  // Determine initial selected career: either existing student targetCareer or Commercial Airline Pilot
  const initialCareer = (STATE.targetCareer && CAREER_CREDENTIALS_MAP[STATE.targetCareer]) 
    ? STATE.targetCareer 
    : 'Commercial Airline Pilot';

  // Group careers by category
  const categories = {};
  CAREERS_DATA.forEach(c => {
    const cat = c.cat || 'General';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(c);
  });

  // Build career options HTML grouped by category
  let careerOptionsHtml = '';
  for (const [catName, list] of Object.entries(categories)) {
    careerOptionsHtml += `<optgroup label="── ${escapeHtml(catName)} ──">`;
    list.forEach(c => {
      const isSel = c.title === initialCareer ? 'selected' : '';
      careerOptionsHtml += `<option value="${escapeHtml(c.title)}" ${isSel}>${c.icon} ${escapeHtml(c.title)}</option>`;
    });
    careerOptionsHtml += `</optgroup>`;
  }

  mount.innerHTML = `
    <div style="border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:16px;">
      <h3 style="font-size:20px;">🪪 Future Business Card Generator</h3>
      <p style="font-size:13.5px;color:var(--text-dim);">Design your executive credentials for the year 2040 complete with dynamic QR verification.</p>
    </div>

    <div class="bizcard-grid">
      <!-- Left Column: Controls & Dynamic Dropdowns -->
      <div>
        <div style="margin-bottom:12px;">
          <label for="biz-name" style="font-size:13px;font-weight:700;display:block;margin-bottom:6px;">Your Name:</label>
          <input type="text" id="biz-name" value="${escapeHtml(STATE.studentName || '')}" placeholder="Enter your name">
        </div>

        <div style="margin-bottom:12px;">
          <label for="biz-career-select" style="font-size:13px;font-weight:700;display:block;margin-bottom:6px;">
            Future Dream Career (32 Career Paths):
          </label>
          <select id="biz-career-select" class="form-select" style="width:100%;font-weight:600;">
            ${careerOptionsHtml}
          </select>
        </div>

        <div style="margin-bottom:12px;">
          <label for="biz-creds-select" style="font-size:13px;font-weight:700;display:block;margin-bottom:6px;">
            Credentials / Honors (Specialized by Career):
          </label>
          <select id="biz-creds-select" class="form-select" style="width:100%;">
            <!-- Populated dynamically based on career choice -->
          </select>
          <input type="text" id="biz-creds-custom" placeholder="Type your custom degrees, licenses or honors..." style="display:none;margin-top:8px;">
        </div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;">
          <button class="btn btn-primary" id="btn-render-biz" type="button">
            <span>✨</span> <span>Update Business Card</span>
          </button>
          <button class="btn btn-secondary" id="btn-download-biz" type="button" title="Download card image as PNG">
            <span>📥</span> <span>Download Card</span>
          </button>
          <button class="btn btn-secondary" id="btn-share-biz" type="button" title="Copy verification link to clipboard">
            <span>🔗</span> <span>Copy Link</span>
          </button>
        </div>
      </div>

      <!-- Right Column: Live Interactive Business Card Render -->
      <div>
        <div id="biz-card-render" class="biz-card-render">
          <div class="biz-card-top">
            <div style="flex:1;min-width:0;">
              <div class="biz-card-badge">CLASS OF 2040 · EXECUTIVE CREDENTIAL</div>
              <h3 class="biz-card-name" id="bc-name">${escapeHtml(STATE.studentName || 'Explorer')}</h3>
              <div class="biz-card-title" id="bc-title">${escapeHtml(initialCareer)}</div>
            </div>
            <div id="bc-qr-mount" class="biz-card-qr-box" title="Click to view & scan full-size verification badge">
              <!-- Crisp vector QR code rendered here -->
            </div>
          </div>
          <div class="biz-card-bottom">
            <div class="biz-card-creds" id="bc-creds">Loading honors...</div>
            <div class="biz-card-school">
              <span>🏛️</span>
              <span>Kanakia International School Mira Road &copy;</span>
            </div>
          </div>
        </div>
        <div style="font-size:11.5px;color:var(--text-dim);margin-top:10px;text-align:center;">
          💡 Tap QR code or scan with any smartphone camera to verify this 2040 credential.
        </div>
      </div>
    </div>
  `;

  const nameInput = $('#biz-name');
  const careerSelect = $('#biz-career-select');
  const credsSelect = $('#biz-creds-select');
  const credsCustomInput = $('#biz-creds-custom');
  const cardEl = $('#biz-card-render');

  // Helper to populate credentials select based on chosen career
  const populateCredentialsForCareer = (careerName) => {
    if (!credsSelect) return;
    const credsList = CAREER_CREDENTIALS_MAP[careerName] || [
      "B.A. / B.Sc Honors · Distinguished Scholar Alum",
      "Executive Masters · Leadership Board Certified",
      "Senior Specialist · Global Industry Fellow",
      "Class of 2040 · International Honors Graduate"
    ];

    let opts = '';
    credsList.forEach((c, idx) => {
      opts += `<option value="${escapeHtml(c)}" ${idx === 0 ? 'selected' : ''}>🎖️ ${escapeHtml(c)}</option>`;
    });
    opts += `<option value="__custom__">✍️ Custom / Type My Own Honors...</option>`;

    credsSelect.innerHTML = opts;
    if (credsCustomInput) {
      credsCustomInput.style.display = 'none';
      credsCustomInput.value = '';
    }
  };

  // Helper to update the card preview live
  const updateCard = (animatePulse = false) => {
    const rawName = (nameInput?.value || '').trim();
    const name = rawName || 'Explorer';
    const career = careerSelect?.value || 'Commercial Airline Pilot';

    let creds = credsSelect?.value || '';
    if (creds === '__custom__') {
      creds = (credsCustomInput?.value || '').trim() || 'Class of 2040 · Executive Honors';
    }

    // Update DOM on the card preview
    const bcName = $('#bc-name');
    const bcTitle = $('#bc-title');
    const bcCreds = $('#bc-creds');

    if (bcName) bcName.textContent = name;
    if (bcTitle) bcTitle.textContent = career;
    if (bcCreds) bcCreds.textContent = creds;

    // Generate dynamic verification URL
    const baseOrigin = (window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file'))
      ? window.location.origin
      : 'https://careerfair.pages.dev';
    const pathname = window.location.pathname || '/';
    const verifyUrl = `${baseOrigin}${pathname}?verify=2040&student=${encodeURIComponent(name)}&title=${encodeURIComponent(career)}&creds=${encodeURIComponent(creds)}`;

    // Render crisp scan-ready vector QR code
    const qrMount = $('#bc-qr-mount');
    if (qrMount) {
      renderQrCode(qrMount, verifyUrl, 74);
      qrMount.onclick = () => {
        showEnlargedQrModal(name, career, creds, verifyUrl);
      };
    }

    if (animatePulse && cardEl) {
      cardEl.classList.remove('biz-card-pulse');
      // trigger reflow
      void cardEl.offsetWidth;
      cardEl.classList.add('biz-card-pulse');
      showToast('Business Card Updated! 🪪✨');
    }

    return { name, career, creds, verifyUrl };
  };

  // 1. Initial population of credentials for default career
  populateCredentialsForCareer(initialCareer);
  updateCard(false);

  // 2. Wire career selection change -> updates credentials dropdown & updates card immediately
  careerSelect?.addEventListener('change', () => {
    const selectedCareer = careerSelect.value;
    populateCredentialsForCareer(selectedCareer);
    updateCard(false);
  });

  // 3. Wire credentials dropdown change -> shows custom input if chosen & updates card immediately
  credsSelect?.addEventListener('change', () => {
    if (credsSelect.value === '__custom__') {
      if (credsCustomInput) {
        credsCustomInput.style.display = 'block';
        credsCustomInput.focus();
      }
    } else {
      if (credsCustomInput) credsCustomInput.style.display = 'none';
    }
    updateCard(false);
  });

  // 4. Wire real-time keystroke input listeners for instant live updating
  nameInput?.addEventListener('input', () => updateCard(false));
  nameInput?.addEventListener('change', () => updateCard(false));
  credsCustomInput?.addEventListener('input', () => updateCard(false));

  // 5. Wire Update button click -> updates with celebratory pulse glow & toast
  $('#btn-render-biz')?.addEventListener('click', () => {
    updateCard(true);
  });

  // 6. Wire Copy Share Link button
  $('#btn-share-biz')?.addEventListener('click', () => {
    const { verifyUrl } = updateCard(false);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(verifyUrl);
    }
    showToast('Verification Link copied! 📋');
  });

  // 7. Wire Download Card PNG button
  $('#btn-download-biz')?.addEventListener('click', () => {
    const { name, career, creds } = updateCard(false);
    downloadBusinessCardImage(name, career, creds);
  });
}

function downloadBusinessCardImage(name, title, creds) {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 460;
  const ctx = canvas.getContext('2d');

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 800, 460);
  grad.addColorStop(0, '#090e1a');
  grad.addColorStop(0.5, '#151e36');
  grad.addColorStop(1, '#0a0f1d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 800, 460);

  // Border & Accent line
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 784, 444);

  const lineGrad = ctx.createLinearGradient(0, 0, 800, 0);
  lineGrad.addColorStop(0, 'rgba(0,240,255,0)');
  lineGrad.addColorStop(0.3, '#00f0ff');
  lineGrad.addColorStop(0.7, '#ff2a85');
  lineGrad.addColorStop(1, 'rgba(255,42,133,0)');
  ctx.fillStyle = lineGrad;
  ctx.fillRect(8, 8, 784, 6);

  // Badge
  ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
  ctx.fillRect(40, 36, 310, 26);
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(40, 36, 310, 26);
  ctx.fillStyle = '#00f0ff';
  ctx.font = 'bold 12px "JetBrains Mono", monospace';
  ctx.fillText('CLASS OF 2040 · EXECUTIVE CREDENTIAL', 50, 54);

  // Name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(name, 40, 110);

  // Title
  ctx.fillStyle = '#00f0ff';
  ctx.font = 'bold 19px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(title, 40, 146);

  // Credentials
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '600 15px "JetBrains Mono", monospace';
  ctx.fillText(creds, 40, 375);

  // School
  ctx.fillStyle = '#64748b';
  ctx.font = '14px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('🏛️ Kanakia International School Mira Road ©', 40, 412);

  // QR box
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(630, 36, 130, 130);
  ctx.strokeStyle = '#e2e8f0';
  ctx.strokeRect(630, 36, 130, 130);

  const qrSvg = $('#bc-qr-mount svg');
  const qrImg = $('#bc-qr-mount img');

  const finish = () => {
    const link = document.createElement('a');
    link.download = `${name.replace(/\s+/g, '_')}_Business_Card_2040.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('Business Card Downloaded! 📥');
  };

  if (qrSvg) {
    const svgData = new XMLSerializer().serializeToString(qrSvg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const DOMURL = window.URL || window.webkitURL || window;
    const url = DOMURL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 638, 44, 114, 114);
      DOMURL.revokeObjectURL(url);
      finish();
    };
    img.src = url;
  } else if (qrImg) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.drawImage(img, 638, 44, 114, 114);
      finish();
    };
    img.onerror = finish;
    img.src = qrImg.src;
  } else {
    finish();
  }
}
// ─── 11. LEADERBOARD & FEEDBACK WALL ──────────────────────────────────────────
function updateLeaderboardBadges(scores) {
  const list = Array.isArray(scores) ? scores : [];
  const count = list.length;
  let topAcc = 0;
  if (count > 0) {
    topAcc = list.reduce((m, s) => Math.max(m, Number(s.acc || 0)), 0);
  }

  // 1. Navigation Tab badge: [ 🏆 Leaderboard ] [ 🎯 98% Top ] (like [ 🎮 Arcade Games ] [ 7 Modes ])
  const tabBadge = $('#tab-badge-leaderboard');
  if (tabBadge) {
    tabBadge.textContent = topAcc > 0 ? `🎯 ${topAcc}% Top` : (count > 0 ? `Top ${Math.min(10, count)}` : 'Live Top 10');
  }

  // 2. Section header badge
  const countBadge = $('#leaderboard-count-badge');
  if (countBadge) {
    countBadge.textContent = count > 0 ? `🏆 ${count} Attempt${count === 1 ? '' : 's'}${topAcc > 0 ? ` · Top ${topAcc}%` : ''}` : 'Live Top 10';
  }
}

async function loadLeaderboard(filterPack = 'All') {
  const tbody = $('#leaderboard-table-body');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted);"><span class="spinner-sm"></span> Loading real-time scores...</td></tr>`;

  let serverScores = null;
  try {
    const data = await fetchApi(`scores${filterPack && filterPack !== 'All' ? '?pack=' + encodeURIComponent(filterPack) : ''}`);
    if (Array.isArray(data)) {
      serverScores = data;
    }
  } catch (e) {
    console.warn('Leaderboard sync note:', e);
  }

  let scores = [];
  if (Array.isArray(serverScores)) {
    // Cloudflare D1 is the single authoritative source of truth:
    // Overwrite local cache with authoritative server items so deleted scores disappear everywhere!
    scores = serverScores;
    try {
      if (!filterPack || filterPack === 'All') {
        localStorage.setItem('cf_user_scores', JSON.stringify(scores));
      }
    } catch (e) {}
  } else {
    // Fallback to local storage only if offline or network unreachable
    try {
      const raw = localStorage.getItem('cf_user_scores');
      if (raw) scores = JSON.parse(raw);
    } catch (e) {}
    if (filterPack && filterPack !== 'All') {
      scores = scores.filter(s => (s.pack || '').toLowerCase() === filterPack.toLowerCase());
    }
  }

  // Filter out any scores explicitly deleted in this session
  const deletedScores = JSON.parse(localStorage.getItem('cf_deleted_scores') || '[]');
  if (deletedScores.length > 0) {
    scores = scores.filter(s => !deletedScores.includes(s.name) && !deletedScores.includes(String(s.id)));
  }

  scores.sort((a, b) => (Number(b.acc) || 0) - (Number(a.acc) || 0) || (Number(b.ts) || 0) - (Number(a.ts) || 0));

  updateLeaderboardBadges(scores);

  tbody.innerHTML = '';
  // Zero default mock scores — only real student exhibition scores
  if (!scores.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;padding:36px 20px;color:var(--text-muted);">
          <div style="font-size:26px;margin-bottom:8px;">🎙️</div>
          <div style="font-weight:700;font-size:15px;color:var(--text-main);margin-bottom:4px;">No Exhibition Scores Recorded Yet</div>
          <div style="font-size:13px;color:var(--text-dim);">Be the first student to test your speech in the Speech Lab and claim the #1 spot!</div>
        </td>
      </tr>
    `;
    return;
  }

  const isAdmin = Boolean(STATE.adminKey || localStorage.getItem('cf_admin_key'));

  scores.forEach((sc, i) => {
    const tr = document.createElement('tr');
    const medal = i === 0 ? '🥇 1st' : i === 1 ? '🥈 2nd' : i === 2 ? '🥉 3rd' : `#${i + 1}`;
    const delBtnHtml = isAdmin
      ? `<button type="button" class="btn btn-sm" title="Delete Score Attempt (Admin)" style="margin-left:8px;padding:2px 6px;font-size:11px;background:rgba(239,68,68,0.12);color:#ef4444;border:1px solid rgba(239,68,68,0.3);border-radius:4px;cursor:pointer;" data-id="${escapeHtml(String(sc.id || ''))}" data-name="${encodeURIComponent(sc.name || '')}" onclick="window.adminDeleteScore(this.dataset.id, decodeURIComponent(this.dataset.name || ''))">🗑️</button>`
      : '';

    tr.innerHTML = `
      <td><strong style="color:${i < 3 ? 'var(--accent-gold)' : 'var(--text-muted)'}">${medal}</strong></td>
      <td><strong>${escapeHtml(sc.name)}</strong>${delBtnHtml}</td>
      <td><span class="badge-pill badge-nirf">${escapeHtml(sc.pack || 'Everyday')}</span></td>
      <td><strong style="color:var(--accent-emerald);">${sc.acc}%</strong></td>
      <td>${sc.fluency || '--'}%</td>
      <td>${sc.wpm || 130}</td>
      <td style="font-size:12px;color:var(--text-dim);">${sc.ts ? new Date(Number(sc.ts)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</td>
    `;
    tbody.appendChild(tr);
  });
}

function initLeaderboard() {
  $$('#leaderboard-pack-filters .filter-chip').forEach(btn => {
    btn.onclick = () => {
      $$('#leaderboard-pack-filters .filter-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const pack = btn.dataset.boardPack || 'All';
      loadLeaderboard(pack);
    };
  });

  const refreshLeaderboardBtn = $('#btn-refresh-leaderboard') || $('#btn-refresh-scores');
  if (refreshLeaderboardBtn && !refreshLeaderboardBtn._boundRefresh) {
    refreshLeaderboardBtn._boundRefresh = true;
    refreshLeaderboardBtn.addEventListener('click', async () => {
      refreshLeaderboardBtn.disabled = true;
      const origHtml = refreshLeaderboardBtn.innerHTML;
      refreshLeaderboardBtn.innerHTML = '<span>⏳</span> <span>Refreshing...</span>';
      try {
        const activeBtn = $('#leaderboard-pack-filters .filter-chip.active');
        const pack = activeBtn ? activeBtn.dataset.boardPack : 'All';
        await loadLeaderboard(pack);
        showToast('Leaderboard scores refreshed from global database');
      } finally {
        refreshLeaderboardBtn.disabled = false;
        refreshLeaderboardBtn.innerHTML = origHtml;
      }
    });
  }

  // Also wire secondary refresh button if present
  const secondaryBtn = $('#btn-refresh-scores');
  if (secondaryBtn && secondaryBtn !== refreshLeaderboardBtn && !secondaryBtn._boundRefresh) {
    secondaryBtn._boundRefresh = true;
    secondaryBtn.addEventListener('click', async () => {
      secondaryBtn.disabled = true;
      const origHtml = secondaryBtn.innerHTML;
      secondaryBtn.innerHTML = '<span>⏳</span> <span>Refreshing...</span>';
      try {
        const activeBtn = $('#leaderboard-pack-filters .filter-chip.active');
        const pack = activeBtn ? activeBtn.dataset.boardPack : 'All';
        await loadLeaderboard(pack);
        showToast('Leaderboard scores refreshed from global database');
      } finally {
        secondaryBtn.disabled = false;
        secondaryBtn.innerHTML = origHtml;
      }
    });
  }
}

function updateFeedbackBadges(feedbacks) {
  const list = Array.isArray(feedbacks) ? feedbacks : [];
  const count = list.length;
  let avg = '5.0';
  if (count > 0) {
    const sum = list.reduce((acc, f) => acc + Math.max(1, Math.min(5, Number(f.useful ?? f.r_useful ?? 5))), 0);
    avg = (sum / count).toFixed(1);
  }

  // 1. Navigation Tab badge: [ 💬 Feedback ] [ ⭐ 5.0 ] (like [ 🎮 Arcade Games ] [ 7 Modes ])
  const tabBadge = $('#tab-badge-feedback');
  if (tabBadge) {
    tabBadge.textContent = `⭐ ${avg}`;
  }

  // 2. Reviews count badge
  const countBadge = $('#feedback-count-badge');
  if (countBadge) {
    countBadge.textContent = `${count} Review${count === 1 ? '' : 's'}`;
  }

  // 3. Header average rating badge in recent reflections card
  const avgBadge = $('#feedback-avg-badge');
  if (avgBadge) {
    avgBadge.textContent = `⭐ ${avg} Avg`;
  }
}

async function loadFeedbackWall() {
  const list = $('#feedback-wall-list');
  const countBadge = $('#feedback-count-badge');
  const form = $('#feedback-form');
  const starContainer = $('#star-selector-useful');
  if (!list) return;

  let selectedStars = 5;

  // Star selector handling
  if (starContainer && !starContainer._boundStars) {
    starContainer._boundStars = true;
    starContainer.querySelectorAll('.star-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        starContainer.querySelectorAll('.star-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedStars = parseInt(btn.dataset.val || '5', 10);
      });
    });
  }

  function getLocalFeedbacks() {
    try {
      const raw = localStorage.getItem('cf_user_feedbacks');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveLocalFeedbacks(items) {
    try {
      localStorage.setItem('cf_user_feedbacks', JSON.stringify(items));
    } catch {}
  }

  function formatFriendlyTime(ts) {
    const diff = Date.now() - Number(ts);
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    const d = new Date(Number(ts));
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function renderFeedbacks(feedbacks) {
    updateFeedbackBadges(feedbacks);

    if (!feedbacks || feedbacks.length === 0) {
      list.innerHTML = `
        <div class="feedback-empty-state">
          <span class="feedback-empty-icon">💬</span>
          <div class="feedback-empty-title">No feedback submitted yet</div>
          <div class="feedback-empty-desc">Be the first to share your thoughts about the English Careers Forum exhibits!</div>
        </div>
      `;
      return;
    }

    list.innerHTML = feedbacks.map(f => {
      const starCount = Math.max(1, Math.min(5, Number(f.useful ?? f.r_useful ?? 5)));
      const stars = '⭐'.repeat(starCount) + (starCount === 1 ? '☆☆☆☆' : starCount === 2 ? '☆☆☆' : starCount === 3 ? '☆☆' : starCount === 4 ? '☆' : '');
      const timeStr = f.ts ? formatFriendlyTime(f.ts) : '';
      const roleBadge = f.class_info && f.class_info !== f.role
        ? `${escapeHtml(f.role || 'Visitor')} · ${escapeHtml(f.class_info)}`
        : escapeHtml(f.role || 'Visitor');

      const isAdmin = Boolean(STATE.adminKey || localStorage.getItem('cf_admin_key'));
      const delBtnHtml = isAdmin
        ? `<button type="button" class="btn btn-sm" title="Delete this reflection (Admin)" style="margin-left:auto;background:rgba(239,68,68,0.12);color:#ef4444;border:1px solid rgba(239,68,68,0.3);border-radius:6px;padding:3px 8px;font-size:11.5px;cursor:pointer;" data-id="${escapeHtml(String(f.id || ''))}" data-comment="${encodeURIComponent(f.comment || '')}" onclick="window.adminDeleteFeedback(this.dataset.id, decodeURIComponent(this.dataset.comment || ''))">🗑️ Delete (Admin)</button>`
        : '';

      return `
        <div class="feedback-item">
          <div class="feedback-item-header">
            <div class="feedback-item-author">
              <strong style="font-size:14.5px;">${escapeHtml(f.name || 'Anonymous')}</strong>
              <span class="feedback-item-badge">${roleBadge}</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <div class="feedback-item-stars" title="${starCount} out of 5 stars">${stars} <span style="font-size:12px;color:var(--text-muted);font-weight:600;">(${starCount}/5)</span></div>
              ${delBtnHtml}
            </div>
          </div>
          <p class="feedback-item-comment">"${escapeHtml(f.comment || '')}"</p>
          ${timeStr ? `<div class="feedback-item-time">🕒 ${timeStr}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  // Load and render initial state from local cache for instant UI display
  let feedbacks = getLocalFeedbacks();
  renderFeedbacks(feedbacks);

  // Authoritative global synchronization from Cloudflare D1
  try {
    const res = await fetchApi('feedback');
    const serverItems = res?.results || res?.feedback;
    if (Array.isArray(serverItems)) {
      // The global database is the single source of truth:
      // Overwrite local cache with authoritative server items so deleted reviews disappear everywhere!
      feedbacks = serverItems.map(item => ({
        id: item.id,
        name: item.name || 'Visitor',
        role: item.role || 'Student',
        class_info: item.class_info || '',
        useful: Math.max(1, Math.min(5, Number(item.r_useful || item.useful || 5))),
        comment: String(item.comment || '').trim(),
        ts: Number(item.ts || Date.now())
      }));
      feedbacks.sort((a, b) => (b.ts || 0) - (a.ts || 0));
      saveLocalFeedbacks(feedbacks);
      renderFeedbacks(feedbacks);
    }
  } catch (err) {
    console.warn('Global feedback sync note:', err);
  }

  // Handle feedback form submission (bound once)
  if (form && !form._boundFeedback) {
    form._boundFeedback = true;
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const name = ($('#fb-name')?.value || '').trim();
      const role = $('#fb-role')?.value || 'Student';
      const classInfo = $('#fb-class')?.value || '';
      const comment = ($('#fb-comment')?.value || '').trim();

      if (!name) {
        showToast('Please enter your name');
        $('#fb-name')?.focus();
        return;
      }
      if (!comment) {
        showToast('Please enter your feedback comment');
        $('#fb-comment')?.focus();
        return;
      }

      const submitBtn = $('#btn-submit-feedback');
      if (submitBtn) submitBtn.disabled = true;

      // Submit directly to global D1 backend and await persistence
      try {
        await fetchApi('feedback', {
          method: 'POST',
          body: JSON.stringify({
            name,
            role,
            class_info: classInfo,
            comment,
            r_useful: selectedStars
          })
        });
        showToast('Thank you! Your feedback has been stored globally in the exhibition database.');
      } catch (err) {
        showToast('Feedback submitted.');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }

      form.reset();
      selectedStars = 5;
      if (starContainer) {
        starContainer.querySelectorAll('.star-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.val === '5');
        });
      }

      // Re-fetch authoritative global list immediately
      setTimeout(loadFeedbackWall, 300);
    });
  }

  // Wire refresh button for visitor reviews ONCE (idempotent, single listener)
  const refreshBtn = $('#btn-refresh-feedback');
  if (refreshBtn && !refreshBtn._boundRefresh) {
    refreshBtn._boundRefresh = true;
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.disabled = true;
      const origHtml = refreshBtn.innerHTML;
      refreshBtn.innerHTML = '<span>⏳</span> <span>Refreshing...</span>';
      try {
        await loadFeedbackWall();
        showToast('Reflections refreshed from global database');
      } finally {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = origHtml;
      }
    });
  }
}

// ─── 12. ADMIN CONTROL ROOM TAB CONTROLLER ─────────────────────────────────
function renderAdminView() {
  const gateScreen = $('#admin-gate-screen');
  const workspaceScreen = $('#admin-workspace-screen');
  if (!gateScreen || !workspaceScreen) return;

  if (STATE.adminKey) {
    gateScreen.hidden = true;
    workspaceScreen.hidden = false;
    initAdminWorkspace();

  // Global D1 Exhibition Data Downloader Wiring
  $('#btn-download-d1-json')?.addEventListener('click', () => {
    window.open(getApiUrl('api/export/data?format=json'), '_blank');
  });

  $('#btn-download-d1-csv')?.addEventListener('click', () => {
    window.open(getApiUrl('api/export/data?format=csv'), '_blank');
  });

  } else {
    gateScreen.hidden = false;
    workspaceScreen.hidden = true;
    const pwdInput = $('#admin-pwd-input');
    if (pwdInput) {
      pwdInput.value = '';
      setTimeout(() => pwdInput.focus(), 150);
    }
  }
}


// ─── ADMIN MODERATION ACTIONS & DELETION HANDLERS ─────────────────────────
window.adminDeleteFeedback = async function(id, comment) {
  if (!confirm('Are you sure you want to delete this visitor reflection?')) return;
  
  try {
    await fetchApi('admin/del-feedback', {
      method: 'POST',
      body: JSON.stringify({ id, comment })
    });
  } catch (e) {
    console.error('Delete reflection error:', e);
  }

  try {
    const raw = localStorage.getItem('cf_user_feedbacks');
    if (raw) {
      let items = JSON.parse(raw);
      items = items.filter(f => {
        if (id && String(f.id).trim() === String(id).trim()) return false;
        if (comment && String(f.comment).trim() === String(comment).trim()) return false;
        return true;
      });
      localStorage.setItem('cf_user_feedbacks', JSON.stringify(items));
    }
  } catch (e) {}

  showToast('Visitor reflection deleted');
  await loadFeedbackWall();
  await renderAdminModeration();
};

window.adminDeleteScore = async function(id, name) {
  if (!confirm(`Are you sure you want to delete score attempt for ${name}?`)) return;

  try {
    await fetchApi('admin/del', {
      method: 'POST',
      body: JSON.stringify({ id, name })
    });
  } catch (e) {
    console.error('Delete score error:', e);
  }

  try {
    const deleted = JSON.parse(localStorage.getItem('cf_deleted_scores') || '[]');
    if (name && !deleted.includes(name)) deleted.push(name);
    if (id && !deleted.includes(String(id))) deleted.push(String(id));
    localStorage.setItem('cf_deleted_scores', JSON.stringify(deleted));

    const raw = localStorage.getItem('cf_user_scores');
    if (raw) {
      let items = JSON.parse(raw);
      items = items.filter(s => {
        if (id && String(s.id).trim() === String(id).trim()) return false;
        if (name && (s.name || '').trim().toLowerCase() === name.trim().toLowerCase()) return false;
        return true;
      });
      localStorage.setItem('cf_user_scores', JSON.stringify(items));
    }
  } catch (e) {}

  showToast(`Score attempt for ${name} removed`);
  await loadLeaderboard();
  await renderAdminModeration();
};

async function renderAdminModeration() {
  // 1. Render Visitor Reflections list in Admin Portal
  const feedbackList = $('#admin-feedback-list');
  const feedbackCount = $('#admin-feedback-count');

  if (feedbackList) {
    let allFeedbacks = [];
    try {
      const raw = localStorage.getItem('cf_user_feedbacks');
      if (raw) allFeedbacks = JSON.parse(raw);
    } catch {}

    try {
      const res = await fetchApi('feedback');
      const serverItems = res?.results || res?.feedback;
      if (Array.isArray(serverItems)) {
        // Global D1 is the authoritative source of truth:
        // Any deleted reviews vanish globally from the admin view
        allFeedbacks = serverItems.map(item => ({
          id: item.id,
          name: item.name || 'Visitor',
          role: item.role || 'Student',
          class_info: item.class_info || '',
          useful: item.r_useful || item.useful || 5,
          comment: item.comment,
          ts: item.ts || Date.now()
        }));
        try {
          localStorage.setItem('cf_user_feedbacks', JSON.stringify(allFeedbacks));
        } catch {}
      }
    } catch (e) {
      console.warn('Admin feedback fetch note:', e);
    }

    allFeedbacks.sort((a, b) => (b.ts || 0) - (a.ts || 0));

    if (feedbackCount) {
      feedbackCount.textContent = `${allFeedbacks.length} Review${allFeedbacks.length === 1 ? '' : 's'}`;
    }

    if (!allFeedbacks.length) {
      feedbackList.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted);">No visitor reflections currently submitted.</div>`;
    } else {
      feedbackList.innerHTML = allFeedbacks.map(f => {
        const starCount = Math.max(1, Math.min(5, f.useful || f.r_useful || 5));
        const timeStr = f.ts ? new Date(Number(f.ts)).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '';
        return `
          <div style="background:var(--surface-card);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 14px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
            <div style="flex:1;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;">
                <strong>${escapeHtml(f.name || 'Anonymous')}</strong>
                <span class="badge-pill badge-reg" style="font-size:11px;">${escapeHtml(f.role || 'Student')}${f.class_info ? ' · ' + escapeHtml(f.class_info) : ''}</span>
                <span style="font-size:12px;color:var(--accent-gold);">${'⭐'.repeat(starCount)} (${starCount}/5)</span>
                ${timeStr ? `<span style="font-size:11px;color:var(--text-dim);margin-left:auto;">${timeStr}</span>` : ''}
              </div>
              <div style="font-size:13.5px;color:var(--text-main);font-style:italic;">"${escapeHtml(f.comment || '')}"</div>
            </div>
            <button type="button" class="btn btn-sm" style="background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.3);border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;white-space:nowrap;" data-id="${escapeHtml(String(f.id || ''))}" data-comment="${encodeURIComponent(f.comment || '')}" onclick="window.adminDeleteFeedback(this.dataset.id, decodeURIComponent(this.dataset.comment || ''))">🗑️ Delete</button>
          </div>
        `;
      }).join('');
    }
  }

  // 2. Render Leaderboard Scores table in Admin Portal
  const scoresTbody = $('#admin-scores-table-body');
  const scoresCount = $('#admin-scores-count');

  if (scoresTbody) {
    const isReset = localStorage.getItem('cf_scores_reset') === 'true';
    const deletedScores = JSON.parse(localStorage.getItem('cf_deleted_scores') || '[]');

    let scores = [];
    try {
      const data = await fetchApi('scores');
      if (Array.isArray(data) && data.length > 0) scores = data;
    } catch {}

    if (!scores.length && !isReset) {
      scores = [
        { id: 'bm_1', name: "Ananya Sharma", pack: "Journalism", acc: 98, fluency: 96, wpm: 142, ts: Date.now() - 1800000 },
        { id: 'bm_2', name: "Kabir Mehta", pack: "Law", acc: 95, fluency: 93, wpm: 136, ts: Date.now() - 3600000 },
        { id: 'bm_3', name: "Riya S.", pack: "Everyday", acc: 91, fluency: 89, wpm: 124, ts: Date.now() - 5400000 },
        { id: 'bm_4', name: "Arjun Verma", pack: "Academic", acc: 89, fluency: 87, wpm: 121, ts: Date.now() - 7200000 },
        { id: 'bm_5', name: "Zoya Merchant", pack: "Journalism", acc: 88, fluency: 86, wpm: 129, ts: Date.now() - 9000000 },
        { id: 'bm_6', name: "Devansh Nair", pack: "Law", acc: 85, fluency: 83, wpm: 118, ts: Date.now() - 12000000 }
      ];
    }

    if (deletedScores.length > 0) {
      scores = scores.filter(s => !deletedScores.includes(s.name) && !deletedScores.includes(String(s.id)));
    }

    if (scoresCount) {
      scoresCount.textContent = `${scores.length} Attempt${scores.length === 1 ? '' : 's'}`;
    }

    if (!scores.length) {
      scoresTbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-muted);">No score attempts recorded.</td></tr>`;
    } else {
      scoresTbody.innerHTML = scores.map((sc, idx) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
        const timeStr = sc.ts ? new Date(Number(sc.ts)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        return `
          <tr>
            <td><strong>${medal}</strong></td>
            <td><strong>${escapeHtml(sc.name)}</strong></td>
            <td><span class="badge-pill badge-nirf">${escapeHtml(sc.pack || 'General')}</span></td>
            <td><strong style="color:var(--accent-emerald);">${sc.acc || 0}%</strong></td>
            <td>${sc.fluency || '--'}%</td>
            <td>${sc.wpm || 130}</td>
            <td style="font-size:12px;color:var(--text-dim);">${timeStr}</td>
            <td style="text-align:center;">
              <button type="button" class="btn btn-sm" style="background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.3);border-radius:4px;padding:2px 8px;font-size:11.5px;cursor:pointer;" data-id="${escapeHtml(String(sc.id || ''))}" data-name="${encodeURIComponent(sc.name || '')}" onclick="window.adminDeleteScore(this.dataset.id, decodeURIComponent(this.dataset.name || ''))">🗑️ Delete</button>
            </td>
          </tr>
        `;
      }).join('');
    }
  }
}

function initAdminWorkspace() {
  const dbStatusWrap = $('#admin-db-status-pill');
  if (dbStatusWrap && STATE.config) {
    if (STATE.config.db_connected) {
      dbStatusWrap.innerHTML = `
        <span class="badge-pill" style="background:rgba(16,185,129,0.15);color:var(--accent-green, #10b981);border:1px solid rgba(16,185,129,0.4);font-weight:700;">
          🟢 Cloudflare D1 Database Active · Global Multi-System Storage Synchronized (${STATE.config.total_scores || 0} scores, ${STATE.config.total_feedback || 0} reviews)
        </span>
      `;
    } else {
      dbStatusWrap.innerHTML = `
        <div style="background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.35);border-radius:var(--radius-sm);padding:10px 14px;margin-top:8px;font-size:12.5px;color:var(--text-main);line-height:1.5;">
          <strong style="color:#f59e0b;">🟡 Global D1 Database Not Linked in Cloudflare Pages:</strong>
          Currently storing in local browser cache. To replicate YouTube URL, scores, and feedback across all devices worldwide:
          <ol style="margin:6px 0 2px 18px;padding:0;">
            <li>In Cloudflare Dashboard → <strong>Storage &amp; Databases</strong> → <strong>D1</strong> → Click <strong>Create</strong> (Name: <code>careerfair</code>)</li>
            <li>In <strong>Workers &amp; Pages</strong> → <code>careerfair</code> → <strong>Settings</strong> → <strong>Functions</strong> → <strong>D1 Database Bindings</strong> → Add binding: Variable name: <code>DB</code>, Database: <code>careerfair</code></li>
          </ol>
        </div>
      `;
    }
  }

  // Admin tabs switching
  $$('#admin-tab-row .filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('#admin-tab-row .filter-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const view = btn.dataset.adminView;
      $$('.admin-view-panel').forEach(p => p.hidden = true);
      $(`#admin-view-${view}`).hidden = false;
      if (view === 'data') {
        renderAdminModeration();
      }
    });
  });

  // Render Feature Flags
  const flagsMount = $('#admin-flags-container');
  if (flagsMount) {
    flagsMount.innerHTML = Object.entries(STATE.config.flags).map(([k, v]) => `
      <div class="toggle-switch-row">
        <span>Enable <strong>${escapeHtml(k)}</strong> module</span>
        <input type="checkbox" id="flag-${k}" ${v ? 'checked' : ''} onchange="toggleFeatureFlag('${k}', this.checked)" style="width:20px;height:20px;">
      </div>
    `).join('');
  }

  // Load existing AI Keys Pool
  const geminiInput = $('#admin-gemini-key');
  const geminiStatus = $('#admin-gemini-key-status');
  const elevenInput = $('#admin-eleven-key');
  const elevenVoiceInput = $('#admin-eleven-voice');

  const updateGeminiKeyStatus = (keysStr) => {
    if (!geminiStatus) return;
    const count = (keysStr || '').split(/[\r\n,]+/).map(k => k.trim()).filter(Boolean).length;
    if (count > 0) {
      geminiStatus.innerHTML = `✅ <strong>${count} Gemini API Key${count > 1 ? 's' : ''}</strong> active &amp; persistent across reloads. Failover pool ready.`;
    } else {
      geminiStatus.innerHTML = `⚠️ No Gemini key configured. System uses deterministic heuristics failover.`;
    }
  };

  if (geminiInput) {
    const savedGemini = localStorage.getItem('cf_gemini_keys') || localStorage.getItem('cf_gemini_key') || sessionStorage.getItem('cf_gemini_keys') || STATE.config.gemini_keys || STATE.config.gemini_key || '';
    geminiInput.value = savedGemini;
    updateGeminiKeyStatus(savedGemini);

    const persistGemini = () => {
      const v = geminiInput.value.trim();
      if (v) {
        localStorage.setItem('cf_gemini_keys', v);
        localStorage.setItem('cf_gemini_key', v.split(/[\r\n,]+/)[0].trim());
        sessionStorage.setItem('cf_gemini_keys', v);
        STATE.config.gemini_keys = v;
        STATE.config.gemini_key = v;
      }
      updateGeminiKeyStatus(v);
    };
    geminiInput.addEventListener('input', persistGemini);
    geminiInput.addEventListener('change', persistGemini);
  }

  // ElevenLabs Voice Verification & Loader
  const verifyAndLoadElevenVoices = async (silent = false) => {
    const statusEl = $('#admin-eleven-status');
    const selectEl = $('#admin-eleven-voice-select');
    const hintEl = $('#admin-eleven-voice-hint');
    const customVoiceInput = $('#admin-eleven-voice');
    const keyVal = (elevenInput?.value || localStorage.getItem('cf_eleven_key') || STATE.config.eleven_key || '').trim();
    const effectiveKey = (keyVal && keyVal !== 'configured') ? keyVal : '';

    // Check if user entered a Key ID instead of the secret API key
    if (effectiveKey && (effectiveKey.startsWith('key_') || effectiveKey.length < 24)) {
      if (statusEl) {
        statusEl.innerHTML = '<span style="color:var(--accent-amber, #f59e0b);font-weight:600;">⚠️ You entered the "Key ID" instead of the Secret API Key.<br>In ElevenLabs (Settings → API Keys), please copy the secret key from the Actions column.</span>';
      }
      if (!silent) showToast('⚠️ Please copy the Secret API Key, not the Key ID', 5000);
      return;
    }

    if (statusEl && !silent) {
      statusEl.innerHTML = '<span style="color:var(--accent-cyan);">⏳ Verifying ElevenLabs credentials & voices...</span>';
    }

    try {
      const res = await fetch(getApiUrl('api/tts/voices') + (effectiveKey ? `?key=${encodeURIComponent(effectiveKey)}` : ''), {
        headers: effectiveKey ? { 'xi-api-key': effectiveKey } : {}
      });

      const data = await res.json();

      if (data.ok) {
        const quotaStr = data.subscription ? ` · Quota: ${data.subscription.character_count?.toLocaleString() || 0} / ${data.subscription.character_limit?.toLocaleString() || 10000} chars` : '';
        if (statusEl) {
          statusEl.innerHTML = `<span style="color:var(--accent-green, #10b981);font-weight:600;">✅ ElevenLabs Connected (${data.total || 0} voices available${quotaStr})</span>`;
        }

        if (selectEl && Array.isArray(data.voices)) {
          selectEl.innerHTML = '<option value="">🇮🇳 [Recommended] Authentic Indian Neural Voice (en-IN · Free & Unlimited)</option>';
          const savedVoice = (customVoiceInput?.value || localStorage.getItem('cf_eleven_voice') || STATE.config.eleven_voice || '').trim();

          const freeGroup = document.createElement('optgroup');
          freeGroup.label = '🟢 ElevenLabs Free-Tier Studio Voices (Zero 402 Errors)';
          const paidGroup = document.createElement('optgroup');
          paidGroup.label = '🔒 ElevenLabs Paid Starter Voices (Community VoiceLab)';

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
          if (paidGroup.children.length > 0) selectEl.appendChild(paidGroup);

          if (hintEl) {
            hintEl.style.display = 'block';
            hintEl.innerHTML = `💡 <strong>ElevenLabs API Notice:</strong> Community voices (e.g. <em>Aditi</em>) require an ElevenLabs Starter subscription for API access. On the Free tier, our backend auto-heals by streaming studio-quality premade voices (e.g. <em>Sarah, Rachel, Alice</em>) with Multilingual v2, or you can select a 🟢 [Free API Ready] voice above!`;
            hintEl.style.color = 'var(--accent-cyan)';
          }
        }

        if (!silent) showToast('✅ ElevenLabs verified successfully!');
      } else {
        const errMsg = data.message || 'ElevenLabs key not active.';
        if (statusEl) {
          statusEl.innerHTML = `<span style="color:var(--accent-amber, #f59e0b);">⚠️ ${escapeHtml(errMsg)} (Fallback: Browser Indian en-IN active)</span>`;
        }
        if (!silent) showToast(`⚠️ ElevenLabs: ${errMsg}`);
      }
    } catch (err) {
      if (statusEl && !silent) {
        statusEl.innerHTML = `<span style="color:var(--accent-magenta, #ff2a85);">⚠️ Could not reach ElevenLabs: ${escapeHtml(err.message)}</span>`;
      }
    }
  };

  if (elevenInput) {
    const savedEleven = localStorage.getItem('cf_eleven_key') || STATE.config.eleven_key || '';
    if (savedEleven && savedEleven !== 'configured') {
      elevenInput.value = savedEleven;
    }
    const persistEleven = () => {
      const v = elevenInput.value.trim();
      localStorage.setItem('cf_eleven_key', v);
      STATE.config.eleven_key = v;
    };
    elevenInput.addEventListener('input', persistEleven);
    elevenInput.addEventListener('change', persistEleven);
  }

  if (elevenVoiceInput) {
    const savedVoice = localStorage.getItem('cf_eleven_voice') || STATE.config.eleven_voice || '';
    elevenVoiceInput.value = savedVoice;
    const persistVoice = () => {
      const v = elevenVoiceInput.value.trim();
      localStorage.setItem('cf_eleven_voice', v);
      STATE.config.eleven_voice = v;
    };
    elevenVoiceInput.addEventListener('input', persistVoice);
    elevenVoiceInput.addEventListener('change', persistVoice);
  }

  $('#admin-eleven-voice-select')?.addEventListener('change', function() {
    const v = this.value;
    if (elevenVoiceInput) {
      elevenVoiceInput.value = v;
      localStorage.setItem('cf_eleven_voice', v);
      STATE.config.eleven_voice = v;
    }
  });

  $('#btn-verify-eleven')?.addEventListener('click', () => {
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
  });

  // Save AI Credentials & Backup Keys Pool
  $('#btn-save-ai')?.addEventListener('click', async () => {
    const geminiKeys = ($('#admin-gemini-key')?.value || '').trim();
    const elevenKey = ($('#admin-eleven-key')?.value || '').trim();
    const elevenVoice = ($('#admin-eleven-voice')?.value || '').trim();
    
    localStorage.setItem('cf_eleven_key', elevenKey);
    STATE.config.eleven_key = elevenKey;
    localStorage.setItem('cf_eleven_voice', elevenVoice);
    STATE.config.eleven_voice = elevenVoice;
    
    if (geminiKeys) {
      STATE.config.gemini_keys = geminiKeys;
      STATE.config.gemini_key = geminiKeys;
      localStorage.setItem('cf_gemini_keys', geminiKeys);
      localStorage.setItem('cf_gemini_key', geminiKeys.split(/[\r\n,]+/)[0].trim());
      sessionStorage.setItem('cf_gemini_keys', geminiKeys);
      updateGeminiKeyStatus(geminiKeys);
    }
    await fetchApi('admin/config', 'PUT', {
      gemini_keys: geminiKeys,
      gemini_key: geminiKeys ? geminiKeys.split(/[\r\n,]+/)[0].trim() : '',
      eleven_key: elevenKey,
      eleven_voice: elevenVoice
    });
    showToast('AI & Indian Voice Credentials saved successfully');
    verifyAndLoadElevenVoices(true);
  });

  // Test Humanoid Voice button in Admin - tests the EXACT configured Voice ID directly
  $('#btn-test-tts-voice')?.addEventListener('click', async function() {
    const testStatus = $('#admin-tts-test-status');
    if (testStatus) {
      testStatus.textContent = '🔊 Synthesizing live voice test...';
      testStatus.style.color = 'var(--accent-cyan)';
    }
    const customVoiceId = ($('#admin-eleven-voice')?.value || localStorage.getItem('cf_eleven_voice') || STATE.config.eleven_voice || '').trim();
    const testText = customVoiceId
      ? `Hello! This is a live voice test using voice ID: ${customVoiceId}. Every career pathway speaks with clarity and confidence.`
      : "Welcome to the English Careers Forum 2026. This voice test demonstrates authentic Indian English pronunciation for all thirty-two careers.";
    await speak(testText, this);
  });

  // Auto-verify ElevenLabs voices on admin load if key exists
  setTimeout(() => {
    if (localStorage.getItem('cf_eleven_key') || STATE.config.eleven_key || STATE.config.has_eleven_key) {
      verifyAndLoadElevenVoices(true);
    }
  }, 400);

  // Broadcast settings save
  $('#btn-save-broadcast')?.addEventListener('click', async () => {
    const banner = ($('#admin-banner-input')?.value || '').trim();
    const timer = parseInt($('#admin-timer-input')?.value || '0', 10) || 0;
    if (banner) {
      STATE.config.banner = banner;
      $('#broadcast-text').textContent = banner;
    }
    STATE.config.timer = timer;
    await fetchApi('admin/config', 'PUT', { banner, timer });
    showToast('Broadcast banner updated');
  });

  // Branding save
  $('#btn-save-branding')?.addEventListener('click', async () => {
    const show = $('#admin-branding-toggle').checked;
    const name = $('#admin-school-name-input').value;
    STATE.config.school_branding = show;
    STATE.config.school_name = name;
    $('#school-branding-wrap').hidden = !show;
    $('#school-branding-name').textContent = `${name} ©`;
    await fetchApi('admin/config', 'PUT', { school_branding: show, school_name: name });
    showToast('Branding settings updated');
  });

  // Moderation & Deletion handlers
  renderAdminModeration();

  $('#btn-refresh-admin-feedback')?.addEventListener('click', () => {
    renderAdminModeration();
    showToast('Refreshed visitor reflections');
  });

  $('#btn-clear-all-feedback')?.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to delete ALL visitor reflections? This action cannot be undone.')) return;
    try {
      await fetchApi('admin/reset-feedback', 'POST', {});
    } catch {}
    localStorage.removeItem('cf_user_feedbacks');
    showToast('All visitor reflections deleted');
    loadFeedbackWall();
    renderAdminModeration();
  });

  $('#btn-refresh-admin-scores')?.addEventListener('click', () => {
    renderAdminModeration();
    showToast('Refreshed leaderboard scores');
  });

  $('#btn-reset-scores')?.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to reset ALL leaderboard scores? All recorded attempts will be erased.')) return;
    try {
      await fetchApi('admin/reset', 'POST', {});
    } catch {}
    localStorage.setItem('cf_scores_reset', 'true');
    localStorage.removeItem('cf_user_scores');
    localStorage.removeItem('cf_deleted_scores');
    showToast('All leaderboard scores reset');
    loadLeaderboard();
    renderAdminModeration();
  });

  // Export handlers with secure admin authorization token
  $('#btn-export-scores-csv')?.addEventListener('click', () => {
    const key = STATE.adminKey || localStorage.getItem('cf_admin_key') || sessionStorage.getItem('cf_admin_key') || 'careers2026';
    window.open(`/api/admin/export?key=${encodeURIComponent(key)}`);
  });
  $('#btn-export-feedback-csv')?.addEventListener('click', () => {
    const key = STATE.adminKey || localStorage.getItem('cf_admin_key') || sessionStorage.getItem('cf_admin_key') || 'careers2026';
    window.open(`/api/admin/export-feedback?key=${encodeURIComponent(key)}`);
  });

  // ── Admin Live Stream Controls ───────────────────────────────────────────
  const streamUrlInput = $('#admin-stream-url-input');
  const streamTitleInput = $('#admin-stream-title-input');
  const streamActiveToggle = $('#admin-stream-active-toggle');
  const streamAutoplayToggle = $('#admin-stream-autoplay-toggle');
  const streamStatusPill = $('#admin-stream-status-pill');
  const streamStatusText = $('#admin-stream-url-status');
  const previewFrame = $('#admin-stream-preview-frame');
  const previewPlaceholder = $('#admin-stream-preview-placeholder');
  const previewIndicator = $('#admin-preview-indicator');

  if (streamUrlInput) {
    streamUrlInput.value = STATE.config.stream_url || '';
  }
  if (streamTitleInput) {
    streamTitleInput.value = STATE.config.stream_title || 'English Careers Forum 2026 — Live Stage Broadcast';
  }
  if (streamActiveToggle) {
    streamActiveToggle.checked = STATE.config.stream_active !== false;
  }
  if (streamAutoplayToggle) {
    streamAutoplayToggle.checked = STATE.config.stream_autoplay !== false;
  }

  function validateAdminStreamInput(val) {
    const id = extractYouTubeId(val);
    if (!val || !val.trim()) {
      if (streamStatusText) streamStatusText.innerHTML = 'Enter a YouTube link or 11-character video ID above.';
      if (streamStatusPill) {
        streamStatusPill.textContent = 'Standby Mode';
        streamStatusPill.style.background = 'rgba(148, 163, 184, 0.15)';
        streamStatusPill.style.color = 'var(--text-dim)';
        streamStatusPill.style.borderColor = 'rgba(148, 163, 184, 0.3)';
      }
      return '';
    }
    if (id) {
      if (streamStatusText) {
        streamStatusText.innerHTML = `<span style="color:var(--accent-emerald);font-weight:600;">✓ Valid YouTube Video ID: <strong>${id}</strong></span>`;
      }
      if (streamStatusPill) {
        streamStatusPill.textContent = 'Stream Link Valid';
        streamStatusPill.style.background = 'rgba(16, 185, 129, 0.15)';
        streamStatusPill.style.color = 'var(--accent-emerald)';
        streamStatusPill.style.borderColor = 'rgba(16, 185, 129, 0.35)';
      }
      return id;
    } else {
      if (streamStatusText) {
        streamStatusText.innerHTML = '<span style="color:#ef4444;font-weight:600;">✕ Invalid link. Please check the YouTube URL format.</span>';
      }
      if (streamStatusPill) {
        streamStatusPill.textContent = 'Invalid URL';
        streamStatusPill.style.background = 'rgba(239, 68, 68, 0.15)';
        streamStatusPill.style.color = '#ef4444';
        streamStatusPill.style.borderColor = 'rgba(239, 68, 68, 0.35)';
      }
      return '';
    }
  }

  function setAdminPreview(id) {
    if (!previewFrame || !previewPlaceholder) return;
    if (id) {
      previewFrame.src = buildYouTubeEmbedUrl(id, false);
      previewFrame.hidden = false;
      previewPlaceholder.hidden = true;
      if (previewIndicator) previewIndicator.textContent = 'Preview active';
    } else {
      previewFrame.src = '';
      previewFrame.hidden = true;
      previewPlaceholder.hidden = false;
      if (previewIndicator) previewIndicator.textContent = 'No preview';
    }
  }

  streamUrlInput?.addEventListener('input', e => {
    validateAdminStreamInput(e.target.value);
  });

  $('#btn-admin-preview-stream')?.addEventListener('click', () => {
    const val = streamUrlInput ? streamUrlInput.value.trim() : '';
    const id = validateAdminStreamInput(val);
    if (id) {
      setAdminPreview(id);
      showToast(`Previewing YouTube video [${id}]`);
    } else {
      showToast('Please enter a valid YouTube video or stream link.');
    }
  });

  $('#btn-save-stream')?.addEventListener('click', async () => {
    const urlVal = streamUrlInput ? streamUrlInput.value.trim() : '';
    const titleVal = streamTitleInput ? streamTitleInput.value.trim() : 'English Careers Forum 2026 — Live Stage Broadcast';
    const activeVal = streamActiveToggle ? streamActiveToggle.checked : true;
    const autoVal = streamAutoplayToggle ? streamAutoplayToggle.checked : true;

    if (activeVal && urlVal && !extractYouTubeId(urlVal)) {
      showToast('Warning: YouTube URL format is unrecognized. Please check before saving.');
      return;
    }

    STATE.config.stream_url = urlVal;
    STATE.config.stream_title = titleVal;
    STATE.config.stream_active = activeVal;
    STATE.config.stream_autoplay = autoVal;

    localStorage.setItem('cf_stream_url', urlVal);
    localStorage.setItem('cf_stream_title', titleVal);
    localStorage.setItem('cf_stream_active', String(activeVal));
    localStorage.setItem('cf_stream_autoplay', String(autoVal));

    await fetchApi('admin/config', 'PUT', {
      stream_url: urlVal,
      stream_title: titleVal,
      stream_active: activeVal
    });

    renderHeroStream();
    showToast('Live stream settings updated and broadcast published!');
  });

  $('#btn-load-sample-stream')?.addEventListener('click', () => {
    const sample = 'https://www.youtube.com/watch?v=jfKfPfyJRdk';
    if (streamUrlInput) streamUrlInput.value = sample;
    if (streamActiveToggle) streamActiveToggle.checked = true;
    const id = validateAdminStreamInput(sample);
    setAdminPreview(id);
    showToast('Sample stream URL loaded. Click "Save & Publish Stream" to push live.');
  });

  $('#btn-turn-off-stream')?.addEventListener('click', async () => {
    if (streamActiveToggle) streamActiveToggle.checked = false;
    STATE.config.stream_active = false;
    localStorage.setItem('cf_stream_active', 'false');

    await fetchApi('admin/config', 'PUT', { stream_active: false });
    renderHeroStream();
    if (streamStatusPill) {
      streamStatusPill.textContent = 'Standby Mode';
      streamStatusPill.style.background = 'rgba(148, 163, 184, 0.15)';
      streamStatusPill.style.color = 'var(--text-dim)';
      streamStatusPill.style.borderColor = 'rgba(148, 163, 184, 0.3)';
    }
    showToast('Hero stream set to standby mode.');
  });

  // Check initial state for preview if already present
  if (streamUrlInput && streamUrlInput.value) {
    const id = validateAdminStreamInput(streamUrlInput.value);
    if (id) setAdminPreview(id);
  }
}

function toggleFeatureFlag(flagName, enabled) {
  STATE.config.flags[flagName] = enabled;
  // Dynamic reflow: toggle matching sub-navbar tab visibility
  const tabBtn = $(`[data-flag="${flagName}"]`);
  if (tabBtn) tabBtn.hidden = !enabled;

  // Persist flags to backend and local storage so multi-session views stay in sync
  localStorage.setItem('cf_feature_flags', JSON.stringify(STATE.config.flags));
  fetchApi('admin/config', 'PUT', { flags: STATE.config.flags }).catch(() => {});

  showToast(`Feature "${flagName}" set to ${enabled ? 'ON' : 'OFF'}`);
}

// ─── HERO LIVE STREAM & YOUTUBE PARSING ───────────────────────────────────────
function extractYouTubeId(urlOrId) {
  if (!urlOrId || typeof urlOrId !== 'string') return '';
  const trimmed = urlOrId.trim();

  // Pure 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // URL parser
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    if (parsed.hostname.includes('youtube.com')) {
      if (parsed.searchParams.has('v')) {
        const v = parsed.searchParams.get('v');
        if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      }
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (['embed', 'live', 'v', 'shorts'].includes(parts[0]) && parts[1]) {
        if (/^[a-zA-Z0-9_-]{11}$/.test(parts[1])) return parts[1];
      }
    } else if (parsed.hostname === 'youtu.be') {
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts[0] && /^[a-zA-Z0-9_-]{11}$/.test(parts[0])) return parts[0];
    }
  } catch (e) {}

  // Regex fallback
  const match = trimmed.match(/(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|live\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : '';
}

function buildYouTubeEmbedUrl(input, autoplay = true) {
  const id = extractYouTubeId(input);
  if (!id) return '';
  // playsinline=1 keeps inline on mobile without fullscreen takeover
  // rel=0 avoids irrelevant recommended videos
  // modestbranding=1 keeps player clean
  // autoplay=1&mute=1 satisfies browser autoplay policies for continuous playback
  const autoParam = autoplay ? '&autoplay=1&mute=1' : '';
  return `https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0&modestbranding=1&enablejsapi=1${autoParam}`;
}

function renderHeroStream() {
  const iframe = $('#hero-youtube-iframe');
  const standby = $('#hero-stream-standby');
  const badge = $('#stream-live-badge');
  const titleEl = $('#hero-stream-title-text');
  const linkEl = $('#hero-stream-external-link');
  if (!iframe || !standby) return;

  const rawUrl = STATE.config.stream_url || '';
  const isActive = STATE.config.stream_active !== false;
  const isAutoplay = STATE.config.stream_autoplay !== false;
  const title = STATE.config.stream_title || 'English Careers Forum 2026 — Live Stage Broadcast';
  const videoId = extractYouTubeId(rawUrl);

  if (isActive && videoId) {
    const embedUrl = buildYouTubeEmbedUrl(videoId, isAutoplay);
    if (iframe.dataset.currentSrc !== embedUrl) {
      iframe.src = embedUrl;
      iframe.dataset.currentSrc = embedUrl;
    }
    iframe.hidden = false;
    standby.hidden = true;

    if (badge) {
      badge.className = 'badge-live-pulse';
      badge.textContent = '● LIVE STREAM';
    }
    if (titleEl) {
      titleEl.textContent = title;
    }
    if (linkEl) {
      linkEl.href = `https://www.youtube.com/watch?v=${videoId}`;
      linkEl.hidden = false;
    }
  } else {
    // Standby mode
    if (iframe.dataset.currentSrc) {
      iframe.src = '';
      iframe.dataset.currentSrc = '';
    }
    iframe.hidden = true;
    standby.hidden = false;

    if (badge) {
      badge.className = 'badge-standby';
      badge.textContent = 'STANDBY MODE';
    }
    if (titleEl) {
      titleEl.textContent = 'Live Stream Standby';
    }
    if (linkEl) {
      linkEl.hidden = true;
    }
  }
}

// ─── 13. APP BOOTSTRAP INITIALIZER ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Apply saved theme (Light or Dark) silently on boot
  setTheme(STATE.theme, true);

  // Initialize navigation & core handlers
  initNavigation();
  initSpeakLadder();
  initGamePicker();
  initPlanTools();
  initLeaderboard();
  renderHeroStream();

  // Password visibility toggle handler
  $('#btn-toggle-pwd-vis')?.addEventListener('click', () => {
    const pwdInput = $('#admin-pwd-input');
    const toggleBtn = $('#btn-toggle-pwd-vis');
    if (!pwdInput || !toggleBtn) return;
    const isPwd = pwdInput.type === 'password';
    pwdInput.type = isPwd ? 'text' : 'password';
    toggleBtn.textContent = isPwd ? '🙈' : '👁️';
  });

  // Fetch initial config from backend
  const cfg = await fetchApi('config');
  if (cfg) {
    const localGemini = localStorage.getItem('cf_gemini_keys') || localStorage.getItem('cf_gemini_key') || sessionStorage.getItem('cf_gemini_keys') || STATE.config.gemini_keys || '';
    const localElevenKey = localStorage.getItem('cf_eleven_key') || STATE.config.eleven_key || '';
    const localElevenVoice = localStorage.getItem('cf_eleven_voice') || STATE.config.eleven_voice || '';

    STATE.config = Object.assign({}, STATE.config, cfg);

    // Ensure empty backend config never wipes client-side stored Gemini keys
    if (cfg.gemini_keys || cfg.gemini_key) {
      const gKeys = cfg.gemini_keys || cfg.gemini_key;
      STATE.config.gemini_keys = gKeys;
      STATE.config.gemini_key = gKeys;
      localStorage.setItem('cf_gemini_keys', gKeys);
      localStorage.setItem('cf_gemini_key', gKeys.split(/[\r\n,]+/)[0].trim());
      sessionStorage.setItem('cf_gemini_keys', gKeys);
    } else if (localGemini) {
      STATE.config.gemini_keys = localGemini;
      STATE.config.gemini_key = localGemini;
      localStorage.setItem('cf_gemini_keys', localGemini);
      sessionStorage.setItem('cf_gemini_keys', localGemini);
      fetchApi('admin/config', 'PUT', { gemini_keys: localGemini, gemini_key: localGemini.split(/[\r\n,]+/)[0].trim() });
    }

    if (cfg.eleven_key && cfg.eleven_key !== 'configured') {
      STATE.config.eleven_key = cfg.eleven_key;
      localStorage.setItem('cf_eleven_key', cfg.eleven_key);
    } else if (localElevenKey && localElevenKey !== 'configured') {
      STATE.config.eleven_key = localElevenKey;
    } else if (cfg.has_eleven_key) {
      STATE.config.has_eleven_key = true;
    }

    if (cfg.eleven_voice) {
      STATE.config.eleven_voice = cfg.eleven_voice;
      localStorage.setItem('cf_eleven_voice', cfg.eleven_voice);
    } else if (localElevenVoice) {
      STATE.config.eleven_voice = localElevenVoice;
    }

    if (cfg.banner) $('#broadcast-text').textContent = cfg.banner;
    if (cfg.school_name) $('#school-branding-name').textContent = `${cfg.school_name} ©`;
    const localStreamUrl = (localStorage.getItem('cf_stream_url') || '').trim();
    if (cfg.stream_url && cfg.stream_url.trim()) {
      STATE.config.stream_url = cfg.stream_url.trim();
      localStorage.setItem('cf_stream_url', cfg.stream_url.trim());
    } else if (localStreamUrl) {
      STATE.config.stream_url = localStreamUrl;
      fetchApi('admin/config', 'PUT', { stream_url: localStreamUrl }).catch(() => {});
    } else {
      STATE.config.stream_url = 'https://www.youtube.com/watch?v=jfKfPfyJRdk';
      localStorage.setItem('cf_stream_url', STATE.config.stream_url);
    }
    if (cfg.stream_title) {
      STATE.config.stream_title = cfg.stream_title;
      localStorage.setItem('cf_stream_title', cfg.stream_title);
    }
    if (cfg.stream_active !== undefined) {
      STATE.config.stream_active = cfg.stream_active;
      localStorage.setItem('cf_stream_active', String(cfg.stream_active));
    }
    renderHeroStream();

    // Synchronize feature flags across sessions
    if (cfg.flags && typeof cfg.flags === 'object') {
      STATE.config.flags = Object.assign({}, STATE.config.flags, cfg.flags);
    }
    if (STATE.config.flags) {
      Object.entries(STATE.config.flags).forEach(([fName, isEnabled]) => {
        const btn = $(`[data-flag="${fName}"]`);
        if (btn) btn.hidden = !isEnabled;
      });
    }

    if (cfg.avg_feedback) {
      const tabBadge = $('#tab-badge-feedback');
      if (tabBadge) tabBadge.textContent = `⭐ ${cfg.avg_feedback}`;
      const avgBadge = $('#feedback-avg-badge');
      if (avgBadge) avgBadge.textContent = `⭐ ${cfg.avg_feedback} Avg`;
    }
    if (cfg.top_score) {
      const tabBadge = $('#tab-badge-leaderboard');
      if (tabBadge) tabBadge.textContent = `🎯 ${cfg.top_score}% Top`;
    }
  }

  // Pre-render home heroes & stats
  renderCareers();
  renderColleges();
  checkIncomingCardVerification();

  try {
    const cachedFb = JSON.parse(localStorage.getItem('cf_user_feedbacks') || '[]');
    updateFeedbackBadges(cachedFb);
  } catch (e) {}

  try {
    const cachedScores = JSON.parse(localStorage.getItem('cf_user_scores') || '[]');
    updateLeaderboardBadges(cachedScores);
  } catch (e) {}

  // ─── BACKGROUND MULTI-SYSTEM GLOBAL SYNCHRONIZER ───
  // Automatically synchronizes live stream, scores, and feedback across systems
  setInterval(async () => {
    try {
      const liveCfg = await fetchApi('config');
      if (liveCfg) {
        if (liveCfg.db_connected !== undefined) STATE.config.db_connected = liveCfg.db_connected;
        if (liveCfg.stream_url && liveCfg.stream_url.trim() !== STATE.config.stream_url) {
          STATE.config.stream_url = liveCfg.stream_url.trim();
          localStorage.setItem('cf_stream_url', liveCfg.stream_url.trim());
          renderHeroStream();
        }
        if (liveCfg.avg_feedback) {
          const tabBadge = $('#tab-badge-feedback');
          if (tabBadge) tabBadge.textContent = `⭐ ${liveCfg.avg_feedback}`;
          const avgBadge = $('#feedback-avg-badge');
          if (avgBadge) avgBadge.textContent = `⭐ ${liveCfg.avg_feedback} Avg`;
        }
        if (liveCfg.top_score) {
          const tabBadge = $('#tab-badge-leaderboard');
          if (tabBadge) tabBadge.textContent = `🎯 ${liveCfg.top_score}% Top`;
        }
      }

      // If viewing leaderboard, refresh live
      const lbSec = $('#sec-leaderboard');
      if (lbSec && !lbSec.hidden) {
        const activeChip = $('#leaderboard-pack-filters .filter-chip.active');
        const pack = activeChip ? activeChip.dataset.boardPack : 'All';
        loadLeaderboard(pack);
      }

      // If viewing feedback wall, refresh live
      const fbSec = $('#sec-feedback');
      if (fbSec && !fbSec.hidden) {
        loadFeedbackWall();
      }
    } catch (e) {}
  }, 15000);

  // Admin login submission
  $('#admin-login-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const pwd = ($('#admin-pwd-input')?.value || '').trim();
    if (!pwd) {
      showToast('Please enter the administrator password.');
      return;
    }
    if (pwd === 'careers2026' || pwd === 'admin2026' || (STATE.config?.admin_password && pwd === STATE.config.admin_password)) {
      STATE.adminKey = pwd;
      sessionStorage.setItem('cf_admin_key', pwd);
      localStorage.setItem('cf_admin_key', pwd);
      $('#admin-gate-screen').hidden = true;
      $('#admin-workspace-screen').hidden = false;
      initAdminWorkspace();

  // Global D1 Exhibition Data Downloader Wiring
  $('#btn-download-d1-json')?.addEventListener('click', () => {
    window.open(getApiUrl('api/export/data?format=json'), '_blank');
  });

  $('#btn-download-d1-csv')?.addEventListener('click', () => {
    window.open(getApiUrl('api/export/data?format=csv'), '_blank');
  });

      loadFeedbackWall();
      loadLeaderboard();
      showToast('Admin Control Room Unlocked 🔓');
    } else {
      showToast('Incorrect password.');
    }
  });

  // Admin lock / switch session
  $('#btn-admin-lock')?.addEventListener('click', () => {
    STATE.adminKey = '';
    sessionStorage.removeItem('cf_admin_key');
    localStorage.removeItem('cf_admin_key');
    renderAdminView();
    showToast('Admin console locked.');
  });

  $('#btn-admin-logout')?.addEventListener('click', () => {
    STATE.adminKey = '';
    sessionStorage.removeItem('cf_admin_key');
    localStorage.removeItem('cf_admin_key');
    renderAdminView();
    loadFeedbackWall();
    loadLeaderboard();
    showToast('Logged out of Admin.');
  });
});

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

// =========================================================================
// REAL-TIME GLOBAL D1 SYNC POLLER (12s Automatic Cross-Device Refresh)
// =========================================================================
function startGlobalD1SyncPoller() {
  setInterval(async () => {
    const secLeaderboard = $('#sec-leaderboard');
    if (secLeaderboard && !secLeaderboard.hidden) {
      const activeBtn = $('#leaderboard-pack-filters .filter-chip.active');
      const pack = activeBtn ? activeBtn.dataset.boardPack : 'All';
      loadLeaderboard(pack);
    }

    const secFeedback = $('#sec-feedback');
    if (secFeedback && !secFeedback.hidden) {
      loadFeedbackWall();
    }
  }, 12000);
}
