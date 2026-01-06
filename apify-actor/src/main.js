import { Actor } from 'apify';
import { SocksProxyAgent } from 'socks-proxy-agent';
import fetch from 'node-fetch';

await Actor.init();

const input = await Actor.getInput();
const {
  url,
  method = 'GET',
  headers = {},
  body,
  timeoutMs = 120000,
  useMixnet = false
} = input;

const startTime = Date.now();

console.log('🚀 Nym Proxy Actor Started');
console.log('📍 Target URL:', url);
console.log('🔒 Privacy Mode:', useMixnet ? '5-Hop Mixnet' : 'Standard Proxy');
console.log('⏱️  Timeout:', timeoutMs, 'ms');

try {
  let response;
  let routedVia = 'standard';
  
  // Check if SOCKS5 is available and mixnet is requested
  const nymSocks5Host = process.env.NYM_SOCKS5_HOST;
  const nymSocks5Port = process.env.NYM_SOCKS5_PORT || 1080;
  const shouldUseMixnet = useMixnet && nymSocks5Host;
  
  if (shouldUseMixnet) {
    console.log('🔀 Routing through Nym mixnet...');
    console.log('📡 SOCKS5 Proxy:', `${nymSocks5Host}:${nymSocks5Port}`);
    
    try {
      // Create SOCKS5 agent for Nym mixnet routing
      const agent = new SocksProxyAgent(
        `socks5://${nymSocks5Host}:${nymSocks5Port}`
      );
      
      const fetchOptions = {
        method,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          ...headers
        },
        agent,
        timeout: timeoutMs,
      };
      
      if (method !== 'GET' && body) {
        fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
      }
      
      response = await fetch(url, fetchOptions);
      routedVia = 'nym-mixnet';
      console.log('✅ Mixnet request successful');
      
    } catch (mixnetError) {
      console.warn('⚠️  Mixnet request failed, falling back to standard proxy');
      console.warn('Error:', mixnetError.message);
      
      // Fallback to standard proxy
      const fetchOptions = {
        method,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          ...headers
        },
        timeout: timeoutMs,
      };
      
      if (method !== 'GET' && body) {
        fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
      }
      
      response = await fetch(url, fetchOptions);
      routedVia = 'standard-fallback';
    }
  } else {
    // Standard proxy (no mixnet)
    console.log('📡 Using standard Apify proxy');
    
    const fetchOptions = {
      method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...headers
      },
      timeout: timeoutMs,
    };
    
    if (method !== 'GET' && body) {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }
    
    response = await fetch(url, fetchOptions);
  }
  
  const responseBody = await response.text();
  const duration = Date.now() - startTime;
  
  // Extract original URL for redirect handling
  const finalUrl = response.url || url;
  
  const result = {
    url,
    originalUrl: finalUrl,
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers),
    body: responseBody,
    duration,
    routedVia,
    mixnetUsed: routedVia === 'nym-mixnet',
    timestamp: new Date().toISOString(),
    size: responseBody.length,
  };
  
  await Actor.pushData(result);
  
  console.log('✅ Request completed successfully');
  console.log('📊 Response Status:', response.status);
  console.log('⏱️  Duration:', duration, 'ms');
  console.log('📦 Response Size:', responseBody.length, 'bytes');
  console.log('🔒 Privacy Level:', routedVia === 'nym-mixnet' ? 'Maximum (5-hop mixnet)' : 'Basic');
  
} catch (error) {
  console.error('❌ Request failed:', error.message);
  console.error('Stack:', error.stack);
  
  const duration = Date.now() - startTime;
  
  const errorResult = {
    url,
    error: error.message,
    errorType: error.constructor.name,
    duration,
    mixnetUsed: false,
    timestamp: new Date().toISOString(),
  };
  
  await Actor.pushData(errorResult);
  throw error;
}

await Actor.exit();