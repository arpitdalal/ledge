# AGENTS.md

## Goal

Implement features with minimal, production-quality diffs that match this repo’s architecture, design system, and test patterns.

## Before coding

- Read README, package.json, Prisma schema, relevant routes, shared components, validation, and existing tests.
- Reuse existing patterns before introducing new abstractions.
- Prefer the smallest coherent change that fully solves the task.

## Next.js / architecture

- Follow App Router conventions and existing route structure.
- Default to server components. Use client components only when interactivity requires them.
- Keep domain logic out of page components.
- Keep recurrence/date/business logic in reusable domain modules.
- Choose server actions vs route handlers consistently with existing repo patterns.
- Avoid hydration-risky patterns and unnecessary client-side state.

## React / performance

- Avoid data waterfalls; parallelize independent work where possible.
- Avoid unnecessary rerenders and avoid storing derived state when it can be computed.
- Keep client payloads small and avoid passing more data than needed to client components.
- Reuse existing data-fetching and mutation patterns.

## UI / shadcn

- Reuse existing components and variants before creating new UI primitives.
- Use semantic design tokens and existing spacing/typography patterns.
- Use `gap-*` for layout instead of `space-*`.
- Forms must have clear labels, helper text, inline validation, and accessible keyboard/focus behavior.
- Use existing badge/card/table/dialog/form patterns where possible.

## Feature-specific quality bar

- Recurring rules must support create, edit, pause, resume, delete.
- Users must be able to preview the next few generated occurrences before save.
- Upcoming recurring items must be visually distinct from posted/manual transactions.
- Historical reports must not accidentally treat future upcoming items as posted transactions.
- One-off skip/edit behavior must not corrupt the full recurring series.

## Testing

- Add or update unit tests for recurrence generation, boundaries, and edge cases.
- Add or update integration tests for persistence and aggregation behavior.
- Add at least one end-to-end flow covering create → preview → save → verify dashboard/list behavior.
- Prefer real behavior over excessive mocking.

## Verification before completion

Do not claim the feature is complete unless you have freshly run the relevant verification commands and checked the output.

Minimum verification:

- typecheck
- lint
- unit/integration tests
- e2e tests relevant to the feature
- build

If any verification fails, report the exact status and do not claim success.
