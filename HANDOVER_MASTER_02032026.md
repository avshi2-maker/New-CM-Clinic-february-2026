# MERIDIAN — MASTER HANDOVER
**Date:** 02/03/2026 — End of Session 7  
**Supabase:** iqfglrwjemogoycbzltt.supabase.co  
**GitHub:** avshi2-maker/New-CM-Clinic-february-2026  
**Live:** avshi2-maker.github.io/New-CM-Clinic-february-2026/  
**Contact:** avshi2@gmail.com  

---

## 🔑 KEY REFERENCES

| Item | Value |
|------|-------|
| Test patient | אבשלום ספיר — `6cfca0de-2ef1-4b63-ae45-c3a9f8907f4a` |
| Vault code format | `MRD-XXXX-XXXX-XXXX` (19 chars) |
| Encryption | AES-256-GCM · SHA-256 hash in Supabase |
| Safety coverage | 95% — 40 cards |
| Business model | $8/month per therapist (future) |

---

## 🚨 URGENT — DO THIS FIRST (5 minutes)

### Upload 2 files to GitHub RIGHT NOW:

| Download | Upload to GitHub root as |
|----------|--------------------------|
| `session.html` | `session.html` |
| `vault_integration.js` | `vault_integration.js` |

**Then: Ctrl+Shift+R hard refresh**

**Test:** Open session.html → do 1 search → click שמור וצא  
**Expected:** Goes straight to goodbye page. NO prompt. NO loop. ✅  
**If still loops:** Check browser DevTools Console → look for which URL loaded vault_integration.js — must be a GitHub URL not Supabase.

---

## 📊 MASTER PHASE STATUS

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| **P1** | Bridge: CRM ↔ Session ↔ Goodbye | ✅ Complete | Navigation works |
| **P2** | Clinical Safety Intelligence | ✅ Complete | 40 cards, 95% coverage |
| **P3** | Billing / Stripe | ⏳ Deferred | After launch |
| **P4** | Settings + Admin | ✅ Complete | 4 tabs, Supabase-backed |
| **P5** | Launch + Subscriptions | 🔴 Not started | Next major phase |
| **P6** | Mobile Experience | 🔴 Not started | Known issues below |
| **P7** | Multi-Therapist / SaaS | 🔴 Not started | Architecture ready |

---

## ✅ FULLY COMPLETE — WHAT'S WORKING

### Core Application
- `session.html` — Full AI clinical session (411 + 589 questions, 4 input boxes, voice)
- `app.js` — Full P2 safety: drug checks, condition checks, BP levels, pregnancy, breastfeeding
- `yinyang.js` — Yin-Yang 11-question assessment
- `gallery.js` — Pulse + tongue gallery
- `modules.js` — Clinical modules loader

### Homepage (index.html)
- Full 4-section teaser with registration form
- Supabase-driven: pricing tiers, plan names, tier features, site stats (95%, 40, 25, 1000+)
- WA preview with clean Hebrew lines
- CHEN avatar tooltip (appears 4.5s, competitive positioning)
- Freeze architecture: `meridian-core.js` (frozen) + `content-loader.js` (bot-editable)
- Vault code input in success modal
- "כנס לחשבון קיים" login button

### CRM Dashboard (crm.html)
- Light gold theme, zero scrolling, one page
- Therapist name in header (from Supabase)
- 5 stat cards: patients, sessions, safety 95%, clinic name (animated 🌿), today count
- Patient list with search filter — from Supabase `patients` table
- Quick actions: מפגש מיידי, מטופל חדש, תור יומי, יומן, סטטיסטיקות
- Recent sessions from `patient_sessions` table
- New patient modal → saves to Supabase → offers to start session
- Exit button 🚪 (confirms → navigates to home_url from Supabase)
- 🌐 Website button → reads URL from `app_config.home_url`

### Session Save Flow (after fix)
- שמור וצא → saves to `patient_sessions` → goodbye page → CRM
- NO vault prompt, NO loop
- Goodbye page has חזרה לדשבורד link

### Settings (settings.html)
- 4 tabs: מרפאה · מטפל · מנוי · Claude AI
- All saved to Supabase
- Weekly diary scheduler
- TCM specialty dropdown
- Vault test tab
- Claude API instruction box

### Vault Keygen (vault_keygen.html)
- 4-stage ceremony: Generate → Copy → Verify → Save
- AES-256-GCM zero-knowledge — raw code never touches server
- SHA-256 hash only in Supabase

### Safety System
- `condition_safety_index` — 40 cards covering 95% of clinical scenarios
- `drug_safety_database` — 25 drugs, 9 groups
- `drug_safety_rules` — 11 rules
- `match_patient_conditions()` RPC — auto-picks up all cards
- `match_patient_drugs()` RPC — drug interaction checks
- Blood pressure 3-level check (crisis/high/low)
- Full pregnancy protocol by trimester
- Breastfeeding protocol

### Legal Pages
- `legal.html` — Privacy / Terms / Medical disclaimer
- Supabase-backed, bilingual, acceptance tracking, version control
- **Status: SQL run ✅ but legal.html may not be on GitHub yet — verify**

