# Nym Mixnet Integration Setup Guide

## 🎯 Current Status

**Your application is currently using standard proxy (NOT Nym mixnet)**

This guide will help you integrate real Nym mixnet privacy technology.

## 📋 Prerequisites

1. **VPS Server** (Required for SOCKS5 client)
   - Ubuntu 20.04+ or Debian 11+
   - 1 GB RAM minimum
   - 1 vCPU
   - Recommended providers:
     - DigitalOcean ($6/month)
     - Hetzner ($5/month)
     - Linode ($5/month)

2. **SSH Access** to your VPS

3. **GitHub Secrets** configured (see below)

4. **Apify Account** with API token

## 🚀 Quick Start (3 Steps)

### Step 1: Get a VPS

```bash
# Example: DigitalOcean
# 1. Create droplet with Ubuntu 22.04
# 2. Get IP address (e.g., 123.456.789.0)
# 3. Get SSH key or root password
```

### Step 2: Configure GitHub Secrets

Go to: `https://github.com/BikramBiswas786/nym-proxy-mvp/settings/secrets/actions`

Add these secrets:

```
VPS_SSH_KEY           = Your private SSH key (entire content)
VPS_HOST              = Your VPS IP (e.g., 123.456.789.0)
VPS_USER              = root (or ubuntu)
NYM_GATEWAY           = 6Gb7ftQdKveMjPyrxDXeAtfYAX7Zg5mVZHtnRC5MmZ1B
NYM_NETWORK_REQUESTER = 8rRGWy54oC8drFL9DepMegBt2DLrsqQwCoHMXt9nsnTo.2XjCPVbb4FpQ9hNRcXwb9mTzEAVVk1zf1tcch3wdtNEA@6Gb7ftQdKveMjPyrxDXeAtfYAX7Zg5mVZHtnRC5MmZ1B
APIFY_API_TOKEN       = Your Apify token
```

### Step 3: Deploy

```bash
# Merge the feature branch to main
git checkout main
git merge feature/nym-mixnet-integration
git push origin main
```

GitHub Actions will automatically:
1. ✅ Deploy Nym SOCKS5 client to your VPS
2. ✅ Configure systemd service
3. ✅ Setup health monitoring
4. ✅ Test connectivity

## 🔧 Manual Setup (Alternative)

If you prefer manual setup or GitHub Actions doesn't work:

```bash
# SSH into your VPS
ssh root@YOUR_VPS_IP

# Download and run setup script
wget https://raw.githubusercontent.com/BikramBiswas786/nym-proxy-mvp/feature/nym-mixnet-integration/scripts/setup-vps.sh
chmod +x setup-vps.sh
bash setup-vps.sh
```

This will:
- Install Docker
- Download Nym SOCKS5 client
- Initialize and start the service
- Configure auto-restart

## ⚙️ Configure Apify Actor

After VPS setup, update your Apify actor:

### Option A: Apify Console

1. Go to: https://console.apify.com/actors/integrative_operative/my-actor
2. Click "Settings" → "Environment Variables"
3. Add:
   ```
   NYM_SOCKS5_HOST = YOUR_VPS_IP
   NYM_SOCKS5_PORT = 1080
   ```

### Option B: Update Actor Source Code

Add SOCKS5 support to your actor:

```javascript
import { Actor } from 'apify';
import { SocksProxyAgent } from 'socks-proxy-agent';
import fetch from 'node-fetch';

await Actor.init();

const input = await Actor.getInput();
const { url, method = 'GET', headers = {}, body, timeoutMs = 120000, useMixnet = true } = input;

let response;

if (useMixnet && process.env.NYM_SOCKS5_HOST) {
    // Route through Nym mixnet
    const agent = new SocksProxyAgent(
        `socks5://${process.env.NYM_SOCKS5_HOST}:${process.env.NYM_SOCKS5_PORT || 1080}`
    );
    
    console.log('🔒 Routing through Nym mixnet...');
    
    response = await fetch(url, {
        method,
        headers,
        body: method !== 'GET' && body ? JSON.stringify(body) : undefined,
        agent,
        timeout: timeoutMs,
    });
} else {
    // Standard proxy
    response = await fetch(url, {
        method,
        headers,
        body: method !== 'GET' && body ? JSON.stringify(body) : undefined,
        timeout: timeoutMs,
    });
}

const responseBody = await response.text();

await Actor.pushData({
    url,
    originalUrl: url,
    status: response.status,
    headers: Object.fromEntries(response.headers),
    body: responseBody,
    duration: Date.now() - startTime,
    mixnetUsed: useMixnet && !!process.env.NYM_SOCKS5_HOST,
    timestamp: new Date().toISOString(),
});

