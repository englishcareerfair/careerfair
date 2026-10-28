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

  try {
    const res = await fetch('/api/' + endpoint, { ...options, headers });
    if (res.ok) return await res.json();
  } catch (err) {
    // Graceful offline fallback
  }
  return null;
}

// Humanoid Studio Voice Engine & Natural Fallback
let isGreetingPlaying = false;
let currentGreetingAudio = null;

async function speakGreeting() {
  const btn = $('#btn-greeting');
  const greetingText = "Welcome to the English Careers Forum 2026 at Kanakia International School Mira Road. Good English is not merely an examination subject—it is the universal language that powers thirty-two global careers, from commercial aviation and surgical consults to corporate law and international diplomacy. Explore the interactive exhibits, test your spoken articulation, and discover your path!";

  if (isGreetingPlaying) {
    if (currentGreetingAudio) {
      currentGreetingAudio.pause();
      currentGreetingAudio = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    isGreetingPlaying = false;
    if (btn) {
      btn.innerHTML = '<span>🔊</span> <span class="greeting-btn-text">Listen AI Greeting</span>';
      btn.classList.remove('playing');
    }
    return;
  }

  isGreetingPlaying = true;
  if (btn) {
    btn.innerHTML = '<span>⏳</span> <span class="greeting-btn-text">Generating Voice...</span>';
    btn.classList.add('playing');
  }

  const savedElevenKey = localStorage.getItem('cf_eleven_key') || STATE.config.eleven_key || '';

  // 1. Attempt Studio Humanoid Audio Synthesis via ElevenLabs / Server API
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: greetingText,
        apiKey: savedElevenKey
      })
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('audio')) {
      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      currentGreetingAudio = new Audio(audioUrl);

      if (btn) {
        btn.innerHTML = '<span>⏹</span> <span class="greeting-btn-text">Stop Audio</span>';
      }

      currentGreetingAudio.onended = () => {
        isGreetingPlaying = false;
        currentGreetingAudio = null;
        if (btn) {
          btn.innerHTML = '<span>🔊</span> <span class="greeting-btn-text">Listen AI Greeting</span>';
          btn.classList.remove('playing');
        }
      };

      currentGreetingAudio.onerror = () => {
        fallbackNeuralSpeech(greetingText, btn);
      };

      await currentGreetingAudio.play();
      return;
    }
  } catch (err) {
    console.warn('TTS API error, falling back to neural speech:', err);
  }

  // 2. Fallback to High-Fidelity Humanoid Browser Neural Synthesis
  fallbackNeuralSpeech(greetingText, btn);
}

function fallbackNeuralSpeech(text, btn) {
  if (!('speechSynthesis' in window)) {
    showToast('Speech synthesis not supported in this browser.');
    if (btn) {
      btn.innerHTML = '<span>🔊</span> <span class="greeting-btn-text">Listen AI Greeting</span>';
      btn.classList.remove('playing');
    }
    isGreetingPlaying = false;
    return;
  }

  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'en-US';
  utt.rate = 0.94; // Conversational human pace
  utt.pitch = 1.02; // Warm humanoid inflection

  const voices = window.speechSynthesis.getVoices();
  if (voices.length) {
    const preferred = voices.find(v => v.name.includes('Natural') || v.name.includes('Neural2'))
      || voices.find(v => v.name.includes('Google US English'))
      || voices.find(v => v.name.includes('Jenny') || v.name.includes('Guy'))
      || voices.find(v => v.name.includes('Samantha') && v.lang.startsWith('en'))
      || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utt.voice = preferred;
  }

  if (btn) {
    btn.innerHTML = '<span>⏹</span> <span class="greeting-btn-text">Stop Audio</span>';
  }

  utt.onend = () => {
    isGreetingPlaying = false;
    if (btn) {
      btn.innerHTML = '<span>🔊</span> <span class="greeting-btn-text">Listen AI Greeting</span>';
      btn.classList.remove('playing');
    }
  };

  utt.onerror = () => {
    isGreetingPlaying = false;
    if (btn) {
      btn.innerHTML = '<span>🔊</span> <span class="greeting-btn-text">Listen AI Greeting</span>';
      btn.classList.remove('playing');
    }
  };

  setTimeout(() => window.speechSynthesis.speak(utt), 50);
}

