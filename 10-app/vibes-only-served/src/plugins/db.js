const fp = require('fastify-plugin');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

async function dbPlugin(fastify) {
  const defaultDbPath = path.join(__dirname, '..', '..', 'data', 'app.db');
  const dbPath = process.env.DB_PATH || defaultDbPath;

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec("CREATE TABLE IF NOT EXISTS ideas (\n    id INTEGER PRIMARY KEY AUTOINCREMENT,\n    content TEXT NOT NULL,\n    created_at TEXT NOT NULL DEFAULT (datetime('now'))\n  )");

  fastify.decorate('db', db);

  fastify.addHook('onClose', (instance, done) => {
    try { db.close(); } catch (_) {}
    done();
  });
}

module.exports = fp(dbPlugin);