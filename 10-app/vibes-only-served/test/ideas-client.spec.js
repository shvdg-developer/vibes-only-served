'use strict';

const t = require('tap');
const fs = require('node:fs');
const path = require('node:path');

const { createDbClient } = require('../src/db/client');

function tempDbPath(testName) {
  const file = path.join(__dirname, `.tmp-${testName}.sqlite`);
  try { fs.unlinkSync(file); } catch {}
  return file;
}

t.test('ideas client: in-memory CRUD', async (t) => {
  const client = await createDbClient();
  t.teardown(() => client.close());

  const idea = {
    id: 'idea-1',
    title: 'Title',
    summary: 'Summary',
    objective: 'Objective',
    tags: ['a', 'b'],
  };

  const created = await client.createIdea(idea);
  t.same(created, idea, 'created equals input');

  const fetched = await client.getIdeaById('idea-1');
  t.same(fetched, idea, 'fetched equals input');

  const list = await client.listIdeas();
  t.same(list, [idea], 'list contains the one idea');

  const deleted = await client.deleteIdeaById('idea-1');
  t.equal(deleted, true, 'delete returns true');

  const missing = await client.getIdeaById('idea-1');
  t.equal(missing, null, 'idea no longer exists');
});

t.test('ideas client: duplicate id error', async (t) => {
  const client = await createDbClient();
  t.teardown(() => client.close());

  const idea = {
    id: 'dup', title: 't', summary: 's', objective: 'o', tags: []
  };

  await client.createIdea(idea);
  await t.rejects(() => client.createIdea(idea), { code: 'IDEA_DUPLICATE_ID' });
});

t.test('ideas client: persistence to file', async (t) => {
  const filePath = tempDbPath('persist');

  const clientA = await createDbClient({ storageFilePath: filePath });
  t.teardown(() => clientA.close());

  const idea = { id: 'p1', title: 'T', summary: 'S', objective: 'O', tags: ['x'] };
  await clientA.createIdea(idea);

  // Force persistence and close
  await clientA.persist();
  clientA.close();

  // Load fresh client from file
  const clientB = await createDbClient({ storageFilePath: filePath });
  t.teardown(() => clientB.close());

  const fetched = await clientB.getIdeaById('p1');
  t.same(fetched, idea, 'fetched persisted idea matches');
});

t.test('ideas client: iterateIdeas yields batches', async (t) => {
  const client = await createDbClient();
  t.teardown(() => client.close());

  // Insert 7 ideas
  for (let i = 1; i <= 7; i++) {
    await client.createIdea({
      id: `i${i}`,
      title: `T${i}`,
      summary: `S${i}`,
      objective: `O${i}`,
      tags: [String(i)],
    });
  }

  const allViaList = await client.listIdeas();
  t.equal(allViaList.length, 7, 'listIdeas returns all rows');

  // Collect via iterator with batchSize 3
  const collected = [];
  for await (const batch of client.iterateIdeas({ batchSize: 3 })) {
    t.ok(Array.isArray(batch), 'batch is an array');
    t.ok(batch.length > 0 && batch.length <= 3, 'batch length within bounds');
    collected.push(...batch);
  }

  t.same(collected, allViaList, 'iterateIdeas returns same order and content as listIdeas');
});