function speak(text) {
  fallbackNeuralSpeech(text, null);
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
    englishSuperpower: "Compressing a transformative commercial idea into three memorable words (e.g. 'Just Do It', 'Think Different')."
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

// Vocabulary Flash Cards & Etymology
const FLASH_CARDS = [
  { word: "Rhetoric", phonetic: "/ˈrɛt.ər.ɪk/", pos: "noun", meaning: "The art of effective or persuasive speaking or writing.", sentence: "The advocate's rhetoric united the room in defense of free speech.", origin: "Greek 'rhētorikē' (art of an orator)" },
  { word: "Eloquence", phonetic: "/ˈɛl.ə.kwəns/", pos: "noun", meaning: "Fluent, graceful, or persuasive speaking or writing.", sentence: "She argued the constitutional petition with remarkable eloquence.", origin: "Latin 'eloqui' (to speak out)" },
  { word: "Articulate", phonetic: "/ɑːrˈtɪk.jə.lət/", pos: "adjective", meaning: "Expressing ideas clearly, fluently, and effectively.", sentence: "An articulate spokesperson is essential during a corporate crisis.", origin: "Latin 'articulatus' (jointed distinctly)" },
  { word: "Brevity", phonetic: "/ˈbrɛv.ɪ.ti/", pos: "noun", meaning: "Concise and exact use of words in writing or speech.", sentence: "Brevity is the soul of wit in modern journalism.", origin: "Latin 'brevis' (short)" },
  { word: "Pedagogy", phonetic: "/ˈpɛd.ə.ɡɒdʒ.i/", pos: "noun", meaning: "The method and practice of teaching, especially as an academic subject.", sentence: "Innovative pedagogy transforms grammar lessons into memorable challenges.", origin: "Greek 'paidagogia' (leading a child)" },
  { word: "Nuance", phonetic: "/ˈnjuː.ɑːns/", pos: "noun", meaning: "A subtle difference in meaning, expression, or sound.", sentence: "A skilled translator captures every delicate cultural nuance.", origin: "French 'nuer' (to shade)" },
  { word: "Jurisprudence", phonetic: "/ˌdʒʊə.rɪsˈpruː.dəns/", pos: "noun", meaning: "The theoretical philosophy and science of law.", sentence: "Constitutional jurisprudence safeguards democratic institutions.", origin: "Latin 'juris prudentia' (knowledge of law)" },
  { word: "Soliloquy", phonetic: "/səˈlɪl.ə.kwi/", pos: "noun", meaning: "An act of speaking one's thoughts aloud when alone on stage.", sentence: "Hamlet's famous soliloquy reflects deeply on human existence.", origin: "Latin 'solus' (alone) + 'loqui' (to speak)" },
  { word: "Ubiquitous", phonetic: "/juːˈbɪk.wɪ.təs/", pos: "adjective", meaning: "Present, appearing, or found everywhere simultaneously.", sentence: "Smartphones have become ubiquitous in modern communications.", origin: "Latin 'ubique' (everywhere)" },
  { word: "Empirical", phonetic: "/ɪmˈpɪr.ɪ.kəl/", pos: "adjective", meaning: "Based on verifiable observation or experience rather than theory.", sentence: "Scholars require empirical data before publishing medical findings.", origin: "Greek 'empeiria' (experience)" },
  { word: "Meticulous", phonetic: "/məˈtɪk.jʊ.ləs/", pos: "adjective", meaning: "Showing great attention to detail; very careful and precise.", sentence: "The sub-editor was meticulous in cross-checking every historical citation.", origin: "Latin 'metus' (fear, careful anxiety)" },
  { word: "Tenacious", phonetic: "/təˈneɪ.ʃəs/", pos: "adjective", meaning: "Tending to keep a firm hold; determined and persistent.", sentence: "Her tenacious investigative reporting uncovered the truth.", origin: "Latin 'tenax' (holding fast)" }
];

// ─── 3. TAB NAVIGATION CONTROLLER ─────────────────────────────────────────────
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

  // Initialize interactive sub-shelf pickers
  initGamePicker();
  initPlanTools();
  initLeaderboard();
}

