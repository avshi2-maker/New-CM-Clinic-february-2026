// TCM Clinical Assistant - Pulse & Tongue Gallery
// Extracted: 23 February 2026

// PULSE & TONGUE GALLERY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

async function showPulseGallery() {
    // Create modal
    let modal = document.getElementById('pulse-gallery-modal');
    if (modal) modal.remove();
    
    modal = document.createElement('div');
    modal.id = 'pulse-gallery-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:99999;overflow-y:auto;padding:20px;';
    modal.innerHTML = `
        <div style="max-width:900px;margin:0 auto;background:white;border-radius:16px;padding:20px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                <button onclick="document.getElementById('pulse-gallery-modal').remove()" style="background:#ef4444;color:white;padding:10px 20px;border-radius:8px;border:none;cursor:pointer;font-weight:bold;">✕ סגור</button>
                <h2 style="font-size:24px;font-weight:bold;color:#dc2626;">💗 דפוסי דופק</h2>
            </div>
            <div id="pulse-gallery-content" style="text-align:center;padding:40px;">
                <div style="font-size:18px;color:#666;">טוען דפוסי דופק...</div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Fetch data from Supabase
    try {
        const { data, error } = await supabaseClient
            .from('diagnostic_rag_pulse_patterns_20260129')
            .select('*')
            .order('category');
        
        if (error) throw error;
        
        const content = document.getElementById('pulse-gallery-content');
        if (data && data.length > 0) {
            content.innerHTML = `
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:15px;direction:rtl;">
                    ${data.map(p => `
                        <div style="background:linear-gradient(135deg,#fef2f2,#fee2e2);border:2px solid #fca5a5;border-radius:12px;padding:15px;text-align:right;">
                            <div style="font-size:18px;font-weight:bold;color:#dc2626;margin-bottom:5px;">${p.pulse_name_he}</div>
                            <div style="font-size:14px;color:#7f1d1d;margin-bottom:5px;">${p.pulse_name_cn || ''} ${p.pinyin || ''}</div>
                            <div style="font-size:12px;color:#666;margin-bottom:8px;"><strong>קטגוריה:</strong> ${p.category || ''}</div>
                            ${p.depth ? `<div style="font-size:11px;color:#888;"><strong>עומק:</strong> ${p.depth}</div>` : ''}
                            ${p.speed ? `<div style="font-size:11px;color:#888;"><strong>מהירות:</strong> ${p.speed}</div>` : ''}
                            ${p.characteristics ? `<div style="font-size:12px;color:#444;margin-top:8px;padding-top:8px;border-top:1px solid #fca5a5;">${p.characteristics}</div>` : ''}
                            ${p.clinical_significance ? `<div style="font-size:11px;color:#666;margin-top:5px;font-style:italic;">${p.clinical_significance}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
                <div style="margin-top:20px;text-align:center;">
                    <p style="color:#666;font-size:14px;">סה"כ ${data.length} דפוסי דופק</p>
                </div>
            `;
        } else {
            content.innerHTML = '<div style="color:#ef4444;">לא נמצאו דפוסי דופק</div>';
        }
    } catch (error) {
        console.error('Error loading pulse gallery:', error);
        document.getElementById('pulse-gallery-content').innerHTML = `<div style="color:#ef4444;">שגיאה: ${error.message}</div>`;
    }
}

async function showTongueGallery() {
    // Create modal
    let modal = document.getElementById('tongue-gallery-modal');
    if (modal) modal.remove();
    
    modal = document.createElement('div');
    modal.id = 'tongue-gallery-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:99999;overflow-y:auto;padding:20px;';
    modal.innerHTML = `
        <div style="max-width:900px;margin:0 auto;background:white;border-radius:16px;padding:20px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                <button onclick="document.getElementById('tongue-gallery-modal').remove()" style="background:#ef4444;color:white;padding:10px 20px;border-radius:8px;border:none;cursor:pointer;font-weight:bold;">✕ סגור</button>
                <h2 style="font-size:24px;font-weight:bold;color:#db2777;">👅 ממצאי לשון</h2>
            </div>
            <div style="text-align:center;margin-bottom:15px;">
                <button onclick="BodyImages.showTongue();" style="background:#10b981;color:white;padding:10px 20px;border-radius:8px;border:none;cursor:pointer;font-weight:bold;">📷 צפה בתמונת לשון</button>
            </div>
            <div id="tongue-gallery-content" style="text-align:center;padding:40px;">
                <div style="font-size:18px;color:#666;">טוען ממצאי לשון...</div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Fetch data from Supabase
    try {
        const { data, error } = await supabaseClient
            .from('diagnostic_rag_tongue_findings_20260129')
            .select('*')
            .order('aspect');
        
        if (error) throw error;
        
        const content = document.getElementById('tongue-gallery-content');
        if (data && data.length > 0) {
            // Group by aspect
            const grouped = data.reduce((acc, t) => {
                const aspect = t.aspect || 'כללי';
                if (!acc[aspect]) acc[aspect] = [];
                acc[aspect].push(t);
                return acc;
            }, {});
            
            content.innerHTML = `
                <div style="direction:rtl;">
                    ${Object.entries(grouped).map(([aspect, items]) => `
                        <div style="margin-bottom:20px;">
                            <h3 style="font-size:18px;font-weight:bold;color:#db2777;margin-bottom:10px;padding:10px;background:#fdf2f8;border-radius:8px;">${aspect}</h3>
                            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;">
                                ${items.map(t => `
                                    <div style="background:linear-gradient(135deg,#fdf2f8,#fce7f3);border:2px solid #f9a8d4;border-radius:12px;padding:12px;text-align:right;">
                                        <div style="font-size:16px;font-weight:bold;color:#db2777;">${t.finding_he}</div>
                                        <div style="font-size:13px;color:#9d174d;margin-bottom:5px;">${t.finding_cn || ''}</div>
                                        ${t.characteristics ? `<div style="font-size:12px;color:#444;margin-top:5px;">${t.characteristics}</div>` : ''}
                                        ${t.clinical_significance ? `<div style="font-size:11px;color:#666;margin-top:5px;font-style:italic;">${t.clinical_significance}</div>` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div style="margin-top:20px;text-align:center;">
                    <p style="color:#666;font-size:14px;">סה"כ ${data.length} ממצאי לשון</p>
                </div>
            `;
        } else {
            content.innerHTML = '<div style="color:#ef4444;">לא נמצאו ממצאי לשון</div>';
        }
    } catch (error) {
        console.error('Error loading tongue gallery:', error);
        document.getElementById('tongue-gallery-content').innerHTML = `<div style="color:#ef4444;">שגיאה: ${error.message}</div>`;
    }
}

// ═══════════════════════════════════════════════════════════════
// YIN-YANG MODULE FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function showYinYang() {
    document.getElementById('yinyang-module').style.display = 'block';
    document.body.style.overflow = 'hidden';
}
function hideYinYang() {
    document.getElementById('yinyang-module').style.display = 'none';
    document.body.style.overflow = 'auto';
}
function showYinYangResults() {
    // Open Yin-Yang module
    document.getElementById('yinyang-module').style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Check if questionnaire was completed (scores exist and have values)
    const hasAnswers = typeof scores !== 'undefined' && 
                       (scores.yin > 0 || scores.yang > 0 || scores.deficiency > 0 || scores.excess > 0);
    
    if (hasAnswers) {
        // Show results
        const results = document.getElementById('results');
        if (results) {
            document.getElementById('questionnaire').style.display = 'none';
            document.getElementById('live-scores').style.display = 'none';
            results.style.display = 'block';
            showResults();
        }
    } else {
        // No answers yet - show alert
        alert('לא נמצאו תשובות! יש למלא את שאלון הערכת יין-יאנג (11 שאלות) קודם.');
        // Show questionnaire
        document.getElementById('questionnaire').style.display = 'block';
        document.getElementById('live-scores').style.display = 'block';
        document.getElementById('results').style.display = 'none';
    }
}

console.log('✅ Voice Search loaded');
