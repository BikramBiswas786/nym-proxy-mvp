import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ApifyClient } from 'apify-client';
import { nanoid } from 'nanoid';
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public')); // Serve static files
const client = new ApifyClient({ token: process.env.APIFY_TOKEN });
const VALID_API_KEYS = new Set(
  (process.env.VALID_API_KEYS || '').split(',').map(k => k.trim()).filter(Boolean)
);
const requestLog = [];
const proxyResults = new Map(); // Store proxy results by token ID

function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const key = auth.replace('Bearer ', '').trim();
  if (!VALID_API_KEYS.has(key)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  req.apiKey = key;
  next();
}
function logRequest(req, res, next) {
  const requestId = nanoid(10);
  const startTime = Date.now();
  req.requestId = requestId;
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    requestLog.push({
      requestId,
      timestamp: new Date().toISOString(),
      status: res.statusCode,
      duration: duration + 'ms'
    });
  });
  next();
}
app.use(logRequest);
app.post('/v1/proxy', authenticate, async (req, res) => {
  const { url, method = 'GET', headers = {}, body, timeoutMs } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'url required' });
  }
  try {
    const run = await client.actor(process.env.ACTOR_ID).call(
      { url, method, headers, body, timeoutMs: timeoutMs || 90000 },
      { timeout: 120000 }
    );
    const kvStore = await client.keyValueStore(run.defaultKeyValueStoreId);
    const result = await kvStore.getRecord('RESULT');
    if (!result) {
      return res.status(502).json({ error: 'No result' });
    }
        // Store result for later retrieval
        const token = req.requestId;
        proxyResults.set(token, result.value);
        // Auto-expire after 24 hours
        setTimeout(() => proxyResults.delete(token), 24 * 60 * 60 * 1000);
    res.json({
      requestId: req.requestId,
      result: result.value,
            viewUrl: `/v1/proxy/${token}`,
      viaProxy: true
    });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// GET endpoint to view proxy result by token
app.get('/v1/proxy/:token', (req, res) => {
    const { token } = req.params;
    const result = proxyResults.get(token);

    if (!result) {
          return res.status(404).json({ error: 'Proxy result not found or expired' });
        }

    // Serve the HTML content directly
    res.setHeader('Content-Type', 'text/html');
    res.send(result.body || result);
  });

// Root route - Beautiful landing page
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔒 Nym Privacy Proxy - One-Click Anonymous Browsing</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            max-width: 650px;
            width: 100%;
            background: rgba(255,255,255,0.98);
            padding: 50px 40px;
            border-radius: 20px;
            box-shadow: 0 30px 80px rgba(0,0,0,0.3);
            text-align: center;
        }
        h1 {
            font-size: 3rem;
            margin-bottom: 10px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            font-weight: 800;
        }
        .tagline {
            font-size: 1.3rem;
            color: #555;
            margin-bottom: 40px;
            font-weight: 500;
        }
        .input-group {
            position: relative;
            margin-bottom: 30px;
        }
        input {
            width: 100%;
            padding: 18px;
            font-size: 17px;
            border: 3px solid #e2e8f0;
            border-radius: 12px;
            transition: all 0.3s;
        }
        input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102,126,234,0.1);
        }
        .buttons {
            display: grid;
            gap: 15px;
            margin-bottom: 40px;
        }
        button {
            padding: 18px;
            font-size: 18px;
            font-weight: 600;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s;
        }
        .primary {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
        }
        .primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(102,126,234,0.4);
        }
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 15px;
            margin-top: 40px;
        }
        .feature {
            padding: 15px;
            background: #f7fafc;
            border-radius: 10px;
            font-size: 14px;
            color: #4a5568;
            font-weight: 600;
        }
        .footer {
            margin-top: 30px;
            font-size: 13px;
            color: #718096;
        }
        .footer a {
            color: #667eea;
            text-decoration: none;
            font-weight: 600;
        }
        #result {
            margin-top: 20px;
            padding: 20px;
            background: #f7fafc;
            border-radius: 10px;
            border-left: 4px solid #667eea;
            text-align: left;
            display: none;
        }
        .status { color: #48bb78; font-weight: 700; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔒 Nym Proxy</h1>
        <p class="tagline">Open any website privately. One click. Zero tracking.</p>
        
        <div class="input-group">
            <input type="url" id="urlInput" placeholder="Paste any URL here..." autofocus>
        </div>
        
        <div class="buttons">
            <button class="primary" onclick="openPrivately()">🚀 Open Privately</button>
        </div>
        
        <div class="features">
            <div class="feature">✔️ IP Hidden</div>
            <div class="feature">✔️ No Cookies</div>
            <div class="feature">✔️ Free Forever</div>
        </div>
        
        <div id="result"></div>
        
        <div class="footer">
            <strong>Beta:</strong> Cloud proxy active. Nym mixnet coming soon. 
            <a href="https://github.com/BikramBiswas786/nym-proxy-mvp" target="_blank">GitHub</a>
        </div>
    </div>

<script>
const API_URL = 'https://nym-proxy-backend.vercel.app/v1/proxy';
const AUTH_KEY = 'test_key_123';

function showResult(msg, isError = false) {
    const r = document.getElementById('result');
    r.style.display = 'block';
    r.style.borderLeftColor = isError ? '#f56565' : '#667eea';
    r.innerHTML = msg;
}

async function openPrivately() {
    const url = document.getElementById('urlInput').value.trim();
    if (!url) {
        alert('⚠️ Please paste a URL');
        return;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        alert('⚠️ URL must start with http:// or https://');
        return;
    }
    
    showResult('<span class="status">🔄 Fetching privately...</span>');
    
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + AUTH_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url })
        });
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'API error');
        }
        
        const data = await res.json();
        showResult('<span class="status">✅ Success! Opening privately...</span>');
        
        setTimeout(() => {
            const w = window.open('', '_blank');
            w.document.write(data.result.body);
            w.document.close();
        }, 500);
        
    } catch (err) {
showResult('<span style="color:#f56565">❌ Error: ' + err.message + '</span>', true);
    }
}

// Auto-fill from query param
const urlParams = new URLSearchParams(window.location.search);
const u = urlParams.get('url') || urlParams.get('u');
if (u) document.getElementById('urlInput').value = decodeURIComponent(u);
</script>
</body>
</html>
  `);
});
app.get('/v1/health', (req, res) => {
  res.json({ status: 'ok' });
});
const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
    console.log("? Privacy Proxy API running on http://localhost:" + PORT);
});

// deployment trigger - fix






// Force redeploy - Beautiful UI live


// Fix template literal in Authorization header - deployment



