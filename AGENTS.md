# Codex Working Instructions

## Default optimization priority

Unless the user explicitly says otherwise for the current session, optimize for the **lowest practical model and tool usage**, not the fastest or easiest execution path.

Use this decision order:

1. Prefer deterministic local operations, repository tools, scripts, tests, and existing automation.
2. Prefer structured CLI, SDK, API, MCP, or connector access over browser control.
3. Use the browser only when the task cannot be completed reliably through a supported structured interface, authentication requires an interactive step, or visual verification is materially necessary.
4. When browser use is necessary, minimize page navigation, screenshots, repeated visual inspection, and manual clicking. Return to CLI/API work as soon as possible.

A slower structured workflow is preferred when it materially reduces usage and remains safe and reliable. The user often multitasks and does not require the fastest completion unless they explicitly prioritize speed.

## Execution expectations

- Before opening a browser, briefly inspect whether an installed CLI, API, SDK, repository script, or connector can perform the task.
- For Vercel, Supabase, Stripe, Microsoft Power Platform, and GitHub, check supported CLI/API options first.
- For Power Platform work, prefer PAC CLI, solution-aware flows, Dataverse/Web API, exported solution files, and scripted deployment or diagnostics before using the Power Automate or Power Apps browser designers.
- Do not choose browser automation merely because it is easier to discover or faster to begin.
- Correctness, security, data safety, and supported platform practices take precedence over usage savings.
- If the lowest-usage route is blocked or substantially less reliable, use the next-lowest-usage viable route without waiting for permission.
- Session-specific user instructions override this file.

## Lightweight Work Audit

Default classification is **STAT Central**. Before substantive work, classify the task as `WCWD`, `STAT Central`, or `BG Cyber Deals`; if unclear, ask the user.

Maintain `docs/work-audit/YYYY-MM-DD.md` using America/Chicago time. Log only natural checkpoints: start, meaningful milestone or decision, blocker or scope change, and completion or handoff. Use occasional `[HH:MM CT]` timestamps and a few bullets covering classification, task, outcome, important files or systems, validation, and next step.

Do not log every command, API call, browser action, file read, or minor edit. Logging must not interrupt or materially slow delivery; catch up at the next checkpoint. A later AI may use Git history, diffs, file timestamps, issues, PRs, and project artifacts for added detail. Do not record secrets or sensitive data.

## Risk-based validation and review policy

Validation must be proportional to the change's risk and the project's current development stage.

- During implementation, run the smallest focused checks that exercise the changed behavior. Do not rerun the full suite after every small repair.
- After the work is substantially complete, run the repository's standard merge gate once: formatting, static analysis, relevant tests, and the build required for the affected platform.
- Reserve broad device, browser, visual, accessibility, migration, performance, and compatibility matrices for milestone gates, release candidates, or changes that directly affect those risks.
- Request one final automated review after substantive completion. Address merge-blocking findings, but do not enter an unlimited review-and-retest loop. Request another review only when a fix materially changes the risk area or when a blocking finding needs confirmation.
- Classify findings by actual impact:
  - **Merge-blocking:** security/privacy exposure, data loss or corruption, unsafe migration, crash, broken primary workflow, invalid external side effect, or failure of a required merge check.
  - **Milestone-required:** important recovery, accessibility, compatibility, performance, or edge-condition work that can be tracked without blocking the current issue.
  - **Follow-up:** polish, rare theoretical edge cases, optional optimization, or unchanged permutations.
- Automated severity labels such as P1 or P2 do not automatically block merging; evaluate whether the finding meets the merge-blocking definition.
- Issue-specific proportional testing guidance overrides generic broad validation language. For docs-only or planning work, validate the documents, schemas, links, and examples rather than building unrelated application targets.
- Once acceptance criteria are met, the standard merge gate passes, and no genuine merge-blocking defect remains, merge and continue. Convert non-blocking findings into focused follow-up issues.
- Never reduce rigor for authentication, payments, destructive operations, database/save migrations, privacy, child safety, production deployment, or other changes with credible irreversible consequences.