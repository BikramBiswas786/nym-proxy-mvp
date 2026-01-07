# Windows PowerShell Scripts for Nym Proxy Automation

## Quick Start

### One-Click Automation

```powershell
powershell -ExecutionPolicy Bypass -File scripts/windows/full-automation.ps1
```

## Prerequisites

### 1. Install OpenSSH (if not already installed)

```powershell
# Check if OpenSSH is installed
Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH*'

# Install OpenSSH Client
Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0

# Or via Settings:
# Settings > Apps > Optional Features > Add OpenSSH Client
```

### 2. Install GitHub CLI

```powershell
# Using winget
winget install GitHub.cli

# Or download from https://cli.github.com/
```

### 3. Create VPS

- DigitalOcean: https://www.digitalocean.com ($5/month)
- Hetzner: https://www.hetzner.com (€4/month)
- Linode: https://www.linode.com ($5/month)

Note your VPS IP address.

## Usage

### Full Automation (Recommended)

```powershell
# Navigate to repository
cd nym-proxy-mvp

# Checkout feature branch
git checkout feature/nym-mixnet-integration

# Run full automation
powershell -ExecutionPolicy Bypass -File scripts/windows/full-automation.ps1
```

### Step by Step

#### 1. Generate SSH Key

```powershell
powershell -ExecutionPolicy Bypass -File scripts/windows/generate-ssh-key.ps1
```

#### 2. Setup GitHub Secrets

```powershell
powershell -ExecutionPolicy Bypass -File scripts/windows/setup-github-secrets.ps1
```

#### 3. Merge and Deploy

```powershell
powershell -ExecutionPolicy Bypass -File scripts/windows/merge-and-deploy.ps1
```

#### 4. Test Integration (after 5-10 minutes)

```powershell
powershell -ExecutionPolicy Bypass -File scripts/windows/test-mixnet.ps1
```

## Troubleshooting

### "Execution Policy" Error

If you get an execution policy error:

```powershell
# Temporarily allow script execution
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process

# Then run the script
.\scripts\windows\full-automation.ps1
```

### "ssh-keygen not found"

Install OpenSSH:

```powershell
Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0
```

### "gh not found"

Install GitHub CLI:

```powershell
winget install GitHub.cli

# Or download from https://cli.github.com/
```

### Custom Backend URL

```powershell
$env:BACKEND_URL = "https://your-backend.vercel.app"
powershell -ExecutionPolicy Bypass -File scripts/windows/test-mixnet.ps1
```

## What Each Script Does

### full-automation.ps1
- Runs all scripts in sequence
- Interactive prompts for configuration
- Handles entire deployment pipeline

### generate-ssh-key.ps1
- Creates ED25519 SSH key pair
- Saves to `%USERPROFILE%\.ssh\nym-vps`
- Displays private key for GitHub secrets

### setup-github-secrets.ps1
- Uses GitHub CLI to set repository secrets
- Configures VPS connection details
- Sets Nym gateway and Network Requester addresses

### merge-and-deploy.ps1
- Creates or finds PR for feature branch
- Checks for merge conflicts
- Merges PR and triggers GitHub Actions
- Monitors workflow progress

### test-mixnet.ps1
- Tests backend status endpoint
- Tests standard proxy (no mixnet)
- Tests mixnet proxy (with SOCKS5)
- Verifies integration

## Timeline

| Step | Time | What Happens |
|------|------|---------------|
| SSH Key | 1 min | ED25519 generation |
| Secrets | 2 min | GitHub CLI setup |
| PR Merge | 1 min | Auto-merge |
| VPS Setup | 3 min | Docker & packages |
| Nym Install | 2 min | SOCKS5 client |
| Service Start | 1 min | Systemd launch |
| Mixnet Init | 2-3 min | Connection established |
| **Total** | **15-20 min** | ✅ Live |

## After Automation

1. **Update Apify Actor** (5 min)
   - Apify Console → Actor → Settings
   - Add: `NYM_SOCKS5_HOST` = Your VPS IP
   - Add: `NYM_SOCKS5_PORT` = 1080

2. **Update Backend** (5 min)
   - Vercel Settings → Environment Variables
   - Add same env vars

3. **Test** (5 min)
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/windows/test-mixnet.ps1
   ```

## Support

- GitHub Issues: Report bugs
- Nym Forum: https://forum.nym.com
- Documentation: See parent README files

## Notes

- Scripts require Windows 10/11 with PowerShell 5.1+
- OpenSSH must be installed for SSH key generation
- GitHub CLI must be authenticated (`gh auth login`)
- VPS must be accessible via SSH

## Quick Commands Reference

```powershell
# Full automation
powershell -ExecutionPolicy Bypass -File scripts/windows/full-automation.ps1

# Generate SSH key only
powershell -ExecutionPolicy Bypass -File scripts/windows/generate-ssh-key.ps1

# Test integration
powershell -ExecutionPolicy Bypass -File scripts/windows/test-mixnet.ps1

# Check GitHub Actions status
gh run list --limit 1
gh run view LATEST_RUN_ID --log

# SSH into VPS
ssh -i %USERPROFILE%\.ssh\nym-vps root@YOUR_VPS_IP
```