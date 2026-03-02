// vault_integration.js — MERIDIAN Session Save
// VERSION: NO-PROMPT — saves to patient_sessions then EXITS immediately
// The vault prompt loop bug is DEAD. This file never asks for a code.

const SUPA_URL = 'https://iqfglrwjemogoycbzltt.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZmdscndqZW1vZ295Y2J6bHR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NTM4ODMsImV4cCI6MjA4NDEyOTg4M30.DTREv3efs86_HzESyWm-7480ImfEVgC6T-xBdS6A2F8';

// ── MAIN: called by the שמור וצא button ──────────────────────
window.exitToClose = async function exitToClose() {
  const params   = new URLSearchParams(window.location.search);
  const patient  = params.get('patient_name') || params.get('patient') || sessionStorage.getItem('tcm_patient_name') || '';
  const tokens   = document.getElementById('tokenCount')  ? document.getElementById('tokenCount').textContent  : '0';
  const cost     = document.getElementById('totalCost')   ? document.getElementById('totalCost').textContent.replace('$','') : '0';
  const duration = document.getElementById('queryTimer')  ? document.getElementById('queryTimer').textContent  : '';
  const queries  = window._meridianQueryCount || parseInt(sessionStorage.getItem('tcm_last_queries') || '0');

  // Store in sessionStorage for goodbye page
  sessionStorage.setItem('tcm_last_tokens',   tokens);
  sessionStorage.setItem('tcm_last_cost',     cost);
  sessionStorage.setItem('tcm_last_duration', duration);
  sessionStorage.setItem('tcm_last_queries',  queries);

  // ── SAVE to patient_sessions (always, no vault needed) ──
  try {
    const lib = window.supabase || window.Supabase;
    const client = window.supabaseClient || window.dbClient ||
      (lib ? lib.createClient(SUPA_URL, SUPA_KEY) : null);

    if (client && patient) {
      const today = new Date().toISOString().split('T')[0];
      await client.from('patient_sessions').insert({
        patient_name:   decodeURIComponent(patient),
        session_date:   today,
        token_count:    parseInt(tokens) || 0,
        cost_usd:       parseFloat(cost) || 0,
        query_count:    parseInt(queries) || 0,
        ai_summary:     'מפגש AI — ' + new Date().toLocaleDateString('he-IL'),
        created_at:     new Date().toISOString()
      });
      console.log('✅ Session saved to patient_sessions');
    }
  } catch(e) {
    console.warn('Session save warning (non-blocking):', e.message);
  }

  // ── ALWAYS EXIT — no prompt, no loop ─────────────────────
  const url = 'session_close_26022026.html'
    + '?patient_name=' + encodeURIComponent(patient)
    + '&tokens='       + encodeURIComponent(tokens)
    + '&cost='         + encodeURIComponent(cost)
    + '&duration='     + encodeURIComponent(duration)
    + '&queries='      + encodeURIComponent(queries);

  window.location.href = url;
};

console.log('✅ vault_integration.js loaded — NO-PROMPT version active');
