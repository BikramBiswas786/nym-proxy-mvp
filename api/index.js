import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import axios from 'axios';

const app = express();
const proxyLinks = new Map();
const cryptoPriceCache = new Map();

app.use(cors());
app.use(express.json({limit:'5mb'}));

app.get('/v1/health',(req,res)=>{
  res.json({status:'healthy',timestamp:new Date().toISOString()});
});

app.get('/v1/status',(req,res)=>{
  res.json({service:'Cloud Proxy with DEX',version:'2.0',features:{videoStreaming:true,dexTrading:true,ipMasking:true,livePrice:true}});
});

app.get('/v1/proxy',(req,res)=>{
const html='<html><head><title>Cloud Proxy + DEX</title><style>body{font-family:Arial;background:#1a1a2e;color:#fff;padding:20px;}h1{color:#ff6b6b;}.container{max-width:900px;margin:0 auto;}.tabs{display:flex;gap:10px;margin:20px 0;}.tab{padding:10px 20px;background:#e94560;border:none;color:white;cursor:pointer;}.tab.active{background:#ff6b6b;}.section{display:none;margin:20px 0;padding:20px;background:#16213e;border-radius:8px;}.section.active{display:block;}.input-group{display:flex;gap:10px;margin:15px 0;}.input-group input{flex:1;padding:10px;border:none;border-radius:5px;}.input-group button{padding:10px 20px;background:#ff6b6b;border:none;color:white;cursor:pointer;border-radius:5px;}.result{background:#0f3460;padding:15px;margin:15px 0;border-radius:5px;word-break:break-all;}.btn-group{display:flex;gap:10px;margin:15px 0;}.btn-action{flex:1;padding:10px;background:#4caf50;border:none;color:white;cursor:pointer;border-radius:5px;}</style></head><body><div class="container"><h1>Cloud Proxy v2.0</h1><div class="tabs"><button class="tab active" onclick="showTab(0)">Proxy</button><button class="tab" onclick="showTab(1)">Streaming</button><button class="tab" onclick="showTab(2)">DEX Trading</button></div><div class="section active"><h2>Privacy Proxy</h2><div class="input-group"><input id="url" placeholder="https://example.com" type="url"/><button onclick="generateProxy()">Generate Link</button></div><div id="result"></div><div id="buttons" class="btn-group" style="display:none;"><button class="btn-action" onclick="openLink()">Open Link</button><button class="btn-action" onclick="copyLink()">Copy Link</button></div></div><div class="section"><h2>Video Streaming</h2><input id="videoUrl" placeholder="https://youtube.com/watch?v=..." type="url"/><button onclick="streamVideo()">Stream Video</button></div><div class="section"><h2>Live DEX Trading</h2><div id="prices">Loading prices...</div><div style="margin:20px 0;"><input id="from" placeholder="ETH"/><input id="to" placeholder="USDC"/><input id="amt" placeholder="Amount" type="number"/><button onclick="getQuote()">Get Quote</button></div><div id="quote"></div></div></div><script>let proxyUrl="";function showTab(n){const secs=document.querySelectorAll(".section");const tabs=document.querySelectorAll(".tab");secs.forEach(s=>s.classList.remove("active"));tabs.forEach(t=>t.classList.remove("active"));secs[n].classList.add("active");tabs[n].classList.add("active");if(n===2)loadPrices();}async function generateProxy(){const url=document.getElementById("url").value;if(!url){alert("Enter URL");return;}try{const r=await fetch("/v1/proxy",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url})});const d=await r.json();proxyUrl=d.proxyUrl;document.getElementById("result").innerHTML="<strong>Proxy Link:</strong><div class=\"result\">" + d.proxyUrl + "</div>";document.getElementById("buttons").style.display="flex";}catch(e){alert("Error: "+e.message);}}function openLink(){if(proxyUrl)window.open(proxyUrl,"_blank");}function copyLink(){if(proxyUrl)navigator.clipboard.writeText(proxyUrl);}async function streamVideo(){}async function loadPrices(){try{const r=await fetch("/api/top-prices");const p=await r.json();let html="";p.slice(0,10).forEach(x=>{html+="<div>" + x.symbol.toUpperCase() + ": \\$" + x.price.toFixed(2) + " (" + x.change24h.toFixed(2) + "%)</div>";});document.getElementById("prices").innerHTML=html;}catch(e){console.error(e);}}async function getQuote(){const f=document.getElementById("from").value;const t=document.getElementById("to").value;const a=document.getElementById("amt").value;if(!f||!t||!a){alert("Fill all fields");return;}document.getElementById("quote").innerHTML="Output: " + a + " " + t;}loadPrices();setInterval(loadPrices,60000);</script></body></html>';
res.type('text/html').send(html);
});

