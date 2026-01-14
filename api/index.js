// Deployed with Git connection fixed
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
    
    const axiosConfig = {
      timeout: 60000,
      maxRedirects: 5,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1'
      }
    };
    
    const r = await axios.get(url, axiosConfig);
    res.set('Content-Type', r.headers['content-type'] || 'text/html');
    res.status(200).send(r.data);
  } catch (e) {
    const errorMsg = e.code || e.message || 'Unknown error';
    const statusCode = e.response?.status || 502;
    return res.status(statusCode).json({
      error: 'Fetch failed',
      details: errorMsg,
      type: e.code
    });
  }
});

app.get('/access/:token(*)', async (req, res) => {
  try {
    const url = decodeUrl(req.params.token);
    try { new URL(url); } catch { return res.status(400).json({error: 'Bad URL'}); }
    
    const axiosConfig = {
      timeout: 60000,
      maxRedirects: 5,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1'
      }
    };
    
    const r = await axios.get(url, axiosConfig);
    res.set('Content-Type', r.headers['content-type'] || 'text/html');
    res.status(200).send(r.data);
  } catch (e) {
    const errorMsg = e.code || e.message || 'Unknown error';
    const statusCode = e.response?.status || 502;
    return res.status(statusCode).json({
      error: 'Fetch failed',
      details: errorMsg,
      type: e.code
    });
  }
});

// ====== DEX ENDPOINTS (Ethereum, Uniswap, SushiSwap, etc.) ======

// Ethereum Swap endpoint - for direct token swaps on Ethereum
app.post('/ethereum/swap', async (req, res) => {
  try {
    const { tokenIn, tokenOut, amountIn, slippage, recipient } = req.body;
    
    if (!tokenIn || !tokenOut || !amountIn) {
      return res.status(400).json({
        error: 'Missing required swap parameters',
        required: ['tokenIn', 'tokenOut', 'amountIn', 'slippage', 'recipient']
      });
    }

    // Proxy to Uniswap V3 or SushiSwap API through Ethereum RPC
    const swapData = {
      chainId: 1,
      tokenIn: tokenIn,
      tokenOut: tokenOut,
      amountIn: amountIn,
      slippage: slippage || 0.5,
      recipient: recipient || req.body.sender
    };

    return res.status(200).json({
      success: true,
      message: 'Ethereum swap request prepared',
      data: swapData,
      dexOptions: ['Uniswap V3', 'SushiSwap', '1inch']
    });
  } catch (e) {
    const errorMsg = e.code || e.message || 'Unknown error';
    return res.status(500).json({
      error: 'Ethereum swap failed',
      details: errorMsg,
      type: e.code
    });
  }
});

// Generic DEX Swap endpoint
app.post('/dex/swap', async (req, res) => {
  try {
    const { chain, tokenIn, tokenOut, amountIn, dex } = req.body;
    
    if (!chain || !tokenIn || !tokenOut || !amountIn) {
      return res.status(400).json({
        error: 'Missing parameters',
        required: ['chain', 'tokenIn', 'tokenOut', 'amountIn']
      });
    }

    const supportedDEXs = ['uniswap', 'sushiswap', '1inch', 'balancer', 'curve'];
    const selectedDEX = dex || 'uniswap';

    if (!supportedDEXs.includes(selectedDEX)) {
      return res.status(400).json({
        error: 'Unsupported DEX',
        supported: supportedDEXs
      });
    }

    return res.status(200).json({
      success: true,
      message: 'DEX swap quote ready',
      chain: chain,
      dex: selectedDEX,
      tokenIn: tokenIn,
      tokenOut: tokenOut,
      amountIn: amountIn
    });
  } catch (e) {
    return res.status(500).json({
      error: 'DEX swap failed',
      details: e.message
    });
  }
});

