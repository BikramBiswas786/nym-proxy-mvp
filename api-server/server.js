import express from 'express';
import { ApifyClient } from 'apify-client';
import { nanoid } from 'nanoid';
import cors from 'cors';

const app = express();
const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

app.use(cors());
app.use(express.json());

// Store proxy results in memory (Map) - key: token, value: result
const proxyResults = new Map();

// Serve static frontend
app.use(express.static('public'));

// POST /v1/proxy - Create private proxy link
app.post('/v1/proxy', async (req, res) => {
    try {
        const { url, method = 'GET', headers = {}, body, timeoutMs = 90000 } = req.body;

        console.log('🚀 Proxying request for:', url);

        // Run Apify actor
        const run = await client.actor('integrative_operative/my-actor').call({
            url,
            method,
            headers,
            body,
            timeoutMs
        });

        // Wait for actor to finish and get dataset
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        const result = items[0];

        if (!result) {
            return res.status(500).json({ error: 'No result from actor' });
        }

        // Generate token and store result
        const token = nanoid(10);
        proxyResults.set(token, {
            ...result,
            timestamp: Date.now(),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        });

        // Clean up expired results
        for (const [key, value] of proxyResults.entries()) {
            if (Date.now() > value.expiresAt) {
                proxyResults.delete(key);
            }
        }

        const viewUrl = `${req.protocol}://${req.get('host')}/v1/proxy/${token}`;

        res.json({
            requestId: run.id,
            token,
            viewUrl,
            viaProxy: true,
            status: result.status
        });

    } catch (error) {
        console.error('❌ Proxy error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /v1/proxy/:token - View proxied content
app.get('/v1/proxy/:token', (req, res) => {
    const { token } = req.params;
    const result = proxyResults.get(token);

    if (!result) {
        return res.status(404).json({ error: 'Proxy result not found or expired' });
    }

    // Check if expired
    if (Date.now() > result.expiresAt) {
        proxyResults.delete(token);
        return res.status(404).json({ error: 'Proxy result expired' });
    }

    // Serve HTML with basic URL rewriting for resources
    let html = result.body;
    
    // Basic URL rewriting for common relative URLs
    const originalUrl = new URL(result.originalUrl);
    const baseUrl = `${originalUrl.protocol}//${originalUrl.host}`;
    
    // Replace relative URLs with absolute ones
    html = html
        .replace(/href=\"\/([^"]*)\"/g, `href=\"${baseUrl}/$1\"`)
        .replace(/src=\"\/([^"]*)\"/g, `src=\"${baseUrl}/$1\"`)
        .replace(/url\(\/([^)]*)\)/g, `url(${baseUrl}/$1)`);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Nym Proxy server running on port ${PORT}`);
});

export default app;
