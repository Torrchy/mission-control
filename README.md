# Mission Control v16.0 — Cleaned & Fixed

## What Changed

### 🔧 **Fixed Recurring Payment Detection**

The old detection logic was too strict and missed a lot of patterns. Here's what's improved:

**Better Merchant Name Matching:**
- Now strips out reference numbers, dates, and common junk from descriptions
- Uses fuzzy matching so "British Gas 12345" and "British Gas 67890" are recognized as the same payee
- Takes the first 30 characters of cleaned names for matching

**More Flexible Amount Matching:**
- Increased tolerance from £2 to £3 (bills can vary slightly)
- Better handles things like pet food that might be £47 one month and £50 the next

**Smarter Day-of-Month Detection:**
- Allows ±3 days for weekends/bank holidays
- Handles month-end dates properly (e.g., 31st → 28th Feb)
- Works with weekly, fortnightly, and monthly patterns

**Example:**
Before: Missed "Tails.com" deliveries because amounts varied by £2-3
After: Detects them as monthly recurring even with slight price changes

---

### 🎨 **Cleaned Up the UI**

**Removed Duplicates:**
- Merged "Direct Debits" and "Subscriptions" into one "Recurring Payments" panel
- Removed duplicate panel definitions from HTML

**Better Visual Hierarchy:**
- Increased spacing and padding throughout
- Made panel headers more prominent
- Improved color contrast on text
- Cleaner heatmap display with better borders

**Simplified Panels:**
- "When You Bleed Cash" instead of generic "Spending Heatmap"
- "Will You Survive?" instead of "Future You"
- More personality, less corporate

**Better Recurring Payments Display:**
- Shows upcoming payments this cycle at the top
- Clear urgency indicators (TODAY, TOMORROW, X days)
- Cleaner layout with better use of space
- Annual cost shown for all patterns

---

### 📊 **What It Does Now**

The recurring payment detector will catch:

1. **Monthly Bills** (e.g., rent, utilities, phone)
   - Must appear at least 2 times
   - Same merchant name (fuzzy matched)
   - Amount within £3
   - Falls on similar day each month (±3 days)

2. **Pet Food Deliveries** (e.g., Tails.com, Zooplus)
   - Detects monthly subscriptions
   - Handles price variations
   - Shows next delivery date

3. **Subscriptions** (e.g., Netflix, Spotify)
   - Any recurring payment with consistent amount
   - Weekly, fortnightly, or monthly

4. **Insurance** (e.g., Animal Friends)
   - Monthly or annual patterns
   - Slight amount variations allowed

---

### 🚀 **How to Use**

1. Replace your existing files with:
   - `index.html` (cleaned up structure)
   - `app.js` (improved detection)
   - `style.css` (better visuals)

2. Upload your bank CSV as usual

3. The recurring payments panel will now show:
   - Total monthly recurring costs
   - Payments coming this cycle (with countdown)
   - Full list of all detected patterns

4. Tag essentials with the 🛡️ button to see survival mode breakdown

---

### 💡 **Tips**

**If something isn't detected:**
- It needs at least 2 occurrences
- Amount must be within £3 of average
- Days between payments must be consistent (±3 days)

**If you see duplicates:**
- Different reference numbers in descriptions might split them
- The fuzzy matching should handle most cases now

**For best results:**
- Import 3+ months of data
- The more history, the better the detection

---

## Files Included

- `index.html` — Cleaned up structure, no duplicates
- `app.js` — v16.0 with improved detection
- `style.css` — Better spacing and visual hierarchy
- `README.md` — This file

Just drop these into your existing Mission Control folder and you're sorted.
