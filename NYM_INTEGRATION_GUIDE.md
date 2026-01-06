# 🔒 Nym Mixnet Integration Guide

## Overview

This guide walks you through integrating the Nym mixnet into your Nym Proxy MVP for real network-level privacy protection.

### What You're Getting

✅ **5-Hop Mixnet Routing** - Packets route through 5 randomly selected mixnet nodes  
✅ **Packet Mixing** - Packets are encrypted and mixed at each hop  
✅ **Metadata Protection** - Timing and traffic patterns are obscured  
✅ **Decentralized** - No single point of failure  
✅ **Dummy Traffic** - Cover traffic masks real requests  

---

## Quick Start (5 Minutes)

### 1. Create VPS (if you don't have one)

**Recommended Providers:**
- DigitalOcean: $4-5/month (Ubuntu 22.04)
- Hetzner: €4-5/month
- Linode: $5/month
- Vultr: $2.50/month

**Minimum Requirements:**
- 1 vCPU
- 512 MB RAM
- 10 GB storage
- Ubuntu 22.04 LTS

### 2. Generate SSH Key

```bash
# On your local machine
ssh-keygen -t ed25519 -f ~/.ssh/nym-vps -N ""

# Copy public key to VPS
ssh-copy-id -i ~/.ssh/nym-vps.pub root@YOUR_VPS_IP
```

### 3. Add GitHub Secrets

Go to: **GitHub → Your Repository → Settings → Secrets and variables → Actions**

Add these secrets:

```bash
VPS_SSH_KEY          = (paste content of ~/.ssh/nym-vps - your private key)
VPS_HOST             = YOUR_VPS_IP (e.g., 123.45.67.89)
VPS_USER             = root (or your VPS username)
NYM_GATEWAY          = 6Gb7ftQdKveMjPyrxDXeAtfYAX7Zg5mVZHtnRC5MmZ1B
NYM_NETWORK_REQUESTER = 8rRGWy54oC8drFL9DepMegBt2DLrsqQwCoHMXt9nsnTo.2XjCPVbb4FpQ9hNRcXwb9mTzEAVVk1zf1tcch3wdtNEA@6Gb7ftQdKveMjPyrxDXeAtfYAX7Zg5mVZHtnRC5MmZ1B
```

### 4. Merge to Main

```bash
git checkout main
git pull origin feature/nym-mixnet-integration
```

Go to GitHub → Pull Requests → Create PR from `feature/nym-mixnet-integration`  
Merge to `main` (this will trigger deployment)

### 5. Monitor Deployment

Go to: **GitHub → Actions → Deploy Nym SOCKS5 Client**

Watch the workflow execute (5-10 minutes)

### 6. Test SOCKS5

```bash
# SSH into VPS
ssh root@YOUR_VPS_IP

# Test SOCKS5 connectivity
curl --socks5 localhost:1080 https://nymtech.net/favicon.svg
```

### 7. Update Apify Actor

**In Apify Console:**

1. Go to **Your Actor → Settings → Environment Variables**
2. Add:
   ```
   NYM_SOCKS5_HOST = YOUR_VPS_IP
   NYM_SOCKS5_PORT = 1080
   ```
3. Save and deploy

### 8. Update Backend API

Add to your `.env` or deployment config:
```
NYM_SOCKS5_HOST=YOUR_VPS_IP
NYM_SOCKS5_PORT=1080
```

Redeploy to Vercel (automatic if using GitHub integration)

### 9. Test Integration

