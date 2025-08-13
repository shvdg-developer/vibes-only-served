const fastifyFactory = require('fastify');
const { loadEnvConfig } = require('./config/env');

const registerSwagger = require('./plugins/swagger');
const helloRoutes = require('./routes/hello');
const healthRoutes = require('./routes/health');
const generateIdeasRoutes = require('./routes/generate-ideas');

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
  await app.register(generateIdeasRoutes, { aiProvider: env.aiProvider });

  app.get('/openapi.json', {
    schema: {
      summary: 'OpenAPI 3.0 document',
      tags: ['meta'],
      // No response schema to avoid stripping properties during serialization
    },
  }, async function handler(request, reply) {
    const doc = this.swagger();
    reply.type('application/json; charset=utf-8');
    return doc;
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


