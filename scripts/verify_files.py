import sys

files = ['public/app.js', 'functions/api/[[path]].js', 'public/index.html']
for p in files:
    try:
        with open(p, 'r', encoding='utf-8') as f:
            code = f.read()
        print(f"File {p}: loaded {len(code)} characters successfully.")
    except Exception as e:
        print(f"Error loading {p}: {e}")
