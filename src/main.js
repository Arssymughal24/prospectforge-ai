const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const Database = require('./database');
const LeadScraper = require('./services/leadScraper');
const AIService = require('./services/aiService');
const EmailService = require('./services/emailService');
const SettingsManager = require('./services/settingsManager');

class ProspectForgeApp {
  constructor() {
    this.mainWindow = null;
    this.database = new Database();
    this.leadScraper = new LeadScraper();
    this.aiService = new AIService();
    this.emailService = new EmailService();
    this.settingsManager = new SettingsManager();
    this.isProcessing = false;
  }

  async initialize() {
    await this.database.initialize();
    await this.settingsManager.initialize();
    this.setupIpcHandlers();
  }

  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true
      },
      icon: path.join(__dirname, '../assets/icon.png'),
      title: 'ProspectForge AI',
      show: false
    });

    this.mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
    
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
    });

    if (process.argv.includes('--dev')) {
      this.mainWindow.webContents.openDevTools();
    }
  }

  setupIpcHandlers() {
    // Campaign Management
    ipcMain.handle('create-campaign', async (event, campaignData) => {
      try {
        const campaign = await this.database.createCampaign(campaignData);
        this.startLeadProcessing(campaign.id, campaignData);
        return { success: true, campaign };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('get-campaigns', async () => {
      return await this.database.getCampaigns();
    });

    ipcMain.handle('get-leads', async (event, campaignId) => {
      return await this.database.getLeads(campaignId);
    });

    ipcMain.handle('get-lead-details', async (event, leadId) => {
      return await this.database.getLeadDetails(leadId);
    });

    ipcMain.handle('update-lead-email', async (event, leadId, emailContent) => {
      return await this.database.updateLeadEmail(leadId, emailContent);
    });

    ipcMain.handle('send-email', async (event, leadId) => {
      try {
        const lead = await this.database.getLeadDetails(leadId);
        const settings = await this.settingsManager.getSettings();
        
        const result = await this.emailService.sendEmail(lead, settings);
        if (result.success) {
          await this.database.updateLeadStatus(leadId, 'SENT');
        }
        return result;
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Settings Management
    ipcMain.handle('get-settings', async () => {
      return await this.settingsManager.getSettings();
    });

    ipcMain.handle('save-settings', async (event, settings) => {
      return await this.settingsManager.saveSettings(settings);
    });

    ipcMain.handle('test-ollama-connection', async (event, url) => {
      return await this.aiService.testOllamaConnection(url);
    });

    ipcMain.handle('test-sd-connection', async (event, url) => {
      return await this.aiService.testStableDiffusionConnection(url);
    });

    ipcMain.handle('get-ollama-models', async (event, url) => {
      return await this.aiService.getOllamaModels(url);
    });

    // File Operations
    ipcMain.handle('select-folder', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow, {
        properties: ['openDirectory']
      });
      return result.filePaths[0];
    });

    // Processing Status
    ipcMain.handle('get-processing-status', () => {
      return this.isProcessing;
    });
  }

  async startLeadProcessing(campaignId, campaignData) {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.mainWindow.webContents.send('processing-started');

    try {
      // Step 1: Scrape leads
      this.mainWindow.webContents.send('processing-update', 'Scraping leads...');
      const leads = await this.leadScraper.scrapeLeads(
        campaignData.businessType,
        campaignData.location,
        campaignData.numberOfLeads
      );

      // Save leads to database
      for (const lead of leads) {
        await this.database.createLead(campaignId, lead);
      }

      this.mainWindow.webContents.send('leads-scraped', leads.length);

      // Step 2: Process each lead
      const savedLeads = await this.database.getLeads(campaignId);
      for (let i = 0; i < savedLeads.length; i++) {
        const lead = savedLeads[i];
        this.mainWindow.webContents.send('processing-update', 
          `Processing lead ${i + 1}/${savedLeads.length}: ${lead.company_name}`);

        await this.processLead(lead);
        this.mainWindow.webContents.send('lead-processed', lead.id);
      }

    } catch (error) {
      console.error('Lead processing error:', error);
      this.mainWindow.webContents.send('processing-error', error.message);
    } finally {
      this.isProcessing = false;
      this.mainWindow.webContents.send('processing-completed');
    }
  }

  async processLead(lead) {
    try {
      const settings = await this.settingsManager.getSettings();
      
      // Step 1: Analyze website and brand
      const brandAnalysis = await this.aiService.analyzeBrand(lead.website_url, settings);
      
      // Step 2: Generate app concept
      const appConcept = await this.aiService.generateAppConcept(brandAnalysis, settings);
      
      // Step 3: Generate image prompt
      const imagePrompt = await this.aiService.generateImagePrompt(brandAnalysis, appConcept, settings);
      
      // Step 4: Generate mockup image
      const mockupPath = await this.aiService.generateMockup(imagePrompt, lead.company_name, settings);
      
      // Step 5: Generate personalized email
      const emailContent = await this.aiService.generateEmail(brandAnalysis, appConcept, lead, settings);
      
      // Update lead in database
      await this.database.updateLeadProcessing(lead.id, {
        brand_analysis: JSON.stringify(brandAnalysis),
        app_concept: JSON.stringify(appConcept),
        mockup_path: mockupPath,
        email_content: emailContent,
        status: 'REVIEW_PENDING'
      });

    } catch (error) {
      console.error(`Error processing lead ${lead.id}:`, error);
      await this.database.updateLeadStatus(lead.id, 'ERROR');
      throw error;
    }
  }
}

// App Event Handlers
const prospectForge = new ProspectForgeApp();

app.whenReady().then(async () => {
  await prospectForge.initialize();
  prospectForge.createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      prospectForge.createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  await prospectForge.database.close();
});