import crypto from 'crypto';

const APIFY_TOKEN = process.env.APIFY_TOKEN;

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
      timestamp: new Date().toISOString()
    });
  }

  // Route: POST /api/proxy - Simple token generation for crypto DEX proxy
  if (req.method === 'POST' && req.url === '/api/proxy') {
    const { url } = req.body || {};
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    try {
      // Validate URL format
      new URL(url);
      
      // Generate unique token for this proxy session
      const token = crypto.randomBytes(16).toString('hex');
      
      return res.status(200).json({
        success: true,
        token: token,
        size: 0,
        duration: 0
      });
    } catch (error) {
      if (error instanceof TypeError) {
        return res.status(400).json({ error: 'Invalid URL format' });
      }
      return res.status(500).json({ error: error.message });
    }
  }

  // Route: POST /v1/proxy or /proxy - Full Apify scraping
  if ((req.method === 'POST' && req.url === '/proxy') || req.url === '/v1/proxy') {
    const { url } = req.body || req.query || {};
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!APIFY_TOKEN) {
      return res.status(500).json({ error: 'Apify configuration missing' });
    }

    try {
      // Validate URL format
      new URL(url);
      
      // Create Apify task payload
      const input = {
        startUrls: [{ url }],
        maxRequestsPerCrawl: 1,
        pageFunction: `
          return {
            title: document.title,
            html: document.documentElement.outerHTML,
            status: 200
          };
        `
      };

      // Call Apify Web Scraper
      const runResponse = await fetch(
        `https://api.apify.com/v2/acts/apify~web-scraper/runs?token=${APIFY_TOKEN}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
          timeout: 30000
        }
      );

      if (!runResponse.ok) {
        const errorText = await runResponse.text();
        console.error('[Apify Error]', runResponse.status, errorText);
        
        if (runResponse.status === 401 || runResponse.status === 403) {
          return res.status(401).json({ error: 'Unauthorized: Invalid Apify token' });
        }
        throw new Error(`Apify API error: ${runResponse.status}`);
      }

      const runData = await runResponse.json();
      const runId = runData.data.id;
      
      return res.status(200).json({
        success: true,
        token: `${runId}:${Date.now()}`,
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
