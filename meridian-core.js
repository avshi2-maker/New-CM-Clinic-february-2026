/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║          MERIDIAN CORE — FROZEN LOGIC                        ║
 * ║          meridian-core.js  |  v14c  |  02/03/2026           ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  🔒 THIS FILE IS FROZEN.                                     ║
 * ║  DO NOT EDIT — contains navigation, calculation,             ║
 * ║  auth, vault, and UI logic.                                  ║
 * ║                                                              ║
 * ║  When asking AI to help with MERIDIAN:                       ║
 * ║  ✅ Share: index.html (HTML template only)                   ║
 * ║  ✅ Share: content-loader.js (Supabase data fetching)        ║
 * ║  ❌ NEVER share this file with AI for editing                ║
 * ║  ❌ NEVER paste this into an AI chat                         ║
 * ║                                                              ║
 * ║  If something breaks here — restore from backup.            ║
 * ║  Do not attempt inline fixes.                                ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 *  FUNCTIONS IN THIS FILE:
 *  ── Navigation ──────────────────────────────────────────────
 *    go(id)               → show screen by id
 *    tickClock()          → nav clock update
 *  ── UI Helpers ──────────────────────────────────────────────
 *    set(id, val)         → set element textContent
 *    setHTML(id, val)     → set element innerHTML
 *    showDemoMsg(...)     → generic modal
 *    toggleEye(...)       → password visibility toggle
 *    animateStat(...)     → count-up animation
 *  ── Tier / Pizza Logic ──────────────────────────────────────
 *    pickTier(t)          → select Standard or Custom
 *    selTok(t)            → select Starter/Pro/Unlimited
 *    togAdd(type)         → toggle Audio/Trans add-on
 *    upTable()            → recalculate value table
 *    confirmPlan()        → lock plan, go to S4
 *  ── Registration Form ───────────────────────────────────────
 *    checkPass()          → password strength + match check
 *  ── Auth / Account ──────────────────────────────────────────
 *    existingLogin()      → existing user login flow
 *    doExistingLogin()    → execute login after validation
 *    demoLogin()          → new account creation
 *    showSuccessModal()   → post-registration modal
 *  ── Vault ───────────────────────────────────────────────────
 *    fmtSuccessCode(inp)  → auto-format MRD code input
 *    openSessionWithVault() → store vault code, open session
 *    goCRM()              → navigate to CRM
 */

'use strict';

// ═══════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════

const LABELS = {
  s0:'כניסה ראשונה', s1:'הרשמה',
  s2:'בחירת תוכנית', s3:'בנה תוכנית', s4:'תשלום וגישה'
};

function go(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  const lbl = document.getElementById('navStep');
  if (lbl) lbl.textContent = LABELS[id] || '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function tickClock() {
  const pad = x => String(x).padStart(2,'0');
  const n = new Date();
  const el = document.getElementById('navClock');
  if (el) el.textContent = `${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;
}

// ═══════════════════════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════════════════════

function set(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setHTML(id, val) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = val;
}

function showDemoMsg(icon, title, body, onOk) {
  const existing = document.getElementById('demoMsgModal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'demoMsgModal';
  modal.style.cssText = `position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.5);
    backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;
    font-family:'Heebo',sans-serif;animation:fadeUp .2s ease both;`;
  const bodyHtml = body
    ? `<div style="font-size:12px;color:#444;line-height:1.8;
        white-space:pre-wrap;margin-bottom:16px;text-align:right;">${body}</div>`
    : '';
  modal.innerHTML = `
    <div dir="rtl" style="background:white;border-radius:16px;padding:24px 28px;
      max-width:320px;width:90%;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,0.25);">
      <div style="font-size:36px;margin-bottom:8px;">${icon}</div>
      <div style="font-family:'Cinzel',serif;font-size:14px;color:var(--jade);
        margin-bottom:10px;font-weight:700;">${title}</div>
      ${bodyHtml}
      <button id="demoMsgOk"
        style="background:linear-gradient(135deg,var(--jade),var(--jade2));color:var(--gold2);
          border:none;border-radius:9px;padding:9px 24px;font-family:'Cinzel',serif;
          font-size:11px;font-weight:700;letter-spacing:1px;cursor:pointer;width:100%;">
        ${onOk ? '☯ כנס ל-CRM ←' : 'הבנתי'}
      </button>
    </div>`;
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  document.body.appendChild(modal);
  document.getElementById('demoMsgOk').onclick = () => {
    modal.remove();
    if (onOk) onOk();
  };
}

