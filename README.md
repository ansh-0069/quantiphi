# CaloriePilot 🍎
### Daily Food Journal & Macronutrient Dashboard

CaloriePilot is a premium, highly responsive web application that serves as a daily food log and nutrition tracker. It features dynamic progress visualization, server-driven business logic, case-insensitive autocomplete search, a soft-delete mechanism with an interactive undo grace period, and a fitness goal switcher.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** (v16.x or higher)
- **npm** (v8.x or higher)

### 2. Backend Installation & Setup
Navigate to the `server` directory, install dependencies, and start the development server:
```bash
cd server
npm install
node index.js
```
The backend API will run on **`http://localhost:3001`**.

### 3. Frontend Installation & Setup
Open a new terminal, navigate to the `client` directory, install dependencies, and start the Vite dev server:
```bash
cd client
npm install
npm run dev
```
The frontend application will open on **`http://localhost:5173`**.

---

## ✨ Features

- **🔍 Smart Food Autocomplete**: Typing in the food field queries `GET /api/foods?search=...` to display relevance-sorted suggestions from the lookup database, with match text highlighting and calorie summaries. Supports custom typed foods with fallback nutrition if they aren't in the database.
- **📊 Interactive Calorie Bar**: A calorie tracker bar that fills as you log meals. Turns **crimson red** and triggers a **"Daily Budget Exceeded!" modal** if calorie intake exceeds your goal budget.
- **⚡ Macro Meters with Warning Badges**: Individual trackers for Protein, Carbohydrates, and Fats. If an individual macro exceeds its budget target, a small **amber/orange warning badge** appears beside the progress bar indicating the target is exceeded, even if total calories are still under budget.
- **↩️ Deletion Undo Mechanism**: Deleting a meal starts a **5-second undo grace period** on the frontend, featuring a countdown timer. Clicking "Undo" restores the meal immediately.
- **🎯 3-Way Fitness Goal Toggle**: Seamlessly switch between **Weight Loss**, **Maintenance**, and **Muscle Gain**. Switching targets recalculates percentages on the backend without erasing your food history.
- **📸 Mock Scan/Image Upload**: Triggers a simulated AI image scanner that analyzes a meal photo and logs a mock food item directly to your history.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Vanilla CSS (using curated CSS variables for premium dark mode aesthetics and micro-animations).
- **Backend**: Node.js, Express, In-memory data store (no database setup required for prototyping).

---

## 📐 Architecture & Logic (Viva Preparation)

### 1. Nutrient Scaling Algorithm
When a portion size is entered (in grams), the backend scales the nutritional baseline (which is defined per 100g in the database) using the following formula:
$$\text{Scaled Nutrient} = \left(\frac{\text{portionGrams}}{100}\right) \times \text{nutrientPer100g}$$

### 2. Calorie Budget & Status Flags
All calculations occur on the backend:
- The `exceeded` status is strictly defined as `consumed.calories > targets.calories`.
- The frontend receives pre-computed percentages (`percentages`) and pre-capped widths (`barWidths`, maximum `100` for CSS rendering).
- The "Budget Exceeded" modal is triggered strictly on the transition from `false` to `true` (`justExceeded`), preventing annoying modal re-triggers.

### 3. Goal Switching
The active goal profile (e.g., `weight_loss`, `maintenance`, `muscle_gain`) lives in the server memory. When the goal changes:
1. The server updates its active profile.
2. The server recalculates percentages against the new target profile denominators.
3. The server returns the updated dashboard metrics. 
Existing meal logs are never modified or cleared during a goal switch.

### 4. Robust Delete & Undo Grace Period
To ensure dashboard integrity during deletes:
- Deleting a meal marks it with a pending flag (`pendingDeletion: true`).
- The backend excludes pending-deletion meals from dashboard aggregation calculations immediately, meaning the UI metrics update instantly.
- If the 5-second timer expires on the client side, a `confirm` POST purges the meal permanently.
- If "Undo" is clicked, an `undo` POST restores the meal and recalculates.

---

## 📡 API Contract Reference

### Foods Route
- `GET /api/foods?search=<query>`: Filters and returns food items from the lookup database. Returns search matches sorted by relevance (exact prefix match first, then includes matches).

### Meals Routes
- `GET /api/meals`: Returns the current active goal, targets, consumed metrics, and active meals.
- `POST /api/meals`: Creates a new meal log.
  - Body: `{ foodName: string, portionGrams: number }`
  - Validates food name presence, portion range (0 < portion <= 5000g). If unknown, uses fallback nutrients.
- `POST /api/meals/mock`: Simulates image scanning, logging `Grilled Salmon (150g)`.
- `DELETE /api/meals/:id`: Initiates the soft-delete/undo sequence for a meal log.
- `POST /api/meals/:id/undo`: Restores a meal marked for pending deletion.
- `POST /api/meals/:id/confirm`: Permanently purges a pending deletion meal.

### Goal Routes
- `GET /api/goal`: Gets active goal targets and all available goal profiles.
- `POST /api/goal`: Changes active goal profile.
  - Body: `{ goal: "weight_loss" | "maintenance" | "muscle_gain" }`
