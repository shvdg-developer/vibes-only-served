"use strict";

/**
 * @typedef {Object} Idea
 * @property {string} id
 * @property {string} title
 * @property {string} summary
 * @property {string} objective
 * @property {string[]} tags
 */

/**
 * @typedef {Object} GenerateIdeasParams
 * @property {number} count Number of ideas to generate
 */

/**
 * @typedef {Object} AiClient
 * @property {(params: GenerateIdeasParams) => Promise<Idea[]>} generateIdeas
 */

/**
 * Creates a dummy AI client that returns placeholder ideas.
 * @returns {AiClient}
 */
function createDummyAiClient() {
  return {
    /**
     * @param {GenerateIdeasParams} params
     * @returns {Promise<Idea[]>}
     */
    async generateIdeas(params) {
      const count = Number(params?.count ?? 1);
      const ideas = Array.from({ length: count }, (_, index) => ({
        id: `idea-${index + 1}`,
        title: "Dummy Idea",
        summary: "A placeholder idea for development and testing.",
        objective: "Demonstrate the API contract for idea generation.",
        tags: ["ideation", "dummy", "v0"],
      }));
      return ideas;
    },
  };
}

module.exports = { createDummyAiClient };