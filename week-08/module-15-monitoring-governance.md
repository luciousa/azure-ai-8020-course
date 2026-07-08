# Module 15 — Monitoring and Governance

**Week:** 8 | **Estimated time:** 2.5 hours  
**Prerequisites:** Module 13 (security); Module 14 (evaluation)  
**Builds toward:** Lab 08a (monitoring setup); Capstone

## Learning Objectives

By the end of this module you will be able to:

1. Design an observability strategy for an AI analytics system using OpenTelemetry and Azure Monitor.
2. Identify the key metrics, traces, and logs required for both operational monitoring and FERPA audit.
3. Implement structured logging in the .NET 10 pipeline using `ILogger` and OpenTelemetry.
4. Set up Azure Monitor alerts for cost, latency, and safety thresholds.
5. Define a governance framework for AI in K-12 that covers policy, people, and process — not just technology.

## Why Monitoring is Different for AI Systems

Traditional web APIs have deterministic responses: given the same input, you get the same output. An AI pipeline does not. The same question asked twice may produce different answers, different token counts, and different confidence levels.

This non-determinism creates monitoring requirements that traditional APM tools don't address out of the box:

- **Quality drift:** The LLM may start hallucinating more as context changes (seasonal data updates, new school year, model updates by Azure OpenAI).
- **Safety regression:** A new system prompt version or a metadata update may weaken a safety boundary.
- **Cost spikes:** A slight change in question phrasing can trigger a much larger SQL result set and a longer prompt.
- **Data scope creep:** As new views are added to the catalog, the role_scope filter must be updated — or the new view is accessible to all roles.

## Observability Model: Three Pillars

### Pillar 1: Metrics (What is happening?)

| Metric | Type | Alert threshold |
|---|---|---|
| Request latency (P50, P95, P99) | Histogram | P99 > 10 seconds |
| Error rate (HTTP 4xx/5xx) | Counter | > 1% per 5 min |
| Token usage per request | Histogram | > 3,500 tokens (near budget limit) |
| Groundedness rate | Gauge | < 0.85 over 100 requests |
| Daily Azure OpenAI spend | Counter | > $50/day (adjust per contract) |
| Decline rate | Gauge | > 20% of requests (may indicate prompt regression) |

### Pillar 2: Traces (Why did it happen?)

End-to-end distributed tracing connects each step of the RAG pipeline:

```
Request received
└── UserContextService.BuildFromClaims()   [span]
    └── MetadataSearchService.Search()     [span — includes AI Search latency]
        └── SqlDataService.QueryView()     [span — includes SQL latency]
            └── CompletionService.Complete() [span — includes OpenAI latency]
                └── Response returned
```

Each span should include:
- Duration
- Role (teacher/school_admin/district_admin)
- View name (what view was queried)
- Success/failure
- Token counts (for the completion span)

### Pillar 3: Logs (What exactly happened?)

Structured logs provide the audit trail. Every query should produce exactly one log entry:

```json
{
  "timestamp": "2026-09-15T10:23:44Z",
  "level": "Information",
  "event": "query_processed",
  "role": "school_admin",
  "school_id": "SCH001",
  "school_year": 2026,
  "term_id": "Q2",
  "view_name": "vw_AttendanceSummaryBySchoolAndGrade",
  "is_grounded": true,
  "is_declined": false,
  "input_tokens": 1842,
  "output_tokens": 187,
  "latency_ms": 2341,
  "trace_id": "abc123def456"
}
```

**This log does NOT contain:** question text, answer text, student names, or section IDs.

## Implementing OpenTelemetry in .NET 10

### NuGet packages (already in Lab 05a; review here)

```xml
<PackageReference Include="OpenTelemetry.Extensions.Hosting" Version="1.9.*" />
<PackageReference Include="OpenTelemetry.Instrumentation.AspNetCore" Version="1.9.*" />
<PackageReference Include="OpenTelemetry.Instrumentation.Http" Version="1.9.*" />
<PackageReference Include="Azure.Monitor.OpenTelemetry.AspNetCore" Version="1.3.*" />
```

### Activity source for the RAG pipeline

```csharp
// Telemetry/PipelineTelemetry.cs
using System.Diagnostics;
using System.Diagnostics.Metrics;

namespace DistrictAnalyticsApi.Telemetry;

public static class PipelineTelemetry
{
    public static readonly ActivitySource Source = new("DistrictAnalytics.Pipeline");

    // Metrics
    private static readonly Meter _meter = new("DistrictAnalytics.Pipeline");

    public static readonly Counter<long> RequestsTotal =
        _meter.CreateCounter<long>("analytics_requests_total",
            description: "Total number of analytics queries processed");

    public static readonly Counter<long> DeclinesTotal =
        _meter.CreateCounter<long>("analytics_declines_total",
            description: "Total number of declined queries");

    public static readonly Histogram<double> RequestDuration =
        _meter.CreateHistogram<double>("analytics_request_duration_ms",
            unit: "ms",
            description: "End-to-end query latency");

    public static readonly Histogram<int> InputTokens =
        _meter.CreateHistogram<int>("analytics_input_tokens",
            unit: "tokens",
            description: "Input token count per query");

    public static readonly Histogram<int> OutputTokens =
        _meter.CreateHistogram<int>("analytics_output_tokens",
            unit: "tokens",
            description: "Output token count per query");
}
```

