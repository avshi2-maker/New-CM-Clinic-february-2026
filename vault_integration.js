(function() {
// vault_integration.js — MERIDIAN Session Save
// VERSION: NO-PROMPT IIFE — zero global variable conflicts

var VI_URL = 'https://iqfglrwjemogoycbzltt.supabase.co';
var VI_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZmdscndqZW1vZ295Y2J6bHR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NTM4ODMsImV4cCI6MjA4NDEyOTg4M30.DTREv3efs86_HzESyWm-7480ImfEVgC6T-xBdS6A2F8';

window.exitToClose = async function() {
  var params   = new URLSearchParams(window.location.search);
  var patient  = params.get('patient_name') || params.get('patient') || sessionStorage.getItem('tcm_patient_name') || '';
  var tokens   = document.getElementById('tokenCount')  ? document.getElementById('tokenCount').textContent  : '0';
  var cost     = document.getElementById('totalCost')   ? document.getElementById('totalCost').textContent.replace('$','') : '0';
  var duration = document.getElementById('queryTimer')  ? document.getElementById('queryTimer').textContent  : '';
  var queries  = window._meridianQueryCount || parseInt(sessionStorage.getItem('tcm_last_queries') || '0');

  sessionStorage.setItem('tcm_last_tokens',   tokens);
  sessionStorage.setItem('tcm_last_cost',     cost);
  sessionStorage.setItem('tcm_last_duration', duration);
  sessionStorage.setItem('tcm_last_queries',  queries);

  try {
    var lib    = window.supabase || window.Supabase;
    var client = window.supabaseClient || window.dbClient || (lib ? lib.createClient(VI_URL, VI_KEY) : null);
    if (client && patient) {
      var today = new Date().toISOString().split('T')[0];
      await client.from('patient_sessions').insert({
        patient_name: decodeURIComponent(patient),
        session_date: today,
        token_count:  parseInt(tokens)  || 0,
        cost_usd:     parseFloat(cost)  || 0,
        query_count:  parseInt(queries) || 0,
        ai_summary:   'מפגש AI — ' + new Date().toLocaleDateString('he-IL'),
        created_at:   new Date().toISOString()
      });
      console.log('✅ Session saved to patient_sessions');
    }
  } catch(e) {
    console.warn('Session save (non-blocking):', e.message);
  }

  var url = 'session_close_26022026.html'
    + '?patient_name=' + encodeURIComponent(patient)
    + '&tokens='       + encodeURIComponent(tokens)
    + '&cost='         + encodeURIComponent(cost)
    + '&duration='     + encodeURIComponent(duration)
    + '&queries='      + encodeURIComponent(queries);

  window.location.href = url;
};

console.log('✅ vault_integration.js loaded — NO-PROMPT IIFE version active');
})();
