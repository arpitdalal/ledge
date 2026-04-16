## Code Review: Uncommitted recurring feature changes

### Critical Issues

| #   | File                              | Line | Issue                                                                                                                                                                                               | Severity |
| --- | --------------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | `lib/domain/recurring/service.ts` | 217  | `skipRecurringOccurrence` / `unskipRecurringOccurrence` trust `scheduledDateInput` raw. Invalid/tampered date keys can throw Prisma runtime errors (500) instead of validation errors.              | 🟠 High  |
| 2   | `lib/domain/recurring/service.ts` | 198  | `setRecurringRuleStatus` has no runtime schema guard; non-enum status can be persisted if action args are forged, causing rules to silently drop from upcoming projections (`status !== "ACTIVE"`). | 🟠 High  |

### Suggestions

| #   | File                                          | Line | Suggestion                                                                                                                                                                                                                | Category        |
| --- | --------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| 1   | `lib/domain/recurring/service.ts`             | 295  | `horizonEnd = addDays(horizonStart, horizonDays)` + inclusive compare returns 31 days for "next 30 days". Use `horizonDays - 1` or exclusive upper-bound.                                                                 | Correctness     |
| 2   | `lib/domain/recurring/service.ts`             | 297  | `include: { occurrences: true }` loads all historical exceptions for each active rule on dashboard/transactions/recurring page. Can grow unbounded. Filter exceptions to horizon or compute next slots in DB/paged fetch. | Performance     |
| 3   | `tests/integration/recurring-service.test.ts` | 57   | `beforeEach(seedBase)` + extra `seedBase()` inside tests duplicates setup and can mask data assumptions; keep one setup path.                                                                                             | Maintainability |
| 4   | `tests/e2e/recurring.spec.ts`                 | 28   | `locator("ul li")` is broad and flaky; scope preview selector with test id/role to avoid unrelated list matches.                                                                                                          | Maintainability |

### Summary

Feature scope solid: recurring schema, recurrence engine, UI routes, actions, and tests are coherent. Main blockers are missing runtime validation on server write paths and one horizon boundary bug.

### What Looks Good

- Recurrence math handles monthly clamp and leap-year edge cases well; unit tests cover these.
- Category/type consistency check in create/update prevents cross-type rule corruption.
- FK design (`onDelete: Restrict` for category links) protects referential integrity.
- Dashboard/transactions clearly separate posted history vs projected recurring cash flow.

### Verdict

**Request Changes**

- Fix 2 high-risk validation issues first.
- Then fix horizon off-by-one.
- Perf suggestion can be follow-up if data size still small.

Verification note: I attempted targeted recurring tests, but test DB reset command is blocked by Prisma safety consent guard in this environment, so runtime verification is incomplete.
