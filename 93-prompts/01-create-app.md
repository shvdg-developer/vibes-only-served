Using the app concept in `95-designs/01-app-concept.md` as the single source of truth, generate a production-ready Node.js Express Gemini proxy service under `10-app/` that fully implements the spec.

Deliver:
- Full implementation faithful to the spec (routes, classes, config, SDK usage).
- Complete file set: `app.js`, modules, `package.json`, `.env.example`, tests, `README.md`, minimal `Dockerfile`.
- NPM scripts: `dev`, `start`, `test`, plus example cURL(s) in the README.

Output (exactly):
1) File tree
2) Full contents of each file in separate fenced code blocks with correct language tags
3) Only minimal notes where strictly necessary

Constraints:
- Do not restate or reinterpret the spec—implement it.
- Favor clear, modern, testable code with minimal dependencies.
- Must run locally with `npm install && npm start`.

