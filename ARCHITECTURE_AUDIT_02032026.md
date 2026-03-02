# MERIDIAN — Architecture Audit
## What Belongs in Supabase vs What Stays in Code
**Date:** 02/03/2026 | **File audited:** index.html (1,741 lines)

---

## YOUR QUESTION — ANSWERED DIRECTLY

> "I want all pages of the clinic web app to be in Supabase.
> The code will only connect all to run... Am I right?"

**Partially right — and it's an important distinction:**

| Layer | Where it lives | Why |
|-------|---------------|-----|
| **CONTENT** — prices, text, feature lists, plan names, add-on descriptions, marketing copy | ✅ **Supabase** | Change without touching code |
| **CONFIGURATION** — WhatsApp number, base prices, plan combinations | ✅ **Supabase** | Change without deployment |
| **DATA** — leads, registrations, settings, vault keys, stats | ✅ **Supabase** | Already there, good |
| **LOGIC** — navigation, calculations, form validation, crypto, WhatsApp integration | ⛔ **Must stay in code** | Cannot run from a database |
| **UI FRAMEWORK** — CSS, screen layouts, HTML structure | ⛔ **Must stay in code** | Browser renders code, not DB rows |
| **YinYang module** | ⛔ **Must stay in code** | You already know this ✓ |

**The right mental model:**
Supabase is the *brain* (data + config + content).
The HTML files are the *body* (structure + logic + rendering).
The code fetches from Supabase on load and renders dynamically.
You change a price in Supabase → every page reflects it immediately. Zero GitHub deploys.

---

## AUDIT RESULTS — index.html

### ✅ ALREADY IN SUPABASE (correct, keep as is)

| Item | Table | Status |
|------|-------|--------|
| Hero stats (95%, 40 cards, 1000+ questions) | `site_stats` | ✅ Live |
| Tier prices / features (Starter/Pro/Unlimited) | `pricing_tiers` | ✅ Built yesterday |
| Registration leads | `meridian_leads` | ✅ Live |
| Vault key hashes | `vault_keys` | ✅ Built today |
| Clinic images | `Supabase Storage` | ✅ Live |
| Settings (clinic, therapist, AI, subscription) | 4 settings tables | ✅ Built yesterday |

---

### 🔴 HARDCODED IN CODE — MUST MOVE TO SUPABASE

#### 1. `app_config` table — Global Configuration
**Currently hardcoded at L1046, L1046, L1163:**
```javascript
const WA = '972505231042'          // L1056 — your WhatsApp number
const base = 18.90                 // L1200 — base price hardcoded in calculation
```
**Fix:** One `app_config` table. Change your WA number or base price once → all pages update.

```sql
-- New table needed:
CREATE TABLE app_config (
  key   text PRIMARY KEY,
  value text,
  label text
);
INSERT INTO app_config VALUES
  ('wa_number',    '972505231042', 'WhatsApp Support Number'),
  ('base_price',   '18.90',       'Base MERIDIAN Price USD'),
  ('trial_days',   '14',          'Free Trial Days'),
  ('crm_url',      'https://avshi2-maker.github.io/.../crm.html', 'CRM URL'),
  ('session_url',  'https://avshi2-maker.github.io/.../session.html', 'Session URL');
```

---

#### 2. `plan_names` table — The 12 Plan Name Combinations
**Currently hardcoded at L1103-L1110:**
```javascript
const PLAN_NAMES = {
  's00':'MERIDIAN Starter',    's10':'Starter + Audio',
  's01':'Starter + Scribe',    's11':'Starter Complete',
  'p00':'MERIDIAN Pro',        'p10':'Pro + Audio',
  // ... 6 more
};
```
**Fix:**
```sql
CREATE TABLE plan_names (
  plan_key  text PRIMARY KEY,  -- 's00', 'p11', 'u10', etc.
  name_he   text,              -- 'MERIDIAN Starter'
  name_en   text,
  badge     text               -- optional badge label
);
-- 12 rows — one per combination
```
Change 'MERIDIAN Starter' to 'MERIDIAN Basis' in Supabase → done everywhere.

---

#### 3. S2 Tier Card Content — Feature Lists
**Currently hardcoded HTML at L614-L655:**
- Standard card: 5 bullet features (L619-L623) — hardcoded Hebrew text
- Custom card: 5 bullet features (L633-L637) — hardcoded
- Group card: 5 bullet features (L647-L651) — hardcoded
- Encyclopedia card: 6 feature bullets (L679-L684) — hardcoded

**Fix:**
```sql
CREATE TABLE tier_features (
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tier_key  text,        -- 'standard', 'custom', 'group', 'encyclopedia'
  feature   text,        -- 'AI קליני בעברית'
  icon      text,        -- optional emoji
  sort_order int
);
```
Code renders the feature list dynamically from this table.
Add/remove/reword features without touching a single line of HTML.

