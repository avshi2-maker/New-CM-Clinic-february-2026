/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║       MERIDIAN CONTENT LOADER — SUPABASE DATA LAYER         ║
 * ║       content-loader.js  |  v1  |  02/03/2026              ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  ✅ THIS IS THE ONLY FILE BOTS MAY EDIT                     ║
 * ║  Fetches all content from Supabase and injects into DOM.    ║
 * ║  No logic. No calculations. No auth. Data rendering only.   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 *  WHAT THIS FILE DOES:
 *    1. loadAppConfig()        → reads app_config → window.APP_CONFIG
 *    2. loadTiers()            → reads pricing_tiers → window.TIERS
 *    3. loadPlanNames()        → reads plan_names → window.PLAN_NAMES
 *    4. loadTierCards()        → renders S2 tier card HTML from tier_features
 *    5. loadProfTitles()       → renders S1 dropdown from professional_titles
 *    6. loadWaitlistBenefits() → renders S4 benefits from waitlist_benefits
 *    7. loadSiteStats()        → reads site_stats → animates hero counters
 *    8. initContentLoader()    → runs all above in order, then calls coreInit()
 */

'use strict';

// ── SUPABASE CLIENT (shared with core) ───────────────────────
const SUPA_URL = 'https://iqfglrwjemogoycbzltt.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZmdscndqZW1vZ295Y2J6bHR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NTM4ODMsImV4cCI6MjA4NDEyOTg4M30.DTREv3efs86_HzESyWm-7480ImfEVgC6T-xBdS6A2F8';
window.supa = window.supabase.createClient(SUPA_URL, SUPA_KEY);

// ── STATE (shared with core via window) ──────────────────────
window.reg   = {};
window.pizza = { tok: 's', audio: false, trans: false };

// ── FALLBACK TIERS (if Supabase unreachable) ─────────────────
window.TIERS = {
  s:{ name:'Starter',   price:9,  daily:5,  monthly:110,
      tokPerSess:'16,000', tokMonthly:'1.76M', audioGB:'2.5GB',
      audioFiles:110, transMonthly:'5,500', transPrice:21.45, badge:'5 מפגש/יום' },
  p:{ name:'Pro',       price:25, daily:15, monthly:330,
      tokPerSess:'16,000', tokMonthly:'5.28M', audioGB:'7.6GB',
      audioFiles:330, transMonthly:'16,500', transPrice:64.35, badge:'15 מפגש/יום' },
  u:{ name:'Unlimited', price:42, daily:25, monthly:550,
      tokPerSess:'16,000', tokMonthly:'8.8M',  audioGB:'12.7GB',
      audioFiles:550, transMonthly:'27,500', transPrice:107.25, badge:'∞ מפגש/יום' },
};

// ── FALLBACK PLAN NAMES (if Supabase unreachable) ────────────
window.PLAN_NAMES = {
  's00':'MERIDIAN Starter',   's10':'Starter + Audio',
  's01':'Starter + Scribe',   's11':'Starter Complete',
  'p00':'MERIDIAN Pro',       'p10':'Pro + Audio',
  'p01':'Pro + Scribe',       'p11':'Pro Complete',
  'u00':'MERIDIAN Unlimited', 'u10':'Unlimited + Audio',
  'u01':'Unlimited + Scribe', 'u11':'MERIDIAN Ultimate ⭐',
};

// ── FALLBACK APP CONFIG ───────────────────────────────────────
window.APP_CONFIG = {
  wa_number:          '972505231042',
  base_price:         '18.90',
  audio_addon_price:  '8',
  trial_days:         '14',
  crm_url:            'https://avshi2-maker.github.io/New-CM-Clinic-february-2026/crm.html',
  session_url:        'https://avshi2-maker.github.io/New-CM-Clinic-february-2026/session.html',
  keygen_url:         'https://avshi2-maker.github.io/New-CM-Clinic-february-2026/vault_keygen.html',
  support_email:      'avshi2@gmail.com',
  encyclopedia_url:   'https://www.sapir-cm-app.com/',
  wa_greeting:        'שלום אבשי! 👋',
};

// ═══════════════════════════════════════════════════════════════
// 1. APP CONFIG
// ═══════════════════════════════════════════════════════════════
async function loadAppConfig() {
  try {
    const { data, error } = await window.supa
      .from('app_config')
      .select('key,value');
    if (error || !data?.length) return;
    data.forEach(row => { window.APP_CONFIG[row.key] = row.value; });
    // Update encyclopedia URL if present
    const encLink = document.getElementById('encyclopedia-url');
    if (encLink && window.APP_CONFIG.encyclopedia_url) {
      encLink.href = window.APP_CONFIG.encyclopedia_url;
    }
  } catch(e) { /* use fallback */ }
}

