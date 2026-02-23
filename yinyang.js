// TCM Clinical Assistant - Yin-Yang Module
// Extracted: 23 February 2026

energy_level: {
                very_low: { yang_def: 2 },
                low: { yang_def: 1 },
                balanced: { yin_bal: 1, yang_bal: 1 },
                high_agitated: { yang_excess: 2 }
            },
            temperature_preference: {
                very_cold: { yang_def: 2 },
                slightly_cold: { yang_def: 1 },
                neutral: { yin_bal: 1, yang_bal: 1 },
                hot: { yin_def: 2, yang_excess: 1 },
                evening_hot: { yin_def: 2 }
            },
            cold_sensitivity: {
                none: {},
                mild: { yang_def: 1 },
                marked: { yang_def: 2 }
            },
            heat_sensation: {
                none: {},
                pm_heat: { yin_def: 2 },
                all_day_heat: { yang_excess: 2 },
                night_sweats: { yin_def: 3 }
            },
            sweating: {
                normal: {},
                spontaneous: { qi_def: 1, yang_def: 1 },
                night: { yin_def: 2 },
                no_sweat_cold: { yang_def: 2 }
            },
            thirst: {
                low_thirst: { yang_def: 1 },
                normal: {},
                high_cold: { yang_excess: 1, heat: 1 },
                dry_mouth_little_drink: { yin_def: 2 }
            },
            sleep: {
                good: { yin_bal: 1, yang_bal: 1 },
                difficulty_falling: { yang_excess: 1, yin_def: 1 },
                waking_night: { yin_def: 2 },
                excessive_sleep: { yang_def: 2 }
            },
            stool: {
                normal: {},
                loose_cold: { yang_def: 2 },
                dry_constipation: { yin_def: 2, heat: 1 }
            },
            urine: {
                normal: {},
                frequent_clear: { yang_def: 2 },
                dark_scanty: { yin_def: 1, heat: 1 }
            },
            body_build: {
                thin_dry: { yin_def: 2 },
                puffy_cold: { yang_def: 2 },
                robust_red_face: { yang_excess: 2 },
                balanced: { yin_bal: 1, yang_bal: 1 }
            },
            pain: {
                cold_pain_better_warm: { yang_def: 1 },
                burning_pain: { yin_def: 1, yang_excess: 1 },
                none: {}
            }
        };

     // ================================================================
// ================================================================

let patternDefinitions = {};

