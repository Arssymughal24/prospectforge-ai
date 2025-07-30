# ProspectForge AI

**A Free, Local, Automated Outreach System**

ProspectForge AI is a powerful desktop application that fully automates the client outreach workflow using 100% free and locally-run AI tools. Simply provide a business type and location, and the software will autonomously find leads, research them, generate personalized AI mockups, and draft outreach emails.

![ProspectForge AI Dashboard](https://v3.fal.media/files/penguin/qbs_leszSGlCI8S3XoJqU.jpeg)

## 🚀 Features

- **Automated Lead Discovery**: Scrapes search engines to find potential clients
- **AI-Powered Brand Analysis**: Analyzes company websites to understand brand identity
- **Custom App Concept Generation**: Creates tailored mobile app ideas for each business
- **AI Mockup Generation**: Produces professional app mockups using Stable Diffusion
- **Personalized Email Drafting**: Generates compelling outreach emails with AI
- **Local AI Integration**: Works with Ollama and Stable Diffusion (no API costs!)
- **Email Automation**: Sends emails with attachments through your own SMTP
- **Campaign Management**: Organize and track multiple outreach campaigns
- **Cross-Platform**: Runs on Windows, macOS, and Linux

## 📋 Prerequisites

Before installing ProspectForge AI, you need to set up the following local AI servers:

### 1. Ollama (Language Model)
Download and install Ollama from [https://ollama.ai](https://ollama.ai)

**Installation:**
```bash
# Install Ollama (varies by OS)
# Windows: Download installer from website
# macOS: brew install ollama
# Linux: curl -fsSL https://ollama.ai/install.sh | sh

# Pull a language model (choose one)
ollama pull llama3        # Recommended: Fast and capable
ollama pull mistral       # Alternative: Good performance
ollama pull phi3          # Lightweight option

# Start Ollama server
ollama serve
```

### 2. Stable Diffusion Web UI (Image Generation)
Install AUTOMATIC1111's Stable Diffusion Web UI:

**Option A: AUTOMATIC1111 (Recommended)**
```bash
# Clone the repository
git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git
cd stable-diffusion-webui

# Run the installation script
# Windows: webui-user.bat
# Linux/macOS: ./webui.sh

# Start with API enabled
# Windows: webui-user.bat --api
# Linux/macOS: ./webui.sh --api
```

**Option B: ComfyUI (Alternative)**
```bash
# Clone ComfyUI
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI

# Install dependencies
pip install -r requirements.txt

# Run with API
python main.py --listen --port 8188
```

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone https://github.com/Arssymughal24/prospectforge-ai.git
cd prospectforge-ai
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Application
```bash
npm start
```

For development mode with DevTools:
```bash
npm run dev
```

## ⚙️ Configuration

### First-Time Setup

1. **Launch ProspectForge AI**
2. **Navigate to Settings** (gear icon in sidebar)
3. **Configure AI Services:**
   - **Ollama URL**: `http://localhost:11434` (default)
   - **Ollama Model**: Select from your installed models
   - **Stable Diffusion URL**: `http://127.0.0.1:7860` (AUTOMATIC1111) or `http://127.0.0.1:8188` (ComfyUI)

4. **Configure Email Settings:**
   - **Email Provider**: Choose Gmail, Outlook, or Custom SMTP
   - **Sender Name**: Your name or business name
   - **Email Address**: Your email address
   - **Password**: Your email password or app-specific password

### Email Provider Setup

#### Gmail Setup
1. Enable 2-Factor Authentication
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Use this password in ProspectForge AI

#### Outlook Setup
1. Use your regular Outlook credentials
2. Ensure "Less secure app access" is enabled if needed

#### Custom SMTP
1. Enter your SMTP server details
2. Configure port and security settings

### Test Connections
Use the "Test Connection" buttons in settings to verify:
- ✅ Ollama connection and model availability
- ✅ Stable Diffusion API accessibility
- ✅ Email configuration (sends test email)

## 🎯 Usage

### Creating Your First Campaign

1. **Click "New Campaign"** from Dashboard or Campaigns page
2. **Enter Campaign Details:**
   - **Business Type**: e.g., "restaurants", "dental clinics", "law firms"
   - **Location**: e.g., "New York, NY", "Los Angeles, CA"
   - **Number of Leads**: 1-50 leads per campaign

3. **Click "Forge Campaign"** to start automated processing

### Automated Workflow

Once you create a campaign, ProspectForge AI automatically:

1. **🔍 Lead Discovery** (2-5 minutes)
   - Searches DuckDuckGo for businesses matching your criteria
   - Extracts company names, websites, and contact emails
   - Saves leads to local database

2. **🧠 AI Analysis** (5-10 minutes per lead)
   - Scrapes and analyzes each company's website
   - Identifies brand colors, tone, services, and target audience
   - Generates 3 custom app concepts tailored to the business
   - Selects the best concept with detailed reasoning

3. **🎨 Mockup Generation** (1-2 minutes per lead)
   - Creates detailed image prompts based on brand analysis
   - Generates professional app mockups using Stable Diffusion
   - Saves high-quality images locally

4. **✉️ Email Drafting** (30 seconds per lead)
   - Writes personalized cold outreach emails
   - References specific business details and app concept
   - Includes compelling value propositions and soft CTAs

### Reviewing and Sending

1. **Monitor Progress** in the Dashboard
2. **Review Generated Content:**
   - View lead details, brand analysis, and app concepts
   - Preview generated mockups
   - Edit email content if needed

3. **Send Emails:**
   - Click "Send Email" for individual leads
   - Emails automatically include mockup attachments
   - Track sent status in the dashboard

## 📁 File Structure

```
prospectforge-ai/
├── src/
│   ├── main.js                 # Electron main process
│   ├── database.js             # SQLite database management
│   ├── services/
│   │   ├── leadScraper.js      # Web scraping with Puppeteer
│   │   ├── aiService.js        # Ollama & Stable Diffusion integration
│   │   ├── emailService.js     # SMTP email sending
│   │   └── settingsManager.js  # Configuration management
│   └── renderer/
│       ├── index.html          # Main UI
│       ├── styles.css          # Application styling
│       └── app.js              # Frontend JavaScript
├── mockups/                    # Generated mockup images
├── prospects.db                # SQLite database (created on first run)
├── package.json
└── README.md
```

## 🔧 Building for Distribution

### Build for All Platforms
```bash
npm run build
```

### Platform-Specific Builds
```bash
npm run build-win    # Windows
npm run build-mac    # macOS
npm run build-linux  # Linux
```

Built applications will be in the `dist/` folder.

## 🛡️ Privacy & Security

- **100% Local Processing**: All AI operations run on your machine
- **No External APIs**: No data sent to third-party AI services
- **Local Data Storage**: All leads and content stored in local SQLite database
- **Your Email Credentials**: Emails sent through your own SMTP server
- **No Tracking**: No analytics or telemetry

## 🔍 Troubleshooting

### Common Issues

#### Ollama Connection Failed
- Ensure Ollama is running: `ollama serve`
- Check if models are installed: `ollama list`
- Verify URL in settings: `http://localhost:11434`

#### Stable Diffusion Connection Failed
- Ensure Web UI is running with `--api` flag
- Check URL in settings: `http://127.0.0.1:7860`
- Verify API is enabled in Web UI settings

#### Email Sending Failed
- Check email credentials and app passwords
- Verify SMTP settings for your provider
- Test with "Send Test Email" button

#### Lead Scraping Issues
- Some searches may return fewer leads due to anti-bot measures
- Try different business types or locations
- Check internet connection

### Performance Optimization

#### For Faster Processing:
- Use smaller, faster models (phi3 instead of llama3)
- Reduce image generation steps in Stable Diffusion
- Process fewer leads per campaign initially

#### For Better Quality:
- Use larger models (llama3 or mistral)
- Increase Stable Diffusion steps and resolution
- Review and edit generated content before sending

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Ollama](https://ollama.ai) for local language model serving
- [AUTOMATIC1111](https://github.com/AUTOMATIC1111/stable-diffusion-webui) for Stable Diffusion Web UI
- [Electron](https://electronjs.org) for cross-platform desktop framework
- [Puppeteer](https://pptr.dev) for web scraping capabilities

## 📞 Support

For support, feature requests, or bug reports:
- Open an issue on GitHub
- Check the troubleshooting section above
- Review the configuration steps

---

**ProspectForge AI** - Transform your outreach with the power of local AI! 🚀