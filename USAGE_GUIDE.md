# Privacy Proxy - Usage Guide

## 🔐 What Is This Service?

This is a **free privacy proxy service** that helps you access websites while protecting your identity. It creates temporary proxy URLs that mask your real IP address.

## 🌐 Live Service
**URL:** https://nym-proxy-backend.vercel.app/

## 📖 How To Use

### Step 1: Enter a URL
1. Go to https://nym-proxy-backend.vercel.app/
2. Enter the website URL you want to access (e.g., `https://example.com`)
3. Click "Generate Proxy"

### Step 2: Get Your Proxy Link  
- You'll receive a unique proxy URL
- This link is valid for **24 hours**
- You can only use it **once**
- Copy or open the link to access the website

### Step 3: Access Content Anonymously
- Your proxy link masks your real IP address
- The target website sees the proxy server's IP, not yours
- Browse privately and anonymously

## ✅ What Websites Work?

### Works Well With:
- ✅ News websites (BBC, CNN, etc.)
- ✅ Blogs and article sites
- ✅ Simple HTML websites
- ✅ Static content pages
- ✅ Wikipedia and documentation
- ✅ Government and educational sites

### Limited/Doesn't Work:
- ❌ Complex JavaScript applications (React/Vue/Angular SPAs)
- ❌ Crypto DEX platforms (Uniswap, PancakeSwap)
- ❌ Social media feeds (Twitter, Facebook)
- ❌ Video streaming services
- ❌ Interactive web apps with heavy JavaScript
- ❌ WebSocket-based applications

## 🛡️ Why Use This?

### Privacy Protection
- **Hide Your IP:** Websites can't see your real IP address
- **Bypass Blocks:** Access geo-restricted or blocked content
- **No Tracking:** We don't log your activity
- **Temporary Links:** Links expire after 24 hours for security

### Use Cases
- Access news sites blocked in your region
- Read articles without revealing your location
- Browse documentation anonymously
- Test website accessibility from different IPs

## ⚠️ Limitations

### Technical Limitations
1. **No JavaScript Apps:** Complex SPAs don't render properly
2. **Single Use Links:** Each proxy URL works only once
3. **24-Hour Expiration:** Links expire after 24 hours
4. **No Assets Rewriting:** CSS/JS paths may break on complex sites

### What This Is NOT
- ❌ Not a full VPN replacement
- ❌ Not for streaming video
- ❌ Not for interactive applications
- ❌ Not for WebSocket/real-time apps

## 🔒 Privacy Features

- **IP Masking:** Your IP is hidden from target websites
- **No Logs:** We don't store your browsing history
- **Temporary Links:** Auto-expire for security
- **HTTPS Support:** Secure connections supported
- **Privacy Headers:** Sets X-Privacy-Protected headers

## 💰 Support Development

If you find this service useful, consider supporting with Monero (XMR):

**Monero Address:**
```
[Your Monero wallet address here]
```

*Privacy-focused donations accepted. No tracking, no logs.*

## ⚙️ Technical Details

### How It Works
1. You submit a URL
2. Server generates a unique token
3. Token is linked to your URL for 24 hours
4. When accessed, server fetches content on your behalf
5. Content is served to you with your IP hidden

### Architecture
- **Backend:** Node.js/Express serverless function
- **Hosting:** Vercel edge network
- **Security:** CORS enabled, rate limiting
- **Storage:** In-memory link management (Map)

## 📋 Frequently Asked Questions

### Q: Is this service free?
A: Yes, completely free. Donations welcome.

### Q: Do you log my activity?
A: No. We don't store any browsing history or user data.

### Q: Why don't complex websites work?
A: Complex sites need asset path rewriting and JavaScript handling that simple proxies don't provide.

### Q: Can I use this instead of a VPN?
A: No. This is for accessing specific URLs, not full VPN protection.

### Q: Is this legal?
A: Using proxies is legal in most countries. Check your local laws.

### Q: Why 24-hour expiration?
A: Security best practice. Temporary links reduce abuse risk.

## 🚀 Best Practices

1. **Use for Simple Sites:** Works best with news, blogs, documentation
2. **One URL at a Time:** Generate new links as needed
3. **Don't Share Links:** Links are single-use
4. **Check Expiration:** Links expire in 24 hours
5. **Test First:** Try with a simple site before important use

## 📞 Contact & Support

- **GitHub:** https://github.com/BikramBiswas786/nym-proxy-mvp
- **Issues:** Report bugs on GitHub Issues

---

**Note:** This service is provided as-is. While we prioritize privacy, use at your own discretion for sensitive activities. For maximum security, use a reputable VPN service.
