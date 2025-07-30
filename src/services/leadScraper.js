const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

class LeadScraper {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    this.page = await this.browser.newPage();
    
    // Set user agent to avoid detection
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Set viewport
    await this.page.setViewport({ width: 1366, height: 768 });
  }

  async scrapeLeads(businessType, location, numberOfLeads) {
    if (!this.browser) {
      await this.initialize();
    }

    const leads = [];
    const searchQueries = this.generateSearchQueries(businessType, location);
    
    for (const query of searchQueries) {
      if (leads.length >= numberOfLeads) break;
      
      try {
        const queryLeads = await this.scrapeSearchResults(query, numberOfLeads - leads.length);
        leads.push(...queryLeads);
        
        // Add delay between searches to avoid rate limiting
        await this.delay(2000 + Math.random() * 3000);
      } catch (error) {
        console.error(`Error scraping query "${query}":`, error);
      }
    }

    await this.cleanup();
    return leads.slice(0, numberOfLeads);
  }

  generateSearchQueries(businessType, location) {
    const queries = [
      `${businessType} ${location}`,
      `${businessType} companies ${location}`,
      `${businessType} services ${location}`,
      `${businessType} business ${location}`,
      `local ${businessType} ${location}`,
      `${businessType} near ${location}`
    ];
    
    return queries;
  }

  async scrapeSearchResults(query, maxResults) {
    const leads = [];
    
    try {
      // Use DuckDuckGo for search
      const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&ia=web`;
      await this.page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for results to load
      await this.page.waitForSelector('.results', { timeout: 10000 });
      
      // Extract search results
      const results = await this.page.evaluate(() => {
        const resultElements = document.querySelectorAll('.results .result');
        const extractedResults = [];
        
        for (let i = 0; i < Math.min(resultElements.length, 20); i++) {
          const element = resultElements[i];
          const titleElement = element.querySelector('.result__title a');
          const snippetElement = element.querySelector('.result__snippet');
          
          if (titleElement) {
            const title = titleElement.textContent.trim();
            const url = titleElement.href;
            const snippet = snippetElement ? snippetElement.textContent.trim() : '';
            
            // Filter out non-business results
            if (this.isBusinessResult(title, snippet, url)) {
              extractedResults.push({ title, url, snippet });
            }
          }
        }
        
        return extractedResults;
      });
      
      // Process each result to extract company information
      for (const result of results) {
        if (leads.length >= maxResults) break;
        
        try {
          const lead = await this.extractLeadInfo(result);
          if (lead && this.isValidLead(lead)) {
            leads.push(lead);
          }
        } catch (error) {
          console.error(`Error extracting lead from ${result.url}:`, error);
        }
        
        // Small delay between requests
        await this.delay(1000 + Math.random() * 2000);
      }
      
    } catch (error) {
      console.error(`Error scraping search results for "${query}":`, error);
    }
    
    return leads;
  }

  async extractLeadInfo(result) {
    try {
      // Extract company name from title
      const companyName = this.extractCompanyName(result.title);
      const websiteUrl = this.cleanUrl(result.url);
      
      // Try to find contact email by visiting the website
      let contactEmail = null;
      try {
        contactEmail = await this.findContactEmail(websiteUrl);
      } catch (error) {
        console.log(`Could not find email for ${websiteUrl}:`, error.message);
      }
      
      return {
        companyName,
        websiteUrl,
        contactEmail,
        snippet: result.snippet
      };
      
    } catch (error) {
      console.error('Error extracting lead info:', error);
      return null;
    }
  }

  async findContactEmail(websiteUrl) {
    try {
      // Navigate to the website
      await this.page.goto(websiteUrl, { 
        waitUntil: 'networkidle2', 
        timeout: 15000 
      });
      
      // Look for contact page links
      const contactLinks = await this.page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        return links
          .filter(link => {
            const text = link.textContent.toLowerCase();
            const href = link.href.toLowerCase();
            return text.includes('contact') || 
                   text.includes('about') || 
                   href.includes('contact') || 
                   href.includes('about');
          })
          .map(link => link.href)
          .slice(0, 3); // Limit to first 3 contact links
      });
      
      // Check current page for email
      let email = await this.extractEmailFromPage();
      if (email) return email;
      
      // Check contact pages
      for (const contactLink of contactLinks) {
        try {
          await this.page.goto(contactLink, { 
            waitUntil: 'networkidle2', 
            timeout: 10000 
          });
          
          email = await this.extractEmailFromPage();
          if (email) return email;
          
        } catch (error) {
          console.log(`Error checking contact page ${contactLink}:`, error.message);
        }
      }
      
      return null;
      
    } catch (error) {
      console.log(`Error finding contact email for ${websiteUrl}:`, error.message);
      return null;
    }
  }

  async extractEmailFromPage() {
    return await this.page.evaluate(() => {
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const pageText = document.body.textContent;
      const emails = pageText.match(emailRegex);
      
      if (emails) {
        // Filter out common non-contact emails
        const filteredEmails = emails.filter(email => {
          const lowerEmail = email.toLowerCase();
          return !lowerEmail.includes('noreply') &&
                 !lowerEmail.includes('no-reply') &&
                 !lowerEmail.includes('example') &&
                 !lowerEmail.includes('test') &&
                 !lowerEmail.includes('admin') &&
                 !lowerEmail.includes('webmaster');
        });
        
        return filteredEmails[0] || null;
      }
      
      return null;
    });
  }

  extractCompanyName(title) {
    // Clean up the title to extract company name
    let companyName = title
      .replace(/\s*-\s*.*$/, '') // Remove everything after first dash
      .replace(/\s*\|\s*.*$/, '') // Remove everything after first pipe
      .replace(/\s*\.\s*.*$/, '') // Remove everything after first period
      .trim();
    
    // Remove common suffixes
    const suffixes = ['Inc', 'LLC', 'Corp', 'Ltd', 'Company', 'Co'];
    for (const suffix of suffixes) {
      const regex = new RegExp(`\\s+${suffix}\\.?$`, 'i');
      companyName = companyName.replace(regex, '');
    }
    
    return companyName.trim();
  }

  cleanUrl(url) {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.hostname}`;
    } catch (error) {
      return url;
    }
  }

  isBusinessResult(title, snippet, url) {
    const businessKeywords = [
      'company', 'business', 'services', 'solutions', 'inc', 'llc', 'corp', 'ltd',
      'agency', 'firm', 'group', 'enterprises', 'consulting', 'professional'
    ];
    
    const excludeKeywords = [
      'wikipedia', 'linkedin', 'facebook', 'twitter', 'instagram', 'youtube',
      'indeed', 'glassdoor', 'yelp', 'google', 'maps', 'directory'
    ];
    
    const text = (title + ' ' + snippet + ' ' + url).toLowerCase();
    
    // Exclude non-business results
    for (const keyword of excludeKeywords) {
      if (text.includes(keyword)) return false;
    }
    
    // Include if contains business keywords
    for (const keyword of businessKeywords) {
      if (text.includes(keyword)) return true;
    }
    
    // Include if URL looks like a business website
    return /\.(com|org|net|biz)/.test(url) && !text.includes('blog');
  }

  isValidLead(lead) {
    return lead.companyName && 
           lead.companyName.length > 2 && 
           lead.websiteUrl && 
           lead.websiteUrl.startsWith('http');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

module.exports = LeadScraper;