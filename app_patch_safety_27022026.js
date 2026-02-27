// ================================================================
// MERIDIAN — app.js PATCH
// Date: 27/02/2026
// What changed: 
//   1. runPreSearchSafetyCheck — now calls match_patient_drugs()
//      instead of keyword scanning safety_rules
//   2. buildSafetyAgentPrompt — includes real drug interactions
//
// HOW TO APPLY:
//   In your app.js, REPLACE the two functions below.
//   Find each function by its name and replace the entire block.
//   Everything else in app.js stays EXACTLY as is.
// ================================================================

// ================================================================
// REPLACE THIS ENTIRE FUNCTION in app.js:
// async function runPreSearchSafetyCheck(queries) { ... }
// ================================================================

async function runPreSearchSafetyCheck(queries) {
    try {
        const rules = await loadSafetyRules();
        const queryText = queries.join(' ').toLowerCase();

        // ── STEP 1: PREGNANCY — direct from patient context ──────
        if (patientContext?.is_pregnant) {
            const severity = patientContext.trimester === 1 ? 'block' : 'warn';
            const pregnancyRule = rules.find(r =>
                r.category === 'pregnancy' && r.severity === severity
            ) || rules.find(r => r.category === 'pregnancy');

            if (pregnancyRule) {
                console.log(`🔒 Safety: Patient pregnant (T${patientContext.trimester})`);
                addToAuditLog({
                    type: 'safety_rule_triggered', source: 'patient_context',
                    rule_category: 'pregnancy', rule_severity: pregnancyRule.severity,
                    patient_id: patientContext.patient_id, queries
                });
                return {
                    blocked: pregnancyRule.severity === 'block',
                    warned:  pregnancyRule.severity === 'warn',
                    rule: pregnancyRule, source: 'patient_assessment'
                };
            }
        }

        // ── STEP 2: DRUG SAFETY — call match_patient_drugs() ─────
        // Uses the new drug_safety_index table with real clinical evidence
        const medicationText = patientContext?.medications?.trim() || '';

        if (medicationText.length > 2) {
            console.log('💊 Running drug safety check via match_patient_drugs()...');

            const { data: drugMatches, error: drugError } = await supabaseClient
                .rpc('match_patient_drugs', {
                    p_medication_text: medicationText,
                    p_include_caution: false  // only warn + block
                });

            if (!drugError && drugMatches && drugMatches.length > 0) {
                console.log(`✅ Drug matches found: ${drugMatches.length}`, drugMatches.map(d => `${d.generic_name_en}(${d.severity})`));

                // Cache on patientContext so safety agent can use it
                patientContext._drugMatches = drugMatches;

                // Find highest severity match
                const blockMatch = drugMatches.find(d => d.severity === 'block' && d.validated === true);
                const warnMatch  = drugMatches.find(d => d.severity === 'warn');

                if (blockMatch) {
                    console.log(`🚫 Drug BLOCK: ${blockMatch.generic_name_en}`);
                    addToAuditLog({
                        type: 'drug_safety_triggered', source: 'drug_safety_index',
                        drug: blockMatch.generic_name_en, severity: 'block',
                        validated: blockMatch.validated,
                        patient_id: patientContext?.patient_id, queries
                    });
                    // Build a rule-shaped object for showSafetyBlock()
                    return {
                        blocked: true,
                        warned: false,
                        rule: {
                            title_he: `🚫 אינטראקציה תרופה — ${blockMatch.drug_class_he}`,
                            message_he: blockMatch.warning_message_he,
                            action_he: blockMatch.action_he,
                            source: `מקור: ${blockMatch.evidence_level === 'A' ? 'מחקר קליני' : blockMatch.evidence_level === 'B' ? 'דיווחי מקרה' : 'הנחיות מומחים'}`
                        },
                        source: 'drug_safety_index'
                    };
                }

                if (warnMatch) {
                    console.log(`⚠️ Drug WARN: ${warnMatch.generic_name_en}`);
                    addToAuditLog({
                        type: 'drug_safety_triggered', source: 'drug_safety_index',
                        drug: warnMatch.generic_name_en, severity: 'warn',
                        patient_id: patientContext?.patient_id, queries
                    });
                    return {
                        blocked: false,
                        warned: true,
                        rule: {
                            title_he: `⚠️ זהירות תרופה — ${warnMatch.drug_class_he}`,
                            message_he: warnMatch.warning_message_he,
                            action_he: warnMatch.action_he,
                            source: `ראיות: ${warnMatch.evidence_level}`
                        },
                        source: 'drug_safety_index'
                    };
                }
            } else if (drugError) {
                console.warn('⚠️ Drug safety check error:', drugError.message);
                // Fall through to keyword scan as backup
            }
        }

        // ── STEP 3: FALLBACK — old keyword scan on safety_rules ──
        // Keeps working even if drug_safety_index has no match
        if (!rules || rules.length === 0) return { blocked: false, warned: false };

        const profileText = patientContext ? [
            patientContext.medications        || '',
            patientContext.previous_conditions || '',
            patientContext.allergies           || '',
            patientContext.current_symptoms    || '',
            patientContext.is_pregnant   ? 'הריון pregnant' : '',
            patientContext.breastfeeding ? 'הנקה breastfeeding' : '',
        ].join(' ').toLowerCase() : '';

        const fullScanText = `${queryText} ${profileText}`;

        // Block rules first
        for (const rule of rules.filter(r => r.severity === 'block')) {
            if (rule.trigger_keywords.some(kw => fullScanText.includes(kw.toLowerCase()))) {
                console.log(`🚫 Keyword BLOCK: ${rule.title_he}`);
                addToAuditLog({
                    type: 'safety_rule_triggered', source: 'keyword_block',
                    rule_id: rule.id, rule_category: rule.category, rule_severity: 'block',
                    rule_title: rule.title_he, patient_id: patientContext?.patient_id, queries
                });
                return { blocked: true, warned: false, rule, source: 'keyword_block' };
            }
        }

        // Warn rules
        for (const rule of rules.filter(r => r.severity === 'warn')) {
            if (rule.trigger_keywords.some(kw => fullScanText.includes(kw.toLowerCase()))) {
                console.log(`⚠️ Keyword WARN: ${rule.title_he}`);
                addToAuditLog({
                    type: 'safety_rule_triggered', source: 'keyword_warn',
                    rule_id: rule.id, rule_category: rule.category, rule_severity: 'warn',
                    rule_title: rule.title_he, patient_id: patientContext?.patient_id, queries
                });
                return { blocked: false, warned: true, rule, source: 'keyword_warn' };
            }
        }

        return { blocked: false, warned: false };

    } catch (e) {
        console.warn('⚠️ Safety check exception:', e.message);
        return { blocked: false, warned: false };
    }
}


