with open('functions/api/[[path]].js', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Patch generate-roadmap Workers AI fallback
target_roadmap = '''          if (aiRes.ok && aiRes.text) {
            const jsonMatch = aiRes.text.match(/\\{[\\s\\S]*\\}/);
            if (jsonMatch) {
              const blueprint = JSON.parse(jsonMatch[0]);
              if (blueprint && blueprint.milestones && blueprint.milestones.length >= 3) {
                return json({ ok: true, blueprint, provider: aiRes.provider });
              }
            }
          }
        } catch (e) {}
      }
    }'''

replacement_roadmap = '''          if (aiRes.ok && aiRes.text) {
            const jsonMatch = aiRes.text.match(/\\{[\\s\\S]*\\}/);
            if (jsonMatch) {
              const blueprint = JSON.parse(jsonMatch[0]);
              if (blueprint && blueprint.milestones && blueprint.milestones.length >= 3) {
                return json({ ok: true, blueprint, provider: aiRes.provider });
              }
            }
          }
        } catch (e) {}
      }

      // Secondary Failover: Cloudflare Workers AI (Llama 3.1)
      if (env.AI && typeof env.AI.run === 'function') {
        try {
          const cfPrompt = `You are the Lead Career Strategist and Academic Counselor at the Career Fair 2026.
Generate a comprehensive career roadmap blueprint for an ambitious school student.
Student Profile: Target Career: ${career}, Class: ${classGrade}, Daily English Practice: ${dailyMinutes} mins/day.
Return ONLY a valid JSON object with keys: "career", "class_grade", "daily_minutes", "headline", "why_english", "milestones" (array of 3 items with phase, title, description, action_items, skills), "daily_routine" (array of 4 items with phase, mins, action).
No code fences, no extra text.`;
          const cfRes = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
            prompt: cfPrompt,
            max_tokens: 1500,
            temperature: 0.7
          });
          if (cfRes && cfRes.response) {
            const jsonMatch = cfRes.response.match(/\\{[\\s\\S]*\\}/);
            if (jsonMatch) {
              const blueprint = JSON.parse(jsonMatch[0]);
              if (blueprint && blueprint.milestones && blueprint.milestones.length >= 3) {
                return json({ ok: true, blueprint, provider: 'Cloudflare Workers AI (Llama 3.1)' });
              }
            }
          }
        } catch (e) {
          console.warn('Workers AI roadmap error:', e);
        }
      }
    }'''

# 2. Patch generate-sentence Workers AI fallback
target_sentence = '''          if (aiRes.ok && aiRes.text) {
            const generated = aiRes.text.trim().replace(/^[\\"\\\']|[\\"\\\']$/g, '');
            if (generated && generated.length > 20) {
              return json({ sentence: generated, provider: aiRes.provider });
            }
          }
        } catch (e) {}
      }
    }'''

replacement_sentence = '''          if (aiRes.ok && aiRes.text) {
            const generated = aiRes.text.trim().replace(/^[\\"\\\']|[\\"\\\']$/g, '');
            if (generated && generated.length > 20) {
              return json({ sentence: generated, provider: aiRes.provider });
            }
          }
        } catch (e) {}
      }

      // Secondary Failover: Cloudflare Workers AI (Llama 3.1)
      if (env.AI && typeof env.AI.run === 'function') {
        try {
          const cfPrompt = `You are an expert English speech and phonetics coach at the Career Fair 2026.
Generate exactly ONE distinct, articulate, grammatically flawless practice sentence in English for a high school student to read aloud for speech evaluation.
Domain/Style: ${pack}. Requirements: Exactly 12 to 24 words, natural cadence, grammatically flawless.
Return ONLY the raw sentence text without quotes, markdown, or commentary.`;
          const cfRes = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
            prompt: cfPrompt,
            max_tokens: 80,
            temperature: 0.95
          });
          if (cfRes && cfRes.response) {
            const gen = cfRes.response.trim().replace(/^[\\"\\\']|[\\"\\\']$/g, '');
            if (gen && gen.length > 20) {
              return json({ sentence: gen, provider: 'Cloudflare Workers AI (Llama 3.1)' });
            }
          }
        } catch (e) {
          console.warn('Workers AI sentence error:', e);
        }
      }
    }'''

# 3. Patch speech-coaching Workers AI fallback
target_coaching = '''        const aiRes = await callGeminiWithFailover(keysPool, [{ parts: [{ text: fullPrompt }] }], { maxOutputTokens: 500, temperature: 0.7 });
        if (aiRes.ok && aiRes.text) {
          return json({ text: aiRes.text, provider: aiRes.provider });
        }
      } catch (e) {}
    }'''

replacement_coaching = '''        const aiRes = await callGeminiWithFailover(keysPool, [{ parts: [{ text: fullPrompt }] }], { maxOutputTokens: 500, temperature: 0.7 });
        if (aiRes.ok && aiRes.text) {
          return json({ text: aiRes.text, provider: aiRes.provider });
        }
      } catch (e) {}
    }

    // Secondary Failover: Cloudflare Workers AI (Llama 3.1)
    if (task === 'speech-coaching' && env.AI && typeof env.AI.run === 'function') {
      try {
        const fullPrompt = `You are the lead AI Career & English Communication Coach at the Career Fair 2026 for Kanakia International School students.
Task: ${task}
Input text/metrics: ${text} | ${JSON.stringify(metrics)}
Instructions: ${prompt || 'Provide constructive, inspiring, and concise guidance. Highlight strengths, offer one "Say It Better" rewrite, and give 2 clear action points.'}`;
        const cfRes = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
          prompt: fullPrompt,
          max_tokens: 500,
          temperature: 0.7
        });
        if (cfRes && cfRes.response) {
          return json({ text: cfRes.response, provider: 'Cloudflare Workers AI (Llama 3.1)' });
        }
      } catch (e) {
        console.warn('Workers AI speech-coaching error:', e);
      }
    }'''

c_norm = code.replace('\r\n', '\n')
assert target_roadmap in c_norm, 'target_roadmap not found'
assert target_sentence in c_norm, 'target_sentence not found'
assert target_coaching in c_norm, 'target_coaching not found'

c_norm = c_norm.replace(target_roadmap, replacement_roadmap, 1)
c_norm = c_norm.replace(target_sentence, replacement_sentence, 1)
c_norm = c_norm.replace(target_coaching, replacement_coaching, 1)

with open('functions/api/[[path]].js', 'w', encoding='utf-8', newline='\n') as f:
    f.write(c_norm)

print("SUCCESS: functions/api/[[path]].js patched with Cloudflare Workers AI fallbacks across all tasks!")