// Fallback pattern definitions if database fails
const fallbackPatterns = {
    'yin_deficiency': {
        name: 'חסר יין',
        name_cn: '阴虚',
        badge_class: 'bg-red-100 text-red-800',
        patient_friendly: 'גופך מראה סימנים של חסר יין - חום פנימי, יובש, ואי שקט.',
        typical_signs: ['חום בכפות הידיים והרגליים', 'הזעות לילה', 'יובש בפה', 'אי שקט'],
        tcm_notes: 'יש לזין את היין ולצנן חום ריק',
        safety_flags: []
    },
    'yang_deficiency': {
        name: 'חסר יאנג',
        name_cn: '阳虚',
        badge_class: 'bg-blue-100 text-blue-800',
        patient_friendly: 'גופך מראה סימנים של חסר יאנג - קור, עייפות, וחולשה.',
        typical_signs: ['תחושת קור', 'עייפות', 'גפיים קרות', 'שתן בהיר ומרובה'],
        tcm_notes: 'יש לחמם ולחזק את היאנג',
        safety_flags: []
    },
    'yin_yang_balance': {
        name: 'איזון יין-יאנג',
        name_cn: '阴阳平衡',
        badge_class: 'bg-green-100 text-green-800',
        patient_friendly: 'גופך מראה איזון טוב בין יין ויאנג.',
        typical_signs: ['אנרגיה יציבה', 'שינה טובה', 'עיכול תקין', 'מצב רוח מאוזן'],
        tcm_notes: 'שמירה על האיזון הקיים',
        safety_flags: []
    },
    'yin_def_yang_excess': {
        name: 'חסר יין עם עודף יאנג',
        name_cn: '阴虚阳亢',
        badge_class: 'bg-orange-100 text-orange-800',
        patient_friendly: 'גופך מראה חסר יין עם עליית יאנג - חום, אי שקט, ולחץ.',
        typical_signs: ['כאבי ראש', 'סחרחורת', 'פנים אדומות', 'עצבנות'],
        tcm_notes: 'יש לזין יין ולהרגיע יאנג עולה',
        safety_flags: ['לחץ דם גבוה אפשרי']
    },
    'yang_def_yin_excess': {
        name: 'חסר יאנג עם עודף יין',
        name_cn: '阳虚阴盛',
        badge_class: 'bg-purple-100 text-purple-800',
        patient_friendly: 'גופך מראה חסר יאנג עם הצטברות יין - קור, כבדות, ונפיחות.',
        typical_signs: ['נפיחות', 'כבדות בגוף', 'קור חזק', 'ליחה'],
        tcm_notes: 'יש לחמם יאנג ולייבש לחות',
        safety_flags: []
    },
    'mixed_or_undefined': {
        name: 'דפוס מעורב',
        name_cn: '混合',
        badge_class: 'bg-gray-100 text-gray-800',
        patient_friendly: 'גופך מראה דפוס מעורב שדורש אבחון מעמיק יותר.',
        typical_signs: ['תסמינים משתנים', 'תמונה לא ברורה'],
        tcm_notes: 'מומלץ אבחון מקיף נוסף',
        safety_flags: []
    }
};

async function loadYinYangPatterns() {
    try {
        
        const { data, error } = await supabaseClient
            .from('yin_yang_pattern_definitions')
            .select('*');
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            console.log('⚠️ No yin-yang patterns in DB, using fallback patterns');
            patternDefinitions = fallbackPatterns;
            return true;
        }
        
        patternDefinitions = {};
        
        data.forEach(pattern => {
            patternDefinitions[pattern.pattern_id] = {
                name: pattern.name_he,
                name_en: pattern.name_en,
                name_cn: pattern.name_cn,
                badge_class: pattern.badge_class,
                patient_friendly: pattern.patient_friendly_he,
                typical_signs: pattern.typical_signs || [],
                tcm_notes: pattern.tcm_notes,
                safety_flags: pattern.safety_flags || []
            };
        });
        
        console.log(`✅ Loaded ${data.length} yin-yang patterns from database`);
        
        return true;
        
    } catch (error) {
        console.error('⚠️ Error loading yin-yang patterns, using fallback:', error.message);
        patternDefinitions = fallbackPatterns;
        return true; // Return true so module still works
    }
}

