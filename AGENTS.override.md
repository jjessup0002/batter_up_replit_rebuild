# High-Priority Browser and Structured-Access Policy

These instructions override any weaker browser or tool-selection guidance elsewhere in this repository.

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

## Priority

The user generally prefers slower execution over substantially higher model usage. Correctness, security, supported platform practices, and data safety still take precedence. Session-specific user instructions may override this file.