import os
import sys

# Force UTF-8
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

app_js_path = os.path.join(os.path.dirname(__file__), '..', 'public', 'app.js')
with open(app_js_path, 'r', encoding='utf-8') as f:
    code = f.read()

# Add getApiUrl helper right above PRIMARY_D1_ORIGIN or fetchApi
if 'function getApiUrl' not in code:
    code = code.replace(
        "const PRIMARY_D1_ORIGIN = 'https://careerwithenglish.pages.dev';",
        """const PRIMARY_D1_ORIGIN = 'https://careerwithenglish.pages.dev';

function getApiUrl(path) {
  const clean = path.replace(/^\\/+/, '');
  const isPrimary = (typeof window !== 'undefined' && window.location.hostname === 'careerwithenglish.pages.dev');
  return isPrimary ? `/${clean}` : `${PRIMARY_D1_ORIGIN}/${clean}`;
}"""
    )
    print("Added getApiUrl function")

# Replace raw fetch('/api/ calls
code = code.replace("fetch('/api/tts',", "fetch(getApiUrl('api/tts'),")
code = code.replace("fetch('/api/stt',", "fetch(getApiUrl('api/stt'),")
code = code.replace("fetch('/api/ai',", "fetch(getApiUrl('api/ai'),")
code = code.replace("fetch('/api/tts/voices'", "fetch(getApiUrl('api/tts/voices')")
code = code.replace("fetch('/api/tts/voices' +", "fetch(getApiUrl('api/tts/voices') +")

with open(app_js_path, 'w', encoding='utf-8', newline='') as f:
    f.write(code)

print("Updated public/app.js with universal getApiUrl routing.")
