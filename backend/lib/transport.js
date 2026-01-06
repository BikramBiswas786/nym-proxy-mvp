// transport.js - Transport adapters for Apify and Mixnet
import fetch from 'node-fetch';
import { SocksProxyAgent } from 'socks-proxy-agent';

export class TransportAdapter {
  async fetch(url, opts) { throw new Error('override'); }
}

export class ApifyTransport extends TransportAdapter {
  async fetch(url, opts = {}) {
    return fetch(url, opts);
  }
}

export class Socks5Transport extends TransportAdapter {
  constructor(socksUrl) {
    super();
    if (!socksUrl) throw new Error('missing socks url');
    this.agent = new SocksProxyAgent(socksUrl);
  }
  async fetch(url, opts = {}) {
    const merged = { ...opts, agent: this.agent };
    return fetch(url, merged);
  }
}