// Fetch pulse and tongue findings based on pattern
async function fetchDiagnosticData(pattern) {
    try {
        // Map pattern to search terms (multiple variations)
        const patternMap = {
            'yin_deficiency': ['yin', 'deficiency', 'חסר', 'יין', 'xu', 'heat', 'חום', 'dry', 'יובש'],
            'yang_deficiency': ['yang', 'deficiency', 'חסר', 'יאנג', 'xu', 'cold', 'קור', 'weak', 'חולשה'],
            'yin_yang_balance': ['balance', 'normal', 'איזון', 'תקין'],
            'yin_def_yang_excess': ['yin', 'deficiency', 'yang', 'excess', 'rising', 'עולה', 'heat'],
            'yang_def_yin_excess': ['yang', 'deficiency', 'cold', 'damp', 'לחות', 'קור'],
            'mixed_or_undefined': ['mixed', 'מעורב', 'complex']
        };
        
        const searchTerms = patternMap[pattern] || ['general'];
        
        // Fetch ALL pulse patterns (usually ~23 total)
        const { data: pulseData, error: pulseError } = await supabaseClient
            .from('diagnostic_rag_pulse_patterns_20260129')
            .select('pulse_name_he, pulse_name_cn, characteristics, clinical_significance, indicates_pattern, category')
            .order('category');
        
        if (pulseError) console.error('Pulse fetch error:', pulseError);
        
        // Filter pulse data by pattern match - check indicates_pattern, characteristics, and clinical_significance
        let matchingPulses = (pulseData || []).filter(p => {
            const searchText = JSON.stringify(p.indicates_pattern || {}).toLowerCase() + ' ' +
                               (p.characteristics || '').toLowerCase() + ' ' +
                               (p.clinical_significance || '').toLowerCase();
            return searchTerms.some(term => searchText.includes(term.toLowerCase()));
        }).slice(0, 4);
        
        // If no matches, show first few pulses as general reference
        if (matchingPulses.length === 0 && pulseData && pulseData.length > 0) {
            console.log('⚠️ No specific pulse matches, showing general pulses');
            matchingPulses = pulseData.slice(0, 3);
        }
        
        // Fetch ALL tongue findings (usually ~20 total)
        const { data: tongueData, error: tongueError } = await supabaseClient
            .from('diagnostic_rag_tongue_findings_20260129')
            .select('finding_he, finding_cn, aspect, characteristics, clinical_significance, indicates_pattern')
            .order('aspect');
        
        if (tongueError) console.error('Tongue fetch error:', tongueError);
        
        // Filter tongue data by pattern match
        let matchingTongue = (tongueData || []).filter(t => {
            const searchText = JSON.stringify(t.indicates_pattern || {}).toLowerCase() + ' ' +
                               (t.characteristics || '').toLowerCase() + ' ' +
                               (t.clinical_significance || '').toLowerCase();
            return searchTerms.some(term => searchText.includes(term.toLowerCase()));
        }).slice(0, 4);
        
        // If no matches, show first few tongue findings as general reference
        if (matchingTongue.length === 0 && tongueData && tongueData.length > 0) {
            console.log('⚠️ No specific tongue matches, showing general findings');
            matchingTongue = tongueData.slice(0, 3);
        }
        
        // Display pulse findings
        const pulseContainer = document.getElementById('pulse-findings');
        if (pulseContainer) {
            if (matchingPulses.length > 0) {
                pulseContainer.innerHTML = matchingPulses.map(p => `
                    <div class="bg-white p-3 rounded-lg shadow-sm border border-red-200">
                        <div class="font-bold text-red-700">${p.pulse_name_he} ${p.pulse_name_cn || ''}</div>
                        <div class="text-sm text-gray-600 mt-1">${p.characteristics || ''}</div>
                        <div class="text-xs text-gray-500 mt-1">${p.clinical_significance || ''}</div>
                    </div>
                `).join('');
            } else {
                pulseContainer.innerHTML = '<div class="text-gray-500 text-center">לא נמצאו דפוסי דופק ספציפיים לדפוס זה</div>';
            }
        }
        
        // Display tongue findings
        const tongueContainer = document.getElementById('tongue-findings');
        if (tongueContainer) {
            if (matchingTongue.length > 0) {
                tongueContainer.innerHTML = matchingTongue.map(t => `
                    <div class="bg-white p-3 rounded-lg shadow-sm border border-pink-200">
                        <div class="font-bold text-pink-700">${t.finding_he} ${t.finding_cn || ''}</div>
                        <div class="text-xs text-pink-500 mb-1">${t.aspect || ''}</div>
                        <div class="text-sm text-gray-600">${t.characteristics || ''}</div>
                        <div class="text-xs text-gray-500 mt-1">${t.clinical_significance || ''}</div>
                    </div>
                `).join('');
            } else {
                tongueContainer.innerHTML = '<div class="text-gray-500 text-center">לא נמצאו ממצאי לשון ספציפיים לדפוס זה</div>';
            }
        }
        
        console.log(`✅ Loaded ${matchingPulses.length} pulse + ${matchingTongue.length} tongue findings for pattern: ${pattern}`);
        
    } catch (error) {
        console.error('❌ Error fetching diagnostic data:', error);
        const pulseContainer = document.getElementById('pulse-findings');
        const tongueContainer = document.getElementById('tongue-findings');
        if (pulseContainer) pulseContainer.innerHTML = '<div class="text-red-500">שגיאה בטעינת נתונים</div>';
        if (tongueContainer) tongueContainer.innerHTML = '<div class="text-red-500">שגיאה בטעינת נתונים</div>';
    }
}

