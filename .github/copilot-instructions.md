# Copilot Instructions for `azure-ai-8020-course`

## Repository scope and workflow

This repository is an **8-week course content repo** (Markdown modules, labs, checklists, references, templates), not a single runnable application.  
Most engineering tasks here are content updates and consistency checks across course materials.

When implementing changes:

- Preserve cross-file consistency between `README.md`, `course-overview.md`, weekly labs/checklists, and `CLAUDE.md`.
- Treat `resources/architecture-patterns.md` and `resources/synthetic-schema.md` as canonical technical references for examples used in labs.
- Keep the existing naming conventions for new content files:
  - `module-NN-kebab-case-title.md`
  - `lab-NNx-kebab-case-title.md`
  - `checklist-week-NN.md`

## Build, test, and lint commands

There are **no root-level build, lint, or unit-test pipelines** in this repository.

Use lab-documented commands when validating sample code/instructions:

| Purpose | Command | Source context |
|---|---|---|
| .NET restore/build sample projects | `dotnet restore` / `dotnet build` | `week-01/lab-01a-environment-setup.md` |
| Run .NET API sample | `dotnet run` (from `DistrictAnalyticsApi`) | `week-05/lab-05a-dotnet-api.md` |
| Python environment setup | `pip install -r requirements.txt` or listed packages | `week-05/lab-05b-python-prototype.md`, `week-01/lab-01a-environment-setup.md` |
| Run Python single-case test | `python scripts/run_question.py teacher "Show the district achievement gap by subgroup"` | `week-05/lab-05b-python-prototype.md` |
| Run Python evaluation batch | `python scripts/run_evaluation.py` | `week-05/lab-05b-python-prototype.md` |

Single-test guidance:

- For Python prototype behavior, use one `run_question.py` invocation with a specific role/question.
- For .NET API behavior, run a single request from the `.http` files in `http/` (as described in `week-05/lab-05a-dotnet-api.md`).

## High-level architecture (course target system)

The course teaches a FERPA-conscious RAG analytics assistant with this pipeline:

1. Embed question (`text-embedding-3-small`)
2. Retrieve metadata via Azure AI Search hybrid query (BM25 + vector + semantic rerank), with `role_scope` pre-filter
3. Execute an approved SQL view scoped by `UserContext`
4. Generate response via Azure OpenAI (`gpt-4o-mini`)
5. Return answer + source view + groundedness signal

Core references for this architecture:

- `course-overview.md`
- `resources/architecture-patterns.md`
- `resources/synthetic-schema.md`

## Key codebase conventions to preserve

These are non-negotiable patterns repeated across modules/labs/resources:

1. **Three independent access-control layers:** JWT authentication, metadata pre-filter (`role_scope`), and SQL scoping.
2. **`UserContext` from claims only:** never sourced from request body/query in production patterns.
3. **View authorization gate:** `ViewRegistry.ThrowIfNotAuthorized(viewName, ctx)` before SQL execution.
4. **Approved-view-only SQL surface:** no unrestricted LLM-generated SQL patterns.
5. **Parameterized SQL only:** especially indexed IN-clause parameters (`@SId0`, `@SId1`, ...).
6. **Small-cell suppression:** values for groups `< 10` students are suppressed (`NULL`) and must be explained accordingly in answer logic.
7. **Telemetry/privacy constraint:** logs/spans should include role/scope/metrics but not raw question text, answer text, student names, or full SQL text with sensitive values.
8. **Role strings must stay exact across docs/examples:** `teacher`, `school_admin`, `district_admin` (used by JWT claims and metadata `role_scope`).

## Primary source files to consult before editing architecture/security guidance

- `CLAUDE.md`
- `README.md`
- `course-overview.md`
- `resources/architecture-patterns.md`
- `resources/ferpa-reference.md`
- `resources/governance-checklist.md`
