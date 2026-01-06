// validateUrl.js - SSRF protection and URL validation
import dns from 'dns/promises';
import ipaddr from 'ipaddr.js';

const PRIVATE_CIDRS = [
  '0.0.0.0/8','10.0.0.0/8','100.64.0.0/10','127.0.0.0/8',
  '169.254.0.0/16','172.16.0.0/12','192.0.0.0/24','192.0.2.0/24',
  '192.168.0.0/16','198.18.0.0/15','198.51.100.0/24','203.0.113.0/24',
  '224.0.0.0/4','240.0.0.0/4','::1/128','fc00::/7','fe80::/10'
];

function isPrivateIp(ip) {
  try {
    const addr = ipaddr.parse(ip);
    for (const cidr of PRIVATE_CIDRS) {
      const [range, bits] = cidr.split('/');
      if (addr.match(ipaddr.parse(range), parseInt(bits, 10))) return true;
    }
  } catch (e) {
    return true; // treat unparseable as suspicious
  }
  return false;
}

export async function validateUrlAndHost(urlString) {
  if (!urlString) throw new Error('missing url');
  let url;
  try { url = new URL(urlString); }
  catch (e) { throw new Error('invalid url'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('invalid protocol');

  // Prevent characters like null
  if (url.hostname.includes('\0')) throw new Error('invalid hostname');

  const addrs = await dns.lookup(url.hostname, { all: true }).catch(()=>{ throw new Error('dns lookup failed'); });
  if (!addrs || addrs.length === 0) throw new Error('dns lookup failed');

  for (const a of addrs) {
    if (isPrivateIp(a.address)) throw new Error('disallowed target (private ip)');
  }
  return { url: url.toString(), resolved: addrs.map(a => a.address) };