async function initYinYangModule() {
    const loaded = await loadYinYangPatterns();
    
    if (!loaded) {
        console.error('❌ Yin-yang module cannot function without pattern data');
        return;
    }
    
    console.log('✅ Yin-yang module initialized with database patterns');
    
}

// ================================================================
// ================================================================

// ================================================================
// ================================================================

// ================================================================
// NOTE: The only change needed is to call initYinYangModule()
// ================================================================
   

        const followUpQuestions = {
            yin_deficiency: [
                "מאז מתי את/ה מרגיש/ה הזעות לילה או חום בערב?",
                "האם את/ה מרגיש/ה יותר יובש בעור, בעיניים, בגרון או בצואה?",
                "איך המצב הרגשי שלך כשיש לך קושי להירדם?"
            ],
            yang_deficiency: [
                "באילו שעות ביום את/ה הכי קר/ה או עייף/ה?",
                "האם יש שינויים בתדירות או בנפח ההשתנה?",
                "האם את/ה מרגיש/ה כבדות באיברים או נפיחות?"
            ],
            yin_yang_balance: [
                "מה עוזר לך לשמור על האיזון הנוכחי?",
                "האם יש תחומים ספציפיים שתרצה לשפר?"
            ],
            yin_def_yang_excess: [
                "מה מחמיר את תחושות החום והתסיסה?",
                "איך השינה שלך מושפעת מהסטרס?",
                "האם יש דפוסים של יובש בגוף?"
            ],
            yang_def_yin_excess: [
                "האם את/ה חש/ה כבדות או נפיחות במהלך היום?",
                "מה הקשר בין קור למזון שאת/ה אוכל/ת?",
                "איך העיכול שלך בבוקר?"
            ],
            mixed_or_undefined: [
                "אילו סימפטומים הכי מטרידים אותך?",
                "האם יש דפוסים של שינוי במהלך היום?"
            ]
        };

        const lifestylePrompts = {
            yin_deficiency: [
                "שאל על לילות מאוחרים, עבודת יתר כרונית ולחץ ארוך טווח",
                "שאל על מזונות חריפים, מטוגנים, אלכוהול או מאוד חמים באופיים"
            ],
            yang_deficiency: [
                "שאל על חשיפה לקור, מזונות גולמיים או חולשה עיכולית כרונית",
                "שאל על מאמץ פיזי או רגשי ארוך טווח"
            ],
            yin_yang_balance: [
                "המשך עם הרגלי אורח חיים נוכחיים",
                "שקול תזונה מאוזנת ופעילות גופנית סדירה"
            ],
            yin_def_yang_excess: [
                "שאל על לחץ, גירויים יתר ודפוסי שינה",
                "בדוק צריכת קפאין, אלכוהול ומזונות מחממים"
            ],
            yang_def_yin_excess: [
                "שאל על צריכת מזונות קרים או גולמיים",
                "בדוק חשיפה לסביבות קרות ולחות"
            ],
            mixed_or_undefined: [
                "בצע הערכה מקיפה של אורח חיים",
                "שקול להתייעץ עם מטפל TCM מנוסה"
            ]
        };

        let answers = {};
        let scores = {
            yin_def: 0,
            yang_def: 0,
            yin_bal: 0,
            yang_bal: 0,
            yang_excess: 0,
            qi_def: 0,
            heat: 0
        };

        const totalQuestions = 11;

        document.addEventListener('DOMContentLoaded', async function() {
            await initYinYangModule();
            setupEventListeners();
        });

        function setupEventListeners() {
            const options = document.querySelectorAll('.option-card');
            options.forEach(option => {
                option.addEventListener('click', function() {
                    const question = this.dataset.question;
                    const selectedOption = this.dataset.option;
                    const isMulti = this.dataset.multi === 'true';
                    
                    if (isMulti) {
                        handleMultiChoice(question, selectedOption, this);
                    } else {
                        handleSingleChoice(question, selectedOption, this);
                    }
                    
                    updateScores();
                    updateProgress();
                    updateSectionStatus();
                });
            });
        }

        function handleSingleChoice(question, option, element) {
            const allOptions = document.querySelectorAll(`[data-question="${question}"]`);
            allOptions.forEach(opt => {
                opt.classList.remove('selected');
                const circle = opt.querySelector('.w-5');
                circle.style.background = 'white';
            });
            
            element.classList.add('selected');
            const circle = element.querySelector('.w-5');
            circle.style.background = '#667eea';
            
            answers[question] = option;
            markAnswered(question);
        }

        function handleMultiChoice(question, option, element) {
            if (!answers[question]) {
                answers[question] = [];
            }
            
            const index = answers[question].indexOf(option);
            const checkbox = element.querySelector('.w-5');
            
            if (index > -1) {
                answers[question].splice(index, 1);
                element.classList.remove('selected');
                checkbox.style.background = 'white';
            } else {
                answers[question].push(option);
                element.classList.add('selected');
                checkbox.style.background = '#667eea';
            }
            
            if (answers[question].length === 0) {
                delete answers[question];
            }
        }

        function updateScores() {
            scores = {
                yin_def: 0,
                yang_def: 0,
                yin_bal: 0,
                yang_bal: 0,
                yang_excess: 0,
                qi_def: 0,
                heat: 0
            };
            
            for (const [question, answer] of Object.entries(answers)) {
                if (Array.isArray(answer)) {
                    answer.forEach(opt => {
                        const weights = questionData[question][opt];
                        for (const [dimension, weight] of Object.entries(weights)) {
                            scores[dimension] += weight;
                        }
                    });
                } else {
                    const weights = questionData[question][answer];
                    for (const [dimension, weight] of Object.entries(weights)) {
                        scores[dimension] += weight;
                    }
                }
            }
            
            updateScoreDisplay();
        }

        function updateScoreDisplay() {
            const answeredCount = Object.keys(answers).length;
            
            if (answeredCount >= 6) {
                document.getElementById('live-scores').style.display = 'block';
            }
            
            const maxScore = Math.max(...Object.values(scores));
            
            for (const [dimension, score] of Object.entries(scores)) {
                const scoreEl = document.getElementById(`score-${dimension.replace('_', '-')}`);
                const barEl = document.getElementById(`bar-${dimension.replace('_', '-')}`);
                const textEl = document.getElementById(`bar-text-${dimension.replace('_', '-')}`);
                
                if (scoreEl && barEl) {
                    scoreEl.textContent = score;
                    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                    barEl.style.width = percentage + '%';
                    if (textEl && score > 0) {
                        textEl.textContent = score;
                    }
                }
            }
        }

        
        
        function markAnswered(qid) {
            const ck = document.getElementById('ck-' + qid);
            const tx = document.getElementById('tx-' + qid);
            if (ck) {
                ck.textContent = '✓';
                ck.style.background = '#10b981';
                ck.style.color = 'white';
            }
            if (tx) {
                tx.textContent = 'נענתה';
                tx.style.color = '#10b981';
            }
        }
        