function toggleEye(inputId, btnId) {
  const inp = document.getElementById(inputId);
  const btn = document.getElementById(btnId);
  if (!inp || !btn) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.textContent = inp.type === 'password' ? '👁' : '🙈';
}

function animateStat(id, to, suffix, ms) {
  const el = document.getElementById(id);
  if (!el) return;
  const t0 = performance.now();
  (function tick(now) {
    const p = Math.min((now - t0) / ms, 1);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(to * e).toLocaleString() + suffix;
    if (p < 1) requestAnimationFrame(tick);
  })(t0);
}

// ═══════════════════════════════════════════════════════════════
// TIER / PIZZA LOGIC
// ═══════════════════════════════════════════════════════════════

function pickTier(t) {
  if (t === 'standard') { go('s4'); updateS4('standard'); }
  else go('s3');
}

function selTok(t) {
  pizza.tok = t;
  ['s','p','u'].forEach(k => {
    document.getElementById('to_' + k)?.classList.toggle('sel', k === t);
  });
  upTable();
}

function togAdd(type) {
  pizza[type] = !pizza[type];
  document.getElementById('at_' + type)?.classList.toggle('on', pizza[type]);
  document.getElementById('sw_' + type)?.classList.toggle('on', pizza[type]);
  upTable();
}

function upTable() {
  const T = TIERS[pizza.tok];
  if (!T) return;
  const base  = parseFloat(window.APP_CONFIG?.base_price || '18.90');
  const tok   = T.price;
  const audio = pizza.audio ? parseFloat(window.APP_CONFIG?.audio_addon_price || '8') : 0;
  const trans = pizza.trans ? T.transPrice : 0;
  const total = (base + tok + audio + trans).toFixed(2);
  const key   = pizza.tok + (pizza.audio ? '1' : '0') + (pizza.trans ? '1' : '0');
  const nm    = (window.PLAN_NAMES && window.PLAN_NAMES[key]) || 'MERIDIAN Custom';

  set('valBadge',  nm);
  set('vc_sess',   T.monthly);
  set('vc_perday', `× ${T.daily}/יום`);
  set('vt_tier',   T.name + ' Tokens');
  set('vt_monthly', T.tokMonthly);
  set('vt_sessmo', T.monthly + ' שאילתות/חודש');
  set('vt_price',  '+$' + T.price);
  setHTML('vt_badge', `<span class="val-add-badge">${T.badge}</span>`);

  const aOn = pizza.audio;
  document.getElementById('vr_audio')?.classList.toggle('inactive', !aOn);
  document.getElementById('vr_audio')?.classList.toggle('active', aOn);
  set('va_monthly', T.audioGB);
  set('va_files',   T.audioFiles + ' קבצים/חודש');
  set('va_price',   '+$' + (window.APP_CONFIG?.audio_addon_price || '8'));
  const vaPrice = document.getElementById('va_price');
  if (vaPrice) vaPrice.className = 'val-price' + (aOn ? '' : ' inactive');
  setHTML('va_badge', `<span class="val-add-badge ${aOn ? '' : 'off'}">${aOn ? 'פעיל ✓' : 'לא פעיל'}</span>`);

  const tOn = pizza.trans;
  document.getElementById('vr_trans')?.classList.toggle('inactive', !tOn);
  document.getElementById('vr_trans')?.classList.toggle('active', tOn);
  set('vtr_monthly', T.transMonthly);
  set('vtr_price',   '+$' + T.transPrice);
  set('trans_price_badge', '+$' + T.transPrice);
  const vtrPrice = document.getElementById('vtr_price');
  if (vtrPrice) vtrPrice.className = 'val-price' + (tOn ? '' : ' inactive');
  setHTML('vtr_badge', `<span class="val-add-badge ${tOn ? '' : 'off'}">${tOn ? 'פעיל ✓' : 'לא פעיל'}</span>`);

  set('valTotal',   '$' + total);
  set('totalDesc',  `${T.monthly} מפגשים/חודש · ${nm}`);

  pizza._total = total;
  pizza._name  = nm;
}

function confirmPlan() {
  updateS4('custom');
  go('s4');
}

