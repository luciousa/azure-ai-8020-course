# Week 01 Completion Checklist

**Week:** 1 — Orientation, Azure AI Landscape, and the 80/20 Roadmap  
**Modules:** 01, 02 | **Lab:** 01a

## Module 01 — Orientation and 80/20 Roadmap

- [ ] Read Module 01 in full
- [ ] Can explain the 80/20 principle as applied to this course (in your own words)
- [ ] Can name the four technical constraints that define the district's use case
- [ ] Can trace a question from a teacher through the full architecture to the answer
- [ ] Can explain why RAG is preferred over fine-tuning for this use case
- [ ] Can explain why AI-generated SQL against production tables is not allowed
- [ ] Completed the Module 01 reflection questions
- [ ] Completed the Module 01 assessment task (architecture diagram or table)

## Module 02 — Azure AI Landscape

- [ ] Read Module 02 in full
- [ ] Can name the five core Azure AI services in scope for this course
- [ ] Can name at least five Azure AI services that are out of scope and explain why
- [ ] Can describe the role of Managed Identity vs. API keys
- [ ] Can draw (or describe in text) how Entra ID, Key Vault, AI Search, and Azure OpenAI connect
- [ ] Can list the three infrastructure services required for every production AI deployment
- [ ] Completed the Module 02 reflection questions
- [ ] Completed the Module 02 assessment task

## Lab 01a — Environment Setup

- [ ] Azure resource group created (`rg-susd-ai-poc`)
- [ ] Azure OpenAI provisioned with `gpt-4o-mini` deployment
- [ ] Azure OpenAI `text-embedding-3-small` deployment created
- [ ] Azure AI Search provisioned (Basic tier)
- [ ] Azure Key Vault provisioned (optional for POC, required for production)
- [ ] `.env.local` created and populated
- [ ] `.env.local` added to `.gitignore`
- [ ] .NET 10 (or .NET 8) SDK installed — `dotnet --version` returns expected version
- [ ] .NET lab project created, `dotnet build` succeeds
- [ ] Python 3.11+ installed
- [ ] Python virtual environment created and activated
- [ ] All Python packages installed
- [ ] `SunlakeUnifiedDW` SQL Server database created
- [ ] All dimension and fact tables created (see `resources/synthetic-schema.md`)
- [ ] `dim_Date` populated for 2022–2026
- [ ] Synthetic data generation script executed successfully
- [ ] All 9 approved views created
- [ ] .NET connectivity check: Azure OpenAI ✅ | AI Search ✅ | SQL Server ✅
- [ ] Python connectivity check: Azure OpenAI ✅ | AI Search ✅ | SQL Server ✅
- [ ] Lab report started using `templates/lab-report-template.md`

## Week 01 Knowledge Check

Answer the following without looking at notes. If you cannot answer confidently, re-read the referenced module before proceeding to Week 02.

1. **(Module 01)** What is the "approved view catalog" and why does it exist?
2. **(Module 01)** Name one scenario where a teacher's question is in scope and one where it is out of scope.
3. **(Module 02)** What Azure service stores and retrieves the metadata layer?
4. **(Module 02)** Why is `DefaultAzureCredential` preferred over hardcoded API keys in production code?
5. **(Lab 01a)** What would happen if the `svc_ai_reader` service account had `SELECT` permission on `dim_Student` directly instead of only on the approved views?

## Time Log (Optional)

| Activity | Estimated | Actual |
|----------|-----------|--------|
| Module 01 | 1.5 hrs | |
| Module 02 | 2.5 hrs | |
| Lab 01a | 3.5 hrs | |
| **Total** | **7.5 hrs** | |

*When all items above are checked, proceed to Week 02.*
