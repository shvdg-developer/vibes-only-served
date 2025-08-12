const fp = require('fastify-plugin');

async function swaggerPlugin(fastify, opts) {
  const { appVersion } = opts;

  await fastify.register(require('@fastify/swagger'), {
    openapi: {
      info: { title: 'Vibes Only Served API', version: appVersion },
      servers: [{ url: 'http://localhost:3000' }],
      tags: [
        { name: 'hello', description: 'Greeting endpoint' },
        { name: 'ops', description: 'Operational endpoints' },
        { name: 'meta', description: 'Meta endpoints' },
      ],
    },
  });

  await fastify.register(require('@fastify/swagger-ui'), {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: false },
    theme: { title: 'Vibes Only Served – API Docs' },
  });
}

module.exports = fp(swaggerPlugin);


