# Azure AI 80/20 Course — 8-Week Syllabus

**Course:** Azure AI for K-12 District Analytics (Secure AI Chat Assistant)  
**Audience:** Senior Systems Analysts and technical/data staff — Accountability & Data Management / Data Warehouse, Collier County Public Schools  
**Format:** 8-week self-paced  
**Estimated total time:** 40–56 hours (5–7 hours per week)  
**Prerequisites:** See `course-overview.md`

## Course Goal

By the end of this course, learners will be able to design, prototype, evaluate, and plan a secure Azure AI-based analytics/chat assistant that answers natural-language questions from teachers, school administrators, and district administrators using trusted in-house SQL Server data.

## Core Learning Outcomes

| # | Outcome |
|---|---------|
| 1 | Explain the Azure AI services most relevant to a secure district analytics/chat assistant |
| 2 | Design a secure hybrid architecture with Azure AI over in-house SQL Server |
| 3 | Choose integration patterns between Azure AI, .NET, Python, SQL Server, and the existing web reporting application |
| 4 | Build a realistic proof of concept for role-aware AI chat over synthetic K-12 data |
| 5 | Apply RAG, metadata catalogs, approved views, and semantic definitions for grounded answers |
| 6 | Evaluate answer quality, hallucination risk, privacy risk, cost, latency, and user trust |
| 7 | Apply FERPA-conscious privacy, security, governance, and responsible AI practices |
| 8 | Create a production-readiness plan with approval gates, audit controls, and human review workflows |

## Week-by-Week Overview

| Week | Theme | Modules | Key Outcome |
|------|-------|---------|-------------|
| 1 | Orientation and Azure AI Landscape | 01, 02 | Understand the target use case, 80/20 scope, and key Azure AI services |
| 2 | Azure OpenAI and Prompt Engineering | 03, 04 | Make authenticated OpenAI calls; design grounding-aware prompts |
| 3 | RAG and Azure AI Search | 05, 06 | Build a basic RAG pipeline with metadata retrieval |
| 4 | SQL Server Integration and Semantic Layers | 07, 08 | Implement safe SQL access patterns and metadata catalogs |
| 5 | .NET Backend and Python Prototyping | 09, 10 | Build a .NET API orchestration layer and Python prototype |
| 6 | Role-Aware Answers and Analytics Scenarios | 11, 12 | Scope answers by role; implement five analytics scenarios |
| 7 | Security, Privacy, FERPA, and Evaluation | 13, 14 | Conduct privacy review; build and run an evaluation test set |
| 8 | Monitoring, Governance, and Production Readiness | 15, 16 | Set up monitoring; complete the production-readiness checklist |
| — | Capstone | — | Design and prototype the full district AI chat assistant |

## Detailed Week-by-Week Syllabus

### Week 1 — Orientation, Azure AI Landscape, and the 80/20 Roadmap

**Theme:** Establish why this course is scoped the way it is, what the target system looks like, and what Azure AI services are in scope.

**Estimated time:** 5–6 hours

#### Module 01 — Course Orientation and the 80/20 Roadmap
**File:** `week-01/module-01-orientation-8020-roadmap.md`

| Item | Detail |
|------|--------|
| Time | ~2 hours |
| Type | Orientation + architecture preview |

**Learning Objectives:**
1. State the single target use case this course builds toward
2. Identify the 20% of Azure AI capabilities that deliver 80% of the proof-of-concept value
3. Describe the target architecture at a component level
4. Map existing district technical assets to Azure AI integration points
5. Explain the four constraints that drive all key design decisions

**Lab:** `lab-01a-environment-setup.md` — Provision Azure resource group and Azure OpenAI instance; install SDKs; connect to synthetic SQL Server database

#### Module 02 — Azure AI Services for District Analytics
**File:** `week-01/module-02-azure-ai-landscape.md`

| Item | Detail |
|------|--------|
| Time | ~2.5 hours |
| Type | Concept + decision mapping |

