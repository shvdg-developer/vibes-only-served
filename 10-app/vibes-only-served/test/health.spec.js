const t = require('tap');
const { build } = require('./helpers/build');

t.test('health endpoints', async (t) => {
  const app = await build();

  t.teardown(() => app.close());

  {
    const res = await app.inject({ method: 'GET', url: '/healthz' });
    t.equal(res.statusCode, 200);
    t.same(res.headers['content-type']?.includes('application/json'), true);
    t.same(res.json(), { status: 'ok' });
  }

  {
    const res = await app.inject({ method: 'GET', url: '/readyz' });
    t.equal(res.statusCode, 200);
    t.same(res.json(), { status: 'ready' });
  }
});