### Instrumented RagOrchestrator

```csharp
// Services/RagOrchestrator.cs — add telemetry
using System.Diagnostics;
using DistrictAnalyticsApi.Telemetry;

public class RagOrchestrator : IRagOrchestrator
{
    // ... existing fields ...
    private readonly ILogger<RagOrchestrator> _logger;

    public async Task<AnalyticsResponse> RunAsync(string question, UserContext ctx)
    {
        var stopwatch = Stopwatch.StartNew();
        string? viewName = null;

        using var activity = PipelineTelemetry.Source.StartActivity("RunQuery");
        activity?.SetTag("role", ctx.Role);
        activity?.SetTag("school_id", ctx.SchoolId ?? "ALL");

        try
        {
            // Stage 1-2: embed + search
            using var searchSpan = PipelineTelemetry.Source.StartActivity("MetadataSearch");
            var metadata = await _searchService.SearchMetadataAsync(question, ctx);
            searchSpan?.SetTag("result_count", metadata.Count);

            if (metadata.Count == 0)
            {
                return BuildDeclineResponse("no_metadata_match");
            }

            viewName = metadata[0].ViewName;
            activity?.SetTag("view_name", viewName);

            // Stage 3: SQL
            using var sqlSpan = PipelineTelemetry.Source.StartActivity("SqlQuery");
            sqlSpan?.SetTag("view_name", viewName);
            var sqlResult = await _sqlService.QueryViewAsync(viewName, ctx, metadata[0].Parameters);

            if (sqlResult is null || sqlResult.Rows.Count == 0)
            {
                return BuildDeclineResponse("no_data");
            }

            // Stage 4-5: augment + generate
            using var completionSpan = PipelineTelemetry.Source.StartActivity("Completion");
            var response = await _completionService.GenerateAsync(question, ctx, metadata, sqlResult);

            completionSpan?.SetTag("input_tokens", response.InputTokens);
            completionSpan?.SetTag("output_tokens", response.OutputTokens);

            // Metrics
            PipelineTelemetry.RequestsTotal.Add(1,
                new("role", ctx.Role),
                new("view", viewName),
                new("grounded", response.IsGrounded));

            PipelineTelemetry.InputTokens.Record(response.InputTokens,
                new("role", ctx.Role));
            PipelineTelemetry.OutputTokens.Record(response.OutputTokens,
                new("role", ctx.Role));

            // Structured audit log
            _logger.LogInformation(
                "Query processed: role={Role} school={SchoolId} view={ViewName} " +
                "inputTokens={Input} outputTokens={Output} latencyMs={Latency} grounded={Grounded}",
                ctx.Role, ctx.SchoolId ?? "ALL", viewName,
                response.InputTokens, response.OutputTokens,
                stopwatch.ElapsedMilliseconds, response.IsGrounded);

            return response;
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            _logger.LogError(ex,
                "Query failed: role={Role} school={SchoolId} view={ViewName}",
                ctx.Role, ctx.SchoolId ?? "ALL", viewName ?? "UNKNOWN");
            throw;
        }
        finally
        {
            PipelineTelemetry.RequestDuration.Record(stopwatch.ElapsedMilliseconds,
                new("role", ctx.Role));
        }
    }

    private AnalyticsResponse BuildDeclineResponse(string reason)
    {
        PipelineTelemetry.DeclinesTotal.Add(1, new("reason", reason));
        _logger.LogInformation("Query declined: reason={Reason}", reason);
        return new AnalyticsResponse { IsDeclined = true, DeclineReason = reason };
    }
}
```

### Register OpenTelemetry in Program.cs

```csharp
// Program.cs — telemetry registration
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing => tracing
        .AddSource("DistrictAnalytics.Pipeline")
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddAzureMonitorTraceExporter())
    .WithMetrics(metrics => metrics
        .AddMeter("DistrictAnalytics.Pipeline")
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddAzureMonitorMetricExporter());

// Connection string from Azure Monitor
// Environment variable: APPLICATIONINSIGHTS_CONNECTION_STRING
```

## Azure Monitor Alerts

### Alert 1: Token budget approaching limit

```json
{
  "alertName": "AnalyticsTokenBudgetWarning",
  "description": "P95 input token count exceeds 3000 tokens",
  "condition": {
    "metric": "analytics_input_tokens",
    "aggregation": "Percentile95",
    "threshold": 3000,
    "windowSize": "PT15M"
  },
  "severity": 2
}
```

