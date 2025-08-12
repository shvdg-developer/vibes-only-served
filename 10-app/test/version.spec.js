const t = require('tap');
const { build } = require('./helpers/build');

t.test('version endpoint', async (t) => {
  const app = await build();
  t.teardown(() => app.close());

  const res = await app.inject({ method: 'GET', url: '/version' });
  t.equal(res.statusCode, 200);
  const body = res.json();
  t.type(body.version, 'string');
  t.type(body.commit, 'string');
});


