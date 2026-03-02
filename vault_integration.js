// ============================================================
// MERIDIAN VAULT INTEGRATION — vault_integration.js
// Version: 1.0 — 01/03/2026
// Upload to: Supabase Storage → modules/vault_integration.js
// ============================================================
// Plugs into existing session.html + app.js
// Adds: auto-load history + save-on-exit + Claude history inject
// Depends on: crypto.js + session_vault.js (load before this)
// ============================================================

const MeridianVaultIntegration = (function() {

  'use strict';

  let _initialized  = false;
  let _therapistData = null;
  let _patientSessions = [];
  let _sessionStartTime = Date.now();

  // ── BOOT — called once on page load ──────────────────────────

  async function init() {
    if (_initialized) return;
    _initialized = true;

    console.log('🔐 MeridianVaultIntegration: booting...');

    // ── 1. Auth check ──────────────────────────────────────────
    const code = MeridianCrypto.getSessionCode()
               || sessionStorage.getItem('meridian_vault_code');

    if (!code) {
      // No code in memory — show prompt non-blocking
      console.log('🔐 Vault: no code in session — showing prompt');
      MeridianVault.showCodePrompt(async (therapist) => {
        _therapistData = therapist;
        await _loadPatientHistoryIfAvailable();
      });
      return;
    }

    // Code found — silent auto-login
    try {
      _therapistData = await MeridianVault.loginWithCode(code);
      console.log(`✅ Vault: auto-logged in as ${_therapistData.displayName}`);
      await _loadPatientHistoryIfAvailable();
    } catch(e) {
      if (e.message === 'CODE_NOT_FOUND') {
        // Code in session but definitively not in DB (PGRST116)
        // This means the code was never registered — safe to clear
        console.warn('🔐 Vault: code not in DB — clearing session');
        MeridianCrypto.clearSessionCode();
        // Show prompt so user can register or enter correct code
        MeridianVault.showCodePrompt(async (therapist) => {
          _therapistData = therapist;
          await _loadPatientHistoryIfAvailable();
        });
      } else {
        // DB_ERROR / network / table missing — code is still valid, do NOT clear
        // Session continues without history — non-blocking
        console.warn('🔐 Vault init warning (non-fatal, code preserved):', e.message);
      }
    }

    // ── 2. Wire "Save & Exit" button ──────────────────────────
    _wireExitButton();
  }

  // ── PATIENT HISTORY LOAD ──────────────────────────────────────

  async function _loadPatientHistoryIfAvailable() {
    // Get patient_id from URL
    const params    = new URLSearchParams(window.location.search);
    const patientId = params.get('patient_id') || params.get('apt') || null;

    if (!patientId) {
      console.log('ℹ️ Vault: no patient_id in URL — skipping history load');
      return;
    }

    try {
      _patientSessions = await MeridianVault.loadPatientHistory(patientId);
      
      if (_patientSessions.length > 0) {
        const patientName = _patientSessions[0].patient_name || 'המטופל';
        MeridianVault.showHistoryBadge(_patientSessions.length, patientName);
        console.log(`✅ Vault: ${_patientSessions.length} sessions loaded for patient`);
      }
    } catch(e) {
      if (e.message === 'WRONG_CODE') {
        console.error('🔐 Vault: wrong code for this patient data');
        // Show gentle error — don't block the session
        _showVaultError('הקוד שגוי — ההיסטוריה הקלינית לא נטענה');
      } else {
        console.warn('🔐 Vault: history load warning:', e.message);
      }
    }
  }

  // ── HISTORY INJECTION INTO CLAUDE ────────────────────────────

  /**
   * Get patient history formatted for Claude context
   * Call this from buildAIContext() in app.js
   * Drop-in patch — just call getHistoryBlock() and prepend to prompt
   */
  function getHistoryBlock() {
    if (!_patientSessions || _patientSessions.length === 0) return '';
    return MeridianVault.getHistoryForClaude();
  }

  /**
   * Patch buildAIContext — intercept and inject history
   * Called once from init() — transparent to existing code
   */
  function _patchBuildAIContext() {
    if (typeof window.buildAIContext !== 'function') return;
    const _original = window.buildAIContext;
    
    window.buildAIContext = function(results, reportDetail) {
      let prompt = _original(results, reportDetail);
      const history = getHistoryBlock();
      if (history) {
        // Inject history at the TOP of the prompt — Claude sees it first
        prompt = history + '\n\n' + prompt;
      }
      return prompt;
    };
    console.log('✅ Vault: buildAIContext patched with history injection');
  }

  // ── SAVE & EXIT INTEGRATION ───────────────────────────────────

  function _wireExitButton() {
    // Find the existing exit button(s)
    const exitBtns = [
      document.querySelector('button[onclick="exitToClose()"]'),
      document.querySelector('button[onclick*="exitToClose"]'),
      document.getElementById('exitBtn')
    ].filter(Boolean);

    exitBtns.forEach(btn => {
      const originalOnclick = btn.getAttribute('onclick');
      btn.removeAttribute('onclick');
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await _handleSaveAndExit(originalOnclick);
      });
      console.log('✅ Vault: Save & Exit button wired');
    });

    // Also listen for keyboard shortcut Ctrl+S
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        _handleSaveAndExit(null);
      }
    });
  }

  // ── SAVE & EXIT HANDLER ───────────────────────────────────────

  async function _handleSaveAndExit(fallbackFn) {
    // Check if vault is ready
    if (!MeridianCrypto.hasSessionCode()) {
      // No code — ask for it then save
      MeridianVault.showCodePrompt(async (therapist) => {
        _therapistData = therapist;
        await _showSaveDialog(fallbackFn);
      });
      return;
    }
    await _showSaveDialog(fallbackFn);
  }

  async function _showSaveDialog(fallbackFn) {
    const overlay = document.createElement('div');
    overlay.id = 'vaultSaveOverlay';
    overlay.dir = 'rtl';
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:99800;
      background:rgba(0,0,0,0.88);backdrop-filter:blur(8px);
      display:flex;align-items:center;justify-content:center;
      font-family:Heebo,sans-serif;
      animation:vaultIn 0.3s ease;
    `;

    // Get current session data
    const params    = new URLSearchParams(window.location.search);
    const patientName = decodeURIComponent(params.get('patient') || 'מטופל');
    const patientId   = params.get('patient_id') || params.get('apt') || '';
    const complaint   = decodeURIComponent(params.get('complaint') || '');

    // Read metrics from page
    const tokenCount   = parseInt(document.getElementById('tokenCount')?.textContent || '0') || 0;
    const costStr      = document.getElementById('totalCost')?.textContent?.replace('$','') || '0';
    const costUsd      = parseFloat(costStr) || 0;
    const queryCount   = parseInt(window._meridianQueryCount || 0);
    const durationMin  = Math.round((Date.now() - _sessionStartTime) / 60000);
    const lastAI       = window.lastSearchResults || '';
    const currentQueries = window.currentQueries || [];

    overlay.innerHTML = `
      <div style="
        background:linear-gradient(160deg,#0f172a,#1a1b2e);
        border:2px solid #4f46e5;
        border-radius:20px;padding:36px 40px;
        max-width:500px;width:92%;
        box-shadow:0 0 60px rgba(79,70,229,0.4);
      ">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="font-size:36px;margin-bottom:8px;">🔐</div>
          <div style="font-family:'Space Mono',monospace;font-size:14px;color:#a5b4fc;letter-spacing:2px;margin-bottom:4px;">MERIDIAN VAULT</div>
          <div style="font-size:18px;font-weight:900;color:white;">שמור מפגש ← ${patientName}</div>
        </div>

        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:14px 16px;margin-bottom:16px;">
          <div style="font-size:11px;color:rgba(255,255,255,0.4);letter-spacing:2px;margin-bottom:8px;font-family:'Space Mono',monospace;">// סיכום המפגש</div>
          <div style="display:flex;gap:20px;justify-content:center;flex-wrap:wrap;">
            <div style="text-align:center;"><div style="font-size:22px;font-weight:900;color:#a5b4fc;">${queryCount}</div><div style="font-size:11px;color:rgba(255,255,255,0.4);">חיפושים</div></div>
            <div style="text-align:center;"><div style="font-size:22px;font-weight:900;color:#34d399;">${tokenCount.toLocaleString()}</div><div style="font-size:11px;color:rgba(255,255,255,0.4);">טוקנים</div></div>
            <div style="text-align:center;"><div style="font-size:22px;font-weight:900;color:#fbbf24;">$${costUsd.toFixed(4)}</div><div style="font-size:11px;color:rgba(255,255,255,0.4);">עלות</div></div>
            <div style="text-align:center;"><div style="font-size:22px;font-weight:900;color:#f472b6;">${durationMin}</div><div style="font-size:11px;color:rgba(255,255,255,0.4);">דקות</div></div>
          </div>
        </div>

        <div style="margin-bottom:16px;">
          <label style="font-size:12px;color:rgba(255,255,255,0.5);display:block;margin-bottom:6px;">הערות מטפל (אופציונלי)</label>
          <textarea id="therapistNotesInput"
            placeholder="תגובת המטופל לטיפול, תרגולים שניתנו, תורנות הבאה..."
            rows="3"
            style="width:100%;padding:10px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:white;font-family:Heebo,sans-serif;font-size:13px;outline:none;resize:vertical;direction:rtl;"
          ></textarea>
        </div>

        <div style="display:flex;gap:10px;">
          <button onclick="window._vaultDoSave()" id="vaultSaveBtn"
            style="flex:1;padding:13px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;border:none;border-radius:10px;font-size:14px;font-weight:900;cursor:pointer;font-family:Heebo,sans-serif;letter-spacing:0.5px;">
            🔐 שמור בכספת ← צא
          </button>
          <button onclick="window._vaultSkipSave()"
            style="padding:13px 20px;background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.5);border:1px solid rgba(255,255,255,0.1);border-radius:10px;font-size:13px;cursor:pointer;font-family:Heebo,sans-serif;">
            צא ללא שמירה
          </button>
        </div>

        <div id="vaultSaveStatus" style="text-align:center;font-size:12px;color:rgba(255,255,255,0.4);margin-top:12px;min-height:20px;"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    // ── Save handler ──────────────────────────────────────────
    window._vaultDoSave = async function() {
      const btn    = document.getElementById('vaultSaveBtn');
      const status = document.getElementById('vaultSaveStatus');
      const notes  = document.getElementById('therapistNotesInput').value;

      btn.disabled = true;
      btn.textContent = '⏳ מצפין ושומר...';
      status.textContent = '🔐 מצפין נתונים בדפדפן שלך...';

      try {
        // Collect safety flags from audit log
        const safetyFlags = (window.auditLog || [])
          .filter(e => e.type && e.type.includes('safety'))
          .map(e => e.rule_title || e.condition || e.drug || 'safety event');

        const result = await MeridianVault.saveSession({
          patientId:       patientId,
          patientName:     patientName,
          complaint:       complaint,
          queries:         currentQueries,
          aiSummary:       lastAI.substring(0, 2000),
          therapistNotes:  notes,
          safetyFlags:     safetyFlags,
          safetySeverity:  safetyFlags.length > 0 ? 'warn' : null,
          tokenCount:      tokenCount,
          costUsd:         costUsd,
          queryCount:      queryCount,
          durationMinutes: durationMin
        });

        status.textContent = `✅ מפגש ${result.sessionNumber} נשמר בהצלחה!`;
        status.style.color = '#34d399';

        // Auto-download PDF after 800ms
        setTimeout(() => {
          const therapistProfile = {
            displayName: sessionStorage.getItem('meridian_display_name') || '',
            clinicName:  sessionStorage.getItem('meridian_clinic_name') || 'MERIDIAN TCM',
            email:       sessionStorage.getItem('meridian_email') || ''
          };
          MeridianVault.exportSessionPDF({
            patientName, complaint,
            queries:        currentQueries,
            aiSummary:      lastAI.substring(0, 2000),
            therapistNotes: notes,
            safetyFlags,
            tokenCount, costUsd, queryCount,
            durationMinutes: durationMin,
            sessionNumber: result.sessionNumber,
            dateDisplay:   new Date().toLocaleDateString('he-IL')
          }, therapistProfile);
        }, 800);

        // Navigate after 1.5s
        setTimeout(() => {
          overlay.remove();
          if (fallbackFn) {
            eval(fallbackFn);
          } else {
            window.location.href = 'crm.html';
          }
        }, 1800);

      } catch(e) {
        btn.disabled = false;
        btn.textContent = '🔐 שמור בכספת ← צא';
        status.textContent = '❌ שגיאה: ' + e.message;
        status.style.color = '#f87171';
      }
    };

    // ── Skip handler ──────────────────────────────────────────
    window._vaultSkipSave = function() {
      overlay.remove();
      if (fallbackFn) {
        eval(fallbackFn);
      } else {
        window.location.href = 'crm.html';
      }
    };
  }

  // ── VAULT ERROR DISPLAY ───────────────────────────────────────
  function _showVaultError(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:80px;right:20px;z-index:9999;background:#1e0a0a;color:#f87171;border:1px solid #dc2626;border-radius:10px;padding:10px 18px;font-family:Heebo,sans-serif;font-size:13px;direction:rtl;max-width:280px;';
    toast.textContent = '🔐 ' + msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 6000);
  }

  // ── CRM PATIENT CARDS ENHANCEMENT ────────────────────────────

  /**
   * Enhance CRM patient cards with session history metadata
   * Call this from CRM after cards are rendered
   * Reads public metadata only — no decryption needed
   */
  async function enhanceCRMCards() {
    if (!MeridianVault.isReady()) return;

    try {
      const allMeta = await MeridianVault.getAllPatientsMetadata();
      if (!allMeta || allMeta.length === 0) return;

      // Build lookup by patient_ref
      const byRef = {};
      allMeta.forEach(m => { byRef[m.patient_ref] = m; });

      // For each patient card in CRM, add vault badge
      document.querySelectorAll('[data-patient-id]').forEach(async (card) => {
        const pid = card.getAttribute('data-patient-id');
        if (!pid) return;
        
        // Get encrypted ref for this patient
        const patientRef = await _getPatientRef(pid);
        const meta = byRef[patientRef];
        if (!meta) return;

        // Add badge to card
        const badge = document.createElement('div');
        badge.style.cssText = 'display:inline-flex;align-items:center;gap:6px;background:rgba(79,70,229,0.15);border:1px solid rgba(79,70,229,0.3);border-radius:8px;padding:3px 10px;font-size:11px;color:#a5b4fc;margin-top:6px;';
        badge.innerHTML = `🔐 ${meta.session_count} מפגש${meta.session_count > 1 ? 'ים' : ''} · ${meta.last_session}${meta.has_safety_flags ? ' · ⚠️' : ''}`;
        card.appendChild(badge);
      });

    } catch(e) {
      console.warn('CRM vault enhancement error:', e.message);
    }
  }

  async function _getPatientRef(patientId) {
    const code = MeridianCrypto.getSessionCode();
    if (!code) return null;
    const h = await MeridianCrypto.hashCode(code + patientId);
    return h.substring(0, 32);
  }

  // ── PUBLIC API ────────────────────────────────────────────────
  return {
    init,
    getHistoryBlock,
    enhanceCRMCards,
    patchBuildAIContext: _patchBuildAIContext,
    getTherapistData: () => _therapistData,
    getPatientSessions: () => _patientSessions
  };

})();

window.MeridianVaultIntegration = MeridianVaultIntegration;

// ── AUTO-BOOT if in session context ──────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Only auto-boot on session.html
  const isSessionPage = window.location.pathname.includes('session') ||
                        document.title.includes('Clinical Assistant') ||
                        document.getElementById('searchInput1');

  if (isSessionPage) {
    await MeridianVaultIntegration.init();
    // Patch buildAIContext after app.js has loaded
    setTimeout(() => MeridianVaultIntegration.patchBuildAIContext(), 1500);
  }

  // CRM enhancement
  const isCRMPage = window.location.pathname.includes('crm') ||
                    document.getElementById('patientCards');
  if (isCRMPage) {
    setTimeout(() => MeridianVaultIntegration.enhanceCRMCards(), 2000);
  }
});

console.log('✅ MeridianVaultIntegration loaded — transparent session vault active');