```bash
# Check mixnet status
curl https://nym-proxy-backend.vercel.app/v1/status

# Should return:
# {
#   "mixnetEnabled": true,
#   "mixnetHealthy": true,
#   "latency": 8234,
#   "privacy": "Maximum (5-hop mixnet)"
# }
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Your Frontend                             │
│              (nym-proxy.vercel.app or local)                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ POST /v1/proxy
                         │
┌────────────────────────┴────────────────────────────────────────┐
│                    Vercel Backend API                            │
│              (nym-proxy-backend.vercel.app)                      │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Express Server                                          │  │
│  │  - /v1/proxy (POST)    - Create proxy request          │  │
│  │  - /v1/proxy/:token (GET) - Retrieve results           │  │
│  │  - /v1/status (GET)    - Check mixnet health           │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Apify API Call
                         │
┌────────────────────────┴────────────────────────────────────────┐
│                   Apify Actor                                    │
│           (integrative_operative/my-actor)                      │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Actor Code (src/main.js)                               │  │
│  │  - Check if mixnet is requested (useMixnet=true)        │  │
│  │  - Route through SOCKS5 or standard proxy               │  │
│  │  - Measure latency and track privacy level              │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┴────────────────┐
         │                                │
         ▼                                ▼
   SOCKS5 Proxy              Standard Apify Proxy
   (localhost:1080)               (direct fetch)
         │                                │
         │                                │
         ▼                                │
  ┌──────────────────────────────────┐  │
  │   VPS with Nym SOCKS5 Client    │  │
  │   (YOUR_VPS_IP:1080)            │  │
  │                                  │  │
  │  ┌────────────────────────────┐ │  │
  │  │ nym-socks5-client          │ │  │
  │  │ - Connects to Nym mixnet   │ │  │
  │  │ - 5-hop routing            │ │  │
  │  │ - Packet mixing            │ │  │
  │  │ - Metadata protection      │ │  │
  │  └────────────────────────────┘ │  │
  │                                  │  │
  └──────────────────────────────────┘  │
         │                                │
         │ (5-hop mixnet)                │
         ▼                                │
  ┌──────────────────────────────────┐  │
  │   Nym Mixnet                      │  │
  │   - Mix Node 1                    │  │
  │   - Mix Node 2                    │  │
  │   - Mix Node 3                    │  │
  │   - Mix Node 4                    │  │
  │   - Mix Node 5                    │  │
  │   - Exit Gateway                  │  │
  │   (Network Requester)             │  │
  └──────────────────────────────────┘  │
         │                                │
         │ (requests appear from         │
         │  exit gateway only)           │
         │                                │
         └────────────────┬───────────────┘
                          │
                          ▼
                   Target Website
                   (tiktok.com, nytimes.com, etc.)
```

---

## Monitoring & Logging

### Health Check Logs

```bash
# SSH into VPS
ssh root@YOUR_VPS_IP

# View health check logs (every 5 minutes)
tail -f ~/nym-proxy-deployment/health.log

# View service logs
sudo journalctl -u nym-socks5 -f

# Check service status
sudo systemctl status nym-socks5
```

### Real-Time Status

```bash
# From anywhere
curl https://nym-proxy-backend.vercel.app/v1/status | jq .

# Response:
# {
#   "mixnetEnabled": true,
#   "mixnetHealthy": true,
#   "latency": 8456,
#   "privacy": {
#     "current": "Maximum (5-hop mixnet)",
#     "ipHidden": true,
#     "metadataProtection": true,
#     "trafficAnalysisResistance": true,
#     "decentralized": true
#   }
# }
```

---

## Performance Expectations

### Latency

| Route | Latency | Why |
|-------|---------|-----|
| **Standard Proxy** | 1-3s | Direct Apify requests |
| **Nym Mixnet** | 8-15s | 5-hop routing + packet mixing |

**Note:** Mixnet latency varies based on network conditions and selected nodes.

### Throughput

- **Standard:** No bandwidth limits
- **Mixnet:** ~20-30% overhead for Sphinx packet format

### Success Rate

- **Standard:** ~98% (Apify reliability)
- **Mixnet:** ~92% (adds one more failure point - the SOCKS5 proxy)

---

## Troubleshooting

### SOCKS5 Connection Refused

```bash
# Check if service is running
sudo systemctl status nym-socks5

# If not running, start it
sudo systemctl start nym-socks5

# Check for errors
sudo journalctl -u nym-socks5 -n 50

# Restart if stuck
sudo systemctl restart nym-socks5
```

### Nym Client Not Connecting to Mixnet

```bash
# SSH into VPS
ssh root@YOUR_VPS_IP

# Check configuration
cat ~/.nym/socks5-clients/nym-proxy-client/config/config.toml

# Reinitialize if needed
rm -rf ~/.nym/socks5-clients/nym-proxy-client
~/nym-proxy-deployment/nym-socks5-client init --id nym-proxy-client

# Restart
sudo systemctl restart nym-socks5
```

### High Latency

1. This is **normal** for Nym mixnet (8-15 seconds)
2. If consistently > 20s, your gateway may be slow
3. Try different gateway:
   ```bash
   # List available gateways
   # https://explorer.nymtech.net
   
   # Update provider in config
   nano ~/.nym/socks5-clients/nym-proxy-client/config/config.toml
   
   # Change: preferred_gateway = "NEW_GATEWAY_ID"
   # Restart
   sudo systemctl restart nym-socks5
   ```

