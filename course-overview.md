# Course Overview: Azure AI for K-12 Data Teams

## What This Course Is

An 8-week, self-paced course for district technical and data teams. The goal is to equip you to design, evaluate, and prototype a secure Azure AI analytics assistant that answers natural-language questions from teachers and school administrators using your district's existing SQL Server data — without exposing individual student records.

This is a practitioner course. Every module teaches a concept, every lab applies it. By Week 8 you will have working code, a governance checklist, an evaluation test set, and a production readiness checklist.

---

## Who This Is For

- District technology staff who manage data systems or build internal tools
- Data analysts and BI developers who work with SQL Server and reporting
- IT architects evaluating Azure AI for district use
- Senior technical staff who will own or govern an AI system for the district

You should have some experience with SQL, basic programming in .NET or Python, and familiarity with REST APIs. You do not need prior AI or machine learning experience.

---

## What You Will Build

A RAG (Retrieval-Augmented Generation) pipeline that:
1. Accepts a natural-language question from a user (teacher, school admin, district admin)
2. Identifies which pre-approved SQL view can answer it (via Azure AI Search hybrid search)
3. Queries the SQL view with user-scoped parameters (no individual student data)
4. Sends the aggregate results to Azure OpenAI to generate a plain-English answer
5. Returns the answer with a source citation and a groundedness flag

The system enforces three independent layers of access control: authentication (Entra ID JWT), metadata filtering (AI Search role pre-filter), and SQL scoping (parameterized WHERE clauses tied to verified JWT claims).

---

## The Synthetic District

All labs use data from the **Sunlake Unified School District (SUSD)** — a fully synthetic K-12 district generated with a fixed random seed (seed=42). No real student data is used anywhere in this course.

- District: Sunlake Unified School District
- Schools: SCH001 = Sunlake Elementary, SCH002 = Riverside Middle School, SCH003 = Lakeside High School
- Data: Attendance, assessments, enrollment — all synthetic

---

## The 80/20 Principle

The course applies the 80/20 principle throughout: 20% of the concepts produce 80% of the security and quality value. The highest-leverage topics — FERPA controls, three-layer access control, approved view catalog, evaluation framework — receive the deepest coverage. Lower-leverage topics (e.g., fine-tuning, advanced orchestration) are out of scope.

---

## Course Structure

### Week 1 — Foundations
- Module 01: Why AI for K-12 Analytics (use case framing, FERPA constraints)
- Module 02: Azure OpenAI and the RAG Pattern (architecture overview)
- Lab 01a: Environment Setup
- Lab 01b: First Completion — Hello, District Data

### Week 2 — The Data Layer
- Module 03: SQL Server as the Data Foundation (approved view catalog, ai_svc_readonly)
- Module 04: Approved View Catalog Design (9 views, small cell suppression)
- Lab 02a: SQL View Setup and Permission Configuration
- Lab 02b: Synthetic Data Generation

### Week 3 — Semantic Search
- Module 05: Azure AI Search and Semantic Retrieval (hybrid search, BM25 + vector, RRF)
- Module 06: Metadata Documents and the Pre-filter Pattern
- Lab 03a: AI Search Index Setup
- Lab 03b: Hybrid Search and Metadata Filtering

### Week 4 — Access Control
- Module 07: Authentication with Entra ID (JWT validation, UserContext from claims only)
- Module 08: Three-Layer Access Control (authentication, metadata filter, SQL scope)
- Lab 04a: Entra ID App Registration and JWT Claims
- Lab 04b: ViewRegistry and Three-Layer Access Control

