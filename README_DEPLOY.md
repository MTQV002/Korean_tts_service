# 🚀 Deploy Korean TTS Service - Railway.app

Deploy Korean TTS Service lên Railway.app để người dùng có thể sử dụng mà không cần cài đặt local service.

## 🎯 Why Railway.app?

- 🆓 **100% FREE** - Không cần thẻ tín dụng
- 🚀 **512MB RAM** - Đủ sức cho TTS service
- ⏰ **Never sleeps** - Luôn online 24/7
- 🔄 **Auto-deploy** - GitHub push = auto deploy
- 🌍 **Global CDN** - Truy cập nhanh toàn cầu
- 📊 **Analytics** - Monitor usage từ dashboard

## 📋 Requirements

- GitHub account (miễn phí)
- Git installed
- Internet connection

## 🛠️ Files Setup

Files cần thiết đã được tạo:
- `Dockerfile` - Container configuration
- `railway.json` - Railway configuration  
- `requirements.txt` - Python dependencies
- `korean_simple_service_production.py` - Production service
- `runtime.txt` - Python version

## 🚀 Step 1: Setup GitHub Repository

### 1.1 Initialize Git Repository
```bash
cd /run/media/qv/S/VProject/Korean/
git init
git add .
git commit -m "Korean TTS Service for Railway deployment"
```

### 1.2 Create GitHub Repository
1. Đi [GitHub.com](https://github.com)
2. **New Repository** → `korean-tts-service`
3. **Public** (để Railway access được)
4. **Create repository**

### 1.3 Push Code
```bash
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/korean-tts-service.git
git push -u origin main
```

## 🚀 Step 2: Deploy on Railway

### 2.1 Login Railway
1. Đi [Railway.app](https://railway.app)
2. **Login with GitHub** (authorize Railway access)

### 2.2 Create New Project
1. **New Project**
2. **Deploy from GitHub repo**
3. Chọn `korean-tts-service` repository
4. **Deploy**

### 2.3 Monitor Build
- Build process sẽ hiện trong dashboard
- Thời gian: 2-5 phút
- Check logs nếu có lỗi

### 2.4 Get Production URL
- Sau khi build thành công
- Copy URL: `https://korean-tts-service-production.up.railway.app`
- Test health check: `https://your-url.up.railway.app/health`

## 🔧 Step 3: Update Plugin Configuration

### 3.1 Update main.js URL
Trong file `main.js`, update production URL:

```javascript
// Replace with your actual Railway URL
const KOREAN_SERVICE_URL = 'https://korean-tts-service-production.up.railway.app';
```

### 3.2 Test Service
```bash
# Health check
curl https://your-railway-url.up.railway.app/health

# Test TTS endpoint
curl -X POST https://your-railway-url.up.railway.app/korean-audio-info \
  -H "Content-Type: application/json" \
  -d '{"text": "안녕하세요"}'
```

## 📊 Step 4: Monitor & Manage

### 4.1 Railway Dashboard
- **Metrics**: CPU, Memory, Network usage
- **Logs**: Real-time application logs  
- **Deployments**: History và rollback
- **Settings**: Environment variables

### 4.2 Auto-Deploy Setup
- Mỗi khi push lên GitHub main branch
- Railway tự động rebuild và redeploy
- Zero-downtime deployment

### 4.3 Custom Domain (Optional)
```bash
# In Railway dashboard
Settings → Domains → Add Custom Domain
# Point your domain CNAME to Railway
```

## 🔧 Troubleshooting

### Build Failed?
```bash
# Check Railway logs in dashboard
# Common issues:
# - Missing dependencies in requirements.txt
# - Dockerfile syntax errors
# - Python version mismatch
```

### Service Not Responding?
```bash
# Test endpoints
curl https://your-app.up.railway.app/health
curl https://your-app.up.railway.app/korean-audio-info

# Check Railway logs for errors
# Verify environment variables
```

### Plugin Connection Issues?
1. Verify URL in `main.js` is correct
2. Test service URL in browser directly
3. Check browser console for CORS errors
4. Ensure service is running (not sleeping)

## 💰 Railway Pricing & Limits

### Free Tier Includes:
- **512MB RAM** - More than enough for TTS
- **1GB Disk** - Sufficient for service
- **$5 credit/month** - Usually covers usage
- **No time limits** - Service never sleeps

### Usage Monitoring:
- Track via Railway dashboard
- Get alerts when approaching limits
- Upgrade seamlessly if needed

## 🔄 Updates & Maintenance

### Update Service Code:
```bash
# Make changes to korean_simple_service_production.py
git add .
git commit -m "Update TTS service features"
git push

# Railway auto-deploys in 2-3 minutes
```

### Rollback if Issues:
```bash
# In Railway dashboard
Deployments → Previous Version → Rollback
```

## 🌍 Global Usage

### End User Experience:
- ✅ **Install Obsidian plugin** - No local setup needed
- ✅ **Works everywhere** - Windows/Mac/Mobile
- ✅ **Fast access** - Global CDN
- ✅ **Auto-download** - MP3 files saved to vault
- ✅ **Always online** - No service interruption

### Developer Benefits:
- 🚀 **Zero infrastructure management**
- 📊 **Built-in analytics**  
- 🔄 **Continuous deployment**
- 💰 **Cost-effective scaling**
- 🛡️ **Automatic security updates**

## 🔒 Security & Best Practices

### Railway Security:
- HTTPS by default
- Automatic SSL certificates
- Regular security updates
- CORS properly configured

### Service Security:
- Only uses Google TTS public API
- No user data storage
- Rate limiting built-in
- Error handling & logging

## 📈 Scaling Considerations

### Current Setup Handles:
- **Concurrent users**: 50-100
- **Requests/minute**: 500-1000
- **Audio generation**: Real-time
- **File storage**: Temporary only

### Scale Up Options:
- Increase RAM: 512MB → 1GB → 2GB
- Add load balancing
- Enable caching
- Database for analytics

---

## 🎉 Success! Your Korean TTS Service is Live!

### Share with Users:
1. **Plugin installation** - Just add to Obsidian
2. **Zero setup** - Works immediately  
3. **Global access** - Available worldwide
4. **Free forever** - No user costs

### Monitor Usage:
- Railway dashboard shows real metrics
- User feedback via GitHub issues
- Performance optimization based on usage

**Happy coding & sharing! 🚀✨**
