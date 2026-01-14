import { Actor, ProxyConfiguration } from 'apify';
import fetch from 'node-fetch';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';

await Actor.init();

const input = await Actor.getInput();
const {
  url,
  method = 'GET',
  headers = {},
  body,
  timeoutMs = 120000,
  proxyCountries = ['ICELAND', 'DENMARK']
} = input;

const startTime = Date.now();

console.log('🚀 Nym Privacy Proxy - Cloud Edition (EU IPs)');
console.log('📍 Target URL:', url);
console.log('🌍 Proxy Countries:', proxyCountries.join(', '));
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

  // Create Proxy Configuration with Iceland/Denmark groups
  const proxyConfiguration = new ProxyConfiguration({
    groups: proxyCountries.length > 0 ? proxyCountries : ['ICELAND', 'DENMARK'],
    useApifyProxy: true,
  });

  // Get proxy URL for this request
  const proxyUrl = await proxyConfiguration.newProxyUrl();
  console.log('🔐 Using proxy from countries:', proxyCountries.join(', '));
  console.log('🔗 Proxy URL:', proxyUrl);

  // Create HTTP agents for proxy
  const httpAgent = new HttpProxyAgent(proxyUrl);
  const httpsAgent = new HttpsProxyAgent(proxyUrl);

  // Prepare fetch options
  const fetchOptions = {
    method,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      ...headers
    },
    timeout: timeoutMs,
    agent: url.startsWith('https') ? httpsAgent : httpAgent,
  };

  // Add body if needed
  if (method !== 'GET' && body) {
    fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  console.log('📡 Fetching URL through proxy...');
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
    proxy: 'apify-cloud',
    proxyCountries: proxyCountries.length > 0 ? proxyCountries : ['ICELAND', 'DENMARK']
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
    proxy: 'apify-cloud',
    proxyCountries: proxyCountries.length > 0 ? proxyCountries : ['ICELAND', 'DENMARK']
  };
  await Actor.pushData(errorResult);
  throw error;
}

await Actor.exit();
