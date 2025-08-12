const t = require('tap');
const { build } = require('./helpers/build');

t.test('hello endpoint', async (t) => {
  const app = await build();
  t.teardown(() => app.close());

  {
    const res = await app.inject({ method: 'GET', url: '/api/v1/hello' });
    t.equal(res.statusCode, 200);
    t.same(res.json(), { message: 'Hello, World!' });
  }

  {
    const res = await app.inject({ method: 'GET', url: '/api/v1/hello?name=Vibes' });
    t.equal(res.statusCode, 200);
    t.same(res.json(), { message: 'Hello, Vibes!' });
  }
});


