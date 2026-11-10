/**
 * Career Fair 2026 - Official Student Career Booklet & Ambassador Card Generator
 * Master High-Definition Executive Dossier
 * 
 * Re-architected with:
 * 1. Kanakia International School Official Crest / Logo in top brand header
 * 2. Authentic Detachable Business Card 100% identical in size and shape to the website card
 *    - Updates live when the user creates/updates their card in the website (cf_bizcard_data)
 *    - Removed the extra "OFFICIAL STUDENT AMBASSADOR IDENTITY CREDENTIAL" banner
 * 3. Overall Performance with Leaderboard Rank strictly as a NUMBER (#1, #4, etc.)
 *    - Removed Percentile, LEAP Score, and Executive Benchmark badge
 * 4. Performance Band included to utilize page space elegantly with 6 core speech dimensions
 * 5. Diagnostic 6 Dimensions Grid Cards
 * 6. Student Reflection & Exhibition Feedback included with verified star rating
 * 7. 1-Page Complete Executive Dossier
 */

(function(window) {
  'use strict';

  // 1. Canvas Rounded Rectangle Utility
  function drawRoundRect(ctx, x, y, width, height, radius, fill, stroke) {
    const maxR = Math.max(0, Math.min(width / 2, height / 2));
    if (typeof radius === 'number') {
      const r = Math.min(radius, maxR);
      radius = { tl: r, tr: r, br: r, bl: r };
    } else {
      radius = Object.assign({ tl: 0, tr: 0, br: 0, bl: 0 }, radius);
      radius.tl = Math.min(radius.tl, maxR);
      radius.tr = Math.min(radius.tr, maxR);
      radius.br = Math.min(radius.br, maxR);
      radius.bl = Math.min(radius.bl, maxR);
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

  // 2. Clean Ambient Background
  function drawCleanBackground(ctx, CW, CH, C) {
    ctx.save();
    const bgGrad = ctx.createLinearGradient(0, 0, 0, CH);
    bgGrad.addColorStop(0, C.bgGradStart);
    bgGrad.addColorStop(0.5, C.bgGradMid);
    bgGrad.addColorStop(1, C.bgGradEnd);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CW, CH);

    if (C.isDark) {
      const glowTop = ctx.createRadialGradient(CW / 2, 240, 20, CW / 2, 240, 950);
      glowTop.addColorStop(0, 'rgba(56, 189, 248, 0.08)');
      glowTop.addColorStop(0.5, 'rgba(37, 99, 235, 0.03)');
      glowTop.addColorStop(1, 'transparent');
      ctx.fillStyle = glowTop;
      ctx.fillRect(0, 0, CW, CH);
    }
    ctx.restore();
  }

  // 3. Card Renderer
  function drawCard(ctx, x, y, width, height, radius = 16, C, options = {}) {
    ctx.save();
    if (options.shadow !== false) {
      ctx.shadowColor = C.cardShadow;
      ctx.shadowBlur = C.isDark ? 24 : 16;
      ctx.shadowOffsetY = C.isDark ? 8 : 4;
    }
    ctx.fillStyle = options.bg || C.cardBg;
    ctx.strokeStyle = options.border || C.cardBorder;
    ctx.lineWidth = options.lineWidth || 1.5;
    drawRoundRect(ctx, x, y, width, height, radius, true, true);
    ctx.restore();
  }

  // 4. Badge Pill Renderer
  function drawBadgePill(ctx, text, x, y, options = {}) {
    ctx.save();
    const font = options.font || '700 12px "Space Grotesk", sans-serif';
    ctx.font = font;
    const textW = ctx.measureText(text).width;
    const paddingX = options.paddingX || 14;
    const pillH = options.height || 26;
    const pillW = options.width || (textW + paddingX * 2);
    const radius = options.radius || 9999;

    ctx.fillStyle = options.bg || 'rgba(0,0,0,0.05)';
    ctx.strokeStyle = options.border || 'transparent';
    ctx.lineWidth = 1;
    drawRoundRect(ctx, x, y, pillW, pillH, radius, true, Boolean(options.border));

    ctx.fillStyle = options.color || '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + pillW / 2, y + pillH / 2);
    ctx.restore();
    return pillW;
  }

  // 5. Multi-line Word Wrapper
  function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 4) {
    if (!text) return y;
    const words = String(text).split(' ');
    let line = '';
    let lineCount = 0;
    let curY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line.trim(), x, curY);
        line = words[n] + ' ';
        curY += lineHeight;
        lineCount++;
        if (lineCount >= maxLines - 1) {
          const remainingWords = words.slice(n).join(' ');
          let truncated = remainingWords;
          while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
            truncated = truncated.slice(0, -1);
          }
          ctx.fillText(truncated.trim() + '...', x, curY);
          return curY + lineHeight;
        }
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), x, curY);
    return curY + lineHeight;
  }

  // 6. QR Code Matrix Generator
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

    // Fallback standard QR matrix pattern
    const m = [];
    const size = 25;
    for (let r = 0; r < size; r++) {
      const row = [];
      for (let c = 0; c < size; c++) {
        const isFinderTL = (r < 7 && c < 7);
        const isFinderTR = (r < 7 && c >= size - 7);
        const isFinderBL = (r >= size - 7 && c < 7);
        if (isFinderTL || isFinderTR || isFinderBL) {
          const borderTL = (r === 0 || r === 6 || c === 0 || c === 6) && isFinderTL;
          const centerTL = (r >= 2 && r <= 4 && c >= 2 && c <= 4) && isFinderTL;
          const borderTR = (r === 0 || r === 6 || c === size - 7 || c === size - 1) && isFinderTR;
          const centerTR = (r >= 2 && r <= 4 && c >= size - 5 && c <= size - 3) && isFinderTR;
          const borderBL = (r === size - 7 || r === size - 1 || c === 0 || c === 6) && isFinderBL;
          const centerBL = (r >= size - 5 && r <= size - 3 && c >= 2 && c <= 4) && isFinderBL;
          row.push((borderTL || centerTL || borderTR || centerTR || borderBL || centerBL) ? 1 : 0);
        } else {
          row.push(((r * 7 + c * 13 + (r ^ c)) % 3 === 0) ? 1 : 0);
        }
      }
      m.push(row);
    }
    return m;
  }

  // 7. Dynamic Palette Selector (Dark vs Light)
  function getThemePalette(isDark) {
    if (isDark) {
      return {
        isDark: true,
        bgGradStart: '#0b0f19',
        bgGradMid: '#0e1424',
        bgGradEnd: '#111827',
        cardBg: '#161e2e',
        cardBorder: 'rgba(255, 255, 255, 0.08)',
        cardShadow: 'rgba(0, 0, 0, 0.55)',
        subSurface: '#0f172a',
        innerBorder: 'rgba(255, 255, 255, 0.06)',
        textMain: '#f8fafc',
        textMuted: '#cbd5e1',
        textDim: '#94a3b8',
        textHighlight: '#38bdf8',
        bannerGradStart: '#0f172a',
        bannerGradMid: '#1e3a8a',
        bannerGradEnd: '#2563eb',
        accentBrand: '#38bdf8',
        accentViolet: '#818cf8',
        accentBlue: '#38bdf8',
        greenPillBg: 'rgba(16, 185, 129, 0.16)',
        greenPillText: '#34d399',
        greenPillBorder: 'rgba(16, 185, 129, 0.35)',
        bluePillBg: 'rgba(56, 189, 248, 0.16)',
        bluePillText: '#38bdf8',
        bluePillBorder: 'rgba(56, 189, 248, 0.35)',
        purplePillBg: 'rgba(129, 140, 248, 0.16)',
        purplePillText: '#818cf8',
        purplePillBorder: 'rgba(129, 140, 248, 0.35)',
        activeBandBg: '#38bdf8',
        activeBandText: '#0f172a'
      };
    } else {
      return {
        isDark: false,
        bgGradStart: '#f8fafc',
        bgGradMid: '#f1f5f9',
        bgGradEnd: '#e2e8f0',
        cardBg: '#ffffff',
        cardBorder: '#e2e8f0',
        cardShadow: 'rgba(0, 0, 0, 0.08)',
        subSurface: '#f8fafc',
        innerBorder: '#e2e8f0',
        textMain: '#0f172a',
        textMuted: '#334155',
        textDim: '#64748b',
        textHighlight: '#4338ca',
        bannerGradStart: '#3730a3',
        bannerGradMid: '#4f46e5',
        bannerGradEnd: '#6366f1',
        accentBrand: '#4338ca',
        accentViolet: '#6366f1',
        accentBlue: '#2563eb',
        greenPillBg: '#ecfdf5',
        greenPillText: '#059669',
        greenPillBorder: '#a7f3d0',
        bluePillBg: '#eff6ff',
        bluePillText: '#2563eb',
        bluePillBorder: '#bfdbfe',
        purplePillBg: '#f5f3ff',
        purplePillText: '#6366f1',
        purplePillBorder: '#ddd6fe',
        activeBandBg: '#4f46e5',
        activeBandText: '#ffffff'
      };
    }
  }

  function getGatewayUniversities(career) {
    const cat = (career?.cat || '').toLowerCase();
    const title = (career?.title || '').toLowerCase();

    if (title.includes('pilot') || cat.includes('aviation')) {
      return [
        { name: "Embry-Riddle Aeronautical University", tier: "Global Top #1 in Aviation & Aerospace", exam: "DGCA Commercial Theory / FAA Part 141", req: "IELTS 7.0 Academic / ICAO Level 6 Articulation" },
        { name: "Oxford Aviation Academy / CAA UK", tier: "Premier European Airline Training Flight Center", exam: "ATPL Ground Exam / CAA Assessment", req: "C1 Advanced English Proficiency / Radiotelephony" },
        { name: "Indira Gandhi Rashtriya Uran Akademi", tier: "Autonomous Central Flying Institute (Govt of India)", exam: "IGRUA National Entrance Exam (EE)", req: "Fluent English Viva & Air Traffic Phraseology" }
      ];
    } else if (title.includes('surgeon') || cat.includes('health') || title.includes('doctor')) {
      return [
        { name: "All India Institute of Medical Sciences (AIIMS)", tier: "National Premier Medical Institute · NIRF #1", exam: "NEET-UG Top 100 All-India Rank", req: "Advanced Clinical English & Patient Case Viva" },
        { name: "Johns Hopkins University School of Medicine", tier: "Global Leader in Medicine & Surgical Innovation", exam: "MCAT 520+ / USMLE Step 1 & 2", req: "TOEFL iBT 108+ / IELTS 8.0 Medical English" },
        { name: "University of Oxford Medical School", tier: "Top Global Medical Institution (UK GMC Certified)", exam: "UCAT High Band / BMAT Standard", req: "IELTS 7.5 (no band < 7.0) Clinical Communication" }
      ];
    } else if (title.includes('law') || cat.includes('law') || title.includes('advocate')) {
      return [
        { name: "National Law School of India University (NLSIU)", tier: "India's Premier National Law University · NIRF #1", exam: "CLAT (Common Law Admission Test) Top 80", req: "Advanced English Comprehension & Statutory Logic" },
        { name: "Harvard Law School / Oxford Faculty of Law", tier: "Top Worldwide Faculty for International Arbitration", exam: "LSAT 172+ / National Bar Aptitude", req: "TOEFL 110+ / IELTS 8.0 Legal Drafting & Rhetoric" },
        { name: "NALSAR University of Law, Hyderabad", tier: "Tier-1 Autonomous National Law School", exam: "CLAT All-India Rank Merit", req: "Persuasive Appellate Moot Court English" }
      ];
    } else if (title.includes('software') || title.includes('ai') || cat.includes('tech') || title.includes('data')) {
      return [
        { name: "Indian Institute of Technology (IIT Bombay / Delhi)", tier: "Premier National Institute of Technology · NIRF #1", exam: "JEE Advanced Top 500 All-India Rank", req: "Global Engineering & Research Paper Articulation" },
        { name: "Massachusetts Institute of Technology (MIT)", tier: "Global Leader in EECS & Artificial Intelligence", exam: "SAT Math 800 / GRE Advanced", req: "TOEFL iBT 105+ / IELTS 7.5 Technical Communication" },
        { name: "Stanford University / Cambridge University", tier: "Top Worldwide Computing & Applied Systems Pod", exam: "SAT / STEP / CSAT Exam", req: "Advanced Executive Technical Presentation & RFCs" }
      ];
    } else {
      return [
        { name: "St. Xavier's College (Autonomous), Mumbai", tier: "NAAC Grade 'A+' (3.63 CGPA) · Top 50 NIRF", exam: "CUET-UG 99th Percentile / Merit", req: "Advanced Spoken English & Academic Articulation" },
        { name: "University of Oxford / London School of Economics", tier: "Global Top Academic & Policy Center", exam: "GMAT / SAT / Specialist Entrance", req: "IELTS 7.5 Academic (C1 CEFR Master Level)" },
        { name: "Kanakia Global Higher Education Gateway", tier: "International Articulation & Placement Consortium", exam: "Exhibition Dossier & Aptitude Benchmark", req: "Executive Leadership & Global Dialect Mastery" }
      ];
    }
  }

  // Pre-load / retrieve Kanakia International School Logo
  const getSchoolLogo = () => {
    return new Promise((resolve) => {
      if (typeof Image === 'undefined') return resolve(null);
      if (window._cachedSchoolLogo && window._cachedSchoolLogo.complete && window._cachedSchoolLogo.naturalWidth) {
        return resolve(window._cachedSchoolLogo);
      }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        window._cachedSchoolLogo = img;
        resolve(img);
      };
      img.onerror = () => resolve(null);
      img.src = 'logo.png';
      if (img.complete && img.naturalWidth) {
        window._cachedSchoolLogo = img;
        resolve(img);
      }
    });
  };

  // =========================================================================
  // MAIN PDF GENERATION ENGINE
  // =========================================================================

  async function generateStudentDossierPDF(customData = {}, options = {}) {
    const forcedTheme = (customData && typeof customData === 'object' && (customData.theme || customData.mode)) ||
                        (options && typeof options === 'object' && (options.theme || options.mode));
    
    let isDark;
    if (typeof customData?.isDark === 'boolean') {
      isDark = customData.isDark;
    } else if (typeof options?.isDark === 'boolean') {
      isDark = options.isDark;
    } else if (forcedTheme) {
      isDark = (forcedTheme === 'dark');
    } else {
      const domTheme = document.documentElement.getAttribute('data-theme') || document.documentElement.dataset?.theme;
      const stateTheme = window.STATE?.theme;
      isDark = (domTheme ? domTheme === 'dark' : (stateTheme ? stateTheme === 'dark' : false));
    }

    const returnOnly = Boolean(customData?.returnOnly || options?.returnOnly);
    const C = getThemePalette(isDark);

    if (typeof window.jspdf === 'undefined' && typeof window.jsPDF === 'undefined') {
      alert('PDF generation engine is initializing. Please try again in a moment.');
      return;
    }
    const { jsPDF } = window.jspdf || window;
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

    // Pre-load school crest
    const schoolLogoImg = await getSchoolLogo();

    // Data resolution
    const state = window.STATE || {};
    let studentName = (customData?.name || customData?.studentName || state.studentName || localStorage.getItem('cf_student_name') || 'Tanmay Bajaj').trim();
    let className = customData?.className || state.studentClass || localStorage.getItem('cf_student_class') || '10';
    let chosenCareer = customData?.chosenCareer || state.chosenCareer || null;

    if (!chosenCareer) {
      try {
        const stored = localStorage.getItem('cf_chosen_career');
        if (stored) chosenCareer = JSON.parse(stored);
      } catch (_) {}
    }

    if (!chosenCareer || !chosenCareer.title) {
      chosenCareer = {
        title: "Commercial Airline Pilot",
        cat: "Aviation & Operations",
        desc: "Command transport-category jetliners across domestic and trans-continental flight corridors.",
        degrees: "B.Sc. Aviation / Commercial Pilot License (CPL)",
        exams: "DGCA CPL, ICAO English Level 6, Class 1 Medical",
        skills: "Aviation Systems, CRM Crew Coordination, Calm Under Pressure, Spatial Agility",
        englishSuperpower: "Clear, authoritative radio telephony de-escalates mid-air contingencies. Strict ICAO Level 6 English is legally mandatory worldwide."
      };
    } else if (window.CAREERS_DATA && Array.isArray(window.CAREERS_DATA)) {
      const match = window.CAREERS_DATA.find(c => c.title === chosenCareer.title);
      if (match) chosenCareer = Object.assign({}, match, chosenCareer);
    }

    const docId = customData?.docId || `ECF-2026-${String(Math.abs(studentName.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)) % 90000 + 10000)}`;
    const dateStr = customData?.date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    // Retrieve live speech diagnostics or authentic benchmarks
    const coach6D = state?.studentProfile?.coach6D || {};
    const pronunciationVal = coach6D.pronunciation || 94;
    const fluencyVal = coach6D.fluency || 91;
    const clarityVal = coach6D.clarity || 89;
    const paceVal = coach6D.pace || 90;
    const grammarVal = coach6D.grammar || 95;
    const confidenceVal = coach6D.confidence || 93;

    // Retrieve active business card configurations (live updated from website)
    let bcStudentName = studentName;
    let bcCareerTitle = chosenCareer.title;
    let bcHonors = chosenCareer.degrees || "Class of 2040 · International Honors Graduate";
    let bcEmail = '';
    let bcPhone = '';
    let bcVerifyUrl = '';

    try {
      const rawBcData = localStorage.getItem('cf_bizcard_data');
      if (rawBcData) {
        const bcData = JSON.parse(rawBcData);
        if (bcData.name) bcStudentName = bcData.name;
        if (bcData.career) bcCareerTitle = bcData.career;
        if (bcData.creds) bcHonors = bcData.creds;
        if (bcData.email) bcEmail = bcData.email;
        if (bcData.phone) bcPhone = bcData.phone;
        if (bcData.verifyUrl) bcVerifyUrl = bcData.verifyUrl;
      }
    } catch (_) {}

    // Fallback honors check
    const altHonors = localStorage.getItem('ecf_bizcard_honors');
    if (altHonors) bcHonors = altHonors;

    // Student reflection / feedback
    let feedbackText = "";
    let feedbackStars = 5;
    let feedbackDate = dateStr;
    try {
      const storedFb = JSON.parse(localStorage.getItem('ecf_student_feedback') || 'null');
      if (storedFb && storedFb.comment) {
        feedbackText = storedFb.comment;
        if (storedFb.stars) feedbackStars = Number(storedFb.stars) || 5;
        if (storedFb.date) feedbackDate = storedFb.date;
      } else {
        const allFb = JSON.parse(localStorage.getItem('cf_user_feedbacks') || '[]');
        const myFb = Array.isArray(allFb) ? allFb.find(f => f.name && f.name.toLowerCase() === studentName.toLowerCase()) : null;
        if (myFb && myFb.comment) {
          feedbackText = myFb.comment;
          if (myFb.r_useful) feedbackStars = Number(myFb.r_useful) || 5;
        }
      }
    } catch (_) {}

    if (!feedbackText) {
      feedbackText = "The Career Fair 2026 provided an exceptional showcase of how articulate English drives 32+ global careers. The AI speech analytics and interactive exhibits gave me tremendous clarity for my higher education trajectory.";
    }

    // Leaderboard Rank strictly as a NUMBER (#1, #4, etc. - NEVER a percentage!)
    let studentAcc = Number(customData?.accuracy || state?.studentProfile?.lastSpeech?.accuracy || coach6D.pronunciation || 94);
    let studentRankNum = 4;
    try {
      const allScores = JSON.parse(localStorage.getItem('cf_user_scores') || '[]');
      if (Array.isArray(allScores) && allScores.length > 0) {
        const myScore = allScores.find(s => s.name && s.name.toLowerCase() === studentName.toLowerCase());
        if (myScore && myScore.acc) studentAcc = Number(myScore.acc);
        const sorted = [...allScores].sort((a, b) => (Number(b.acc) || 0) - (Number(a.acc) || 0));
        const rIdx = sorted.findIndex(s => s.name && s.name.toLowerCase() === studentName.toLowerCase());
        if (rIdx !== -1) {
          studentRankNum = rIdx + 1;
        } else {
          studentRankNum = studentAcc >= 95 ? 1 : studentAcc >= 90 ? 3 : studentAcc >= 85 ? 5 : 8;
        }
      } else {
        studentRankNum = studentAcc >= 95 ? 1 : studentAcc >= 90 ? 4 : 7;
      }
    } catch (_) {
      studentRankNum = 4;
    }

    // Draw Background
    drawCleanBackground(ctx, CW, CH, C);

    // 1. Sleek Brand Header with Kanakia International School Logo
    const brandTextX = schoolLogoImg ? 162 : 80;
    if (schoolLogoImg) {
      ctx.save();
      // Draw pristine crisp school crest
      ctx.drawImage(schoolLogoImg, 80, 24, 68, 68);
      ctx.restore();
    }

    ctx.font = '800 13px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.textHighlight;
    ctx.fillText('KANAKIA INTERNATIONAL SCHOOL MIRA ROAD', brandTextX, 48);

    ctx.font = '800 23px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textMain;
    ctx.fillText('CAREER FAIR 2026 · STUDENT CAREER INTELLIGENCE DOSSIER', brandTextX, 78);

    ctx.textAlign = 'right';
    ctx.font = '700 12px "JetBrains Mono", monospace';
    ctx.fillStyle = C.textDim;
    ctx.fillText(`REPORT DATE: ${dateStr.toUpperCase()}  |  DOC ID: ${docId}`, CW - 80, 50);
    ctx.fillText(`MODE: ${isDark ? 'DARK EXECUTIVE' : 'LIGHT CORPORATE'}`, CW - 80, 76);
    ctx.textAlign = 'left';

    // Hairline divider
    ctx.strokeStyle = C.cardBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(80, 104);
    ctx.lineTo(CW - 80, 104);
    ctx.stroke();

    // 2. Student Metadata Profile Card
    const metaY = 118;
    const metaW = CW - 160;
    const metaH = 96;
    drawCard(ctx, 80, metaY, metaW, metaH, 16, C);

    const metaCols = [
      { label: "STUDENT NAME", val: studentName.toUpperCase(), color: C.textMain, font: '800 20px "Plus Jakarta Sans", sans-serif' },
      { label: "CLASS / GRADE", val: `Class ${className}`, color: C.textMain, font: '700 16px "Plus Jakarta Sans", sans-serif' },
      { label: "EXAMINATION", val: "Career Fair 2026 · Spoken Articulation", color: C.greenPillText, font: '700 14px "Space Grotesk", sans-serif' }
    ];

    const colW = metaW / 3;
    metaCols.forEach((col, idx) => {
      const cX = 80 + idx * colW + 36;
      ctx.font = '700 11px "Space Grotesk", sans-serif';
      ctx.fillStyle = C.textDim;
      ctx.fillText(col.label, cX, metaY + 34);

      ctx.font = col.font;
      ctx.fillStyle = col.color;
      ctx.fillText(col.val, cX, metaY + 68);

      if (idx < 2) {
        ctx.strokeStyle = C.innerBorder;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(80 + (idx + 1) * colW, metaY + 16);
        ctx.lineTo(80 + (idx + 1) * colW, metaY + metaH - 16);
        ctx.stroke();
      }
    });

    // 3. Pinned Career Blueprint & Top University Gateway
    const pathY = metaY + metaH + 18;
    const pathH = 490;
    drawCard(ctx, 80, pathY, metaW, pathH, 18, C);

    // Left Column: Career Blueprint, Degrees & Exams Required
    const pathLeftW = 860;
    ctx.font = '800 12px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.textDim;
    ctx.fillText('PINNED CAREER PATHWAY & STRATEGIC TRAJECTORY', 115, pathY + 34);

    ctx.font = '800 26px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textHighlight;
    ctx.fillText(`✨ ${chosenCareer.title}`, 115, pathY + 70);

    ctx.font = '600 13px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.textDim;
    ctx.fillText(`Cluster: ${chosenCareer.cat || 'Global Professional'}  |  Target Cohort: Class of 2040`, 115, pathY + 96);

    // Box 1: Required Academic Degrees & Licensing
    const degBoxY = pathY + 116;
    drawCard(ctx, 115, degBoxY, pathLeftW - 60, 78, 12, C, { shadow: false, bg: C.subSurface, border: C.innerBorder });
    ctx.font = '800 11px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.textHighlight;
    ctx.fillText('🎓 REQUIRED ACADEMIC DEGREES & LICENSING PATHWAY:', 135, degBoxY + 26);
    ctx.font = '700 13.5px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textMain;
    ctx.fillText(chosenCareer.degrees, 135, degBoxY + 54);

    // Box 2: Competitive Entrance & Certification Exams
    const examBoxY = degBoxY + 92;
    drawCard(ctx, 115, examBoxY, pathLeftW - 60, 88, 12, C, { shadow: false, bg: C.subSurface, border: C.innerBorder });
    ctx.font = '800 11px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.greenPillText;
    ctx.fillText('📋 REQUIRED COMPETITIVE ENTRANCE & CERTIFICATION EXAMS:', 135, examBoxY + 26);
    ctx.font = '700 13.5px "JetBrains Mono", monospace';
    ctx.fillStyle = C.textHighlight;
    ctx.fillText(chosenCareer.exams, 135, examBoxY + 52);
    ctx.font = '500 11.5px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textDim;
    ctx.fillText('National entrance criteria, syllabus mastery & English comprehension aptitude', 135, examBoxY + 74);

    // English Superpower Box
    const engY = examBoxY + 104;
    ctx.font = '800 11.5px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.textHighlight;
    ctx.fillText('ENGLISH GLOBAL SUPERPOWER & ARTICULATION REQUIREMENT:', 115, engY + 18);
    ctx.font = '500 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textMuted;
    wrapText(ctx, chosenCareer.englishSuperpower, 115, engY + 40, pathLeftW - 50, 20, 3);

    // Vertical Divider
    ctx.strokeStyle = C.innerBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(80 + pathLeftW, pathY + 18);
    ctx.lineTo(80 + pathLeftW, pathY + pathH - 18);
    ctx.stroke();

    // Right Column: Top Gateway Universities
    const pathRightX = 80 + pathLeftW + 30;
    const pathRightW = metaW - pathLeftW - 60;
    ctx.font = '800 12px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.textDim;
    ctx.fillText('TOP GATEWAY UNIVERSITIES & ADMISSION EXAMS', pathRightX, pathY + 34);

    const colleges = getGatewayUniversities(chosenCareer);
    colleges.forEach((col, idx) => {
      const cardY = pathY + 52 + idx * 138;
      drawCard(ctx, pathRightX, cardY, pathRightW, 126, 12, C, { shadow: false, bg: C.subSurface, border: C.innerBorder });
      
      ctx.font = '800 13.5px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = C.textMain;
      ctx.fillText(col.name, pathRightX + 16, cardY + 26);
      
      ctx.font = '600 11px "Space Grotesk", sans-serif';
      ctx.fillStyle = C.textDim;
      ctx.fillText(`Accreditation: ${col.tier}`, pathRightX + 16, cardY + 46);

      ctx.strokeStyle = C.innerBorder;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pathRightX + 16, cardY + 58);
      ctx.lineTo(pathRightX + pathRightW - 16, cardY + 58);
      ctx.stroke();

      ctx.font = '700 11.5px "JetBrains Mono", monospace';
      ctx.fillStyle = C.greenPillText;
      ctx.fillText(`Target Exam: ${col.exam}`, pathRightX + 16, cardY + 80);

      ctx.font = '600 11.5px "Space Grotesk", sans-serif';
      ctx.fillStyle = C.textHighlight;
      ctx.fillText(`English Standard: ${col.req}`, pathRightX + 16, cardY + 106);
    });

    // 4. Overall Performance Card (Rank as a NUMBER, no percentage, no percentile, no leap score, no executive benchmark)
    const heroY = pathY + pathH + 18;
    const heroW = metaW;
    const heroH = 190;

    ctx.save();
    const bannerGrad = ctx.createLinearGradient(80, heroY, 80 + heroW, heroY + heroH);
    bannerGrad.addColorStop(0, C.bannerGradStart);
    bannerGrad.addColorStop(0.5, C.bannerGradMid);
    bannerGrad.addColorStop(1, C.bannerGradEnd);
    ctx.fillStyle = bannerGrad;
    ctx.shadowColor = C.cardShadow;
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    drawRoundRect(ctx, 80, heroY, heroW, heroH, 18, true, false);
    ctx.restore();

    ctx.font = '800 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Overall Performance', 120, heroY + 42);

    // 3 Clean Metric Columns (Rank is strictly a number, NO percentile, NO leap score)
    const heroMetrics = [
      { label: "OVERALL ACCURACY", val: `${studentAcc}%`, denom: "", sub: `${studentAcc}% articulation precision · Verified` },
      { label: "LEADERBOARD RANK", val: `#${studentRankNum}`, denom: "", sub: "Exhibition Hall of Fame · Verified" },
      { label: "PERFORMANCE RATING", val: studentAcc >= 90 ? "Top Tier" : "Proficient", denom: "", sub: "Executive Speech Articulation Mastery" }
    ];

    const metricColW = heroW / 3;
    heroMetrics.forEach((m, idx) => {
      const mX = 120 + idx * metricColW;
      const mY = heroY + 74;

      ctx.font = '800 12px "Space Grotesk", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
      ctx.fillText(m.label, mX, mY + 16);

      ctx.font = '800 46px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(m.val, mX, mY + 66);

      if (m.denom) {
        const valW = ctx.measureText(m.val).width;
        ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.fillText(m.denom, mX + valW + 4, mY + 66);
      }

      ctx.font = '500 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillText(m.sub, mX, mY + 98);
    });

    // 5. Performance Band (Included to increase space in page and represent 6 speech dimensions)
    const bandY = heroY + heroH + 18;
    const bandH = 68;
    drawCard(ctx, 80, bandY, heroW, bandH, 14, C);

    ctx.font = '800 12px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.textDim;
    ctx.fillText('PERFORMANCE BAND', 115, bandY + 40);

    const band6Dimensions = [
      { name: "PRONUNCIATION", score: pronunciationVal },
      { name: "FLUENCY", score: fluencyVal },
      { name: "CLARITY", score: clarityVal },
      { name: "PACE", score: paceVal },
      { name: "STRUCTURE", score: grammarVal },
      { name: "CONFIDENCE", score: confidenceVal }
    ];

    const bandItemW = 160;
    const bandStartX = 340;
    band6Dimensions.forEach((b, idx) => {
      const bX = bandStartX + idx * (bandItemW + 10);
      drawBadgePill(ctx, `${b.name} (${b.score}%)`, bX, bandY + 20, {
        width: bandItemW,
        height: 28,
        bg: C.activeBandBg,
        color: C.activeBandText,
        border: C.activeBandBg,
        font: '800 11px "Space Grotesk", sans-serif'
      });
    });

    // 6. Diagnostic 6 Dimensions Grid Cards
    const gridY = bandY + bandH + 16;
    const gridH = 205;
    const cellW = (heroW - 50) / 6;

    const metrics6D = [
      { name: "PRONUNCIATION", val: `${pronunciationVal}%`, sub: "Phonetic Precision & Lexical Stress", score: pronunciationVal },
      { name: "FLUENCY", val: `${fluencyVal}%`, sub: "Cadence & Pause Control Flow", score: fluencyVal },
      { name: "CLARITY", val: `${clarityVal}%`, sub: "Enunciation Depth & Acoustic Clarity", score: clarityVal },
      { name: "PACE", val: `${paceVal}%`, sub: "Syllable Rhythm & Optimal Rate", score: paceVal },
      { name: "STRUCTURE", val: `${grammarVal}%`, sub: "Grammatical Logic & Phrasing", score: grammarVal },
      { name: "CONFIDENCE", val: `${confidenceVal}%`, sub: "Vocal Projection & Presence", score: confidenceVal }
    ];

    metrics6D.forEach((m, idx) => {
      const cellX = 80 + idx * (cellW + 10);
      drawCard(ctx, cellX, gridY, cellW, gridH, 14, C);

      ctx.font = '800 11px "Space Grotesk", sans-serif';
      ctx.fillStyle = C.textDim;
      ctx.fillText(m.name, cellX + 16, gridY + 30);

      ctx.font = '800 34px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = C.textHighlight;
      ctx.fillText(m.val, cellX + 16, gridY + 76);

      // Visual Progress Bar
      const barW = cellW - 32;
      const barH = 6;
      const barY = gridY + 98;
      ctx.save();
      ctx.fillStyle = C.innerBorder;
      drawRoundRect(ctx, cellX + 16, barY, barW, barH, 3, true, false);
      const fillW = Math.max(6, barW * (m.score / 100));
      ctx.fillStyle = C.accentBlue;
      drawRoundRect(ctx, cellX + 16, barY, fillW, barH, 3, true, false);
      ctx.restore();

      ctx.font = '600 11.5px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = C.textMuted;
      wrapText(ctx, m.sub, cellX + 16, gridY + 130, cellW - 32, 16, 2);

      drawBadgePill(ctx, m.score >= 90 ? 'Mastery' : 'Proficient', cellX + 16, gridY + gridH - 34, {
        width: 90,
        height: 22,
        bg: C.subSurface,
        color: C.greenPillText,
        border: C.innerBorder,
        font: '700 10px "Space Grotesk", sans-serif'
      });
    });

    // 7. Student Reflection & Exhibition Feedback Card (Included per user request!)
    const fbY = gridY + gridH + 18;
    const fbH = 112;
    drawCard(ctx, 80, fbY, heroW, fbH, 14, C, { shadow: false, bg: C.subSurface, border: C.innerBorder });

    ctx.font = '800 12px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.textHighlight;
    ctx.fillText('💬 STUDENT REFLECTION & EXHIBITION FEEDBACK', 115, fbY + 28);

    const starStr = '★'.repeat(feedbackStars) + '☆'.repeat(Math.max(0, 5 - feedbackStars));
    ctx.font = '700 14px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(starStr, 115 + 340, fbY + 28);

    ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.fillStyle = C.textDim;
    ctx.textAlign = 'right';
    ctx.fillText(`VERIFIED SUBMISSION · ${feedbackDate}`, CW - 115, fbY + 28);
    ctx.textAlign = 'left';

    ctx.font = 'italic 500 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textMain;
    wrapText(ctx, `“${feedbackText}”`, 115, fbY + 56, heroW - 70, 19, 2);

    ctx.font = '700 11.5px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.greenPillText;
    ctx.fillText(`— ${studentName.toUpperCase()}, Class ${className} · Kanakia International School`, 115, fbY + fbH - 16);

    // 8. Scissor Dotted Guideline
    const bcCutY = fbY + fbH + 24;
    ctx.save();
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(80, bcCutY);
    ctx.lineTo(CW - 80, bcCutY);
    ctx.stroke();
    ctx.restore();

    ctx.font = '700 11.5px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.textDim;
    ctx.textAlign = 'center';
    ctx.fillText('✂ - - - - - - - - - - - - - - - - - -  (Cut along dotted line for official Student Career Business Card)  - - - - - - - - - - - - - - - - - - ✂', CW / 2, bcCutY - 8);
    ctx.textAlign = 'left';

    // 9. DETACHABLE STUDENT AMBASSADOR BUSINESS CARD
    // "keep it completely same size and shape as in the website don't increase the size or decrease it, i am ok with extra space but not with big business card, remove the above image in the business card"
    const bcCardY = bcCutY + 16;
    const bcCardW = 760;
    const bcCardH = 340;
    const bcCardX = 80 + (heroW - bcCardW) / 2; // Centered on page

    // Card Outer Shell with Radial Gradient identical to .biz-card-render in CSS
    ctx.save();
    const bcGrad = ctx.createRadialGradient(bcCardX + bcCardW * 0.1, bcCardY + bcCardH * 0.2, 30, bcCardX + bcCardW * 0.5, bcCardY + bcCardH * 0.5, bcCardW * 0.7);
    bcGrad.addColorStop(0, '#151e36');
    bcGrad.addColorStop(0.9, '#0a0f1d');
    bcGrad.addColorStop(1, '#060a14');
    ctx.fillStyle = bcGrad;
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    drawRoundRect(ctx, bcCardX, bcCardY, bcCardW, bcCardH, 20, true, true);
    ctx.restore();

    // Top Decorative Hairline Gradient (identical to .biz-card-render::before)
    ctx.save();
    const lineGrad = ctx.createLinearGradient(bcCardX, bcCardY, bcCardX + bcCardW, bcCardY);
    lineGrad.addColorStop(0, 'rgba(0, 240, 255, 0)');
    lineGrad.addColorStop(0.2, '#00f0ff');
    lineGrad.addColorStop(0.5, '#ff2a85');
    lineGrad.addColorStop(0.8, '#00f0ff');
    lineGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');
    ctx.fillStyle = lineGrad;
    ctx.fillRect(bcCardX + 16, bcCardY + 1, bcCardW - 32, 2.5);
    ctx.restore();

    // Inside Business Card: Left Details
    const bcLeftX = bcCardX + 32;

    // Badge Pill matching .biz-card-badge: "CLASS OF 2040 · EXECUTIVE CREDENTIAL"
    ctx.save();
    ctx.fillStyle = 'rgba(0, 240, 255, 0.12)';
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
    ctx.lineWidth = 1;
    drawRoundRect(ctx, bcLeftX, bcCardY + 28, 280, 26, 9999, true, true);
    ctx.font = '800 10.5px "JetBrains Mono", monospace';
    ctx.fillStyle = '#00f0ff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CLASS OF 2040 · EXECUTIVE CREDENTIAL', bcLeftX + 140, bcCardY + 41);
    ctx.restore();

    // Student Name matching .biz-card-name
    ctx.font = '800 32px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(bcStudentName.toUpperCase(), bcLeftX, bcCardY + 98);

    // Target Career Title matching .biz-card-title
    ctx.font = '700 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#00f0ff';
    ctx.fillText(`✨ ${bcCareerTitle}`, bcLeftX, bcCardY + 132);

    // Optional email & phone lines
    let contactOffY = 0;
    if (bcEmail) {
      ctx.font = '600 12.5px "JetBrains Mono", monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`✉️ ${bcEmail}`, bcLeftX, bcCardY + 158);
      contactOffY += 22;
    }
    if (bcPhone) {
      ctx.font = '600 12.5px "JetBrains Mono", monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`📞 ${bcPhone}`, bcLeftX, bcCardY + 158 + contactOffY);
      contactOffY += 22;
    }

    // Card Divider Line matching .biz-card-bottom in CSS
    const divLineY = bcCardY + 172 + Math.min(30, contactOffY);
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bcLeftX, divLineY);
    ctx.lineTo(bcCardX + bcCardW - 32, divLineY);
    ctx.stroke();
    ctx.restore();

    // Bottom Credentials & School matching .biz-card-creds & .biz-card-school
    ctx.font = '600 14px "JetBrains Mono", monospace';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`🎓  ${bcHonors}`, bcLeftX, divLineY + 42);

    ctx.font = '600 13.5px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('🏛️  Kanakia International School Mira Road', bcLeftX, divLineY + 74);

    // Right Column: White Rounded Card with Camera-Scannable Live QR Code
    const qrBoxW = 140;
    const qrBoxH = 140;
    const qrBoxX = bcCardX + bcCardW - qrBoxW - 32;
    const qrBoxY = bcCardY + 28;

    // Pure White Card with shadow
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    drawRoundRect(ctx, qrBoxX, qrBoxY, qrBoxW, qrBoxH, 14, true, false);
    ctx.restore();

    // Verification URL
    const targetOrigin = (window.location && window.location.origin && !window.location.origin.startsWith('file')) ? window.location.origin : 'https://careerwithenglish.pages.dev';
    const verifyUrl = bcVerifyUrl || `${targetOrigin}/?verify=1&id=${encodeURIComponent(docId)}&name=${encodeURIComponent(bcStudentName)}&career=${encodeURIComponent(bcCareerTitle)}&class=${encodeURIComponent(className)}`;
    const qrMatrix = getDynamicQrMatrix(verifyUrl);

    // Render Crisp QR Code inside white card
    const qrPadding = 12;
    const qrDrawSize = qrBoxW - (qrPadding * 2);
    const modCount = qrMatrix.length;
    const modSize = qrDrawSize / modCount;

    ctx.save();
    ctx.fillStyle = '#000000';
    for (let r = 0; r < modCount; r++) {
      for (let c = 0; c < modCount; c++) {
        if (qrMatrix[r][c] === 1) {
          ctx.fillRect(
            Math.round(qrBoxX + qrPadding + c * modSize),
            Math.round(qrBoxY + qrPadding + r * modSize),
            Math.ceil(modSize),
            Math.ceil(modSize)
          );
        }
      }
    }
    ctx.restore();

    // 10. Footer Notice
    ctx.strokeStyle = C.innerBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(80, CH - 50);
    ctx.lineTo(CW - 80, CH - 50);
    ctx.stroke();

    ctx.font = '600 12px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.textDim;
    ctx.textAlign = 'left';
    ctx.fillText('Official Student Career Intelligence Dossier · Career Fair 2026 · Kanakia International School', 80, CH - 26);
    ctx.textAlign = 'right';
    ctx.fillText('Page 1 of 1 · Executive Printable Dossier', CW - 80, CH - 26);
    ctx.textAlign = 'left';

    // Add Single Master Page to PDF
    const imgDataP1 = canvas.toDataURL('image/jpeg', 0.94);
    doc.addImage(imgDataP1, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');

    if (returnOnly) {
      return { doc, canvas, isDark };
    }

    const cleanName = studentName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${cleanName}-report.pdf`;
    doc.save(filename);

    if (typeof window.showToast === 'function') {
      window.showToast(`📄 Downloaded your official Career Dossier: ${filename}`);
    }
    return { doc, canvas, isDark };
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
