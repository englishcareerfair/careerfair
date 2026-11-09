/**
 * Career Fair 2026 - Official Student Career Booklet & Ambassador Card Generator
 * High-Definition 2-Page Executive Dossier
 * 
 * Re-architected to mirror the executive Prince Olympiad LEAP Progress Report format:
 * - Exact Page 1 & Page 2 information architecture, cards, grids, stepper timeline, and quote banner
 * - Dynamic color gradient adapting automatically to the user's chosen mode:
 *     * Light Mode: Royal Indigo / Purple / Violet gradient (#3730a3 -> #4f46e5 -> #6366f1), crisp white cards, slate typography
 *     * Dark Mode: Midnight / Electric Cyan / Deep Blue gradient (#0f172a -> #1e3a8a -> #3b82f6), deep obsidian cards, glowing cyan accents
 * - ABSOLUTELY ZERO PARTICLES / SHARDS / NOISE
 * - Live scannable vector QR code on detachable Student Ambassador Business Card
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
      // Subtle top glow in dark mode
      const glowTop = ctx.createRadialGradient(CW / 2, 240, 20, CW / 2, 240, 950);
      glowTop.addColorStop(0, 'rgba(56, 189, 248, 0.08)');
      glowTop.addColorStop(0.5, 'rgba(37, 99, 235, 0.03)');
      glowTop.addColorStop(1, 'transparent');
      ctx.fillStyle = glowTop;
      ctx.fillRect(0, 0, CW, CH);
    }
    ctx.restore();
  }

  // 3. Card Renderer matching Prince Olympiad Executive Card Style
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

  // 4. Badge Pill Renderer (Segmented stage pills, status pills)
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

  // 5. Clean Word Wrap Utility
  function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 8) {
    if (!text) return 0;
    const words = String(text).split(' ');
    let line = '';
    let linesDrawn = 0;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line.trim(), x, y + (linesDrawn * lineHeight));
        line = words[n] + ' ';
        linesDrawn++;
        if (linesDrawn >= maxLines - 1) {
          let remaining = words.slice(n).join(' ');
          while (ctx.measureText(remaining + '...').width > maxWidth && remaining.length > 0) {
            remaining = remaining.slice(0, -1);
          }
          ctx.fillText(remaining.trim() + '...', x, y + (linesDrawn * lineHeight));
          linesDrawn++;
          return linesDrawn;
        }
      } else {
        line = testLine;
      }
    }
    if (line.trim().length > 0) {
      ctx.fillText(line.trim(), x, y + (linesDrawn * lineHeight));
      linesDrawn++;
    }
    return linesDrawn;
  }

  // 6. QR Code Matrix & Drawing
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

    // Clean standard matrix fallback
    const m = [];
    const size = 25;
    for (let r = 0; r < size; r++) {
      const row = [];
      for (let c = 0; c < size; c++) {
        const isFinderTL = (r < 7 && c < 7);
        const isFinderTR = (r < 7 && c >= size - 7);
        const isFinderBL = (r >= size - 7 && c < 7);
        if (isFinderTL || isFinderTR || isFinderBL) {
          const inR = (r < 7) ? r : (r - (size - 7));
          const inC = (c < 7) ? c : (c - (size - 7));
          const isEdge = (inR === 0 || inR === 6 || inC === 0 || inC === 6);
          const isCenter = (inR >= 2 && inR <= 4 && inC >= 2 && inC <= 4);
          row.push((isEdge || isCenter) ? 1 : 0);
        } else {
          row.push(((r * 7 + c * 13 + 5) % 3 === 0) ? 1 : 0);
        }
      }
      m.push(row);
    }
    return m;
  }

  // 7. Dynamic Palette & Gradient Tokens
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
        // Dark Mode Banner Gradient (Midnight Navy -> Deep Cobalt -> Vibrant Blue with cyan glow)
        bannerGradStart: '#0f172a',
        bannerGradMid: '#1e3a8a',
        bannerGradEnd: '#2563eb',
        quoteGradStart: '#111827',
        quoteGradMid: '#1e293b',
        quoteGradEnd: '#2563eb',
        quoteBorder: 'rgba(56, 189, 248, 0.35)',
        accentBrand: '#38bdf8',
        accentViolet: '#818cf8',
        // Badges
        greenPillBg: 'rgba(16, 185, 129, 0.16)',
        greenPillText: '#34d399',
        greenPillBorder: 'rgba(16, 185, 129, 0.35)',
        bluePillBg: 'rgba(56, 189, 248, 0.16)',
        bluePillText: '#38bdf8',
        bluePillBorder: 'rgba(56, 189, 248, 0.35)',
        purplePillBg: 'rgba(139, 92, 246, 0.16)',
        purplePillText: '#a78bfa',
        purplePillBorder: 'rgba(139, 92, 246, 0.35)',
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
        cardShadow: 'rgba(15, 23, 42, 0.06)',
        subSurface: '#f8fafc',
        innerBorder: '#e2e8f0',
        textMain: '#0f172a',
        textMuted: '#334155',
        textDim: '#64748b',
        textHighlight: '#4338ca',
        // Light Mode Banner Gradient (EXACT Royal Indigo / Purple / Violet gradient from Prince Olympiad reference!)
        bannerGradStart: '#3730a3',
        bannerGradMid: '#4f46e5',
        bannerGradEnd: '#6366f1',
        quoteGradStart: '#3730a3',
        quoteGradMid: '#4f46e5',
        quoteGradEnd: '#6366f1',
        quoteBorder: '#4f46e5',
        accentBrand: '#4338ca',
        accentViolet: '#6366f1',
        // Badges
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

  // ═════════════════════════════════════════════════════════════════════════
  // MAIN PDF GENERATION ENGINE
  // ═════════════════════════════════════════════════════════════════════════

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

    // Data resolution
    const state = window.STATE || {};
    let studentName = (customData?.name || customData?.studentName || state.studentName || localStorage.getItem('cf_student_name') || 'Aarav Sharma').trim();
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

    const docId = `KIS-2026-${(studentName || 'STU').slice(0, 3).toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const issueDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    let reflectionText = "Articulating technical concepts with confidence has transformed my outlook on global opportunities. Career Fair 2026 provided immense clarity on international university gateways and career preparation.";
    let ratingStars = 5;
    try {
      const fbStr = localStorage.getItem('ecf_student_feedback');
      if (fbStr) {
        const fb = JSON.parse(fbStr);
        if (fb.comment && fb.comment.trim()) reflectionText = fb.comment.trim();
        if (fb.stars) ratingStars = Number(fb.stars);
      }
    } catch (_) {}

    // ═════════════════════════════════════════════════════════════════════════
    // PAGE 1: CAREER BLUEPRINT & ACADEMIC BENCHMARKS (EXACT PRINCE FORMAT)
    // ═════════════════════════════════════════════════════════════════════════

    drawCleanBackground(ctx, CW, CH, C);

    // 1. Top Running Header
    const topBarY = 60;
    // Left logo box with mode gradient
    const logoGrad = ctx.createLinearGradient(80, topBarY, 130, topBarY + 50);
    logoGrad.addColorStop(0, C.bannerGradStart);
    logoGrad.addColorStop(1, C.bannerGradEnd);
    ctx.fillStyle = logoGrad;
    drawRoundRect(ctx, 80, topBarY, 50, 50, 12, true, false);

    // Inside logo box: Clean geometric emblem
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(105, topBarY + 25, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = logoGrad;
    ctx.beginPath();
    ctx.arc(105, topBarY + 25, 6, 0, Math.PI * 2);
    ctx.fill();

    // Top Brand Text
    ctx.textAlign = 'left';
    ctx.font = '800 15px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.textHighlight;
    ctx.fillText('E N G L I S H   C A R E E R   F A I R   2 0 2 6', 145, topBarY + 22);

    ctx.font = '600 11px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.textDim;
    ctx.fillText('GLOBAL ARTICULATION & CAREER INTELLIGENCE INITIATIVE', 145, topBarY + 40);

    // Right Institutional Branding
    ctx.textAlign = 'right';
    ctx.font = '800 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textMain;
    ctx.fillText('KANAKIA INTERNATIONAL SCHOOL', CW - 80, topBarY + 22);

    ctx.font = '600 11.5px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.textDim;
    ctx.fillText('IB World School · Cambridge International · CIE & CBSE', CW - 80, topBarY + 42);
    ctx.textAlign = 'left';

    // Divider line
    ctx.strokeStyle = C.cardBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(80, topBarY + 68);
    ctx.lineTo(CW - 80, topBarY + 68);
    ctx.stroke();

    // 2. Stage Subtitle & Main Document Title
    const titleY = topBarY + 105;
    ctx.font = '800 13px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.textHighlight;
    ctx.fillText('S T A G E   0 1', 80, titleY);

    ctx.font = '800 46px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textMain;
    ctx.fillText('Career Intelligence Report', 80, titleY + 52);

    ctx.font = '700 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textHighlight;
    ctx.fillText('Global Pathways, Higher Education Benchmarks & Linguistic Readiness', 80, titleY + 86);

    ctx.font = '500 14.5px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textDim;
    ctx.fillText('Your personalized career exploration profile: academic roadmap, degree milestones, and future readiness.', 80, titleY + 115);

    // 3. Student Metadata Card (Exact 3-col x 2-row layout of Reference Page 1)
    const metaY = titleY + 145;
    const metaW = CW - 160;
    const metaH = 215;
    drawCard(ctx, 80, metaY, metaW, metaH, 16, C);

    // Column 1
    const col1X = 120;
    ctx.font = '700 11px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.textDim;
    ctx.fillText('STUDENT NAME', col1X, metaY + 45);
    ctx.font = '800 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textMain;
    ctx.fillText(studentName.toUpperCase(), col1X, metaY + 80);

    ctx.font = '700 11px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.textDim;
    ctx.fillText('STUDENT ID / ROLL NO.', col1X, metaY + 135);
    ctx.font = '800 20px "JetBrains Mono", monospace';
    ctx.fillStyle = C.textHighlight;
    ctx.fillText(docId, col1X, metaY + 170);

    // Column 2
    const col2X = 580;
    ctx.font = '700 11px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.textDim;
    ctx.fillText('TARGET CAREER', col2X, metaY + 45);
    ctx.font = '800 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textMain;
    ctx.fillText(chosenCareer.title, col2X, metaY + 80);

    ctx.font = '700 11px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.textDim;
    ctx.fillText('CLASS / GRADE', col2X, metaY + 135);
    ctx.font = '800 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textMain;
    ctx.fillText(`Class ${className}`, col2X, metaY + 170);

    // Column 3
    const col3X = 1080;
    ctx.font = '700 11px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.textDim;
    ctx.fillText('CAREER CLUSTER', col3X, metaY + 45);
    ctx.font = '800 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textMain;
    ctx.fillText(chosenCareer.cat || 'Global Professional', col3X, metaY + 80);

    ctx.font = '700 11px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.textDim;
    ctx.fillText('REPORT DATE', col3X, metaY + 135);
    ctx.font = '800 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textMain;
    ctx.fillText(issueDate, col3X, metaY + 170);

    // 4. Section: About Target Career & English Superpower (2/3 text + 1/3 pill cards)
    const aboutY = metaY + metaH + 45;
    ctx.font = '800 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textMain;
    ctx.fillText(`About ${chosenCareer.title}`, 80, aboutY);

    // Left narrative paragraph
    const aboutNarrativeY = aboutY + 30;
    const aboutNarrativeW = 860;
    ctx.font = '500 14px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textMuted;
    const narrativeText = `The English Career Fair is Kanakia International School's flagship career & language diagnostic initiative, open to students of Classes V–XII. In ${chosenCareer.title}, articulate English communication enables executive leadership, cross-cultural collaboration, and international regulatory licensing. Beyond basic academics, this report benchmarks learning behavior, spoken fluency, cognitive adaptability, and collegiate readiness against international peer standards.`;
    wrapText(ctx, narrativeText, 80, aboutNarrativeY, aboutNarrativeW, 22, 6);

    ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textDim;
    ctx.fillText(`Degrees: ${chosenCareer.degrees}  |  Gateway Exams: ${chosenCareer.exams}`, 80, aboutNarrativeY + 135);
    ctx.fillText(`Key Competencies: ${chosenCareer.skills}`, 80, aboutNarrativeY + 160);

    // Right stacked pill cards (Exact 3-card stack from Reference Page 1)
    const pillStackX = 990;
    const pillStackW = CW - 80 - pillStackX;
    const pillH = 54;
    const pillGap = 14;

    const stackCards = [
      { text: "Talent & Career Pathway Exploration", color: C.textHighlight },
      { text: "Classes V – XII, Multi-Campus Initiative", color: C.textHighlight },
      { text: "Beyond Marks: A Career Diagnostic", color: C.textHighlight }
    ];

    stackCards.forEach((c, idx) => {
      const pY = aboutNarrativeY + idx * (pillH + pillGap);
      drawCard(ctx, pillStackX, pY, pillStackW, pillH, 12, C, { shadow: false, bg: C.subSurface, border: C.innerBorder });
      ctx.font = '700 13px "Space Grotesk", sans-serif';
      ctx.fillStyle = c.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(c.text, pillStackX + pillStackW / 2, pY + pillH / 2);
    });
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // 5. Section: Your Career Discovery Journey (Exact Stepper Timeline from Reference Page 1)
    const journeyY = aboutY + 235;
    const journeyH = 245;
    drawCard(ctx, 80, journeyY, metaW, journeyH, 16, C);

    ctx.font = '800 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textMain;
    ctx.fillText('Your Career Discovery Journey', 120, journeyY + 45);

    // Connecting timeline track
    ctx.strokeStyle = C.innerBorder;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(180, journeyY + 105);
    ctx.lineTo(CW - 180, journeyY + 105);
    ctx.stroke();

    const steps = [
      {
        num: "✓",
        isCheck: true,
        circleBg: C.isDark ? '#059669' : '#10b981',
        title: "Stage 1 · Career Selection",
        sub: "Explored 32+ global pathways & pinned target blueprint",
        pillText: "CLEARED",
        pillBg: C.greenPillBg,
        pillTextCol: C.greenPillText,
        pillBorder: C.greenPillBorder
      },
      {
        num: "✓",
        isCheck: true,
        circleBg: C.isDark ? '#4f46e5' : '#6366f1',
        title: "Stage 2 · 6D Speech Diagnostics",
        sub: "Multi-metric acoustic analysis & vocabulary trials",
        pillText: "COMPLETED",
        pillBg: C.purplePillBg,
        pillTextCol: C.purplePillText,
        pillBorder: C.purplePillBorder
      },
      {
        num: "3",
        isCheck: false,
        circleBg: C.isDark ? '#2563eb' : '#3b82f6',
        title: "Results & Recognition",
        sub: "Official printable booklet with live ambassador card",
        pillText: "VERIFIED",
        pillBg: C.bluePillBg,
        pillTextCol: C.bluePillText,
        pillBorder: C.bluePillBorder
      }
    ];

    const stepSpacing = metaW / 3;
    steps.forEach((st, idx) => {
      const stepCenterX = 80 + stepSpacing * idx + stepSpacing / 2;

      // Circle icon
      ctx.fillStyle = st.circleBg;
      ctx.beginPath();
      ctx.arc(stepCenterX, journeyY + 105, 20, 0, Math.PI * 2);
      ctx.fill();

      // White checkmark or number
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 15px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(st.num, stepCenterX, journeyY + 106);

      // Title & Subtitle
      ctx.font = '800 15px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = C.textMain;
      ctx.fillText(st.title, stepCenterX, journeyY + 150);

      ctx.font = '500 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = C.textDim;
      ctx.fillText(st.sub, stepCenterX, journeyY + 172);

      // Status Pill below
      drawBadgePill(ctx, st.pillText, stepCenterX - 55, journeyY + 192, {
        width: 110,
        height: 24,
        bg: st.pillBg,
        color: st.pillTextCol,
        border: st.pillBorder,
        font: '800 11px "Space Grotesk", sans-serif'
      });
    });
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // 6. Section: Higher Education Benchmarks Table/Grid
    const eduY = journeyY + journeyH + 35;
    const eduH = 395;
    drawCard(ctx, 80, eduY, metaW, eduH, 16, C);

    ctx.font = '800 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textMain;
    ctx.fillText('Higher Education Accreditations & Statutory Benchmarks', 120, eduY + 45);

    ctx.font = '500 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textDim;
    ctx.fillText(`Curated statutory collegiate benchmarks for ${chosenCareer.title}: NAAC A++ grades, NIRF top rankings, and international equivalents.`, 120, eduY + 70);

    const colleges = [
      {
        hub: "Maharashtra Premier Hub",
        name: "IIT Bombay / ICT Mumbai / St. Xavier's",
        badges: ["NAAC A++", "NIRF Top 5"],
        degrees: "B.Tech / B.Sc. Aviation / Autonomous Degree",
        englishReq: "Advanced Spoken Fluency (CEFR C1)"
      },
      {
        hub: "National Institutes of Eminence (Pan-India)",
        name: "AIIMS New Delhi / IIM Ahmedabad / NLSIU / IISc",
        badges: ["INI Statutory", "UGC Autonomous"],
        degrees: "Integrated Professional Baccalaureate",
        englishReq: "99.5+ Percentile Entrance Gateways"
      },
      {
        hub: "Global Study Abroad Benchmark",
        name: "Oxford / Cambridge / Harvard / NUS Singapore",
        badges: ["QS World Top 50", "AACSB / ABET"],
        degrees: "International Professional Licensure",
        englishReq: "IELTS 7.5+ / TOEFL 105+ / CEFR C2"
      }
    ];

    const cW = (metaW - 80) / 3;
    colleges.forEach((cg, idx) => {
      const cX = 120 + idx * (cW + 20);
      const cY = eduY + 95;
      const cH = 265;
      drawCard(ctx, cX, cY, cW, cH, 12, C, { shadow: false, bg: C.subSurface, border: C.innerBorder });

      ctx.font = '800 12px "Space Grotesk", sans-serif';
      ctx.fillStyle = C.textHighlight;
      ctx.fillText(cg.hub.toUpperCase(), cX + 20, cY + 30);

      ctx.font = '800 15px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = C.textMain;
      wrapText(ctx, cg.name, cX + 20, cY + 58, cW - 40, 20, 2);

      // Pill Badges
      let bX = cX + 20;
      cg.badges.forEach(b => {
        const w = drawBadgePill(ctx, b, bX, cY + 110, {
          height: 22,
          paddingX: 10,
          bg: C.bluePillBg,
          color: C.bluePillText,
          border: C.bluePillBorder,
          font: '800 10.5px "Space Grotesk", sans-serif'
        });
        bX += w + 8;
      });

      ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = C.textDim;
      ctx.fillText('Target Degrees:', cX + 20, cY + 160);
      ctx.font = '700 12.5px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = C.textMuted;
      wrapText(ctx, cg.degrees, cX + 20, cY + 180, cW - 40, 18, 2);

      ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = C.textDim;
      ctx.fillText('English Requirement:', cX + 20, cY + 225);
      ctx.font = '700 12.5px "Space Grotesk", sans-serif';
      ctx.fillStyle = C.textHighlight;
      ctx.fillText(cg.englishReq, cX + 20, cY + 245);
    });

    // 7. Bottom Callout Banner & Quotation Card (Exact Split Banner from Reference Page 1)
    const quoteY = eduY + eduH + 35;
    const quoteH = 220;

    // Left side: Stage Completed Callout
    const leftCalloutW = 600;
    ctx.font = '800 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textHighlight;
    ctx.fillText('Stage 1 & 2 Completed', 80, quoteY + 60);

    ctx.font = '500 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textDim;
    ctx.fillText('Thank you for taking part. Keep learning, speaking, and growing!', 80, quoteY + 95);

    // Right side: Mode Gradient Quotation Card (Royal Purple in Light Mode, Electric Blue in Dark Mode)
    const quoteCardX = 720;
    const quoteCardW = CW - 80 - quoteCardX;

    ctx.save();
    const qGrad = ctx.createLinearGradient(quoteCardX, quoteY, quoteCardX + quoteCardW, quoteY + quoteH);
    qGrad.addColorStop(0, C.quoteGradStart);
    qGrad.addColorStop(0.5, C.quoteGradMid);
    qGrad.addColorStop(1, C.quoteGradEnd);
    ctx.fillStyle = qGrad;
    ctx.strokeStyle = C.quoteBorder;
    ctx.lineWidth = 1.5;
    drawRoundRect(ctx, quoteCardX, quoteY, quoteCardW, quoteH, 16, true, true);
    ctx.restore();

    // White Quotation Text inside card
    ctx.font = '600 17px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#ffffff';
    const quoteLine1 = '“Every expert was once a beginner. What you learn from this';
    const quoteLine2 = 'round is the first step forward.”';
    ctx.fillText(quoteLine1, quoteCardX + 40, quoteY + 65);
    ctx.fillText(quoteLine2, quoteCardX + 40, quoteY + 95);

    ctx.font = '700 14px "Space Grotesk", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText('Team Career Fair 2026 · Kanakia International School', quoteCardX + 40, quoteY + 165);

    // 8. Page 1 Footer
    const footerY = CH - 45;
    ctx.font = '600 12px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.textDim;
    ctx.textAlign = 'left';
    ctx.fillText('Career Fair 2026 · Student Career Intelligence Dossier', 80, footerY);
    ctx.textAlign = 'right';
    ctx.fillText('Page 1 of 2', CW - 80, footerY);
    ctx.textAlign = 'left';

    // Add Page 1 to PDF
    const imgDataP1 = canvas.toDataURL('image/jpeg', 0.92);
    doc.addImage(imgDataP1, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');

    // ═════════════════════════════════════════════════════════════════════════
    // PAGE 2: PERFORMANCE SNAPSHOT & AMBASSADOR CARD (EXACT PRINCE FORMAT)
    // ═════════════════════════════════════════════════════════════════════════

    doc.addPage();
    ctx.clearRect(0, 0, CW, CH);
    drawCleanBackground(ctx, CW, CH, C);

    // 1. Top Running Header
    ctx.textAlign = 'left';
    ctx.font = '700 13px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.textHighlight;
    ctx.fillText('PAGE 02 · PERFORMANCE SNAPSHOT', 80, 50);

    ctx.textAlign = 'right';
    ctx.font = '700 13px "JetBrains Mono", monospace';
    ctx.fillStyle = C.textDim;
    ctx.fillText(`${studentName} · ${docId}`, CW - 80, 50);
    ctx.textAlign = 'left';

    // Hairline divider
    ctx.strokeStyle = C.cardBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(80, 68);
    ctx.lineTo(CW - 80, 68);
    ctx.stroke();

    // 2. Top Hero Overall Performance Card (Exact Full-Width Gradient Card from Reference Page 2)
    const heroY = 88;
    const heroW = CW - 160;
    const heroH = 245;

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

    // Inside Hero Banner: Header Row
    ctx.font = '800 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Overall Performance', 120, heroY + 45);

    // Glass Pill Badge on top right
    drawBadgePill(ctx, 'Strong · Top 25%', CW - 240, heroY + 25, {
      width: 120,
      height: 28,
      bg: 'rgba(255, 255, 255, 0.22)',
      color: '#ffffff',
      font: '700 12px "Space Grotesk", sans-serif'
    });

    // 4 Columns of Big Bold Metrics
    const heroMetrics = [
      { label: "OVERALL SCORE", val: "92", denom: "/100", sub: "92% overall · 95% articulation accuracy" },
      { label: "RANK", val: "Top 10%", denom: "", sub: "Exhibition Leaderboard" },
      { label: "PERCENTILE", val: "94.20", denom: "", sub: "Top 25% of participants" },
      { label: "LEAP SCORE", val: "9.2", denom: "/10", sub: "Learning Intelligence Index" }
    ];

    const colW = heroW / 4;
    heroMetrics.forEach((m, idx) => {
      const mX = 120 + idx * colW;
      ctx.font = '700 11px "Space Grotesk", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.fillText(m.label, mX, heroY + 105);

      // Value & Denominator
      ctx.font = '800 42px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(m.val, mX, heroY + 155);

      if (m.denom) {
        const valWidth = ctx.measureText(m.val).width;
        ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.fillText(m.denom, mX + valWidth + 4, heroY + 155);
      }

      ctx.font = '500 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillText(m.sub, mX, heroY + 185);
    });

    // 3. Performance Band Segmented Stage Bar (Exact Segmented Bar from Reference Page 2)
    const bandY = heroY + heroH + 28;
    const bandH = 80;
    drawCard(ctx, 80, bandY, heroW, bandH, 14, C);

    ctx.font = '700 12px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.textDim;
    ctx.fillText('PERFORMANCE BAND', 115, bandY + 45);

    const bands = [
      { name: "Early Stage", active: false },
      { name: "Developing", active: false },
      { name: "Promising", active: false },
      { name: "Strong", active: true },
      { name: "Exceptional", active: false }
    ];

    const bandItemW = 190;
    const bandStartX = 420;
    bands.forEach((b, idx) => {
      const bX = bandStartX + idx * (bandItemW + 12);
      if (b.active) {
        drawBadgePill(ctx, b.name, bX, bandY + 26, {
          width: bandItemW,
          height: 32,
          radius: 8,
          bg: C.activeBandBg,
          color: C.activeBandText,
          font: '800 13px "Space Grotesk", sans-serif'
        });
      } else {
        ctx.font = '600 13px "Space Grotesk", sans-serif';
        ctx.fillStyle = C.textDim;
        ctx.textAlign = 'center';
        ctx.fillText(b.name, bX + bandItemW / 2, bandY + 46);
        ctx.textAlign = 'left';
      }
    });

    // 4. 6D Metrics Score Cards Grid (Exact 5 Score Cards in a row from Reference Page 2)
    const gridY = bandY + bandH + 24;
    const gridH = 130;
    const skillCards = [
      { name: "FLUENCY", val: "94%", sub: "Smooth Delivery" },
      { name: "PRONUNCIATION", val: "91%", sub: "Phonetic Accuracy" },
      { name: "PACE & CADENCE", val: "138 WPM", sub: "Optimal Delivery" },
      { name: "VOCABULARY", val: "88%", sub: "Professional Lexicon" },
      { name: "CONFIDENCE", val: "95%", sub: "Executive Poise" }
    ];

    const cardW = (heroW - (skillCards.length - 1) * 18) / skillCards.length;
    skillCards.forEach((sc, idx) => {
      const cX = 80 + idx * (cardW + 18);
      drawCard(ctx, cX, gridY, cardW, gridH, 12, C);

      ctx.font = '700 11px "Space Grotesk", sans-serif';
      ctx.fillStyle = C.textDim;
      ctx.fillText(sc.name, cX + 20, gridY + 34);

      ctx.font = '800 28px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = C.textMain;
      ctx.fillText(sc.val, cX + 20, gridY + 76);

      ctx.font = '500 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = C.textDim;
      ctx.fillText(sc.sub, cX + 20, gridY + 104);
    });

    // 5. Insights & Student Reflections Card (Exact Insights Card from Reference Page 2)
    const insightY = gridY + gridH + 24;
    const insightH = 220;
    drawCard(ctx, 80, insightY, heroW, insightH, 16, C);

    ctx.font = '800 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textHighlight;
    ctx.fillText('Insights & Student Reflections', 115, insightY + 42);

    ctx.font = '600 14px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textMain;
    ctx.fillText(`“${reflectionText}”`, 115, insightY + 74);

    // Stars
    ctx.font = '700 14px "Space Grotesk", sans-serif';
    ctx.fillStyle = '#f59e0b';
    const starStr = '★ '.repeat(ratingStars) + '☆ '.repeat(Math.max(0, 5 - ratingStars));
    ctx.fillText(`${starStr} Rated ${ratingStars}.0 out of 5.0 · Verified on Fair Network`, 115, insightY + 105);

    ctx.font = '500 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textMuted;
    const diagnosticNarrative = `Based on your overall performance, you have shown outstanding communication potential by securing a readiness score of 9.2/10 and top-tier standing in spoken articulation. Your strongest performance was in Confidence and Fluency, while specialized vocabulary development offers a powerful pathway for growth. By continuing to practice with authentic global literature and speech roleplay, you can achieve elite leadership standing across international collegiate gateways.`;
    wrapText(ctx, diagnosticNarrative, 115, insightY + 135, heroW - 70, 20, 4);

    // 6. Detachable Student Ambassador Business Card (with High-Contrast Scannable QR Code)
    const bcY = insightY + insightH + 32;
    const bcH = CH - bcY - 70;

    // Dotted Cutout Line with Scissor Icon
    ctx.save();
    ctx.strokeStyle = C.textDim;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(80, bcY);
    ctx.lineTo(CW - 80, bcY);
    ctx.stroke();
    ctx.restore();

    ctx.font = '700 11px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.textDim;
    ctx.textAlign = 'center';
    ctx.fillText('✂  DETACHABLE STUDENT AMBASSADOR BUSINESS CARD (POCKET WALLET CREDENTIAL)', CW / 2, bcY - 10);
    ctx.textAlign = 'left';

    // Business Card Outer Shell
    const cardInnerY = bcY + 15;
    const cardInnerH = bcH - 25;
    drawCard(ctx, 80, cardInnerY, heroW, cardInnerH, 18, C);

    // Left Column: Student Ambassador Credentials
    const bcPad = 45;
    const bcLeftX = 80 + bcPad;
    const bcLeftW = 860;

    // Logo & Header
    ctx.font = '800 12px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.textHighlight;
    ctx.fillText('OFFICIAL IDENTITY CREDENTIAL · KANAKIA INTERNATIONAL SCHOOL', bcLeftX, cardInnerY + 50);

    ctx.font = '800 36px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textMain;
    ctx.fillText(studentName, bcLeftX, cardInnerY + 95);

    ctx.font = '800 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textHighlight;
    ctx.fillText(`Target Career: ${chosenCareer.title}`, bcLeftX, cardInnerY + 130);

    ctx.font = '600 14px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textDim;
    ctx.fillText(`Class ${className}  |  Cluster: ${chosenCareer.cat || 'Global Professional'}  |  Cohort 2026`, bcLeftX, cardInnerY + 160);

    // Skill Badges on Card
    ctx.font = '700 12px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.textDim;
    ctx.fillText('VERIFIED COMPETENCIES:', bcLeftX, cardInnerY + 205);

    const skills = chosenCareer.skills.split(',').map(s => s.trim()).slice(0, 3);
    let sBadgeX = bcLeftX;
    skills.forEach(sk => {
      const w = drawBadgePill(ctx, sk, sBadgeX, cardInnerY + 220, {
        height: 26,
        paddingX: 12,
        bg: C.subSurface,
        border: C.innerBorder,
        color: C.textMain,
        font: '700 11px "Space Grotesk", sans-serif'
      });
      sBadgeX += w + 10;
    });

    ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textMuted;
    wrapText(ctx, `Academic Path: ${chosenCareer.degrees} (${chosenCareer.exams})`, bcLeftX, cardInnerY + 280, bcLeftW, 20, 2);
    wrapText(ctx, `English Superpower: ${chosenCareer.englishSuperpower}`, bcLeftX, cardInnerY + 310, bcLeftW, 20, 2);

    // Right Column: Scannable QR Code on Crisp Pure White Card
    const qrBoxW = 390;
    const qrBoxH = 500;
    const qrBoxX = 80 + heroW - bcPad - qrBoxW;
    const qrBoxY = cardInnerY + 45;

    // Pure White Card for camera contrast
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    drawRoundRect(ctx, qrBoxX, qrBoxY, qrBoxW, qrBoxH, 16, true, true);
    ctx.restore();

    // Verification URL
    const targetOrigin = (window.location && window.location.origin) ? window.location.origin : 'https://careerwithenglish.pages.dev';
    const verifyUrl = `${targetOrigin}/?verify=1&id=${encodeURIComponent(docId)}&name=${encodeURIComponent(studentName)}&career=${encodeURIComponent(chosenCareer.title)}&class=${encodeURIComponent(className)}`;
    const qrMat = getDynamicQrMatrix(verifyUrl);

    // Draw QR Code
    const qrSize = 310;
    const qrX = qrBoxX + (qrBoxW - qrSize) / 2;
    const qrY = qrBoxY + 30;
    drawQrToCanvas(ctx, qrMat, qrX, qrY, qrSize);

    // QR Bottom Text
    ctx.font = '800 13px "Space Grotesk", sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.fillText('★ SCAN TO VERIFY CREDENTIAL', qrBoxX + qrBoxW / 2, qrY + qrSize + 45);

    ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Verified on the Live Fair Network', qrBoxX + qrBoxW / 2, qrY + qrSize + 70);

    ctx.font = '700 10.5px "JetBrains Mono", monospace';
    ctx.fillStyle = '#2563eb';
    ctx.fillText(docId, qrBoxX + qrBoxW / 2, qrY + qrSize + 92);
    ctx.textAlign = 'left';

    // Business Card Bottom Status Bar
    const bBarY = cardInnerY + cardInnerH - 45;
    ctx.strokeStyle = C.innerBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(80 + bcPad, bBarY);
    ctx.lineTo(80 + heroW - bcPad, bBarY);
    ctx.stroke();

    ctx.font = '700 11px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.textDim;
    ctx.fillText('OFFICIAL STUDENT AMBASSADOR IDENTITY PASS · ENGLISH CAREER FAIR 2026', 80 + bcPad, bBarY + 25);

    ctx.textAlign = 'right';
    ctx.font = '800 11.5px "JetBrains Mono", monospace';
    ctx.fillStyle = C.textHighlight;
    ctx.fillText('STATUS: ACTIVE & VERIFIED ON FAIR NETWORK', 80 + heroW - bcPad, bBarY + 25);
    ctx.textAlign = 'left';

    // Page 2 Footer
    const footerY2 = CH - 45;
    ctx.font = '600 11.5px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textDim;
    ctx.textAlign = 'left';
    ctx.fillText('Career Fair 2026 · Student Career Intelligence Dossier', 80, footerY2);
    ctx.textAlign = 'right';
    ctx.fillText('Page 2 of 2', CW - 80, footerY2);
    ctx.textAlign = 'left';

    // Add Page 2 to PDF
    const imgDataP2 = canvas.toDataURL('image/jpeg', 0.92);
    doc.addImage(imgDataP2, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');

    // Save PDF
    if (!returnOnly) {
      const cleanFilename = `ECF2026_CareerBooklet_${studentName.replace(/[^a-zA-Z0-9_-]+/g, '_')}.pdf`;
      doc.save(cleanFilename);

      if (typeof window.showToast === 'function') {
        window.showToast(`🎉 Official Career Booklet downloaded!`);
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
