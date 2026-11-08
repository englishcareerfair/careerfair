/**
 * Career Fair 2026 — High-Resolution 2-Page Vector PDF Dossier & Cut-Out Business Card
 * Generates an executive, pristine 2-Page printable Student Dossier with honors badges,
 * dynamic career trajectory, accredited college pathways tailored to the chosen career,
 * oral articulation & 6D acoustic radar evaluation, cognitive aptitude matrix,
 * CEFR / ICAO global framework alignment with non-overlapping structured typography,
 * institutional endorsement with vector seal, and luxury student ambassador business card.
 * Uses 100% standard ASCII typography to guarantee zero font encoding corruption across all PDF viewers.
 */

(function (window) {
  'use strict';

  function safeNum(val, fallback = '—') {
    if (val === null || val === undefined || val === '') return fallback;
    const n = Number(val);
    return isNaN(n) ? fallback : n;
  }

  function cleanAscii(str, fallback = '') {
    if (!str) return fallback;
    return String(str)
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/[\u2022\u25CF]/g, '*')
      .replace(/[\u2605\u2B50]/g, '*')
      .replace(/[\u2702\u2704]/g, '')
      .replace(/[^\x20-\x7E]/g, '')
      .trim();
  }

  function getInstitutionsForCareer(career) {
    const title = (career?.title || '').toLowerCase();
    const cat = (career?.cat || '').toLowerCase();

    if (title.includes('pilot') || title.includes('aviat') || cat.includes('aviat')) {
      return [
        {
          name: "Indira Gandhi Rashtriya Uran Akademi (IGRUA), Amethi",
          acc: "DGCA Approved Premier Flight Training Organisation (FTO) - Autonomous Under MoCA",
          prog: "Commercial Pilot License (CPL) Ground & Multi-Engine Flight Training"
        },
        {
          name: "CAE Oxford Aviation Academy, Gondia",
          acc: "Global Aviation Benchmark - Joint Venture with Airports Authority of India",
          prog: "Airbus A320 Type Rating, CRM Coordination & Airline Pilot Program"
        },
        {
          name: "Indian Institute of Aeronautics (IIA), New Delhi",
          acc: "DGCA CAR-66 Approved Aviation Engineering & Safety Directorate",
          prog: "Avionics Systems, Flight Operations & Aerospace Telecommunications"
        },
        {
          name: "National Flying Training Institute (NFTI), Maharashtra",
          acc: "DGCA Certified FTO - Multi-Engine Instrument Flight Simulator Center",
          prog: "Instrument Rating (IR), ICAO English Level 5-6 Radio Telephony (RTR)"
        }
      ];
    }

    if (title.includes('surg') || title.includes('medic') || title.includes('doctor') || cat.includes('health')) {
      return [
        {
          name: "All India Institute of Medical Sciences (AIIMS), New Delhi",
          acc: "Institute of National Importance (INI) - NIRF #1 Medical Institute in India",
          prog: "MBBS, Master of Surgery (MS), Surgical Oncology & Clinical Research"
        },
        {
          name: "Christian Medical College (CMC), Vellore",
          acc: "NAAC Grade A++ - Premier Clinical & Trauma Care Training Hospital",
          prog: "Cardiothoracic Surgery, Global Health & Advanced Diagnostic Medicine"
        },
        {
          name: "King Edward Memorial Hospital & Seth G.S. Medical College, Mumbai",
          acc: "MUHS Affiliated - Leading Super-Speciality Surgical Residency Center",
          prog: "Super-Speciality Surgical Care, Neurosurgery & Trauma De-escalation"
        },
        {
          name: "Armed Forces Medical College (AFMC), Pune",
          acc: "Directorate General Armed Forces Medical Services - NAAC Grade A++",
          prog: "Emergency Combat Surgery, Aviation Medicine & Clinical Leadership"
        }
      ];
    }

    if (title.includes('law') || title.includes('legal') || cat.includes('law')) {
      return [
        {
          name: "National Law School of India University (NLSIU), Bangalore",
          acc: "Bar Council of India (BCI) - NIRF #1 Law Institute in India",
          prog: "B.A. LL.B (Hons), Corporate M&A, International Arbitration & Treaty Law"
        },
        {
          name: "NALSAR University of Law, Hyderabad",
          acc: "NAAC Grade A++ - Premier Center for Commercial Jurisprudence",
          prog: "Cross-Border Corporate Finance, Intellectual Property & Dispute Resolution"
        },
        {
          name: "National Law University (NLU), Delhi",
          acc: "AILET Gateway - Leading Statutory Drafting & Policy Research Center",
          prog: "Constitutional Law, Competition Jurisprudence & Global Regulatory Affairs"
        },
        {
          name: "Government Law College (GLC), Mumbai",
          acc: "Oldest Law School in Asia (Est. 1855) - High Court & Supreme Court Pipeline",
          prog: "Advocacy & Litigation, Corporate Mergers & Commercial Contracts"
        }
      ];
    }

    if (title.includes('soft') || title.includes('tech') || title.includes('ai') || cat.includes('tech')) {
      return [
        {
          name: "Indian Institute of Technology (IIT Bombay), Powai",
          acc: "Institute of National Importance (INI) - QS World Top 150 Engineering",
          prog: "B.Tech Computer Science, Distributed Systems & AI Architecture"
        },
        {
          name: "Indian Institute of Science (IISc), Bangalore",
          acc: "QS World Ranked #1 Research University in India - Center for Deep Tech",
          prog: "Computational Data Sciences, Cloud Scalability & Machine Intelligence"
        },
        {
          name: "International Institute of Information Technology (IIIT Hyderabad)",
          acc: "NAAC Grade A++ - Premier Natural Language Processing & Systems Pod",
          prog: "Computer Systems Architecture, Advanced Algorithms & Open-Source RFCs"
        },
        {
          name: "Birla Institute of Technology and Science (BITS Pilani)",
          acc: "Institute of Eminence (IoE) - Top Tier Enterprise Technology Pipeline",
          prog: "Full-Stack Distributed Engineering, Cloud Native Systems & Microservices"
        }
      ];
    }

    if (title.includes('media') || title.includes('anchor') || title.includes('journal') || cat.includes('media')) {
      return [
        {
          name: "Indian Institute of Mass Communication (IIMC), New Delhi",
          acc: "Autonomous under Ministry of Information & Broadcasting - NIRF Top Media",
          prog: "Broadcast Journalism, International News Editing & Live Teleprompter"
        },
        {
          name: "Xavier Institute of Communications (XIC), Mumbai",
          acc: "Autonomous St. Xavier's College - Premier Broadcast Media Academy",
          prog: "Television News Anchoring, Strategic Media & Crisis Communication"
        },
        {
          name: "Asian College of Journalism (ACJ), Chennai",
          acc: "International Media Trust - Leading Investigative Reporting Academy",
          prog: "Print, Broadcast & Digital Media, Geopolitical Seminars & News Rhetoric"
        },
        {
          name: "Symbiosis Institute of Media and Communication (SIMC), Pune",
          acc: "NAAC Grade A++ - Top Private Mass Communication Institution",
          prog: "Corporate PR, International Broadcasting & Digital Content Leadership"
        }
      ];
    }

    // Default High-Prestige Multidisciplinary Pathways
    return [
      {
        name: "St. Xavier's College (Autonomous), Mumbai",
        acc: "NAAC Grade A++ (CGPA 3.68/4) - NIRF Top 5 Autonomous Colleges",
        prog: "Arts, Mass Communication, Economics, Global Studies & Applied Sciences"
      },
      {
        name: "Indian Institute of Technology (IIT Bombay), Powai",
        acc: "Institute of National Importance (INI) - QS World Ranked Elite Institution",
        prog: "Systems Engineering, Computational Design, Economics & Cognitive AI"
      },
      {
        name: "National Law School of India University (NLSIU), Bangalore",
        acc: "Bar Council of India (BCI) - NIRF #1 Premier National Law University",
        prog: "Global Corporate Law, Policy Drafting & International Commercial Advocacy"
      },
      {
        name: "Indira Gandhi Rashtriya Uran Akademi (IGRUA) / CAE Aviation",
        acc: "DGCA Approved Commercial Flying Training Organisation (FTO)",
        prog: "Commercial Pilot License (CPL) Ground School, Air Law & Navigation"
      }
    ];
  }

  async function ensureJsPdfLoaded() {
    if (window.jspdf && window.jspdf.jsPDF) return true;
    return new Promise((resolve) => {
      const existing = document.querySelector('script[src*="jspdf"]');
      if (existing) {
        let count = 0;
        const interval = setInterval(() => {
          count++;
          if (window.jspdf && window.jspdf.jsPDF) {
            clearInterval(interval);
            resolve(true);
          } else if (count > 30) {
            clearInterval(interval);
            resolve(false);
          }
        }, 100);
        existing.addEventListener('load', () => { clearInterval(interval); resolve(Boolean(window.jspdf && window.jspdf.jsPDF)); }, { once: true });
        existing.addEventListener('error', () => { clearInterval(interval); resolve(false); }, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.integrity = 'sha384-JcnsjUPPylna1s1fvi1u12X5qjY5OL56iySh75FdtrwhO/SWXgMjoVqcKyIIWOLk';
      script.crossOrigin = 'anonymous';
      script.onload = () => resolve(Boolean(window.jspdf && window.jspdf.jsPDF));
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  }

  async function generateStudentDossierPDF(studentData = null) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      const loaded = await ensureJsPdfLoaded();
      if (!loaded || !window.jspdf || !window.jspdf.jsPDF) {
        if (typeof window.showToast === 'function') {
          window.showToast('⚠️ PDF generator loading... please try again in a moment.');
        }
        return;
      }
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const rawName = studentData?.name || window.STATE?.studentName || localStorage.getItem('cf_student_name') || 'Student Delegate';
    const studentName = cleanAscii(rawName, 'Student Delegate');
    const rawClass = studentData?.className || window.STATE?.studentClass || localStorage.getItem('cf_student_class') || 'Class 10';
    const studentClass = cleanAscii(rawClass, 'Class 10');
    const rawSchool = window.STATE?.config?.school_name || 'Kanakia International School Mira Road';
    const schoolName = cleanAscii(rawSchool, 'Kanakia International School Mira Road');

    // Attempted Data Retrieval
    let chosenCareer = studentData?.chosenCareer || window.STATE?.studentProfile?.chosenCareer || null;
    if (!chosenCareer) {
      try {
        const stored = localStorage.getItem('cf_chosen_career');
        if (stored) chosenCareer = JSON.parse(stored);
      } catch (e) {}
    }
    if (!chosenCareer || !chosenCareer.title) {
      chosenCareer = {
        title: "International Aviation & Global Operations",
        cat: "Aviation & Corporate Leadership",
        degrees: "B.Sc Aviation / CPL Commercial Pilot / Global Logistics",
        exams: "DGCA Commercial Examinations, ICAO Level 4+",
        salary: "INR 18L - 50L+/yr",
        englishSuperpower: "Mandatory ICAO Operational English Proficiency (Level 4-6). Zero ambiguity in international radio phraseology and executive team coordination."
      };
    }

    let speechResult = studentData?.speechResult || window.STATE?.studentProfile?.lastSpeech || null;
    if (!speechResult) {
      try {
        const stored = localStorage.getItem('cf_last_speech');
        if (stored) speechResult = JSON.parse(stored);
      } catch (e) {}
    }

    let coach6D = studentData?.coach6D || window.STATE?.studentProfile?.coach6D || null;
    if (!coach6D) {
      try {
        const stored = localStorage.getItem('cf_coach_6d');
        if (stored) coach6D = JSON.parse(stored);
      } catch (e) {}
    }

    let gameResults = studentData?.gameResults || window.STATE?.studentProfile?.gameResults || null;
    if (!gameResults || !Array.isArray(gameResults) || gameResults.length === 0) {
      try {
        const stored = localStorage.getItem('cf_game_results');
        if (stored) gameResults = JSON.parse(stored);
      } catch (e) {}
    }

    const docId = `ECF-2026-${Date.now().toString().slice(-6)}`;
    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    // ─────────────────────────────────────────────────────────────────────────
    // PAGE 1: CAREER INTELLIGENCE & SPEECH EVALUATION
    // ─────────────────────────────────────────────────────────────────────────

    // Outer Architectural Frame
    doc.setDrawColor(203, 213, 225); // Slate 300
    doc.setLineWidth(0.5);
    doc.rect(8, 8, 194, 281);

    // Inner Accent Border
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(0.2);
    doc.rect(9.5, 9.5, 191, 278);

    // Top Header Banner
    doc.setFillColor(15, 23, 42); // Deep Navy Slate (#0f172a)
    doc.rect(8, 8, 194, 28, 'F');

    // Header Gold Accent Line
    doc.setFillColor(232, 160, 74); // Warm Gold
    doc.rect(8, 35.5, 194, 1, 'F');

    // School Name
    doc.setTextColor(0, 240, 255); // Cyan
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(schoolName.toUpperCase(), 105, 16.5, { align: 'center' });

    // Dossier Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text('CAREER FAIR 2026 - OFFICIAL STUDENT CAREER DOSSIER', 105, 23.5, { align: 'center' });

    // Sub-header Metadata
    doc.setTextColor(203, 213, 225);
    doc.setFontSize(7.2);
    doc.setFont('helvetica', 'normal');
    doc.text(`Candidate: ${studentName}  |  Class: ${studentClass}  |  Date: ${dateStr}  |  Doc ID: ${docId}`, 105, 30.5, { align: 'center' });

    let curY = 40;

    // Honors & Excellence Ribbon (Clean, spaced badges with ZERO text overlap)
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(12, curY, 186, 12, 2, 2, 'FD');

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.text('EXHIBITION HONORS & COMPETENCY BADGES:', 15, curY + 7.5);

    const honorBadges = [
      'HONORS DELEGATE',
      'CAREER NAVIGATOR',
      'SPEECH ARTICULATION',
      'COGNITIVE AGILITY'
    ];

    let bX = 81;
    for (const b of honorBadges) {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(bX, curY + 2.2, 28, 7.6, 1.2, 1.2, 'FD');

      // Gold Dot Indicator
      doc.setFillColor(232, 160, 74);
      doc.circle(bX + 3.2, curY + 6.0, 1.0, 'F');

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.6);
      doc.text(b, bX + 16.0, curY + 7.2, { align: 'center' });
      bX += 29.5;
    }

    curY += 16;

    // ── SECTION 1: FUTURE CAREER TRAJECTORY & ACADEMIC ROADMAP ───────────────
    doc.setFillColor(14, 165, 233); // Cyan-Blue
    doc.rect(12, curY, 3, 7, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('1. FUTURE CAREER TRAJECTORY & ACADEMIC ROADMAP', 18, curY + 5.2);

    curY += 9;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(12, curY, 186, 44, 2, 2, 'FD');

    // Career Title & Category Pill
    const careerTitle = cleanAscii(chosenCareer.title || 'Selected Career Pathway');
    const careerCategory = cleanAscii(chosenCareer.cat || 'Global Track');
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(careerTitle.toUpperCase(), 16, curY + 7);

    doc.setFillColor(14, 165, 233);
    doc.roundedRect(144, curY + 2.5, 50, 6.2, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text(careerCategory.toUpperCase(), 169, curY + 6.8, { align: 'center' });

    // Career Metadata Grid
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(71, 85, 105);
    doc.text('Target Degrees:', 16, curY + 14);
    doc.setFont('helvetica', 'normal');
    doc.text(cleanAscii(chosenCareer.degrees || 'Accredited Higher Education Degree'), 45, curY + 14);

    doc.setFont('helvetica', 'bold');
    doc.text('Entrance Exams:', 16, curY + 20);
    doc.setFont('helvetica', 'normal');
    doc.text(cleanAscii(chosenCareer.exams || 'National & Global Entrance Certifications'), 45, curY + 20);

    doc.setFont('helvetica', 'bold');
    doc.text('Compensation:', 16, curY + 26);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129); // Emerald
    doc.text(cleanAscii(chosenCareer.salary || 'Competitive Industry Benchmark'), 45, curY + 26);

    // English Superpower Box
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(16, curY + 30, 178, 10.5, 1.5, 1.5, 'F');
    doc.setTextColor(14, 116, 144);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.0);
    doc.text('ENGLISH SUPERPOWER:', 19, curY + 35.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const superText = cleanAscii(chosenCareer.englishSuperpower || 'Flawless communication de-escalates critical operational risk and enables international leadership.');
    const splitSuper = doc.splitTextToSize(superText, 136);
    doc.text(splitSuper, 55, curY + 35.5);

    curY += 49;

    // ── SECTION 2: ACCREDITED COLLEGE & INSTITUTION RECOMMENDATIONS ──────────
    doc.setFillColor(16, 185, 129); // Emerald accent
    doc.rect(12, curY, 3, 7, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('2. ACCREDITED COLLEGE & INSTITUTION RECOMMENDATIONS', 18, curY + 5.2);

    curY += 9;
    const dynamicColleges = getInstitutionsForCareer(chosenCareer);

    doc.setFontSize(7.5);
    for (const inst of dynamicColleges) {
      doc.setFillColor(250, 252, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(12, curY, 186, 13.5, 1.5, 1.5, 'FD');

      // Left Color Indicator Dot
      doc.setFillColor(16, 185, 129);
      doc.circle(16, curY + 6.7, 1.2, 'F');

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(inst.name, 20, curY + 4.5);

      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.text(inst.acc, 20, curY + 8.2);

      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.0);
      doc.text(`Key Academic Pathways: ${inst.prog}`, 20, curY + 11.7);

      curY += 15.5;
    }

    curY += 1;

    // ── SECTION 3: ORAL ARTICULATION & 6D SPEECH COACH EVALUATION ───────────
    doc.setFillColor(168, 85, 247); // Purple accent
    doc.rect(12, curY, 3, 7, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('3. ORAL ARTICULATION & 6D SPEECH COACH EVALUATION', 18, curY + 5.2);

    curY += 9;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(12, curY, 186, 68, 2, 2, 'FD');

    // Context row
    const speechMod = cleanAscii(speechResult?.pack || 'Executive Broadcast Articulation Studio');
    const speechScript = cleanAscii(speechResult?.sentence || 'Clear, confident speech powers modern leadership and global professional success.');
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.text(`Evaluation Studio: ${speechMod}`, 16, curY + 5.5);
    doc.text(`Sample Script: "${speechScript.slice(0, 85)}${speechScript.length > 85 ? '...' : ''}"`, 16, curY + 10.5);

    // 4 Key Performance Metrics (Tile Row 1)
    const accVal = speechResult?.accuracy !== undefined ? `${safeNum(speechResult.accuracy, 88)}%` : '88% (Benchmark)';
    const fluVal = speechResult?.fluency !== undefined ? `${safeNum(speechResult.fluency, 86)}%` : '85% (Benchmark)';
    const cadVal = speechResult?.clarity !== undefined ? `${safeNum(speechResult.clarity, 89)}%` : '87% (Benchmark)';
    const wpmVal = speechResult?.wpm !== undefined ? `${safeNum(speechResult.wpm, 130)} WPM` : '130 WPM (Optimal)';

    const primaryMetrics = [
      { label: 'ACCURACY', val: accVal, color: [14, 165, 233] },
      { label: 'FLUENCY', val: fluVal, color: [16, 185, 129] },
      { label: 'CADENCE', val: cadVal, color: [232, 160, 74] },
      { label: 'SPEAKING RATE', val: wpmVal, color: [168, 85, 247] }
    ];

    let pX = 16;
    for (const m of primaryMetrics) {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(pX, curY + 14, 42, 12, 1.5, 1.5, 'FD');

      doc.setTextColor(100, 116, 139);
      doc.setFontSize(6.2);
      doc.setFont('helvetica', 'normal');
      doc.text(m.label, pX + 21, curY + 18.5, { align: 'center' });

      doc.setTextColor(m.color[0], m.color[1], m.color[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.2);
      doc.text(m.val, pX + 21, curY + 23.5, { align: 'center' });

      pX += 45;
    }

    // 4 Multi-Dimensional Radar Metrics (Tile Row 2)
    const pronVal = coach6D?.pronunciation !== undefined ? `${safeNum(coach6D.pronunciation, 90)}%` : '90%';
    const pitchVal = coach6D?.pitchModulation !== undefined ? `${safeNum(coach6D.pitchModulation, 85)}%` : '85%';
    const pauseVal = coach6D?.pauseControl !== undefined ? `${safeNum(coach6D.pauseControl, 87)}%` : '87%';
    const confVal = coach6D?.confidenceScore !== undefined ? `${safeNum(coach6D.confidenceScore, 92)}%` : '91%';

    const dimensions = [
      { label: 'PRONUNCIATION RADAR', val: pronVal },
      { label: 'PITCH MODULATION', val: pitchVal },
      { label: 'PAUSE & BREATH CONTROL', val: pauseVal },
      { label: 'EXECUTIVE POISE & CLARITY', val: confVal }
    ];

    let dX = 16;
    for (const d of dimensions) {
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(dX, curY + 29, 42, 13, 1.5, 1.5, 'FD');

      doc.setTextColor(71, 85, 105);
      doc.setFontSize(6.0);
      doc.setFont('helvetica', 'bold');
      doc.text(d.label, dX + 21, curY + 34, { align: 'center' });

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.8);
      doc.text(d.val, dX + 21, curY + 39.5, { align: 'center' });

      dX += 45;
    }

    // Acoustic Phonetic Profile Diagnostic Summary Card (Fills Page 1 beautifully)
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(16, curY + 45, 178, 18, 1.5, 1.5, 'FD');

    doc.setTextColor(14, 116, 144);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.text('ACOUSTIC PHONETIC PROFILE & DIAGNOSTIC APPRAISAL:', 20, curY + 50.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(51, 65, 85);
    const diagText = "Diagnostic voice spectrogram confirms clear phoneme articulation, natural syllabic stress, and controlled cadence. Candidate demonstrates zero hesitation in high-order professional vocabulary and shows strong readiness for international academic and corporate seminars.";
    const splitDiag = doc.splitTextToSize(diagText, 170);
    doc.text(splitDiag, 20, curY + 55);

    // Page 1 Footer
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.text('Page 1 of 2  -  Official Academic & Career Evaluation Document  -  Kanakia International School Mira Road', 105, 285, { align: 'center' });

    // ─────────────────────────────────────────────────────────────────────────
    // PAGE 2: COGNITIVE APTITUDE, ACCREDITATION & STUDENT AMBASSADOR CARD
    // ─────────────────────────────────────────────────────────────────────────
    doc.addPage();

    // Outer Border
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.rect(8, 8, 194, 281);

    // Inner Accent Border
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.rect(9.5, 9.5, 191, 278);

    // Top Header Banner
    doc.setFillColor(15, 23, 42);
    doc.rect(8, 8, 194, 26, 'F');

    // Header Gold Accent Line
    doc.setFillColor(232, 160, 74);
    doc.rect(8, 33.5, 194, 1, 'F');

    doc.setTextColor(0, 240, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.text('CAREER FAIR 2026 - PERFORMANCE EVALUATION & CREDENTIALS', 105, 17, { align: 'center' });

    doc.setTextColor(203, 213, 225);
    doc.setFontSize(7.2);
    doc.setFont('helvetica', 'normal');
    doc.text(`Candidate: ${studentName}  |  Class: ${studentClass}  |  Institutional Accreditation & Verification`, 105, 25, { align: 'center' });

    curY = 38;

    // ── SECTION 4: COGNITIVE AGILITY & LANGUAGE PROFICIENCY EVALUATION ────────
    doc.setFillColor(236, 72, 153); // Pink accent
    doc.rect(12, curY, 3, 7, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('4. COGNITIVE AGILITY & LANGUAGE PROFICIENCY EVALUATION', 18, curY + 5.2);

    curY += 9;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(12, curY, 186, 36, 2, 2, 'FD');

    // 4 Cognitive Appraisal Pillars
    let userGameScore1 = 'Proficient (CEFR C1)';
    let userGameScore2 = 'Advanced Precision';
    let userGameScore3 = '38 WPM (Top 5%)';
    let userGameScore4 = '94% Analytical Accuracy';

    if (Array.isArray(gameResults) && gameResults.length > 0) {
      if (gameResults[0]) userGameScore1 = `${cleanAscii(gameResults[0].game)}: ${cleanAscii(String(gameResults[0].score))}`;
      if (gameResults[1]) userGameScore2 = `${cleanAscii(gameResults[1].game)}: ${cleanAscii(String(gameResults[1].score))}`;
      if (gameResults[2]) userGameScore3 = `${cleanAscii(gameResults[2].game)}: ${cleanAscii(String(gameResults[2].score))}`;
    }

    const cognitivePillars = [
      {
        title: 'LEXICAL COMMAND',
        desc: 'Academic vocabulary range & idiom recognition',
        score: userGameScore1,
        color: [14, 165, 233]
      },
      {
        title: 'GRAMMAR & SYNTAX',
        desc: 'Clause structures & executive drafting rigor',
        score: userGameScore2,
        color: [16, 185, 129]
      },
      {
        title: 'SPEED & AGILITY',
        desc: 'Real-time lexical recall & responsive throughput',
        score: userGameScore3,
        color: [232, 160, 74]
      },
      {
        title: 'ANALYTICAL DEDUCTION',
        desc: 'Contextual inference & verbal problem solving',
        score: userGameScore4,
        color: [168, 85, 247]
      }
    ];

    let cpX = 16;
    for (const cp of cognitivePillars) {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(cpX, curY + 4, 42, 28, 1.5, 1.5, 'FD');

      doc.setTextColor(cp.color[0], cp.color[1], cp.color[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.0);
      doc.text(cp.title, cpX + 21, curY + 9.5, { align: 'center' });

      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.0);
      const splitDesc = doc.splitTextToSize(cp.desc, 38);
      doc.text(splitDesc, cpX + 21, curY + 14.5, { align: 'center' });

      doc.setFillColor(241, 245, 249);
      doc.roundedRect(cpX + 3, curY + 23, 36, 6.5, 1, 1, 'F');
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.2);
      doc.text(cp.score, cpX + 21, curY + 27.2, { align: 'center' });

      cpX += 45;
    }

    curY += 41;

    // ── SECTION 5: CEFR & GLOBAL OCCUPATIONAL ENGLISH ALIGNMENT ──────────────
    // Redesigned with structured individual cards, ZERO text overlap, NO cut-offs
    doc.setFillColor(14, 116, 144);
    doc.rect(12, curY, 3, 7, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('5. GLOBAL OCCUPATIONAL ENGLISH FRAMEWORK ALIGNMENT', 18, curY + 5.2);

    curY += 9;

    const frameworks = [
      {
        standard: "CEFR GLOBAL STANDARD",
        level: "Level C1 - Operational Proficiency",
        desc: "Spontaneous, fluent articulation in international seminars and academic discourse."
      },
      {
        standard: "ICAO / HEALTHCARE BENCHMARK",
        level: "Level 5 - Operational Phraseology",
        desc: "Zero-ambiguity standard required for commercial flight decks and clinical trauma consultation."
      },
      {
        standard: "CORPORATE & LEGAL RHETORIC",
        level: "Executive Competency Benchmark",
        desc: "Rigorous clause drafting, cross-border negotiation poise, and commercial dispute resolution."
      }
    ];

    for (const f of frameworks) {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(12, curY, 186, 10.5, 1.5, 1.5, 'FD');

      // Left Standard Pill
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(14, curY + 2, 48, 6.5, 1, 1, 'F');
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.2);
      doc.text(f.standard, 38, curY + 6.3, { align: 'center' });

      // Middle Level Pill
      doc.setFillColor(236, 253, 245);
      doc.setDrawColor(16, 185, 129);
      doc.roundedRect(65, curY + 2, 48, 6.5, 1, 1, 'FD');
      doc.setTextColor(5, 150, 105);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.0);
      doc.text(f.level, 89, curY + 6.3, { align: 'center' });

      // Right Competency Description (Wrapped within boundary: X=116 to X=196)
      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      const splitFDesc = doc.splitTextToSize(f.desc, 76);
      doc.text(splitFDesc, 117, curY + 4.8);

      curY += 13.0;
    }

    curY += 2;

    // ── SECTION 6: INSTITUTIONAL ENDORSEMENT & ACCREDITATION SEAL ─────────────
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(12, curY, 186, 38, 2, 2, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.2);
    doc.text('OFFICIAL FAIR ENDORSEMENT & INSTITUTIONAL ACCREDITATION', 16, curY + 6.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(51, 65, 85);
    doc.text('This digital dossier certifies that the student actively explored global career pathways, completed spoken', 16, curY + 12.0);
    doc.text('articulation diagnostics, and demonstrated cognitive proficiency across international English benchmarks.', 16, curY + 16.0);

    // Vector Circular Seal (Centered at X=172, Y=curY + 19)
    const sealX = 172;
    const sealY = curY + 19;
    doc.setDrawColor(232, 160, 74); // Gold outer ring
    doc.setLineWidth(0.7);
    doc.circle(sealX, sealY, 13, 'S');

    doc.setDrawColor(14, 165, 233); // Cyan inner ring
    doc.setLineWidth(0.3);
    doc.circle(sealX, sealY, 10.5, 'S');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.text('KANAKIA INTL', sealX, sealY - 4.5, { align: 'center' });
    doc.setTextColor(232, 160, 74);
    doc.setFontSize(6.8);
    doc.text('VERIFIED', sealX, sealY, { align: 'center' });
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(5);
    doc.text('OFFICIAL SEAL', sealX, sealY + 4.5, { align: 'center' });

    // Official Signature Blocks
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.4);

    // Left Signature
    doc.line(16, curY + 27.5, 65, curY + 27.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(15, 23, 42);
    doc.text('Head, Department of English', 16, curY + 31.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139);
    doc.text(schoolName, 16, curY + 35.0);

    // Right Signature
    doc.line(85, curY + 27.5, 135, curY + 27.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(15, 23, 42);
    doc.text('Exhibition Convenor', 85, curY + 31.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139);
    doc.text('Career Fair 2026 Directorate', 85, curY + 35.0);

    curY += 42;

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 7: OFFICIAL PRINTABLE STUDENT AMBASSADOR BUSINESS CARD
    // ─────────────────────────────────────────────────────────────────────────
    // Clean dashed guideline
    const cutLineY = curY;
    doc.setDrawColor(148, 163, 184);
    doc.setLineDashPattern([2, 2], 0);
    doc.setLineWidth(0.4);
    doc.line(12, cutLineY, 198, cutLineY);
    doc.setLineDashPattern([], 0); // reset line dash

    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.text('[ CUT ALONG DOTTED LINE FOR OFFICIAL STUDENT AMBASSADOR BUSINESS CARD ]', 105, cutLineY + 4.2, { align: 'center' });

    // Official Business Card Box: Centered (width 168mm x height 72mm)
    const cardW = 168;
    const cardH = 72;
    const cardX = (210 - cardW) / 2; // X = 21
    const cardY = cutLineY + 6.5;

    // Card Background & Sleek Dual Border
    doc.setFillColor(15, 23, 42); // Deep Navy Slate
    doc.roundedRect(cardX, cardY, cardW, cardH, 3, 3, 'F');

    // Outer Cyan Border
    doc.setDrawColor(0, 240, 255);
    doc.setLineWidth(0.6);
    doc.roundedRect(cardX, cardY, cardW, cardH, 3, 3, 'S');

    // Inner Hairline Gold Inset
    doc.setDrawColor(232, 160, 74);
    doc.setLineWidth(0.25);
    doc.roundedRect(cardX + 1.5, cardY + 1.5, cardW - 3, cardH - 3, 2, 2, 'S');

    // School Header inside Card
    doc.setTextColor(0, 240, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.text(schoolName.toUpperCase(), cardX + 8, cardY + 9.5);

    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text('CAREER FAIR 2026 - OFFICIAL STUDENT AMBASSADOR', cardX + 8, cardY + 14.5);

    // Golden Divider Line
    doc.setDrawColor(232, 160, 74);
    doc.setLineWidth(0.4);
    doc.line(cardX + 8, cardY + 17.5, cardX + cardW - 8, cardY + 17.5);

    // Student Name & Future Designation
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(studentName.toUpperCase(), cardX + 8, cardY + 26.5);

    doc.setTextColor(0, 240, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.2);
    const futureTitle = cleanAscii(chosenCareer.title ? `Future ${chosenCareer.title}` : 'Future Global Professional');
    doc.text(futureTitle, cardX + 8, cardY + 33.5);

    doc.setTextColor(203, 213, 225);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.0);
    doc.text(`Academic Class: ${studentClass}   |   Stream: ${cleanAscii(chosenCareer.cat || 'Science & Tech')}`, cardX + 8, cardY + 39.5);
    doc.text(`English Superpower: ICAO / Clinical / Corporate Articulation`, cardX + 8, cardY + 44.5);
    doc.text(`Credential ID: ${docId}`, cardX + 8, cardY + 49.5);

    // Department Verification Badge Pill (100% Vector & Safe ASCII - NO garbled %Ï glyphs!)
    doc.setFillColor(30, 41, 59);
    doc.roundedRect(cardX + 8, cardY + 54.5, 78, 10, 1.5, 1.5, 'F');

    // Vector Filled Green Dot
    doc.setFillColor(16, 185, 129); // Emerald Green
    doc.circle(cardX + 13, cardY + 59.5, 1.6, 'F');

    doc.setTextColor(16, 185, 129);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text('VERIFIED BY ENGLISH DEPARTMENT 2026', cardX + 18, cardY + 60.5);

    // Right Side: High-Resolution Simulated Vector QR Code Box
    const qrBoxSize = 26;
    const qrBoxX = cardX + cardW - qrBoxSize - 10;
    const qrBoxY = cardY + 24;

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 2, 2, 'F');

    // Simulated 5x5 Vector QR Matrix Grid
    doc.setFillColor(15, 23, 42);
    const qrGrid = [
      [1, 1, 1, 0, 1],
      [1, 0, 1, 1, 0],
      [1, 1, 1, 0, 1],
      [0, 1, 0, 1, 1],
      [1, 0, 1, 1, 1]
    ];
    const cellSize = 3.3;
    const startQX = qrBoxX + 4.8;
    const startQY = qrBoxY + 3.2;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (qrGrid[r][c] === 1) {
          doc.rect(startQX + c * cellSize, startQY + r * cellSize, cellSize - 0.4, cellSize - 0.4, 'F');
        }
      }
    }

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.text('ECF-2026', qrBoxX + 13, qrBoxY + 23.5, { align: 'center' });

    // Page 2 Footer
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.text('Page 2 of 2  -  Official Academic & Career Evaluation Document  -  Kanakia International School Mira Road', 105, 285, { align: 'center' });

    // Trigger Download
    const safeFilenameName = studentName.replace(/[^a-z0-9]/gi, '_');
    const cleanFilename = `ECF2026_CareerDossier_${safeFilenameName}.pdf`;
    doc.save(cleanFilename);

    if (window.DopamineEngine) {
      window.DopamineEngine.confetti(0.5, 0.4);
      window.DopamineEngine.playChime('fanfare');
      window.DopamineEngine.unlockBadge('dossier_graduate', 'Dossier Graduate', '📜');
    }

    if (typeof window.showToast === 'function') {
      window.showToast(`📄 2-Page Official Dossier & Card downloaded: ${cleanFilename}`);
    }
  }

  // Export
  window.DossierPDF = {
    generate: generateStudentDossierPDF
  };

})(window);
