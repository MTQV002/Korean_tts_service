const { Plugin, PluginSettingTab, Modal, ItemView, WorkspaceLeaf, Setting, Notice } = require('obsidian');

const DICTIONARY_VIEW_TYPE = 'dictionary-view';

// Production Korean TTS Service URL - Railway.app (FREE)
const KOREAN_SERVICE_URL = 'https://korean-tts-service-production.up.railway.app';
const KOREAN_SERVICE_BASE = KOREAN_SERVICE_URL || 'http://localhost:6790';

const DEFAULT_SETTINGS = {
    llmkey: '',
    hfkey: '', // Hugging Face API key
    def: 'Vietnamese',
    ttsEngine: 'google' // Only Google TTS
};

// Helper function to generate consistent audio filename
function generateAudioFileName(term, audio, index = 0) {
    const safeTerm = term.replace(/[^a-zA-Z0-9ㄱ-ㅎㅏ-ㅣ가-힣]/g, "_");
    const engineName = 'google'; // Always Google TTS
    const quality = audio.quality || 'standard';
    return `korean_${engineName}_${quality}_${safeTerm}_${index}.mp3`;
}

// Korean Audio API utility (Simple TTS Service)
async function getKoreanAudio(term, ttsEngine = 'google') {
    try {
        console.log(`🔍 Getting Korean audio for: ${term} (Engine: ${ttsEngine})`);
        
        // Only Google TTS - Simple and Reliable
        const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(term)}&tl=ko&client=tw-ob`;
        return {
            audios: [{
                url: `${KOREAN_SERVICE_BASE}/korean-audio?url=${encodeURIComponent(googleTtsUrl)}`,
                text: term,
                accent: 'kr',
                label: '🔊 Korean Audio',
                quality: 'good',
                priority: 1
            }]
        };
        
    } catch (error) {
        console.error('Korean audio error:', error);
        
        // Emergency fallback - Google TTS via proxy
        const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(term)}&tl=ko&client=tw-ob`;
        return {
            audios: [{
                url: `${KOREAN_SERVICE_BASE}/korean-audio?url=${encodeURIComponent(googleTtsUrl)}`,
                accent: 'kr',
                label: '🔊 GOOGLE TTS (Fallback)',
                quality: 'good',
                warning: 'Using fallback TTS service'
            }]
        };
    }
}

// Download and save audio - Updated for blob handling
async function downloadAndSaveAudio(app, audioData, fileName) {
    try {
        let arrayBuffer;
        
        // Handle different input types
        if (audioData instanceof Blob) {
            arrayBuffer = await audioData.arrayBuffer();
        } else if (typeof audioData === 'string' && audioData.startsWith('blob:')) {
            // Convert blob URL to array buffer
            const response = await fetch(audioData);
            arrayBuffer = await response.arrayBuffer();
        } else if (typeof audioData === 'string') {
            // Regular URL
            const response = await fetch(audioData);
            arrayBuffer = await response.arrayBuffer();
        } else {
            throw new Error('Unsupported audio data type');
        }
        
        const audioFolder = 'Audio';
        let folder = app.vault.getAbstractFileByPath(audioFolder);
        if (!folder) {
            await app.vault.createFolder(audioFolder);
        }
        
        // Ensure safe filename
        const safeFileName = fileName.replace(/[^a-zA-Z0-9ㄱ-ㅎㅏ-ㅣ가-힣._-]/g, "_");
        const filePath = `${audioFolder}/${safeFileName}`;
        
        // Check if file exists, overwrite if needed
        const existingFile = app.vault.getAbstractFileByPath(filePath);
        if (existingFile) {
            await app.vault.modifyBinary(existingFile, arrayBuffer);
        } else {
            await app.vault.createBinary(filePath, arrayBuffer);
        }
        
        return filePath;
    } catch (error) {
        console.error('Failed to download audio:', error);
        return null;
    }
}

class DictionaryView extends ItemView {
    constructor(leaf, plugin) {
        super(leaf);
        this.plugin = plugin;
        this.isLookingUp = false;
        this.aiService = new AIService(this.app);
    }

    getViewType() {
        return DICTIONARY_VIEW_TYPE;
    }

    getDisplayText() {
        return 'Từ điển Hàn Việt 💕';
    }

