# RuneEmpire Center

Web account center for the RuneEmpire Minecraft network: React frontend in `center.runeempire.net/frontend`, Laravel backend in `center.runeempire.net/backend` (which has its own `CLAUDE.md`). Talk to the user in Hungarian; code, comments and commit messages stay in English.

## Packages

Before hand-writing infrastructure, check whether a well-maintained package already solves it (HTTP client, forms and validation, server state, dates, charts, toasts, and the like). When one would make the work noticeably easier or safer, propose it and ask the user before installing: name the package, say what it replaces, and give one line on why. The user prefers established packages over raw code. The hand-rolled `fetch` wrapper that axios would have replaced is the example to avoid.

The frontend already has `axios`, `@tanstack/react-query`, `react-hook-form` + `zod`, `sonner` and shadcn/ui: reach for these first.
