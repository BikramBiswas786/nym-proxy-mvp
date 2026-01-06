# 🤖 One-Click Automation Setup

## Quick Start (5 Minutes)

### Option 1: Fully Automated (Recommended)

```bash
# Run everything in one command
bash scripts/full-automation.sh
```

This will:
1. Generate SSH key
2. Configure GitHub secrets
3. Merge PR and deploy
4. Provide testing instructions

### Option 2: Step by Step

#### Step 1: Generate SSH Key (2 minutes)

```bash
bash scripts/generate-ssh-key.sh
```

This will:
- Generate ED25519 SSH key pair
- Display private key for GitHub secrets
- Show public key for VPS setup

**Action:** Copy the private key output and save it

#### Step 2: Setup GitHub Secrets (3 minutes)

```bash
bash scripts/setup-github-secrets.sh
```

You'll need:
- VPS IP address (e.g., 123.45.67.89)
- VPS username (usually `root` or `ubuntu`)
- SSH key path from Step 1

**Action:** GitHub CLI will automatically add all secrets to your repository

#### Step 3: Merge & Deploy (2 minutes)

```bash
bash scripts/merge-and-deploy.sh
```

This will:
- Create/check PR
- Check for conflicts
- Merge PR to main
- Start GitHub Actions workflow

**Action:** Watch the Actions tab for deployment progress

#### Step 4: Test Integration (5 minutes)

Once workflow completes:

```bash
bash scripts/test-mixnet.sh
```

Or with custom backend:

```bash
BACKEND_URL=https://your-backend.vercel.app bash scripts/test-mixnet.sh
```

---

## Manual VPS Setup (if GitHub Actions fails)

```bash
# SSH into your VPS
ssh root@YOUR_VPS_IP

# Run setup script
bash setup-vps.sh

# Or use Docker
cd ~/nym-proxy-deployment
docker-compose up -d nym-socks5
```

---

## Troubleshooting

### GitHub CLI Not Installed

```bash
# macOS
brew install gh

# Ubuntu/Debian
sudo apt-get install gh

# Or see: https://github.com/cli/cli/blob/trunk/docs/install_linux.md
```

### SSH Key Already Exists

The script will ask if you want to regenerate it. Say `n` to use existing.

### GitHub Secrets Not Updating

```bash
# Manually set secrets
gh secret set VPS_SSH_KEY < ~/.ssh/nym-vps
gh secret set VPS_HOST --body "123.45.67.89"
gh secret set VPS_USER --body "root"
```

### Deployment Stuck

Check GitHub Actions:
```bash
gh run list --limit 1 --json status,conclusion
gh run view LAST_RUN_ID --log
```

Or SSH into VPS:
```bash
ssh root@YOUR_VPS_IP
sudo journalctl -u nym-socks5 -f
```

---

## What Gets Automated

| Component | Automated | Manual | Status |
|-----------|-----------|--------|--------|
| SSH Key Generation | ✅ | Optional | `generate-ssh-key.sh` |
| GitHub Secrets | ✅ | Optional | `setup-github-secrets.sh` |
| VPS Setup | ✅ | Optional | `deploy-nym-socks5.yml` |
| SOCKS5 Installation | ✅ | - | GitHub Actions |
| Health Monitoring | ✅ | - | `health-check.sh` |
| Apify Actor Update | ❌ | Required | Manual in Apify Console |
| Frontend Update | ❌ | Required | Manual in your frontend |
| Testing | ✅ | Optional | `test-mixnet.sh` |

---

## Environment Variables

### Required for Automation

```
VPS_SSH_KEY              Private SSH key for VPS access
VPS_HOST                 Your VPS IP address
VPS_USER                 VPS username (usually root)
NYM_GATEWAY              Nym gateway ID (provided)
NYM_NETWORK_REQUESTER    Network Requester address (provided)
```

### For Apify Actor (Manual)

```
NYM_SOCKS5_HOST          Your VPS IP
NYM_SOCKS5_PORT          1080
APIFY_API_TOKEN          Your Apify token (existing)
```

### For Backend (Manual)

```
NYM_SOCKS5_HOST          Your VPS IP
NYM_SOCKS5_PORT          1080
APIFY_API_TOKEN          Your Apify token (existing)
```

---

## Post-Automation Steps

After automation completes:

1. **Update Apify Actor**
   - Go to Apify Console → Your Actor → Settings
   - Add `NYM_SOCKS5_HOST` and `NYM_SOCKS5_PORT` environment variables
   - Deploy

2. **Update Backend**
   - Add environment variables to Vercel or your hosting
   - Redeploy if needed

3. **Update Frontend**
   - Add mixnet status display
   - Add privacy level indicator
   - Test integration

4. **Monitor**
   - Check health logs: `ssh VPS 'tail -f ~/nym-proxy-deployment/health.log'`
   - Run tests: `bash scripts/test-mixnet.sh`

---

## One-Liner Installation

For the impatient:

```bash
bash scripts/full-automation.sh && sleep 600 && bash scripts/test-mixnet.sh
```

This will:
1. Run full automation (interactive)
2. Wait 10 minutes for deployment
3. Run integration tests

---

## Monitoring Workflow

### Via GitHub CLI

```bash
# Watch in real-time
gh run list --limit 1
gh run view LATEST_RUN_ID --log

# Check specific workflow
gh run list -w "Deploy Nym SOCKS5 Client"
```

### Via GitHub Web

1. Go to: `github.com/YOUR_USERNAME/nym-proxy-mvp/actions`
2. Click "Deploy Nym SOCKS5 Client" workflow
3. Watch progress in real-time

### Via SSH

```bash
ssh root@YOUR_VPS_IP

# Check service status
sudo systemctl status nym-socks5

# View logs
sudo journalctl -u nym-socks5 -f

# View health checks
tail -f ~/nym-proxy-deployment/health.log
```

---

## Estimated Timeline

| Step | Time | What's Happening |
|------|------|------------------|
| SSH Key | 1 min | Generating ED25519 key |
| Secrets | 2 min | GitHub CLI adding secrets |
| Merge | 1 min | PR merge and workflow trigger |
| VPS Setup | 3 min | SSH connect, Docker install |
| Nym Install | 2 min | Download SOCKS5 client |
| Service Start | 1 min | Systemd service startup |
| Health Monitor | 1 min | Cron job setup |
| Initialization | 2-3 min | Nym client connecting to mixnet |
| Testing | 5 min | Run integration tests |
| **Total** | **15-20 min** | ✅ Live with real Nym privacy |

---

## Support

If automation fails:

1. Run individually: `bash scripts/generate-ssh-key.sh`
2. Check logs: `gh run view LATEST_RUN_ID --log`
3. Manual setup: Follow `NYM_INTEGRATION_GUIDE.md`
4. Join community: https://forum.nym.com

---

**Ready? Run:** `bash scripts/full-automation.sh` 🚀