Place one or more `.json` files here to seed the database.

Supported formats per file:

- Array of strings:
  [
    "First idea",
    "Second idea"
  ]

- Array of objects:
  [
    { "content": "First idea" },
    { "content": "Second", "createdAt": "2024-01-01T00:00:00Z" }
  ]

- Object with `ideas` array:
  {
    "ideas": [
      "One",
      { "content": "Two" }
    ]
  }

Notes:
- Duplicates are skipped by exact `content` match
- `createdAt` is optional; if omitted the DB default is used