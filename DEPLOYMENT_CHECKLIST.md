# 🚀 Nym Mixnet Integration - Deployment Checklist

## Pre-Deployment ✅

- [ ] VPS created and accessible
  - Provider: _____________
  - IP: _____________
  - Username: _____________
  - SSH key generated

- [ ] GitHub Secrets configured
  - [ ] `VPS_SSH_KEY` added
  - [ ] `VPS_HOST` added
  - [ ] `VPS_USER` added
  - [ ] `NYM_GATEWAY` added
  - [ ] `NYM_NETWORK_REQUESTER` added

- [ ] Repository branch setup
  - [ ] Feature branch created: `feature/nym-mixnet-integration`
  - [ ] All files pushed to branch
  - [ ] Branch is up to date with main

## Deployment 🚀

### Step 1: Merge to Main
- [ ] Open PR: `feature/nym-mixnet-integration` → `main`
- [ ] Review changes
- [ ] Merge PR (this triggers GitHub Actions)

### Step 2: Monitor GitHub Actions
- [ ] Go to: Repository → Actions
- [ ] Watch "Deploy Nym SOCKS5 Client" workflow
- [ ] All steps complete successfully:
  - [ ] Checkout code
  - [ ] Setup SSH
  - [ ] Add VPS to known hosts
  - [ ] Deploy to VPS
  - [ ] Test SOCKS5 connectivity
  - [ ] Deploy monitoring script
  - [ ] Setup cron for health checks
  - [ ] Display connection info

### Step 3: Verify VPS Setup

```bash
# SSH into VPS
ssh root@YOUR_VPS_IP

# Check SOCKS5 service
sudo systemctl status nym-socks5

# Test connectivity
curl --socks5 localhost:1080 https://nymtech.net/favicon.svg

# View logs
sudo journalctl -u nym-socks5 -f
```

- [ ] SOCKS5 service running
- [ ] SOCKS5 connectivity test passed
- [ ] Health check script deployed
- [ ] Cron job configured
- [ ] Health logs accessible

## Apify Actor Update 📦

### Step 1: Update Actor Code
- [ ] Replace actor code with `apify-actor/src/main.js`
- [ ] Update `actor.json` with new metadata
- [ ] Update `package.json` with new dependencies
- [ ] Deploy to Apify

### Step 2: Add Environment Variables
- [ ] In Apify Console → Your Actor → Settings → Environment Variables
- [ ] Add `NYM_SOCKS5_HOST` = YOUR_VPS_IP
- [ ] Add `NYM_SOCKS5_PORT` = 1080
- [ ] Save

### Step 3: Test Actor
- [ ] Run test with mixnet enabled: `useMixnet=true`
- [ ] Run test with mixnet disabled: `useMixnet=false`
- [ ] Check logs for:
  - [ ] "Routing through Nym mixnet..."
  - [ ] SOCKS5 proxy connection
  - [ ] Request successful
  - [ ] Duration and latency recorded

## Backend API Update 🔧

### Step 1: Deploy Updated Server
- [ ] API server already updated with `/v1/status` endpoint
- [ ] Deploy to Vercel (automatic if GitHub integrated)
- [ ] Or run locally: `npm run dev`

### Step 2: Add Environment Variables
- [ ] In Vercel → Project Settings → Environment Variables
- [ ] Add `NYM_SOCKS5_HOST` = YOUR_VPS_IP
- [ ] Add `NYM_SOCKS5_PORT` = 1080
- [ ] Redeploy

### Step 3: Test API
```bash
# Test status endpoint
curl https://nym-proxy-backend.vercel.app/v1/status

# Should show:
# {
#   "mixnetEnabled": true,
#   "mixnetHealthy": true,
#   "latency": "~8000ms",
#   "privacy": "Maximum (5-hop mixnet)"
# }
```

- [ ] Status endpoint responds
- [ ] `mixnetEnabled` is `true`
- [ ] `mixnetHealthy` is `true`
- [ ] Latency is 8-15 seconds
- [ ] Privacy level shows "Maximum"

## Frontend Update 🎨

### Step 1: Update UI
- [ ] Add mixnet status banner
- [ ] Show privacy level indicator
- [ ] Display latency expectations
- [ ] Add switch for "use mixnet" option

