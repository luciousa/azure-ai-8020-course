# Azure Services Reference

Quick reference for the Azure services used in this course. Includes purpose, relevant configuration notes, and SDK guidance for .NET and Python.

> **Note on pricing:** Azure pricing changes frequently. All tier names and approximate costs here are for orientation only. Always verify current pricing at azure.microsoft.com/en-us/pricing before budgeting.

---

## Azure OpenAI Service

**Purpose in this course:** Hosts the GPT-4o-mini chat completion model and the text-embedding-3-small embedding model used in the RAG pipeline.

### Models Used

| Model | Use | Context window |
|---|---|---|
| `gpt-4o-mini` | Chat completions (answer generation) | 128K tokens |
| `text-embedding-3-small` | Embedding question vectors for hybrid search | N/A (output: 1536 dims) |

### Deployment Configuration

Azure OpenAI models are deployed per region. You create a deployment in the Azure portal with:
- A deployment name (e.g., `gpt-4o-mini-deployment`) — referenced in code
- A model version (pin to a specific version in production to avoid unexpected behavior changes)
- A token quota (TPM — tokens per minute)

### Token Budget Guidance

For this course's use case (K-12 analytics queries):
- System prompt: ~400 tokens
- Metadata context (top 3 documents): ~600 tokens
- SQL results: ~300–800 tokens
- User question: ~50–100 tokens
- **Typical input: 1,400–1,900 tokens per request**
- Typical output: 150–300 tokens

Set P95 input token alert at 3,000 in Azure Monitor.

### Data Residency and Retention

Azure OpenAI does NOT retain user prompts by default (as of the time this course was written). Prompts are processed in-memory and not stored for model training. Verify this is still the current policy in your Azure subscription before deploying with student data.

For Azure Government (GovCloud) deployments: confirm model availability, as not all models are available in all sovereign regions.

### SDK — .NET

```csharp
// NuGet: Azure.AI.OpenAI (1.0.0+ for .NET 8/10)
using Azure.AI.OpenAI;
using Azure.Core;

// POC: API key
var client = new AzureOpenAIClient(
    new Uri(Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")!),
    new AzureKeyCredential(Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY")!));

// Production: managed identity (same client, different credential)
var client = new AzureOpenAIClient(
    new Uri(Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")!),
    new DefaultAzureCredential());

// Chat completion
ChatClient chat = client.GetChatClient("gpt-4o-mini-deployment");

ChatCompletion completion = await chat.CompleteChatAsync(
    [
        new SystemChatMessage(systemPrompt),
        new UserChatMessage(userQuestion)
    ],
    new ChatCompletionOptions
    {
        MaxOutputTokenCount = 500,
        Temperature = 0.0f       // deterministic for factual queries
    });

string answer = completion.Content[0].Text;
```

### SDK — Python

```python
# pip install openai  (OpenAI Python SDK works with Azure OpenAI)
from openai import AzureOpenAI
import os

client = AzureOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    api_key=os.environ["AZURE_OPENAI_KEY"],
    api_version="2024-10-21"  # check for latest GA version
)

response = client.chat.completions.create(
    model="gpt-4o-mini-deployment",
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_question}
    ],
    max_tokens=500,
    temperature=0.0
)

answer = response.choices[0].message.content
```

### Embeddings — Python

```python
embed_response = client.embeddings.create(
    model="text-embedding-3-small-deployment",
    input=user_question
)
embedding_vector = embed_response.data[0].embedding  # list of 1536 floats
```

---

## Azure AI Search

**Purpose in this course:** Stores metadata documents describing each approved SQL view. Used for hybrid search (BM25 keyword + vector similarity) to identify which view can answer a given user question.

### Index Structure

The course index (`susd-views-index`) contains one document per SQL view:
- `id` (string, key)
- `view_name` (string, filterable)
- `role_scope` (collection(string), filterable) — **critical: used as pre-filter**
- `description` (string, searchable)
- `example_questions` (collection(string), searchable)
- `content_vector` (single(collection), vector field, 1536 dimensions)

### Hybrid Search Configuration

- Query type: `QueryType.SEMANTIC`
- Semantic configuration: `susd-semantic`
- Vector field: `content_vector`
- Top: 3 results
- Pre-filter: `role_scope/any(r: r eq '{user_role}')` — applied before scoring

### Pricing Tiers

| Tier | Notes |
|---|---|
| Free | 50MB storage, 3 indexes — sufficient for course labs |
| Basic | 2GB per partition, SLA, production-ready |
| Standard S1 | Larger storage, semantic ranking available |

Semantic ranking requires Standard tier or above (or explicit enablement on Basic in some regions — verify current availability).

### SDK — Python

```python
# pip install azure-search-documents
from azure.search.documents import SearchClient
from azure.search.documents.models import VectorizedQuery, QueryType
from azure.core.credentials import AzureKeyCredential

search_client = SearchClient(
    endpoint=os.environ["AZURE_SEARCH_ENDPOINT"],
    index_name="susd-views-index",
    credential=AzureKeyCredential(os.environ["AZURE_SEARCH_KEY"])
)

results = search_client.search(
    search_text=question,
    vector_queries=[
        VectorizedQuery(
            vector=question_embedding,
            k_nearest_neighbors=5,
            fields="content_vector"
        )
    ],
    filter=f"role_scope/any(r: r eq '{user_role}')",
    query_type=QueryType.SEMANTIC,
    semantic_configuration_name="susd-semantic",
    top=3
)
```

