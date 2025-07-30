const nodemailer = require('nodemailer');
const fs = require('fs-extra');
const path = require('path');

class EmailService {
  constructor() {
    this.transporter = null;
  }

  async createTransporter(settings) {
    const { emailProvider, smtpHost, smtpPort, smtpSecure, emailUser, emailPassword } = settings;
    
    let config;
    
    if (emailProvider === 'gmail') {
      config = {
        service: 'gmail',
        auth: {
          user: emailUser,
          pass: emailPassword
        }
      };
    } else if (emailProvider === 'outlook') {
      config = {
        service: 'hotmail',
        auth: {
          user: emailUser,
          pass: emailPassword
        }
      };
    } else {
      // Custom SMTP
      config = {
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: emailUser,
          pass: emailPassword
        }
      };
    }
    
    this.transporter = nodemailer.createTransporter(config);
    return this.transporter;
  }

  async testConnection(settings) {
    try {
      const transporter = await this.createTransporter(settings);
      await transporter.verify();
      return { success: true, message: 'Email configuration is valid' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async sendEmail(lead, settings) {
    try {
      if (!this.transporter) {
        await this.createTransporter(settings);
      }

      // Parse email content to extract subject and body
      const { subject, body } = this.parseEmailContent(lead.email_content);
      
      // Prepare email options
      const mailOptions = {
        from: `${settings.senderName} <${settings.emailUser}>`,
        to: lead.contact_email,
        subject: subject,
        html: this.formatEmailBody(body, lead),
        attachments: []
      };

      // Add mockup attachment if exists
      if (lead.mockup_path && await fs.pathExists(lead.mockup_path)) {
        mailOptions.attachments.push({
          filename: `${lead.company_name}_App_Mockup.png`,
          path: lead.mockup_path,
          cid: 'mockup_image'
        });
        
        // Add image reference to email body
        mailOptions.html += `
          <br><br>
          <p><strong>Here's a visual mockup of the app concept:</strong></p>
          <img src="cid:mockup_image" alt="App Mockup" style="max-width: 300px; height: auto; border: 1px solid #ddd; border-radius: 8px;">
        `;
      }

      // Send email
      const result = await this.transporter.sendMail(mailOptions);
      
      return {
        success: true,
        messageId: result.messageId,
        message: 'Email sent successfully'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  parseEmailContent(emailContent) {
    const lines = emailContent.split('\n');
    let subject = 'Partnership Opportunity';
    let body = emailContent;
    
    // Look for subject line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.toLowerCase().startsWith('subject:')) {
        subject = line.substring(8).trim();
        // Remove subject line from body
        body = lines.slice(i + 1).join('\n').trim();
        break;
      }
    }
    
    return { subject, body };
  }

  formatEmailBody(body, lead) {
    // Convert plain text to HTML with basic formatting
    let htmlBody = body
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
    
    // Add professional email styling
    const styledBody = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px;">
        ${htmlBody}
        
        <br>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
          <p>This email was sent using ProspectForge AI - Automated Outreach System</p>
        </div>
      </div>
    `;
    
    return styledBody;
  }

  async sendTestEmail(settings) {
    try {
      if (!this.transporter) {
        await this.createTransporter(settings);
      }

      const testMailOptions = {
        from: `${settings.senderName} <${settings.emailUser}>`,
        to: settings.emailUser, // Send to self
        subject: 'ProspectForge AI - Test Email',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px;">
            <h2>ProspectForge AI Test Email</h2>
            <p>Congratulations! Your email configuration is working correctly.</p>
            <p>You can now start sending automated outreach emails to your prospects.</p>
            <br>
            <p>Best regards,<br>ProspectForge AI</p>
          </div>
        `
      };

      const result = await this.transporter.sendMail(testMailOptions);
      
      return {
        success: true,
        messageId: result.messageId,
        message: 'Test email sent successfully'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = EmailService;