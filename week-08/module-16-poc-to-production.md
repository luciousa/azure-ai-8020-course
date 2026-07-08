# Module 16 — POC to Production

**Week:** 8 | **Estimated time:** 2.5 hours  
**Prerequisites:** All prior modules; Lab 08a  
**Builds toward:** Lab 08b (production checklist); Capstone

## Learning Objectives

By the end of this module you will be able to:

1. Identify the 8 key gaps between the SUSD POC and a production-ready system.
2. Describe the Azure architecture changes required for production (managed identity, VNet, private endpoints).
3. Plan a phased rollout from pilot to district-wide deployment.
4. Estimate the cost and resource requirements for operating the system at scale.
5. Define the success criteria for declaring the system production-ready.

## The Gap Between POC and Production

The pipeline you have built through Week 7 is a high-quality proof of concept. It demonstrates:

- Correct architecture (RAG with approved view catalog)
- Role-based access enforced at three layers
- FERPA-conscious design with no individual student data in prompts
- A formal evaluation test set with 30 cases
- OpenTelemetry telemetry instrumentation

What it does **not yet have:**

| POC limitation | Production requirement |
|---|---|
| API key authentication to Azure OpenAI | Managed identity (no secrets in code) |
| HS256 dev JWT tokens | Full Entra ID integration with production app registration |
| SQL Server connection string with password | SQL Server with Entra ID-based authentication or Azure Key Vault secret |
| No VNet isolation | Private endpoints for Azure OpenAI and AI Search |
| No rate limiting | API Management or ASP.NET rate limiting middleware |
| Single instance | Azure App Service or AKS with auto-scaling |
| Manual deployment | CI/CD pipeline (GitHub Actions or Azure DevOps) |
| Dev Azure AI Search tier | Standard tier with semantic ranker |

## Authentication: API Keys to Managed Identity

### POC approach (remove before production)

```csharp
// POC: api key in environment variable
var credential = new AzureKeyCredential(Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY")!);
var client = new AzureOpenAIClient(new Uri(endpoint), credential);
```

### Production approach: DefaultAzureCredential

`DefaultAzureCredential` tries credential sources in order:
1. Environment variables (useful for CI/CD)
2. Workload identity (for Azure Kubernetes Service)
3. Managed identity (for App Service, Container Apps, etc.)
4. Azure CLI (for local development)

```csharp
// Production: zero secrets in code
var credential = new DefaultAzureCredential();
var openAiClient = new AzureOpenAIClient(new Uri(openAiEndpoint), credential);
var searchClient = new SearchClient(
    new Uri(searchEndpoint),
    indexName,
    credential);
```

**Role assignments required** (Azure RBAC):

| Resource | Role to assign | Assignee |
|---|---|---|
| Azure OpenAI | Cognitive Services OpenAI User | App Service managed identity |
| Azure AI Search | Search Index Data Reader | App Service managed identity |
| Azure Key Vault | Key Vault Secrets User | App Service managed identity (for SQL connection strings) |

### SQL Server: Entra ID authentication

```csharp
// Use Entra ID token for SQL Server authentication
// Requires Azure SQL or SQL Server with AD integration configured
var connectionString = builder.Configuration["SqlServer:ConnectionString"];

// For Azure SQL:
// "Server=sql-susd.database.windows.net;Database=SunlakeUnifiedDW;Authentication=Active Directory Default;"

// For on-premises SQL Server with AD:
// "Server=SQLSERVER\\INSTANCE;Database=SunlakeUnifiedDW;Integrated Security=true;"
// The App Service managed identity must be granted to a SQL login
```

## Network Security: Private Endpoints

In production, Azure OpenAI and Azure AI Search must not be reachable from the public internet. All traffic flows through the district's VNet.

**Architecture with private endpoints:**

```
District Users (browser)
        ↓
   Azure Front Door (WAF + CDN)
        ↓
   Azure App Service (VNET Integration)
        ↓ (private)
   Azure OpenAI (Private Endpoint)
   Azure AI Search (Private Endpoint)
        ↓ (VPN or ExpressRoute)
   On-Premises SQL Server
```

**VNet configuration requirements:**
- App Service Plan (P2v3 or higher) with VNet Integration
- Private DNS zones for `openai.azure.com` and `search.windows.net`
- Network Security Groups blocking inbound traffic from outside VNet
- SQL Server accessible via site-to-site VPN or ExpressRoute

> **Note:** Private endpoints are a significant infrastructure investment. For the initial production phase, consider starting with IP-based access restrictions on Azure resources while VNet setup is completed.

## Entra ID Integration (Production)

Replace the lab HS256 dev tokens with full Entra ID authentication.

### Azure app registration

Create two app registrations in the district's Entra ID tenant:
1. **API app** (`susd-analytics-api`) — defines app roles
2. **Client app** (`susd-analytics-client`) — used by the front-end

### App roles definition

In the API app's manifest, define roles:

```json
"appRoles": [
  {
    "allowedMemberTypes": ["User", "Group"],
    "displayName": "District Administrator",
    "id": "00000000-0000-0000-0000-000000000001",
    "isEnabled": true,
    "value": "district_admin"
  },
  {
    "allowedMemberTypes": ["User", "Group"],
    "displayName": "School Administrator",
    "id": "00000000-0000-0000-0000-000000000002",
    "isEnabled": true,
    "value": "school_admin"
  },
  {
    "allowedMemberTypes": ["User", "Group"],
    "displayName": "Teacher",
    "id": "00000000-0000-0000-0000-000000000003",
    "isEnabled": true,
    "value": "teacher"
  }
]
```