// ═══════════════════════════════════════════════════════════════
// 2. TIERS FROM SUPABASE
// ═══════════════════════════════════════════════════════════════
async function loadTiers() {
  try {
    const { data, error } = await window.supa
      .from('pricing_tiers')
      .select('*')
      .in('tier_key', ['s','p','u'])
      .eq('active', true)
      .order('sort_order');
    if (error || !data?.length) return;
    data.forEach(row => {
      if (!window.TIERS[row.tier_key]) return;
      const t = window.TIERS[row.tier_key];
      t.price        = parseFloat(row.price_usd)    || t.price;
      t.daily        = row.daily_limit               || t.daily;
      t.monthly      = row.monthly_sessions          || t.monthly;
      t.tokMonthly   = row.tok_monthly               || t.tokMonthly;
      t.audioGB      = row.audio_gb                  || t.audioGB;
      t.audioFiles   = row.audio_files               || t.audioFiles;
      t.transMonthly = row.trans_monthly             || t.transMonthly;
      t.transPrice   = parseFloat(row.trans_price)  || t.transPrice;
      t.badge        = row.badge_he                  || t.badge;
    });

    // Update pizza builder tok cards with live prices
    const map = {s:'s', p:'p', u:'u'};
    Object.keys(map).forEach(k => {
      const t = window.TIERS[k];
      if (!t) return;
      const prEl = document.getElementById('tok-price-' + k);
      const bgEl = document.getElementById('tok-badge-' + k);
      if (prEl) prEl.textContent = '+$' + t.price;
      if (bgEl) bgEl.textContent = t.badge;
    });

    // Update audio add-on price
    const audioEl = document.getElementById('audio-price');
    if (audioEl) audioEl.textContent = '+$' + (window.APP_CONFIG?.audio_addon_price || '8');

  } catch(e) { /* use fallback */ }
}

// ═══════════════════════════════════════════════════════════════
// 3. PLAN NAMES FROM SUPABASE
// ═══════════════════════════════════════════════════════════════
async function loadPlanNames() {
  try {
    const { data, error } = await window.supa
      .from('plan_names')
      .select('plan_key,name_he')
      .eq('active', true);
    if (error || !data?.length) return;
    data.forEach(row => { window.PLAN_NAMES[row.plan_key] = row.name_he; });
  } catch(e) { /* use fallback */ }
}

// ═══════════════════════════════════════════════════════════════
// 4. TIER CARDS — render S2 HTML from Supabase
// ═══════════════════════════════════════════════════════════════
async function loadTierCards() {
  try {
    const { data, error } = await window.supa
      .from('tier_features')
      .select('tier_key,feature_he,icon,sort_order')
      .eq('active', true)
      .order('sort_order');
    if (error || !data?.length) return;

    // Group by tier
    const byTier = {};
    data.forEach(row => {
      if (!byTier[row.tier_key]) byTier[row.tier_key] = [];
      byTier[row.tier_key].push(row);
    });

    // Inject into each tier's feature container
    ['standard','custom','group','encyclopedia'].forEach(key => {
      const el = document.getElementById('tc-feats-' + key);
      if (!el || !byTier[key]) return;
      el.innerHTML = byTier[key]
        .map(f => `<div>${f.feature_he}</div>`)
        .join('');
    });
  } catch(e) { /* HTML fallback stays in place */ }
}

// ═══════════════════════════════════════════════════════════════
// 5. PROFESSIONAL TITLES DROPDOWN
// ═══════════════════════════════════════════════════════════════
async function loadProfTitles() {
  try {
    const { data, error } = await window.supa
      .from('professional_titles')
      .select('title_he')
      .eq('active', true)
      .order('sort_order');
    if (error || !data?.length) return;

    const sel = document.getElementById('f_title');
    if (!sel) return;
    // Keep first placeholder option, replace the rest
    sel.innerHTML = '<option value="">בחר...</option>' +
      data.map(r => `<option>${r.title_he}</option>`).join('');
  } catch(e) { /* HTML fallback options stay */ }
}

// ═══════════════════════════════════════════════════════════════
// 6. WAITLIST BENEFITS
// ═══════════════════════════════════════════════════════════════
async function loadWaitlistBenefits() {
  try {
    const { data, error } = await window.supa
      .from('waitlist_benefits')
      .select('icon,text_he')
      .eq('active', true)
      .order('sort_order');
    if (error || !data?.length) return;

    const el = document.getElementById('waitlist-benefits');
    if (!el) return;
    el.innerHTML = data
      .map(r => `<div>${r.icon}&nbsp;&nbsp;${r.text_he}</div>`)
      .join('');
  } catch(e) { /* HTML fallback stays */ }
}

// ═══════════════════════════════════════════════════════════════
// 7. SITE STATS — hero animated counters
// ═══════════════════════════════════════════════════════════════
async function loadSiteStats() {
  try {
    const { data } = await window.supa
      .from('site_stats')
      .select('key,value');
    if (!data?.length) return;
    const st = {};
    data.forEach(r => { st[r.key] = r.value; });
    animateStat('statCoverage', parseInt(st.safety_coverage_pct || 95),  '%', 1800);
    animateStat('statCards',    parseInt(st.safety_card_count   || 40),  '',  1500);
    animateStat('statDrugs',    parseInt(st.drug_interactions   || 25),  '',  1300);
    animateStat('statQuestions',parseInt(st.question_count      || 1000),'+', 2000);
    const cl = document.getElementById('coverageClaim');
    if (cl) cl.textContent = st.safety_coverage_pct || '95';
  } catch(e) { /* fallback HTML values */ }
}

