# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repository Is

An 8-week self-paced course for K-12 district technical and data teams building a FERPA-compliant RAG (Retrieval-Augmented Generation) analytics assistant on Azure. The course teaches teams how to answer natural-language questions from teachers and administrators using existing SQL Server data — without exposing individual student records.

This is a **course materials repository** — it consists entirely of Markdown modules, lab instructions, reference files, and code samples. There are no compiled artifacts, test suites, or build pipelines. "Running" the code means following the lab instructions to provision Azure resources and execute the code samples against a learner's own environment.

## Course Structure

```
week-01/ through week-08/   ← Weekly modules and labs (module-NN-*.md, lab-NN*.md, checklist-week-NN.md)
capstone/                   ← Capstone instructions, rubric, and submission template
resources/                  ← Reference documents (architecture patterns, schema, evaluation rubric, FERPA)
templates/                  ← ADR, lab report, and prompt templates
```

Each week contains two modules (conceptual) and two labs (hands-on), plus a checklist for self-verification.

## Technology Stack

| Layer | Technology |
|---|---|
| AI | Azure OpenAI — `gpt-4o-mini` (chat), `text-embedding-3-small` (embeddings) |
| Search | Azure AI Search — hybrid BM25 + vector with semantic re-ranking |
| Data | SQL Server 2019+ / Azure SQL — views only; base tables denied to AI service account |
| Backend | .NET 10 primary (C#); Python 3.11+ secondary |
| Identity | Microsoft Entra ID — JWT claims drive `UserContext`; `[Authorize]` + `Microsoft.Identity.Web` |
| Monitoring | OpenTelemetry + Azure Monitor / Application Insights |
| Secrets | Azure Key Vault (POC) → Managed Identity via `DefaultAzureCredential` (production) |

**.NET version policy:** .NET 10 is primary. .NET 8 alternatives are provided where APIs differ. .NET 6 is not used.

## Key NuGet Packages (.NET)

```xml
<PackageReference Include="Azure.AI.OpenAI"                        Version="2.*" />
<PackageReference Include="Azure.Search.Documents"                  Version="11.*" />
<PackageReference Include="Azure.Security.KeyVault.Secrets"         Version="4.*" />
<PackageReference Include="Azure.Identity"                          Version="1.*" />
<PackageReference Include="Microsoft.Data.SqlClient"                Version="5.*" />
<PackageReference Include="Dapper"                                  Version="2.*" />
<PackageReference Include="Azure.Monitor.OpenTelemetry.AspNetCore"  Version="1.*" />
<PackageReference Include="DotNetEnv"                               Version="3.*" />
```

## Key Python Packages

```
openai  azure-search-documents  azure-identity  pyodbc  pandas  python-dotenv  jupyter  azure-ai-evaluation
```

## Environment Variables

All code samples load from `.env.local` (never committed; excluded by `.gitignore`):

```ini
AZURE_OPENAI_ENDPOINT=https://<resource>.openai.azure.com/
AZURE_OPENAI_API_KEY=<key>
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-small
AZURE_OPENAI_API_VERSION=2025-01-01-preview

AZURE_SEARCH_ENDPOINT=https://<resource>.search.windows.net
AZURE_SEARCH_ADMIN_KEY=<key>
AZURE_SEARCH_INDEX_NAME=district-metadata-index

SQL_CONNECTION_STRING=Server=localhost;Database=SunlakeUnifiedDW;...
LAB_MODE=true
```

## Synthetic Database

All labs use the **SunlakeUnifiedDW** database — a fictional Sunlake Unified School District with 8 schools, 500 synthetic students, and ~90,000 attendance records. The generator in `week-01/lab-01a-environment-setup.md` uses `random.seed(42)` for reproducibility. **No real student data is ever used.**

Schema reference: `resources/synthetic-schema.md`

## Core Architecture: The RAG Pipeline

```
User question
  → [1] EMBED (text-embedding-3-small)
  → [2] RETRIEVE (Azure AI Search hybrid, pre-filtered by role_scope)
  → [3] AUGMENT (execute approved SQL view, UserContext-scoped)
  → [4] GENERATE (GPT-4o-mini with structured prompt)
  → [5] RETURN (answer + source view + groundedness flag)
```

The approved view catalog (9 views) is the **only** SQL surface the AI may access. The `ViewRegistry` class is the single source of truth for which roles can query which views.

## Three-Layer Access Control (non-negotiable)

1. **Authentication** — Entra ID JWT validated by `[Authorize]` + `Microsoft.Identity.Web`. Failure = HTTP 401.
2. **Metadata pre-filter** — AI Search `role_scope` OData filter runs before scoring, so unauthorized metadata documents are invisible to the search engine, not just dropped from results.
3. **SQL scope** — `ViewRegistry.ThrowIfNotAuthorized(viewName, ctx)` must be called before every SQL query. `UserContext` is always built from JWT claims only — never from request body or query string.

All three layers are independent. A bug in Layer 2 does not weaken Layer 3.

## Security and FERPA Constraints

These apply to every lab, exercise, and the capstone. They are course non-negotiables:

- `UserContext` must be built from `ClaimsPrincipal` (token claims) only — never `[FromBody]` or `[FromQuery]`.
- `ViewRegistry.ThrowIfNotAuthorized()` must be called before every SQL query.
- All SQL must use parameterized queries. The IN-clause pattern uses indexed names: `@SId0`, `@SId1`, etc.
- Small cell suppression: views return `NULL` for any subgroup with fewer than 10 students.
- Audit logs record role/school/view/tokens/latency — never the question text, answer text, or student names.
- OpenTelemetry span tags must never include question text, answer text, student names, or full SQL strings.

## Evaluation Framework (Production Gate)

All four dimensions must pass before production deployment:

| Dimension | Threshold |
|---|---|
| Groundedness | ≥ 0.85 |
| Factual Accuracy | ≥ 0.90 |
| Scope Safety | 1.00 (binary gate — any violation blocks deployment) |
| Response Quality | ≥ 0.80 |

## Key Reference Files

- `resources/architecture-patterns.md` — 10 canonical code patterns with full C# and Python examples (ViewRegistry, UserContext, parameterized SQL IN-clause, DefaultAzureCredential, hybrid search pre-filter, small cell suppression, OpenTelemetry span hierarchy, metadata document structure)
- `resources/synthetic-schema.md` — Complete DDL for all dimension and fact tables, all 9 approved views, 3 stored procedures, and the read-only service account setup
- `resources/ferpa-reference.md` — FERPA controls specific to AI systems in K-12
- `resources/evaluation-rubric.md` — Four-dimension scoring criteria
- `resources/governance-checklist.md` — Full lifecycle governance checklist
- `resources/sample-prompts.md` — System prompt templates for the RAG pipeline
- `resources/azure-services-reference.md` — Azure SDK configuration notes

## Adding New Content

When adding new modules or labs:
- Follow the existing naming scheme: `module-NN-description.md`, `lab-NNx-description.md`
- Any new approved SQL view must be added to `ViewRegistry` — the `switch` expression in `IsAuthorized` is the single source of truth. Never duplicate role-to-view logic elsewhere.
- Any new view requires a corresponding metadata document (Pattern 7 in `resources/architecture-patterns.md`) with correct `role_scope` values matching the exact JWT role strings (`teacher`, `school_admin`, `district_admin`).
- The `role_scope` field in metadata documents is a pre-filter, not a post-filter — typos silently exclude documents from search results for the affected role.