---

#### 4. S2 Tier Card Metadata — Names, Prices, Badges
**Currently hardcoded at L616-L617, L630-L631, L644-L645:**
```html
<div class="tc-nm">MERIDIAN Standard</div>
<div class="tc-pr">$18.90<span>/חודש</span></div>
<!-- and in 2 more places -->
<div class="tc-nm">MERIDIAN Custom</div>
<div class="tc-nm" style="color:#5c2ca8;">MERIDIAN קליניקה</div>
```
**These should come from `pricing_tiers` table** (already built).
The tier card HTML should be rendered by JS from Supabase data — not written by hand.

---

#### 5. S3 Pizza Builder — Prices Hardcoded in HTML
**Currently hardcoded at L734, L739, L744, L761, L786:**
```html
<div class="tp">+$9</div>     <!-- Starter price — L734 -->
<div class="tp">+$25</div>    <!-- Pro price — L739 -->
<div class="tp">+$42</div>    <!-- Unlimited price — L744 -->
<span class="at-pr">+$8</span>  <!-- Audio add-on — L761 -->
<span class="at-pr" id="trans_price_badge">+$21.45</span>  <!-- Trans — L786 -->
```
**Also hardcoded in JS at L1200:**
```javascript
const base = 18.90, tok = T.price, audio = pizza.audio ? 8 : 0
//                                                        ^ hardcoded $8
```
**Fix:** All prices come from `pricing_tiers` and `app_config`. JS reads them, renders them into the pizza builder on load.

---

#### 6. S1 Registration Form — Professional Title Dropdown
**Currently hardcoded at L546-L553:**
```html
<option>מטפל/ת ברפואה סינית</option>
<option>דיקור סיני מוסמך</option>
<option>נטורופת</option>
<option>רופא/ה ורפואה משלימה</option>
<option>מטפל/ת הוליסטי</option>
<option>אחר</option>
```
**Fix:**
```sql
CREATE TABLE professional_titles (
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title_he  text,
  title_en  text,
  active    boolean DEFAULT true,
  sort_order int
);
```
Add a new title → appears in the form. Remove one → gone. No code change.

---

#### 7. Encyclopedia Card Content
**Currently hardcoded at L659-L705 — the entire encyclopedia card:**
- Card title, price ($29.99 crossed out), features, sapir-cm-app.com URL
- All inline-styled, deeply nested HTML

**Fix:** Add `encyclopedia` as a special tier in `pricing_tiers` + `tier_features`.
The sapir-cm-app.com URL goes into `app_config` as `encyclopedia_url`.

---

#### 8. WhatsApp Message Template
**Currently hardcoded at L1136-L1138:**
```javascript
`שלום אבשי! 👋\nאני ${first} ${last}\n${title}...`
```
The greeting "שלום אבשי" and the entire message structure is hardcoded.
**Fix:** `app_config` row `wa_message_template` with `{first}`, `{last}`, `{title}` placeholders.
Change the WA message text from Supabase without touching code.

---

#### 9. S4 Waitlist Benefits List
**Currently hardcoded at L952-L956:**
```html
✅ 14 יום ניסיון חינם עם הפעלה
✅ נעילת מחיר השקה — ללא עליית מחיר
✅ גישה מוקדמת לפני פתיחה לציבור
✅ תמיכה אישית בהתחלה
```
**Fix:**
```sql
CREATE TABLE waitlist_benefits (
  id       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  text_he  text,
  icon     text DEFAULT '✅',
  active   boolean DEFAULT true,
  sort_order int
);
```

---

#### 10. Two Remaining "P3" Internal References
**Still hardcoded at L1492:**
```javascript
'בשלב P3 כאן יהיה חיבור אמיתי ל-Stripe.'
```
This is inside `demoPayment()` — visible to users if they click the payment button.
**Fix:** Remove or replace. Payment is manual/WhatsApp for now.

---

#### 11. Hardcoded CRM / Session URLs (in 4 places)
**L1364, L1372, L1618, L1624:**
```javascript
window.location.href = 'https://avshi2-maker.github.io/New-CM-Clinic-february-2026/crm.html'
window.open('https://avshi2-maker.github.io/.../session.html', '_blank')
```
These appear 4 times. If you rename the repo or move to a custom domain — 4 places to update.
**Fix:** Read `crm_url` and `session_url` from `app_config` on load. One change → all links update.

---

#### 12. Signed Image URLs (Expiring Tokens)
**L36, L358:**
```
supabase.co/storage/v1/object/sign/images/clinickey.png?token=eyJr...
```
Signed URLs **expire**. When they expire, the background image breaks.
**Fix:** Move `clinickey.png` to **public bucket** (no token needed) or store the base path in `app_config` and generate fresh signed URLs via JS on load.

---

### ⛔ MUST STAY IN CODE — DO NOT MOVE TO SUPABASE

