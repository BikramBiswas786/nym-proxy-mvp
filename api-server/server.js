import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { Redis } from '@upstash/redis';

const app = express();
const redis = process.env.UPSTASH_REST_URL ? new Redis({url: process.env.UPSTASH_REST_URL, token: process.env.UPSTASH_REST_TOKEN}) : null;

app.use(cors());
app.use(express.json({limit:'10mb'}));
app.use(express.static('public'));

app.get('/v1/health', async (req, res) => {
  res.json({status:'ok', uptime:process.uptime(), timestamp:new Date().toISOString(), proxy:'cloud', storage: redis?'Redis':'Memory'});
});

app.post('/v1/proxy', async (req, res) => {
  try {
    const {url, method='GET', headers={}, body, timeoutMs=90000} = req.body;
    try { new URL(url); } catch { return res.status(400).json({error:'Invalid URL'}); }
    
    const opts = {method, headers:{'User-Agent':'Mozilla/5.0','Accept':'*/*',...headers}, timeout:timeoutMs, redirect:'follow'};
    if (method !== 'GET' && body) opts.body = typeof body === 'string' ? body : JSON.stringify(body);
    
    const t0 = Date.now();
    const resp = await fetch(url, opts);
    const txt = await resp.text();
    const dur = Date.now() - t0;
    const token = crypto.randomBytes(12).toString('hex');
    const data = {url, originalUrl:resp.url||url, status:resp.status, statusText:resp.statusText, headers:Object.fromEntries(resp.headers.entries()), body:txt, size:txt.length, duration:dur, timestamp:new Date().toISOString(), proxy:'cloud', version:'2.0'};
    
    if (redis) { try { await redis.set(`proxy:${token}`, JSON.stringify(data), {ex:3600}); } catch(e) { console.warn('Redis fail:', e.message); } }
    
    res.json({success:true, status:resp.status, duration:dur, size:txt.length, originalUrl:resp.url||url, body:txt.substring(0,10000), headers:Object.fromEntries(resp.headers.entries()), timestamp:new Date().toISOString(), proxy:'cloud', token, viewUrl:`/v1/proxy/view/${token}`, persistent:!!redis});
  } catch(e) {
    console.error('Proxy error:', e);
    res.status(500).json({success:false, error:e.message, proxy:'cloud'});
  }
});

app.get('/v1/proxy/view/:token', async (req, res) => {
  try {
    const {token} = req.params;
    let cached = null;
    if (redis) { try { const d = await redis.get(`proxy:${token}`); if (d) cached = typeof d === 'string' ? JSON.parse(d) : d; } catch(e) { console.warn('Redis fail:', e); } }
    if (!cached) return res.status(404).json({error:'Content expired or not found', token, message:'Create new proxy link', info:'Content cached 1 hour'});
    
    const ct = cached.headers['content-type'] || 'text/html; charset=utf-8';
    res.setHeader('Content-Type', ct);
    res.setHeader('X-Proxy-Source', 'Cloud Proxy');
    res.setHeader('X-Original-URL', cached.originalUrl);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(cached.status || 200).send(cached.body);
  } catch(e) {
    console.error('View error:', e);
    res.status(500).json({error:e.message, suggestion:'Create new link'});
  }
});

app.get('/v1/proxy/:token', async (req, res) => {
  try {
    const {token} = req.params;
    let cached = null;
    if (redis) { try { const d = await redis.get(`proxy:${token}`); if (d) cached = typeof d === 'string' ? JSON.parse(d) : d; } catch(e) { } }
    if (!cached) return res.status(404).json({error:'Data not found', token});
    res.json({success:true, url:cached.originalUrl, status:cached.status, headers:cached.headers, size:cached.size, duration:cached.duration, timestamp:cached.timestamp, proxy:'cloud', viewUrl:`/v1/proxy/view/${token}`});
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.use((err,req,res,next) => { console.error('Error:', err); res.status(500).json({error:'Server error', proxy:'cloud'}); });
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`Running on ${PORT}`); });
