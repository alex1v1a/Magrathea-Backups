# HEB Session Warming Test Report

**Date:** 2026-02-11
**Script:** `dinner-automation/scripts/heb-cart-session.js`

---

## Test Plan

### Phase 1: Browse (Day 1)
**Goal:** Build initial session trust through category browsing

**Actions:**
1. Visit HEB homepage
2. Wait 5-10 seconds
3. Scroll page like human
4. Browse 3-5 categories (Produce, Meat, Bakery, Dairy, Frozen)
5. View 5-10 products (10-20 seconds each)
6. Save cookies

**Expected:** No CAPTCHA, cookies saved successfully

---

### Phase 2: Search (Day 2)
**Goal:** Build search history

**Actions:**
1. Restore Day 1 cookies
2. Perform 3-5 searches (chicken, pasta, milk, bread, eggs, rice, cheese, apples)
3. View results for 15-30 seconds each
4. Save updated cookies

**Expected:** No CAPTCHA, search history persisted

---

### Phase 3: Cart Test (Day 3)
**Goal:** Test cart operations with warmed session

**Actions:**
1. Restore fully warmed cookies
2. Attempt to add 5 items to cart
3. Monitor for CAPTCHA at each step

**Expected:** Cart additions succeed, no CAPTCHA

---

## Test Execution

```bash
# Run Phase 1
node dinner-automation/scripts/heb-cart-session.js --phase=1

# Run Phase 2 (next day or after delay)
node dinner-automation/scripts/heb-cart-session.js --phase=2

# Run Phase 3 (final test)
node dinner-automation/scripts/heb-cart-session.js --phase=3
```

---

## Results Template

| Phase | Date | Result | CAPTCHA? | Notes |
|-------|------|--------|----------|-------|
| 1 - Browse | | ⬜ Pass / ⬜ Fail | ⬜ Yes / ⬜ No | |
| 2 - Search | | ⬜ Pass / ⬜ Fail | ⬜ Yes / ⬜ No | |
| 3 - Cart | | ⬜ Pass / ⬜ Fail | ⬜ Yes / ⬜ No | |

### Items Successfully Added
1. 
2. 
3. 
4. 
5. 

### Failed Items
1. 
2. 

### CAPTCHA Triggers
- [ ] On homepage
- [ ] During search
- [ ] On cart click
- [ ] After cart click

---

## Conclusion

**Does session warming reduce CAPTCHA triggers?**

⬜ YES - Session warming significantly reduces CAPTCHA
⬜ PARTIAL - Some improvement but CAPTCHA still appears
⬜ NO - CAPTCHA still triggers frequently
⬜ INCONCLUSIVE - Need more testing

### Recommendations

Based on test results:

1. 
2. 
3. 

---

## Same-Day Alternative Test

```bash
node dinner-automation/scripts/heb-cart-session.js --warm-same-day
```

| Approach | Time Required | CAPTCHA Rate | Recommendation |
|----------|---------------|--------------|----------------|
| Multi-day (3 phases) | 3 days | | |
| Same-day | ~8 minutes | | |

