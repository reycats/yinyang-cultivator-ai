// ==================== CONFIGURATION ====================
const CONFIG = {
    API_KEY: "sk-ce242eb3749d4b9c88f6416b008d6836",
    API_URL: "https://api.deepseek.com/chat/completions",
    DEFAULT_MODEL: "deepseek-chat",
    MAX_TOKENS: 2000,
    DEFAULT_THEME: "dark",
    VERSION: "1.0.0"
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
    // Input & Output
    messageInput: document.getElementById('message-input'),
    sendBtn: document.getElementById('send-btn'),
    messagesContainer: document.getElementById('messages-container'),
    typingIndicator: document.getElementById('typing-indicator'),
    
    // Controls
    clearBtn: document.getElementById('clear-btn'),
    themeBtn: document.getElementById('theme-btn'),
    codeBtn: document.getElementById('code-btn'),
    exportBtn: document.getElementById('export-btn'),
    settingsBtn: document.getElementById('settings-btn'),
    attachBtn: document.getElementById('attach-btn'),
    voiceBtn: document.getElementById('voice-btn'),
    
    // Stats
    messageCount: document.getElementById('message-count'),
    tokenCount: document.getElementById('token-count'),
    apiStatus: document.getElementById('api-status'),
    statusText: document.getElementById('status-text'),
    
    // Modals
    settingsModal: document.getElementById('settings-modal'),
    aboutModal: document.getElementById('about-modal'),
    privacyModal: document.getElementById('privacy-modal'),
    
    // Modal elements
    apiKeyInput: document.getElementById('api-key-input'),
    toggleKeyBtn: document.getElementById('toggle-key-btn'),
    modelSelect: document.getElementById('model-select'),
    saveHistoryCheck: document.getElementById('save-history'),
    autoScrollCheck: document.getElementById('auto-scroll'),
    maxTokensRange: document.getElementById('max-tokens'),
    tokenValue: document.getElementById('token-value'),
    resetBtn: document.getElementById('reset-btn'),
    saveSettingsBtn: document.getElementById('save-settings'),
    
    // Footer buttons
    privacyBtn: document.getElementById('privacy-btn'),
    aboutBtn: document.getElementById('about-btn'),
    
    // Toast
    toast: document.getElementById('toast')
};

