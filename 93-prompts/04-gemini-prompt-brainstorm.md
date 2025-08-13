## Gemini Prompt Brainstorm

A concise reference summarizing how Gemini’s chat request fields work based on our Q&A.

### Roles in `contents`
- `role` identifies the author of a turn: `user` (you) or `model` (Gemini).
- Use it to keep multi‑turn context; order matters.
- Function/tool use:
  - The model proposes a `functionCall` (still `role: "model"`).
  - You execute it and return a `functionResponse` in your next turn (`role: "user"`).
  - There is no separate `function` role.

### `systemInstruction`
- Purpose: high‑priority rules (persona, style, format, do/don’t).
- Precedence: systemInstruction > user > model.
- Scope: counts toward tokens; one field per request/session.
- You can include multiple rules inside it via multiple `parts` or a single text block.
- Keep it concise and stable; put per‑turn details in `contents`.

### `parts` semantics
- All `parts` within one `content` (one `role`) are interpreted together as a single message.
- Text parts act like ordered concatenation; non‑text parts (images/files) are attached in place.
- Use multiple `parts` to:
  - Interleave text with images/files.
  - Separate instructions from data.
  - Carry typed parts like `functionCall` or `functionResponse`.
- Multiple `contents` = multiple turns. Prefer one `content` per turn.

Example (single turn, two text parts — effectively combined):
{
  "role": "user",
  "parts": [
    { "text": "Explain bubble sort briefly." },
    { "text": "Then give a JavaScript example." }
  ]
}

### Input size and Markdown
- You can include long text (including Markdown) in `parts.text`.
- Practical limit is the model’s context window (input + output).
- Markdown is treated as plain text; it’s not “rendered.”
- For very large inputs: chunk content, or use the Files API and reference files.

### Response shape
- Even if your request has multiple `parts`, the model returns one turn (`role: "model"`).
- That reply may contain multiple `parts` internally (or stream), but it’s still one model message.
- Tool calling may return a `functionCall` part instead of plain text.

### JSON responses
- Prefer setting JSON mode to make output reliably machine‑readable:
  - `generationConfig.responseMimeType: "application/json"`
  - Optionally add `generationConfig.responseSchema` for strict shape.
- Reinforce with a short `systemInstruction` such as “Return only valid JSON. No prose.”

Example (JSON mode, minimal schema):
{
  "systemInstruction": {
    "parts": [{ "text": "Return only valid JSON. No prose." }]
  },
  "generationConfig": {
    "responseMimeType": "application/json",
    "responseSchema": {
      "type": "object",
      "properties": {
        "title": { "type": "string" },
        "steps": { "type": "array", "items": { "type": "string" } }
      },
      "required": ["title", "steps"]
    }
  },
  "contents": [
    { "role": "user", "parts": [{ "text": "Plan a 3-day NYC trip." }] }
  ]
}

### Tool/function calling flow (shape-only sketch)
- Model turn:
  - parts: [{ functionCall: { name, args } }]
- Your turn:
  - parts: [{ functionResponse: { name, response } }]
- Then the model continues with the tool’s result in context.

### Idea generation request (JSON example)
Use this request to have Gemini generate a diverse list of one-hour app ideas that match the `Idea` structure (`id`, `title`, `summary`, `objective`, `tags`). The response is constrained to valid JSON and shaped by the schema.

Endpoint: `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent`

```json
{
  "systemInstruction": {
    "parts": [
      {
        "text": "You are an idea generator. Produce diversified, one-hour-build app ideas. Follow the rules: simple scope (1–3 features), actionable, technology-agnostic, varied categories, avoid duplicates, and clear value. Return only valid JSON. No prose."
      }
    ]
  },
  "generationConfig": {
    "responseMimeType": "application/json",
    "responseSchema": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "title": { "type": "string" },
          "summary": { "type": "string" },
          "objective": { "type": "string" },
          "tags": { "type": "array", "items": { "type": "string" } }
        },
        "required": ["id", "title", "summary", "objective", "tags"]
      }
    },
  },
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "Generate 10 diverse one-hour app ideas. Requirements: (1) simple, immediately actionable; (2) no tech stack or implementation details; (3) vary across domains (fitness, creative, business, daily life, education, etc.); (4) avoid repeating the same core pattern (e.g., trackers) more than 2–3 times; (5) each idea must include: id (kebab-case), title, summary (1 sentence), objective (2–3 sentences), tags (3–5)."
        }
      ]
    }
  ]
}
```

Tip: For a single idea, change the `responseSchema` to an `object` (instead of an array) and adjust the prompt (e.g., “Generate 1 idea…”). You can also pass a variable for the desired count and category focus.