import re

with open('careerfair/functions/api/[[path]].js', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update D1 DB resolution
text = re.sub(
    r'const db = env\.DB \|\| env\.db \|\| [^;]+;',
    'const db = env.DB || env.db || env.DATABASE || env.database || env.D1 || env.d1 || env["careerfair-db"] || env.careerfair || env.careerfair_db || env.CAREERFAIR_DB || env.CF_DB;',
    text
)

# 2. Update Workers AI in task === 'quest'
quest_target = """    // 8d. Interactive AI Quest & Literary Tasks
    if (task === 'quest' || task === 'prompt') {
      const promptText = String(body.prompt || prompt || '').slice(0, 4000);
      const isJson = Boolean(body.json);
      if (keysPool.length > 0) {
        const aiRes = await callGeminiWithFailover(keysPool, [{ parts: [{ text: promptText }] }], {
          maxOutputTokens: 1000,
          temperature: 0.8,
          responseMimeType: isJson ? 'application/json' : undefined
        });
        if (aiRes.ok && aiRes.text) {
          let parsed = aiRes.text;
          if (isJson) {
            const jsonMatch = aiRes.text.match(/\\{[\\s\\S]*\\}|\\[[\\s\\S]*\\]/);
            if (jsonMatch) {
              try { parsed = JSON.parse(jsonMatch[0]); } catch { parsed = aiRes.text; }
            }
          }
          return json({ ok: true, text: aiRes.text, reply: parsed, provider: aiRes.provider });
        }
      }
      return json({ ok: false, error: 'AI quest synthesis unavailable' }, 200);
    }"""

quest_replacement = """    // 8d. Interactive AI Quest & Literary Tasks (Multi-Key Gemini + Cloudflare Workers AI Backup)
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
            const jsonMatch = aiRes.text.match(/\\{[\\s\\S]*\\}|\\[[\\s\\S]*\\]/);
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
            ? `${promptText}\\n\\nIMPORTANT: Return ONLY valid parseable JSON matching the requested schema. No code fences, no extra text.`
            : promptText;
          const cfRes = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
            prompt: sysPrompt,
            max_tokens: 800,
            temperature: 0.75
          });
          if (cfRes && cfRes.response) {
            let parsed = cfRes.response;
            if (isJson) {
              const jsonMatch = cfRes.response.match(/\\{[\\s\\S]*\\}|\\[[\\s\\S]*\\]/);
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
    }"""

if quest_target in text:
    text = text.replace(quest_target, quest_replacement, 1)
    print("Patched quest AI")
else:
    print("Quest AI pattern not matched verbatim, using regex...")
    text = re.sub(
        r"// 8d\. Interactive AI Quest & Literary Tasks[\s\S]*?return json\(\{ ok: false, error: 'AI quest synthesis unavailable' \}, 200\);\s*\}",
        quest_replacement,
        text
    )

with open('careerfair/functions/api/[[path]].js', 'w', encoding='utf-8', newline='') as f:
    f.write(text)
print("Done backend patch")
