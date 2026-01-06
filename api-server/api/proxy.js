import { ApifyClient } from 'apify-client';
import dotenv from 'dotenv';
dotenv.config();
const client = new ApifyClient({ token: process.env.APIFY_TOKEN });
const VALID_API_KEYS = new Set(
  (process.env.VALID_API_KEYS || '').split(',').map(k => k.trim()).filter(Boolean)
);
export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }
  // Check authentication
  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const key = auth.replace('Bearer ', '').trim();
  if (!VALID_API_KEYS.has(key)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
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
      return res.status(502).json({ error: 'No result from actor' });
    }
    res.status(200).json({
      success: true,
      result: result.value,
      viaProxy: true
    });
  } catch (err) {
    console.error('Proxy error:', err.message);
    res.status(502).json({ error: err.message });
  }
}
