# Nym Proxy MVP - Mixnet Integration Audit & Fix Report

## Executive Summary

**Status**: Mixnet integration partially broken with several critical and moderate issues
**Severity**: MEDIUM-HIGH
**Completion**: ~60% - Core logic exists but coordination needs improvement

---

## 🔴 CRITICAL ISSUES FOUND

### 1. **Response Body Encoding Issue (API Server)**
**File**: `api-server/server.js` - Line ~120
**Problem**: URL rewriting regex patterns are double-escaped
```javascript
// CURRENT (BROKEN):
html = html 
  .replace(/href=\\"\\/(\\\[^\\"\\\]\*)\\"/g, `href=\\"${baseUrl}/$1\\"`) 
  .replace(/src=\\"\\/(\\\[^\\"\\\]\*)\\"/g, `src=\\"${baseUrl}/$1\\"`) 
  .replace(/url\\(\\/(\\\[^)\\\]\*)\\)/g, `url(${baseUrl}/$1)`)

// FIXED:
html = html
  .replace(/href="\/([^"]*)"/g, `href="${baseUrl}/$1"`)
  .replace(/src="\/([^"]*)"/g, `src="${baseUrl}/$1"`)
  .replace(/url\(\/([^)]*)\/\)/g, `url(${baseUrl}/$1)`)
```
**Impact**: Resources fail to load on proxied pages
**Criticality**: HIGH

---

### 2. **Privacy Response Payload Missing**
**File**: `api-server/server.js` - Line ~85 (POST endpoint)
**Problem**: Response object doesn't include privacy field
```javascript
// CURRENT (INCOMPLETE):
res.json({
  requestId: run.id,
  token,
  viewUrl,
  viaProxy: true,
  viaMixnet: result.mixnetUsed || false,
  status: result.status,
  duration: result.duration,
  kvStoreId: run.defaultKeyValueStoreId,
  privacyLevel: result.mixnetUsed ? 'maximum' : 'basic'
  // MISSING: privacy object
})

// FIXED:
res.json({
  requestId: run.id,
  token,
  viewUrl,
  viaProxy: true,
  viaMixnet: result.mixnetUsed || false,
  status: result.status,
  duration: result.duration,
  kvStoreId: run.defaultKeyValueStoreId,
  privacyLevel: result.mixnetUsed ? 'maximum' : 'basic',
  privacy: {
    current: result.mixnetUsed ? 'Maximum (5-hop mixnet)' : 'Basic (Standard proxy)',
    ipHidden: true,
    metadataProtection: result.mixnetUsed,
    trafficAnalysisResistance: result.mixnetUsed,
    decentralized: result.mixnetUsed
  }
})
```
**Impact**: Frontend cannot properly display privacy level indicators
**Criticality**: HIGH

---

### 3. **Apify Actor - No Timeout Handling**
**File**: `apify-actor/src/main.js` - Line ~68+
**Problem**: Fetch requests don't properly handle timeouts
```javascript
// CURRENT (INCOMPLETE):
const fetchOptions = {
  method,
  headers: {...},
  agent,
  timeout: timeoutMs,  // ← fetch doesn't respect this
};
response = await fetch(url, fetchOptions);

// FIXED:
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

const fetchOptions = {
  method,
  headers: {...},
  agent,
  signal: controller.signal,  // ← Use AbortController
};

try {
  response = await fetch(url, fetchOptions);
} finally {
  clearTimeout(timeoutId);
}
```
**Impact**: Requests hang beyond timeoutMs, consuming resources
**Criticality**: HIGH

---

## 🟡 MODERATE ISSUES

### 4. **Fallback Logic Not Preserving Metadata**
**File**: `apify-actor/src/main.js` - Line ~56
**Problem**: When mixnet fails and falls back to standard proxy, `mixnetUsed` is set to false
```javascript
// CURRENT (MISLEADING):
if (shouldUseMixnet) {
  try {
    // mixnet code
    routedVia = 'nym-mixnet';
  } catch (mixnetError) {
    // Fallback happens here but we lose context
    routedVia = 'standard-fallback';
  }
}

// FIXED:
if (shouldUseMixnet) {
  try {
    // mixnet code
    routedVia = 'nym-mixnet';
    console.log('✅ Successfully routed through Nym mixnet');
  } catch (mixnetError) {
    console.warn('⚠️ Mixnet failed, falling back to standard proxy');
    console.warn('Reason:', mixnetError.message);
    routedVia = 'standard-fallback';
    // Could add retry logic here
  }
}
```
**Impact**: Logging and monitoring lose fallback reasons
**Criticality**: MEDIUM

---

### 5. **Status Endpoint - Actor Call Not Async Safe**
**File**: `api-server/server.js` - Line ~28-35
**Problem**: Each status check calls a fresh actor, could race/queue up
```javascript
// CURRENT (INEFFICIENT):
app.get('/v1/status', async (req, res) => {
  const testRun = await client.actor('integrative_operative/my-actor').call({
    url: 'https://nymtech.net/favicon.svg',
    // ... long operations
  }, { timeout: 50000 });
});

// FIXED:
// Add caching layer
let lastStatusCheck = null;
let lastStatusTime = 0;
const STATUS_CACHE_TTL = 30000; // Cache for 30 seconds

app.get('/v1/status', async (req, res) => {
  const now = Date.now();
  
  // Return cached if recent
  if (lastStatusCheck && (now - lastStatusTime) < STATUS_CACHE_TTL) {
    return res.json({...lastStatusCheck, fromCache: true});
  }
  
  // Otherwise do fresh check
  const testRun = await client.actor('integrative_operative/my-actor').call({...});
  // ...cache result
});
```
**Impact**: High API load on frequent status checks
**Criticality**: MEDIUM

