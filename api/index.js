import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import axios from 'axios';

const app = express();
const SECRET_KEY = crypto.createHmac('sha256', 'fixed-nym-proxy-secret').update('nym-proxy-v2-1').digest('hex');

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

app.get('/v1/health', (req, res) => res.json({ status: 'healthy' }));

app.get('/v1/status', (req, res) => res.json({
  service: 'Cloud Proxy',
  version: '2.1',
  features: { openLink: true, copyLink: true, caching: true, timeout: '60s' }
}));

app.get('/v1/proxy', (req, res) => {
  const h = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"><title>Cloud Proxy v2.1</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui;background:#0f0f0f;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}form{width:100%;max-width:500px;background:#1a1a1a;padding:40px;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.3);border:1px solid #333}h1{margin-bottom:30px;font-size:28px;text-align:center;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}label{display:block;margin-bottom:8px;font-weight:600;color:#aaa;font-size:14px}.input-group{margin-bottom:20px}input{width:100%;padding:12px;border:1px solid #444;background:#0f0f0f;color:#fff;border-radius:8px;font-size:14px;transition:all 0.3s}input:focus{outline:none;border-color:#667eea;box-shadow:0 0 0 3px rgba(102,126,234,0.1)}button{width:100%;padding:12px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;transition:all 0.3s}button:hover{transform:translateY(-2px);box-shadow:0 8px 16px rgba(102,126,234,0.4)}.info{margin-top:20px;padding:15px;background:#1a1a1a;border-left:3px solid #667eea;border-radius:4px;font-size:12px;color:#999}.error{color:#ff6b6b;margin-top:10px;padding:10px;background:#1a1a1a;border-radius:4px;display:none}.success{color:#51cf66;margin-top:10px;padding:10px;background:#1a1a1a;border-radius:4px;display:none}#result{margin-top:20px;padding:15px;background:#1a1a1a;border-radius:8px;display:none;word-break:break-all}#result a{color:#667eea;text-decoration:none}#result a:hover{text-decoration:underline}</style></head><body><form id="form"><h1>Cloud Proxy</h1><div class="input-group"><label>URL to Proxy</label><input type="url" id="url" placeholder="https://example.com" required></div><button type="submit">Generate Proxy Link</button><div id="result"></div><div class="error" id="error"></div><div class="success" id="success"></div><div class="info">Enter any website URL to generate a secure proxy link. Your proxy link can be shared and accessed anonymously.</div></form><script>document.getElementById('form').addEventListener('submit',async(e)=>{e.preventDefault();const url=document.getElementById('url').value;const errorEl=document.getElementById('error');const successEl=document.getElementById('success');const resultEl=document.getElementById('result');errorEl.style.display='none';successEl.style.display='none';resultEl.style.display='none';try{const response=await fetch('/v1/proxy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});const data=await response.json();if(!response.ok){errorEl.textContent='Error: '+(data.error||'Failed to generate proxy link');errorEl.style.display='block';return;}const proxyUrl=window.location.origin+'/access/'+data.token;resultEl.innerHTML=`<strong>Proxy Link Generated!</strong><br><a href="${proxyUrl}" target="_blank">${proxyUrl}</a><br><br><input type="text" value="${proxyUrl}" style="width:100%;padding:8px;margin-top:10px;background:#0f0f0f;border:1px solid #444;border-radius:4px;color:#fff;" readonly>`;resultEl.style.display='block';successEl.textContent='Proxy link created successfully!';successEl.style.display='block';}catch(e){errorEl.textContent='Error: '+e.message;errorEl.style.display='block';}});</script></body></html>`;
  res.type('text/html').send(h);
});

function toUrlSafeBase64(str) {
  return Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function fromUrlSafeBase64(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = str.length % 4;
  if (padding) str += '='.repeat(4 - padding);
  return Buffer.from(str, 'base64').toString('utf8');
}

function verifyToken(token) {
  try {
    const lastDot = token.lastIndexOf('.');
    const payload = token.substring(0, lastDot);
    const signature = token.substring(lastDot + 1);
    const hmac = crypto.createHmac('sha256', SECRET_KEY);
    const expectedSignature = hmac.update(payload).digest('hex').substring(0, 16);
    return fromUrlSafeBase64(payload);
  } catch (e) {
    return null;
  }
}

app.post('/v1/proxy', async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ error: 'URL is required' });
    try { new URL(url); } catch (e) { return res.status(400).json({ error: 'Invalid URL' }); }
    const token = crypto.randomBytes(16).toString('base64url');
    return res.status(200).json({
      success: true,
      token: token,
      size: 0,
      duration: 0
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// NEW: Direct /proxy/:encodedurl route handler
app.get('/proxy/:encodedurl(*)', async (req, res) => {
  try {
    const encodedurl = req.params.encodedurl;
    let url;
    try {
      url = fromUrlSafeBase64(encodedurl);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL encoding' });
    }
    try { new URL(url); } catch (e) { return res.status(400).json({ error: 'Invalid URL format' }); }
    const response = await axios.get(url, {
      timeout: 60000,
      maxRedirects: 5,
      headers: { 'User-Agent': 'Mozilla/5.0' },
      responseType: 'arraybuffer'
    });
    res.set('Content-Type', response.headers['content-type'] || 'text/html');
    res.set('Cache-Control', 'public, max-age=3600');
    res.status(200).send(response.data);
  } catch (e) {
    console.error('proxy error', e.message);
    return res.status(502).json({ error: 'Failed to fetch: ' + (e.message || 'Unknown error') });
  }
});

// Backward compatibility: /access/:token route
app.get('/access/:token(*)', async (req, res) => {
  try {
    const token = req.params.token;
    let url;
    try {
      url = fromUrlSafeBase64(token);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid token' });
    }
    try { new URL(url); } catch (e) { return res.status(400).json({ error: 'Invalid URL' }); }
    const response = await axios.get(url, {
      timeout: 60000,
      maxRedirects: 5,
      headers: { 'User-Agent': 'Mozilla/5.0' },
      responseType: 'arraybuffer'
    });
    res.set('Content-Type', response.headers['content-type'] || 'text/html');
    res.set('Cache-Control', 'public, max-age=3600');
    res.status(200).send(response.data);
  } catch (e) {
    console.error('access error', e.message);
    return res.status(502).json({ error: 'Failed to fetch: ' + (e.message || 'Unknown error') });
  }
});

export default app;
