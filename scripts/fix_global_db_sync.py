import re

# 1. Patch functions/api/[[path]].js
with open('careerfair/functions/api/[[path]].js', 'r', encoding='utf-8') as f:
    api_code = f.read()

# Replace /attempt handler with clean outer scoped body & full metrics parsing
old_attempt_pattern = r"// ── 4\. POST /attempt ──[\s\S]*?return json\(\{\s*transcript,\s*acc,\s*passed,\s*passThreshold,\s*level,\s*name\s*\}\);\s*\}"

new_attempt_code = """// ── 4. POST /attempt (Global D1 Leaderboard Attempt Persistence) ──────
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
  }"""

api_code = re.sub(old_attempt_pattern, new_attempt_code, api_code)

with open('careerfair/functions/api/[[path]].js', 'w', encoding='utf-8', newline='') as f:
    f.write(api_code)

print("Updated functions/api/[[path]].js with fixed /attempt metrics parsing and D1 persistence")
