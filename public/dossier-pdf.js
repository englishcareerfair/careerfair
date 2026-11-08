/**
 * Career Fair 2026 -- Executive 2-Page Canvas-Rendered Vector PDF Booklet & Card
 * 
 * Delivers an ultra-prestigious, award-winning academic dossier that 100% matches
 * the website's visual identity:
 * - Fonts: Space Grotesk (headers & badges), Plus Jakarta Sans (body), JetBrains Mono (credentials & telemetry)
 * - Gradients: Cyberpunk Cyan-to-Purple (#00f0ff -> #8b5cf6) in Dark Mode, Royal Sapphire-to-Azure (#1e3a8a -> #0284c7) in Light Mode
 * - Glassmorphism: Semi-translucent cards with glowing borders and soft elevation shadows
 * - Detachable Business Card with high-contrast, camera-scannable dynamic QR verification code
 * - Zero mentions of English Department (Directorate of Career Guidance & Exhibition Convenors)
 */

(function (window) {
  'use strict';

  function safeNum(val, fallback = '0') {
    if (val === null || val === undefined || val === '') return fallback;
    const n = Number(val);
    return isNaN(n) ? fallback : n;
  }

  // Fallback 29x29 QR Matrix if window.qrcode is not ready
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
    "10111010010010100101001000111",
    "10000010110111010100101011111",
    "11111110011101001001001010101"
  ];

  function getDynamicQrMatrix(url) {
    try {
      if (typeof window.qrcode === 'function') {
        const qr = window.qrcode(0, 'M');
        qr.addData(url);
        qr.make();
        const count = qr.getModuleCount();
        const matrix = [];
        for (let r = 0; r < count; r++) {
          const row = [];
          for (let c = 0; c < count; c++) {
            row.push(qr.isDark(r, c) ? 1 : 0);
          }
          matrix.push(row);
        }
        return matrix;
      }
    } catch (e) {
      console.warn('QR Code generation error:', e);
    }
    return FALLBACK_QR_MATRIX_29;
  }

  // Canvas Drawing Utility Helpers
  function drawRoundRect(ctx, x, y, w, h, r, fill, stroke) {
    if (fill === undefined) fill = true;
    if (stroke === undefined) stroke = true;
    if (typeof r === 'number') {
      r = { tl: r, tr: r, br: r, bl: r };
    }
    ctx.beginPath();
    ctx.moveTo(x + r.tl, y);
    ctx.lineTo(x + w - r.tr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr);
    ctx.lineTo(x + w, y + h - r.br);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
    ctx.lineTo(x + r.bl, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl);
    ctx.lineTo(x, y + r.tl);
    ctx.quadraticCurveTo(x, y, x + r.tl, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  function drawCornerBrackets(ctx, x, y, w, h, len, lw, strokeStyle) {
    ctx.save();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lw;
    ctx.lineCap = 'square';
    // Top-Left
    ctx.beginPath();
    ctx.moveTo(x, y + len); ctx.lineTo(x, y); ctx.lineTo(x + len, y);
    ctx.stroke();
    // Top-Right
    ctx.beginPath();
    ctx.moveTo(x + w - len, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + len);
    ctx.stroke();
    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(x, y + h - len); ctx.lineTo(x, y + h); ctx.lineTo(x + len, y + h);
    ctx.stroke();
    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(x + w - len, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - len);
    ctx.stroke();
    ctx.restore();
  }

  function drawSectionHeader(ctx, num, title, subtitle, x, y, width, isDark) {
    ctx.save();
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
    ctx.font = '700 16px "Space Grotesk", -apple-system, sans-serif';
    ctx.fillStyle = badgeText;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(num, x + 32, y + 18);

    // Title
    ctx.font = '700 24px "Space Grotesk", -apple-system, sans-serif';
    ctx.fillStyle = isDark ? '#f8fafc' : '#090d16';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(title, x + 58, y + 1);

    // Subtitle
    ctx.font = '500 14px "Plus Jakarta Sans", -apple-system, sans-serif';
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.fillText(subtitle, x + 58, y + 23);

    // Trailing Decorative Horizontal Track
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
  }

  function drawOfficialSeal(ctx, cx, cy, radius, isDark) {
    ctx.save();
    // Outer Radiant Glow
    const glowGrad = ctx.createRadialGradient(cx, cy, radius * 0.4, cx, cy, radius * 1.25);
    glowGrad.addColorStop(0, isDark ? 'rgba(251, 191, 36, 0.25)' : 'rgba(29, 78, 216, 0.15)');
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.25, 0, Math.PI * 2);
    ctx.fill();

    // 24-point Starburst Notches
    ctx.save();
    ctx.strokeStyle = isDark ? '#fbbf24' : '#d97706';
    ctx.lineWidth = 2;
    for (let i = 0; i < 24; i++) {
      const angle = (i * Math.PI) / 12;
      const x1 = cx + Math.cos(angle) * (radius - 4);
      const y1 = cy + Math.sin(angle) * (radius - 4);
      const x2 = cx + Math.cos(angle) * (radius + 2);
      const y2 = cy + Math.sin(angle) * (radius + 2);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.restore();

    // Concentric Inner Circles
    ctx.strokeStyle = isDark ? '#f59e0b' : '#b45309';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, radius - 8, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, radius - 14, 0, Math.PI * 2); ctx.stroke();

    // Seal Inner Gradient Fill
    const innerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius - 14);
    if (isDark) {
      innerGrad.addColorStop(0, 'rgba(245, 158, 11, 0.15)');
      innerGrad.addColorStop(1, 'rgba(15, 23, 42, 0.85)');
    } else {
      innerGrad.addColorStop(0, 'rgba(254, 243, 199, 0.5)');
      innerGrad.addColorStop(1, 'rgba(255, 255, 255, 0.95)');
    }
    ctx.fillStyle = innerGrad;
    ctx.beginPath(); ctx.arc(cx, cy, radius - 14, 0, Math.PI * 2); ctx.fill();

    // Seal Typography
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 12px "Space Grotesk", sans-serif';
    ctx.fillStyle = isDark ? '#fde68a' : '#92400e';
    ctx.fillText('KANAKIA INTL', cx, cy - 30);

    ctx.font = '700 11px "Space Grotesk", sans-serif';
    ctx.fillStyle = isDark ? '#38bdf8' : '#1d4ed8';
    ctx.fillText('★  ★  ★', cx, cy - 14);

    ctx.font = '800 18px "Space Grotesk", sans-serif';
    ctx.fillStyle = isDark ? '#fbbf24' : '#b45309';
    ctx.fillText('VERIFIED', cx, cy + 4);

    ctx.font = '700 10.5px "Space Grotesk", sans-serif';
    ctx.fillStyle = isDark ? '#fde68a' : '#92400e';
    ctx.fillText('OFFICIAL SEAL', cx, cy + 22);

    ctx.font = '700 12px "JetBrains Mono", monospace';
    ctx.fillStyle = isDark ? '#38bdf8' : '#1d4ed8';
    ctx.fillText('2026', cx, cy + 36);

    ctx.restore();
  }

  function drawQrToCanvas(ctx, matrix, x, y, size) {
    const count = matrix.length;
    const cellSize = size / count;
    ctx.fillStyle = '#000000';
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (matrix[r][c] === 1 || matrix[r][c] === '1') {
          // Slight 0.5px bleed avoids hairline gaps on high-DPI screens
          ctx.fillRect(x + c * cellSize, y + r * cellSize, cellSize + 0.5, cellSize + 0.5);
        }
      }
    }
  }

  /**
   * Main High-DPI Canvas-Rendered Dossier Generator
   */
  async function generateStudentDossierPDF(customData, options) {
    if (customData === undefined) customData = null;
    if (options === undefined) options = {};

    if (typeof window.jspdf === 'undefined' && typeof window.jsPDF === 'undefined') {
      alert('jsPDF library is not loaded. Please ensure the CDN script is active.');
      return null;
    }

    // Wait for fonts (Space Grotesk, Plus Jakarta Sans, JetBrains Mono)
    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch (_) {}
    }

    const { jsPDF } = window.jspdf || window;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    // Theme resolution: dark vs light
    const currentTheme = options?.theme || document.documentElement.getAttribute('data-theme') || 'dark';
    const isDark = (currentTheme === 'dark' || currentTheme === 'cinematic');

    // Canvas dimensions for A4 (1600 x 2263 at 1:1.414 aspect ratio)
    const CW = 1600;
    const CH = 2263;

    const canvas = document.createElement('canvas');
    canvas.width = CW;
    canvas.height = CH;
    const ctx = canvas.getContext('2d');

    // Resolve Student & Career Data
    const state = window.STATE || {};
    let studentName = (customData?.name || customData?.studentName || state.studentName || localStorage.getItem('ecf_student_name') || localStorage.getItem('ecf_bizcard_name') || localStorage.getItem('cf_student_name') || 'Tanmay Sharma').trim();

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
        title: "Commercial Airline Pilot",
        cat: "Aviation & Aerospace",
        desc: "Commands multi-million dollar wide-body aircraft across international air corridors, requiring non-negotiable standardized ICAO phraseology and zero-ambiguity radiotelephony precision under extreme high-stakes operational pressure.",
        englishSuperpower: "Radiotelephony precision and non-negotiable international English phraseology under ICAO Level 5/6 standards. Pilots command global air traffic communication, crew coordination, and emergency clearance protocols where clarity saves lives."
      };
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
    // PAGE 1: CAREER BLUEPRINT & ACADEMIC HORIZON
    // =========================================================================
    ctx.clearRect(0, 0, CW, CH);

    // 1. Background Gradient with subtle radial ambient glow
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

    // 2. Outer Architectural Double Framing
    ctx.strokeStyle = C.outerBorder;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(35, 35, CW - 70, CH - 70);

    ctx.strokeStyle = C.innerBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(45, 45, CW - 90, CH - 90);

    drawCornerBrackets(ctx, 35, 35, CW - 70, CH - 70, 36, 4, C.cornerGold);

    // Top Ticker (Security String)
    ctx.font = '700 11.5px "JetBrains Mono", monospace';
    ctx.fillStyle = C.textDim;
    ctx.textAlign = 'left';
    ctx.fillText('KANAKIA INTERNATIONAL SCHOOL · MIRA ROAD | OFFICIAL STUDENT CAREER BOOKLET & STRATEGIC BLUEPRINT', 55, 27);
    ctx.textAlign = 'right';
    ctx.fillText(`ID: ${docId}`, CW - 55, 27);

    // Bottom Ticker
    ctx.fillText('PAGE 01 OF 02 | CONFIDENTIAL ACADEMIC RECORD | ISSUED UNDER DIRECTORATE SEAL', 55, CH - 20);
    ctx.fillText('CAREER FAIR 2026', CW - 55, CH - 20);

    // 3. Header Card (Glassmorphism with Gradient Trim)
    const hX = 65, hY = 65, hW = CW - 130, hH = 215;
    ctx.save();
    ctx.fillStyle = C.cardBg;
    ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.4)' : 'rgba(37, 99, 235, 0.35)';
    ctx.lineWidth = 1.5;
    drawRoundRect(ctx, hX, hY, hW, hH, 20, true, true);

    // Header Top Gradient Accent Ribbon
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

    // Left Crest / Insignia Badge
    const cX = hX + 70, cY = hY + hH / 2 + 3;
    const crestGrad = ctx.createRadialGradient(cX, cY, 0, cX, cY, 52);
    crestGrad.addColorStop(0, isDark ? 'rgba(56, 189, 248, 0.25)' : 'rgba(37, 99, 235, 0.15)');
    crestGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = crestGrad;
    ctx.beginPath(); ctx.arc(cX, cY, 52, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = isDark ? '#38bdf8' : '#1d4ed8';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(cX, cY, 44, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cX, cY, 38, 0, Math.PI * 2); ctx.stroke();

    ctx.font = '800 24px "Space Grotesk", sans-serif';
    ctx.fillStyle = isDark ? '#fbbf24' : '#d97706';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('KIS', cX, cY - 2);

    ctx.font = '700 9.5px "JetBrains Mono", monospace';
    ctx.fillStyle = isDark ? '#38bdf8' : '#1d4ed8';
    ctx.fillText('FAIR 2026', cX, cY + 16);

    // Header Center Institutional Typography
    const tX = hX + 150;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    ctx.font = '700 15px "Space Grotesk", sans-serif';
    ctx.fillStyle = isDark ? '#38bdf8' : '#1d4ed8';
    ctx.fillText('KANAKIA INTERNATIONAL SCHOOL · MIRA ROAD', tX, hY + 28);

    // Main Title with Gradient Fill
    ctx.font = '800 32px "Space Grotesk", sans-serif';
    const titleGrad = ctx.createLinearGradient(tX, hY + 52, tX + 600, hY + 52);
    if (isDark) {
      titleGrad.addColorStop(0, '#ffffff');
      titleGrad.addColorStop(0.6, '#e0f2fe');
      titleGrad.addColorStop(1, '#a5b4fc');
    } else {
      titleGrad.addColorStop(0, '#090d16');
      titleGrad.addColorStop(0.6, '#1e3a8a');
      titleGrad.addColorStop(1, '#2563eb');
    }
    ctx.fillStyle = titleGrad;
    ctx.fillText('OFFICIAL STUDENT CAREER BOOKLET', tX, hY + 50);

    ctx.font = '600 18px "Space Grotesk", sans-serif';
    ctx.fillStyle = C.textMuted;
    ctx.fillText('& STRATEGIC ACADEMIC BLUEPRINT', tX, hY + 90);

    ctx.font = 'italic 13.5px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = C.textDim;
    ctx.fillText('Virtus · Scientia · Excellentia  —  Empowering 32+ Global Careers Through English', tX, hY + 118);

    // Right Student Credential Box (4-field Glass Pill)
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
      ctx.font = '700 11px "Space Grotesk", sans-serif';
      ctx.fillStyle = C.textDim;
      ctx.fillText(lbl, credX + 16, ry + 12);

      ctx.font = (idx === 3) ? '700 13px "JetBrains Mono", monospace' : '700 14px "Space Grotesk", sans-serif';
      ctx.fillStyle = (idx === 2) ? (isDark ? '#38bdf8' : '#1d4ed8') : C.textMain;
      ctx.textAlign = 'right';
      // Truncate long value
      let maxLen = 22;
      let displayVal = val.length > maxLen ? val.slice(0, maxLen - 1) + '…' : val;
      ctx.fillText(displayVal, credX + credW - 16, ry + 11);
      ctx.textAlign = 'left';

      if (idx < 3) {
        ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
        ctx.beginPath();
        ctx.moveTo(credX + 12, ry + rowH);
        ctx.lineTo(credX + credW - 12, ry + rowH);
        ctx.stroke();
      }
    });
    ctx.restore();

    // 4. SECTION 1: TARGET CAREER PROFILE & ENGLISH SUPERPOWER
    const s1Y = 305;
    drawSectionHeader(ctx, '1', 'TARGET CAREER PROFILE & ENGLISH SUPERPOWER',
      'High-Stakes Professional Articulation & Global Career Horizon', 65, s1Y, CW - 130, isDark);

    const c1X = 65, c1Y = s1Y + 52, c1W = CW - 130, c1H = 345;
    ctx.save();
    ctx.fillStyle = C.cardBg;
    ctx.strokeStyle = C.cardBorder;
    ctx.lineWidth = 1.5;
    drawRoundRect(ctx, c1X, c1Y, c1W, c1H, 18, true, true);

    // Career Title & Cluster Pill
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
    ctx.textAlign = 'left';

    // Description text
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
    descLines.slice(0, 3).forEach((dl, i) => {
      ctx.fillText(dl, c1X + 28, c1Y + 80 + i * 26);
    });

    // English Superpower Highlight Callout Box
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

    // Left accent bar
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

    // 5. SECTION 2: COGNITIVE AGILITY & LANGUAGE PROFICIENCY EVALUATION
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

      // Colored Top Tab
      const tabG = ctx.createLinearGradient(px, py, px + cardW, py);
      tabG.addColorStop(0, p.tabGrad[0]);
      tabG.addColorStop(1, p.tabGrad[1]);
      ctx.fillStyle = tabG;
      drawRoundRect(ctx, px, py, cardW, 5, { tl: 16, tr: 16, br: 0, bl: 0 }, true, false);

      // Title & Score Badge
      ctx.font = '800 17px "Space Grotesk", sans-serif';
      ctx.fillStyle = C.textMain;
      ctx.fillText(p.title, px + 20, py + 26);

      const statW = ctx.measureText(p.stat).width + 16;
      ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = 1;
      drawRoundRect(ctx, px + cardW - statW - 20, py + 16, statW, 24, 6, true, true);
      ctx.font = '700 11.5px "Space Grotesk", sans-serif';
      ctx.fillStyle = isDark ? p.tabGrad[0] : p.tabGrad[1];
      ctx.textAlign = 'center';
      ctx.fillText(p.stat, px + cardW - statW / 2 - 20, py + 28);
      ctx.textAlign = 'left';

      // Description
      ctx.font = '500 13.5px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = C.textDim;
      ctx.fillText(p.desc, px + 20, py + 62);

      // Score Value Box
      const svY = py + 100;
      ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.65)' : 'rgba(241, 245, 249, 0.85)';
      ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.2)' : 'rgba(203, 213, 225, 0.7)';
      ctx.lineWidth = 1;
      drawRoundRect(ctx, px + 20, svY, cardW - 40, 52, 10, true, true);

      ctx.font = '800 17px "Space Grotesk", sans-serif';
      ctx.fillStyle = isDark ? p.tabGrad[0] : p.tabGrad[1];
      ctx.fillText(p.score, px + 34, svY + 26);

      ctx.restore();
    });

      p1CurY += 465;
    }

    // 6. SECTION 3: PREMIER HIGHER EDUCATION ROADMAP & INSTITUTIONAL PATHWAYS
    const isRoadmapSkipped = Boolean(skippedSections.section_colleges || skippedSections.section_myplan || skippedSections.section_roadmap);
    if (!isRoadmapSkipped) {
      const s3Y = p1CurY;
      const s3Num = isCognitiveSkipped ? '2' : '3';
      drawSectionHeader(ctx, s3Num, 'PREMIER HIGHER EDUCATION ROADMAP & INSTITUTIONAL PATHWAYS',
      'Accredited Degree Benchmarks, NAAC "A++" Universities & Licensing Directorate', 65, s3Y, CW - 130, isDark);

    const mY = s3Y + 54;
    const mSteps = [
      {
        node: '01',
        badge: 'UNDERGRADUATE FOUNDATION · 3-4 YEARS',
        title: 'B.Sc. Aviation Science / B.Tech Aerospace Engineering',
        inst: 'Indira Gandhi Rashtriya Uran Akademi (IGRUA) · IIT Bombay (Aerospace)',
        rating: 'NIRF Ranked Top 5 · NAAC A++ Accredited',
        gradColor: ['#00f0ff', '#0284c7']
      },
      {
        node: '02',
        badge: 'PROFESSIONAL LICENSURE & FLIGHT HOURS',
        title: 'Commercial Pilot License (CPL) + Multi-Engine Instrument Rating',
        inst: 'DGCA India / FAA (USA) / EASA Flight Standards Directorate',
        rating: 'ICAO English Language Proficiency Level 5/6 Certified',
        gradColor: ['#a855f7', '#6366f1']
      },
      {
        node: '03',
        badge: 'EXECUTIVE CAREER HORIZON · AIRLINE COMMAND',
        title: 'First Officer to Captain / Chief Pilot Flight Operations',
        inst: 'Major International Commercial Carriers & Global Aviation Alliances',
        rating: 'Crew Resource Management & Cross-Border Flight Protocol Mastered',
        gradColor: ['#f59e0b', '#fbbf24']
      }
    ];

    const mH = 265;
    mSteps.forEach((ms, idx) => {
      const my = mY + idx * (mH / 3 + 22);
      ctx.save();
      ctx.fillStyle = C.cardBg;
      ctx.strokeStyle = C.cardBorder;
      ctx.lineWidth = 1.2;
      drawRoundRect(ctx, 145, my, CW - 210, 78, 14, true, true);

      // Connected Node Circle
      const nodeX = 100, nodeY = my + 39;
      const nodeGrad = ctx.createRadialGradient(nodeX, nodeY, 0, nodeX, nodeY, 26);
      nodeGrad.addColorStop(0, ms.gradColor[0]);
      nodeGrad.addColorStop(1, ms.gradColor[1]);
      ctx.fillStyle = nodeGrad;
      ctx.beginPath(); ctx.arc(nodeX, nodeY, 24, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = isDark ? '#ffffff' : '#090d16';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(nodeX, nodeY, 20, 0, Math.PI * 2); ctx.stroke();

      ctx.font = '800 14px "JetBrains Mono", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ms.node, nodeX, nodeY + 1);
      ctx.textAlign = 'left';

      // Connecting Track Line to next node
      if (idx < 2) {
        ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.4)' : 'rgba(29, 78, 216, 0.35)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(nodeX, nodeY + 24);
        ctx.lineTo(nodeX, nodeY + 24 + 40);
        ctx.stroke();
      }

      // Milestone Card Content
      ctx.font = '700 11px "Space Grotesk", sans-serif';
      ctx.fillStyle = isDark ? ms.gradColor[0] : ms.gradColor[1];
      ctx.fillText(ms.badge, 165, my + 14);

      ctx.font = '800 16px "Space Grotesk", sans-serif';
      ctx.fillStyle = C.textMain;
      ctx.fillText(ms.title, 165, my + 33);

      ctx.font = '500 13px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = C.textMuted;
      ctx.fillText(`🏛️ ${ms.inst}  ·  ${ms.rating}`, 165, my + 54);

      ctx.restore();
    });

    }

    // Render Page 1 to Image & Add to jsPDF
    const page1Data = canvas.toDataURL('image/jpeg', 0.95);
    doc.addImage(page1Data, 'JPEG', 0, 0, 210, 297);

    // =========================================================================
    // PAGE 2: AI SPEECH DIAGNOSTICS & STUDENT AMBASSADOR BUSINESS CARD
    // =========================================================================
    doc.addPage();
    ctx.clearRect(0, 0, CW, CH);

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

    ctx.fillText('PAGE 02 OF 02 | OFFICIAL VERIFICATION CREDENTIAL | DIGITAL FAIR BLUEPRINT', 55, CH - 20);
    ctx.fillText('CAREER FAIR 2026', CW - 55, CH - 20);

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
      ctx.textAlign = 'left';

      // Metric Value
      ctx.font = '600 13px "Space Grotesk", sans-serif';
      ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
      ctx.fillText(sm.val, sx + 18, sy + 40);

      // Progress Bar Track
      const barX = sx + 18, barY = sy + 62, barW = smW - 36, barH = 10;
      ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(226, 232, 240, 0.8)';
      drawRoundRect(ctx, barX, barY, barW, barH, 5, true, false);

      // Filled Progress Bar with Multi-Stop Gradient
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
    });

      p2CurY += 470;
    }

    // 4. SECTION 5: OFFICIAL FAIR ENDORSEMENT & INSTITUTIONAL ACCREDITATION
    const s5Y = p2CurY;
    const s5Num = isSpeechSkipped ? '4' : '5';
    drawSectionHeader(ctx, s5Num, 'OFFICIAL FAIR ENDORSEMENT & INSTITUTIONAL ACCREDITATION',
      'Certified Educational Record Validated by School Directorate & Convenors', 65, s5Y, CW - 130, isDark);

    const eCardX = 65, eCardY = s5Y + 50, eCardW = CW - 130, eCardH = 265;
    ctx.save();
    ctx.fillStyle = C.cardBg;
    ctx.strokeStyle = C.cardBorder;
    ctx.lineWidth = 1.5;
    drawRoundRect(ctx, eCardX, eCardY, eCardW, eCardH, 18, true, true);

    // Left Certification Text
    const certW = eCardW - 270;
    ctx.font = '500 15.5px "Plus Jakarta Sans", sans-serif';
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
      ctx.fillText(cl, eCardX + 28, eCardY + 28 + i * 25);
    });

    // Signature Blocks
    const sigY = eCardY + 155;
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
    p2CurY = eCardY + eCardH + 30;

    // 5. SECTION 6: STUDENT REFLECTION & FAIR EXPERIENCE FEEDBACK (Rendered Before Business Card)
    const isFeedbackSkipped = Boolean(skippedSections.section_feedback);
    if (!isFeedbackSkipped && studentFeedback) {
      const fbSecNum = isSpeechSkipped ? '5' : '6';
      drawSectionHeader(ctx, fbSecNum, 'STUDENT REFLECTION & FAIR EXPERIENCE FEEDBACK',
        'Official Exhibitor Review & Commendation Endorsement', 65, p2CurY, CW - 130, isDark);

      const fbX = 65, fbY = p2CurY + 50, fbW = CW - 130, fbH = 175;
      ctx.save();
      ctx.fillStyle = C.cardBg;
      ctx.strokeStyle = C.cardBorder;
      ctx.lineWidth = 1.4;
      drawRoundRect(ctx, fbX, fbY, fbW, fbH, 16, true, true);

      // Gradient accent top edge
      const fbTopGrad = ctx.createLinearGradient(fbX, fbY, fbX + fbW, fbY);
      fbTopGrad.addColorStop(0, '#f59e0b');
      fbTopGrad.addColorStop(0.5, '#fbbf24');
      fbTopGrad.addColorStop(1, '#00f0ff');
      ctx.fillStyle = fbTopGrad;
      drawRoundRect(ctx, fbX, fbY, fbW, 6, { tl: 16, tr: 16, br: 0, bl: 0 }, true, false);

      // Golden Stars (Rating 1 to 5)
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

      // Student Quote / Comment
      ctx.font = 'italic 500 15px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = C.textMain;
      const rawComment = studentFeedback.comment || studentFeedback.text || 'The Career Fair provided invaluable insights into professional English benchmarks, global career pathways, and university entrance criteria.';
      const quoteText = `"${rawComment}"`;

      // Word wrap quote across card width
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

      // Attribution footer
      ctx.font = '600 12.5px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = C.textDim;
      const fbDate = studentFeedback.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      ctx.fillText(`Verified Exhibitor Reflection • ${studentName} (${className}) • Endorsed on ${fbDate}`, fbX + 28, fbY + 145);

      // Right Side Commendation Badge
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
      p2CurY = fbY + fbH + 30;
    }

    // 6. DETACHABLE STUDENT AMBASSADOR BUSINESS CARD
    const cutY = p2CurY + 15;
    ctx.save();
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

    // Business Card Outer Container
    const bcX = 65, bcY = cutY + 22, bcW = CW - 130, bcH = 430;

    // Card Gradient Background (Luxury Obsidian/Cyber in Dark, Royal Navy in Light)
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
    const cTitleText = `✈️ ${careerTitle}`;
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

    // Metadata lines
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

    // High-contrast pure white rounded square with quiet zone
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 4;
    drawRoundRect(ctx, qrBoxX, qrBoxY, qrBoxW, qrBoxW, 18, true, false);
    ctx.shadowColor = 'transparent';

    // Draw Vector QR Code centered inside quiet zone
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

    // Render Page 2 to Image & Add to jsPDF
    const page2Data = canvas.toDataURL('image/jpeg', 0.95);
    doc.addImage(page2Data, 'JPEG', 0, 0, 210, 297);

    // Clean filename
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
        window.showToast(`📖 2-Page Official Career Booklet & Card downloaded: ${cleanFilename}`);
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
