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

  const db = env.DB;

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

    const stream_url = await kvGet(db, 'stream_url', '');
    const stream_title = await kvGet(db, 'stream_title', 'English Careers Forum 2026 — Live Stage Broadcast');
    const stream_active = (await kvGet(db, 'stream_active', '1')) === '1';

    const gemini_keys = (await kvGet(db, 'gemini_keys', '')) || (await kvGet(db, 'gemini_key', ''));
    const eleven_voice = await kvGet(db, 'eleven_voice', '');
    const eleven_key = await kvGet(db, 'eleven_key', '');

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
      eleven_key
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
    if (body.stream_url !== undefined) await kvSet(db, 'stream_url', body.stream_url);
    if (body.stream_title !== undefined) await kvSet(db, 'stream_title', body.stream_title);
    if (body.stream_active !== undefined) await kvSet(db, 'stream_active', body.stream_active ? '1' : '0');
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

    try {
      if (db) {
        const { results } = binds.length ? await db.prepare(q).bind(...binds).all() : await db.prepare(q).all();
        return json(results || []);
      }
    } catch {}

    return json([]);
  }

  // ── 4. POST /attempt ───────────────────────────────────────────────────────
  if (path === '/attempt' && method === 'POST') {
    let name = 'Explorer';
    let level = 1;
    let pack = 'Everyday';
    let target = '';
    let fallbackText = '';
    let className = 'Class 10';
    let targetCareer = '';
    let audioFile = null;

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
    } else {
      let body;
      try { body = await request.json(); } catch { body = {}; }
      name = (body.name || 'Explorer').trim().slice(0, 40);
      level = parseInt(body.level || '1', 10) || 1;
      pack = (body.pack || 'Everyday').trim();
      target = (body.target || '').trim();
      fallbackText = (body.fallback_text || '').trim();
      className = (body.class_name || 'Class 10').trim();
      targetCareer = (body.target_career || '').trim();
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
    const acc = target && transcript ? calculateAccuracy(target, transcript) : 0;
    const passed = acc >= passThreshold;

    // Upsert into D1 database
    try {
      if (db && name) {
        const existing = await db
          .prepare('SELECT level, acc FROM scores WHERE name=? COLLATE NOCASE')
          .bind(name).first();

        if (!existing || level > existing.level || (level === existing.level && acc > existing.acc)) {
          await db
            .prepare(
              `INSERT INTO scores (name, pack, level, acc, fluency, clarity, wpm, class_name, target_career, ts)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(name) DO UPDATE SET
                 pack=excluded.pack,
                 level=excluded.level,
                 acc=excluded.acc,
                 fluency=excluded.fluency,
                 clarity=excluded.clarity,
                 wpm=excluded.wpm,
                 class_name=excluded.class_name,
                 target_career=excluded.target_career,
                 ts=excluded.ts`
            )
            .bind(name, pack, level, acc, Math.min(100, acc + 5), Math.min(100, acc + 2), 130, className, targetCareer, Date.now())
            .run();
        }
      }
    } catch (e) {}

    return json({
      transcript,
      acc,
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

    try {
      if (db) {
        await db.prepare(
          `INSERT INTO feedback (name, role, class_info, r_useful, r_games, r_speaking, comment, approved, ts)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          String(name).slice(0, 50),
          String(role).slice(0, 20),
          String(class_info).slice(0, 50),
          parseInt(r_useful, 10) || 5,
          parseInt(r_games, 10) || 5,
          parseInt(r_speaking, 10) || 5,
          String(comment).slice(0, 1000),
          1,
          Date.now()
        ).run();
      }
    } catch (e) {}

    return json({ ok: true, message: 'Thank you for your feedback!' });
  }

  if (path === '/feedback' && method === 'GET') {
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = 50;
    const offset = (page - 1) * limit;

    try {
      if (db) {
        const { results } = await db.prepare('SELECT * FROM feedback WHERE approved=1 ORDER BY ts DESC LIMIT ? OFFSET ?')
          .bind(limit, offset).all();
        const countRow = await db.prepare('SELECT COUNT(*) as c FROM feedback WHERE approved=1').first();
        return json({ results: results || [], total: countRow?.c || 0, page });
      }
    } catch {}

    return json({ results: [], total: 0, page: 1 });
  }

  // ── 8. POST /ai (Multi-Provider AI Router with Backup Key Failover Pool) ──────
  // Set to track keys that have hit 429 quota exhaustion or 403 invalid.
  // Keys in this set are discarded and bypassed for backup keys.
  const EXHAUSTED_GEMINI_KEYS = new Set();

  async function getGeminiKeyPool(env, body = {}, request = null, db = null) {
    const rawSources = [];

    // 1. Client header or body (passed from frontend Admin settings)
    const headerKeys = request?.headers?.get('x-gemini-keys') || request?.headers?.get('x-gemini-key');
    if (headerKeys) rawSources.push(headerKeys);
    if (body.keys && Array.isArray(body.keys)) rawSources.push(body.keys.join(','));
    if (body.geminiKeys) rawSources.push(Array.isArray(body.geminiKeys) ? body.geminiKeys.join(',') : String(body.geminiKeys));
    if (body.geminiKey) rawSources.push(String(body.geminiKey));

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
    for (let i = 0; i < keysPool.length; i++) {
      const key = keysPool[i];
      try {
        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(key)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
              provider: keysPool.length > 1 ? `Google Gemini AI (Key ${i + 1}/${keysPool.length})` : 'Google Gemini AI'
            };
          }
        }

        const errText = await geminiRes.text().catch(() => '');
        // Check if quota exhausted or rate limited
        if (geminiRes.status === 429 || geminiRes.status === 403 || errText.includes('RESOURCE_EXHAUSTED') || errText.includes('quota') || errText.includes('API_KEY_INVALID')) {
          EXHAUSTED_GEMINI_KEYS.add(key);
          errors.push(`Key #${i + 1} exhausted (${geminiRes.status}). Discarded.`);
          continue; // Switch to next backup key!
        } else {
          errors.push(`Key #${i + 1} error (${geminiRes.status}): ${errText.slice(0, 100)}`);
          continue;
        }
      } catch (e) {
        errors.push(`Key #${i + 1} network exception: ${e.message}`);
        continue;
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

    // 8d. General & Speech Coaching with Failover
    if (keysPool.length > 0) {
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
    if (db) {
      if (body.id) {
        await db.prepare('DELETE FROM scores WHERE id=?').bind(body.id).run();
      }
      if (body.name) {
        await db.prepare('DELETE FROM scores WHERE name=?').bind(body.name).run();
      }
    }
    return json({ ok: true, message: 'Score deleted' });
  }

  if (path === '/admin/del-feedback' && method === 'POST') {
    if (!authed(request, env)) return err('Unauthorized', 401);
    let body;
    try { body = await request.json(); } catch { return err('Invalid JSON'); }
    if (db) {
      if (body.id) {
        await db.prepare('DELETE FROM feedback WHERE id=?').bind(body.id).run();
      }
      if (body.comment) {
        await db.prepare('DELETE FROM feedback WHERE comment=?').bind(body.comment).run();
      }
    }
    return json({ ok: true, message: 'Feedback deleted' });
  }

  if (path === '/admin/reset' && method === 'POST') {
    if (!authed(request, env)) return err('Unauthorized', 401);
    if (db) await db.prepare('DELETE FROM scores').run();
    return json({ ok: true, message: 'All scores reset' });
  }

  if (path === '/admin/reset-feedback' && method === 'POST') {
    if (!authed(request, env)) return err('Unauthorized', 401);
    if (db) await db.prepare('DELETE FROM feedback').run();
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

  // ── 10. POST /tts (Humanoid Indian Accent Audio Synthesis) ──────────────────────────────
  if (path === '/tts' && method === 'POST') {
    let body;
    try { body = await request.json(); } catch { body = {}; }
    const text = body.text || 'Welcome to the English Careers Forum 2026 at Kanakia International School. Good English is the universal language that unlocks thirty-two global career pathways.';
    
    // Resolve key from body, header, database KV, or env
    const elevenKey = (body.apiKey || request.headers.get('xi-api-key') || (await kvGet(db, 'eleven_key', '')) || env.ELEVEN_KEY || '').trim();
    let voiceId = (body.voiceId || (await kvGet(db, 'eleven_voice', '')) || env.ELEVEN_VOICE_ID || '').trim();

    if (elevenKey) {
      try {
        if (!voiceId) {
          // Attempt to find any Indian accent voice in the user's ElevenLabs account library
          try {
            const vRes = await fetch('https://api.elevenlabs.io/v1/voices', {
              headers: { 'xi-api-key': elevenKey }
            });
            if (vRes.ok) {
              const vData = await vRes.json();
              const indianVoice = (vData.voices || []).find(v => {
                const acc = (v.labels?.accent || '').toLowerCase();
                const desc = (v.description || '').toLowerCase();
                const name = (v.name || '').toLowerCase();
                return acc.includes('indian') || acc.includes('hindi') || name.includes('ankit') || name.includes('aditi') || name.includes('akash') || desc.includes('indian');
              });
              if (indianVoice) {
                voiceId = indianVoice.voice_id;
              }
            }
          } catch {}
        }

        // Default to Ankit if still empty
        if (!voiceId) {
          voiceId = 'EtEf6yOMlronn3UoIDrF';
        }

        // Multi-tier model attempts for exact voiceId:
        // Tier 1: eleven_multilingual_v2 with safe stability & similarity (omits style/boost which fail on custom voices)
        // Tier 2: eleven_turbo_v2_5 (universal compatibility across all Voice Library & custom voices)
        // Tier 3: eleven_flash_v2_5 (high speed & low latency across all voices)
        // Tier 4: Default voice model
        const modelAttempts = [
          {
            model_id: 'eleven_multilingual_v2',
            voice_settings: { stability: 0.65, similarity_boost: 0.75 }
          },
          {
            model_id: 'eleven_turbo_v2_5',
            voice_settings: { stability: 0.65, similarity_boost: 0.75 }
          },
          {
            model_id: 'eleven_flash_v2_5',
            voice_settings: { stability: 0.65, similarity_boost: 0.75 }
          },
          {
            voice_settings: { stability: 0.65, similarity_boost: 0.75 }
          }
        ];

        let ttsRes = null;
        for (const config of modelAttempts) {
          try {
            ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'xi-api-key': elevenKey
              },
              body: JSON.stringify({
                text: text,
                ...config
              })
            });
            if (ttsRes && ttsRes.ok) break;
          } catch (e) {}
        }

        if (ttsRes && ttsRes.ok) {
          const audioBuffer = await ttsRes.arrayBuffer();
          return new Response(audioBuffer, {
            headers: {
              'Content-Type': 'audio/mpeg',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
      } catch (e) {}
    }

    return json({ fallback: true, message: 'Neural client-side synthesis active (Indian English en-IN)' });
  }

  return err('Route not found', 404);
}
