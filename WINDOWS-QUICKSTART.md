# 🪟 Windows Quick Start - Nym Proxy Automation

**For Windows 10/11 PowerShell** ✅

---

## 🚀 ONE COMMAND TO LIVE

```powershell
powershell -ExecutionPolicy Bypass -File scripts/windows/full-automation.ps1
```

**Timeline: 15-20 minutes to production Nym mixnet**

---

## 📋 Prerequisites (5 minutes)

### 1. Install OpenSSH Client

```powershell
# Check if already installed
Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH*'

# If not installed:
Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0
```

**Or via GUI:**
- Settings → Apps → Optional Features → Add a feature
- Search for "OpenSSH Client"
- Install

### 2. Install GitHub CLI

```powershell
winget install GitHub.cli
```

**Or download:** https://cli.github.com/

### 3. Create VPS ($5/month)

Choose one:
- **DigitalOcean**: https://www.digitalocean.com
- **Hetzner**: https://www.hetzner.com
- **Linode**: https://www.linode.com

**Configuration:**
- OS: Ubuntu 22.04 LTS
- RAM: 512 MB minimum
- CPU: 1 vCPU
- Note: **Save your IP address**

### 4. Clone Repository

```powershell
git clone https://github.com/BikramBiswas786/nym-proxy-mvp.git
cd nym-proxy-mvp
git checkout feature/nym-mixnet-integration
```

---

## 🚀 Execute Automation

### Open PowerShell

**Press:** `Win + X` → Choose "Windows PowerShell" or "Terminal"

### Navigate to Repository

```powershell
cd C:\path\to\nym-proxy-mvp
```

### Run Full Automation

```powershell
powershell -ExecutionPolicy Bypass -File scripts/windows/full-automation.ps1
```

### Follow Prompts

**Step 1: Confirm Start**
```
🚀 Nym Proxy - FULL AUTOMATION (Windows)
========================================

This script will:
1. Generate SSH key for VPS
2. Configure GitHub secrets
3. Merge PR and trigger deployment
4. Monitor the workflow

Do you want to continue? (y/n): y
```

**Step 2: SSH Key Generation** (1 minute)
```
🔐 Generating SSH key for Nym Proxy VPS...
Generating ED25519 SSH key...
✅ SSH key generated successfully!

📄 Next Steps:
1. Copy your VPS SSH public key to your VPS
2. Copy the PRIVATE KEY content below to GitHub Secrets as VPS_SSH_KEY:

========== COPY THIS TO GITHUB SECRETS ==========
-----BEGIN OPENSSH PRIVATE KEY-----
...(key content will be displayed)...
-----END OPENSSH PRIVATE KEY-----
===============================================

Press Enter when ready to continue...
```

**Step 3: GitHub Secrets Setup** (2 minutes)
```
🔐 GitHub Secrets Setup for Nym Proxy
======================================

📄 Required Information:

1️⃣  Enter path to your VPS private SSH key (e.g., C:\Users\USER\.ssh\nym-vps):
C:\Users\USER\.ssh\nym-vps

2️⃣  Enter your VPS IP address (e.g., 123.45.67.89):
123.45.67.89

3️⃣  Enter your VPS username (usually 'root' or 'ubuntu'):
root

📋 Detecting GitHub repository...
Repository: BikramBiswas786/nym-proxy-mvp

🔍 Review your configuration:
  VPS Host: 123.45.67.89
  VPS User: root
  SSH Key: -----BEGIN OPENSSH PRIVATE KEY-----...
  GitHub: BikramBiswas786/nym-proxy-mvp

Continue? (y/n): y

🚀 Setting GitHub secrets...
✅ GitHub secrets configured!

Press Enter when ready to continue...
```

