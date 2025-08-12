const t = require('tap');
const SwaggerParser = require('@apidevtools/swagger-parser');
const { build } = require('./helpers/build');

t.test('openapi document is served and valid', async (t) => {
  const app = await build();
  t.teardown(() => app.close());

  const res = await app.inject({ method: 'GET', url: '/openapi.json' });
  t.equal(res.statusCode, 200);
  const doc = res.json();

  // Basic shape
  t.ok(doc.openapi?.startsWith('3.'));
  t.equal(doc.info?.title, 'Vibes Only Served API');

  // Validate against OpenAPI schema
  await SwaggerParser.validate(doc);
  t.pass('OpenAPI document is valid');
});


