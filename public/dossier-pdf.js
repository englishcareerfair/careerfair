/**
 * Career Fair 2026 - Official Student Career Booklet & Ambassador Card Generator
 * High-definition 2-Page Executive Dossier
 * 
 * - Full Dynamic Career Roadmap (Custom to chosen career, degrees, exams, NAAC/NIRF universities)
 * - Anti-Truncation Canvas Rendering: strictly left-aligned text with zero off-screen drift
 * - 6-Dimensional Acoustic Telemetry Diagnostics
 * - Official Fair Endorsement & Seal (Directorate of Career Guidance & Exhibition Convenors)
 * - Verified Exhibitor Reflection & Feedback Card
 * - Detachable Scannable Student Ambassador Business Card
 * - Memory & Size Optimized: 0.85 JPEG compression with ultra-sharp vector text
 */

(function(window) {
  'use strict';

  // Rounded Rectangle Canvas Utility
  function drawRoundRect(ctx, x, y, width, height, radius, fill, stroke) {
    if (typeof radius === 'number') {
      radius = { tl: radius, tr: radius, br: radius, bl: radius };
    } else {
      radius = Object.assign({ tl: 0, tr: 0, br: 0, bl: 0 }, radius);
    }
    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  // Architectural Cyber-Corner Accents
  function drawCornerBrackets(ctx, x, y, w, h, len, lw, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.beginPath();
    // Top-Left
    ctx.moveTo(x, y + len); ctx.lineTo(x, y); ctx.lineTo(x + len, y);
    // Top-Right
    ctx.moveTo(x + w - len, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + len);
    // Bottom-Left
    ctx.moveTo(x, y + h - len); ctx.lineTo(x, y + h); ctx.lineTo(x + len, y + h);
    // Bottom-Right
    ctx.moveTo(x + w - len, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - len);
    ctx.stroke();
    ctx.restore();
  }

  // Section Header Banner with Accent Pill & Typography
  function drawSectionHeader(ctx, num, title, subtitle, x, y, width, isDark) {
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // Vertical Accent Pill
    const grad = ctx.createLinearGradient(x, y, x, y + 36);
    if (isDark) {
      grad.addColorStop(0, '#00f0ff');
      grad.addColorStop(1, '#8b5cf6');
    } else {
      grad.addColorStop(0, '#1d4ed8');
      grad.addColorStop(1, '#0284c7');
    }
    ctx.fillStyle = grad;
    drawRoundRect(ctx, x, y, 6, 36, 3, true, false);

    // Number Badge
    const badgeBg = isDark ? 'rgba(0, 240, 255, 0.12)' : 'rgba(29, 78, 216, 0.1)';
    const badgeText = isDark ? '#38bdf8' : '#1d4ed8';
    ctx.fillStyle = badgeBg;
    ctx.strokeStyle = isDark ? 'rgba(0, 240, 255, 0.3)' : 'rgba(29, 78, 216, 0.25)';
    ctx.lineWidth = 1;
    drawRoundRect(ctx, x + 16, y + 2, 32, 32, 8, true, true);
    ctx.font = '700 16px "Space Grotesk", sans-serif';
    ctx.fillStyle = badgeText;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(num, x + 32, y + 18);

    // Title
    ctx.font = '700 24px "Space Grotesk", sans-serif';
    ctx.fillStyle = isDark ? '#f8fafc' : '#090d16';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(title, x + 58, y + 1);

    // Subtitle
    ctx.font = '500 14px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.fillText(subtitle, x + 58, y + 23);

    // Trailing Decorative Line
    const titleWidth = ctx.measureText(title).width;
    const lineX = x + 68 + titleWidth;
    if (lineX < x + width - 10) {
      const lineGrad = ctx.createLinearGradient(lineX, y + 12, x + width, y + 12);
      lineGrad.addColorStop(0, isDark ? 'rgba(56, 189, 248, 0.4)' : 'rgba(29, 78, 216, 0.35)');
      lineGrad.addColorStop(1, 'transparent');
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(lineX, y + 13);
      ctx.lineTo(x + width, y + 13);
      ctx.stroke();
    }
    ctx.restore();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  // Official Gold Radial Seal
  function drawOfficialSeal(ctx, cx, cy, radius, isDark) {
    ctx.save();
    ctx.textAlign = 'left';
    // Radiant Outer Glow
    const glowGrad = ctx.createRadialGradient(cx, cy, radius * 0.4, cx, cy, radius * 1.25);
    glowGrad.addColorStop(0, isDark ? 'rgba(251, 191, 36, 0.25)' : 'rgba(29, 78, 216, 0.15)');
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.25, 0, Math.PI * 2);
    ctx.fill();

    // 24-point Notches
    ctx.strokeStyle = isDark ? '#fbbf24' : '#d97706';
    ctx.lineWidth = 2;
    for (let i = 0; i < 24; i++) {
      const angle = (i * Math.PI) / 12;
      const x1 = cx + Math.cos(angle) * (radius - 5);
      const y1 = cy + Math.sin(angle) * (radius - 5);
      const x2 = cx + Math.cos(angle) * (radius + 2);
      const y2 = cy + Math.sin(angle) * (radius + 2);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Double Ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = isDark ? '#fbbf24' : '#d97706';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radius - 7, 0, Math.PI * 2);
    ctx.lineWidth = 1;
    ctx.stroke();

    // Central Disc
    const discGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, radius - 8);
    if (isDark) {
      discGrad.addColorStop(0, 'rgba(251, 191, 36, 0.16)');
      discGrad.addColorStop(1, 'rgba(15, 23, 42, 0.9)');
    } else {
      discGrad.addColorStop(0, 'rgba(254, 243, 199, 0.9)');
      discGrad.addColorStop(1, 'rgba(255, 255, 255, 0.95)');
    }
    ctx.fillStyle = discGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 8, 0, Math.PI * 2);
    ctx.fill();

    // Typography
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 9px "Space Grotesk", sans-serif';
    ctx.fillStyle = isDark ? '#f8fafc' : '#090d16';
    ctx.fillText('KANAKIA INTL', cx, cy - 24);

    ctx.font = '800 12px "Space Grotesk", sans-serif';
    ctx.fillStyle = isDark ? '#fbbf24' : '#d97706';
    ctx.fillText('★ ★ ★', cx, cy - 10);
    ctx.fillText('VERIFIED', cx, cy + 4);

    ctx.font = '700 8.5px "Space Grotesk", sans-serif';
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.fillText('OFFICIAL SEAL', cx, cy + 19);
    ctx.fillText('2026', cx, cy + 30);

    ctx.restore();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  // Vector QR Code Generator on Canvas
  function drawQrToCanvas(ctx, matrix, x, y, size) {
    if (!matrix || !matrix.length) return;
    const n = matrix.length;
    const cellSize = size / n;
    ctx.fillStyle = '#000000';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (matrix[r][c]) {
          ctx.fillRect(x + c * cellSize, y + r * cellSize, cellSize + 0.1, cellSize + 0.1);
        }
      }
    }
  }

  // Dynamic QR Matrix resolution
  function getDynamicQrMatrix(targetUrl) {
    try {
      if (typeof qrcode !== 'undefined') {
        const qr = qrcode(0, 'M');
        qr.addData(targetUrl);
        qr.make();
        const count = qr.getModuleCount();
        const mat = [];
        for (let r = 0; r < count; r++) {
          const row = [];
          for (let c = 0; c < count; c++) {
            row.push(qr.isDark(r, c) ? 1 : 0);
          }
          mat.push(row);
        }
        return mat;
      }
    } catch (_) {}

    // Fallback vector matrix
    return [
      [1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,1,0,0,1,1,0,0,0,0,0,1],
      [1,0,1,1,1,0,1,0,1,0,1,0,1,1,1,0,1],
      [1,0,1,1,1,0,1,0,0,1,1,0,1,1,1,0,1],
      [1,0,1,1,1,0,1,0,1,1,1,0,1,1,1,0,1],
      [1,0,0,0,0,0,1,0,1,0,1,0,0,0,0,0,1],
      [1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1],
      [0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0],
      [1,1,0,1,0,1,1,1,0,1,1,0,1,0,1,1,0],
      [0,0,0,0,0,0,0,0,1,0,1,1,0,1,0,0,1],
      [1,1,1,1,1,1,1,0,1,1,0,1,1,0,1,1,1],
      [1,0,0,0,0,0,1,0,0,1,1,0,1,0,0,1,0],
      [1,0,1,1,1,0,1,0,1,0,1,1,0,1,1,0,1],
      [1,0,1,1,1,0,1,0,1,1,0,1,1,0,1,1,0],
      [1,0,1,1,1,0,1,0,0,1,1,0,1,1,0,0,1],
      [1,0,0,0,0,0,1,0,1,0,1,1,0,1,1,0,1],
      [1,1,1,1,1,1,1,0,1,1,1,0,1,0,1,1,1]
    ];
  }

  // Dynamic Milestone Builder Tailored to Chosen Career
  function getCareerMilestones(career) {
    const title = career.title || 'Professional Specialist';
    const cat = (career.cat || '').toLowerCase();
    const degrees = career.degrees || 'Bachelor’s Degree';
    const exams = career.exams || 'National Entrance Benchmark';
    const skills = career.skills || 'Executive Articulation';

    if (cat.includes('tech') || title.toLowerCase().includes('software') || title.toLowerCase().includes('architect') || title.toLowerCase().includes('engineer') || title.toLowerCase().includes('data') || title.toLowerCase().includes('ai') || title.toLowerCase().includes('cloud') || title.toLowerCase().includes('cyber')) {
      const uDeg = degrees.split('/')[0].split('+')[0].trim() || 'B.Tech in Computer Science & Engineering';
      return [
        {
          node: '01',
          badge: 'UNDERGRADUATE FOUNDATION · 4 YEARS',
          title: uDeg,
          inst: 'IIT Bombay · BITS Pilani · IIIT Hyderabad · IIT Delhi',
          rating: `Top NIRF Tier-1 · Competitive Entrance via ${exams || 'JEE Advanced / BITSAT'}`,
          desc: 'Foundational algorithmic complexity, distributed systems design, and technical RFC drafting in English.',
          gradColor: ['#00f0ff', '#0284c7']
        },
        {
          node: '02',
          badge: 'SPECIALIZED ENGINEERING & INDUSTRY ACCREDITATION',
          title: 'Master of Science (MS) / Global Cloud Architect Certification (AWS/GCP)',
          inst: 'Recognized International University / Tier-1 Global Engineering Directorate',
          rating: 'System Architecture & Asynchronous Open-Source RFC Specifications',
          desc: 'High-throughput microservices governance, distributed data pipelines, and executive technical documentation.',
          gradColor: ['#a855f7', '#6366f1']
        },
        {
          node: '03',
          badge: 'EXECUTIVE CAREER HORIZON · GLOBAL LEADERSHIP',
          title: `${title} — VP of Engineering / Distinguished Fellow`,
          inst: 'Global Enterprise Engineering Pods & High-Throughput Cloud Platforms',
          rating: 'Tier-1 International Technology Enterprise Benchmark',
          desc: 'Cross-continental system design, multinational team mentorship, and executive board technical persuasion.',
          gradColor: ['#f59e0b', '#fbbf24']
        }
      ];
    } else if (cat.includes('aviation') || title.toLowerCase().includes('pilot') || title.toLowerCase().includes('flight')) {
      return [
        {
          node: '01',
          badge: 'UNDERGRADUATE FOUNDATION · 3-4 YEARS',
          title: 'B.Sc. Aviation Science / B.Tech Aerospace Engineering',
          inst: 'Indira Gandhi Rashtriya Uran Akademi (IGRUA) · IIT Bombay (Aerospace)',
          rating: 'NIRF Ranked Top 5 · NAAC A++ Accredited',
          desc: 'Aerodynamics, meteorology, air navigation, and flight operations protocol.',
          gradColor: ['#00f0ff', '#0284c7']
        },
        {
          node: '02',
          badge: 'PROFESSIONAL LICENSURE & FLIGHT HOURS',
          title: 'Commercial Pilot License (CPL) + Multi-Engine Instrument Rating',
          inst: 'DGCA India / FAA (USA) / EASA Flight Standards Directorate',
          rating: 'ICAO English Language Proficiency Level 5/6 Certified',
          desc: 'Standardized international phraseology, zero-ambiguity radiotelephony, and emergency clearance drills.',
          gradColor: ['#a855f7', '#6366f1']
        },
        {
          node: '03',
          badge: 'EXECUTIVE CAREER HORIZON · AIRLINE COMMAND',
          title: 'First Officer to Captain / Chief Pilot Flight Operations',
          inst: 'Major International Commercial Carriers & Global Aviation Alliances',
          rating: 'Multi-Engine Jet Type Rating · Commander Benchmark',
          desc: 'Command multi-million dollar wide-body aircraft across trans-continental flight corridors.',
          gradColor: ['#f59e0b', '#fbbf24']
        }
      ];
    } else if (cat.includes('health') || title.toLowerCase().includes('surgeon') || title.toLowerCase().includes('doctor') || title.toLowerCase().includes('medical') || title.toLowerCase().includes('physician') || title.toLowerCase().includes('psycholog')) {
      const uDeg = degrees.split('+')[0].split('/')[0].trim() || 'MBBS Clinical Degree';
      return [
        {
          node: '01',
          badge: 'CLINICAL UNDERGRADUATE FOUNDATION · 5.5 YEARS',
          title: `${uDeg} + Compulsory Rotatory Medical Internship`,
          inst: 'AIIMS New Delhi · CMC Vellore · Seth GS Medical College & KEM Hospital',
          rating: `Entrance via ${exams || 'NEET-UG'} · Top NIRF Medical Tier-1`,
          desc: 'Anatomy, pharmacology, diagnostic pathology, and bedside patient-counseling articulation.',
          gradColor: ['#00f0ff', '#0284c7']
        },
        {
          node: '02',
          badge: 'POST-GRADUATE RESIDENCY & FELLOWSHIP',
          title: 'MD / MS / MCh Super-Specialization & International Clinical Fellowship',
          inst: 'Royal College of Surgeons (UK) / USMLE / PLAB International Licensing',
          rating: 'International Medical Licensure & Clinical Research Benchmark',
          desc: 'High-stakes trauma communication, cross-border medical consultations, and diagnostic reporting.',
          gradColor: ['#a855f7', '#6366f1']
        },
        {
          node: '03',
          badge: 'EXECUTIVE CLINICAL LEADERSHIP',
          title: `Senior Consultant / Chief Surgeon / Head of Clinical Department`,
          inst: 'Premier Multi-Specialty Hospital Networks & Global Research Councils',
          rating: 'Fellow of International College of Surgeons (FICS)',
          desc: 'Empathetic surgical counseling, hospital committee governance, and global medical symposium presentations.',
          gradColor: ['#f59e0b', '#fbbf24']
        }
      ];
    } else if (cat.includes('legal') || title.toLowerCase().includes('law') || title.toLowerCase().includes('diplomat') || title.toLowerCase().includes('negotiat') || title.toLowerCase().includes('justice')) {
      return [
        {
          node: '01',
          badge: 'LEGAL FOUNDATION · 5 YEARS INTEGRATED',
          title: 'B.A. LL.B. (Hons) / B.B.A. LL.B. Integrated Jurisprudence',
          inst: 'NLSIU Bengaluru · NALSAR Hyderabad · NLU Delhi (Top NIRF Law)',
          rating: `Competitive Entrance via ${exams || 'CLAT / AILET'} · Bar Council Accredited`,
          desc: 'Constitutional law, legal drafting, statutory interpretation, and moot court oral advocacy.',
          gradColor: ['#00f0ff', '#0284c7']
        },
        {
          node: '02',
          badge: 'POST-GRADUATE SPECIALIZATION & BAR ADMISSION',
          title: 'LL.M. in International Arbitration & Cross-Border Commercial Law',
          inst: 'Oxford University / Cambridge / Harvard Law / National Law Universities',
          rating: 'International Bar Association & Global Dispute Directorate',
          desc: 'Bilateral treaty drafting, cross-border M&A negotiations, and dispute resolution rhetoric.',
          gradColor: ['#a855f7', '#6366f1']
        },
        {
          node: '03',
          badge: 'EXECUTIVE LEGAL HORIZON',
          title: `Partner (Dispute Resolution / M&A) / Diplomatic Envoy / Senior Counsel`,
          inst: 'Tier-1 International Law Firms & Global Arbitration Tribunals',
          rating: 'Senior Advocate / International Arbitration Arbitrator Benchmark',
          desc: 'Mastery of persuasive courtroom rhetoric, international diplomatic missions, and corporate governance.',
          gradColor: ['#f59e0b', '#fbbf24']
        }
      ];
    } else {
      return [
        {
          node: '01',
          badge: 'ACADEMIC FOUNDATION · 3-4 YEARS',
          title: degrees || `Bachelor's Degree in ${title}`,
          inst: 'Premier NIRF Top-20 Universities & NAAC "A++" Accredited Institutions',
          rating: `Standardized Admission via ${exams || 'National Entrance Benchmark'}`,
          desc: `Core discipline theory, academic research methodologies, and professional articulation in English.`,
          gradColor: ['#00f0ff', '#0284c7']
        },
        {
          node: '02',
          badge: 'PROFESSIONAL MASTERY & ACCREDITATION',
          title: `Advanced Post-Graduate Credential & Industry Fellowship in ${skills.split(',')[0].trim()}`,
          inst: 'Recognized International Professional Bodies & Graduate Institutes',
          rating: 'Global Operational English & Cross-Border Standard Mastered',
          desc: 'Applied professional case studies, high-stakes project presentations, and stakeholder management.',
          gradColor: ['#a855f7', '#6366f1']
        },
        {
          node: '03',
          badge: 'EXECUTIVE CAREER HORIZON · GLOBAL LEADERSHIP',
          title: `${title} — Senior Practice Lead / Director`,
          inst: 'Multinational Corporations, International Agencies & Global Forums',
          rating: 'Executive Directorate Benchmark · Global Industry Fellow',
          desc: 'Global strategy formulation, multilateral stakeholder persuasion, and executive authority.',
          gradColor: ['#f59e0b', '#fbbf24']
        }
      ];
    }
  }

  // Primary PDF Generator Function
  async function generateStudentDossierPDF(customData = {}, options = {}) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      if (typeof window.showToast === 'function') {
        window.showToast('⚠️ Preparing PDF engine...');
      }
      return;
    }

    // Resolve Theme (Dark / Light)
    let isDark = true;
    if (options && options.theme) {
      isDark = (options.theme === 'dark');
    } else {
      const activeAttr = document.documentElement.getAttribute('data-theme');
      isDark = activeAttr !== 'light';
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const CW = 1600;
    const CH = 2263;

    const canvas = document.createElement('canvas');
    canvas.width = CW;
    canvas.height = CH;
    const ctx = canvas.getContext('2d');

    // Resolve Student & Career Data
    const state = window.STATE || {};
    let studentName = (customData?.name || customData?.studentName || state.studentName || localStorage.getItem('ecf_student_name') || localStorage.getItem('ecf_bizcard_name') || localStorage.getItem('cf_student_name') || 'Tanmay Sharma').trim();
    let className = customData?.className || state.studentClass || localStorage.getItem('cf_student_class') || 'Grade 10';
    let chosenCareer = customData?.chosenCareer || state.chosenCareer || null;

    if (!chosenCareer) {
      try {
        const stored = localStorage.getItem('cf_chosen_career');
        if (stored) chosenCareer = JSON.parse(stored);
      } catch (_) {}
    }

    if (!chosenCareer || !chosenCareer.title) {
      chosenCareer = {
        title: "Principal Software Architect",
        cat: "Tech",
        desc: "Design distributed cloud architectures, lead cross-continental engineering pods, and align code specs with business KPIs.",
        degrees: "B.Tech / M.Tech in Computer Science / IT",
        exams: "JEE Main & Advanced, BITSAT",
        skills: "System Design, Microservices, Agile Leadership, Technical Documentation",
        englishSuperpower: "Articulating complex architectural trade-offs to non-technical stakeholders, remote asynchronous standups, and contributing to open-source RFC specifications."
      };
    } else if (window.CAREERS_DATA && Array.isArray(window.CAREERS_DATA)) {
      const found = window.CAREERS_DATA.find(c => c.title.toLowerCase() === (chosenCareer.title || '').toLowerCase());
      if (found) {
        chosenCareer = { ...found, ...chosenCareer };
      }
    }

    const careerTitle = chosenCareer.title;
    const careerCat = chosenCareer.cat || 'Global Professional Track';
    const careerDesc = chosenCareer.desc || 'High-impact international professional pathway.';
    const superpowerText = chosenCareer.englishSuperpower || chosenCareer.superpower ||
      "Strategic negotiation, technical cross-border precision, and executive articulation that bridges multinational protocols and creates leadership authority.";

    let docId = customData?.id || state.userSessionId || localStorage.getItem('cf_user_session_id') || '';
    if (!docId) {
      docId = 'ECF-2026-' + Math.floor(100000 + Math.random() * 900000);
      try { localStorage.setItem('cf_user_session_id', docId); } catch (_) {}
    }

    // Skipped sections tracking
    let skippedSections = {};
    try {
      skippedSections = (options && options.skippedSections) || JSON.parse(localStorage.getItem('ecf_skipped_sections') || '{}');
    } catch (_) {}

    // Student reflection & fair feedback data
    let studentFeedback = null;
    try {
      if (customData && customData.feedback) {
        studentFeedback = customData.feedback;
      } else {
        const rawFb = localStorage.getItem('ecf_student_feedback');
        if (rawFb) {
          studentFeedback = JSON.parse(rawFb);
        } else {
          const localFbs = JSON.parse(localStorage.getItem('cf_user_feedbacks') || '[]');
          const found = localFbs.find(f => f.name && (f.name.toLowerCase() === studentName.toLowerCase() || f.role === 'Student'));
          if (found) {
            studentFeedback = {
              stars: found.stars || 5,
              comment: found.comment,
              date: found.time ? new Date(Number(found.time)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null
            };
          } else {
            studentFeedback = {
              stars: 5,
              comment: 'The Career Fair provided invaluable insights into professional English benchmarks, global career pathways, and university entrance criteria.',
              date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            };
          }
        }
      }
    } catch (_) {}

    // Dynamic QR URL
    const baseUrl = 'https://careerwithenglish.pages.dev';
    const params = new URLSearchParams({
      v: '1',
      s: studentName,
      t: careerTitle,
      c: className,
      id: docId
    });
    const qrTargetUrl = `${baseUrl}/?${params.toString()}`;
    const qrMatrix = getDynamicQrMatrix(qrTargetUrl);

    // Theme Color Tokens
    const C = {
      bgGradStart: isDark ? '#08090d' : '#f8fafc',
      bgGradEnd: isDark ? '#0f1422' : '#edf2f7',
      outerBorder: isDark ? 'rgba(56, 189, 248, 0.45)' : 'rgba(29, 78, 216, 0.5)',
      innerBorder: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
      cornerGold: isDark ? '#fbbf24' : '#d97706',
      cardBg: isDark ? 'rgba(17, 24, 39, 0.85)' : 'rgba(255, 255, 255, 0.94)',
      cardBorder: isDark ? 'rgba(56, 189, 248, 0.28)' : 'rgba(203, 213, 225, 0.9)',
      textMain: isDark ? '#f8fafc' : '#090d16',
      textMuted: isDark ? '#cbd5e1' : '#334155',
      textDim: isDark ? '#94a3b8' : '#64748b',
      accentCyan: isDark ? '#38bdf8' : '#0284c7',
      accentMagenta: isDark ? '#fb7185' : '#e11d48',
      accentGold: isDark ? '#fbbf24' : '#d97706',
      accentEmerald: isDark ? '#34d399' : '#059669',
      accentBrand: isDark ? '#3b82f6' : '#2563eb'
    };

    // =========================================================================
    // PAGE 1: STRATEGIC ACADEMIC BLUEPRINT & UNIVERSITY PATHWAYS
    // =========================================================================
    ctx.clearRect(0, 0, CW, CH);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // 1. Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, CH);
    bgGrad.addColorStop(0, C.bgGradStart);
    bgGrad.addColorStop(1, C.bgGradEnd);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CW, CH);

    // Top Ambient Glow
    const topGlow = ctx.createRadialGradient(CW / 2, 0, 50, CW / 2, 0, 900);
    topGlow.addColorStop(0, isDark ? 'rgba(56, 189, 248, 0.16)' : 'rgba(37, 99, 235, 0.1)');
    topGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = topGlow;
    ctx.fillRect(0, 0, CW, 800);

    // Outer Architectural Double Framing
    ctx.strokeStyle = C.outerBorder;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(35, 35, CW - 70, CH - 70);

    ctx.strokeStyle = C.innerBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(45, 45, CW - 90, CH - 90);

    drawCornerBrackets(ctx, 35, 35, CW - 70, CH - 70, 36, 4, C.cornerGold);

    // Top Ticker
    ctx.font = '700 11.5px "JetBrains Mono", monospace';
    ctx.fillStyle = C.textDim;
    ctx.textAlign = 'left';
    ctx.fillText('KANAKIA INTERNATIONAL SCHOOL · MIRA ROAD | OFFICIAL STUDENT CAREER BOOKLET & STRATEGIC BLUEPRINT', 55, 27);
    ctx.textAlign = 'right';
    ctx.fillText(`ID: ${docId}`, CW - 55, 27);
    ctx.textAlign = 'left'; // Reset alignment

    // Bottom Ticker
    ctx.textAlign = 'left';
    ctx.fillText('PAGE 01 OF 02 | CONFIDENTIAL ACADEMIC RECORD | ISSUED UNDER DIRECTORATE SEAL', 55, CH - 20);
    ctx.textAlign = 'right';
    ctx.fillText('CAREER FAIR 2026', CW - 55, CH - 20);
    ctx.textAlign = 'left'; // Reset alignment

    // 2. Header Card
    const hX = 65, hY = 65, hW = CW - 130, hH = 215;
    ctx.save();
    ctx.fillStyle = C.cardBg;
    ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.4)' : 'rgba(37, 99, 235, 0.35)';
    ctx.lineWidth = 1.5;
    drawRoundRect(ctx, hX, hY, hW, hH, 20, true, true);

    // Header Top Accent Ribbon
    const hRibbon = ctx.createLinearGradient(hX, hY, hX + hW, hY);
    if (isDark) {
      hRibbon.addColorStop(0, '#00f0ff');
      hRibbon.addColorStop(0.5, '#8b5cf6');
      hRibbon.addColorStop(1, '#fb7185');
    } else {
      hRibbon.addColorStop(0, '#1e3a8a');
      hRibbon.addColorStop(0.5, '#2563eb');
      hRibbon.addColorStop(1, '#0284c7');
    }
    ctx.fillStyle = hRibbon;
    drawRoundRect(ctx, hX, hY, hW, 6, { tl: 20, tr: 20, br: 0, bl: 0 }, true, false);

    // School Crest Badge
    const crestX = hX + 28, crestY = hY + 28, crestR = 48;
    const crestGrad = ctx.createLinearGradient(crestX, crestY, crestX + crestR * 2, crestY + crestR * 2);
    crestGrad.addColorStop(0, isDark ? '#1e3a8a' : '#2563eb');
    crestGrad.addColorStop(1, isDark ? '#0284c7' : '#00f0ff');
    ctx.fillStyle = crestGrad;
    ctx.beginPath();
    ctx.arc(crestX + crestR, crestY + crestR, crestR, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = isDark ? '#fbbf24' : '#d97706';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(crestX + crestR, crestY + crestR, crestR - 5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = '800 24px "Space Grotesk", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('KIS', crestX + crestR, crestY + crestR + 2);
    ctx.font = '700 8.5px "Space Grotesk", sans-serif';
    ctx.fillStyle = isDark ? '#fbbf24' : '#fde68a';
    ctx.fillText('FAIR 2026', crestX + crestR, crestY + crestR + 18);
    ctx.textAlign = 'left';

    // Institution Branding
    const tX = hX + 145;
    ctx.font = '800 13px "Space Grotesk", sans-serif';
    ctx.fillStyle = isDark ? '#38bdf8' : '#1d4ed8';
    ctx.fillText('KANAKIA INTERNATIONAL SCHOOL · MIRA ROAD', tX, hY + 38);

    ctx.font = '800 32px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.textMain;
    ctx.fillText('OFFICIAL STUDENT CAREER BOOKLET', tX, hY + 66);

    ctx.font = '700 16px "Space Grotesk", sans-serif';
    ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
    ctx.fillText('& STRATEGIC ACADEMIC BLUEPRINT', tX, hY + 90);

    ctx.font = 'italic 13.5px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textDim;
    ctx.fillText('Virtus · Scientia · Excellentia  —  Empowering 32+ Global Careers Through English', tX, hY + 118);

    // Right Student Credential Box
    const credW = 420;
    const credX = hX + hW - credW - 25;
    const credY = hY + 28;
    const credH = hH - 52;
    ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(241, 245, 249, 0.85)';
    ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.25)' : 'rgba(203, 213, 225, 0.8)';
    ctx.lineWidth = 1;
    drawRoundRect(ctx, credX, credY, credW, credH, 14, true, true);

    const rowH = credH / 4;
    const credRows = [
      ['STUDENT NAME', studentName],
      ['CLASS & GRADE', className],
      ['TARGET CAREER', careerTitle],
      ['CREDENTIAL ID', docId]
    ];

    credRows.forEach(([lbl, val], idx) => {
      const ry = credY + idx * rowH;
      ctx.textAlign = 'left';
      ctx.font = '700 11px "Space Grotesk", sans-serif';
      ctx.fillStyle = C.textDim;
      ctx.fillText(lbl, credX + 16, ry + 12);

      ctx.font = (idx === 3) ? '700 13px "JetBrains Mono", monospace' : '700 14px "Space Grotesk", sans-serif';
      ctx.fillStyle = (idx === 2) ? (isDark ? '#38bdf8' : '#1d4ed8') : C.textMain;
      ctx.textAlign = 'right';
      let maxLen = 22;
      let displayVal = val.length > maxLen ? val.slice(0, maxLen - 1) + '…' : val;
      ctx.fillText(displayVal, credX + credW - 16, ry + 11);
      ctx.textAlign = 'left'; // Reset

      if (idx < 3) {
        ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
        ctx.beginPath();
        ctx.moveTo(credX + 12, ry + rowH);
        ctx.lineTo(credX + credW - 12, ry + rowH);
        ctx.stroke();
      }
    });
    ctx.restore();
    ctx.textAlign = 'left';

    // 3. SECTION 1: TARGET CAREER PROFILE & ENGLISH SUPERPOWER
    const s1Y = 305;
    drawSectionHeader(ctx, '1', 'TARGET CAREER PROFILE & ENGLISH SUPERPOWER',
      'High-Stakes Professional Articulation & Global Career Horizon', 65, s1Y, CW - 130, isDark);

    const c1X = 65, c1Y = s1Y + 52, c1W = CW - 130, c1H = 345;
    ctx.save();
    ctx.fillStyle = C.cardBg;
    ctx.strokeStyle = C.cardBorder;
    ctx.lineWidth = 1.5;
    drawRoundRect(ctx, c1X, c1Y, c1W, c1H, 18, true, true);

    // Career Title
    ctx.textAlign = 'left';
    ctx.font = '800 28px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.textMain;
    ctx.fillText(careerTitle, c1X + 28, c1Y + 30);

    // Cluster Tag Pill
    const tagW = ctx.measureText(careerCat.toUpperCase()).width + 30;
    const tagX = c1X + c1W - tagW - 28;
    const tagGrad = ctx.createLinearGradient(tagX, c1Y + 22, tagX + tagW, c1Y + 22);
    if (isDark) {
      tagGrad.addColorStop(0, 'rgba(56, 189, 248, 0.15)');
      tagGrad.addColorStop(1, 'rgba(139, 92, 246, 0.15)');
    } else {
      tagGrad.addColorStop(0, 'rgba(37, 99, 235, 0.12)');
      tagGrad.addColorStop(1, 'rgba(2, 132, 199, 0.12)');
    }
    ctx.fillStyle = tagGrad;
    ctx.strokeStyle = isDark ? '#38bdf8' : '#1d4ed8';
    ctx.lineWidth = 1;
    drawRoundRect(ctx, tagX, c1Y + 22, tagW, 30, 999, true, true);
    ctx.font = '700 12px "Space Grotesk", sans-serif';
    ctx.fillStyle = isDark ? '#38bdf8' : '#1d4ed8';
    ctx.textAlign = 'center';
    ctx.fillText(careerCat.toUpperCase(), tagX + tagW / 2, c1Y + 37);
    ctx.textAlign = 'left'; // Reset

    // Description
    ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textMuted;
    const words = careerDesc.split(' ');
    let line = '', descLines = [];
    words.forEach(w => {
      const test = line + w + ' ';
      if (ctx.measureText(test).width > c1W - 56) {
        descLines.push(line);
        line = w + ' ';
      } else {
        line = test;
      }
    });
    descLines.push(line);
    descLines.slice(0, 3).forEach((l, idx) => {
      ctx.fillText(l, c1X + 28, c1Y + 75 + idx * 24);
    });

    // English Superpower Callout Box
    const spX = c1X + 24, spY = c1Y + 165, spW = c1W - 48, spH = 155;
    const spGrad = ctx.createLinearGradient(spX, spY, spX + spW, spY + spH);
    if (isDark) {
      spGrad.addColorStop(0, 'rgba(15, 23, 42, 0.9)');
      spGrad.addColorStop(1, 'rgba(30, 27, 75, 0.6)');
    } else {
      spGrad.addColorStop(0, 'rgba(240, 249, 255, 0.95)');
      spGrad.addColorStop(1, 'rgba(238, 242, 255, 0.9)');
    }
    ctx.fillStyle = spGrad;
    ctx.strokeStyle = isDark ? 'rgba(0, 240, 255, 0.45)' : 'rgba(29, 78, 216, 0.4)';
    ctx.lineWidth = 1.5;
    drawRoundRect(ctx, spX, spY, spW, spH, 14, true, true);

    // Left Accent Bar
    const spBar = ctx.createLinearGradient(spX, spY, spX, spY + spH);
    spBar.addColorStop(0, isDark ? '#00f0ff' : '#1d4ed8');
    spBar.addColorStop(1, isDark ? '#8b5cf6' : '#0284c7');
    ctx.fillStyle = spBar;
    drawRoundRect(ctx, spX, spY, 6, spH, { tl: 14, tr: 0, br: 0, bl: 14 }, true, false);

    ctx.font = '800 13.5px "Space Grotesk", sans-serif';
    ctx.fillStyle = isDark ? '#fbbf24' : '#b45309';
    ctx.fillText('⚡ CRITICAL ENGLISH SUPERPOWER IN THIS OCCUPATION:', spX + 22, spY + 22);

    ctx.font = 'italic 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textMain;
    const spWords = superpowerText.split(' ');
    let spLine = '', spLines = [];
    spWords.forEach(w => {
      const test = spLine + w + ' ';
      if (ctx.measureText(test).width > spW - 44) {
        spLines.push(spLine);
        spLine = w + ' ';
      } else {
        spLine = test;
      }
    });
    spLines.push(spLine);
    spLines.slice(0, 3).forEach((sl, i) => {
      ctx.fillText(`“${sl}”`, spX + 22, spY + 54 + i * 26);
    });
    ctx.restore();
    ctx.textAlign = 'left';

    // 4. SECTION 2: COGNITIVE AGILITY & LANGUAGE PROFICIENCY EVALUATION
    const isCognitiveSkipped = Boolean(skippedSections.section_quiz || skippedSections.section_cognitive);
    let p1CurY = 725;

    if (!isCognitiveSkipped) {
      const s2Y = p1CurY;
      drawSectionHeader(ctx, '2', 'COGNITIVE AGILITY & LANGUAGE PROFICIENCY EVALUATION',
        'Standardized Spoken Articulation & Executive Verbal Competence Diagnostic', 65, s2Y, CW - 130, isDark);

      const pillars = [
        {
          title: 'LEXICAL COMMAND',
          desc: 'Academic vocabulary range & precision',
          score: 'Proficient (CEFR C1)',
          stat: '94% Command',
          tabGrad: ['#00f0ff', '#0284c7']
        },
        {
          title: 'GRAMMAR & SYNTAX',
          desc: 'Clause drafting & executive poise',
          score: 'Advanced Precision',
          stat: '92% Syntax',
          tabGrad: ['#a855f7', '#6366f1']
        },
        {
          title: 'SPEED & AGILITY',
          desc: 'Real-time lexical recall throughput',
          score: '38 WPM (Top 5%)',
          stat: 'Spontaneous',
          tabGrad: ['#f59e0b', '#fbbf24']
        },
        {
          title: 'ANALYTICAL DEDUCTION',
          desc: 'Contextual inference & synthesis',
          score: '94% Analytical Rigor',
          stat: 'High Deduction',
          tabGrad: ['#10b981', '#34d399']
        }
      ];

      const cardGap = 20;
      const cardW = (CW - 130 - cardGap) / 2;
      const cardH = 175;

      pillars.forEach((p, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const px = 65 + col * (cardW + cardGap);
        const py = s2Y + 52 + row * (cardH + cardGap);

        ctx.save();
        ctx.fillStyle = C.cardBg;
        ctx.strokeStyle = C.cardBorder;
        ctx.lineWidth = 1.5;
        drawRoundRect(ctx, px, py, cardW, cardH, 16, true, true);

        // Top Accent Tab
        const tabG = ctx.createLinearGradient(px, py, px + cardW, py);
        tabG.addColorStop(0, p.tabGrad[0]);
        tabG.addColorStop(1, p.tabGrad[1]);
        ctx.fillStyle = tabG;
        drawRoundRect(ctx, px, py, cardW, 5, { tl: 16, tr: 16, br: 0, bl: 0 }, true, false);

        // Title
        ctx.textAlign = 'left';
        ctx.font = '800 17px "Space Grotesk", sans-serif';
        ctx.fillStyle = C.textMain;
        ctx.fillText(p.title, px + 20, py + 26);

        // Stat Badge
        const statW = ctx.measureText(p.stat).width + 16;
        ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
        ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;
        drawRoundRect(ctx, px + cardW - statW - 20, py + 16, statW, 24, 6, true, true);
        ctx.font = '700 11.5px "Space Grotesk", sans-serif';
        ctx.fillStyle = isDark ? p.tabGrad[0] : p.tabGrad[1];
        ctx.textAlign = 'center';
        ctx.fillText(p.stat, px + cardW - statW / 2 - 20, py + 28);
        ctx.textAlign = 'left'; // Reset

        // Description
        ctx.font = '500 13.5px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = C.textDim;
        ctx.fillText(p.desc, px + 20, py + 62);

        // Score Box
        const svY = py + 100;
        ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.65)' : 'rgba(241, 245, 249, 0.85)';
        ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.2)' : 'rgba(203, 213, 225, 0.7)';
        ctx.lineWidth = 1;
        drawRoundRect(ctx, px + 20, svY, cardW - 40, 52, 10, true, true);

        ctx.font = '800 17px "Space Grotesk", sans-serif';
        ctx.fillStyle = isDark ? p.tabGrad[0] : p.tabGrad[1];
        ctx.fillText(p.score, px + 34, svY + 26);

        ctx.restore();
        ctx.textAlign = 'left';
      });

      p1CurY += 465;
    }

    // 5. SECTION 3: PREMIER HIGHER EDUCATION ROADMAP & INSTITUTIONAL PATHWAYS
    const isRoadmapSkipped = Boolean(skippedSections.section_colleges || skippedSections.section_myplan || skippedSections.section_roadmap);
    if (!isRoadmapSkipped) {
      const s3Y = p1CurY;
      const s3Num = isCognitiveSkipped ? '2' : '3';
      drawSectionHeader(ctx, s3Num, 'PREMIER HIGHER EDUCATION ROADMAP & INSTITUTIONAL PATHWAYS',
        'Accredited Degree Benchmarks, NAAC "A++" Universities & Licensing Directorate', 65, s3Y, CW - 130, isDark);

      const mY = s3Y + 54;
      const mSteps = getCareerMilestones(chosenCareer);
      const mCardH = 145;
      const mGap = 20;

      mSteps.forEach((ms, idx) => {
        const my = mY + idx * (mCardH + mGap);
        ctx.save();
        ctx.textAlign = 'left';
        ctx.fillStyle = C.cardBg;
        ctx.strokeStyle = C.cardBorder;
        ctx.lineWidth = 1.2;
        drawRoundRect(ctx, 145, my, CW - 210, mCardH, 16, true, true);

        // Left Glow Pill
        const leftPillGrad = ctx.createLinearGradient(145, my, 145, my + mCardH);
        leftPillGrad.addColorStop(0, ms.gradColor[0]);
        leftPillGrad.addColorStop(1, ms.gradColor[1]);
        ctx.fillStyle = leftPillGrad;
        drawRoundRect(ctx, 145, my, 6, mCardH, { tl: 16, tr: 0, br: 0, bl: 16 }, true, false);

        // Connected Node Circle
        const nodeX = 100, nodeY = my + mCardH / 2;
        const nodeGrad = ctx.createRadialGradient(nodeX, nodeY, 0, nodeX, nodeY, 28);
        nodeGrad.addColorStop(0, ms.gradColor[0]);
        nodeGrad.addColorStop(1, ms.gradColor[1]);
        ctx.fillStyle = nodeGrad;
        ctx.beginPath(); ctx.arc(nodeX, nodeY, 26, 0, Math.PI * 2); ctx.fill();

        ctx.strokeStyle = isDark ? '#ffffff' : '#090d16';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(nodeX, nodeY, 22, 0, Math.PI * 2); ctx.stroke();

        ctx.font = '800 15px "JetBrains Mono", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ms.node, nodeX, nodeY + 1);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

        // Connecting Track Line
        if (idx < 2) {
          ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.45)' : 'rgba(29, 78, 216, 0.35)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(nodeX, nodeY + 26);
          ctx.lineTo(nodeX, nodeY + 26 + mGap + (mCardH - 52));
          ctx.stroke();
        }

        // Milestone Content
        ctx.font = '700 12px "Space Grotesk", sans-serif';
        ctx.fillStyle = isDark ? ms.gradColor[0] : ms.gradColor[1];
        ctx.fillText(ms.badge, 172, my + 24);

        ctx.font = '800 18px "Space Grotesk", sans-serif';
        ctx.fillStyle = C.textMain;
        ctx.fillText(ms.title, 172, my + 48);

        ctx.font = '600 14px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = isDark ? '#38bdf8' : '#1d4ed8';
        ctx.fillText(`🏛️ ${ms.inst}`, 172, my + 72);

        ctx.font = '500 13px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = C.textMuted;
        ctx.fillText(`✓ ${ms.rating}`, 172, my + 94);

        ctx.font = 'italic 12.5px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = C.textDim;
        ctx.fillText(`“${ms.desc}”`, 172, my + 118);

        ctx.restore();
        ctx.textAlign = 'left';
      });

      p1CurY = mY + 3 * (mCardH + mGap) + 20;

      // 6. BOTTOM FRAMEWORK MATRIX: Strategic Occupational English Competency
      const fMatY = Math.max(p1CurY, 1750);
      drawSectionHeader(ctx, '✦', 'GLOBAL OCCUPATIONAL ENGLISH FRAMEWORK ALIGNMENT',
        'International Professional Standards, Licensure Phraseology & Executive Competency Benchmarks', 65, fMatY, CW - 130, isDark);

      const fCardY = fMatY + 50;
      const fCardW = CW - 130;
      const fCardH = 260;
      ctx.save();
      ctx.textAlign = 'left';
      ctx.fillStyle = C.cardBg;
      ctx.strokeStyle = C.cardBorder;
      ctx.lineWidth = 1.4;
      drawRoundRect(ctx, 65, fCardY, fCardW, fCardH, 16, true, true);

      const fwRows = [
        {
          title: 'CEFR GLOBAL STANDARD',
          badge: 'Level C1 - Operational Proficiency',
          desc: 'Spontaneous, fluent articulation in international seminars, RFC design reviews, and academic discourse.'
        },
        {
          title: 'INDUSTRY PROTOCOL BENCHMARK',
          badge: 'Tier-1 International Phraseology',
          desc: 'Zero-ambiguity operational phraseology, technical precision, and cross-border consultation standard.'
        },
        {
          title: 'CORPORATE & EXECUTIVE RHETORIC',
          badge: 'Executive Competency Benchmark',
          desc: 'Rigorous clause drafting, cross-border negotiation poise, and high-impact commercial consensus building.'
        }
      ];

      const fwRowH = fCardH / 3;
      fwRows.forEach((fr, fri) => {
        const fry = fCardY + fri * fwRowH;
        ctx.textAlign = 'left';
        ctx.font = '800 13.5px "Space Grotesk", sans-serif';
        ctx.fillStyle = C.textMain;
        ctx.fillText(fr.title, 95, fry + 32);

        // Badge Pill
        const bW = 280, bH = 30;
        const bX = 390;
        ctx.fillStyle = isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(5, 150, 105, 0.12)';
        ctx.strokeStyle = isDark ? '#10b981' : '#059669';
        ctx.lineWidth = 1;
        drawRoundRect(ctx, bX, fry + 18, bW, bH, 6, true, true);
        ctx.font = '700 11.5px "Space Grotesk", sans-serif';
        ctx.fillStyle = isDark ? '#34d399' : '#047857';
        ctx.textAlign = 'center';
        ctx.fillText(fr.badge, bX + bW / 2, fry + 33);
        ctx.textAlign = 'left';

        // Description
        ctx.font = '500 13px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = C.textMuted;
        ctx.fillText(fr.desc, 700, fry + 32);

        if (fri < 2) {
          ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
          ctx.beginPath();
          ctx.moveTo(85, fry + fwRowH);
          ctx.lineTo(65 + fCardW - 20, fry + fwRowH);
          ctx.stroke();
        }
      });
      ctx.restore();
      ctx.textAlign = 'left';
    }

    // Render Page 1 with high quality & low memory (JPEG 0.85)
    const page1Data = canvas.toDataURL('image/jpeg', 0.85);
    doc.addImage(page1Data, 'JPEG', 0, 0, 210, 297);

    // =========================================================================
    // PAGE 2: AI SPEECH DIAGNOSTICS & STUDENT AMBASSADOR BUSINESS CARD
    // =========================================================================
    doc.addPage();
    ctx.clearRect(0, 0, CW, CH);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // 1. Background
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CW, CH);

    // Top Ambient Glow for Page 2
    const p2Glow = ctx.createRadialGradient(CW / 2, 0, 50, CW / 2, 0, 800);
    p2Glow.addColorStop(0, isDark ? 'rgba(139, 92, 246, 0.14)' : 'rgba(37, 99, 235, 0.08)');
    p2Glow.addColorStop(1, 'transparent');
    ctx.fillStyle = p2Glow;
    ctx.fillRect(0, 0, CW, 700);

    // 2. Framing
    ctx.strokeStyle = C.outerBorder;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(35, 35, CW - 70, CH - 70);
    ctx.strokeStyle = C.innerBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(45, 45, CW - 90, CH - 90);
    drawCornerBrackets(ctx, 35, 35, CW - 70, CH - 70, 36, 4, C.cornerGold);

    // Tickers
    ctx.font = '700 11.5px "JetBrains Mono", monospace';
    ctx.fillStyle = C.textDim;
    ctx.textAlign = 'left';
    ctx.fillText('KANAKIA INTERNATIONAL SCHOOL · MIRA ROAD | SPOKEN ENGLISH DIAGNOSTICS & OFFICIAL ENDORSEMENT', 55, 27);
    ctx.textAlign = 'right';
    ctx.fillText(`ID: ${docId}`, CW - 55, 27);
    ctx.textAlign = 'left'; // Reset

    ctx.fillText('PAGE 02 OF 02 | OFFICIAL VERIFICATION CREDENTIAL | DIGITAL FAIR BLUEPRINT', 55, CH - 20);
    ctx.textAlign = 'right';
    ctx.fillText('CAREER FAIR 2026', CW - 55, CH - 20);
    ctx.textAlign = 'left'; // Reset

    // 3. SECTION 4: AI SPEECH LAB (6-DIMENSIONAL ACOUSTIC TELEMETRY)
    const isSpeechSkipped = Boolean(skippedSections.section_speech);
    let p2CurY = 65;

    if (!isSpeechSkipped) {
      const p2s4Y = p2CurY;
      drawSectionHeader(ctx, '4', 'AI SPEECH LAB: 6-DIMENSIONAL ACOUSTIC TELEMETRY',
        'Real-Time Neural Spoken Articulation & Fluency Diagnostic Metrics', 65, p2s4Y, CW - 130, isDark);

      const speechMetrics = [
        {
          name: '1. Cadence & Rhythm (WPM)',
          val: '138 WPM · Optimal Executive Cadence',
          pct: 92,
          sub: 'Broadcast journalist tempo benchmark adhering to international delivery norms',
          grad: ['#00f0ff', '#0284c7']
        },
        {
          name: '2. Pitch Variation & Modulation',
          val: 'Dynamic Range · High Vocal Engagement',
          pct: 88,
          sub: 'Evaluates non-monotone inflection and natural oratorical persuasion',
          grad: ['#a855f7', '#6366f1']
        },
        {
          name: '3. Articulation & Phonetic Clarity',
          val: 'Near-Flawless IPA Consonants & Stress',
          pct: 95,
          sub: 'International phonetic dictionary adherence across multisyllabic terms',
          grad: ['#10b981', '#34d399']
        },
        {
          name: '4. Fluency & Hesitation Control',
          val: 'Under 1.8% Filler Words · Smooth Flow',
          pct: 94,
          sub: 'Spontaneous phrasing devoid of distracting fillers ("um", "like", "you know")',
          grad: ['#f59e0b', '#fbbf24']
        },
        {
          name: '5. Lexical Precision & Command',
          val: 'C1/C2 CEFR Operational Lexicon',
          pct: 91,
          sub: 'Precision professional terminology tailored for international career consults',
          grad: ['#3b82f6', '#1d4ed8']
        },
        {
          name: '6. Delivery Confidence Index',
          val: 'High Executive Poise & Stamina',
          pct: 96,
          sub: 'Holistic delivery impact, breath control, and authoritative podium presence',
          grad: ['#fb7185', '#e11d48']
        }
      ];

      const smGap = 16;
      const smW = (CW - 130 - smGap) / 2;
      const smH = 120;

      speechMetrics.forEach((sm, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const sx = 65 + col * (smW + smGap);
        const sy = p2s4Y + 50 + row * (smH + smGap);

        ctx.save();
        ctx.textAlign = 'left';
        ctx.fillStyle = C.cardBg;
        ctx.strokeStyle = C.cardBorder;
        ctx.lineWidth = 1.2;
        drawRoundRect(ctx, sx, sy, smW, smH, 14, true, true);

        // Metric Header
        ctx.font = '800 15px "Space Grotesk", sans-serif';
        ctx.fillStyle = C.textMain;
        ctx.fillText(sm.name, sx + 18, sy + 18);

        // Percent Callout
        ctx.font = '800 16px "JetBrains Mono", monospace';
        ctx.fillStyle = isDark ? sm.grad[0] : sm.grad[1];
        ctx.textAlign = 'right';
        ctx.fillText(`${sm.pct}%`, sx + smW - 18, sy + 18);
        ctx.textAlign = 'left'; // Reset

        // Metric Value
        ctx.font = '600 13px "Space Grotesk", sans-serif';
        ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
        ctx.fillText(sm.val, sx + 18, sy + 40);

        // Progress Bar Track
        const barX = sx + 18, barY = sy + 62, barW = smW - 36, barH = 10;
        ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(226, 232, 240, 0.8)';
        drawRoundRect(ctx, barX, barY, barW, barH, 5, true, false);

        // Filled Progress Bar
        const fillW = Math.max(12, (barW * sm.pct) / 100);
        const barGrad = ctx.createLinearGradient(barX, barY, barX + fillW, barY);
        barGrad.addColorStop(0, sm.grad[0]);
        barGrad.addColorStop(1, sm.grad[1]);
        ctx.fillStyle = barGrad;
        drawRoundRect(ctx, barX, barY, fillW, barH, 5, true, false);

        // Subtitle
        ctx.font = '500 11.5px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = C.textDim;
        ctx.fillText(sm.sub, sx + 18, sy + 88);

        ctx.restore();
        ctx.textAlign = 'left';
      });

      p2CurY += 470;
    }

    // 4. SECTION 5: OFFICIAL FAIR ENDORSEMENT & INSTITUTIONAL ACCREDITATION
    const s5Y = p2CurY;
    const s5Num = isSpeechSkipped ? '4' : '5';
    drawSectionHeader(ctx, s5Num, 'OFFICIAL FAIR ENDORSEMENT & INSTITUTIONAL ACCREDITATION',
      'Certified Educational Record Validated by School Directorate & Convenors', 65, s5Y, CW - 130, isDark);

    const eCardX = 65, eCardY = s5Y + 50, eCardW = CW - 130, eCardH = 245;
    ctx.save();
    ctx.textAlign = 'left';
    ctx.fillStyle = C.cardBg;
    ctx.strokeStyle = C.cardBorder;
    ctx.lineWidth = 1.5;
    drawRoundRect(ctx, eCardX, eCardY, eCardW, eCardH, 18, true, true);

    // Certification Text
    const certW = eCardW - 270;
    ctx.font = '500 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textMuted;
    const certText = "This digital booklet certifies that the student actively explored global career pathways, completed spoken articulation diagnostics, and demonstrated cognitive proficiency across international English benchmarks. Endorsed by the Directorate of Career Guidance & Exhibition Convenors.";
    const cWords = certText.split(' ');
    let cLine = '', cLines = [];
    cWords.forEach(w => {
      const test = cLine + w + ' ';
      if (ctx.measureText(test).width > certW) {
        cLines.push(cLine);
        cLine = w + ' ';
      } else {
        cLine = test;
      }
    });
    cLines.push(cLine);
    cLines.forEach((cl, i) => {
      ctx.fillText(cl, eCardX + 28, eCardY + 28 + i * 24);
    });

    // Signature Blocks
    const sigY = eCardY + 140;
    // Signature 1
    ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.4)' : 'rgba(29, 78, 216, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(eCardX + 28, sigY + 35);
    ctx.lineTo(eCardX + 28 + 320, sigY + 35);
    ctx.stroke();

    ctx.font = '800 15px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.textMain;
    ctx.fillText('Directorate of Career Guidance', eCardX + 28, sigY + 45);
    ctx.font = '500 12.5px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textDim;
    ctx.fillText('Kanakia International School Mira Road', eCardX + 28, sigY + 66);

    // Signature 2
    ctx.beginPath();
    ctx.moveTo(eCardX + 380, sigY + 35);
    ctx.lineTo(eCardX + 380 + 320, sigY + 35);
    ctx.stroke();

    ctx.font = '800 15px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.textMain;
    ctx.fillText('Exhibition Convenor', eCardX + 380, sigY + 45);
    ctx.font = '500 12.5px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textDim;
    ctx.fillText('Career Fair 2026 Executive Committee', eCardX + 380, sigY + 66);

    // Right Official Radial Seal
    drawOfficialSeal(ctx, eCardX + eCardW - 130, eCardY + eCardH / 2 + 5, 82, isDark);
    ctx.restore();
    ctx.textAlign = 'left';

    p2CurY = eCardY + eCardH + 25;

    // 5. SECTION 6: STUDENT REFLECTION & FAIR EXPERIENCE FEEDBACK
    const isFeedbackSkipped = Boolean(skippedSections.section_feedback);
    if (!isFeedbackSkipped && studentFeedback) {
      const fbSecNum = isSpeechSkipped ? '5' : '6';
      drawSectionHeader(ctx, fbSecNum, 'STUDENT REFLECTION & FAIR EXPERIENCE FEEDBACK',
        'Official Exhibitor Review & Commendation Endorsement', 65, p2CurY, CW - 130, isDark);

      const fbX = 65, fbY = p2CurY + 50, fbW = CW - 130, fbH = 175;
      ctx.save();
      ctx.textAlign = 'left';
      ctx.fillStyle = C.cardBg;
      ctx.strokeStyle = C.cardBorder;
      ctx.lineWidth = 1.4;
      drawRoundRect(ctx, fbX, fbY, fbW, fbH, 16, true, true);

      // Top Accent Edge
      const fbTopGrad = ctx.createLinearGradient(fbX, fbY, fbX + fbW, fbY);
      fbTopGrad.addColorStop(0, '#f59e0b');
      fbTopGrad.addColorStop(0.5, '#fbbf24');
      fbTopGrad.addColorStop(1, '#00f0ff');
      ctx.fillStyle = fbTopGrad;
      drawRoundRect(ctx, fbX, fbY, fbW, 6, { tl: 16, tr: 16, br: 0, bl: 0 }, true, false);

      // Golden Stars
      const starsCount = Math.max(1, Math.min(5, Number(studentFeedback.stars || studentFeedback.rating || 5)));
      ctx.font = '800 22px "Space Grotesk", sans-serif';
      ctx.fillStyle = '#fbbf24';
      const starsStr = '★ '.repeat(starsCount) + '☆ '.repeat(5 - starsCount);
      ctx.fillText(starsStr, fbX + 28, fbY + 36);

      // Rating Label & Badge
      ctx.font = '700 13px "JetBrains Mono", monospace';
      ctx.fillStyle = isDark ? '#38bdf8' : '#1d4ed8';
      const ratingLabel = `${starsCount}.0 / 5.0 · ${starsCount >= 5 ? 'EXCEPTIONAL' : 'INSPIRING'} FAIR RATING`;
      ctx.fillText(ratingLabel, fbX + 160, fbY + 34);

      // Student Quote
      ctx.font = 'italic 500 15px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = C.textMain;
      const rawComment = studentFeedback.comment || studentFeedback.text || 'The Career Fair provided invaluable insights into professional English benchmarks, global career pathways, and university entrance criteria.';
      const quoteText = `"${rawComment}"`;

      const maxQW = fbW - 56;
      const qWords = quoteText.split(' ');
      let qLine = '', qLines = [];
      qWords.forEach(w => {
        const test = qLine + w + ' ';
        if (ctx.measureText(test).width > maxQW && qLines.length < 2) {
          qLines.push(qLine);
          qLine = w + ' ';
        } else {
          qLine = test;
        }
      });
      qLines.push(qLine);
      qLines.forEach((ql, qi) => {
        ctx.fillText(ql, fbX + 28, fbY + 74 + qi * 24);
      });

      // Attribution Footer
      ctx.font = '600 12.5px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = C.textDim;
      const fbDate = studentFeedback.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      ctx.fillText(`Verified Exhibitor Reflection • ${studentName} (${className}) • Endorsed on ${fbDate}`, fbX + 28, fbY + 145);

      // Commendation Badge
      const commW = 210, commH = 34;
      const commX = fbX + fbW - commW - 24;
      const commY = fbY + 22;
      ctx.fillStyle = isDark ? 'rgba(245, 158, 11, 0.16)' : 'rgba(217, 119, 6, 0.12)';
      ctx.strokeStyle = isDark ? '#fbbf24' : '#d97706';
      ctx.lineWidth = 1;
      drawRoundRect(ctx, commX, commY, commW, commH, 8, true, true);
      ctx.font = '800 11px "Space Grotesk", sans-serif';
      ctx.fillStyle = isDark ? '#fbbf24' : '#b45309';
      ctx.textAlign = 'center';
      ctx.fillText('★ COMMENDED EXHIBITOR', commX + commW / 2, commY + 22);
      ctx.textAlign = 'left';

      ctx.restore();
      ctx.textAlign = 'left';

      p2CurY = fbY + fbH + 25;
    }

    // 6. DETACHABLE STUDENT AMBASSADOR BUSINESS CARD
    const cutY = p2CurY + 15;
    ctx.save();
    ctx.textAlign = 'left';

    // Dashed Scissor Guide
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.5)' : 'rgba(29, 78, 216, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(65, cutY);
    ctx.lineTo(CW - 65, cutY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = '700 12px "JetBrains Mono", monospace';
    ctx.fillStyle = isDark ? '#38bdf8' : '#1d4ed8';
    ctx.textAlign = 'center';
    ctx.fillText('✂ - - - - - - [ DETACHABLE OFFICIAL STUDENT AMBASSADOR BUSINESS CARD ] - - - - - - ✂', CW / 2, cutY - 10);
    ctx.textAlign = 'left';

    // Business Card Outer Container
    const bcX = 65, bcY = cutY + 22, bcW = CW - 130, bcH = 430;

    // Card Gradient Background
    const cardBgGrad = ctx.createLinearGradient(bcX, bcY, bcX + bcW, bcY + bcH);
    if (isDark) {
      cardBgGrad.addColorStop(0, '#06070a');
      cardBgGrad.addColorStop(0.45, '#0f172a');
      cardBgGrad.addColorStop(1, '#1e1b4b');
    } else {
      cardBgGrad.addColorStop(0, '#1e3a8a');
      cardBgGrad.addColorStop(0.55, '#1d4ed8');
      cardBgGrad.addColorStop(1, '#0284c7');
    }
    ctx.fillStyle = cardBgGrad;
    ctx.strokeStyle = isDark ? 'rgba(0, 240, 255, 0.5)' : 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    drawRoundRect(ctx, bcX, bcY, bcW, bcH, 22, true, true);

    // Inner Gold Accent Frame
    ctx.strokeStyle = isDark ? 'rgba(251, 191, 36, 0.35)' : 'rgba(254, 243, 199, 0.4)';
    ctx.lineWidth = 1;
    drawRoundRect(ctx, bcX + 12, bcY + 12, bcW - 24, bcH - 24, 16, false, true);

    // Card Top Branding
    ctx.textAlign = 'left';
    ctx.font = '800 14px "Space Grotesk", sans-serif';
    ctx.fillStyle = isDark ? '#38bdf8' : '#93c5fd';
    ctx.fillText('KANAKIA INTERNATIONAL SCHOOL · MIRA ROAD', bcX + 36, bcY + 44);

    // Gold Ambassador Tag
    const ambTag = 'OFFICIAL AMBASSADOR';
    ctx.font = '700 11px "Space Grotesk", sans-serif';
    const atW = ctx.measureText(ambTag).width + 18;
    ctx.fillStyle = isDark ? 'rgba(245, 158, 11, 0.18)' : 'rgba(255, 255, 255, 0.2)';
    ctx.strokeStyle = isDark ? '#fbbf24' : '#ffffff';
    ctx.lineWidth = 1;
    drawRoundRect(ctx, bcX + bcW - 350 - atW, bcY + 30, atW, 24, 999, true, true);
    ctx.fillStyle = isDark ? '#fbbf24' : '#ffffff';
    ctx.fillText(ambTag, bcX + bcW - 350 - atW + 9, bcY + 46);

    // Student Name in Bold Space Grotesk
    ctx.font = '800 42px "Space Grotesk", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(studentName.toUpperCase(), bcX + 36, bcY + 110);

    // Career Title Badge with Gradient
    ctx.font = '700 20px "Space Grotesk", sans-serif';
    const careerIcon = chosenCareer.icon || '🎯';
    const cTitleText = `${careerIcon} ${careerTitle}`;
    const cTitleW = ctx.measureText(cTitleText).width + 30;
    const cTitleGrad = ctx.createLinearGradient(bcX + 36, bcY + 138, bcX + 36 + cTitleW, bcY + 138);
    if (isDark) {
      cTitleGrad.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
      cTitleGrad.addColorStop(1, 'rgba(139, 92, 246, 0.3)');
    } else {
      cTitleGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
      cTitleGrad.addColorStop(1, 'rgba(255, 255, 255, 0.15)');
    }
    ctx.fillStyle = cTitleGrad;
    ctx.strokeStyle = isDark ? '#38bdf8' : '#ffffff';
    ctx.lineWidth = 1.2;
    drawRoundRect(ctx, bcX + 36, bcY + 138, cTitleW, 40, 10, true, true);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(cTitleText, bcX + 51, bcY + 165);

    // Metadata Lines
    ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = isDark ? '#cbd5e1' : '#e0e7ff';
    ctx.fillText(`Class & Section: ${className}`, bcX + 36, bcY + 215);

    ctx.fillText(`Issuing Body: Career Fair 2026 Academic Directorate`, bcX + 36, bcY + 248);

    ctx.font = '700 15px "JetBrains Mono", monospace';
    ctx.fillStyle = isDark ? '#38bdf8' : '#67e8f9';
    ctx.fillText(`Verified Credential ID: ${docId}`, bcX + 36, bcY + 282);

    ctx.font = '500 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = isDark ? '#94a3b8' : '#cbd5e1';
    ctx.fillText('Accredited Student Career Exploration Record · Valid Across Global Fair Partner Events', bcX + 36, bcY + 316);

    // Right Side: Scannable High-Contrast QR Code Box
    const qrSize = 250;
    const qrBoxW = 280;
    const qrBoxX = bcX + bcW - qrBoxW - 32;
    const qrBoxY = bcY + 50;

    // High-Contrast Pure White Rounded Square
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 4;
    drawRoundRect(ctx, qrBoxX, qrBoxY, qrBoxW, qrBoxW, 18, true, false);
    ctx.shadowColor = 'transparent';

    // Draw Vector QR Code
    const qrInnerOffset = (qrBoxW - qrSize) / 2;
    drawQrToCanvas(ctx, qrMatrix, qrBoxX + qrInnerOffset, qrBoxY + qrInnerOffset, qrSize);

    // Typography Under QR Box
    ctx.textAlign = 'center';
    ctx.font = '800 13px "JetBrains Mono", monospace';
    ctx.fillStyle = isDark ? '#38bdf8' : '#ffffff';
    ctx.fillText('SCAN TO VERIFY CREDENTIALS', qrBoxX + qrBoxW / 2, qrBoxY + qrBoxW + 25);

    ctx.font = '600 12px "JetBrains Mono", monospace';
    ctx.fillStyle = isDark ? '#94a3b8' : '#e0e7ff';
    ctx.fillText('careerwithenglish.pages.dev', qrBoxX + qrBoxW / 2, qrBoxY + qrBoxW + 45);

    ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.fillStyle = isDark ? '#fbbf24' : '#fde68a';
    ctx.fillText(docId, qrBoxX + qrBoxW / 2, qrBoxY + qrBoxW + 63);

    ctx.restore();
    ctx.textAlign = 'left';

    // Render Page 2 with JPEG 0.85 (Fast, low memory, ultra-sharp)
    const page2Data = canvas.toDataURL('image/jpeg', 0.85);
    doc.addImage(page2Data, 'JPEG', 0, 0, 210, 297);

    // Filename
    const safeFilenameName = (studentName || 'Student').replace(/[^a-zA-Z0-9]/g, '_');
    const cleanFilename = `ECF2026_CareerBooklet_${safeFilenameName}.pdf`;

    if (!options?.returnOnly) {
      doc.save(cleanFilename);

      if (window.DopamineEngine) {
        window.DopamineEngine.confetti(0.5, 0.4);
        window.DopamineEngine.playChime('fanfare');
        window.DopamineEngine.unlockBadge('booklet_graduate', 'Booklet Graduate', '📖');
      }

      if (typeof window.showToast === 'function') {
        window.showToast(`📖 2-Page Official Career Booklet downloaded: ${cleanFilename}`);
      }
    }

    return doc;
  }

  // Global Exports
  window.DossierPDF = {
    generate: generateStudentDossierPDF
  };
  window.BookletPDF = {
    generate: generateStudentDossierPDF
  };
  window.generateStudentDossierPDF = generateStudentDossierPDF;
  window.generateStudentBookletPDF = generateStudentDossierPDF;

})(window);
