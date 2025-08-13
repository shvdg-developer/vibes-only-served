'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { promisify } = require('node:util');
const initSqlJs = require('sql.js');

const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const mkdirAsync = promisify(fs.mkdir);

/**
 * @typedef {Object} Idea
 * @property {string} id
 * @property {string} title
 * @property {string} summary
 * @property {string} objective
 * @property {string[]} tags
 */

/**
 * @typedef {Object} DbClientOptions
 * @property {string} [storageFilePath] Absolute or relative path to persist the database contents. If omitted, DB is in-memory only.
 * @property {boolean} [autoPersist] If true and storageFilePath is provided, persist after each write operation. Default: true when storageFilePath is set.
 */

/**
 * @typedef {Object} DbClient
 * @property {() => Promise<void>} persist Force persistence of the current DB state to disk (no-op when storageFilePath is not provided)
 * @property {(idea: Idea) => Promise<Idea>} createIdea Insert a new idea. Throws if id already exists or validation fails.
 * @property {(id: string) => Promise<Idea | null>} getIdeaById Fetch a single idea by id; returns null if not found.
 * @property {() => Promise<Idea[]>} listIdeas List all ideas.
 * @property {(id: string) => Promise<boolean>} deleteIdeaById Delete by id; returns true if a row was deleted, false otherwise.
 * @property {() => void} close Close the database instance (flushes nothing by itself; call persist() first if needed).
 * @property {(options?: { batchSize?: number }) => AsyncGenerator<Idea[], void, void>} iterateIdeas Iterate through all ideas in batches (default batch size: 100).
 */

/**
 * Initialize and return a database client backed by SQL.js (SQLite compiled to WebAssembly).
 * This embedded, file-optional DB currently manages a single `ideas` table mirroring the Idea structure.
 *
 * - Column mapping: id TEXT PRIMARY KEY, title TEXT, summary TEXT, objective TEXT, tags TEXT (JSON encoded array)
 * - If `storageFilePath` is provided and exists, it will be loaded. Otherwise, a fresh DB is created.
 * - When `autoPersist` is true and a storage path is provided, write operations will save immediately.
 *
 * @param {DbClientOptions} [options]
 * @returns {Promise<DbClient>}
 */