// ================================================================
// REPLACE THIS ENTIRE FUNCTION in app.js:
// function buildSafetyAgentPrompt(queries) { ... }
// ================================================================

function buildSafetyAgentPrompt(queries) {
    const ctx = patientContext || {};
    const parts = [];

    if (ctx.is_pregnant) {
        parts.push(`המטופלת בהריון${ctx.trimester ? ` שליש ${ctx.trimester}` : ''}${ctx.pregnancy_weeks ? ` שבוע ${ctx.pregnancy_weeks}` : ''}`);
    }
    if (ctx.breastfeeding)      parts.push('המטופלת מניקה');
    if (ctx.trying_to_conceive) parts.push('המטופלת מנסה להרות');
    if (ctx.medications?.trim())          parts.push(`תרופות קבועות: ${ctx.medications}`);
    if (ctx.allergies?.trim())            parts.push(`אלרגיות: ${ctx.allergies}`);
    if (ctx.previous_conditions?.trim())  parts.push(`מצבים רפואיים: ${ctx.previous_conditions}`);
    if (ctx.surgeries?.trim())            parts.push(`ניתוחים בעבר: ${ctx.surgeries}`);

    // ── INJECT REAL DRUG MATCHES from drug_safety_index ──────────
    // These were resolved by match_patient_drugs() in the safety check
    let drugInteractionBlock = '';
    if (ctx._drugMatches && ctx._drugMatches.length > 0) {
        const lines = ctx._drugMatches.map(d => {
            const herbs = d.contraindicated_herbs_he?.join(', ') || 'אין';
            const points = d.contraindicated_points?.join(', ') || 'אין';
            const evidence = d.evidence_level === 'A' ? 'מחקר קליני' :
                             d.evidence_level === 'B' ? 'דיווחי מקרה' :
                             d.evidence_level === 'C' ? 'מחקר מעבדה' : 'הנחיות מומחים';
            return `• ${d.drug_class_he} (${d.generic_name_en}):
    אסור צמחים: ${herbs}
    נקודות להימנע: ${points}
    אינטראקציה: ${d.interaction_type}
    ראיות: ${evidence}`;
        }).join('\n');

        drugInteractionBlock = `\n\nאינטראקציות תרופה-צמחים (ממסד נתונים קליני):\n${lines}`;
    }
    // ── END DRUG MATCHES ─────────────────────────────────────────

    return `אתה יועץ בטיחות לרפואה סינית (TCM). 
            
פרופיל מטופל:
${parts.join('\n')}${drugInteractionBlock}

שאלות הטיפול הנוכחי: ${queries.join(', ')}

צור דוח בטיחות קצר ומדויק בעברית עם הפורמט הבא בדיוק:

🛡️ סטטוס: [✅ בטוח / ⚠️ זהירות נדרשת / 🚫 סיכון]

📍 נקודות אסורות:
[רשום נקודות ספציפיות שיש להימנע מהן, או "אין" אם אין]

💊 אינטראקציות תרופות-צמחים:
[רשום צמחים שיש להימנע מהם, או "אין" אם אין]

✅ מותר לטפל:
[מה בטוח לעשות עם המטופל הזה]

⚡ המלצה מיידית:
[משפט אחד — מה הכי חשוב לדעת לפני הטיפול]

ענה בעברית בלבד. קצר ומדויק. אל תוסיף הקדמות.`;
}
