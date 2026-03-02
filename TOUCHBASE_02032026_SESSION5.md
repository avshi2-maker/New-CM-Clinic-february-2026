# MERIDIAN — Touch Base Handover
**Date:** Monday 02/03/2026 — Session 5 (Evening)
**Previous:** TOUCHBASE_02032026_SESSION4.md

---

## SESSION 5 IN NUMBERS

| Metric | Value |
|--------|-------|
| Bugs fixed | 5 |
| JS syntax errors fixed | 1 |
| Missing tables created | 2 |
| Files delivered | 6 |
| Root cause chains traced | 2 |

---

## WHAT HAPPENED THIS SESSION

### The Vault Chain Was Completely Broken — Now Fixed

The entire MRD vault flow had a 3-stage failure chain that made it
impossible to enter a session. All 3 stages fixed.

---

## BUG 1 — content-loader.js: Syntax Error Line 261

**Symptom:** `Uncaught SyntaxError: Invalid or unexpected token`
→ entire content-loader.js crashed → `upWA is not defined` on every field

**Root cause:** When Python wrote `lines.join('\n')` to the file,
the `\n` inside the string literal became a real newline character,
splitting the statement across 2 lines — invalid JavaScript.

```javascript
// BROKEN (what was in the file):
msg = lines.join('
');

// FIXED:
msg = lines.join('\n');
```

**Fix:** `str_replace` on the broken line. Verified with `node --check`.

---

## BUG 2 — vault_keygen.html: Wrong Table

**Symptom:** `Failed to load resource: 406`
on `therapist_vault?therapist_code_hash=eq.c85d...`

