#!/usr/bin/env node
const path = require('path');
const { seedIdeas } = require('../lib/seed');

function parseArgs(argv) {
  const args = { dir: undefined, db: process.env.DB_PATH, clear: false, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dir' || a === '-d') {
      args.dir = argv[i + 1];
      i += 1;
    } else if (a === '--db' || a === '-b') {
      args.db = argv[i + 1];
      i += 1;
    } else if (a === '--clear') {
      args.clear = true;
    } else if (a === '--dry-run' || a === '--dry') {
      args.dryRun = true;
    } else if (!a.startsWith('-') && !args.dir) {
      args.dir = a;
    }
  }
  return args;
}

function formatResult(res) {
  return [
    `files=${res.totalFiles}`,
    `read=${res.totalRead}`,
    `deduped=${res.totalDeduped}`,
    `inserted=${res.inserted}`,
    `skipped=${res.skippedExisting}`,
    res.cleared ? 'cleared=true' : undefined,
  ].filter(Boolean).join(' ');
}

function main() {
  const argv = process.argv.slice(2);
  const opts = parseArgs(argv);

  const dbPath = opts.db;
  const seedsDir = opts.dir ? path.resolve(process.cwd(), opts.dir) : undefined;

  try {
    const result = seedIdeas(dbPath, seedsDir, { clear: opts.clear, dryRun: opts.dryRun });
    console.log(formatResult(result));
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {};