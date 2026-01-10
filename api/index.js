import app from '../api-server/server.js';

export default function handler(req, res) {
  return app(req, res);
}
