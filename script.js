// ==================== DEEPKU AI CHAT - FIXED VERSION ====================
// Problem: API key 402/401 errors, models not working
// Solution: Use latest API format and proper models

// ==================== CONFIGURATION ====================
const CONFIG = {
    // API key akan diambil dari localStorage
    API_KEY: "", 
    // ENDPOINT YANG BENAR:
    API_URL: "https://api.deepseek.com/chat/completions",
    // MODELS YANG VALID (pilih salah satu):
    MODELS: [
        { id: "deepseek-chat", name: "DeepSeek Chat (Latest)" },
        { id: "deepseek-coder", name: "DeepSeek Coder" },
        { id: "deepseek-v3", name: "DeepSeek V3 (Beta)" },
        { id: "deepseek-v2", name: "DeepSeek V2" },
        { id: "deepseek-r1", name: "DeepSeek R1" }
    ],
    DEFAULT_MODEL: "deepseek-chat",
    MAX_TOKENS: 2000,
    DEFAULT_THEME: "dark",
    VERSION: "2.0.0"
};

// ==================== API KEY SYSTEM (FIXED) ====================
const DeepSeekAPI = {
    // Storage key (gunakan timestamp untuk hindari cache)
    STORAGE_KEY: 'deepseek_api_' + new Date().getFullYear() + '_' + (new Date().getMonth() + 1),
    
    // Get current API key
    getKey() {
        try {
            const key = localStorage.getItem(this.STORAGE_KEY);
            // Validasi format API key
            if (key && key.startsWith('sk-') && key.length > 30) {
                return key;
            }
            return null;
        } catch (e) {
            console.error('Error reading API key:', e);
            return null;
        }
    },
    
    // Save API key
    saveKey(key) {
        if (!key || !key.startsWith('sk-')) {
            return { success: false, message: 'Format API key tidak valid. Harus dimulai dengan "sk-"' };
        }
        
        try {
            // Juga simpan di sessionStorage untuk backup
            localStorage.setItem(this.STORAGE_KEY, key);
            sessionStorage.setItem('deepseek_session_key', key);
            return { success: true, message: 'API key disimpan' };
        } catch (e) {
            console.error('Error saving API key:', e);
            return { success: false, message: 'Gagal menyimpan API key. Coba clear cache browser.' };
        }
    },
    
    // Test API connection
    async testConnection(apiKey, model = CONFIG.DEFAULT_MODEL) {
        try {
            console.log('Testing API connection with model:', model);
            
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { 
                            role: "user", 
                            content: "Hello, please respond with 'OK' if you can read this." 
                        }
                    ],
                    max_tokens: 10,
                    temperature: 0.1
                }),
                // Timeout 10 detik
                signal: AbortSignal.timeout(10000)
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                let errorMsg = `Error ${response.status}: `;
                
                switch(response.status) {
                    case 401:
                        errorMsg += "API Key tidak valid atau tidak ada.";
                        break;
                    case 402:
                        errorMsg += "Kuota habis atau perlu upgrade plan. Cek di platform.deepseek.com";
                        break;
                    case 429:
                        errorMsg += "Terlalu banyak permintaan. Tunggu beberapa saat.";
                        break;
                    case 400:
                        errorMsg += "Permintaan tidak valid. " + (data.error?.message || '');
                        break;
                    default:
                        errorMsg += data.error?.message || 'Unknown error';
                }
                
                return { 
                    success: false, 
                    message: errorMsg,
                    status: response.status,
                    data: data
                };
            }
            
            return { 
                success: true, 
                message: '✅ API berhasil terkoneksi!',
                data: data
            };
            
        } catch (error) {
            console.error('Connection test error:', error);
            
            let errorMsg = 'Gagal terkoneksi: ';
            if (error.name === 'AbortError') {
                errorMsg += 'Timeout. Coba lagi.';
            } else if (error.message.includes('fetch')) {
                errorMsg += 'Network error. Cek koneksi internet.';
            } else {
                errorMsg += error.message;
            }
            
            return { 
                success: false, 
                message: errorMsg,
                error: error
            };
        }
    },
    
    // Send chat message
    async sendMessage(apiKey, messages, model = CONFIG.DEFAULT_MODEL, maxTokens = CONFIG.MAX_TOKENS) {
        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    max_tokens: maxTokens,
                    temperature: 0.7,
                    stream: false
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(`API Error ${response.status}: ${JSON.stringify(data.error || 'Unknown error')}`);
            }
            
            return {
                success: true,
                data: data,
                message: data.choices[0]?.message?.content || ''
            };
            
        } catch (error) {
            console.error('Send message error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // Get available models (from API if possible)
    async getAvailableModels(apiKey) {
        // DeepSeek doesn't have models endpoint, so return our list
        return CONFIG.MODELS;
    }
};

// ==================== UI MANAGEMENT ====================
const UI = {
    showToast(message, type = 'info', duration = 4000) {
        // Remove existing toasts
        document.querySelectorAll('.toast-message').forEach(toast => toast.remove());
        
        const toast = document.createElement('div');
        toast.className = `toast-message toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Show animation
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Auto remove
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },
    
    showApiKeyModal() {
        const modal = document.createElement('div');
        modal.className = 'api-modal-overlay';
        modal.innerHTML = `
            <div class="api-modal">
                <div class="api-modal-header">
                    <h3><i class="fas fa-key"></i> Setup API Key</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="api-modal-body">
                    <div class="setup-steps">
                        <div class="step">
                            <span class="step-number">1</span>
                            <div class="step-content">
                                <h4>Dapatkan API Key</h4>
                                <p>Buka <a href="https://platform.deepseek.com/api_keys" target="_blank" class="api-link">platform.deepseek.com/api_keys</a></p>
                                <p>Login dan buat API Key baru (gratis)</p>
                            </div>
                        </div>
                        
                        <div class="step">
                            <span class="step-number">2</span>
                            <div class="step-content">
                                <h4>Copy API Key</h4>
                                <p>Format: <code>sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</code></p>
                                <div class="api-key-input-container">
                                    <input type="password" id="api-key-input" 
                                           placeholder="Tempel API key di sini..." 
                                           class="api-key-input">
                                    <button type="button" id="toggle-key-visibility" class="toggle-btn">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="step">
                            <span class="step-number">3</span>
                            <div class="step-content">
                                <h4>Test Connection</h4>
                                <div class="test-section">
                                    <select id="test-model-select" class="model-select">
                                        ${CONFIG.MODELS.map(m => 
                                            `<option value="${m.id}">${m.name}</option>`
                                        ).join('')}
                                    </select>
                                    <button id="test-api-btn" class="test-btn">
                                        <i class="fas fa-bolt"></i> Test Connection
                                    </button>
                                </div>
                                <div id="test-result" class="test-result"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-actions">
                        <button id="save-api-btn" class="save-btn primary">
                            <i class="fas fa-save"></i> Save & Start Chatting
                        </button>
                        <button class="save-btn secondary" onclick="window.open('https://platform.deepseek.com/api_keys', '_blank')">
                            <i class="fas fa-external-link-alt"></i> Open DeepSeek Dashboard
                        </button>
                    </div>
                    
                    <div class="api-tips">
                        <h4><i class="fas fa-lightbulb"></i> Important Tips:</h4>
                        <ul>
                            <li><strong>Free tier available</strong> - Get free credits on signup</li>
                            <li><strong>Check your credits</strong> at platform.deepseek.com/usage</li>
                            <li>If 402 error: Your credits exhausted, need to recharge</li>
                            <li>If 401 error: API key invalid or format wrong</li>
                            <li>Clear browser cache if having issues</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listeners
        const closeBtn = modal.querySelector('.close-modal');
        const saveBtn = modal.querySelector('#save-api-btn');
        const testBtn = modal.querySelector('#test-api-btn');
        const input = modal.querySelector('#api-key-input');
        const toggleBtn = modal.querySelector('#toggle-key-visibility');
        const testResult = modal.querySelector('#test-result');
        
        // Close modal
        closeBtn.addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        // Toggle visibility
        toggleBtn.addEventListener('click', () => {
            const type = input.type === 'password' ? 'text' : 'password';
            input.type = type;
            toggleBtn.innerHTML = type === 'password' 
                ? '<i class="fas fa-eye"></i>' 
                : '<i class="fas fa-eye-slash"></i>';
        });
        
        // Test connection
        testBtn.addEventListener('click', async () => {
            const key = input.value.trim();
            if (!key || !key.startsWith('sk-')) {
                this.showTestResult(testResult, '❌ Please enter a valid API key starting with "sk-"', 'error');
                return;
            }
            
            const model = modal.querySelector('#test-model-select').value;
            
            testBtn.disabled = true;
            testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
            
            const result = await DeepSeekAPI.testConnection(key, model);
            
            testBtn.disabled = false;
            testBtn.innerHTML = '<i class="fas fa-bolt"></i> Test Connection';
            
            if (result.success) {
                this.showTestResult(testResult, result.message, 'success');
                input.style.borderColor = '#10B981';
            } else {
                this.showTestResult(testResult, result.message, 'error');
                input.style.borderColor = '#EF4444';
                
                // If 402, show recharge link
                if (result.status === 402) {
                    const rechargeMsg = document.createElement('div');
                    rechargeMsg.className = 'recharge-msg';
                    rechargeMsg.innerHTML = `
                        <p><strong>Need more credits?</strong></p>
                        <a href="https://platform.deepseek.com/usage" target="_blank" class="recharge-link">
                            <i class="fas fa-credit-card"></i> Check & Recharge Credits
                        </a>
                    `;
                    testResult.appendChild(rechargeMsg);
                }
            }
        });
        
        // Save API key
        saveBtn.addEventListener('click', async () => {
            const key = input.value.trim();
            if (!key || !key.startsWith('sk-')) {
                this.showTestResult(testResult, '❌ Please enter a valid API key', 'error');
                return;
            }
            
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            
            // Test first
            const testResultApi = await DeepSeekAPI.testConnection(key);
            
            if (!testResultApi.success) {
                this.showTestResult(testResult, testResultApi.message, 'error');
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fas fa-save"></i> Save & Start Chatting';
                return;
            }
            
            // Save if test passed
            const saveResult = DeepSeekAPI.saveKey(key);
            
            if (saveResult.success) {
                this.showTestResult(testResult, '✅ API key saved successfully!', 'success');
                
                // Wait a bit then reload
                setTimeout(() => {
                    modal.remove();
                    location.reload();
                }, 1500);
            } else {
                this.showTestResult(testResult, '❌ ' + saveResult.message, 'error');
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fas fa-save"></i> Save & Start Chatting';
            }
        });
        
        // Auto-paste detection
        input.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            if (value.startsWith('sk-') && value.length > 40) {
                input.style.borderColor = '#3B82F6';
            }
        });
        
        // Focus input
        setTimeout(() => input.focus(), 100);
    },
    
    showTestResult(container, message, type) {
        container.innerHTML = '';
        const resultDiv = document.createElement('div');
        resultDiv.className = `test-result-${type}`;
        resultDiv.innerHTML = `
            <div class="result-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        container.appendChild(resultDiv);
    }
};

// ==================== CHAT APPLICATION ====================
class ChatApp {
    constructor() {
        this.apiKey = null;
        this.model = CONFIG.DEFAULT_MODEL;
        this.conversation = [];
        this.isTyping = false;
        this.isDarkMode = true;
        
        // DOM Elements
        this.elements = {};
        this.initializeElements();
    }
    
    initializeElements() {
        this.elements = {
            // Chat elements
            messageInput: document.getElementById('message-input'),
            sendBtn: document.getElementById('send-btn'),
            messagesContainer: document.getElementById('messages-container'),
            typingIndicator: document.getElementById('typing-indicator'),
            
            // Control elements
            clearBtn: document.getElementById('clear-btn'),
            themeBtn: document.getElementById('theme-btn'),
            settingsBtn: document.getElementById('settings-btn'),
            
            // Status elements
            apiStatus: document.getElementById('api-status'),
            modelInfo: document.getElementById('model-info'),
            
            // Settings modal elements
            settingsModal: document.getElementById('settings-modal'),
            currentApiKey: document.getElementById('current-api-key'),
            modelSelect: document.getElementById('model-select'),
            saveSettingsBtn: document.getElementById('save-settings'),
            closeSettings: document.querySelector('.modal-close')
        };
    }
    
    async init() {
        console.log('Initializing DeepKu AI Chat...');
        
        // Load API key
        this.apiKey = DeepSeekAPI.getKey();
        
        // Check if API key exists
        if (!this.apiKey) {
            console.log('No API key found, showing modal...');
            setTimeout(() => UI.showApiKeyModal(), 1000);
        } else {
            console.log('API key found, testing connection...');
            await this.testApiConnection();
        }
        
        // Load saved conversation
        this.loadConversation();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Apply theme
        this.applyTheme();
        
        // Update UI
        this.updateUI();
        
        console.log('Chat app initialized successfully');
    }
    
    async testApiConnection() {
        if (!this.apiKey) return false;
        
        const testResult = await DeepSeekAPI.testConnection(this.apiKey, this.model);
        
        if (testResult.success) {
            this.elements.apiStatus.textContent = '✅ Connected';
            this.elements.apiStatus.className = 'status-connected';
            return true;
        } else {
            this.elements.apiStatus.textContent = '❌ Error: ' + testResult.message;
            this.elements.apiStatus.className = 'status-error';
            
            // Show API key modal if error
            if (testResult.status === 401 || testResult.status === 402) {
                setTimeout(() => UI.showApiKeyModal(), 1500);
            }
            
            return false;
        }
    }
    
    setupEventListeners() {
        // Send message
        if (this.elements.sendBtn) {
            this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        }
        
        // Enter to send
        if (this.elements.messageInput) {
            this.elements.messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
            
            // Auto-resize
            this.elements.messageInput.addEventListener('input', () => {
                this.elements.messageInput.style.height = 'auto';
                this.elements.messageInput.style.height = 
                    Math.min(this.elements.messageInput.scrollHeight, 200) + 'px';
            });
        }
        
        // Clear chat
        if (this.elements.clearBtn) {
            this.elements.clearBtn.addEventListener('click', () => this.clearChat());
        }
        
        // Toggle theme
        if (this.elements.themeBtn) {
            this.elements.themeBtn.addEventListener('click', () => this.toggleTheme());
        }
        
        // Settings
        if (this.elements.settingsBtn) {
            this.elements.settingsBtn.addEventListener('click', () => this.openSettings());
        }
        
        // Settings modal events
        if (this.elements.saveSettingsBtn) {
            this.elements.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        }
        
        if (this.elements.closeSettings) {
            this.elements.closeSettings.addEventListener('click', () => {
                this.elements.settingsModal.classList.remove('active');
            });
        }
    }
    
    async sendMessage() {
        // Check if we have API key
        if (!this.apiKey) {
            UI.showToast('Please set up your API key first', 'error');
            UI.showApiKeyModal();
            return;
        }
        
        // Get message
        const message = this.elements.messageInput?.value.trim();
        if (!message || this.isTyping) return;
        
        // Clear input
        if (this.elements.messageInput) {
            this.elements.messageInput.value = '';
            this.elements.messageInput.style.height = 'auto';
        }
        
        // Add user message to UI
        this.addMessage('user', message);
        
        // Add to conversation
        this.conversation.push({
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
        });
        
        // Show typing indicator
        this.showTyping(true);
        
        try {
            // Prepare messages for API
            const messages = this.conversation.map(msg => ({
                role: msg.role,
                content: msg.content
            }));
            
            // Send to API
            const result = await DeepSeekAPI.sendMessage(
                this.apiKey, 
                messages, 
                this.model,
                CONFIG.MAX_TOKENS
            );
            
            if (result.success) {
                const botReply = result.message;
                
                // Add bot message to UI
                this.addMessage('bot', botReply);
                
                // Add to conversation
                this.conversation.push({
                    role: 'assistant',
                    content: botReply,
                    timestamp: new Date().toISOString()
                });
                
                // Save conversation
                this.saveConversation();
                
                // Update API status
                this.elements.apiStatus.textContent = '✅ Connected';
                this.elements.apiStatus.className = 'status-connected';
                
            } else {
                throw new Error(result.error || 'Failed to get response');
            }
            
        } catch (error) {
            console.error('Send message error:', error);
            
            // Show error message
            let errorMsg = 'Error: ' + error.message;
            if (error.message.includes('402')) {
                errorMsg = 'API credits exhausted. Please recharge at platform.deepseek.com';
            } else if (error.message.includes('401')) {
                errorMsg = 'API key invalid. Please update your API key.';
                this.apiKey = null;
                localStorage.removeItem(DeepSeekAPI.STORAGE_KEY);
            }
            
            this.addMessage('bot', `⚠️ **Error:** ${errorMsg}`);
            
            // Update API status
            this.elements.apiStatus.textContent = '❌ API Error';
            this.elements.apiStatus.className = 'status-error';
            
            UI.showToast(errorMsg, 'error');
            
        } finally {
            this.showTyping(false);
        }
    }
    
    addMessage(role, content) {
        if (!this.elements.messagesContainer) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        const avatar = role === 'user' ? '👤' : '⚫';
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Format content (basic markdown)
        let formattedContent = content
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
        
        messageDiv.innerHTML = `
            <div class="avatar">${avatar}</div>
            <div class="message-content">
                <div class="message-text">${formattedContent}</div>
                <div class="message-time">${time}</div>
            </div>
        `;
        
        this.elements.messagesContainer.appendChild(messageDiv);
        
        // Scroll to bottom
        setTimeout(() => {
            messageDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 100);
    }
    
    showTyping(show) {
        this.isTyping = show;
        
        if (this.elements.typingIndicator) {
            if (show) {
                this.elements.typingIndicator.classList.add('active');
            } else {
                this.elements.typingIndicator.classList.remove('active');
            }
        }
        
        if (this.elements.sendBtn) {
            this.elements.sendBtn.disabled = show;
        }
        
        if (this.elements.messageInput) {
            this.elements.messageInput.disabled = show;
        }
    }
    
    clearChat() {
        if (this.conversation.length === 0) return;
        
        if (confirm('Clear all messages?')) {
            this.conversation = [];
            if (this.elements.messagesContainer) {
                this.elements.messagesContainer.innerHTML = '';
            }
            this.saveConversation();
            UI.showToast('Chat cleared', 'success');
        }
    }
    
    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        this.applyTheme();
        
        // Save theme preference
        localStorage.setItem('chat_theme', this.isDarkMode ? 'dark' : 'light');
        
        UI.showToast(`Switched to ${this.isDarkMode ? 'dark' : 'light'} mode`, 'success');
    }
    
    applyTheme() {
        document.documentElement.setAttribute('data-theme', 
            this.isDarkMode ? 'dark' : 'light'
        );
        
        // Update theme button
        if (this.elements.themeBtn) {
            const icon = this.isDarkMode ? 'fa-sun' : 'fa-moon';
            this.elements.themeBtn.innerHTML = `<i class="fas ${icon}"></i> Theme`;
        }
    }
    
    openSettings() {
        if (!this.elements.settingsModal) return;
        
        // Populate settings
        if (this.elements.currentApiKey) {
            this.elements.currentApiKey.value = this.apiKey 
                ? this.apiKey.substring(0, 8) + '...' + this.apiKey.substring(this.apiKey.length - 4)
                : 'Not set';
        }
        
        if (this.elements.modelSelect) {
            this.elements.modelSelect.innerHTML = CONFIG.MODELS
                .map(m => `<option value="${m.id}" ${m.id === this.model ? 'selected' : ''}>${m.name}</option>`)
                .join('');
        }
        
        this.elements.settingsModal.classList.add('active');
    }
    
    saveSettings() {
        // Update model
        if (this.elements.modelSelect) {
            this.model = this.elements.modelSelect.value;
            localStorage.setItem('chat_model', this.model);
            
            // Update model info
            if (this.elements.modelInfo) {
                const selectedModel = CONFIG.MODELS.find(m => m.id === this.model);
                this.elements.modelInfo.textContent = selectedModel ? selectedModel.name : this.model;
            }
        }
        
        this.elements.settingsModal.classList.remove('active');
        UI.showToast('Settings saved', 'success');
        
        // Test connection with new model
        if (this.apiKey) {
            this.testApiConnection();
        }
    }
    
    loadConversation() {
        try {
            const saved = localStorage.getItem('chat_conversation');
            if (saved) {
                this.conversation = JSON.parse(saved) || [];
                
                // Render existing messages
                if (this.elements.messagesContainer && this.conversation.length > 0) {
                    this.conversation.forEach(msg => {
                        this.addMessage(msg.role, msg.content);
                    });
                }
            }
        } catch (e) {
            console.error('Error loading conversation:', e);
            this.conversation = [];
        }
        
        // Load theme
        const savedTheme = localStorage.getItem('chat_theme');
        if (savedTheme) {
            this.isDarkMode = savedTheme === 'dark';
        }
        
        // Load model
        const savedModel = localStorage.getItem('chat_model');
        if (savedModel && CONFIG.MODELS.some(m => m.id === savedModel)) {
            this.model = savedModel;
        }
    }
    
    saveConversation() {
        try {
            // Only save last 50 messages to avoid localStorage limits
            const toSave = this.conversation.slice(-50);
            localStorage.setItem('chat_conversation', JSON.stringify(toSave));
        } catch (e) {
            console.error('Error saving conversation:', e);
        }
    }
    
    updateUI() {
        // Update model info
        if (this.elements.modelInfo) {
            const selectedModel = CONFIG.MODELS.find(m => m.id === this.model);
            this.elements.modelInfo.textContent = selectedModel ? selectedModel.name : this.model;
        }
        
        // Update API status
        if (this.apiKey) {
            this.elements.apiStatus.textContent = 'Checking...';
            this.elements.apiStatus.className = 'status-checking';
        } else {
            this.elements.apiStatus.textContent = '❌ No API Key';
            this.elements.apiStatus.className = 'status-error';
        }
    }
}

// ==================== INITIALIZE APP ====================
document.addEventListener('DOMContentLoaded', () => {
    const app = new ChatApp();
    window.chatApp = app; // Make accessible globally
    
    // Start the app
    setTimeout(() => app.init(), 500);
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + / for settings
        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
            e.preventDefault();
            app.openSettings();
        }
        
        // Ctrl/Cmd + K to clear
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            app.clearChat();
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            const modals = document.querySelectorAll('.modal.active, .api-modal-overlay');
            modals.forEach(modal => modal.remove());
        }
    });
    
    // Global function to show API key modal
    window.showApiKeyModal = () => UI.showApiKeyModal();
});

// ==================== ADD STYLES ====================
const addStyles = () => {
    const style = document.createElement('style');
    style.textContent = `
        /* Toast Messages */
        .toast-message {
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--yin);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            padding: 15px 20px;
            color: var(--yang);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            transform: translateY(-100px);
            opacity: 0;
            transition: all 0.3s ease;
            max-width: 400px;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .toast-message.show {
            transform: translateY(0);
            opacity: 1;
        }
        
        .toast-success {
            border-left: 4px solid #10B981;
        }
        
        .toast-error {
            border-left: 4px solid #EF4444;
        }
        
        .toast-info {
            border-left: 4px solid #3B82F6;
        }
        
        /* API Key Modal */
        .api-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            animation: fadeIn 0.3s ease;
        }
        
        .api-modal {
            background: var(--yin);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            width: 100%;
            max-width: 600px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            animation: slideUp 0.3s ease;
        }
        
        .api-modal-header {
            padding: 25px 30px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .api-modal-header h3 {
            color: var(--yang);
            font-size: 1.5rem;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .close-modal {
            background: none;
            border: none;
            color: var(--yang);
            font-size: 1.8rem;
            cursor: pointer;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.2s;
        }
        
        .close-modal:hover {
            background: rgba(255, 255, 255, 0.1);
        }
        
        .api-modal-body {
            padding: 30px;
        }
        
        .setup-steps {
            margin-bottom: 30px;
        }
        
        .step {
            display: flex;
            gap: 20px;
            margin-bottom: 25px;
            padding-bottom: 25px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .step:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
        }
        
        .step-number {
            width: 36px;
            height: 36px;
            background: var(--accent);
            color: var(--yin);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            flex-shrink: 0;
        }
        
        .step-content h4 {
            color: var(--yang);
            margin-bottom: 8px;
            font-size: 1.1rem;
        }
        
        .step-content p {
            color: var(--accent);
            line-height: 1.5;
            margin-bottom: 8px;
        }
        
        .api-link {
            color: var(--accent);
            text-decoration: underline;
            font-weight: 500;
        }
        
        .api-key-input-container {
            display: flex;
            gap: 10px;
            margin-top: 10px;
        }
        
        .api-key-input {
            flex: 1;
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 10px;
            color: var(--yang);
            font-family: monospace;
            font-size: 0.95rem;
        }
        
        .api-key-input:focus {
            outline: none;
            border-color: var(--accent);
        }
        
        .toggle-btn {
            padding: 0 20px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 10px;
            color: var(--yang);
            cursor: pointer;
        }
        
        .test-section {
            display: flex;
            gap: 10px;
            margin-top: 15px;
        }
        
        .model-select {
            flex: 1;
            padding: 10px 15px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            color: var(--yang);
        }
        
        .test-btn {
            padding: 10px 20px;
            background: rgba(59, 130, 246, 0.2);
            border: 1px solid rgba(59, 130, 246, 0.3);
            border-radius: 8px;
            color: #3B82F6;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 500;
        }
        
        .test-btn:hover:not(:disabled) {
            background: rgba(59, 130, 246, 0.3);
        }
        
        .test-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .test-result {
            margin-top: 15px;
            min-height: 50px;
        }
        
        .test-result-success,
        .test-result-error {
            padding: 12px 16px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .test-result-success {
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.2);
            color: #10B981;
        }
        
        .test-result-error {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.2);
            color: #EF4444;
        }
        
        .recharge-msg {
            margin-top: 10px;
            padding: 10px;
            background: rgba(239, 68, 68, 0.05);
            border-radius: 6px;
        }
        
        .recharge-link {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            color: #EF4444;
            text-decoration: none;
            margin-top: 5px;
            padding: 8px 12px;
            border-radius: 6px;
            background: rgba(239, 68, 68, 0.1);
        }
        
        .modal-actions {
            display: flex;
            gap: 15px;
            margin: 30px 0;
        }
        
        .save-btn {
            flex: 1;
            padding: 15px;
            border-radius: 10px;
            border: none;
            cursor: pointer;
            font-weight: 500;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            transition: all 0.2s;
        }
        
        .save-btn.primary {
            background: var(--accent);
            color: var(--yin);
        }
        
        .save-btn.secondary {
            background: rgba(255, 255, 255, 0.05);
            color: var(--yang);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .save-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
        }
        
        .api-tips {
            padding: 20px;
            background: rgba(255, 255, 255, 0.03);
            border-radius: 12px;
            border-left: 4px solid var(--accent);
        }
        
        .api-tips h4 {
            color: var(--yang);
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .api-tips ul {
            padding-left: 20px;
            color: var(--accent-light);
        }
        
        .api-tips li {
            margin-bottom: 8px;
            line-height: 1.5;
        }
        
        /* Status Indicators */
        .status-connected {
            color: #10B981;
        }
        
        .status-error {
            color: #EF4444;
        }
        
        .status-checking {
            color: #F59E0B;
        }
        
        /* Animations */
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes slideUp {
            from { 
                opacity: 0; 
                transform: translateY(50px); 
            }
            to { 
                opacity: 1; 
                transform: translateY(0); 
            }
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            .api-modal {
                margin: 10px;
            }
            
            .api-modal-header {
                padding: 20px;
            }
            
            .api-modal-body {
                padding: 20px;
            }
            
            .modal-actions {
                flex-direction: column;
            }
            
            .test-section {
                flex-direction: column;
            }
        }
    `;
    
    document.head.appendChild(style);
};

// Add styles when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addStyles);
} else {
    addStyles();
}
