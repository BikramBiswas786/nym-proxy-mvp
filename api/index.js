const APIFY_TOKEN = process.env.APIFY_TOKEN;

export default async function handler(req, res) {
  const { url } = req.body || req.query || {};
  
  // Handle GET requests for health check
  if (req.method === 'GET' && req.url === '/v1/health') {
    return res.status(200).json({ status: 'ok', apify: APIFY_TOKEN ? 'configured' : 'missing' });
  }

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    // Call Apify Web Scraper Actor
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

    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/apify~web-scraper/runs?token=${APIFY_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      }
    );

    if (!runResponse.ok) {
      throw new Error(`Apify error: ${runResponse.status}`);
    }

    const runData = await runResponse.json();
    const runId = runData.data.id;

    // Poll for results
    let attempts = 0;
    while (attempts < 60) {
      const statusResponse = await fetch(
        `https://api.apify.com/v2/acts/apify~web-scraper/runs/${runId}?token=${APIFY_TOKEN}`
      );
      const statusData = await statusResponse.json();

      if (statusData.data.status === 'SUCCEEDED') {
        const resultsResponse = await fetch(
          `https://api.apify.com/v2/acts/apify~web-scraper/runs/${runId}/dataset/items?token=${APIFY_TOKEN}`
        );
        const results = await resultsResponse.json();
        
        if (results && results.length > 0) {
          return res.status(200).json({
            success: true,
            html: results[0].html,
            title: results[0].title,
            duration: Date.now() - Date.now()
          });
        }
        break;
      }

      if (statusData.data.status === 'FAILED') {
        throw new Error('Apify run failed');
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    return res.status(500).json({ error: 'Apify timeout' });
  } catch (error) {
    console.error('[Error]', error.message);
    return res.status(500).json({ error: error.message });
  }
}
