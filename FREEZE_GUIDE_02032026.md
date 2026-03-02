# THE MERIDIAN FREEZE GUIDE
## How to Protect Your Core Logic from AI Bots
**02/03/2026 — Read this before every session**

---

## THE SIMPLE ANSWER

> "How do I freeze the JS?"

**Split one file into two files. Show bots only one of them.**

```
BEFORE (broken):           AFTER (protected):
─────────────────          ──────────────────────────────────────
index.html                 index.html          ← HTML shell only
  ├── ALL HTML             meridian-core.js    ← FROZEN. Never share.
  ├── ALL CSS              content-loader.js   ← bots work here only
  └── ALL JS (mixed)
```

---

## THE THREE FILES

### File 1 — `index.html`
**What it contains:** HTML structure, CSS, screen layouts
**What it does NOT contain:** Any JavaScript at all
**How bots use it:** They see the HTML template and add `id=` hooks for data injection
**Risk level:** LOW — HTML changes are visual only, can't break logic

### File 2 — `meridian-core.js` 🔒 FROZEN
**What it contains:** All navigation, calculation, auth, vault, password logic
**Who may edit it:** Only you, manually, when intentional
**How bots use it:** They DON'T. Never paste this in an AI chat.
**Risk level:** ZERO if never shared

### File 3 — `content-loader.js` ✅ BOT ZONE
**What it contains:** Only Supabase fetch calls + DOM injection
**Who may edit it:** Bots, freely
**How bots use it:** Add new `loadXxx()` functions to fetch new tables
**Risk level:** LOW — if this breaks, page shows fallback values, nothing crashes

---

## THE HTML CHANGES NEEDED (one-time)

The only thing to change in `index.html` — remove the `<script>` block entirely
and replace with two `<script src=>` tags:

```html
<!-- REMOVE this entire block: -->
<script>
  const SUPA_URL = '...'
  const TIERS = { ... }
  function go(id) { ... }
  function upTable() { ... }
  // ... 695 lines ...
</script>

<!-- REPLACE WITH these two lines: -->
<script src="meridian-core.js"></script>
<script src="content-loader.js"></script>
```

That's the entire change to index.html.
Everything else stays exactly as it is.

---

## HOW TO ADD ID HOOKS TO HTML (for Supabase data injection)

When content-loader.js needs to inject data into the page, it looks for elements
by `id`. You add those ids to the HTML. Example:

**Before (hardcoded):**
```html
<div class="tc-feats">
  <div>AI קליני בעברית</div>
  <div>5 מפגשים ביום</div>
  <div>1,000+ שאלות TCM</div>
</div>
```

**After (injectable):**
```html
<div class="tc-feats" id="tc-feats-standard">
  <!-- populated from Supabase tier_features table -->
  <div>AI קליני בעברית</div>
  <div>5 מפגשים ביום</div>
  <div>1,000+ שאלות TCM</div>
</div>
```

The fallback HTML stays inside the div.
If Supabase loads → content-loader.js overwrites it with live data.
If Supabase fails → the hardcoded fallback shows. Never breaks.

**ID hooks already wired in content-loader.js:**

| ID                         | What gets injected            | Source table         |
|---------------------------|-------------------------------|----------------------|
| `tc-feats-standard`       | Standard tier feature list    | `tier_features`      |
| `tc-feats-custom`         | Custom tier feature list      | `tier_features`      |
| `tc-feats-group`          | Group tier feature list       | `tier_features`      |
| `tc-feats-encyclopedia`   | Encyclopedia feature list     | `tier_features`      |
| `f_title`                 | Professional title dropdown   | `professional_titles`|
| `waitlist-benefits`       | S4 benefits list              | `waitlist_benefits`  |
| `statCoverage`            | 95% hero counter              | `site_stats`         |
| `statCards`               | 40 conditions counter         | `site_stats`         |
| `statDrugs`               | 25 drugs counter              | `site_stats`         |
| `statQuestions`           | 1000+ questions counter       | `site_stats`         |
| `waPreview`               | WA message preview            | `app_config`         |

---

## THE GOLDEN RULES — PRINT AND KEEP

### Rule 1 — TWO CONTEXTS, NEVER MIX
When working with a bot:
- **Context A (HTML/content):** Share `index.html` + `content-loader.js`
- **Context B (core logic):** Work alone, no bot

Never open both contexts with the same bot in the same session.

