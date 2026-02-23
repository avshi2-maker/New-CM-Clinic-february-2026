// TCM Clinical Assistant - Main App
// Extracted: 23 February 2026

const SUPABASE_URL = 'https://iqfglrwjemogoycbzltt.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZmdscndqZW1vZ295Y2J6bHR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NTM4ODMsImV4cCI6MjA4NDEyOTg4M30.DTREv3efs86_HzESyWm-7480ImfEVgC6T-xBdS6A2F8';
        
        // 🔒 SECURE: AI calls go through Supabase Edge Function (API key stored in Supabase Secrets)
        const EDGE_FUNCTION_URL = 'https://iqfglrwjemogoycbzltt.supabase.co/functions/v1/claude-ai';
        
        // Claude 3.5 Sonnet Pricing (February 2026)
        const INPUT_TOKEN_COST = 0.000003;    // $3.00 per 1M tokens
        const OUTPUT_TOKEN_COST = 0.000015;   // $15.00 per 1M tokens
        
        const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // =====================================================
        // MODULAR COMPONENT LOADER SYSTEM
        // =====================================================
        class ComponentLoader {
            constructor(supabaseClient) {
                this.supabase = supabaseClient;
                this.loadedComponents = new Map();
            }

            async loadPanelComponents(panelLocation, targetElementId) {
                try {
                    console.log(`🔄 Loading components for ${panelLocation}...`);
                    
                    const { data: components, error } = await this.supabase
                        .from('page_components')
                        .select('*')
                        .eq('panel_location', panelLocation)
                        .eq('is_active', true)
                        .order('display_order', { ascending: true });

                    if (error) throw error;
                    if (!components || components.length === 0) {
                        console.log(`ℹ️ No active components for ${panelLocation}`);
                        return;
                    }

                    const targetElement = document.getElementById(targetElementId);
                    if (!targetElement) {
                        console.error(`❌ Target element #${targetElementId} not found`);
                        return;
                    }

                    for (const component of components) {
                        await this.loadComponent(component, targetElement);
                    }

                    console.log(`✅ Loaded ${components.length} components for ${panelLocation}`);
                    
                } catch (error) {
                    console.error('❌ Error loading components:', error);
                }
            }

            async loadComponent(component, targetElement) {
                try {
                    console.log(`📦 Loading component: ${component.component_name}`);

                    const wrapper = document.createElement('div');
                    wrapper.id = `component-${component.component_name}`;
                    wrapper.className = 'component-wrapper';
                    wrapper.innerHTML = component.html_structure;

                    if (component.css_styles) {
                        const styleElement = document.createElement('style');
                        styleElement.id = `styles-${component.component_name}`;
                        styleElement.textContent = component.css_styles;
                        document.head.appendChild(styleElement);
                    }

                    targetElement.appendChild(wrapper);

                    if (component.javascript_code) {
                        const executeJS = new Function('supabaseClient', component.javascript_code);
                        await executeJS(this.supabase);
                    }

                    this.loadedComponents.set(component.component_name, component);
                    console.log(`✅ Component loaded: ${component.component_name}`);

                } catch (error) {
                    console.error(`❌ Error loading component ${component.component_name}:`, error);
                }
            }
        }

        console.log('✅ ComponentLoader class initialized');
        
        // ============================================================================
        // ============================================================================
        
        const queryCache = new Map();
        const MAX_CACHE_SIZE = 50; // Store last 50 unique queries
        
        const auditLog = [];
        
        /**
         * Check if we've answered this query before (exact match)
         */
        function getCachedResponse(queries) {
            const cacheKey = queries.sort().join('|').toLowerCase();
            const cached = queryCache.get(cacheKey);
            
            if (cached) {
                cached.hits = (cached.hits || 0) + 1;
                cached.lastAccessed = new Date();
                return cached.response;
            }
            
            return null;
        }
        
        /**
         * Save response to cache for future use
         */
        function cacheResponse(queries, response, results) {
            const cacheKey = queries.sort().join('|').toLowerCase();
            
            if (queryCache.size >= MAX_CACHE_SIZE) {
                const oldestKey = Array.from(queryCache.keys())[0];
                queryCache.delete(oldestKey);
            }
            
            queryCache.set(cacheKey, {
                response: response,
                results: results,
                timestamp: new Date(),
                hits: 0,
                queries: queries
            });
            
        }
        
        /**
         * Categorize search results by safety priority
         */
        function categorizeResults(allResults) {
            const categories = {
                warnings: [],       // ⚠️ Safety warnings - HIGHEST PRIORITY
                treatments: [],     // 🎯 Treatment recommendations
                diagnostics: [],    // 🔍 Diagnostic information
                education: [],      // 📚 Educational content
                conflicts: []       // ⚠️ Detected conflicts
            };
            
            allResults.forEach(result => {
                const table = result._source_table;
                
                if (table === 'acupuncture_point_warnings') {
                    categories.warnings.push(result);
                }
                else if (table.includes('acupuncture') || table.includes('protocol')) {
                    categories.treatments.push(result);
                }
                else if (table.includes('pulse') || table.includes('tongue') || table.includes('syndrome')) {
                    categories.diagnostics.push(result);
                }
                else if (table === 'qa_knowledge_base' || table === 'bible_rag_training_syllabus_20260129') {
                    categories.education.push(result);
                }
            });
            
            return categories;
        }
        
        /**
         * Detect conflicts between treatments and warnings
         */
        function detectConflicts(categories) {
            const conflicts = [];
            
            categories.treatments.forEach(treatment => {
                const treatmentPoints = extractPointCodes(treatment);
                
                categories.warnings.forEach(warning => {
                    const warningPoints = extractPointCodes(warning);
                    
                    const overlap = treatmentPoints.filter(p => warningPoints.includes(p));
                    
                    if (overlap.length > 0) {
                        conflicts.push({
                            type: 'point_warning_conflict',
                            points: overlap,
                            treatment: treatment,
                            warning: warning,
                            severity: 'CRITICAL',
                            message: `נקודת הטיפול ${overlap.join(', ')} מופיעה גם באזהרות בטיחות!`
                        });
                    }
                });
            });
            
            categories.conflicts = conflicts;
            return conflicts;
        }
        
        /**
         * Extract point codes from result (e.g., "LI4", "ST36", "GB20")
         */
        function extractPointCodes(result) {
            const points = [];
            const text = JSON.stringify(result).toUpperCase();
            
            const pointRegex = /\b[A-Z]{2,3}\d{1,2}\b/g;
            const matches = text.match(pointRegex);
            
            if (matches) {
                points.push(...matches);
            }
            
            if (result.point_code && typeof result.point_code === 'string') {
                points.push(result.point_code.toUpperCase());
            }
            if (result.point_number && typeof result.point_number === 'string') {
                points.push(result.point_number.toUpperCase());
            }
            if (result.acupoint_code && typeof result.acupoint_code === 'string') {
                points.push(result.acupoint_code.toUpperCase());
            }
            
            if (result.acupoint_codes && Array.isArray(result.acupoint_codes)) {
                points.push(...result.acupoint_codes.map(code => String(code).toUpperCase()));
            }
            
            return [...new Set(points)]; // Remove duplicates
        }
        
        /**
         * Add entry to audit log (for legal compliance)
         */
        function addToAuditLog(entry) {
            entry.timestamp = new Date().toISOString();
            entry.sessionId = sessionStorage.getItem('sessionId') || 'anonymous';
            auditLog.push(entry);
            
            if (auditLog.length > 100) {
                auditLog.shift();
            }
            
        }
        
        let formulasData = [];
        let acupointsData = [];
        let imagesData = [];
        let currentQueries = [];
        let lastSearchResults = '';
        let usedCSVs = new Set();
        
        let sessionStartTime = Date.now();
        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        let totalCost = 0;
        let totalAssets = 0;
        let successfulQueries = 0;
        let totalQueries = 0;
        // TIMER VARIABLES (NOW DECLARED IN timer-metrics.js)
        // let timerInterval;
        // let queryStartTime = 0;
        // let queryEndTime = 0;
        // let queryTimerInterval = null;
        let isSearching = false;
        
        let isPaused = false;
        let searchAbortController = null;

        // ===== LOAD QUESTIONS FROM SUPABASE WITH PAGINATION =====
        let hebrewQuestions = [];
        let questionsPerCategory = 3; // Show only 3 per category
        let currentCategory = 'all';
        let currentOffset = 0;
        
        // Module 1 specific variables (global for toggle function)
        let module1CurrentCategory = 'all';
        let module1CurrentOffset = 0;
        let module1IsExpanded = false;
        let module1QuestionsLoaded = false;

        // MODULE 2 STATE VARIABLES (global for toggle function)
        let module2CurrentCategory = 'all';
        let module2CurrentOffset = 0;
        let module2IsExpanded = false;
        let module2QuestionsLoaded = false;
        let module2AllQuestionsLoaded = false;

        // ===== MODULE 1: TOGGLE PANEL FUNCTION =====
        async function toggleModule1Panel() {
            const content = document.getElementById('module1Content');
            const arrow = document.getElementById('module1Arrow');
            
            if (!content || !arrow) return;
            
            module1IsExpanded = !module1IsExpanded;
            
            if (module1IsExpanded) {
                // Show panel
                content.style.display = 'block';
                arrow.style.transform = 'rotate(180deg)';
                
                // Load questions on first expansion
                if (!module1QuestionsLoaded) {
                    console.log('📥 First time expanding - loading questions...');
                    await loadModule1Questions('all', 0);
                    module1QuestionsLoaded = true;
                }
            } else {
                // Hide panel
                content.style.display = 'none';
                arrow.style.transform = 'rotate(0deg)';
            }
        }

        // ===== MODULE 1: NEW APPROACH - CALLS SUPABASE RPC =====
        async function loadModule1Questions(category = 'all', offset = 0) {
            try {
                console.log('📥 Loading Module 1 from Supabase RPC:', category, offset);
                
                // ONE CALL TO SUPABASE RPC FUNCTION!
                const { data, error } = await supabaseClient.rpc('module1_get_complete', {
                    p_category: category,
                    p_offset: offset
                });
                
                if (error) throw error;
                
                console.log('✅ Module 1 data received from Supabase:', data);
                displayModule1Questions(data);
                
                module1CurrentCategory = category;
                module1CurrentOffset = offset;
                
                return data;
            } catch (error) {
                console.error('❌ Error loading Module 1:', error);
                alert('שגיאה בטעינת שאלות: ' + error.message);
                return null;
            }
        }
        
        // Display Module 1 questions
        function displayModule1Questions(data) {
            const container = document.getElementById('quickQuestions');
            if (!container) {
                console.error('❌ Container #quickQuestions not found!');
                return;
            }
            
            container.innerHTML = ''; // Clear
            
            if (data.mode === 'all_categories') {
                // Show 3 from each category
                let totalShown = 0;
                data.questions.forEach(catData => {
                    if (catData.questions) {
                        catData.questions.forEach(q => {
                            const div = createModule1QuestionDiv(q.question_hebrew, catData.category_hebrew);
                            container.appendChild(div);
                            totalShown++;
                        });
                    }
                });
                console.log(`✅ Showing ${totalShown} questions from ${data.total_categories} categories`);
                
            } else {
                // Show 3 from one category
                if (data.questions && data.questions.length > 0) {
                    data.questions.forEach(q => {
                        const div = createModule1QuestionDiv(q.question_hebrew, data.category);
                        container.appendChild(div);
                    });
                    
                    // Add "Load More" button if needed
                    if (data.has_more) {
                        const loadMore = document.createElement('div');
                        loadMore.style.cssText = 'background: #dbeafe; color: #1e40af; padding: 10px; margin: 10px 0; text-align: center; cursor: pointer; border-radius: 8px; font-weight: bold; border: 2px dashed #60a5fa;';
                        loadMore.innerHTML = '📥 טען עוד 3 שאלות';
                        loadMore.onclick = () => loadModule1Questions(data.category, module1CurrentOffset + 3);
                        container.appendChild(loadMore);
                    }
                    
                    console.log(`✅ Showing ${data.questions.length} questions from "${data.category}"`);
                } else {
                    container.innerHTML = '<div style="text-align:center;padding:20px;color:#6b7280;">אין שאלות בקטגוריה זו</div>';
                }
            }
        }
        
        // Create question element for Module 1
        function createModule1QuestionDiv(questionText, category) {
            const div = document.createElement('div');
            div.className = 'quick-question';
            div.style.cssText = 'background: white; border: 2px solid #e5e7eb; border-radius: 8px; padding: 10px; margin: 8px 0; cursor: pointer; transition: all 0.2s;';
            
            div.innerHTML = `
                <div style="font-weight: 600; font-size: 13px; color: #1f2937; margin-bottom: 4px;">${questionText}</div>
                <div style="font-size: 11px; color: #6b7280; background: #f3f4f6; display: inline-block; padding: 2px 8px; border-radius: 4px;">${category}</div>
            `;
            
            // Click to paste!
            div.onclick = function() {
                pasteModule1ToQueryBox(questionText);
            };
            
            div.onmouseover = function() {
                this.style.background = '#e0f2fe';
                this.style.borderColor = '#0ea5e9';
            };
            
            div.onmouseout = function() {
                this.style.background = 'white';
                this.style.borderColor = '#e5e7eb';
            };
            
            return div;
        }
        
        // Paste Module 1 question into query box
        function pasteModule1ToQueryBox(text) {
            console.log('📝 Pasting Module 1 question:', text);
            
            const boxes = ['searchInput1', 'searchInput2', 'searchInput3', 'searchInput4'];
            
            // FIX #1: Check for duplicates first
            for (let boxId of boxes) {
                const input = document.getElementById(boxId);
                if (input && input.value.trim() === text.trim()) {
                    alert('❌ שאלה זו כבר קיימת בתיבת חיפוש!\nאנא בחר שאלה אחרת.');
                    console.log('⚠️ Duplicate prevented:', text);
                    return; // Prevent duplicate
                }
            }
            
            // Find first empty box
            for (let i = 0; i < boxes.length; i++) {
                const input = document.getElementById(boxes[i]);
                
                if (input && !input.value.trim()) {
                    input.value = text;
                    
                    if (typeof updateQueryBox === 'function') {
                        updateQueryBox(i + 1);
                    }
                    
                    const box = document.getElementById('queryBox' + (i + 1));
                    if (box) {
                        box.style.background = '#dbeafe';
                        setTimeout(() => { box.style.background = ''; }, 500);
                    }
                    
                    console.log(`✅ Module 1 question pasted into Box ${i + 1}`);
                    return;
                }
            }
            
            alert('כל תיבות השאלות מלאות!');
        }
        
        // ═══════════════════════════════════════════════════════════════
        // 🎤 VOICE SEARCH + KEYWORDS + ALPHABET NAVIGATION
        // ═══════════════════════════════════════════════════════════════
        
        // ═══════════════════════════════════════════════════════════════
        // OLD VOICE SEARCH CODE - COMMENTED OUT (NOW IN voice-search-fixed.js)
        // ═══════════════════════════════════════════════════════════════
        /*
        // VOICE SEARCH VARIABLES (NOW DECLARED IN voice-search.js)
        // let voiceRecognition = null;
        // let isVoiceListening = false;
        
        // Initialize voice recognition
        function initVoiceSearch() {
            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                voiceRecognition = new SpeechRecognition();
                voiceRecognition.lang = 'he-IL'; // Hebrew
                voiceRecognition.continuous = false;
                voiceRecognition.interimResults = false;
                
                voiceRecognition.onstart = function() {
                    isVoiceListening = true;
                    const btn = document.getElementById('voiceSearchBtn');
                    const input = document.getElementById('smartSearchInput');
                    const status = document.getElementById('voiceStatus');
                    
                    if (btn) btn.classList.add('listening');
                    if (input) input.classList.add('listening');
                    if (status) status.textContent = '🎤 מקשיב...';
                    
                    console.log('🎤 Voice recognition started');
                };
                
                voiceRecognition.onresult = function(event) {
                    const transcript = event.results[0][0].transcript;
                    const input = document.getElementById('smartSearchInput');
                    const status = document.getElementById('voiceStatus');
                    
                    if (input) input.value = transcript;
                    if (status) status.textContent = `✅ הבנתי: "${transcript}"`;
                    
                    console.log('🎤 Transcribed:', transcript);
                    
                    // Automatically search after 500ms
                    setTimeout(() => {
                        searchSmartInput();
                    }, 500);
                };
                
                voiceRecognition.onerror = function(event) {
                    console.error('❌ Voice recognition error:', event.error);
                    const status = document.getElementById('voiceStatus');
                    if (status) {
                        if (event.error === 'not-allowed') {
                            status.textContent = '❌ נא לאפשר גישה למיקרופון';
                        } else {
                            status.textContent = '❌ שגיאה - נסה שוב';
                        }
                    }
                };
                
                voiceRecognition.onend = function() {
                    isVoiceListening = false;
                    const btn = document.getElementById('voiceSearchBtn');
                    const input = document.getElementById('smartSearchInput');
                    
                    if (btn) btn.classList.remove('listening');
                    if (input) input.classList.remove('listening');
                    
                    console.log('🎤 Voice recognition ended');
                };
                
                console.log('✅ Voice search initialized');
            } else {
                console.log('❌ Voice recognition not supported in this browser');
                const status = document.getElementById('voiceStatus');
                if (status) status.textContent = 'זמין רק ב-Chrome';
            }
        }
        // Make globally accessible
        window.initVoiceSearch = initVoiceSearch;
        
        // Toggle voice search on/off
        function toggleVoiceSearch() {
            if (!voiceRecognition) {
                initVoiceSearch();
            }
            
            if (!voiceRecognition) {
                alert('חיפוש קולי זמין רק בדפדפן Chrome');
                return;
            }
            
            if (isVoiceListening) {
                voiceRecognition.stop();
            } else {
                try {
                    voiceRecognition.start();
                } catch (error) {
                    console.error('Error starting voice:', error);
                    const status = document.getElementById('voiceStatus');
                    if (status) status.textContent = '❌ לא ניתן להפעיל מיקרופון';
                }
            }
        }
        
        // Search from smart input (voice or typed)
        async function searchSmartInput() {
            const input = document.getElementById('smartSearchInput');
            if (!input) return;
            
            const query = input.value.trim();
            if (!query) {
                alert('נא להזין שאילתה');
                return;
            }
            
            console.log('🔍 Smart search:', query);
            
            // Paste query into first available query box
            const boxes = ['searchInput1', 'searchInput2', 'searchInput3', 'searchInput4'];
            
            for (let i = 0; i < boxes.length; i++) {
                const box = document.getElementById(boxes[i]);
                if (box && !box.value.trim()) {
                    box.value = query;
                    
                    // Update box styling
                    if (typeof updateQueryBox === 'function') {
                        updateQueryBox(i + 1);
                    }
                    
                    // Flash effect
                    const boxDiv = document.getElementById('queryBox' + (i + 1));
                    if (boxDiv) {
                        boxDiv.style.background = '#dbeafe';
                        setTimeout(() => { boxDiv.style.background = ''; }, 500);
                    }
                    
                    console.log(`✅ Pasted into Box ${i + 1}`);
                    
                    // Clear voice status after pasting
                    const status = document.getElementById('voiceStatus');
                    if (status) {
                        setTimeout(() => {
                            status.textContent = '';
                        }, 2000);
                    }
                    
                    return;
                }
            }
            
            alert('כל תיבות השאלות מלאות! נקה תיבה או הפעל חיפוש.');
        }
        
        // ═══════════════════════════════════════════════════════════════
        // MODULE 2: TOP VOICE KEYWORDS (NOW IN voice-search.js)
        // ═══════════════════════════════════════════════════════════════
        // const module2VoiceKeywords = [
        //     'נקודות', 'כאבי', 'שינה', 'עייפות', 'חרדה', 'דיכאון', 'אנרגיה',
        //     'דופק', 'צמחי', 'תמיכה', 'טיפול', 'מניעה', 'תזונה', 'עור',
        //     'סימפטומים', 'השפעה', 'יתרונות', 'דיקור', 'משתלב',
        //     'מאזנים', 'ממליצים', 'מתאימים', 'סיני', 'ויטמין', 'מרפא',
        //     'כרונית', 'סימני', 'כרוני', 'תופעות', 'לוואי', 'תכונות',
        //     'ניקוי', 'מזון', 'סימנים', 'עיניים', 'אזהרה', 'קושי',
        //     'מזונות', 'מחשבות', 'עצמית', 'צוואר', 'טווח', 'נדודי',
        //     'מופרעת', 'גבוהה', 'תעלות', 'כורכום', 'עומס', 'זיכרון',
        //     'תירואיד', 'דיבור', 'אנזים', 'דופמין'
        // ];
        
        // FIX #2: Search by keyword (clicking popular keywords)
        // Now searches for questions CONTAINING the keyword, not just pasting word
        async function searchKeyword(keyword) {
            console.log('🔑 Searching for questions containing:', keyword);
            
            try {
                // Search Module 1 (411 questions) for questions containing keyword
                const { data, error } = await supabaseClient
                    .from('411_hebrew_quick_questions_20260131')
                    .select('question_hebrew, category_hebrew')
                    .ilike('question_hebrew', `%${keyword}%`)
                    .order('question_hebrew', { ascending: true })
                    .limit(20);
                
                if (error) {
                    console.error('❌ Keyword search error details:', error);
                    throw error;
                }
                
                if (data && data.length > 0) {
                    console.log(`✅ Found ${data.length} questions containing "${keyword}"`);
                    
                    // Display filtered questions in Module 1 area
                    displayModule1Questions({
                        questions: data,
                        category: `תוצאות חיפוש: "${keyword}"`,
                        has_more: false,
                        total_count: data.length
                    });
                    
                    // Expand Module 1 if collapsed
                    const content = document.getElementById('module1Content');
                    const arrow = document.getElementById('module1Arrow');
                    if (content && content.style.display === 'none') {
                        content.style.display = 'block';
                        if (arrow) arrow.style.transform = 'rotate(180deg)';
                        module1IsExpanded = true;
                    }
                    
                    // Scroll to Module 1
                    const module1Header = document.querySelector('[onclick="toggleModule1Panel()"]');
                    if (module1Header) {
                        module1Header.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                    
                } else {
                    alert(`לא נמצאו שאלות המכילות: "${keyword}"\nנסה מילת חיפוש אחרת.`);
                }
                
            } catch (error) {
                console.error('❌ Keyword search error:', error);
                console.error('Error details:', JSON.stringify(error));
                alert(`שגיאה בחיפוש מילת מפתח: ${error.message || 'שגיאה לא ידועה'}`);
            }
        }
        
        // FIX #2: Search by alphabet letter
        // Searches for questions STARTING with the letter
        async function searchByLetter(letter) {
            console.log('🔤 Searching for questions starting with:', letter);
            
            try {
                // Search Module 1 for questions starting with letter
                const { data, error } = await supabaseClient
                    .from('411_hebrew_quick_questions_20260131')
                    .select('question_hebrew, category_hebrew')
                    .ilike('question_hebrew', `${letter}%`)
                    .order('question_hebrew', { ascending: true })
                    .limit(20);
                
                if (error) {
                    console.error('❌ Alphabet search error details:', error);
                    console.error('Error message:', error.message);
                    console.error('Error code:', error.code);
                    throw error;
                }
                
                if (data && data.length > 0) {
                    console.log(`✅ Found ${data.length} questions starting with "${letter}"`);
                    
                    // Display filtered questions
                    displayModule1Questions({
                        questions: data,
                        category: `תוצאות חיפוש: אות "${letter}"`,
                        has_more: false,
                        total_count: data.length
                    });
                    
                    // Expand Module 1
                    const content = document.getElementById('module1Content');
                    const arrow = document.getElementById('module1Arrow');
                    if (content && content.style.display === 'none') {
                        content.style.display = 'block';
                        if (arrow) arrow.style.transform = 'rotate(180deg)';
                        module1IsExpanded = true;
                    }
                    
                    // Scroll to Module 1
                    const module1Header = document.querySelector('[onclick="toggleModule1Panel()"]');
                    if (module1Header) {
                        module1Header.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                    
                } else {
                    alert(`לא נמצאו שאלות המתחילות באות: "${letter}"`);
                }
                
            } catch (error) {
                console.error('❌ Alphabet search error:', error);
                console.error('Error details:', JSON.stringify(error));
                alert(`שגיאה בחיפוש לפי אות: ${error.message || 'שגיאה לא ידועה'}\n\nבדוק את הקונסול לפרטים נוספים.`);
            }
        }
        
        // Initialize alphabet navigation buttons
        function initAlphabetNav() {
            const hebrewAlphabet = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ', 'ק', 'ר', 'ש', 'ת'];
            const container = document.getElementById('alphabetNav');
            
            if (container) {
                hebrewAlphabet.forEach(letter => {
                    const btn = document.createElement('button');
                    btn.textContent = letter;
                    btn.className = 'w-8 h-8 bg-white border-2 border-purple-300 text-purple-700 rounded-lg text-sm font-bold hover:bg-purple-100 hover:border-purple-500 transition-all cursor-pointer';
                    btn.onclick = () => searchByLetter(letter);
                    btn.title = `חיפוש לפי האות ${letter}`;
                    container.appendChild(btn);
                });
                console.log('✅ Alphabet navigation initialized (22 letters)');
            }
        }
        // END OF OLD VOICE SEARCH CODE
        */

        // ═══════════════════════════════════════════════════════════════
        // MODULE 2: 2,665 CLINICAL QUESTIONS - NEW IMPLEMENTATION
        // ═══════════════════════════════════════════════════════════════
        
        // FIX #4: Module 2 toggle function (same pattern as Module 1)
        // ═══════════════════════════════════════════════════════════════
        // TOGGLE MODULE 2 PANEL FUNCTION
        // ═══════════════════════════════════════════════════════════════
        async function toggleModule2Panel() {
            const content = document.getElementById('module2Content');
            const arrow = document.getElementById('module2Arrow');
            
            if (!content || !arrow) return;
            
            module2IsExpanded = !module2IsExpanded;
            
            if (module2IsExpanded) {
                // Show panel
                content.style.display = 'block';
                arrow.style.transform = 'rotate(180deg)';
                
                // Load questions on first expansion
                if (!module2QuestionsLoaded) {
                    console.log('📥 First time expanding Module 2 - loading questions...');
                    await loadModule2QuestionsNew();
                    module2QuestionsLoaded = true;
                }
            } else {
                // Hide panel
                content.style.display = 'none';
                arrow.style.transform = 'rotate(0deg)';
            }
        }
        // Make globally accessible
        window.toggleModule2Panel = toggleModule2Panel;
        
        // Load Module 2 questions from database
        // ═══════════════════════════════════════════════════════════════
        // MODULE 2: CATEGORY TRANSLATION MAPPING
        // ═══════════════════════════════════════════════════════════════
        // EXACT Hebrew translations for Module 2 categories (from database)
        const module2CategoryTranslation = {
            "adolescent": "מתבגרים (13-18)",
            "adult": "מבוגרים (18-70)",
            "allergies": "אלרגיות",
            "alternative_trends": "טרנדים אלטרנטיביים",
            "antidepressant_weightloss_overuse": "שימוש יתר - תרופות",
            "anxiety": "חרדה",
            "anxiety_intake_therapist": "חרדה - צריכה טיפולית",
            "astrology": "אסטרולוגיה",
            "breastfeeding": "הנקה",
            "cardiology": "קרדיולוגיה",
            "eastern": "רפואה מזרחית",
            "elderly": "קשישים",
            "elderly_neuro": "קשישים - נוירולוגיה",
            "extreme": "מקרים קיצוניים",
            "first": "עזרה ראשונה",
            "general": "כללי",
            "herbs": "עשבי מרפא",
            "high_energy_states": "מצבי אנרגיה גבוהה",
            "natural": "טבעי",
            "nutrition": "תזונה",
            "oncology": "אונקולוגיה",
            "pediatrics": "ילדים",
            "pregnancy": "הריון",
            "retreat_recommendations": "המלצות ריטריט",
            "skin": "עור",
            "social_media_overuse": "שימוש יתר - רשתות חברתיות",
            "sports": "ספורט",
            "state": "מצבים קליניים",
            "tcm_cognitive_overload": "עומס קוגניטיבי - TCM",
            "tcm_supplements": "תוספי TCM",
            "university": "אוניברסיטה",
            "western_diets": "דיאטות מערביות"
        };
        
        // Function to translate category to Hebrew
        function translateCategoryToHebrew(englishCategory) {
            return module2CategoryTranslation[englishCategory] || englishCategory;
        }
        
        // ═══════════════════════════════════════════════════════════════
        // ⚠️ MODULE 2 FUNCTIONS SECTION
        // ═══════════════════════════════════════════════════════════════
        // ALL FUNCTIONS BELOW (until next section) ARE NOW LOADED FROM:
        // questions-589.js module in Supabase Storage
        // 
        // Functions that moved to questions-589.js:
        // - loadModule2QuestionsNew()
        // - filterModule2Questions()
        // - displayModule2Questions()
        // - handleModule2Scroll()
        // - pasteModule2ToQueryBox()
        //
        // RESTORED: These functions needed in main file for proper initialization
        
        async function loadModule2QuestionsNew() {
            try {
                console.log('📥 Loading Module 2 questions from database...');
                
                // Get unique categories (in English from database)
                const { data: categories, error: catError } = await supabaseClient
                    .from('csv_32_589_hebrew_questions_20260201')
                    .select('category')
                    .order('category', { ascending: true });
                
                if (catError) throw catError;
                
                // Get unique categories
                const uniqueCategories = [...new Set(categories.map(c => c.category))];
                console.log(`✅ Found ${uniqueCategories.length} Module 2 categories`);
                
                // Sort categories alphabetically by HEBREW translation
                uniqueCategories.sort((a, b) => {
                    const hebrewA = translateCategoryToHebrew(a);
                    const hebrewB = translateCategoryToHebrew(b);
                    return hebrewA.localeCompare(hebrewB, 'he');
                });
                
                // Populate category dropdown with HEBREW translations (alphabetically sorted)
                const select = document.getElementById('module2CategoryFilter');
                if (select) {
                    select.innerHTML = `<option value="all">כל הקטגוריות (589 שאלות)</option>`;
                    uniqueCategories.forEach(catEnglish => {
                        const option = document.createElement('option');
                        option.value = catEnglish; // Keep English as value for database query
                        option.textContent = translateCategoryToHebrew(catEnglish); // Show Hebrew to user
                        select.appendChild(option);
                    });
                }
                
                // Load first 3 questions
                await filterModule2Questions();
                
            } catch (error) {
                console.error('❌ Error loading Module 2:', error);
                alert('שגיאה בטעינת מודול 2');
            }
        }
        
        // Filter Module 2 questions by category (with offset for infinite scroll)
        async function filterModule2Questions(offset = 0) {
            const select = document.getElementById('module2CategoryFilter');
            const category = select ? select.value : 'all';
            
            // Reset if new category selected
            if (category !== module2CurrentCategory) {
                module2CurrentCategory = category;
                module2CurrentOffset = 0;
                module2AllQuestionsLoaded = false;
                offset = 0;
            }
            
            try {
                console.log('🔍 Filtering Module 2 by category:', category, 'offset:', offset);
                
                let query = supabaseClient
                    .from('csv_32_589_hebrew_questions_20260201')
                    .select('question_hebrew, category, answer_hebrew')
                    .order('question_hebrew', { ascending: true })
                    .range(offset, offset + 2); // Load 3 questions (0-2, 3-5, etc.)
                
                if (category !== 'all') {
                    query = query.eq('category', category);
                }
                
                const { data, error } = await query;
                
                if (error) {
                    console.error('❌ Error details:', error);
                    throw error;
                }
                
                console.log(`✅ Found ${data.length} Module 2 questions at offset ${offset}`);
                
                // Check if we reached the end
                if (data.length < 3) {
                    module2AllQuestionsLoaded = true;
                }
                
                // Update offset for next load
                module2CurrentOffset = offset + data.length;
                
                // Display questions (append if offset > 0, replace if offset = 0)
                displayModule2Questions(data, offset > 0);
                
            } catch (error) {
                console.error('❌ Error filtering Module 2:', error);
                alert(`שגיאה: ${error.message || 'לא ניתן לטעון שאלות'}`);
            }
        }
        
        // Display Module 2 questions (with append mode for infinite scroll)
        function displayModule2Questions(questions, append = false) {
            const container = document.getElementById('module2Questions');
            if (!container) return;
            
            if (!questions || questions.length === 0) {
                if (!append) {
                    container.innerHTML = '<p class="text-center text-gray-500 text-sm p-4">אין שאלות זמינות</p>';
                }
                return;
            }
            
            // Clear container if not appending
            if (!append) {
                container.innerHTML = '';
                // Remove old scroll listener
                container.removeEventListener('scroll', handleModule2Scroll);
                // Add scroll listener for infinite scroll
                container.addEventListener('scroll', handleModule2Scroll);
            }
            
            questions.forEach(q => {
                const questionDiv = document.createElement('div');
                questionDiv.className = 'p-3 bg-white border-2 border-purple-200 rounded-lg hover:border-purple-400 hover:shadow-md cursor-pointer transition-all text-right';
                
                // Translate category to Hebrew for display
                const categoryHebrew = translateCategoryToHebrew(q.category);
                
                // Add answer preview as tooltip (first 100 chars)
                const answerPreview = q.answer_hebrew ? q.answer_hebrew.substring(0, 100) + '...' : '';
                questionDiv.title = answerPreview;
                
                questionDiv.innerHTML = `
                    <div class="font-medium text-sm text-gray-800">${q.question_hebrew || 'ללא שאלה'}</div>
                    <div class="text-xs text-purple-600 mt-1">${categoryHebrew || ''}</div>
                `;
                
                questionDiv.onclick = () => {
                    pasteModule2ToQueryBox(q.question_hebrew);
                };
                
                container.appendChild(questionDiv);
            });
        }
        
        // Handle infinite scroll for Module 2
        function handleModule2Scroll() {
            const container = document.getElementById('module2Questions');
            if (!container) return;
            
            // Check if scrolled to bottom (with 20px threshold)
            const scrolledToBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 20;
            
            if (scrolledToBottom && !module2AllQuestionsLoaded) {
                console.log('📥 Loading more Module 2 questions...');
                filterModule2Questions(module2CurrentOffset);
            }
        }
        
        // FIX #1: Paste Module 2 question with duplicate prevention
        function pasteModule2ToQueryBox(text) {
            console.log('📝 Pasting Module 2 question:', text);
            
            const boxes = ['searchInput1', 'searchInput2', 'searchInput3', 'searchInput4'];
            
            // FIX #1: Check for duplicates first
            for (let boxId of boxes) {
                const input = document.getElementById(boxId);
                if (input && input.value.trim() === text.trim()) {
                    alert('❌ שאלה זו כבר קיימת בתיבת חיפוש!\nאנא בחר שאלה אחרת.');
                    console.log('⚠️ Duplicate prevented:', text);
                    return; // Prevent duplicate
                }
            }
            
            // Find first empty box
            for (let i = 0; i < boxes.length; i++) {
                const input = document.getElementById(boxes[i]);
                
                if (input && !input.value.trim()) {
                    input.value = text;
                    
                    if (typeof updateQueryBox === 'function') {
                        updateQueryBox(i + 1);
                    }
                    
                    const box = document.getElementById('queryBox' + (i + 1));
                    if (box) {
                        box.style.background = '#fae8ff'; // Light purple for Module 2
                        setTimeout(() => { box.style.background = ''; }, 500);
                    }
                    
                    console.log(`✅ Module 2 question pasted into Box ${i + 1}`);
                    return;
                }
            }
            
            alert('כל תיבות השאלות מלאות!');
        }
        
        // ═══════════════════════════════════════════════════════════════
        // ✅ END OF MODULE 2 FUNCTIONS
        // ═══════════════════════════════════════════════════════════════

        function togglePause() {
            const pauseBtn = document.getElementById('pauseButton');
            
            if (isPaused) {
                isPaused = false;
                pauseBtn.textContent = '⏸️ השהה';
                pauseBtn.classList.remove('paused-state');
                updateStatus('✅ ממשיך בחיפוש...');
            } else {
                isPaused = true;
                pauseBtn.textContent = '▶️ המשך';
                pauseBtn.classList.add('paused-state');
                updateStatus('⏸️ מושהה - לחץ המשך כדי להמשיך');
                
                if (searchAbortController) {
                    searchAbortController.abort();
                    searchAbortController = null;
                }
            }
        }
        
        function pauseSearch() {
            if (!isSearching) return;
            
            isPaused = true;
            updateStatus('⏸️ חיפוש מושהה');
            
            document.getElementById('pauseSearchBtn').classList.add('hidden');
            document.getElementById('continueSearchBtn').classList.remove('hidden');
            
            if (queryTimerInterval) {
                clearInterval(queryTimerInterval);
                queryTimerInterval = null;
            }
            
        }
        
        function continueSearch() {
            if (!isSearching) return;
            
            isPaused = false;
            updateStatus('✅ ממשיך בחיפוש...');
            
            document.getElementById('pauseSearchBtn').classList.remove('hidden');
            document.getElementById('continueSearchBtn').classList.add('hidden');
            
            startQueryTimer();
            
        }
        
        function stopSearch() {
            if (!isSearching) return;
            
            isSearching = false;
            isPaused = false;
            
            if (queryTimerInterval) {
                clearInterval(queryTimerInterval);
                queryTimerInterval = null;
            }
            
            document.getElementById('pauseSearchBtn').classList.add('hidden');
            document.getElementById('continueSearchBtn').classList.add('hidden');
            document.getElementById('stopSearchBtn').classList.add('hidden');
            
            if (searchAbortController) {
                searchAbortController.abort();
                searchAbortController = null;
            }
            
            updateStatus('🔴 חיפוש הופסק על ידי המשתמש');
            document.getElementById('searchResults').innerHTML = `
                <div class="text-center p-8 text-red-600">
                    <h3 class="text-2xl font-bold">🔴 חיפוש הופסק</h3>
                    <p class="mt-2">החיפוש הופסק על ידי המשתמש</p>
                </div>
            `;
            
            queryEndTime = Date.now();
            const totalTime = ((queryEndTime - queryStartTime) / 1000).toFixed(2);
            document.getElementById('queryTimer').textContent = `${totalTime}s (הופסק)`;
            
        }
        
        function startQueryTimer() {
            const queryTimerEl = document.getElementById('queryTimer');
            if (!queryTimerEl) {
                console.warn('queryTimer element not found');
                return;
            }
            
            queryStartTime = Date.now();
            queryTimerEl.textContent = '0.00s';
            
            if (queryTimerInterval) {
                clearInterval(queryTimerInterval);
            }
            
            queryTimerInterval = setInterval(() => {
                if (!isPaused) {
                    const elapsed = ((Date.now() - queryStartTime) / 1000).toFixed(2);
                    const el = document.getElementById('queryTimer');
                    if (el) {
                        el.textContent = `${elapsed}s`;
                    }
                }
            }, 100); // Update every 100ms for smooth counting
        }
        
        function stopQueryTimer() {
            if (queryTimerInterval) {
                clearInterval(queryTimerInterval);
                queryTimerInterval = null;
            }
            
            const queryTimerEl = document.getElementById('queryTimer');
            if (!queryTimerEl) {
                console.warn('queryTimer element not found');
                return;
            }
            
            queryEndTime = Date.now();
            const totalTime = ((queryEndTime - queryStartTime) / 1000).toFixed(2);
            queryTimerEl.textContent = `${totalTime}s`;
            
        }
        
        function resetQueryTimer() {
            if (queryTimerInterval) {
                clearInterval(queryTimerInterval);
                queryTimerInterval = null;
            }
            
            const queryTimerEl = document.getElementById('queryTimer');
            if (queryTimerEl) {
                queryTimerEl.textContent = '0.00s';
            }
        }

        function startSessionTimer() {
            function updateClock() {
                const sessionTimerEl = document.getElementById('sessionTimer');
                if (!sessionTimerEl) {
                    console.warn('sessionTimer element not found');
                    return;
                }
                
                const now = new Date();
                const timeStr = now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const dateStr = now.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
                sessionTimerEl.textContent = `${timeStr} • ${dateStr}`;
            }
            updateClock(); // Update immediately
            timerInterval = setInterval(updateClock, 1000); // Update every second
        }

        function calculateCost(inputTokens, outputTokens) {
            const inputCost = inputTokens * INPUT_TOKEN_COST;
            const outputCost = outputTokens * OUTPUT_TOKEN_COST;
            return inputCost + outputCost;
        }

        function updateMetrics(newInputTokens = 0, newOutputTokens = 0) {
            totalInputTokens += newInputTokens;
            totalOutputTokens += newOutputTokens;
            totalCost = calculateCost(totalInputTokens, totalOutputTokens);
            
            const totalTokens = totalInputTokens + totalOutputTokens;
            
            const tokenCountEl = document.getElementById('tokenCount');
            if (tokenCountEl) {
                tokenCountEl.textContent = totalTokens.toLocaleString();
            }
            
            const totalCostEl = document.getElementById('totalCost');
            if (totalCostEl) {
                totalCostEl.textContent = `$${totalCost.toFixed(4)}`;
            }
            
            const assetsEl = document.getElementById('assetsSearched');
            if (assetsEl) {
                assetsEl.textContent = totalAssets;
            }
            
            const successRateEl = document.getElementById('successRate');
            if (successRateEl) {
                const successRate = totalQueries > 0 ? Math.round((successfulQueries / totalQueries) * 100) : 0;
                successRateEl.textContent = `${successRate}%`;
            }
        }

        function resetSession() {
            if (confirm('להתחיל סשן חדש? זה ינקה את כל השאלות והתוצאות.')) {
                sessionStartTime = Date.now();
                totalInputTokens = 0;
                totalOutputTokens = 0;
                totalCost = 0;
                totalAssets = 0;
                successfulQueries = 0;
                totalQueries = 0;
                currentQueries = [];
                usedCSVs.clear();
                
                isSearching = false;
                isPaused = false;
                resetQueryTimer();
                
                clearAllQueries();
                document.getElementById('searchResults').innerHTML = '';
                document.getElementById('activeQueries').innerHTML = '';
                document.getElementById('shareButtons').classList.add('hidden');
                document.getElementById('reportOptions').classList.add('hidden');
                document.getElementById('fallbackBrowser').classList.add('hidden');
                
                document.getElementById('pauseSearchBtn').classList.add('hidden');
                document.getElementById('continueSearchBtn').classList.add('hidden');
                document.getElementById('stopSearchBtn').classList.add('hidden');
                
                resetCSVIndicators();
                updateMetrics();
            }
        }

        async function createCSVIndicators() {
            const container = document.getElementById('csvIndicatorsLeft');
            if (!container) {
                return;
            }
            
            try {
                const { data: searchConfig, error } = await supabaseClient
                    .from('system_search_config_20260129')
                    .select('table_name, priority, description')
                    .eq('enabled', true)
                    .order('priority');
                
                if (error) {
                    console.error('Error loading CSV indicators:', error);
                    container.innerHTML = '<div class="text-white text-xs text-center">שגיאה בטעינה</div>';
                    return;
                }
                
                if (!searchConfig || searchConfig.length === 0) {
                    container.innerHTML = '<div class="text-white text-xs text-center">אין מקורות זמינים</div>';
                    return;
                }
                
                container.innerHTML = searchConfig.map(config => {
                    const isDrRoni = config.table_name.toLowerCase().includes('dr_roni') || 
                                     config.table_name.toLowerCase().includes('bible');
                    const isZangfu = config.table_name === 'bible_rag_zangfu_syndromes_20260129';
                    const displayName = config.description || config.table_name;
                    const shortName = displayName.length > 30 ? displayName.substring(0, 30) + '...' : displayName;
                    
                    return `
                        <div class="csv-box ${isDrRoni || isZangfu ? 'bible' : ''}" 
                             data-csv="${config.table_name}" 
                             title="${displayName} (Priority ${config.priority})">
                            <div class="text-xs font-semibold">${isDrRoni ? '⭐ ' : ''}${shortName}</div>
                            <div class="text-[10px] opacity-75">Priority ${config.priority}</div>
                        </div>
                    `;
                }).join('');
                
                console.log(`✅ Loaded ${searchConfig.length} table indicators`);
                
            } catch (err) {
                console.error('Exception creating CSV indicators:', err);
                container.innerHTML = '<div class="text-white text-xs text-center">שגיאה</div>';
            }
        }

        function highlightUsedCSVs(tableNames) {
            resetCSVIndicators();
            tableNames.forEach(tableName => {
                const box = document.querySelector(`[data-csv="${tableName}"]`);
                if (box) box.classList.add('active');
            });
        }

        function resetCSVIndicators() {
            document.querySelectorAll('.csv-box').forEach(box => box.classList.remove('active'));
        }

        function createQuickQuestions() {
            filterQuestions();
        }

        function filterQuestions() {
            const categoryEl = document.getElementById('categoryFilter');
            if (!categoryEl) return;
            
            const category = categoryEl.value;
            loadModule1Questions(category, 0);
        }
        
        function displayQuestions(questions, isAllCategories) {
            const container = document.getElementById('quickQuestions');
            if (!container) return;
            
            container.innerHTML = questions.map((q, i) => `
                <div class="quick-question" onclick="applyQuickQuestion('${q.category}', ${i}, ${isAllCategories})">
                    ${q.text}
                </div>
            `).join('');
        }
        
        function addLoadMoreButton(allQuestions) {
            const container = document.getElementById('quickQuestions');
            if (!container) return;
            
            const loadMoreBtn = document.createElement('div');
            loadMoreBtn.className = 'quick-question';
            loadMoreBtn.style.cssText = 'background: #e0f2fe; color: #0369a1; font-weight: bold; text-align: center; cursor: pointer; border: 2px dashed #0ea5e9;';
            loadMoreBtn.innerHTML = `📥 טען עוד שאלות (${allQuestions.length - questionsPerCategory} נוספות)`;
            loadMoreBtn.onclick = () => loadMoreQuestions(allQuestions);
            container.appendChild(loadMoreBtn);
        }
        
        function loadMoreQuestions(allQuestions) {
            currentOffset += questionsPerCategory;
            const nextBatch = allQuestions.slice(currentOffset, currentOffset + questionsPerCategory);
            
            if (nextBatch.length > 0) {
                const container = document.getElementById('quickQuestions');
                if (!container) return;
                
                // Remove "load more" button
                const loadMoreBtn = container.querySelector('[style*="dashed"]');
                if (loadMoreBtn) loadMoreBtn.remove();
                
                // Add next batch
                nextBatch.forEach((q, i) => {
                    const div = document.createElement('div');
                    div.className = 'quick-question';
                    div.innerHTML = q.text;
                    div.onclick = () => applyQuickQuestion(q.category, currentOffset + i, false);
                    container.appendChild(div);
                });
                
                // Add "load more" button again if there are more questions
                if (currentOffset + questionsPerCategory < allQuestions.length) {
                    addLoadMoreButton(allQuestions);
                }
            }
        }

        function applyQuickQuestion(category, index, isAllCategories) {
            let question;
            
            if (isAllCategories) {
                // Find the question in the displayed list
                const displayedQuestions = [];
                const categoryCounts = {};
                
                hebrewQuestions.forEach(q => {
                    if (!categoryCounts[q.category]) {
                        categoryCounts[q.category] = 0;
                    }
                    if (categoryCounts[q.category] < questionsPerCategory) {
                        displayedQuestions.push(q);
                        categoryCounts[q.category]++;
                    }
                });
                
                question = displayedQuestions[index];
            } else {
                const filtered = hebrewQuestions.filter(q => q.category === category);
                question = filtered[index];
            }
            
            if (!question) return;
            
            let targetBox = 1;
            for (let i = 1; i <= 4; i++) {
                if (!document.getElementById(`searchInput${i}`).value.trim()) {
                    targetBox = i;
                    break;
                }
            }
            
            document.getElementById(`searchInput${targetBox}`).value = question.text;
            updateQueryBox(targetBox);
            
            const runButton = document.querySelector('.run-query-button');
            if (runButton) {
                runButton.classList.add('pulse-attention');
                setTimeout(() => runButton.classList.remove('pulse-attention'), 2000);
            }
        }

        function updateQueryBox(queryNum) {
            const input = document.getElementById(`searchInput${queryNum}`);
            const box = document.getElementById(`queryBox${queryNum}`);
            
            if (input.value.trim()) {
                box.classList.add('filled');
            } else {
                box.classList.remove('filled');
            }
        }

        function startVoiceInput(boxNumber) {
            if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                alert('הדפדפן שלך אינו תומך בזיהוי קולי. נסה להשתמש ב-Chrome.');
                return;
            }
            
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            
            recognition.lang = 'he-IL'; // Hebrew
            recognition.continuous = false;
            recognition.interimResults = false;
            
            const inputEl = document.getElementById(`searchInput${boxNumber}`);
            const button = event.target;
            
            button.textContent = '🎙️';
            button.classList.add('bg-red-600');
            
            recognition.onstart = function() {
            };
            
            recognition.onresult = function(event) {
                const transcript = event.results[0][0].transcript;
                inputEl.value = transcript;
                updateQueryBox(boxNumber);
            };
            
            recognition.onerror = function(event) {
                console.error('🎤 Voice recognition error:', event.error);
                alert('שגיאה בזיהוי קולי: ' + event.error);
            };
            
            recognition.onend = function() {
                button.textContent = '🎤';
                button.classList.remove('bg-red-600');
            };
            
            recognition.start();
        }

        function clearAllQueries() {
            for (let i = 1; i <= 4; i++) {
                document.getElementById(`searchInput${i}`).value = '';
                document.getElementById(`queryBox${i}`).classList.remove('filled');
            }
            currentQueries = [];
            document.getElementById('activeQueries').innerHTML = '';
        }

        async function performMultiQuery() {
            if (isPaused) {
                alert('החיפוש מושהה. לחץ "המשך" כדי להמשיך.');
                return;
            }
            
            currentQueries = [];
            for (let i = 1; i <= 4; i++) {
                const val = document.getElementById(`searchInput${i}`).value.trim();
                if (val) currentQueries.push(val);
            }

            if (currentQueries.length === 0) {
                alert('נא להזין לפחות שאלה אחת');
                return;
            }

            totalQueries++;
            
            isSearching = true;
            startQueryTimer();
            
            document.getElementById('pauseSearchBtn').classList.remove('hidden');
            document.getElementById('stopSearchBtn').classList.remove('hidden');
            document.getElementById('continueSearchBtn').classList.add('hidden');
            
            document.getElementById('tokenCount').style.animation = 'pulse 1s infinite';
            
            document.getElementById('pauseButton').classList.remove('hidden');
            isPaused = false;

            document.getElementById('activeQueries').innerHTML = `
                <div class="p-4 bg-blue-50 border-2 border-blue-300 rounded-xl">
                    <h4 class="font-bold text-blue-800 mb-2 text-right">🔍 שאלות פעילות:</h4>
                    <ul class="list-disc list-inside space-y-1 text-right">
                        ${currentQueries.map(q => `<li class="text-blue-700">${q}</li>`).join('')}
                    </ul>
                </div>
            `;

            const results = document.getElementById('searchResults');
            results.innerHTML = '<div class="text-center p-8"><div class="animate-spin text-6xl">🔄</div><p class="mt-4 text-lg">מחפש במאגר RAG...</p></div>';

            try {
                searchAbortController = new AbortController();
                
                const allResults = await searchMultipleQueries(currentQueries);
                
                if (isPaused) {
                    results.innerHTML = '<div class="text-center p-8 text-orange-600"><h3 class="text-2xl font-bold">⏸️ חיפוש מושהה</h3><p>לחץ "המשך" כדי להמשיך</p></div>';
                    return;
                }
                
                const hasResults = (allResults.totalResults && allResults.totalResults > 0) || 
                                   (allResults.formulas && allResults.formulas.length > 0) || 
                                   (allResults.acupoints && allResults.acupoints.length > 0);
                
                if (hasResults) {
                    successfulQueries++;
                    
                    if (allResults.totalResults > 0 && allResults.allResults) {
                        const uniqueTables = [...new Set(allResults.allResults.map(r => r._source_table))];
                        
                        highlightUsedCSVs(uniqueTables);
                        
                        const successMsg = document.createElement('div');
                        successMsg.className = 'bg-green-50 p-4 rounded-lg border-2 border-green-200 mb-4 text-right';
                        successMsg.innerHTML = `
                            <p class="text-green-800 font-bold text-lg" dir="rtl">
                                ✅ נמצאו ${allResults.totalResults} תוצאות מ-${uniqueTables.length} טבלאות!
                            </p>
                            <p class="text-green-600 text-sm mt-1" dir="rtl">
                                טבלאות: ${uniqueTables.join(', ')}
                            </p>
                        `;
                        results.appendChild(successMsg);
                    }
                    
                    await displaySearchResults(allResults);
                    document.getElementById('shareButtons').classList.remove('hidden');
                    document.getElementById('reportOptions').classList.remove('hidden');
                    document.getElementById('fallbackBrowser').classList.add('hidden');
                } else {
                    await triggerFallbackSearch(currentQueries);
                }

                document.getElementById('tokenCount').style.animation = '';
                document.getElementById('pauseButton').classList.add('hidden');
                
                isSearching = false;
                stopQueryTimer();
                document.getElementById('pauseSearchBtn').classList.add('hidden');
                document.getElementById('continueSearchBtn').classList.add('hidden');
                document.getElementById('stopSearchBtn').classList.add('hidden');

            } catch (error) {
                console.error('Search error:', error);
                
                if (error.name === 'AbortError') {
                    results.innerHTML = '<div class="text-center p-8 text-orange-600"><h3 class="text-2xl font-bold">⏸️ חיפוש מושהה</h3></div>';
                } else {
                    results.innerHTML = `
                        <div class="bg-red-50 p-6 rounded-xl border-2 border-red-200 text-right">
                            <h4 class="text-xl font-bold text-red-800 mb-2">⚠️ שגיאת חיפוש</h4>
                            <p class="text-red-600">${error.message}</p>
                        </div>
                    `;
                }
                
                document.getElementById('tokenCount').style.animation = '';
                document.getElementById('pauseButton').classList.add('hidden');
                
                isSearching = false;
                stopQueryTimer();
                document.getElementById('pauseSearchBtn').classList.add('hidden');
                document.getElementById('continueSearchBtn').classList.add('hidden');
                document.getElementById('stopSearchBtn').classList.add('hidden');
            }
        }

        // ========================================
        // ========================================

        // SEARCH CONFIG CACHE (NOW DECLARED IN search-engine.js)
        // let searchConfigCache = null;

        /**
         * Load search configuration from database
         */
        async function loadSearchConfig() {
            if (searchConfigCache) {
                return searchConfigCache;
            }
            
            try {
                const { data, error } = await supabaseClient
                    .from('system_search_config_20260129')
                    .select('*')
                    .eq('enabled', true)
                    .order('priority');
                
                if (error) {
                    console.error('❌ Error loading search config:', error);
                    return [];
                }
                
                console.log(`✅ Loaded ${data.length} searchable tables from search_config`);
                searchConfigCache = data;
                return data;
            } catch (err) {
                console.error('❌ Failed to load search config:', err);
                return [];
            }
        }

        /**
         * NEW SEARCH FUNCTION - Searches all configured tables
         */
        async function searchMultipleQueries(queries) {
            
            const searchConfig = await loadSearchConfig();
            
            if (!searchConfig || searchConfig.length === 0) {
                console.error('❌ No search configuration found!');
                return { formulas: [], acupoints: [], images: [] };
            }
            
            
            const allResults = [];
            let totalResults = 0;
            
            for (const tableConfig of searchConfig) {
                if (isPaused) {
                    break;
                }
                
                for (const query of queries) {
                    try {
                        let searchFields = tableConfig.search_fields;
                        
                        if (typeof searchFields === 'string') {
                            try {
                                searchFields = JSON.parse(searchFields);
                            } catch (e) {
                                searchFields = searchFields.split(',').map(f => f.trim());
                            }
                        }
                        
                        if (!Array.isArray(searchFields)) {
                            console.warn(`  ⚠️ Invalid search_fields for ${tableConfig.table_name}:`, searchFields);
                            continue;
                        }
                        
                        if (searchFields.length === 0) {
                            console.warn(`  ⚠️ No search fields configured for ${tableConfig.table_name}`);
                            continue;
                        }
                        
                        
                        let tableResults = [];
                        
                        for (const field of searchFields) {
                            try {
                                const { data, error } = await supabaseClient
                                    .from(tableConfig.table_name)
                                    .select('*')
                                    .ilike(field, `%${query}%`)
                                    .limit(20);
                                
                                if (error) {
                                    console.warn(`    ⚠️ Field "${field}" search failed:`, error.message);
                                    continue; // Skip this field, try next one
                                }
                                
                                if (data && data.length > 0) {
                                    console.log(`    ✅ Found ${data.length} in field "${field}"`);
                                    tableResults.push(...data);
                                }
                            } catch (fieldError) {
                                console.warn(`    ⚠️ Exception searching field "${field}":`, fieldError.message);
                                continue;
                            }
                        }
                        
                        const uniqueResults = Array.from(
                            new Map(tableResults.map(item => [item.id, item])).values()
                        );
                        
                        if (uniqueResults.length > 0) {
                            console.log(`  ✅ Total ${uniqueResults.length} unique results in ${tableConfig.table_name}`);
                            
                            const resultsWithMeta = uniqueResults.map(row => ({
                                ...row,
                                _source_table: tableConfig.table_name,
                                _source_description: tableConfig.description,
                                _search_query: query
                            }));
                            
                            allResults.push(...resultsWithMeta);
                            totalResults += uniqueResults.length;
                        } else {
                        }
                        
                    } catch (err) {
                        console.error(`  ❌ Exception searching ${tableConfig.table_name}:`, err);
                    }
                }
            }
            
            const seen = new Set();
            const uniqueResults = allResults.filter(result => {
                const key = `${result._source_table}_${result.id}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
            
            console.log(`\n✅ SEARCH COMPLETE! Total: ${uniqueResults.length} unique results`);
            
            // Extract acupoints first
            const acupoints = uniqueResults
                .filter(r => r._source_table && r._source_table.includes('acupuncture') && r._source_table !== 'reference_rag_body_images_20260129')
                .map(point => ({
                    code: point.point_code || point.point_number || point.code || 'N/A',
                    english_name: point.english_name || point.point_name_eng || point.name_en || 'N/A',
                    body_part: point.body_part || point.location || 'N/A',
                    meridian: point.meridian || point.channel || 'N/A'
                }));
            
            // 🎯 SMART IMAGE FETCHING: Match by acupoint codes, keywords, AND medical terms
            let bodyImages = [];
            try {
                // Medical term to body part keyword mapping
                const medicalToBodyPart = {
                    // Organs → Body regions
                    'טחול': ['בטן', 'קדמי'],
                    'כבד': ['בטן', 'צד'],
                    'כליות': ['גב', 'מותן'],
                    'לב': ['חזה', 'קדמי'],
                    'ריאות': ['חזה', 'גב'],
                    'קיבה': ['בטן', 'קדמי'],
                    'מעיים': ['בטן'],
                    'שלפוחית': ['בטן', 'תחתון'],
                    // Conditions → Body regions
                    'עיכול': ['בטן'],
                    'נשימה': ['חזה'],
                    'ראש': ['ראש', 'פנים'],
                    'כאב ראש': ['ראש'],
                    'מיגרנה': ['ראש'],
                    'גב': ['גב'],
                    'צוואר': ['צוואר'],
                    'כתף': ['כתף', 'זרוע'],
                    'ברך': ['רגל', 'ברך'],
                    'קרסול': ['רגל', 'כף רגל'],
                    'יד': ['יד', 'זרוע'],
                    'רגל': ['רגל'],
                    // TCM terms
                    'יאנג': ['גב', 'קדמי'],
                    'יין': ['בטן', 'קדמי'],
                    'צ\'י': ['בטן', 'חזה'],
                    'דם': ['בטן', 'חזה'],
                    'IBS': ['בטן'],
                    'עצירות': ['בטן'],
                    'שלשול': ['בטן']
                };
                
                // Get all active body images
                const { data: allImages, error: imgError } = await supabaseClient
                    .from('reference_rag_body_images_20260129')
                    .select('*')
                    .eq('is_active', true);
                
                if (!imgError && allImages && allImages.length > 0) {
                    console.log(`🖼️ Loaded ${allImages.length} body images from database`);
                    
                    // Method 1: Match images by acupoint codes from results
                    const foundAcupointCodes = acupoints.map(p => p.code.toUpperCase()).filter(c => c !== 'N/A');
                    if (foundAcupointCodes.length > 0) {
                        console.log(`🎯 Found acupoint codes: ${foundAcupointCodes.join(', ')}`);
                        const matchedByCode = allImages.filter(img => {
                            if (!img.acupoint_codes || !Array.isArray(img.acupoint_codes)) return false;
                            return img.acupoint_codes.some(code => 
                                foundAcupointCodes.includes(code.toUpperCase())
                            );
                        });
                        if (matchedByCode.length > 0) {
                            console.log(`  ✅ Matched ${matchedByCode.length} images by acupoint codes`);
                            bodyImages.push(...matchedByCode);
                        }
                    }
                    
                    // Method 2: Match by medical terms in queries → body parts
                    for (const query of queries) {
                        // Check medical term mapping
                        for (const [term, bodyParts] of Object.entries(medicalToBodyPart)) {
                            if (query.includes(term)) {
                                console.log(`  🔍 Query contains "${term}" → searching for ${bodyParts.join(', ')}`);
                                for (const bodyPart of bodyParts) {
                                    const matchedByMedical = allImages.filter(img => {
                                        const searchIn = [
                                            img.body_part_hebrew,
                                            img.body_part,
                                            ...(img.search_keywords_hebrew || [])
                                        ].filter(Boolean).join(' ').toLowerCase();
                                        return searchIn.includes(bodyPart.toLowerCase());
                                    });
                                    if (matchedByMedical.length > 0) {
                                        console.log(`    ✅ Found ${matchedByMedical.length} images for "${bodyPart}"`);
                                        bodyImages.push(...matchedByMedical);
                                    }
                                }
                            }
                        }
                        
                        // Method 3: Direct keyword match in search_keywords_hebrew
                        const matchedByKeyword = allImages.filter(img => {
                            if (!img.search_keywords_hebrew || !Array.isArray(img.search_keywords_hebrew)) return false;
                            return img.search_keywords_hebrew.some(keyword => 
                                query.includes(keyword) || keyword.includes(query)
                            );
                        });
                        if (matchedByKeyword.length > 0) {
                            console.log(`  ✅ Matched ${matchedByKeyword.length} images by keyword in "${query}"`);
                            bodyImages.push(...matchedByKeyword);
                        }
                    }
                    
                    // Remove duplicates
                    bodyImages = Array.from(new Map(bodyImages.map(img => [img.id, img])).values());
                    console.log(`🖼️ Total unique body images matched: ${bodyImages.length}`);
                } else {
                    console.warn('⚠️ No body images loaded or error:', imgError);
                }
            } catch (imgError) {
                console.error('❌ Error fetching body images:', imgError);
            }
            
            return {
                allResults: uniqueResults,
                totalResults: uniqueResults.length,
                formulas: uniqueResults.filter(r => r._source_table === 'tcm_formulas'),
                acupoints: acupoints,
                images: bodyImages.map(img => ({
                    id: img.id,
                    body_part: img.body_part_hebrew || img.body_part || 'תמונת גוף',
                    body_part_en: img.body_part,
                    storage_url: img.image_url,
                    filename: img.body_part,
                    acupoint_codes: img.acupoint_codes || []
                }))
            };
        }

        async function displaySearchResults(results) {
            // ============================================================================
            // ============================================================================
            const cachedResponse = getCachedResponse(currentQueries);
            
            if (cachedResponse) {
                const resultsDiv = document.getElementById('searchResults');
                resultsDiv.innerHTML = `
                    <div class="bg-yellow-50 p-3 rounded-lg border-2 border-yellow-300 mb-4 text-right" dir="rtl">
                        <span class="text-xl">💾</span>
                        <strong>תשובה שמורה</strong> - שאלה זו כבר נענתה בעבר (חסכון בעלות!)
                        <span class="text-xs text-gray-600">נשאלה ${cachedResponse.hits} פעמים נוספות</span>
                    </div>
                    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border-2 border-blue-200 mb-6">
                        <h4 class="text-xl font-bold mb-4 flex items-center justify-end">
                            <span class="mr-3">תשובת AI (מופעל על ידי RAG)</span>
                            <span class="text-3xl">🤖</span>
                        </h4>
                        <div class="prose max-w-none whitespace-pre-wrap text-right" dir="rtl">${cachedResponse}</div>
                    </div>
                `;
                
                lastSearchResults = cachedResponse;
                
                addToAuditLog({
                    type: 'cached_response',
                    queries: currentQueries,
                    cacheHit: true,
                    costSaved: 0.002
                });
                
                return; // Done - no API call needed!
            }
            
            // ============================================================================
            // ============================================================================
            const reportDetail = document.querySelector('input[name="reportDetail"]:checked').value;
            const context = buildAIContext(results, reportDetail);
            
            
            // 🔒 SECURE: Call Edge Function (API key stored in Supabase Secrets)
            const response = await fetch(EDGE_FUNCTION_URL, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: context,
                    max_tokens: reportDetail === 'full' ? 3000 : 1500
                })
            });

            const data = await response.json();
            
            // Handle Edge Function response
            if (data.error) {
                throw new Error(data.error);
            }
            
            const aiResponse = data.content || data.text || 'לא התקבלה תשובה מהשרת';
            
            const inputTokens = data.usage?.input_tokens || Math.ceil(context.length / 4);
            const outputTokens = data.usage?.output_tokens || Math.ceil(aiResponse.length / 4);
            
            updateMetrics(inputTokens, outputTokens);
            lastSearchResults = aiResponse;
            
            // ============================================================================
            // ============================================================================
            cacheResponse(currentQueries, aiResponse, results);
            
            // ============================================================================
            // ============================================================================
            addToAuditLog({
                type: 'new_query',
                queries: currentQueries,
                resultCount: results.allResults ? results.allResults.length : 0,
                warningsFound: results.allResults ? results.allResults.filter(r => r._source_table === 'acupuncture_point_warnings').length : 0,
                inputTokens: inputTokens,
                outputTokens: outputTokens,
                cost: (inputTokens * INPUT_TOKEN_COST) + (outputTokens * OUTPUT_TOKEN_COST),
                cacheHit: false
            });

            const resultsDiv = document.getElementById('searchResults');
            resultsDiv.innerHTML = `
                <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border-2 border-blue-200 mb-6">
                    <h4 class="text-xl font-bold mb-4 flex items-center justify-end">
                        <span class="mr-3">תשובת AI (מופעל על ידי RAG)</span>
                        <span class="text-3xl">🤖</span>
                    </h4>
                    <div class="prose max-w-none whitespace-pre-wrap text-right" dir="rtl">${aiResponse}</div>
                </div>
                
                ${results.acupoints && results.acupoints.length > 0 ? `
                    <div class="bg-green-50 p-6 rounded-xl border-2 border-green-300 mb-6">
                        <h4 class="text-xl font-bold mb-4 text-right">🎯 נקודות דיקור מתאימות (${results.acupoints.length}):</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            ${results.acupoints.map(point => `
                                <div class="bg-white p-3 rounded-lg shadow text-right">
                                    <div class="font-bold text-red-600">${point.code}</div>
                                    <div class="text-sm text-gray-700">${point.english_name || 'N/A'}</div>
                                    <div class="text-xs text-gray-500">${point.body_part} · ${point.meridian}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${results.images && results.images.length > 0 ? `
                    <div class="bg-purple-50 p-6 rounded-xl border-2 border-purple-300">
                        <h4 class="text-xl font-bold mb-4 text-right">🖼️ דיאגרמות גוף רלוונטיות (${results.images.length}):</h4>
                        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                            ${results.images.map(img => `
                                <div class="cursor-pointer hover:scale-105 transition" onclick="showImageFullscreen('${img.storage_url}', '${img.filename}')">
                                    <img src="${img.storage_url}" 
                                         alt="${img.body_part}" 
                                         class="w-full h-48 object-contain bg-white rounded-lg shadow-md"
                                         onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                                    <div style="display:none;" class="w-full h-48 flex items-center justify-center bg-gray-100 rounded-lg">
                                        <span class="text-gray-500 text-sm">תמונה לא זמינה</span>
                                    </div>
                                    <p class="text-center text-sm font-semibold mt-2">${img.body_part}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            `;
        }

        function buildAIContext(results, reportDetail) {
            const queries = currentQueries.join(', ');
            
            if (results.allResults && results.allResults.length > 0) {
                // ============================================================================
                // ============================================================================
                
                const categories = categorizeResults(results.allResults);
                const conflicts = detectConflicts(categories);
                
                
                let contextParts = [];
                
                // ============================================================================
                // PRIORITY 1: WARNINGS (Show first, cannot be skipped!)
                // ============================================================================
                if (categories.warnings.length > 0) {
                    const warningText = categories.warnings.map(w => {
                        return `⚠️ אזהרה: ${w.warning_he || w.explanation || w.point_number_hebrew || 'אזהרת בטיחות'} - רמת חומרה: ${w.warning_level || w.severity || 'גבוהה'}`;
                    }).join('\n');
                    
                    contextParts.push(`
════════════════════════════════════════════════════════
⚠️ אזהרות בטיחות קריטיות - חובה לקרוא לפני טיפול! ⚠️
════════════════════════════════════════════════════════
${warningText}
════════════════════════════════════════════════════════`);
                }
                
                // ============================================================================
                // ============================================================================
                if (conflicts.length > 0) {
                    const conflictText = conflicts.map(c => {
                        return `🚨 סתירה קריטית: ${c.message}
   טיפול מוצע: ${JSON.stringify(c.treatment).substring(0, 100)}
   אזהרה: ${JSON.stringify(c.warning).substring(0, 100)}
   המלצה: אל תשתמש בנקודות ${c.points.join(', ')} - קיימת אזהרת בטיחות!`;
                    }).join('\n\n');
                    
                    contextParts.push(`
════════════════════════════════════════════════════════
🚨 זוהו סתירות בין טיפול מוצע לאזהרות בטיחות! 🚨
════════════════════════════════════════════════════════
${conflictText}
════════════════════════════════════════════════════════`);
                }
                
                const groupedByTable = {};
                results.allResults.forEach(r => {
                    const table = r._source_table;
                    if (!groupedByTable[table]) groupedByTable[table] = [];
                    groupedByTable[table].push(r);
                });
                
                if (groupedByTable['diagnostic_rag_pulse_patterns_20260129']) {
                    const pulses = groupedByTable['diagnostic_rag_pulse_patterns_20260129'].slice(0, 5);
                    contextParts.push(`ממצאי דופק: ${pulses.map(p => 
                        `${p.pulse_name_he} (${p.pulse_name_en}) - ${p.clinical_significance}`
                    ).join('; ')}`);
                }
                
                if (groupedByTable['diagnostic_rag_tongue_findings_20260129']) {
                    const tongues = groupedByTable['diagnostic_rag_tongue_findings_20260129'].slice(0, 5);
                    contextParts.push(`ממצאי לשון: ${tongues.map(t => 
                        `${t.finding_he} (${t.finding_en}) - ${t.clinical_significance}`
                    ).join('; ')}`);
                }
                
                if (groupedByTable['dr_roni_acupuncture_points']) {
                    const points = groupedByTable['dr_roni_acupuncture_points'].slice(0, 10);
                    const safePoints = conflicts.length > 0 
                        ? points.filter(p => {
                            const pointCodes = extractPointCodes(p);
                            return !conflicts.some(c => c.points.some(cp => pointCodes.includes(cp)));
                        })
                        : points;
                    
                    if (safePoints.length > 0) {
                        contextParts.push(`נקודות דיקור של ד"ר רוני: ${safePoints.map(p => 
                            `${p.chinese_name} (${p.english_name}) - ${p.description || ''}`
                        ).join('; ')}`);
                    }
                }
                
                if (groupedByTable['bible_rag_zangfu_syndromes_20260129']) {
                    const syndromes = groupedByTable['bible_rag_zangfu_syndromes_20260129'].slice(0, 5);
                    contextParts.push(`תסמונות: ${syndromes.map(s => 
                        `${s.name_he} - ${s.symptoms_he || ''}`
                    ).join('; ')}`);
                }
                
                if (groupedByTable['qa_knowledge_base']) {
                    const qaItems = groupedByTable['qa_knowledge_base'].slice(0, 3);
                    contextParts.push(`מידע חינוכי: ${qaItems.map(q => 
                        `שאלה: ${q.question_hebrew} | תשובה: ${(q.answer_hebrew || '').substring(0, 150)}...`
                    ).join('\n')}`);
                }
                
                const detailInstruction = reportDetail === 'full'
                    ? 'ספק דוח מקיף ומפורט בעברית עם פרוטוקולי טיפול, תוך שילוב של כל הממצאים האבחנתיים.'
                    : 'ספק סיכום תמציתי בעברית עם נקודות מפתח בלבד.';
                
                // ============================================================================
                // ============================================================================
                return `אתה עוזר קליני מומחה ברפואה סינית. חובה לעקוב אחר חוקים אלה בקפדנות:

🚨 חוקי בטיחות קריטיים (לא ניתן להתעלם!):
═══════════════════════════════════════════════════════════════════
1. אם יש אזהרות בטיחות - הצג אותן תחילה ב־3 שורות הראשונות במסגרת אדומה
2. אם זוהו סתירות בין טיפול לאזהרה - אסור לכלול את הטיפול הסותר!
3. אם מקורות סותרים זה את זה - הצג שתי אופציות ואפשר למטפל לבחור
4. ציין תמיד מקור למידע (מאיזו טבלה)
5. הוסף תמיד כתב ויתור משפטי בסוף

שאילתות: "${queries}"

${contextParts.join('\n\n')}

${detailInstruction}

פורמט החובה לתשובה:
═══════════════════════════════════════════════════════════════════
אם יש אזהרות:
┌─────────────────────────────────────────────────────────────────┐
│ ⚠️ אזהרות בטיחות קריטיות - קרא לפני טיפול! ⚠️                  │
├─────────────────────────────────────────────────────────────────┤
│ [רשום כאן את כל האזהרות]                                        │
└─────────────────────────────────────────────────────────────────┘

🎯 טיפול מומלץ:
[רשום כאן את הטיפול, תוך הוצאת נקודות עם אזהרות]

🔄 חלופות (אם מקורות חלוקים):
[רשום אופציות שונות אם יש]

📚 מקורות:
[ציין מאיזו טבלה כל מידע]

אם זוהו סתירות:
🚨 שים לב: מצאנו מידע סותר
   [הסבר את הסתירה]
   [המלצה: בחר את האופציה הבטוחה יותר]

⚖️ כתב ויתור משפטי:
המערכת מספקת מידע עזר בלבד. אינה מהווה תחליף לשיקול קליני מקצועי.
המטפל אחראי באופן בלעדי: לאימות התווית נגד, לאישור בטיחות הנקודות, 
לקבלת הסכמה מדעת, ולמילוי אחר כל הרגולציות המקומיות.
שימוש במערכת מהווה הסכמה שאתה מטפל מוסמך ברפואה סינית ושאתה תאמת 
את כל ההמלצות לפני יישום.
═══════════════════════════════════════════════════════════════════

ענה בעברית (מימין לשמאל) עם ניתוח רפואה סינית משולב.`;
            }
            
            const formulaContext = results.formulas && results.formulas.length > 0
                ? `Relevant formulas: ${JSON.stringify(results.formulas.slice(0, 10))}`
                : 'No formulas found';
            const acupointContext = results.acupoints && results.acupoints.length > 0
                ? `Relevant acupoints: ${results.acupoints.map(p => `${p.code} (${p.english_name})`).join(', ')}`
                : '';
            const detailInstruction = reportDetail === 'full'
                ? 'Provide COMPREHENSIVE and DETAILED Hebrew report with treatment protocols.'
                : 'Provide CONCISE Hebrew summary with key points only.';

            return `You are a TCM expert. Answer in HEBREW (right-to-left). Queries: "${queries}"

${formulaContext}
${acupointContext}

${detailInstruction}

Respond in Hebrew with TCM analysis.`;
        }

        async function triggerFallbackSearch(queries) {
            document.getElementById('fallbackBrowser').classList.remove('hidden');
            const resultsDiv = document.getElementById('fallbackResults');
            resultsDiv.innerHTML = '<div class="text-center p-4"><div class="animate-spin text-2xl">🔄</div></div>';

            const prompt = `Search for Hebrew/CM medical info: ${queries.join(', ')}. Respond in HEBREW.`;

            try {
                // 🔒 SECURE: Call Edge Function (API key stored in Supabase Secrets)
                const response = await fetch(EDGE_FUNCTION_URL, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        prompt: prompt,
                        max_tokens: 1000
                    })
                });

                const data = await response.json();
                
                if (data.error) {
                    throw new Error(data.error);
                }
                
                const aiResponse = data.content || data.text || 'לא התקבלה תשובה מהשרת';
                resultsDiv.innerHTML = `<div class="prose max-w-none text-right" dir="rtl">${aiResponse}</div>`;
                
                const outputTokens = data.usage?.output_tokens || Math.ceil(aiResponse.length / 4);
                updateMetrics(250, outputTokens);
            } catch (error) {
                resultsDiv.innerHTML = `<div class="text-red-600 text-right">שגיאה: ${error.message}</div>`;
            }
        }

        function toggleReportDetail() {
            if (currentQueries.length > 0 && confirm('ליצור מחדש תוצאות עם רמת פירוט חדשה?')) {
                performMultiQuery();
            }
        }

        function printReport() { window.print(); }
        function shareWhatsApp() {
            const text = `דוח עוזר קליני CM\n\nשאלות: ${currentQueries.join(', ')}\n\n${lastSearchResults}`;
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        }
        function emailReport() {
            const subject = 'דוח עוזר קליני CM';
            const body = `שאלות: ${currentQueries.join(', ')}\n\n${lastSearchResults}`;
            window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        }
        function downloadPDF() {
            window.print();
            alert('השתמש באפשרות "שמור כ-PDF" בתיבת הדו-שיח להדפסה.');
        }

        function showImageFullscreen(url, filename) {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
            modal.onclick = () => modal.remove();
            modal.innerHTML = `
                <div class="max-w-4xl max-h-screen p-4">
                    <img src="${url}" alt="${filename}" class="max-w-full max-h-screen object-contain">
                    <p class="text-white text-center mt-4">${filename}</p>
                </div>
            `;
            document.body.appendChild(modal);
        }

        async function init() {
            updateStatus('מתחבר ל-Supabase...');
            startSessionTimer();
            
            try {
                await loadRAGData();
                // Don't auto-load questions - they load when user expands Module 1 panel
                // await loadModule1Questions('all', 0);
                // await loadModule2Questions(); // ← COMMENTED OUT: Function now loads from external module questions-589.js
                updateStatus('✅ המערכת מוכנה! לחץ על "411 שאלות" להצגת שאלות');
            } catch (error) {
                console.error('Database connection error:', error);
                updateStatus('⚠️ עובד במצב לא מקוון - שאלון יין-יאנג זמין');
            }
            
            try {
                await createCSVIndicators();  // Load table indicators from database
                createQuickQuestions();
                updateMetrics();
            } catch (error) {
                console.error('UI initialization error:', error);
            }

            
            // Load modular components
            try {
                const componentLoader = new ComponentLoader(supabaseClient);
                await componentLoader.loadPanelComponents('left-panel', 'dynamicComponents');
            } catch (error) {
                console.error('Component loading error:', error);
            }

        }

        async function loadRAGData() {
            // NOTE: csv_priorities table removed - now using search_config in createCSVIndicators()
            
            const { data: acupoints } = await supabaseClient.from('treatment_rag_acupoints_gallery_20260129').select('*');
            if (acupoints) acupointsData = acupoints;
            
            const { data: images } = await supabaseClient.from('reference_rag_body_images_20260129').select('*');
            if (images) imagesData = images;
        }

        function updateStatus(message) {
            const statusElement = document.getElementById('statusText');
            if (statusElement) {
                statusElement.textContent = message;
            } else {
                console.log('Status:', message);
            }
        }

        window.addEventListener('DOMContentLoaded', init);
