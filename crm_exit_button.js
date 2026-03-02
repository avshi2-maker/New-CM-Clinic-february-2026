// ============================================================
// crm_exit_button.js
// MERIDIAN — Exit to Website button for CRM
// 02/03/2026
//
// HOW IT WORKS:
//   1. Reads home_url from Supabase app_config table
//   2. Injects a visible "← אתר MERIDIAN" button into the CRM nav
//   3. If Supabase unreachable → falls back to hardcoded GitHub Pages URL
//
// HOW TO ADD TO crm.html:
//   Before </body> add:
//   <script src="crm_exit_button.js"></script>
// ============================================================

(async function initCrmExitButton() {

  const SUPA_URL = 'https://iqfglrwjemogoycbzltt.supabase.co';
  const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZmdscndqZW1vZ295Y2J6bHR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NTM4ODMsImV4cCI6MjA4NDEyOTg4M30.DTREv3efs86_HzESyWm-7480ImfEVgC6T-xBdS6A2F8';
  const FALLBACK = 'https://avshi2-maker.github.io/New-CM-Clinic-february-2026/';

  // ── 1. Read home_url from Supabase ──────────────────────────
  let homeUrl = FALLBACK;
  try {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/app_config?key=eq.home_url&select=value`,
      { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.[0]?.value) {
        homeUrl = data[0].value;
        console.log('✅ CRM exit button: home_url from Supabase →', homeUrl);
      }
    }
  } catch (e) {
    console.warn('CRM exit button: Supabase unreachable, using fallback URL');
  }

  // ── 2. Build the button ──────────────────────────────────────
  const btn = document.createElement('a');
  btn.href      = homeUrl;
  btn.id        = 'exitToWebsiteBtn';
  btn.innerHTML = '🌐 אתר MERIDIAN';
  btn.title     = 'חזור לאתר הראשי';
  btn.style.cssText = `
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    background: linear-gradient(135deg, #c9a84c, #e8c96e);
    color: #0a0a0a;
    font-family: 'Heebo', sans-serif;
    font-size: 13px;
    font-weight: 700;
    text-decoration: none;
    border-radius: 8px;
    letter-spacing: 0.5px;
    white-space: nowrap;
    transition: opacity 0.2s, transform 0.15s;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(201,168,76,0.35);
  `;
  btn.onmouseenter = () => { btn.style.opacity = '0.85'; btn.style.transform = 'translateY(-1px)'; };
  btn.onmouseleave = () => { btn.style.opacity = '1';    btn.style.transform = 'translateY(0)'; };

  // ── 3. Inject into nav ───────────────────────────────────────
  // Try common CRM nav selectors in order of preference
  const targets = [
    document.querySelector('.topnav'),
    document.querySelector('nav'),
    document.querySelector('.navbar'),
    document.querySelector('header'),
    document.querySelector('.nav'),
  ].filter(Boolean);

  if (targets.length > 0) {
    const nav = targets[0];
    // Add to right side of nav
    nav.style.display     = nav.style.display     || 'flex';
    nav.style.alignItems  = nav.style.alignItems  || 'center';
    nav.style.justifyContent = nav.style.justifyContent || 'space-between';
    nav.appendChild(btn);
    console.log('✅ CRM exit button injected into nav');
  } else {
    // Nav not found — inject as floating button top-left
    btn.style.cssText += `
      position: fixed;
      top: 12px;
      left: 16px;
      z-index: 9999;
    `;
    document.body.appendChild(btn);
    console.log('✅ CRM exit button injected as floating button (nav not found)');
  }

})();