### SDK — .NET

```csharp
// NuGet: Azure.Search.Documents
using Azure.Search.Documents;
using Azure.Search.Documents.Models;

var searchClient = new SearchClient(
    new Uri(Environment.GetEnvironmentVariable("AZURE_SEARCH_ENDPOINT")!),
    "susd-views-index",
    new AzureKeyCredential(Environment.GetEnvironmentVariable("AZURE_SEARCH_KEY")!));

// Production: replace AzureKeyCredential with DefaultAzureCredential
// SearchIndexClient accepts TokenCredential from Azure.Identity

var options = new SearchOptions
{
    Filter = $"role_scope/any(r: r eq '{ctx.Role}')",
    QueryType = SearchQueryType.Semantic,
    SemanticSearch = new SemanticSearchOptions
    {
        SemanticConfigurationName = "susd-semantic"
    },
    Size = 3
};

options.VectorSearch = new VectorSearchOptions();
options.VectorSearch.Queries.Add(new VectorizedQuery(questionEmbedding)
{
    KNearestNeighborsCount = 5,
    Fields = { "content_vector" }
});

SearchResults<SearchDocument> results = await searchClient.SearchAsync<SearchDocument>(
    question, options);
```

---

## Azure Monitor and Application Insights

**Purpose in this course:** Collects telemetry from the RAG pipeline — spans, custom metrics, and structured audit log entries.

### Components Used

| Component | Purpose |
|---|---|
| Application Insights | Receives OpenTelemetry traces and custom metrics |
| Log Analytics Workspace | Backend storage for all telemetry; supports KQL queries |
| Azure Monitor Workbooks | Dashboard visualization (attendance KPIs, token usage, etc.) |
| Alert Rules | Triggers on P99 latency, error rate, decline rate, token budget |

### OpenTelemetry Integration

The course uses the OpenTelemetry SDK rather than the Application Insights SDK directly. The OTLP exporter sends data to Application Insights.

```csharp
// NuGet: Azure.Monitor.OpenTelemetry.AspNetCore (preferred for .NET 8/10)
// Or: Azure.Monitor.OpenTelemetry.Exporter for non-ASP.NET scenarios

builder.Services.AddOpenTelemetry()
    .WithTracing(tracing => tracing
        .AddSource("SusdRagPipeline")
        .AddAzureMonitorTraceExporter())
    .WithMetrics(metrics => metrics
        .AddMeter("SusdRagPipeline")
        .AddAzureMonitorMetricExporter());
```

### PipelineTelemetry Pattern

```csharp
public static class PipelineTelemetry
{
    public static readonly ActivitySource Source = 
        new("SusdRagPipeline", "1.0.0");
    
    private static readonly Meter Meter = 
        new("SusdRagPipeline", "1.0.0");

    // Counters
    public static readonly Counter<long> RequestCounter = 
        Meter.CreateCounter<long>("pipeline_requests_total");
    public static readonly Counter<long> DeclineCounter = 
        Meter.CreateCounter<long>("pipeline_declines_total");

    // Histograms
    public static readonly Histogram<double> DurationHistogram = 
        Meter.CreateHistogram<double>("pipeline_duration_ms");
    public static readonly Histogram<int> InputTokenHistogram = 
        Meter.CreateHistogram<int>("pipeline_input_tokens");
    public static readonly Histogram<int> OutputTokenHistogram = 
        Meter.CreateHistogram<int>("pipeline_output_tokens");
}
```

### Useful KQL Queries

```kusto
// P99 latency over past 24 hours
customMetrics
| where name == "pipeline_duration_ms"
| where timestamp > ago(24h)
| summarize percentile(value, 99) by bin(timestamp, 1h)
| render timechart

// Decline rate by hour
let total = customMetrics
    | where name == "pipeline_requests_total"
    | summarize totalReq=sum(value) by bin(timestamp, 1h);
let declines = customMetrics
    | where name == "pipeline_declines_total"
    | summarize totalDec=sum(value) by bin(timestamp, 1h);
total | join kind=leftouter declines on timestamp
| project timestamp, declineRate = todouble(totalDec) / todouble(totalReq)
| render timechart

// PII scan — check for student names in custom dimensions
customEvents
| where timestamp > ago(7d)
| where customDimensions has_any ("Maria", "Garcia")  // add common names
| project timestamp, customDimensions
```

---

## Azure Key Vault

**Purpose in this course:** Stores secrets (API keys, connection strings) for development. In production, these are replaced by managed identity and RBAC — Key Vault remains as the backstop for secrets that cannot use managed identity.

### What to Store in Key Vault

