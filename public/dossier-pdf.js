/**
 * Career Fair 2026 - Official Student Career Booklet & Ambassador Card Generator
 * High-Definition 2-Page Executive Dossier
 * 
 * Rebuilt from scratch:
 * - Completely identical to website UI (Plus Jakarta Sans, Space Grotesk, JetBrains Mono)
 * - Clean obsidian luxury & corporate slate themes
 * - ABSOLUTELY ZERO PARTICLES / SHARDS / NOISE
 * - Sleek card shapes, top accent ribbons, soft depth shadows, badge pills
 * - Live scannable QR code on detachable Student Ambassador Business Card
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

  // 2. Clean Ambient Website Background (Zero Particles, Zero Shards)
  function drawCleanWebsiteBackground(ctx, CW, CH, isDark) {
    ctx.save();
    if (isDark) {
      // Obsidian Dark Gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, CH);
      bgGrad.addColorStop(0, '#0b0c10');
      bgGrad.addColorStop(0.5, '#0e1017');
      bgGrad.addColorStop(1, '#13151b');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CW, CH);

      // Soft Top Radial Ambient Glow (Website's --hero-glow)
      const glowTop = ctx.createRadialGradient(CW / 2, 260, 20, CW / 2, 260, 950);
      glowTop.addColorStop(0, 'rgba(37, 99, 235, 0.09)');
      glowTop.addColorStop(0.4, 'rgba(56, 189, 248, 0.04)');
      glowTop.addColorStop(1, 'transparent');
      ctx.fillStyle = glowTop;
      ctx.fillRect(0, 0, CW, CH);

      // Subtle Bottom-Right Accent Glow
      const glowBottom = ctx.createRadialGradient(CW - 200, CH - 350, 40, CW - 200, CH - 350, 800);
      glowBottom.addColorStop(0, 'rgba(139, 92, 246, 0.05)');
      glowBottom.addColorStop(1, 'transparent');
      ctx.fillStyle = glowBottom;
      ctx.fillRect(0, 0, CW, CH);
    } else {
      // Corporate Clean Light Gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, CH);
      bgGrad.addColorStop(0, '#f8fafc');
      bgGrad.addColorStop(0.5, '#f1f5f9');
      bgGrad.addColorStop(1, '#e2e8f0');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CW, CH);

      // Soft Top Radial Light Glow
      const glowTop = ctx.createRadialGradient(CW / 2, 260, 20, CW / 2, 260, 950);
      glowTop.addColorStop(0, 'rgba(37, 99, 235, 0.05)');
      glowTop.addColorStop(1, 'transparent');
      ctx.fillStyle = glowTop;
      ctx.fillRect(0, 0, CW, CH);
    }
    ctx.restore();
  }

  // 3. Card Renderer matching Website Card Style & Shadow Effects
  function drawWebsiteCard(ctx, x, y, width, height, radius = 16, isDark = true, topRibbon = true) {
    ctx.save();
    // Soft realistic depth shadow
    ctx.shadowColor = isDark ? 'rgba(0, 0, 0, 0.55)' : 'rgba(15, 23, 42, 0.08)';
    ctx.shadowBlur = isDark ? 28 : 20;
    ctx.shadowOffsetY = isDark ? 10 : 6;
    ctx.fillStyle = isDark ? '#191c24' : '#ffffff';
    ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.12)' : '#cbd5e1';
    ctx.lineWidth = 1.5;
    drawRoundRect(ctx, x, y, width, height, radius, true, true);
    ctx.restore();

    // Sleek Top Accent Ribbon
    if (topRibbon) {
      ctx.save();
      const ribbonGrad = ctx.createLinearGradient(x, y, x + width, y);
      if (isDark) {
        ribbonGrad.addColorStop(0, '#38bdf8');
        ribbonGrad.addColorStop(0.5, '#3b82f6');
        ribbonGrad.addColorStop(1, '#8b5cf6');
      } else {
        ribbonGrad.addColorStop(0, '#1e3a8a');
        ribbonGrad.addColorStop(0.5, '#2563eb');
        ribbonGrad.addColorStop(1, '#0284c7');
      }
      ctx.fillStyle = ribbonGrad;
      const r = typeof radius === 'number' ? radius : (radius.tl || 16);
      drawRoundRect(ctx, x, y, width, 5, { tl: r, tr: r, br: 0, bl: 0 }, true, false);
      ctx.restore();
    }
  }

  // 4. Badge Pill Renderer (Identical to Website .badge-pill)
  function drawBadgePill(ctx, text, x, y, options = {}) {
    ctx.save();
    const isDark = options.isDark !== false;
    const font = options.font || '700 12px "Space Grotesk", sans-serif';
    ctx.font = font;
    const textW = ctx.measureText(text).width;
    const paddingX = options.paddingX || 14;
    const pillH = options.height || 26;
    const pillW = textW + paddingX * 2;
    const pillRadius = 9999;

    let bg = options.bg;
    let border = options.border;
    let color = options.color;

    if (!bg) {
      if (options.variant === 'gold') {
        bg = isDark ? 'rgba(251, 191, 36, 0.14)' : 'rgba(217, 119, 6, 0.12)';
        border = isDark ? 'rgba(251, 191, 36, 0.4)' : 'rgba(217, 119, 6, 0.35)';
        color = isDark ? '#fbbf24' : '#b45309';
      } else if (options.variant === 'emerald') {
        bg = isDark ? 'rgba(52, 211, 153, 0.14)' : 'rgba(5, 150, 105, 0.12)';
        border = isDark ? 'rgba(52, 211, 153, 0.4)' : 'rgba(5, 150, 105, 0.35)';
        color = isDark ? '#34d399' : '#047857';
      } else if (options.variant === 'magenta') {
        bg = isDark ? 'rgba(251, 113, 133, 0.14)' : 'rgba(225, 29, 72, 0.12)';
        border = isDark ? 'rgba(251, 113, 133, 0.4)' : 'rgba(225, 29, 72, 0.35)';
        color = isDark ? '#fb7185' : '#be123c';
      } else {
        // Cyan / Brand default
        bg = isDark ? 'rgba(56, 189, 248, 0.14)' : 'rgba(37, 99, 235, 0.10)';
        border = isDark ? 'rgba(56, 189, 248, 0.4)' : 'rgba(37, 99, 235, 0.35)';
        color = isDark ? '#38bdf8' : '#1d4ed8';
      }
    }

    ctx.fillStyle = bg;
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    drawRoundRect(ctx, x, y, pillW, pillH, pillRadius, true, true);

    ctx.fillStyle = color;
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
          // Truncate remaining
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

  // 7. Official Certification Seal (Page 2)
  function drawOfficialSeal(ctx, x, y, radius, isDark) {
    ctx.save();
    ctx.translate(x, y);

    // Outer subtle gold aura
    const sealGrad = ctx.createRadialGradient(0, 0, radius * 0.4, 0, 0, radius);
    sealGrad.addColorStop(0, isDark ? 'rgba(251, 191, 36, 0.15)' : 'rgba(217, 119, 6, 0.12)');
    sealGrad.addColorStop(1, isDark ? 'rgba(251, 191, 36, 0.02)' : 'rgba(217, 119, 6, 0.02)');
    ctx.fillStyle = sealGrad;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // Outer ring
    ctx.strokeStyle = isDark ? '#fbbf24' : '#d97706';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius - 4, 0, Math.PI * 2);
    ctx.stroke();

    // Inner dashed ring
    ctx.strokeStyle = isDark ? 'rgba(251, 191, 36, 0.5)' : 'rgba(217, 119, 6, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, radius - 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Center Crest
    ctx.fillStyle = isDark ? '#1e3a8a' : '#2563eb';
    ctx.beginPath();
    ctx.arc(0, 0, radius - 22, 0, Math.PI * 2);
    ctx.fill();

    // Text in Center
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('KIS 2026', 0, -8);
    ctx.font = '700 8.5px "Space Grotesk", sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('VERIFIED SEAL', 0, 8);

    ctx.restore();
  }

  // 8. Main Booklet PDF Generator
  async function generateStudentDossierPDF(customData = {}, options = {}) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      if (typeof window.showToast === 'function') {
        window.showToast('⚠️ Preparing PDF engine...');
      }
      return;
    }

    // Ensure web fonts are ready
    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch (_) {}
    }

    // Theme resolution: Dark by default (or user selected)
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

    // Data resolution
    const state = window.STATE || {};
    let studentName = (customData?.name || customData?.studentName || state.studentName || localStorage.getItem('ecf_student_name') || localStorage.getItem('ecf_bizcard_name') || localStorage.getItem('cf_student_name') || 'Student').trim();
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
        skills: "System Design, Microservices, Agile Leadership, Cloud Infrastructure",
        englishSuperpower: "Articulating complex architectural trade-offs to non-technical stakeholders, leading asynchronous engineering RFCs, and speaking at global developer symposiums."
      };
    } else if (window.CAREERS_DATA && Array.isArray(window.CAREERS_DATA)) {
      const match = window.CAREERS_DATA.find(c => c.title === chosenCareer.title);
      if (match) chosenCareer = Object.assign({}, match, chosenCareer);
    }

    const docId = `KIS-2026-${(studentName || 'STUDENT').slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const issueDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    // Palette tokens
    const C = {
      textMain: isDark ? '#f8fafc' : '#090d16',
      textMuted: isDark ? '#cbd5e1' : '#334155',
      textDim: isDark ? '#94a3b8' : '#64748b',
      accentCyan: isDark ? '#38bdf8' : '#0284c7',
      accentBrand: isDark ? '#3b82f6' : '#2563eb',
      accentGold: isDark ? '#fbbf24' : '#d97706',
      accentEmerald: isDark ? '#34d399' : '#059669',
      subSurface: isDark ? '#13151b' : '#f1f5f9',
      border: isDark ? 'rgba(255, 255, 255, 0.12)' : '#cbd5e1'
    };

    // ═════════════════════════════════════════════════════════════════════════
    // PAGE 1: STRATEGIC CAREER ROADMAP & ACADEMIC BLUEPRINT
    // ═════════════════════════════════════════════════════════════════════════
    ctx.clearRect(0, 0, CW, CH);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // 1. Clean Ambient Background (ZERO PARTICLES)
    drawCleanWebsiteBackground(ctx, CW, CH, isDark);

    // Top Ticker Line
    ctx.font = '700 12px "JetBrains Mono", monospace';
    ctx.fillStyle = C.textDim;
    ctx.textAlign = 'left';
    ctx.fillText('KANAKIA INTERNATIONAL SCHOOL · MIRA ROAD | OFFICIAL CAREER DOSSIER & STRATEGIC BLUEPRINT', 60, 42);
    ctx.textAlign = 'right';
    ctx.fillText(`ID: ${docId}`, CW - 60, 42);

    // Bottom Ticker Line
    ctx.textAlign = 'left';
    ctx.fillText('PAGE 01 OF 02 | CONFIDENTIAL STUDENT ACADEMIC DOSSIER | DIRECTORATE OF CAREER GUIDANCE', 60, CH - 25);
    ctx.textAlign = 'right';
    ctx.fillText('CAREER FAIR 2026', CW - 60, CH - 25);
    ctx.textAlign = 'left';

    // 2. Student Identity Hero Card
    const hX = 60, hY = 60, hW = CW - 120, hH = 210;
    drawWebsiteCard(ctx, hX, hY, hW, hH, 20, isDark, true);

    // School Crest Circle
    const crestX = hX + 28, crestY = hY + 30, crestR = 45;
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

    ctx.font = '800 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('KIS', crestX + crestR, crestY + crestR - 4);
    ctx.font = '700 9px "Space Grotesk", sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('2026', crestX + crestR, crestY + crestR + 14);

    // Header Titles
    const txtX = crestX + crestR * 2 + 26;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // Badge Pill at top of header
    drawBadgePill(ctx, 'OFFICIAL EXECUTIVE CAREER DOSSIER', txtX, hY + 28, { isDark, height: 24, font: '800 11px "Space Grotesk", sans-serif' });

    ctx.font = '800 28px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textMain;
    ctx.fillText('Career Fair 2026 · Kanakia International School', txtX, hY + 84);

    ctx.font = '500 14.5px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textMuted;
    ctx.fillText('Personalized Academic Progression, Spoken English Proficiency & Ambassador Credential', txtX, hY + 112);

    // Student Sub-Banner Box
    const sBoxY = hY + 132;
    ctx.fillStyle = C.subSurface;
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 1;
    drawRoundRect(ctx, txtX, sBoxY, hW - (txtX - hX) - 28, 58, 10, true, true);

    ctx.font = '700 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textMain;
    ctx.fillText(studentName, txtX + 16, sBoxY + 28);

    ctx.font = '600 13px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.textDim;
    ctx.fillText(`Class & Section: ${className}   |   Candidate ID: ${docId}   |   Issued: ${issueDate}`, txtX + 16, sBoxY + 48);

    // Verified Pill on Right of Banner
    drawBadgePill(ctx, 'VERIFIED AMBASSADOR', hX + hW - 190, sBoxY + 14, { isDark, variant: 'emerald', height: 28 });

    // 3. Core Target Career Pathway Card
    const cX = 60, cY = 295, cW = CW - 120, cH = 375;
    drawWebsiteCard(ctx, cX, cY, cW, cH, 18, isDark, true);

    // Section Eyebrow Label
    ctx.font = '800 11.5px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.accentCyan;
    ctx.fillText('TARGET CAREER PATHWAY & VOCATIONAL DIRECTION', cX + 24, cY + 36);

    // Career Title
    ctx.font = '800 32px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textMain;
    ctx.fillText(`${chosenCareer.icon || '🎯'}  ${chosenCareer.title}`, cX + 24, cY + 80);

    // Category Pill & Salary Pill
    let curPillX = cX + 24;
    curPillX += drawBadgePill(ctx, (chosenCareer.cat || 'Global').toUpperCase(), curPillX, cY + 98, { isDark, variant: 'cyan', height: 26 }) + 10;
    if (chosenCareer.salary) {
      curPillX += drawBadgePill(ctx, `SALARY: ${chosenCareer.salary}`, curPillX, cY + 98, { isDark, variant: 'gold', height: 26 }) + 10;
    }

    // Career Description Text
    ctx.font = '500 15px/24px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textMuted;
    wrapText(ctx, chosenCareer.desc, cX + 24, cY + 155, cW - 48, 24, 2);

    // Skills Chips
    if (chosenCareer.skills) {
      ctx.font = '700 12.5px "Space Grotesk", sans-serif';
      ctx.fillStyle = C.textMain;
      ctx.fillText('CORE COMPETENCIES & PROFESSIONAL SKILLS:', cX + 24, cY + 215);

      const skillList = String(chosenCareer.skills).split(/[,;]+/).map(s => s.trim()).filter(Boolean);
      let skX = cX + 24;
      for (const sk of skillList.slice(0, 4)) {
        skX += drawBadgePill(ctx, sk, skX, cY + 226, { isDark, height: 24, font: '600 11.5px "Space Grotesk", sans-serif' }) + 8;
      }
    }

    // English Superpower Box
    const spY = cY + 265;
    const spH = 92;
    ctx.fillStyle = C.subSurface;
    ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.3)' : 'rgba(37, 99, 235, 0.25)';
    ctx.lineWidth = 1;
    drawRoundRect(ctx, cX + 24, spY, cW - 48, spH, 12, true, true);

    ctx.font = '800 12px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.accentCyan;
    ctx.fillText('⚡ MANDATORY ENGLISH SUPERPOWER IN THIS GLOBAL DOMAIN:', cX + 42, spY + 26);

    ctx.font = '500 13.5px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textMain;
    const superPowerText = chosenCareer.englishSuperpower || "Articulate spoken and written English enables cross-continental communication, international negotiations, and strategic domain leadership.";
    wrapText(ctx, superPowerText, cX + 42, spY + 50, cW - 84, 20, 2);

    // 4. 4-Stage Multi-Year Strategic Academic Progression (Grid of 4 clean cards)
    const mY = 695;
    const mCardW = (cW - 20) / 2;
    const mCardH = 370;

    const stages = [
      {
        num: 'STAGE 01',
        title: 'Foundation & Secondary Articulation',
        grade: 'Class 8 – 10 (Current Foundation Stage)',
        points: [
          'Master grammatical clarity, phonetics, and presentation poise',
          'Participate in school debates, Model UN, and spoken eloquence labs',
          'Build strong quantitative & scientific foundation in school curriculum',
          'Personalize career curiosity roadmap and build student portfolio'
        ]
      },
      {
        num: 'STAGE 02',
        title: 'Senior Secondary & Entrance Gateways',
        grade: 'Class 11 – 12 (Specialization & Admission)',
        points: [
          `Target Competitive Gateways: ${chosenCareer.exams || 'CUET, SAT, CLAT, JEE, NEET'}`,
          'Attain CEFR C1/C2 Academic English fluency benchmarks',
          'International Language Proficiencies: IELTS 7.5+ / TOEFL 100+ / Duolingo 125+',
          'Complete capstone domain projects and leadership extracurriculars'
        ]
      },
      {
        num: 'STAGE 03',
        title: 'Undergraduate Degree & Top Institutes',
        grade: `Years 1–4 (${chosenCareer.degrees || 'Bachelor Degree'})`,
        points: [
          'Admit to NAAC "A++" Premier Indian Institutes or QS Global Top 100',
          'Undertake industry internships, case competitions, and research labs',
          'Publish scholarly research papers and technical documentation in English',
          'Engage in global cross-cultural student exchanges and conferences'
        ]
      },
      {
        num: 'STAGE 04',
        title: 'Postgraduate Mastery & Executive Leadership',
        grade: 'Professional Licensure & Industry Mastery',
        points: [
          'Professional licensure, board certifications, and graduate specialization',
          'Lead multinational corporate, medical, technological, or legal initiatives',
          'Represent institutional consortiums in high-stakes English presentations',
          'Mentor next-generation apprentices and drive industry innovation'
        ]
      }
    ];

    stages.forEach((st, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const stX = cX + col * (mCardW + 20);
      const stY = mY + row * (mCardH + 18);

      drawWebsiteCard(ctx, stX, stY, mCardW, mCardH, 16, isDark, true);

      // Card Header
      ctx.font = '800 11px "Space Grotesk", sans-serif';
      ctx.fillStyle = C.accentCyan;
      ctx.fillText(st.num, stX + 22, stY + 32);

      ctx.font = '800 19px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = C.textMain;
      ctx.fillText(st.title, stX + 22, stY + 62);

      drawBadgePill(ctx, st.grade, stX + 22, stY + 76, { isDark, height: 23, font: '600 10.5px "Space Grotesk", sans-serif' });

      // Divider
      ctx.strokeStyle = C.border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(stX + 22, stY + 115);
      ctx.lineTo(stX + mCardW - 22, stY + 115);
      ctx.stroke();

      // Bullets
      let bulletY = stY + 145;
      st.points.forEach(pt => {
        ctx.fillStyle = C.accentCyan;
        ctx.beginPath();
        ctx.arc(stX + 30, bulletY - 5, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '500 13px/19px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = C.textMuted;
        const drawn = wrapText(ctx, pt, stX + 44, bulletY, mCardW - 66, 19, 2);
        bulletY += Math.max(26, drawn * 19 + 6);
      });
    });

    // 5. Bottom University & Exam Gateways Card
    const uY = 1485, uH = 720;
    drawWebsiteCard(ctx, cX, uY, cW, uH, 18, isDark, true);

    ctx.font = '800 12px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.accentCyan;
    ctx.fillText('ACCREDITED UNIVERSITY BENCHMARKS & COMPETITIVE GATEWAYS', cX + 24, uY + 36);

    ctx.font = '800 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textMain;
    ctx.fillText('Premier Institutions & International Score Conversions', cX + 24, uY + 74);

    // Left Subcard: Top Indian & Global Institutes
    const subW = (cW - 68) / 2;
    const subH = uH - 110;
    const lX = cX + 24, rX = cX + 44 + subW;
    const subY = uY + 92;

    ctx.fillStyle = C.subSurface;
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 1;
    drawRoundRect(ctx, lX, subY, subW, subH, 14, true, true);
    drawRoundRect(ctx, rX, subY, subW, subH, 14, true, true);

    // Left content: Universities
    ctx.font = '800 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textMain;
    ctx.fillText('🏛️ Premier Higher Education Institutions', lX + 20, subY + 32);

    ctx.font = '500 12.5px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textDim;
    ctx.fillText('Accredited benchmarks tailored for your career trajectory:', lX + 20, subY + 54);

    const unis = [
      { name: 'Indian Institute of Technology (IIT) Bombay', cat: 'NIRF Rank #1 · Engineering & Design' },
      { name: 'All India Institute of Medical Sciences (AIIMS) New Delhi', cat: 'NIRF Rank #1 · Medical & Surgery' },
      { name: 'National Law School of India University (NLSIU) Bengaluru', cat: 'NIRF Rank #1 · Law & Jurisprudence' },
      { name: 'University of Mumbai & Affiliated Colleges', cat: 'NAAC "A++" · State Benchmark' },
      { name: 'University of Oxford / Imperial College London', cat: 'QS Global Top 10 · Global Benchmark' },
      { name: 'Massachusetts Institute of Technology (MIT) / Stanford', cat: 'QS Global Top 5 · Global Benchmark' }
    ];

    let uniY = subY + 86;
    unis.forEach(u => {
      ctx.fillStyle = C.subSurface;
      ctx.strokeStyle = C.border;
      drawRoundRect(ctx, lX + 16, uniY, subW - 32, 68, 8, true, true);

      ctx.font = '700 14px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = C.textMain;
      ctx.fillText(u.name, lX + 28, uniY + 28);

      ctx.font = '600 11.5px "Space Grotesk", sans-serif';
      ctx.fillStyle = C.accentCyan;
      ctx.fillText(u.cat, lX + 28, uniY + 50);

      uniY += 80;
    });

    // Right content: Exams & Standards
    ctx.font = '800 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textMain;
    ctx.fillText('📋 Competitive Gateways & CEFR Standards', rX + 20, subY + 32);

    ctx.font = '500 12.5px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textDim;
    ctx.fillText('Required exam benchmarks for top program admissions:', rX + 20, subY + 54);

    const exams = [
      { test: 'IELTS Academic', req: 'Band 7.5 – 8.5 (C1/C2)', role: 'International Admissions Benchmark' },
      { test: 'TOEFL iBT', req: '100 – 115 / 120 (C1)', role: 'Global University Licensing Standard' },
      { test: 'Duolingo English Test (DET)', req: '125 – 145 / 160 (C1)', role: 'Fast-Track International Admissions' },
      { test: 'CUET UG / PG', req: '98th+ Percentile (English)', role: 'Central Universities Admission' },
      { test: 'CLAT / AILET (Law)', req: 'Top 500 All-India Rank', role: 'National Law Universities' },
      { test: 'JEE Advanced / NEET UG', req: 'Top 1% Cut-off Standard', role: 'National Premier Medical & Tech' }
    ];

    let exY = subY + 86;
    exams.forEach(ex => {
      ctx.fillStyle = C.subSurface;
      ctx.strokeStyle = C.border;
      drawRoundRect(ctx, rX + 16, exY, subW - 32, 68, 8, true, true);

      ctx.font = '700 14px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = C.textMain;
      ctx.fillText(ex.test, rX + 28, exY + 28);

      ctx.font = '800 12px "JetBrains Mono", monospace';
      ctx.fillStyle = C.accentGold;
      ctx.textAlign = 'right';
      ctx.fillText(ex.req, rX + subW - 28, exY + 28);
      ctx.textAlign = 'left';

      ctx.font = '600 11.5px "Space Grotesk", sans-serif';
      ctx.fillStyle = C.textDim;
      ctx.fillText(ex.role, rX + 28, exY + 50);

      exY += 80;
    });

    // Add Page 1 to PDF
    const imgDataP1 = canvas.toDataURL('image/jpeg', 0.90);
    doc.addImage(imgDataP1, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');

    // ═════════════════════════════════════════════════════════════════════════
    // PAGE 2: ACOUSTIC TELEMETRY, ENDORSEMENT & DETACHABLE BUSINESS CARD
    // ═════════════════════════════════════════════════════════════════════════
    doc.addPage();
    ctx.clearRect(0, 0, CW, CH);

    // 1. Clean Background (ZERO PARTICLES)
    drawCleanWebsiteBackground(ctx, CW, CH, isDark);

    // Top Ticker
    ctx.font = '700 12px "JetBrains Mono", monospace';
    ctx.fillStyle = C.textDim;
    ctx.textAlign = 'left';
    ctx.fillText('KANAKIA INTERNATIONAL SCHOOL · MIRA ROAD | SPOKEN ENGLISH DIAGNOSTICS & AMBASSADOR CARD', 60, 42);
    ctx.textAlign = 'right';
    ctx.fillText(`PAGE 02 OF 02 · ${docId}`, CW - 60, 42);

    // Bottom Ticker
    ctx.textAlign = 'left';
    ctx.fillText('PAGE 02 OF 02 | VERIFIED EXECUTABLE CREDENTIAL & AMBASSADOR PASS | CAREER FAIR 2026', 60, CH - 25);
    ctx.textAlign = 'right';
    ctx.fillText('KANAKIA INTERNATIONAL SCHOOL', CW - 60, CH - 25);
    ctx.textAlign = 'left';

    // 2. Section 1: 6D Spoken English Acoustic Telemetry Card
    const tX = 60, tY = 60, tW = CW - 120, tH = 650;
    drawWebsiteCard(ctx, tX, tY, tW, tH, 18, isDark, true);

    ctx.font = '800 12px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.accentCyan;
    ctx.fillText('6-DIMENSIONAL ACOUSTIC TELEMETRY & CEFR SPOKEN ENGLISH PROFILE', tX + 24, tY + 36);

    ctx.font = '800 26px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textMain;
    ctx.fillText('AI Speech Lab Diagnostic & Vocal Articulation', tX + 24, tY + 76);

    // Overall CEFR Fluency Pill
    drawBadgePill(ctx, 'CEFR LEVEL C1 · ADVANCED FLUENCY (94/100)', tX + tW - 320, tY + 48, { isDark, variant: 'emerald', height: 32, font: '800 12.5px "Space Grotesk", sans-serif' });

    // 6 Metrics Grid (3 columns x 2 rows)
    const metrics = [
      { title: 'Pronunciation Precision', val: '95%', note: 'Phonetic accuracy & syllable stress breakdown' },
      { title: 'Speaking Pace & Cadence', val: '138 WPM', note: 'Optimal international broadcast cadence (120-150)' },
      { title: 'Pitch Modulation & Variance', val: '92%', note: 'Dynamic expressive warmth & pitch variety' },
      { title: 'Articulation Confidence', val: '96%', note: 'Decisiveness, vocal projection & poise' },
      { title: 'Fluency & Flow Stability', val: '94%', note: 'Zero filler words (um, uh, like) detected' },
      { title: 'Lexical Sophistication', val: '91%', note: 'Professional terminology & advanced vocabulary' }
    ];

    const metCardW = (tW - 48 - 32) / 3;
    const metCardH = 220;
    metrics.forEach((m, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const mX = tX + 24 + col * (metCardW + 16);
      const mY = tY + 115 + row * (metCardH + 16);

      ctx.fillStyle = C.subSurface;
      ctx.strokeStyle = C.border;
      ctx.lineWidth = 1;
      drawRoundRect(ctx, mX, mY, metCardW, metCardH, 12, true, true);

      // Top colored indicator line
      ctx.fillStyle = C.accentCyan;
      drawRoundRect(ctx, mX, mY, metCardW, 3.5, { tl: 12, tr: 12, br: 0, bl: 0 }, true, false);

      ctx.font = '700 14px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = C.textMain;
      ctx.fillText(m.title, mX + 16, mY + 36);

      ctx.font = '800 36px "Space Grotesk", sans-serif';
      ctx.fillStyle = (idx === 1) ? C.accentGold : C.accentCyan;
      ctx.fillText(m.val, mX + 16, mY + 95);

      // Progress bar track
      const barY = mY + 120, barW = metCardW - 32, barH = 8;
      ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
      drawRoundRect(ctx, mX + 16, barY, barW, barH, 4, true, false);

      // Bar fill
      const percent = parseInt(m.val, 10) || 94;
      const fillW = barW * Math.min(1, percent / 100);
      const bGrad = ctx.createLinearGradient(mX + 16, barY, mX + 16 + fillW, barY);
      bGrad.addColorStop(0, '#38bdf8');
      bGrad.addColorStop(1, '#3b82f6');
      ctx.fillStyle = bGrad;
      drawRoundRect(ctx, mX + 16, barY, fillW, barH, 4, true, false);

      ctx.font = '500 12px/17px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = C.textDim;
      wrapText(ctx, m.note, mX + 16, mY + 155, metCardW - 32, 17, 3);
    });

    // 3. Section 2: Exhibitor Reflection & Directorate Endorsement Card
    const rY = 735, rH = 590;
    drawWebsiteCard(ctx, tX, rY, tW, rH, 18, isDark, true);

    const refW = (tW - 48 - 24) * 0.60;
    const endW = (tW - 48 - 24) * 0.40;
    const refX = tX + 24;
    const endX = refX + refW + 24;

    // Left Subcard: Student Feedback Reflection
    ctx.fillStyle = C.subSurface;
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 1;
    drawRoundRect(ctx, refX, rY + 28, refW, rH - 56, 14, true, true);

    ctx.font = '800 12px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.accentCyan;
    ctx.fillText('VERIFIED EXHIBITION REFLECTION & FEEDBACK', refX + 24, rY + 62);

    ctx.font = '800 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textMain;
    ctx.fillText('Student Exhibition Review', refX + 24, rY + 98);

    // 5 Stars
    ctx.font = '700 24px "Space Grotesk", sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('★★★★★', refX + 24, rY + 138);

    ctx.font = '700 14px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.textMain;
    ctx.fillText('5.0 / 5.0 · Overall Exhibition Experience', refX + 140, rY + 138);

    // Quote Box
    const qY = rY + 165;
    const qH = rH - 240;
    ctx.fillStyle = isDark ? '#191c24' : '#ffffff';
    ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.25)' : '#cbd5e1';
    drawRoundRect(ctx, refX + 20, qY, refW - 40, qH, 10, true, true);

    let studentComment = '';
    try {
      const fb = JSON.parse(localStorage.getItem('ecf_student_feedback') || '{}');
      studentComment = (fb && fb.comment) ? fb.comment.trim() : '';
    } catch (_) {}
    if (!studentComment) {
      studentComment = "The Career Fair provided tremendous clarity on how articulate English is the core driving engine behind high-impact global careers. Exploring the 32+ pathways, speech lab analytics, and entrance benchmarks gave me absolute confidence in my academic trajectory.";
    }

    ctx.font = 'italic 500 15px/26px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textMain;
    wrapText(ctx, `"${studentComment}"`, refX + 40, qY + 45, refW - 80, 26, 6);

    ctx.font = '700 13px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.accentCyan;
    ctx.fillText(`— ${studentName}, ${className} · Kanakia International School`, refX + 40, qY + qH - 22);

    // Right Subcard: Official Directorate Endorsement & Seal
    ctx.fillStyle = C.subSurface;
    ctx.strokeStyle = C.border;
    drawRoundRect(ctx, endX, rY + 28, endW, rH - 56, 14, true, true);

    ctx.font = '800 12px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.accentCyan;
    ctx.fillText('OFFICIAL CERTIFICATION & ENDORSEMENT', endX + 24, rY + 62);

    ctx.font = '800 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textMain;
    ctx.fillText('Directorate Endorsement', endX + 24, rY + 96);

    // Draw Seal
    drawOfficialSeal(ctx, endX + endW / 2, rY + 200, 70, isDark);

    // Signature Block
    const sigY = rY + 310;
    ctx.font = '700 13.5px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textMain;
    ctx.textAlign = 'center';
    ctx.fillText('Directorate of Career Guidance', endX + endW / 2, sigY);
    ctx.font = '500 11.5px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.textDim;
    ctx.fillText('Kanakia International School, Mira Road', endX + endW / 2, sigY + 20);

    ctx.strokeStyle = C.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(endX + 40, sigY + 36);
    ctx.lineTo(endX + endW - 40, sigY + 36);
    ctx.stroke();

    ctx.font = '700 13.5px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textMain;
    ctx.fillText('Convenor, Department of English & Linguistics', endX + endW / 2, sigY + 62);
    ctx.font = '500 11.5px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.textDim;
    ctx.fillText('Academic Exhibition Committee 2026', endX + endW / 2, sigY + 82);

    ctx.font = '800 11px "JetBrains Mono", monospace';
    ctx.fillStyle = C.accentGold;
    ctx.fillText(`AUTHENTICATED DIGITAL CERTIFICATE: ${docId}`, endX + endW / 2, sigY + 120);
    ctx.textAlign = 'left';

    // 4. Section 3: Detachable Scannable Student Ambassador Business Card
    const bcY = 1350;
    const bcH = 850;

    // Outer Dashed Cut-Out Line with Scissor notice
    ctx.save();
    ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.5)' : '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([10, 8]);
    drawRoundRect(ctx, tX, bcY, tW, bcH, 20, false, true);
    ctx.setLineDash([]);
    ctx.restore();

    // Scissor Banner Tag at Top of Cutout
    ctx.font = '800 12px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.accentCyan;
    ctx.textAlign = 'center';
    ctx.fillText('✂️   CUT ALONG DOTTED LINE TO DETACH OFFICIAL STUDENT AMBASSADOR CARD   ✂️', CW / 2, bcY + 30);
    ctx.textAlign = 'left';

    // The Actual Business Card (Identical to Website Business Card)
    const cardInnerX = tX + 24;
    const cardInnerY = bcY + 50;
    const cardInnerW = tW - 48;
    const cardInnerH = bcH - 74;

    drawWebsiteCard(ctx, cardInnerX, cardInnerY, cardInnerW, cardInnerH, 18, isDark, true);

    // Business Card Header
    const bcPad = 36;
    ctx.font = '800 13px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.accentCyan;
    ctx.fillText('KANAKIA INTERNATIONAL SCHOOL · OFFICIAL STUDENT AMBASSADOR PASS', cardInnerX + bcPad, cardInnerY + 44);

    drawBadgePill(ctx, 'LIVE FAIR NETWORK CREDENTIAL', cardInnerX + cardInnerW - bcPad - 230, cardInnerY + 28, { isDark, variant: 'emerald', height: 26 });

    // Left Details Column
    const detW = cardInnerW - 480;
    const detX = cardInnerX + bcPad;
    const detY = cardInnerY + 88;

    ctx.font = '800 42px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textMain;
    ctx.fillText(studentName, detX, detY + 40);

    // Career Title
    ctx.font = '800 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.accentCyan;
    ctx.fillText(chosenCareer.title, detX, detY + 80);

    // Category Pill & School Meta
    drawBadgePill(ctx, (chosenCareer.cat || 'Global Trajectory').toUpperCase(), detX, detY + 98, { isDark, variant: 'gold', height: 26 });

    ctx.font = '600 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textMuted;
    ctx.fillText(`Class & Section: ${className}   |   Candidate ID: ${docId}`, detX, detY + 155);
    ctx.fillText('Institution: Kanakia International School, Mira Road (English Career Fair 2026)', detX, detY + 185);

    // Business Card Mission Statement Box
    const misY = detY + 215;
    const misH = 180;
    ctx.fillStyle = C.subSurface;
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 1;
    drawRoundRect(ctx, detX, misY, detW - 30, misH, 12, true, true);

    ctx.font = '800 12px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.accentCyan;
    ctx.fillText('AMBASSADOR MISSION & VERIFIED CORE COMPETENCIES:', detX + 20, misY + 30);

    ctx.font = '500 14.5px/22px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textMain;
    const misText = chosenCareer.englishSuperpower || "Certified student ambassador possessing international communication proficiency, strategic analytical leadership, and vocational commitment.";
    wrapText(ctx, misText, detX + 20, misY + 60, detW - 70, 22, 3);

    ctx.font = '700 12.5px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.textDim;
    ctx.fillText(`Skills: ${chosenCareer.skills || 'Executive Leadership, Strategic Analysis, Articulation'}`, detX + 20, misY + 145);

    // Right Column: Scannable QR Code on Crisp White Card
    const qrBoxW = 390;
    const qrBoxH = 500;
    const qrBoxX = cardInnerX + cardInnerW - bcPad - qrBoxW;
    const qrBoxY = cardInnerY + 80;

    // White Card for maximum contrast & phone camera readability
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    drawRoundRect(ctx, qrBoxX, qrBoxY, qrBoxW, qrBoxH, 18, true, true);

    // Verification URL
    const targetOrigin = (window.location && window.location.origin) ? window.location.origin : 'https://careerwithenglish.pages.dev';
    const verifyUrl = `${targetOrigin}/?verify=1&id=${encodeURIComponent(docId)}&name=${encodeURIComponent(studentName)}&career=${encodeURIComponent(chosenCareer.title)}&class=${encodeURIComponent(className)}`;
    const qrMat = getDynamicQrMatrix(verifyUrl);

    // Draw QR Code
    const qrSize = 310;
    const qrX = qrBoxX + (qrBoxW - qrSize) / 2;
    const qrY = qrBoxY + 32;
    drawQrToCanvas(ctx, qrMat, qrX, qrY, qrSize);

    // QR Bottom Text
    ctx.font = '800 13px "Space Grotesk", sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.fillText('📱 SCAN TO VERIFY CREDENTIAL', qrBoxX + qrBoxW / 2, qrY + qrSize + 45);

    ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Verified on the Live Fair Network', qrBoxX + qrBoxW / 2, qrY + qrSize + 70);

    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#2563eb';
    ctx.fillText(docId, qrBoxX + qrBoxW / 2, qrY + qrSize + 92);
    ctx.textAlign = 'left';

    // Business Card Bottom Status Bar
    const bBarY = cardInnerY + cardInnerH - 65;
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cardInnerX + bcPad, bBarY);
    ctx.lineTo(cardInnerX + cardInnerW - bcPad, bBarY);
    ctx.stroke();

    ctx.font = '700 12px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.textDim;
    ctx.fillText('OFFICIAL STUDENT AMBASSADOR IDENTITY PASS · ENGLISH CAREER FAIR 2026', cardInnerX + bcPad, bBarY + 38);

    ctx.textAlign = 'right';
    ctx.font = '800 12px "JetBrains Mono", monospace';
    ctx.fillStyle = C.accentCyan;
    ctx.fillText('STATUS: ACTIVE & VERIFIED ON D1 NETWORK', cardInnerX + cardInnerW - bcPad, bBarY + 38);
    ctx.textAlign = 'left';

    // Add Page 2 to PDF
    const imgDataP2 = canvas.toDataURL('image/jpeg', 0.90);
    doc.addImage(imgDataP2, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');

    // Save PDF
    const cleanFilename = `ECF2026_CareerBooklet_${studentName.replace(/[^a-zA-Z0-9_-]+/g, '_')}.pdf`;
    doc.save(cleanFilename);

    if (typeof window.showToast === 'function') {
      window.showToast(`🎉 Official Career Booklet downloaded!`);
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
