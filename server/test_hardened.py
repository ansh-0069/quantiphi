"""
Edge-case hardening test suite for CaloriePilot API.
Run: python test_hardened.py
"""
import sys
import requests
import json
from datetime import datetime
sys.stdout.reconfigure(encoding='utf-8')

BASE = "http://localhost:3001/api"
PASS = 0
FAIL = 0

def check(label, condition, actual=None):
    global PASS, FAIL
    if condition:
        print(f"  ✅ {label}")
        PASS += 1
    else:
        print(f"  ❌ {label}")
        if actual is not None:
            print(f"     Got: {json.dumps(actual, indent=2)[:200]}")
        FAIL += 1

def post_meal(body):
    return requests.post(f"{BASE}/meals", json=body)

def clear_meals():
    """Delete all current meals and reset transition state."""
    r = requests.get(f"{BASE}/meals")
    for m in r.json().get("meals", []):
        mid = m["id"]
        requests.delete(f"{BASE}/meals/{mid}")
    # Toggle goal to reset previouslyExceeded in budgetTracker
    current = requests.get(f"{BASE}/goal").json()["activeGoal"]["id"]
    alt = "weight_loss" if current != "weight_loss" else "maintenance"
    requests.post(f"{BASE}/goal", json={"goal": alt})
    requests.post(f"{BASE}/goal", json={"goal": current})

print("\n" + "="*60)
print("  FOOD LOGGING VALIDATION")
print("="*60)

clear_meals()

# 1. Empty food name
r = post_meal({"foodName": "", "portionGrams": 100})
check("Empty foodName → 400", r.status_code == 400)

# 2. Whitespace-only food name
r = post_meal({"foodName": "   ", "portionGrams": 100})
check("Whitespace-only foodName → 400", r.status_code == 400)

# 3. Missing food name
r = post_meal({"portionGrams": 100})
check("Missing foodName → 400", r.status_code == 400)

# 4. Case-insensitive lookup — "chicken breast" should match "Chicken Breast"
r = post_meal({"foodName": "chicken breast", "portionGrams": 100})
check("Case-insensitive lookup (chicken breast)", r.status_code == 201)
if r.status_code == 201:
    meal = r.json()["newMeal"]
    check("  Matched real DB entry (calories=165)", meal["calories"] == 165.0, meal)
clear_meals()

# 5. Unknown food → fallback (not 404, not crash)
r = post_meal({"foodName": "Unicorn Steak", "portionGrams": 100})
check("Unknown food → 201 with fallback", r.status_code == 201)
if r.status_code == 201:
    meal = r.json()["newMeal"]
    check("  Fallback calories = 100 per 100g", meal["calories"] == 100.0, meal)
    check("  Fallback protein  = 3 per 100g",   meal["protein"]  == 3.0,   meal)
    check("  Fallback carbs    = 20 per 100g",  meal["carbs"]    == 20.0,  meal)
    check("  Fallback fats     = 2 per 100g",   meal["fats"]     == 2.0,   meal)
clear_meals()

# 5b. Custom food creation → searchable immediately and usable for logging
r = requests.post(
    f"{BASE}/foods",
    json={
        "name": "Vibe Bowl",
        "caloriesPer100g": 210,
        "proteinPer100g": 11,
        "carbsPer100g": 19,
        "fatsPer100g": 9,
    },
)
check("Custom food creation → 201", r.status_code == 201, r.json() if r.status_code != 201 else None)
if r.status_code == 201:
    created = r.json()["food"]
    check("  Custom food id generated", created["id"] == "vibe_bowl", created)
    search = requests.get(f"{BASE}/foods", params={"search": "Vibe"})
    check("  Custom food searchable immediately", any(item["id"] == "vibe_bowl" for item in search.json()), search.json())
    meal = post_meal({"foodName": "Vibe Bowl", "portionGrams": 100}).json()["newMeal"]
    check("  Custom food logs with exact calories", meal["calories"] == 210.0, meal)
clear_meals()

# 6. Zero grams
r = post_meal({"foodName": "Egg", "portionGrams": 0})
check("Zero portionGrams → 400", r.status_code == 400)

# 7. Negative grams
r = post_meal({"foodName": "Egg", "portionGrams": -50})
check("Negative portionGrams → 400", r.status_code == 400)

# 8. Missing grams
r = post_meal({"foodName": "Egg"})
check("Missing portionGrams → 400", r.status_code == 400)

# 9. String grams (raw API call)
r = post_meal({"foodName": "Egg", "portionGrams": "abc"})
check("String portionGrams → 400", r.status_code == 400)

# 10. NaN grams (if client sends it as JSON null or not-a-number)
# JSON doesn't have NaN natively, but we can test None→null
r = post_meal({"foodName": "Egg", "portionGrams": None})
check("null portionGrams → 400", r.status_code == 400)

