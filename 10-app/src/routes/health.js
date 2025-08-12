async function routes(fastify, opts) {
  const { appVersion, gitCommit } = opts || {};

  fastify.get('/healthz', {
    schema: {
      summary: 'Liveness probe',
      tags: ['ops'],
      response: { 200: { type: 'object', required: ['status'], properties: { status: { type: 'string', const: 'ok' } } } },
    },
  }, async () => ({ status: 'ok' }));

  fastify.get('/readyz', {
    schema: {
      summary: 'Readiness probe',
      tags: ['ops'],
      response: { 200: { type: 'object', required: ['status'], properties: { status: { type: 'string', const: 'ready' } } } },
    },
  }, async () => ({ status: 'ready' }));

  fastify.get('/version', {
    schema: {
      summary: 'App version and commit',
      tags: ['ops'],
      response: { 200: { type: 'object', required: ['version', 'commit'], properties: { version: { type: 'string' }, commit: { type: 'string' } } } },
    },
  }, async () => ({ version: appVersion, commit: gitCommit }));
}

module.exports = routes;


