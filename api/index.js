import crypto from 'crypto';
const APIFY_TOKEN = process.env.APIFY_TOKEN;
const APIFY_ACTOR_ID = process.env.APIFY_ACTOR_ID || 'integrative_operative/cloud-proxy-actor';

export default async function handler(req, res) {
  // Add CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Route: GET /v1/health or /health
  if (req.method === 'GET' && (req.url === '/v1/health' || req.url === '/health')) {
    return res.status(200).json({ 
      status: 'ok', 
      apify: APIFY_TOKEN ? 'configured' : 'missing',
      actor: APIFY_ACTOR_ID,
      timestamp: new Date().toISOString()
    });
  }
  
  // Route: POST /api/proxy - Call Apify Actor for crypto DEX proxy
  if (req.method === 'POST' && req.url === '/api/proxy') {
    const { url } = req.body || {};
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    if (!APIFY_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized: Apify token not configured' });
    }
    
    try {
      // Validate URL format
      new URL(url);
      
      // Call Apify Actor with the target URL
      const apifyRunResponse = await fetch(
        `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/runs?token=${APIFY_TOKEN}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetUrl: url,
            headless: true,
            navigationTimeout: 30000,
            proxyUrl: 'http://proxy.apify.com:8000'
          })
        }
      );
      
      if (!apifyRunResponse.ok) {
        const errorText = await apifyRunResponse.text();
        console.error('[Apify Error]', apifyRunResponse.status, errorText);
        
        if (apifyRunResponse.status === 401 || apifyRunResponse.status === 403) {
          return res.status(401).json({ error: 'Unauthorized: Invalid Apify token' });
        }
        throw new Error(`Apify API error: ${apifyRunResponse.status}`);
      }
      
      const runData = await apifyRunResponse.json();
      const runId = runData.data.id;
      
      // Generate 24-hour token
      const tokenExpiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
      const token = `${runId}:${tokenExpiry}`;
      
      return res.status(200).json({
        success: true,
        token: token,
        runId: runId,
        expiresAt: new Date(tokenExpiry).toISOString(),
        proxyUrl: `${process.env.VERCEL_URL || 'https://nym-proxy-mvp.vercel.app'}/p/${token}`,
        size: 0,
        duration: 0
      });
      
    } catch (error) {
      console.error('[Proxy Error]', error.message);
      
      if (error instanceof TypeError) {
        return res.status(400).json({ error: 'Invalid URL format' });
      }
      
      return res.status(500).json({ error: error.message });
    }
  }
  
  // Default response for unknown routes
  return res.status(404).json({ error: 'Not Found' });
}
