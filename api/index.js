const app = require('../api-server/server.js');

module.exports = (req, res) => {
  return app(req, res);
};