**Learning Objectives:**
1. Name each Azure AI service in scope and its role in the district assistant architecture
2. Distinguish Azure OpenAI, Azure AI Foundry, Azure AI Search, and Azure AI Content Safety by function
3. Explain how Entra ID, Managed Identities, and Key Vault secure the AI pipeline
4. Identify which Azure AI services are out of scope for this use case and why
5. State the primary pricing and governance considerations for each in-scope service

**Assessment:** Service mapping exercise — match each district assistant component to the Azure service that supports it

**Week 1 Deliverables:**
- [ ] Azure resource group provisioned
- [ ] Azure OpenAI resource created (or access confirmed)
- [ ] .NET and Python SDKs installed and tested
- [ ] Synthetic SQL Server database connected
- [ ] Service mapping exercise completed

### Week 2 — Azure OpenAI Fundamentals and Prompt Engineering

**Theme:** Understand how Azure OpenAI works as an enterprise service and design prompts that ground answers in approved data.

**Estimated time:** 6–7 hours

#### Module 03 — Azure OpenAI Fundamentals for Enterprise Chat
**File:** `week-02/module-03-azure-openai-fundamentals.md`

| Item | Detail |
|------|--------|
| Time | ~2.5 hours |
| Type | Concept + API mechanics |

**Learning Objectives:**
1. Explain the relationship between Azure OpenAI and the underlying model families (GPT-4o, GPT-4o-mini, embeddings)
2. Describe model deployments, API endpoints, and versioning in Azure OpenAI
3. Configure content filters and explain their role in district use cases
4. Authenticate to Azure OpenAI using Managed Identity and API key patterns
5. Interpret token counts, context windows, and their cost and performance implications

**Labs:** 
- `lab-02a-first-openai-call.md` — Authenticated calls from .NET and Python; inspect token usage

#### Module 04 — Prompt Engineering for Analytics Assistants
**File:** `week-02/module-04-prompt-engineering-analytics.md`

| Item | Detail |
|------|--------|
| Time | ~2.5 hours |
| Type | Concept + design + practice |

**Learning Objectives:**
1. Design a system prompt that constrains the assistant to grounded, role-appropriate district analytics answers
2. Apply few-shot examples to improve answer format and citation behavior
3. Use chain-of-thought structuring to improve diagnostic answer quality
4. Implement grounding instructions that prevent hallucinated data values
5. Design prompt structures that support structured JSON output for downstream processing

**Labs:**
- `lab-02b-prompt-engineering.md` — Design and test system prompts against 10 synthetic district questions

**Assessment:** Submit a system prompt with rationale explaining each design choice

**Week 2 Deliverables:**
- [ ] Authenticated Azure OpenAI calls working from .NET and Python
- [ ] System prompt v1 designed and tested
- [ ] Token usage understood and documented
- [ ] Prompt engineering lab completed with 10 test questions

### Week 3 — Retrieval-Augmented Generation and Azure AI Search

**Theme:** Build the retrieval layer that grounds the assistant's answers in approved district metadata and documentation.

**Estimated time:** 6–7 hours

#### Module 05 — RAG Architecture for District Data
**File:** `week-03/module-05-rag-architecture.md`

| Item | Detail |
|------|--------|
| Time | ~2.5 hours |
| Type | Architecture + design patterns |

**Learning Objectives:**
1. Explain why RAG is the correct architecture for district analytics over in-house SQL Server data
2. Describe the RAG pipeline stages: query → retrieve → augment → generate → cite
3. Choose appropriate chunking strategies for district metadata, business definitions, and documentation
4. Select embedding models available in Azure OpenAI and explain their tradeoffs for this use case
5. Identify the top RAG failure modes and how to detect them in district answers

#### Module 06 — Azure AI Search for Knowledge and Metadata Retrieval
**File:** `week-03/module-06-azure-ai-search.md`

| Item | Detail |
|------|--------|
| Time | ~2.5 hours |
| Type | Service deep-dive + integration |

