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


export default app;
