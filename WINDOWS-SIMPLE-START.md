# Windows Setup - Simple Instructions

## You Already Have:

✓ Git installed  
✓ GitHub CLI installed  
✓ Repository cloned at: `C:\Users\USER\nym-proxy-mvp`  

---

## Next: Get Back to Your Repository

```powershell
# Navigate to where you cloned it
cd C:\Users\USER\nym-proxy-mvp

# Verify you're in the right place
dir scripts\windows
```

You should see:
```
full-automation.ps1
generate-ssh-key.ps1
setup-github-secrets.ps1
merge-and-deploy.ps1
test-mixnet.ps1
README.md
```

---

## Step 1: Run PowerShell as Administrator

**Right-click PowerShell → Run as Administrator**

Then:

```powershell
Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0
```

Wait for installation to complete. Then **close the admin PowerShell**.

---

## Step 2: Open Regular PowerShell

**Just open regular PowerShell** (no admin needed)

```powershell
# Go to your repository
cd C:\Users\USER\nym-proxy-mvp

# Verify you're on the right branch
git branch
# Should show: * feature/nym-mixnet-integration
```

---

## Step 3: Run the Automation

```powershell
powershell -ExecutionPolicy Bypass -File scripts\windows\full-automation.ps1
```

**Follow the interactive prompts**

---

## Troubleshooting

### "Cannot find path"

Make sure you're in the right directory:

```powershell
# Current location should be:
C:\Users\USER\nym-proxy-mvp

# Check:
pwd

# If not, navigate:
cd C:\Users\USER\nym-proxy-mvp
```

### "gh command not found"

Close PowerShell completely and reopen it. GitHub CLI needs a restart to register.

### "ssh-keygen not found"

You ran the OpenSSH install command, but:
1. Make sure you ran it as Administrator
2. Close PowerShell completely
3. Reopen PowerShell

### Script encoding errors

If you get weird character errors, use this simpler approach:

```powershell
# Manual step-by-step (no script needed)

# 1. Generate SSH key
ssh-keygen -t ed25519 -f $env:USERPROFILE\.ssh\nym-vps -N ""

# 2. Show private key (copy this to GitHub secrets)
type $env:USERPROFILE\.ssh\nym-vps

# 3. Authenticate with GitHub
gh auth login

# 4. Set GitHub secrets
$key = Get-Content $env:USERPROFILE\.ssh\nym-vps -Raw
gh secret set VPS_SSH_KEY --body $key
gh secret set VPS_HOST --body "YOUR_VPS_IP_HERE"
gh secret set VPS_USER --body "root"
gh secret set NYM_GATEWAY --body "6Gb7ftQdKveMjPyrxDXeAtfYAX7Zg5mVZHtnRC5MmZ1B"
gh secret set NYM_NETWORK_REQUESTER --body "8rRGWy54oC8drFL9DepMegBt2DLrsqQwCoHMXt9nsnTo.2XjCPVbb4FpQ9hNRcXwb9mTzEAVVk1zf1tcch3wdtNEA@6Gb7ftQdKveMjPyrxDXeAtfYAX7Zg5mVZHtnRC5MmZ1B"

# 5. Create PR and merge
gh pr create --title "Implement Nym Mixnet" --body "Automated deployment" --head feature/nym-mixnet-integration --base main
gh pr merge 3 --squash --auto

# 6. Watch deployment
gh run list
gh run view LATEST_RUN_ID --log
```

---

## What Happens Next (Automatic)

After you run the automation script or manual commands:

1. **GitHub Actions starts** (visible at: https://github.com/BikramBiswas786/nym-proxy-mvp/actions)
2. **Connects to your VPS via SSH** (5 min)
3. **Installs Nym SOCKS5 client** (5 min)
4. **Starts the service** (1 min)
5. **Sets up health monitoring** (1 min)

**Total: 10-15 minutes automatic**

---

## After Deployment

### 1. Verify It Works

```powershell
# Test the status endpoint
curl https://nym-proxy-backend.vercel.app/v1/status | ConvertFrom-Json
```

Should show:
```
mixnetEnabled  : True
mixnetHealthy  : True
latency        : 8456
privacy        : Maximum (5-hop mixnet)
```

### 2. Update Apify Actor (5 min)

- Apify Console → Your Actor → Settings
- Add environment variables:
  - `NYM_SOCKS5_HOST` = Your VPS IP
  - `NYM_SOCKS5_PORT` = 1080
- Click Save → Deploy

### 3. Update Backend (5 min)

- Vercel → nym-proxy-backend → Settings → Environment Variables
- Add same variables
- Redeploy

### 4. Test Integration (5 min)

```powershell
powershell -ExecutionPolicy Bypass -File scripts\windows\test-mixnet.ps1
```

---

## You're Done!

You now have:
- Real Nym 5-hop mixnet routing
- Network-level privacy protection
- Automatic health monitoring
- Cost: $5-10/month

---

## Support

- Check GitHub Actions: https://github.com/BikramBiswas786/nym-proxy-mvp/actions
- SSH into VPS: `ssh -i $env:USERPROFILE\.ssh\nym-vps root@YOUR_VPS_IP`
- View logs: `sudo journalctl -u nym-socks5 -f`
- Nym docs: https://nymtech.net/docs
- Nym forum: https://forum.nym.com