const fastifyFactory = require('fastify');
const { loadEnvConfig } = require('./config/env');

const registerSwagger = require('./plugins/swagger');
const helloRoutes = require('./routes/hello');
const healthRoutes = require('./routes/health');

async function buildServer() {
  const env = loadEnvConfig();
  const app = fastifyFactory({
    logger: {
      level: 'info',
    },
  });

  await app.register(registerSwagger, { appVersion: env.appVersion });
  await app.register(helloRoutes);
  await app.register(healthRoutes, { appVersion: env.appVersion, gitCommit: env.gitCommit });

  app.get('/openapi.json', {
    schema: {
      summary: 'OpenAPI 3.0 document',
      tags: ['meta'],
      response: { 200: { type: 'object' } },
    },
  }, async function handler() {
    return this.swagger();
  });

  return { app, env };
}

async function start() {
  const { app, env } = await buildServer();
  const port = env.port;
  const host = '0.0.0.0';
  try {
    await app.listen({ port, host });
    app.log.info({ port, host }, 'Server started');
  } catch (err) {
    app.log.error(err, 'Failed to start server');
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = { buildServer };