### Other Live Pages
- `queue_board_24022026.html` — Daily queue board
- `calendar_24022026.html` — Calendar
- `dashboard_24022022.html` — Stats dashboard
- `patient_intake_v3_23022026.html` — Patient intake form
- `session_close_26022026.html` — Goodbye page
- `onboarding.html` — Onboarding flow

---

## ⏳ OPEN TASKS — PRIORITIZED

### 🔴 P0 — DO THIS SESSION (Critical bugs / deploy)

| # | Task | Action |
|---|------|--------|
| 1 | **שמור וצא prompt loop** | Upload session.html + vault_integration.js → test |
| 2 | **Create therapist_vault table** | Run SQL below in Supabase |
| 3 | **Verify live site end-to-end** | Walk full flow: index → register → CRM → session → save → goodbye → CRM |

**SQL for task 2 — run in Supabase SQL Editor:**
```sql
CREATE TABLE IF NOT EXISTS therapist_vault (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  therapist_code_hash text NOT NULL UNIQUE,
  email               text,
  display_name        text,
  clinic_name         text DEFAULT '',
  tier                text DEFAULT 'trial',
  subscription_active boolean DEFAULT false,
  session_count       int DEFAULT 0,
  patient_count       int DEFAULT 0,
  last_active_at      timestamptz,
  created_at          timestamptz DEFAULT now()
);
ALTER TABLE therapist_vault ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tv_all" ON therapist_vault FOR ALL USING (true);
```

---

### 🟡 P1 — NEXT SESSION (Quality / Credibility)

| # | Task | Effort | Notes |
|---|------|--------|-------|
| 4 | **Supabase backup to GitHub** | 30min | Export critical tables to /backup folder as CSVs |
| 5 | **Legal footer links working** | 15min | legal.html links in footer of index.html |
| 6 | **Medical disclaimer in session** | 10min | Small banner in session.html |
| 7 | **Testimonials placeholder** | 20min | 2–3 placeholder cards in index.html |
| 8 | **Test safety cards in session** | 20min | Load patient age 70+ → confirm warning fires |

---

### 🟠 P2 — PHASE 5: LAUNCH + SUBSCRIPTIONS

| # | Task | Effort | Notes |
|---|------|--------|-------|
| 9 | **How new therapists sign up** | Design session | Index.html → register → what happens? Manual approval or auto? |
| 10 | **Multi-therapist: therapist_id on every row** | Architecture | patients, sessions, vault — all scoped to therapist |
| 11 | **Stripe integration** | Big build | $8/month, webhooks, subscription status |
| 12 | **Trial period logic** | Medium build | 14-day free, then subscription gate |
| 13 | **Email confirmation on signup** | Medium | Supabase Auth email or manual |
| 14 | **Custom domain** | Easy | meridian-tcm.com — point DNS to GitHub Pages |

---

### 🔵 P3 — PHASE 6: MOBILE EXPERIENCE

| # | Task | Notes |
|---|------|-------|
| 15 | **Session.html mobile layout** | 3-panel breaks on phone |
| 16 | **CRM mobile layout** | Grid collapses — needs responsive redesign |
| 17 | **Touch-friendly buttons** | Minimum 44px tap targets |
| 18 | **PWA / Add to home screen** | manifest.json + service worker |
| 19 | **Intake form mobile** | patient_intake_v3 scroll issues |

---

### 🟣 P4 — PHASE 7: MULTI-THERAPIST / SaaS

| # | Task | Notes |
|---|------|-------|
| 20 | **Supabase Auth integration** | Replace manual login with real auth |
| 21 | **Row Level Security (RLS) everywhere** | Each therapist sees only their data |
| 22 | **Admin dashboard** | Avshi sees all therapists, usage, revenue |
| 23 | **therapist_id foreign key on all tables** | patients, sessions, assessments |
| 24 | **Onboarding flow for new therapist** | Account → vault code → first session |
| 25 | **Usage limits by tier** | Starter: 50 sessions/month, etc. |

---

### ⚪ P5 — NICE TO HAVE (future)

| # | Task |
|---|------|
| 26 | English toggle (Hebrew/English bilingual) |
| 27 | PDF export of full session report |
| 28 | WhatsApp integration for appointment reminders |
| 29 | Patient portal (patient sees their own summary) |
| 30 | Encyclopedia module (linkable TCM terms) |
| 31 | API proxy to protect Claude API key |

---

## 🗄 SUPABASE TABLES — COMPLETE STATUS