# 11. Decimal grams allowed
r = post_meal({"foodName": "Egg", "portionGrams": 150.5})
check("Decimal grams (150.5) → 201", r.status_code == 201)
clear_meals()

# 12. Max cap 5000g
r = post_meal({"foodName": "Egg", "portionGrams": 5001})
check("5001g → 400 (over cap)", r.status_code == 400)

r = post_meal({"foodName": "Egg", "portionGrams": 5000})
check("5000g exactly → 201 (at cap)", r.status_code == 201)
clear_meals()

print("\n" + "="*60)
print("  MOCK IMAGE SCAN")
print("="*60)

# 13. Scan uses real nutrition (Grilled Salmon should be in DB now)
r = post_meal({"scanned": True})
check("Scanned → 201", r.status_code == 201)
if r.status_code == 201:
    meal = r.json()["newMeal"]
    check("  Scan food name = 'Grilled Salmon'", meal["foodName"] == "Grilled Salmon", meal)
    check("  Scan NOT using fallback calories (≠100)", meal["calories"] != 15.0, meal)
    check("  Scan calories for 150g Grilled Salmon = 292.5", meal["calories"] == 292.5, meal)
clear_meals()

# 14. Double scan → two separate meals
r1 = post_meal({"scanned": True})
r2 = post_meal({"scanned": True})
r3 = requests.get(f"{BASE}/meals")
check("Double scan → 2 meals in history", len(r3.json()["meals"]) == 2)
clear_meals()

print("\n" + "="*60)
print("  BUDGET & STATUS LOGIC")
print("="*60)

clear_meals()
requests.post(f"{BASE}/goal", json={"goal": "maintenance"})   # reset transition state
requests.post(f"{BASE}/goal", json={"goal": "weight_loss"})   # target: 1800 kcal

# 15. Zero meals → 0% bars, status ok
r = requests.get(f"{BASE}/meals")
db = r.json()
check("Zero meals → status ok",            db["status"] == "ok")
check("Zero meals → 0% calories",          db["percentages"]["calories"] == 0.0)
check("Zero meals → 0% protein",           db["percentages"]["protein"] == 0.0)

# 16. Exactly at target → ok (not exceeded), strict >
# Weight loss target = 1800 kcal. Add 1800 kcal via Almonds (579/100g → 310.4g for 1800)
# Easier: use fallback food at 100cal/100g → add 1800g portions
# But 1800g > 5000? No. Let's use Oats: 389cal/100g
# We need exactly 1800 cal. Use fallback: 100cal/100g → 1800g is within 5000 cap.
r = post_meal({"foodName": "TestFood", "portionGrams": 1800})
db = r.json()["dashboard"]
check("Exactly 1800 kcal (target) → ok, not exceeded",
      db["status"] == "ok" and db["consumed"]["calories"] == 1800.0, db["consumed"])
check("justExceeded = false at exact target", db["justExceeded"] == False)
clear_meals()

# 17. One calorie over → exceeded
r1 = post_meal({"foodName": "TestFood", "portionGrams": 1800})
r2 = post_meal({"foodName": "TestFood", "portionGrams": 1})   # +1 kcal (fallback: 100cal/100g = 1 cal per g)
db = r2.json()["dashboard"]
check("1 kcal over target → exceeded",    db["status"] == "exceeded")
check("justExceeded = true on first cross", db["justExceeded"] == True)

# 18. Add more while over → justExceeded stays false
r3 = post_meal({"foodName": "TestFood", "portionGrams": 10})
db = r3.json()["dashboard"]
check("Already exceeded + new log → justExceeded = false (no modal repeat)", db["justExceeded"] == False)

# 19. Delete back under → status flips to ok
all_meals = db["meals"]
# Delete the last item (10g)
last_id = all_meals[-1]["id"]
rd = requests.delete(f"{BASE}/meals/{last_id}")
# Delete the 1g overage item
second_last_id = rd.json()["dashboard"]["meals"][-1]["id"]
rd2 = requests.delete(f"{BASE}/meals/{second_last_id}")
db_after = rd2.json()["dashboard"]
check("Delete back under budget → status ok",    db_after["status"] == "ok")
check("Delete back under → consumed = 1800",     db_after["consumed"]["calories"] == 1800.0)

# 20. Re-cross threshold → justExceeded fires again
r_recap = post_meal({"foodName": "TestFood", "portionGrams": 1})
db_recap = r_recap.json()["dashboard"]
check("Re-cross threshold after going under → justExceeded = true again", db_recap["justExceeded"] == True)
clear_meals()

print("\n" + "="*60)
print("  MACRO BARS")
print("="*60)

requests.post(f"{BASE}/goal", json={"goal": "maintenance"})  # protein target = 130g
# Log 300g chicken breast → protein = 300/100 * 31 = 93g ... need more
# For >130g protein: 500g chicken = 155g protein
r = post_meal({"foodName": "Chicken Breast", "portionGrams": 500})
db = r.json()["dashboard"]
protein_pct = db["percentages"]["protein"]
protein_bar = db["barWidths"]["protein"]
check(f"Protein > 100% ({protein_pct}%): barWidth capped at 100", protein_bar == 100.0 and protein_pct > 100)
clear_meals()

