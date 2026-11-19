<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Agent Skills (OpenCode)

This project installs Addy Osmani's engineering skills in `.opencode/skills/` (26 skills) with shared checklists in
`.opencode/references/` and lifecycle slash commands in `.opencode/commands/`.

## Core Rules

- If a task matches a skill, load it with the `skill` tool before acting. Skills live at
  `.opencode/skills/<skill-id>/SKILL.md`.
- Follow the workflow in the skill; do not partially apply it. Never skip spec, plan, or test steps the skill requires.
- Shared checklists are referenced from skills as `../../references/<file>.md`, which resolves to
  `.opencode/references/<file>.md`.

## Intent → Skill Mapping

- New feature or significant change → `spec-driven-development`, then `planning-and-task-breakdown`
- Implementation → `incremental-implementation` + `test-driven-development`
- Bug, failing build, unexpected behavior → `debugging-and-error-recovery`
- UI/pages/components, responsive layout, state → `frontend-ui-engineering`
- Reviews before merge → `code-review-and-quality`, plus `security-and-hardening` and `performance-optimization`
- Accessibility audit → `accessibility-engineering`
- Refactor for clarity → `code-simplification`
- API routes, server actions, shared types → `api-and-interface-design`
- Firestore rules, auth, secrets, untrusted input → `security-and-hardening`
- Core Web Vitals / bundle size → `performance-optimization`
- Commits, branches, PRs → `git-workflow-and-versioning`
- Docs, ADRs → `documentation-and-adrs`
- Logging, metrics, alerts → `observability-and-instrumentation`
- Launch or rollout → `shipping-and-launch`, `ci-cd-and-automation`

Slash commands: `/spec`, `/plan`, `/build`, `/test`, `/constraints`, `/review`, `/webperf`, `/a11y`, `/code-simplify`,
`/ship`.

## Project Constraints

- Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Firebase / Firestore (`src/lib`, `firestore.rules`),
  `react-hook-form` + `zod`, Framer Motion, deployed on Vercel.
- Verification today: `npm run lint`, `npm run typecheck`, `npm run test` (Vitest, tests colocated as `*.test.ts(x)`),
  `npm run build`, and `npm run e2e` (Playwright + axe-core; the dev server on port 3100 starts automatically).
- The Chrome DevTools MCP server is configured project-locally in `.opencode/opencode.json` for real-browser debugging.
- Read the Next.js docs in `node_modules/next/dist/docs/` before changing routes, data fetching, or config, per the
  Next.js rule block above.

## Execution Model

1. Decide whether a skill applies (even a small chance).
2. Load it with `skill({ id: "<skill-id>" })`.
3. Follow its workflow exactly, gathering the evidence it requires.
4. Only then implement.
