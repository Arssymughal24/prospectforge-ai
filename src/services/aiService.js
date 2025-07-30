const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const FormData = require('form-data');
const puppeteer = require('puppeteer');

class AIService {
  constructor() {
    this.mockupsDir = path.join(process.cwd(), 'mockups');
    this.ensureMockupsDir();
  }

  async ensureMockupsDir() {
    await fs.ensureDir(this.mockupsDir);
  }

  // Ollama Integration
  async testOllamaConnection(url) {
    try {
      const response = await axios.get(`${url}/api/tags`, { timeout: 5000 });
      return { success: true, models: response.data.models || [] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getOllamaModels(url) {
    try {
      const response = await axios.get(`${url}/api/tags`);
      return { success: true, models: response.data.models || [] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async callOllama(url, model, prompt, systemPrompt = '') {
    try {
      const response = await axios.post(`${url}/api/generate`, {
        model: model,
        prompt: prompt,
        system: systemPrompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 2000
        }
      }, { timeout: 60000 });

      return response.data.response;
    } catch (error) {
      throw new Error(`Ollama API error: ${error.message}`);
    }
  }

  // Stable Diffusion Integration
  async testStableDiffusionConnection(url) {
    try {
      const response = await axios.get(`${url}/sdapi/v1/options`, { timeout: 5000 });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async generateImage(prompt, settings) {
    try {
      const payload = {
        prompt: prompt,
        negative_prompt: "blurry, low quality, distorted, ugly, bad anatomy, watermark, text, signature",
        width: 512,
        height: 512,
        steps: 20,
        cfg_scale: 7,
        sampler_name: "DPM++ 2M Karras",
        batch_size: 1,
        n_iter: 1
      };

      const response = await axios.post(`${settings.stableDiffusionUrl}/sdapi/v1/txt2img`, payload, {
        timeout: 120000
      });

      return response.data.images[0]; // Base64 encoded image
    } catch (error) {
      throw new Error(`Stable Diffusion API error: ${error.message}`);
    }
  }

  // Website Analysis
  async analyzeBrand(websiteUrl, settings) {
    try {
      const websiteContent = await this.scrapeWebsiteContent(websiteUrl);
      
      const prompt = `Analyze this website content and extract brand information:

Website URL: ${websiteUrl}
Content: ${websiteContent.substring(0, 3000)}

Please provide a detailed brand analysis including:
1. Company name and industry
2. Primary services or products
3. Brand colors (if mentioned or can be inferred)
4. Brand tone and personality (professional, casual, innovative, etc.)
5. Target audience
6. Key value propositions
7. Company size estimation (startup, small business, enterprise)
8. Technology stack or tools they might use

Format your response as a structured analysis with clear sections.`;

      const systemPrompt = "You are a brand analysis expert. Provide detailed, actionable insights about companies based on their website content.";
      
      const analysis = await this.callOllama(settings.ollamaUrl, settings.ollamaModel, prompt, systemPrompt);
      
      return {
        websiteUrl,
        analysis,
        scrapedContent: websiteContent.substring(0, 1000) // Store sample for reference
      };
    } catch (error) {
      throw new Error(`Brand analysis error: ${error.message}`);
    }
  }

  async scrapeWebsiteContent(url) {
    let browser;
    try {
      browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
      
      const content = await page.evaluate(() => {
        // Remove script and style elements
        const scripts = document.querySelectorAll('script, style, nav, footer, header');
        scripts.forEach(el => el.remove());
        
        // Get main content
        const main = document.querySelector('main') || document.body;
        return main.textContent.trim();
      });
      
      return content;
    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
      return `Unable to scrape content from ${url}`;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  // App Concept Generation
  async generateAppConcept(brandAnalysis, settings) {
    const prompt = `Based on this brand analysis, generate 3 unique mobile app concepts that would be valuable for this business:

Brand Analysis:
${brandAnalysis.analysis}

For each app concept, provide:
1. App Name
2. Core Purpose (1-2 sentences)
3. Key Features (3-5 bullet points)
4. Target Users
5. Business Value/ROI

After presenting all 3 concepts, select the BEST one and explain why it's the most suitable for this business.

Format your response clearly with numbered concepts and a final recommendation section.`;

    const systemPrompt = "You are a mobile app strategist who creates innovative, practical app concepts that solve real business problems and provide clear ROI.";
    
    const concepts = await this.callOllama(settings.ollamaUrl, settings.ollamaModel, prompt, systemPrompt);
    
    return {
      brandAnalysis: brandAnalysis.analysis,
      concepts,
      generatedAt: new Date().toISOString()
    };
  }

  // Image Prompt Generation
  async generateImagePrompt(brandAnalysis, appConcept, settings) {
    const prompt = `Create a detailed image generation prompt for a mobile app mockup based on this information:

Brand Analysis:
${brandAnalysis.analysis}

App Concept:
${appConcept.concepts}

Generate a detailed prompt for Stable Diffusion to create a professional mobile app mockup. The prompt should include:
1. App interface description
2. Color scheme based on brand
3. Layout and UI elements
4. Professional mockup style
5. High quality specifications

Make the prompt detailed and specific for generating a realistic mobile app mockup image.
Only return the image generation prompt, nothing else.`;

    const systemPrompt = "You are an expert at creating detailed prompts for AI image generation, specifically for mobile app mockups and UI designs.";
    
    const imagePrompt = await this.callOllama(settings.ollamaUrl, settings.ollamaModel, prompt, systemPrompt);
    
    return imagePrompt.trim();
  }

  // Mockup Generation
  async generateMockup(imagePrompt, companyName, settings) {
    try {
      const enhancedPrompt = `${imagePrompt}, professional mobile app mockup, clean UI design, modern interface, high quality, detailed, realistic phone mockup, app store quality`;
      
      const base64Image = await this.generateImage(enhancedPrompt, settings);
      
      // Save image to file
      const fileName = `${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_mockup_${Date.now()}.png`;
      const filePath = path.join(this.mockupsDir, fileName);
      
      // Convert base64 to buffer and save
      const imageBuffer = Buffer.from(base64Image, 'base64');
      await fs.writeFile(filePath, imageBuffer);
      
      return filePath;
    } catch (error) {
      throw new Error(`Mockup generation error: ${error.message}`);
    }
  }

  // Email Generation
  async generateEmail(brandAnalysis, appConcept, lead, settings) {
    const prompt = `Write a personalized cold outreach email for this lead:

Company: ${lead.company_name}
Website: ${lead.website_url}
Contact Email: ${lead.contact_email || 'Not available'}

Brand Analysis:
${brandAnalysis.analysis}

App Concept:
${appConcept.concepts}

Write a compelling cold email that:
1. Personalizes the opening based on their business
2. Briefly mentions the specific app concept
3. Highlights the business value and ROI
4. Includes a soft call-to-action
5. Keeps it concise (under 150 words)
6. Sounds natural and not overly salesy
7. Mentions that you've created a mockup to show the concept

Subject line should be compelling and personalized.
Format: Subject: [subject line]
Email: [email body]`;

    const systemPrompt = "You are an expert cold email copywriter who writes personalized, value-driven emails that get responses. Focus on the recipient's business needs and provide clear value.";
    
    const emailContent = await this.callOllama(settings.ollamaUrl, settings.ollamaModel, prompt, systemPrompt);
    
    return emailContent;
  }
}

module.exports = AIService;