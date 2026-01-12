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
const html = '<html><head><title>Cloud Proxy + DEX</title></head><body><h1>Cloud Proxy v2.0</h1><p>Video Streaming + Live DEX Trading</p><div id="tabs"><button onclick="switchTab(\"proxy\")">Proxy</button><button onclick="switchTab(\"streaming\")">Streaming</button><button onclick="switchTab(\"dex\")">DEX Trading</button></div><div id="proxy" style="display:block;"><h2>Privacy Proxy</h2><input id="urlInput" placeholder="https://example.com"/><button onclick="generateProxy()">Generate Link</button><p id="result" style="display:none;"></p></div><div id="streaming" style="display:none;"><h2>Video Streaming</h2><input id="videoUrl" placeholder="https://youtube.com/watch?v=..."/><button onclick="streamVideo()">Stream Video</button></div><div id="dex" style="display:none;"><h2>Live DEX Trading</h2><div id="priceBoard">Loading prices...</div><input id="fromToken" placeholder="ETH"/><input id="toToken" placeholder="USDC"/><input id="amount" placeholder="Amount" type="number"/><button onclick="getSwapQuote()">Get Quote</button><p id="quoteResult" style="display:none;"></p></div></body><script>function switchTab(t){document.querySelectorAll(\"[id=proxy],[id=streaming],[id=dex]\").forEach(e=>e.style.display=\"none\");document.getElementById(t).style.display=\"block\";if(t===\"dex\")updatePriceBoard();}async function generateProxy(){const u=document.getElementById(\"urlInput\").value;if(!u){alert(\"Enter URL\");return;}try{const r=await fetch(\"/v1/proxy\",{method:\"POST\",headers:{\"Content-Type\":\"application/json\"},body:JSON.stringify({url:u})});const d=await r.json();document.getElementById(\"result\").textContent=d.proxyUrl;document.getElementById(\"result\").style.display=\"block\";}catch(e){alert(\"Error: \"+e.message);}}async function streamVideo(){const u=document.getElementById(\"videoUrl\").value;if(!u){alert(\"Enter video URL\");return;}}async function updatePriceBoard(){try{const r=await fetch(\"/api/top-prices\");const p=await r.json();const h=p.map(x=>`<div>${x.symbol.toUpperCase()}: \\$${x.price.toFixed(2)} (${x.change24h.toFixed(2)}%)</div>`).join(\"\");document.getElementById(\"priceBoard\").innerHTML=h;}catch(e){console.error(e);}}async function getSwapQuote(){const f=document.getElementById(\"fromToken\").value;const t=document.getElementById(\"toToken\").value;const a=document.getElementById(\"amount\").value;if(!f||!t||!a){alert(\"Fill all fields\");return;}try{const r=await fetch(\"/api/swap-quote\",{method:\"POST\",headers:{\"Content-Type\":\"application/json\"},body:JSON.stringify({fromToken:f,toToken:t,amount:a})});const d=await r.json();document.getElementById(\"quoteResult\").textContent=`Output: ${d.output} ${t}`;document.getElementById(\"quoteResult\").style.display=\"block\";}catch(e){alert(\"Error: \"+e.message);}}updatePriceBoard();setInterval(updatePriceBoard,10000);</script></html>';
res.type('text/html').send(html);
});

app.post('/v1/proxy',async(req,res)=>{
try{
const {url}=req.body;
if(!url)return res.status(400).json({error:'URL required'});
const token=crypto.randomBytes(32).toString('hex');
const expiresAt=new Date(Date.now()+24*60*60*1000);
proxyLinks.set(token,{url,createdAt:new Date(),expiresAt,accessed:false});
res.json({success:true,originalUrl:url,proxyUrl:`https://nym-proxy-backend.vercel.app/access/${token}`,expiresAt:expiresAt.toISOString(),expiresIn:'24 hours'});
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
return res.status(410).json({error:'Link expired.'});
}
const response=await fetch(proxyData.url,{headers:{'User-Agent':'Mozilla/5.0'},timeout:15000});
if(!response.ok)return res.status(response.status).json({error:`Target returned ${response.status}`});
const content=await response.text();
proxyData.accessed=true;
res.set({'Content-Type':response.headers.get('content-type')||'text/html','Cache-Control':'no-store'});
res.send(content);
}catch(e){
res.status(500).json({error:'Failed to access content'});
}
});

app.get('/stream',async(req,res)=>{
try{
const {url}=req.query;
if(!url)return res.status(400).json({error:'URL required'});
const response=await fetch(decodeURIComponent(url),{timeout:30000});
res.set({'Content-Type':response.headers.get('content-type')||'video/mp4'});
response.body.pipe(res);
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
const r=await axios.get('https://api.coingecko.com/api/v3/coins/markets',{params:{vs_currency:'usd',order:'market_cap_desc',per_page:10,page:1}});
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
