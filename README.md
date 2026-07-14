# Azure AI for K-12 Data Teams

An 8-week, self-paced course for district technical and data teams building secure, FERPA-conscious AI analytics systems on Azure.

See `course-overview.md` for the full course description, learning objectives, and technology stack.

---

## Prerequisites

### Knowledge

- SQL (JOINs, WHERE clauses, aggregate functions)
- Basic .NET / C# or Python programming
- Familiarity with REST APIs and JSON
- Basic understanding of authentication concepts (tokens, claims)

### Accounts and Access

- [ ] Azure subscription with permission to create resources
- [ ] Microsoft Entra ID tenant (your district's M365 tenant is sufficient)
- [ ] Access to SQL Server (local or Azure SQL)
- [ ] Azure OpenAI access approved (requires an access request if not already approved)

> **Azure OpenAI access:** As of early 2025, Azure OpenAI requires an approved access request for new subscriptions. Apply at aka.ms/oai/access. Allow 1–3 business days. Start this before Week 1.

### Local Tools

- [ ] .NET 10 SDK — [dotnet.microsoft.com/download](https://dotnet.microsoft.com/download)
- [ ] Python 3.11+ — [python.org](https://python.org)
- [ ] Visual Studio 2022 (v17.8+) or VS Code with C# Dev Kit
- [ ] SQL Server Management Studio (SSMS) or Azure Data Studio
- [ ] Azure CLI — [learn.microsoft.com/cli/azure/install-azure-cli](https://learn.microsoft.com/cli/azure/install-azure-cli)
- [ ] Git

---

## Quick Start

### 1. Clone or download this course

```bash
git clone https://github.com/luciousa/azure-ai-8020-course.git
cd azure-ai-8020-course
```

### 2. Set up environment variables

Copy the environment template and fill in your values:

```bash
cp .env.example .env
# Edit .env with your Azure resource values
```

Required variables:

```
AZURE_OPENAI_ENDPOINT=https://<your-resource>.openai.azure.com/
AZURE_OPENAI_KEY=<your-key>
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4o-mini-deployment
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-small-deployment

AZURE_SEARCH_ENDPOINT=https://<your-resource>.search.windows.net
AZURE_SEARCH_KEY=<your-admin-key>
AZURE_SEARCH_INDEX_NAME=susd-views-index

SQL_CONNECTION_STRING=Server=localhost;Database=SusdDW;Trusted_Connection=true;
```

> **Security note:** The `.env` file is for local development only. Never commit it to source control. The `.gitignore` in this repo excludes it. In production, use Azure Key Vault and managed identity instead of API keys.

### 3. Set up the synthetic database

Follow `week-01/lab-01a-environment-setup.md` to create and populate the synthetic Sunlake Unified School District database (`SunlakeUnifiedDW`).

### 4. Start Week 1

Open `week-01/module-01-orientation-8020-roadmap.md` and work through the modules in order.

### 5. Optional docs web app (sidebar navigation)

```bash
cd web
npm install
npm run dev
```

Then open the local Vite URL (typically `http://localhost:5173`).

---

## Course Content

Work through modules and labs in the order listed. Each module teaches the concept; the paired lab applies it.

---

### Week 1 — Foundations

| # | Type | Link | What it covers |
|---|------|------|----------------|
| 01 | Module | [Course Orientation and the 80/20 Roadmap](week-01/module-01-orientation-8020-roadmap.md) | Defines the target use case, maps the target architecture end-to-end, and establishes the four constraints that drive every design decision in the course |
| 02 | Module | [Azure AI Landscape for District Analytics](week-01/module-02-azure-ai-landscape.md) | Identifies the five core Azure AI services for this use case (and what to skip), plus the three infrastructure services every production AI system needs |
| 01a | Lab | [Environment Setup](week-01/lab-01a-environment-setup.md) | Provision all Azure resources, create and populate the synthetic `SunlakeUnifiedDW` database, and verify .NET and Python connectivity to all three services |
| — | Checklist | [Week 1 Checklist](week-01/checklist-week-01.md) | Self-verification checklist for all Week 1 deliverables |

---

### Week 2 — Azure OpenAI and Prompt Engineering

| # | Type | Link | What it covers |
|---|------|------|----------------|
| 03 | Module | [Azure OpenAI Fundamentals](week-02/module-03-azure-openai-fundamentals.md) | Model families, chat completions API request structure, token budgets, content filtering policies, and authentication from API key to managed identity |
| 04 | Module | [Prompt Engineering for Analytics Assistants](week-02/module-04-prompt-engineering-analytics.md) | Six prompt patterns for predictable, grounded, auditable responses; refusal handling for out-of-scope questions; prompt injection mitigation |
| 02a | Lab | [First OpenAI Call](week-02/lab-02a-first-openai-call.md) | Make authenticated chat completion and embedding calls from both .NET and Python; inspect token usage and content filter results |
| 02b | Lab | [Prompt Engineering](week-02/lab-02b-prompt-engineering.md) | Build and iterate a district analytics system prompt; score 10 test questions on grounding, format compliance, and refusal accuracy |
| — | Checklist | [Week 2 Checklist](week-02/checklist-week-02.md) | Self-verification checklist for all Week 2 deliverables |

---

### Week 3 — Semantic Search and RAG Architecture

| # | Type | Link | What it covers |
|---|------|------|----------------|
| 05 | Module | [RAG Architecture](week-03/module-05-rag-architecture.md) | Five-stage pipeline (question → embed → retrieve → augment → generate), chunking strategies, keyword vs. vector vs. hybrid retrieval, and the six RAG failure modes |
| 06 | Module | [Azure AI Search](week-03/module-06-azure-ai-search.md) | Index schema design, vector search with HNSW, hybrid BM25+vector queries, and the mandatory role-scope pre-filter pattern |
| 03a | Lab | [Build the AI Search Index](week-03/lab-03a-ai-search-index.md) | Create the `susd-metadata-v1` index, author district metadata documents, generate embeddings, and verify hybrid search and role-based security trimming |
| 03b | Lab | [RAG Pipeline](week-03/lab-03b-rag-pipeline.md) | Build the complete five-stage RAG pipeline in Python; re-run the 10 Lab 02b test questions and compare scores against the prompt-only baseline |
| — | Checklist | [Week 3 Checklist](week-03/checklist-week-03.md) | Self-verification checklist for all Week 3 deliverables |

---

### Week 4 — SQL Integration and Metadata Layer

| # | Type | Link | What it covers |
|---|------|------|----------------|
| 07 | Module | [SQL Server Integration](week-04/module-07-sql-server-integration.md) | Why AI-generated SQL is rejected in favor of an approved view catalog; designing aggregate views; least-privilege service account; parameterized IN-clause pattern |
| 08 | Module | [Metadata and Semantic Layers](week-04/module-08-metadata-semantic-layer.md) | Designing a metadata catalog that maps natural-language questions to approved views; authoring rich metadata documents that improve AI Search retrieval accuracy |
| 04a | Lab | [Approved Views](week-04/lab-04a-approved-views.md) | Create all 9 approved views in `SunlakeUnifiedDW`, configure the read-only service account (`svc_ai_reader`), and verify GRANT/DENY permissions |
| 04b | Lab | [Metadata Catalog](week-04/lab-04b-metadata-catalog.md) | Author and upload the full metadata catalog (view docs, business rules, domain overviews, FAQs, glossary entries); verify retrieval across all five domains |
| — | Checklist | [Week 4 Checklist](week-04/checklist-week-04.md) | Self-verification checklist for all Week 4 deliverables |

---

### Week 5 — Building the RAG Pipeline

| # | Type | Link | What it covers |
|---|------|------|----------------|
| 09 | Module | [.NET Backend Integration](week-05/module-09-dotnet-backend-integration.md) | .NET 10 API project structure, dependency injection for all three Azure services, RAG orchestration in C#, and the `ViewRegistry` dispatch pattern |
| 10 | Module | [Python Prototyping](week-05/module-10-python-prototyping.md) | When to use Python vs. .NET, LLM-based parameter extraction, evaluation harness design, and the Python-to-.NET handoff checklist |
| 05a | Lab | [.NET API](week-05/lab-05a-dotnet-api.md) | Build the `DistrictAnalyticsApi` .NET 10 project; implement SQL handlers for all 9 views; test all three role contexts; verify security trimming end-to-end |
| 05b | Lab | [Python Prototype](week-05/lab-05b-python-prototype.md) | Build the Python RAG prototype; validate LLM-based parameter extraction; run the evaluation harness against 12 test questions and record scores |
| — | Checklist | [Week 5 Checklist](week-05/checklist-week-05.md) | Self-verification checklist for all Week 5 deliverables |

---

### Week 6 — Role-Aware Access and Analytics Scenarios

| # | Type | Link | What it covers |
|---|------|------|----------------|
| 11 | Module | [Role-Aware Access Control](week-06/module-11-role-aware-access-control.md) | Mapping SUSD staff roles to Entra ID claims; extracting `UserContext` from a JWT bearer token; verifying independence of all three enforcement layers |
| 12 | Module | [Assessment Analytics Scenarios](week-06/module-12-assessment-analytics.md) | Five analytics domains (attendance, local assessment, state assessment, equity gaps, trend); question-to-view mapping; FERPA-safe answer templates; decline patterns |
| 06a | Lab | [Role-Aware Demo](week-06/lab-06a-role-aware-demo.md) | Integrate `UserContextService` into the .NET API; generate test JWTs for all three roles; run the full 9-scenario role-based access matrix |
| 06b | Lab | [Analytics Scenarios](week-06/lab-06b-analytics-scenarios.md) | Run curated analytics questions across all five domains; test small cell suppression behavior; build the foundation for the Week 7 evaluation harness |
| — | Checklist | [Week 6 Checklist](week-06/checklist-week-06.md) | Self-verification checklist for all Week 6 deliverables |

---

### Week 7 — Security, Evaluation, and Privacy

| # | Type | Link | What it covers |
|---|------|------|----------------|
| 13 | Module | [Security, Privacy, and FERPA](week-07/module-13-security-privacy-ferpa.md) | FERPA's specific implications for AI systems; mapping each requirement to a technical control; the five most common FERPA violations in AI-assisted analytics |
| 14 | Module | [Evaluation, Hallucination Detection, and Safety](week-07/module-14-evaluation-hallucination-safety.md) | Four-dimension evaluation framework; designing a formal test set; Azure AI Evaluation SDK; the three most common RAG failure modes and targeted fixes |
| 07a | Lab | [FERPA Review](week-07/lab-07a-ferpa-review.md) | Structured FERPA compliance review of the RAG pipeline; verify all technical controls map to FERPA requirements; produce a compliance evidence document |
| 07b | Lab | [Evaluation Test Set](week-07/lab-07b-evaluation-test-set.md) | Build a 30-case evaluation test set; compute SQL ground-truth answers; score all four dimensions; use Azure AI Evaluation SDK for groundedness and relevance |
| — | Checklist | [Week 7 Checklist](week-07/checklist-week-07.md) | Self-verification checklist for all Week 7 deliverables |

---

### Week 8 — Production Readiness

| # | Type | Link | What it covers |
|---|------|------|----------------|
| 15 | Module | [Monitoring and Governance](week-08/module-15-monitoring-governance.md) | OpenTelemetry + Azure Monitor observability strategy; structured logging without PII; cost and safety alerts; AI governance framework for K-12 |
| 16 | Module | [POC to Production](week-08/module-16-poc-to-production.md) | Eight gaps between the lab POC and a production-ready system; managed identity migration; private endpoints and VNet integration; phased rollout planning |
| 08a | Lab | [Monitoring Setup](week-08/lab-08a-monitoring-setup.md) | Instrument the .NET pipeline with OpenTelemetry spans and custom metrics; connect to Application Insights; configure Azure Monitor alerts |
| 08b | Lab | [Production Checklist](week-08/lab-08b-production-checklist.md) | Work through the full production readiness checklist; produce a technical review board summary documenting the POC-to-production delta |
| — | Checklist | [Week 8 Checklist](week-08/checklist-week-08.md) | Self-verification checklist for all Week 8 deliverables |

---

### Capstone

| Link | What it covers |
|------|----------------|
| [Capstone Instructions](capstone/capstone-instructions.md) | Four options for the capstone extension; scope, deliverables, and timeline |
| [Capstone Rubric](capstone/capstone-rubric.md) | Scoring criteria for the three-document stakeholder package |
| [Submission Template](capstone/capstone-submission-template.md) | Template for the required capstone submission documents |

---

### Reference and Templates

| Link | What it covers |
|------|----------------|
| [Architecture Patterns](resources/architecture-patterns.md) | 10 canonical patterns with full C# and Python code (ViewRegistry, UserContext, IN-clause SQL, DefaultAzureCredential, hybrid search pre-filter, small cell suppression, OpenTelemetry spans, metadata document structure) |
| [Azure Services Reference](resources/azure-services-reference.md) | Azure SDK configuration notes and common gotchas per service |
| [Synthetic Schema](resources/synthetic-schema.md) | Complete DDL for all dimension and fact tables, all 9 approved views, 3 stored procedures, and read-only service account setup |
| [Evaluation Rubric](resources/evaluation-rubric.md) | Four-dimension scoring criteria with examples |
| [FERPA Reference](resources/ferpa-reference.md) | FERPA quick reference specific to AI systems in K-12 |
| [Governance Checklist](resources/governance-checklist.md) | Full lifecycle governance checklist |
| [Sample Prompts](resources/sample-prompts.md) | System prompt templates and variants for the analytics assistant |
| [Sample User Questions](resources/sample-user-questions.md) | Questions by role with a demo script |
| [Architecture Decision Record](templates/architecture-decision-record.md) | Template for documenting design choices |
| [Lab Report Template](templates/lab-report-template.md) | Template for weekly lab reports |
| [Prompt Template](templates/prompt-template.md) | Reusable prompt authoring template |

---

## Technology Stack at a Glance

| Layer | Technology |
|---|---|
| AI | Azure OpenAI (gpt-4o-mini, text-embedding-3-small) |
| Search | Azure AI Search (hybrid BM25 + vector, semantic ranking) |
| Data | SQL Server — views only; no base table access from AI |
| Backend | .NET 10 (primary) / Python 3.11+ |
| Identity | Microsoft Entra ID (JWT with role claims) |
| Monitoring | OpenTelemetry + Azure Monitor / Application Insights |
| Secrets | Azure Key Vault (POC) → Managed Identity (production) |

**.NET version policy:**  
- .NET 10 is the primary target  
- .NET 8 alternatives are provided where APIs differ  
- .NET 6 is end of life and is not used in this course  

---

## Security and Privacy — Non-Negotiables

The following constraints apply to every lab, exercise, and the capstone. Violations result in automatic score deductions in graded work.

| Constraint | What it means |
|---|---|
| No real student data | All labs use synthetic SUSD data only |
| No individual student PII in prompts | Aggregate views only; no names or IDs sent to Azure OpenAI |
| No hardcoded API keys | Use environment variables or Azure Key Vault |
| No string-interpolated SQL | Use parameterized queries with named parameters always |
| Claims from token only | `UserContext` built from JWT claims; never from request body |
| `ThrowIfNotAuthorized` everywhere | Call `ViewRegistry.ThrowIfNotAuthorized()` before every SQL query |

---

## Evaluation Framework

Before any production deployment, the RAG pipeline must pass the four-dimension evaluation framework:

- **Groundedness ≥ 0.85** — answers are supported by retrieved data
- **Factual Accuracy ≥ 0.90** — numbers match the SQL ground truth
- **Scope Safety = 1.00** — zero scope or FERPA violations (non-negotiable gate)
- **Response Quality ≥ 0.80** — answers are clear and usable

See `resources/evaluation-rubric.md` for the full scoring criteria.

---

## FERPA Reminder

This course is designed for use in K-12 educational environments where FERPA applies. The architecture taught throughout this course is specifically designed to satisfy FERPA requirements:

- Aggregate-only SQL views prevent individual student data from entering the AI pipeline
- Small cell suppression (< 10 students) protects subgroup privacy
- Role-based SQL scoping prevents cross-school or cross-section disclosure
- Audit logging records role/school/view — not question or answer text

See `resources/ferpa-reference.md` for a full FERPA reference specific to AI systems in K-12.

> **Disclaimer:** This course is educational and does not constitute legal advice. Consult your district's legal counsel and Data Privacy Officer before deploying an AI system that touches student education records.

---

## Getting Help

- Check `resources/architecture-patterns.md` for code patterns and common gotchas
- Check `resources/azure-services-reference.md` for SDK usage and configuration notes
- Check the weekly checklist files (e.g., `week-03/checklist-week-03.md`) for lab verification steps
- Use the architecture decision record template (`templates/architecture-decision-record.md`) when you face a design choice

---

## License and Use

This course is developed for internal use at Collier County Public Schools. The synthetic data, code samples, and course materials may be adapted for other K-12 districts. All student data in this course is synthetic and does not represent any real student.