| Item | Lines | Why it stays |
|------|-------|-------------|
| `go(id)` navigation | L1123 | Screen routing logic — must be JS |
| `upWA()` / `sendWA()` | L1130-L1169 | Form validation + WA integration |
| `upTable()` | L1198-L1245 | Price calculation engine |
| `confirmPlan()` | L1248 | State management |
| `checkPass()` | L1268 | Password validation |
| `demoLogin()` / `showSuccessModal()` | L1506-L1625 | Auth flow + vault |
| `openSessionWithVault()` | L1608 | Crypto + sessionStorage |
| `animateStat()` | L1688 | UI animation |
| YinYang module | separate file | Complex TCM logic — you confirmed |
| All CSS | L1-L463 | Rendering — must be code |
| HTML screen structure | L464-L1042 | DOM — must be code |
| `crypto.subtle` operations | vault files | Cannot run from DB |
| WhatsApp `window.open` | L1163 | Browser API |

---

## THE FULL TABLE MAP — WHAT EXISTS vs WHAT TO BUILD

### ✅ Already Exists (confirmed)
```
site_stats          → live hero stats
pricing_tiers       → Starter/Pro/Unlimited pricing
meridian_leads      → registrations
vault_keys          → MRD code hashes
clinic_settings     → clinic profile
therapist_profile   → therapist profile
subscription_status → billing info
claude_settings     → AI configuration
condition_safety_index → 40 safety cards (95% coverage)
```

### 🔨 Build Next (in priority order)
```
1. app_config          → WA number, base price, URLs, trial days, WA template
2. plan_names          → 12 plan name combinations
3. tier_features       → feature bullets for each tier card
4. professional_titles → registration form dropdown
5. waitlist_benefits   → S4 benefits list
```

That is **5 new tables** to make index.html fully Supabase-driven.

---

## MIGRATION IMPACT

| Change | Before migration | After migration |
|--------|-----------------|----------------|
| Change WhatsApp number | Edit code, push to GitHub | Update 1 row in Supabase |
| Change base price $18.90 | Edit 4 places in code | Update 1 row in Supabase |
| Add a tier feature | Edit HTML, push to GitHub | Insert 1 row in Supabase |
| Change WA greeting text | Edit code, push to GitHub | Update 1 row in Supabase |
| Remove a professional title | Edit HTML, push to GitHub | Set active=false in Supabase |
| Change CRM URL | Edit 4 lines in code | Update 1 row in Supabase |
| Add waitlist benefit | Edit HTML, push to GitHub | Insert 1 row in Supabase |

**Result: 90% of business changes → zero code deploys.**
**Code only changes when the UI structure or logic changes.**

---

## RECOMMENDED BUILD ORDER (next sessions)

```
Session A (30 min):
  1. CREATE TABLE app_config → seed all values
  2. Update index.html to read WA, base_price, URLs from app_config
  3. Fix signed image URLs → move to public bucket

Session B (45 min):
  4. CREATE TABLE plan_names → seed 12 combinations
  5. CREATE TABLE tier_features → seed all feature bullets
  6. Rebuild S2 tier cards to render from Supabase
  7. Rebuild S3 pizza builder prices from Supabase

Session C (20 min):
  8. CREATE TABLE professional_titles → seed dropdown options
  9. CREATE TABLE waitlist_benefits → seed 4 items
  10. Remove last P3 reference from demoPayment()

Total: ~4-5 hours of focused build work.
After that: index.html is 100% content-driven from Supabase.
```

---

## THE BOTS THAT MESSED YOUR CODE — WHAT THEY DID

Looking at your index.html, the damage patterns are:

1. **Duplicate logic** — `joinWaitlist()` at L1462 references `supabase` (global) but earlier
   code uses `supa` (local). Two different client instances floating around.

2. **Dead code** — `demoPayment()` at L1481 is unreachable (no button calls it).
   The "P3 Stripe" text is inside it — was probably left by a bot that built a payment flow
   that never got wired up.

3. **Mixed `onConflict` formats** — `joinWaitlist()` uses `{onConflict:'email'}` which is
   the old REST format. Other upserts use the correct JS client format. Inconsistent.

4. **`existingLogin()` vs `doExistingLogin()`** — two functions, unclear which is active.
   L1284 defines `existingLogin`, L1347 defines `doExistingLogin`. One calls the other.
   Classic bot handoff pattern — each bot added its own version.

5. **Inline styles everywhere in S2/S3** — Signs of multiple bots styling elements
   differently each time instead of using CSS classes.

**The fix:** Don't let bots touch the existing JS logic. Give them only the HTML template to
render from Supabase data, and keep the calculation/navigation/auth JS frozen.

---

*MERIDIAN · Architecture Audit · 02/03/2026*
*"Data in Supabase. Logic in code. Never the other way around."*