    getIcon() {
        return 'book-open';
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass('korean-dictionary-view');

        // Cute header with hearts
        const header = container.createEl('h2');
        header.innerHTML = '💕 Từ điển Hàn Việt  💕';

        // Content wrapper with kawaii styling
        const content = container.createDiv('dictionary-view-content');

        // Input section with adorable styling
        const inputSection = content.createDiv('lookup-input');
        
        this.inputBox = inputSection.createEl('input', {
            type: 'text',
            cls: 'lookup-term-input',
            placeholder: '💖 Nhập từ tiếng Hàn mà em muốn học...'
        });

        const lookupBtn = inputSection.createEl('button', {
            cls: 'lookup-btn',
            text: '🌸 Tra từ nào'
        });

        // Result container
        this.resultContainer = content.createDiv('result-container');
        this.showWelcomeMessage();

        // Event listeners
        this.inputBox.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleLookup();
            }
        });

        lookupBtn.addEventListener('click', () => {
            this.handleLookup();
        });
    }

    showWelcomeMessage() {
        this.resultContainer.innerHTML = `
            <div class="welcome-message">
                <div class="cute-animation">✨🌸💕🌸✨</div>
                <h3>💖 Xin chào em yêu! 💖</h3>
                <p>Hãy nhập từ tiếng Hàn để bắt đầu hành trình học tập thú vị nhé! 🥰</p>
                <div class="features">
                    <div class="feature-item">
                        <div class="feature-icon">🎵</div>
                        <div class="feature-text">Phát âm Google TTS chất lượng</div>
                    </div>
                    <div class="feature-item">
                        <div class="feature-icon">🤖</div>
                        <div class="feature-text">AI phân tích từ vựng thông minh</div>
                    </div>
                    <div class="feature-item">
                        <div class="feature-icon">🇰🇷</div>
                        <div class="feature-text">Hanja, kính ngữ & TOPIK level</div>
                    </div>
                    <div class="feature-item">
                        <div class="feature-icon">🃏</div>
                        <div class="feature-text">Xuất flashcard Anki </div>
                    </div>
                    <div class="feature-item">
                        <div class="feature-icon">💾</div>
                        <div class="feature-text">Save MP3 & markdown notes</div>
                    </div>
                    <div class="feature-item">
                        <div class="feature-icon">⚡</div>
                        <div class="feature-text">Groq AI (GPT-120B)</div>
                    </div>
                </div>
                <div class="tip-section">
                    <p><kbd>Alt + A</kbd> để tra từ đã chọn • <kbd>Enter</kbd> để tìm kiếm </p>
                    <div class="welcome-stats" id="welcome-stats">
                        <div class="stat-item">
                            <span class="stat-icon">📚</span>
                            <span class="stat-text">Đang kiểm tra hệ thống...</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // ✨ UX Enhancement: Show system status on welcome
        this.checkSystemStatus();
    }

    async checkSystemStatus() {
        const statsElement = document.getElementById('welcome-stats');
        if (!statsElement) return;
        
        let stats = [];
        
        // Check API keys
        const hasGroqKey = this.plugin.settings.llmkey && this.plugin.settings.llmkey.trim() !== '';
        const hasHfKey = this.plugin.settings.hfkey && this.plugin.settings.hfkey.trim() !== '';
        
        if (hasGroqKey && hasHfKey) {
            stats.push(`<span class="stat-success">✅ AI Ready (Groq + HF)</span>`);
        } else if (hasGroqKey) {
            stats.push(`<span class="stat-warning">⚠️ AI Ready (Groq only)</span>`);
        } else if (hasHfKey) {
            stats.push(`<span class="stat-warning">⚠️ AI Ready (HF only)</span>`);
        } else {
            stats.push(`<span class="stat-error">❌ Cần API key</span>`);
        }
        
        // Check Anki connection
        try {
            const ankiConnected = await checkAnkiConnection();
            if (ankiConnected) {
                const [decks, noteTypes] = await Promise.all([getAnkiDecks(), getAnkiNoteTypes()]);
                stats.push(`<span class="stat-success">✅ Anki (${decks.length} decks)</span>`);
            } else {
                stats.push(`<span class="stat-warning">⚠️ Anki offline</span>`);
            }
        } catch (e) {
            stats.push(`<span class="stat-error">❌ Anki error</span>`);
        }
        
        // Check TTS service
        try {
            const ttsResponse = await fetch(`${KOREAN_SERVICE_BASE}/health`, { 
                method: 'GET',
                signal: AbortSignal.timeout(2000)
            });
            if (ttsResponse.ok) {
                stats.push(`<span class="stat-success">✅ TTS Service</span>`);
            } else {
                stats.push(`<span class="stat-warning">⚠️ TTS offline</span>`);
            }
        } catch (e) {
            stats.push(`<span class="stat-warning">⚠️ TTS offline</span>`);
        }
        
        // Update stats display
        if (stats.length > 0) {
            statsElement.innerHTML = `
                <div class="stat-item">
                    <span class="stat-icon">📊</span>
                    <span class="stat-text">System: ${stats.join(' • ')}</span>
                </div>
            `;
        }
    }

    async handleLookup() {
        const term = this.inputBox.value.trim();
        if (!term) {
            new Notice('💕 Em chưa nhập từ nào cả!');
            return;
        }

        if (this.isLookingUp) {
            new Notice('⏳ Đang tra từ, chờ chút nhé em...');
            return;
        }

        await this.lookupWord(term);
    }

    async lookupWord(term) {
        if (this.isLookingUp) return;
        
        this.isLookingUp = true;
        this.showLoading();

        try {
            // Get dictionary result from AI
            const apiKey = this.plugin.settings.llmkey;
            const hfKey = this.plugin.settings.hfkey;
            
            console.log("🔍 Debug - API Keys:", {
                groqKey: apiKey ? `${apiKey.substring(0, 8)}...` : 'empty',
                hfKey: hfKey ? `${hfKey.substring(0, 8)}...` : 'empty',
                groqLength: apiKey?.length || 0,
                hfLength: hfKey?.length || 0
            });
            
            // Check if both keys are empty or undefined
            const hasGroqKey = apiKey && apiKey.trim() !== '';
            const hasHfKey = hfKey && hfKey.trim() !== '';
            
            if (!hasGroqKey && !hasHfKey) {
                // Fallback: basic Korean dictionary lookup without AI
                console.log("🎯 No API keys, using basic fallback...");
                const basicResult = {
                    Term: term,
                    Type: "Unknown",
                    Definition: `Korean word: ${term}`,
                    Vietnamese: `Từ tiếng Hàn: ${term} (cần API key để có định nghĩa chi tiết)`,
                    Romanization: "",
                    Examples: [],
                    Synonyms: [],
                    Antonyms: [],
                    HanjaOrigin: "",
                    Honorifics: [],
                    TopikLevel: "",
                    Usage: "Vui lòng cấu hình Groq hoặc Hugging Face API key để có định nghĩa đầy đủ",
                    CommonMistakes: ""
                };
                
                // Get Korean audio anyway
                let koreanAudio = {};
                try {
                    const ttsEngine = this.plugin.settings.ttsEngine || 'google';
                    koreanAudio = await getKoreanAudio(term.trim(), ttsEngine);
                } catch (e) {
                    console.log("Korean audio error:", e);
                }
                
                this.displayResult(basicResult, koreanAudio);
                await this.saveHistoryTerm(term.trim());
                return;
            }

            console.log("Looking up term:", term);
            console.log("Has Groq key:", hasGroqKey, "Has HF key:", hasHfKey);
            const result = await this.aiService.lookupWord(apiKey, hfKey, term, '', 'Vietnamese');
            console.log("AI result:", result);
            
            // Get Korean audio with user's TTS engine preference
            let koreanAudio = {};
            try {
                const ttsEngine = this.plugin.settings.ttsEngine || 'google';
                koreanAudio = await getKoreanAudio(term.trim(), ttsEngine);
                console.log("Korean audio:", koreanAudio);
            } catch (e) {
                console.log("Korean audio error:", e);
            }

            if (result && result.Term) {
                this.displayResult(result, koreanAudio);
                await this.saveHistoryTerm(term.trim());
            } else {
                this.showError("💔 Không tìm thấy từ này, em thử từ khác nhé!");
            }
        } catch (error) {
            console.error("Lookup error:", error);
            this.showError("💔 Có lỗi xảy ra: " + error.message);
        } finally {
            this.isLookingUp = false;
        }
    }

    showLoading() {
        this.resultContainer.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <div class="loading-text">✨ Đang tìm kiếm cho bạn yêu... ✨</div>
                <div class="cute-loading">
                    <div class="loading-dots">
                        <span>💕</span><span>🌸</span><span>💕</span>
                    </div>
                </div>
                <div class="loading-tips">
                    <p>Đang sử dụng AI để phân tích từ vựng...</p>
                </div>
            </div>
        `;
    }

    displayResult(result, koreanAudio = {}) {
        this.resultContainer.innerHTML = '';
        
        // Add cute decoration at top
        const decoration = this.resultContainer.createDiv();
        decoration.innerHTML = '💕✨🌸✨💕';
        decoration.style.cssText = `
            text-align: center;
            font-size: 1.5em;
            margin-bottom: 16px;
            opacity: 0.7;
            animation: pulse 2s infinite;
        `;
        
        // Prepare audio HTML for Simple TTS Service - Clean Single Button
        let audioHtml = [];
        if (koreanAudio.audios && Array.isArray(koreanAudio.audios) && koreanAudio.audios.length > 0) {
            const audio = koreanAudio.audios[0]; // Use only the selected TTS engine
            const fileName = generateAudioFileName(result.Term, audio, 0);
            const localPath = `Audio/${fileName}`;
            
            // Single clean audio button
            let btnClass = 'audio-btn';
            let icon = '🔊';
            
            if (audio.label.includes('Korean')) {
                btnClass = 'audio-btn korean-audio';
                icon = '�';
            }
            
            audioHtml.push(`
                <button class="audio-btn" 
                        data-audio-local="${localPath}" 
                        data-audio-url="${audio.url}" 
                        data-voice="${audio.accent || 'kr'}"
                        data-method="${audio.method || 'GET'}">
                    🔊 Nghe
                </button>
            `);
        } else {
            audioHtml.push(`
                <button class="audio-btn" disabled>
                    🔇 Không có âm thanh
                </button>
            `);
        }

        // Generate balanced Korean result display
        const resultHTML = `
            <div class="korean-result fade-in">
                <div class="korean-word-container">
                    <div class="korean-word">${result.Term}</div>
                    <div class="korean-word-audio">
                        ${audioHtml.length > 0 ? audioHtml[0] : ''}
                    </div>
                </div>
                ${result.Romanization ? `<div class="romanization">${result.Romanization}</div>` : ''}
                ${result.Type ? `<div class="part-of-speech">${result.Type}</div>` : ''}
                
                ${result.Definition ? `<div class="korean-definition">${result.Definition}</div>` : ''}
                ${result.Vietnamese ? `<div class="vietnamese-definition">${result.Vietnamese}</div>` : ''}
                
                ${this.generateFields(result)}
                
                <div class="action-buttons">
                    <button class="save-note-btn">
                        <span class="btn-icon">�</span>
                        <span class="btn-text">Lưu ghi chú</span>
                    </button>
                    <div class="anki-button-container">
                        <button class="export-anki-btn" id="export-anki-btn">
                            <span class="btn-icon">🌸</span>
                            <span class="btn-text">Kiểm tra Anki...</span>
                            <span class="btn-sparkle">🎀</span>
                        </button>
                        <div class="anki-status-info" id="anki-status-info" style="display: none;">
                            <div class="anki-status-text"></div>
                            <div class="anki-help-link">
                                <a href="#" onclick="window.open('https://apps.ankiweb.net/', '_blank')">💡 Tải Anki</a> • 
                                <a href="#" onclick="window.open('https://ankiweb.net/shared/info/2055492159', '_blank')">🔌 AnkiConnect</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.resultContainer.innerHTML += resultHTML;
        
        // Bind event listeners
        this.bindAudioButtons();
        this.bindActionEvents(result, koreanAudio);
        
        // ✨ UX Enhancement: Smart Anki Status Check
        this.checkAndUpdateAnkiStatus(result, koreanAudio);
    }

    generateAudioSection(koreanAudio, result) {
        let audioHtml = [];
        if (koreanAudio.audios && Array.isArray(koreanAudio.audios) && koreanAudio.audios.length > 0) {
            const audio = koreanAudio.audios[0]; // Use first available audio
            const fileName = generateAudioFileName(result.Term, audio, 0);
            const localPath = `Audio/${fileName}`;
            
            audioHtml.push(`
                <button class="audio-btn" 
                        data-audio-local="${localPath}" 
                        data-audio-url="${audio.url}" 
                        data-voice="${audio.accent || 'kr'}"
                        data-method="${audio.method || 'GET'}">
                    🔊 Korean Audio
                </button>
            `);
        } else {
            audioHtml.push(`
                <button class="audio-btn" disabled>
                    🔇 No Audio Available
                </button>
            `);
        }
        
        return `
            <div class="audio-container">
                ${audioHtml.join('')}
            </div>
        `;
    }

    generateFields(result) {
        let html = '';

        // Ví dụ - chỉ hiển thị khi có
        if (result.Examples && result.Examples.length > 0) {
            const examplesHTML = result.Examples.map(example => {
                if (typeof example === 'object' && example.korean && example.vietnamese) {
                    // Định dạng mới: {korean: "...", vietnamese: "..."}
                    return `
                        <div class="example-item">
                            <div class="korean-example">${example.korean}</div>
                            <div class="vietnamese-example">→ ${example.vietnamese}</div>
                        </div>
                    `;
                } else {
                    // Định dạng cũ: chỉ có string
                    return `<div class="example-item"><div class="korean-example">${example}</div></div>`;
                }
            }).join('');

            html += `
                <div class="field-container">
                    <div class="field-label">💬 Ví dụ</div>
                    <div class="field-content examples-container">
                        ${examplesHTML}
                    </div>
                </div>
            `;
        }

        // Từ đồng nghĩa - chỉ hiển thị khi có
        console.log("Synonyms data:", result.Synonyms, "Length:", result.Synonyms?.length);
        console.log("Synonyms detailed:", JSON.stringify(result.Synonyms));
        if (result.Synonyms && result.Synonyms.length > 0) {
            // Check if any item is not empty
            const validSynonyms = result.Synonyms.filter(s => s && s.trim() !== '');
            console.log("Valid synonyms:", validSynonyms);
            if (validSynonyms.length > 0) {
                const synonymsHTML = `
                    <div class="synonyms">
                        <div class="field-label">💖 Từ đồng nghĩa</div>
                        <div class="field-content korean-text">
                            ${validSynonyms.join(' • ')}
                        </div>
                    </div>
                `;
                console.log("Adding synonyms HTML:", synonymsHTML);
                html += synonymsHTML;
            }
        }

        // Từ trái nghĩa - chỉ hiển thị khi có
        console.log("Antonyms data:", result.Antonyms, "Length:", result.Antonyms?.length);
        console.log("Antonyms detailed:", JSON.stringify(result.Antonyms));
        if (result.Antonyms && result.Antonyms.length > 0) {
            const validAntonyms = result.Antonyms.filter(a => a && a.trim() !== '');
            console.log("Valid antonyms:", validAntonyms);
            if (validAntonyms.length > 0) {
                const antonymsHTML = `
                    <div class="antonyms">
                        <div class="field-label">💔 Từ trái nghĩa</div>
                        <div class="field-content korean-text">
                            ${validAntonyms.join(' • ')}
                        </div>
                    </div>
                `;
                console.log("Adding antonyms HTML:", antonymsHTML);
                html += antonymsHTML;
            }
        }

        // Hanja Origin - chỉ hiển thị khi có
        console.log("HanjaOrigin data:", result.HanjaOrigin);
        if (result.HanjaOrigin && result.HanjaOrigin.trim() !== '') {
            html += `
                <div class="field-container">
                    <div class="field-label">📜 Hanja Origin</div>
                    <div class="field-content">
                        ${result.HanjaOrigin}
                    </div>
                </div>
            `;
        }

        // Kính ngữ - chỉ hiển thị khi có
        console.log("Honorifics data:", result.Honorifics, "Length:", result.Honorifics?.length);
        console.log("Honorifics detailed:", JSON.stringify(result.Honorifics));
        if (result.Honorifics && result.Honorifics.length > 0) {
            const validHonorifics = result.Honorifics.filter(h => h && h.trim() !== '');
            console.log("Valid honorifics:", validHonorifics);
            if (validHonorifics.length > 0) {
                html += `
                    <div class="honorific">
                        <div class="field-label">🙏 Kính ngữ</div>
                        <div class="field-content korean-text">
                            ${validHonorifics.join(' • ')}
                        </div>
                    </div>
                `;
            }
        }

        // TOPIK Level - chỉ hiển thị khi có
        if (result.TopikLevel && result.TopikLevel.trim() !== '') {
            html += `
                <div class="field-container">
                    <div class="field-label">📊 TOPIK Level</div>
                    <div class="field-content">
                        Level ${result.TopikLevel}
                    </div>
                </div>
            `;
        }

        // Cách dùng (Usage) - cải thiện logic với fallback
        const usageText = result.Usage || 'Cần bổ sung thông tin về cách dùng.';
        if (usageText && typeof usageText === 'string' && usageText.trim() !== '' && 
            !usageText.includes('undefined') && !usageText.includes('null')) {
            html += `
                <div class="field-container">
                    <div class="field-label">📖 Cách dùng</div>
                    <div class="field-content">
                        ${usageText}
                    </div>
                </div>
            `;
        }

        // Common Mistakes - Lỗi phổ biến người Việt hay mắc với fallback
        const mistakesText = result.CommonMistakes || 'Cần bổ sung thông tin về lỗi phổ biến.';
        if (mistakesText && typeof mistakesText === 'string' && mistakesText.trim() !== '' && 
            !mistakesText.includes('undefined') && !mistakesText.includes('null')) {
            html += `
                <div class="field-container">
                    <div class="field-label">⚠️ Lỗi phổ biến</div>
                    <div class="field-content">
                        ${mistakesText}
                    </div>
                </div>
            `;
        }

        console.log("🔍 DEBUG - Usage:", result.Usage);
        console.log("🔍 DEBUG - CommonMistakes:", result.CommonMistakes);
        console.log("🔍 DEBUG - Final generated HTML:", html);
        return html;
    }

    async checkAndUpdateAnkiStatus(result, koreanAudio) {
        const ankiBtn = document.getElementById('export-anki-btn');
        const statusInfo = document.getElementById('anki-status-info');
        
        if (!ankiBtn || !statusInfo) return;
        
        // Show checking state
        ankiBtn.innerHTML = `
            <span class="btn-icon">⏳</span>
            <span class="btn-text">Kiểm tra Anki...</span>
            <span class="btn-sparkle">🔍</span>
        `;
        ankiBtn.disabled = true;
        
        try {
            // Check Anki connection
            const isConnected = await checkAnkiConnection();
            
            if (!isConnected) {
                // Anki not running
                ankiBtn.innerHTML = `
                    <span class="btn-icon">⚠️</span>
                    <span class="btn-text">Anki chưa chạy</span>
                    <span class="btn-sparkle">💫</span>
                `;
                statusInfo.style.display = 'block';
                statusInfo.querySelector('.anki-status-text').innerHTML = `
                    <div class="status-warning">
                        🚫 <strong>Anki chưa được khởi động</strong><br>
                        💡 Vui lòng mở Anki và cài đặt AnkiConnect addon
                    </div>
                `;
                ankiBtn.disabled = true;
                return;
            }
            
            // Check decks and note types
            const [decks, noteTypes] = await Promise.all([
                getAnkiDecks(),
                getAnkiNoteTypes()
            ]);
            
            if (decks.length === 0 || noteTypes.length === 0) {
                // Anki running but no decks/note types
                ankiBtn.innerHTML = `
                    <span class="btn-icon">⚠️</span>
                    <span class="btn-text">Cần setup Anki</span>
                    <span class="btn-sparkle">⚙️</span>
                `;
                statusInfo.style.display = 'block';
                statusInfo.querySelector('.anki-status-text').innerHTML = `
                    <div class="status-warning">
                        📋 <strong>Anki cần thiết lập</strong><br>
                        ${decks.length === 0 ? '• Chưa có deck nào' : ''}<br>
                        ${noteTypes.length === 0 ? '• Chưa có note type nào' : ''}<br>
                        💡 Hãy tạo deck và note type trong Anki
                    </div>
                `;
                ankiBtn.disabled = true;
                return;
            }
            
            // Everything OK - Enable export
            const koreanDecks = decks.filter(d => 
                d.toLowerCase().includes('korean') || 
                d.toLowerCase().includes('한국') ||
                d.toLowerCase().includes('korea')
            );
            
            const recommendedDeck = koreanDecks.length > 0 ? koreanDecks[0] : decks[0];
            
            ankiBtn.innerHTML = `
                <span class="btn-icon">🌸</span>
                <span class="btn-text">Xuất sang Anki</span>
                <span class="btn-sparkle">✨</span>
            `;
            ankiBtn.disabled = false;
            statusInfo.style.display = 'block';
            statusInfo.querySelector('.anki-status-text').innerHTML = `
                <div class="status-success">
                    ✅ <strong>Anki sẵn sàng!</strong><br>
                    📚 ${decks.length} deck(s) • 📝 ${noteTypes.length} note type(s)<br>
                    🎯 Đề xuất: <code>${recommendedDeck}</code>
                </div>
            `;
            
            // Auto-hide success message after 3 seconds
            setTimeout(() => {
                if (statusInfo && statusInfo.querySelector('.status-success')) {
                    statusInfo.style.display = 'none';
                }
            }, 3000);
            
        } catch (error) {
            console.error('Anki status check failed:', error);
            ankiBtn.innerHTML = `
                <span class="btn-icon">❌</span>
                <span class="btn-text">Lỗi kết nối</span>
                <span class="btn-sparkle">🔄</span>
            `;
            statusInfo.style.display = 'block';
            statusInfo.querySelector('.anki-status-text').innerHTML = `
                <div class="status-error">
                    ❌ <strong>Lỗi kết nối Anki</strong><br>
                    🔧 ${error.message}<br>
                    💡 Kiểm tra Anki và AnkiConnect addon
                </div>
            `;
            ankiBtn.disabled = true;
        }
    }

    bindAudioButtons() {
        // Logic tương tự bản English: auto lưu file khi phát audio
        const btns = this.resultContainer.querySelectorAll('.audio-btn');
        btns.forEach(btn => {
            btn.addEventListener('click', async () => {
                const url = btn.getAttribute('data-audio-url');
                const local = btn.getAttribute('data-audio-local');
                const method = btn.getAttribute('data-method') || 'GET';
                
                if (!url) {
                    new Notice('❌ Không có link audio cho từ này.');
                    return;
                }
                
                // Auto download file nếu chưa có - như bản English
                let file = this.app.vault.getAbstractFileByPath(local);
                if (!file) {
                    console.log('⬇️ Downloading audio:', local);
                    
                    try {
                        let audioData;
                        if (method === 'POST') {
                            // For Korean TTS
                            const text = btn.closest('.korean-result').querySelector('.korean-word').textContent;
                            const response = await fetch(url, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ text: text })
                            });
                            audioData = await response.blob();
                        } else {
                            // For Google TTS
                            const response = await fetch(url);
                            audioData = await response.blob();
                        }
                        
                        await downloadAndSaveAudio(this.app, audioData, local.replace('Audio/', ''));
                        file = this.app.vault.getAbstractFileByPath(local);
                    } catch (error) {
                        console.error('Download audio error:', error);
                        new Notice('❌ Lỗi tải audio: ' + error.message);
                        return;
                    }
                }
                
                // Phát local, fallback online - như bản English
                setTimeout(() => {
                    const audio = document.createElement('audio');
                    audio.src = local;
                    audio.play().catch(() => {
                        console.log('Local audio failed, trying online...');
                        if (method === 'POST') {
                            new Notice('� Audio đã được lưu vào thư mục Audio/');
                        } else {
                            audio.src = url;
                            audio.play();
                        }
                    });
                }, 300);
            });
        });
    }

    bindActionEvents(result, koreanAudio) {
        const saveBtn = this.resultContainer.querySelector('.save-note-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                try {
                    await this.saveToNote(result, koreanAudio);
                    new Notice('💕 Đã lưu từ vựng thành công!');
                    saveBtn.innerHTML = `
                        <span class="btn-icon">✅</span>
                        <span class="btn-text">Đã lưu</span>
                        <span class="btn-sparkle">💖</span>
                    `;
                    setTimeout(() => {
                        saveBtn.innerHTML = `
                            <span class="btn-icon">�</span>
                            <span class="btn-text">Lưu ghi chú</span>
                            <span class="btn-sparkle">✨</span>
                        `;
                    }, 2000);
                } catch (e) {
                    new Notice(`💔 Lỗi khi lưu: ${e.message}`);
                }
            });
        }

        const ankiBtn = this.resultContainer.querySelector('.export-anki-btn');
        if (ankiBtn) {
            ankiBtn.addEventListener('click', async () => {
                // Only proceed if button is enabled (Anki is ready)
                if (ankiBtn.disabled) {
                    new Notice('🤔 Anki chưa sẵn sàng. Vui lòng kiểm tra kết nối!');
                    return;
                }
                
                try {
                    // ✨ UX Enhancement: Double-check Anki before proceeding
                    const isStillConnected = await checkAnkiConnection();
                    if (!isStillConnected) {
                        new Notice('⚠️ Mất kết nối Anki! Vui lòng kiểm tra lại.');
                        await this.checkAndUpdateAnkiStatus(result, koreanAudio);
                        return;
                    }
                    // 1. Lấy note đang mở trong Korean hoặc note của từ cuối tra cứu
                    let noteFile = null;
                    const safeTerm = result.Term.replace(/[^a-zA-Z0-9ㄱ-ㅎㅏ-ㅣ가-힣]/g, "_");
                    let notePath = `Korean_Vocabulary/${safeTerm}.md`;
                    noteFile = this.app.vault.getAbstractFileByPath(notePath);
                    let noteContent = '';
                    
                    if (noteFile) {
                        noteContent = await this.app.vault.read(noteFile);
                    } else {
                        // Nếu chưa có note, tạo từ result hiện tại
                        noteContent = this.generateNoteContent(result, koreanAudio);
                    }

                    // 2. Lấy file audio đã lưu
                    const audioLinks = this.getAudioLinks(koreanAudio, result);

                    // 3. Hiện popup xác nhận, chọn deck/note type, mapping trường
                    new AnkiExportModal(this.app, {
                        term: result.Term,
                        noteContent,
                        audioLinks,
                        onSync: async (deck, noteType, fieldMap) => {
                            // 4. Kiểm tra trùng lặp
                            const exists = await checkAnkiDuplicate(result.Term, deck, noteType, fieldMap);
                            if (exists) {
                                const overwrite = await confirmOverwrite();
                                if (!overwrite) return;
                            }

                            // Show loading state
                            ankiBtn.innerHTML = `
                                <span class="btn-icon">⏳</span>
                                <span class="btn-text">Đang xuất...</span>
                                <span class="btn-sparkle">🎀</span>
                            `;

                            // 5. Sync sang Anki
                            const syncResult = await syncToAnki(this.app, result, noteContent, audioLinks, deck, noteType, fieldMap);
                            if (syncResult.success) {
                                // 6. Đánh dấu note đã sync
                                await markNoteSynced(this.app, notePath);
                                new Notice('✨ Đã xuất sang Anki thành công! 🌸');
                                ankiBtn.innerHTML = `
                                    <span class="btn-icon">✅</span>
                                    <span class="btn-text">Đã xuất</span>
                                    <span class="btn-sparkle">🌟</span>
                                `;
                            } else {
                                new Notice('❌ Lỗi xuất Anki: ' + syncResult.error);
                                ankiBtn.innerHTML = `
                                    <span class="btn-icon">🌸</span>
                                    <span class="btn-text">Xuất Anki</span>
                                    <span class="btn-sparkle">🎀</span>
                                `;
                            }
                        }
                    }).open();
                } catch (e) {
                    new Notice('❌ Lỗi xuất Anki: ' + e.message);
                    ankiBtn.innerHTML = `
                        <span class="btn-icon">🌸</span>
                        <span class="btn-text">Xuất Anki</span>
                        <span class="btn-sparkle">🎀</span>
                    `;
                }
            });
        }
    }

    // Logic Save to Note như bản English
    async updateNoteWithAudio(result, audioLinks) {
        // Tạo lại toàn bộ nội dung note, nhúng đúng tên file audio
        const safeTerm = result.Term.replace(/[^a-zA-Z0-9ㄱ-ㅎㅏ-ㅣ가-힣]/g, "_");
        const notePath = `Korean_Vocabulary/${safeTerm}.md`;
        
        let noteContent = `# ${result.Term}\n\n`;
        noteContent += `**Term:** ${result.Term || ''}\n`;
        noteContent += `**Type:** ${result.Type || ''}\n\n`;
        noteContent += `**Romanization:** ${result.Romanization || ''}\n\n`;
        
        if (audioLinks.length > 0) noteContent += audioLinks.join("\n") + "\n\n";
        
        noteContent += `**Definition:**\n${result.Definition || ''}\n\n`;
        noteContent += `**Vietnamese:**\n${result.Vietnamese || ''}\n\n`;
        
        if (result.Examples && result.Examples.length > 0) {
            noteContent += `**Examples:**\n`;
            result.Examples.forEach(ex => {
                if (typeof ex === 'object' && ex.korean && ex.vietnamese) {
                    noteContent += `- ${ex.korean} → ${ex.vietnamese}\n`;
                } else {
                    noteContent += `- ${ex}\n`;
                }
            });
            noteContent += `\n`;
        }
        
        if (result.Synonyms && result.Synonyms.length > 0) {
            noteContent += `**Synonyms:** ${result.Synonyms.join(', ')}\n`;
        }
        if (result.Antonyms && result.Antonyms.length > 0) {
            noteContent += `**Antonyms:** ${result.Antonyms.join(', ')}\n`;
        }
        
        // Korean specific fields
        if (result.HanjaOrigin && result.HanjaOrigin.length > 0) {
            noteContent += `**HanjaOrigin:**\n`;
            
            // Handle both string and array formats
            if (typeof result.HanjaOrigin === 'string') {
                noteContent += `- ${result.HanjaOrigin}\n`;
            } else if (Array.isArray(result.HanjaOrigin)) {
                result.HanjaOrigin.forEach(item => {
                    if (typeof item === 'string') {
                        noteContent += `- ${item}\n`;
                    } else if (item && item.hanja) {
                        noteContent += `- ${item.hanja}: ${item.meaning || ''}\n`;
                    }
                });
            }
            noteContent += `\n`;
        }
        
        if (result.Honorifics && result.Honorifics.length > 0) {
            noteContent += `**Honorifics:**\n`;
            result.Honorifics.forEach(item => {
                if (typeof item === 'string') {
                    noteContent += `- ${item}\n`;
                } else if (item && item.form) {
                    noteContent += `- ${item.form}: ${item.usage || ''}\n`;
                }
            });
            noteContent += `\n`;
        }
        
        if (result.RelatedWords && result.RelatedWords.length > 0) {
            noteContent += `**RelatedWords:**\n`;
            result.RelatedWords.forEach(item => {
                if (typeof item === 'string') {
                    noteContent += `- ${item}\n`;
                } else if (item && item.word) {
                    noteContent += `- ${item.word}: ${item.relation || ''}\n`;
                }
            });
            noteContent += `\n`;
        }
        
        if (result.GrammarNotes && result.GrammarNotes.trim() !== '') {
            noteContent += `**GrammarNotes:**\n${result.GrammarNotes}\n\n`;
        }
        
        // ===== FIX: Thêm Usage và CommonMistakes =====
        if (result.Usage && result.Usage.trim() !== '' && 
            !result.Usage.includes('undefined') && !result.Usage.includes('null')) {
            noteContent += `**Usage Notes:**\n${result.Usage}\n\n`;
        }
        
        if (result.CommonMistakes && result.CommonMistakes.trim() !== '' && 
            !result.CommonMistakes.includes('undefined') && !result.CommonMistakes.includes('null')) {
            noteContent += `**Common Mistakes:**\n${result.CommonMistakes}\n\n`;
        }
        
        if (result.TopikLevel && result.TopikLevel.trim() !== '') {
            noteContent += `**TOPIK Level:** ${result.TopikLevel}\n\n`;
        }
        
        // Lưu file note (nếu đã tồn tại thì ghi đè)
        const noteFile = this.app.vault.getAbstractFileByPath(notePath);
        if (noteFile) {
            await this.app.vault.modify(noteFile, noteContent);
        } else {
            await this.app.vault.create(notePath, noteContent);
        }
    }

    async saveToNote(result, koreanAudio) {
        try {
            // Đảm bảo thư mục Korean_Vocabulary tồn tại
            const vocabFolder = 'Korean_Vocabulary';
            let folder = this.app.vault.getAbstractFileByPath(vocabFolder);
            if (!folder) await this.app.vault.createFolder(vocabFolder);
            
            // ===== FIX: Auto-download audio when saving note =====
            let audioLinks = [];
            
            // Nếu có audio data, tự động download và tạo links
            if (koreanAudio && koreanAudio.audios && koreanAudio.audios.length > 0) {
                for (let i = 0; i < koreanAudio.audios.length; i++) {
                    const audio = koreanAudio.audios[i];
                    try {
                        // Download audio automatically
                        const response = await fetch(audio.url);
                        if (response.ok) {
                            const audioBlob = await response.blob();
                            const fileName = generateAudioFileName(result.Term, audio, i);
                            const filePath = await downloadAndSaveAudio(this.app, audioBlob, fileName);
                            
                            if (filePath) {
                                const displayLabel = audio.label || `🔊 Korean Audio ${i + 1}`;
                                audioLinks.push(`**Audio:** ![[${filePath}]] *${displayLabel}*`);
                                console.log(`✅ Auto-downloaded audio: ${filePath}`);
                            }
                        }
                    } catch (audioError) {
                        console.error(`❌ Failed to auto-download audio ${i}:`, audioError);
                        // Continue with other audio files
                    }
                }
            }
            
            // Nếu không có audio nào được download, tạo placeholder
            if (audioLinks.length === 0) {
                console.log('🔊 No audio downloaded, adding placeholder');
                audioLinks.push('**Audio:** *Audio will be downloaded when you click the play button*');
            }
            
            // Cập nhật note với audio links
            await this.updateNoteWithAudio(result, audioLinks);
            
            // Show success message
            new Notice('💕 Đã lưu ghi chú thành công!');
            
        } catch (error) {
            console.error('❌ Save note error:', error);
            new Notice('😔 Lỗi khi lưu ghi chú: ' + error.message);
            throw error;
        }
    }

    showError(message) {
        this.resultContainer.innerHTML = `
            <div class="error">
                ${message}
            </div>
        `;
    }

    async saveHistoryTerm(term) {
        try {
            if (!term || term.trim() === '') return;
            
            // Load existing history
            let history = [];
            const historyFile = this.app.vault.getAbstractFileByPath('korean_history.json');
            if (historyFile) {
                const content = await this.app.vault.read(historyFile);
                history = JSON.parse(content);
            }
            
            // Add new term (remove if exists, then add to front)
            history = history.filter(h => h.term !== term);
            history.unshift({
                term: term,
                timestamp: Date.now(),
                date: new Date().toISOString()
            });
            
            // Keep only last 50 terms
            if (history.length > 50) {
                history = history.slice(0, 50);
            }
            
            // Save back to file
            if (historyFile) {
                await this.app.vault.modify(historyFile, JSON.stringify(history, null, 2));
            } else {
                await this.app.vault.create('korean_history.json', JSON.stringify(history, null, 2));
            }
            
        } catch (error) {
            console.error('Failed to save history:', error);
        }
    }

    // Tạo link audio từ Korean audio data - logic như bản English
    getAudioLinks(koreanAudio, result) {
        if (!koreanAudio || !koreanAudio.audios || !Array.isArray(koreanAudio.audios) || koreanAudio.audios.length === 0) {
            return [];
        }

        const audioLinks = [];
        // Tương tự English: lấy audio đã lưu trong Audio folder
        koreanAudio.audios.forEach((audio, index) => {
            const fileName = generateAudioFileName(result.Term, audio, index);
            const localPath = `Audio/${fileName}`;
            audioLinks.push(`**Audio:** [[${localPath}]]\n<audio controls src="${localPath}"></audio>`);
        });

        return audioLinks;
    }

    // Tạo lại nội dung note cho Korean (dùng khi chưa có note file)
    generateNoteContent(result, koreanAudio) {
        const audioLinks = this.getAudioLinks(koreanAudio, result);
        let noteContent = `# ${result.Term} 🌸\n\n`;
        noteContent += `**한국어:** ${result.Term || ''}\n`;
        noteContent += `**품사:** ${result.Type || ''}\n\n`;
        noteContent += `**발음:** ${result.Romanization || ''}\n\n`;
        
        if (audioLinks.length > 0) noteContent += audioLinks.join("\n") + "\n\n";
        
        noteContent += `**정의:**\n${result.Definition || ''}\n\n`;
        noteContent += `**Tiếng Việt:**\n${result.Vietnamese || ''}\n\n`;
        
        if (result.Examples && result.Examples.length > 0) {
            noteContent += `**예문:**\n`;
            result.Examples.forEach(ex => {
                if (typeof ex === 'string') {
                    noteContent += `- ${ex}\n`;
                } else if (ex && ex.korean) {
                    noteContent += `- **${ex.korean}** → ${ex.vietnamese || ''}\n`;
                }
            });
            noteContent += `\n`;
        }
        
        if (result.Synonyms && result.Synonyms.length > 0) {
            noteContent += `**동의어:** ${result.Synonyms.join(', ')}\n`;
        }
        if (result.Antonyms && result.Antonyms.length > 0) {
            noteContent += `**반의어:** ${result.Antonyms.join(', ')}\n`;
        }
        
        if (result.HanjaOrigin && result.HanjaOrigin.length > 0) {
            noteContent += `**한자 어원:**\n`;
            
            // Handle both string and array formats
            if (typeof result.HanjaOrigin === 'string') {
                noteContent += `- ${result.HanjaOrigin}\n`;
            } else if (Array.isArray(result.HanjaOrigin)) {
                result.HanjaOrigin.forEach(item => {
                    if (typeof item === 'string') {
                        noteContent += `- ${item}\n`;
                    } else if (item && item.hanja) {
                        noteContent += `- ${item.hanja}: ${item.meaning || ''}\n`;
                    }
                });
            }
            noteContent += `\n`;
        }
        
        if (result.Honorifics && result.Honorifics.length > 0) {
            noteContent += `**경어:**\n`;
            result.Honorifics.forEach(item => {
                if (typeof item === 'string') {
                    noteContent += `- ${item}\n`;
                } else if (item && item.form) {
                    noteContent += `- ${item.form}: ${item.usage || ''}\n`;
                }
            });
            noteContent += `\n`;
        }
        
        if (result.TopikLevel) {
            noteContent += `**TOPIK Level:** ${result.TopikLevel}\n\n`;
        }
        
        // ===== FIX: Improved Usage và CommonMistakes handling =====
        if (result.Usage && typeof result.Usage === 'string' && result.Usage.trim() !== '' && 
            !result.Usage.includes('undefined') && !result.Usage.includes('null')) {
            noteContent += `**사용법 & 주의사항:**\n${result.Usage}\n\n`;
        }
        
        if (result.CommonMistakes && typeof result.CommonMistakes === 'string' && result.CommonMistakes.trim() !== '' && 
            !result.CommonMistakes.includes('undefined') && !result.CommonMistakes.includes('null')) {
            noteContent += `**흔한 실수:**\n${result.CommonMistakes}\n\n`;
        }
        
        // Debug logging để check data
        console.log("🔍 SAVE DEBUG - Original Usage:", result.Usage);
        console.log("🔍 SAVE DEBUG - Original CommonMistakes:", result.CommonMistakes);
        console.log("🔍 SAVE DEBUG - Full result object keys:", Object.keys(result));
        
        return noteContent;
    }

    async onClose() {
        // Clean up
    }
}