**Learning Objectives:**
1. Create an Azure AI Search index suitable for district metadata
2. Configure semantic ranking for improved relevance on district analytics queries
3. Implement hybrid search (keyword + vector) and explain when each mode helps
4. Apply security trimming to restrict retrieval results by user role
5. Integrate Azure AI Search into a .NET service layer

**Labs:**
- `lab-03a-ai-search-index.md` — Build the metadata index
- `lab-03b-rag-pipeline.md` — Connect retrieval to Azure OpenAI generation

**Assessment:** Compare grounded vs. ungrounded answers for three representative district questions; document the difference

**Week 3 Deliverables:**
- [ ] Azure AI Search index created and populated with synthetic metadata
- [ ] Basic RAG pipeline functional end-to-end
- [ ] Grounded vs. ungrounded comparison documented
- [ ] RAG failure modes identified and noted

### Week 4 — SQL Server Integration and Semantic Layers

**Theme:** Design safe, auditable data access patterns that the AI assistant can use without exposing production SQL Server to unrestricted query generation.

**Estimated time:** 6–7 hours

#### Module 07 — SQL Server Integration Patterns
**File:** `week-04/module-07-sql-server-integration.md`

| Item | Detail |
|------|--------|
| Time | ~2.5 hours |
| Type | Architecture + implementation patterns |

**Learning Objectives:**
1. Explain why unrestricted AI-generated SQL is inappropriate for production district databases
2. Design an approved view catalog that covers the district's primary analytics domains
3. Implement row-level security patterns for teacher vs. school vs. district scope
4. Configure a read-only service account with least-privilege access
5. Implement query audit logging at the SQL and application layers

#### Module 08 — Metadata Catalogs and Semantic Layers
**File:** `week-04/module-08-metadata-semantic-layer.md`

| Item | Detail |
|------|--------|
| Time | ~2.5 hours |
| Type | Design + catalog construction |

**Learning Objectives:**
1. Explain the role of a metadata catalog in connecting natural-language questions to correct SQL views
2. Design a business definition catalog entry format for K-12 analytics domains
3. Describe how semantic layers allow the AI to select the correct query without writing raw SQL
4. Build a catalog entry for each major synthetic data domain
5. Index catalog entries in Azure AI Search and test retrieval accuracy

**Labs:**
- `lab-04a-approved-views.md` — Create approved views and stored procedures; configure read-only account
- `lab-04b-metadata-catalog.md` — Build and index the metadata catalog

**Assessment:** Design a data access strategy document describing how each district analytics question type is handled safely

**Week 4 Deliverables:**
- [ ] Approved views created on synthetic schema for all major domains
- [ ] Read-only service account configured and tested
- [ ] Row-level security validated for teacher/school/district scope
- [ ] Metadata catalog built and indexed in AI Search
- [ ] Data access strategy document completed

### Week 5 — .NET Backend Integration and Python Prototyping

**Theme:** Build the application-layer orchestration that connects users, the AI pipeline, and the district data tier.

**Estimated time:** 6–7 hours

#### Module 09 — .NET Backend Integration
**File:** `week-05/module-09-dotnet-backend-integration.md`

| Item | Detail |
|------|--------|
| Time | ~2.5 hours |
| Type | Implementation + architecture |

**Learning Objectives:**
1. Structure a .NET 8 minimal API project for AI chat orchestration
2. Use the Azure.AI.OpenAI SDK for chat completion and embeddings
3. Use the Azure.Search.Documents SDK for metadata retrieval
4. Access SQL Server views through a service data layer using Dapper or EF Core
5. Configure Managed Identity authentication and Key Vault secret references in a .NET service

#### Module 10 — Python Prototyping Workflows
**File:** `week-05/module-10-python-prototyping.md`

| Item | Detail |
|------|--------|
| Time | ~2 hours |
| Type | Prototyping + evaluation tooling |

