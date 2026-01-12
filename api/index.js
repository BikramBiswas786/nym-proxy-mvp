import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import axios from 'axios';

const app = express();
const SECRET_KEY = crypto.createHmac('sha256', 'fixed-nym-proxy-secret').update('nym-proxy-v2-1').digest('hex');

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/v1/health', (req, res) => res.json({ status: 'healthy' }));

app.get('/v1/status', (req, res) => res.json({
  service: 'Cloud Proxy',
  version: '2.1',
  features: { openLink: true, copyLink: true, caching: true, timeout: '50s' }
}));

app.get('/v1/proxy', (req, res) => {
  const h = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"><title>Cloud Proxy v2.1</title><style>*{margin:0;padding:0}body{font-family:Segoe UI;background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;padding:20px}.container{max-width:900px;margin:0 auto}h1{color:#ff6b6b;text-align:center}input{width:100%;padding:12px;margin:10px 0;border:none;border-radius:8px}button{width:100%;padding:12px;margin:10px 0;background:#ff6b6b;color:white;border:none;border-radius:8px;cursor:pointer}</style></head><body><div class="container"><h1>Cloud Proxy v2.1</h1><input id="url" placeholder="https://example.com"/><button onclick="gen()">Generate Link</button><div id="result" style="margin:20px 0;display:none"><p>Proxy Link:</p><input id="link" readonly/><button onclick="copy()">Copy</button><button onclick="open()">Open</button></div></div><script>function gen(){const u=document.getElementById('url').value;fetch('/v1/proxy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:u})}).then(r=>r.json()).then(d=>{document.getElementById('link').value=d.proxyUrl;document.getElementById('result').style.display='block'})}.function copy(){navigator.clipboard.writeText(document.getElementById('link').value)}.function open(){window.open(document.getElementById('link').value,'_blank')}</script></body></html>`;
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
    return null;
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
  try {
    const token = req.params.token;
    const url = verifyToken(token);
    if (!url) return res.status(400).json({ error: 'Invalid token' });
    try { new URL(url); } catch (e) { return res.status(400).json({ error: 'Invalid URL' }); }
    
    const response = await axios.get(url, {
      timeout: 45000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
      maxRedirects: 5
    });
    
    res.set({ 'Content-Type': response.headers['content-type'] || 'text/html', 'Cache-Control': 'public, max-age=300' });
    res.send(response.data);
  } catch (e) {
    res.status(502).json({ error: 'Failed to fetch: ' + (e.message || 'Unknown error') });
  }
});

export default app;