**Action:** Review prompt length; check if SQL result sets are growing.

### Alert 2: Groundedness regression

This alert requires custom metric tracking.

```csharp
// Add to RagOrchestrator after each response:
if (!response.IsGrounded)
{
    // Custom metric — track not-grounded rate in Application Insights
    _telemetryClient.TrackMetric("AnalyticsNotGrounded", 1.0);
}
```

Alert when rolling 1-hour not-grounded rate exceeds 15%.

### Alert 3: Spike in decline rate

Sudden increases in declines can indicate:
- A metadata document was accidentally deleted or miscategorized
- A new school year's data isn't loaded yet
- A prompt regression

Alert when 5-minute decline rate exceeds 25%.

### Alert 4: Azure OpenAI daily spend

Monitor via Azure Cost Management or via token count estimation:

```python
# Rough cost estimation script (Python)
# Use actual Azure OpenAI pricing for your model and region

GPT4O_MINI_INPUT_PER_1K = 0.00015   # USD per 1K input tokens
GPT4O_MINI_OUTPUT_PER_1K = 0.00060  # USD per 1K output tokens

def estimate_daily_cost(avg_input_tokens: int, avg_output_tokens: int, requests_per_day: int) -> float:
    input_cost = (avg_input_tokens / 1000) * GPT4O_MINI_INPUT_PER_1K * requests_per_day
    output_cost = (avg_output_tokens / 1000) * GPT4O_MINI_OUTPUT_PER_1K * requests_per_day
    return input_cost + output_cost
```

## AI Governance Framework for K-12

Monitoring is technical governance. The broader governance framework covers policy, people, and process as well.

### Policy

At minimum, the district should have a written AI use policy that covers:

- Which AI services are approved for use with student-linked data
- Who can approve new AI features that access student records
- How AI-generated outputs must be reviewed before being used in decisions
- Staff training requirements before accessing AI tools with student data
- Incident reporting procedure for suspected data exposure

### People

| Role | Responsibility |
|---|---|
| Data Privacy Officer | FERPA compliance; access to audit logs; incident response |
| IT Security Lead | Token validation; service account permissions; vulnerability management |
| Curriculum/Analytics Lead | Approves new views; validates analytical accuracy of responses |
| AI System Owner | Monitors quality metrics; manages Azure resources; approves changes |
| End Users (teachers, admins) | Use the tool per policy; report unexpected or concerning outputs |

### Process

**Change control for the AI system:**

Any change to the following requires review by the Data Privacy Officer before deployment:
- New approved views added to the catalog
- System prompt changes
- Role scope updates in AI Search
- Model version changes (e.g., GPT-4o to a new model)

**Regular review cadence:**

| Review | Frequency | Participants |
|---|---|---|
| Quality metrics review | Monthly | AI System Owner + Analytics Lead |
| FERPA compliance check | Quarterly | Data Privacy Officer + IT Security |
| Full evaluation test set run | Quarterly | AI System Owner |
| Incident review | After any incident | All stakeholders |
| Annual policy review | Annually | Data Privacy Officer + Leadership |

## Responsible AI Principles in the SUSD Context

The district should adopt a written Responsible AI commitment that covers:

**1. Fairness** — Does the system perform equally well for all role types and all schools? Run the evaluation test set separately for each school and flag performance gaps.

**2. Reliability** — Can teachers and administrators rely on the answers? The evaluation thresholds from Module 14 are the minimum bar.

**3. Privacy** — FERPA controls are not optional add-ons; they are core requirements.

**4. Transparency** — Users should know they are interacting with an AI, and every answer should cite its source view.

**5. Accountability** — There should be a named human accountable for the AI system's operation, who can be reached in case of a concern.

**6. Inclusiveness** — The system should be tested with the full range of questions that different roles ask, not just the "happy path" questions that work well.

## Reflection Questions

1. The OpenTelemetry implementation logs `view_name` with every query. A district administrator reviews the logs and says: "I can see that teachers query `vw_StudentAttendanceBySectionAndTerm` frequently but almost never query benchmark views. Does this tell me anything actionable?" Describe 2 operational and 2 governance insights this usage pattern could reveal.

2. You receive an alert that the groundedness rate has dropped from 0.92 to 0.71 over the past week. You check the deployment history — no code changes. What 3 non-code causes would you investigate first, and how would you diagnose each?

3. The Governance Framework lists "Curriculum/Analytics Lead" as responsible for approving new views. A principal approaches IT directly and asks them to add a new view that shows individual student attendance by name. Describe the governance path this request should follow and the safeguards that prevent unauthorized view creation.

4. Explain the difference between monitoring (what is happening now) and evaluation (is the system good). Why do you need both, and what would a gap in each leave you blind to?

*Next: Module 16 — POC to Production*