### Whitelist Issues

If target domain is blocked:

1. Check whitelist: https://nymtech.net/.wellknown/network-requester/standard-allowed-list.txt
2. If blocked, run your own Network Requester:
   ```bash
   # Uncomment in docker/docker-compose.yml
   docker-compose up -d nym-network-requester
   
   # Edit whitelist
   nano docker/allowed-list.txt
   
   # Add your domains
   docker-compose restart nym-network-requester
   ```

---

## Advanced Configuration

### Custom Network Requester (Optional)

For domains not in the standard whitelist (TikTok, ULLU), run your own:

```bash
# On VPS
cd ~/nym-proxy-deployment
wget https://github.com/nymtech/nym/releases/download/v2024.12-chomp/nym-network-requester
chmod +x nym-network-requester

# Initialize
./nym-network-requester init --id custom-nr

# Edit whitelist
cat > ~/.nym/service-providers/network-requester/custom-nr/config/allowed-list.txt <<EOF
tiktok.com
*.tiktok.com
ullu.app
*.ullu.app
EOF

# Create systemd service
sudo tee /etc/systemd/system/nym-network-requester.service > /dev/null <<EOF
[Unit]
Description=Nym Network Requester with Custom Whitelist
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$HOME/nym-proxy-deployment
ExecStart=$HOME/nym-proxy-deployment/nym-network-requester run --id custom-nr --enable-statistics
Restart=on-failure
RestartSec=30
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

# Start it
sudo systemctl daemon-reload
sudo systemctl enable nym-network-requester
sudo systemctl start nym-network-requester

# Get your Network Requester address
sleep 30
cat ~/.nym/service-providers/network-requester/custom-nr/data/public_key.pem
```

Then use this address instead of the standard one.

---

## Cost Analysis

### Monthly Costs

| Item | Cost | Notes |
|------|------|-------|
| VPS | $5-10 | DigitalOcean, Hetzner, Linode |
| Bandwidth | Included | Usually 1-2 TB/month |
| Apify | Varies | Based on actor runs |
| **Total** | **$5-10 + Apify** | Very affordable |

### Earning NYM Tokens (Bonus)

If you run a Network Requester, you earn NYM tokens:
- Sign up: http://eepurl.com/h6uPSD
- Earn ~$5-15/month depending on usage
- Minimal effort (set and forget)

---

## Privacy Guarantees

### What Nym Mixnet Protects Against

✅ **IP Masking** - Websites never see your real IP  
✅ **Traffic Analysis** - ISP/network operator can't see what you're accessing  
✅ **Metadata Protection** - Timing, volume, patterns are obscured  
✅ **Correlation Attacks** - Multiple requests can't be linked  
✅ **Decentralized Trust** - No central server knows full path  

### What It Doesn't Protect Against

❌ **Account Linking** - If you log into a service, they know it's you  
❌ **Browser Fingerprinting** - Your browser can still be identified  
❌ **Compromised Endpoints** - Malware on your device  
❌ **Compromised Exit Nodes** - If Network Requester is malicious (mitigated by decentralization)  

---

## Next Steps

1. ✅ Set up VPS
2. ✅ Configure GitHub Secrets
3. ✅ Merge PR to main (triggers deployment)
4. ✅ Update Apify actor environment variables
5. ✅ Test `/v1/status` endpoint
6. ✅ Update frontend to show mixnet status
7. ✅ Monitor health logs
8. ✅ (Optional) Run custom Network Requester for more domains

---

## Resources

- **Nym Docs:** https://nymtech.net/docs
- **SOCKS5 Setup:** https://nymtech.net/docs/developers/clients/socks5
- **Network Explorer:** https://explorer.nymtech.net
- **Community Forum:** https://forum.nym.com
- **GitHub:** https://github.com/nymtech/nym

---

## Support

If you get stuck:

1. Check VPS logs: `sudo journalctl -u nym-socks5 -n 100`
2. Check Apify actor logs: Console → Your Actor → Logs
3. Test SOCKS5: `curl --socks5 localhost:1080 https://nymtech.net/favicon.svg`
4. Check GitHub Actions: Repository → Actions → View workflow logs
5. Join Nym community: https://forum.nym.com

---

**Congratulations! You now have real Nym mixnet privacy integrated into your proxy. 🎉**