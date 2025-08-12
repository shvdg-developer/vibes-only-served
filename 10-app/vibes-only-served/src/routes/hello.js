async function routes(fastify) {
  fastify.get('/api/v1/hello', {
    schema: {
      summary: 'Hello world',
      description: 'Greets the provided name. Defaults to "World".',
      tags: ['hello'],
      querystring: {
        type: 'object',
        properties: { name: { type: 'string', default: 'World' } },
        additionalProperties: false,
      },
      response: {
        200: {
          type: 'object',
          required: ['message'],
          properties: { message: { type: 'string' } },
        },
      },
    },
  }, async (request) => {
    const name = request.query?.name ?? 'World';
    return { message: `Hello, ${name}!` };
  });
}

module.exports = routes;


