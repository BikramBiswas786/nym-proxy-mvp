import express from 'express';
import axios from 'axios';
import crypto from 'crypto';

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.get('/v1/health', (req, res) => res.json({status: 'healthy'}));
app.get('/v1/status', (req, res) => res.json({service: 'Cloud Proxy v2.1', timeout: '60s'}));

app.get('/v1/proxy', (req, res) => {
  res.json({message: 'POST /v1/proxy with {url} to generate token'});
});

app.post('/v1/proxy', (req, res) => {
  try {
    const {url} = req.body || {};
    if (!url) return res.status(400).json({error: 'URL required'});
    try { new URL(url); } catch (e) { return res.status(400).json({error: 'Invalid URL'}); }
    const token = crypto.randomBytes(12).toString('base64url');
    return res.json({success: true, token: token});
  } catch (e) {
    return res.status(500).json({error: e.message});
  }
});

function decodeUrl(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  const p = str.length % 4;
  if (p) str += '='.repeat(4 - p);
  return Buffer.from(str, 'base64').toString();
}

app.get('/proxy/:token(*)', async (req, res) => {
  try {
    const url = decodeUrl(req.params.token);
    try { new URL(url); } catch { return res.status(400).json({error: 'Bad URL'}); }
    const r = await axios.get(url, {timeout: 60000, maxRedirects: 5, responseType: 'arraybuffer'});
    res.set('Content-Type', r.headers['content-type'] || 'text/html');
    res.status(200).send(r.data);
  } catch (e) {
    return res.status(502).json({error: 'Fetch failed'});
  }
});

app.get('/access/:token(*)', async (req, res) => {
  try {
    const url = decodeUrl(req.params.token);
    try { new URL(url); } catch { return res.status(400).json({error: 'Bad URL'}); }
    const r = await axios.get(url, {timeout: 60000, maxRedirects: 5, responseType: 'arraybuffer'});
    res.set('Content-Type', r.headers['content-type'] || 'text/html');
    res.status(200).send(r.data);
  } catch (e) {
    return res.status(502).json({error: 'Fetch failed'});
  }
});

export default app;
