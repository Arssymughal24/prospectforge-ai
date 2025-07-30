const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs-extra');

class Database {
  constructor() {
    this.dbPath = path.join(process.cwd(), 'prospects.db');
    this.db = null;
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS campaigns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        business_type TEXT NOT NULL,
        location TEXT NOT NULL,
        number_of_leads INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'ACTIVE'
      )`,
      
      `CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id INTEGER NOT NULL,
        company_name TEXT NOT NULL,
        website_url TEXT,
        contact_email TEXT,
        brand_analysis TEXT,
        app_concept TEXT,
        mockup_path TEXT,
        email_content TEXT,
        status TEXT DEFAULT 'PENDING',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        processed_at DATETIME,
        sent_at DATETIME,
        FOREIGN KEY (campaign_id) REFERENCES campaigns (id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const table of tables) {
      await this.run(table);
    }
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Campaign Methods
  async createCampaign(campaignData) {
    const { businessType, location, numberOfLeads } = campaignData;
    const name = `${businessType} in ${location}`;
    
    const result = await this.run(
      'INSERT INTO campaigns (name, business_type, location, number_of_leads) VALUES (?, ?, ?, ?)',
      [name, businessType, location, numberOfLeads]
    );
    
    return { id: result.id, name, ...campaignData };
  }

  async getCampaigns() {
    return await this.all(`
      SELECT c.*, 
             COUNT(l.id) as total_leads,
             COUNT(CASE WHEN l.status = 'SENT' THEN 1 END) as sent_leads,
             COUNT(CASE WHEN l.status = 'REVIEW_PENDING' THEN 1 END) as ready_leads
      FROM campaigns c
      LEFT JOIN leads l ON c.id = l.campaign_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);
  }

  // Lead Methods
  async createLead(campaignId, leadData) {
    const { companyName, websiteUrl, contactEmail } = leadData;
    
    const result = await this.run(
      'INSERT INTO leads (campaign_id, company_name, website_url, contact_email) VALUES (?, ?, ?, ?)',
      [campaignId, companyName, websiteUrl, contactEmail]
    );
    
    return { id: result.id, campaign_id: campaignId, ...leadData };
  }

  async getLeads(campaignId) {
    return await this.all(
      'SELECT * FROM leads WHERE campaign_id = ? ORDER BY created_at DESC',
      [campaignId]
    );
  }

  async getLeadDetails(leadId) {
    return await this.get('SELECT * FROM leads WHERE id = ?', [leadId]);
  }

  async updateLeadProcessing(leadId, data) {
    const { brand_analysis, app_concept, mockup_path, email_content, status } = data;
    
    return await this.run(`
      UPDATE leads 
      SET brand_analysis = ?, app_concept = ?, mockup_path = ?, 
          email_content = ?, status = ?, processed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [brand_analysis, app_concept, mockup_path, email_content, status, leadId]);
  }

  async updateLeadEmail(leadId, emailContent) {
    return await this.run(
      'UPDATE leads SET email_content = ? WHERE id = ?',
      [emailContent, leadId]
    );
  }

  async updateLeadStatus(leadId, status) {
    const updateData = { status };
    if (status === 'SENT') {
      updateData.sent_at = 'CURRENT_TIMESTAMP';
    }
    
    const setClause = Object.keys(updateData).map(key => 
      key === 'sent_at' ? `${key} = CURRENT_TIMESTAMP` : `${key} = ?`
    ).join(', ');
    
    const values = Object.values(updateData).filter(val => val !== 'CURRENT_TIMESTAMP');
    values.push(leadId);
    
    return await this.run(`UPDATE leads SET ${setClause} WHERE id = ?`, values);
  }

  // Settings Methods
  async getSetting(key) {
    const row = await this.get('SELECT value FROM settings WHERE key = ?', [key]);
    return row ? JSON.parse(row.value) : null;
  }

  async setSetting(key, value) {
    return await this.run(`
      INSERT OR REPLACE INTO settings (key, value, updated_at) 
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `, [key, JSON.stringify(value)]);
  }

  async close() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('Error closing database:', err);
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = Database;