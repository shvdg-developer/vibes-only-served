'use strict';

const { createDummyAiClient } = require('./adapters/dummy-ai-client');

/**
 * @typedef {import('./adapters/dummy-ai-client').AiClient} AiClient
 */

/**
 * Create an AI client based on the provider name.
 * @param {Object} options
 * @param {string} [options.provider] e.g. 'dummy', 'openai', etc.
 * @returns {AiClient}
 */
function createAiClient(options = {}) {
  const provider = String(options.provider || 'dummy').toLowerCase();
  switch (provider) {
    case 'dummy':
    default:
      return createDummyAiClient();
  }
}

module.exports = { createAiClient };