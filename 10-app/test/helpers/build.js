const { buildServer } = require('../../src/server');

async function build() {
  const { app } = await buildServer();
  return app;
}

module.exports = { build };


