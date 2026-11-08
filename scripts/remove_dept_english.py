with open('public/app.js', 'r', encoding='utf-8') as f:
    c = f.read()
c = c.replace("department of English maintains", "Department of Languages maintains")
with open('public/app.js', 'w', encoding='utf-8') as f:
    f.write(c)
print('English department mention purged from app.js!')
