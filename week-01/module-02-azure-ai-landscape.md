# Module 02 — Azure AI Landscape for District Analytics

**Week:** 1 | **Estimated time:** 2–3 hours  
**Prerequisites:** Module 01 complete  
**Builds toward:** Lab 01a (environment setup), all subsequent modules

## Learning Objectives

By the end of this module you will be able to:

1. Name the five Azure AI services that matter most for the district analytics assistant use case and explain what each one does.
2. Identify which services to skip and why, given this specific use case.
3. Describe how the services fit together in the target architecture.
4. Explain the role of Microsoft Entra ID, Azure Key Vault, and private networking in a FERPA-conscious deployment.
5. Know where to find authoritative documentation for each service.

## The Landscape Problem

Azure has dozens of AI-related services. If you search "Azure AI" you will find Azure AI Studio, Azure AI Foundry, Azure Machine Learning, Azure Cognitive Services, Azure Applied AI Services, Azure OpenAI Service, Azure AI Search, Azure AI Vision, Azure AI Speech, Azure AI Language, Azure AI Content Safety, Copilot Studio, Azure Bot Service, Azure Document Intelligence, Azure AI Video Indexer, Azure Metrics Advisor, and more.

**This course covers exactly five services** for the analytics assistant use case, plus three infrastructure services every production AI system needs. Everything else is out of scope — not because the other services are unimportant, but because they are not on the critical path for what you are building.

## The Five Core AI Services

### 1. Azure OpenAI Service

**What it is:** Microsoft's managed deployment of OpenAI models (GPT-4o, GPT-4o-mini, GPT-4, text-embedding-3-small, and others) running inside Azure's compliance boundary.

