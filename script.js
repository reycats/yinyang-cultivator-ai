// ==================== CONFIGURATION ====================
const CONFIG = {
    API_KEY: "", // SELALU KOSONG - ambil dari localStorage
    API_URL: "https://api.deepseek.com/chat/completions",
    DEFAULT_MODEL: "deepseek-chat",
    MAX_TOKENS: 2000,
    DEFAULT_THEME: "dark",
    VERSION: "1.1.0"
};

// ==================== API KEY SYSTEM ====================
const ApiKeySystem = {
    STORAGE_KEY: 'deepseek_api_key_v2',
    CURRENT_API_KEY: null,
    
    init() {
        this.loadApiKey();
        
        // Auto-show modal if no valid key
        if (!this.hasValidKey()) {
            setTimeout(() => this.showApiKeyModal(), 1000);
        }
    },
    
    loadApiKey() {
        try {
            const key = localStorage.getItem(this.STORAGE_KEY);
            if (key && key.startsWith('sk-') && key.length > 30) {
                this.CURRENT_API_KEY = key;
                CONFIG.API_KEY = key;
                return true;
            }
        } catch (e) {
            console.warn('Failed to load API key from localStorage:', e);
        }
        return false;
    },
    
    saveApiKey(key) {
        if (!key || !key.startsWith('sk-') || key.length < 30) {
            return { success: false, message: 'Format API key tidak valid' };
        }
        
        try {
            localStorage.setItem(this.STORAGE_KEY, key);
            this.CURRENT_API_KEY = key;
            CONFIG.API_KEY = key;
            return { success: true, message: 'API key disimpan' };
        } catch (e) {
            console.error('Failed to save API key:', e);
            return { success: false, message: 'Gagal menyimpan API key' };
        }
    },
    
    hasValidKey() {
        return this.CURRENT_API_KEY && 
               this.CURRENT_API_KEY.startsWith('sk-') && 
               this.CURRENT_API_KEY.length > 30 &&
               this.CURRENT_API_KEY !== "sk-ce242eb3749d4b9c88f6416b008d6836";
    },
    
    getApiKey() {
        return this.CURRENT_API_KEY || "";
    },
    
    showApiKeyModal(force = false) {
        // Remove existing modal
        const existing = document.querySelector('.api-key-modal-main');
        if (existing) existing.remove();
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'api-key-modal-main';
        modal.innerHTML = `
            <div class="api-modal-overlay"></div>
            <div class="api-modal-content">
                <div class="api-modal-header">
                    <h3><i class="fas fa-key"></i> API Key Required</h3>
                    <button class="api-modal-close">&times;</button>
                </div>
                <div class="api-modal-body">
                    <p>Untuk menggunakan AI Assistant, Anda perlu memasukkan API Key dari DeepSeek.</p>
                    
                    <div class="api-key-input-group">
                        <label for="api-key-input">API Key Anda:</label>
                        <div class="input-with-button">
                            <input type="password" id="api-key-input" 
                                   placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                   value="${this.getApiKey() || ''}">
                            <button type="button" id="toggle-visibility">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                        <small class="api-key-hint">
                            Dapatkan API key gratis dari <a href="https://platform.deepseek.com" target="_blank">platform.deepseek.com</a>
                        </small>
                    </div>
                    
                    <div class="test-result" id="test-result"></div>
                    
                    <div class="api-modal-actions">
                        <button id="test-api-btn" class="btn-secondary">
                            <i class="fas fa-bolt"></i> Test Connection
                        </button>
                        <button id="save-api-btn" class="btn-primary">
                            <i class="fas fa-save"></i> Save & Continue
                        </button>
                    </div>
                    
                    <div class="api-tips">
                        <h4><i class="fas fa-lightbulb"></i> Tips:</h4>
                        <ul>
                            <li>API key disimpan <strong>hanya di browser Anda</strong></li>
                            <li>Gunakan API key pribadi (jangan pakai yang bocor)</li>
                            <li>Jika error 401/402, buat API key baru di dashboard</li>
                            <li>Clear cache browser jika ada masalah</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listeners
        const closeBtn = modal.querySelector('.api-modal-close');
        const saveBtn = modal.querySelector('#save-api-btn');
        const testBtn = modal.querySelector('#test-api-btn');
        const input = modal.querySelector('#api-key-input');
        const toggleBtn = modal.querySelector('#toggle-visibility');
        
        // Close modal
        closeBtn.addEventListener('click', () => {
            modal.remove();
            // Jika force modal dan tidak ada key valid, reload untuk cek lagi
            if (force && !this.hasValidKey()) {
                setTimeout(() => this.showApiKeyModal(true), 100);
            }
        });
        
        modal.querySelector('.api-modal-overlay').addEventListener('click', () => {
            modal.remove();
        });
        
        // Toggle visibility
        toggleBtn.addEventListener('click', () => {
            const type = input.type === 'password' ? 'text' : 'password';
            input.type = type;
            toggleBtn.innerHTML = type === 'password' ? 
                '<i class="fas fa-eye"></i>' : 
                '<i class="fas fa-eye-slash"></i>';
        });
        
        // Test connection
        testBtn.addEventListener('click', async () => {
            const key = input.value.trim();
            if (!key || !key.startsWith('sk-')) {
                this.showTestResult('❌ Format API key tidak valid', 'error');
                return;
            }
            
            testBtn.disabled = true;
            testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
            
            try {
                const response = await fetch(CONFIG.API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${key}`
                    },
                    body: JSON.stringify({
                        model: "deepseek-chat",
                        messages: [{ role: "user", content: "test" }],
                        max_tokens: 1
                    })
                });
                
                if (response.ok) {
                    this.showTestResult('✅ API Key valid! Koneksi berhasil.', 'success');
                    input.style.borderColor = '#4CAF50';
                } else if (response.status === 401) {
                    this.showTestResult('❌ API Key tidak valid (401 Unauthorized). Buat API key baru.', 'error');
                    input.style.borderColor = '#f44336';
                } else if (response.status === 402) {
                    this.showTestResult('❌ API Key expired atau kuota habis. Buat API key baru.', 'error');
                    input.style.borderColor = '#f44336';
                } else if (response.status === 429) {
                    this.showTestResult('⚠️ Rate limit exceeded. Tunggu beberapa saat.', 'warning');
                    input.style.borderColor = '#FF9800';
                } else {
                    this.showTestResult(`❌ Error ${response.status}: ${response.statusText}`, 'error');
                    input.style.borderColor = '#f44336';
                }
            } catch (error) {
                this.showTestResult('❌ Gagal terkoneksi ke server. Cek koneksi internet.', 'error');
                input.style.borderColor = '#f44336';
            } finally {
                testBtn.disabled = false;
                testBtn.innerHTML = '<i class="fas fa-bolt"></i> Test Connection';
            }
        });
        
        // Save API key
        saveBtn.addEventListener('click', () => {
            const key = input.value.trim();
            const result = this.saveApiKey(key);
            
            if (result.success) {
                this.showTestResult('✅ API Key disimpan! Memuat ulang...', 'success');
                setTimeout(() => location.reload(), 1500);
            } else {
                this.showTestResult(`❌ ${result.message}`, 'error');
            }
        });
        
        // Enter to save
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                saveBtn.click();
            }
        });
        
        // Focus input
        setTimeout(() => input.focus(), 100);
    },
    
    showTestResult(message, type = 'info') {
        const resultDiv = document.getElementById('test-result');
        if (resultDiv) {
            resultDiv.textContent = message;
            resultDiv.className = `test-result ${type}`;
            resultDiv.style.display = 'block';
            
            // Auto hide after 5 seconds
            setTimeout(() => {
                if (resultDiv.textContent === message) {
                    resultDiv.style.display = 'none';
                }
            }, 5000);
        }
    }
};

