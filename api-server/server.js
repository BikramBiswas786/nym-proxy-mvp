import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
const proxyLinks = new Map();

app.use(cors());
app.use(express.json({limit:'5mb'}));

// Health check endpoint
app.get('/v1/health', (req, res) => {
  res.json({status: 'healthy', timestamp: new Date().toISOString()});
});

// Status endpoint
app.get('/v1/status', (req, res) => {
  res.json({
    service: 'NYM Proxy + HTTP Access',
    version: '1.0',
    features: {
      privacy: true,
      anonymousAccess: true,
      tokenBasedLinks: true
    }
  });
});

// UI endpoint
app.get('/v1/proxy', (req, res) => {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>NYM Proxy</title>
  <style>
    body { font-family: sans-serif; margin: 20px; background: #f0f0f0; }
    .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
    h1 { color: #333; }
    input { width: 100%; padding: 10px; margin: 10px 0; font-size: 16px; }
    button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
    button:hover { background: #0056b3; }
    .result { margin-top: 20px; padding: 10px; background: #e8f4f8; border-radius: 4px; }
    code { background: #f5f5f5; padding: 10px; display: block; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>NYM Proxy</h1>
    <p>Generate anonymous links for any URL</p>
    <input type="text" id="urlInput" placeholder="Enter URL to proxy (e.g., https://example.com)" />
    <button onclick="generateLink()">Generate Anonymous Link</button>
    <div id="result"></div>
  </div>
  <script>
    async function generateLink() {
      const url = document.getElementById('urlInput').value;
      if (!url) return alert('Please enter a URL');
      try {
        const response = await fetch('/v1/proxy', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({url})
        });
        const data = await response.json();
        if (data.proxyUrl) {
          document.getElementById('result').innerHTML = `
            <div class="result">
              <p><strong>Anonymous Link Generated:</strong></p>
              <code><a href="${data.proxyUrl}" target="_blank">${data.proxyUrl}</a></code>
              <p>Expires in: ${data.expiresIn}</p>
            </div>
          `;
        } else {
          alert('Error: ' + (data.error || 'Unknown error'));
        }
      } catch(e) {
        alert('Error: ' + e.message);
      }
    }
  </script>
</body>
</html>
  `;
  res.type('text/html').send(html);
});

// Create proxy link
app.post('/v1/proxy', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });
    
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    proxyLinks.set(token, {
      url,
      createdAt: new Date(),
      expiresAt,
      accessed: false
    });
    
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

// Access proxy link
app.get('/access/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const proxyData = proxyLinks.get(token);
    
    if (!proxyData) {
      return res.status(404).json({ error: 'Link not found' });
    }
    
    if (new Date() > new Date(proxyData.expiresAt)) {
      proxyLinks.delete(token);
      return res.status(410).json({ error: 'Link expired' });
    }
    
    // Fetch the actual content
    const response = await fetch(proxyData.url);
    const content = await response.text();
    
    proxyData.accessed = true;
    res.set({
      'Content-Type': response.headers.get('content-type') || 'text/html',
      'X-Privacy-Protected': 'true',
      'Cache-Control': 'no-store'
    });
    res.send(content);
  } catch (e) {
    res.status(500).json({ error: 'Failed to access content', details: e.message });
  }
});

app.use(express.static('public'));
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', hint: 'POST to /v1/proxy or GET /v1/proxy' });
});

export default app;