// AI Service for Korean Dictionary
class AIService {
    constructor(app) {
        this.app = app;
    }

    async lookupWord(apiKey, hfKey, term, context, targetLang) {
        const payload = {
            messages: [
                {
                    role: "system",
                    content: `Bạn là chuyên gia từ điển Hàn-Việt. Trả lời CHỈ bằng JSON hợp lệ với TẤT CẢ các trường này: "Term", "Type", "Definition", "Vietnamese", "Romanization", "Examples" (array), "Synonyms" (array), "Antonyms" (array), "HanjaOrigin" (string), "Honorifics" (array), "TopikLevel" (string), "Usage" (string), "CommonMistakes" (string).

QUY TẮC QUAN TRỌNG:
- Definition: PHẢI bằng tiếng Hàn
- Vietnamese: PHẢI bằng tiếng Việt
- Type: Loại từ bằng tiếng Hàn (명사, 동사, 형용사, 부사, 인사말...)
- Examples: Mỗi ví dụ là object {"korean": "câu tiếng Hàn", "vietnamese": "nghĩa tiếng Việt"}
- Usage: Giải thích cách dùng bằng tiếng Việt (KHÔNG ĐƯỢC BỎ TRỐNG)
- CommonMistakes: Lỗi phổ biến người Việt hay mắc khi dùng từ này (KHÔNG ĐƯỢC Bỏ TRỐNG)
- KHÔNG BAO GIỜ dùng tiếng Anh

LUÔN trả về TẤT CẢ các trường, không bỏ sót. Đặc biệt PHẢI có Usage và CommonMistakes với nội dung có ý nghĩa.

Ví dụ JSON mẫu:
{
  "Term": "안녕",
  "Type": "인사말",
  "Definition": "평안하다는 뜻으로 인사할 때 쓰는 말",
  "Vietnamese": "xin chào, tạm biệt (thân mật)",
  "Romanization": "annyeong",
  "Examples": [
    {"korean": "안녕, 다음에 봐요.", "vietnamese": "Chào bạn, hẹn gặp lại lần sau."},
    {"korean": "친구와 안녕하고 헤어졌다.", "vietnamese": "Tôi đã chào tạm biệt và chia tay với bạn."}
  ],
  "Synonyms": [],
  "Antonyms": [],
  "HanjaOrigin": "安寧",
  "Honorifics": ["안녕히 계세요", "안녕히 가세요"],
  "TopikLevel": "1",
  "Usage": "Lời chào thân mật dùng với bạn bè cùng tuổi hoặc người quen thân. Không nên dùng với người lớn tuổi hoặc trong tình huống trang trọng.",
  "CommonMistakes": "Người Việt hay nhầm lẫn với 안녕하세요, hoặc dùng sai ngữ cảnh với người lớn tuổi. Cần phân biệt rõ mức độ lịch sự."
}`
                },
                {
                    role: "user",
                    content: `Phân tích từ tiếng Hàn này và cung cấp định nghĩa tiếng Hàn + bản dịch tiếng Việt.

Từ: ${term}

QUAN TRỌNG - Bao gồm TẤT CẢ các trường sau:
- Term: "${term}" (dùng chính xác từ tiếng Hàn)
- Definition: Định nghĩa bằng tiếng Hàn
- Vietnamese: Bản dịch tiếng Việt
- Type: Loại từ bằng tiếng Hàn
- Romanization: Phiên âm La-tinh
- Examples: Ví dụ câu tiếng Hàn có từ "${term}" với nghĩa tiếng Việt
- Usage: Cách dùng và ngữ cảnh sử dụng (PHẢI CÓ, bằng tiếng Việt)
- CommonMistakes: Lỗi phổ biến người Việt hay mắc với từ "${term}" (PHẢI CÓ, bằng tiếng Việt)
- HanjaOrigin, Honorifics, TopikLevel, Synonyms, Antonyms

ĐẶC BIỆT: Usage và CommonMistakes KHÔNG ĐƯỢC để trống hoặc rỗng!

LUÔN trả về TẤT CẢ các trường theo cấu trúc JSON mẫu ở trên.`
                }
            ],
            model: "openai/gpt-oss-120b",
            temperature: 0.2,
            max_tokens: 2048,
            top_p: 1,
            stream: false,
            stop: null
        };

        // Check if we have any valid API keys
        const hasGroqKey = apiKey && apiKey.trim() !== '';
        const hasHfKey = hfKey && hfKey.trim() !== '';
        
        if (!hasGroqKey && !hasHfKey) {
            console.log("❌ No valid API keys provided");
            throw new Error("No API keys available");
        }

        try {
            let response;
            
            // Only try Groq if we have a valid key
            if (hasGroqKey) {
                console.log("🤖 Trying Groq API first...");
                response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${apiKey}`
                    },
                    body: JSON.stringify(payload)
                });
            } else {
                console.log("🤖 No Groq key, skipping to HF...");
                throw new Error("No Groq API key");
            }
            
            if (!response.ok) {
                console.log(`❌ Groq failed with status ${response.status}, trying Hugging Face...`);
                throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log("Groq API response:", data);
            
            if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
                throw new Error("No valid response from Groq API");
            }
            
            const aiContent = data.choices[0].message.content;
            console.log("AI content:", aiContent);
            
            let result = {};
            try {
                // Clean up common AI JSON formatting issues
                let cleanedContent = aiContent;
                
                // Remove any text before the JSON
                const jsonStart = cleanedContent.indexOf('{');
                if (jsonStart > 0) {
                    cleanedContent = cleanedContent.substring(jsonStart);
                }
                
                // Remove any text after the JSON
                const jsonEnd = cleanedContent.lastIndexOf('}');
                if (jsonEnd > 0) {
                    cleanedContent = cleanedContent.substring(0, jsonEnd + 1);
                }
                
                // Fix common JSON issues
                cleanedContent = cleanedContent
                    .replace(/\n/g, ' ')  // Remove newlines first
                    .replace(/\s+/g, ' ')  // Normalize whitespace
                    .trim();
                
                // Specific fix for Examples array issue
                cleanedContent = cleanedContent.replace(
                    /"Examples":\s*\[(.*?)\]\s*\]/g,
                    (match, content) => {
                        // Fix the nested array issue
                        const fixed = content.replace(/\]\s*\]$/, ']');
                        return `"Examples": [${fixed}]`;
                    }
                );
                
                // General cleanup
                cleanedContent = cleanedContent
                    .replace(/,(\s*[}\]])/g, '$1')  // Remove trailing commas
                    .replace(/\]\s*,\s*\]/g, ']]')  // Fix double array closing
                    .replace(/\}\s*,\s*\]/g, '}]')  // Fix object array closing
                    .replace(/,(\s*[}\]])/g, '$1')  // Double check trailing commas
                    .trim();
                
                console.log("Cleaned AI content:", cleanedContent);
                result = JSON.parse(cleanedContent);
                console.log("Successfully parsed AI result:", result);
                
            } catch (e) {
                console.error("JSON parse error:", e);
                console.error("AI content that failed to parse:", aiContent);
                
                // Try to extract JSON with regex as fallback
                try {
                    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        let extractedJSON = jsonMatch[0]
                            .replace(/,(\s*[}\]])/g, '$1')  // Remove trailing commas
                            .replace(/\n/g, ' ')
                            .replace(/\s+/g, ' ');
                        console.log("Trying extracted JSON:", extractedJSON);
                        result = JSON.parse(extractedJSON);
                        console.log("Successfully parsed extracted result:", result);
                    } else {
                        throw new Error("No JSON found in response");
                    }
                } catch (e2) {
                    console.error("Extraction also failed:", e2);
                    
                    // Last resort: manual parsing
                    try {
                        console.log("Attempting manual parsing...");
                        const manualResult = {
                            Term: term,
                            Type: '',
                            Definition: '',
                            Vietnamese: '',
                            Romanization: '',
                            Examples: [],
                            Synonyms: [],
                            Antonyms: [],
                            HanjaOrigin: '',
                            Honorifics: [],
                            TopikLevel: '',
                            Usage: '',
                            CommonMistakes: ''
                        };
                        
                        // Extract fields manually with regex
                        const termMatch = aiContent.match(/"Term":\s*"([^"]*)"/);
                        if (termMatch) manualResult.Term = termMatch[1];
                        
                        const typeMatch = aiContent.match(/"Type":\s*"([^"]*)"/);
                        if (typeMatch) manualResult.Type = typeMatch[1];
                        
                        const defMatch = aiContent.match(/"Definition":\s*"([^"]*)"/);
                        if (defMatch) manualResult.Definition = defMatch[1];
                        
                        const vietMatch = aiContent.match(/"Vietnamese":\s*"([^"]*)"/);
                        if (vietMatch) manualResult.Vietnamese = vietMatch[1];
                        
                        const romMatch = aiContent.match(/"Romanization":\s*"([^"]*)"/);
                        if (romMatch) manualResult.Romanization = romMatch[1];
                        
                        const synMatch = aiContent.match(/"Synonyms":\s*\[([^\]]*)\]/);
                        if (synMatch) {
                            manualResult.Synonyms = synMatch[1].split(',').map(s => s.trim().replace(/"/g, '')).filter(s => s);
                        }
                        
                        const antMatch = aiContent.match(/"Antonyms":\s*\[([^\]]*)\]/);
                        if (antMatch) {
                            manualResult.Antonyms = antMatch[1].split(',').map(s => s.trim().replace(/"/g, '')).filter(s => s);
                        }
                        
                        const hanjaMatch = aiContent.match(/"HanjaOrigin":\s*"([^"]*)"/);
                        if (hanjaMatch) manualResult.HanjaOrigin = hanjaMatch[1];
                        
                        const topikMatch = aiContent.match(/"TopikLevel":\s*"([^"]*)"/);
                        if (topikMatch) manualResult.TopikLevel = topikMatch[1];
                        
                        const usageMatch = aiContent.match(/"Usage":\s*"([^"]*?)"/);
                        if (usageMatch) manualResult.Usage = usageMatch[1];
                        
                        const mistakesMatch = aiContent.match(/"CommonMistakes":\s*"([^"]*?)"/);
                        if (mistakesMatch) manualResult.CommonMistakes = mistakesMatch[1];
                        
                        console.log("Manual parsing result:", manualResult);
                        result = manualResult;
                        
                    } catch (e3) {
                        console.error("Manual parsing also failed:", e3);
                        result = {
                            Term: term,
                            Type: '',
                            Definition: '',
                            Vietnamese: '',
                            Romanization: '',
                            Examples: [],
                            Synonyms: [],
                            Antonyms: [],
                            HanjaOrigin: '',
                            Honorifics: [],
                            TopikLevel: '',
                            Usage: '',
                            CommonMistakes: ''
                        };
                    }
                }
            }
            
            // Ensure all required fields với fallback values
            result.Term = result.Term || term;
            result.Type = result.Type || '';
            result.Romanization = result.Romanization || '';
            result.Definition = result.Definition || '';
            result.Vietnamese = result.Vietnamese || '';
            result.Examples = Array.isArray(result.Examples) ? result.Examples : [];
            result.Synonyms = Array.isArray(result.Synonyms) ? result.Synonyms : [];
            result.Antonyms = Array.isArray(result.Antonyms) ? result.Antonyms : [];
            result.HanjaOrigin = typeof result.HanjaOrigin === 'string' ? result.HanjaOrigin : '';
            result.Honorifics = Array.isArray(result.Honorifics) ? result.Honorifics : [];
            result.TopikLevel = typeof result.TopikLevel === 'string' ? result.TopikLevel : '';
            
            // Đảm bảo Usage và CommonMistakes luôn có giá trị hợp lệ
            result.Usage = (result.Usage && typeof result.Usage === 'string' && result.Usage.trim() !== '' && 
                           !result.Usage.includes('undefined') && !result.Usage.includes('null')) 
                           ? result.Usage : `Từ '${term}' cần bổ sung thông tin về cách dùng và ngữ cảnh.`;
                           
            result.CommonMistakes = (result.CommonMistakes && typeof result.CommonMistakes === 'string' && result.CommonMistakes.trim() !== '' && 
                                   !result.CommonMistakes.includes('undefined') && !result.CommonMistakes.includes('null')) 
                                   ? result.CommonMistakes : `Từ '${term}' cần bổ sung thông tin về lỗi phổ biến người Việt hay mắc.`;
            
            console.log("Final result:", result);
            console.log("=== DEBUG INFO ===");
            console.log("Term:", result.Term);
            console.log("Synonyms:", result.Synonyms, "Type:", typeof result.Synonyms, "Length:", result.Synonyms?.length);
            console.log("Antonyms:", result.Antonyms, "Type:", typeof result.Antonyms, "Length:", result.Antonyms?.length);
            console.log("Honorifics:", result.Honorifics, "Type:", typeof result.Honorifics, "Length:", result.Honorifics?.length);
            console.log("HanjaOrigin:", result.HanjaOrigin, "Type:", typeof result.HanjaOrigin);
            console.log("=== END DEBUG ===");
            return result;
            
        } catch (error) {
            console.error("❌ Groq API failed:", error);
            console.log("🤗 Trying Hugging Face API as fallback...");
            
            // Try Hugging Face API as fallback (only if we have key)
            if (hasHfKey) {
                try {
                    return await this.tryHuggingFaceAPI(term, hfKey);
                } catch (hfError) {
                    console.error("❌ Hugging Face API also failed:", hfError);
                    throw new Error(`Cả 2 API đều lỗi: Groq (${error.message}) và HF (${hfError.message})`);
                }
            } else {
                console.log("❌ No HF API key either");
                throw new Error(`Groq lỗi (${error.message}) và không có HF API key để fallback`);
            }
        }
    }

    async tryHuggingFaceAPI(term, hfApiKey) {
        console.log("🤗 Calling Hugging Face API...");
        
        // Construct prompt for Hugging Face (Llama format)
        const prompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>

Bạn là chuyên gia từ điển Hàn-Việt. Trả lời CHỈ bằng JSON hợp lệ với TẤT CẢ các trường này: "Term", "Type", "Definition", "Vietnamese", "Romanization", "Examples" (array), "Synonyms" (array), "Antonyms" (array), "HanjaOrigin" (string), "Honorifics" (array), "TopikLevel" (string), "Usage" (string), "CommonMistakes" (string).

QUY TẮC QUAN TRỌNG:
- Definition: PHẢI bằng tiếng Hàn
- Vietnamese: PHẢI bằng tiếng Việt
- Type: Loại từ bằng tiếng Hàn (명사, 동사, 형용사, 부사, 인사말...)
- Examples: Mỗi ví dụ là object {"korean": "câu tiếng Hàn", "vietnamese": "nghĩa tiếng Việt"}
- Usage: Giải thích cách dùng bằng tiếng Việt
- CommonMistakes: Lỗi phổ biến người Việt hay mắc khi dùng từ này (bằng tiếng Việt)

Luôn trả về TẤT CẢ các trường, không bỏ sót. Nếu không biết thì để mảng rỗng [] hoặc chuỗi rỗng "".<|eot_id|><|start_header_id|>user<|end_header_id|>

Phân tích từ tiếng Hàn này và cung cấp định nghĩa tiếng Hàn + bản dịch tiếng Việt: ${term}

LUÔN trả về TẤT CẢ các trường theo format JSON.<|eot_id|><|start_header_id|>assistant<|end_header_id|>

`;

        const hfPayload = {
            inputs: prompt,
            parameters: {
                max_new_tokens: 1024,
                temperature: 0.2,
                top_p: 0.9,
                do_sample: true,
                return_full_text: false
            }
        };

        // Use Llama 3.1 70B
        const hfResponse = await fetch("https://api-inference.huggingface.co/models/meta-llama/Llama-3.1-70B-Instruct", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${hfApiKey}`
            },
            body: JSON.stringify(hfPayload)
        });

        if (!hfResponse.ok) {
            const errorText = await hfResponse.text();
            console.error("🤗 HF Error Response:", errorText);
            
            // Check if model is loading (503 error)
            if (hfResponse.status === 503) {
                throw new Error("Hugging Face model đang khởi động, thử lại sau 10-20 giây");
            }
            
            throw new Error(`Hugging Face API error: ${hfResponse.status} ${hfResponse.statusText} - ${errorText}`);
        }

        const hfData = await hfResponse.json();
        console.log("🤗 Hugging Face response:", hfData);

        if (!hfData || !Array.isArray(hfData) || !hfData[0] || !hfData[0].generated_text) {
            throw new Error("No valid response from Hugging Face API");
        }

        const aiContent = hfData[0].generated_text;
        console.log("🤗 HF AI content:", aiContent);

        // Parse JSON from Hugging Face response (same logic as Groq)
        let result = {};
        try {
            // Clean up common AI JSON formatting issues
            let cleanedContent = aiContent;
            
            // Remove any text before the JSON
            const jsonStart = cleanedContent.indexOf('{');
            if (jsonStart > 0) {
                cleanedContent = cleanedContent.substring(jsonStart);
            }
            
            // Remove any text after the JSON
            const jsonEnd = cleanedContent.lastIndexOf('}');
            if (jsonEnd > 0) {
                cleanedContent = cleanedContent.substring(0, jsonEnd + 1);
            }
            
            cleanedContent = cleanedContent
                .replace(/\n/g, ' ')
                .replace(/\s+/g, ' ')
                .replace(/,(\s*[}\]])/g, '$1')
                .trim();
            
            console.log("🧹 Cleaned HF content:", cleanedContent);
            result = JSON.parse(cleanedContent);
            console.log("✅ Successfully parsed HF result:", result);
            
        } catch (e) {
            console.error("❌ HF JSON parse error:", e);
            // Same fallback logic as Groq
            result = {
                Term: term,
                Type: '',
                Definition: '',
                Vietnamese: '',
                Romanization: '',
                Examples: [],
                Synonyms: [],
                Antonyms: [],
                HanjaOrigin: '',
                Honorifics: [],
                TopikLevel: '',
                Usage: '',
                CommonMistakes: ''
            };
        }

        // Ensure all required fields (same as Groq)
        result.Term = result.Term || term;
        result.Type = result.Type || '';
        result.Romanization = result.Romanization || '';
        result.Definition = result.Definition || '';
        result.Vietnamese = result.Vietnamese || '';
        result.Examples = Array.isArray(result.Examples) ? result.Examples : [];
        result.Synonyms = Array.isArray(result.Synonyms) ? result.Synonyms : [];
        result.Antonyms = Array.isArray(result.Antonyms) ? result.Antonyms : [];
        result.HanjaOrigin = typeof result.HanjaOrigin === 'string' ? result.HanjaOrigin : '';
        result.Honorifics = Array.isArray(result.Honorifics) ? result.Honorifics : [];
        result.TopikLevel = typeof result.TopikLevel === 'string' ? result.TopikLevel : '';
        result.Usage = typeof result.Usage === 'string' ? result.Usage : '';
        result.CommonMistakes = typeof result.CommonMistakes === 'string' ? result.CommonMistakes : '';

        console.log("🤗 Final HF result:", result);
        return result;
    }
}

// --- Anki Export Modal for Korean Dictionary ---
class AnkiExportModal extends Modal {
    constructor(app, { term, noteContent, audioLinks, onSync }) {
        super(app);
        this.term = term;
        this.noteContent = noteContent;
        this.audioLinks = audioLinks;
        this.onSync = onSync;
        this.deck = '';
        this.noteType = '';
        this.fieldMap = {};
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('anki-export-modal');
        
        // Header with kawaii title
        const header = contentEl.createEl('h2', { text: '🌸 Xuất sang Anki 🌸' });
        
        // Korean term display with better styling
        const termDisplay = contentEl.createEl('div', { 
            text: `📚 Từ tiếng Hàn: ${this.term}`, 
            cls: 'korean-term-display korean-text'
        });

        // Deck & Note Type selectors
        const decks = await getAnkiDecks();
        const noteTypes = await getAnkiNoteTypes();

        // Deck selection with improved styling
        const deckContainer = contentEl.createDiv({ cls: 'form-section' });
        const deckLabel = deckContainer.createEl('label');
        deckLabel.createEl('span', { text: '📚 Chọn Deck:', cls: 'label-text' });
        const deckSelect = deckLabel.createEl('select');
        
        // Add default option
        if (decks.length === 0) {
            deckSelect.createEl('option', { text: 'Không có deck nào', value: '' });
        } else {
            decks.forEach(d => deckSelect.createEl('option', { text: d, value: d }));
            // Set initial value
            const defaultDeck = decks.find(d => d.toLowerCase().includes('korean')) || decks[0];
            deckSelect.value = defaultDeck;
            this.deck = defaultDeck;
        }
        
        // Add selected deck display
        const deckStatus = deckContainer.createEl('div', { 
            text: `✅ Đã chọn: ${this.deck}`, 
            cls: 'selection-status' 
        });
        
        deckSelect.onchange = (e) => { 
            this.deck = e.target.value;
            deckStatus.setText(`✅ Đã chọn: ${this.deck}`);
            console.log('Deck selected:', this.deck);
        };

        // Note Type selection with improved styling
        const noteTypeContainer = contentEl.createDiv({ cls: 'form-section' });
        const noteTypeLabel = noteTypeContainer.createEl('label');
        noteTypeLabel.createEl('span', { text: '📝 Loại Note:', cls: 'label-text' });
        const noteTypeSelect = noteTypeLabel.createEl('select');
        
        // Add default option
        if (noteTypes.length === 0) {
            noteTypeSelect.createEl('option', { text: 'Không có note type nào', value: '' });
        } else {
            noteTypes.forEach(nt => noteTypeSelect.createEl('option', { text: nt, value: nt }));
            // Set initial value
            const defaultNoteType = noteTypes.find(nt => nt.toLowerCase().includes('korean')) || noteTypes[0];
            noteTypeSelect.value = defaultNoteType;
            this.noteType = defaultNoteType;
        }
        
        // Add selected note type display
        const noteTypeStatus = noteTypeContainer.createEl('div', { 
            text: `✅ Đã chọn: ${this.noteType}`, 
            cls: 'selection-status' 
        });
        
        noteTypeSelect.onchange = (e) => { 
            this.noteType = e.target.value;
            noteTypeStatus.setText(`✅ Đã chọn: ${this.noteType}`);
            console.log('Note Type selected:', this.noteType);
        };

        // Field mapping section with kawaii styling
        const fieldMapDiv = contentEl.createDiv({ cls: 'field-mapping-section' });
        const mappingHeader = fieldMapDiv.createEl('h4');
        mappingHeader.innerHTML = '🔧 Mapping Fields';
        
        const koreanFields = [
            'Term', 'Type', 'Definition', 'Vietnamese', 'Romanization', 
            'Examples', 'Synonyms', 'Antonyms', 'HanjaOrigin', 'Honorifics', 
            'TopikLevel', 'Usage', 'CommonMistakes', 'Audio'
        ];
        
        const fieldContainer = fieldMapDiv.createDiv({ cls: 'field-mapping-container' });
        koreanFields.forEach(field => {
            const row = fieldContainer.createDiv({ cls: 'field-mapping-row' });
            row.createEl('span', { text: field, cls: 'field-name' });
            const input = row.createEl('input', { 
                type: 'text',
                placeholder: `Anki field for ${field}`,
                cls: 'field-input'
            });
            input.value = field;
            input.onchange = (e) => { this.fieldMap[field] = e.target.value; };
            this.fieldMap[field] = field;
        });

        // Preview section with better styling
        const previewSection = contentEl.createDiv({ cls: 'preview-section' });
        const previewHeader = previewSection.createEl('h4');
        previewHeader.innerHTML = '👀 Xem trước';
        const pre = previewSection.createEl('pre', { cls: 'preview-content' });
        const truncatedContent = this.noteContent.substring(0, 500);
        pre.innerText = truncatedContent + (this.noteContent.length > 500 ? '...' : '');

        // Export button with enhanced styling
        const buttonContainer = contentEl.createDiv({ cls: 'button-container' });
        const syncBtn = buttonContainer.createEl('button', { 
            text: '🌸 Xuất sang Anki',
            cls: 'kawaii-btn primary-btn export-btn'
        });
        syncBtn.onclick = async () => {
            // Add loading state
            syncBtn.innerHTML = '✨ Đang xuất...';
            syncBtn.disabled = true;
            
            try {
                await this.onSync(this.deck, this.noteType, this.fieldMap);
                this.close();
            } catch (error) {
                syncBtn.innerHTML = '🌸 Xuất sang Anki';
                syncBtn.disabled = false;
                console.error('Export failed:', error);
            }
        };
    }

    onClose() { 
        this.contentEl.empty(); 
    }
}

// --- Anki API helpers ---
async function checkAnkiConnection() {
    try {
        const res = await fetch('http://localhost:8765', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'app://obsidian.md'
            },
            body: JSON.stringify({ action: 'version', version: 6 }),
            signal: AbortSignal.timeout(3000) // 3 second timeout
        });
        const data = await res.json();
        return data.result !== undefined;
    } catch (error) {
        console.log('Anki connection check failed:', error.message);
        return false;
    }
}

async function getAnkiDecks() {
    try {
        const res = await fetch('http://localhost:8765', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'app://obsidian.md'
            },
            body: JSON.stringify({ action: 'deckNames', version: 6 }),
            signal: AbortSignal.timeout(5000)
        });
        const data = await res.json();
        if (data.error) {
            throw new Error(data.error);
        }
        return data.result || [];
    } catch (error) {
        console.error('Failed to get Anki decks:', error);
        return []; // Return empty array instead of hardcoded defaults
    }
}

async function getAnkiNoteTypes() {
    try {
        const res = await fetch('http://localhost:8765', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'app://obsidian.md'
            },
            body: JSON.stringify({ action: 'modelNames', version: 6 }),
            signal: AbortSignal.timeout(5000)
        });
        const data = await res.json();
        if (data.error) {
            throw new Error(data.error);
        }
        return data.result || [];
    } catch (error) {
        console.error('Failed to get Anki note types:', error);
        return []; // Return empty array instead of hardcoded defaults
    }
}

async function checkAnkiDuplicate(term, deck, noteType, fieldMap) {
    try {
        const res = await fetch('http://localhost:8765', {
            method: 'POST',
            body: JSON.stringify({ 
                action: 'findNotes', 
                version: 6, 
                params: { query: `deck:"${deck}" "${term}"` } 
            })
        });
        const data = await res.json();
        return (data.result && data.result.length > 0);
    } catch { return false; }
}

async function confirmOverwrite() {
    return window.confirm('🤔 Card đã tồn tại trong Anki. Ghi đè?');
}

async function syncToAnki(app, result, noteContent, audioLinks, deck, noteType, fieldMap) {
    // Mapping fields cho Korean
    const ankiFields = {};
    let audioField = '';

    for (const key in fieldMap) {
        let val = '';
        
        if (key === 'Audio') {
            // Lấy file audio đầu tiên nếu có
            if (audioLinks && audioLinks.length > 0) {
                const match = audioLinks[0].match(/\[\[(.*?)\]\]/);
                if (match) {
                    const fullAudioPath = match[1]; // e.g., "Audio/korean_google_good_사회_0.mp3"
                    const fileName = fullAudioPath.split('/').pop(); // e.g., "korean_google_good_사회_0.mp3"
                    audioField = fullAudioPath; // Giữ full path để tìm file
                    val = `[sound:${fileName}]`; // Chỉ filename cho Anki
                }
            }
        } else if (Array.isArray(result[key])) {
            val = result[key].map(item => {
                if (typeof item === 'string') return '• ' + item;
                if (item && typeof item === 'object') {
                    let s = '• ' + (item.korean || item.text || '');
                    if (item.vietnamese || item.explanation) {
                        s += ' → ' + (item.vietnamese || item.explanation);
                    }
                    return s;
                }
                return '';
            }).join('<br>');
        } else {
            val = result[key] !== undefined ? result[key] : '';
        }
        
        ankiFields[fieldMap[key] || key] = val;
    }

    // Nếu có audio, gửi file sang AnkiConnect
    if (audioField) {
        try {
            console.log(`🎵 Syncing audio to Anki: ${audioField}`);
            const file = app.vault.getAbstractFileByPath(audioField); // Sử dụng full path
            if (file) {
                console.log(`📁 Found audio file: ${audioField}`);
                const arrayBuffer = await app.vault.readBinary(file);
                const base64 = arrayBufferToBase64(arrayBuffer);
                const fileName = audioField.split('/').pop(); // Extract filename for AnkiConnect
                
                const storeResponse = await fetch('http://localhost:8765', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Origin': 'app://obsidian.md'
                    },
                    body: JSON.stringify({
                        action: 'storeMediaFile',
                        version: 6,
                        params: {
                            filename: fileName, // Chỉ gửi filename, không có path
                            data: base64
                        }
                    })
                });
                
                const storeResult = await storeResponse.json();
                if (storeResult.error) {
                    console.error('❌ AnkiConnect storeMediaFile error:', storeResult.error);
                } else {
                    console.log(`✅ Audio stored in Anki: ${fileName}`);
                }
            } else {
                console.warn(`⚠️ Audio file not found: ${audioField}`);
                new Notice(`⚠️ Audio file không tìm thấy: ${audioField}`);
            }
        } catch (e) {
            console.error('❌ Audio sync error:', e);
            new Notice('❌ Lỗi gửi audio sang Anki: ' + e.message);
        }
    }

    // Gửi note sang Anki
    try {
        const res = await fetch('http://localhost:8765', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'app://obsidian.md'
            },
            body: JSON.stringify({
                action: 'addNote',
                version: 6,
                params: {
                    note: {
                        deckName: deck,
                        modelName: noteType,
                        fields: ankiFields,
                        options: { allowDuplicate: true },
                        tags: ['obsidian', 'korean-dictionary', 'kawaii']
                    }
                }
            })
        });
        const data = await res.json();
        if (data.error) return { success: false, error: data.error };
        return { success: true };
    } catch (e) { 
        return { success: false, error: e.message }; 
    }
}

// Helper: convert ArrayBuffer to base64
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

async function markNoteSynced(app, notePath) {
    try {
        const file = app.vault.getAbstractFileByPath(notePath);
        if (file) {
            let content = await app.vault.read(file);
            if (!content.includes('#anki-synced')) {
                content = '#anki-synced\n' + content;
                await app.vault.modify(file, content);
            }
        }
    } catch {}
}

// Settings Tab
class KoreanDictionarySettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: '💕 Cài đặt từ điển Hàn Việt 💕' });

        // API Key Setting
        new Setting(containerEl)
            .setName('Groq API Key 🔑')
            .setDesc('Nhập API key của Groq để sử dụng AI tra từ (miễn phí tại groq.com)')
            .addText(text => text
                .setPlaceholder('gsk_...')
                .setValue(this.plugin.settings.llmkey)
                .onChange(async (value) => {
                    this.plugin.settings.llmkey = value;
                    await this.plugin.saveSettings();
                }));

        // Hugging Face API Key Setting  
        new Setting(containerEl)
            .setName('Hugging Face API Key 🤗')
            .setDesc('API key cho Hugging Face (backup khi Groq hết quota) - miễn phí tại huggingface.co/settings/tokens')
            .addText(text => text
                .setPlaceholder('hf_...')
                .setValue(this.plugin.settings.hfkey)
                .onChange(async (value) => {
                    this.plugin.settings.hfkey = value;
                    await this.plugin.saveSettings();
                }));

        // TTS Engine Selection
        new Setting(containerEl)
            .setName('TTS Engine 🎵')
            .setDesc('Korean Text-to-Speech sử dụng Google TTS với auto-save MP3')
            .addDropdown(dropdown => dropdown
                .addOption('google', '🔊 Google TTS (Korean Audio)')
                .setValue('google')
                .onChange(async (value) => {
                    this.plugin.settings.ttsEngine = 'google';
                    await this.plugin.saveSettings();
                }));

        // Language Setting
        new Setting(containerEl)
            .setName('Ngôn ngữ định nghĩa 🌍')
            .setDesc('Chọn ngôn ngữ cho định nghĩa từ (hiện chỉ hỗ trợ tiếng Việt)')
            .addDropdown(dropdown => dropdown
                .addOption('Vietnamese', '🇻🇳 Tiếng Việt')
                .setValue(this.plugin.settings.def)
                .onChange(async (value) => {
                    this.plugin.settings.def = value;
                    await this.plugin.saveSettings();
                }));

        // Service Information
        containerEl.createEl('h3', { text: '📋 Thông tin dịch vụ' });
        
        const serviceInfo = containerEl.createEl('div', { cls: 'setting-item-description' });
        serviceInfo.innerHTML = `
            <p><strong>🤖 AI Services:</strong></p>
            <p>• <strong>Groq:</strong> Primary AI service với GPT-OSS 120B (10K tokens/ngày)</p>
            <p>• <strong>Hugging Face:</strong> Backup service với Llama-3.1-70B (unlimited)</p>
            <p><strong>🎵 TTS Service:</strong></p>
            <p>• <strong>Google TTS:</strong> Korean Text-to-Speech với auto-save MP3</p>
            <p>• <strong>Features:</strong> Auto-download file MP3 với tên từ Korean</p>
            <p><strong>💡 Setup Guide:</strong></p>
            <p> Tạo Groq API key tại <a href="https://groq.com">groq.com</a></p>
        `;
    }
}

// Main Plugin Class
class KoreanDictionaryPlugin extends Plugin {
    async onload() {
        await this.loadSettings();

        this.registerView(
            DICTIONARY_VIEW_TYPE,
            (leaf) => new DictionaryView(leaf, this)
        );

        this.addCommand({
            id: 'lookup-word',
            name: 'Look up selected text',
            hotkeys: [
                { modifiers: ['Alt'], key: 'a' }
            ],
            callback: async () => {
                await this.lookupSelectedText();
            }
        });

        this.addCommand({
            id: 'open-dictionary-view',
            name: 'Open Dictionary View',
            callback: async () => {
                await this.activateView();
            }
        });

        this.addSettingTab(new KoreanDictionarySettingTab(this.app, this));

        console.log('💕 Korean Dictionary Plugin loaded with love!');
    }

    async lookupSelectedText() {
        let selectedText = '';
        let editor = null;

        const activeLeaf = this.app.workspace.activeLeaf;
        if (activeLeaf && activeLeaf.view && activeLeaf.view.editor) {
            editor = activeLeaf.view.editor;
            selectedText = editor.getSelection();
        } else {
            const selection = window.getSelection();
            selectedText = selection ? selection.toString() : '';
        }

        const leaf = await this.activateView();
        setTimeout(async () => {
            const view = leaf.view;
            if (view && typeof view.lookupWord === 'function') {
                if (selectedText && selectedText.trim().length > 0) {
                    await view.lookupWord(selectedText.trim());
                    if (view.inputBox) view.inputBox.value = selectedText.trim();
                } else if (view.inputBox && view.inputBox.value.trim().length > 0) {
                    await view.lookupWord(view.inputBox.value.trim());
                } else {
                    view.inputBox && view.inputBox.focus();
                }
            } else {
                new Notice("💔 Dictionary view not available");
            }
        }, 100);
    }

    async activateView() {
        const { workspace } = this.app;
        let leaf = null;
        const leaves = workspace.getLeavesOfType(DICTIONARY_VIEW_TYPE);

        if (leaves.length > 0) {
            leaf = leaves[0];
        } else {
            leaf = workspace.getRightLeaf(true);
            await leaf.setViewState({ type: DICTIONARY_VIEW_TYPE, active: true });
        }

        workspace.revealLeaf(leaf);
        return leaf;
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

module.exports = KoreanDictionaryPlugin;