**Learning Objectives:**
1. Use the openai Python SDK to call Azure OpenAI for chat and embeddings
2. Query the synthetic SQL Server database from Python using pyodbc
3. Assemble a basic RAG loop in a Jupyter notebook for rapid experimentation
4. Use Python for evaluation scripts that score answer grounding against expected values
5. Identify which tasks belong in Python prototyping vs. .NET production code

**Labs:**
- `lab-05a-dotnet-api.md` — Full .NET RAG orchestration endpoint
- `lab-05b-python-prototype.md` — Python notebook RAG prototype

**Assessment:** Working .NET API endpoint that returns a grounded district analytics answer with citations and role scope

**Week 5 Deliverables:**
- [ ] .NET API endpoint returning grounded, cited answers
- [ ] Python prototype notebook running the same RAG flow
- [ ] Managed Identity authentication working in .NET
- [ ] Key Vault secret access confirmed
- [ ] SQL Server views accessed through data layer (not raw generated SQL)

### Week 6 — Role-Aware Answers and Analytics Scenarios

**Theme:** Implement role-specific answer scoping and validate the assistant against realistic K-12 analytics scenarios.

**Estimated time:** 6–7 hours

#### Module 11 — Role-Aware Access Control and Answer Scoping
**File:** `week-06/module-11-role-aware-access-control.md`

| Item | Detail |
|------|--------|
| Time | ~2.5 hours |
| Type | Design + implementation |

**Learning Objectives:**
1. Implement user role injection into the orchestration context at the API layer
2. Map user roles to approved views and row-level security filters
3. Design system prompt clauses that enforce role-appropriate answer scope
4. Prevent privilege escalation through prompt injection attacks
5. Verify that teacher-scoped answers never return data outside the teacher's assigned students/school

#### Module 12 — Assessment Analytics and Performance Analysis Scenarios
**File:** `week-06/module-12-assessment-analytics.md`

| Item | Detail |
|------|--------|
| Time | ~2.5 hours |
| Type | Analytics design + answer classification |

**Learning Objectives:**
1. Classify district analytics questions as descriptive, diagnostic, predictive, or recommendation types
2. Design answers that distinguish factual metrics from diagnostic hypotheses from recommendations
3. Implement attendance, assessment, subgroup gap, longitudinal trend, and data quality warning scenarios
4. Apply citation requirements to computed metrics (cite the source view and time period)
5. Structure diagnostic responses that avoid unsupported causal claims

**Labs:**
- `lab-06a-role-aware-demo.md` — Same question, three roles, three scoped answers
- `lab-06b-analytics-scenarios.md` — Five end-to-end analytics scenarios with answer classification

**Assessment:** Demonstrate the role-aware demo and annotate each answer with its type and grounding source

**Week 6 Deliverables:**
- [ ] Role-aware answer scoping implemented and verified
- [ ] Privilege escalation test cases passed
- [ ] Five analytics scenarios implemented end-to-end
- [ ] All answers annotated by type and grounding source
- [ ] Data quality warning scenario working

### Week 7 — Security, Privacy, FERPA, and Evaluation

**Theme:** Formally evaluate the prototype against privacy requirements and answer quality standards.

**Estimated time:** 6–7 hours

#### Module 13 — Security, Privacy, FERPA-Conscious Design, and Responsible AI
**File:** `week-07/module-13-security-privacy-ferpa.md`

| Item | Detail |
|------|--------|
| Time | ~2.5 hours |
| Type | Governance + review |

**Learning Objectives:**
1. Identify FERPA requirements that apply to AI systems accessing student education records
2. Apply data minimization to the retrieval pipeline (retrieve only what is needed for the answer)
3. Implement prompt-injection defenses at the API layer and in the system prompt
4. Configure Azure AI Content Safety for appropriate filtering in a district context
5. Design an acceptable-use policy framework for the district AI assistant

#### Module 14 — Evaluation, Hallucination Testing, and Answer Quality
**File:** `week-07/module-14-evaluation-hallucination-safety.md`