**Step 4: Merge & Deploy** (1 minute + 5-10 min deployment)
```
🚀 Nym Proxy - Merge & Deploy Automation
======================================

📋 Repository: BikramBiswas786/nym-proxy-mvp

🔍 Checking for pull requests...
📊 PR #3 found

🔍 Checking PR status...
Status: OPEN

🔍 Checking for merge conflicts...
✅ No conflicts detected

🚀 Merging PR #3...
✅ PR merged successfully!

⏳ Waiting for GitHub Actions to start...
📊 Monitoring deployment...

Go to: https://github.com/BikramBiswas786/nym-proxy-mvp/actions

⏰ Expected time: 5-10 minutes
```

---

## ⏱️ What Happens Next (Automatic)

| Phase | Time | Status |
|-------|------|--------|
| GitHub Actions Start | 30s | Automatic |
| SSH Connect to VPS | 1 min | Automatic |
| Install Docker | 1 min | Automatic |
| Download Nym Client | 2 min | Automatic |
| Configure Service | 2 min | Automatic |
| Start SOCKS5 | 1 min | Automatic |
| Connect to Mixnet | 2-3 min | Automatic |
| Health Monitor Setup | 1 min | Automatic |
| **Total** | **10-12 min** | ✅ **Complete** |

---

## 🔍 Monitor Deployment

### Via GitHub Web

1. Open: https://github.com/BikramBiswas786/nym-proxy-mvp/actions
2. Click on "Deploy Nym SOCKS5 Client" workflow
3. Watch real-time logs

### Via GitHub CLI

```powershell
# List recent runs
gh run list --limit 5

# View specific run
gh run view LATEST_RUN_ID --log
```

### Via SSH (Advanced)

```powershell
# Connect to VPS
ssh -i $env:USERPROFILE\.ssh\nym-vps root@YOUR_VPS_IP

# Check service
sudo systemctl status nym-socks5

# View logs
sudo journalctl -u nym-socks5 -f
```

---

## ✅ After Deployment (10-15 minutes)

### 1. Update Apify Actor (5 min)

1. Go to: **Apify Console** → Your Actor → **Settings**
2. Click: **Environment Variables**
3. Add two variables:
   ```
   NYM_SOCKS5_HOST = YOUR_VPS_IP (e.g., 123.45.67.89)
   NYM_SOCKS5_PORT = 1080
   ```
4. Click: **Save**
5. Click: **Deploy**

### 2. Update Backend (5 min)

**For Vercel:**
1. Go to: **Vercel Dashboard** → nym-proxy-backend → **Settings**
2. Click: **Environment Variables**
3. Add:
   ```
   NYM_SOCKS5_HOST = YOUR_VPS_IP
   NYM_SOCKS5_PORT = 1080
   ```
4. Click: **Save**
5. **Redeploy** (Deployments → ... → Redeploy)

**For Local:**
Add to `.env`:
```
NYM_SOCKS5_HOST=YOUR_VPS_IP
NYM_SOCKS5_PORT=1080
```

### 3. Test Integration (5 min)

```powershell
powershell -ExecutionPolicy Bypass -File scripts/windows/test-mixnet.ps1
```

**Expected Output:**
```
🧪 Testing Nym Mixnet Integration
=================================

📄 Configuration:
Backend: https://nym-proxy-backend.vercel.app

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
    "metadataProtection": true
  }
}
✅ Mixnet is ENABLED

🔍 Test 2: Standard proxy request (no mixnet)...
Sending request... (this may take 5-10 seconds)
✅ Standard proxy request successful
  Token: abc123def
  Duration: 1234ms
  Privacy Level: basic

🔍 Test 3: Mixnet proxy request (with SOCKS5)...
Sending request through Nym mixnet... (this will take 8-15 seconds)
✅ Mixnet proxy request successful
  Token: xyz789ghj
  Duration: 9876ms
  Privacy Level: maximum
  Via Mixnet: True
✅ Latency is acceptable (>8s indicates mixnet routing)

📈 Test Summary:
✅ All tests passed!
```

---

## 🎉 You're Live!

Your proxy now has:

