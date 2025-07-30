const Database = require('../database');
const path = require('path');
const fs = require('fs-extra');

class SettingsManager {
  constructor() {
    this.database = null;
    this.defaultSettings = {
      // AI Settings
      ollamaUrl: 'http://localhost:11434',
      ollamaModel: 'llama3',
      stableDiffusionUrl: 'http://127.0.0.1:7860',
      
      // Email Settings
      emailProvider: 'gmail',
      smtpHost: '',
      smtpPort: 587,
      smtpSecure: false,
      emailUser: '',
      emailPassword: '',
      senderName: '',
      
      // Scraping Settings
      maxLeadsPerSearch: 20,
      delayBetweenRequests: 2000,
      
      // File Settings
      mockupsDirectory: path.join(process.cwd(), 'mockups'),
      
      // Processing Settings
      enableBrandAnalysis: true,
      enableAppConcepts: true,
      enableMockupGeneration: true,
      enableEmailGeneration: true
    };
  }

  async initialize() {
    this.database = new Database();
    await this.database.initialize();
    
    // Ensure mockups directory exists
    await fs.ensureDir(this.defaultSettings.mockupsDirectory);
  }

  async getSettings() {
    try {
      const settings = { ...this.defaultSettings };
      
      // Load saved settings from database
      for (const key of Object.keys(this.defaultSettings)) {
        const savedValue = await this.database.getSetting(key);
        if (savedValue !== null) {
          settings[key] = savedValue;
        }
      }
      
      return settings;
    } catch (error) {
      console.error('Error loading settings:', error);
      return this.defaultSettings;
    }
  }

  async saveSettings(newSettings) {
    try {
      // Validate settings before saving
      const validationResult = this.validateSettings(newSettings);
      if (!validationResult.valid) {
        return { success: false, error: validationResult.error };
      }
      
      // Save each setting to database
      for (const [key, value] of Object.entries(newSettings)) {
        if (this.defaultSettings.hasOwnProperty(key)) {
          await this.database.setSetting(key, value);
        }
      }
      
      // Ensure mockups directory exists
      if (newSettings.mockupsDirectory) {
        await fs.ensureDir(newSettings.mockupsDirectory);
      }
      
      return { success: true, message: 'Settings saved successfully' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  validateSettings(settings) {
    // Validate Ollama URL
    if (settings.ollamaUrl && !this.isValidUrl(settings.ollamaUrl)) {
      return { valid: false, error: 'Invalid Ollama URL format' };
    }
    
    // Validate Stable Diffusion URL
    if (settings.stableDiffusionUrl && !this.isValidUrl(settings.stableDiffusionUrl)) {
      return { valid: false, error: 'Invalid Stable Diffusion URL format' };
    }
    
    // Validate email settings
    if (settings.emailUser && !this.isValidEmail(settings.emailUser)) {
      return { valid: false, error: 'Invalid email address format' };
    }
    
    // Validate SMTP port
    if (settings.smtpPort && (settings.smtpPort < 1 || settings.smtpPort > 65535)) {
      return { valid: false, error: 'SMTP port must be between 1 and 65535' };
    }
    
    // Validate numeric settings
    if (settings.maxLeadsPerSearch && settings.maxLeadsPerSearch < 1) {
      return { valid: false, error: 'Max leads per search must be at least 1' };
    }
    
    if (settings.delayBetweenRequests && settings.delayBetweenRequests < 1000) {
      return { valid: false, error: 'Delay between requests must be at least 1000ms' };
    }
    
    return { valid: true };
  }

  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async resetSettings() {
    try {
      // Clear all settings from database
      for (const key of Object.keys(this.defaultSettings)) {
        await this.database.setSetting(key, this.defaultSettings[key]);
      }
      
      return { success: true, message: 'Settings reset to defaults' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async exportSettings() {
    try {
      const settings = await this.getSettings();
      
      // Remove sensitive information
      const exportSettings = { ...settings };
      delete exportSettings.emailPassword;
      
      return { success: true, settings: exportSettings };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async importSettings(settingsData) {
    try {
      const validationResult = this.validateSettings(settingsData);
      if (!validationResult.valid) {
        return { success: false, error: validationResult.error };
      }
      
      return await this.saveSettings(settingsData);
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getEmailProviderConfig(provider) {
    const configs = {
      gmail: {
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false
      },
      outlook: {
        service: 'hotmail',
        host: 'smtp-mail.outlook.com',
        port: 587,
        secure: false
      },
      yahoo: {
        service: 'yahoo',
        host: 'smtp.mail.yahoo.com',
        port: 587,
        secure: false
      },
      custom: {
        service: null,
        host: '',
        port: 587,
        secure: false
      }
    };
    
    return configs[provider] || configs.custom;
  }
}

module.exports = SettingsManager;