await Actor.exit();
```

Don't forget to install dependencies:

```json
{
  "dependencies": {
    "apify": "^3.0.0",
    "node-fetch": "^2.6.7",
    "socks-proxy-agent": "^8.0.2"
  }
}
```

## 🧪 Testing

### Test SOCKS5 Connectivity

```bash
# From your local machine
ssh root@YOUR_VPS_IP "curl --socks5 localhost:1080 https://nymtech.net/favicon.svg"
```

Expected: HTTP 200 response (may take 15-30 seconds first time)

### Test API Status Endpoint

```bash
curl https://nym-proxy-backend.vercel.app/v1/status
```

Expected response:
```json
{
  "mixnetEnabled": true,
  "mixnetHealthy": true,
  "latency": 8543,
  "privacy": {
    "current": "Maximum (5-hop mixnet)",
    "metadataProtection": true,
    "trafficAnalysisResistance": true
  }
}
```

### Test Full Proxy Flow

```bash
curl -X POST https://nym-proxy-backend.vercel.app/v1/proxy \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://nytimes.com",
    "useMixnet": true
  }'
```

Expected: `"viaMixnet": true` in response

## 📊 Monitoring

### Check Service Status

```bash
ssh root@YOUR_VPS_IP "sudo systemctl status nym-socks5"
```

### View Logs

```bash
# Real-time logs
ssh root@YOUR_VPS_IP "sudo journalctl -u nym-socks5 -f"

# Health check logs
ssh root@YOUR_VPS_IP "tail -f ~/nym-proxy-deployment/health.log"
```

### Check Connectivity

```bash
ssh root@YOUR_VPS_IP "~/nym-proxy-deployment/health-check.sh"
```

## 🐛 Troubleshooting

### Issue: "SOCKS5 test failed"

**Cause:** Mixnet client still initializing (normal on first run)

**Solution:** Wait 2-3 minutes, then test again:
```bash
ssh root@YOUR_VPS_IP "curl --socks5 localhost:1080 https://nymtech.net/favicon.svg"
```

### Issue: "Connection refused to localhost:1080"

**Cause:** Service not running

**Solution:**
```bash
ssh root@YOUR_VPS_IP "sudo systemctl start nym-socks5"
ssh root@YOUR_VPS_IP "sudo systemctl status nym-socks5"
```

### Issue: "Timeout on mixnet requests"

**Cause:** Mixnet latency is 8-15 seconds (this is normal)

**Solution:** Increase timeout in your actor:
```javascript
timeoutMs: 120000  // 2 minutes
```

### Issue: "Domain not whitelisted"

**Cause:** Network Requester has domain restrictions

**Solution:** Run your own Network Requester (see Advanced section)

## 🔐 Security Best Practices

1. **SSH Keys Only**
   ```bash
   # Disable password auth on VPS
   sudo sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
   sudo systemctl restart sshd
   ```

2. **Firewall**
   ```bash
   sudo ufw allow 22/tcp
   sudo ufw enable
   ```

3. **Regular Updates**
   ```bash
   sudo apt-get update && sudo apt-get upgrade -y
   ```

## 📈 Expected Performance

| Metric | Standard Proxy | Nym Mixnet |
|--------|---------------|------------|
| Latency | 1-3 seconds | 8-15 seconds |
| Success Rate | 99% | 95%+ |
| Privacy Level | Basic | Maximum |
| Metadata Protection | ❌ | ✅ |
| Traffic Analysis Resistance | ❌ | ✅ |

## 💰 Costs

- **VPS:** $5-10/month
- **Apify:** Pay per use (no change)
- **Network Requester (optional):** $10-20/month

**Total:** ~$5-30/month for real privacy

## 🎓 Advanced: Custom Network Requester

For unrestricted domain access (TikTok, ULLU, etc.):

```bash
# SSH to a second VPS
ssh root@SECOND_VPS_IP

# Download Network Requester
wget https://github.com/nymtech/nym/releases/download/v2024.12-chomp/nym-network-requester
chmod +x nym-network-requester

# Initialize
./nym-network-requester init --id custom-nr

# Edit whitelist
nano ~/.nym/service-providers/network-requester/custom-nr/config/allowed-list.txt

# Add your domains:
tiktok.com
*.tiktok.com
ullu.app
*.ullu.app

# Run
./nym-network-requester run --id custom-nr --enable-statistics

# Get your Network Requester address (update GitHub secret)
cat ~/.nym/service-providers/network-requester/custom-nr/data/public_key.pem
```

## 📞 Support

- **Nym Documentation:** https://nymtech.net/docs
- **Nym Discord:** https://discord.gg/nym
- **GitHub Issues:** https://github.com/BikramBiswas786/nym-proxy-mvp/issues

## ✅ Verification Checklist

- [ ] VPS created and accessible via SSH
- [ ] GitHub secrets configured
- [ ] GitHub Actions workflow completed successfully
- [ ] SOCKS5 connectivity test passed
- [ ] Apify actor environment variables set
- [ ] `/v1/status` endpoint shows `mixnetEnabled: true`
- [ ] Test proxy request shows `viaMixnet: true`
- [ ] Frontend updated to display mixnet status

---

**Once completed, you'll have TRUE Nym mixnet integration with:**
- ✅ 5-hop mixnet routing
- ✅ Packet mixing and dummy traffic
- ✅ Metadata protection
- ✅ Traffic analysis resistance
- ✅ Network-level privacy