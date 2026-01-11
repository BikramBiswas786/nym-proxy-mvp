import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
const proxyLinks = new Map();

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Redirect root to proxy interface
app.get('/', (req, res) => {
    res.redirect('/v1/proxy');
  });

// Health check
app.get('/v1/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Status
app.get('/v1/status', (req, res) => {
  res.json({ service: 'Privacy Proxy', version: '1.0', mode: 'single-proxy-per-url', features: { ipMasking: true, noLogs: true, https: true, expirationTime: '24 hours' } });
});

// GET /v1/proxy - Serve HTML interface
app.get('/v1/proxy', (req, res) => {
  const html = `<!DOCTYPE html><html><head><title>Privacy Proxy</title><style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: Arial; background: linear-gradient(135deg, #1a1a2e, #16213e); min-height: 100vh; padding: 20px; color: #e0e0e0; } .container { max-width: 800px; margin: 0 auto; background: rgba(15, 52, 96, 0.9); border-radius: 12px; padding: 40px; border: 1px solid #e94560; } .header { text-align: center; margin-bottom: 30px; } .header h1 { font-size: 2.5rem; color: #ff6b6b; margin-bottom: 10px; } .header p { font-size: 1.1rem; color: #b0b0b0; } .input-group { display: flex; gap: 10px; margin: 20px 0; } .url-input { flex: 1; padding: 15px; border: 2px solid #e94560; border-radius: 8px; background: #1a1a2e; color: white; font-size: 1rem; } .btn { padding: 15px 40px; background: linear-gradient(135deg, #e94560, #ff6b6b); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 1rem; } .btn:hover { transform: translateY(-3px); box-shadow: 0 10px 25px rgba(233, 69, 96, 0.4); } .result { margin-top: 30px; padding: 20px; background: rgba(233, 69, 96, 0.1); border: 2px solid #e94560; border-radius: 10px; display: none; } .result.show { display: block; } .proxy-url { background: #000; color: #90ee90; padding: 15px; border-radius: 8px; font-family: monospace; word-break: break-all; margin: 15px 0; } .action-buttons { display: flex; gap: 10px; margin-top: 15px; } .btn-action { flex: 1; padding: 12px; background: #ffc107; color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; } .btn-action:hover { background: #ffed4e; } .message { margin-top: 15px; padding: 12px; border-radius: 8px; display: none; } .message.success { background: #4caf50; color: white; } .message.error { background: #f44336; color: white; } .message.show { display: block; } .loading { display: none; text-align: center; color: #ff6b6b; margin: 15px 0; } .loading.show { display: block; }</style></head><body><div class="container"><div class="header"><h1>🔐 Privacy Proxy</h1><p>Access blocked content. Get 1 proxy URL. 24-hour expiration.</p></div><div class="input-group"><input type="text" id="urlInput" class="url-input" placeholder="https://www.bbc.com" /><button class="btn" onclick="generateProxy()">Generate Proxy</button></div><div class="loading" id="loading">🔄 Generating proxy link...</div><div class="result" id="result"><h3>✅ Your Proxy Link:</h3><div class="proxy-url" id="proxyUrl"></div><p id="expiresIn" style="color: #ffeb3b; margin: 10px 0;"></p><div class="action-buttons"><button class="btn-action" onclick="openProxy()">🔗 Open Link</button><button class="btn-action" onclick="copyProxy()">📋 Copy Link</button></div></div><div class="message" id="message"></div></div><script>let currentProxyUrl = ''; async function generateProxy() { const url = document.getElementById('urlInput').value.trim(); if (!url) { showMessage('Please enter a URL', 'error'); return; } document.getElementById('loading').classList.add('show'); document.getElementById('result').classList.remove('show'); try { const response = await fetch('/v1/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) }); const data = await response.json(); if (data.success) { currentProxyUrl = data.proxyUrl; document.getElementById('proxyUrl').textContent = data.proxyUrl; document.getElementById('expiresIn').textContent = '⏰ Expires: ' + data.expiresIn; document.getElementById('result').classList.add('show'); document.getElementById('urlInput').value = ''; showMessage('✅ Proxy link generated! Click "Open Link" or "Copy Link"', 'success'); } else { showMessage('Error: ' + data.error, 'error'); } } catch (e) { showMessage('Error generating proxy: ' + e.message, 'error'); } finally { document.getElementById('loading').classList.remove('show'); } } function openProxy() { if (currentProxyUrl) { window.open(currentProxyUrl, '_blank'); showMessage('✅ Opened proxy link in new tab', 'success'); } } function copyProxy() { if (currentProxyUrl) { navigator.clipboard.writeText(currentProxyUrl).then(() => { showMessage('✅ Proxy link copied to clipboard!', 'success'); }).catch(() => { showMessage('❌ Failed to copy', 'error'); }); } } function showMessage(text, type) { const msg = document.getElementById('message'); msg.textContent = text; msg.className = 'message ' + type + ' show'; setTimeout(() => msg.classList.remove('show'), 4000); } document.getElementById('urlInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') generateProxy(); });</script></body></html>`;
  res.type('text/html').send(html);
});

// POST /v1/proxy - Generate proxy URL
app.post('/v1/proxy', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });
    try { new URL(url); } catch (e) { return res.status(400).json({ error: 'Invalid URL' }); }
    
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    proxyLinks.set(token, { url, createdAt: new Date(), expiresAt, accessed: false });
    
    res.json({
      success: true,
      originalUrl: url,
      proxyUrl: `https://nym-proxy-backend.vercel.app/access/${token}`,
      expiresAt: expiresAt.toISOString(),
      expiresIn: '24 hours'
    });
  } catch (e) {
    res.status(500).json({ error: 'Server error', details: e.message });
  }
});

// GET /access/:token - Access proxied content
app.get('/access/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const proxyData = proxyLinks.get(token);
    
    if (!proxyData) return res.status(404).json({ error: 'Link expired or invalid' });
    if (new Date() > new Date(proxyData.expiresAt)) {
      proxyLinks.delete(token);
      return res.status(410).json({ error: 'Link expired. Generate new.' });
    }
    
    const response = await fetch(proxyData.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 Privacy-Proxy/1.0' },
      timeout: 15000
    });
    
    if (!response.ok) return res.status(response.status).json({ error: `Target returned ${response.status}` });
    const content = await response.text();
    proxyData.accessed = true;
    
    res.set({
      'Content-Type': response.headers.get('content-type') || 'text/html',
      'X-Privacy-Protected': 'true',
      'X-IP-Masked': 'true',
      'Cache-Control': 'no-store'
    });
    res.send(content);
  } catch (e) {
    res.status(500).json({ error: 'Failed to access content', details: e.message });
  }
});



export default app;
