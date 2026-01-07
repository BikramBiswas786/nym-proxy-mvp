# Windows Manual Setup - Copy-Paste These Commands
# No encoding issues, just plain PowerShell

# STEP 1: Admin PowerShell (Right-click PowerShell > Run as Administrator)
# Copy-paste this ONE TIME:
Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0

# Then close admin PowerShell and open regular PowerShell

# STEP 2: Regular PowerShell (NOT admin)
# Make sure you're in the right directory:
cd C:\Users\USER\nym-proxy-mvp

# Verify files exist:
dir scripts\windows\

# STEP 3: Generate SSH Key
ssh-keygen -t ed25519 -f $env:USERPROFILE\.ssh\nym-vps -N ""

# STEP 4: Show private key (copy the output to GitHub secrets)
type $env:USERPROFILE\.ssh\nym-vps

# STEP 5: Login to GitHub
gh auth login

# STEP 6: Set GitHub secrets (replace YOUR_VPS_IP with your actual IP)
$key = Get-Content $env:USERPROFILE\.ssh\nym-vps -Raw
gh secret set VPS_SSH_KEY --body $key
gh secret set VPS_HOST --body "YOUR_VPS_IP"
gh secret set VPS_USER --body "root"
gh secret set NYM_GATEWAY --body "6Gb7ftQdKveMjPyrxDXeAtfYAX7Zg5mVZHtnRC5MmZ1B"
gh secret set NYM_NETWORK_REQUESTER --body "8rRGWy54oC8drFL9DepMegBt2DLrsqQwCoHMXt9nsnTo.2XjCPVbb4FpQ9hNRcXwb9mTzEAVVk1zf1tcch3wdtNEA@6Gb7ftQdKveMjPyrxDXeAtfYAX7Zg5mVZHtnRC5MmZ1B"

# STEP 7: Create and merge PR
gh pr create --title "Implement Nym Mixnet" --body "Automated deployment" --head feature/nym-mixnet-integration --base main
gh pr merge 3 --squash --auto

# STEP 8: Watch deployment
gh run list
gh run view LATEST_RUN_ID --log

# STEP 9: After 10-15 minutes, test it
curl https://nym-proxy-backend.vercel.app/v1/status | ConvertFrom-Json

# STEP 10: Update Apify Actor env vars (manual in Apify Console)
# NYM_SOCKS5_HOST = YOUR_VPS_IP
# NYM_SOCKS5_PORT = 1080

# STEP 11: Update Backend env vars (manual in Vercel)
# Same as above

# STEP 12: Test integration
powershell -ExecutionPolicy Bypass -File scripts\windows\test-mixnet.ps1