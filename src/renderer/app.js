const { ipcRenderer } = require('electron');

class ProspectForgeUI {
    constructor() {
        this.currentPage = 'dashboard';
        this.currentCampaignId = null;
        this.currentLeadId = null;
        this.isProcessing = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadDashboard();
        this.loadSettings();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.sidebar-menu a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.closest('a').dataset.page;
                this.navigateTo(page);
            });
        });

        // Campaign creation
        document.getElementById('new-campaign-btn').addEventListener('click', () => {
            this.showCampaignModal();
        });
        document.getElementById('new-campaign-btn-2').addEventListener('click', () => {
            this.showCampaignModal();
        });

        // Campaign form
        document.getElementById('campaign-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createCampaign();
        });

        // Modal controls
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });

        document.getElementById('cancel-campaign').addEventListener('click', () => {
            document.getElementById('campaign-modal').style.display = 'none';
        });

        // Settings
        document.getElementById('save-settings-btn').addEventListener('click', () => {
            this.saveSettings();
        });

        document.getElementById('test-ollama-btn').addEventListener('click', () => {
            this.testOllamaConnection();
        });

        document.getElementById('test-sd-btn').addEventListener('click', () => {
            this.testStableDiffusionConnection();
        });

        document.getElementById('test-email-btn').addEventListener('click', () => {
            this.testEmailConnection();
        });

        // Email provider change
        document.getElementById('email-provider').addEventListener('change', (e) => {
            this.toggleCustomSMTPSettings(e.target.value);
        });

        // Campaign filter
        document.getElementById('campaign-filter').addEventListener('change', (e) => {
            this.filterLeads(e.target.value);
        });

        // IPC Event Listeners
        this.setupIpcListeners();
    }

    setupIpcListeners() {
        ipcRenderer.on('processing-started', () => {
            this.showProcessingStatus();
        });

        ipcRenderer.on('processing-update', (event, message) => {
            this.updateProcessingMessage(message);
        });

        ipcRenderer.on('leads-scraped', (event, count) => {
            this.updateProcessingMessage(`Found ${count} leads. Starting AI processing...`);
        });

        ipcRenderer.on('lead-processed', (event, leadId) => {
            this.updateProcessingMessage(`Lead processed successfully`);
        });

        ipcRenderer.on('processing-completed', () => {
            this.hideProcessingStatus();
            this.showToast('Campaign processing completed!', 'success');
            this.loadDashboard();
            this.loadCampaigns();
        });

        ipcRenderer.on('processing-error', (event, error) => {
            this.hideProcessingStatus();
            this.showToast(`Processing error: ${error}`, 'error');
        });
    }

    // Navigation
    navigateTo(page) {
        // Update sidebar
        document.querySelectorAll('.sidebar-menu a').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-page="${page}"]`).classList.add('active');

        // Update pages
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });
        document.getElementById(`${page}-page`).classList.add('active');

        this.currentPage = page;

        // Load page data
        switch (page) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'campaigns':
                this.loadCampaigns();
                break;
            case 'leads':
                this.loadLeads();
                break;
            case 'settings':
                this.loadSettings();
                break;
        }
    }

    // Dashboard
    async loadDashboard() {
        try {
            const campaigns = await ipcRenderer.invoke('get-campaigns');
            
            // Update stats
            const totalCampaigns = campaigns.length;
            const totalLeads = campaigns.reduce((sum, c) => sum + (c.total_leads || 0), 0);
            const emailsSent = campaigns.reduce((sum, c) => sum + (c.sent_leads || 0), 0);
            const pendingReview = campaigns.reduce((sum, c) => sum + (c.ready_leads || 0), 0);

            document.getElementById('total-campaigns').textContent = totalCampaigns;
            document.getElementById('total-leads').textContent = totalLeads;
            document.getElementById('emails-sent').textContent = emailsSent;
            document.getElementById('pending-review').textContent = pendingReview;

            // Load recent campaigns
            this.renderRecentCampaigns(campaigns.slice(0, 5));
        } catch (error) {
            this.showToast('Error loading dashboard', 'error');
        }
    }

    renderRecentCampaigns(campaigns) {
        const container = document.getElementById('recent-campaigns-list');
        
        if (campaigns.length === 0) {
            container.innerHTML = '<p class="text-muted">No campaigns yet. Create your first campaign to get started!</p>';
            return;
        }

        container.innerHTML = campaigns.map(campaign => `
            <div class="campaign-card">
                <div class="campaign-header">
                    <h3 class="campaign-title">${campaign.name}</h3>
                    <span class="status-badge status-${campaign.status.toLowerCase()}">${campaign.status}</span>
                </div>
                <div class="campaign-meta">
                    <div class="meta-item">
                        <i class="fas fa-users"></i>
                        <span>${campaign.total_leads || 0} leads</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-envelope"></i>
                        <span>${campaign.sent_leads || 0} sent</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-clock"></i>
                        <span>${new Date(campaign.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="campaign-actions">
                    <button class="btn btn-secondary" onclick="ui.viewCampaignLeads(${campaign.id})">
                        View Leads
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Campaigns
    async loadCampaigns() {
        try {
            const campaigns = await ipcRenderer.invoke('get-campaigns');
            this.renderCampaigns(campaigns);
            this.updateCampaignFilter(campaigns);
        } catch (error) {
            this.showToast('Error loading campaigns', 'error');
        }
    }

    renderCampaigns(campaigns) {
        const container = document.getElementById('campaigns-list');
        
        if (campaigns.length === 0) {
            container.innerHTML = '<p class="text-muted">No campaigns yet. Create your first campaign to get started!</p>';
            return;
        }

        container.innerHTML = campaigns.map(campaign => `
            <div class="campaign-card">
                <div class="campaign-header">
                    <h3 class="campaign-title">${campaign.name}</h3>
                    <span class="status-badge status-${campaign.status.toLowerCase()}">${campaign.status}</span>
                </div>
                <div class="campaign-meta">
                    <div class="meta-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${campaign.location}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-building"></i>
                        <span>${campaign.business_type}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-users"></i>
                        <span>${campaign.total_leads || 0} leads</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-envelope"></i>
                        <span>${campaign.sent_leads || 0} sent</span>
                    </div>
                </div>
                <div class="campaign-actions">
                    <button class="btn btn-primary" onclick="ui.viewCampaignLeads(${campaign.id})">
                        View Leads
                    </button>
                </div>
            </div>
        `).join('');
    }

    updateCampaignFilter(campaigns) {
        const filter = document.getElementById('campaign-filter');
        filter.innerHTML = '<option value="">All Campaigns</option>' +
            campaigns.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }

    // Leads
    async loadLeads(campaignId = null) {
        try {
            let leads = [];
            
            if (campaignId) {
                leads = await ipcRenderer.invoke('get-leads', campaignId);
            } else {
                // Load all leads from all campaigns
                const campaigns = await ipcRenderer.invoke('get-campaigns');
                for (const campaign of campaigns) {
                    const campaignLeads = await ipcRenderer.invoke('get-leads', campaign.id);
                    leads.push(...campaignLeads.map(lead => ({ ...lead, campaign_name: campaign.name })));
                }
            }
            
            this.renderLeads(leads);
        } catch (error) {
            this.showToast('Error loading leads', 'error');
        }
    }

    renderLeads(leads) {
        const container = document.getElementById('leads-list');
        
        if (leads.length === 0) {
            container.innerHTML = '<p class="text-muted">No leads found.</p>';
            return;
        }

        container.innerHTML = leads.map(lead => `
            <div class="lead-card">
                <div class="lead-header">
                    <h3 class="lead-title">${lead.company_name}</h3>
                    <span class="status-badge status-${lead.status.toLowerCase().replace('_', '-')}">${lead.status.replace('_', ' ')}</span>
                </div>
                <div class="lead-meta">
                    <div class="meta-item">
                        <i class="fas fa-globe"></i>
                        <span>${lead.website_url || 'No website'}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-envelope"></i>
                        <span>${lead.contact_email || 'No email'}</span>
                    </div>
                    ${lead.campaign_name ? `
                    <div class="meta-item">
                        <i class="fas fa-bullhorn"></i>
                        <span>${lead.campaign_name}</span>
                    </div>
                    ` : ''}
                </div>
                <div class="lead-actions">
                    <button class="btn btn-secondary" onclick="ui.viewLeadDetails(${lead.id})">
                        View Details
                    </button>
                    ${lead.status === 'REVIEW_PENDING' ? `
                    <button class="btn btn-success" onclick="ui.sendLeadEmail(${lead.id})">
                        Send Email
                    </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    async viewCampaignLeads(campaignId) {
        this.currentCampaignId = campaignId;
        this.navigateTo('leads');
        document.getElementById('campaign-filter').value = campaignId;
        await this.loadLeads(campaignId);
    }

    async filterLeads(campaignId) {
        await this.loadLeads(campaignId || null);
    }

    async viewLeadDetails(leadId) {
        try {
            const lead = await ipcRenderer.invoke('get-lead-details', leadId);
            this.showLeadModal(lead);
        } catch (error) {
            this.showToast('Error loading lead details', 'error');
        }
    }

    showLeadModal(lead) {
        this.currentLeadId = lead.id;
        
        document.getElementById('lead-modal-title').textContent = lead.company_name;
        
        let content = `
            <div class="lead-details">
                <div class="detail-section">
                    <h3>Company Information</h3>
                    <p><strong>Name:</strong> ${lead.company_name}</p>
                    <p><strong>Website:</strong> ${lead.website_url || 'Not available'}</p>
                    <p><strong>Email:</strong> ${lead.contact_email || 'Not available'}</p>
                    <p><strong>Status:</strong> ${lead.status.replace('_', ' ')}</p>
                </div>
        `;

        if (lead.brand_analysis) {
            const analysis = JSON.parse(lead.brand_analysis);
            content += `
                <div class="detail-section">
                    <h3>Brand Analysis</h3>
                    <pre class="email-preview">${analysis.analysis || 'Analysis not available'}</pre>
                </div>
            `;
        }

        if (lead.app_concept) {
            const concept = JSON.parse(lead.app_concept);
            content += `
                <div class="detail-section">
                    <h3>App Concept</h3>
                    <pre class="email-preview">${concept.concepts || 'Concept not available'}</pre>
                </div>
            `;
        }

        if (lead.mockup_path) {
            content += `
                <div class="detail-section">
                    <h3>Mockup Preview</h3>
                    <img src="file://${lead.mockup_path}" alt="App Mockup" class="mockup-preview">
                </div>
            `;
        }

        if (lead.email_content) {
            content += `
                <div class="detail-section">
                    <h3>Email Content</h3>
                    <textarea class="form-input" rows="10" id="email-content-edit">${lead.email_content}</textarea>
                    <button class="btn btn-secondary mt-20" onclick="ui.updateLeadEmail()">Update Email</button>
                </div>
            `;
        }

        content += '</div>';
        
        document.getElementById('lead-details-content').innerHTML = content;
        
        // Show/hide send email button
        const sendBtn = document.getElementById('send-email-btn');
        if (lead.status === 'REVIEW_PENDING' && lead.contact_email) {
            sendBtn.style.display = 'block';
            sendBtn.onclick = () => this.sendLeadEmail(lead.id);
        } else {
            sendBtn.style.display = 'none';
        }
        
        document.getElementById('lead-modal').style.display = 'block';
    }

    async updateLeadEmail() {
        const newContent = document.getElementById('email-content-edit').value;
        try {
            await ipcRenderer.invoke('update-lead-email', this.currentLeadId, newContent);
            this.showToast('Email content updated', 'success');
        } catch (error) {
            this.showToast('Error updating email', 'error');
        }
    }

    async sendLeadEmail(leadId) {
        try {
            const result = await ipcRenderer.invoke('send-email', leadId);
            if (result.success) {
                this.showToast('Email sent successfully!', 'success');
                document.getElementById('lead-modal').style.display = 'none';
                this.loadLeads();
                this.loadDashboard();
            } else {
                this.showToast(`Error sending email: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showToast('Error sending email', 'error');
        }
    }

    // Campaign Creation
    showCampaignModal() {
        document.getElementById('campaign-modal').style.display = 'block';
    }

    async createCampaign() {
        const businessType = document.getElementById('business-type').value;
        const location = document.getElementById('location').value;
        const numberOfLeads = parseInt(document.getElementById('number-of-leads').value);

        if (!businessType || !location || !numberOfLeads) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }

        try {
            const result = await ipcRenderer.invoke('create-campaign', {
                businessType,
                location,
                numberOfLeads
            });

            if (result.success) {
                document.getElementById('campaign-modal').style.display = 'none';
                document.getElementById('campaign-form').reset();
                this.showToast('Campaign created! Processing will begin shortly.', 'success');
            } else {
                this.showToast(`Error creating campaign: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showToast('Error creating campaign', 'error');
        }
    }

    // Settings
    async loadSettings() {
        try {
            const settings = await ipcRenderer.invoke('get-settings');
            
            // AI Settings
            document.getElementById('ollama-url').value = settings.ollamaUrl || '';
            document.getElementById('ollama-model').value = settings.ollamaModel || 'llama3';
            document.getElementById('sd-url').value = settings.stableDiffusionUrl || '';
            
            // Email Settings
            document.getElementById('email-provider').value = settings.emailProvider || 'gmail';
            document.getElementById('sender-name').value = settings.senderName || '';
            document.getElementById('email-user').value = settings.emailUser || '';
            document.getElementById('email-password').value = settings.emailPassword || '';
            document.getElementById('smtp-host').value = settings.smtpHost || '';
            document.getElementById('smtp-port').value = settings.smtpPort || 587;
            document.getElementById('smtp-secure').checked = settings.smtpSecure || false;
            
            this.toggleCustomSMTPSettings(settings.emailProvider);
        } catch (error) {
            this.showToast('Error loading settings', 'error');
        }
    }

    async saveSettings() {
        const settings = {
            ollamaUrl: document.getElementById('ollama-url').value,
            ollamaModel: document.getElementById('ollama-model').value,
            stableDiffusionUrl: document.getElementById('sd-url').value,
            emailProvider: document.getElementById('email-provider').value,
            senderName: document.getElementById('sender-name').value,
            emailUser: document.getElementById('email-user').value,
            emailPassword: document.getElementById('email-password').value,
            smtpHost: document.getElementById('smtp-host').value,
            smtpPort: parseInt(document.getElementById('smtp-port').value),
            smtpSecure: document.getElementById('smtp-secure').checked
        };

        try {
            const result = await ipcRenderer.invoke('save-settings', settings);
            if (result.success) {
                this.showToast('Settings saved successfully!', 'success');
            } else {
                this.showToast(`Error saving settings: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showToast('Error saving settings', 'error');
        }
    }

    toggleCustomSMTPSettings(provider) {
        const customSettings = document.getElementById('custom-smtp-settings');
        customSettings.style.display = provider === 'custom' ? 'block' : 'none';
    }

    async testOllamaConnection() {
        const url = document.getElementById('ollama-url').value;
        if (!url) {
            this.showToast('Please enter Ollama URL', 'error');
            return;
        }

        try {
            const result = await ipcRenderer.invoke('test-ollama-connection', url);
            if (result.success) {
                this.showToast('Ollama connection successful!', 'success');
                
                // Update model dropdown
                const modelSelect = document.getElementById('ollama-model');
                modelSelect.innerHTML = result.models.map(model => 
                    `<option value="${model.name}">${model.name}</option>`
                ).join('');
            } else {
                this.showToast(`Ollama connection failed: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showToast('Error testing Ollama connection', 'error');
        }
    }

    async testStableDiffusionConnection() {
        const url = document.getElementById('sd-url').value;
        if (!url) {
            this.showToast('Please enter Stable Diffusion URL', 'error');
            return;
        }

        try {
            const result = await ipcRenderer.invoke('test-sd-connection', url);
            if (result.success) {
                this.showToast('Stable Diffusion connection successful!', 'success');
            } else {
                this.showToast(`Stable Diffusion connection failed: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showToast('Error testing Stable Diffusion connection', 'error');
        }
    }

    async testEmailConnection() {
        this.showToast('Sending test email...', 'info');
        // Implementation would call email service test
    }

    // Processing Status
    showProcessingStatus() {
        document.getElementById('processing-status').style.display = 'flex';
        this.isProcessing = true;
    }

    hideProcessingStatus() {
        document.getElementById('processing-status').style.display = 'none';
        this.isProcessing = false;
    }

    updateProcessingMessage(message) {
        document.getElementById('processing-message').textContent = message;
    }

    // Toast Notifications
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span>${message}</span>
                <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        document.getElementById('toast-container').appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }
}

// Initialize the UI
const ui = new ProspectForgeUI();

// Make ui globally available for onclick handlers
window.ui = ui;