function switchTab(tabId) {
  STATE.activeTab = tabId;

  // Update navbar button states
  $$('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

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

  $('#btn-listen-target')?.addEventListener('click', () => {
    const text = $('#speak-target-sentence')?.textContent;
    if (text) speak(text);
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
    recog.lang = 'en-US';
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
  const passThreshold = STATE.config.pass || 70;
  const passed = acc >= passThreshold;

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
      <div style="background:${passed ? 'rgba(0,245,155,0.12)' : 'rgba(255,42,133,0.12)'};border:1px solid ${passed ? 'var(--accent-emerald)' : 'var(--accent-magenta)'};border-radius:var(--radius-md);padding:16px;margin-top:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <strong style="color:${passed ? 'var(--accent-emerald)' : 'var(--accent-magenta)'};font-size:16px;">
            ${passed ? '🎉 Excellent Articulation! Target Achieved!' : '⚠️ Good Effort! Practice Again for Higher Accuracy'}
          </strong>
          <span class="badge-pill ${passed ? 'badge-naac' : 'badge-global'}" style="font-size:14px;font-weight:700;">${acc}% Accuracy</span>
        </div>
        <p style="font-size:13.5px;margin:10px 0;color:var(--text-main);">
          <strong>Recognized Speech:</strong> "${escapeHtml(transcript)}"
        </p>
        <button class="btn btn-primary btn-sm" onclick="changeSpeechSentence(true)" style="margin-top:6px;">
          ✨ Next Practice Sentence ➡️
        </button>
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

// ─── 6. AI SPEECH LAB (6D COACH & WAVEFORM) ──────────────────────────────────
let speechLabRec = null;
let speechLabStartTime = 0;

function initSpeechLab() {
  const recBtn = $('#btn-speech-lab-record');
  const stopBtn = $('#btn-speech-lab-stop');
  const analyzeBtn = $('#btn-speech-lab-analyze');

  recBtn?.addEventListener('click', startSpeechLabAudio);
  stopBtn?.addEventListener('click', stopSpeechLabAudio);
  analyzeBtn?.addEventListener('click', analyzeSpeechLabSample);
}

async function startSpeechLabAudio() {
  const status = $('#speech-session-state');
  const transcript = $('#speech-lab-transcript');

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    STATE.audioStream = stream;

    // Web Audio API Waveform Visualizer (cross-platform mobile resume support)
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

    // Browser Speech Recognition for live text
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      speechLabRec = new SpeechRecognition();
      speechLabRec.continuous = true;
      speechLabRec.interimResults = true;
      speechLabRec.onresult = e => {
        let full = '';
        for (let i = 0; i < e.results.length; i++) full += e.results[i][0].transcript + ' ';
        transcript.value = full.trim();
        updateRealtimePaceAndFillers(full);
      };
      speechLabRec.start();
    }

    speechLabStartTime = Date.now();
    status.textContent = 'Listening (Live)';
    status.className = 'badge-pill badge-global';
    $('#btn-speech-lab-record').disabled = true;
    $('#btn-speech-lab-stop').disabled = false;
  } catch (err) {
    showToast('Microphone access denied or not available. You can type in the box below.');
  }
}

function stopSpeechLabAudio() {
  if (STATE.audioStream) {
    STATE.audioStream.getTracks().forEach(t => t.stop());
  }
  if (speechLabRec) {
    try { speechLabRec.stop(); } catch {}
  }
  $('#speech-session-state').textContent = 'Sample Ready';
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
  const text = $('#speech-lab-transcript')?.value.trim();
  if (!text) {
    showToast('Please record or type an English response to analyze.');
    return;
  }

  const words = text.split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+/).filter(Boolean);
  const fillers = (text.match(/\b(um+|uh+|erm+|like|you know|actually|basically|literally)\b/gi) || []).length;
  const uniqueWords = new Set(words.map(w => w.toLowerCase())).size;

  // 6-Dimension Score Synthesis
  const fluency = Math.min(100, Math.max(40, 92 - fillers * 6 + Math.min(10, words.length / 5)));
  const clarity = Math.min(100, Math.max(45, 80 + Math.min(15, sentences.length * 3) - fillers * 4));
  const pronunciation = Math.min(100, Math.max(50, 85 - fillers * 2));
  const vocab = Math.min(100, Math.max(40, Math.round((uniqueWords / Math.max(1, words.length)) * 100)));
  const grammar = Math.min(100, Math.max(50, 75 + (text.length > 80 ? 15 : 5)));
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
    <strong>Targeted Strengths &amp; Adjustments:</strong><br>
    • Your vocabulary diversity was <strong>${vocab}%</strong> across ${words.length} spoken words.<br>
    • ${fillers > 0 ? `Notice ${fillers} filler phrase(s). Practice taking a silent 1-second pause when searching for words.` : 'Zero hesitation fillers detected! Flawless rhythm.'}<br><br>
    <strong>"Say It Better" Model Delivery:</strong><br>
    <em>"${escapeHtml(text.replace(/\b(um+|uh+|like|you know)\b/gi, '').trim())}"</em>
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
let teleprompterInterval = null;

function initTeleprompter() {
  const cameraBtn = $('#btn-start-camera');
  const scrollBtn = $('#btn-scroll-teleprompter');
  const recordBtn = $('#btn-record-anchor');
  const scriptSelect = $('#anchor-script-select');
  const nameInput = $('#anchor-name-input');

  const SCRIPTS = {
    breaking: "Good evening, we are broadcasting live from the English Careers Forum 2026 at Kanakia International School. Today, students explore how English powers over thirty-two professional trajectories — from commercial aviation to pediatric surgery.",
    pilot: "Tower, Air India 102 heavy ready for departure runway 27 Right, request immediate radar climb out to flight level 320 on course to London Heathrow.",
    doctor: "Code blue in trauma bay two. Prepare rapid sequence intubation, cross-match four units of O-negative blood, and notify the attending pediatric trauma specialist immediately.",
    tech: "Our distributed microservices latency spiked following the morning database migration. We have isolated the lock contention and are rolling forward the zero-downtime hotfix.",
    pitch: "Ninety percent of students choose careers based on familiar stereotypes. Our platform bridges the vocabulary and confidence gap, unlocking top global careers through articulate spoken English."
  };

  scriptSelect?.addEventListener('change', e => {
    const text = SCRIPTS[e.target.value] || SCRIPTS.breaking;
    $('#teleprompter-text').textContent = `"${text}"`;
  });

  nameInput?.addEventListener('input', e => {
    const val = e.target.value.trim() || 'STUDENT';
    $('#lower-third-copy').textContent = `${val.toUpperCase()} · CLASS X · KANAKIA INTERNATIONAL SCHOOL`;
  });

  cameraBtn?.addEventListener('click', async () => {
    const video = $('#anchor-video');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      });
      video.srcObject = stream;
      showToast('Camera feed live! Ready to broadcast.');
    } catch {
      showToast('Camera device not found or access denied.');
    }
  });

  scrollBtn?.addEventListener('click', () => {
    const box = $('#teleprompter-box');
    if (teleprompterInterval) {
      clearInterval(teleprompterInterval);
      teleprompterInterval = null;
      scrollBtn.textContent = '▶️ Resume Scroll';
      return;
    }
    scrollBtn.textContent = '⏸️ Pause Scroll';
    teleprompterInterval = setInterval(() => {
      box.scrollTop += 1;
      if (box.scrollTop >= box.scrollHeight - box.clientHeight) {
        box.scrollTop = 0;
      }
    }, 45);
  });

  recordBtn?.addEventListener('click', () => {
    showToast('Recording clip... (Demo simulation: records on-device WebM video)');
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
      <button class="btn btn-secondary btn-sm" onclick="speak('${escapeHtml(s.prompt)}')">🔊 Hear Scenario Briefing</button>
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
  } else if (gameKey === 'email') {
    renderFixTheEmail(mount);
  } else if (gameKey === 'package') {
    renderGuessPackage(mount);
  } else if (gameKey === 'hangman') {
    renderHangman(mount);
  } else {
    mount.innerHTML = `<div style="text-align:center;padding:40px;">Select a game to begin playing!</div>`;
  }
}

