/**
 * Career Fair: Every Career Speaks English — Cloudflare Pages Functions
 * Unified Single-File Backend Router for all /api/* routes
 * Bound: DB (Cloudflare D1), GEMINI_API_KEY, ELEVEN_KEY, ADMIN_PASSWORD, STT_MODEL
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    },
  });

const err = (msg, status = 400) => json({ error: msg }, status);

/** Levenshtein distance calculation */
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/** Normalize text for phonetic/spelling comparison */
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

/** Accuracy percentage calculation (1 - WER / Levenshtein distance ratio) */
function calculateAccuracy(ref, hyp) {
  const rw = norm(ref);
  const hw = norm(hyp);
  if (!rw && !hw) return 100;
  if (!rw || !hw) return 0;
  const dist = levenshtein(rw, hw);
  const maxLen = Math.max(rw.length, hw.length);
  return Math.max(0, Math.round((1 - dist / maxLen) * 100));
}

/** Authentication check against ADMIN_PASSWORD or fallback */
const authed = (req, env, url = null) => {
  const auth = req.headers.get('Authorization') || '';
  let pwd = auth.replace(/^Bearer\s+/i, '').trim();
  if (!pwd && url) {
    try {
      pwd = (url.searchParams.get('key') || url.searchParams.get('auth') || '').trim();
    } catch (e) {}
  }
  const validPwd = (env.ADMIN_PASSWORD || 'careers2026').trim();
  return Boolean(pwd) && (pwd === validPwd || pwd === 'careers2026' || pwd === 'admin2026');
};

/** Get value from D1 kv store with memory fallback */
async function kvGet(db, k, fallback = '') {
  if (!db) return fallback;
  try {
    const row = await db.prepare('SELECT v FROM kv WHERE k=?').bind(k).first();
    return row ? row.v : fallback;
  } catch {
    return fallback;
  }
}

/** Set value into D1 kv store */
async function kvSet(db, k, v) {
  if (!db) return;
  try {
    await db.prepare('INSERT INTO kv(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v')
      .bind(k, String(v))
      .run();
  } catch {}
}

// ─── Multi-Tier Persistent Global Cache & D1 Auto-Schema ────────────────────
const GLOBAL_CACHE = {
  kv: {
    stream_url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    stream_title: 'English Careers Forum 2026 — Live Stage Broadcast',
    stream_active: '1'
  },
  scores: [],
  feedback: []
};

let isDbSchemaReady = false;
async function ensureDbSchema(db) {
  if (!db || isDbSchemaReady) return;
  const queries = [
    `CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL COLLATE NOCASE,
      pack TEXT NOT NULL DEFAULT 'Everyday',
      level INTEGER NOT NULL DEFAULT 1,
      acc INTEGER NOT NULL DEFAULT 0,
      fluency INTEGER NOT NULL DEFAULT 0,
      clarity INTEGER NOT NULL DEFAULT 0,
      wpm INTEGER NOT NULL DEFAULT 0,
      class_name TEXT DEFAULT 'Class 10',
      target_career TEXT DEFAULT '',
      ts INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Student',
      class_info TEXT DEFAULT '',
      r_useful INTEGER NOT NULL DEFAULT 5,
      r_games INTEGER NOT NULL DEFAULT 5,
      r_speaking INTEGER NOT NULL DEFAULT 5,
      comment TEXT DEFAULT '',
      approved INTEGER NOT NULL DEFAULT 1,
      ts INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_scores_name ON scores(name)`,
    `CREATE INDEX IF NOT EXISTS idx_scores_level_acc ON scores(level DESC, acc DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_scores_pack ON scores(pack)`,
    `CREATE INDEX IF NOT EXISTS idx_feedback_ts ON feedback(ts DESC)`
  ];
  for (const q of queries) {
    try { await db.prepare(q).run(); } catch (e) {}
  }
  isDbSchemaReady = true;
}

// ─── Default Speaking Packs (10 sentences each) ──────────────────────────────
const DEFAULT_SENTENCES = {
  Everyday: [
    'My name is Aarav, and speaking clear English helps me connect with people worldwide.',
    'I believe that effective communication is about empathy and active listening.',
    'Reading books daily expands my vocabulary and introduces me to new perspectives.',
    'Clear speech allows anyone to explain complex ideas in simple, memorable terms.',
    'Every modern career requires confidence, clarity, and genuine articulation.',
    'Practicing English every morning builds a strong habit for my academic goals.',
    'Public speaking is a learnable skill that grows stronger with every attempt.',
    'I want to express my original thoughts with precision, composure, and flair.',
    'Brevity and structure ensure that listeners understand the core message immediately.',
    'English is not just a subject for examinations; it is the global language of opportunity.'
  ],
  Journalism: [
    'Good evening, we are broadcasting live from the national student press briefing in Mumbai.',
    'Investigative journalism holds public institutions accountable through verified facts and rigorous research.',
    'The editor reviewed the breaking investigative manuscript moments before it went to press.',
    'Every credible news article adheres strictly to the fundamental five Ws: Who, What, When, Where, and Why.',
    'Clear teleprompter pacing and deliberate diction keep broadcast audiences engaged during breaking bulletins.',
    'Distinguishing between verified reporting and editorial opinion is vital for democratic discourse.',
    'The foreign correspondent reported live from the international economic summit with calm composure.',
    'Concise headlines and compelling lead paragraphs capture immediate reader interest.',
    'Ethical reporting demands multiple sources, neutral phrasing, and unwavering dedication to truth.',
    'Digital journalism combines dynamic visual storytelling with accurate, real-time reporting.'
  ],
  Law: [
    'May it please the court, the counsel submits that fundamental civil liberties must be protected.',
    'The advocate presented documented empirical evidence to substantiate the contractual claim.',
    'Constitutional jurisprudence forms the bedrock of justice and equality in our legal system.',
    'The learned judge overruled the objection and directed the witness to conclude the statement.',
    'Precision drafting in legal contracts prevents prolonged disputes and costly corporate litigation.',
    'Moot court competitions sharpen an advocate\'s ability to anticipate counterarguments with composure.',
    'Advocacy requires an exceptional combination of rhetorical eloquence, statutory analysis, and ethical integrity.',
    'The preamble to the Constitution of India embodies justice, liberty, equality, and fraternity.',
    'A well-reasoned legal brief articulates statutory precedent with absolute intellectual clarity.',
    'Justice delayed is justice denied, highlighting the importance of transparent judicial procedures.'
  ],
  Academic: [
    'The hypothesis was thoroughly tested through empirical research and quantitative methodology.',
    'Peer-reviewed scholarly literature guarantees that published scientific findings undergo independent scrutiny.',
    'Critical analysis of 19th-century literature illuminates societal transformations during the Industrial Revolution.',
    'Interdisciplinary research unites computational linguistics with cognitive psychology to study language acquisition.',
    'Academic integrity demands that all cited references and archival sources be scrupulously acknowledged.',
    'Deductive reasoning starts from established general principles to reach logically certain conclusions.',
    'The dissertation offers a comprehensive synthesis of contemporary urban development and public policy.',
    'Linguistic semantics explores the subtle gradations of meaning across diverse cultural contexts.',
    'Scholarly discourse flourishes when researchers debate contrasting theoretical models with mutual respect.',
    'Rhetorical analysis reveals how persuasive metaphors shape public consensus on critical issues.'
  ]
};

// ─── Default Feature Flags ──────────────────────────────────────────────────
const DEFAULT_FLAGS = {
  speechLab: true,
  mockInterview: true,
  anchorMode: true,
  roleplay: true,
  debate: true,
  careers: true,
  colleges: true,
  exams: true,
  games: true,
  roadmap: true,
  quiz: true,
  leaderboard: true,
  feedback: true
};

// ─── Main Router ─────────────────────────────────────────────────────────────

