# AI Client

This module defines a minimal `AiClient` interface and adapters for different AI providers.

- Interface (via JSDoc):
  - `generateIdeas({ count }) => Promise<Idea[]>`
- Dummy adapter: deterministic placeholder ideas for local development.
- Factory: `getDefaultAiClient()` returns the dummy client for now; can be extended to select based on environment.

Types:
- `Idea`: `{ id, title, summary, objective, tags[] }`
- `GenerateIdeasParams`: `{ count: number }`