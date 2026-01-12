import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import axios from 'axios';

const app = express();
const proxyLinks = new Map();

app.use(cors());
app.use(express.json({limit:'1gb'}));

app.get('/v1/health',(req,res)=>res.json({status:'healthy'}));

app.get('/v1/status',(req,res)=>res.json({service:'Cloud Proxy',version:'2.1',features:{openLink:true,copyLink:true,toast:true}}));

app.get('/v1/proxy',(req,res)=>{
  const h=`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"><title>Cloud Proxy</title><style>*{margin:0;padding:0}body{font-family:Segoe UI;background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;padding:20px}.container{max-width:900px;margin:0 auto}h1{color:#ff6b6b;text-align:center;margin-bottom:30px}.section{background:rgba(15,52,96,0.5);padding:30px;border-radius:12px;margin:20px 0}.input-group{display:flex;gap:10px;margin:20px 0}input{flex:1;min-width:200px;padding:12px;border:2px solid transparent;border-radius:8px;background:rgba(255,255,255,0.1);color:#fff;transition:all 0.3s}input:focus{outline:none;border-color:#ff6b6b;box-shadow:0 0 10px rgba(255,107,107,0.3)}.btn{padding:12px 24px;background:linear-gradient(135deg,#ff6b6b,#e94560);color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;transition:all 0.3s}.btn:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(255,107,107,0.4)}.result-box{display:none;background:rgba(0,0,0,0.3);padding:20px;border-radius:10px;margin:20px 0}.result-box.show{display:block}.result-url{background:rgba(0,0,0,0.5);padding:15px;border-radius:8px;color:#4fc3f7;word-break:break-all;font-family:monospace;margin:15px 0;border-left:4px solid #ff6b6b}.action-buttons{display:none;gap:12px;margin:15px 0}.action-buttons.show{display:flex}.btn-action{flex:1;min-width:120px}.btn-open{background:linear-gradient(135deg,#4caf50,#45a049)}.btn-copy{background:linear-gradient(135deg,#2196f3,#1976d2)}.toast-container{position:fixed;top:20px;right:20px;z-index:9999}.toast{background:rgba(0,0,0,0.9);color:#fff;padding:12px 16px;border-radius:8px;border-left:4px solid #ff6b6b;margin:8px 0;animation:slideIn 0.3s}@keyframes slideIn{from{transform:translateX(400px)}to{transform:translateX(0)}}</style></head><body><div class="toast-container" id="toast"></div><div class="container"><h1>Cloud Proxy v2.1</h1><div class="section"><h2>Generate Link</h2><div class="input-group"><input id="url" type="url" placeholder="https://example.com"/><button class="btn" onclick="gen()">Generate</button></div><div id="result" class="result-box"><div style="color:#a0a0a0;margin-bottom:10px">Proxy Link:</div><div class="result-url" id="link"></div><div class="action-buttons" id="btns"><button class="btn btn-action btn-open" onclick="open()">Open</button><button class="btn btn-action btn-copy" onclick="copy()">Copy</button></div></div></div></div><script>let url='';async function gen(){const u=document.getElementById('url').value;if(!u){show('Enter URL','error');return}try{const r=await fetch('/v1/proxy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:u})});const d=await r.json();if(!r.ok){show('Error: '+d.error,'error');return}url=d.proxyUrl;document.getElementById('link').textContent=url;document.getElementById('result').classList.add('show');document.getElementById('btns').classList.add('show');show('Link generated!','success')}catch(e){show('Error: '+e.message,'error')}}function open(){if(!url){show('Generate link first','error');return}window.open(url,'_blank');show('Opening...','success')}function copy(){if(!url){show('Generate link first','error');return}navigator.clipboard.writeText(url).then(()=>{show('Copied!','success')}).catch(()=>{show('Copy failed','error')})}function show(m,t){const c=document.getElementById('toast');const x=document.createElement('div');x.className='toast '+t;x.innerHTML=m;c.appendChild(x);setTimeout(()=>{x.remove()},3000)}</script></body></html>`;
  res.type('text/html').send(h);
});

app.post('/v1/proxy',async(req,res)=>{
  try{
    const {url}=req.body;
    if(!url)return res.status(400).json({error:'URL required'});
    const token=crypto.randomBytes(32).toString('hex');
    const exp=new Date(Date.now()+24*60*60*1000);
    proxyLinks.set(token,{url,exp});
    const host=req.headers['x-forwarded-host']||req.get('host')||'nym-proxy-backend.vercel.app';
    const proto=req.headers['x-forwarded-proto']||'https';
    res.json({proxyUrl:`${proto}://${host}/access/${token}`});
  }catch(e){
    res.status(500).json({error:e.message});
  }
});

app.get('/access/:token',async(req,res)=>{
  try{
    const {token}=req.params;
    const d=proxyLinks.get(token);
    if(!d)return res.status(404).json({error:'Expired'});
    if(new Date()>d.exp){proxyLinks.delete(token);return res.status(410).json({error:'Expired'});}
    const r=await axios.get(d.url,{timeout:15000,headers:{'User-Agent':'Mozilla/5.0'}});
    res.set({'Content-Type':r.headers['content-type']||'text/html'});
    res.send(r.data);
  }catch(e){
    res.status(502).json({error:e.message});
  }
});

setInterval(()=>{const now=new Date();for(const [t,d] of proxyLinks){if(now>d.exp)proxyLinks.delete(t);}},60*60*1000);

export default app;
