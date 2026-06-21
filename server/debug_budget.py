import sys; sys.stdout.reconfigure(encoding='utf-8')
import requests, json
BASE='http://localhost:3001/api'

# Reset
r = requests.get(f'{BASE}/meals')
for m in r.json().get('meals', []):
    mid = m['id']
    requests.delete(f'{BASE}/meals/{mid}')
requests.post(f'{BASE}/goal', json={'goal': 'weight_loss'})

# Add exactly 1800 kcal (TestFood fallback: 100cal/100g, so 1800g = 1800 kcal)
r1 = requests.post(f'{BASE}/meals', json={'foodName': 'TestFood', 'portionGrams': 1800})
db1 = r1.json()['dashboard']
print('After 1800g TestFood:', json.dumps({'consumed': db1['consumed'], 'status': db1['status'], 'justExceeded': db1['justExceeded']}))

# Add 1g more = 1 kcal more -> should cross 1800
r2 = requests.post(f'{BASE}/meals', json={'foodName': 'TestFood', 'portionGrams': 1})
db2 = r2.json()['dashboard']
print('After +1g  TestFood:', json.dumps({'consumed': db2['consumed'], 'status': db2['status'], 'justExceeded': db2['justExceeded']}))
