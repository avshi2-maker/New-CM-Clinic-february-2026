(function() {
// vault_integration.js — MERIDIAN Session Save
// VERSION: SUPABASE-ONLY — saves to patient_sessions, passes row ID to goodbye page

var VI_URL = 'https://iqfglrwjemogoycbzltt.supabase.co';
var VI_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZmdscndqZW1vZ295Y2J6bHR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NTM4ODMsImV4cCI6MjA4NDEyOTg4M30.DTREv3efs86_HzESyWm-7480ImfEVgC6T-xBdS6A2F8';

window.exitToClose = async function() {
  var params   = new URLSearchParams(window.location.search);
  var patient  = params.get('patient_name') || params.get('patient') || sessionStorage.getItem('tcm_patient_name') || '';
  var tokens   = document.getElementById('tokenCount')  ? document.getElementById('tokenCount').textContent.trim()          : '0';
  var cost     = document.getElementById('totalCost')   ? document.getElementById('totalCost').textContent.replace('$','').trim() : '0';
  var duration = document.getElementById('queryTimer')  ? document.getElementById('queryTimer').textContent.trim()           : '';
  var queries  = window._meridianQueryCount || parseInt(sessionStorage.getItem('tcm_last_queries') || '0');

  var sessionId = null;

  try {
    var lib    = window.supabase || window.Supabase;
    var client = window.supabaseClient || window.dbClient || (lib ? lib.createClient(VI_URL, VI_KEY) : null);

    if (client) {
      var today = new Date().toISOString().split('T')[0];
      var result = await client.from('patient_sessions').insert({
        patient_name: patient ? decodeURIComponent(patient) : 'מטופל',
        session_date: today,
        token_count:  parseInt(tokens)  || 0,
        cost_usd:     parseFloat(cost)  || 0,
        query_count:  parseInt(queries) || 0,
        duration_text: duration || '',
        ai_summary:   'מפגש AI — ' + new Date().toLocaleDateString('he-IL'),
        created_at:   new Date().toISOString()
      }).select('id').single();

      if (result && result.data && result.data.id) {
        sessionId = result.data.id;
        console.log('✅ Session saved — ID:', sessionId);
      } else {
        console.warn('Session saved but no ID returned:', result);
      }
    }
  } catch(e) {
    console.warn('Session save (non-blocking):', e.message);
  }

  // Navigate to goodbye page — pass only the session ID
  var url = 'session_close_26022026.html';
  if (sessionId) {
    url += '?sid=' + encodeURIComponent(sessionId);
  } else {
    // Fallback: pass patient name only so goodbye page isn't empty
    url += '?patient_name=' + encodeURIComponent(patient || 'מטופל');
  }

  window.location.href = url;
};

console.log('✅ vault_integration.js loaded — SUPABASE-ONLY version active');
})();