### Week 5 — The RAG Pipeline
- Module 09: Building the RAG Pipeline (.NET 10, ViewRegistry dispatch, DefaultAzureCredential)
- Module 10: Prompt Engineering for K-12 Analytics (system prompt rules, decline templates)
- Lab 05a: End-to-End RAG Pipeline (C#)
- Lab 05b: RAG Pipeline in Python

### Week 6 — Advanced Retrieval
- Module 11: Advanced Search Patterns (re-ranking, score thresholds, empty results)
- Module 12: Parameterized SQL and Scope Safety (IN-clause pattern, @SId0/@SId1)
- Lab 06a: Score Thresholds and Fallback Behavior
- Lab 06b: Parameterized SQL with Section Scoping

### Week 7 — Security, Evaluation, and Privacy
- Module 13: Security, Privacy, and FERPA (full FERPA controls review, risk categories)
- Module 14: Evaluation and Hallucination Safety (four-dimension framework, test set design)
- Lab 07a: FERPA Compliance Review
- Lab 07b: Building the Evaluation Test Set

### Week 8 — Production Readiness
- Module 15: Monitoring and Governance (OpenTelemetry, PipelineTelemetry, Azure Monitor)
- Module 16: POC to Production (managed identity, private endpoints, phased rollout)
- Lab 08a: Monitoring Setup
- Lab 08b: Production Readiness Checklist

### Capstone
Design, implement, evaluate, and document a new capability extension (one of four options) and produce a three-document stakeholder package.

---

## Technology Stack

| Component | Technology | Notes |
|---|---|---|
| AI service | Azure OpenAI (gpt-4o-mini, text-embedding-3-small) | Hosted in your Azure subscription |
| Search | Azure AI Search | Hybrid search with semantic ranking |
| Data | SQL Server (on-premises or Azure SQL) | Views only; no base table access from AI |
| Backend (.NET) | .NET 10 (primary), .NET 8 (compatible) | C# with Azure SDK |
| Backend (Python) | Python 3.11+ | OpenAI SDK, azure-search-documents |
| Identity | Microsoft Entra ID | JWT validation, app roles, custom claims |
| Monitoring | OpenTelemetry + Azure Monitor | Application Insights, Log Analytics |
| Secrets | Azure Key Vault | POC; production uses managed identity |

**.NET 6 is end of life and is not used in this course.** If your district is running .NET 6, use the .NET 8 compatible variants and prioritize upgrading.

---

## Security and Privacy Commitments

These constraints are enforced throughout the course and must be maintained in all labs and the capstone:

1. **No real student data.** All labs use synthetic SUSD data (seed=42).
2. **No individual student data in LLM prompts.** The approved view catalog contains only aggregate views.
3. **No unrestricted SQL.** The AI selects from pre-approved views only. Direct LLM-generated SQL is not part of the production architecture.
4. **Least-privilege service account.** `ai_svc_readonly` has SELECT on views only; DENY on all base tables.
5. **Role-based access at the data layer.** SQL WHERE clauses enforce scope; the UI cannot override them.
6. **Claims from the token only.** `UserContext` is built from validated JWT claims, never from the request body.
7. **Audit trail without PII.** Query logs record role/school/view/tokens/latency — not question or answer text.
8. **Small cell suppression.** Any subgroup with fewer than 10 students is suppressed in the SQL view itself.

---

## Evaluation Philosophy

The course teaches a four-dimension evaluation framework. All four dimensions must pass before production:

| Dimension | Threshold |
|---|---|
| Groundedness | ≥ 0.85 |
| Factual Accuracy | ≥ 0.90 |
| Scope Safety | 1.00 (non-negotiable) |
| Response Quality | ≥ 0.80 |

Scope Safety — the system never returns data the user is not authorized to see — is treated as a binary gate. Any violation blocks production deployment.

---

## What This Course Does Not Cover

- Fine-tuning or training custom models
- Power BI or other BI visualization tools
- Full migration of SQL Server to Azure SQL
- SSIS/ETL pipeline design
- Natural language to SQL (Text-to-SQL) against production databases
- LLM orchestration frameworks (LangChain, Semantic Kernel) — these are valid but outside the 8-week scope

---

## Getting Started

See `README.md` for environment setup instructions.

See `syllabus.md` for detailed week-by-week schedule, prerequisite check, and time estimates.

Start with `week-01/module-01-intro.md`.