✅ **Real 5-hop Nym mixnet routing**  
✅ **Sphinx packet encryption**  
✅ **Metadata protection**  
✅ **Network-level privacy**  
✅ **Automatic health monitoring**  
✅ **Zero logs, zero tracking**  

---

## 🛠️ Troubleshooting

### "Execution Policy" Error

**Error:**
```
File cannot be loaded because running scripts is disabled on this system.
```

**Fix:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
```

Then run script again.

### "ssh-keygen not recognized"

**Fix:**
```powershell
# Install OpenSSH
Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0

# Restart PowerShell
```

### "gh not recognized"

**Fix:**
```powershell
# Install GitHub CLI
winget install GitHub.cli

# Or download from: https://cli.github.com/

# Restart PowerShell after installation
```

### "GitHub authentication required"

**Fix:**
```powershell
gh auth login

# Follow prompts to authenticate
```

### "SSH connection refused"

**Check:**
1. VPS is running
2. VPS IP is correct
3. SSH public key added to VPS

**Fix:**
```powershell
# Copy public key to VPS
type $env:USERPROFILE\.ssh\nym-vps.pub | ssh root@YOUR_VPS_IP "cat >> ~/.ssh/authorized_keys"
```

### "Mixnet test failed"

**Reason:** SOCKS5 client may still be initializing (2-3 minutes)

**Fix:**
```powershell
# Wait 2-3 minutes, then retry
Start-Sleep -Seconds 180
powershell -ExecutionPolicy Bypass -File scripts/windows/test-mixnet.ps1
```

---

## 📊 Step-by-Step Alternative

If full automation fails, run scripts individually:

### Step 1: Generate SSH Key
```powershell
powershell -ExecutionPolicy Bypass -File scripts/windows/generate-ssh-key.ps1
```

### Step 2: Setup GitHub Secrets
```powershell
powershell -ExecutionPolicy Bypass -File scripts/windows/setup-github-secrets.ps1
```

### Step 3: Merge and Deploy
```powershell
powershell -ExecutionPolicy Bypass -File scripts/windows/merge-and-deploy.ps1
```

### Step 4: Wait 5-10 Minutes

Monitor: https://github.com/BikramBiswas786/nym-proxy-mvp/actions

### Step 5: Test
```powershell
powershell -ExecutionPolicy Bypass -File scripts/windows/test-mixnet.ps1
```

---

## 💰 Cost

- **VPS**: $5-10/month
- **Bandwidth**: Included (1-2 TB/month)
- **Nym**: FREE (open source)
- **Total**: $5-10/month

**Optional Revenue:**
- Deploy Network Requester: Earn $5-15/month
- Can offset VPS costs

---

## 📞 Support

### If You Get Stuck

1. **Check GitHub Actions Logs**
   - https://github.com/BikramBiswas786/nym-proxy-mvp/actions

2. **Check VPS Logs**
   ```powershell
   ssh -i $env:USERPROFILE\.ssh\nym-vps root@YOUR_VPS_IP
   sudo journalctl -u nym-socks5 -f
   ```

3. **Review Documentation**
   - See: `NYM_INTEGRATION_GUIDE.md`
   - See: `scripts/windows/README.md`

4. **Get Help**
   - GitHub Issues: Your repository
   - Nym Forum: https://forum.nym.com
   - Nym Docs: https://nymtech.net/docs

---

## ✅ Success Checklist

- [ ] OpenSSH installed
- [ ] GitHub CLI installed
- [ ] VPS created
- [ ] VPS IP noted
- [ ] Repository cloned
- [ ] Feature branch checked out
- [ ] Ran full automation script
- [ ] GitHub Actions completed
- [ ] Apify actor env vars updated
- [ ] Backend env vars updated
- [ ] Integration tests passed
- [ ] 🎉 Live with Nym mixnet!

---

## 🚀 Ready to Deploy?

```powershell
powershell -ExecutionPolicy Bypass -File scripts/windows/full-automation.ps1
```

**Go live with real Nym mixnet privacy in 15-20 minutes!** 🔒✨