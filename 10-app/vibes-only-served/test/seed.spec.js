'use strict';

const t = require('tap');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { seedIdeasDirectory } = require('../src/db/seed');
const { createDbClient } = require('../src/db/client');

function tempDir(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  return dir;
}

function tempDbPath(testName) {
  const file = path.join(__dirname, `.tmp-seed-${testName}.sqlite`);
  try { fs.unlinkSync(file); } catch {}
  return file;
}

t.test('seed: loads multiple files and skips duplicates', async (t) => {
  const dir = tempDir('vibes-seed-');
  t.teardown(() => fs.rmSync(dir, { recursive: true, force: true }));

  // Write two files: one array, one object with ideas property
  const fileA = path.join(dir, 'a.json');
  const fileB = path.join(dir, 'b.json');

  fs.writeFileSync(fileA, JSON.stringify([
    { id: 'i-1', title: 'A', summary: 'sa', objective: 'oa', tags: ['x'] },
    { id: 'i-2', title: 'B', summary: 'sb', objective: 'ob', tags: [] },
  ], null, 2));

  fs.writeFileSync(fileB, JSON.stringify({ ideas: [
    { id: 'i-2', title: 'Dup B', summary: 'sb2', objective: 'ob2', tags: [] },
    { id: 'i-3', title: 'C', summary: 'sc', objective: 'oc', tags: ['y'] },
  ] }, null, 2));

  const dbPath = tempDbPath('basic');

  const result = await seedIdeasDirectory({ seedDir: dir, dbFilePath: dbPath, strict: false, skipDuplicates: true, logger: { info() {}, warn() {}, error() {} } });
  t.same(result.filesProcessed, 2, 'processed two files');
  t.same(result.ideasRead, 4, 'read four items');
  t.same(result.inserted, 3, 'inserted three (one duplicate)');
  t.same(result.skipped, 1, 'skipped one duplicate');

  // Verify persisted content
  const client = await createDbClient({ storageFilePath: dbPath });
  t.teardown(() => client.close());

  const list = await client.listIdeas();
  t.equal(list.length, 3);
  const ids = list.map((i) => i.id).sort();
  t.same(ids, ['i-1', 'i-2', 'i-3']);
});