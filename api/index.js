import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import axios from 'axios';
const HttpProxyAgent = require('http-proxy-agent');
const HttpsProxyAgent = require('https-proxy-agent');

const app = express();
const SECRET_KEY = crypto.createHmac('sha256', 'fixed-nym-proxy-secret').update('nym-proxy-v2-1').digest('hex');

// Response cache with TTL
const responseCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Connection pool settings
const axiosInstance = axios.create({
  timeout: 50000,
  maxRedirects: 5,
  httpAgent: new (require('http').Agent)({ keepAlive: true, maxSockets: 50 }),
  httpsAgent: new (require('https').Agent)({ keepAlive: true, maxSockets: 50 })
});

app.use(express.json({ limit: '1gb' }));
app.use(express.urlencoded({ limit: '1gb', extended: true }));

app.get('/v1/health', (req, res) => res.json({ status: 'healthy' }));

app.get('/v1/status', (req, res) => res.json({
  service: 'Cloud Proxy',
  version: '2.1',
  features: { openLink: true, copyLink: true, toast: true, streaming: true, caching: true, timeout: '50s' }
}));

app.get('/v1/proxy', (req, res) => {
  const h = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"><title>Cloud Proxy</title><style>*{margin:0;padding:0}body{font-family:Segoe UI;background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;padding:20px}.container{max-width:900px;margin:0 auto}h1{color:#ff6b6b;text-align:center;margin-bottom:30px}.section{background:rgba(15,52,96,0.5);padding:30px;border-radius:12px;margin:20px 0}.input-group{display:flex;gap:10px;margin:20px 0}input{flex:1;min-width:200px;padding:12px;border:2px solid transparent;border-radius:8px;background:rgba(255,255,255,0.1);color:#fff;transition:all 0.3s}input:focus{outline:none;border-color:#ff6b6b;box-shadow:0 0 10px rgba(255,107,107,0.3)}.btn{padding:12px 24px;background:linear-gradient(135deg,#ff6b6b,#e94560);color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;transition:all 0.3s}.btn:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(255,107,107,0.4)}.result-box{display:none;background:rgba(0,0,0,0.3);padding:20px;border-radius:10px;margin:20px 0}.result-box.show{display:block}.result-url{background:rgba(0,0,0,0.5);padding:15px;border-radius:8px;color:#4fc3f7;word-break:break-all;font-family:monospace;margin:15px 0;border-left:4px solid #ff6b6b}.action-buttons{display:none;gap:12px;margin:15px 0}.action-buttons.show{display:flex}.btn-action{flex:1;min-width:120px}.btn-open{background:linear-gradient(135deg,#4caf50,#45a049)}.btn-copy{background:linear-gradient(135deg,#2196f3,#1976d2)}.toast-container{position:fixed;top:20px;right:20px;z-index:9999}.toast{background:rgba(0,0,0,0.9);color:#fff;padding:12px 16px;border-radius:8px;border-left:4px solid #ff6b6b;margin:8px 0;animation:slideIn 0.3s}@keyframes slideIn{from{transform:translateX(400px)}to{transform:translateX(0)}}</style></head><body><div class="toast-container" id="toast"></div><div class="container"><h1>Cloud Proxy v2.1</h1><div class="section"><h2>Generate Link</h2><div class="input-group"><input id="url" type="url" placeholder="https://example.com"/><button class="btn" onclick="gen()">Generate</button></div><div id="result" class="result-box"><div style="color:#a0a0a0;margin-bottom:10px">Proxy Link:</div><div class="result-url" id="link"></div><div class="action-buttons" id="btns"><button class="btn btn-action btn-open" onclick="open()">Open</button><button class="btn btn-action btn-copy" onclick="copy()">Copy</button></div></div></div></div><script>let url='';async function gen(){const u=document.getElementById('url').value;if(!u){show('Enter URL','error');return}try{const r=await fetch('/v1/proxy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:u})});const d=await r.json();if(!r.ok){show('Error: '+d.error,'error');return}url=d.proxyUrl;document.getElementById('link').textContent=url;document.getElementById('result').classList.add('show');document.getElementById('btns').classList.add('show');show('Link generated!','success')}catch(e){show('Error: '+e.message,'error')}}function open(){if(!url){show('Generate link first','error');return}window.open(url,'_blank');show('Opening...','success')}function copy(){if(!url){show('Generate link first','error');return}navigator.clipboard.writeText(url).then(()=>{show('Copied!','success')}).catch(()=>{show('Copy failed','error')})}function show(m,t){const c=document.getElementById('toast');const x=document.createElement('div');x.className='toast '+t;x.innerHTML=m;c.appendChild(x);setTimeout(()=>{x.remove()},3000)}</script></body></html>`;
  res.type('text/html').send(h);
});