function updateS4(type) {
  const T   = TIERS[pizza.tok] || TIERS['s'];
  const nm  = pizza._name  || 'MERIDIAN Starter';
  const tot = pizza._total || '27.90';
  set('s4ttl',  type === 'standard' ? '🎉 MERIDIAN Standard' : '🎉 כמעט סיימנו!');
  set('s4sub',  type === 'standard'
    ? 'הצטרף ל-Standard — AI קליני בעברית'
    : `${nm} — $${tot}/חודש`);
  set('payNm',  nm);
  set('payPr',  '$' + tot);
  set('loginNm', reg.first ? `ברוך הבא, ${reg.first}!` : 'ברוך הבא!');
  set('loginPl', `${nm} · $${tot}/חודש`);
}

// ═══════════════════════════════════════════════════════════════
// REGISTRATION FORM
// ═══════════════════════════════════════════════════════════════

function checkPass() {
  const p  = document.getElementById('loginPass')?.value  || '';
  const p2 = document.getElementById('loginPass2')?.value || '';
  const strength = document.getElementById('pwStrength');
  const match    = document.getElementById('pwMatch');

  if (strength) {
    if (!p) { strength.textContent = ''; strength.className = 'pw-strength'; }
    else if (p.length < 8) { strength.textContent = '⚠️ לפחות 8 תווים'; strength.className = 'pw-strength weak'; }
    else if (p.length < 12) { strength.textContent = '✓ סיסמה תקינה'; strength.className = 'pw-strength ok'; }
    else { strength.textContent = '✅ סיסמה חזקה'; strength.className = 'pw-strength strong'; }
  }
  if (match) {
    if (!p2) { match.textContent = ''; }
    else if (p !== p2) { match.textContent = '✗ הסיסמאות אינן תואמות'; match.className = 'pw-strength weak'; }
    else { match.textContent = '✓ הסיסמאות תואמות'; match.className = 'pw-strength ok'; }
  }
}

// ═══════════════════════════════════════════════════════════════
// AUTH / ACCOUNT
// ═══════════════════════════════════════════════════════════════

function existingLogin() {
  showDemoMsg('🔑','כניסה לחשבון קיים',
    'הזן אימייל וסיסמה שנרשמת איתם.\nנא המתן — מנגנון כניסה אמיתי יהיה זמין בקרוב.',
    null
  );
}

function doExistingLogin() {
  const e = document.getElementById('existEmail')?.value?.trim();
  const p = document.getElementById('existPass')?.value;
  if (!e || !p) { showDemoMsg('⚠️','נא מלא אימייל וסיסמה','',null); return; }
  showDemoMsg('✅','כניסה הצליחה',
    `נכנסת כ-${e}\nמועבר ל-CRM...`,
    () => { window.location.href = window.APP_CONFIG?.crm_url || 'crm.html'; }
  );
}

function demoLogin() {
  const e  = document.getElementById('loginEmail')?.value;
  const p  = document.getElementById('loginPass')?.value;
  const p2 = document.getElementById('loginPass2')?.value;
  if (!e || !p) { showDemoMsg('⚠️','נא מלא אימייל וסיסמה','',null); return; }
  if (p.length < 8) { showDemoMsg('⚠️','סיסמה — לפחות 8 תווים','',null); return; }
  if (p !== p2) { showDemoMsg('⚠️','הסיסמאות אינן תואמות','',null); return; }
  const pl = document.getElementById('loginPl')?.textContent || '';
  const nm = reg.first || 'מטפל';
  if (window.supa) {
    window.supa.from('meridian_leads').upsert([{
      first_name: reg.first || nm, last_name: reg.last || '',
      email: e, whatsapp: reg.wa || '',
      plan_name: pl, status: 'account_created',
      token: reg.token || ('MRD-' + Math.random().toString(36).substr(2,8).toUpperCase()),
      created_at: new Date().toISOString()
    }]).then(() => {}).catch(() => {});
  }
  showSuccessModal(nm, e, pl);
}

