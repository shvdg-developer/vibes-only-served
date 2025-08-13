async function routes(fastify) {
  fastify.get('/api/v1/generate-ideas', {
    schema: {
      summary: 'Generate dummy ideas',
      description: 'Returns N dummy ideas. All ideas are identical except for unique ids.',
      tags: ['ideas'],
      querystring: {
        type: 'object',
        properties: {
          count: { type: 'integer', minimum: 1, maximum: 12, default: 1 },
        },
        additionalProperties: false,
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'title', 'summary', 'objective', 'tags'],
            additionalProperties: false,
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              summary: { type: 'string' },
              objective: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
            },
          },
        },
        400: {
          type: 'object',
          required: ['error'],
          properties: { error: { type: 'string' } },
        },
      },
    },
    errorHandler: (error, request, reply) => {
      if (error && error.code === 'FST_ERR_VALIDATION') {
        reply.code(400).send({ error: "Invalid 'count'. Must be an integer between 1 and 12." });
        return;
      }
      throw error;
    },
  }, async (request, reply) => {
    const raw = request.query?.count;
    const count = raw === undefined ? 1 : Number(raw);

    if (!Number.isInteger(count) || count < 1 || count > 12) {
      reply.code(400);
      return { error: "Invalid 'count'. Must be an integer between 1 and 12." };
    }

    const ideas = Array.from({ length: count }, (_, index) => ({
      id: `idea-${index + 1}`,
      title: 'Dummy Idea',
      summary: 'A placeholder idea for development and testing.',
      objective: 'Demonstrate the API contract for idea generation.',
      tags: ['ideation', 'dummy', 'v0'],
    }));

    return ideas;
  });
}

module.exports = routes;