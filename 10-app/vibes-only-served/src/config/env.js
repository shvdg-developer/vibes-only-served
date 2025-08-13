function loadEnvConfig() {
  const port = Number(process.env.PORT) || 3000;
  const appVersion = process.env.APP_VERSION || 'v0.1.0';
  const gitCommit = process.env.GIT_COMMIT || 'local';
  const aiProvider = (process.env.AI_PROVIDER || 'dummy').toLowerCase();
  const dbFilePath = process.env.DB_FILE_PATH || undefined; // optional persistent DB path for runtime
  const seedDir = process.env.SEED_DIR || undefined; // optional seed dir for CLI convenience
  return { port, appVersion, gitCommit, aiProvider, dbFilePath, seedDir };
}

module.exports = { loadEnvConfig };