### Rule 2 — THE QUESTION TEST
Before sharing a file with a bot, ask yourself:
> "If this bot corrupts this file, does the clinic system break?"

- `meridian-core.js` → YES → Never share
- `content-loader.js` → NO → Share freely
- `index.html` → NO (JS removed) → Share freely

### Rule 3 — EXACT PROMPT FOR BOTS
When asking a bot to help with content, give it this exact instruction:

```
You are working on MERIDIAN, a TCM clinic management system.
You may ONLY edit content-loader.js and HTML templates.
You must NEVER touch meridian-core.js.
You must NEVER rewrite, replace, or "clean up" existing JS logic.
You must NEVER add inline onclick= handlers that contain logic.
Your job: add a loadXxx() function that fetches from Supabase
and injects HTML into the element with id="xxx".
```

### Rule 4 — THE ONLY BOT JOB DESCRIPTION
What a bot IS ALLOWED to do in `content-loader.js`:
```javascript
// ✅ ALLOWED — fetch data, inject HTML
async function loadNewThing() {
  const { data } = await window.supa.from('some_table').select('*');
  document.getElementById('target-id').innerHTML =
    data.map(r => `<div>${r.text_he}</div>`).join('');
}
```

What a bot is NOT ALLOWED to do:
```javascript
// ❌ FORBIDDEN — rewriting core logic
function upTable() { ... }          // This lives in core. Don't touch.
function go(id) { ... }             // This lives in core. Don't touch.
const TIERS = { ... }               // This lives in core. Don't touch.
window.location.href = 'crm.html'  // Use APP_CONFIG.crm_url instead.
```

### Rule 5 — BACKUP BEFORE EVERY SESSION
Before opening a chat with any bot:
```
1. Copy meridian-core.js → meridian-core.BACKUP-[date].js
2. Work with bot
3. Verify core.js is unchanged after the session
```

---

## THE GITHUB REPO LAYOUT (after migration)

```
New-CM-Clinic-february-2026/
├── index.html              ← HTML only, no JS
├── meridian-core.js        ← 🔒 FROZEN — never share with bots
├── content-loader.js       ← ✅ BOT ZONE — Supabase data layer
├── crm.html
├── session.html
├── settings.html
├── legal.html
├── vault_keygen.html
└── onboarding.html
```

---

## WHAT BREAKS IF BOTS CORRUPT core.js

| Function corrupted | What breaks |
|--------------------|-------------|
| `go(id)`           | All screen navigation |
| `upTable()`        | Price calculator, value table |
| `demoLogin()`      | Account creation |
| `openSessionWithVault()` | Vault + session opening |
| `checkPass()`      | Password validation |
| `showSuccessModal()` | Post-registration flow |
| `goCRM()`          | CRM access |
| `animateStat()`    | Hero counter animations |

**If even ONE of these breaks — the entire registration flow is dead.**
This is why they live in a frozen file that bots never see.

---

## WHAT BREAKS IF BOTS CORRUPT content-loader.js

| Function corrupted | What breaks |
|-------------------|-------------|
| `loadTierCards()`  | Tier feature list shows HTML fallback (not broken) |
| `loadProfTitles()` | Dropdown shows HTML fallback options (not broken) |
| `loadSiteStats()`  | Hero counters show hardcoded values (not broken) |
| `loadAppConfig()`  | WA number uses fallback (not broken) |

**Everything falls back to hardcoded HTML defaults.**
**Nothing crashes. Registration still works.**

This is why bots are safe here.

---

## DEPLOYMENT STEPS (one-time setup)

```
Step 1: Add to index.html (remove JS block, add 2 script tags)
Step 2: Upload to GitHub:
  - meridian-core.js
  - content-loader.js
  - index.html (updated)
Step 3: Test:
  - Open live site
  - Console: check for errors
  - Registration flow: complete one test registration
  - Verify tier card features loading from Supabase
Step 4: Add id hooks to index.html for tier cards:
  id="tc-feats-standard"
  id="tc-feats-custom"
  id="tc-feats-group"
  id="tc-feats-encyclopedia"
  id="waitlist-benefits"
```

---

## THE ONE-LINE SUMMARY

> **`meridian-core.js` is the engine room of the ship.**
> **Bots stay on the deck. They never go below.**

---

*MERIDIAN · The Freeze Guide · 02/03/2026*
