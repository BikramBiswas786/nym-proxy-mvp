import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
const app = express();
const proxyLinks = new Map();
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.get('/', (req, res) => {
 res.redirect('/v1/proxy');
});
app.get('/v1/health', (req, res) => {
 res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});
app.get('/v1/status', (req, res) => {
 res.json({ service: 'Privacy Proxy', version: '1.0', mode: 'single-proxy-per-url', features: { ipMasking: true, noLogs: true, https: true, expirationTime: '24 hours' } });
});
app.get('/v1/proxy', (req, res) => {
 const html = `<!DOCTYPE html><html lang='en'><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'><title>Privacy Proxy</title><style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: 'Segoe UI', sans-serif; background: linear-gradient(135deg, #1a1a2e, #16213e); min-height: 100vh; padding: 20px; color: #e0e0e0; } .container { max-width: 900px; margin: 0 auto; background: rgba(15, 52, 96, 0.95); border-radius: 15px; padding: 40px; border: 2px solid #e94560; box-shadow: 0 20px 60px rgba(0,0,0,0.5); } .header { text-align: center; margin-bottom: 30px; } .header h1 { font-size: 2.5rem; color: #ff6b6b; margin-bottom: 10px; } .header p { font-size: 1rem; color: #b0b0b0; } .section { margin-bottom: 25px; padding: 20px; background: rgba(233, 69, 96, 0.1); border-left: 4px solid #e94560; border-radius: 8px; } .section h2 { color: #e94560; margin-bottom: 15px; font-size: 1.3rem; } .input-group { display: flex; gap: 10px; margin: 20px 0; flex-wrap: wrap; } .url-input { flex: 1; min-width: 250px; padding: 15px; border: 2px solid #e94560; border-radius: 8px; background: #1a1a2e; color: white; font-size: 1rem; } .url-input:focus { outline: none; border-color: #ff9800; } .btn { padding: 15px 30px; background: linear-gradient(135deg, #e94560, #ff6b6b); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 0.95rem; transition: all 0.3s; } .btn:hover { transform: translateY(-3px); box-shadow: 0 10px 25px rgba(233, 69, 96, 0.4); } .result { margin-top: 30px; padding: 20px; background: rgba(233, 69, 96, 0.15); border: 2px solid #e94560; border-radius: 10px; display: none; } .result.show { display: block; } .proxy-url { background: #000; color: #90ee90; padding: 15px; border-radius: 8px; font-family: monospace; word-break: break-all; margin: 15px 0; font-size: 0.85rem; } .action-buttons { display: flex; gap: 10px; margin-top: 15px; flex-wrap: wrap; } .btn-action { flex: 1; min-width: 150px; padding: 12px; background: #ffc107; color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s; } .btn-action:hover { background: #ffed4e; transform: translateY(-2px); } .message { margin-top: 15px; padding: 15px; border-radius: 8px; display: none; font-weight: 600; } .message.success { background: #4caf50; color: white; } .message.error { background: #f44336; color: white; } .message.loading { background: #2196F3; color: white; } .message.show { display: block; } .info-list { list-style: none; margin: 15px 0; } .info-list li { padding: 8px 0; color: #ccc; border-bottom: 1px solid #16213e; } .info-list li:last-child { border: none; } .info-list li:before { content: "✓ "; color: #4caf50; font-weight: bold; margin-right: 8px; } .unsupported li:before { content: "✗ "; color: #ff5252; } .donation { background: #1a1a2e; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #4caf50; } .donation h3 { color: #4caf50; margin-bottom: 10px; } .donation-address { background: #0f3460; padding: 12px; border-radius: 6px; word-break: break-all; font-family: monospace; font-size: 0.8rem; color: #ccc; cursor: pointer; user-select: all; transition: all 0.3s; margin: 10px 0; } .donation-address:hover { background: #1a1a2e; color: #4caf50; } .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #16213e; text-align: center; color: #666; font-size: 0.85rem; }</style></head><body><div class='container'><div class='header'><h1>Privacy Proxy</h1><p>Fast & Secure Access to News, Blogs & Public Content</p></div><div class='section'><h2>How to Use</h2><p>Enter any URL below and choose:</p><ul class='info-list'><li>Open in new window</li><li>Copy shareable proxy link</li><li>Check content availability</li></ul></div><div class='section'><h2>Fully Supported Sites</h2><ul class='info-list'><li>BBC, CNN, Reuters, Al Jazeera</li><li>Medium, WordPress Blogs</li><li>GitHub Pages, Wikipedia</li><li>Government & Educational Sites</li></ul></div><div class='section'><h2>Limited Support</h2><ul class='info-list unsupported'><li>YouTube (videos may buffer)</li><li>Instagram (partial image loading)</li><li>LinkedIn (limited features)</li></ul></div><div class='section'><h2>Access Any URL</h2><div class='input-group'><input type='url' id='urlInput' class='url-input' placeholder='https://example.com' /><button class='btn' onclick='generateProxy()'>Generate Proxy</button></div><div class='loading' id='loading' style='display:none; text-align:center; color:#ff6b6b;'>Generating proxy link...</div><div class='result' id='result'><h3 style='color:#e94560;'>Your Proxy Link:</h3><div class='proxy-url' id='proxyUrl'></div><p id='expiresIn' style='color:#ffeb3b;'></p><div class='action-buttons'><button class='btn-action' onclick='openProxy()'>Open Link</button><button class='btn-action' onclick='copyProxy()'>Copy Link</button></div></div><div class='message' id='message'></div></div><div class='section'><h2>Support Development</h2><div class='donation'><h3>Donate with Monero</h3><p style='color:#999; margin-bottom:10px;'>If you find this tool useful, support development:</p><div class='donation-address' onclick='copyDonation()'>8C1NrYqF8GZ2ZpJ17suZbqP5bZGVMZw43W5isFzAKzTd95rvcpTMYmzQq9ioepWcC7cn1NjSgBe5FHF7qHSEiFMyK5Uwq3n</div><p style='color:#666; font-size:0.8rem; margin-top:8px;'>(Click to copy)</p></div></div><div class='section' style='border-left-color:#ff9800;'><h3 style='color:#ff9800;'>Technical Reality</h3><p style='color:#999; line-height:1.6;'>Twitter/Facebook now work with the proxy! Basic content loads successfully. Some real-time features may be limited due to WebSocket requirements, but you can access content through the proxy.</p></div><div class='footer'><p>Privacy Proxy 2026 | Fast Private Anonymous | <a href='https://github.com/BikramBiswas786/nym-proxy-mvp' style='color:#e94560;' target='_blank'>GitHub</a></p></div></div><script> let currentProxyUrl = ''; async function generateProxy() { const url = document.getElementById('urlInput').value.trim(); if (!url) { showMessage('Please enter a URL', 'error'); return; } document.getElementById('loading').style.display = 'block'; document.getElementById('result').classList.remove('show'); try { const response = await fetch('/v1/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: url.startsWith('http') ? url : 'https://' + url }) }); const data = await response.json(); if (data.success) { currentProxyUrl = data.proxyUrl; document.getElementById('proxyUrl').textContent = data.proxyUrl; document.getElementById('expiresIn').textContent = 'Expires: ' + data.expiresIn; document.getElementById('result').classList.add('show'); document.getElementById('urlInput').value = ''; showMessage('Proxy link generated!', 'success'); } else { showMessage('Error: ' + data.error, 'error'); } } catch (e) { showMessage('Error: ' + e.message, 'error'); } finally { document.getElementById('loading').style.display = 'none'; } } function openProxy() { if (currentProxyUrl) { window.open(currentProxyUrl, '_blank'); showMessage('Opened in new tab', 'success'); } } function copyProxy() { if (currentProxyUrl) { navigator.clipboard.writeText(currentProxyUrl).then(() => { showMessage('Link copied!', 'success'); }).catch(() => { showMessage('Copy failed', 'error'); }); } } function copyDonation() { const wallet = '8C1NrYqF8GZ2ZpJ17suZbqP5bZGVMZw43W5isFzAKzTd95rvcpTMYmzQq9ioepWcC7cn1NjSgBe5FHF7qHSEiFMyK5Uwq3n'; navigator.clipboard.writeText(wallet).then(() => { showMessage('Monero address copied!', 'success'); }).catch(() => { showMessage('Copy failed', 'error'); }); } function showMessage(text, type) { const msg = document.getElementById('message'); msg.textContent = text; msg.className = 'message ' + type + ' show'; setTimeout(() => msg.classList.remove('show'), 4000); } document.getElementById('urlInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') generateProxy(); });</script></body></html>`;
 res.type('text/html').send(html);
});
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
setInterval(() => {
 const now = new Date();
 for (const [token, data] of proxyLinks) {
 if (now > new Date(data.expiresAt)) proxyLinks.delete(token);
 }
}, 60 * 60 * 1000);
export default app;