// ==================== UTILITY FUNCTIONS ====================
const utils = {
    // Toast notifications
    showToast(message, type = 'info', duration = 3000) {
        const toast = elements.toast;
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    },

    // Format timestamp
    formatTime(date = new Date()) {
        return date.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Estimate tokens
    estimateTokens(text) {
        return Math.ceil(text.length / 4);
    },

    // Save to localStorage
    saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.warn('LocalStorage error:', e);
        }
    },

    // Load from localStorage
    loadFromStorage(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.warn('LocalStorage error:', e);
            return defaultValue;
        }
    },

    // Copy to clipboard
    copyToClipboard(text) {
        navigator.clipboard.writeText(text)
            .then(() => this.showToast('Berhasil disalin!', 'success'))
            .catch(err => this.showToast('Gagal menyalin', 'error'));
    },

    // Export conversation
    exportConversation() {
        const data = {
            conversation: state.conversation,
            metadata: {
                exportedAt: new Date().toISOString(),
                messageCount: state.messageCount,
                totalTokens: state.totalTokens,
                model: state.currentModel
            }
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `yinyang-chat-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('Percakapan berhasil diekspor!', 'success');
    },

    // Import conversation
    importConversation(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.conversation && Array.isArray(data.conversation)) {
                    state.conversation = data.conversation;
                    state.messageCount = data.metadata?.messageCount || data.conversation.length;
                    state.totalTokens = data.metadata?.totalTokens || 0;
                    
                    this.showToast('Percakapan berhasil diimpor!', 'success');
                    chat.renderConversation();
                } else {
                    this.showToast('Format file tidak valid', 'error');
                }
            } catch (err) {
                this.showToast('Gagal membaca file', 'error');
            }
        };
        reader.readAsText(file);
    }
};

// ==================== CHAT FUNCTIONS ====================
const chat = {
    // Initialize chat
    async init() {
        this.loadState();
        this.setupEventListeners();
        await this.testConnection();
        this.renderConversation();
        
        // Auto-focus input
        setTimeout(() => {
            elements.messageInput.focus();
        }, 500);
        
        console.log('YinYang Cultivator AI initialized');
    },

    // Load saved state
    loadState() {
        const savedState = utils.loadFromStorage('yinyang-state');
        if (savedState) {
            state = { ...state, ...savedState };
        }

        // Load conversation
        if (state.settings.saveHistory) {
            const savedConv = utils.loadFromStorage('yinyang-conversation', []);
            state.conversation = savedConv;
            state.messageCount = savedConv.length;
            state.totalTokens = savedConv.reduce((sum, msg) => 
                sum + utils.estimateTokens(msg.content), 0
            );
        }

        // Apply theme
        document.documentElement.setAttribute('data-theme', 
            state.isDarkMode ? 'dark' : 'light'
        );
        
        // Update UI
        this.updateStats();
        this.updateThemeButton();
    },

    // Save state
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

    // Test API connection
    async testConnection() {
        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.API_KEY}`
                },
                body: JSON.stringify({
                    model: state.currentModel,
                    messages: [{ role: "user", content: "Test" }],
                    max_tokens: 1
                })
            });

            state.apiConnected = response.ok;
            
            if (state.apiConnected) {
                elements.statusText.textContent = 'API Connected';
                elements.apiStatus.textContent = 'API: Active';
                elements.apiStatus.style.color = 'var(--success)';
            } else {
                elements.statusText.textContent = 'API Error';
                elements.apiStatus.textContent = 'API: Error';
                elements.apiStatus.style.color = 'var(--error)';
            }
        } catch (error) {
            state.apiConnected = false;
            elements.statusText.textContent = 'API Offline';
            elements.apiStatus.textContent = 'API: Offline';
            elements.apiStatus.style.color = 'var(--warning)';
        }
    },

    // Send message
    async sendMessage() {
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
        elements.typingIndicator.classList.add('active');

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
            // Prepare messages for API
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
                    'Authorization': `Bearer ${CONFIG.API_KEY}`
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
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            const botReply = data.choices[0].message.content;

            // Add bot message
            this.addMessage('bot', botReply);
            
            // Add to conversation
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
            this.addMessage('bot', 
                `⚠️ **Error:** ${error.message}\n\n` +
                `Silakan cek koneksi atau API key Anda.`
            );
            
            elements.statusText.textContent = 'API Error';
            elements.apiStatus.textContent = 'API: Error';
            elements.apiStatus.style.color = 'var(--error)';
            
            utils.showToast('Gagal mengirim pesan', 'error');
        } finally {
            // Re-enable input
            state.isTyping = false;
            elements.messageInput.disabled = false;
            elements.sendBtn.disabled = false;
            elements.typingIndicator.classList.remove('active');
            elements.messageInput.focus();
            
            // Auto-scroll
            if (state.settings.autoScroll) {
                elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
            }
        }
    },

    // Add message to UI
    addMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        const avatarIcon = role === 'user' ? 'fas fa-user' : 'fas fa-yin-yang';
        const time = utils.formatTime();
        
        // Format content
        const formattedContent = this.formatMessageContent(content);
        
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
        
        // Auto-scroll if enabled
        if (state.settings.autoScroll) {
            setTimeout(() => {
                messageDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }, 100);
        }
    },

    // Format message content with markdown-like syntax
    formatMessageContent(content) {
        return content
            // Code blocks
            .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
            // Inline code
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            // Headers
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/^## (.+)$/gm, '<h2>$1</h2>')
            .replace(/^# (.+)$/gm, '<h1>$1</h1>')
            // Bold
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            // Italic
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            // Lists
            .replace(/^\s*[-*+]\s+(.+)$/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
            // Line breaks
            .replace(/\n/g, '<br>')
            // Links
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
            // Blockquotes
            .replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');
    },

    // Render conversation
    renderConversation() {
        elements.messagesContainer.innerHTML = '';
        
        if (state.conversation.length === 0) {
            // Add welcome message
            this.addMessage('bot', 
                `🎯 **Selamat datang, Cultivator!**\n\n` +
                `Saya adalah asisten AI dengan tema Yin Yang yang seimbang.\n\n` +
                `✨ **Fitur yang tersedia:**\n` +
                `• Diskusi mendalam\n` +
                `• Bantuan coding dan debugging\n` +
                `• Analisis teks dan dokumen\n` +
                `• Konsultasi filosofis\n\n` +
                `📱 **Tips penggunaan:**\n` +
                `• Tekan **Enter** untuk mengirim pesan\n` +
                `• **Shift+Enter** untuk baris baru\n` +
                `• Gunakan \`code\` untuk format kode\n` +
                `• Ekspor percakapan untuk backup\n\n` +
                `⚡ **Status:** API ${state.apiConnected ? 'Terhubung' : 'Offline'}`
            );
        } else {
            // Render all messages
            state.conversation.forEach(msg => {
                this.addMessage(msg.role, msg.content);
            });
        }
    },

    // Clear conversation
    clearConversation() {
        if (confirm('Apakah Anda yakin ingin menghapus seluruh percakapan?')) {
            state.conversation = [];
            state.messageCount = 0;
            state.totalTokens = 0;
            
            localStorage.removeItem('yinyang-conversation');
            this.renderConversation();
            this.updateStats();
            
            utils.showToast('Percakapan telah dibersihkan', 'success');
        }
    },

    // Toggle theme
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

    // Update theme button
    updateThemeButton() {
        const icon = state.isDarkMode ? 'fa-sun' : 'fa-moon';
        elements.themeBtn.innerHTML = `<i class="fas ${icon}"></i> Tema`;
    },

    // Toggle coding mode
    toggleCodingMode() {
        state.isCodingMode = !state.isCodingMode;
        
        const icon = state.isCodingMode ? 'fa-keyboard' : 'fa-code';
        elements.codeBtn.innerHTML = `<i class="fas ${icon}"></i> ${state.isCodingMode ? 'Normal Mode' : 'Coding Mode'}`;
        
        utils.showToast(
            `Mode ${state.isCodingMode ? 'coding' : 'normal'} diaktifkan`,
            'success'
        );
    },

    // Update stats display
    updateStats() {
        elements.messageCount.textContent = `${state.messageCount} Pesan`;
        elements.tokenCount.textContent = `~${state.totalTokens} Token`;
    },

    // Adjust textarea height
    adjustTextareaHeight() {
        const textarea = elements.messageInput;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    },

    // Setup event listeners
    setupEventListeners() {
        // Send message
        elements.sendBtn.addEventListener('click', () => this.sendMessage());
        
        // Enter to send, Shift+Enter for new line
        elements.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Auto-resize textarea
        elements.messageInput.addEventListener('input', () => this.adjustTextareaHeight());
        
        // Clear conversation
        elements.clearBtn.addEventListener('click', () => this.clearConversation());
        
        // Theme toggle
        elements.themeBtn.addEventListener('click', () => this.toggleTheme());
        
        // Coding mode toggle
        elements.codeBtn.addEventListener('click', () => this.toggleCodingMode());
        
        // Export
        elements.exportBtn.addEventListener('click', () => utils.exportConversation());
        
        // Settings
        elements.settingsBtn.addEventListener('click', () => this.openSettings());
        elements.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        elements.resetBtn.addEventListener('click', () => this.resetSettings());
        
        // About & Privacy
        elements.aboutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.openModal('about');
        });
        
        elements.privacyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.openModal('privacy');
        });
        
        // Toggle API key visibility
        elements.toggleKeyBtn.addEventListener('click', () => {
            const input = elements.apiKeyInput;
            const icon = elements.toggleKeyBtn.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.className = 'fas fa-eye-slash';
            } else {
                input.type = 'password';
                icon.className = 'fas fa-eye';
            }
        });
        
        // Max tokens slider
        elements.maxTokensRange.addEventListener('input', (e) => {
            elements.tokenValue.textContent = e.target.value;
        });
        
        // Close modals
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeModals());
        });
        
        // Close modals on outside click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModals();
                }
            });
        });
        
        // File attachment
        elements.attachBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,.txt,.md';
            
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    if (file.name.endsWith('.json')) {
                        utils.importConversation(file);
                    } else {
                        // Read text file
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            elements.messageInput.value = e.target.result;
                            this.adjustTextareaHeight();
                        };
                        reader.readAsText(file);
                    }
                }
            };
            
            input.click();
        });
        
        // Voice input (placeholder)
        elements.voiceBtn.addEventListener('click', () => {
            utils.showToast('Voice input belum tersedia', 'warning');
        });
        
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
            
            // Ctrl/Cmd + K to clear
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.clearConversation();
            }
        });
    },

    // Open modal
    openModal(type) {
        this.closeModals();
        
        switch(type) {
            case 'settings':
                this.loadSettingsToUI();
                elements.settingsModal.classList.add('active');
                break;
            case 'about':
                elements.aboutModal.classList.add('active');
                break;
            case 'privacy':
                elements.privacyModal.classList.add('active');
                break;
        }
    },

    // Close all modals
    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    },

    // Open settings
    openSettings() {
        this.openModal('settings');
    },

    // Load settings to UI
    loadSettingsToUI() {
        elements.apiKeyInput.value = CONFIG.API_KEY;
        elements.modelSelect.value = state.currentModel;
        elements.saveHistoryCheck.checked = state.settings.saveHistory;
        elements.autoScrollCheck.checked = state.settings.autoScroll;
        elements.maxTokensRange.value = state.settings.maxTokens;
        elements.tokenValue.textContent = state.settings.maxTokens;
    },

    // Save settings
    saveSettings() {
        // Update API key if changed
        const newApiKey = elements.apiKeyInput.value.trim();
        if (newApiKey && newApiKey !== CONFIG.API_KEY) {
            CONFIG.API_KEY = newApiKey;
            utils.showToast('API Key diperbarui', 'success');
        }
        
        // Update other settings
        state.currentModel = elements.modelSelect.value;
        state.settings.saveHistory = elements.saveHistoryCheck.checked;
        state.settings.autoScroll = elements.autoScrollCheck.checked;
        state.settings.maxTokens = parseInt(elements.maxTokensRange.value);
        
        // Save and test connection
        this.saveState();
        this.testConnection();
        this.closeModals();
        
        utils.showToast('Pengaturan disimpan', 'success');
    },

    // Reset settings
    resetSettings() {
        if (confirm('Reset semua pengaturan ke default?')) {
            state.settings = {
                saveHistory: true,
                autoScroll: true,
                maxTokens: CONFIG.MAX_TOKENS
            };
            
            this.loadSettingsToUI();
            this.saveState();
            
            utils.showToast('Pengaturan direset ke default', 'success');
        }
    }
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize chat
    chat.init();
    
    // Create floating particles
    createFloatingParticles();
    
    // Log version
    console.log(`YinYang Cultivator AI v${CONFIG.VERSION}`);
});

