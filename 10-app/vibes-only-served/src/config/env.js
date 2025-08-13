function loadEnvConfig() {
  const port = Number(process.env.PORT) || 3000;
  const appVersion = process.env.APP_VERSION || 'v0.1.0';
  const gitCommit = process.env.GIT_COMMIT || 'local';
  const aiProvider = (process.env.AI_PROVIDER || 'dummy').toLowerCase();
  return { port, appVersion, gitCommit, aiProvider };
}

module.exports = { loadEnvConfig };


