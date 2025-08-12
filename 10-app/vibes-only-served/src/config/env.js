function loadEnvConfig() {
  const port = Number(process.env.PORT) || 3000;
  const appVersion = process.env.APP_VERSION || 'v0.1.0';
  const gitCommit = process.env.GIT_COMMIT || 'local';
  return { port, appVersion, gitCommit };
}

module.exports = { loadEnvConfig };