### ✅ Live and Working
| Table | Rows | Purpose |
|-------|------|---------|
| `site_stats` | 4 | Hero counters (95%, 40, 25, 1000+) |
| `pricing_tiers` | 3 | Starter/Pro/Unlimited prices |
| `plan_names` | 12 | Plan name combinations |
| `tier_features` | 21 | Feature bullets |
| `app_config` | 14+ | WA number, prices, URLs, home_url |
| `professional_titles` | 9 | Registration dropdown |
| `waitlist_benefits` | 4 | S4 benefits |
| `meridian_leads` | ? | Registrations |
| `vault_keys` | ? | MRD code hashes |
| `clinic_settings` | 1 | Clinic profile |
| `therapist_profile` | 1 | Therapist profile |
| `subscription_status` | 1 | Billing info |
| `claude_settings` | 1 | AI config |
| `condition_safety_index` | 40 | Safety cards (95% coverage) |
| `drug_safety_database` | 25 | Drug interactions |
| `drug_safety_rules` | 11 | Safety rules |
| `patients` | 10+ | Patient records |
| `patient_sessions` | 0 | Session reports (new — waiting first save) |
| `promo_banners` | 1 | CHEN tooltip config |
| `question_categories` | ? | Session question categories |

### ❌ Missing — Need to Create
| Table | SQL Status | Why Needed |
|-------|-----------|------------|
| `therapist_vault` | SQL ready above | vault_integration.js looks for it — causes 406 errors |
| `session_vault` | SQL in `therapist_session_vault_02032026.sql` | Encrypted session storage (for future vault use) |
| `sos_protocol` | Not written | SOS overlay loads from this — falls back to hardcoded text |

---

## 🗂 FILE INVENTORY — GITHUB

### Core Files
| File | Status | Notes |
|------|--------|-------|
| `index.html` | ✅ Live | Freeze architecture — core + loader |
| `meridian-core.js` | ✅ Live | 🔒 FROZEN — never share with AI |
| `content-loader.js` | ✅ Live | Supabase data layer — AI-editable |
| `session.html` | 🔴 Upload NOW | Has CDN fix for vault_integration |
| `vault_integration.js` | 🔴 Upload NOW | No-prompt save+exit version |
| `app.js` | ✅ Live | Full safety system |
| `crm.html` | ✅ Live | Redesigned dashboard |
| `settings.html` | ⚠️ Verify | May be old version — test it |
| `vault_keygen.html` | ✅ Live | Code generation ceremony |
| `styles.css` | ✅ Live | Session styles |

### Other Pages
| File | Status |
|------|--------|
| `session_close_26022026.html` | ✅ Live |
| `queue_board_24022026.html` | ✅ Live |
| `calendar_24022026.html` | ✅ Live |
| `dashboard_24022026.html` | ✅ Live |
| `patient_intake_v3_23022026.html` | ✅ Live |
| `legal.html` | ⚠️ Verify — may need upload |
| `onboarding.html` | ✅ Live |

### Modules (Supabase Storage CDN)
| Module | Notes |
|--------|-------|
| `clinical-modules.js` | Via CDN — OK (not critical path) |
| `tcm-visualizations.js` | Via CDN |
| `training-syllabus.js` | Via CDN |
| `body-images.js` | Via CDN |
| `body-image-integration.js` | Via CDN |
| `crypto.js` | Via CDN |
| `session_vault.js` | Via CDN |
| `vault_integration.js` | ⚠️ MOVED to GitHub root — no longer from CDN |

---

## 🔁 FULL TESTED FLOW (should work after fixes)

```
1. avshi2-maker.github.io → Homepage
2. Fill registration form → WA preview shows → Submit → lead saved to meridian_leads
3. Success modal → "צור קוד Vault" → vault_keygen.html → generate MRD code → copy
4. Go to crm.html
5. CRM loads: therapist name, clinic name, patient list, recent sessions
6. Click ⚡ מפגש מיידי → session.html
7. Run searches → AI answers with safety checks
8. Click שמור וצא → saves to patient_sessions → goodbye page
9. Goodbye page → חזרה לדשבורד → crm.html
10. CRM → 🚪 יציאה → back to homepage
```

---

## 🏗 ARCHITECTURE OVERVIEW

```
index.html               (Freeze: HTML+CSS only)
├── meridian-core.js     (🔒 FROZEN — navigation, auth, vault, pricing)
└── content-loader.js    (✅ BOT-EDITABLE — Supabase data loader)

session.html             (Full clinical AI session)
├── app.js               (Safety system, search, AI calls)
├── yinyang.js           (Yin-Yang assessment)
├── gallery.js           (Pulse/tongue gallery)
├── vault_integration.js (🔴 FROM GITHUB — save + exit)
└── [CDN modules]        (clinical, viz, training, body images)

crm.html                 (Clinic management dashboard)
settings.html            (4-tab admin settings)
vault_keygen.html        (MRD code ceremony)
legal.html               (Privacy/Terms/Medical)
```

---

## 💡 NORTH STAR

> MERIDIAN is a Hebrew-first TCM clinical AI platform.  
> Target: $8/month × 500 therapists = $4,000 MRR  
> Differentiator: Clinical intelligence, not just appointment booking.  
> CHEN says it best: "הם מתאמים תורים. אני מבין Liver Qi Stagnation."

---

*MERIDIAN · Avshi Sapir · Master Handover · 02/03/2026*  
*This document supersedes all previous handovers.*
