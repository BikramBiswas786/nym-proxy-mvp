# 🚀 Nym Proxy MVP - Quick Start (15 Minutes)

## Prerequisites

- [ ] VPS created (DigitalOcean, Hetzner, Linode, or similar - $5/month)
  - OS: Ubuntu 22.04 LTS
  - RAM: 512 MB minimum
  - CPU: 1 vCPU
  - IP: Note it down
- [ ] GitHub CLI installed: `brew install gh` (macOS) or see [docs](https://github.com/cli/cli/blob/trunk/docs/install_linux.md)
- [ ] This repository cloned: `git clone <repo-url> && cd nym-proxy-mvp`
- [ ] Feature branch available: `git checkout feature/nym-mixnet-integration`

---

## 🚀 ONE COMMAND TO LIVE

```bash
bash scripts/full-automation.sh
```

**That's it.** The script will:
1. 🔐 Generate SSH key
2. 🔧 Configure GitHub secrets
3. 🚀 Merge PR and trigger deployment
4. 📊 Monitor workflow

**Time: 15-20 minutes to live Nym mixnet**

---

## 🔍 What Happens Next

### During Automation (Interactive)

```
🚀 Nym Proxy - FULL AUTOMATION
============================

This script will:
1. Generate SSH key for VPS
2. Configure GitHub secrets
3. Merge PR and trigger deployment
4. Monitor the workflow

Do you want to continue? (y/n)
```

Press `y` and follow prompts:

**1. SSH Key Generation** (1 minute)
```
🔐 Generating SSH key for Nym Proxy VPS...
✅ SSH key generated successfully!

📄 Next Steps:
1. Copy your VPS SSH public key to your VPS
2. Copy the PRIVATE KEY content below to GitHub Secrets as VPS_SSH_KEY:

========== COPY THIS TO GITHUB SECRETS ==========
-----BEGIN OPENSSH PRIVATE KEY-----
...(key content)...
-----END OPENSSH PRIVATE KEY-----
```

**2. GitHub Secrets Setup** (2 minutes)
```
📄 Required Information:

1️⃣  Enter path to your VPS private SSH key (e.g., ~/.ssh/nym-vps):
```

Enter: `~/.ssh/nym-vps`

```
2️⃣  Enter your VPS IP address (e.g., 123.45.67.89):
```

Enter: Your VPS IP (e.g., `123.45.67.89`)

```
3️⃣  Enter your VPS username (usually 'root' or 'ubuntu'):
```

Enter: `root` (usually)

```
🔍 Review your configuration:
  VPS Host: 123.45.67.89
  VPS User: root
  SSH Key: -----BEGIN OPENSSH PRIVATE KEY-----...
  GitHub: BikramBiswas786/nym-proxy-mvp

Continue? (y/n)
```

Press: `y`

```
🚀 Setting GitHub secrets...
✅ GitHub secrets configured!
💀 Verify secrets in GitHub:
https://github.com/BikramBiswas786/nym-proxy-mvp/settings/secrets/actions
```

**3. Merge & Deploy** (5-10 minutes)
```
🚀 Merging PR #3...
✅ PR merged successfully!

⏳ Waiting for GitHub Actions to start...
📊 Monitoring deployment...

Go to: https://github.com/BikramBiswas786/nym-proxy-mvp/actions

The workflow will:
1. Connect to your VPS via SSH
2. Download Nym SOCKS5 client
3. Initialize and start the service
4. Set up health monitoring
5. Test SOCKS5 connectivity

⏰ Expected time: 5-10 minutes
```

---

## ⏱️ Wait (5-10 minutes)

GitHub Actions is deploying to your VPS:

### Watch Progress

**Option 1: GitHub Web UI** (Easiest)
```
https://github.com/BikramBiswas786/nym-proxy-mvp/actions
```

Look for: "Deploy Nym SOCKS5 Client" workflow

**Option 2: GitHub CLI**
```bash
gh run list --limit 1
gh run view LAST_RUN_ID --log
```

**Option 3: SSH into VPS**
```bash
ssh root@YOUR_VPS_IP
sudo journalctl -u nym-socks5 -f
```

---

## ✅ After Deployment (5 minutes)

### 1. Verify SOCKS5 is Running

```bash
# SSH into your VPS
ssh root@YOUR_VPS_IP

# Check service status
sudo systemctl status nym-socks5

# Should show:
# ● nym-socks5.service - Nym SOCKS5 Client for Proxy
#      Loaded: loaded (...)
#      Active: active (running) since ...
```

### 2. Test SOCKS5 Connectivity

```bash
# From VPS
curl --socks5 localhost:1080 https://nymtech.net/favicon.svg

# Should get: HTTP 200
```

### 3. Update Apify Actor

**In Apify Console:**
1. Go to: **Your Actor → Settings → Environment Variables**
2. Add two variables:
   ```
   NYM_SOCKS5_HOST = YOUR_VPS_IP (e.g., 123.45.67.89)
   NYM_SOCKS5_PORT = 1080
   ```
3. Click **Save**
4. **Deploy** the actor

### 4. Update Backend API

**For Vercel:**
1. Go to: **Vercel → nym-proxy-backend → Settings → Environment Variables**
2. Add:
   ```
   NYM_SOCKS5_HOST = YOUR_VPS_IP
   NYM_SOCKS5_PORT = 1080
   ```
3. Click **Save**
4. Click **Redeploy**

**For Local Development:**
Add to `.env`:
```
NYM_SOCKS5_HOST=YOUR_VPS_IP
NYM_SOCKS5_PORT=1080
```

---

## 🧪 Test Integration

```bash
# Run integration tests
bash scripts/test-mixnet.sh
```

### Expected Output

```
🧪 Testing Nym Mixnet Integration
==================================

🔍 Test 1: Check mixnet status...

Request: GET /v1/status

Response:
{
  "mixnetEnabled": true,
  "mixnetHealthy": true,
  "latency": 8456,
  "privacy": {
    "current": "Maximum (5-hop mixnet)",
    "ipHidden": true,
    "metadataProtection": true,
    "trafficAnalysisResistance": true,
    "decentralized": true
  }
}
✅ Mixnet is ENABLED

🔍 Test 2: Standard proxy request (no mixnet)...
✅ Standard proxy request successful
  Token: aBcD1234ef
  Duration: 1234ms
  Privacy Level: basic

🔍 Test 3: Mixnet proxy request (with SOCKS5)...
✅ Mixnet proxy request successful
  Token: xYz9876WQ
  Duration: 9876ms
  Privacy Level: maximum
  Via Mixnet: true
✅ Latency is acceptable (>8s indicates mixnet routing)
```

---

## 💀 You're Live!

Your Nym Proxy now has:

✅ **Real 5-hop mixnet routing**  
✅ **Network-level privacy**  
✅ **Metadata protection**  
✅ **Decentralized infrastructure**  
✅ **Automatic health monitoring**  

---

## 📄 Update Frontend (Optional)

Add status display to your frontend:

```javascript
const mixnetStatus = await fetch('/v1/status').then(r => r.json());

if (mixnetStatus.mixnetEnabled) {
  // Show: 🔒 Protected by Nym Mixnet (5-hop routing)
  // Show: ⏱️ Latency: 8-15 seconds
  // Show: 🔐 Privacy Level: Maximum
} else {
  // Show: ⚠️ Standard Proxy (VPS connecting...)
}
```

---

## 💧 Troubleshooting

### "SOCKS5 Connection Refused"

```bash
# Wait 2-3 minutes for Nym client to initialize
ssh root@YOUR_VPS_IP
sudo systemctl status nym-socks5
sudo journalctl -u nym-socks5 -n 20
```

### "Mixnet test failed"

```bash
# SOCKS5 may still be connecting to mixnet
# Try again in 1-2 minutes
bash scripts/test-mixnet.sh
```

### "GitHub Secrets not set"

```bash
# Manual fallback
gh secret set VPS_SSH_KEY < ~/.ssh/nym-vps
gh secret set VPS_HOST --body "123.45.67.89"
gh secret set VPS_USER --body "root"
```

### "VPS deployment failed"

```bash
# SSH into VPS manually
ssh root@YOUR_VPS_IP

# Run setup script
bash setup-vps.sh

# Or check logs
sudo journalctl -u nym-socks5 -f
```

---

## 📄 Complete Checklist

- [ ] VPS created
- [ ] GitHub CLI installed
- [ ] Feature branch checked out
- [ ] Ran: `bash scripts/full-automation.sh`
- [ ] Approved GitHub secret setup
- [ ] Watched GitHub Actions complete
- [ ] SOCKS5 service running
- [ ] Updated Apify actor env vars
- [ ] Updated backend env vars
- [ ] Ran: `bash scripts/test-mixnet.sh`
- [ ] All tests passing
- [ ] Frontend showing mixnet status
- [ ] Monitored health logs
- [ ] 🎉 Live with real Nym privacy!

---

## 💰 Costs

| Item | Cost | Notes |
|------|------|-------|
| VPS | $5-10/mo | DigitalOcean, Hetzner, Linode |
| Bandwidth | Included | Usually 1-2 TB/month |
| Apify | Varies | Based on actor runs |
| **Total** | **$5-10 + Apify** | Very affordable privacy |

### Optional: Earn NYM Tokens

Run a Network Requester to earn:
- Register: http://eepurl.com/h6uPSD
- Earnings: $5-15/month
- Can offset VPS costs

---

## 🙋 Getting Help

- GitHub Issues: Report bugs in your repo
- Nym Forum: https://forum.nym.com
- Nym Docs: https://nymtech.net/docs

---

## 🌟 Success Story

After this setup, your proxy:
- ✅ Routes all traffic through 5 mixnet hops
- ✅ Encrypts packets at each hop (Sphinx)
- ✅ Obfuscates timing and metadata
- ✅ Uses decentralized exit gateways
- ✅ Protects against ISP snooping
- ✅ Prevents traffic correlation

**You now have production-grade privacy infrastructure.** 🔒🎆