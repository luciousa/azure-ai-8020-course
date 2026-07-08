# Azure AI 80/20 Course — File Manifest

**Course:** Azure AI for K-12 District Analytics (Secure AI Chat Assistant)  
**Audience:** Senior Systems Analysts, Data/Technical Staff — Accountability & Data Management / Data Warehouse  
**Format:** 8-week self-paced course  
**Version:** 1.0 — July 2026  

## Course Root

| File | Description |
|------|-------------|
| `README.md` | Getting-started guide for instructors and learners; environment prerequisites |
| `course-overview.md` | Course philosophy, learning outcomes, prerequisites, 80/20 rationale, and learning path |
| `file-manifest.md` | This file — complete listing of all course materials with descriptions |
| `syllabus.md` | 8-week week-by-week syllabus: modules, outcomes, time estimates, and lab summaries |

## Week 01 — Orientation, Azure AI Landscape, and the 80/20 Roadmap

| File | Description |
|------|-------------|
| `week-01/module-01-orientation-8020-roadmap.md` | Course orientation; the 80/20 approach; target use case; five key architecture decisions; course lab environment setup guidance |
| `week-01/module-02-azure-ai-landscape.md` | Survey of Azure AI services relevant to district analytics: Azure OpenAI, AI Foundry, AI Search, Content Safety, Entra ID, Key Vault, private networking; what to skip and why |
| `week-01/lab-01a-environment-setup.md` | Lab: Provision Azure resource group and Azure OpenAI resource; install .NET and Python SDKs; configure environment variables; connect to synthetic SQL Server database |
| `week-01/checklist-week-01.md` | Week 1 completion checklist |

## Week 02 — Azure OpenAI Fundamentals and Prompt Engineering

| File | Description |
|------|-------------|
| `week-02/module-03-azure-openai-fundamentals.md` | Azure OpenAI concepts: model families, deployments, API endpoints, token budgets, content filters, authentication, responsible AI defaults, and cost signals |
| `week-02/module-04-prompt-engineering-analytics.md` | Prompt engineering for analytics assistants: system prompt design, grounding instructions, few-shot examples, chain-of-thought, structured output, refusal handling, and anti-hallucination patterns |
| `week-02/lab-02a-first-openai-call.md` | Lab: Authenticated Azure OpenAI calls from .NET (Azure.AI.OpenAI SDK) and Python (openai library); inspect token usage, response structure, and content filter results |
| `week-02/lab-02b-prompt-engineering.md` | Lab: Design and test system prompts for district analytics Q&A against 10 synthetic user questions; measure grounding and refusal behavior |
| `week-02/checklist-week-02.md` | Week 2 completion checklist |

## Week 03 — Retrieval-Augmented Generation and Azure AI Search

| File | Description |
|------|-------------|
| `week-03/module-05-rag-architecture.md` | RAG concepts: why RAG, retrieval pipeline stages, embedding models, chunking strategies, context window management, grounding, citation patterns, and RAG failure modes |
| `week-03/module-06-azure-ai-search.md` | Azure AI Search: indexes, fields, analyzers, semantic ranking, vector search, hybrid search, security trimming, skillsets (when useful), and integration patterns for district metadata |
| `week-03/lab-03a-ai-search-index.md` | Lab: Create an Azure AI Search index for district metadata — business definitions, approved view catalog, data dictionary entries; populate with synthetic data |
| `week-03/lab-03b-rag-pipeline.md` | Lab: Build a basic RAG pipeline that retrieves metadata from AI Search and passes retrieved context to Azure OpenAI; compare grounded vs. ungrounded answers |
| `week-03/checklist-week-03.md` | Week 3 completion checklist |

## Week 04 — SQL Server Integration and Semantic Layers