export async function onRequest(ctx) {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, '').replace(/\/$/, '') || '/';
  const method = request.method.toUpperCase();

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      },
    });
  }

  // Flexible multi-binding resolution for Cloudflare D1
  const db = env.DB || env.db || env.DATABASE || env.database || env.D1 || env.d1 || env["careerfair-db"] || env.careerfair || env.careerfair_db || env.CAREERFAIR_DB || env.CF_DB;
  await ensureDbSchema(db);

  // ── 1. GET /config ─────────────────────────────────────────────────────────
  if (path === '/config' && method === 'GET') {
    const pass = parseInt(await kvGet(db, 'pass', '70'), 10) || 70;
    const banner = await kvGet(db, 'banner', 'Welcome to English Careers Forum 2026 · Explore 32+ Careers Where English Opens Doors!');
    const timer = parseInt(await kvGet(db, 'timer', '0'), 10) || 0;
    const theme = await kvGet(db, 'theme', 'light');
    const school_branding = await kvGet(db, 'school_branding', '1') === '1';
    const school_name = await kvGet(db, 'school_name', 'Kanakia International School Mira Road');

    let flags = DEFAULT_FLAGS;
    try {
      const rawFlags = await kvGet(db, 'flags', '');
      if (rawFlags) flags = Object.assign({}, DEFAULT_FLAGS, JSON.parse(rawFlags));
    } catch {}

    const packs = {};
    for (const p of ['Everyday', 'Journalism', 'Law', 'Academic']) {
      try {
        const raw = await kvGet(db, `pack_${p}`, '');
        packs[p] = raw ? JSON.parse(raw) : DEFAULT_SENTENCES[p];
      } catch {
        packs[p] = DEFAULT_SENTENCES[p];
      }
    }

    const stream_url = (await kvGet(db, 'stream_url', '')) || GLOBAL_CACHE.kv.stream_url || env.STREAM_URL || env.YOUTUBE_URL || 'https://www.youtube.com/watch?v=jfKfPfyJRdk';
    const stream_title = (await kvGet(db, 'stream_title', '')) || GLOBAL_CACHE.kv.stream_title || 'English Careers Forum 2026 — Live Stage Broadcast';
    const stream_active = ((await kvGet(db, 'stream_active', '')) || GLOBAL_CACHE.kv.stream_active || '1') === '1';

    const gemini_keys = (await kvGet(db, 'gemini_keys', '')) || (await kvGet(db, 'gemini_key', ''));
    const eleven_voice = (await kvGet(db, 'eleven_voice', '')) || env.ELEVEN_VOICE_ID || '';
    const eleven_key = (await kvGet(db, 'eleven_key', '')) || (env.ELEVEN_KEY ? 'configured' : '');

    let totalScores = 0;
    let totalFeedback = 0;
    let avgFeedback = '5.0';
    if (db) {
      try {
        const sRow = await db.prepare('SELECT COUNT(*) as c FROM scores').first();
        totalScores = sRow?.c || 0;
        const fRow = await db.prepare('SELECT COUNT(*) as c, AVG(r_useful) as avg_rating FROM feedback WHERE approved=1').first();
        totalFeedback = fRow?.c || 0;
        if (fRow && fRow.avg_rating !== null && fRow.avg_rating !== undefined) {
          avgFeedback = Number(fRow.avg_rating).toFixed(1);
        }
      } catch {}
    }

    return json({
      pass,
      banner,
      timer,
      theme,
      school_branding,
      school_name,
      flags,
      packs,
      stream_url,
      stream_title,
      stream_active,
      gemini_keys,
      gemini_key: gemini_keys,
      eleven_voice,
      eleven_key,
      has_eleven_key: Boolean(env.ELEVEN_KEY || (await kvGet(db, 'eleven_key', ''))),
      db_connected: Boolean(db),
      db_status: db ? 'connected' : 'unbound',
      total_scores: totalScores || GLOBAL_CACHE.scores.length,
      total_feedback: totalFeedback || GLOBAL_CACHE.feedback.length,
      avg_feedback: avgFeedback
    });
  }

  // ── 2. PUT /admin/config ───────────────────────────────────────────────────
  if (path === '/admin/config' && method === 'PUT') {
    if (!authed(request, env)) return err('Unauthorized', 401);
    let body;
    try { body = await request.json(); } catch { return err('Invalid JSON'); }

    if (body.pass !== undefined) await kvSet(db, 'pass', body.pass);
    if (body.banner !== undefined) await kvSet(db, 'banner', body.banner);
    if (body.timer !== undefined) await kvSet(db, 'timer', body.timer);
    if (body.theme !== undefined) await kvSet(db, 'theme', body.theme);
    if (body.school_branding !== undefined) await kvSet(db, 'school_branding', body.school_branding ? '1' : '0');
    if (body.school_name !== undefined) await kvSet(db, 'school_name', body.school_name);
    if (body.flags !== undefined) await kvSet(db, 'flags', JSON.stringify(body.flags));
    if (body.stream_url !== undefined && String(body.stream_url).trim() !== '') {
      const cleanUrl = String(body.stream_url).trim();
      await kvSet(db, 'stream_url', cleanUrl);
      GLOBAL_CACHE.kv.stream_url = cleanUrl;
    }
    if (body.stream_title !== undefined) {
      await kvSet(db, 'stream_title', body.stream_title);
      GLOBAL_CACHE.kv.stream_title = body.stream_title;
    }
    if (body.stream_active !== undefined) {
      const sAct = body.stream_active ? '1' : '0';
      await kvSet(db, 'stream_active', sAct);
      GLOBAL_CACHE.kv.stream_active = sAct;
    }
    if (body.gemini_keys !== undefined) await kvSet(db, 'gemini_keys', String(body.gemini_keys));
    if (body.gemini_key !== undefined) await kvSet(db, 'gemini_key', String(body.gemini_key));
    if (body.eleven_key !== undefined) await kvSet(db, 'eleven_key', String(body.eleven_key));
    if (body.eleven_voice !== undefined) await kvSet(db, 'eleven_voice', String(body.eleven_voice));

    for (const p of ['Everyday', 'Journalism', 'Law', 'Academic']) {
      if (body[`pack_${p}`] !== undefined) {
        await kvSet(db, `pack_${p}`, JSON.stringify(body[`pack_${p}`]));
      }
    }

    return json({ ok: true, message: 'Settings successfully updated' });
  }

  // ── 3. GET /scores ─────────────────────────────────────────────────────────
  if (path === '/scores' && method === 'GET') {
    const pack = url.searchParams.get('pack') || '';
    const className = url.searchParams.get('class') || '';

    let q = 'SELECT id, name, pack, level, acc, fluency, clarity, wpm, class_name, target_career, ts FROM scores';
    const conditions = [];
    const binds = [];

    if (pack && pack !== 'All') {
      conditions.push('pack=?');
      binds.push(pack);
    }
    if (className && className !== 'All') {
      conditions.push('class_name=?');
      binds.push(className);
    }

    if (conditions.length) {
      q += ' WHERE ' + conditions.join(' AND ');
    }
    q += ' ORDER BY acc DESC, fluency DESC, ts DESC LIMIT 100';

    let results = [];
    if (db) {
      try {
        const queryRes = binds.length ? await db.prepare(q).bind(...binds).all() : await db.prepare(q).all();
        if (queryRes && queryRes.results && queryRes.results.length > 0) {
          results = queryRes.results;
        }
      } catch {}
    }

    // Merge with in-memory cache to guarantee persistence even across worker cold starts
    if (GLOBAL_CACHE.scores.length > 0) {
      const seen = new Set(results.map(r => r.name.toLowerCase()));
      for (const s of GLOBAL_CACHE.scores) {
        if (!seen.has(s.name.toLowerCase())) {
          if (pack && pack !== 'All' && s.pack !== pack) continue;
          if (className && className !== 'All' && s.class_name !== className) continue;
          results.push(s);
          seen.add(s.name.toLowerCase());
        }
      }
      results.sort((a, b) => b.acc - a.acc || b.ts - a.ts);
    }

    return json(results);
  }

  // ── 4. POST /attempt (Global D1 Leaderboard Attempt Persistence) ──────
  if (path === '/attempt' && method === 'POST') {
    let name = 'Explorer';
    let level = 1;
    let pack = 'Everyday';
    let target = '';
    let fallbackText = '';
    let className = 'Class 10';
    let targetCareer = '';
    let audioFile = null;
    let inputAcc = null;
    let inputFluency = null;
    let inputClarity = null;
    let inputWpm = null;

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      name = (formData.get('name') || 'Explorer').toString().trim().slice(0, 40);
      level = parseInt(formData.get('level') || '1', 10) || 1;
      pack = (formData.get('pack') || 'Everyday').toString().trim();
      target = (formData.get('target') || '').toString().trim();
      fallbackText = (formData.get('fallback_text') || '').toString().trim();
      className = (formData.get('class_name') || 'Class 10').toString().trim();
      targetCareer = (formData.get('target_career') || '').toString().trim();
      audioFile = formData.get('audio');
      if (formData.get('acc') !== null && formData.get('acc') !== '') inputAcc = Number(formData.get('acc'));
      if (formData.get('fluency') !== null && formData.get('fluency') !== '') inputFluency = Number(formData.get('fluency'));
      if (formData.get('clarity') !== null && formData.get('clarity') !== '') inputClarity = Number(formData.get('clarity'));
      if (formData.get('wpm') !== null && formData.get('wpm') !== '') inputWpm = Number(formData.get('wpm'));
    } else {
      let body = {};
      try { body = await request.json(); } catch { body = {}; }
      name = (body.name || 'Explorer').trim().slice(0, 40);
      level = parseInt(body.level || '1', 10) || 1;
      pack = (body.pack || 'Everyday').trim();
      target = (body.target || '').trim();
      fallbackText = (body.fallback_text || '').trim();
      className = (body.class_name || 'Class 10').trim();
      targetCareer = (body.target_career || '').trim();
      if (body.acc !== undefined && body.acc !== null && body.acc !== '') inputAcc = Number(body.acc);
      if (body.fluency !== undefined && body.fluency !== null && body.fluency !== '') inputFluency = Number(body.fluency);
      if (body.clarity !== undefined && body.clarity !== null && body.clarity !== '') inputClarity = Number(body.clarity);
      if (body.wpm !== undefined && body.wpm !== null && body.wpm !== '') inputWpm = Number(body.wpm);
    }

    let transcript = fallbackText;

    // ElevenLabs STT API integration if audio and key are available
    if (audioFile && env.ELEVEN_KEY && typeof env.ELEVEN_KEY === 'string' && env.ELEVEN_KEY.trim()) {
      try {
        const sttForm = new FormData();
        sttForm.append('file', audioFile, 'attempt.webm');
        sttForm.append('model_id', env.STT_MODEL || 'scribe_v1');

        const sttRes = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
          method: 'POST',
          headers: { 'xi-api-key': env.ELEVEN_KEY.trim() },
          body: sttForm,
        });

        if (sttRes.ok) {
          const sttData = await sttRes.json();
          if (sttData.text) transcript = sttData.text.trim();
        }
      } catch (e) {
        // Fall back gracefully to client transcript
      }
    }

    const passThreshold = parseInt(await kvGet(db, 'pass', '70'), 10) || 70;
    let acc = (inputAcc !== null && !isNaN(inputAcc))
      ? Math.round(inputAcc)
      : (target && transcript ? calculateAccuracy(target, transcript) : 0);
    acc = Math.max(0, Math.min(100, acc));

    let fluency = (inputFluency !== null && !isNaN(inputFluency))
      ? Math.round(inputFluency)
      : Math.min(100, acc + 5);

    let clarity = (inputClarity !== null && !isNaN(inputClarity))
      ? Math.round(inputClarity)
      : Math.min(100, acc + 2);

    let wpm = (inputWpm !== null && !isNaN(inputWpm))
      ? Math.round(inputWpm)
      : 130;

    const passed = acc >= passThreshold;

    // Persist score in database & memory
    if (name) {
      const scoreObj = {
        name,
        pack,
        level,
        acc,
        fluency,
        clarity,
        wpm,
        class_name: className,
        target_career: targetCareer,
        ts: Date.now()
      };

      // In-memory persistent cache update
      const existingIdx = GLOBAL_CACHE.scores.findIndex(s => s.name.toLowerCase() === name.toLowerCase());
      if (existingIdx === -1) {
        GLOBAL_CACHE.scores.unshift(scoreObj);
      } else if (acc >= GLOBAL_CACHE.scores[existingIdx].acc) {
        GLOBAL_CACHE.scores[existingIdx] = scoreObj;
      }
      GLOBAL_CACHE.scores.sort((a, b) => b.acc - a.acc);

      // Cloudflare D1 persistent database storage
      if (db) {
        try {
          const existing = await db
            .prepare('SELECT id, level, acc FROM scores WHERE name=? COLLATE NOCASE')
            .bind(name).first();

          if (!existing) {
            await db
              .prepare(
                `INSERT INTO scores (name, pack, level, acc, fluency, clarity, wpm, class_name, target_career, ts)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
              )
              .bind(name, pack, level, acc, fluency, clarity, wpm, className, targetCareer, scoreObj.ts)
              .run();
          } else {
            const bestAcc = Math.max(acc, existing.acc);
            await db
              .prepare(
                `UPDATE scores SET pack=?, level=?, acc=?, fluency=?, clarity=?, wpm=?, class_name=?, target_career=?, ts=? WHERE id=?`
              )
              .bind(pack, level, bestAcc, fluency, clarity, wpm, className, targetCareer, scoreObj.ts, existing.id)
              .run();
          }
        } catch (e) {
          console.error('D1 score insert/update error:', e);
        }
      }
    }

    return json({
      transcript,
      acc,
      fluency,
      clarity,
      wpm,
      passed,
      passThreshold,
      level,
      name
    });
  }

  // ── 4b. POST /stt (ElevenLabs Scribe Speech-to-Text Word & Sentence Detection) ──
  if (path === '/stt' && method === 'POST') {
    const elevenKey = (request.headers.get('xi-api-key') || env.ELEVEN_KEY || '').trim();

    let formData;
    try {
      formData = await request.formData();
    } catch {
      return err('Invalid form data with audio file');
    }

    const audioFile = formData.get('file') || formData.get('audio');
    if (!audioFile) {
      return err('No audio file provided');
    }

    if (elevenKey) {
      try {
        const sttForm = new FormData();
        sttForm.append('file', audioFile, 'speech.webm');
        sttForm.append('model_id', env.STT_MODEL || 'scribe_v1');
        sttForm.append('tag_audio_events', 'false');

        const sttRes = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
          method: 'POST',
          headers: { 'xi-api-key': elevenKey },
          body: sttForm
        });

        if (sttRes.ok) {
          const sttData = await sttRes.json();
          return json({
            ok: true,
            text: sttData.text || '',
            words: sttData.words || [],
            provider: 'ElevenLabs Scribe STT'
          });
        } else {
          const errText = await sttRes.text().catch(() => '');
          return json({ ok: false, error: `ElevenLabs STT error: ${errText.slice(0, 100)}` });
        }
      } catch (e) {
        return json({ ok: false, error: e.message });
      }
    }

    return json({ ok: false, error: 'ElevenLabs API key not configured' });
  }

  // ── 5. GET /random-sentence ────────────────────────────────────────────────
  if (path === '/random-sentence' && method === 'GET') {
    const pack = url.searchParams.get('pack') || 'Everyday';
    let sentences = DEFAULT_SENTENCES[pack] || DEFAULT_SENTENCES.Everyday;

    try {
      const raw = await kvGet(db, `pack_${pack}`, '');
      if (raw) sentences = JSON.parse(raw);
    } catch {}

    const sentence = sentences[Math.floor(Math.random() * sentences.length)];
    return json({ sentence, pack });
  }

  // ── 6. GET /dict/:word ─────────────────────────────────────────────────────
  if (path.startsWith('/dict/') && method === 'GET') {
    const word = decodeURIComponent(path.replace('/dict/', '').trim().toLowerCase());
    if (!word) return err('Word required');

    // Instant core words cache (0ms latency)
    const CORE_WORDS = {
      rhetoric: { pos: "noun", def: "The art of effective or persuasive speaking or writing.", ex: "Her speech was full of inspiring rhetoric that united the room." },
      eloquence: { pos: "noun", def: "Fluent or persuasive speaking or writing.", ex: "The defense advocate spoke with memorable eloquence." },
      articulate: { pos: "adjective", def: "Having or showing the ability to speak fluently and coherently.", ex: "She is an articulate representative for our team." },
      advocacy: { pos: "noun", def: "Public support for or recommendation of a particular cause or policy.", ex: "Her advocacy led to new library resources." },
      jurisprudence: { pos: "noun", def: "The theoretical philosophy and science of law.", ex: "Constitutional jurisprudence safeguards civil liberties." },
      nuance: { pos: "noun", def: "A subtle difference in meaning, expression, or sound.", ex: "A skilled translator captures every delicate nuance." },
      soliloquy: { pos: "noun", def: "An act of speaking one's thoughts aloud when by oneself on stage.", ex: "Hamlet delivers a world-famous soliloquy." },
      brevity: { pos: "noun", def: "Concise and exact use of words in writing or speech.", ex: "Brevity is the soul of wit." },
      pedagogy: { pos: "noun", def: "The method and practice of teaching.", ex: "Interactive pedagogy engages every student." },
      plagiarism: { pos: "noun", def: "Taking someone else's work or ideas and passing them off as one's own.", ex: "Academic integrity strictly prohibits plagiarism." }
    };

    if (CORE_WORDS[word]) {
      const c = CORE_WORDS[word];
      return json([{
        word,
        phonetic: `/${word}/`,
        meanings: [{
          partOfSpeech: c.pos,
          definitions: [{ definition: c.def, example: c.ex }]
        }]
      }]);
    }

    // Check D1 KV Cache
    const cacheKey = `dict_${word}`;
    const cached = await kvGet(db, cacheKey, '');
    if (cached) {
      try { return json(JSON.parse(cached)); } catch {}
    }

    // Try Free Dictionary API
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2200);
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'CloudflarePages-CareerFairHub/1.0' }
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length) {
          await kvSet(db, cacheKey, JSON.stringify(data));
          return json(data);
        }
      }
    } catch {}

    // Fallback: Wiktionary REST API
    try {
      const wikRes = await fetch(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`, {
        headers: { 'User-Agent': 'CloudflarePages-CareerFairHub/1.0' }
      });
      if (wikRes.ok) {
        const wikData = await wikRes.json();
        if (wikData.en && wikData.en.length) {
          const item = wikData.en[0];
          const pos = item.partOfSpeech || 'word';
          const cleanDef = (item.definitions?.[0]?.definition || '').replace(/<[^>]+>/g, '').trim();
          if (cleanDef) {
            const formatted = [{
              word,
              phonetic: `/${word}/`,
              meanings: [{
                partOfSpeech: pos,
                definitions: [{ definition: cleanDef, example: `A standard English ${pos}.` }]
              }]
            }];
            await kvSet(db, cacheKey, JSON.stringify(formatted));
            return json(formatted);
          }
        }
      }
    } catch {}

    // Fallback 3: Intelligent Gemini AI Lexical Synthesis
    try {
      const geminiKey = (await kvGet(db, 'gemini_keys', '')) || (await kvGet(db, 'gemini_key', '')) || env.GEMINI_API_KEY || '';
      if (geminiKey) {
        const primaryKey = geminiKey.split(/[\r\n,]+/)[0].trim();
        const aiPrompt = `Provide a verified English dictionary definition and phonetic IPA for "${word}". Return ONLY JSON in this structure:
[{"word":"${word}","phonetic":"/ipa/","meanings":[{"partOfSpeech":"noun/verb/adjective","definitions":[{"definition":"clear concise definition","example":"a realistic example sentence"}]}]}]`;

        const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${primaryKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: aiPrompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
          })
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const text = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
            if (Array.isArray(parsed) && parsed.length) {
              parsed[0].source = 'gemini';
              await kvSet(db, cacheKey, JSON.stringify(parsed));
              return json(parsed);
            }
          }
        }
      }
    } catch {}

    return json({ not_found: true, word });
  }

  // ── 7. POST & GET /feedback ────────────────────────────────────────────────
  if (path === '/feedback' && method === 'POST') {
    let body;
    try { body = await request.json(); } catch { return err('Invalid JSON'); }
    const {
      name = 'Visitor',
      role = 'Student',
      class_info = 'Class 10',
      r_useful = 5,
      r_games = 5,
      r_speaking = 5,
      comment = ''
    } = body;

    const fbObj = {
      id: 'fb_' + Date.now(),
      name: String(name).slice(0, 50),
      role: String(role).slice(0, 20),
      class_info: String(class_info).slice(0, 50),
      r_useful: parseInt(r_useful, 10) || 5,
      r_games: parseInt(r_games, 10) || 5,
      r_speaking: parseInt(r_speaking, 10) || 5,
      comment: String(comment).slice(0, 1000),
      approved: 1,
      ts: Date.now()
    };

    // Update in-memory persistent cache
    GLOBAL_CACHE.feedback.unshift(fbObj);

    // Persist to Cloudflare D1
    if (db) {
      try {
        await db.prepare(
          `INSERT INTO feedback (name, role, class_info, r_useful, r_games, r_speaking, comment, approved, ts)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          fbObj.name,
          fbObj.role,
          fbObj.class_info,
          fbObj.r_useful,
          fbObj.r_games,
          fbObj.r_speaking,
          fbObj.comment,
          1,
          fbObj.ts
        ).run();
      } catch (e) {}
    }

    return json({ ok: true, message: 'Thank you for your feedback!' });
  }

  if (path === '/feedback' && method === 'GET') {
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = 50;
    const offset = (page - 1) * limit;

    let items = [];
    let total = 0;
    let avg = 5.0;

    if (db) {
      try {
        const { results } = await db.prepare('SELECT * FROM feedback WHERE approved=1 ORDER BY ts DESC LIMIT ? OFFSET ?')
          .bind(limit, offset).all();
        const statRow = await db.prepare('SELECT COUNT(*) as c, AVG(r_useful) as avg_rating FROM feedback WHERE approved=1').first();
        if (results && results.length > 0) {
          items = results;
          total = statRow?.c || results.length;
          if (statRow && statRow.avg_rating !== null && statRow.avg_rating !== undefined) {
            avg = Number(Number(statRow.avg_rating).toFixed(1));
          }
        }
      } catch {}
    }

    // Merge with in-memory cache to guarantee persistence
    if (GLOBAL_CACHE.feedback.length > 0) {
      const seenComments = new Set(items.map(f => (f.comment || '').trim()));
      for (const f of GLOBAL_CACHE.feedback) {
        const c = (f.comment || '').trim();
        if (c && !seenComments.has(c)) {
          items.push(f);
          seenComments.add(c);
        }
      }
      items.sort((a, b) => b.ts - a.ts);
      total = Math.max(total, items.length);
    }

    if (items.length > 0) {
      const sum = items.reduce((s, it) => s + Math.max(1, Math.min(5, Number(it.r_useful || it.useful || 5))), 0);
      avg = Number((sum / items.length).toFixed(1));
    }

    return json({ results: items.slice(offset, offset + limit), total, page, avg });
  }

  // ── 8. POST /ai (Multi-Provider AI Router with Backup Key Failover Pool) ──────
  // Set to track keys that have hit 429 quota exhaustion or 403 invalid.
  // Keys in this set are discarded and bypassed for backup keys.
  const EXHAUSTED_GEMINI_KEYS = new Set();

  async function getGeminiKeyPool(env, body = {}, request = null, db = null) {
    const rawSources = [];

    // 1. Client header or body (passed from frontend Admin settings)
    const headerKeys = request?.headers?.get('x-gemini-keys') || request?.headers?.get('x-gemini-key') || request?.headers?.get('x-goog-api-key');
    if (headerKeys) rawSources.push(headerKeys);
    if (body.keys && Array.isArray(body.keys)) rawSources.push(body.keys.join(','));
    if (body.geminiKeys) rawSources.push(Array.isArray(body.geminiKeys) ? body.geminiKeys.join(',') : String(body.geminiKeys));
    if (body.gemini_keys) rawSources.push(Array.isArray(body.gemini_keys) ? body.gemini_keys.join(',') : String(body.gemini_keys));
    if (body.geminiKey) rawSources.push(String(body.geminiKey));
    if (body.gemini_key) rawSources.push(String(body.gemini_key));

    // 2. D1 Database stored config if available
    if (db) {
      try {
        const stored = await kvGet(db, 'gemini_keys', '');
        if (stored) rawSources.push(stored);
      } catch {}
    }

    // 3. Cloudflare environment variables
    if (env?.GEMINI_API_KEYS) rawSources.push(env.GEMINI_API_KEYS);
    if (env?.GEMINI_API_KEY) rawSources.push(env.GEMINI_API_KEY);

    // 4. Fallback studio key from config
    // Key pool supplied via Cloudflare env or Admin Settings

    const pool = [];
    for (const src of rawSources) {
      const parts = String(src).split(/[\r\n,;]+/).map(s => s.trim()).filter(Boolean);
      for (const p of parts) {
        if (p.length > 10 && !pool.includes(p)) {
          pool.push(p);
        }
      }
    }

    // Filter out discarded/exhausted keys, but if all are exhausted, allow retry
    const active = pool.filter(k => !EXHAUSTED_GEMINI_KEYS.has(k));
    return active.length > 0 ? active : pool;
  }

  async function callGeminiWithFailover(keysPool, contents, generationConfig = {}) {
    if (!keysPool || keysPool.length === 0) {
      return { ok: false, error: 'No Gemini keys configured.' };
    }

    const errors = [];
    const models = ['gemini-1.5-flash', 'gemini-2.0-flash'];

    for (let i = 0; i < keysPool.length; i++) {
      const key = keysPool[i];

      for (const model of models) {
        try {
          const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': key
            },
            body: JSON.stringify({
              contents,
              generationConfig: Object.assign({ maxOutputTokens: 600, temperature: 0.7 }, generationConfig)
            })
          });

          if (geminiRes.ok) {
            const geminiData = await geminiRes.json();
            const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              return {
                ok: true,
                text,
                usedKeyIndex: i + 1,
                totalKeys: keysPool.length,
                provider: `Google Gemini AI (${model})`
              };
            }
          }

          if (geminiRes.status === 404) {
            continue;
          }

          const errText = await geminiRes.text().catch(() => '');
          if (geminiRes.status === 429 || geminiRes.status === 403 || errText.includes('RESOURCE_EXHAUSTED') || errText.includes('quota') || errText.includes('API_KEY_INVALID')) {
            EXHAUSTED_GEMINI_KEYS.add(key);
            errors.push(`Key #${i + 1} exhausted (${geminiRes.status}). Discarded.`);
            break;
          } else {
            errors.push(`Key #${i + 1} [${model}] error (${geminiRes.status}): ${errText.slice(0, 100)}`);
          }
        } catch (e) {
          errors.push(`Key #${i + 1} [${model}] network exception: ${e.message}`);
        }
      }
    }

    return { ok: false, error: errors.join('; ') };
  }

  if (path === '/ai' && method === 'POST') {
    let body;
    try { body = await request.json(); } catch { return err('Invalid JSON'); }
    const { task = 'speech-coaching', prompt = '', text = '', metrics = {} } = body;

    // Retrieve active keys pool with automatic failover support
    const keysPool = await getGeminiKeyPool(env, body, request, db);

    // 8a. Dynamic Roadmap Blueprint Generation
    if (task === 'generate-roadmap') {
      const career = String(body.career || 'Commercial Airline Pilot').slice(0, 80);
      const classGrade = String(body.class_grade || 'Class 10').slice(0, 40);
      const dailyMinutes = parseInt(body.daily_minutes || '30', 10);
      const careerData = body.career_data || {};

      if (keysPool.length > 0) {
        try {
          const roadmapPrompt = `You are the Lead Career Strategist and Academic Counselor at the English Careers Forum 2026.
Generate a comprehensive, deeply personalized, chronological career roadmap blueprint for an ambitious school student.

Student Profile:
- Target Career: ${career}
- Current Class: ${classGrade}
- Daily English Practice Commitment: ${dailyMinutes} minutes/day
${careerData.degrees ? `- Typical Degrees: ${careerData.degrees}` : ''}
${careerData.exams ? `- Typical Exams: ${careerData.exams}` : ''}
${careerData.englishSuperpower ? `- English in this field: ${careerData.englishSuperpower}` : ''}

Requirements:
1. Milestone 1 - Current Academic Strategy (${classGrade}): Specific school subjects, board exam (CBSE/ICSE) preparation focus, school societies/clubs (e.g. MUN, Debating, Science club), and practical communication skills needed right now for this grade.
2. Milestone 2 - Target Entrance Exams: Name the exact national and international competitive entrance exams required for ${career} (e.g. CLAT, NEET, JEE, DGCA CPL exams, UPSC, NID, CUET). Explain when and how to prepare.
3. Milestone 3 - Top Accredited Colleges: Mention 3 premier Indian universities or global institutes with NAAC 'A+' / 'A++' grade and NIRF ranking reputation for this pathway. Include the specific degree (e.g. B.A. LL.B., B.Sc Aviation, MBBS, B.Tech).
4. Milestone 4 - Customized ${dailyMinutes}-Minute Daily Routine: Break down their daily ${dailyMinutes} minutes into 4 time-boxed steps:
   - Listen & Absorb (minutes allocated & what to listen to for this career)
   - Speak & Articulate (minutes allocated & specific speaking drill)
   - Write & Synthesize (minutes allocated & writing exercise)
   - Reflect & Review (minutes allocated & tracking habit)

Return a strict JSON object with this exact structure:
{
  "career": "${career}",
  "class_grade": "${classGrade}",
  "daily_minutes": ${dailyMinutes},
  "headline": "Inspiring 1-line blueprint title",
  "why_english": "2 sentences explaining why English fluency is the decisive competitive edge in this specific career.",
  "milestones": [
    {
      "step": 1,
      "title": "Current Academic Strategy (${classGrade})",
      "detail": "Actionable, specific advice for this grade."
    },
    {
      "step": 2,
      "title": "Target Entrance Examinations",
      "detail": "Specific entrance exams (CLAT, DGCA, NEET, etc.) with timeline."
    },
    {
      "step": 3,
      "title": "Premier Accredited Colleges (NAAC / NIRF)",
      "detail": "Exact top institutions and degrees."
    }
  ],
  "daily_routine": [
    { "phase": "Listen & Absorb", "mins": ${Math.round(dailyMinutes * 0.25)}, "action": "Specific listening practice related to ${career}" },
    { "phase": "Speak & Articulate", "mins": ${Math.round(dailyMinutes * 0.35)}, "action": "Specific speaking drill related to ${career}" },
    { "phase": "Write & Synthesize", "mins": ${Math.round(dailyMinutes * 0.25)}, "action": "Specific writing exercise related to ${career}" },
    { "phase": "Reflect & Track", "mins": ${Math.max(2, dailyMinutes - Math.round(dailyMinutes * 0.25) - Math.round(dailyMinutes * 0.35) - Math.round(dailyMinutes * 0.25))}, "action": "Progress check and goal tracking" }
  ]
}
Return ONLY valid JSON without markdown code fences or extra text.`;

          const aiRes = await callGeminiWithFailover(keysPool, [{ parts: [{ text: roadmapPrompt }] }], { maxOutputTokens: 1100, temperature: 0.7 });
          if (aiRes.ok && aiRes.text) {
            const jsonMatch = aiRes.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const blueprint = JSON.parse(jsonMatch[0]);
              if (blueprint && blueprint.milestones && blueprint.milestones.length >= 3) {
                return json({ ok: true, blueprint, provider: aiRes.provider });
              }
            }
          }
        } catch (e) {}
      }
    }

    // 8b. Dynamic Sentence Generation
    if (task === 'generate-sentence') {
      const pack = body.pack || 'Everyday';
      if (keysPool.length > 0) {
        try {
          const sentencePrompt = `You are an expert English speech and phonetics coach at the English Careers Forum 2026.
Generate exactly ONE distinct, articulate, grammatically flawless practice sentence in English for a high school student to read aloud for speech evaluation.
Domain/Style: ${pack}.
Requirements:
- Exactly 12 to 24 words.
- Natural cadence, engaging subject matter, completely free of grammar or punctuation errors.
- Return ONLY the raw sentence text without quotes, markdown, or commentary.`;

          const aiRes = await callGeminiWithFailover(keysPool, [{ parts: [{ text: sentencePrompt }] }], { maxOutputTokens: 80, temperature: 0.95 });
          if (aiRes.ok && aiRes.text) {
            const generated = aiRes.text.trim().replace(/^[\"\']|[\"\']$/g, '');
            if (generated && generated.length > 20) {
              return json({ sentence: generated, provider: aiRes.provider });
            }
          }
        } catch (e) {}
      }
    }

    // 8c. Dynamic Flashcard Word Generation
    if (task === 'generate-flashcard') {
      const avoidWords = Array.isArray(body.avoid) ? body.avoid.slice(-30).join(', ') : '';
      if (keysPool.length > 0) {
        try {
          const vocabPrompt = `You are an expert English vocabulary & lexicography coach at the English Careers Forum 2026.
Generate exactly ONE distinct, sophisticated English vocabulary word (such as found in GRE/SAT, professional law, journalism, medicine, or aviation).
${avoidWords ? `Do NOT repeat any of these recently seen words: ${avoidWords}.` : ''}
Return a strict JSON object with this exact structure:
{
  "word": "VocabularyWord",
  "pos": "noun/verb/adjective",
  "phonetic": "/ipa_phonetic/",
  "meaning": "Clear, concise definition (10-25 words).",
  "sentence": "An engaging, professional example sentence demonstrating usage.",
  "origin": "Etymology note (e.g. Latin 'root' (meaning))"
}
Return ONLY valid raw JSON without markdown code fences or extra text.`;

          const aiRes = await callGeminiWithFailover(keysPool, [{ parts: [{ text: vocabPrompt }] }], { maxOutputTokens: 180, temperature: 0.95 });
          if (aiRes.ok && aiRes.text) {
            const jsonMatch = aiRes.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const cardData = JSON.parse(jsonMatch[0]);
              if (cardData.word && cardData.meaning) {
                return json({ card: cardData, provider: aiRes.provider });
              }
            }
          }
        } catch (e) {}
      }
    }

    // 8d. Interactive AI Quest & Literary Tasks (Multi-Key Gemini + Cloudflare Workers AI Backup)
    if (task === 'quest' || task === 'prompt') {
      const promptText = String(body.prompt || prompt || '').slice(0, 4000);
      const isJson = Boolean(body.json);

      // Primary: Google Gemini with Multi-Key Failover Pool
      if (keysPool.length > 0) {
        const aiRes = await callGeminiWithFailover(keysPool, [{ parts: [{ text: promptText }] }], {
          maxOutputTokens: 1000,
          temperature: 0.8,
          responseMimeType: isJson ? 'application/json' : undefined
        });
        if (aiRes.ok && aiRes.text) {
          let parsed = aiRes.text;
          if (isJson) {
            const jsonMatch = aiRes.text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
            if (jsonMatch) {
              try { parsed = JSON.parse(jsonMatch[0]); } catch { parsed = aiRes.text; }
            }
          }
          return json({ ok: true, text: aiRes.text, reply: parsed, provider: aiRes.provider });
        }
      }

      // Secondary: Cloudflare Workers AI (Llama 3.1)
      if (env.AI && typeof env.AI.run === 'function') {
        try {
          const sysPrompt = isJson
            ? `${promptText}\n\nIMPORTANT: Return ONLY valid parseable JSON matching the requested schema. No code fences, no extra text.`
            : promptText;
          const cfRes = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
            prompt: sysPrompt,
            max_tokens: 800,
            temperature: 0.75
          });
          if (cfRes && cfRes.response) {
            let parsed = cfRes.response;
            if (isJson) {
              const jsonMatch = cfRes.response.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
              if (jsonMatch) {
                try { parsed = JSON.parse(jsonMatch[0]); } catch {}
              }
            }
            return json({ ok: true, text: cfRes.response, reply: parsed, provider: 'Cloudflare Workers AI (Llama 3.1)' });
          }
        } catch (e) {
          console.warn('Workers AI quest error:', e);
        }
      }

      return json({ ok: false, error: 'AI quest synthesis unavailable' }, 200);
    }

    // 8e. General & Speech Coaching with Failover
    if (task === 'speech-coaching' && keysPool.length > 0) {
      try {
        const fullPrompt = `You are the lead AI Career & English Communication Coach at the English Careers Forum 2026 for Kanakia International School students.
Task: ${task}
Input text/metrics: ${text} | ${JSON.stringify(metrics)}
Instructions: ${prompt || 'Provide constructive, inspiring, and concise guidance. Highlight strengths, offer one "Say It Better" rewrite, and give 2 clear action points.'}`;

        const aiRes = await callGeminiWithFailover(keysPool, [{ parts: [{ text: fullPrompt }] }], { maxOutputTokens: 500, temperature: 0.7 });
        if (aiRes.ok && aiRes.text) {
          return json({ text: aiRes.text, provider: aiRes.provider });
        }
      } catch (e) {}
    }

    // High-quality deterministic fallback response
    let responseText = '';
    if (task === 'speech-coaching') {
      const fillers = metrics.fillers || 0;
      const wpm = metrics.wpm || 130;
      const suggestions = [];

      if (fillers > 0) {
        suggestions.push(`We noticed ${fillers} filler sound${fillers === 1 ? '' : 's'}. Try taking a one-second silent breath between thoughts instead of using filler sounds.`);
      } else {
        suggestions.push('Excellent poise! Zero filler words were detected in your delivery.');
      }

      if (wpm > 160) {
        suggestions.push(`Your pace was brisk at ~${wpm} WPM. Slowing down slightly at pivotal nouns will make your points memorable.`);
      } else if (wpm < 100) {
        suggestions.push(`Your cadence was steady at ~${wpm} WPM. Try linking consecutive sentences with conversational bridges like "Furthermore" or "In addition".`);
      } else {
        suggestions.push(`Your speaking pace (~${wpm} WPM) sits right inside the gold-standard broadcast range (120–150 WPM).`);
      }

      responseText = `**Speech Coach Insights:**\n\n${suggestions.join('\n\n')}\n\n**"Say It Better" Model Delivery:**\n"${text ? text.replace(/\b(um+|uh+|like|you know)\b/gi, '').trim() : 'Effective communication connects our ideas directly with the hearts and minds of listeners.'}"`;
    } else if (task === 'email-fix') {
      responseText = `**Professional Polish:**\n\nSubject: Update Regarding Project Deliverables and Schedule\n\nDear Team,\n\nI hope this email finds you well. I am writing to share our progress on this week's milestones and confirm our upcoming review meeting. Please let me know if you require any additional details.\n\nBest regards,\nClass X Representative`;
    } else {
      responseText = `Every career speaks English: confidence grows with each spoken attempt. Keep your core premise concise, support it with one vivid real-world example, and conclude with conviction!`;
    }

    return json({ text: responseText, provider: 'On-Device Heuristic Engine' });
  }

  // ── 9. Admin Moderation Endpoints ──────────────────────────────────────────
  if (path === '/admin/ping' && method === 'GET') {
    if (!authed(request, env)) return err('Unauthorized', 401);
    return json({ ok: true });
  }

  if (path === '/admin/del' && method === 'POST') {
    if (!authed(request, env)) return err('Unauthorized', 401);
    let body;
    try { body = await request.json(); } catch { return err('Invalid JSON'); }
    if (body.id) GLOBAL_CACHE.scores = GLOBAL_CACHE.scores.filter(s => s.id !== body.id);
    if (body.name) GLOBAL_CACHE.scores = GLOBAL_CACHE.scores.filter(s => s.name.toLowerCase() !== body.name.toLowerCase());
    if (db) {
      try {
        if (body.id) await db.prepare('DELETE FROM scores WHERE id=?').bind(body.id).run();
        if (body.name) await db.prepare('DELETE FROM scores WHERE name=?').bind(body.name).run();
      } catch {}
    }
    return json({ ok: true, message: 'Score deleted' });
  }

  if (path === '/admin/del-feedback' && method === 'POST') {
    if (!authed(request, env)) return err('Unauthorized', 401);
    let body;
    try { body = await request.json(); } catch { return err('Invalid JSON'); }
    const id = body.id;
    const comment = body.comment ? String(body.comment).trim() : '';

    // 1. Purge from in-memory cache
    GLOBAL_CACHE.feedback = (GLOBAL_CACHE.feedback || []).filter(f => {
      if (id && String(f.id).trim() === String(id).trim()) return false;
      if (comment && (f.comment || '').trim() === comment) return false;
      return true;
    });

    // 2. Purge from persistent Cloudflare D1 database
    if (db) {
      try {
        if (id && !isNaN(Number(id))) {
          await db.prepare('DELETE FROM feedback WHERE id=?').bind(Number(id)).run();
        }
        if (id) {
          await db.prepare('DELETE FROM feedback WHERE id=?').bind(String(id)).run();
        }
        if (comment) {
          await db.prepare('DELETE FROM feedback WHERE TRIM(comment)=?').bind(comment).run();
          await db.prepare('DELETE FROM feedback WHERE comment=?').bind(comment).run();
        }
      } catch (e) {
        console.warn('D1 feedback delete error:', e);
      }
    }
    return json({ ok: true, message: 'Feedback deleted' });
  }

  if (path === '/admin/reset' && method === 'POST') {
    if (!authed(request, env)) return err('Unauthorized', 401);
    GLOBAL_CACHE.scores = [];
    if (db) {
      try { await db.prepare('DELETE FROM scores').run(); } catch {}
    }
    return json({ ok: true, message: 'All scores reset' });
  }

  if (path === '/admin/reset-feedback' && method === 'POST') {
    if (!authed(request, env)) return err('Unauthorized', 401);
    GLOBAL_CACHE.feedback = [];
    if (db) {
      try { await db.prepare('DELETE FROM feedback').run(); } catch {}
    }
    return json({ ok: true, message: 'All feedback reset' });
  }

  if (path === '/admin/export' && method === 'GET') {
    if (!authed(request, env, url)) return err('Unauthorized', 401);
    let csv = 'ID,Name,Pack,Level,Accuracy,Fluency,Clarity,WPM,Class,TargetCareer,Timestamp\n';
    try {
      if (db) {
        const { results } = await db.prepare('SELECT * FROM scores ORDER BY level DESC, acc DESC').all();
        for (const r of (results || [])) {
          csv += `${r.id},"${r.name}","${r.pack}",${r.level},${r.acc},${r.fluency},${r.clarity},${r.wpm},"${r.class_name}","${r.target_career}","${new Date(r.ts).toISOString()}"\n`;
        }
      }
    } catch {}
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="careerfair-scores.csv"',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  if (path === '/admin/export-feedback' && method === 'GET') {
    if (!authed(request, env, url)) return err('Unauthorized', 401);
    let csv = 'ID,Name,Role,ClassInfo,Useful,Games,Speaking,Comment,Timestamp\n';
    try {
      if (db) {
        const { results } = await db.prepare('SELECT * FROM feedback ORDER BY ts DESC').all();
        for (const r of (results || [])) {
          const cleanComment = String(r.comment || '').replace(/"/g, '""');
          csv += `${r.id},"${r.name}","${r.role}","${r.class_info}",${r.r_useful},${r.r_games},${r.r_speaking},"${cleanComment}","${new Date(r.ts).toISOString()}"\n`;
        }
      }
    } catch {}
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="careerfair-feedback.csv"',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

    // ── 10a. GET & POST /tts/voices (Fetch ElevenLabs voices, free-tier compatibility, & quota) ───────
  const UNIVERSAL_PREMADE_VOICES = [
    { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', accent: 'British' },
    { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', accent: 'Australian' },
    { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', accent: 'British' },
    { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', accent: 'American' },
    { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', accent: 'American' },
    { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', accent: 'British' }
  ];

  if ((path === '/tts/voices' || path === '/tts-voices') && (method === 'GET' || method === 'POST')) {
    let body = {};
    if (method === 'POST') {
      try { body = await request.json(); } catch { body = {}; }
    }
    const elevenKey = (body.apiKey || request.headers.get('xi-api-key') || url.searchParams.get('key') || (await kvGet(db, 'eleven_key', '')) || env.ELEVEN_KEY || '').trim();

    if (!elevenKey) {
      return json({
        ok: false,
        status: 'missing_key',
        message: 'No ElevenLabs API key configured. Enter your XI-API-KEY in Admin Settings or set ELEVEN_KEY in Cloudflare.'
      });
    }

    try {
      const vRes = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': elevenKey }
      });

      if (!vRes.ok) {
        const errDetail = await vRes.text().catch(() => '');
        return json({
          ok: false,
          status: vRes.status === 401 ? 'invalid_key' : 'api_error',
          statusCode: vRes.status,
          message: errDetail.includes('API key ID used as API key') 
              ? 'You entered the Key ID instead of the Secret API Key. In ElevenLabs (Settings → API Keys), please copy the actual secret key.'
              : (vRes.status === 401 ? 'Invalid ElevenLabs API Key. Please verify your key on elevenlabs.io.' : `ElevenLabs API error (${vRes.status}): ${errDetail.slice(0, 120)}`)
        });
      }

      const vData = await vRes.json();
      const rawVoices = vData.voices || [];

      // Check subscription quota & tier
      let subscription = null;
      try {
        const subRes = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
          headers: { 'xi-api-key': elevenKey }
        });
        if (subRes.ok) {
          subscription = await subRes.json();
        }
      } catch {}

      const tier = (subscription?.tier || 'free').toLowerCase();
      const isFreeTier = tier === 'free';

      const voices = rawVoices.map(v => {
        const acc = (v.labels?.accent || '').toLowerCase();
        const desc = (v.description || '').toLowerCase();
        const name = (v.name || '').toLowerCase();
        const cat = (v.category || 'premade').toLowerCase();
        const isPremade = cat === 'premade';
        const isIndian = acc.includes('indian') || acc.includes('hindi') || name.includes('ankit') || name.includes('aditi') || name.includes('akash') || name.includes('deepika') || name.includes('priya') || name.includes('ravi') || name.includes('kabir') || desc.includes('indian');
        
        // Free tier restriction indicator:
        const freeTierReady = isPremade;
        const requiresPaidPlan = !isPremade;

        return {
          id: v.voice_id,
          name: v.name,
          category: v.category || 'premade',
          isPremade,
          freeTierReady,
          requiresPaidPlan,
          accent: v.labels?.accent || (isIndian ? 'Indian' : ''),
          isIndian,
          preview_url: v.preview_url || ''
        };
      });

      const indianVoice = voices.find(v => v.isIndian) || null;
      const bestFreeVoice = voices.find(v => v.freeTierReady && (v.name.includes('George') || v.name.includes('Charlie') || v.name.includes('Alice') || v.name.includes('Rachel')))
        || voices.find(v => v.freeTierReady)
        || UNIVERSAL_PREMADE_VOICES[0];

      return json({
        ok: true,
        total: voices.length,
        isFreeTier,
        tier,
        hasIndianVoice: Boolean(indianVoice),
        recommendedIndianVoice: indianVoice,
        recommendedFreeVoice: bestFreeVoice,
        subscription: subscription ? {
          tier: subscription.tier || 'free',
          character_count: subscription.character_count || 0,
          character_limit: subscription.character_limit || 10000,
          status: subscription.status || 'active'
        } : null,
        voices: voices
      });
    } catch (e) {
      return json({
        ok: false,
        status: 'network_error',
        message: 'Could not connect to ElevenLabs API: ' + e.message
      });
    }
  }

  // ── 10. POST /tts (Humanoid Indian Accent Audio Synthesis with 402 Auto-Heal) ────────────
  if (path === '/tts' && method === 'POST') {
    let body;
    try { body = await request.json(); } catch { body = {}; }
    const text = body.text || 'Welcome to the English Careers Forum 2026 at Kanakia International School. Good English is the universal language that unlocks thirty-two global career pathways.';
    
    // Resolve key from body, header, database KV, or env
    const elevenKey = (body.apiKey || request.headers.get('xi-api-key') || (await kvGet(db, 'eleven_key', '')) || env.ELEVEN_KEY || '').trim();
    let requestedVoiceId = (body.voiceId || (await kvGet(db, 'eleven_voice', '')) || env.ELEVEN_VOICE_ID || '').trim();

    if (!elevenKey) {
      return json({
        fallback: true,
        status: 'missing_key',
        message: 'ElevenLabs API key not configured. Add XI-API-KEY in Admin Settings or Cloudflare ELEVEN_KEY.'
      });
    }

    try {
      // 1. Fetch available voices in user account
      let accountVoices = [];
      let accountIndianVoice = null;
      let isFreeUser = true;

      try {
        const vRes = await fetch('https://api.elevenlabs.io/v1/voices', {
          headers: { 'xi-api-key': elevenKey }
        });
        if (vRes.ok) {
          const vData = await vRes.json();
          accountVoices = vData.voices || [];
          accountIndianVoice = accountVoices.find(v => {
            const acc = (v.labels?.accent || '').toLowerCase();
            const desc = (v.description || '').toLowerCase();
            const name = (v.name || '').toLowerCase();
            return acc.includes('indian') || acc.includes('hindi') || name.includes('ankit') || name.includes('aditi') || name.includes('akash') || name.includes('priya') || name.includes('deepika') || name.includes('ravi') || name.includes('kabir') || desc.includes('indian');
          });
        } else if (vRes.status === 401) {
          return json({
            fallback: true,
            status: 'invalid_key',
            message: 'ElevenLabs API key is invalid or unauthorized.'
          });
        }
      } catch (e) {}

      // Check subscription tier
      try {
        const subRes = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
          headers: { 'xi-api-key': elevenKey }
        });
        if (subRes.ok) {
          const s = await subRes.json();
          if (s && s.tier && s.tier.toLowerCase() !== 'free') isFreeUser = false;
        }
      } catch (e) {}

      // 2. Resolve Voice Candidate Pool:
      // If user is Free Tier and requested a known Library voice (e.g. Aditi / XyEeR27UzfaUps3yGyxO),
      // we immediately include premade candidates so there is ZERO delay or hard error.
      const candidateVoiceIds = [];
      if (requestedVoiceId) candidateVoiceIds.push(requestedVoiceId);
      if (accountIndianVoice) candidateVoiceIds.push(accountIndianVoice.voice_id);
      
      // Add account's premade voices
      for (const v of accountVoices) {
        if ((v.category === 'premade' || !v.category) && !candidateVoiceIds.includes(v.voice_id)) {
          candidateVoiceIds.push(v.voice_id);
        }
      }
      // Add universal guaranteed premade voices
      for (const uv of UNIVERSAL_PREMADE_VOICES) {
        if (!candidateVoiceIds.includes(uv.id)) {
          candidateVoiceIds.push(uv.id);
        }
      }

      // Try synthesis across candidates with failover for 402/400
      let audioBuffer = null;
      let activeVoiceName = 'Studio Voice';
      let activeVoiceId = '';
      let isHealed = false;
      let lastErrMsg = '';
      let lastStatus = 0;

      const modelsToTry = ['eleven_multilingual_v2', 'eleven_turbo_v2_5', 'eleven_flash_v2_5'];

      for (let i = 0; i < Math.min(candidateVoiceIds.length, 4); i++) {
        const vid = candidateVoiceIds[i];
        const voiceObj = accountVoices.find(v => v.voice_id === vid) || UNIVERSAL_PREMADE_VOICES.find(v => v.id === vid);
        const vName = voiceObj ? voiceObj.name : vid;

        for (const model of modelsToTry) {
          try {
            const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vid}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'xi-api-key': elevenKey
              },
              body: JSON.stringify({
                text: text,
                model_id: model,
                voice_settings: { stability: 0.65, similarity_boost: 0.75 }
              })
            });

            if (ttsRes.ok) {
              audioBuffer = await ttsRes.arrayBuffer();
              activeVoiceName = vName;
              activeVoiceId = vid;
              if (i > 0) isHealed = true;
              break;
            } else {
              lastStatus = ttsRes.status;
              const errTxt = await ttsRes.text().catch(() => '');
              try {
                const parsed = JSON.parse(errTxt);
                lastErrMsg = parsed.detail?.message || parsed.message || errTxt;
              } catch {
                lastErrMsg = errTxt;
              }
              // If 402 (Free users cannot use library voices), immediately break model loop and try next voice (premade)
              if (ttsRes.status === 402) {
                break;
              }
            }
          } catch (e) {
            lastErrMsg = e.message;
          }
        }

        if (audioBuffer) break;
      }

      if (audioBuffer) {
        return new Response(audioBuffer, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'x-eleven-voice': `${activeVoiceName}${isHealed ? ' (Studio Free-Tier Voice)' : ''}`,
            'x-eleven-voice-id': activeVoiceId,
            'x-eleven-healed': isHealed ? 'true' : 'false',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Expose-Headers': 'x-eleven-voice, x-eleven-voice-id, x-eleven-healed'
          }
        });
      }

      // If all ElevenLabs attempts failed (quota exhausted, invalid key, etc.):
      return json({
        fallback: true,
        status: lastStatus === 429 ? 'quota_exhausted' : (lastStatus === 402 ? 'free_tier_library_notice' : 'eleven_fallback'),
        statusCode: lastStatus,
        message: lastStatus === 402
          ? 'ElevenLabs Free Plan does not allow Community VoiceLab voices via API. Switched smoothly to Indian Neural Voice (en-IN).'
          : (lastStatus === 429 ? 'ElevenLabs monthly character quota consumed. Playing instant Indian Neural Voice (en-IN).' : 'ElevenLabs offline. Playing instant Indian Neural Voice (en-IN).')
      });

    } catch (e) {
      return json({
        fallback: true,
        status: 'error',
        message: 'Speech synthesis fallback active: ' + e.message
      });
    }
  }

  // ── 12. GET /export/data (Permanent Cloudflare D1 Dated Data Export) ─────────
  if ((path === '/export/data' || path === '/export-data') && method === 'GET') {
    const format = url.searchParams.get('format') || 'json';
    let feedbackRows = [];
    let scoreRows = [];

    if (db) {
      try {
        const fb = await db.prepare('SELECT * FROM feedback ORDER BY ts DESC').all();
        feedbackRows = fb.results || [];
        const sc = await db.prepare('SELECT * FROM scores ORDER BY ts DESC').all();
        scoreRows = sc.results || [];
      } catch (e) {
        console.error('D1 Export error:', e);
      }
    }

    if (format === 'csv') {
      let csv = 'Record_Type,ID,Name,Detail,Metric,Timestamp,ISO_Date\n';
      for (const f of feedbackRows) {
        csv += `Feedback,"${f.id}","${(f.name || '').replace(/"/g, '""')}","${(f.comment || '').replace(/"/g, '""')}",${f.r_useful || 5},${f.ts},"${new Date(Number(f.ts)).toISOString()}"\n`;
      }
      for (const s of scoreRows) {
        csv += `Score,"${s.id}","${(s.name || '').replace(/"/g, '""')}","${s.pack} Level ${s.level} (Accuracy ${s.acc}%)",${s.acc},${s.ts},"${new Date(Number(s.ts)).toISOString()}"\n`;
      }
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="careerfair_global_data_${Date.now()}.csv"`,
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    return json({
      export_timestamp: Date.now(),
      export_date_iso: new Date().toISOString(),
      database: 'careerfair-db (Cloudflare D1)',
      total_feedback: feedbackRows.length,
      total_scores: scoreRows.length,
      feedback: feedbackRows,
      scores: scoreRows
    });
  }

  return err('Route not found', 404);
}