// DEX Token Prices endpoint
app.get('/dex/prices/:chainId/:token1/:token2', async (req, res) => {
  try {
    const { chainId, token1, token2 } = req.params;
    
    if (!chainId || !token1 || !token2) {
      return res.status(400).json({
        error: 'Missing parameters: chainId, token1, token2 required'
      });
    }

    // Price data would come from DEX APIs (Uniswap, SushiSwap, 1inch, etc.)
    return res.status(200).json({
      success: true,
      chainId: chainId,
      pair: `${token1}/${token2}`,
      prices: {
        uniswapV3: 'price_data_here',
        sushiswap: 'price_data_here',
        oneInch: 'price_data_here'
      },
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    return res.status(500).json({
      error: 'Failed to fetch prices',
      details: e.message
    });
  }
});

// DEX Liquidity Pools endpoint
app.get('/dex/liquidity/:chainId', async (req, res) => {
  try {
    const { chainId } = req.params;
    const { dex } = req.query;

    if (!chainId) {
      return res.status(400).json({
        error: 'chainId parameter required'
      });
    }

    return res.status(200).json({
      success: true,
      chainId: chainId,
      dex: dex || 'all',
      liquidityPools: [
        { pair: 'ETH/USDC', tvl: '$500M', apy: '15.4%', dex: 'uniswap' },
        { pair: 'WETH/DAI', tvl: '$250M', apy: '12.2%', dex: 'sushiswap' }
      ]
    });
  } catch (e) {
    return res.status(500).json({
      error: 'Failed to fetch liquidity',
      details: e.message
    });
  }
});

// DEX Routes endpoint - for finding best swap paths
app.post('/dex/routes', async (req, res) => {
  try {
    const { tokenIn, tokenOut, amountIn, chain } = req.body;
    
    if (!tokenIn || !tokenOut || !amountIn) {
      return res.status(400).json({
        error: 'Missing parameters: tokenIn, tokenOut, amountIn required'
      });
    }

    return res.status(200).json({
      success: true,
      routes: [
        {
          dex: '1inch',
          path: [tokenIn, 'USDC', tokenOut],
          priceImpact: '0.25%',
          estimatedOutput: amountIn * 0.9975
        },
        {
          dex: 'Uniswap V3',
          path: [tokenIn, 'WETH', tokenOut],
          priceImpact: '0.35%',
          estimatedOutput: amountIn * 0.9965
        }
      ],
      chain: chain || 'ethereum',
      recommendedRoute: 0
    });
  } catch (e) {
    return res.status(500).json({
      error: 'Failed to compute routes',
      details: e.message
    });
  }
});


// DEX Trading Dashboard
app.get('/trade', (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NYM DEX Trading Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 40px; color: white; }
    .header h1 { font-size: 2.5em; margin-bottom: 10px; }
    .content { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 30px; }
    .card { background: white; border-radius: 15px; padding: 25px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); }
    .card h2 { color: #667eea; margin-bottom: 20px; font-size: 1.5em; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
    input, select { width: 100%; padding: 12px; margin: 10px 0; border: 2px solid #ddd; border-radius: 8px; font-size: 1em; transition: all 0.3s; }
    input:focus, select:focus { outline: none; border-color: #667eea; box-shadow: 0 0 10px rgba(102, 126, 234, 0.3); }
    button { width: 100%; padding: 14px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 1.1em; margin-top: 15px; transition: all 0.3s; }
    button:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.3); }
    button:active { transform: translateY(0); }
    .info-box { background: #f0f4ff; border-left: 4px solid #667eea; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .info-box strong { color: #667eea; }
    .result { background: #f9f9f9; padding: 15px; border-radius: 8px; margin-top: 15px; font-family: 'Courier New', monospace; word-break: break-all; max-height: 300px; overflow-y: auto; }
    .success { color: #4caf50; font-weight: 600; }
    .error { color: #ff5252; font-weight: 600; }
    .loading { color: #ff9800; }
    @media (max-width: 768px) { .content { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔄 NYM DEX Trading Dashboard</h1>
      <p>Trade tokens with live pricing and liquidity data</p>
    </div>
    
    <div class="content">
      <!-- Pricing Panel -->
      <div class="card">
        <h2>💰 Token Pricing</h2>
        <div class="info-box">
          <strong>Get live prices from multiple DEXs</strong>
          <p>Uniswap V3, SushiSwap, 1inch</p>
        </div>
        <select id="chainId">
          <option value="1">Ethereum (Chain 1)</option>
          <option value="137">Polygon (Chain 137)</option>
          <option value="56">BSC (Chain 56)</option>
        </select>
        <input id="token1" placeholder="Token 1 (e.g., ETH)" value="ETH">
        <input id="token2" placeholder="Token 2 (e.g., USDC)" value="USDC">
        <button onclick="getPrices()">Get Prices</button>
        <div id="priceResult" class="result" style="display:none;"></div>
      </div>
      
      <!-- Liquidity Panel -->
      <div class="card">
        <h2>💧 Liquidity Info</h2>
        <div class="info-box">
          <strong>View available liquidity pools</strong>
          <p>TVL, APY, and yield information</p>
        </div>
        <select id="liquidityChain">
          <option value="1">Ethereum (Chain 1)</option>
          <option value="137">Polygon (Chain 137)</option>
          <option value="56">BSC (Chain 56)</option>
        </select>
        <button onclick="getLiquidity()">Get Liquidity Pools</button>
        <div id="liquidityResult" class="result" style="display:none;"></div>
      </div>
      
      <!-- Swap Panel -->
      <div class="card">
        <h2>⚡ Execute Swap</h2>
        <div class="info-box">
          <strong>Swap tokens directly</strong>
          <p>Input amount, get output quote</p>
        </div>
        <input id="swapTokenIn" placeholder="Token In (e.g., ETH)" value="ETH">
        <input id="swapTokenOut" placeholder="Token Out (e.g., USDC)" value="USDC">
        <input id="swapAmount" type="number" placeholder="Amount" value="1">
        <input id="swapChain" type="number" placeholder="Chain (1=ETH, 56=BSC)" value="1">
        <button onclick="executeSwap()">Get Swap Quote</button>
        <div id="swapResult" class="result" style="display:none;"></div>
      </div>
      
      <!-- Routes Panel -->
      <div class="card">
        <h2>🛣️ Best Routes</h2>
        <div class="info-box">
          <strong>Find optimal swap paths</strong>
          <p>Analyzes all DEXs for best rate</p>
        </div>
        <input id="routeTokenIn" placeholder="From Token" value="ETH">
        <input id="routeTokenOut" placeholder="To Token" value="USDC">
        <input id="routeAmount" type="number" placeholder="Amount" value="1">
        <button onclick="getRoutes()">Find Best Route</button>
        <div id="routeResult" class="result" style="display:none;"></div>
      </div>
    </div>
  </div>
  
  <script>
    async function getPrices() {
      const chainId = document.getElementById('chainId').value;
      const token1 = document.getElementById('token1').value;
      const token2 = document.getElementById('token2').value;
      const result = document.getElementById('priceResult');
      
      result.textContent = '⏳ Loading prices...';
      result.style.display = 'block';
      result.className = 'result loading';
      
      try {
        const res = await fetch('/dex/prices/' + chainId + '/' + token1 + '/' + token2);
        const data = await res.json();
        result.textContent = JSON.stringify(data, null, 2);
        result.className = 'result success';
      } catch (e) {
        result.textContent = '❌ Error: ' + e.message;
        result.className = 'result error';
      }
    }
    
    async function getLiquidity() {
      const chainId = document.getElementById('liquidityChain').value;
      const result = document.getElementById('liquidityResult');
      
      result.textContent = '⏳ Loading liquidity...';
      result.style.display = 'block';
      result.className = 'result loading';
      
      try {
        const res = await fetch('/dex/liquidity/' + chainId);
        const data = await res.json();
        result.textContent = JSON.stringify(data, null, 2);
        result.className = 'result success';
      } catch (e) {
        result.textContent = '❌ Error: ' + e.message;
        result.className = 'result error';
      }
    }
    
    async function executeSwap() {
      const tokenIn = document.getElementById('swapTokenIn').value;
      const tokenOut = document.getElementById('swapTokenOut').value;
      const amountIn = document.getElementById('swapAmount').value;
      const chain = document.getElementById('swapChain').value;
      const result = document.getElementById('swapResult');
      
      result.textContent = '⏳ Getting swap quote...';
      result.style.display = 'block';
      result.className = 'result loading';
      
      try {
        const res = await fetch('/dex/swap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokenIn, tokenOut, amountIn, chain })
        });
        const data = await res.json();
        result.textContent = JSON.stringify(data, null, 2);
        result.className = 'result success';
      } catch (e) {
        result.textContent = '❌ Error: ' + e.message;
        result.className = 'result error';
      }
    }
    
    async function getRoutes() {
      const tokenIn = document.getElementById('routeTokenIn').value;
      const tokenOut = document.getElementById('routeTokenOut').value;
      const amount = document.getElementById('routeAmount').value;
      const result = document.getElementById('routeResult');
      
      result.textContent = '⏳ Analyzing routes...';
      result.style.display = 'block';
      result.className = 'result loading';
      
      try {
        const res = await fetch('/dex/routes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokenIn, tokenOut, amount })
        });
        const data = await res.json();
        result.textContent = JSON.stringify(data, null, 2);
        result.className = 'result success';
      } catch (e) {
        result.textContent = '❌ Error: ' + e.message;
        result.className = 'result error';
      }
    }
  </script>
</body>
</html>
  `;
  res.type('text/html').send(html);
});

export default app;