| Secret | Notes |
|---|---|
| `AzureOpenAIKey` | POC only; replaced by managed identity in production |
| `AzureSearchKey` | POC only; replaced by managed identity in production |
| `SqlConnectionString` | Needed in all environments; managed identity for SQL Server |

### SDK — .NET

```csharp
// NuGet: Azure.Security.KeyVault.Secrets + Azure.Identity

var kvClient = new SecretClient(
    new Uri($"https://{keyVaultName}.vault.azure.net/"),
    new DefaultAzureCredential());

KeyVaultSecret secret = await kvClient.GetSecretAsync("AzureOpenAIKey");
string apiKey = secret.Value;
```

For ASP.NET Core, use the Key Vault configuration provider to load secrets as configuration values at startup:

```csharp
// In Program.cs
builder.Configuration.AddAzureKeyVault(
    new Uri($"https://{keyVaultName}.vault.azure.net/"),
    new DefaultAzureCredential());

// Then access as normal config:
string openAiKey = builder.Configuration["AzureOpenAIKey"];
```

### Access Policy vs. RBAC

Key Vault supports two authorization models:
- **Access policies** (legacy): Vault-level policies granting Principal → [Get, List, Set, Delete]
- **Azure RBAC** (recommended): Role assignments on the vault resource

Use Azure RBAC for new vaults. Assign the **Key Vault Secrets User** role to the managed identity of your App Service or Container App.

---

## Microsoft Entra ID (formerly Azure Active Directory)

**Purpose in this course:** Identity provider. Issues JWT tokens with role claims and school/section attribute claims. The RAG API validates these tokens; UserContext is built exclusively from verified claims.

### App Registration Setup

The course requires two app registrations:
1. **API registration** (`susd-rag-api`) — defines the API scope and exposes roles
2. **Client registration** (`susd-rag-client`) — used by the web frontend or test client

### App Roles Defined in the API Registration

```json
{
  "appRoles": [
    {
      "displayName": "Teacher",
      "value": "teacher",
      "allowedMemberTypes": ["User"]
    },
    {
      "displayName": "School Administrator",
      "value": "school_admin",
      "allowedMemberTypes": ["User"]
    },
    {
      "displayName": "District Administrator",
      "value": "district_admin",
      "allowedMemberTypes": ["User"]
    }
  ]
}
```

### Custom Attributes for SchoolId and SectionIds

Assign users their school and section identifiers via:
- **Extension attributes** on user objects (free in Entra ID)
- **Custom security attributes** (requires Entra ID P1 or P2)

In the JWT, these appear as claims like `extension_SchoolId` and `extension_SectionIds`.

### SDK — .NET (Token Validation)

```csharp
// NuGet: Microsoft.Identity.Web
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddMicrosoftIdentityWebApi(builder.Configuration.GetSection("AzureAd"));

// In appsettings.json:
// "AzureAd": {
//   "Instance": "https://login.microsoftonline.com/",
//   "TenantId": "<your-tenant-id>",
//   "ClientId": "<api-registration-client-id>",
//   "Audience": "api://<api-registration-client-id>"
// }

// Then on the controller:
[Authorize]
[HttpPost("query")]
public async Task<IActionResult> Query(...)
```

### SDK — Python (Token Validation)

```python
# pip install msal pyjwt cryptography
import jwt
from msal import ConfidentialClientApplication

# For validation in a Python API (FastAPI example)
# Use a middleware that validates the Bearer token against
# the JWKS endpoint:
# https://login.microsoftonline.com/{tenant_id}/discovery/v2.0/keys

def validate_token(token: str, tenant_id: str, client_id: str) -> dict:
    jwks_uri = f"https://login.microsoftonline.com/{tenant_id}/discovery/v2.0/keys"
    jwks_client = jwt.PyJWKClient(jwks_uri)
    signing_key = jwks_client.get_signing_key_from_jwt(token)
    payload = jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        audience=f"api://{client_id}"
    )
    return payload  # contains roles, extension_SchoolId, etc.
```

---

## Service Summary

| Service | Resource name in course | Auth (POC) | Auth (Production) | Tier |
|---|---|---|---|---|
| Azure OpenAI | `susd-openai` | API key | Managed identity | S0 |
| Azure AI Search | `susd-search` | Admin key | Managed identity | Free / Basic |
| Application Insights | `susd-appinsights` | Connection string | Connection string | Pay-per-use |
| Key Vault | `susd-kv` | N/A | RBAC (Key Vault Secrets User) | Standard |
| Entra ID | District tenant | App secret (POC) | Federated credential | P1 |

---

## Resource Group and Naming Convention

All course resources use the prefix `susd-` to match the Sunlake Unified School District synthetic district. In a real district deployment, replace with your district's abbreviation.

Suggested resource group: `rg-susd-ai-poc` (POC) → `rg-susd-ai-prod` (production)

Region selection considerations:
- Choose a region where Azure OpenAI has the required models (GPT-4o-mini, text-embedding-3-small)
- Choose a region with Azure AI Search semantic ranking available
- Consider data residency requirements (public school districts in some states have in-state data requirements)
- Azure Government (USGov Virginia, USGov Arizona) is available for districts with strict sovereignty requirements