---

### 6. **Missing Error Boundaries in Actor**
**File**: `apify-actor/src/main.js` - Final section
**Problem**: No graceful handling for network-level failures
```javascript
// ADD THIS:
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
  Actor.pushData({
    error: 'Unhandled rejection',
    reason: reason.message,
    timestamp: new Date().toISOString(),
  });
  Actor.exit();
});
```
**Impact**: Silent failures that don't get reported
**Criticality**: MEDIUM

---

## 🟢 MINOR ISSUES

### 7. **Headers Not Properly Forwarded**
**File**: `api-server/server.js` - POST endpoint
**Note**: Currently only passes basic headers to Apify actor
**Fix**: Expand to include forwarding user headers while sanitizing sensitive ones

### 8. **No Request Deduplication**
**Issue**: Multiple identical requests create separate database entries
**Solution**: Add etag/hash-based deduplication

### 9. **Frontend Not Showing Mixnet Status**
**File**: `backend/` - needs update to consume `/v1/status` properly

---

## ✅ FIXES TO APPLY

### Fix 1: Update api-server/server.js

```javascript
// BEFORE (Line 115-120):
html = html 
  .replace(/href=\\"\\/(\\\[^\\"\\\]\*)\\"/g, `href=\\"${baseUrl}/$1\\"`) 
  .replace(/src=\\"\\/(\\\[^\\"\\\]\*)\\"/g, `src=\\"${baseUrl}/$1\\"`) 
  .replace(/url\\(\\/(\\\[^)\\\]\*)\\)/g, `url(${baseUrl}/$1)`);

// AFTER:
html = html
  .replace(/href="\/([^"]*)"/g, `href="${baseUrl}/$1"`)
  .replace(/src="\/([^"]*)"/g, `src="${baseUrl}/$1"`)
  .replace(/url\(\/([^)]*)\/\)/g, `url(${baseUrl}/$1)`);
```

### Fix 2: Update POST response in api-server/server.js (Line ~85-100)

```javascript
// ADD to response JSON:
privacy: {
  current: result.mixnetUsed ? 'Maximum (5-hop mixnet)' : 'Basic (Standard proxy)',
  ipHidden: true,
  metadataProtection: result.mixnetUsed,
  trafficAnalysisResistance: result.mixnetUsed,
  decentralized: result.mixnetUsed
}
```

### Fix 3: Update apify-actor/src/main.js - Add AbortController

```javascript
// REPLACE lines 68-80 with:
if (shouldUseMixnet) {
  console.log('🔀 Routing through Nym mixnet...');
  console.log('📡 SOCKS5 Proxy:', `${nymSocks5Host}:${nymSocks5Port}`);
  
  try {
    const agent = new SocksProxyAgent(`socks5://${nymSocks5Host}:${nymSocks5Port}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      response = await fetch(url, {
        method,
        headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', ...headers},
        agent,
        signal: controller.signal
      });
      routedVia = 'nym-mixnet';
      console.log('✅ Mixnet request successful');
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (mixnetError) {
    console.warn('⚠️ Mixnet request failed, falling back to standard proxy');
    console.warn('Error:', mixnetError.message);
    // Standard fallback
    response = await fetch(url, {
      method,
      headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', ...headers},
    });
    routedVia = 'standard-fallback';
  }
}
```

---

## 📋 IMPLEMENTATION CHECKLIST

- [ ] Fix regex patterns in api-server/server.js (Line 115)
- [ ] Add privacy object to POST /v1/proxy response
- [ ] Implement AbortController timeout in actor
- [ ] Add error boundaries in actor
- [ ] Add status endpoint caching
- [ ] Update frontend to display mixnet status from /v1/status
- [ ] Test all flows end-to-end
- [ ] Verify mixnet health checks work
- [ ] Run Apify actor with real SOCKS5 endpoint
- [ ] Load test to ensure no race conditions

---

## 🚀 DEPLOYMENT STEPS

1. **Create new branch**:
   ```bash
   git checkout -b fix/mixnet-integration-critical
   ```

2. **Apply fixes to all files** as detailed above

3. **Test locally**:
   ```bash
   npm test
   ```

4. **Commit**:
   ```bash
   git commit -am 'fix: resolve critical mixnet integration issues'
   ```

5. **Push & PR**:
   ```bash
   git push origin fix/mixnet-integration-critical
   ```

6. **Merge to main** (auto-deploys via GitHub Actions)

---

## 📊 VERIFICATION

After deployment, verify:

```bash
# Test status endpoint
curl https://nym-proxy-backend.vercel.app/v1/status

# Should return:
{
  "mixnetEnabled": true/false,
  "privacy": {
    "current": "Maximum (5-hop mixnet)" or "Basic (Standard proxy)",
    ...
  }
}

# Test proxy endpoint
curl -X POST https://nym-proxy-backend.vercel.app/v1/proxy \\
  -H 'Content-Type: application/json' \\
  -d '{"url": "https://nytimes.com", "useMixnet": true}'

# Should return:
{
  "token": "abc123xyz",
  "viaMixnet": true,
  "privacy": {...}
}
```

---

## 🔗 RELATED LINKS

- [SETUP.md](./SETUP.md) - Integration guide
- [NYM_INTEGRATION_GUIDE.md](./NYM_INTEGRATION_GUIDE.md) - Detailed integration
- [README.md](./README.md) - Project overview
