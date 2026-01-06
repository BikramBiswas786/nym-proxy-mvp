# 🔒 Nym Privacy Proxy API

> **Privacy-focused HTTP proxy API powered by Nym mixnet**

[![Live API](https://img.shields.io/badge/API-Live-success)](https://nym-proxy-backend.vercel.app)
[![Status](https://img.shields.io/badge/Status-Beta-orange)](https://nym-proxy-backend.vercel.app/v1/health)

## 🚀 Quick Start

Make anonymous HTTP requests through the Nym mixnet in one line:

### PowerShell (Windows)
```powershell
Invoke-RestMethod https://nym-proxy-backend.vercel.app/v1/proxy `
  -Method POST `
  -Headers @{"Authorization"="Bearer test_key_123"} `
  -Body '{"url":"https://httpbin.org/ip"}' `
  -ContentType "application/json"
```

### Curl (Linux/Mac)
```bash
curl -X POST https://nym-proxy-backend.vercel.app/v1/proxy \
  -H "Authorization: Bearer test_key_123" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://httpbin.org/ip"}'
```

### JavaScript
```javascript
fetch('https://nym-proxy-backend.vercel.app/v1/proxy', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer test_key_123',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ url: 'https://httpbin.org/ip' })
})
  .then(res => res.json())
  .then(data => console.log(data));
```

### Python
```python
import requests

response = requests.post(
    'https://nym-proxy-backend.vercel.app/v1/proxy',
    headers={'Authorization': 'Bearer test_key_123'},
    json={'url': 'https://httpbin.org/ip'}
)
print(response.json())
```

## 📚 API Reference

### Base URL
```
https://nym-proxy-backend.vercel.app
```

### Endpoints

#### GET `/`
Returns API information and available endpoints.

#### GET `/v1/health`
Health check endpoint.

**Response:**
```json
{"status":"ok"}
```

#### POST `/v1/proxy`
Proxy HTTP requests anonymously.

**Headers:**
- `Authorization`: Bearer test_key_123
- `Content-Type`: application/json

**Body:**
```json
{
  "url": "https://example.com",
  "method": "GET",
  "headers": {},
  "body": {},
  "timeoutMs": 30000
}
```

**Response:**
```json
{
  "requestId": "abc123",
  "result": {
    "status": 200,
    "statusText": "OK",
    "headers": {},
    "body": {}
  },
  "viaProxy": true
}
```

## ⚠️ Current Status - BETA

**This is a proof-of-concept MVP.** Current limitations:

- ⚠️ Using Apify for demo purposes (not true Nym mixnet yet)
- ⚠️ Shared API key (demo only - can be rate limited)
- ⚠️ No SLA or uptime guarantees
- ✅ Full Nym SDK integration coming in v1.0

## 🎯 Roadmap

### v0.1 (Current - Beta)
- [x] Basic proxy functionality
- [x] Public API deployment
- [x] Health check endpoint
- [x] Simple authentication

### v1.0 (In Progress)
- [ ] Real Nym mixnet integration
- [ ] User registration & API keys
- [ ] Rate limiting per key
- [ ] Usage analytics
- [ ] Better error handling

### v2.0 (Future)
- [ ] SDK for major languages
- [ ] WebSocket support
- [ ] Custom routing options
- [ ] Privacy metrics dashboard

## 🛠️ Local Development

```bash
# Clone repository
git clone https://github.com/BikramBiswas786/nym-proxy-mvp.git
cd nym-proxy-mvp/api-server

# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your Apify credentials

# Run server
npm start
```

## 🤝 Contributing

Contributions welcome! This is an open-source privacy tool.

1. Fork the repo
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

ISC License - See LICENSE file for details

## ⚡ Tech Stack

- **Runtime**: Node.js + Express
- **Deployment**: Vercel
- **Privacy**: Nym Mixnet (integration in progress)
- **Current Backend**: Apify Actor (temporary)

## 🔗 Links

- **Live API**: https://nym-proxy-backend.vercel.app
- **GitHub**: https://github.com/BikramBiswas786/nym-proxy-mvp
- **Nym Network**: https://nymtech.net

## 💬 Feedback

This is a beta release. Your feedback helps make it better!

- Open an issue for bugs/features
- Star the repo if you find it useful
- Share with privacy-focused communities

---

**Built with 🔒 for privacy advocates**

