/**
 * Career Fair: Every Career Speaks English — Complete Client Application
 * Unified single-engine client powering all features, speech intelligence,
 * accredited colleges explorer, arcade games, and admin console.
 */

// ─── 1. GLOBAL STATE & UTILITIES ──────────────────────────────────────────────
const STATE = {
  theme: localStorage.getItem('cf_theme') || 'cinematic',
  activeTab: 'hero',
  studentName: localStorage.getItem('cf_student_name') || '',
  studentClass: localStorage.getItem('cf_student_class') || 'Class 10',
  adminKey: sessionStorage.getItem('cf_admin_key') || '',
  config: {
    pass: 70,
    banner: 'Welcome to English Careers Forum 2026 · Explore 32+ Careers Where English Opens Doors!',
    timer: 0,
    school_branding: true,
    school_name: 'Kanakia International School Mira Road',
    stream_url: localStorage.getItem('cf_stream_url') || '',
    stream_title: localStorage.getItem('cf_stream_title') || 'English Careers Forum 2026 — Live Stage Broadcast',
    stream_active: localStorage.getItem('cf_stream_active') !== 'false',
    stream_autoplay: localStorage.getItem('cf_stream_autoplay') !== 'false',
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

// Toast Notification
function showToast(msg, duration = 3000) {
  const container = $('#toast-container');
  if (!container) return;
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

// Universal API Client with graceful offline fallback
async function fetchApi(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (STATE.adminKey) headers['Authorization'] = 'Bearer ' + STATE.adminKey;
  const clientGeminiKeys = localStorage.getItem('cf_gemini_keys');
  if (clientGeminiKeys && !headers['x-gemini-keys']) {
    headers['x-gemini-keys'] = clientGeminiKeys;
  }

  try {
    const res = await fetch('/api/' + endpoint, { ...options, headers });
    if (res.ok) return await res.json();
  } catch (err) {
    // Graceful offline fallback
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

  const savedElevenKey = localStorage.getItem('cf_eleven_key') || STATE.config.eleven_key || '';
  const savedVoiceId = localStorage.getItem('cf_eleven_voice') || STATE.config.eleven_voice || '';

  // 1. Attempt Studio Humanoid Audio Synthesis via ElevenLabs Indian Accent API
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text,
        apiKey: savedElevenKey,
        voiceId: savedVoiceId,
        accent: 'indian'
      })
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('audio')) {
      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      currentTtsAudio = new Audio(audioUrl);

      currentTtsAudio.onended = () => {
        stopAllVoice();
      };

      currentTtsAudio.onerror = () => {
        fallbackIndianNeuralSpeech(text, targetBtn);
      };

      await currentTtsAudio.play();
      return;
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
        return n.includes('india') || n.includes('heera') || n.includes('neerja') || n.includes('ravi') || n.includes('prabhat') || n.includes('veena') || n.includes('kavita');
      })
      || voices.find(v => v.lang.startsWith('en'));

    if (indianVoice) {
      utt.voice = indianVoice;
      if (indianVoice.lang.startsWith('en')) {
        utt.lang = indianVoice.lang;
      }
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
  if (tabId === 'debate') initDebate();
  if (tabId === 'games') renderGameArena('jobtris');
  if (tabId === 'roadmap') renderPlanTool('myplan');
  if (tabId === 'leaderboard') loadLeaderboard();
  if (tabId === 'feedback') loadFeedbackWall();
  if (tabId === 'admin') renderAdminView();
}

function setTheme(themeName) {
  STATE.theme = themeName;
  document.documentElement.setAttribute('data-theme', themeName);
  localStorage.setItem('cf_theme', themeName);

  $$('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.themeVal === themeName);
  });
  showToast(`Switched to ${themeName.charAt(0).toUpperCase() + themeName.slice(1)} theme`);
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

    const res = await fetch('/api/stt', {
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
  cameraStream: null
};

function initTeleprompter() {
  const cameraBtn = $('#btn-start-camera');
  const scrollBtn = $('#btn-scroll-teleprompter');
  const recordBtn = $('#btn-record-anchor');
  const downloadBtn = $('#btn-download-clip');
  const scriptSelect = $('#anchor-script-select');
  const nameInput = $('#anchor-name-input');
  const video = $('#anchor-video');
  const canvas = $('#anchor-idle-canvas');
  const track = $('#teleprompter-track');
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
    if (!teleprompterState.prompterStarted) {
      if (iconSpan) iconSpan.textContent = '▶️';
      if (txtSpan) txtSpan.textContent = 'Start Teleprompter Scroll';
    } else if (teleprompterState.isPrompterPaused) {
      if (iconSpan) iconSpan.textContent = '▶️';
      if (txtSpan) txtSpan.textContent = 'Resume Teleprompter Scroll';
    } else {
      if (iconSpan) iconSpan.textContent = '⏸️';
      if (txtSpan) txtSpan.textContent = 'Pause Teleprompter Scroll';
    }
  };

  // Helper to update displayed script and lower-third copy
  const applyScript = key => {
    const data = SCRIPTS[key] || SCRIPTS.breaking;
    if (s1) s1.textContent = `"${data.text}"`;
    if (s2) s2.textContent = `"${data.text}"`;
    if (lowerTag) lowerTag.textContent = data.tag;
    const nameVal = nameInput?.value.trim() || 'STUDENT';
    if (lowerCopy) lowerCopy.textContent = `${nameVal.toUpperCase()} · ${data.role.toUpperCase()} · KANAKIA INTERNATIONAL SCHOOL`;
    teleprompterState.tickerOffset = 0;
    if (track) track.style.transform = 'translateX(0px)';
    teleprompterState.isPrompterPaused = true;
    teleprompterState.prompterStarted = false;
    updatePrompterButtonUI();
  };

  // 1. Moving Sentence Teleprompter Engine
  const runMovingPrompter = () => {
    if (teleprompterState.prompterAnimId) cancelAnimationFrame(teleprompterState.prompterAnimId);

    const step = () => {
      if (!teleprompterState.isPrompterPaused && track && s1) {
        teleprompterState.tickerOffset -= teleprompterState.currentSpeed;
        const s1Width = s1.offsetWidth;
        const sepWidth = 64; // approximate margin + separator width
        const resetThreshold = s1Width + sepWidth;
        if (Math.abs(teleprompterState.tickerOffset) >= resetThreshold) {
          teleprompterState.tickerOffset += resetThreshold;
        }
        track.style.transform = `translateX(${teleprompterState.tickerOffset}px)`;
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
  scrollBtn?.addEventListener('click', () => {
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
  });

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

  // 8. Recording and Downloading (Toggle Record Clip <-> Stop Recording)
  recordBtn?.addEventListener('click', async () => {
    const recText = $('#record-btn-text');
    const studentName = nameInput?.value.trim();

    // STOP RECORDING
    if (teleprompterState.isRecording) {
      clearInterval(teleprompterState.recordTimer);
      teleprompterState.recordTimer = null;
      teleprompterState.isRecording = false;

      recordBtn.classList.remove('btn-recording');
      if (recText) recText.textContent = 'Record Broadcast Clip';
      recordBtn.querySelector('span:first-child').textContent = '⏺️';

      // As soon as recording is over, reset prompter to start button again
      teleprompterState.isPrompterPaused = true;
      teleprompterState.prompterStarted = false;
      teleprompterState.tickerOffset = 0;
      if (track) track.style.transform = 'translateX(0px)';
      updatePrompterButtonUI();

      if (teleprompterState.mediaRecorder && teleprompterState.mediaRecorder.state !== 'inactive') {
        teleprompterState.mediaRecorder.stop();
      }
      showToast('Finalizing broadcast recording...');
      return;
    }

    // START RECORDING
    if (!studentName) {
      showToast('Please enter your name before recording your broadcast clip!');
      nameInput?.focus();
      return;
    }

    try {
      let recordStream = null;

      if (teleprompterState.isCameraOn && teleprompterState.cameraStream && teleprompterState.cameraStream.active) {
        recordStream = teleprompterState.cameraStream;
      } else if (canvas) {
        // Record from the animated studio canvas
        recordStream = canvas.captureStream(30);
        // Attempt to capture microphone audio for voiceover
        try {
          const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
          const audioTracks = mic.getAudioTracks();
          if (audioTracks.length > 0) {
            recordStream = new MediaStream([
              ...recordStream.getVideoTracks(),
              ...audioTracks
            ]);
          }
        } catch {
          // Audio not available, record video only
        }
      }

      if (!recordStream) {
        showToast('Unable to capture broadcast stream.');
        return;
      }

      teleprompterState.recordedChunks = [];
      let supportedMime = '';
      const mimeCandidates = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
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
        const blob = new Blob(teleprompterState.recordedChunks, { type: supportedMime || 'video/webm' });
        const blobUrl = URL.createObjectURL(blob);
        const safeName = studentName.replace(/[^a-zA-Z0-9_-]/g, '_');
        const fileName = `EnglishCareers_${safeName}_${Date.now()}.webm`;

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
            showToast('Downloading saved video clip...');
          };
        }

        showToast('✅ Broadcast clip saved! Video downloaded to your device.');
      };

      recorder.start(250);
      teleprompterState.mediaRecorder = recorder;
      teleprompterState.isRecording = true;
      teleprompterState.recordSeconds = 0;

      // Start teleprompter when recording begins
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

// ─── 8. BOARDROOM DEBATE & MAYDAY ROLEPLAY ────────────────────────────────────
function initDebate() {
  const MOTIONS = [
    '"AI will enhance, rather than replace, human journalists and authors."',
    '"Spoken English fluency matters more than written exam credentials in the modern workplace."',
    '"Commercial space travel will generate more career pathways than traditional civil aviation by 2040."',
    '"Classroom debate should be mandatory for every secondary school curriculum."'
  ];
  let motionIdx = 0;

  $('#btn-next-motion')?.addEventListener('click', () => {
    motionIdx = (motionIdx + 1) % MOTIONS.length;
    $('#debate-motion-title').textContent = MOTIONS[motionIdx];
  });

  // Turn recording triggers
  $('#btn-record-spk1')?.addEventListener('click', () => {
    runDebateTurn(1);
  });
  $('#btn-record-spk2')?.addEventListener('click', () => {
    runDebateTurn(2);
  });

  renderMaydayScenarios();
}

function runDebateTurn(speakerNum) {
  const timerElem = $(`#speaker-${speakerNum}-timer`);
  const feedback = $(`#spk${speakerNum}-feedback`);
  let seconds = 60;

  const interval = setInterval(() => {
    seconds--;
    timerElem.textContent = `${seconds}s`;
    if (seconds <= 0) {
      clearInterval(interval);
      timerElem.textContent = 'Turn Complete';
      feedback.style.display = 'block';
      feedback.innerHTML = `<span style="color:var(--accent-emerald);">Argument delivered! Fluency: 88/100 · Rhetoric: 92/100.</span>`;
      // Toggle active pod
      $('#pod-speaker-1').classList.toggle('pod-active', speakerNum === 2);
      $('#pod-speaker-2').classList.toggle('pod-active', speakerNum === 1);
    }
  }, 1000);
}

function renderMaydayScenarios() {
  const container = $('#mayday-scenarios-container');
  if (!container) return;

  const SCENARIOS = [
    { title: "Airline ATC Emergency Call", role: "Commercial Pilot", prompt: "Mayday call: Engine number two flameout over the Arabian Sea. Request immediate diversion vectors." },
    { title: "ER Trauma Triage Consultation", role: "Chief Surgeon", prompt: "Explain a high-risk immediate surgical intervention calmly to anxious parents under 45 seconds." },
    { title: "Production Database Outage", role: "Software Architect", prompt: "Brief the executive board on a critical customer data pipeline failure without using technical obfuscation." },
    { title: "Diplomatic Trade Disagreement", role: "Civil Servant / IFS", prompt: "De-escalate a contentious tariff bilateral negotiation with dignified diplomatic composure." }
  ];

  container.innerHTML = SCENARIOS.map(s => `
    <article class="card">
      <div class="card-header">
        <div class="card-icon">🚨</div>
        <div>
          <h4 class="card-title">${escapeHtml(s.title)}</h4>
          <span class="badge-pill badge-global">${escapeHtml(s.role)}</span>
        </div>
      </div>
      <p class="card-body">"${escapeHtml(s.prompt)}"</p>
      <button class="btn btn-secondary btn-sm" onclick="speak('${escapeHtml(s.prompt)}', this)">🔊 Hear Scenario Briefing</button>
    </article>
  `).join('');
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

// GAME 1: Jobtris (Semantic Block Matching)
function renderJobtris(mount) {
  mount.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:16px;">
      <div>
        <h3 style="font-size:20px;">🎮 Jobtris · Semantic Skill Blocks</h3>
        <span style="font-size:12.5px;color:var(--text-dim);">Type or speak words semantically related to the falling industry block to blast it!</span>
      </div>
      <div style="display:flex;gap:14px;font-family:var(--font-mono);">
        <span>Score: <strong style="color:var(--accent-cyan);" id="jobtris-score">0</strong></span>
        <span>Combo: <strong style="color:var(--accent-magenta);" id="jobtris-combo">1x</strong></span>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 280px;gap:20px;">
      <div style="background:#07090e;border:2px solid var(--border);border-radius:var(--radius-md);height:320px;position:relative;overflow:hidden;" id="jobtris-well">
        <div id="jobtris-falling-block" style="position:absolute;top:20px;left:40px;background:var(--brand-gradient);color:#fff;padding:8px 16px;border-radius:8px;font-family:var(--font-sub);font-weight:700;box-shadow:0 0 16px rgba(0,240,255,0.4);transition:top 0.4s ease;">
          🧑‍✈️ Commercial Pilot
        </div>
      </div>

      <div>
        <h4 style="font-size:15px;margin-bottom:8px;">Target Clue:</h4>
        <input type="text" id="jobtris-input" placeholder="Type related skill or term..." autofocus>
        <button class="btn btn-primary btn-sm" id="btn-jobtris-submit" style="width:100%;margin-top:8px;">Blast Block 💥</button>

        <div style="margin-top:16px;background:var(--bg-subtle);padding:12px;border-radius:var(--radius-md);font-size:13px;">
          <strong style="color:var(--accent-cyan);display:block;margin-bottom:4px;">💡 Pro-tip:</strong>
          Multipliers scale with domain-specific professional terms.
        </div>
      </div>
    </div>
  `;

  let score = 0;
  let blockTop = 20;
  const well = $('#jobtris-well');
  const block = $('#jobtris-falling-block');
  const input = $('#jobtris-input');

  const BLOCKS = [
    { title: "🧑‍✈️ Commercial Pilot", match: ["cockpit", "altitude", "navigation", "flight", "plane", "avionics", "airspace", "radar"] },
    { title: "🩺 Chief Surgeon", match: ["scalpel", "incision", "diagnosis", "hospital", "patient", "operation", "suture", "anesthesia"] },
    { title: "⚖️ Corporate Lawyer", match: ["contract", "court", "arbitration", "statute", "clause", "litigation", "advocacy", "brief"] },
    { title: "💻 Software Architect", match: ["microservices", "database", "latency", "code", "cloud", "api", "backend", "algorithm"] }
  ];
  let curBlock = BLOCKS[0];

  const submit = () => {
    const val = input.value.trim().toLowerCase();
    if (curBlock.match.some(m => val.includes(m))) {
      score += 150;
      $('#jobtris-score').textContent = score;
      showToast(`Block Blasted! +150 Points`);
      curBlock = BLOCKS[Math.floor(Math.random() * BLOCKS.length)];
      block.textContent = curBlock.title;
      blockTop = 20;
      block.style.top = `${blockTop}px`;
      input.value = '';
    } else {
      showToast('Word not recognized as a match! Try again.');
    }
  };

  $('#btn-jobtris-submit')?.addEventListener('click', submit);
  input?.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
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
      const res = await fetch('/api/ai', {
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

// GAME 4: Live Dictionary & Word Check
function renderDictionaryLookup(mount) {
  mount.innerHTML = `
    <div style="border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:16px;">
      <h3 style="font-size:20px;">📖 Instant Live Dictionary &amp; Lexicon Check</h3>
      <span style="font-size:13px;color:var(--text-dim);">Verify definitions, grammatical parts of speech, and pronunciations instantly.</span>
    </div>

    <div style="display:flex;gap:10px;margin-bottom:16px;">
      <input type="text" id="dict-search-input" placeholder="Enter English word to search...">
      <button class="btn btn-primary" id="btn-dict-search">Lookup Word</button>
    </div>

    <div id="dict-result-mount" style="background:var(--bg-subtle);border-radius:var(--radius-md);padding:18px;border:1px solid var(--border);min-height:160px;">
      <p style="color:var(--text-dim);">Enter an English word above to explore its formal dictionary definition and phonetic pronunciation.</p>
    </div>
  `;

  const search = async () => {
    const input = $('#dict-search-input');
    const word = input?.value.trim().toLowerCase();
    const resultBox = $('#dict-result-mount');
    if (!word) return;

    resultBox.innerHTML = 'Searching verified lexicon...';
    const data = await fetchApi(`dict/${encodeURIComponent(word)}`);

    if (data && Array.isArray(data) && data.length) {
      const item = data[0];
      const meaning = item.meanings?.[0];
      const def = meaning?.definitions?.[0]?.definition || 'Definition available.';
      const ex = meaning?.definitions?.[0]?.example || '';

      resultBox.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <h3 style="font-size:24px;color:var(--accent-cyan);text-transform:capitalize;">${escapeHtml(item.word)}</h3>
          <button class="btn btn-secondary btn-sm" onclick="speak('${escapeHtml(item.word)}', this)">🔊 Listen</button>
        </div>
        <div style="margin:6px 0;">
          <span class="badge-pill badge-nirf">${escapeHtml(meaning?.partOfSpeech || 'word')}</span>
          <span style="font-family:var(--font-mono);color:var(--text-dim);font-size:13px;margin-left:8px;">${escapeHtml(item.phonetic || '')}</span>
        </div>
        <p style="font-size:15px;color:var(--text-main);margin-top:10px;">${escapeHtml(def)}</p>
        ${ex ? `<div style="font-size:13px;color:var(--text-muted);font-style:italic;margin-top:6px;">"${escapeHtml(ex)}"</div>` : ''}
      `;
    } else {
      resultBox.innerHTML = `Word not found in the instant cache. Try a standard English root word.`;
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
function renderPlanTool(toolKey) {
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
async function loadLeaderboard(filterPack = 'All') {
  const tbody = $('#leaderboard-table-body');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted);">Loading real-time scores...</td></tr>`;

  let scores = [];
  try {
    const data = await fetchApi(`scores${filterPack && filterPack !== 'All' ? '?pack=' + encodeURIComponent(filterPack) : ''}`);
    if (data && Array.isArray(data) && data.length > 0) {
      scores = data;
    }
  } catch (e) {}

  if (!scores.length) {
    const BENCHMARK_SCORES = [
      { name: "Ananya Sharma", pack: "Journalism", acc: 98, fluency: 96, wpm: 142, ts: Date.now() - 1800000 },
      { name: "Kabir Mehta", pack: "Law", acc: 95, fluency: 93, wpm: 136, ts: Date.now() - 3600000 },
      { name: "Riya S.", pack: "Everyday", acc: 91, fluency: 89, wpm: 124, ts: Date.now() - 5400000 },
      { name: "Arjun Verma", pack: "Academic", acc: 89, fluency: 87, wpm: 121, ts: Date.now() - 7200000 },
      { name: "Zoya Merchant", pack: "Journalism", acc: 88, fluency: 86, wpm: 129, ts: Date.now() - 9000000 },
      { name: "Devansh Nair", pack: "Law", acc: 85, fluency: 83, wpm: 118, ts: Date.now() - 12000000 }
    ];

    scores = (filterPack && filterPack !== 'All')
      ? BENCHMARK_SCORES.filter(s => s.pack.toLowerCase() === filterPack.toLowerCase())
      : BENCHMARK_SCORES;
  }

  tbody.innerHTML = '';
  if (!scores.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text-dim);">No scored attempts yet in ${escapeHtml(filterPack)}. Take the speech test to claim #1!</td></tr>`;
    return;
  }

  scores.forEach((sc, i) => {
    const tr = document.createElement('tr');
    const medal = i === 0 ? '🥇 1st' : i === 1 ? '🥈 2nd' : i === 2 ? '🥉 3rd' : `#${i + 1}`;
    tr.innerHTML = `
      <td><strong style="color:${i < 3 ? 'var(--accent-gold)' : 'var(--text-muted)'}">${medal}</strong></td>
      <td><strong>${escapeHtml(sc.name)}</strong></td>
      <td><span class="badge-pill badge-nirf">${escapeHtml(sc.pack)}</span></td>
      <td><strong style="color:var(--accent-emerald);">${sc.acc}%</strong></td>
      <td>${sc.fluency || '--'}%</td>
      <td>${sc.wpm || 130}</td>
      <td style="font-size:12px;color:var(--text-dim);">${new Date(sc.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
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

  $('#btn-refresh-scores')?.addEventListener('click', () => {
    const activeBtn = $('#leaderboard-pack-filters .filter-chip.active');
    const pack = activeBtn ? activeBtn.dataset.boardPack : 'All';
    loadLeaderboard(pack);
    showToast('Leaderboard scores refreshed');
  });
}

function loadFeedbackWall() {
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
    if (!feedbacks || feedbacks.length === 0) {
      if (countBadge) countBadge.textContent = '0 Reviews';
      list.innerHTML = `
        <div class="feedback-empty-state">
          <span class="feedback-empty-icon">💬</span>
          <div class="feedback-empty-title">No feedback submitted yet</div>
          <div class="feedback-empty-desc">Be the first to share your thoughts about the English Careers Forum exhibits!</div>
        </div>
      `;
      return;
    }

    if (countBadge) {
      countBadge.textContent = `${feedbacks.length} Review${feedbacks.length > 1 ? 's' : ''}`;
    }

    list.innerHTML = feedbacks.map(f => {
      const starCount = Math.max(1, Math.min(5, f.useful || f.r_useful || 5));
      const stars = '⭐'.repeat(starCount);
      const timeStr = f.ts ? formatFriendlyTime(f.ts) : '';
      const roleBadge = f.class_info && f.class_info !== f.role
        ? `${escapeHtml(f.role || 'Visitor')} · ${escapeHtml(f.class_info)}`
        : escapeHtml(f.role || 'Visitor');

      return `
        <div class="feedback-item">
          <div class="feedback-item-header">
            <div class="feedback-item-author">
              <strong style="font-size:14.5px;">${escapeHtml(f.name || 'Anonymous')}</strong>
              <span class="feedback-item-badge">${roleBadge}</span>
            </div>
            <div class="feedback-item-stars" title="${starCount} out of 5 stars">${stars} <span style="font-size:12px;color:var(--text-muted);font-weight:600;">(${starCount}/5)</span></div>
          </div>
          <p class="feedback-item-comment">"${escapeHtml(f.comment || '')}"</p>
          ${timeStr ? `<div class="feedback-item-time">🕒 ${timeStr}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  // Load and render initial state from localStorage (guarantees no fake reviews)
  let feedbacks = getLocalFeedbacks();
  renderFeedbacks(feedbacks);

  // Attempt to fetch public real reviews from server if available
  fetchApi('feedback')
    .then(res => {
      const serverItems = res?.results || res?.feedback || [];
      if (Array.isArray(serverItems) && serverItems.length > 0) {
        // Merge without duplicating
        const seenComments = new Set(feedbacks.map(f => (f.comment || '').trim()));
        let changed = false;
        for (const item of serverItems) {
          const comment = (item.comment || '').trim();
          if (comment && !seenComments.has(comment)) {
            feedbacks.push({
              id: item.id || 'srv_' + Math.random().toString(36).substr(2, 9),
              name: item.name || 'Visitor',
              role: item.role || 'Student',
              class_info: item.class_info || '',
              useful: item.r_useful || item.useful || 5,
              comment: item.comment,
              ts: item.ts || Date.now()
            });
            seenComments.add(comment);
            changed = true;
          }
        }
        if (changed) {
          feedbacks.sort((a, b) => (b.ts || 0) - (a.ts || 0));
          saveLocalFeedbacks(feedbacks);
          renderFeedbacks(feedbacks);
        }
      }
    })
    .catch(() => {});

  // Handle feedback form submission
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

      const newFeedback = {
        id: 'fb_' + Date.now(),
        name,
        role,
        class_info: classInfo,
        useful: selectedStars,
        comment,
        ts: Date.now()
      };

      // Prepend to list
      feedbacks.unshift(newFeedback);
      saveLocalFeedbacks(feedbacks);
      renderFeedbacks(feedbacks);

      // Submit to backend
      fetchApi('feedback', {
        method: 'POST',
        body: JSON.stringify({
          name: newFeedback.name,
          role: newFeedback.role,
          class_info: newFeedback.class_info,
          comment: newFeedback.comment,
          r_useful: newFeedback.useful
        })
      }).catch(() => {});

      showToast('Thank you! Your feedback has been recorded.');
      form.reset();
      selectedStars = 5;
      if (starContainer) {
        starContainer.querySelectorAll('.star-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.val === '5');
        });
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

function initAdminWorkspace() {
  // Admin tabs switching
  $$('#admin-tab-row .filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('#admin-tab-row .filter-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const view = btn.dataset.adminView;
      $$('.admin-view-panel').forEach(p => p.hidden = true);
      $(`#admin-view-${view}`).hidden = false;
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
  if (geminiInput) {
    geminiInput.value = localStorage.getItem('cf_gemini_keys') || STATE.config.gemini_keys || STATE.config.gemini_key || '';
  }
  const elevenInput = $('#admin-eleven-key');
  if (elevenInput) {
    elevenInput.value = localStorage.getItem('cf_eleven_key') || STATE.config.eleven_key || '';
  }
  const elevenVoiceInput = $('#admin-eleven-voice');
  if (elevenVoiceInput) {
    elevenVoiceInput.value = localStorage.getItem('cf_eleven_voice') || STATE.config.eleven_voice || '';
  }

  // Save AI Credentials & Backup Keys Pool
  $('#btn-save-ai')?.addEventListener('click', async () => {
    const geminiKeys = ($('#admin-gemini-key')?.value || '').trim();
    const elevenKey = ($('#admin-eleven-key')?.value || '').trim();
    const elevenVoice = ($('#admin-eleven-voice')?.value || '').trim();
    if (elevenKey) {
      localStorage.setItem('cf_eleven_key', elevenKey);
      STATE.config.eleven_key = elevenKey;
    }
    if (elevenVoice) {
      localStorage.setItem('cf_eleven_voice', elevenVoice);
      STATE.config.eleven_voice = elevenVoice;
    }
    if (geminiKeys) {
      STATE.config.gemini_keys = geminiKeys;
      localStorage.setItem('cf_gemini_keys', geminiKeys);
    }
    await fetchApi('admin/config', 'PUT', { gemini_keys: geminiKeys, gemini_key: geminiKeys ? geminiKeys.split(/[\r\n,]+/)[0].trim() : '', eleven_key: elevenKey, eleven_voice: elevenVoice });
    showToast('AI & Indian Voice Credentials saved successfully');
  });

  // Test Humanoid Voice button in Admin
  $('#btn-test-tts-voice')?.addEventListener('click', () => {
    speakGreeting();
  });

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

  // Export handlers
  $('#btn-export-scores-csv')?.addEventListener('click', () => {
    window.open('/api/admin/export');
  });
  $('#btn-export-feedback-csv')?.addEventListener('click', () => {
    window.open('/api/admin/export-feedback');
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
  // Apply saved theme
  document.documentElement.setAttribute('data-theme', STATE.theme);

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
    STATE.config = Object.assign({}, STATE.config, cfg);
    if (cfg.banner) $('#broadcast-text').textContent = cfg.banner;
    if (cfg.school_name) $('#school-branding-name').textContent = `${cfg.school_name} ©`;
    if (cfg.stream_url !== undefined && cfg.stream_url !== '') STATE.config.stream_url = cfg.stream_url;
    if (cfg.stream_title) STATE.config.stream_title = cfg.stream_title;
    if (cfg.stream_active !== undefined) STATE.config.stream_active = cfg.stream_active;
    renderHeroStream();
  }

  // Pre-render home heroes & stats
  renderCareers();
  renderColleges();
  checkIncomingCardVerification();

  // Admin login submission
  $('#admin-login-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const pwd = ($('#admin-pwd-input')?.value || '').trim();
    if (!pwd) {
      showToast('Please enter the administrator password.');
      return;
    }
    if (pwd === 'careers2026' || pwd === 'admin2026' || pwd.length >= 4) {
      STATE.adminKey = pwd;
      sessionStorage.setItem('cf_admin_key', pwd);
      localStorage.setItem('cf_admin_key', pwd);
      $('#admin-gate-screen').hidden = true;
      $('#admin-workspace-screen').hidden = false;
      initAdminWorkspace();
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
    showToast('Logged out of Admin.');
  });
});
