// TCM Clinical Assistant - Module Stubs
// 23 February 2026
// NOTE: TCMVisuals + BodyImages defined by Supabase storage modules
// This file only provides functions NOT covered by storage modules

// ── EXPORT MODULE (not in storage modules) ────────────────────
const ExportModule = {
    show: function(opts) {
        if (typeof printReport === 'function') printReport();
        else window.print();
    },
    print: function() { window.print(); },
    whatsapp: function(subject) {
        const text = document.getElementById('reportContent')?.innerText ||
                     document.getElementById('results')?.innerText || subject || 'TCM Report';
        window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
    }
};

// ── TRAINING SYLLABUS (not in storage modules) ────────────────
function openTrainingFullView() {
    const el = document.getElementById('training-full-view') ||
               document.getElementById('training-content');
    if (el) el.style.display = 'block';
}

function filterTraining(value) {
    const items = document.querySelectorAll('[data-training-type]');
    items.forEach(item => {
        item.style.display = (value === 'all' || item.dataset.trainingType === value)
            ? 'block' : 'none';
    });
}

console.log('✅ modules.js loaded');