| File | Description |
|------|-------------|
| `week-04/module-07-sql-server-integration.md` | Safe SQL Server integration patterns: approved views, stored procedures, parameterized queries, read-only service accounts, row-level security, result-size limits, audit logging; why unrestricted AI-generated SQL is dangerous in production |
| `week-04/module-08-metadata-semantic-layer.md` | Metadata catalogs, semantic layers, business definition catalogs, data dictionaries; how the AI assistant uses them to select correct queries and return grounded answers; catalog design for K-12 domains |
| `week-04/lab-04a-approved-views.md` | Lab: Create approved SQL views and stored procedures on the synthetic K-12 schema; configure a read-only service account; validate row-level security; log query execution |
| `week-04/lab-04b-metadata-catalog.md` | Lab: Build a JSON/Markdown metadata catalog for the synthetic schema domains; index catalog entries in Azure AI Search; test retrieval for representative district questions |
| `week-04/checklist-week-04.md` | Week 4 completion checklist |

## Week 05 — .NET Backend Integration and Python Prototyping

| File | Description |
|------|-------------|
| `week-05/module-09-dotnet-backend-integration.md` | .NET API design for AI orchestration: Azure OpenAI SDK, AI Search client, SQL Server access via approved data layer, Entra ID authentication, Key Vault secret management, structured logging, and embedding the chat endpoint in the existing web reporting application |
| `week-05/module-10-python-prototyping.md` | Python-based prototyping: Azure OpenAI Python SDK, Semantic Kernel basics, data preparation scripts, evaluation scripts, and when Python is the right tool vs. when .NET should own the workflow |
| `week-05/lab-05a-dotnet-api.md` | Lab: Build a .NET 8 minimal API endpoint that orchestrates the full RAG flow: retrieves metadata from AI Search, selects and executes an approved SQL view, calls Azure OpenAI, returns a grounded answer with citations |
| `week-05/lab-05b-python-prototype.md` | Lab: Python notebook prototype of the same RAG flow using the openai SDK and pyodbc against synthetic SQL Server data; export results for evaluation |
| `week-05/checklist-week-05.md` | Week 5 completion checklist |

## Week 06 — Role-Aware Answers and Analytics Scenarios

| File | Description |
|------|-------------|
| `week-06/module-11-role-aware-access-control.md` | Role-aware answer design: RBAC and ABAC patterns, user context injection into prompts, row-level security enforcement by role, approved view selection by role, scoping for teacher vs. school admin vs. district admin; preventing privilege escalation through prompts |
| `week-06/module-12-assessment-analytics.md` | Analytics scenarios: attendance, local vs. state assessment results, performance gap analysis, subgroup analysis, longitudinal trends, diagnostic hypotheses, data quality warnings; distinguishing descriptive, diagnostic, predictive, and recommendation answer types |
| `week-06/lab-06a-role-aware-demo.md` | Lab: Demonstrate role-aware Q&A with synthetic data — same question returns different scoped answers for teacher (my students), school admin (my school), district admin (all schools) |
| `week-06/lab-06b-analytics-scenarios.md` | Lab: Implement five end-to-end district analytics scenarios; annotate each answer as factual, metric, trend, hypothesis, warning, or recommendation; verify grounding and citations |
| `week-06/checklist-week-06.md` | Week 6 completion checklist |

## Week 07 — Security, Privacy, FERPA, and Evaluation

| File | Description |
|------|-------------|
| `week-07/module-13-security-privacy-ferpa.md` | FERPA-conscious design for AI systems: what FERPA requires technically, data minimization, masking and redaction, prompt-injection defense, Azure AI Content Safety integration, acceptable-use policies, security architecture review checklist |
| `week-07/module-14-evaluation-hallucination-safety.md` | Evaluation framework: building an evaluation test set, factual grounding checks, hallucination measurement, citation requirement enforcement, answer quality rubric (factual / metric / trend / hypothesis / warning / recommendation), failure mode taxonomy |
| `week-07/lab-07a-ferpa-review.md` | Lab: Conduct a structured FERPA and privacy review of the RAG pipeline using the course checklist; document findings and required mitigations |
| `week-07/lab-07b-evaluation-test-set.md` | Lab: Build a 20-question evaluation test set with expected answers, expected answer types, and grounding sources; score the prototype and identify top failure modes |
| `week-07/checklist-week-07.md` | Week 7 completion checklist |

