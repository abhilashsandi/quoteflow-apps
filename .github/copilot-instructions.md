# QuoteFlow Copilot instructions

- Follow [AGENTS.md](../AGENTS.md) for Nx conventions. Read [README.md](../README.md) and [CLAUDE.md](../CLAUDE.md) for project boundaries and local workflows.
- Keep quote ownership in the rating service. The BFF forwards quote reads and writes, and the assistant knowledge database is separate from the rating service database.
- For assistant streaming changes, check event order and terminal behavior in the service, BFF SSE boundary, and client store. Cover failures with mocked Gemini, knowledge-store, and tool responses. Use fictional quote data in examples and tests.
- Run typecheck, lint, and tests through Nx for the affected projects. In the PR summary, name the checks that ran and any prerequisites that prevented a check.