| Item | Detail |
|------|--------|
| Time | ~2.5 hours |
| Type | Evaluation + measurement |

**Learning Objectives:**
1. Build a structured evaluation test set covering all district answer types and roles
2. Define hallucination for the district analytics context (fabricated metrics, invented student data, unsupported trends)
3. Score answers on the five-dimension answer quality rubric
4. Identify the top failure modes found in the prototype
5. Document required mitigations and re-test criteria

**Labs:**
- `lab-07a-ferpa-review.md` — Structured FERPA and privacy review of the RAG pipeline
- `lab-07b-evaluation-test-set.md` — Build and run a 20-question evaluation test set

**Assessment:** Submit FERPA review findings and evaluation test set results with failure mode analysis

**Week 7 Deliverables:**
- [ ] FERPA review completed with documented findings
- [ ] 20-question evaluation test set built and executed
- [ ] Answer quality scores recorded for each test question
- [ ] Top failure modes identified and mitigations proposed
- [ ] Content Safety integration tested

### Week 8 — Monitoring, Governance, and Production Readiness

**Theme:** Prepare the prototype for stakeholder review and production pathway planning.

**Estimated time:** 5–6 hours

#### Module 15 — Monitoring, Logging, Auditability, and Human Review
**File:** `week-08/module-15-monitoring-governance.md`

| Item | Detail |
|------|--------|
| Time | ~2 hours |
| Type | Operations + governance |

**Learning Objectives:**
1. Implement structured audit logging for prompts, retrieved data, responses, and user roles
2. Configure Azure Monitor and Application Insights for the AI pipeline
3. Define token usage, latency, and cost baselines and alert thresholds
4. Design a human review workflow for high-stakes or flagged answers
5. Define responsible AI governance requirements for the district assistant

#### Module 16 — Proof of Concept to Production Roadmap
**File:** `week-08/module-16-poc-to-production.md`

| Item | Detail |
|------|--------|
| Time | ~2 hours |
| Type | Planning + governance |

**Learning Objectives:**
1. Identify the approval gates required before moving from POC to pilot
2. Design a phased rollout plan (internal tech team → select staff → broader rollout)
3. Estimate Azure AI costs for the district assistant at pilot and production scale
4. Define the maintenance, model versioning, and deprecation plan
5. Specify the minimum stakeholder sign-off requirements for the district context

**Labs:**
- `lab-08a-monitoring-setup.md` — Configure monitoring and audit logging
- `lab-08b-production-checklist.md` — Complete the production-readiness checklist

**Assessment:** Submit the production-readiness checklist with all items addressed or formally deferred with justification

**Week 8 Deliverables:**
- [ ] Azure Monitor and Application Insights configured
- [ ] Structured audit logging implemented and verified
- [ ] Cost estimate completed for pilot and production scenarios
- [ ] Production-readiness checklist completed
- [ ] POC-to-production roadmap document drafted

## Capstone Project

**File:** `capstone/capstone-instructions.md`  
**Estimated time:** 10–12 hours (concurrent with or following Week 8)

The capstone requires learners to design and prototype a complete, secure Azure AI chat assistant for district analytics using the synthetic K-12 database and the patterns from all eight weeks.

### Capstone Deliverables

| Deliverable | Description |
|-------------|-------------|
| Architecture proposal | Component diagram with data flow, security boundaries, and service roles |
| Data access strategy | Approved views catalog, row-level security approach, service account design |
| Metadata/semantic layer design | Catalog structure, indexing strategy, retrieval design |
| RAG approach document | Chunking strategy, embedding choice, retrieval pipeline, grounding strategy |
| .NET API implementation | Working orchestration endpoint with role-aware answers |
| Python prototype (optional) | Notebook prototype for additional scenarios or evaluation |
| Prompt templates | System prompt and user prompt templates with variable documentation |
| Evaluation test set | 20-question test set with scores and failure mode analysis |
| Security/governance checklist | Completed governance checklist with all items addressed |
| Cost estimate | Token usage model, AI Search query estimate, total monthly cost at pilot scale |
| Rollout plan | Phased rollout with approval gates and stakeholder sign-off requirements |
| Demo script | Role-aware answer demonstration for teacher, school admin, district admin |

