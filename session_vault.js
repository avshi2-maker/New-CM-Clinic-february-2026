// ============================================================
// MERIDIAN SESSION VAULT — session_vault.js
// Version: 1.0 — 01/03/2026
// Upload to: Supabase Storage → modules/session_vault.js
// ============================================================
// Depends on: crypto.js (must load first)
// Integrates with: app.js (auto-load) + session.html (save)
// ============================================================

const MeridianVault = (function() {

  'use strict';

  const SUPA_URL = 'https://iqfglrwjemogoycbzltt.supabase.co';
  const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZmdscndqZW1vZ295Y2J6bHR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NTM4ODMsImV4cCI6MjA4NDEyOTg4M30.DTREv3efs86_HzESyWm-7480ImfEVgC6T-xBdS6A2F8';

  // ── INTERNAL STATE ────────────────────────────────────────────
  let _therapistId   = null;
  let _patientRef    = null;  // encrypted patient identifier
  let _sessionHistory = [];   // decrypted sessions for current patient
  let _isInitialized = false;

  // ── SUPABASE CLIENT ───────────────────────────────────────────
  function _supa() {
    return window.supabaseClient || 
           window.dbClient || 
           (window.supabase && window.supabase.createClient(SUPA_URL, SUPA_KEY));
  }

  // ── THERAPIST REGISTRATION ────────────────────────────────────

  /**
   * Register new therapist — generate code, hash it, save to Supabase
   * Returns the private code (shown ONCE to therapist)
   */
  async function registerTherapist({ email, displayName, clinicName }) {
    const privateCode = MeridianCrypto.generatePrivateCode();
    const codeHash    = await MeridianCrypto.hashCode(privateCode);

    // Check email not already registered
    const sb = _supa();
    const { data: existing } = await sb
      .from('therapist_vault')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (existing) throw new Error('EMAIL_EXISTS');

    // Save therapist record (code hash only — never the code itself)
    const { data, error } = await sb
      .from('therapist_vault')
      .insert({
        therapist_code_hash: codeHash,
        email:               email.toLowerCase().trim(),
        display_name:        displayName,
        clinic_name:         clinicName || '',
        tier:                'trial',
        subscription_active: false
      })
      .select('id')
      .single();

    if (error) throw new Error('REGISTRATION_FAILED: ' + error.message);

    // Store code in sessionStorage for this session
    MeridianCrypto.storeCodeForSession(privateCode);
    _therapistId = data.id;
    _isInitialized = true;

    return {
      therapistId:  data.id,
      privateCode:  privateCode,  // ← Show this ONCE. Never stored.
      codeHash:     codeHash
    };
  }

  /**
   * Login with private code — verify and load therapist record
   */
  async function loginWithCode(privateCode) {
    if (!MeridianCrypto.validateCode(privateCode)) {
      throw new Error('INVALID_CODE_FORMAT');
    }

    const codeHash = await MeridianCrypto.hashCode(privateCode);
    const sb       = _supa();

    const { data, error } = await sb
      .from('therapist_vault')
      .select('*')
      .eq('therapist_code_hash', codeHash)
      .single();

    if (error) {
      // PGRST116 = .single() found zero rows — code genuinely not registered
      if (error.code === 'PGRST116' || error.message?.includes('JSON object requested')) {
        throw new Error('CODE_NOT_FOUND');
      }
      // Any other error = DB/table/network problem — do NOT clear the code
      throw new Error('DB_ERROR: ' + (error.message || error.code || 'unknown'));
    }
    if (!data) throw new Error('CODE_NOT_FOUND');

    // Store code for session
    MeridianCrypto.storeCodeForSession(privateCode);
    _therapistId   = data.id;
    _isInitialized = true;

    // Update last active
    await sb
      .from('therapist_vault')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', data.id);

    return {
      therapistId:   data.id,
      email:         data.email,
      displayName:   data.display_name,
      clinicName:    data.clinic_name,
      tier:          data.tier,
      sessionCount:  data.session_count,
      patientCount:  data.patient_count,
      trialEndsAt:   data.trial_ends_at,
      subscriptionActive: data.subscription_active
    };
  }

  /**
   * Quick re-auth from sessionStorage code (page refresh / new tab)
   * Returns therapist data if code still in session, null otherwise
   */
  async function autoLogin() {
    const code = MeridianCrypto.getSessionCode();
    if (!code) return null;
    try {
      return await loginWithCode(code);
    } catch (e) {
      MeridianCrypto.clearSessionCode();
      return null;
    }
  }

  // ── PATIENT REFERENCE ─────────────────────────────────────────

  /**
   * Create encrypted reference for a patient
   * patient_ref = encrypt(patient_id) → stored in session_vault
   * Allows grouping sessions by patient without exposing patient_id
   */
  async function encryptPatientRef(patientId) {
    const code = MeridianCrypto.getSessionCode();
    if (!code) throw new Error('NO_SESSION_CODE');
    const pkg = await MeridianCrypto.encrypt({ patient_id: patientId }, code);
    // Use a deterministic hash for lookup (same patient = same ref for same therapist)
    const h = await MeridianCrypto.hashCode(code + patientId);
    return h.substring(0, 32); // 32-char deterministic patient ref
  }

  // ── SESSION SAVE ──────────────────────────────────────────────

  /**
   * Save session to encrypted vault
   * Called by "שמור וצא" button
   *
   * @param {Object} sessionData — all clinical data from current session
   * @returns {Object} — saved record metadata
   */
  async function saveSession(sessionData) {
    const code = MeridianCrypto.getSessionCode();
    if (!code)          throw new Error('NO_SESSION_CODE — please enter your private code');
    if (!_therapistId)  throw new Error('NOT_LOGGED_IN');

    // Get session number for this patient
    const patientRef   = await encryptPatientRef(sessionData.patientId || 'unknown');
    const sb           = _supa();
    const sessionNum   = await _getNextSessionNumber(patientRef);

    // Build clean summary
    const summary = MeridianCrypto.buildSessionSummary({
      ...sessionData,
      sessionNumber: sessionNum
    });

    // Encrypt everything
    const pkg = await MeridianCrypto.encrypt(summary, code);

    // Save to Supabase (encrypted blob only)
    const { data, error } = await sb
      .from('session_vault')
      .insert({
        therapist_id:    _therapistId,
        patient_ref:     patientRef,
        session_number:  sessionNum,
        session_date:    new Date().toISOString().split('T')[0],
        encrypted_data:  pkg.encrypted,
        data_iv:         pkg.iv,
        data_auth_tag:   pkg.authTag + '|salt:' + pkg.salt, // pack salt with auth tag
        session_date_str: summary.date_display,
        duration_minutes: sessionData.durationMinutes || 0,
        query_count:     sessionData.queryCount || 0,
        token_count:     sessionData.tokenCount || 0,
        cost_usd:        sessionData.costUsd || 0,
        has_safety_flags: (sessionData.safetyFlags || []).length > 0,
        safety_severity:  sessionData.safetySeverity || null
      })
      .select('id, session_number, session_date_str')
      .single();

    if (error) throw new Error('SAVE_FAILED: ' + error.message);

    // Update therapist session count
    await sb.rpc('increment_therapist_session_count', { p_therapist_id: _therapistId });

    console.log(`✅ Session ${sessionNum} saved to vault (encrypted)`);
    return { sessionId: data.id, sessionNumber: sessionNum };
  }

  /**
   * Get next session number for patient
   */
  async function _getNextSessionNumber(patientRef) {
    if (!_therapistId) return 1;
    const sb = _supa();
    const { data } = await sb
      .from('session_vault')
      .select('session_number')
      .eq('therapist_id', _therapistId)
      .eq('patient_ref', patientRef)
      .order('session_number', { ascending: false })
      .limit(1)
      .single();
    return data ? data.session_number + 1 : 1;
  }

  // ── SESSION LOAD ──────────────────────────────────────────────

  /**
   * Load and decrypt all sessions for a patient
   * Called automatically when session.html opens with patient_id
   * 
   * @param {string} patientId — from URL param
   * @returns {Array} — array of decrypted session summaries, newest first
   */
  async function loadPatientHistory(patientId) {
    const code = MeridianCrypto.getSessionCode();
    if (!code || !_therapistId) return [];

    try {
      const patientRef = await encryptPatientRef(patientId);
      const sb         = _supa();

      const { data: rows, error } = await sb
        .from('session_vault')
        .select('*')
        .eq('therapist_id', _therapistId)
        .eq('patient_ref', patientRef)
        .order('session_date', { ascending: false });

      if (error || !rows || rows.length === 0) return [];

      // Decrypt each session
      const sessions = [];
      for (const row of rows) {
        try {
          // Unpack salt from auth_tag field
          const [authTag, saltPart] = (row.data_auth_tag || '|salt:').split('|salt:');
          const pkg = {
            encrypted: row.encrypted_data,
            iv:        row.data_iv,
            authTag:   authTag,
            salt:      saltPart
          };
          const decrypted = await MeridianCrypto.decrypt(pkg, code);
          sessions.push({
            ...decrypted,
            _meta: {
              id:              row.id,
              session_date:    row.session_date,
              session_number:  row.session_number,
              has_safety_flags: row.has_safety_flags,
              token_count:     row.token_count,
              cost_usd:        row.cost_usd
            }
          });
        } catch (decryptErr) {
          if (decryptErr.message === 'WRONG_CODE') {
            throw new Error('WRONG_CODE');
          }
          console.warn('Could not decrypt session:', row.id, decryptErr.message);
        }
      }

      _sessionHistory = sessions;
      _patientRef     = patientRef;

      console.log(`✅ Loaded ${sessions.length} sessions for patient`);
      return sessions;

    } catch (e) {
      if (e.message === 'WRONG_CODE') throw e;
      console.warn('loadPatientHistory error:', e.message);
      return [];
    }
  }

  /**
   * Get formatted history for Claude's context
   * Drop-in for buildAIContext() in app.js
   */
  function getHistoryForClaude() {
    return MeridianCrypto.formatHistoryForClaude(_sessionHistory);
  }

  /**
   * Get session count for a patient (public metadata — no decryption needed)
   */
  async function getPatientSessionCount(patientId) {
    if (!_therapistId) return 0;
    const patientRef = await encryptPatientRef(patientId);
    const sb = _supa();
    const { data } = await sb
      .from('session_vault')
      .select('id', { count: 'exact' })
      .eq('therapist_id', _therapistId)
      .eq('patient_ref', patientRef);
    return data ? data.length : 0;
  }

  /**
   * Get all patients with session metadata for CRM display
   * Returns public metadata only (no decryption needed)
   */
  async function getAllPatientsMetadata() {
    if (!_therapistId) return [];
    const sb = _supa();
    const { data } = await sb
      .from('session_vault')
      .select('patient_ref, session_number, session_date_str, session_date, has_safety_flags')
      .eq('therapist_id', _therapistId)
      .order('session_date', { ascending: false });

    if (!data) return [];

    // Group by patient_ref — latest session per patient
    const byPatient = {};
    data.forEach(row => {
      if (!byPatient[row.patient_ref]) {
        byPatient[row.patient_ref] = {
          patient_ref:     row.patient_ref,
          session_count:   0,
          last_session:    row.session_date_str,
          has_safety_flags: false
        };
      }
      byPatient[row.patient_ref].session_count++;
      if (row.has_safety_flags) byPatient[row.patient_ref].has_safety_flags = true;
    });

    return Object.values(byPatient);
  }

  // ── PDF EXPORT ───────────────────────────────────────────────

  /**
   * Generate session summary PDF using browser print
   * Called after saveSession() — gives therapist local backup
   */
  function exportSessionPDF(sessionData, therapistProfile) {
    const w = window.open('', '_blank');
    const d = sessionData;
    const tp = therapistProfile || {};

    w.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
<title>סיכום מפגש — MERIDIAN</title>
<style>
  body { font-family: 'Arial Hebrew', Arial, sans-serif; direction: rtl; padding: 32px; color: #1a1a1a; max-width: 800px; margin: 0 auto; }
  .header { border-bottom: 3px solid #0d5c63; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
  .clinic-name { font-size: 22px; font-weight: 900; color: #0d5c63; }
  .session-badge { background: #0d5c63; color: white; padding: 6px 16px; border-radius: 8px; font-size: 13px; font-weight: 700; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 14px; font-weight: 900; color: #0d5c63; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 10px; letter-spacing: 1px; }
  .field-row { display: flex; gap: 8px; margin-bottom: 6px; font-size: 13px; }
  .field-label { font-weight: 700; min-width: 120px; color: #374151; }
  .field-value { flex: 1; color: #1f2937; }
  .ai-content { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; font-size: 12px; line-height: 1.8; white-space: pre-wrap; }
  .safety-flag { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 8px 12px; font-size: 12px; margin: 4px 0; }
  .metrics { display: flex; gap: 24px; background: #f8fafc; padding: 12px 16px; border-radius: 8px; font-size: 11px; }
  .metric { text-align: center; }
  .metric-val { font-size: 18px; font-weight: 900; color: #0d5c63; }
  .metric-lbl { color: #6b7280; margin-top: 2px; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; display: flex; justify-content: space-between; }
  .disclaimer { background: #fafafa; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 14px; font-size: 10px; color: #6b7280; margin-top: 16px; line-height: 1.6; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="clinic-name">☯ ${tp.clinicName || 'MERIDIAN TCM'}</div>
    <div style="font-size:12px;color:#6b7280;margin-top:4px;">${tp.displayName || ''} · ${tp.email || ''}</div>
  </div>
  <div class="session-badge">מפגש ${d.sessionNumber || 1} · ${d.dateDisplay || new Date().toLocaleDateString('he-IL')}</div>
</div>

<div class="section">
  <div class="section-title">// פרטי המפגש</div>
  <div class="field-row"><span class="field-label">מטופל:</span><span class="field-value">${d.patientName || '—'}</span></div>
  <div class="field-row"><span class="field-label">תלונה עיקרית:</span><span class="field-value">${d.complaint || '—'}</span></div>
  <div class="field-row"><span class="field-label">תאריך:</span><span class="field-value">${d.dateDisplay || '—'}</span></div>
</div>

${d.queries && d.queries.length > 0 ? `
<div class="section">
  <div class="section-title">// שאלות שנשאלו</div>
  ${d.queries.map((q,i) => `<div class="field-row"><span class="field-label">שאלה ${i+1}:</span><span class="field-value">${q}</span></div>`).join('')}
</div>` : ''}

${d.aiSummary ? `
<div class="section">
  <div class="section-title">// תשובת הבינה המלאכותית</div>
  <div class="ai-content">${d.aiSummary}</div>
</div>` : ''}

${d.therapistNotes ? `
<div class="section">
  <div class="section-title">// הערות המטפל</div>
  <div class="ai-content" style="background:#eff6ff;border-color:#93c5fd;">${d.therapistNotes}</div>
</div>` : ''}

${d.safetyFlags && d.safetyFlags.length > 0 ? `
<div class="section">
  <div class="section-title">// דגלי בטיחות שהופעלו</div>
  ${d.safetyFlags.map(f => `<div class="safety-flag">⚠️ ${f}</div>`).join('')}
</div>` : ''}

<div class="section">
  <div class="section-title">// מדדי מפגש</div>
  <div class="metrics">
    <div class="metric"><div class="metric-val">${d.queryCount || 0}</div><div class="metric-lbl">חיפושים</div></div>
    <div class="metric"><div class="metric-val">${d.tokenCount || 0}</div><div class="metric-lbl">טוקנים</div></div>
    <div class="metric"><div class="metric-val">$${(d.costUsd || 0).toFixed(4)}</div><div class="metric-lbl">עלות</div></div>
    <div class="metric"><div class="metric-val">${d.durationMinutes || 0}</div><div class="metric-lbl">דקות</div></div>
  </div>
</div>

<div class="disclaimer">
  ⚖️ כתב ויתור: דוח זה נוצר על ידי MERIDIAN כסיוע קליני בלבד ואינו מחליף שיקול דעת מקצועי.
  כל ההמלצות חייבות להיות מאומתות על ידי המטפל הקליני לפני יישום. המטפל אחראי באופן בלעדי לכל החלטה טיפולית.
</div>

<div class="footer">
  <span>☯ MERIDIAN TCM · מופעל על ידי Claude AI · avshi2@gmail.com</span>
  <span>הודפס: ${new Date().toLocaleString('he-IL')}</span>
</div>

<script>window.onload = function() { window.print(); }<\/script>
</body></html>`);
    w.document.close();
  }

  // ── UI HELPERS ────────────────────────────────────────────────

  /**
   * Show vault status badge in session header
   * Called after loadPatientHistory()
   */
  function showHistoryBadge(sessionCount, patientName) {
    const existing = document.getElementById('vaultHistoryBadge');
    if (existing) existing.remove();

    if (sessionCount === 0) return;

    const badge = document.createElement('div');
    badge.id = 'vaultHistoryBadge';
    badge.dir = 'rtl';
    badge.style.cssText = `
      position: fixed; top: 60px; left: 50%; transform: translateX(-50%);
      z-index: 8900;
      background: linear-gradient(135deg, #064e3b, #065f46);
      border: 1px solid #10b981;
      border-radius: 20px;
      padding: 6px 20px;
      font-family: Heebo, sans-serif;
      font-size: 12px;
      color: #6ee7b7;
      font-weight: 700;
      display: flex; align-items: center; gap: 10px;
      box-shadow: 0 4px 20px rgba(6,78,59,0.5);
      animation: vaultIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both;
    `;
    badge.innerHTML = `
      <span style="font-size:16px;">🔐</span>
      <span>היסטוריה קלינית נטענה — ${sessionCount} מפגש${sessionCount === 1 ? '' : 'ים'} קודמ${sessionCount === 1 ? '' : 'ים'}</span>
      <span style="background:rgba(16,185,129,0.2);border:1px solid #10b981;border-radius:10px;padding:1px 8px;font-size:10px;">✅ מוכן לאוד'</span>
    `;
    document.body.appendChild(badge);

    if (!document.getElementById('vaultBadgeStyle')) {
      const s = document.createElement('style');
      s.id = 'vaultBadgeStyle';
      s.textContent = `@keyframes vaultIn { from{opacity:0;transform:translateX(-50%) translateY(-10px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }`;
      document.head.appendChild(s);
    }

    // Auto-hide after 5 seconds
    setTimeout(() => badge.style.opacity = '0', 5000);
    setTimeout(() => badge.remove(), 5500);
  }

  /**
   * Show code entry prompt (non-blocking, beautiful)
   * Called when code not in sessionStorage
   */
  function showCodePrompt(onSuccess) {
    const existing = document.getElementById('vaultCodePrompt');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'vaultCodePrompt';
    overlay.dir = 'rtl';
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 99900;
      background: rgba(0,0,0,0.85);
      backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center;
      font-family: Heebo, sans-serif;
    `;
    overlay.innerHTML = `
      <div style="
        background: linear-gradient(160deg, #0f172a, #1e1b4b);
        border: 2px solid #4f46e5;
        border-radius: 20px;
        padding: 40px 48px;
        max-width: 440px; width: 90%;
        text-align: center;
        box-shadow: 0 0 60px rgba(79,70,229,0.4);
      ">
        <div style="font-size: 48px; margin-bottom: 12px;">🔐</div>
        <div style="font-family: 'Cinzel', serif; font-size: 20px; color: #a5b4fc; font-weight: 700; letter-spacing: 2px; margin-bottom: 6px;">MERIDIAN VAULT</div>
        <div style="font-size: 13px; color: #6366f1; margin-bottom: 28px;">הזן את הקוד הפרטי שלך לטעינת ההיסטוריה הקלינית</div>
        
        <input id="vaultCodeInput"
          type="text"
          placeholder="MRD-XXXX-XXXX-XXXX"
          maxlength="19"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="characters"
          spellcheck="false"
          dir="ltr"
          style="
            width: 100%; padding: 14px 16px;
            background: rgba(255,255,255,0.05);
            border: 2px solid rgba(99,102,241,0.5);
            border-radius: 10px;
            color: white;
            font-size: 15px;
            font-family: 'Space Mono', monospace;
            letter-spacing: 2px;
            text-align: center;
            outline: none;
            margin-bottom: 16px;
            white-space: nowrap;
            overflow: visible;
          "
        >

        <div id="vaultCodeError" style="color: #f87171; font-size: 12px; margin-bottom: 12px; min-height: 18px;"></div>

        <button id="vaultCodeBtn"
          style="
            width: 100%;
            background: linear-gradient(135deg, #4f46e5, #7c3aed);
            color: white; border: none; border-radius: 12px;
            padding: 14px; font-size: 15px; font-weight: 900;
            font-family: Heebo, sans-serif;
            cursor: pointer; letter-spacing: 1px;
            transition: all 0.2s;
          "
          onclick="window._vaultHandleCodeEntry()"
        >🔓 פתח את כספת הנתונים</button>

        <div style="margin-top: 16px; display:flex; gap:10px; justify-content:center; align-items:center;">
          <a href="vault_keygen.html" target="_blank"
            style="display:inline-block; padding:8px 16px; font-size:12px;
              background:rgba(79,70,229,0.15); border:1px solid rgba(99,102,241,0.4);
              border-radius:8px; color:#a5b4fc; text-decoration:none; font-weight:700;">
            🔑 צור קוד Vault חדש
          </a>
          <a href="#" onclick="window._vaultSkip()" style="color: #4f46e5; font-size: 12px; text-decoration: none;">דלג — המשך ללא היסטוריה</a>
        </div>

        <div style="margin-top: 20px; background: rgba(99,102,241,0.1); border-radius: 10px; padding: 12px; font-size: 11px; color: #818cf8; line-height: 1.7; text-align: right;">
          🔒 הקוד שלך לעולם לא נשמר בשרת.<br>
          הנתונים הקליניים מוצפנים ורק אתה יכול לקרוא אותם.<br>
          אבדת את הקוד? פנה אלינו — avshi2@gmail.com
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // Auto-format input as user types
    const input = document.getElementById('vaultCodeInput');
    input.addEventListener('input', function() {
      let val = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      // Remove MRD prefix if typed
      val = val.replace(/^MRD/, '');
      // Format: XXXX-XXXX-XXXX
      let parts = [];
      for (let i = 0; i < 3; i++) {
        const chunk = val.substring(i*4, (i+1)*4);
        if (chunk) parts.push(chunk);
      }
      this.value = parts.length ? 'MRD-' + parts.join('-') : '';
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') window._vaultHandleCodeEntry();
    });
    input.focus();

    // Wire up handlers
    window._vaultHandleCodeEntry = async function() {
      const code = document.getElementById('vaultCodeInput').value.trim();
      const errEl = document.getElementById('vaultCodeError');
      const btn   = document.getElementById('vaultCodeBtn');

      if (!MeridianCrypto.validateCode(code)) {
        const chars = code.replace(/[^A-Z0-9]/gi,'').replace(/^MRD/i,'').length;
        if (chars > 0 && chars < 12) {
          errEl.textContent = `⚠️ קוד חסר — יש ${chars} תווים, נדרשים 12. קוד מלא: MRD-XXXX-XXXX-XXXX`;
        } else {
          errEl.textContent = '⚠️ פורמט שגוי — הקוד חייב להיות MRD-XXXX-XXXX-XXXX';
        }
        return;
      }

      btn.textContent = '⏳ מאמת...';
      btn.disabled = true;
      errEl.textContent = '';

      try {
        const therapist = await loginWithCode(code);
        overlay.remove();
        if (onSuccess) onSuccess(therapist);
      } catch (e) {
        btn.textContent = '🔓 פתח את כספת הנתונים';
        btn.disabled = false;
        if (e.message === 'CODE_NOT_FOUND') {
          errEl.textContent = '❌ קוד לא נמצא — בדוק שהקלדת נכון';
        } else if (e.message === 'INVALID_CODE_FORMAT') {
          errEl.textContent = '⚠️ פורמט שגוי — MRD-XXXX-XXXX-XXXX';
        } else {
          errEl.textContent = '❌ שגיאה: ' + e.message;
        }
      }
    };

    window._vaultSkip = function() {
      overlay.remove();
      return false;
    };
  }

  // ── PUBLIC API ────────────────────────────────────────────────
  return {
    // Auth
    registerTherapist,
    loginWithCode,
    autoLogin,
    // Session
    saveSession,
    loadPatientHistory,
    getHistoryForClaude,
    getPatientSessionCount,
    getAllPatientsMetadata,
    // Export
    exportSessionPDF,
    // UI
    showHistoryBadge,
    showCodePrompt,
    // State
    getTherapistId: () => _therapistId,
    isReady: () => _isInitialized,
    getSessionHistory: () => _sessionHistory
  };

})();

window.MeridianVault = MeridianVault;
console.log('✅ MeridianVault loaded — encrypted session vault ready');
