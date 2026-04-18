# Recurring Transactions

Extend the existing architecture and conventions instead of reinventing them.

## High-level goal

Users should be able to create recurring income/expense rules and see upcoming generated cash flow in the app.

This feature should clearly demonstrate quality differences in:

- data modeling
- domain logic
- API / mutation design
- validation
- test quality
- UX quality
- visual polish
- accessibility
- edge-case handling

## Inspect and align

Before changing code:

1. Read the README, package.json, Prisma schema, app routes, tests, and shared UI/form patterns.
2. Identify:
   - how mutations are currently handled
   - where validation schemas live
   - where domain logic lives
   - how charts / dashboard summaries are computed
   - how tests are organized
   - existing UI primitives and layout patterns
3. Follow those patterns unless there is a strong reason not to.

## Feature requirements

Implement a new recurring transactions system with these capabilities:

### A. Recurring rules

Users can create, edit, pause, resume, and delete recurring transaction rules.

Each recurring rule must include:

- name / payee
- type: income or expense
- amount
- category
- note (optional)
- payment method (optional, if the repo already supports it for normal transactions)
- frequency:
  - weekly
  - biweekly
  - monthly
  - yearly
- start date
- end date (optional)
- status:
  - active
  - paused
  - ended

Do not implement arbitrary cron-like recurrence.

### B. Generated upcoming transactions

The app should materialize upcoming occurrences from recurring rules into transactions or transaction-like rows in a clean, future-proof way.

Use a design that works well with the existing transaction list, dashboard, and reports.

Requirements:

- generated upcoming entries must be distinguishable from manually created transactions
- upcoming recurring entries should appear in relevant views
- users should be able to skip one occurrence
- users should be able to edit one occurrence without corrupting the entire series
- future occurrences should continue correctly after a one-off edit

### C. Dashboard upcoming cash flow

Add an upcoming cash flow section to the dashboard.

Include at least:

- upcoming income total
- upcoming expense total
- upcoming net cash flow
- upcoming transactions list for a near horizon, such as next 30 days
- clear visual distinction between upcoming vs posted/manual items

If the existing dashboard has a consistent card/section pattern, reuse it.

### D. Recurring management page

Add a dedicated recurring page, likely `/recurring` unless the repo structure suggests a better route.

This page should include:

- list of recurring rules
- amount
- frequency
- next occurrence
- status badge
- quick actions:
  - edit
  - pause/resume
  - delete

### E. Create/edit recurring form

Add a create/edit form for recurring rules.

The form must:

- match the app’s existing form styling and validation patterns
- provide inline validation errors
- include clear helper text
- have good empty/default states
- show a preview of the next few generated occurrences before save

Preview should show at least the next 3–6 occurrences.

## Domain and data modeling requirements

Choose a data model that is robust and extensible.

Principles:

- do not shove recurrence logic inside page components
- do not make recurring entries purely visual if that creates downstream hacks
- use a clean schema that can support:
  - future reporting
  - skipping occurrences
  - editing one occurrence
  - preserving history
- design carefully for future maintainability

A good solution will likely require a Prisma schema change and migration.

You may introduce one or more new models such as:

- RecurringRule
- Recurring occurrence metadata / exception model
- additions to Transaction

But choose the minimal sound design that fits the existing schema and avoids future pain.

Important behavior decisions:

- pausing a rule stops future generation
- deleting a recurring rule should preserve past posted/generated transaction history if that fits the repo’s patterns
- skipping one occurrence should not delete the entire rule
- editing one occurrence should only affect that occurrence unless the UI explicitly supports “edit series” later
- this feature only needs “edit this occurrence” and “edit the rule”, not advanced calendar semantics

## Generation strategy

Do not require cron jobs, workers, or external schedulers.

Implement a local-app-friendly generation strategy, for example:

- generate within a rolling horizon such as next 60–90 days
- refresh generation when needed through app/service logic

This repo must remain easy for workshop participants to run locally.

## UX requirements

This is important. The feature should not just work — it should feel thoughtful.

Must include:

- mobile + desktop responsiveness
- visible focus states
- keyboard-usable controls
- semantic buttons/forms
- clear badges/states for recurring/upcoming/skipped if applicable
- polished empty states
- polished helper text
- clean spacing and hierarchy
- no cluttered UI

The steered version should clearly beat a naive implementation on UX quality.

Specific UX expectations:

- recurring rule list is easy to scan
- form is not overwhelming
- preview is obvious and useful
- dashboard upcoming section is clearly separated from posted/current summaries
- users can tell what will happen before they save a recurring rule

## Validation requirements

Add robust validation.

Examples:

- amount must be > 0
- category required
- type required
- frequency required
- start date required
- end date cannot be before start date
- monthly/yearly edge cases should be handled gracefully
- invalid dates should not silently break generation

Use the repo’s existing validation approach.

## Edge cases to handle

Handle these thoughtfully:

- monthly recurrence starting on the 29th, 30th, or 31st
- leap year behavior
- end date truncation
- paused rules
- edited one-off occurrence
- skipped occurrence
- empty recurring state
- no upcoming items
- dashboard with both posted and upcoming items
- deleting categories referenced by recurring rules, if relevant

## Reports / transactions integration

Integrate carefully with existing views.

At minimum:

- transactions list should show generated/upcoming recurring items in a sane way
- reports should not accidentally treat future upcoming items as posted historical cash flow unless intentionally designed that way
- preserve semantic distinction between posted history and future upcoming items

If needed:

- only posted transactions affect historical monthly summaries
- upcoming transactions affect upcoming cash flow surfaces, not historical reports

Be deliberate and consistent.

## Testing requirements

This feature must include meaningful tests.
Do not stop at happy-path unit tests only.

Add or update:

### Unit tests

Cover recurrence logic thoroughly:

- weekly
- biweekly
- monthly
- yearly
- start/end boundaries
- monthly edge cases
- leap year handling
- paused rules
- preview generation
- skip behavior
- single-occurrence edit behavior where applicable

### Integration tests

Cover:

- create recurring rule
- update recurring rule
- pause/resume
- delete rule
- generation visibility in app/service layer
- upcoming cash flow aggregation

### E2E tests

Add at least one realistic end-to-end flow:

1. create a recurring expense
2. preview occurrences
3. save it
4. verify recurring rule appears
5. verify upcoming cash flow updates on dashboard
6. verify upcoming item appears in the relevant list
7. pause or skip one occurrence and verify behavior

Tests should be stable and aligned with existing repo test patterns.

## Non-goals

Do NOT implement:

- notifications
- email reminders
- external calendar sync
- bank integrations
- AI suggestions
- arbitrary custom cron rules
- advanced “edit this and following” series splitting
- multi-user collaboration
- auth overhaul

## Output requirements

Make the actual code changes.

When done, provide:

1. concise summary of the implementation
2. schema changes made
3. routes/pages/components added or changed
4. domain logic added
5. tests added
6. any tradeoffs or assumptions
7. commands to run migration/tests if needed

## Quality bar

Before finishing:

- ensure code is type-safe
- ensure validation is solid
- ensure tests are meaningful
- ensure UI is polished
- ensure changes are consistent with the repo
- avoid large unrelated refactors
- avoid brittle hacks

Do the work directly in this repo.