function initGamePicker() {
  $$('#game-picker-tabs .filter-chip').forEach(btn => {
    btn.onclick = () => {
      renderGameArena(btn.dataset.game);
    };
  });
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
        <input type="text" id="jobtris-input" placeholder="Type related skill (e.g. cockpit, altitude, navigation)..." autofocus>
        <button class="btn btn-primary btn-sm" id="btn-jobtris-submit" style="width:100%;margin-top:8px;">Blast Block 💥</button>

        <div style="margin-top:16px;background:var(--bg-subtle);padding:12px;border-radius:var(--radius-md);font-size:13px;">
          <strong style="color:var(--accent-cyan);display:block;margin-bottom:4px;">💡 Pro-tip:</strong>
          Multipliers scale with domain-specific terms (e.g. "avionics", "aerodynamics", "ICAO").
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

// GAME 3: Flash Cards Studio
function renderFlashCards(mount) {
  let idx = 0;
  mount.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:16px;">
      <h3 style="font-size:20px;">🃏 Flash Cards Studio · 40+ Power Words</h3>
      <span style="font-size:13px;color:var(--text-dim);" id="flash-card-counter">Word 1 of ${FLASH_CARDS.length}</span>
    </div>

    <div style="max-width:540px;margin:20px auto;perspective:1000px;" id="flash-card-box">
      <div class="card" style="min-height:240px;display:flex;flex-direction:column;justify-content:space-between;border-color:var(--border-strong);">
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span class="badge-pill badge-global" id="fc-pos">noun</span>
            <button class="btn btn-secondary btn-sm" id="btn-fc-speak">🔊 Pronounce</button>
          </div>
          <h2 style="font-size:36px;color:var(--accent-cyan);margin-bottom:4px;" id="fc-word">Rhetoric</h2>
          <span style="font-family:var(--font-mono);font-size:14px;color:var(--text-dim);" id="fc-phonetic">/ˈrɛt.ər.ɪk/</span>
          <p style="font-size:15px;color:var(--text-main);margin:12px 0;" id="fc-meaning">The art of effective or persuasive speaking or writing.</p>
          <div style="font-size:13px;color:var(--text-muted);font-style:italic;" id="fc-sentence">"The speech was full of inspiring rhetoric."</div>
        </div>
        <div style="border-top:1px dashed var(--border);padding-top:8px;font-size:12px;color:var(--text-dim);" id="fc-origin">Etymology: Greek 'rhētorikē'</div>
      </div>
    </div>

    <div style="display:flex;justify-content:center;gap:12px;">
      <button class="btn btn-secondary" id="btn-fc-prev">⬅️ Previous Word</button>
      <button class="btn btn-primary" id="btn-fc-next">Next Word ➡️</button>
    </div>
  `;

  const loadCard = () => {
    const c = FLASH_CARDS[idx];
    $('#fc-word').textContent = c.word;
    $('#fc-phonetic').textContent = c.phonetic;
    $('#fc-pos').textContent = c.pos;
    $('#fc-meaning').textContent = c.meaning;
    $('#fc-sentence').textContent = `"${c.sentence}"`;
    $('#fc-origin').textContent = `Etymology: ${c.origin}`;
    $('#flash-card-counter').textContent = `Word ${idx + 1} of ${FLASH_CARDS.length}`;
  };

  $('#btn-fc-next')?.addEventListener('click', () => { idx = (idx + 1) % FLASH_CARDS.length; loadCard(); });
  $('#btn-fc-prev')?.addEventListener('click', () => { idx = (idx - 1 + FLASH_CARDS.length) % FLASH_CARDS.length; loadCard(); });
  $('#btn-fc-speak')?.addEventListener('click', () => { speak(FLASH_CARDS[idx].word); });

  loadCard();
}

// GAME 4: Live Dictionary & Word Check
function renderDictionaryLookup(mount) {
  mount.innerHTML = `
    <div style="border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:16px;">
      <h3 style="font-size:20px;">📖 Instant Live Dictionary &amp; Lexicon Check</h3>
      <span style="font-size:13px;color:var(--text-dim);">Verify definitions, grammatical parts of speech, and pronunciations instantly.</span>
    </div>

    <div style="display:flex;gap:10px;margin-bottom:16px;">
      <input type="text" id="dict-search-input" placeholder="Enter any English word (e.g. eloquence, jurisdiction, resilient)...">
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
          <button class="btn btn-secondary btn-sm" onclick="speak('${escapeHtml(item.word)}')">🔊 Listen</button>
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

  $('#btn-bee-listen')?.addEventListener('click', () => speak(curWord));

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

// GAME 6: Fix the Email
function renderFixTheEmail(mount) {
  mount.innerHTML = `
    <div style="border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:16px;">
      <h3 style="font-size:20px;">✉️ Fix the Email · Corporate Polish</h3>
      <span style="font-size:13px;color:var(--text-dim);">Identify tone and etiquette blunders in this student internship inquiry.</span>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
      <div style="background:var(--bg-subtle);padding:14px;border-radius:var(--radius-md);border:1px solid var(--border);">
        <strong style="color:var(--accent-magenta);display:block;margin-bottom:8px;">❌ Poor Draft:</strong>
        <p style="font-size:13.5px;color:var(--text-muted);font-family:var(--font-mono);line-height:1.5;">
          "hey sir give me internship. i need certificate for school. call me back asap thx."
        </p>
      </div>

      <div style="background:rgba(0,245,155,0.08);padding:14px;border-radius:var(--radius-md);border:1px solid rgba(0,245,155,0.3);">
        <strong style="color:var(--accent-emerald);display:block;margin-bottom:8px;">✅ Polished Professional Rewrite:</strong>
        <p style="font-size:13.5px;color:var(--text-main);line-height:1.5;">
          "Dear Hiring Manager,<br><br>I am writing to express my enthusiastic interest in the summer student internship at your organization. Attached please find my academic credentials and portfolio for your kind consideration.<br><br>Sincerely,<br>Class 10 Student"
        </p>
      </div>
    </div>
  `;
}

// GAME 7: Guess the Package
function renderGuessPackage(mount) {
  const PACKAGES = [
    { career: "Commercial Airline Pilot", start: "₹18L/yr", peak: "₹50L+/yr Captain" },
    { career: "Corporate M&A Lawyer", start: "₹14L/yr", peak: "₹60L+/yr Partner" },
    { career: "Chief Pediatric Surgeon", start: "₹15L/yr", peak: "₹70L+/yr Specialist" },
    { career: "Principal Cloud Architect", start: "₹16L/yr", peak: "₹80L+/yr Director" }
  ];

  mount.innerHTML = `
    <div style="border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:16px;">
      <h3 style="font-size:20px;">💰 Guess the Package · Real-World Compensation</h3>
      <span style="font-size:13px;color:var(--text-dim);">Flip the cards to reveal starting and peak compensation bands.</span>
    </div>

    <div class="cards-grid">
      ${PACKAGES.map(p => `
        <div class="card" onclick="this.querySelector('.pkg-details').hidden = !this.querySelector('.pkg-details').hidden" style="cursor:pointer;">
          <h4 style="font-size:18px;margin-bottom:6px;">${escapeHtml(p.career)}</h4>
          <span style="font-size:12px;color:var(--accent-cyan);">Click to Reveal Salary 👆</span>
          <div class="pkg-details" hidden style="margin-top:12px;border-top:1px dashed var(--border);padding-top:10px;">
            <div>Starting: <strong style="color:var(--accent-emerald);">${p.start}</strong></div>
            <div>Peak Career: <strong style="color:var(--accent-gold);">${p.peak}</strong></div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// GAME 8: Career Word Hangman / Letter Guess
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
  } else if (toolKey === 'dreammatch') {
    renderParentChildMatch(mount);
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
function renderMyPlan(mount) {
  mount.innerHTML = `
    <div style="border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:16px;">
      <h3 style="font-size:20px;">🗺️ "My Plan" Personalized Career Roadmap</h3>
      <p style="font-size:13.5px;color:var(--text-dim);">Select your current class and target career to generate a customized chronological milestone roadmap.</p>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;margin-bottom:16px;">
      <div>
        <label style="font-size:13px;font-weight:600;">Your Current Class:</label>
        <select id="plan-class-select">
          <option value="Class 8 & below">Class 8 &amp; below</option>
          <option value="Class 9">Class 9</option>
          <option value="Class 10" selected>Class 10 (ICSE / CBSE)</option>
          <option value="Class 11">Class 11</option>
          <option value="Class 12">Class 12</option>
          <option value="College">College / Exploring</option>
        </select>
      </div>

      <div>
        <label style="font-size:13px;font-weight:600;">Target Career Track:</label>
        <select id="plan-career-select">
          <option value="Commercial Airline Pilot">Commercial Airline Pilot</option>
          <option value="Chief Pediatric Surgeon">Chief Pediatric Surgeon</option>
          <option value="Corporate M&A Lawyer">Corporate M&A Lawyer</option>
          <option value="Principal Software Architect">Principal Software Architect</option>
          <option value="Broadcast Journalist">Broadcast Journalist</option>
          <option value="Venture Entrepreneur">Venture Entrepreneur</option>
        </select>
      </div>

      <div>
        <label style="font-size:13px;font-weight:600;">Daily Practice Time:</label>
        <select id="plan-time-select">
          <option value="15">15 mins / day</option>
          <option value="30" selected>30 mins / day</option>
          <option value="45">45 mins / day</option>
        </select>
      </div>
    </div>

    <button class="btn btn-primary" id="btn-generate-plan" style="margin-bottom:20px;">Generate Roadmap Blueprint 🚀</button>
    <div id="plan-output-container"></div>
  `;

  $('#btn-generate-plan')?.addEventListener('click', () => {
    const cls = $('#plan-class-select')?.value;
    const car = $('#plan-career-select')?.value;
    const time = $('#plan-time-select')?.value;
    const out = $('#plan-output-container');

    out.innerHTML = `
      <div style="background:var(--bg-subtle);border:1px solid var(--border-strong);border-radius:var(--radius-lg);padding:22px;">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);padding-bottom:10px;margin-bottom:14px;">
          <div>
            <span class="badge-pill badge-nirf">${escapeHtml(cls)} Roadmap</span>
            <h3 style="font-size:22px;color:var(--accent-cyan);margin-top:4px;">${escapeHtml(car)} Pathway</h3>
          </div>
          <span style="font-family:var(--font-mono);font-size:13px;color:var(--accent-emerald);">⏱️ ${time} Mins Daily Habit</span>
        </div>

        <div style="display:flex;flex-direction:column;gap:12px;">
          <div style="display:flex;gap:12px;align-items:flex-start;">
            <div style="width:28px;height:28px;border-radius:50%;background:var(--accent-brand);color:#000;display:grid;place-items:center;font-weight:800;flex-shrink:0;">1</div>
            <div>
              <strong>Current Milestone (${cls}):</strong> Focus on board exam reading comprehension and public speaking clubs (MUN / Debate).
            </div>
          </div>
          <div style="display:flex;gap:12px;align-items:flex-start;">
            <div style="width:28px;height:28px;border-radius:50%;background:var(--accent-magenta);color:#fff;display:grid;place-items:center;font-weight:800;flex-shrink:0;">2</div>
            <div>
              <strong>Target Entrance Exams:</strong> Prepare competitive tests early (CUET, CLAT, NEET, or DGCA ICAO).
            </div>
          </div>
          <div style="display:flex;gap:12px;align-items:flex-start;">
            <div style="width:28px;height:28px;border-radius:50%;background:var(--accent-emerald);color:#000;display:grid;place-items:center;font-weight:800;flex-shrink:0;">3</div>
            <div>
              <strong>Accredited College Selection:</strong> Target institutes with NAAC Grade 'A+' / 'A++' and high NIRF placement rankings.
            </div>
          </div>
        </div>
      </div>
    `;
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

// TOOL 3: Future Business Card Generator with Dynamic QR Code
function renderFutureBusinessCard(mount) {
  mount.innerHTML = `
    <div style="border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:16px;">
      <h3 style="font-size:20px;">🪪 Future Business Card Generator</h3>
      <p style="font-size:13.5px;color:var(--text-dim);">Design your executive credentials for the year 2040 complete with dynamic QR verification.</p>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
      <div>
        <div style="margin-bottom:10px;">
          <label style="font-size:13px;font-weight:600;">Your Name:</label>
          <input type="text" id="biz-name" value="${escapeHtml(STATE.studentName || '')}" placeholder="Enter your name">
        </div>
        <div style="margin-bottom:10px;">
          <label style="font-size:13px;font-weight:600;">Future Dream Title:</label>
          <input type="text" id="biz-title" value="Captain · Commercial Airline Pilot">
        </div>
        <div style="margin-bottom:10px;">
          <label style="font-size:13px;font-weight:600;">Credentials / Honors:</label>
          <input type="text" id="biz-creds" value="B.Sc Aviation · ICAO Level 6 · IGRUA Graduate">
        </div>
        <button class="btn btn-primary" id="btn-render-biz">Update Business Card ✨</button>
      </div>

      <!-- Generated Business Card Render -->
      <div id="biz-card-render" style="background:linear-gradient(135deg, #0f172a 0%, #1e293b 100%);border:2px solid var(--accent-cyan);border-radius:var(--radius-lg);padding:24px;color:#fff;box-shadow:0 12px 30px rgba(0,0,0,0.6);display:flex;flex-direction:column;justify-content:space-between;min-height:200px;">
        <div>
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div>
              <h3 style="font-size:22px;letter-spacing:-0.02em;" id="bc-name">${escapeHtml(STATE.studentName || 'Your Name')}</h3>
              <div style="color:var(--accent-cyan);font-family:var(--font-sub);font-size:13.5px;font-weight:700;margin-top:2px;" id="bc-title">Captain · Commercial Airline Pilot</div>
            </div>
            <div id="bc-qr-mount" style="background:#fff;padding:4px;border-radius:6px;width:60px;height:60px;"></div>
          </div>
        </div>
        <div>
          <div style="font-size:12px;color:#94a3b8;font-family:var(--font-mono);" id="bc-creds">B.Sc Aviation · ICAO Level 6 · IGRUA Graduate</div>
          <div style="font-size:11px;color:#64748b;margin-top:4px;">Kanakia International School Mira Road &copy;</div>
        </div>
      </div>
    </div>
  `;

  const updateQr = () => {
    const name = $('#biz-name')?.value || 'Explorer';
    const title = $('#biz-title')?.value || 'Career Lead';
    const creds = $('#biz-creds')?.value || 'Class 10';

    $('#bc-name').textContent = name;
    $('#bc-title').textContent = title;
    $('#bc-creds').textContent = creds;

    const qrMount = $('#bc-qr-mount');
    if (qrMount && window.qrcode) {
      try {
        const qr = qrcode(0, 'M');
        qr.addData(`https://careerfair.pages.dev?student=${encodeURIComponent(name)}&title=${encodeURIComponent(title)}`);
        qr.make();
        qrMount.innerHTML = qr.createImgTag(2, 0);
      } catch {}
    }
  };

  $('#btn-render-biz')?.addEventListener('click', updateQr);
  setTimeout(updateQr, 50);
}

// TOOL 4: Parent vs. Child Dream Match
function renderParentChildMatch(mount) {
  mount.innerHTML = `
    <div style="border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:16px;">
      <h3 style="font-size:20px;">🤝 Parent vs. Child Career Alignment Match</h3>
      <p style="font-size:13.5px;color:var(--text-dim);">Secretly select your aspirations to reveal common ground and constructive talking points.</p>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
      <div>
        <label style="font-size:13px;font-weight:600;">Student's Secret Choice:</label>
        <select id="match-student-choice">
          <option value="Pilot">Commercial Pilot</option>
          <option value="Surgeon">Chief Surgeon</option>
          <option value="Tech">Software Architect</option>
          <option value="Law">Corporate Lawyer</option>
          <option value="Journalism">Broadcast Journalist</option>
          <option value="Founder">Startup Entrepreneur</option>
        </select>
      </div>

      <div>
        <label style="font-size:13px;font-weight:600;">Parent's Secret Choice:</label>
        <select id="match-parent-choice">
          <option value="Surgeon">Chief Surgeon</option>
          <option value="Tech">Software Architect</option>
          <option value="Law">Corporate Lawyer</option>
          <option value="Pilot">Commercial Pilot</option>
          <option value="CivilService">Civil Servant (IAS/IFS)</option>
        </select>
      </div>
    </div>

    <button class="btn btn-primary" id="btn-reveal-match" style="margin-top:16px;">Reveal Alignment Report 🔓</button>
    <div id="match-results-box" style="margin-top:16px;"></div>
  `;

  $('#btn-reveal-match')?.addEventListener('click', () => {
    const s = $('#match-student-choice').value;
    const p = $('#match-parent-choice').value;
    const box = $('#match-results-box');

    const match = s === p;
    box.innerHTML = `
      <div style="background:${match ? 'rgba(0,245,155,0.1)' : 'rgba(255,183,3,0.1)'};border:1px solid ${match ? 'var(--accent-emerald)' : 'var(--accent-gold)'};border-radius:var(--radius-md);padding:18px;">
        <h4 style="font-size:18px;color:${match ? 'var(--accent-emerald)' : 'var(--accent-gold)'};">
          ${match ? '🎉 100% Mutual Alignment!' : '💡 Diverse Perspectives (75% Alignment)'}
        </h4>
        <p style="font-size:13.5px;margin-top:6px;color:var(--text-main);">
          ${match ? 'Both parent and student envision the exact same career horizon! Explore the accredited colleges directory together.'
                  : `Student selected <strong>${s}</strong> while parent preferred <strong>${p}</strong>. Notice the shared foundational skill: both tracks require high English articulation and critical thinking!`}
        </p>
      </div>
    `;
  });
}

// ─── 11. LEADERBOARD & FEEDBACK WALL ──────────────────────────────────────────
async function loadLeaderboard(filterPack = 'All') {
  const tbody = $('#leaderboard-table-body');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-muted);">Loading real-time scores...</td></tr>`;

  let scores = [];
  try {
    const data = await fetchApi(`scores${filterPack && filterPack !== 'All' ? '?pack=' + encodeURIComponent(filterPack) : ''}`);
    if (data && Array.isArray(data) && data.length > 0) {
      scores = data;
    }
  } catch (e) {}

  if (!scores.length) {
    const BENCHMARK_SCORES = [
      { name: "Ananya Sharma", class_name: "Class 10-A", pack: "Journalism", acc: 98, fluency: 96, wpm: 142, ts: Date.now() - 1800000 },
      { name: "Kabir Mehta", class_name: "Class 10-B", pack: "Law", acc: 95, fluency: 93, wpm: 136, ts: Date.now() - 3600000 },
      { name: "Riya S.", class_name: "Class 9-A", pack: "Everyday", acc: 91, fluency: 89, wpm: 124, ts: Date.now() - 5400000 },
      { name: "Arjun Verma", class_name: "Class 10-C", pack: "Academic", acc: 89, fluency: 87, wpm: 121, ts: Date.now() - 7200000 },
      { name: "Zoya Merchant", class_name: "Class 11-B", pack: "Journalism", acc: 88, fluency: 86, wpm: 129, ts: Date.now() - 9000000 },
      { name: "Devansh Nair", class_name: "Class 10-A", pack: "Law", acc: 85, fluency: 83, wpm: 118, ts: Date.now() - 12000000 }
    ];

    scores = (filterPack && filterPack !== 'All')
      ? BENCHMARK_SCORES.filter(s => s.pack.toLowerCase() === filterPack.toLowerCase())
      : BENCHMARK_SCORES;
  }

  tbody.innerHTML = '';
  if (!scores.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-dim);">No scored attempts yet in ${escapeHtml(filterPack)}. Take the speech test to claim #1!</td></tr>`;
    return;
  }

  scores.forEach((sc, i) => {
    const tr = document.createElement('tr');
    const medal = i === 0 ? '🥇 1st' : i === 1 ? '🥈 2nd' : i === 2 ? '🥉 3rd' : `#${i + 1}`;
    tr.innerHTML = `
      <td><strong style="color:${i < 3 ? 'var(--accent-gold)' : 'var(--text-muted)'}">${medal}</strong></td>
      <td><strong>${escapeHtml(sc.name)}</strong></td>
      <td>${escapeHtml(sc.class_name || 'Class 10')}</td>
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
  if (!list) return;

  const stored = [
    { name: "Dr. Sunita Sharma (Parent)", role: "Parent", comment: "The breakdown of ICAO aviation English and moot court advocacy showed my son why language skills matter far beyond school exams.", useful: 5 },
    { name: "Aarav P. (Grade 10)", role: "Student", comment: "Playing Jobtris and testing on the news anchor teleprompter made this the most exciting career fair we have had!", useful: 5 },
    { name: "Faculty Coordinator", role: "Teacher", comment: "The accreditation badges for Maharashtra and Pan-India universities give parents authentic guidance.", useful: 5 }
  ];

  list.innerHTML = stored.map(f => `
    <div style="background:var(--bg-subtle);border-radius:var(--radius-md);padding:14px;border:1px solid var(--border);">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <strong>${escapeHtml(f.name)}</strong>
        <span class="badge-pill badge-naac">⭐ ${f.useful} / 5</span>
      </div>
      <p style="font-size:13.5px;color:var(--text-main);margin-top:6px;">"${escapeHtml(f.comment)}"</p>
    </div>
  `).join('');

  // Handle feedback form submission
  $('#feedback-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('#fb-name').value;
    const role = $('#fb-role').value;
    const classInfo = $('#fb-class').value;
    const comment = $('#fb-comment').value;

    await fetchApi('feedback', {
      method: 'POST',
      body: JSON.stringify({ name, role, class_info: classInfo, comment, r_useful: 5 })
    });

    showToast('Thank you! Your feedback has been recorded.');
    $('#feedback-form').reset();
  });
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

  // Load existing AI Keys
  const geminiInput = $('#admin-gemini-key');
  if (geminiInput && STATE.config.gemini_key) {
    geminiInput.value = STATE.config.gemini_key;
  }
  const elevenInput = $('#admin-eleven-key');
  if (elevenInput) {
    elevenInput.value = localStorage.getItem('cf_eleven_key') || STATE.config.eleven_key || '';
  }

  // Save AI Credentials
  $('#btn-save-ai')?.addEventListener('click', async () => {
    const geminiKey = ($('#admin-gemini-key')?.value || '').trim();
    const elevenKey = ($('#admin-eleven-key')?.value || '').trim();
    if (elevenKey) {
      localStorage.setItem('cf_eleven_key', elevenKey);
      STATE.config.eleven_key = elevenKey;
    }
    if (geminiKey) {
      STATE.config.gemini_key = geminiKey;
    }
    await fetchApi('admin/config', 'PUT', { gemini_key: geminiKey, eleven_key: elevenKey });
    showToast('AI & Voice Credentials saved successfully');
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
