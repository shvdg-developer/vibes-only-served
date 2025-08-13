const t = require('tap');
const { buildServer } = require('../src/server');

/** @type {import('fastify').FastifyInstance} */
let app;

t.before(async () => {
  const built = await buildServer();
  app = built.app;
});

t.after(async () => {
  await app.close();
});

// Success: count=3

t.test('GET /api/v1/generate-ideas?count=3 returns 3 ideas', async (t) => {
  const res = await app.inject({ method: 'GET', url: '/api/v1/generate-ideas?count=3' });
  t.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  t.equal(Array.isArray(body), true);
  t.equal(body.length, 3);
  for (const [i, idea] of body.entries()) {
    t.match(idea, {
      id: `idea-${i + 1}`,
      title: 'Dummy Idea',
      summary: String,
      objective: String,
      tags: Array,
    });
  }
});

// Default: omitted count returns 1

t.test('GET /api/v1/generate-ideas returns 1 idea by default', async (t) => {
  const res = await app.inject({ method: 'GET', url: '/api/v1/generate-ideas' });
  t.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  t.equal(body.length, 1);
});

// Validation: count > 12

t.test('GET /api/v1/generate-ideas?count=13 returns 400 with message', async (t) => {
  const res = await app.inject({ method: 'GET', url: '/api/v1/generate-ideas?count=13' });
  t.equal(res.statusCode, 400);
  const body = JSON.parse(res.body);
  t.same(body, { error: "Invalid 'count'. Must be an integer between 1 and 12." });
});