**Why it matters for this use case:**
- Generates natural-language answers from retrieved context.
- Runs on Azure infrastructure, so data does not leave your Azure tenant.
- Supports FERPA-relevant data processing agreements (check your district's BAA/DPA with Microsoft).
- Content filtering built in — all requests pass through Azure AI Content Safety by default.

**Key concepts for this course:**
- **Deployment vs. model:** You create a *deployment* (a named endpoint) from a model. A model name like `gpt-4o` is not a usable endpoint; a deployment named `gpt4o-prod` is.
- **API endpoint format:** `https://<resource-name>.openai.azure.com/openai/deployments/<deployment-name>/chat/completions?api-version=<version>`
- **Token budget:** Every model has a context window (input + output tokens). GPT-4o supports up to 128k input tokens. Retrieved context + system prompt + user question + expected response must fit.
- **Two model families for this course:**
  - Chat completions: `gpt-4o`, `gpt-4o-mini` — for generating answers.
  - Embeddings: `text-embedding-3-small` — for converting text into vectors for semantic search.

**.NET SDK:** `Azure.AI.OpenAI` (version 2.x for .NET 10/8)  
**Python SDK:** `openai` (with Azure-specific configuration)

### 2. Azure AI Search

**What it is:** Azure's managed search service with full-text, vector, and hybrid (combined) search capabilities. Formerly called "Azure Cognitive Search."

**Why it matters for this use case:**
- Stores and searches the *metadata layer* — business definitions, data dictionary entries, the approved view catalog, and domain knowledge.
- Returns the most relevant metadata chunks to include as context in the LLM prompt.
- Supports *semantic ranking* — a secondary AI model that re-ranks results for relevance.
- Supports *security trimming* — filtering results based on the authenticated user's permissions.

**Key concepts for this course:**
- **Index:** A collection of documents with defined fields. One index per domain (e.g., `district-metadata-index`).
- **Vector search:** Documents are stored as embedding vectors; queries are converted to vectors and the closest vectors are retrieved. Requires an embedding model.
- **Hybrid search:** Combines keyword (BM25) retrieval with vector retrieval. Outperforms either alone.
- **Semantic ranker:** An additional re-ranking step using a language model. Improves precision.
- **Chunking strategy:** How you split documents before indexing affects retrieval quality. For the metadata catalog, one entry per chunk is typical.

**.NET SDK:** `Azure.Search.Documents` (version 11.x)  
**Python SDK:** `azure-search-documents`

### 3. Azure AI Foundry (formerly Azure AI Studio)

**What it is:** Microsoft's unified AI development platform — an umbrella that provides model management, evaluation tooling, prompt flow orchestration, and responsible AI governance tools.

**Why it matters for this use case:**
- **Model catalog:** Where you browse and deploy Azure OpenAI models.
- **Evaluation tooling:** Built-in evaluation metrics for groundedness, relevance, fluency, and harm risk — important for your hallucination testing in Week 7.
- **Prompt flow:** A visual or code-based way to define retrieval + generation pipelines (optional — you will build your own pipeline in .NET/Python, but Prompt Flow is useful for rapid prototyping evaluation).
- **Responsible AI dashboard:** Tracks content safety metrics, identifies failure patterns, and supports governance documentation.

**What to know for this course:**
- You will use Foundry primarily via the Azure portal for model deployment and evaluation review.
- You will not build production orchestration in Prompt Flow — that runs in your .NET API.
- The `azure-ai-evaluation` Python SDK can be used in evaluation scripts (Week 7) without the full Foundry portal.

### 4. Azure AI Content Safety

**What it is:** Azure's content moderation service that analyzes text (and images) for harmful content across multiple categories: violence, hate, sexual content, self-harm.

**Why it matters for this use case:**
- Applied to both user *input* (the question) and AI-generated *output* (the answer).
- Catches attempts to jailbreak the assistant, extract student data through prompt injection, or elicit inappropriate content.
- Required by responsible AI policy before exposing any AI system to district staff.
- Built into Azure OpenAI content filtering; optionally called explicitly for additional control.

**Key concepts for this course:**
- **Content filters are on by default** in Azure OpenAI deployments. You can configure severity thresholds.
- For most lab scenarios, the built-in filters are sufficient. For production, configure a *content filter policy* tailored to your district's use case.
- Explicit Content Safety SDK calls add latency (~50–200ms) — factor this into your performance budget.

**.NET SDK:** `Azure.AI.ContentSafety`  
**Python SDK:** `azure-ai-contentsafety`

### 5. Azure AI Search (also covers Embedding Generation)

> See #2 above. Embeddings are generated using Azure OpenAI's `text-embedding-3-small` deployment and stored in the AI Search index's vector fields. The embedding model bridges Azure OpenAI and Azure AI Search.

## Three Infrastructure Services (Non-Negotiable)

These are not AI services — they are the security and operational foundation every production AI system must have.

### Microsoft Entra ID (formerly Azure Active Directory)

**What it does:** Identity and access management. Controls who can access which Azure resources and with what permissions.

**How it appears in this course:**
- **Managed Identities:** Your .NET API runs as a service principal with a managed identity. It authenticates to Azure OpenAI, AI Search, and Key Vault *without any stored secrets*. No connection strings in code or config files.
- **Role-Based Access Control (RBAC):** Grant your managed identity only the roles it needs (e.g., `Cognitive Services OpenAI User`, `Search Index Data Reader`). Deny everything else.
- **User roles for the chat assistant:** District staff authenticate through Entra ID. Their role (teacher, school admin, district admin) determines what data scope is injected into the AI prompt.

**Critical rule:** Never use API keys in production. Always use managed identities with RBAC.

### Azure Key Vault

**What it does:** Secure storage for secrets, certificates, and connection strings.

**How it appears in this course:**
- Stores SQL Server connection string (for non-managed-identity SQL connections).
- Stores any third-party API keys.
- Provides access logging — every secret access is auditable.
- Integrated with Managed Identity: your application's managed identity is granted `Key Vault Secrets User` role; no password needed.

**What NOT to do:**
- Do not store Key Vault URIs in code. Store them in environment variables or app configuration.
- Do not store Azure OpenAI API keys in Key Vault if you can use managed identity — eliminate the secret entirely.

### Azure Networking (Private Endpoints / VNet Integration)

**What it does:** Controls network-level access to Azure services.

**How it appears in this course:**
- **Labs:** Public endpoints are used for simplicity. This is explicitly a POC configuration.
- **Production requirement:** Azure OpenAI, AI Search, Key Vault, and SQL Server should all be deployed with private endpoints behind a VNet. Public access disabled. Traffic flows over the district's private network or ExpressRoute.
- **SQL Server:** If SQL Server is on-premises, connectivity requires either VPN Gateway, ExpressRoute, or Azure Arc-enabled SQL Server.

**Why this matters for FERPA:** Network isolation prevents data exfiltration even if a service account is compromised. Private endpoints are a defense-in-depth requirement, not optional in production.

## What to Skip (and Why)

| Service | Why It's Out of Scope |
|---------|----------------------|
| Azure AI Vision | Image/document analysis — not needed for SQL analytics |
| Azure AI Speech | Voice transcription — out of scope for this use case |
| Azure AI Language | NLP primitives (NER, sentiment, key phrase) — OpenAI handles this better in context |
| Azure AI Translator | Language translation — not currently a requirement |
| Azure Document Intelligence | Form extraction from PDFs — not needed |
| Azure Machine Learning | ML model training — no model training in this course |
| Azure Synapse Analytics / Fabric | Full cloud DW migration — district keeps SQL Server on-premises |
| Copilot Studio | Low-code bot builder — does not support the custom integration pattern needed |
| Azure Bot Service | Bot framework — more complex than needed; minimal API is sufficient |
| Azure AI Video Indexer | Video analysis — out of scope |
| Power BI + Copilot | District uses its own web reporting application |
| Azure Data Factory | ETL/ELT orchestration — out of scope for POC |

## How the Services Fit Together

```
District Staff (Browser / Web App)
        │
        ▼
[Microsoft Entra ID] ──── Authenticate user, resolve role (teacher/schoolAdmin/districtAdmin)
        │
        ▼
[.NET 10 Minimal API — AI Orchestration Layer]
        │
        ├─► [Azure AI Search] ─── Retrieve relevant metadata, approved view catalog entries
        │         ▲
        │         │  (Indexed at setup time)
        │         │
        │    [Metadata Catalog / Data Dictionary / View Catalog]
        │
        ├─► [SQL Server — Approved Views only]
        │         ◄── read-only service account, no raw SQL generation
        │
        ├─► [Azure OpenAI Service]
        │         ├── text-embedding-3-small (embed the user question for vector search)
        │         └── gpt-4o / gpt-4o-mini  (generate the grounded answer)
        │
        ├─► [Azure AI Content Safety] ── Filter input/output (optional explicit call)
        │
        └─► [Azure Key Vault] ──── Retrieve secrets (SQL connection string, etc.)
                  ▲
                  │
        [Managed Identity] ──── No stored passwords; Entra ID token auth to all services
```

## Service Tiers for Labs vs. Production

| Service | Lab/POC Tier | Production Consideration |
|---------|-------------|--------------------------|
| Azure OpenAI | S0 (standard) | PTU (provisioned throughput) for predictable latency |
| Azure AI Search | Free / Basic | Standard S1+ for semantic ranker + large indexes |
| Azure AI Content Safety | F0 (free) | S0 for production traffic |
| Azure Key Vault | Standard | Standard with soft-delete + purge protection enabled |
| Azure Monitor / App Insights | Free tier | Per-GB pricing; set daily cap |

## Authentication Patterns Summary

```
POC / Lab:
  - Azure OpenAI: API key (stored in Key Vault or env variable)
  - AI Search: API key
  - SQL Server: username/password (connection string in Key Vault)

Production:
  - Azure OpenAI: Managed Identity → Cognitive Services OpenAI User RBAC role
  - AI Search: Managed Identity → Search Index Data Reader RBAC role
  - Key Vault: Managed Identity → Key Vault Secrets User RBAC role
  - SQL Server: Managed Identity (if Azure SQL) or service account (if on-prem SQL Server)
```

**.NET: `Azure.Identity.DefaultAzureCredential`** picks up managed identity in Azure, developer credentials locally — zero code change between environments.

**Python: `azure.identity.DefaultAzureCredential`** — same pattern.

## Azure AI Service Relationships at a Glance

| Service | Inputs | Outputs | Used In |
|---------|--------|---------|---------|
| Azure OpenAI (chat) | System prompt + retrieved context + user question | Natural-language answer | Weeks 2, 3, 5, 6 |
| Azure OpenAI (embedding) | Text chunk or query | Float vector (1536 dims) | Weeks 3, 5 |
| Azure AI Search | Vector + keywords | Ranked document chunks | Weeks 3, 5, 6 |
| Azure AI Foundry | — | Model deployment, evaluation metrics | Weeks 1, 7 |
| Azure AI Content Safety | Text | Category scores + severity | Week 7 |
| Entra ID | Identity token | Role claims | Weeks 5, 6 |
| Key Vault | Secret URI | Secret value | Weeks 1, 5 |

## Security Considerations

1. **No model training on student data.** Azure OpenAI does not train on customer data by default, but confirm your data processing agreement with Microsoft is in place before sending any student-identifiable information to any Azure service.
2. **Content filter configuration is a policy decision.** Default filters block extreme content. For an internal district tool, consider whether stricter filtering is needed.
3. **AI Search security trimming** requires that the search index stores user-scope metadata per document. Plan this during index design, not after.
4. **Key Vault access logging** should be enabled. Every secret access is an audit event — export logs to Azure Monitor.

## Common Misconceptions

| Misconception | Reality |
|---------------|---------|
| "Azure AI Foundry is where I deploy my app" | Foundry is a development and governance platform. Your app deploys to Azure App Service or Container Apps. |
| "I need to fine-tune the model for better K-12 answers" | Fine-tuning is expensive and degrades on questions outside training scope. RAG + good prompts is the right approach. |
| "Content Safety is a separate optional add-on" | It's built into Azure OpenAI deployments. You are using it whether you configure it or not. |
| "Azure AI Search is just Elasticsearch" | AI Search adds semantic ranking and native vector search with integration to Azure OpenAI for vectorization. |
| "Managed Identity only works in Azure" | `DefaultAzureCredential` falls back to developer credentials (VS, VS Code, Azure CLI) locally — zero code change. |

## Reflection Questions

1. Why does using Managed Identity with RBAC matter more for a school district than for a typical corporate AI application?
2. Your principal asks: "Can we just use the ChatGPT app instead of building this?" What are two FERPA-specific reasons why a public ChatGPT interface is not appropriate?
3. What happens if a teacher submits a prompt that includes a student's full name and SSN? What Azure services are involved in handling that?
4. You are told the district's SQL Server is on-premises and not moving to Azure. How does that affect your architecture choices?

## Assessment Task

In your lab notebook (or `templates/lab-report-template.md`):

1. Draw (or describe in a table) how Entra ID, Key Vault, Azure OpenAI, and AI Search connect for a single question from a teacher.
2. List the RBAC roles you would grant to the .NET API's managed identity. Justify each.
3. Identify one service that has a free tier sufficient for labs and one that does not. Explain the constraint.

## References

- [Azure OpenAI Service documentation](https://learn.microsoft.com/azure/ai-services/openai/)
- [Azure AI Search documentation](https://learn.microsoft.com/azure/search/)
- [Azure AI Foundry documentation](https://learn.microsoft.com/azure/ai-foundry/)
- [Azure AI Content Safety documentation](https://learn.microsoft.com/azure/ai-services/content-safety/)
- [Managed identities for Azure resources](https://learn.microsoft.com/azure/active-directory/managed-identities-azure-resources/)
- [Azure Key Vault documentation](https://learn.microsoft.com/azure/key-vault/)
- [Azure OpenAI data privacy and security FAQ](https://learn.microsoft.com/azure/ai-services/openai/faq#data-privacy-and-security)
- [DefaultAzureCredential overview](https://learn.microsoft.com/dotnet/api/azure.identity.defaultazurecredential)

*Next: Lab 01a — Environment Setup*