// ==================== STATE MANAGEMENT ====================
let state = {
    conversation: [],
    isTyping: false,
    isDarkMode: true,
    isCodingMode: false,
    currentModel: CONFIG.DEFAULT_MODEL,
    messageCount: 0,
    totalTokens: 0,
    apiConnected: false,
    settings: {
        saveHistory: true,
        autoScroll: true,
        maxTokens: CONFIG.MAX_TOKENS
    }
};

// ==================== DOM ELEMENTS ====================
const elements = {
    messageInput: null,
    sendBtn: null,
    messagesContainer: null,
    typingIndicator: null,
    clearBtn: null,
    themeBtn: null,
    codeBtn: null,
    exportBtn: null,
    settingsBtn: null,
    attachBtn: null,
    voiceBtn: null,
    messageCount: null,
    tokenCount: null,
    apiStatus: null,
    statusText: null,
    settingsModal: null,
    aboutModal: null,
    privacyModal: null,
    apiKeyInput: null,
    toggleKeyBtn: null,
    modelSelect: null,
    saveHistoryCheck: null,
    autoScrollCheck: null,
    maxTokensRange: null,
    tokenValue: null,
    resetBtn: null,
    saveSettingsBtn: null,
    privacyBtn: null,
    aboutBtn: null,
    toast: null
};

