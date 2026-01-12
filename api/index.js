import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import axios from 'axios';

const app = express();
const proxyLinks = new Map();

app.use(cors());
app.use(express.json({limit:'5mb'}));

app.get('/v1/health',(req,res)=>res.json({status:'healthy'}));

app.get('/v1/status',(req,res)=>res.json({service:'Cloud Proxy',version:'2.1',features:{openLink:true,copyLink:true,toastNotifications:true}}));

app.get('/v1/proxy',(req,res)=>{
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cloud Proxy v2.1</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Segoe UI,sans-serif;background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;padding:20px;min-height:100vh}.container{max-width:900px;margin:0 auto}h1{color:#ff6b6b;text-align:center;margin-bottom:30px}h2{color:#ff6b6b;margin:20px 0}.section{background:rgba(15,52,96,0.5);padding:30px;border-radius:12px;border:1px solid rgba(255,107,107,0.2);margin:20px 0}.input-group{display:flex;gap:10px;margin:20px 0;flex-wrap:wrap}input{flex:1;min-width:250px;padding:12px;border:2px solid transparent;border-radius:8px;background:rgba(255,255,255,0.1);color:#fff;transition:all 0.3s}input:focus{outline:none;border-color:#ff6b6b;box-shadow:0 0 10px rgba(255,107,107,0.3)}.btn{padding:12px 24px;background:linear-gradient(135deg,#ff6b6b,#e94560);color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;transition:all 0.3s}.btn:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(255,107,107,0.4)}.btn:disabled{opacity:0.7}.result-box{display:none;background:rgba(0,0,0,0.3);padding:20px;border-radius:10px;border:2px solid rgba(255,107,107,0.3);margin:20px 0}.result-box.show{display:block}.result-url{background:rgba(0,0,0,0.5);padding:15px;border-radius:8px;color:#4fc3f7;word-break:break-all;font-family:monospace;margin:15px 0;border-left:4px solid #ff6b6b}.action-buttons{display:none;gap:12px;margin:15px 0}.action-buttons.show{display:flex}.btn-open{background:linear-gradient(135deg,#4caf50,#45a049)}.btn-copy{background:linear-gradient(135deg,#2196f3,#1976d2)}.btn-action{flex:1;min-width:140px}.toast-container{position:fixed;top:20px;right:20px;z-index:9999;max-width:400px}.toast{background:rgba(0,0,0,0.9);color:#fff;padding:12px 16px;border-radius:8px;border-left:4px solid #ff6b6b;margin:8px 0;animation:slideIn 0.3s;display:flex;align-items:center;gap:8px}.toast.success{border-left-color:#4caf50}.toast.error{border-left-color:#ff6b6b}@keyframes slideIn{from{transform:translateX(400px);opacity:0}to{transform:translateX(0);opacity:1}}@media(max-width:768px){.input-group{flex-direction:column}input{min-width:100%}.action-buttons{flex-direction:column}.btn-action{min-width:100%}}</style></head><body><div class="toast-container" id="toastContainer"></div><div class="container"><h1>🔐 Cloud Proxy v2.1</h1><div class="section"><h2>Generate Proxy Link</h2><div class="input-group"><input id="url" type="url" placeholder="https://example.com"/><button class="btn" onclick="generateProxy()">Generate Link</button></div><div id="resultBox" class="result-box"><div style="color:#a0a0a0;margin-bottom:10px">Proxy Link (24h):</div><div class="result-url" id="proxyUrl"></div><div class="action-buttons" id="actionButtons"><button class="btn btn-action btn-open" onclick="openLink()">🔗 Open Link</button><button class="btn btn-action btn-copy" onclick="copyLink()">📋 Copy Link</button></div></div></div></div><script>let proxyUrl="";async function generateProxy(){const url=document.getElementById("url").value;if(!url){showToast("Enter URL","error");return}try{const btn=event.target;btn.disabled=true;btn.textContent="Generating...";const r=await fetch("/v1/proxy",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url})});const d=await r.json();if(!r.ok){showToast("Error: "+(d.error||"Unknown"),"error");btn.disabled=false;btn.textContent="Generate Link";return}proxyUrl=d.proxyUrl;document.getElementById("proxyUrl").textContent=proxyUrl;document.getElementById("resultBox").classList.add("show");document.getElementById("actionButtons").classList.add("show");showToast("✓ Link generated!","success");btn.disabled=false;btn.textContent="Generate Link"}catch(e){showToast("Error: "+e.message,"error")}}function openLink(){if(!proxyUrl){showToast("Generate a link first","error");return}window.open(proxyUrl,"_blank");showToast("✓ Opening link...","success")}function copyLink(){if(!proxyUrl){showToast("Generate a link first","error");return}navigator.clipboard.writeText(proxyUrl).then(()=>{showToast("✓ Copied to clipboard!","success")}).catch(()=>{showToast("Copy failed","error")})}function showToast(msg,type){const c=document.getElementById("toastContainer");const t=document.createElement("div");t.className="toast "+type;const icons={success:"✓",error:"✕"};t.innerHTML=`<span>${icons[type]}</span><span>${msg}</span>`;c.appendChild(t);setTimeout(()=>{t.style.opacity="0";setTimeout(()=>t.remove(),300)},3000)}</script></body></html>`;
  res.type('text/html').send(html);
});

app.post('/v1/proxy',async(req,res)=>{
  try{
    const {url}=req.body;
    if(!url)return res.status(400).json({error:'URL required'});
    const token=crypto.randomBytes(32).toString('hex');
    const expiresAt=new Date(Date.now()+24*60*60*1000);
    proxyLinks.set(token,{url,expiresAt,accessed:false});
    const host=req.headers['x-forwarded-host']||req.get('host')||'nym-proxy-backend.vercel.app';
    const proto=req.headers['x-forwarded-proto']||'https';
    const proxyUrl=`${proto}://${host}/access/${token}`;
    res.json({success:true,proxyUrl,expiresAt:expiresAt.toISOString()});
  }catch(e){
    res.status(500).json({error:e.message});
  }
});

app.get('/access/:token',async(req,res)=>{
  try{
    const {token}=req.params;
    const proxyData=proxyLinks.get(token);
    if(!proxyData)return res.status(404).json({error:'Link expired'});
    if(new Date()>proxyData.expiresAt){
      proxyLinks.delete(token);
      return res.status(410).json({error:'Link expired'});
    }
    const r=await axios.get(proxyData.url,{timeout:15000,headers:{'User-Agent':'Mozilla/5.0'}});
    res.set({'Content-Type':r.headers['content-type']||'text/html','Cache-Control':'no-store'});
    res.send(r.data);
  }catch(e){
    res.status(502).json({error:'Access failed: '+e.message});
  }
});

setInterval(()=>{
  const now=new Date();
  for(const [token,data] of proxyLinks){
    if(now>data.expiresAt)proxyLinks.delete(token);
  }
},60*60*1000);

export default app;
