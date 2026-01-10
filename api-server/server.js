import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
const cache = new Map();

// Embedded HTML - served when index.html can't be read from filesystem
const indexHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Cloud Proxy - Crypto DEX</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:linear-gradient(135deg,#1a1a2e,#16213e);min-height:100vh;padding:20px;color:#ccc}body.dark-mode{background:linear-gradient(135deg,#0f0f1e,#1a1a2e)}.container{max-width:1000px;margin:0 auto;background:#0f3460;border-radius:15px;box-shadow:0 20px 60px rgba(0,0,0,0.5);overflow:hidden}.header{background:linear-gradient(135deg,#e94560,#ff6b6b);color:white;padding:30px;text-align:center}.header h1{font-size:2.5rem;margin-bottom:5px}.header p{font-size:1.1rem;opacity:0.9}.main{padding:30px}.section{margin-bottom:25px}.section h2{color:#e94560;margin-bottom:15px;font-size:1.4rem;border-bottom:2px solid #e94560;padding-bottom:10px}.dex-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;margin:15px 0}.dex-btn{background:#16213e;border:2px solid #e94560;color:#e94560;padding:12px;border-radius:8px;cursor:pointer;font-weight:600;transition:all 0.3s;text-align:center}.dex-btn:hover{background:#e94560;color:white;transform:scale(1.05)}.dex-btn:active{transform:scale(0.98)}.dex-btn.loading{opacity:0.6;pointer-events:none}.input-group{display:flex;gap:10px;margin:15px 0}.url-input{flex:1;padding:12px;border:2px solid #16213e;border-radius:8px;background:#1a1a2e;color:white;font-size:1rem}.url-input:focus{outline:none;border-color:#e94560}.btn-group{display:flex;gap:8px}.btn{padding:12px 20px;border:none;border-radius:8px;cursor:pointer;font-weight:600;transition:all 0.3s;min-width:120px}.btn-primary{background:#e94560;color:white}.btn-primary:hover{background:#ff6b6b}.btn-secondary{background:#4caf50;color:white}.btn-secondary:hover{background:#66bb6a}.btn-tertiary{background:#2196F3;color:white}.btn-tertiary:hover{background:#42a5f5}.message{padding:12px;border-radius:8px;margin:10px 0;display:none}.message.success{background:#4caf50;color:white;border-left:4px solid #45a049}.message.error{background:#ff5252;color:white;border-left:4px solid #d32f2f}.message.loading{background:#2196F3;color:white;border-left:4px solid #1976d2}.spinner{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top:2px solid white;border-radius:50%;animation:spin 0.8s linear infinite}@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}.privacy-note{background:#1a1a2e;padding:15px;border-radius:8px;border-left:4px solid #e94560;margin:15px 0}.privacy-note h3{color:#e94560;margin-bottom:8px}.privacy-note p{color:#999;line-height:1.6;font-size:0.9rem}.donation-section{background:#16213e;padding:15px;border-radius:8px;margin:15px 0;border-left:4px solid #4caf50}.donation-section h3{color:#4caf50;margin-bottom:10px;font-size:1rem}.donation-text{color:#999;margin-bottom:8px;font-size:0.9rem}.donation-address{background:#0f3460;padding:10px;border-radius:6px;word-break:break-all;font-family:monospace;font-size:0.85rem;color:#ccc;cursor:pointer;transition:background 0.3s}.donation-address:hover{background:#1a1a2e}.footer{background:#0f3460;padding:15px;text-align:center;color:#666;font-size:0.85rem;border-top:1px solid #16213e}</style></head><body><div class="container"><div class="header"><h1>💎 Cloud Proxy</h1><p>Fast & Anonymous DEX Access</p></div><div class="main"><div class="section"><h2>🚀 Quick DEX Access</h2><div class="dex-grid"><button class="dex-btn" onclick="accessDex('https://uniswap.org')">Uniswap</button><button class="dex-btn" onclick="accessDex('https://pancakeswap.finance')">PancakeSwap</button><button class="dex-btn" onclick="accessDex('https://raydium.io')">Raydium</button><button class="dex-btn" onclick="accessDex('https://curve.fi')">Curve</button><button class="dex-btn" onclick="accessDex('https://aave.com')">Aave</button><button class="dex-btn" onclick="accessDex('https://1inch.io')">1inch</button><button class="dex-btn" onclick="accessDex('https://dex.guru')">Dex.guru</button><button class="dex-btn" onclick="accessDex('https://kyberswap.com')">KyberSwap</button><button class="dex-btn" onclick="accessDex('https://quickswap.exchange')">QuickSwap</button><button class="dex-btn" onclick="accessDex('https://sushiswap.fi')">SushiSwap</button></div></div><div class="section"><h2>👛 Support Our Work</h2><div class="donation-section"><h3>♥ Donation Wallet</h3><p class="donation-text">If you find this tool useful, consider supporting development:</p><p class="donation-address" onclick="copyDonation()">0x742d35Cc6634C0532925a3b844Bc9e7595f42e0f</p><p class="donation-text" style="margin-top:8px;font-size:0.8rem;color:#666">(Click to copy)</p></div></div><div class="section"><h2>🔒 Custom URL</h2><div class="input-group"><input type="url" id="urlInput" class="url-input" placeholder="Enter any URL (https://example.com)"><div class="btn-group"><button class="btn btn-primary" onclick="proxyOpen()">Open</button><button class="btn btn-secondary" onclick="proxyCopy()">Copy</button><button class="btn btn-tertiary" onclick="proxyPreview()">Preview</button></div></div><div id="message" class="message"></div></div><div class="privacy-note"><h3>✓ Privacy Guaranteed</h3><p><strong>IP Hidden:</strong> Targets see our server IP only<br><strong>No Tracking:</strong> Zero cookies or profiling<br><strong>24h Auto-Delete:</strong> All cached content expires<br><strong>Anonymous:</strong> Perfect for crypto traders</p></div></div><div class="footer"><p>Cloud Proxy © 2026 | Fast • Private • Anonymous | <a href="https://github.com/BikramBiswas786/nym-proxy-mvp" style="color:#e94560;text-decoration:none" target="_blank">GitHub</a></p></div></div><script>const API_BASE='/v1/proxy';function showMsg(msg,type){const el=document.getElementById('message');el.textContent=msg;el.className='message '+type;el.style.display='block';setTimeout(()=>{el.style.display='none'},4000)}function copyDonation(){const wallet='0x742d35Cc6634C0532925a3b844Bc9e7595f42e0f';navigator.clipboard.writeText(wallet);showMsg('✓ Wallet address copied!','success')}async function proxyFetch(url){try{showMsg('🔄 Connecting...','loading');const response=await fetch(API_BASE,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:url})});if(!response.ok)throw new Error(`HTTP ${response.status}`);const data=await response.json();if(!data.success)throw new Error(data.error);return data}catch(err){showMsg('❌ '+err.message,'error');return null}}async function accessDex(url){const data=await proxyFetch(url);if(data){window.open(window.location.origin+'/v1/proxy/view/'+data.token,'_blank','width=1200,height=800');showMsg('✓ Opened in new window','success')}}async function proxyCopy(){const url=document.getElementById('urlInput').value;if(!url){showMsg('Enter URL first','error');return}const data=await proxyFetch(url);if(data){const link=window.location.origin+'/v1/proxy/view/'+data.token;navigator.clipboard.writeText(link);showMsg('✓ Copied to clipboard','success')}}async function proxyOpen(){const url=document.getElementById('urlInput').value;if(!url){showMsg('Enter URL first','error');return}const data=await proxyFetch(url);if(data){window.open(window.location.origin+'/v1/proxy/view/'+data.token,'_blank','width=1200,height=800');showMsg('✓ Opened','success')}}async function proxyPreview(){const url=document.getElementById('urlInput').value;if(!url){showMsg('Enter URL first','error');return}const data=await proxyFetch(url);if(data){showMsg('✓ Ready ('+Math.round(data.size/1024)+'KB)','success')}}</script></body></html>`;

// Cleanup expired cache entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of cache) {
    if (now > v.exp) cache.delete(k);
  }
}, 10 * 60 * 1000);

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Health check endpoint
app.get('/v1/health', (r, s) => s.json({ ok: true }));

