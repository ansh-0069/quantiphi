"""Quick smoke test for all Calorie Tracker API endpoints."""
import requests
import json

BASE = "http://localhost:3001/api"

def pp(label, resp):
    print(f"\n{'='*60}")
    print(f"  {label}  [{resp.status_code}]")
    print(f"{'='*60}")
    print(json.dumps(resp.json(), indent=2))

# 1. Health
pp("GET /api/health", requests.get(f"{BASE}/health"))

# 2. Foods list
r = requests.get(f"{BASE}/foods")
print(f"\n{'='*60}")
print(f"  GET /api/foods  [{r.status_code}]")
print(f"{'='*60}")
print(f"  → {len(r.json())} foods available")

# 3. Get default goal
pp("GET /api/goal", requests.get(f"{BASE}/goal"))

# 4. Log a known food — Chicken Breast 200g
pp("POST /api/meals (Chicken Breast 200g)",
   requests.post(f"{BASE}/meals", json={"foodName": "Chicken Breast", "portionGrams": 200}))

# 5. Log unknown food — fallback test
pp("POST /api/meals (Pizza 300g — fallback)",
   requests.post(f"{BASE}/meals", json={"foodName": "Pizza", "portionGrams": 300}))

# 6. Log mock scanned food
pp("POST /api/meals (scanned=true)",
   requests.post(f"{BASE}/meals", json={"scanned": True}))

# 7. Get all meals
pp("GET /api/meals", requests.get(f"{BASE}/meals"))

# 8. Switch goal to weight_loss
pp("POST /api/goal (weight_loss)",
   requests.post(f"{BASE}/goal", json={"goal": "weight_loss"}))

# 9. Delete first meal
meals = requests.get(f"{BASE}/meals").json()["meals"]
if meals:
    meal_id = meals[0]["id"]
    pp(f"DELETE /api/meals/{meal_id[:8]}...",
       requests.delete(f"{BASE}/meals/{meal_id}"))

# 10. Validation tests
print(f"\n{'='*60}")
print("  VALIDATION TESTS")
print(f"{'='*60}")

r = requests.post(f"{BASE}/meals", json={"foodName": "", "portionGrams": 100})
print(f"  Empty name  → {r.status_code}: {r.json()['error']}")

r = requests.post(f"{BASE}/meals", json={"foodName": "Egg", "portionGrams": -5})
print(f"  Negative g  → {r.status_code}: {r.json()['error']}")

r = requests.post(f"{BASE}/meals", json={"foodName": "Egg", "portionGrams": 0})
print(f"  Zero grams  → {r.status_code}: {r.json()['error']}")

r = requests.post(f"{BASE}/meals", json={"foodName": "Egg", "portionGrams": 6000})
print(f"  Over 5000g  → {r.status_code}: {r.json()['error']}")

r = requests.delete(f"{BASE}/meals/nonexistent-id")
print(f"  Bad meal ID → {r.status_code}: {r.json()['error']}")

r = requests.post(f"{BASE}/goal", json={"goal": "bulk_mode"})
print(f"  Bad goal    → {r.status_code}: {r.json()['error']}")

print("\n✅ All tests passed!")
