# ProspectForge AI - Detailed Setup Guide

This guide provides step-by-step instructions for setting up ProspectForge AI and its dependencies.

## 🔧 System Requirements

- **Operating System**: Windows 10+, macOS 10.14+, or Linux (Ubuntu 18.04+)
- **RAM**: Minimum 8GB (16GB recommended for optimal AI performance)
- **Storage**: 10GB free space (for AI models and generated content)
- **Internet**: Required for initial setup and lead scraping

## 📦 Step 1: Install Node.js

Download and install Node.js (version 16 or higher) from [nodejs.org](https://nodejs.org)

Verify installation:
```bash
node --version
npm --version
```

## 🤖 Step 2: Set Up Ollama (Language Model Server)

### Windows
1. Download Ollama installer from [ollama.ai](https://ollama.ai)
2. Run the installer and follow the setup wizard
3. Open Command Prompt or PowerShell
4. Install a language model:
   ```cmd
   ollama pull llama3
   ```
5. Start the Ollama server:
   ```cmd
   ollama serve
   ```

### macOS
1. Install using Homebrew:
   ```bash
   brew install ollama
   ```
   Or download from [ollama.ai](https://ollama.ai)

2. Install a language model:
   ```bash
   ollama pull llama3
   ```

3. Start the server:
   ```bash
   ollama serve
   ```

### Linux
1. Install Ollama:
   ```bash
   curl -fsSL https://ollama.ai/install.sh | sh
   ```

2. Install a language model:
   ```bash
   ollama pull llama3
   ```

3. Start the server:
   ```bash
   ollama serve
   ```

### Recommended Models
- **llama3** (4.7GB): Best balance of speed and quality
- **mistral** (4.1GB): Good alternative with fast inference
- **phi3** (2.3GB): Lightweight option for lower-end hardware

## 🎨 Step 3: Set Up Stable Diffusion (Image Generation)

### Option A: AUTOMATIC1111 Web UI (Recommended)

#### Windows
1. Install Python 3.10.6 from [python.org](https://python.org)
2. Install Git from [git-scm.com](https://git-scm.com)
3. Clone the repository:
   ```cmd
   git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git
   cd stable-diffusion-webui
   ```
4. Run the installer:
   ```cmd
   webui-user.bat
   ```
5. After installation, start with API enabled:
   ```cmd
   webui-user.bat --api
   ```

#### macOS/Linux
1. Ensure Python 3.10+ and Git are installed
2. Clone the repository:
   ```bash
   git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git
   cd stable-diffusion-webui
   ```
3. Run the installer:
   ```bash
   ./webui.sh
   ```
4. Start with API enabled:
   ```bash
   ./webui.sh --api
   ```

### Option B: ComfyUI (Alternative)

1. Clone ComfyUI:
   ```bash
   git clone https://github.com/comfyanonymous/ComfyUI.git
   cd ComfyUI
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Download a model (place in `models/checkpoints/`):
   - Stable Diffusion 1.5 or 2.1
   - Or any compatible checkpoint

4. Start with API:
   ```bash
   python main.py --listen --port 8188
   ```

## 📧 Step 4: Configure Email Provider

### Gmail Setup
1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password:
   - Go to [Google Account Settings](https://myaccount.google.com)
   - Security → 2-Step Verification → App passwords
   - Select "Mail" and generate password
   - Use this 16-character password in ProspectForge AI

### Outlook/Hotmail Setup
1. Use your regular email and password
2. If you have 2FA enabled, generate an app password:
   - Go to Microsoft Account Security
   - Advanced security options → App passwords
   - Generate new password for "Email"

### Other Email Providers
Configure custom SMTP settings:
- **SMTP Host**: Your provider's SMTP server
- **Port**: Usually 587 (TLS) or 465 (SSL)
- **Security**: Enable TLS/SSL as required

## 🚀 Step 5: Install ProspectForge AI

1. Clone the repository:
   ```bash
   git clone https://github.com/Arssymughal24/prospectforge-ai.git
   cd prospectforge-ai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the application:
   ```bash
   npm start
   ```

## ⚙️ Step 6: Initial Configuration

1. **Launch ProspectForge AI**
2. **Go to Settings** (gear icon in sidebar)
3. **Configure AI Services:**
   - Ollama URL: `http://localhost:11434`
   - Test connection and select your installed model
   - Stable Diffusion URL: `http://127.0.0.1:7860`
   - Test connection to verify API access

4. **Configure Email:**
   - Select your email provider
   - Enter your credentials (use app password for Gmail/Outlook)
   - Send a test email to verify configuration

5. **Save Settings**

## 🧪 Step 7: Test Your Setup

### Test Ollama
```bash
curl http://localhost:11434/api/generate -d '{
  "model": "llama3",
  "prompt": "Hello, world!",
  "stream": false
}'
```

### Test Stable Diffusion
```bash
curl -X GET http://127.0.0.1:7860/sdapi/v1/options
```

### Test ProspectForge AI
1. Create a test campaign with 1-2 leads
2. Monitor the processing in the dashboard
3. Review generated content and mockups
4. Send a test email

## 🔧 Troubleshooting

### Ollama Issues
- **Port already in use**: Change port with `ollama serve --port 11435`
- **Model not found**: List models with `ollama list`, install with `ollama pull <model>`
- **Connection refused**: Ensure Ollama is running with `ollama serve`

### Stable Diffusion Issues
- **API not enabled**: Start with `--api` flag
- **Port conflicts**: Change port in launch arguments
- **Out of memory**: Reduce batch size or use `--lowvram` flag
- **Model not loaded**: Ensure a checkpoint is in `models/checkpoints/`

### Email Issues
- **Authentication failed**: Use app passwords for Gmail/Outlook
- **Connection timeout**: Check SMTP settings and firewall
- **SSL errors**: Verify TLS/SSL settings match your provider

### Performance Issues
- **Slow processing**: Use smaller AI models or reduce image generation steps
- **High memory usage**: Close other applications, use `--lowvram` for Stable Diffusion
- **Crashes**: Ensure sufficient RAM and disk space

## 📈 Optimization Tips

### For Speed
- Use `phi3` model for faster text generation
- Reduce Stable Diffusion steps to 15-20
- Process smaller batches of leads

### For Quality
- Use `llama3` or `mistral` for better text quality
- Increase Stable Diffusion steps to 30-50
- Use higher resolution (768x768) for mockups

### For Resource Management
- Close Stable Diffusion when not processing campaigns
- Use `ollama stop <model>` to free memory
- Monitor system resources during processing

## 🔄 Updates and Maintenance

### Updating Ollama
```bash
# Update Ollama
ollama update

# Update models
ollama pull llama3
```

### Updating Stable Diffusion
```bash
cd stable-diffusion-webui
git pull
```

### Updating ProspectForge AI
```bash
cd prospectforge-ai
git pull
npm install
```

## 📞 Getting Help

If you encounter issues:

1. **Check the logs**: Look for error messages in the console
2. **Verify connections**: Use the test buttons in settings
3. **Review this guide**: Ensure all steps were followed correctly
4. **Check system resources**: Ensure adequate RAM and disk space
5. **Open an issue**: Report bugs on the GitHub repository

## 🎯 Next Steps

Once setup is complete:
1. Create your first campaign with a small number of leads
2. Review the generated content and mockups
3. Customize email templates if needed
4. Scale up to larger campaigns
5. Monitor performance and adjust settings as needed

Happy prospecting with ProspectForge AI! 🚀