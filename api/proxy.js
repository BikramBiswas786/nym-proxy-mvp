const APIFY_TOKEN = process.env.APIFY_TOKEN;

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get URL from request body or query
  const { url } = req.body || req.query || {};

  // Validate URL
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Check if APIFY_TOKEN is configured
  if (!APIFY_TOKEN) {
    console.error('[Error] APIFY_TOKEN not configured in environment');
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
    const token = `${runId}:${Date.now()}`;

    // Return success with token
    return res.status(200).json({
      success: true,
      token: token,
      size: 0,
      duration: 0
    });

  } catch (error) {
    console.error('[Proxy Error]', error.message);
    
    if (error.message.includes('Invalid URL')) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    return res.status(500).json({ error: error.message });
  }
}
