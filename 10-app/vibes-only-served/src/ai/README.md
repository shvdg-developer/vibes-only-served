# AI Client

This module defines a minimal `AiClient` interface and adapters for different AI providers.

- Interface (via JSDoc):
  - `generateIdeas({ count }) => Promise<Idea[]>`
- Dummy adapter: deterministic placeholder ideas for local development.
- Factory: `createAiClient({ provider })` selects an adapter (defaults to `dummy`), and can be wired to an env var later.

Types:
- `Idea`: `{ id, title, summary, objective, tags[] }`
- `GenerateIdeasParams`: `{ count: number }`