print("\n" + "="*60)
print("  DELETE LOGIC")
print("="*60)

# 21. Delete non-existent ID → 404
r = requests.delete(f"{BASE}/meals/does-not-exist")
check("Delete non-existent ID → 404", r.status_code == 404)

# 22. Delete last item → clean zero state
r = post_meal({"foodName": "Apple", "portionGrams": 100})
meal_id = r.json()["newMeal"]["id"]
rd = requests.delete(f"{BASE}/meals/{meal_id}")
db = rd.json()["dashboard"]
check("Delete last item → 0 meals",              len(db["meals"]) == 0)
check("Delete last item → 0 calories consumed",  db["consumed"]["calories"] == 0.0)
check("Delete last item → status ok",            db["status"] == "ok")

print("\n" + "="*60)
print("  GOAL TOGGLE")
print("="*60)

clear_meals()
# Log some food first
post_meal({"foodName": "Oats", "portionGrams": 200})
base_meals = requests.get(f"{BASE}/meals").json()["meals"]
meal_count = len(base_meals)

# 23. Goal switch does NOT clear meals
r = requests.post(f"{BASE}/goal", json={"goal": "weight_loss"})
db = r.json()["dashboard"]
check("Goal switch → meals intact", len(db["meals"]) == meal_count)

r = requests.post(f"{BASE}/goal", json={"goal": "muscle_gain"})
db = r.json()["dashboard"]
check("Goal switch (again) → meals still intact", len(db["meals"]) == meal_count)

# 24. Same-goal switch is no-op (doesn't reset exceeded state)
requests.post(f"{BASE}/goal", json={"goal": "weight_loss"})
# Get exceeded state: oats 200g = 778 kcal, weight loss target = 1800, not exceeded
# Add more food to exceed weight_loss
post_meal({"foodName": "TestFood", "portionGrams": 1800})  # +1800 kcal → total > 1800
r_exceed = post_meal({"foodName": "TestFood", "portionGrams": 1})
db_exceed = r_exceed.json()["dashboard"]
check("Setup: now exceeded", db_exceed["status"] == "exceeded")

r_same = requests.post(f"{BASE}/goal", json={"goal": "weight_loss"})  # same goal
db_same = r_same.json()["dashboard"]
check("Same-goal no-op → justExceeded = false (no re-trigger)", db_same["justExceeded"] == False)
check("Same-goal no-op → status still exceeded",                 db_same["status"] == "exceeded")

# 25. Rapid switching preserves meals
for goal in ["weight_loss", "maintenance", "muscle_gain", "weight_loss", "maintenance"]:
    requests.post(f"{BASE}/goal", json={"goal": goal})
final = requests.get(f"{BASE}/meals").json()
check("Rapid goal switching → meals still intact", len(final["meals"]) == meal_count + 2)
clear_meals()

print("\n" + "="*60)
print("  API ROBUSTNESS")
print("="*60)

# 26. Completely missing body
r = requests.post(f"{BASE}/meals", json={})
check("Empty body → 400", r.status_code == 400)

# 27. Invalid goal name
r = requests.post(f"{BASE}/goal", json={"goal": "keto_blast"})
check("Invalid goal name → 400", r.status_code == 400)

# 28. Missing goal field
r = requests.post(f"{BASE}/goal", json={})
check("Missing goal field → 400", r.status_code == 400)

# 29. Precision: all values 1 dp
r = post_meal({"foodName": "Egg", "portionGrams": 33})
meal = r.json()["newMeal"]
def is_1dp(v):
    return isinstance(v, (int, float)) and round(v, 1) == v
check("All meal values are 1dp",
      all(is_1dp(meal[k]) for k in ["calories", "protein", "carbs", "fats"]))
clear_meals()

print("\n" + "="*60)
print("  WEEKLY HISTORY SNAPSHOT")
print("="*60)

clear_meals()
post_meal({"foodName": "Apple", "portionGrams": 100})
dashboard = requests.get(f"{BASE}/meals").json()
history = requests.get(f"{BASE}/history/week").json()["history"]
today = datetime.now().strftime("%Y-%m-%d")
today_entry = next((item for item in history if item["date"] == today), None)
check("History endpoint → 7 entries", len(history) == 7, history)
check("History endpoint → today's date present", today_entry is not None, history)
if today_entry is not None:
    check("History endpoint → today's calories match dashboard", today_entry["calories"] == dashboard["consumed"]["calories"], today_entry)
clear_meals()

print("\n" + "="*60)
print(f"  RESULTS: {PASS} passed, {FAIL} failed")
print("="*60 + "\n")
sys.exit(0 if FAIL == 0 else 1)
