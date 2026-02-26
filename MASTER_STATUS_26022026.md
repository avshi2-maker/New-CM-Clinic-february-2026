# 🧭 MERIDIAN — MASTER STATUS TABLE
> **Paste this at the start of every new bot session to avoid re-explaining everything.**
> Last updated: 26/02/2026 | Avshi Sapir | avshi2-maker.github.io/New-CM-Clinic-february-2026

---

## 👤 WHO I AM
- **Name:** Avshi Sapir, 72 years old, self-taught developer (copy-paste method)
- **Background:** Retired flooring contractor, now building TCM software
- **Goal:** TCM Clinical Assistant for therapists — $8/month subscription
- **GitHub repo:** `avshi2-maker/New-CM-Clinic-february-2026`
- **Live URL:** `https://avshi2-maker.github.io/New-CM-Clinic-february-2026/`
- **Supabase URL:** `https://iqfglrwjemogoycbzltt.supabase.co`
- **Supabase Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZmdscndqZW1vZ295Y2J6bHR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NTM4ODMsImV4cCI6MjA4NDEyOTg4M30.DTREv3efs86_HzESyWm-7480ImfEVgC6T-xBdS6A2F8`
- **WhatsApp:** 972505231042
- **Working style:** Plan first → implement → NEVER delete without approval → slow & bug-free
- **File naming:** Always include date: `filename_DDMMYYYY.ext`

---

## 🗺️ USER FLOW (Page by Page)

```
[1] teaser_26022026.html  →  [2] (Tier Gate / Login — TBD)  →  [3] crm.html  →  [4] index.html  →  [5] session_close_26022026.html
```

---

## 📄 ALL PAGES — STATUS TABLE

| # | File | What It Does | Status | Connects To | Notes |
|---|------|-------------|--------|-------------|-------|
| 1 | `teaser_26022026.html` | Marketing teaser + registration flow (5 screens) | ✅ DONE | Supabase `meridian_leads` table | Supabase key + WA inserted. Trans prices fixed. |
| 2 | `crm.html` | Clinic CRM — patient list, appointments, launch sessions | ⚠️ NOT TESTED | → `index.html?from=crm&patient=X` | 8 local HTML files system |
| 3 | `index.html` | Main AI session page — 3-panel layout, multi-query, all modules | ✅ EXISTS | → `session_close_26022026.html`, ← `crm.html` | BRIDGE code installed |
| 4 | `session_close_26022026.html` | Session summary/close page | ⚠️ EXISTS? | ← `index.html` via `exitToClose()` | Gets: patient_name, tokens, cost, duration, queries via URL params |
| 5 | `styles.css` | Main stylesheet for index.html | ✅ EXISTS | index.html | Local file |

---

## 📦 JAVASCRIPT MODULES — STATUS TABLE

### Local JS Files (in GitHub repo)

| File | What It Does | Called By | Status |
|------|-------------|-----------|--------|
| `app.js` | Main app logic — multi-query, AI search, cost tracking, reset | index.html | ✅ EXISTS |
| `modules.js` | ExportModule, DrRoni points, ZangFu syndromes | index.html | ✅ EXISTS |
| `yinyang.js` | Yin-Yang 11-question assessment module | index.html | ✅ EXISTS |
| `gallery.js` | Pulse gallery, Tongue gallery | index.html | ✅ EXISTS |

### Supabase Storage Modules (loaded from CDN)

| File | URL | What It Does | Status |
|------|-----|-------------|--------|
| `clinical-modules.js` | `supabase.co/storage/v1/.../modules/clinical-modules.js` | 52 clinical symptoms, toggleClinicalSymptoms() | ⚠️ NEED TO VERIFY |
| `tcm-visualizations.js` | `supabase.co/storage/v1/.../modules/tcm-visualizations.js` | TCMVisuals: Meridian map, Ear map, Anatomy layers | ⚠️ NEED TO VERIFY |
| `training-syllabus.js` | `supabase.co/storage/v1/.../modules/training-syllabus.js` | 48 training topics — pulse, tongue, elements | ⚠️ NEED TO VERIFY |
| `body-images.js` | `supabase.co/storage/v1/.../modules/body-images.js` | BodyImages: 17 anatomical images gallery | ⚠️ NEED TO VERIFY |
| `body-image-integration.js` | `supabase.co/storage/v1/.../modules/body-image-integration.js` | BodyImages integration layer | ⚠️ NEED TO VERIFY |

---

## 🗄️ SUPABASE TABLES — STATUS TABLE

| Table | Used By | What It Stores | Status |
|-------|---------|---------------|--------|
| `meridian_leads` | teaser_26022026.html | Registration leads from teaser | ✅ ACTIVE |
| `question_categories` | index.html | Categories for 411 quick questions | ✅ ACTIVE |
| `sos_protocol` | index.html (SOS button) | Emergency protocol steps | ⚠️ NEED TO VERIFY |
| `appointments` | index.html (SOS save), crm.html | Patient appointments | ⚠️ CRM |
| `questions` (assumed) | index.html | 411 + 589 clinical questions | ✅ ACTIVE (4500+ assets) |
| `acupoints` (assumed) | index.html | 341 acupuncture points | ✅ ACTIVE |
| `zangfu_syndromes` (assumed) | index.html | 11 Zang-Fu syndromes | ⚠️ NEED TO VERIFY |

---

## 🔗 BRIDGE CONNECTIONS (CRM → Session → Close)

### CRM → index.html
```
index.html?from=crm&patient=NAME&complaint=ISSUE&apt=APT_ID&issues=sym1|sym2|sym3
```
- Shows patient bar at bottom ✅
- Pre-fills search box 1 with complaint ✅
- Shows floating chip panel for all issues ✅
- SOS button appears in header ✅

### index.html → session_close_26022026.html
```
session_close_26022026.html?patient_name=X&tokens=X&cost=X&duration=X&queries=X
```
- Called by "שמור וצא" button ✅
- Also saves to sessionStorage ✅

### SOS Button
- Loads steps from `sos_protocol` Supabase table ✅
- Falls back to hardcoded 5 steps if DB fails ✅
- Saves SOS event to `appointments` table ✅

---

## 🗺️ MERIDIAN ROADMAP

| Phase | Name | Status |
|-------|------|--------|
| P1 | Teaser + Bridge Session Module + CRM | 🔄 IN PROGRESS |
| P2 | Clinical Safety Intelligence | ⏳ PENDING |
| P3 | Real Stripe + Supabase Auth | ⏳ PENDING |
| P4 | Settings | ⏳ PENDING |
| P5 | Live subscriptions | ⏳ PENDING |

---

## ⚠️ KNOWN ISSUES / TODO

| Priority | Issue | File | Fix Needed |
|----------|-------|------|-----------|
| 🔴 HIGH | Test CRM → index.html bridge end-to-end | crm.html + index.html | Live test needed |
| 🔴 HIGH | Verify session_close_26022026.html exists and receives URL params | session_close_26022026.html | Upload/check file |
| 🟡 MED | Verify all 5 Supabase Storage modules load without 404 | index.html | Check Supabase bucket |
| 🟡 MED | Test SOS protocol loads from sos_protocol table | index.html | Verify table has rows |
| 🟢 LOW | Upload teaser to GitHub Pages + mobile test | teaser_26022026.html | Deploy |

---

## 💬 HOW TO USE THIS FILE WITH A NEW BOT

Paste this entire file content + then say:
> "I am Avshi, 72 years old, building MERIDIAN TCM. This is my master status table.
> Today I need help with: [YOUR TASK HERE]"

The bot will have full context immediately. No re-explaining needed.

---
*Generated: 26/02/2026 | MERIDIAN Build Session*