async function createDbClient(options = {}) {
  const storageFilePath = options.storageFilePath ? String(options.storageFilePath) : undefined;
  const autoPersist = options.autoPersist ?? Boolean(storageFilePath);

  const SQL = await initSqlJs({
    locateFile: (fileName) => require.resolve('sql.js/dist/' + fileName),
  });

  let db;

  if (storageFilePath && fs.existsSync(storageFilePath)) {
    const fileBuffer = await readFileAsync(storageFilePath);
    db = new SQL.Database(new Uint8Array(fileBuffer));
  } else {
    db = new SQL.Database();
  }

  ensureSchema(db);

  async function persist() {
    if (!storageFilePath) return; // in-memory mode

    const directoryPath = path.dirname(storageFilePath);
    if (!fs.existsSync(directoryPath)) {
      await mkdirAsync(directoryPath, { recursive: true });
    }
    const binaryArray = db.export();
    const nodeBuffer = Buffer.from(binaryArray);
    await writeFileAsync(storageFilePath, nodeBuffer);
  }

  function close() {
    if (db) {
      db.close();
    }
  }

  async function createIdea(idea) {
    validateIdeaForInsert(idea);

    const statement = db.prepare(
      'INSERT INTO ideas (id, title, summary, objective, tags) VALUES (?, ?, ?, ?, ?)'
    );

    try {
      statement.run([
        idea.id,
        idea.title,
        idea.summary,
        idea.objective,
        JSON.stringify(idea.tags ?? []),
      ]);
    } catch (error) {
      if (String(error?.message || '').includes('UNIQUE constraint failed')) {
        const duplicateError = new Error(`Idea with id '${idea.id}' already exists`);
        duplicateError.code = 'IDEA_DUPLICATE_ID';
        throw duplicateError;
      }
      throw error;
    } finally {
      statement.free();
    }

    if (autoPersist) {
      await persist();
    }

    return { ...idea, tags: [...(idea.tags ?? [])] };
  }

  async function getIdeaById(id) {
    if (!id || typeof id !== 'string') {
      throw new Error('id must be a non-empty string');
    }

    const statement = db.prepare('SELECT id, title, summary, objective, tags FROM ideas WHERE id = ?');
    try {
      const hasRow = statement.bind([id]) && statement.step();
      if (!hasRow) return null;
      const row = statement.getAsObject();
      return mapRowToIdea(row);
    } finally {
      statement.free();
    }
  }

  async function listIdeas() {
    const statement = db.prepare('SELECT id, title, summary, objective, tags FROM ideas ORDER BY rowid ASC');
    const results = [];
    try {
      while (statement.step()) {
        const row = statement.getAsObject();
        results.push(mapRowToIdea(row));
      }
    } finally {
      statement.free();
    }
    return results;
  }

  async function* iterateIdeas(options = {}) {
    const defaultBatchSize = 100;
    const batchSize = Number.isFinite(options.batchSize) && options.batchSize > 0
      ? Math.floor(options.batchSize)
      : defaultBatchSize;

    let offset = 0;
    while (true) {
      const statement = db.prepare('SELECT id, title, summary, objective, tags FROM ideas ORDER BY rowid ASC LIMIT ? OFFSET ?');
      const batch = [];
      try {
        statement.bind([batchSize, offset]);
        while (statement.step()) {
          const row = statement.getAsObject();
          batch.push(mapRowToIdea(row));
        }
      } finally {
        statement.free();
      }

      if (batch.length === 0) {
        return;
      }

      yield batch;
      offset += batch.length;
    }
  }

  async function deleteIdeaById(id) {
    if (!id || typeof id !== 'string') {
      throw new Error('id must be a non-empty string');
    }

    const statement = db.prepare('DELETE FROM ideas WHERE id = ?');
    try {
      statement.run([id]);
    } finally {
      statement.free();
    }

    if (autoPersist) {
      await persist();
    }

    const remaining = await getIdeaById(id);
    return remaining === null;
  }

  /** @type {DbClient} */
  const client = {
    persist,
    createIdea,
    getIdeaById,
    listIdeas,
    iterateIdeas,
    deleteIdeaById,
    close,
  };

  return client;
}

function ensureSchema(db) {
  db.run(
    'CREATE TABLE IF NOT EXISTS ideas (' +
      'id TEXT PRIMARY KEY NOT NULL,' +
      'title TEXT NOT NULL,' +
      'summary TEXT NOT NULL,' +
      'objective TEXT NOT NULL,' +
      'tags TEXT NOT NULL' +
    ')'
  );
}

function validateIdeaForInsert(candidate) {
  const baseMessage = 'Invalid idea: ';
  if (!candidate || typeof candidate !== 'object') {
    throw new Error(baseMessage + 'must be an object');
  }
  const { id, title, summary, objective, tags } = candidate;
  if (!id || typeof id !== 'string') throw new Error(baseMessage + 'id must be a non-empty string');
  if (!title || typeof title !== 'string') throw new Error(baseMessage + 'title must be a non-empty string');
  if (!summary || typeof summary !== 'string') throw new Error(baseMessage + 'summary must be a non-empty string');
  if (!objective || typeof objective !== 'string') throw new Error(baseMessage + 'objective must be a non-empty string');
  if (!Array.isArray(tags)) throw new Error(baseMessage + 'tags must be an array');
  for (const tag of tags) {
    if (typeof tag !== 'string') throw new Error(baseMessage + 'tags must be an array of strings');
  }
}

function mapRowToIdea(row) {
  return {
    id: String(row.id),
    title: String(row.title),
    summary: String(row.summary),
    objective: String(row.objective),
    tags: safeParseTags(row.tags),
  };
}

function safeParseTags(value) {
  if (value === null || value === undefined || value === '') return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String);
    return [];
  } catch {
    return [];
  }
}

module.exports = { createDbClient };