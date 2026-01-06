// fetchSafe.js - Timeout and size limit protection
import AbortController from 'abort-controller';

export async function fetchSafe(fetchFn, url, opts = {}) {
  // fetchFn: a function like node-fetch or a transport.fetch returning a Response
  // timeoutMs, maxBytes
  const timeoutMs = opts.timeoutMs || parseInt(process.env.FETCH_TIMEOUT_MS || '15000', 10);
  const maxBytes = opts.maxBytes || parseInt(process.env.FETCH_MAX_BYTES || String(5*1024*1024), 10);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    // Some transports accept { signal }
    res = await fetchFn(url, { ...opts, signal: controller.signal });
  } catch (e) {
    clearTimeout(timer);
    throw new Error('fetch error: ' + e.message);
  }
  clearTimeout(timer);

  // stream reader
  const reader = res.body.getReader();
  const chunks = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.length;
    if (received > maxBytes) {
      controller.abort();
      throw new Error('response exceeded max allowed size');
    }
    chunks.push(value);
  }
  const buffer = Buffer.concat(chunks);
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  return { status: res.status, headers: res.headers, bodyBuffer: buffer, contentType };
}
