## Code Review: Uncommitted recurring-rules changes

### Summary

Feature is strong overall: coherent schema/domain/UI split, good recurrence math, broad test coverage. Blocking risks remain in authorization/runtime-validation and one scaling hotspot.

### Suggestions

| #   | File                                     |     Line | Suggestion                                                                                                                                                                    | Category        |
| --- | ---------------------------------------- | -------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| 1   | `lib/domain/recurring/service.ts`        |      309 | `getUpcomingCashFlow()` loads `occurrences` unfiltered for every active rule. Add window/status filter (horizon-only) to avoid unbounded memory/query cost as overrides grow. | Performance     |
| 2   | `lib/domain/recurring/service.ts`        |      333 | N+1 query in loop: per-item `prisma.category.findUnique(...)`. Preload override categories in one query/map.                                                                  | Performance     |
| 3   | `lib/domain/recurring/service.ts`        | 186, 219 | `scheduledIso` is not validated as canonical occurrence for rule. Add server-side check to prevent orphan/dead overrides.                                                     | Correctness     |
| 4   | `components/recurring/upcoming-list.tsx` |      148 | Use `Link` instead of raw `<a>` for internal nav consistency and client-side routing.                                                                                         | Maintainability |
| 5   | `next-env.d.ts`, `tsconfig.tsbuildinfo`  |        - | Build artifacts changed; keep generated noise out commit if unintended.                                                                                                       | Maintainability |

### What Looks Good

- `recurrence` engine is clean, deterministic, and tested for month-end/leap-year edge cases.
- Validation tightened with real calendar-date checks in `lib/validation/recurring.ts`.
- Skip/edit/pause flows are covered in integration + e2e, not just unit tests.
- UI clearly separates posted transactions from upcoming recurring items.

### Verdict

**Request Changes** (fix auth/runtime validation first; then address upcoming-flow scaling path).
