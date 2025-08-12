## Gemini Proxy API — Vibes Only Served

A lightweight Node.js REST service that proxies requests from your frontend to Google Gemini, returning a minimal, easy-to-consume JSON response. Configuration is environment-driven and safe for deployment.

### Goals
- **Simple prompt-in → answer-out** JSON API
- **Environment-based configuration** (.env, not committed)
- **Minimal response shape** with optional metadata and raw payload
- **Extensible**: add parameters (temperature, max tokens, etc.) without breaking clients
- **Use classes** in JavaScript for clarity and testability

### Non-goals
- Building a full prompt management system
- Long-running sessions or chat history storage
- Multi-tenant auth (optional add-on)

### High-level Architecture
- Frontend → This service (REST) → Google Gemini API
- Service manages:
  - Request shaping (prompt → Gemini request)
  - Config (model, temperature, limits)
  - Error normalization
  - Optional logging/metrics and rate limiting

### Environment Variables (.env)
- `GEMINI_API_KEY` (required)
- `GEMINI_MODEL` (default: `gemini-2.0-flash`)
- `GEMINI_TEMPERATURE` (default: `0.7`)
- `GEMINI_TOP_P` (default: `0.95`)
- `GEMINI_TOP_K` (default: `40`)
- `GEMINI_MAX_OUTPUT_TOKENS` (default: `512`)
- `PORT` (default: `3000`)
- `LOG_LEVEL` (default: `info`)
- `ALLOW_ORIGINS` (CSV, default: `*`)
- `REQUEST_TIMEOUT_MS` (default: `30000`)

Note: Ensure `.env` is ignored by git. Provide `.env.example` with placeholders.

### API
#### POST `/v1/prompt`
- **Purpose**: Submit a single-shot prompt and receive a minimal answer.
- **Request Body**

Either `prompt` or `contents` must be provided (mutually exclusive). Optional overrides fall back to `.env` defaults.

- Simple shape (recommended for text-only prompts):
```json
{
  "prompt": "Explain how AI works in a few words",
  "model": "gemini-2.0-flash",
  "generationConfig": {
    "temperature": 0.7,
    "topP": 0.95,
    "topK": 40,
    "maxOutputTokens": 128
  },
  "system": "You are concise and direct.",
  "safetySettings": [
    { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE" }
  ],
  "responseMimeType": "text/plain",
  "responseSchema": null,
  "include": { "meta": true, "raw": false }
}
```

- Advanced shape (pass-through of Gemini `contents` structure):
```json
{
  "contents": [
    {
      "role": "user",
      "parts": [ { "text": "Explain how AI works in a few words" } ]
    }
  ],
  "model": "gemini-2.0-flash",
  "generationConfig": {
    "temperature": 0.7,
    "topP": 0.95,
    "topK": 40,
    "maxOutputTokens": 128
  },
  "system": { "text": "You are concise and direct." },
  "safetySettings": [
    { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE" }
  ],
  "responseMimeType": "application/json",
  "responseSchema": { "type": "object", "properties": { "summary": { "type": "string" } }, "required": ["summary"] },
  "include": { "meta": true, "raw": false }
}
```

- **Success Response (minimal)**
```json
{
  "answer": "AI learns patterns from data to make predictions or decisions.",
  "meta": {
    "model": "gemini-2.0-flash",
    "finishReason": "STOP",
    "tokens": { "prompt": 8, "completion": 12, "total": 20 },
    "responseId": "TXmbaOOMO9nN1PIPiMWK0Ao"
  }
}
```
- If `include.raw` is true, add `raw` with the unmodified Gemini response.

- **Error Response**
```json
{
  "error": { "code": "BAD_REQUEST", "message": "'prompt' or 'contents' is required", "details": null }
}
```

### Core Types (JS)
- `Config` — reads `.env`, exposes defaults and validation
- `GeminiClient` — encapsulates Google SDK calls and request shaping
- `PromptRequest` — input DTO with safe parsing/validation
- `PromptResponse` — output DTO that flattens Gemini candidates to `answer` and optional `meta`/`raw`

### Behavior and Rules
- If `prompt` provided, convert to `contents: [{ role: "user", parts: [{ text: prompt }] }]`
- If `system` is a string, pass as `systemInstruction: { role: "system", parts: [{ text: system }] }`. If object, pass through.
- Respect `safetySettings` and `generationConfig` as-is when provided.
- Use `responseMimeType` and `responseSchema` to request JSON mode when provided.
- Use the first candidate part with role `model` and first `parts[].text` as `answer`
- If multiple parts exist, join with `\n\n`
- If Gemini returns empty or safety-blocked content, map to:
```json
{ "error": { "code": "CONTENT_BLOCKED", "message": "Response blocked by safety settings", "details": {"finishReason": "SAFETY"} } }
```
- Normalize all non-2xx responses into the unified error shape

### Upstream call (SDK example)
```javascript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: modelName, systemInstruction });

const result = await model.generateContent({
  contents,
  generationConfig,
  safetySettings,
  responseMimeType,
  responseSchema
});

const { candidates, usageMetadata, modelVersion } = result.response;
```

### Security
- CORS allowlist via `ALLOW_ORIGINS`
- Optional API key for this service:
  - Env: `SERVICE_API_KEY`
  - Clients send header: `x-api-key: <SERVICE_API_KEY>`
  - If set, requests without a match return 401

### Observability
- Structured logs (JSON) at `info` and `error`
- Include `requestId` (header `x-request-id` or generated UUID)
- Log timing and token usage when available

### Rate Limiting (optional)
- IP-based fixed window (e.g., 60 req/min) or token bucket
- Return 429 with `Retry-After` seconds

### Example cURL
```bash
curl -X POST http://localhost:3000/v1/prompt \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain how AI works in a few words"
  }'
```

### Implementation Notes
- Use the official Google Gemini SDK per the quickstart
- Keep transport swaps easy (fetch/axios) by isolating in `GeminiClient`
- Validate inputs with a small schema (e.g., Zod or custom)
- Time out upstream calls using `REQUEST_TIMEOUT_MS`

### Minimal Folder Sketch
```
10-app/
  app.js                # Express app wiring
  package.json
95-designs/
  02-gemini-proxy-api-spec.md
```

### Test Cases
- Returns `answer` for a normal prompt
- Honors per-request `generationConfig`
- Honors `.env` defaults when fields omitted
- Returns unified error for validation errors
- Returns `CONTENT_BLOCKED` when Gemini safety blocks
- Returns 401 when `SERVICE_API_KEY` is set and missing/mismatch

### Reference
- Google Gemini Quickstart (JS): `https://ai.google.dev/gemini-api/docs/quickstart?lang=javascript`
- https://ai.google.dev/api/generate-content#text_gen_text_only_prompt-JAVASCRIPT