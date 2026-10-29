import re

with open('careerfair/functions/api/[[path]].js', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace the TTS handler with the bulletproof version
tts_replacement = """  // ── 10a. GET & POST /tts/voices (Fetch ElevenLabs voices, free-tier compatibility, & quota) ───────
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
          message: vRes.status === 401 ? 'Invalid ElevenLabs API Key. Please verify your key on elevenlabs.io.' : `ElevenLabs API error (${vRes.status}): ${errDetail.slice(0, 120)}`
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
  }"""

# Use regex to replace the entire block from // ── 10a. GET & POST /tts/voices to end of POST /tts
code = re.sub(
    r"// ── 10a\. GET & POST /tts/voices[\s\S]*?return err\('Route not found', 404\);",
    tts_replacement + "\n\n  return err('Route not found', 404);",
    code
)

with open('careerfair/functions/api/[[path]].js', 'w', encoding='utf-8', newline='') as f:
    f.write(code)

print("Successfully replaced TTS handler in [[path]].js")