// ==================== UTILITY FUNCTIONS ====================
const utils = {
    showToast(message, type = 'info', duration = 3000) {
        let toast = document.getElementById('toast-global');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast-global';
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        
        toast.textContent = message;
        toast.className = `toast toast-${type} show`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    },

    formatTime(date = new Date()) {
        return date.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    estimateTokens(text) {
        return Math.ceil(text.length / 4);
    },

    saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.warn('LocalStorage error:', e);
            this.showToast('Gagal menyimpan data lokal', 'error');
            return false;
        }
    },

    loadFromStorage(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.warn('LocalStorage error:', e);
            return defaultValue;
        }
    }
};

// ==================== CHAT FUNCTIONS ====================
const chat = {
    async init() {
        // Initialize API key system first
        ApiKeySystem.init();
        
        // Wait a bit for DOM
        setTimeout(() => {
            this.initializeElements();
            this.loadState();
            this.setupEventListeners();
            this.testConnection();
            this.renderConversation();
            
            // Auto-focus input if we have valid API key
            if (ApiKeySystem.hasValidKey() && elements.messageInput) {
                setTimeout(() => elements.messageInput.focus(), 500);
            }
        }, 100);
        
        console.log('YinYang Cultivator AI initialized');
    },
    
    initializeElements() {
        // Map all elements
        elements.messageInput = document.getElementById('message-input');
        elements.sendBtn = document.getElementById('send-btn');
        elements.messagesContainer = document.getElementById('messages-container');
        elements.typingIndicator = document.getElementById('typing-indicator');
        elements.clearBtn = document.getElementById('clear-btn');
        elements.themeBtn = document.getElementById('theme-btn');
        elements.codeBtn = document.getElementById('code-btn');
        elements.exportBtn = document.getElementById('export-btn');
        elements.settingsBtn = document.getElementById('settings-btn');
        elements.attachBtn = document.getElementById('attach-btn');
        elements.voiceBtn = document.getElementById('voice-btn');
        elements.messageCount = document.getElementById('message-count');
        elements.tokenCount = document.getElementById('token-count');
        elements.apiStatus = document.getElementById('api-status');
        elements.statusText = document.getElementById('status-text');
        elements.settingsModal = document.getElementById('settings-modal');
        elements.aboutModal = document.getElementById('about-modal');
        elements.privacyModal = document.getElementById('privacy-modal');
        elements.apiKeyInput = document.getElementById('api-key-input');
        elements.toggleKeyBtn = document.getElementById('toggle-key-btn');
        elements.modelSelect = document.getElementById('model-select');
        elements.saveHistoryCheck = document.getElementById('save-history');
        elements.autoScrollCheck = document.getElementById('auto-scroll');
        elements.maxTokensRange = document.getElementById('max-tokens');
        elements.tokenValue = document.getElementById('token-value');
        elements.resetBtn = document.getElementById('reset-btn');
        elements.saveSettingsBtn = document.getElementById('save-settings');
        elements.privacyBtn = document.getElementById('privacy-btn');
        elements.aboutBtn = document.getElementById('about-btn');
        elements.toast = document.getElementById('toast');
    },

    loadState() {
        // Load conversation history
        if (state.settings.saveHistory) {
            const savedConv = utils.loadFromStorage('yinyang-conversation', []);
            state.conversation = savedConv;
            state.messageCount = savedConv.length;
            state.totalTokens = savedConv.reduce((sum, msg) => 
                sum + utils.estimateTokens(msg.content), 0
            );
        }

        // Load other settings
        const savedState = utils.loadFromStorage('yinyang-state');
        if (savedState) {
            state = { ...state, ...savedState };
        }

        // Apply theme
        if (state.isDarkMode !== undefined) {
            document.documentElement.setAttribute('data-theme', 
                state.isDarkMode ? 'dark' : 'light'
            );
            this.updateThemeButton();
        }
        
        // Update stats
        this.updateStats();
    },

    saveState() {
        if (state.settings.saveHistory) {
            utils.saveToStorage('yinyang-conversation', state.conversation);
        }
        utils.saveToStorage('yinyang-state', {
            isDarkMode: state.isDarkMode,
            isCodingMode: state.isCodingMode,
            currentModel: state.currentModel,
            messageCount: state.messageCount,
            totalTokens: state.totalTokens,
            settings: state.settings
        });
    },

    async testConnection() {
        if (!ApiKeySystem.hasValidKey()) {
            elements.statusText.textContent = 'API Key Required';
            elements.apiStatus.textContent = 'API: Not Set';
            elements.apiStatus.style.color = 'var(--warning)';
            state.apiConnected = false;
            return;
        }

        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ApiKeySystem.getApiKey()}`
                },
                body: JSON.stringify({
                    model: state.currentModel,
                    messages: [{ role: "user", content: "test" }],
                    max_tokens: 1
                })
            });

            state.apiConnected = response.ok;
            
            if (state.apiConnected) {
                elements.statusText.textContent = 'API Connected';
                elements.apiStatus.textContent = 'API: Active';
                elements.apiStatus.style.color = 'var(--success)';
            } else {
                elements.statusText.textContent = `API Error: ${response.status}`;
                elements.apiStatus.textContent = 'API: Error';
                elements.apiStatus.style.color = 'var(--error)';
                
                // Show API key modal if unauthorized
                if (response.status === 401 || response.status === 402) {
                    setTimeout(() => ApiKeySystem.showApiKeyModal(true), 1000);
                }
            }
        } catch (error) {
            state.apiConnected = false;
            elements.statusText.textContent = 'API Offline';
            elements.apiStatus.textContent = 'API: Offline';
            elements.apiStatus.style.color = 'var(--warning)';
        }
    },

    async sendMessage() {
        // Check API key first
        if (!ApiKeySystem.hasValidKey()) {
            utils.showToast('API Key belum diatur. Silakan atur API Key terlebih dahulu.', 'error');
            ApiKeySystem.showApiKeyModal(true);
            return;
        }

        if (!elements.messageInput) {
            this.initializeElements();
        }

        const message = elements.messageInput.value.trim();
        if (!message || state.isTyping) return;

        // Add user message
        this.addMessage('user', message);
        elements.messageInput.value = '';
        this.adjustTextareaHeight();
        
        // Disable input
        state.isTyping = true;
        elements.messageInput.disabled = true;
        elements.sendBtn.disabled = true;
        if (elements.typingIndicator) {
            elements.typingIndicator.classList.add('active');
        }

        // Add to conversation
        state.conversation.push({
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
        });

        state.messageCount++;
        state.totalTokens += utils.estimateTokens(message);
        this.updateStats();

        try {
            // Prepare messages
            let messages = [...state.conversation];
            if (state.isCodingMode) {
                messages.unshift({
                    role: 'system',
                    content: 'You are a coding assistant. Provide code solutions with explanations.'
                });
            }

            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ApiKeySystem.getApiKey()}`
                },
                body: JSON.stringify({
                    model: state.currentModel,
                    messages: messages.map(msg => ({
                        role: msg.role,
                        content: msg.content
                    })),
                    max_tokens: state.settings.maxTokens,
                    temperature: 0.7,
                    stream: false
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API Error ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            const botReply = data.choices[0].message.content;

            // Add bot message
            this.addMessage('bot', botReply);
            
            // Update conversation
            state.conversation.push({
                role: 'assistant',
                content: botReply,
                timestamp: new Date().toISOString()
            });

            state.messageCount++;
            state.totalTokens += utils.estimateTokens(botReply);
            this.updateStats();

            // Save state
            this.saveState();

            // Update API status
            elements.statusText.textContent = 'API Connected';
            elements.apiStatus.textContent = 'API: Active';
            elements.apiStatus.style.color = 'var(--success)';

        } catch (error) {
            console.error('Chat error:', error);
            
            let errorMessage = `⚠️ **Error:** ${error.message}\n\n`;
            
            if (error.message.includes('401')) {
                errorMessage += 'API Key tidak valid atau sudah expired. Silakan buat API Key baru di Settings.';
                ApiKeySystem.showApiKeyModal(true);
            } else if (error.message.includes('402')) {
                errorMessage += 'Kuota API Key habis. Silakan buat API Key baru.';
                ApiKeySystem.showApiKeyModal(true);
            } else if (error.message.includes('429')) {
                errorMessage += 'Terlalu banyak permintaan. Tunggu beberapa saat.';
            } else {
                errorMessage += 'Silakan cek koneksi internet atau coba lagi nanti.';
            }
            
            this.addMessage('bot', errorMessage);
            
            elements.statusText.textContent = 'API Error';
            elements.apiStatus.textContent = 'API: Error';
            elements.apiStatus.style.color = 'var(--error)';
            
            utils.showToast('Gagal mengirim pesan', 'error');
            
        } finally {
            // Re-enable input
            state.isTyping = false;
            if (elements.messageInput) {
                elements.messageInput.disabled = false;
                elements.messageInput.focus();
            }
            if (elements.sendBtn) elements.sendBtn.disabled = false;
            if (elements.typingIndicator) {
                elements.typingIndicator.classList.remove('active');
            }
            
            // Auto-scroll
            if (state.settings.autoScroll && elements.messagesContainer) {
                elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
            }
        }
    },

    addMessage(role, content) {
        if (!elements.messagesContainer) {
            console.error('Messages container not found');
            return;
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        const avatarIcon = role === 'user' ? 'fas fa-user' : 'fas fa-yin-yang';
        const time = utils.formatTime();
        
        // Format content
        const formattedContent = content
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
        
        messageDiv.innerHTML = `
            <div class="avatar">
                <i class="${avatarIcon}"></i>
            </div>
            <div class="message-content">
                ${formattedContent}
                <div class="message-time">${time}</div>
            </div>
        `;
        
        elements.messagesContainer.appendChild(messageDiv);
        
        // Auto-scroll
        if (state.settings.autoScroll) {
            setTimeout(() => {
                messageDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }, 100);
        }
    },

    renderConversation() {
        if (!elements.messagesContainer) return;
        
        elements.messagesContainer.innerHTML = '';
        
        if (state.conversation.length === 0) {
            const hasKey = ApiKeySystem.hasValidKey();
            const status = hasKey ? '✅ Terhubung' : '❌ Belum diatur';
            
            this.addMessage('bot', 
                `🎯 **Selamat datang di YinYang AI!**\n\n` +
                `**Status API:** ${status}\n\n` +
                `${
                    hasKey 
                    ? '✨ **Siap membantu Anda!** Coba tanyakan sesuatu.'
                    : '🔑 **Langkah pertama:** Klik tombol Settings (⚙️) di bawah untuk memasukkan API Key Anda.'
                }\n\n` +
                `📱 **Tips:**\n` +
                `• Enter untuk kirim, Shift+Enter untuk baris baru\n` +
                `• Gunakan \`code\` untuk format kode\n` +
                `• Clear chat untuk memulai percakapan baru`
            );
        } else {
            state.conversation.forEach(msg => {
                this.addMessage(msg.role, msg.content);
            });
        }
    },

    clearConversation() {
        if (confirm('Hapus seluruh percakapan?')) {
            state.conversation = [];
            state.messageCount = 0;
            state.totalTokens = 0;
            
            utils.saveToStorage('yinyang-conversation', []);
            this.renderConversation();
            this.updateStats();
            
            utils.showToast('Percakapan dibersihkan', 'success');
        }
    },

    toggleTheme() {
        state.isDarkMode = !state.isDarkMode;
        document.documentElement.setAttribute('data-theme', 
            state.isDarkMode ? 'dark' : 'light'
        );
        
        this.updateThemeButton();
        this.saveState();
        
        utils.showToast(
            `Mode ${state.isDarkMode ? 'gelap' : 'terang'} diaktifkan`,
            'success'
        );
    },

    updateThemeButton() {
        if (!elements.themeBtn) return;
        const icon = state.isDarkMode ? 'fa-sun' : 'fa-moon';
        elements.themeBtn.innerHTML = `<i class="fas ${icon}"></i> Tema`;
    },

    toggleCodingMode() {
        state.isCodingMode = !state.isCodingMode;
        
        if (!elements.codeBtn) return;
        const icon = state.isCodingMode ? 'fa-keyboard' : 'fa-code';
        elements.codeBtn.innerHTML = `<i class="fas ${icon}"></i> ${
            state.isCodingMode ? 'Normal Mode' : 'Coding Mode'
        }`;
        
        utils.showToast(
            `Mode ${state.isCodingMode ? 'coding' : 'normal'} diaktifkan`,
            'success'
        );
    },

    updateStats() {
        if (elements.messageCount) {
            elements.messageCount.textContent = `${state.messageCount} Pesan`;
        }
        if (elements.tokenCount) {
            elements.tokenCount.textContent = `~${state.totalTokens} Token`;
        }
    },

    adjustTextareaHeight() {
        if (!elements.messageInput) return;
        const textarea = elements.messageInput;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    },

    setupEventListeners() {
        // Basic event listeners
        if (elements.sendBtn) {
            elements.sendBtn.addEventListener('click', () => this.sendMessage());
        }
        
        if (elements.messageInput) {
            elements.messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
            
            elements.messageInput.addEventListener('input', () => this.adjustTextareaHeight());
        }
        
        if (elements.clearBtn) {
            elements.clearBtn.addEventListener('click', () => this.clearConversation());
        }
        
        if (elements.themeBtn) {
            elements.themeBtn.addEventListener('click', () => this.toggleTheme());
        }
        
        if (elements.codeBtn) {
            elements.codeBtn.addEventListener('click', () => this.toggleCodingMode());
        }
        
        // Settings modal
        if (elements.settingsBtn) {
            elements.settingsBtn.addEventListener('click', () => this.openSettings());
        }
        
        // Other buttons
        if (elements.exportBtn) {
            elements.exportBtn.addEventListener('click', () => {
                utils.showToast('Fitur export dalam pengembangan', 'info');
            });
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + / for settings
            if ((e.ctrlKey || e.metaKey) && e.key === '/') {
                e.preventDefault();
                this.openSettings();
            }
            
            // Esc to close modals
            if (e.key === 'Escape') {
                this.closeModals();
            }
        });
    },

    openSettings() {
        // Use our API key modal instead
        ApiKeySystem.showApiKeyModal(true);
    },

    closeModals() {
        const modals = document.querySelectorAll('.api-key-modal-main, .modal.active');
        modals.forEach(modal => modal.remove());
    }
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    // Add global CSS for API key modal
    const style = document.createElement('style');
    style.textContent = `
        .api-key-modal-main {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .api-modal-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(5px);
        }
        
        .api-modal-content {
            position: relative;
            background: var(--yin);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            width: 90%;
            max-width: 500px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            animation: modalSlideIn 0.3s ease;
        }
        
        @keyframes modalSlideIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .api-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .api-modal-header h3 {
            color: var(--yang);
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 1.3rem;
        }
        
        .api-modal-close {
            background: none;
            border: none;
            color: var(--yang);
            font-size: 1.5rem;
            cursor: pointer;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.2s;
        }
        
        .api-modal-close:hover {
            background: rgba(255, 255, 255, 0.1);
        }
        
        .api-modal-body {
            padding: 20px;
        }
        
        .api-modal-body p {
            color: var(--accent);
            margin-bottom: 20px;
            line-height: 1.5;
        }
        
        .api-key-input-group {
            margin-bottom: 20px;
        }
        
        .api-key-input-group label {
            display: block;
            color: var(--yang);
            margin-bottom: 8px;
            font-weight: 500;
        }
        
        .input-with-button {
            display: flex;
            gap: 10px;
            margin-bottom: 8px;
        }
        
        .input-with-button input {
            flex: 1;
            padding: 12px 15px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            color: var(--yang);
            font-size: 1rem;
        }
        
        .input-with-button input:focus {
            outline: none;
            border-color: var(--accent);
        }
        
        .input-with-button button {
            padding: 0 15px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            color: var(--yang);
            cursor: pointer;
        }
        
        .api-key-hint {
            display: block;
            font-size: 0.85rem;
            color: var(--accent-light);
        }
        
        .api-key-hint a {
            color: var(--accent);
            text-decoration: underline;
        }
        
        .test-result {
            display: none;
            padding: 10px 15px;
            border-radius: 8px;
            margin: 15px 0;
            font-size: 0.9rem;
        }
        
        .test-result.success {
            display: block;
            background: rgba(76, 175, 80, 0.1);
            border: 1px solid rgba(76, 175, 80, 0.3);
            color: #4CAF50;
        }
        
        .test-result.error {
            display: block;
            background: rgba(244, 67, 54, 0.1);
            border: 1px solid rgba(244, 67, 54, 0.3);
            color: #f44336;
        }
        
        .test-result.warning {
            display: block;
            background: rgba(255, 152, 0, 0.1);
            border: 1px solid rgba(255, 152, 0, 0.3);
            color: #FF9800;
        }
        
        .api-modal-actions {
            display: flex;
            gap: 10px;
            margin: 20px 0;
        }
        
        .api-modal-actions button {
            flex: 1;
            padding: 12px;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            font-weight: 500;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.2s;
        }
        
        .btn-primary {
            background: var(--accent);
            color: var(--yin);
        }
        
        .btn-secondary {
            background: rgba(255, 255, 255, 0.1);
            color: var(--yang);
        }
        
        .api-modal-actions button:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        }
        
        .api-modal-actions button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none !important;
        }
        
        .api-tips {
            margin-top: 25px;
            padding: 15px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
            border-left: 4px solid var(--accent);
        }
        
        .api-tips h4 {
            color: var(--yang);
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .api-tips ul {
            padding-left: 20px;
            color: var(--accent-light);
        }
        
        .api-tips li {
            margin-bottom: 5px;
            font-size: 0.9rem;
        }
        
        .toast {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: var(--yin);
            color: var(--yang);
            padding: 12px 20px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
            display: none;
            z-index: 10000;
            max-width: 400px;
        }
        
        .toast.show {
            display: block;
            animation: toastSlideIn 0.3s ease;
        }
        
        @keyframes toastSlideIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .toast-success {
            border-left: 4px solid #4CAF50;
        }
        
        .toast-error {
            border-left: 4px solid #f44336;
        }
        
        .toast-info {
            border-left: 4px solid var(--accent);
        }
        
        .toast-warning {
            border-left: 4px solid #FF9800;
        }
    `;
    document.head.appendChild(style);
    
    // Initialize chat
    chat.init();
    
    // Clear any broken API keys on load
    setTimeout(() => {
        const brokenKey = "sk-ce242eb3749d4b9c88f6416b008d6836";
        const currentKey = localStorage.getItem('deepseek_api_key_v2');
        if (currentKey === brokenKey) {
            localStorage.removeItem('deepseek_api_key_v2');
            ApiKeySystem.showApiKeyModal(true);
        }
    }, 500);
});
