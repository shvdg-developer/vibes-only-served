const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

function ensureIdeasTableExists(db) {
  db.exec("CREATE TABLE IF NOT EXISTS ideas (\n    id INTEGER PRIMARY KEY AUTOINCREMENT,\n    content TEXT NOT NULL,\n    created_at TEXT NOT NULL DEFAULT (datetime('now'))\n  )");
}

function readJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function normalizeIdea(item) {
  if (typeof item === 'string') {
    const trimmed = item.trim();
    return trimmed ? { content: trimmed } : null;
  }
  if (item && typeof item === 'object') {
    const content = typeof item.content === 'string' ? item.content.trim() : '';
    if (!content) return null;
    const createdAt = typeof item.createdAt === 'string' ? item.createdAt : undefined;
    return createdAt ? { content, createdAt } : { content };
  }
  return null;
}

function extractIdeasFromJson(json) {
  const items = [];
  if (Array.isArray(json)) {
    for (const item of json) {
      const normalized = normalizeIdea(item);
      if (normalized) items.push(normalized);
    }
  } else if (json && typeof json === 'object') {
    if (Array.isArray(json.ideas)) {
      for (const item of json.ideas) {
        const normalized = normalizeIdea(item);
        if (normalized) items.push(normalized);
      }
    } else if (json.idea) {
      const normalized = normalizeIdea(json.idea);
      if (normalized) items.push(normalized);
    }
  }
  return items;
}

function collectIdeasFromDirectory(seedsDir) {
  const entries = fs.readdirSync(seedsDir, { withFileTypes: true });
  const ideas = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith('.json')) continue;
    const filePath = path.join(seedsDir, entry.name);
    try {
      const json = readJsonFile(filePath);
      const extracted = extractIdeasFromJson(json);
      for (const idea of extracted) ideas.push(idea);
    } catch (err) {
      // skip invalid JSON files
    }
  }
  return ideas;
}

function seedIdeas(dbPath, seedsDir, options = {}) {
  const resolvedDbPath = dbPath || path.join(__dirname, '..', '..', 'data', 'app.db');
  const resolvedSeedsDir = seedsDir || path.join(__dirname, '..', '..', 'seeds');
  const clearFirst = Boolean(options.clear);
  const dryRun = Boolean(options.dryRun);

  if (!fs.existsSync(resolvedSeedsDir) || !fs.statSync(resolvedSeedsDir).isDirectory()) {
    throw new Error(`Seeds directory not found: ${resolvedSeedsDir}`);
  }

  const db = new Database(resolvedDbPath);
  try {
    ensureIdeasTableExists(db);

    const ideas = collectIdeasFromDirectory(resolvedSeedsDir);

    const uniqueContents = new Set();
    const deduped = [];
    for (const idea of ideas) {
      if (!uniqueContents.has(idea.content)) {
        uniqueContents.add(idea.content);
        deduped.push(idea);
      }
    }

    const result = { totalFiles: 0, totalRead: ideas.length, totalDeduped: deduped.length, inserted: 0, skippedExisting: 0, cleared: false };
    try {
      result.totalFiles = fs.readdirSync(resolvedSeedsDir).filter(f => f.endsWith('.json')).length;
    } catch (_) {}

    if (clearFirst && !dryRun) {
      db.exec('DELETE FROM ideas');
      result.cleared = true;
    }

    // Build a Set of existing contents to avoid duplicates
    const existing = new Set();
    const rows = db.prepare('SELECT content FROM ideas').all();
    for (const r of rows) existing.add(r.content);

    if (dryRun) {
      for (const idea of deduped) {
        if (existing.has(idea.content)) result.skippedExisting += 1;
        else result.inserted += 1;
      }
      return result;
    }

    const insertWithCreated = db.prepare('INSERT INTO ideas (content, created_at) VALUES (?, ?)');
    const insertDefault = db.prepare('INSERT INTO ideas (content) VALUES (?)');

    const run = db.transaction((items) => {
      for (const idea of items) {
        if (existing.has(idea.content)) {
          result.skippedExisting += 1;
          continue;
        }
        if (idea.createdAt) insertWithCreated.run(idea.content, idea.createdAt);
        else insertDefault.run(idea.content);
        result.inserted += 1;
        existing.add(idea.content);
      }
    });

    run(deduped);

    return result;
  } finally {
    try { db.close(); } catch (_) {}
  }
}

module.exports = { seedIdeas, collectIdeasFromDirectory, extractIdeasFromJson, normalizeIdea, ensureIdeasTableExists };