// Status endpoint
app.get('/v1/status', (r, s) => {
  s.json({
    mixnetEnabled: false,
    mixnetConfigured: false,
    mixnetHealthy: false,
    latency: null,
    privacy: {
      current: 'Basic (Standard proxy)',
      metadataProtection: false,
      trafficAnalysisResistance: false
    }
  });
});

// Proxy endpoint - creates cached token
app.post('/v1/proxy', async (r, s) => {
  const url = r.body?.url;
  if (!url) return s.status(400).json({ error: 'URL required' });
  
  try {
    const res = await fetch(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    let html = await res.text();
    
    // Inject base href to fix relative URLs
    const baseHref = `<base href="${url}" />`;
    html = html.replace(/<head[^>]*>/i, match => `${match}${baseHref}`);
    
    const t = crypto.randomBytes(16).toString('hex');
    cache.set(t, { h: html, exp: Date.now() + 4 * 60 * 60 * 1000 });
    
    s.json({
      success: true,
      token: t,
      size: html.length,
      viaProxy: true,
      viaMixnet: false,
      privacyLevel: 'basic'
    });
  } catch (e) {
    console.error('Proxy error:', e.message);
    s.status(500).json({ error: e.message });
  }
});

// GET handler for /v1/proxy - returns proxy info or error
app.get('/v1/proxy', (r, s) => {
  s.status(400).json({ error: 'GET requests not supported. Use POST with a URL in the request body.' });
});


// View proxied content
app.get('/v1/proxy/view/:t', (r, s) => {
  const c = cache.get(r.params.t);
  if (!c || Date.now() > c.exp) {
    return s.status(404).json({ error: 'Token expired or not found' });
  }
  s.type('text/html').send(c.h);
});

// Serve static files
app.use(express.static('public'));

// Serve frontend for all other requests (catch-all)
app.use((r, s) => {
  s.type('text/html').send(indexHtml);
});

export default app;