### appsettings.Production.json (Entra ID)

```json
{
  "AzureAd": {
    "TenantId": "YOUR_TENANT_ID",
    "ClientId": "YOUR_API_APP_CLIENT_ID",
    "Audience": "api://YOUR_API_APP_CLIENT_ID"
  }
}
```

### Program.cs (production JWT validation)

```csharp
// Production: validates against Entra ID public keys automatically
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddMicrosoftIdentityWebApi(builder.Configuration.GetSection("AzureAd"));

builder.Services.AddAuthorization();
```

The `Microsoft.Identity.Web` library handles token validation, key rotation, and tenant verification automatically.

## Rate Limiting

Azure OpenAI has per-minute token limits (TPM) based on your deployment quota. Without rate limiting in the API, a single user could exhaust the entire quota.

### ASP.NET Core rate limiting (.NET 8+)

```csharp
// Program.cs — add rate limiting
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("analytics", limiter =>
    {
        limiter.Window = TimeSpan.FromMinutes(1);
        limiter.PermitLimit = 10;  // 10 requests per minute per user
        limiter.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        limiter.QueueLimit = 2;
    });
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// In controller:
[EnableRateLimiting("analytics")]
[HttpPost("query")]
public async Task<IActionResult> Query(...)
```

For per-user rate limiting, use `RateLimiterOptions.KeySelector`:

```csharp
options.AddFixedWindowLimiter("analytics-per-user", limiter =>
{
    limiter.Window = TimeSpan.FromMinutes(1);
    limiter.PermitLimit = 5;
});

// Set KeySelector to use the user's object ID from the token
options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
    RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: context.User?.FindFirst("oid")?.Value ?? "anonymous",
        factory: _ => new FixedWindowRateLimiterOptions
        {
            Window = TimeSpan.FromMinutes(1),
            PermitLimit = 5,
        }));
```

## Deployment: CI/CD with GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Azure App Service

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup .NET 10
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '10.0.x'

      - name: Build
        run: dotnet build --configuration Release

      - name: Test
        run: dotnet test --configuration Release --no-build

  deploy:
    needs: build-and-test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Setup .NET 10
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '10.0.x'

      - name: Publish
        run: dotnet publish --configuration Release --output ./publish

      - name: Deploy to Azure App Service
        uses: azure/webapps-deploy@v3
        with:
          app-name: 'susd-analytics-api'
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
          package: './publish'
```

## Phased Rollout Plan

### Phase 1: Internal pilot (4–6 weeks)

**Who:** 3–5 school admins at 1–2 pilot schools; district analytics team  
**Scope:** Read-only; all 9 approved views; teacher role disabled  
**Success criteria:**
- Zero FERPA incidents
- Groundedness > 0.90 over 200 queries
- User satisfaction survey > 70% positive
- No P1 support incidents

### Phase 2: Teacher pilot (4–6 weeks)

**Who:** Volunteer teachers at pilot schools (25–50 users)  
**Scope:** All three roles enabled; teacher view restricted to own sections  
**Success criteria:**
- All Phase 1 success criteria maintained
- Teacher questions covered by catalog > 80%
- Decline rate < 15% (questions outside scope)

### Phase 3: District-wide rollout

**Who:** All district staff in scope (teachers, school admins, district admins)  
**Requirements before Phase 3:**
- Private endpoint VNet architecture deployed
- Production Entra ID integration verified
- Data Processing Agreement with Microsoft signed
- Staff training completed (minimum 1 hour per role)
- Incident response plan approved
- FERPA compliance evidence document reviewed by Data Privacy Officer

## Cost Estimation

For a district of ~5,000 students, ~400 teachers, and 20 administrators:

**Estimated daily queries:** 200–500 (heavy usage periods: beginning/end of grading periods)

**Token estimate per query:**
- Input: ~1,800 tokens (system prompt + metadata + SQL summary)
- Output: ~200 tokens

**Monthly cost (GPT-4o-mini, gpt-4o-mini-2024-07-18 pricing):**

| Component | Estimate |
|---|---|
| Input tokens (500 queries/day × 30 days × 1,800 tokens) | 27M tokens |
| Input cost (27M × $0.00015/1K) | ~$4/month |
| Output tokens (500 × 30 × 200) | 3M tokens |
| Output cost (3M × $0.00060/1K) | ~$1.80/month |
| Azure AI Search (Standard S1) | ~$250/month |
| Azure App Service (P2v3) | ~$150/month |
| Azure Monitor / App Insights | ~$20/month |
| **Estimated total** | **~$426/month** |

> Costs vary by region, negotiated agreements, and actual usage. Run a cost estimate in the Azure Pricing Calculator before finalizing budget.

## Reflection Questions

1. The phased rollout plan requires a "Data Processing Agreement with Microsoft" before Phase 3. Your IT director asks why this isn't required until Phase 3. What would you explain about the difference in data risk between the pilot phase (synthetic + limited user) and district-wide?

2. Managed identity eliminates API keys from the codebase. However, the SQL Server connection string still contains the server name, database name, and port. Is this a security concern? What does a production-ready connection string management strategy look like for a school district?

3. The rate limiter is set to 10 requests per minute per user. A principal runs a staff meeting and asks 30 administrators to open the analytics tool and all ask a question at the same time. What happens? Is this the right behavior? Adjust the rate limiting design to handle this scenario better.

4. You're presenting the phased rollout plan to the school board. They ask: "How do we know when to stop the rollout if something goes wrong?" Define 3 specific rollback triggers — events that would cause you to immediately pause rollout and revert to the previous state.

*Next: Lab 08a — Monitoring Setup*