function updateProgress() {
            const answered = Object.keys(answers).length;
            const percentage = Math.round((answered / totalQuestions) * 100);
            
            document.getElementById('progress-bar').style.width = percentage + '%';
            document.getElementById('progress-text').textContent = percentage + '%';
            document.getElementById('questions-answered').textContent = answered + ' מתוך ' + totalQuestions + ' שאלות נענו';
            
            const allQuestions = ['energy_level','temperature_preference','cold_sensitivity','heat_sensation','sweating','thirst','sleep','stool','urine','body_build','pain'];
            const questionNames = {
                energy_level: '1. אנרגיה',
                temperature_preference: '2. טמפרטורה',
                cold_sensitivity: '3. קור',
                heat_sensation: '4. חום',
                sweating: '5. הזעה',
                thirst: '6. צמא',
                sleep: '7. שינה',
                stool: '8. צואה',
                urine: '9. השתנה',
                body_build: '10. מבנה גוף',
                pain: '11. כאב'
            };
            
            const missing = allQuestions.filter(q => !answers[q]);
            const missAlert = document.getElementById('miss-alert');
            const missList = document.getElementById('miss-list');
            
            if (missing.length > 0 && answered > 0) {
                if (missAlert) missAlert.style.display = 'block';
                if (missList) missList.textContent = missing.map(q => questionNames[q]).join(' • ');
            } else {
                if (missAlert) missAlert.style.display = 'none';
            }
            
            const submitSection = document.getElementById('submit-section');
            if (answered === totalQuestions) {
                if (submitSection) {
                    submitSection.style.display = 'block';
                    setTimeout(() => {
                        submitSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 300);
                }
                if (missAlert) missAlert.style.display = 'none';
            } else {
                if (submitSection) submitSection.style.display = 'none';
            }
        }

        function updateSectionStatus() {
            const sections = ['general', 'heat_cold_sweat', 'fluids_sleep', 'bowel_urine', 'body_form'];
            const questionsPerSection = {
                general: ['energy_level', 'temperature_preference'],
                heat_cold_sweat: ['cold_sensitivity', 'heat_sensation', 'sweating'],
                fluids_sleep: ['thirst', 'sleep'],
                bowel_urine: ['stool', 'urine'],
                body_form: ['body_build', 'pain']
            };
            
            sections.forEach(section => {
                const sectionEl = document.querySelector(`[data-section="${section}"]`);
                const questions = questionsPerSection[section];
                const allAnswered = questions.every(q => answers[q]);
                
                if (allAnswered) {
                    sectionEl.classList.remove('active');
                    sectionEl.classList.add('completed');
                } else {
                    sectionEl.classList.add('active');
                }
            });
        }

        function classifyPattern() {
            const s = scores;
            
            if (s.yin_def >= 4 && s.yin_def >= s.yang_def) {
                return 'yin_deficiency';
            } else if (s.yang_def >= 4 && s.yang_def > s.yin_def) {
                return 'yang_deficiency';
            } else if (s.yin_bal >= 2 && s.yang_bal >= 2 && s.yin_def <= 2 && s.yang_def <= 2 && s.yang_excess <= 2) {
                return 'yin_yang_balance';
            } else if (s.yin_def >= 4 && s.yang_excess >= 2) {
                return 'yin_def_yang_excess';
            } else if (s.yang_def >= 4 && s.yin_def <= 2) {
                return 'yang_def_yin_excess';
            } else {
                return 'mixed_or_undefined';
            }
        }

        function showResults() {
            document.getElementById('questionnaire').style.display = 'none';
            document.getElementById('live-scores').style.display = 'none';
            document.getElementById('results').style.display = 'block';
            
            const pattern = classifyPattern();
            // Use database patterns, fallback to local patterns if not loaded
            let patternInfo = patternDefinitions[pattern];
            if (!patternInfo) {
                console.log('⚠️ Pattern not in DB, using fallback for:', pattern);
                patternInfo = fallbackPatterns[pattern] || fallbackPatterns['mixed_or_undefined'];
            }
            
            // Fetch pulse and tongue diagnostic data for this pattern
            fetchDiagnosticData(pattern);
            
            const badge = document.getElementById('primary-pattern-badge');
            badge.innerHTML = `<span style="font-size:1.5em;margin-left:10px;">${patternInfo.name_cn || ''}</span> ${patternInfo.name}`;
            badge.className = 'pattern-badge text-xl ' + patternInfo.badge_class;
            
            document.getElementById('patient-explanation').textContent = patternInfo.patient_friendly;
            
            const signsList = document.getElementById('typical-signs');
            signsList.innerHTML = '';
            patternInfo.typical_signs.forEach(sign => {
                const li = document.createElement('li');
                li.className = 'flex items-center gap-3 text-gray-700';
                li.style.direction = 'rtl';
                li.innerHTML = `
                    <span>${sign}</span>
                    <svg class="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                `;
                signsList.appendChild(li);
            });
            
            document.getElementById('tcm-notes').textContent = patternInfo.tcm_notes;
            
            if (patternInfo.safety_flags && patternInfo.safety_flags.length > 0) {
                document.getElementById('safety-flags-section').style.display = 'block';
                const flagsList = document.getElementById('safety-flags');
                flagsList.innerHTML = '';
                patternInfo.safety_flags.forEach(flag => {
                    const li = document.createElement('li');
                    li.className = 'safety-flag';
                    li.style.direction = 'rtl';
                    li.innerHTML = `
                        <div class="flex items-center gap-3" style="flex-direction:row-reverse;">
                            <span class="font-semibold text-gray-800">${flag}</span>
                            <svg class="w-5 h-5 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                            </svg>
                        </div>
                    `;
                    flagsList.appendChild(li);
                });
            } else {
                document.getElementById('safety-flags-section').style.display = 'none';
            }
            
            const followups = followUpQuestions[pattern] || [];
            const followupList = document.getElementById('followup-questions');
            followupList.innerHTML = '';
            followups.forEach(q => {
                const li = document.createElement('li');
                li.className = 'flex items-start gap-3 text-gray-700';
                li.style.direction = 'rtl';
                li.innerHTML = `
                    <span>${q}</span>
                    <svg class="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                `;
                followupList.appendChild(li);
            });
            
            const lifestyles = lifestylePrompts[pattern] || [];
            const lifestyleList = document.getElementById('lifestyle-prompts');
            lifestyleList.innerHTML = '';
            lifestyles.forEach(prompt => {
                const li = document.createElement('li');
                li.className = 'flex items-start gap-3 text-gray-700';
                li.style.direction = 'rtl';
                li.innerHTML = `
                    <span>${prompt}</span>
                    <svg class="w-5 h-5 text-yellow-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                    </svg>
                `;
                lifestyleList.appendChild(li);
            });
            
            document.getElementById('assessment-date').textContent = new Date().toLocaleString('he-IL');
            
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function resetAssessment() {
            if (confirm('האם אתה בטוח שברצונך להתחיל מחדש? כל התשובות יאבדו.')) {
                answers = {};
                scores = {
                    yin_def: 0,
                    yang_def: 0,
                    yin_bal: 0,
                    yang_bal: 0,
                    yang_excess: 0,
                    qi_def: 0,
                    heat: 0
                };
                
                document.querySelectorAll('.option-card').forEach(card => {
                    card.classList.remove('selected');
                    const marker = card.querySelector('.w-5');
                    marker.style.background = 'white';
                });
                
                document.querySelectorAll('.section-card').forEach(section => {
                    section.classList.remove('completed', 'active');
                });
                
                document.querySelector('[data-section="general"]').classList.add('active');
                
                document.getElementById('questionnaire').style.display = 'block';
                document.getElementById('results').style.display = 'none';
                document.getElementById('live-scores').style.display = 'none';
                
                updateProgress();
                
                // Scroll the yinyang-module to top (not the window)
                const yinyangModule = document.getElementById('yinyang-module');
                if (yinyangModule) {
                    yinyangModule.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }
        }
