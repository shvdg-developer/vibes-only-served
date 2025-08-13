'use strict';

const { createDummyAiClient } = require('./adapters/dummy-ai-client');

/**
 * Returns the default AI client. For now always dummy.
 */
function getDefaultAiClient() {
  // In the future, inspect env/config to choose provider
  return createDummyAiClient();
}

module.exports = { getDefaultAiClient };