// ==================== VISUAL EFFECTS ====================
function createFloatingParticles() {
    const container = document.querySelector('.floating-particles');
    if (!container) return;
    
    const particleCount = 20;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'absolute';
        
        // Random size
        const size = Math.random() * 4 + 1;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        
        // Random color
        particle.style.backgroundColor = Math.random() > 0.5 ? 
            'var(--yang)' : 'var(--accent)';
        
        // Random position
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        
        // Random opacity
        particle.style.opacity = Math.random() * 0.3 + 0.1;
        
        // Random animation
        const duration = Math.random() * 30 + 20;
        const delay = Math.random() * 5;
        particle.style.animation = `
            float ${duration}s infinite ${delay}s linear
        `;
        
        // Add keyframes for floating animation
        if (!document.querySelector('#particle-keyframes')) {
            const style = document.createElement('style');
            style.id = 'particle-keyframes';
            style.textContent = `
                @keyframes float {
                    0% { transform: translate(0, 0) rotate(0deg); }
                    25% { transform: translate(${Math.random() * 100 - 50}px, ${Math.random() * 50 - 25}px) rotate(90deg); }
                    50% { transform: translate(${Math.random() * 100 - 50}px, ${Math.random() * 50 - 25}px) rotate(180deg); }
                    75% { transform: translate(${Math.random() * 100 - 50}px, ${Math.random() * 50 - 25}px) rotate(270deg); }
                    100% { transform: translate(0, 0) rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        container.appendChild(particle);
    }
}

// ==================== SERVICE WORKER (PWA) ====================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registered:', registration);
            })
            .catch(error => {
                console.log('ServiceWorker registration failed:', error);
            });
    });
}
