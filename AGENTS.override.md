# High-Priority Repository Operating Policy

These instructions override any weaker browser, tool-selection, or work-audit guidance elsewhere in this repository.

## Browser automation is prohibited by default

Do not open, control, inspect, or interact with a browser unless the user explicitly authorizes browser use for the current session or task.

Browser automation is not the normal fallback after a failed CLI command, API request, connector call, authentication attempt, or lookup. It is the final technical option before requesting manual intervention.

## Required structured-access persistence

Before considering browser use, make a good-faith effort through multiple materially different supported approaches. A single failed command or endpoint is not sufficient.

Depending on the system, investigate and attempt appropriate alternatives such as:

- existing repository scripts and local tooling
- official CLI tools and alternate CLI commands
- SDKs or direct REST/GraphQL APIs
- PowerShell modules or direct HTTP requests
- MCP tools and installed connectors
- exported configuration, solution, or project files
- service-specific deployment and diagnostic tools
- alternate authentication methods, environment selection, tenant or project identifiers, API versions, permissions, and endpoint forms

Diagnose failures rather than immediately changing interface. Check authentication state, account or tenant context, environment/project selection, IDs, permissions, installed versions, command syntax, API versions, and available alternate endpoints.

## Escalation order

Use this order unless the user explicitly overrides it:

1. Local repository tools and deterministic scripts.
2. Official CLI, SDK, API, PowerShell, MCP, or connector methods.
3. Alternate structured method after diagnosing the first failure.
4. Additional structured methods when they are reasonably available.
5. Ask the user for the smallest manual step, missing identifier, authentication action, or permission needed.
6. Request explicit permission to use browser automation.
7. Use the browser only for the smallest unavoidable portion, then return to structured tools.

Do not silently choose the browser. If structured methods are exhausted, briefly state what categories of methods were attempted and ask for manual intervention or browser authorization.

## Power Platform emphasis

For Power Automate and Power Apps work, do not treat one PAC CLI failure as proof that browser work is required. Continue through appropriate alternatives including PAC CLI command variants, solution-aware flows/apps, Dataverse Web API, Power Platform PowerShell modules, direct HTTP, Microsoft Graph or SharePoint APIs where relevant, MCP/connectors, solution export/unpack inspection, connection references, environment variables, and scripted diagnostics.

The browser designer may be used only with explicit session authorization or after structured routes are exhausted and the user approves the escalation.

## Required lightweight work audit

Before substantive work, read `docs/work-audit/PROJECT.md`. Treat its `project_bucket` as the repository default.

If that file is missing, conflicting, or the current work may belong to a different business, ask the user to choose exactly one bucket before logging substantive work: `BG Cyber Deals`, `WCWD`, or `STAT Central`. Do not guess when the distinction is unclear.

Maintain `docs/work-audit/YYYY-MM-DD.md` using the America/Chicago local date and time. At each natural minor milestone, append one bullet of no more than one or two sentences. Good checkpoints include a meaningful implementation result, decision, blocker or scope change, validation result, and completion or handoff.

Use this format:

`- [HH:MM CT] [Project Bucket] What changed and the result. Validation, blocker, or next step only when useful.`

Do not log every command, API call, file read, browser action, or tiny edit. Logging must not interrupt or materially slow delivery; catch up at the next natural checkpoint. Keep the daily file append-only except for factual corrections, and never record secrets, credentials, payment data, or sensitive customer information.

Before the final handoff, ensure today's material work is represented by at least one current audit entry.

## Priority

The user generally prefers slower execution over substantially higher model usage. Correctness, security, supported platform practices, and data safety still take precedence. Session-specific user instructions may override this file.