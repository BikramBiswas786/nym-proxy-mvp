import { Actor } from 'apify';
import fetch from 'node-fetch';

await Actor.init();

const input = await Actor.getInput();
const {
  url,
  method = 'GET',
  headers = {},
  body,
  timeoutMs = 120000
} = input;

const startTime = Date.now();

console.log('🚀 Nym Privacy Proxy - Cloud Edition');
console.log('📍 Target URL:', url);
console.log('⏱️ Timeout:', timeoutMs, 'ms');

try {
  // Validate URL
  if (!url) {
    throw new Error('URL is required');
  }
  
  try {
    new URL(url);
  } catch (e) {
    throw new Error('Invalid URL format: ' + url);
  }

  // Prepare fetch options
  const fetchOptions = {
    method,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      ...headers
    },
    timeout: timeoutMs,
  };

  // Add body if needed
  if (method !== 'GET' && body) {
    fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  console.log('📡 Fetching URL...');
  const response = await fetch(url, fetchOptions);
  const responseBody = await response.text();
  const duration = Date.now() - startTime;

  const result = {
    url,
    originalUrl: response.url || url,
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
    body: responseBody,
    duration,
    size: responseBody.length,
    timestamp: new Date().toISOString(),
    proxy: 'cloud'
  };

  await Actor.pushData(result);

  console.log('✅ Request completed');
  console.log('📊 Status:', response.status);
  console.log('⏱️ Duration:', duration, 'ms');
  console.log('📦 Size:', responseBody.length, 'bytes');

} catch (error) {
  console.error('❌ Error:', error.message);

  const duration = Date.now() - startTime;

  const errorResult = {
    url: input?.url,
    error: error.message,
    duration,
    timestamp: new Date().toISOString(),
    proxy: 'cloud'
  };

  await Actor.pushData(errorResult);
  throw error;
}

await Actor.exit();