## Assessment Summary

| Week | Assessment Type | Description |
|------|----------------|-------------|
| 1 | Exercise | Azure AI service mapping exercise |
| 2 | Submission | System prompt v1 with design rationale |
| 3 | Comparison | Grounded vs. ungrounded answer comparison document |
| 4 | Document | Data access strategy document |
| 5 | Demonstration | Working .NET API endpoint with grounded, cited answers |
| 6 | Demonstration | Role-aware demo + five annotated analytics scenarios |
| 7 | Submission | FERPA review report + evaluation test set results |
| 8 | Submission | Production-readiness checklist + rollout roadmap |
| Capstone | Full submission | All capstone deliverables per rubric |

## Time Estimates by Week

| Week | Modules | Labs | Assessment | Total |
|------|---------|------|------------|-------|
| 1 | 2.5 hr | 1.5 hr | 0.5 hr | ~5–6 hr |
| 2 | 2.5 hr | 2.0 hr | 1.0 hr | ~6–7 hr |
| 3 | 2.5 hr | 2.5 hr | 0.5 hr | ~6–7 hr |
| 4 | 2.5 hr | 2.5 hr | 1.0 hr | ~6–7 hr |
| 5 | 2.5 hr | 2.5 hr | 1.0 hr | ~6–7 hr |
| 6 | 2.5 hr | 2.5 hr | 0.5 hr | ~6–7 hr |
| 7 | 2.5 hr | 2.5 hr | 1.0 hr | ~6–7 hr |
| 8 | 2.0 hr | 2.0 hr | 1.0 hr | ~5–6 hr |
| Capstone | — | — | — | ~10–12 hr |
| **Total** | | | | **~52–65 hr** |

## Prerequisites

**Required knowledge (learners are expected to have these already):**
- SQL Server: writing queries, understanding schemas, basic stored procedures and views
- Data warehouse concepts: fact/dimension tables, ETL, reporting layers
- .NET fundamentals: ability to read and modify C# code, understand API patterns
- Azure basics: resource groups, subscriptions, portal navigation
- K-12 district data familiarity: student, enrollment, attendance, assessment domains

**Helpful but not required:**
- Python (used for prototyping labs; Python notebooks are provided with annotations)
- Azure Active Directory / Entra ID (concepts are introduced in the course)
- REST API design (helpful for Week 5 but explained in context)

**Not required:**
- Machine learning theory
- Azure AI certifications
- Prior experience with Azure OpenAI, AI Search, or AI Foundry

## Tools and Access Required

| Tool / Service | Purpose | Notes |
|----------------|---------|-------|
| Azure subscription | All Azure resource provisioning | Dev/sandbox subscription strongly preferred |
| Azure OpenAI resource | GPT-4o or GPT-4o-mini deployment + embeddings | Requires access request if not already approved |
| Azure AI Search | Metadata retrieval index | Basic or Standard tier |
| SQL Server (local or Azure SQL) | Synthetic K-12 database | Express edition sufficient for labs |
| .NET 10 SDK | Backend API labs (primary target; .NET 8 compatible) | `dotnet --version` ≥ 10.0 (or ≥ 8.0 for .NET 8 path; .NET 6 is EOL) |
| Python 3.11+ | Prototyping labs | `pip install openai pyodbc pandas` |
| Azure CLI | Resource management | `az --version` ≥ 2.55 |
| VS Code or Visual Studio | IDE for labs | Extensions: C#, Python, REST Client |

*For questions about prerequisites or access, review `course-overview.md` and `week-01/lab-01a-environment-setup.md` before the first week.*