### Step 2: Test Frontend
- [ ] Status banner shows correct status
- [ ] Clicking "use mixnet" passes parameter to API
- [ ] Results show privacy level used
- [ ] Privacy indicators update in real-time

## Monitoring Setup 📊

### Step 1: Health Checks
- [ ] Cron job running every 5 minutes
- [ ] Health logs available at: `~/nym-proxy-deployment/health.log`
- [ ] Logs show service status
- [ ] Auto-restart on failure

### Step 2: Alerts (Optional)
- [ ] Set up email alerts if SOCKS5 service fails
- [ ] Monitor CPU/memory usage
- [ ] Monitor disk space
- [ ] Track mixnet connectivity issues

## Post-Deployment Testing 🧪

### Test 1: Basic Proxy (No Mixnet)
```bash
curl -X POST https://nym-proxy-backend.vercel.app/v1/proxy \
  -H "Content-Type: application/json" \
  -d '{"url": "https://httpbin.org/ip", "useMixnet": false}'
```
- [ ] Request succeeds
- [ ] Returns token and viewUrl
- [ ] `privacyLevel`: "basic"

### Test 2: Mixnet Proxy
```bash
curl -X POST https://nym-proxy-backend.vercel.app/v1/proxy \
  -H "Content-Type: application/json" \
  -d '{"url": "https://httpbin.org/ip", "useMixnet": true}'
```
- [ ] Request succeeds (may take 10-15 seconds)
- [ ] Returns token and viewUrl
- [ ] `privacyLevel`: "maximum"
- [ ] `duration`: 8000-15000 ms

### Test 3: Retrieve Results
```bash
curl https://nym-proxy-backend.vercel.app/v1/proxy/TOKEN_FROM_ABOVE
```
- [ ] Returns HTML of proxied page
- [ ] Resources properly rewritten
- [ ] Page renders correctly

### Test 4: Blocked Domains
- [ ] Try NYT (should work): `https://nytimes.com`
- [ ] Try TikTok (may fail if not whitelisted): `https://tiktok.com`
- [ ] Try ULLU (may fail if not whitelisted): `https://ullu.app`

If blocked domains fail:
- [ ] Deploy custom Network Requester
- [ ] Update whitelist with blocked domains
- [ ] Restart Network Requester
- [ ] Test again

## Performance Baseline 📈

Document your baseline performance:

| Metric | Standard | Mixnet | Notes |
|--------|----------|--------|-------|
| Latency | ___ms | ___ms | 1st request may be slower |
| Success Rate | __% | __% | Mixnet may be slightly lower |
| Throughput | ___MB/s | ___MB/s | Mixnet has ~20-30% overhead |
| CPU Usage | __% | __% | SOCKS5 adds minimal overhead |
| Memory | ___MB | ___MB | Nym client is lightweight |

## Documentation Updates 📝

- [ ] Update README.md with "Now with Nym Mixnet!" badge
- [ ] Document latency expectations in frontend
- [ ] Add privacy guarantee statement
- [ ] Update architecture diagram
- [ ] Document custom Network Requester setup (if needed)
- [ ] Create troubleshooting guide

## User Communication 📢

- [ ] Update website/docs about Nym integration
- [ ] Clarify: "Maximum privacy" vs "Standard privacy"
- [ ] Explain: Expected 8-15s latency for mixnet
- [ ] Highlight: No logs, no tracking, decentralized
- [ ] Add disclaimer: "Browser fingerprinting still possible"

## Final Verification ✨

- [ ] SOCKS5 proxy is operational
- [ ] Apify actor can reach it
- [ ] Status endpoint reports healthy
- [ ] Frontend displays correct privacy level
- [ ] Mixnet routes through 5 hops (verify via logs)
- [ ] Health monitoring is active
- [ ] Documentation is complete
- [ ] Team is trained on troubleshooting

---

## Rollback Plan (if needed)

1. Set `useMixnet=false` in all requests
2. Point `NYM_SOCKS5_HOST` to `null`
3. Requests fall back to standard proxy
4. Zero downtime

---

**Status:** 🟢 Ready to Deploy / 🟡 In Progress / 🔴 Blocked

Current Status: _____________

LastUpdated: _____________

DeployedBy: _____________