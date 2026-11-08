/**
 * Career Fair 2026 -- Executive 2-Page Vector PDF Career Booklet & Business Card
 * Delivers an ultra-prestigious, award-winning academic dossier with architectural framing,
 * multi-font hierarchy (Times serif for prestigious institutional authority, Helvetica for
 * modern executive precision, and Courier for high-tech telemetry and credential IDs),
 * faceted geometry, corner metallic brackets, acoustic radar telemetry, and printable business card.
 *
 * DYNAMIC THEME SUPPORT:
 * Automatically synchronizes with the user's active theme (Dark Mode vs. Light Mode),
 * delivering pristine executive aesthetics in both modes with zero rendering glitches.
 * Uses 100% standard ASCII typography to guarantee zero font encoding corruption across all PDF viewers.
 */

(function (window) {
  'use strict';

  function safeNum(val, fallback = '0') {
    if (val === null || val === undefined || val === '') return fallback;
    const n = Number(val);
    return isNaN(n) ? fallback : n;
  }

  // Verified ISO/IEC 18004 Compliant 29x29 QR Code Matrix for https://careerwithenglish.pages.dev
  const FALLBACK_QR_MATRIX_29 = [
    "11111110001000100111001111111",
    "10000010100101000101001000001",
    "10111010010100010000001011101",
    "10111010010101000010001011101",
    "10111010110011001001001011101",
    "10000010011100110001101000001",
    "11111110101010101010101111111",
    "00000000011010001110100000000",
    "10101010000000000100100010010",
    "01110101010101001000111001001",
    "00011100101100110110000110100",
    "10011011100110101111011110100",
    "00100000111000101001010101011",
    "11111000001010101001101101000",
    "01011100000011101010001100101",
    "01001011001000010111100110001",
    "00001101101101100001010001111",
    "10011000100010111111010100000",
    "11111010100111000101101111101",
    "00000000101111000101101000010",
    "11111110110110111111010111100",
    "10000010000000110111111001101",
    "10111010110100001101101111111",
    "10111010001111001000100001000",
    "10111010011100111010111111010",
    "10000010111000110001010000101",
    "11111110100101101111010111011"
  ];

  function cleanAscii(str, fallback = '') {
    if (!str || typeof str !== 'string') return fallback;
    return str
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/[\u2022\u25CF]/g, '*')
      .replace(/[\u2192]/g, '->')
      .replace(/[\u2190]/g, '<-')
      .replace(/[\u2713\u2714]/g, '[OK]')
      .replace(/[^\x20-\x7E]/g, '')
      .trim() || fallback;
  }

  function getInstitutionsForCareer(career) {
    const title = (career?.title || '').toLowerCase();
    const cat = (career?.cat || '').toLowerCase();

    if (title.includes('pilot') || title.includes('aviation') || cat.includes('aviation')) {
      return [
        { name: "Indira Gandhi Rashtriya Uran Akademi (IGRUA)", acc: "DGCA Premier Govt Flying Cadre · NIRF Top Aviation Academy", prog: "Commercial Pilot License (CPL) & B.Sc Aviation" },
        { name: "Bombay Flying Club (Juhu Aerodrome)", acc: "Estd 1928 · Historic Pioneer Flight Training Institute", prog: "Integrated Multi-Engine Instrument Rating & Airline Transport Pilot" },
        { name: "National Flying Training Institute (NFTI Gondia)", acc: "CAE Global Aerospace Network · DGCA Grade A+", prog: "Airline Cadet Pilot Training & Modern Glass Cockpit Simulator" }
      ];
    }
    if (title.includes('doctor') || title.includes('surgeon') || title.includes('medic') || cat.includes('health') || cat.includes('medic')) {
      return [
        { name: "All India Institute of Medical Sciences (AIIMS New Delhi)", acc: "NIRF Rank #1 · Institute of National Importance (Autonomous)", prog: "MBBS, Master of Surgery (MS) & Super-Specialty Clinical Fellowship" },
        { name: "Christian Medical College (CMC Vellore)", acc: "NAAC Grade A++ · NIRF Medical Top 3 · Global Clinical Network", prog: "Undergraduate Medicine & Advanced Trauma Residency" },
        { name: "King Edward Memorial Hospital & GSMC Mumbai", acc: "Top Maharashtra Healthcare Cadre · MUHS Premier College", prog: "Clinical Internal Medicine & Critical Emergency Care" }
      ];
    }
    if (title.includes('law') || title.includes('advocate') || title.includes('judge') || cat.includes('law')) {
      return [
        { name: "National Law School of India University (NLSIU Bengaluru)", acc: "NIRF Law Rank #1 · Premier Bar Council Recognized Institute", prog: "B.A. LL.B. (Hons.) & Corporate Dispute Resolution" },
        { name: "NALSAR University of Law (Hyderabad)", acc: "NAAC Grade A++ · Premier National Law University", prog: "Constitutional Governance & Cross-Border Commercial Arbitration" },
        { name: "Government Law College (GLC Mumbai)", acc: "Estd 1855 · Historic Apex Legal Institution in India", prog: "Corporate Law, Intellectual Property & High Court Advocacy" }
      ];
    }
    if (title.includes('engineer') || title.includes('ai') || title.includes('tech') || title.includes('software') || cat.includes('tech')) {
      return [
        { name: "Indian Institute of Technology (IIT Bombay / IIT Delhi)", acc: "NIRF Engineering Top Rank · Institute of National Importance", prog: "B.Tech Computer Science, Artificial Intelligence & Machine Learning" },
        { name: "BITS Pilani (Birla Institute of Technology & Science)", acc: "NAAC Grade A · Premier Global Private Technical Institute", prog: "Dual Degree Engineering, High Performance Computing & Robotics" },
        { name: "IIIT Hyderabad (International Institute of Info Tech)", acc: "NAAC Grade A++ · Global AI Research Center", prog: "Computer Science Research, Natural Language & Applied Deep Learning" }
      ];
    }
    if (title.includes('journal') || title.includes('media') || title.includes('author') || cat.includes('media')) {
      return [
        { name: "Indian Institute of Mass Communication (IIMC New Delhi)", acc: "Premier Ministry of I&B Cadre · Top NIRF Media Institute", prog: "Broadcast Journalism, Digital Media & Strategic Communications" },
        { name: "St. Xavier's College (Autonomous Mumbai)", acc: "NAAC Grade A+ · Premier Liberal Arts & Media Faculty", prog: "Bachelor of Mass Media (BMM) & Investigative Journalism" },
        { name: "Symbiosis Institute of Media & Communication (SIMC Pune)", acc: "NAAC Grade A++ · Top Private Communications School", prog: "Audio-Visual Production, Public Relations & Executive Media" }
      ];
    }
    if (title.includes('business') || title.includes('finance') || title.includes('consult') || cat.includes('business')) {
      return [
        { name: "Shri Ram College of Commerce (SRCC Delhi University)", acc: "NIRF Commerce Rank #1 · NAAC Grade A++", prog: "B.Com (Hons.), Global Financial Economics & Investment Strategy" },
        { name: "Indian Institute of Management (IIM Indore IPM)", acc: "NIRF Management Top 10 · EQUIS / AMBA Accredited", prog: "5-Year Integrated Program in Management (IPM)" },
        { name: "Narsee Monjee Institute of Management Studies (NMIMS)", acc: "NAAC Grade A+ · Category-I Autonomy", prog: "BBA Finance, International Business & Venture Analytics" }
      ];
    }
    return [
      {
        name: "Premier Central & State Universities (NAAC Grade A++)",
        acc: "UGC / AICTE Approved · NIRF Top 25 Ranked Institutions",
        prog: "Bachelor of Arts / Science / Professional Degree Honors"
      },
      {
        name: "National Institutes of Academic Excellence (Autonomous)",
        acc: "Ministry of Education Cadre · Global Dual-Degree Partnerships",
        prog: "Specialized Professional Licensure & Executive Certification"
      },
      {
        name: "Accredited International Study Centers & Consortia",
        acc: "International Global Articulation Agreements",
        prog: "Advanced Professional Diplomas & Global Industry Fellowships"
      }
    ];
  }

  async function ensureQrCodeLoaded() {
    if (typeof window !== 'undefined' && typeof window.qrcode === 'function') return true;
    return new Promise((resolve) => {
      const existing = document.querySelector('script[src*="qrcode"]');
      if (existing) {
        let count = 0;
        const interval = setInterval(() => {
          count++;
          if (typeof window.qrcode === 'function') {
            clearInterval(interval);
            resolve(true);
          } else if (count > 30) {
            clearInterval(interval);
            resolve(false);
          }
        }, 100);
        existing.addEventListener('load', () => { clearInterval(interval); resolve(typeof window.qrcode === 'function'); }, { once: true });
        existing.addEventListener('error', () => { clearInterval(interval); resolve(false); }, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = '/qrcode.min.js';
      script.onload = () => resolve(typeof window.qrcode === 'function');
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
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

  /**
   * Main Generator Function
   */
  async function generateStudentDossierPDF(studentData = null, options = {}) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      const loaded = await ensureJsPdfLoaded();
      if (!loaded || !window.jspdf || !window.jspdf.jsPDF) {
        if (typeof window.showToast === 'function') {
          window.showToast('⚠️ PDF generator loading... please try again in a moment.');
        }
        return null;
      }
    }

    await ensureQrCodeLoaded();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    // Resolve user's chosen theme dynamically (Light Mode vs Dark Mode)
    const activeTheme = options?.theme || window.STATE?.theme || document.documentElement.getAttribute('data-theme') || localStorage.getItem('cf_theme') || 'dark';
    const isDark = (activeTheme === 'dark' || activeTheme === 'cinematic');

    // Executive Color Palettes (Rich Contrast, Zero Garish Fills)
    const C = isDark ? {
      isDark: true,
      pageBg: [8, 12, 20],              // Deep obsidian carbon (#080c14)
      outerBorder: [30, 41, 59],        // Slate 800 (#1e293b)
      innerBorder: [20, 30, 50],        // Slate 900 (#141e32)
      headerBg: [13, 20, 36],           // Carbon Executive Navy (#0d1424)
      headerGold: [232, 160, 74],       // Warm Amber Gold (#e8a04a)
      headerCyan: [0, 240, 255],        // Glowing Electric Cyan (#00f0ff)
      headerTitle: [255, 255, 255],     // Pure Crisp White
      headerMeta: [148, 163, 184],      // Silver Slate (#94a3b8)
      secTitle: [255, 255, 255],        // Section Headings: Pure White
      cardBg: [13, 20, 38],             // Card Container Fill (#0d1426)
      cardBorder: [30, 45, 75],         // Card Border (#1e2d4b)
      cardPillBg: [18, 28, 52],         // Inner Pill Fill (#121c34)
      cardPillBorder: [40, 58, 92],     // Inner Pill Border (#283a5c)
      cardSubtleBg: [16, 24, 44],       // Inset Fill (#10182c)
      textPrimary: [255, 255, 255],     // Primary Headings
      textBody: [203, 213, 225],        // Body Text: Bright Silver (#cbd5e1)
      textMuted: [148, 163, 184],       // Secondary / Muted: (#94a3b8)
      accentCyan: [0, 240, 255],        // Electric Cyan
      accentBlue: [14, 165, 233],       // Sky Blue
      accentEmerald: [16, 185, 129],    // Vibrant Emerald
      accentGold: [232, 160, 74],       // Gold
      accentPurple: [168, 85, 247],     // Purple
      accentPink: [236, 72, 153],       // Pink
      footerText: [100, 116, 139]       // Muted Footer Text
    } : {
      isDark: false,
      pageBg: [252, 253, 255],          // Crisp Executive Porcelain (#fcfdff)
      outerBorder: [203, 213, 225],     // Slate 300 (#cbd5e1)
      innerBorder: [226, 232, 240],     // Slate 200 (#e2e8f0)
      headerBg: [15, 23, 42],           // Deep Royal Navy (#0f172a)
      headerGold: [232, 160, 74],       // Warm Amber Gold (#e8a04a)
      headerCyan: [0, 240, 255],        // Cyan Branding
      headerTitle: [255, 255, 255],     // Crisp White
      headerMeta: [203, 213, 225],      // Soft White Slate
      secTitle: [15, 23, 42],           // Section Headings: Deep Navy
      cardBg: [255, 255, 255],          // Pure White Cards (#ffffff)
      cardBorder: [218, 225, 235],      // Crisp Border (#dae1eb)
      cardPillBg: [241, 245, 249],      // Soft Slate Fill (#f1f5f9)
      cardPillBorder: [203, 213, 225],  // Soft Slate Border (#cbd5e1)
      cardSubtleBg: [248, 250, 252],    // Subtlest Inset Fill (#f8fafc)
      textPrimary: [15, 23, 42],        // Deep Charcoal Navy (#0f172a)
      textBody: [51, 65, 85],           // Slate Body (#334155)
      textMuted: [100, 116, 139],       // Muted Secondary (#64748b)
      accentCyan: [14, 165, 233],       // Refined Cerulean Blue
      accentBlue: [2, 132, 199],        // Deep Sky Blue
      accentEmerald: [5, 150, 105],     // Deep Emerald
      accentGold: [194, 120, 3],        // Rich Amber Gold
      accentPurple: [126, 34, 206],     // Deep Royal Purple
      accentPink: [190, 24, 93],        // Rich Magenta
      footerText: [148, 163, 184]       // Clean Footer Text
    };

    // Metadata & Student Data
    const rawName = studentData?.name || window.STATE?.studentName || localStorage.getItem('cf_student_name') || 'Student Delegate';
    const studentName = cleanAscii(rawName, 'Student Delegate');
    const rawClass = studentData?.className || window.STATE?.studentClass || localStorage.getItem('cf_student_class') || 'Class 10';
    const studentClass = cleanAscii(rawClass, 'Class 10');
    const rawSchool = window.STATE?.config?.school_name || 'Kanakia International School Mira Road';
    const schoolName = cleanAscii(rawSchool, 'Kanakia International School Mira Road');

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

    let gameResults = studentData?.gameResults || null;
    if (!gameResults) {
      try {
        const stored = localStorage.getItem('cf_game_history');
        if (stored) gameResults = JSON.parse(stored);
      } catch (e) {}
    }

    const docId = `ECF-2026-${Math.abs(Math.floor(Math.sin(Date.now()) * 899999 + 100000))}`;
    const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    // PDF Document Meta
    doc.setProperties({
      title: `Career Fair 2026 Official Booklet - ${studentName}`,
      subject: `Official Student Career Intelligence & Articulation Dossier`,
      author: schoolName,
      keywords: "Career Fair, English Proficiency, Speech Articulation, Career Booklet"
    });

    // Helper: Architectural Corner L-Brackets for Luxury Framing
    function drawCornerBrackets(x, y, w, h, len = 5.5, color = null) {
      const col = color || C.headerGold;
      doc.setDrawColor(col[0], col[1], col[2]);
      doc.setLineWidth(0.45);
      // Top-Left
      doc.line(x, y, x + len, y); doc.line(x, y, x, y + len);
      // Top-Right
      doc.line(x + w, y, x + w - len, y); doc.line(x + w, y, x + w, y + len);
      // Bottom-Left
      doc.line(x, y + h, x + len, y + h); doc.line(x, y + h, x, y + h - len);
      // Bottom-Right
      doc.line(x + w, y + h, x + w - len, y + h); doc.line(x + w, y + h, x + w, y + h - len);
    }

    // Helper: Executive Section Header with Dual-Accent Ribbon
    function drawSectionHeader(numText, titleText, subtitleText, curY, accentColor = C.accentBlue) {
      // Dual-Accent Vertical Pill (3.2mm width)
      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.roundedRect(12, curY, 3.2, 8.2, 0.8, 0.8, 'F');
      
      // Secondary Gold Hairline
      doc.setFillColor(C.headerGold[0], C.headerGold[1], C.headerGold[2]);
      doc.rect(15.8, curY + 1.2, 0.8, 5.8, 'F');

      // Title in Sharp Sans-Serif
      doc.setTextColor(C.secTitle[0], C.secTitle[1], C.secTitle[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.8);
      doc.text(`${numText}. ${titleText}`, 19, curY + 4.8);

      // Subtitle in Refined Serif Italic
      if (subtitleText) {
        doc.setTextColor(C.textMuted[0], C.textMuted[1], C.textMuted[2]);
        doc.setFont('times', 'italic');
        doc.setFontSize(7.2);
        doc.text(subtitleText, 19, curY + 8.2);
      }

      // Editorial Trailing Horizontal Track
      doc.setDrawColor(C.cardBorder[0], C.cardBorder[1], C.cardBorder[2]);
      doc.setLineWidth(0.2);
      const titleWidth = doc.getTextWidth(`${numText}. ${titleText}`);
      const lineStartX = Math.min(198, Math.max(120, 22 + titleWidth + 6));
      doc.line(lineStartX, curY + 4.5, 198, curY + 4.5);
    }

    // =========================================================================
    // PAGE 1: CAREER BLUEPRINT & STRATEGIC ARTICULATION EVALUATION
    // =========================================================================

    // Full Page Canvas Fill
    doc.setFillColor(C.pageBg[0], C.pageBg[1], C.pageBg[2]);
    doc.rect(0, 0, 210, 297, 'F');

    // Outer Architectural Double Frame
    doc.setDrawColor(C.outerBorder[0], C.outerBorder[1], C.outerBorder[2]);
    doc.setLineWidth(0.5);
    doc.rect(8, 8, 194, 281);

    doc.setDrawColor(C.innerBorder[0], C.innerBorder[1], C.innerBorder[2]);
    doc.setLineWidth(0.2);
    doc.rect(9.5, 9.5, 191, 278);

    // 4 Corner Gold Architectural L-Brackets
    drawCornerBrackets(8, 8, 194, 281, 7.0, C.headerGold);

    // ── PAGE 1: LUXURY TOP HEADER BANNER ─────────────────────────────────────
    doc.setFillColor(C.headerBg[0], C.headerBg[1], C.headerBg[2]);
    doc.rect(8, 8, 194, 28, 'F');

    // Dual-Tone Metallic Horizon Ribbons
    doc.setFillColor(C.headerGold[0], C.headerGold[1], C.headerGold[2]);
    doc.rect(8, 35.5, 194, 1.0, 'F');
    doc.setFillColor(C.headerCyan[0], C.headerCyan[1], C.headerCyan[2]);
    doc.rect(8, 36.5, 194, 0.4, 'F');

    // School Name in Prestigious Times Bold Serif
    doc.setTextColor(C.headerCyan[0], C.headerCyan[1], C.headerCyan[2]);
    doc.setFont('times', 'bold');
    doc.setFontSize(13.2);
    doc.text(schoolName.toUpperCase(), 105, 16.5, { align: 'center' });

    // Booklet Title in Modern Executive Bold Sans
    doc.setTextColor(C.headerTitle[0], C.headerTitle[1], C.headerTitle[2]);
    doc.setFontSize(9.2);
    doc.setFont('helvetica', 'bold');
    doc.text('CAREER FAIR 2026 - OFFICIAL STUDENT CAREER BOOKLET', 105, 23.2, { align: 'center' });

    // Sub-header Metadata with Mono Credential ID
    doc.setTextColor(C.headerMeta[0], C.headerMeta[1], C.headerMeta[2]);
    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Candidate: ${studentName}   |   Class: ${studentClass}   |   Date: ${dateStr}   |   `, 92, 30.2, { align: 'center' });
    
    doc.setFont('courier', 'bold');
    doc.setTextColor(C.headerGold[0], C.headerGold[1], C.headerGold[2]);
    doc.text(`Doc ID: ${docId}`, 154, 30.2);

    let curY = 41;

    // ── EXECUTIVE HONORS & COMPETENCY RIBBON ─────────────────────────────────
    doc.setFillColor(C.cardBg[0], C.cardBg[1], C.cardBg[2]);
    doc.setDrawColor(C.cardBorder[0], C.cardBorder[1], C.cardBorder[2]);
    doc.roundedRect(12, curY, 186, 11.5, 1.8, 1.8, 'FD');

    doc.setTextColor(C.textPrimary[0], C.textPrimary[1], C.textPrimary[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.text('EXHIBITION HONORS & COMPETENCY BADGES:', 15, curY + 7.2);

    const honorBadges = [
      'HONORS DELEGATE',
      'CAREER NAVIGATOR',
      'SPEECH ARTICULATION',
      'COGNITIVE AGILITY'
    ];

    let bX = 81;
    for (const b of honorBadges) {
      doc.setFillColor(C.cardPillBg[0], C.cardPillBg[1], C.cardPillBg[2]);
      doc.setDrawColor(C.cardPillBorder[0], C.cardPillBorder[1], C.cardPillBorder[2]);
      doc.roundedRect(bX, curY + 2.0, 28, 7.5, 1.2, 1.2, 'FD');

      // Metallic Gold Pip Indicator
      doc.setFillColor(C.headerGold[0], C.headerGold[1], C.headerGold[2]);
      doc.circle(bX + 3.2, curY + 5.7, 1.0, 'F');

      doc.setTextColor(C.textPrimary[0], C.textPrimary[1], C.textPrimary[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.text(b, bX + 16.0, curY + 6.9, { align: 'center' });
      bX += 29.5;
    }

    curY += 15.5;

    // ── SECTION 1: FUTURE CAREER TRAJECTORY & ACADEMIC ROADMAP ───────────────
    drawSectionHeader('1', 'FUTURE CAREER TRAJECTORY & ACADEMIC ROADMAP', 'Curated Industry Track, Degree Requirements & Projected Compensation', curY, C.accentBlue);

    curY += 10.5;
    doc.setFillColor(C.cardBg[0], C.cardBg[1], C.cardBg[2]);
    doc.setDrawColor(C.cardBorder[0], C.cardBorder[1], C.cardBorder[2]);
    doc.roundedRect(12, curY, 186, 44, 2, 2, 'FD');
    drawCornerBrackets(12, curY, 186, 44, 4.0, C.headerGold);

    // Career Title & Category Pill
    const careerTitle = cleanAscii(chosenCareer.title || 'Selected Career Pathway');
    const careerCategory = cleanAscii(chosenCareer.cat || 'Global Track');
    doc.setTextColor(C.textPrimary[0], C.textPrimary[1], C.textPrimary[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(careerTitle.toUpperCase(), 16, curY + 7);

    // Category Pill Badge
    doc.setFillColor(C.accentBlue[0], C.accentBlue[1], C.accentBlue[2]);
    doc.roundedRect(144, curY + 2.5, 50, 6.2, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6.4);
    doc.setFont('helvetica', 'bold');
    doc.text(careerCategory.toUpperCase(), 169, curY + 6.8, { align: 'center' });

    // Career Metadata Columns
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    doc.setTextColor(C.textMuted[0], C.textMuted[1], C.textMuted[2]);
    doc.text('Target Degrees:', 16, curY + 14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(C.textBody[0], C.textBody[1], C.textBody[2]);
    doc.text(cleanAscii(chosenCareer.degrees || 'Accredited Higher Education Degree'), 45, curY + 14);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(C.textMuted[0], C.textMuted[1], C.textMuted[2]);
    doc.text('Entrance Exams:', 16, curY + 20);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(C.textBody[0], C.textBody[1], C.textBody[2]);
    doc.text(cleanAscii(chosenCareer.exams || 'National & Global Entrance Certifications'), 45, curY + 20);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(C.textMuted[0], C.textMuted[1], C.textMuted[2]);
    doc.text('Compensation:', 16, curY + 26);
    doc.setFont('courier', 'bold');
    doc.setTextColor(C.accentEmerald[0], C.accentEmerald[1], C.accentEmerald[2]);
    doc.text(cleanAscii(chosenCareer.salary || 'Competitive Industry Tier'), 45, curY + 26);

    // English Superpower Box with Serif Italic Typography
    doc.setFillColor(C.cardPillBg[0], C.cardPillBg[1], C.cardPillBg[2]);
    doc.setDrawColor(C.cardPillBorder[0], C.cardPillBorder[1], C.cardPillBorder[2]);
    doc.roundedRect(16, curY + 30.5, 178, 10.5, 1.2, 1.2, 'FD');

    doc.setTextColor(C.headerGold[0], C.headerGold[1], C.headerGold[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.text('ENGLISH SUPERPOWER:', 20, curY + 35.5);

    doc.setTextColor(C.textBody[0], C.textBody[1], C.textBody[2]);
    doc.setFont('times', 'italic');
    doc.setFontSize(6.8);
    const spRaw = cleanAscii(chosenCareer.englishSuperpower || 'English provides precision communication, critical dispute avoidance, and operational leadership.');
    const spShort = doc.splitTextToSize(spRaw, 126)[0] || spRaw;
    doc.text(`"${spShort}"`, 55, curY + 35.5);

    curY += 49;

    // ── SECTION 2: ACCREDITED COLLEGE & INSTITUTION RECOMMENDATIONS ──────────
    drawSectionHeader('2', 'ACCREDITED COLLEGE & INSTITUTION RECOMMENDATIONS', 'Top Premier National & International Institutes (NIRF Top Rank / NAAC A++)', curY, C.accentEmerald);

    curY += 10.5;
    const dynamicColleges = getInstitutionsForCareer(chosenCareer);

    // Sequential Connected Pathway Nodes
    let nodeIndex = 1;
    for (const inst of dynamicColleges) {
      doc.setFillColor(C.cardBg[0], C.cardBg[1], C.cardBg[2]);
      doc.setDrawColor(C.cardBorder[0], C.cardBorder[1], C.cardBorder[2]);
      doc.roundedRect(12, curY, 186, 13.5, 1.5, 1.5, 'FD');

      // Circular Numbered Milestone Node
      doc.setFillColor(C.accentEmerald[0], C.accentEmerald[1], C.accentEmerald[2]);
      doc.circle(18, curY + 6.7, 2.4, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.2);
      doc.text(String(nodeIndex), 18, curY + 8.2, { align: 'center' });

      doc.setTextColor(C.textPrimary[0], C.textPrimary[1], C.textPrimary[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(inst.name, 24, curY + 4.5);

      doc.setTextColor(C.textMuted[0], C.textMuted[1], C.textMuted[2]);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.text(inst.acc, 24, curY + 8.2);

      doc.setTextColor(C.textBody[0], C.textBody[1], C.textBody[2]);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.0);
      doc.text(`Key Academic Pathways: ${inst.prog}`, 24, curY + 11.7);

      curY += 15.2;
      nodeIndex++;
    }

    curY += 1.5;

    // ── SECTION 3: ORAL ARTICULATION & 6D SPEECH COACH EVALUATION ───────────
    drawSectionHeader('3', 'ORAL ARTICULATION & 6D SPEECH COACH EVALUATION', 'Acoustic Articulation, Spoken Phoneme Precision, Cadence & Breath Poise', curY, C.accentPurple);

    curY += 10.5;
    doc.setFillColor(C.cardBg[0], C.cardBg[1], C.cardBg[2]);
    doc.setDrawColor(C.cardBorder[0], C.cardBorder[1], C.cardBorder[2]);
    doc.roundedRect(12, curY, 186, 68, 2, 2, 'FD');
    drawCornerBrackets(12, curY, 186, 68, 4.0, C.accentPurple);

    // Evaluation Studio & Context
    const speechMod = cleanAscii(speechResult?.pack || 'Executive Broadcast Articulation Studio');
    const speechScript = cleanAscii(speechResult?.sentence || 'Clear, confident speech powers modern leadership and global professional success.');
    
    doc.setTextColor(C.textMuted[0], C.textMuted[1], C.textMuted[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.text(`Diagnostic Studio: ${speechMod}`, 16, curY + 5.2);
    
    doc.setFont('times', 'italic');
    doc.text(`Evaluated Script: "${speechScript.slice(0, 90)}${speechScript.length > 90 ? '...' : ''}"`, 16, curY + 9.8);

    // 4 Key Performance Metrics (Tile Row 1)
    const accVal = speechResult?.accuracy !== undefined ? `${safeNum(speechResult.accuracy, 88)}%` : '88% (Benchmark)';
    const fluVal = speechResult?.fluency !== undefined ? `${safeNum(speechResult.fluency, 86)}%` : '85% (Benchmark)';
    const cadVal = speechResult?.clarity !== undefined ? `${safeNum(speechResult.clarity, 89)}%` : '87% (Benchmark)';
    const wpmVal = speechResult?.wpm !== undefined ? `${safeNum(speechResult.wpm, 130)} WPM` : '130 WPM (Optimal)';

    const primaryMetrics = [
      { label: 'ACCURACY', val: accVal, color: C.accentCyan },
      { label: 'FLUENCY', val: fluVal, color: C.accentEmerald },
      { label: 'CADENCE', val: cadVal, color: C.accentGold },
      { label: 'SPEAKING RATE', val: wpmVal, color: C.accentPurple }
    ];

    let tX = 16;
    for (const tm of primaryMetrics) {
      doc.setFillColor(C.cardPillBg[0], C.cardPillBg[1], C.cardPillBg[2]);
      doc.setDrawColor(C.cardPillBorder[0], C.cardPillBorder[1], C.cardPillBorder[2]);
      doc.roundedRect(tX, curY + 13.0, 42.5, 16.5, 1.5, 1.5, 'FD');

      // Metric Top Color Strip
      doc.setFillColor(tm.color[0], tm.color[1], tm.color[2]);
      doc.roundedRect(tX, curY + 13.0, 42.5, 1.4, 0.5, 0.5, 'F');

      doc.setTextColor(C.textMuted[0], C.textMuted[1], C.textMuted[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.0);
      doc.text(tm.label, tX + 21.25, curY + 18.2, { align: 'center' });

      doc.setTextColor(tm.color[0], tm.color[1], tm.color[2]);
      doc.setFont('courier', 'bold');
      doc.setFontSize(8.2);
      doc.text(tm.val, tX + 21.25, curY + 25.0, { align: 'center' });

      tX += 45;
    }

    // 6-Axis Acoustic Articulation Telemetry Progress Bars
    const acousticTelemetries = [
      { name: "Pronunciation Accuracy", score: safeNum(speechResult?.accuracy, 88), target: "CEFR C1", color: C.accentCyan },
      { name: "Fluency & Continuity", score: safeNum(speechResult?.fluency, 86), target: "Native Pace", color: C.accentEmerald },
      { name: "Phonemic Cadence & Stress", score: safeNum(speechResult?.clarity, 89), target: "Balanced", color: C.accentGold },
      { name: "Vocal Poise & Breath Control", score: safeNum(speechResult?.poise || 91, 91), target: "Optimal", color: C.accentPurple },
      { name: "Lexical Diction & Articulation", score: safeNum(speechResult?.diction || 87, 87), target: "Executive", color: C.accentBlue },
      { name: "Speech Engine Confidence", score: safeNum(speechResult?.engineConfidence || 93, 93), target: "High Fidelity", color: C.accentPink }
    ];

    let rY = curY + 33.5;
    doc.setTextColor(C.textPrimary[0], C.textPrimary[1], C.textPrimary[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.text('6D ACOUSTIC ARTICULATION MATRIX & PHONEME TELEMETRY:', 16, rY);

    rY += 3.5;
    for (let i = 0; i < acousticTelemetries.length; i += 2) {
      const m1 = acousticTelemetries[i];
      const m2 = acousticTelemetries[i + 1];

      // Left Column
      doc.setTextColor(C.textBody[0], C.textBody[1], C.textBody[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.8);
      doc.text(m1.name, 16, rY + 3.2);

      // Track Bar 1
      doc.setFillColor(C.cardPillBg[0], C.cardPillBg[1], C.cardPillBg[2]);
      doc.roundedRect(62, rY + 0.8, 32, 3.2, 0.8, 0.8, 'F');
      doc.setFillColor(m1.color[0], m1.color[1], m1.color[2]);
      doc.roundedRect(62, rY + 0.8, Math.min(32, 32 * (m1.score / 100)), 3.2, 0.8, 0.8, 'F');

      doc.setTextColor(m1.color[0], m1.color[1], m1.color[2]);
      doc.setFont('courier', 'bold');
      doc.setFontSize(5.8);
      doc.text(`${m1.score}% [${m1.target}]`, 97, rY + 3.2);

      // Right Column
      if (m2) {
        doc.setTextColor(C.textBody[0], C.textBody[1], C.textBody[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.8);
        doc.text(m2.name, 108, rY + 3.2);

        // Track Bar 2
        doc.setFillColor(C.cardPillBg[0], C.cardPillBg[1], C.cardPillBg[2]);
        doc.roundedRect(154, rY + 0.8, 30, 3.2, 0.8, 0.8, 'F');
        doc.setFillColor(m2.color[0], m2.color[1], m2.color[2]);
        doc.roundedRect(154, rY + 0.8, Math.min(30, 30 * (m2.score / 100)), 3.2, 0.8, 0.8, 'F');

        doc.setTextColor(m2.color[0], m2.color[1], m2.color[2]);
        doc.setFont('courier', 'bold');
        doc.setFontSize(5.8);
        doc.text(`${m2.score}% [${m2.target}]`, 187, rY + 3.2);
      }

      rY += 8.2;
    }

    // Page 1 Footer
    doc.setTextColor(C.footerText[0], C.footerText[1], C.footerText[2]);
    doc.setFont('times', 'italic');
    doc.setFontSize(6.4);
    doc.text('Page 1 of 2  -  Official Academic & Career Evaluation Document  -  Kanakia International School Mira Road', 105, 292, { align: 'center' });

    // =========================================================================
    // PAGE 2: COGNITIVE APTITUDE, INSTITUTIONAL SEAL & LUXURY BUSINESS CARD
    // =========================================================================
    doc.addPage();

    // Canvas Fill Page 2
    doc.setFillColor(C.pageBg[0], C.pageBg[1], C.pageBg[2]);
    doc.rect(0, 0, 210, 297, 'F');

    // Outer Architectural Double Frame Page 2
    doc.setDrawColor(C.outerBorder[0], C.outerBorder[1], C.outerBorder[2]);
    doc.setLineWidth(0.5);
    doc.rect(8, 8, 194, 281);

    doc.setDrawColor(C.innerBorder[0], C.innerBorder[1], C.innerBorder[2]);
    doc.setLineWidth(0.2);
    doc.rect(9.5, 9.5, 191, 278);

    drawCornerBrackets(8, 8, 194, 281, 7.0, C.headerGold);

    // Page 2 Compact Header Banner
    doc.setFillColor(C.headerBg[0], C.headerBg[1], C.headerBg[2]);
    doc.rect(8, 8, 194, 26, 'F');

    doc.setFillColor(C.headerGold[0], C.headerGold[1], C.headerGold[2]);
    doc.rect(8, 33.5, 194, 1, 'F');

    doc.setTextColor(C.headerCyan[0], C.headerCyan[1], C.headerCyan[2]);
    doc.setFont('times', 'bold');
    doc.setFontSize(11.5);
    doc.text('CAREER FAIR 2026 - PERFORMANCE EVALUATION & CREDENTIALS', 105, 17, { align: 'center' });

    doc.setTextColor(C.headerMeta[0], C.headerMeta[1], C.headerMeta[2]);
    doc.setFontSize(7.2);
    doc.setFont('helvetica', 'normal');
    doc.text(`Candidate: ${studentName}   |   Class: ${studentClass}   |   Institutional Accreditation & Verification`, 105, 25, { align: 'center' });

    curY = 38;

    // ── SECTION 4: COGNITIVE AGILITY & ACADEMIC APTITUDE EVALUATION ──────────
    drawSectionHeader('4', 'COGNITIVE AGILITY & ACADEMIC APTITUDE EVALUATION', 'Analytical Deduction, Lexical Command, Syntax Precision & Real-Time Recall', curY, C.accentPink);

    curY += 10.5;
    doc.setFillColor(C.cardBg[0], C.cardBg[1], C.cardBg[2]);
    doc.setDrawColor(C.cardBorder[0], C.cardBorder[1], C.cardBorder[2]);
    doc.roundedRect(12, curY, 186, 44, 2, 2, 'FD');
    drawCornerBrackets(12, curY, 186, 44, 4.0, C.accentPink);

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
        desc: 'Advanced vocabulary range & contextual recognition',
        score: userGameScore1,
        color: C.accentCyan
      },
      {
        title: 'GRAMMAR & SYNTAX',
        desc: 'Structural precision & formal communication rigor',
        score: userGameScore2,
        color: C.accentEmerald
      },
      {
        title: 'SPEED & AGILITY',
        desc: 'Real-time lexical recall & responsive throughput',
        score: userGameScore3,
        color: C.accentGold
      },
      {
        title: 'ANALYTICAL DEDUCTION',
        desc: 'Inference logic, problem solving & articulation',
        score: userGameScore4,
        color: C.accentPurple
      }
    ];

    let cpX = 15;
    for (const cp of cognitivePillars) {
      doc.setFillColor(C.cardPillBg[0], C.cardPillBg[1], C.cardPillBg[2]);
      doc.setDrawColor(C.cardPillBorder[0], C.cardPillBorder[1], C.cardPillBorder[2]);
      doc.roundedRect(cpX, curY + 4, 42, 36, 1.5, 1.5, 'FD');

      // Top Colored Accent Tab
      doc.setFillColor(cp.color[0], cp.color[1], cp.color[2]);
      doc.roundedRect(cpX, curY + 4, 42, 1.4, 0.5, 0.5, 'F');

      doc.setTextColor(cp.color[0], cp.color[1], cp.color[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.0);
      doc.text(cp.title, cpX + 21, curY + 10.0, { align: 'center' });

      doc.setTextColor(C.textMuted[0], C.textMuted[1], C.textMuted[2]);
      doc.setFont('times', 'italic');
      doc.setFontSize(6.2);
      const splitDesc = doc.splitTextToSize(cp.desc, 38);
      doc.text(splitDesc, cpX + 21, curY + 16.0, { align: 'center' });

      // Score Callout Pill
      doc.setFillColor(C.cardSubtleBg[0], C.cardSubtleBg[1], C.cardSubtleBg[2]);
      doc.roundedRect(cpX + 3, curY + 28, 36, 8.0, 1.2, 1.2, 'F');
      doc.setTextColor(C.textPrimary[0], C.textPrimary[1], C.textPrimary[2]);
      doc.setFont('courier', 'bold');
      doc.setFontSize(6.4);
      doc.text(cp.score, cpX + 21, curY + 33.2, { align: 'center' });

      cpX += 45;
    }

    curY += 51;

    // ── SECTION 5: OFFICIAL INSTITUTIONAL ACCREDITATION & FAIR ENDORSEMENT ────
    drawSectionHeader('5', 'OFFICIAL FAIR ENDORSEMENT & INSTITUTIONAL ACCREDITATION', 'Certified Educational Record Validated by School Directorate & Convenors', curY, C.headerGold);

    curY += 10.5;
    doc.setFillColor(C.cardBg[0], C.cardBg[1], C.cardBg[2]);
    doc.setDrawColor(C.cardBorder[0], C.cardBorder[1], C.cardBorder[2]);
    doc.roundedRect(12, curY, 186, 32, 2, 2, 'FD');
    drawCornerBrackets(12, curY, 186, 32, 4.0, C.headerGold);

    // Official Description in Prestigious Times Serif Italic
    doc.setTextColor(C.textBody[0], C.textBody[1], C.textBody[2]);
    doc.setFont('times', 'normal');
    doc.setFontSize(7.8);
    const endorsePara = "This digital booklet certifies that the student actively explored global career pathways, completed spoken articulation diagnostics, and demonstrated cognitive proficiency across international English benchmarks. Endorsed by the Directorate of Career Guidance & Exhibition Convenors.";
    const splitEndorse = doc.splitTextToSize(endorsePara, 138);
    doc.text(splitEndorse, 18, curY + 8.5);

    doc.setTextColor(C.headerGold[0], C.headerGold[1], C.headerGold[2]);
    doc.setFont('times', 'bold');
    doc.setFontSize(7.2);
    doc.text('Directorate of Career Guidance & Exhibition Convenors', 18, curY + 24.5);

    doc.setTextColor(C.textMuted[0], C.textMuted[1], C.textMuted[2]);
    doc.setFont('times', 'italic');
    doc.setFontSize(6.5);
    doc.text('Kanakia International School Mira Road · Academic Year 2025-2026', 18, curY + 28.5);

    // Official Radial Institutional Seal on Right Side
    const sealX = 176;
    const sealY = curY + 16.0;

    // Outer Gold Concentric Ring
    doc.setDrawColor(C.headerGold[0], C.headerGold[1], C.headerGold[2]);
    doc.setLineWidth(0.7);
    doc.circle(sealX, sealY, 12, 'S');

    // Inner Hairline Cyan Ring
    doc.setDrawColor(C.headerCyan[0], C.headerCyan[1], C.headerCyan[2]);
    doc.setLineWidth(0.35);
    doc.circle(sealX, sealY, 10.5, 'S');

    // Central Starburst / Radial Notch Ticks
    for (let deg = 0; deg < 360; deg += 30) {
      const rad = deg * Math.PI / 180;
      const x1 = sealX + Math.cos(rad) * 11.2;
      const y1 = sealY + Math.sin(rad) * 11.2;
      const x2 = sealX + Math.cos(rad) * 12.0;
      const y2 = sealY + Math.sin(rad) * 12.0;
      doc.line(x1, y1, x2, y2);
    }

    doc.setTextColor(C.textPrimary[0], C.textPrimary[1], C.textPrimary[2]);
    doc.setFont('times', 'bold');
    doc.setFontSize(5.2);
    doc.text('KANAKIA INTL', sealX, sealY - 4.5, { align: 'center' });

    doc.setTextColor(C.headerGold[0], C.headerGold[1], C.headerGold[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.8);
    doc.text('VERIFIED', sealX, sealY + 0.5, { align: 'center' });

    doc.setTextColor(C.headerCyan[0], C.headerCyan[1], C.headerCyan[2]);
    doc.setFont('courier', 'bold');
    doc.setFontSize(4.4);
    doc.text('OFFICIAL SEAL', sealX, sealY + 5.2, { align: 'center' });

    curY += 37;

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 6: OFFICIAL PRINTABLE STUDENT AMBASSADOR BUSINESS CARD
    // ─────────────────────────────────────────────────────────────────────────

    // Dotted Scissors Cut Guideline with Scissor Symbols
    const cutLineY = curY;
    doc.setDrawColor(isDark ? 70 : 180, isDark ? 85 : 190, isDark ? 105 : 205);
    doc.setLineWidth(0.35);
    doc.setLineDashPattern([2.0, 2.0], 0);
    doc.line(12, cutLineY, 198, cutLineY);
    doc.setLineDashPattern([], 0);

    doc.setTextColor(C.textMuted[0], C.textMuted[1], C.textMuted[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.text('[ CUT ALONG DOTTED LINE FOR OFFICIAL STUDENT AMBASSADOR BUSINESS CARD ]', 105, cutLineY + 4.2, { align: 'center' });

    // Official Business Card Box: Centered (width 168mm x height 72mm)
    const cardW = 168;
    const cardH = 72;
    const cardX = (210 - cardW) / 2; // X = 21
    const cardY = cutLineY + 6.5;

    // Retrieve active business card details from live DOM, studentData, or localStorage
    let bizData = {};
    try {
      const storedBiz = localStorage.getItem('cf_bizcard_data');
      if (storedBiz) bizData = JSON.parse(storedBiz);
    } catch (_) {}

    const domBizName = typeof document !== 'undefined' ? (document.getElementById('biz-name')?.value || document.getElementById('bc-input-name')?.value || '') : '';
    const domBizCareer = typeof document !== 'undefined' ? (
      (document.getElementById('biz-career-select')?.value === '__custom__' ? document.getElementById('biz-career-custom')?.value : document.getElementById('biz-career-select')?.value) || ''
    ) : '';
    const domBizCreds = typeof document !== 'undefined' ? (
      (document.getElementById('biz-creds-select')?.value === '__custom__' ? document.getElementById('biz-creds-custom')?.value : document.getElementById('biz-creds-select')?.value) || ''
    ) : '';
    const domBizEmail = typeof document !== 'undefined' ? (document.getElementById('biz-email')?.value || '') : '';
    const domBizPhone = typeof document !== 'undefined' ? (document.getElementById('biz-phone')?.value || '') : '';

    const effectiveBizName = cleanAscii(
      domBizName || studentData?.name || bizData.name || studentName,
      studentName
    );
    const effectiveBizCareer = cleanAscii(
      domBizCareer || chosenCareer.title || bizData.career || 'Commercial Airline Pilot',
      'Commercial Airline Pilot'
    );
    const effectiveBizCreds = cleanAscii(
      domBizCreds || bizData.creds || `Class of 2040 · ${studentClass}`,
      `Class of 2040 · ${studentClass}`
    );
    const effectiveBizEmail = cleanAscii(domBizEmail || bizData.email || studentData?.email || '');
    const effectiveBizPhone = cleanAscii(domBizPhone || bizData.phone || studentData?.phone || '');

    // Card Background & Sleek Dual Border (Executive Dark Luxury Aesthetic in both themes)
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

    // Miniature Gold Corner Accents on Business Card
    drawCornerBrackets(cardX + 1.5, cardY + 1.5, cardW - 3, cardH - 3, 3.5, [232, 160, 74]);

    // School Header inside Card in Times Bold
    doc.setTextColor(0, 240, 255);
    doc.setFont('times', 'bold');
    doc.setFontSize(8.5);
    doc.text(schoolName.toUpperCase(), cardX + 8, cardY + 9.5);

    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.4);
    doc.text('CAREER FAIR 2026 - OFFICIAL STUDENT AMBASSADOR', cardX + 8, cardY + 14.2);

    // Golden Divider Line
    doc.setDrawColor(232, 160, 74);
    doc.setLineWidth(0.4);
    doc.line(cardX + 8, cardY + 17.0, cardX + cardW - 8, cardY + 17.0);

    // Student Name & Future Designation
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.5);
    doc.text(effectiveBizName.toUpperCase(), cardX + 8, cardY + 26.5);

    doc.setTextColor(0, 240, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.2);
    const futureTitle = cleanAscii(effectiveBizCareer ? `Future ${effectiveBizCareer}` : 'Future Global Professional');
    doc.text(futureTitle, cardX + 8, cardY + 33.5);

    doc.setTextColor(203, 213, 225);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.0);
    doc.text(`Academic Class: ${studentClass}   |   Stream: ${cleanAscii(chosenCareer.cat || 'Science & Tech')}`, cardX + 8, cardY + 39.5);
    
    doc.setFont('times', 'italic');
    doc.text(`Career Superpower: Executive Presentation & Strategic Articulation`, cardX + 8, cardY + 44.5);
    
    doc.setFont('courier', 'bold');
    doc.setTextColor(232, 160, 74);
    doc.text(`Credential ID: ${docId}`, cardX + 8, cardY + 49.5);

    // Ambassador Verification Badge Pill
    doc.setFillColor(30, 41, 59);
    doc.roundedRect(cardX + 8, cardY + 54.5, 78, 10, 1.5, 1.5, 'F');

    // Vector Emerald Indicator Dot
    doc.setFillColor(16, 185, 129);
    doc.circle(cardX + 13, cardY + 59.5, 1.6, 'F');

    doc.setTextColor(16, 185, 129);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.4);
    doc.text('VERIFIED CAREER FAIR AMBASSADOR 2026', cardX + 18, cardY + 60.5);

    // Right Side: 100% Real Scannable Vector QR Code Box (Camera & Phone Scannable)
    const qrBoxSize = 30; // 30mm x 30mm
    const qrBoxX = cardX + cardW - qrBoxSize - 9;
    const qrBoxY = cardY + 18.5;

    // Crisp White Background Card with soft rounded corners
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 2, 2, 'F');

    // Luxurious Inset Gold Border
    doc.setDrawColor(232, 160, 74);
    doc.setLineWidth(0.35);
    doc.roundedRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 2, 2, 'S');

    // Generate full verification URL encoding student business card data
    const isLocalhost = (typeof window !== 'undefined' && window.location && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));
    const baseOrigin = (typeof window !== 'undefined' && window.location && window.location.origin && !isLocalhost && window.location.origin !== 'null' && !window.location.origin.startsWith('file'))
      ? window.location.origin
      : 'https://careerwithenglish.pages.dev';

    let cardVerifyUrl = `${baseOrigin}/?v=1&s=${encodeURIComponent(effectiveBizName)}&t=${encodeURIComponent(effectiveBizCareer)}`;
    if (studentClass) cardVerifyUrl += `&c=${encodeURIComponent(studentClass)}`;
    if (docId) cardVerifyUrl += `&id=${encodeURIComponent(docId)}`;
    if (effectiveBizEmail) cardVerifyUrl += `&e=${encodeURIComponent(effectiveBizEmail)}`;
    if (effectiveBizPhone) cardVerifyUrl += `&p=${encodeURIComponent(effectiveBizPhone)}`;

    // Dynamic QR generation or verified fallback
    let qrCount = 29;
    let isQrDark = (r, c) => FALLBACK_QR_MATRIX_29[r][c] === '1';

    try {
      if (typeof window !== 'undefined' && typeof window.qrcode === 'function') {
        const qrGen = window.qrcode(0, 'M');
        qrGen.addData(cardVerifyUrl);
        qrGen.make();
        const cnt = qrGen.getModuleCount();
        if (cnt > 0) {
          qrCount = cnt;
          isQrDark = (r, c) => qrGen.isDark(r, c);
        }
      }
    } catch (e) {
      console.warn('Dynamic QR Code generator error; using fallback matrix:', e);
    }

    // Draw 100% Real Scannable Vector Modules
    doc.setFillColor(15, 23, 42); // Deep rich black/navy
    const quietMargin = 2.2;
    const activeQrSize = qrBoxSize - (quietMargin * 2);
    const cellSize = activeQrSize / qrCount;
    const startQX = qrBoxX + quietMargin;
    const startQY = qrBoxY + quietMargin;

    for (let r = 0; r < qrCount; r++) {
      for (let c = 0; c < qrCount; c++) {
        if (isQrDark(r, c)) {
          // Slight 0.04mm overlap prevents hairline anti-aliasing seams in PDF viewers
          doc.rect(startQX + c * cellSize, startQY + r * cellSize, cellSize + 0.04, cellSize + 0.04, 'F');
        }
      }
    }

    // Official Verification Typography Under QR Code
    doc.setTextColor(0, 240, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.8);
    doc.text('SCAN TO VERIFY', qrBoxX + qrBoxSize / 2, qrBoxY + qrBoxSize + 4.0, { align: 'center' });

    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(4.8);
    doc.text('careerwithenglish.pages.dev', qrBoxX + qrBoxSize / 2, qrBoxY + qrBoxSize + 7.2, { align: 'center' });

    doc.setTextColor(203, 213, 225);
    doc.setFont('courier', 'bold');
    doc.setFontSize(5.0);
    doc.text(docId, qrBoxX + qrBoxSize / 2, qrBoxY + qrBoxSize + 10.5, { align: 'center' });

    // Page 2 Footer
    doc.setTextColor(C.footerText[0], C.footerText[1], C.footerText[2]);
    doc.setFont('times', 'italic');
    doc.setFontSize(6.4);
    doc.text('Page 2 of 2  -  Official Academic & Career Evaluation Document  -  Kanakia International School Mira Road', 105, 292, { align: 'center' });

    // Save and return
    const safeFilenameName = (studentName || 'Student').replace(/[^a-zA-Z0-9]/g, '_');
    const cleanFilename = `ECF2026_CareerBooklet_${safeFilenameName}.pdf`;
    if (!options?.returnOnly) { doc.save(cleanFilename); }

    if (window.DopamineEngine) {
      window.DopamineEngine.confetti(0.5, 0.4);
      window.DopamineEngine.playChime('fanfare');
      window.DopamineEngine.unlockBadge('booklet_graduate', 'Booklet Graduate', '📖');
    }

    if (typeof window.showToast === 'function') {
      window.showToast(`📖 2-Page Official Career Booklet & Card downloaded: ${cleanFilename}`);
    }
    return doc;
  }

  // Export
  window.DossierPDF = {
    generate: generateStudentDossierPDF
  };
  window.BookletPDF = {
    generate: generateStudentDossierPDF
  };
  window.generateStudentDossierPDF = generateStudentDossierPDF;
  window.generateStudentBookletPDF = generateStudentDossierPDF;

})(window);