// ═══════════════════════════════════════════════════════════════
// 8. WA MESSAGE (reads template from APP_CONFIG)
// ═══════════════════════════════════════════════════════════════
function upWA() {
  const v = id => document.getElementById(id)?.value?.trim() || '';
  const first = v('f_first'), last = v('f_last'), title = v('f_title'),
        clinic = v('f_clinic'), email = v('f_email'), wa = v('f_wa'),
        city = v('f_city'), size = document.getElementById('f_size')?.value || '1';
  const ok = first && last && title && email && wa;

  let msg = 'מלא את הטופס משמאל...';

  if (ok) {
    // Build a clean line-by-line report — no template escapes
    const lines = [
      'שלום אבשי! 👋',
      `אני ${first} ${last}`,
      `${title}${clinic ? ' | ' + clinic : ''}`,
      '',
      `📍 ${city || '—'} | ${size} מטפלים`,
      `📧 ${email}`,
      `📱 ${wa}`,
      '',
      '✨ מעוניין/ת להצטרף ל-MERIDIAN'
    ];
    msg = lines.join('
');
  }

  const prev = document.getElementById('waPreview');
  if (prev) prev.textContent = msg;          // pre-wrap CSS renders newlines correctly
  const btn = document.getElementById('waSendBtn');
  if (btn) btn.disabled = !ok;

  if (ok) {
    window.reg = { first, last, title, clinic, email, wa, city, size,
      token: 'MRD-' + Math.random().toString(36).substr(2,8).toUpperCase(),
      ts: new Date().toISOString() };
  }
}

function sendWA() {
  const v = id => document.getElementById(id)?.value?.trim() || '';
  let ok = true;
  const chk = (val, eid) => {
    const bad = !val;
    document.getElementById(eid)?.classList.toggle('show', bad);
    if (bad) ok = false;
  };
  chk(v('f_first'), 'e_first'); chk(v('f_last'), 'e_last');
  chk(v('f_title'), 'e_title');
  chk(v('f_email') && v('f_email').includes('@'), 'e_email');
  chk(v('f_wa'), 'e_wa');
  if (!ok) return;

  if (window.supa) {
    window.supa.from('meridian_leads').insert([{
      first_name: window.reg.first, last_name: window.reg.last,
      professional_title: window.reg.title, clinic_name: window.reg.clinic,
      email: window.reg.email, whatsapp: window.reg.wa,
      city: window.reg.city, clinic_size: window.reg.size,
      token: window.reg.token, status: 'registered',
      created_at: window.reg.ts
    }]).then(() => {}).catch(() => {});
  }

  const waNum = window.APP_CONFIG?.wa_number || '972505231042';
  const prev  = document.getElementById('waPreview');
  window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(prev?.textContent || '')}`, '_blank');

  setTimeout(() => {
    document.getElementById('contBtn')?.classList.add('show');
    const b = document.getElementById('waSendBtn');
    if (b) { b.textContent = '✅ נשלח!'; b.style.background = '#aaa'; b.disabled = true; }
  }, 700);
}

function joinWaitlist() {
  if (window.supa) {
    window.supa.from('meridian_leads').upsert({
      email: document.getElementById('loginEmail')?.value || '',
      plan_name: document.getElementById('loginPl')?.textContent || '',
      waitlist: true, joined_at: new Date().toISOString()
    }, { onConflict: 'email' }).catch(() => {});
  }
  showDemoMsg('🎉','נרשמת בהצלחה לרשימת ההמתנה!',
    'נודיע לך ישירות לאימייל ברגע שהמערכת פתוחה.\nמחיר ההשקה ייחסך לך.',
    null);
}

function callEncyclopedia() {
  const url = window.APP_CONFIG?.encyclopedia_url || 'https://www.sapir-cm-app.com/';
  window.open(url, '_blank');
}

function callGroup() {
  const waNum = window.APP_CONFIG?.wa_number || '972505231042';
  window.open(`https://wa.me/${waNum}?text=${encodeURIComponent('שלום אבשי, אני מעוניין בתוכנית קבוצתית למרפאה')}`, '_blank');
}

function waGroup() { callGroup(); }

// ═══════════════════════════════════════════════════════════════
// MASTER INIT — runs everything in order
// ═══════════════════════════════════════════════════════════════
async function initContentLoader() {
  // Run all Supabase loads in parallel
  await Promise.allSettled([
    loadAppConfig(),
    loadTiers(),
    loadPlanNames(),
    loadSiteStats(),
  ]);

  // These depend on app_config being loaded first
  await Promise.allSettled([
    loadTierCards(),
    loadProfTitles(),
    loadWaitlistBenefits(),
  ]);

  // Now hand off to frozen core logic
  if (typeof coreInit === 'function') coreInit();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initContentLoader);
} else {
  initContentLoader();
}