## Week 08 — Monitoring, Governance, and Production Readiness

| File | Description |
|------|-------------|
| `week-08/module-15-monitoring-governance.md` | Monitoring, logging, tracing, and audit controls for AI pipelines: Azure Monitor, Application Insights, prompt/response logging, token usage tracking, latency baselines, human review workflows, responsible AI governance integration |
| `week-08/module-16-poc-to-production.md` | POC-to-production roadmap: approval gates, stakeholder sign-off requirements, security review gates, pilot program design, rollout phases, cost and capacity planning, ongoing maintenance, model versioning, and deprecation planning |
| `week-08/lab-08a-monitoring-setup.md` | Lab: Configure Azure Monitor and Application Insights for the AI pipeline; implement structured audit logging for prompts, retrieved data, responses, and user roles |
| `week-08/lab-08b-production-checklist.md` | Lab: Complete the full production-readiness checklist against the prototype; document open items and required approvals |
| `week-08/checklist-week-08.md` | Week 8 completion checklist |

## Capstone Project

| File | Description |
|------|-------------|
| `capstone/capstone-instructions.md` | Full capstone project instructions: scenario, deliverables, timeline, and submission guidance |
| `capstone/capstone-rubric.md` | Evaluation rubric covering all capstone deliverables with scoring criteria |
| `capstone/capstone-submission-template.md` | Structured submission template with section prompts for each required deliverable |

## Resources

| File | Description |
|------|-------------|
| `resources/synthetic-schema.md` | Synthetic K-12 district database schema: DDL for all tables, sample data rows, domain descriptions, and relationship notes — used across all labs |
| `resources/sample-prompts.md` | Ready-to-use system prompt templates, user prompt structures, and grounding prompt patterns for the district analytics assistant |
| `resources/sample-user-questions.md` | Curated set of 60+ district analytics questions with role annotations, expected answer types, and relevant data domains — sorted by analytics type |
| `resources/architecture-patterns.md` | Reference architecture patterns: hybrid RAG, role-aware access, secure SQL Server integration, .NET orchestration; text-described diagrams |
| `resources/evaluation-rubric.md` | Answer quality rubric: factual grounding, citation completeness, confidence calibration, hallucination risk signals, privacy risk flags |
| `resources/governance-checklist.md` | Combined security, privacy, FERPA, responsible AI, and deployment governance checklist — usable as a pre-production gate |
| `resources/ferpa-reference.md` | FERPA basics for technical staff: what applies, what does not, key design implications for AI systems, directory information vs. education records |
| `resources/azure-services-reference.md` | Quick reference for all Azure AI services used in this course: purpose, relevant SKU tiers, pricing signals, key SDK packages, and primary documentation links |

## Templates

| File | Description |
|------|-------------|
| `templates/prompt-template.md` | Reusable system prompt and user prompt template structure with variable placeholders for user role, data scope, question, retrieved context, and grounding instructions |
| `templates/lab-report-template.md` | Lab observation and reflection template: objective, steps completed, output, issues encountered, security observations, and learnings |
| `templates/architecture-decision-record.md` | ADR (Architecture Decision Record) template for key decisions made during the course and capstone (e.g., RAG vs. fine-tuning, approved views vs. stored procedures) |

## Total File Count

| Category | Count |
|----------|-------|
| Course root | 4 |
| Week modules | 16 |
| Lab files | 16 |
| Week checklists | 8 |
| Capstone | 3 |
| Resources | 8 |
| Templates | 3 |
| **Total** | **58** |

## File Naming Conventions

- Module files: `module-NN-kebab-case-title.md`
- Lab files: `lab-NNa-kebab-case-title.md` (letter suffix for multiple labs per week)
- Checklists: `checklist-week-NN.md`
- Resources: descriptive kebab-case names
- Templates: descriptive kebab-case names

*Generate order: file-manifest.md → syllabus.md → Week 01 Module 01 → (await review) → remaining files in week order.*