function toUrlSafeBase64(str) {
  return Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function fromUrlSafeBase64(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(str.length + (4 - str.length % 4) % 4, '=');
  return Buffer.from(str, 'base64').toString('utf-8');
}

function createToken(url) {
  const payload = toUrlSafeBase64(url);
  const hmac = crypto.createHmac('sha256', SECRET_KEY);
  const signature = hmac.update(payload).digest('hex');
  return `${payload}.${signature}`;
}

function verifyToken(token) {
  try {
    const lastDot = token.lastIndexOf('.');
    if (lastDot === -1) return null;
    const payload = token.substring(0, lastDot);
    const signature = token.substring(lastDot + 1);
    const hmac = crypto.createHmac('sha256', SECRET_KEY);
    const expectedSignature = hmac.update(payload).digest('hex');
    if (signature === expectedSignature) {
      return fromUrlSafeBase64(payload);
    }
    return null;
  } catch (e) {
    console.error('Token verification error:', e.message);
    return null;
  }
}

function getCacheKey(url) {
  return crypto.createHash('sha256').update(url).digest('hex');
}

function getCachedResponse(url) {
  const key = getCacheKey(url);
  const cached = responseCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedResponse(url, data) {
  const key = getCacheKey(url);
  responseCache.set(key, { data, timestamp: Date.now() });
  if (responseCache.size > 100) {
    const firstKey = responseCache.keys().next().value;
    responseCache.delete(firstKey);
  }
}

async function fetchWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await axiosInstance.get(url, {
        responseType: 'arraybuffer',
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
    } catch (e) {
      const delay = Math.pow(2, i) * 1000;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw e;
      }
    }
  }
}

app.post('/v1/proxy', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });
    try { new URL(url); } catch (e) { return res.status(400).json({ error: 'Invalid URL' }); }
    const token = createToken(url);
    const host = req.headers['x-forwarded-host'] || req.get('host') || 'nym-proxy-backend.vercel.app';
    const proto = req.headers['x-forwarded-proto'] || 'https';
    res.json({ proxyUrl: `${proto}://${host}/access/${token}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/access/:token(*)', async (req, res) => {
  const startTime = Date.now();
  try {
    const token = req.params.token;
    const url = verifyToken(token);
    if (!url) return res.status(400).json({ error: 'Invalid or tampered token' });
    
    try { new URL(url); } catch (e) { return res.status(400).json({ error: 'Invalid URL in token' }); }
    
    // Check cache
    const cached = getCachedResponse(url);
    if (cached) {
      console.log(`[CACHE HIT] ${url} (${Date.now() - startTime}ms)`);
      res.set({ 'Content-Type': cached.contentType, 'X-Cache': 'HIT', 'Cache-Control': 'public, max-age=300' });
      return res.send(cached.buffer);
    }
    
    // Fetch with retry logic
    const response = await fetchWithRetry(url);
    const contentType = response.headers['content-type'] || 'text/html';
    
    // Cache successful response
    setCachedResponse(url, { buffer: response.data, contentType });
    
    res.set({ 'Content-Type': contentType, 'X-Cache': 'MISS', 'Cache-Control': 'public, max-age=300', 'X-Response-Time': `${Date.now() - startTime}ms` });
    res.send(response.data);
  } catch (e) {
    const elapsed = Date.now() - startTime;
    console.error(`[ERROR] Failed to fetch (${elapsed}ms): ${e.message}`);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Failed to fetch: ' + e.message, duration: `${elapsed}ms` });
    } else {
      res.end();
    }
  }
});

export default app;
