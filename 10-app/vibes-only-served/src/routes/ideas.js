const ideaSchema = {
  type: 'object',
  required: ['id', 'content', 'createdAt'],
  properties: {
    id: { type: 'integer' },
    content: { type: 'string' },
    createdAt: { type: 'string' },
  },
};

function mapIdeaRowToJson(row) {
  return { id: row.id, content: row.content, createdAt: row.created_at };
}

async function routes(fastify) {
  fastify.get('/api/v1/ideas/random', {
    schema: {
      summary: 'Random ideas',
      description: 'Retrieve a specified number of random ideas.',
      tags: ['ideas'],
      querystring: {
        type: 'object',
        properties: {
          count: { type: 'integer', minimum: 1, maximum: 100, default: 1 },
        },
        additionalProperties: false,
      },
      response: {
        200: {
          type: 'object',
          required: ['ideas'],
          properties: {
            ideas: { type: 'array', items: ideaSchema },
          },
        },
      },
    },
  }, async (request) => {
    const countRaw = request.query?.count;
    const count = Number.isInteger(countRaw) ? countRaw : Number(countRaw) || 1;
    const limited = Math.max(1, Math.min(100, count));

    const rows = fastify.db
      .prepare('SELECT id, content, created_at FROM ideas ORDER BY RANDOM() LIMIT ?')
      .all(limited);

    return { ideas: rows.map(mapIdeaRowToJson) };
  });

  fastify.get('/api/v1/ideas', {
    schema: {
      summary: 'List ideas (paginated)',
      description: 'Retrieve ideas in batches using limit and offset for pagination.',
      tags: ['ideas'],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          offset: { type: 'integer', minimum: 0, default: 0 },
        },
        additionalProperties: false,
      },
      response: {
        200: {
          type: 'object',
          required: ['items', 'total', 'limit', 'offset', 'hasMore'],
          properties: {
            items: { type: 'array', items: ideaSchema },
            total: { type: 'integer' },
            limit: { type: 'integer' },
            offset: { type: 'integer' },
            hasMore: { type: 'boolean' },
            nextOffset: { type: 'integer' },
          },
        },
      },
    },
  }, async (request) => {
    const limitRaw = request.query?.limit;
    const offsetRaw = request.query?.offset;
    const limitParsed = Number.isInteger(limitRaw) ? limitRaw : Number(limitRaw);
    const offsetParsed = Number.isInteger(offsetRaw) ? offsetRaw : Number(offsetRaw);

    const limit = Number.isFinite(limitParsed) ? Math.max(1, Math.min(100, limitParsed)) : 20;
    const offset = Number.isFinite(offsetParsed) ? Math.max(0, offsetParsed) : 0;

    const total = fastify.db.prepare('SELECT COUNT(*) AS total FROM ideas').get().total;

    const rows = fastify.db
      .prepare('SELECT id, content, created_at FROM ideas ORDER BY id LIMIT ? OFFSET ?')
      .all(limit, offset);

    const nextOffset = offset + rows.length;
    const hasMore = nextOffset < total;

    return {
      items: rows.map(mapIdeaRowToJson),
      total,
      limit,
      offset,
      hasMore,
      nextOffset: hasMore ? nextOffset : undefined,
    };
  });
}

module.exports = routes;