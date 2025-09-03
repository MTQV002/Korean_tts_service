# 🚀 Deploy Korean TTS Service - 100% FREE Options

## ⚠️ UPDATE: Hosting Platforms Changes
- Railway: 30 days trial → requires payment
- Render: Still FREE with limitations (sleeps 15min)
- Fly.io: Requires payment method

## 🆓 100% FREE Alternatives (Forever):

### 🥇 **Option 1: GitHub Pages + Vercel** (RECOMMENDED)
- ✅ **Completely FREE forever**
- ✅ **No credit card needed**
- ✅ **Global CDN**
- ✅ **Custom domain support**

### 🥈 **Option 2: Netlify**
- ✅ **100GB bandwidth/month FREE**
- ✅ **No sleep mode**
- ✅ **GitHub integration**

### 🥉 **Option 3: Render.com (with limitations)**
- ✅ **FREE tier available**
- ⚠️ **Sleeps after 15min** (wakes in 30s)
- ✅ **512MB RAM**

### 🏆 **Option 4: Self-hosting trên VPS miễn phí**
- ✅ **Oracle Cloud Free Tier** (Forever free)
- ✅ **Google Cloud $300 credit**
- ✅ **AWS Free Tier** (12 months)

---

## 🚀 OPTION 1: Vercel (RECOMMENDED - Forever FREE)

### Why Vercel?
- 🆓 **100% FREE forever** - No trial limitations
- 🚀 **Serverless functions** - Auto-scaling
- 🌍 **Global edge network** - Super fast
- 📊 **100GB bandwidth/month** - More than enough
- � **Auto-deploy from GitHub** - Push = deploy

### Step 1: Update GitHub repo
```bash
cd /run/media/qv/S/VProject/Korean/
git add vercel.json korean_vercel_service.py
git commit -m "Add Vercel deployment config"
git push
```

### Step 2: Deploy on Vercel
1. Go to [Vercel.com](https://vercel.com)
2. **Sign up with GitHub** (free account)
3. **New Project** → **Import Git Repository**
4. Choose `Korean_tts_service` repo
5. **Deploy** → Wait 2-3 minutes
6. Get URL: `https://korean-tts-service-xxx.vercel.app`

### Step 3: Update main.js
```javascript
const KOREAN_SERVICE_URL = 'https://korean-tts-service-xxx.vercel.app';
```

**DONE! Service live forever FREE! 🎉**

---

## 🚀 OPTION 2: Netlify (Alternative FREE)

### Step 1: Create Netlify config
```bash
# Create netlify.toml
echo '[build]
  command = "pip install -r requirements.txt"
  publish = "."

[functions]
  directory = "netlify/functions"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200' > netlify.toml
```

### Step 2: Deploy
1. Go to [Netlify.com](https://netlify.com)
2. **New site from Git**
3. Choose GitHub repo
4. **Deploy**

---

## 🆓 OPTION 3: Oracle Cloud (Forever FREE VPS)

### Why Oracle Cloud?
- 🆓 **Forever FREE** - No time limits
- 🖥️ **1GB RAM + 1 OCPU** - More than enough
- 🌍 **Multiple regions** - Choose closest
- 💾 **10GB storage** - Plenty for service

### Quick Setup:
1. **Sign up**: [Oracle Cloud Free](https://cloud.oracle.com/free)
2. **Create VM** → Always Free eligible
3. **SSH + Docker** → Deploy container
4. **Open ports** → 80, 443

---

## 💰 Cost Comparison (Updated)

| Platform | Cost | RAM | Sleep | Build | Limits |
|----------|------|-----|--------|-------|--------|
| **Vercel** | FREE | Serverless | Never | 1min | 100GB/month |
| **Netlify** | FREE | Serverless | Never | 2min | 100GB/month |
| **Oracle** | FREE | 1GB | Never | 5min | Forever |
| **Railway** | $5/month | 512MB | Never | 3min | After trial |
| **Render** | FREE* | 512MB | 15min | 5min | Sleep mode |

*Render FREE có giới hạn sleep

## 🎯 New Recommendation

**Use Vercel** - Easiest setup, forever free, no limitations!

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
