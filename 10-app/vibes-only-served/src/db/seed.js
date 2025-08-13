"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { promisify } = require("node:util");
const { createDbClient } = require("./client");

const readFileAsync = promisify(fs.readFile);
const readdirAsync = promisify(fs.readdir);
const statAsync = promisify(fs.stat);

/**
 * Load ideas from a parsed JSON value.
 * Accepted shapes:
 * - Array of idea objects
 * - Object with `ideas` property as an array
 * - Single idea object
 * Returns an array of idea-like objects as-is (validation is performed by the DB client on insert).
 *
 * @param {any} jsonValue
 * @param {string} sourceLabel
 * @returns {Array<object>}
 */
function normalizeIdeasFromJson(jsonValue, sourceLabel) {
  if (Array.isArray(jsonValue)) {
    return jsonValue;
  }
  if (jsonValue && typeof jsonValue === "object") {
    if (Array.isArray(jsonValue.ideas)) {
      return jsonValue.ideas;
    }
    // Treat as a single object idea
    return [jsonValue];
  }
  throw new Error(`Unsupported JSON structure in ${sourceLabel}. Expected an array, { ideas: [] }, or single object.`);
}

/**
 * Read all .json files in a directory (non-recursive), parse them, and collect idea objects.
 *
 * @param {string} directoryPath
 * @returns {Promise<{ files: string[], ideas: Array<object> }>} files processed and collected ideas
 */
async function readIdeasFromDirectory(directoryPath) {
  const entries = await readdirAsync(directoryPath, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".json"))
    .map((e) => path.join(directoryPath, e.name))
    .sort();

  const collected = [];
  for (const file of files) {
    const text = await readFileAsync(file, "utf8");
    let json;
    try {
      json = JSON.parse(text);
    } catch (err) {
      throw new Error(`Failed to parse JSON in ${file}: ${err?.message || String(err)}`);
    }
    const ideas = normalizeIdeasFromJson(json, file);
    collected.push(...ideas);
  }

  return { files, ideas: collected };
}

/**
 * Seed a directory of JSON files into the SQL.js database.
 *
 * @param {Object} params
 * @param {string} params.seedDir Directory containing .json files
 * @param {string} params.dbFilePath Path to SQLite database file to write to
 * @param {boolean} [params.strict=false] When true, abort on first non-duplicate error
 * @param {boolean} [params.skipDuplicates=true] When true, skip duplicate IDs instead of failing
 * @param {{ info: Function, warn: Function, error: Function }} [params.logger=console]
 * @returns {Promise<{ filesProcessed: number, ideasRead: number, inserted: number, skipped: number, errors: number }>}
 */
async function seedIdeasDirectory(params) {
  const seedDir = String(params?.seedDir || "");
  const dbFilePath = String(params?.dbFilePath || "");
  const strict = Boolean(params?.strict ?? false);
  const skipDuplicates = Boolean(params?.skipDuplicates ?? true);
  const logger = params?.logger || console;

  if (!seedDir) throw new Error("seedDir is required");
  if (!dbFilePath) throw new Error("dbFilePath is required");

  const dirStat = await statAsync(seedDir).catch(() => null);
  if (!dirStat || !dirStat.isDirectory()) {
    throw new Error(`Seed directory not found or not a directory: ${seedDir}`);
  }

  const { files, ideas } = await readIdeasFromDirectory(seedDir);

  const client = await createDbClient({ storageFilePath: dbFilePath });
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  try {
    for (const [index, idea] of ideas.entries()) {
      try {
        await client.createIdea(idea);
        inserted += 1;
      } catch (err) {
        if (err && err.code === "IDEA_DUPLICATE_ID" && skipDuplicates) {
          logger.warn(`Skipping duplicate id '${idea?.id}' (item #${index + 1})`);
          skipped += 1;
          continue;
        }
        errors += 1;
        logger.error(`Failed to insert idea at index ${index} (id='${idea?.id ?? "<missing>"}'):`);
        logger.error(err);
        if (strict) {
          throw new Error("Aborting due to strict mode and an insertion error");
        }
      }
    }

    // Ensure persisted and flushed to disk
    await client.persist();
  } finally {
    client.close();
  }

  logger.info(`Seed complete: files=${files.length} ideas_read=${ideas.length} inserted=${inserted} skipped=${skipped} errors=${errors}`);
  return { filesProcessed: files.length, ideasRead: ideas.length, inserted, skipped, errors };
}

function printUsage() {
  const usage = [
    "Usage: node src/db/seed.js --dir <seedDir> --db <dbFilePath> [--strict] [--no-skip-duplicates]",
    "",
    "Arguments:",
    "  --dir, -d                Directory containing .json files (or use SEED_DIR env)",
    "  --db, -f                 Target DB file path (or use DB_FILE_PATH env)",
    "  --strict                 Abort on first non-duplicate error (default: false)",
    "  --no-skip-duplicates     Fail on duplicate IDs instead of skipping (default: skip)",
    "",
    "JSON shapes supported per file:",
    "  - [ { id, title, summary, objective, tags: [] }, ... ]",
    "  - { ideas: [ ... ] }",
    "  - { id, title, summary, objective, tags: [] }",
  ].join("\n");
  console.error(usage);
}

function parseArgs(argv) {
  const out = { dir: process.env.SEED_DIR, db: process.env.DB_FILE_PATH, strict: false, skipDuplicates: true };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--strict") {
      out.strict = true;
      continue;
    }
    if (arg === "--no-skip-duplicates") {
      out.skipDuplicates = false;
      continue;
    }
    if (arg === "--dir" || arg === "-d") {
      out.dir = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--dir=")) {
      out.dir = arg.slice("--dir=".length);
      continue;
    }
    if (arg === "--db" || arg === "-f") {
      out.db = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--db=")) {
      out.db = arg.slice("--db=".length);
      continue;
    }
    // Unknown args are ignored to keep CLI simple
  }
  return out;
}

if (require.main === module) {
  (async () => {
    const { dir, db, strict, skipDuplicates } = parseArgs(process.argv);
    if (!dir || !db) {
      printUsage();
      process.exit(2);
      return;
    }
    try {
      const result = await seedIdeasDirectory({ seedDir: dir, dbFilePath: db, strict, skipDuplicates, logger: console });
      // Exit non-zero if strict and any errors
      if (strict && result.errors > 0) {
        process.exit(1);
      }
    } catch (err) {
      console.error(String(err?.message || err));
      process.exit(1);
    }
  })();
}

module.exports = { seedIdeasDirectory };