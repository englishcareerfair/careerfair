import os
import re
import sys

def check_brackets(filepath):
    """Checks for balanced braces, brackets, and parentheses in a JS file, handling ES6 template literals and regex."""
    with open(filepath, 'r', encoding='utf-8') as f:
        code = f.read()

    i = 0
    n = len(code)
    stack = []
    line = 1
    col = 1
    context_stack = ['CODE']

    def advance(cnt=1):
        nonlocal i, line, col
        for _ in range(cnt):
            if i < n:
                if code[i] == '\n':
                    line += 1
                    col = 1
                else:
                    col += 1
                i += 1

    def prev_token():
        idx = i - 1
        while idx >= 0 and code[idx] in ' \t\r\n':
            idx -= 1
        if idx < 0:
            return ''
        end_idx = idx
        if code[idx] in '()[]{};,?:=+-*%&|^!~<>':
            if idx > 0 and code[idx-1:idx+1] in ('=>', '==', '!=', '<=', '>=', '&&', '||', '++', '--'):
                return code[idx-1:idx+1]
            return code[idx]
        while idx >= 0 and (code[idx].isalnum() or code[idx] in '_$'):
            idx -= 1
        return code[idx+1:end_idx+1]

    while i < n:
        ctx = context_stack[-1]
        ch = code[i]

        if ctx == 'TEMPLATE':
            if ch == '\\':
                advance(2)
            elif ch == '$' and i + 1 < n and code[i+1] == '{':
                stack.append(('{', line, col, True))
                context_stack.append('CODE')
                advance(2)
            elif ch == '`':
                context_stack.pop()
                advance(1)
            else:
                advance(1)
        else: # CODE
            if ch == '/' and i + 1 < n and code[i+1] == '/':
                while i < n and code[i] != '\n':
                    advance(1)
            elif ch == '/' and i + 1 < n and code[i+1] == '*':
                advance(2)
                while i < n:
                    if code[i] == '*' and i + 1 < n and code[i+1] == '/':
                        advance(2)
                        break
                    advance(1)
            elif ch in ('"', "'"):
                quote = ch
                advance(1)
                while i < n and code[i] != quote:
                    if code[i] == '\\':
                        advance(2)
                    elif code[i] == '\n':
                        advance(1)
                    else:
                        advance(1)
                if i < n and code[i] == quote:
                    advance(1)
            elif ch == '`':
                context_stack.append('TEMPLATE')
                advance(1)
            elif ch == '/':
                pt = prev_token()
                is_regex = (pt in ('', '(', '[', '{', ';', ',', ':', '?', '=', '!', '+', '-', '*', '%', '&', '|', '^', '~', '<', '>', '=>', '==', '!=', '<=', '>=', '&&', '||', 'return', 'case', 'delete', 'throw', 'void', 'typeof', 'instanceof', 'new', 'in', 'of', 'yield', 'await'))
                if is_regex:
                    advance(1)
                    in_char_class = False
                    while i < n:
                        c = code[i]
                        if c == '\\':
                            advance(2)
                        elif c == '[' and not in_char_class:
                            in_char_class = True
                            advance(1)
                        elif c == ']' and in_char_class:
                            in_char_class = False
                            advance(1)
                        elif c == '/' and not in_char_class:
                            advance(1)
                            break
                        elif c == '\n':
                            break
                        else:
                            advance(1)
                else:
                    advance(1)
            elif ch in '({[':
                stack.append((ch, line, col, False))
                advance(1)
            elif ch in ')}]':
                if not stack:
                    return False, f"Extra closing '{ch}' at line {line}:{col}"
                top, tline, tcol, is_expr = stack.pop()
                expected = {')':'(', '}':'{', ']':'['}[ch]
                if top != expected:
                    return False, f"Mismatched bracket: expected '{expected}' matching line {tline}:{tcol}, got '{ch}' at line {line}:{col}"
                if is_expr and ch == '}':
                    context_stack.pop()
                advance(1)
            else:
                advance(1)

    if stack:
        top, tline, tcol, is_expr = stack[-1]
        return False, f"Unclosed '{top}' opened at line {tline}:{tcol}"
    return True, "All brackets and braces perfectly balanced"

def verify_html_linkages():
    """Verifies that all script tags and key DOM elements in index.html match JS references."""
    with open('careerfair/public/index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    required_scripts = [
        'jspdf.umd.min.js',
        'tesseract.min.js',
        'confetti.browser.min.js',
        'dopamine-engine.js',
        'game-completion-detector.js',
        'dossier-pdf.js',
        'guide-avatar.js',
        'app.js'
    ]
    for s in required_scripts:
        assert s in html, f"Missing script tag for {s} in index.html"
        print(f"[OK] Script tag verified: {s}")

    required_dom_ids = [
        'btn-greeting',
        'btn-header-dossier',
        'admin-view-keys',
        'admin-view-telemetry',
        'admin-keys-table-body',
        'admin-telemetry-table-body',
        'admin-issues-container',
        'btn-generate-api-key',
        'admin-rclone-remote',
        'admin-rclone-endpoint',
        'tos-pp-modal',
        'btn-agree-tos'
    ]
    for dom_id in required_dom_ids:
        assert f'id="{dom_id}"' in html, f"Missing DOM element #{dom_id} in index.html"
        print(f"[OK] DOM ID verified: #{dom_id}")

def verify_api_router():
    """Verifies routes and database queries in functions/api/[[path]].js."""
    with open('careerfair/functions/api/[[path]].js', 'r', encoding='utf-8') as f:
        code = f.read()

    required_routes = [
        '/leaderboard',
        '/admin/keys',
        '/admin/keys/revoke',
        '/telemetry/session',
        '/admin/telemetry',
        '/user-issues',
        '/admin/issues',
        '/admin/telemetry/resolve',
        '/ml/detect-human'
    ]
    for r in required_routes:
        assert f"path === '{r}'" in code or f"path === \"{r}\"" in code, f"Missing route {r} in [[path]].js"
        print(f"[OK] API Route verified: {r}")

    required_tables = [
        'CREATE TABLE IF NOT EXISTS api_keys',
        'CREATE TABLE IF NOT EXISTS telemetry_sessions',
        'CREATE TABLE IF NOT EXISTS user_issues'
    ]
    for t in required_tables:
        assert t in code, f"Missing table creation query: {t}"
        print(f"[OK] Table schema verified: {t}")

def main():
    print("=== ENGLISH CAREERS FORUM 2026 DEEP VERIFICATION SUITE ===")
    
    js_files = [
        'careerfair/public/guide-avatar.js',
        'careerfair/public/game-completion-detector.js',
        'careerfair/public/dossier-pdf.js',
        'careerfair/public/dopamine-engine.js',
        'careerfair/public/app.js',
        'careerfair/functions/api/[[path]].js'
    ]

    for js in js_files:
        ok, msg = check_brackets(js)
        if ok:
            print(f"[OK] {js}: {msg}")
        else:
            print(f"[FAIL] {js}: {msg}")
            sys.exit(1)

    verify_html_linkages()
    verify_api_router()
    print("=== ALL DEEP VERIFICATION CHECKS PASSED SUCCESSFULLY ===")

if __name__ == '__main__':
    main()
