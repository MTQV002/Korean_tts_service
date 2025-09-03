# 🚀 Deploy Korean TTS Service - Railway.app

## 🎯 Railway.app - 100% FREE & No Payment Method Required!

### ✅ Why Railway.app?
- 🆓 **Completely FREE** - No credit card needed
- 🚀 **512MB RAM** - More than enough for TTS service  
- ⏰ **Never sleeps** - Always online
- 🔄 **Auto-deploy** - Push to GitHub = instant deploy
- 🌍 **Global CDN** - Fast worldwide access

---

## 🚀 Step-by-Step Deployment

### Step 1: Push to GitHub
```bash
cd /run/media/qv/S/VProject/Korean/
git init
git add .
git commit -m "Korean TTS Service for Railway"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/korean-tts-service.git
git push -u origin main
```

### Step 2: Deploy on Railway
1. Go to [Railway.app](https://railway.app)
2. **Login with GitHub** (no signup needed)
3. **New Project** → **Deploy from GitHub repo**
4. Choose your `korean-tts-service` repo
5. **Deploy** button
6. Wait 3-5 minutes for build
7. Copy your URL: `https://your-app-name.up.railway.app`

### Step 3: Update Plugin URL
Replace URL in `main.js`:
```javascript
const KOREAN_SERVICE_URL = 'https://your-actual-railway-url.up.railway.app';
```

### Step 4: Test Service
```bash
curl https://your-railway-url.up.railway.app/health
# Should return: {"status": "OK", "service": "Korean TTS"}
```

**DONE! 🎉**

---

## 🔧 Troubleshooting

### Build Failed?
- Check `requirements.txt` has correct packages
- Verify `Dockerfile` syntax
- Check Railway build logs

### Service Not Responding?
```bash
# Test health endpoint
curl https://your-app.up.railway.app/health

# Test TTS endpoint  
curl -X POST https://your-app.up.railway.app/korean-audio-info \
  -H "Content-Type: application/json" \
  -d '{"text": "안녕하세요"}'
```

### Plugin Not Working?
1. Check URL in `main.js` is correct
2. Test service URL in browser
3. Check browser console for errors

---

## � Railway.app Benefits

| Feature | Railway | Other Platforms |
|---------|---------|----------------|
| **Cost** | 🆓 FREE | Payment needed |
| **RAM** | 512MB | 256-512MB |
| **Sleep** | ❌ Never | ✅ 15-30min |
| **Build** | 2-3min | 3-10min |
| **Setup** | GitHub only | Complex config |

---

## 🌍 After Deployment

### Users Experience:
- ✅ **Install plugin** - No Python setup needed
- ✅ **Works instantly** - Global TTS service  
- ✅ **Windows/Mac/Mobile** - Universal compatibility
- ✅ **Auto-download MP3** - Files saved to vault

### You Get:
- 🚀 **Global service** - Available 24/7
- 📈 **Usage analytics** - Railway dashboard
- 🔄 **Easy updates** - Git push = redeploy
- 💰 **Zero cost** - Completely free

**Perfect setup for Korean TTS! 🎊**
