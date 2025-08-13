'use strict';

const path = require('node:path');
const { createDbClient } = require('../db/client');

async function routes(fastify, opts) {
  const dbFilePath = opts?.dbFilePath || process.env.DB_FILE_PATH;

  fastify.get('/api/v1/ideas', {
    schema: {
      summary: 'List ideas',
      tags: ['ideas'],
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
      },
    },
  }, async (request, reply) => {
    const client = await createDbClient({ storageFilePath: dbFilePath });
    try {
      const ideas = await client.listIdeas();
      return ideas;
    } finally {
      client.close();
    }
  });
}

module.exports = routes;