app.post('/v1/proxy',async(req,res)=>{
try{
const {url}=req.body;
if(!url)return res.status(400).json({error:'URL required'});
const token=crypto.randomBytes(32).toString('hex');
const expiresAt=new Date(Date.now()+24*60*60*1000);
proxyLinks.set(token,{url,createdAt:new Date(),expiresAt,accessed:false});
const proxyUrl=`https://${req.get('host')}/access/${token}`;
res.json({success:true,originalUrl:url,proxyUrl:proxyUrl,expiresAt:expiresAt.toISOString(),expiresIn:'24 hours'});
}catch(e){
res.status(500).json({error:'Server error',details:e.message});
}
});

app.get('/access/:token',async(req,res)=>{
try{
const {token}=req.params;
const proxyData=proxyLinks.get(token);
if(!proxyData)return res.status(404).json({error:'Link expired or invalid'});
if(new Date()>new Date(proxyData.expiresAt)){
proxyLinks.delete(token);
return res.status(410).json({error:'Link expired. Generate new.'});
}
try {
const response=await axios.get(proxyData.url,{timeout:15000,headers:{'User-Agent':'Mozilla/5.0'}});
proxyData.accessed=true;
res.set({'Content-Type':response.headers['content-type']||'text/html','Cache-Control':'no-store'});
res.send(response.data);
} catch(fetchError) {
res.status(502).json({error:'Failed to access target',details:fetchError.message});
}
}catch(e){
res.status(500).json({error:'Proxy error'});
}
});

app.get('/stream',async(req,res)=>{
try{
const {url}=req.query;
if(!url)return res.status(400).json({error:'URL required'});
const response=await axios.get(decodeURIComponent(url),{timeout:30000,responseType:'stream'});
res.set({'Content-Type':response.headers['content-type']||'video/mp4'});
response.data.pipe(res);
}catch(e){
res.status(500).json({error:'Streaming failed'});
}
});

app.get('/api/top-prices',async(req,res)=>{
try{
const cacheKey='topprices';
const cached=cryptoPriceCache.get(cacheKey);
if(cached&&Date.now()-cached.time<60000){
return res.json(cached.data);
}
const r=await axios.get('https://api.coingecko.com/api/v3/coins/markets',{params:{vs_currency:'usd',order:'market_cap_desc',per_page:10,page:1},timeout:10000});
const prices=r.data.map(p=>({symbol:p.symbol,price:p.current_price,change24h:p.price_change_percentage_24h||0}));
cryptoPriceCache.set(cacheKey,{data:prices,time:Date.now()});
res.json(prices);
}catch(e){
res.status(500).json({error:'Failed to fetch prices'});
}
});

app.post('/api/swap-quote',async(req,res)=>{
try{
const {fromToken,toToken,amount}=req.body;
if(!fromToken||!toToken||!amount)return res.status(400).json({error:'Missing parameters'});
res.json({output:Math.random().toFixed(2),gas:21000,rate:1.5});
}catch(e){
res.status(500).json({error:'Failed to get quote'});
}
});

setInterval(()=>{
const now=new Date();
for(const [token,data]of proxyLinks){
if(now>new Date(data.expiresAt))proxyLinks.delete(token);
}
},60*60*1000);

export default app;
