# Cloud Proxy
-

## What This Application Does

### Current Features (Working)

**Privacy Level:** Basic proxy protection
- ✅ Your IP is hidden from target websites
- ✅ Bypass geo-restrictions (tested with TikTok, ULLU, NYT)
- ✅ Token-based result retrieval
- ✅ 24-hour result expiration
- ⚠️ Apify can observe traffic patterns (not true anonymity)

---

## Quick Start

### Using the Application

1. **Visit:** [https://nym-proxy-backend.vercel.app/](https://nym-proxy-backend.vercel.app/)

2. **Enter a URL** you want to access privately

3. **Get a private link** that expires in 24 hours

### API Usage

```bash
# Create proxy request
curl -X POST https://nym-proxy-backend.vercel.app/v1/proxy \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://nytimes.com",
    "method": "GET"
  }'

# Response
{
  "token": "abc123xyz",
  "viewUrl": "https://nym-proxy-backend.vercel.app/v1/proxy/abc123xyz",
  "viaProxy": true,
  "viaMixnet": false,  // Will be true after integration
  "privacyLevel": "basic"
}

# Check mixnet status
curl https://nym-proxy-backend.vercel.app/v1/status
```

---

## Repository Structure

```
nym-proxy-mvp/
├── api-server/          # Backend API (Vercel)
│   └── server.js        # Express server with /v1/proxy and /v1/status
├── backend/             # Frontend UI
├── scripts/             # Automation scripts
│   ├── setup-vps.sh     # One-command VPS setup
│   └── health-check.sh  # Mixnet monitoring
├── docker/              # Docker configuration
│   ├── Dockerfile.nym-socks5        # SOCKS5 client
│   ├── Dockerfile.network-requester # Custom Network Requester
│   └── docker-compose.yml           # Full stack
├── .github/workflows/   # CI/CD automation
│   └── deploy-nym-socks5.yml       # Auto-deploy to VPS
├── SETUP.md            # Complete integration guide
└── README.md           # This file
```

---

## Integration Guide

### Prerequisites

- VPS (Ubuntu 20.04+, 1GB RAM, $5-10/month)
- SSH access
- Apify account
- GitHub account (for automation)

### Quick Integration (3 Steps)

1. **Get VPS** (DigitalOcean, Hetzner, Linode)

2. **Configure GitHub Secrets:**
   - `VPS_SSH_KEY` = Your SSH private key
   - `VPS_HOST` = Your VPS IP address
   - `VPS_USER` = root or ubuntu
   - `NYM_GATEWAY` = 6Gb7ftQdKveMjPyrxDXeAtfYAX7Zg5mVZHtnRC5MmZ1B
   - `NYM_NETWORK_REQUESTER` = (provided in SETUP.md)

3. **Merge to main:**
   ```bash
   git checkout main
   git merge feature/nym-mixnet-integration
   git push origin main
   ```

GitHub Actions will automatically deploy Nym SOCKS5 client to your VPS.

### Manual Setup

```bash
# SSH to your VPS
ssh root@YOUR_VPS_IP

# Run setup script
wget https://raw.githubusercontent.com/BikramBiswas786/nym-proxy-mvp/feature/nym-mixnet-integration/scripts/setup-vps.sh
bash setup-vps.sh
```

See [SETUP.md](SETUP.md) for complete guide.

---

## Testing

### Test SOCKS5 Client

```bash
ssh root@YOUR_VPS_IP "curl --socks5 localhost:1080 https://nymtech.net/favicon.svg"
```

### Test Mixnet Status

```bash
curl https://nym-proxy-backend.vercel.app/v1/status
```

Expected:
```json
{
  "mixnetEnabled": true,
  "mixnetHealthy": true,
  "latency": 8543,
  "privacy": {
    "current": "Maximum (5-hop mixnet)"
  }
}
```

---

## Architecture

### Current (Basic Proxy)

```
User → Frontend → API Server → Apify Actor → Target Website
                                    ↓
                          (Apify observes traffic)
```

### After Integration (Nym Mixnet)

```
User → Frontend → API Server → Apify Actor → SOCKS5 Proxy → Nym Mixnet (5 hops) → Network Requester → Target
                                                ↓
                                    Packet mixing + dummy traffic
                                    Metadata protection
                                    No single observer
```

---

## Privacy Comparison

| Feature | Current | After Mixnet |
|---------|---------|-------------|
| Your IP hidden from target | ✅ | ✅ |
| Metadata protection | ❌ | ✅ |
| Traffic analysis resistance | ❌ | ✅ |
| 5-hop routing | ❌ | ✅ |
| Packet mixing | ❌ | ✅ |
| Dummy traffic | ❌ | ✅ |
| Decentralized | ❌ | ✅ |
| Can Apify observe? | Yes | No |

---

## API Endpoints

### `POST /v1/proxy`

Create a private proxy link.

**Request:**
```json
{
  "url": "https://example.com",
  "method": "GET",
  "headers": {},
  "body": null,
  "timeoutMs": 90000,
  "useMixnet": true
}
```

**Response:**
```json
{
  "token": "abc123xyz",
  "viewUrl": "https://nym-proxy-backend.vercel.app/v1/proxy/abc123xyz",
  "viaProxy": true,
  "viaMixnet": false,
  "privacyLevel": "basic",
  "status": 200,
  "duration": 2341
}
```

### `GET /v1/proxy/:token`

View proxied content.

**Response:** HTML content of proxied website

### `GET /v1/status`

Check mixnet integration status.

**Response:**
```json
{
  "mixnetEnabled": false,
  "mixnetConfigured": false,
  "mixnetHealthy": false,
  "latency": null,
  "privacy": {
    "current": "Basic (Standard proxy)",
    "metadataProtection": false,
    "trafficAnalysisResistance": false
  }
}
```

---

## Monitoring

### Health Checks

Automatic health monitoring runs every 5 minutes on VPS:

```bash
ssh root@YOUR_VPS_IP "tail -f ~/nym-proxy-deployment/health.log"
```

### Service Status

```bash
ssh root@YOUR_VPS_IP "sudo systemctl status nym-socks5"
```

### Logs

```bash
# Real-time logs
ssh root@YOUR_VPS_IP "sudo journalctl -u nym-socks5 -f"
```

---

## Costs

- **VPS for SOCKS5 client:** $5-10/month
- **Apify usage:** Pay per use (unchanged)
- **Network Requester (optional):** $10-20/month

**Total:** ~$5-30/month for real mixnet privacy

---

## Troubleshooting

See [SETUP.md#troubleshooting](SETUP.md#troubleshooting) for common issues.

---

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## License

MIT License - see LICENSE file for details.

---

## Links

- **Live Application:** [nym-proxy-backend.vercel.app](https://nym-proxy-backend.vercel.app/)
- **GitHub Repository:** [github.com/BikramBiswas786/nym-proxy-mvp](https://github.com/BikramBiswas786/nym-proxy-mvp)

---

## Acknowledgments

- **Apify** for the serverless actor platform
- **Vercel** for hosting

---