function showSuccessModal(nm, email, plan) {
  const existing = document.getElementById('successModal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'successModal';
  modal.style.cssText = `position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.55);
    backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;
    font-family:'Heebo',sans-serif;animation:fadeUp .25s ease both;`;
  modal.innerHTML = `
    <div dir="rtl" style="background:white;border-radius:18px;padding:26px 28px;
      max-width:360px;width:93%;box-shadow:0 24px 60px rgba(0,0,0,0.28);">
      <div style="text-align:center;margin-bottom:14px;">
        <div style="font-size:38px;">✅</div>
        <div style="font-family:'Cinzel',serif;font-size:15px;color:var(--jade);
          font-weight:700;margin-top:6px;">${nm} — החשבון נוצר!</div>
        <div style="font-size:11px;color:#888;margin-top:4px;line-height:1.6;">
          📧 ${email}<br>☯ ${plan}<br>
          <span style="color:var(--jade);font-weight:600;">✓ כניסה מאובטחת בפרוטוקול אבטחה מתקדם</span>
        </div>
      </div>
      <hr style="border:none;border-top:1px solid #eee;margin:14px 0;">
      <div style="background:linear-gradient(135deg,#0f0a2e,#1a0f4e);border-radius:12px;
        padding:14px 16px;margin-bottom:14px;text-align:center;">
        <div style="font-size:20px;margin-bottom:4px;">🔐</div>
        <div style="font-family:'Cinzel',serif;font-size:11px;letter-spacing:2px;
          color:#d4c5ff;margin-bottom:8px;">MERIDIAN VAULT — פתח סשן</div>
        <input id="successVaultCode" type="text"
          placeholder="MRD-XXXX-XXXX-XXXX" maxlength="19"
          oninput="fmtSuccessCode(this)" autocomplete="off" spellcheck="false"
          style="width:100%;padding:9px 12px;border-radius:8px;
            border:1.5px solid rgba(120,100,220,0.4);
            background:rgba(255,255,255,0.07);color:#e0d7ff;
            font-size:14px;font-weight:700;text-align:center;
            letter-spacing:3px;outline:none;direction:ltr;
            font-family:'JetBrains Mono',monospace;">
        <div id="successVaultErr" style="font-size:10px;color:#ff8080;
          margin-top:5px;display:none;">⚠️ פורמט שגוי — MRD-XXXX-XXXX-XXXX</div>
        <button onclick="openSessionWithVault()"
          style="margin-top:10px;width:100%;padding:10px;border-radius:9px;border:none;
            background:linear-gradient(135deg,#6c3fc4,#9b59b6);color:white;
            font-family:'Heebo',sans-serif;font-size:13px;font-weight:900;cursor:pointer;">
          🔓 פתח סשן קליני ←
        </button>
        <div style="font-size:10px;color:rgba(180,170,255,0.4);margin-top:6px;">
          אין קוד עדיין? קבל קוד Vault ב-WhatsApp לאחר אישור
        </div>
      </div>
      <button onclick="goCRM()"
        style="width:100%;padding:11px;background:linear-gradient(135deg,var(--jade),var(--jade2));
          color:var(--gold2);border:none;border-radius:10px;
          font-family:'Cinzel',serif;font-size:11px;font-weight:700;
          letter-spacing:1.5px;cursor:pointer;">
        ☯ כנס ל-CRM ←
      </button>
    </div>`;
  document.body.appendChild(modal);
}

// ═══════════════════════════════════════════════════════════════
// VAULT
// ═══════════════════════════════════════════════════════════════

function fmtSuccessCode(inp) {
  let v = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (v.startsWith('MRD')) v = v.substring(3);
  const parts = [];
  for (let i = 0; i < v.length && parts.length < 3; i += 4) parts.push(v.substring(i, i + 4));
  inp.value = parts.length ? 'MRD-' + parts.join('-') : (v ? 'MRD-' + v : '');
  const errEl = document.getElementById('successVaultErr');
  if (errEl) errEl.style.display = 'none';
}

function openSessionWithVault() {
  const code = document.getElementById('successVaultCode')?.value?.trim();
  if (!code?.match(/^MRD-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/)) {
    const e = document.getElementById('successVaultErr');
    if (e) e.style.display = 'block';
    return;
  }
  sessionStorage.setItem('meridian_vault_code', code);
  localStorage.setItem('meridian_vault_prefix', code.split('-').slice(0, 2).join('-'));
  const modal = document.getElementById('successModal');
  if (modal) modal.remove();
  const sessionUrl = window.APP_CONFIG?.session_url || 'session.html';
  window.open(sessionUrl, '_blank');
}

function goCRM() {
  const modal = document.getElementById('successModal');
  if (modal) modal.remove();
  window.location.href = window.APP_CONFIG?.crm_url || 'crm.html';
}

// ═══════════════════════════════════════════════════════════════
// INIT — called by content-loader.js after Supabase data loads
// ═══════════════════════════════════════════════════════════════

function coreInit() {
  setInterval(tickClock, 1000);
  tickClock();
  upTable();
}
