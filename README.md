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
git clone <repo-url>
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

Run the SQL scripts in `week-02/lab-02b-synthetic-data.md` to create and populate the synthetic Sunlake Unified School District database.

### 4. Start Week 1

Open `week-01/module-01-intro.md` and work through the modules in order.

---

## Folder Structure

```
azure-ai-8020-course/
├── README.md                        ← you are here
├── course-overview.md               ← full course description
├── syllabus.md                      ← week-by-week schedule
├── file-manifest.md                 ← complete file listing
│
├── week-01/                         ← Foundations
│   ├── module-01-intro.md
│   ├── module-02-azure-openai-rag.md
│   ├── lab-01a-setup.md
│   ├── lab-01b-first-completion.md
│   └── checklist-week-01.md
│
├── week-02/                         ← Data Layer
├── week-03/                         ← Semantic Search
├── week-04/                         ← Access Control
├── week-05/                         ← RAG Pipeline
├── week-06/                         ← Advanced Retrieval
├── week-07/                         ← Security and Evaluation
├── week-08/                         ← Production Readiness
│
├── capstone/
│   ├── capstone-instructions.md
│   ├── capstone-rubric.md
│   └── capstone-submission-template.md
│
├── resources/
│   ├── architecture-patterns.md     ← 10 key patterns with code
│   ├── azure-services-reference.md  ← Azure service configuration notes
│   ├── evaluation-rubric.md         ← Four-dimension scoring reference
│   ├── ferpa-reference.md           ← FERPA quick reference for AI systems
│   ├── governance-checklist.md      ← Full lifecycle governance checklist
│   ├── sample-prompts.md            ← System prompt templates and variants
│   └── sample-user-questions.md     ← Questions by role with demo script
│
└── templates/
    ├── architecture-decision-record.md
    ├── lab-report-template.md
    └── prompt-template.md
```

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