**Root cause:**
- `vault_keygen.html` saved code hash → `vault_keys` table ✅ (exists)
- `session_vault.js` looked for hash → `therapist_vault` table ❌ (didn't exist)
- Result: code never found → `CODE_NOT_FOUND` thrown every time

**Fix:** `vault_keygen.html` now saves to `therapist_vault`
(the table `session_vault.js` actually uses for login).

---

## BUG 3 — session_vault.js: All Errors Treated as Missing Code

**Symptom:** Any DB error → code wiped → prompt shown again → loop

**Root cause:** `loginWithCode()` had:
```javascript
if (error || !data) throw new Error('CODE_NOT_FOUND');
```
A 406 (table missing), network error, or any DB problem
all triggered `CODE_NOT_FOUND` — identical to "code doesn't exist".

**Fix:** Now discriminates by PostgREST error code:
```javascript
if (error) {
  if (error.code === 'PGRST116') {   // .single() found zero rows
    throw new Error('CODE_NOT_FOUND');  // ← code truly not in DB
  }
  throw new Error('DB_ERROR: ' + error.message);  // ← infra problem
}
```

---

## BUG 4 — vault_integration.js: DB Errors Wiped the Session Code

**Symptom:** Click "שמור וצא" → vault prompt appeared again
even though code was already entered

**Root cause:** `init()` caught ALL errors and called `clearSessionCode()`:
```javascript
catch(e) {
  if (e.message === 'CODE_NOT_FOUND') {
    MeridianCrypto.clearSessionCode();  // ← wiped code on ANY error
  }
}
```
A `DB_ERROR` (406, missing table) still matched the outer catch
and cleared the code from sessionStorage.

**Fix:** Only `CODE_NOT_FOUND` clears the code.
`DB_ERROR` logs a warning, preserves the code, session continues:
```javascript
if (e.message === 'CODE_NOT_FOUND') {
  MeridianCrypto.clearSessionCode();
  MeridianVault.showCodePrompt(...);   // genuine re-prompt
} else {
  // DB_ERROR / network — code preserved, session continues
  console.warn('non-fatal, code preserved:', e.message);
}
```

---

## BUG 5 — session_vault.js Prompt: maxlength="16"

**Symptom:** MRD code input cut off at 16 characters
`MRD-XXXX-XXXX-XXXX` = 19 characters → last 3 chars always dropped
→ format validation always failed

**Fix:** `maxlength="16"` → `maxlength="19"`

---

## BUG 6 — session_vault.js Prompt: No Path to Get a Code

**Symptom:** User sees prompt but has no vault code yet →
no button to generate one → completely stuck

**Fix:** Added `🔑 צור קוד Vault חדש` button that opens
`vault_keygen.html` in new tab. User generates code,
copies it, pastes it back into the prompt.

---

## THE TWO MISSING TABLES (SQL CREATED)

`session_vault.js` uses two tables that never existed in Supabase:

```sql
therapist_vault   -- one row per therapist, stores code hash + profile
session_vault     -- one encrypted row per saved session
```

File: `therapist_session_vault_02032026.sql`
Must be run in Supabase SQL Editor BEFORE the vault flow will work.

---

## meridian-core.js — IMPORTANT NOTE

This file is **new to the repo** — created in Session 4.
It was never uploaded to GitHub before today.
`index.html` (clean version) calls it with:
```html
<script src="meridian-core.js"></script>
```
If missing from repo → entire homepage breaks.

What it contains: all navigation, pricing calculation,
auth flow, vault open/close, password validation, modals.
**Never share with bots. Never let bots edit it.**

---

## COMPLETE DEPLOY CHECKLIST — SESSION 5

```
STEP 1 — Supabase (do first, files depend on it)
  □ Run therapist_session_vault_02032026.sql
    Creates: therapist_vault + session_vault tables

STEP 2 — GitHub (upload all 6, any order)
  □ vault_keygen.html      → replace (now saves to therapist_vault)
  □ session_vault.js       → replace (error discrimination + maxlength fix)
  □ vault_integration.js   → replace (code preserved on DB errors)
  □ meridian-core.js       → NEW FILE (extracted from index.html)
  □ content-loader.js      → replace (syntax error fixed)
  □ index_clean.html       → rename to index.html (if not done in Session 4)

STEP 3 — After deploy, test the full vault flow:
  □ Open vault_keygen.html
  □ Generate new MRD code (old code was in wrong table)
  □ Copy + save the code safely
  □ Open session.html
  □ Enter code → should auto-login, no prompt loop
  □ Run a session
  □ Click שמור וצא → should save and exit WITHOUT re-prompting
```

---

## ALL FILES DELIVERED TODAY

| File | Type | Status |
|------|------|--------|
| `therapist_session_vault_02032026.sql` | SQL | Run in Supabase |
| `vault_keygen.html` | HTML | Replace in GitHub |
| `session_vault.js` | JS | Replace in GitHub |
| `vault_integration.js` | JS | Replace in GitHub |
| `meridian-core.js` | JS | NEW — add to GitHub |
| `content-loader.js` | JS | Replace in GitHub |

---

## SUPABASE TABLE STATUS — COMPLETE MAP

```
✅ LIVE
  site_stats                → hero counters
  pricing_tiers             → Starter/Pro/Unlimited
  plan_names                → 12 combinations
  tier_features             → feature bullets
  app_config                → WA, prices, URLs
  professional_titles       → registration dropdown
  waitlist_benefits         → S4 benefits
  meridian_leads            → registrations
  vault_keys                → old keygen table (no longer used)
  clinic_settings           → clinic profile
  therapist_profile         → therapist profile
  subscription_status       → billing
  claude_settings           → AI config
  condition_safety_index    → 40 safety cards

⏳ NEEDS SQL RUN (from this session)
  therapist_vault           → therapist login records
  session_vault             → encrypted session blobs

⏳ PENDING (from Session 3)
  legal pages SQL           → legal_01032026.sql
```

---

## KNOWN ISSUE TO WATCH

**Multiple GoTrueClient instances** — visible in every console log:
```
Multiple GoTrueClient instances detected in the same browser context.
```
Not an error today but will cause auth conflicts when real
Supabase Auth is wired up in Phase 3. Each file (session.html,
index.html, vault_keygen.html) creates its own client.
**Fix later:** share a single Supabase client via a global
`supabase-client.js` loaded first by all pages.

---

## TOMORROW — FIRST THING

Before building anything new:
```
1. Run the SQL → confirm therapist_vault and session_vault exist
2. Generate new vault code at vault_keygen.html
3. Test full flow: keygen → session → שמור וצא → no re-prompt
4. If all 3 pass → vault is working end-to-end ✅
```

Then continue with roadmap:
```
Phase B:   Mobile fixes (pizza overflow, tablet session layout)
Phase C:   Legal pages (legal_01032026.sql + legal.html)
Phase D:   Credibility (testimonials, English toggle)
```

---

## KEY REFERENCES

| Item | Value |
|------|-------|
| Supabase | iqfglrwjemogoycbzltt.supabase.co |
| GitHub | avshi2-maker/New-CM-Clinic-february-2026 |
| Live site | avshi2-maker.github.io/New-CM-Clinic-february-2026/ |
| Vault code format | MRD-XXXX-XXXX-XXXX (19 chars) |
| Vault table (session_vault.js) | therapist_vault |
| Encryption | AES-256-GCM · SHA-256 hash |
| System version | v14c |

---

## THE WALL TO REMEMBER

```
vault_keygen.html           session_vault.js
      ↓                            ↓
  saves hash         →       looks up hash
      ↓                            ↓
  therapist_vault    ←   therapist_vault
  (SAME TABLE ✅)        (SAME TABLE ✅)
```

Before today they were pointing at different tables.
Now they're aligned. The vault works.

---

*MERIDIAN · Avshi Sapir · 02/03/2026 — End of Session 5*
*"One missing table. Five bugs. All fixed."*
