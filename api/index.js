import app from '../api-server/server.js';

export default function handler(req, res) {
  return new Promise((resolve, reject) => {
    app(req, res);
    res.on('finish', resolve);
    res.on('error', reject);
  });
}
