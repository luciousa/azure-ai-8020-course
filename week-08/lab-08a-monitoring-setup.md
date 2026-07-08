# Lab 08a — Monitoring Setup

**Week:** 8 | **Lab:** 08a | **Estimated time:** 2.5 hours  
**Prerequisites:** Module 15 (monitoring); Lab 05a (.NET API)  
**Paired with:** Lab 08b (production checklist)

## Lab Objectives

1. Instrument the .NET RAG pipeline with OpenTelemetry spans and custom metrics.
2. Connect the pipeline to Azure Application Insights (or local OTLP exporter for development).
3. Verify traces, metrics, and structured logs are captured correctly.
4. Build an Application Insights workbook showing the key operational dashboard.
5. Configure at least 2 Azure Monitor alerts.

## Part 1 — Telemetry Classes

Add the telemetry infrastructure from Module 15 to your project.

### 1.1 Create the telemetry class

```bash
# Add to your project from Lab 05a
mkdir -p src/DistrictAnalyticsApi/Telemetry
```

Create `Telemetry/PipelineTelemetry.cs` (from Module 15).

### 1.2 Update NuGet packages

Ensure your `.csproj` includes the telemetry packages:

```bash
cd src/DistrictAnalyticsApi
dotnet add package OpenTelemetry.Extensions.Hosting
dotnet add package OpenTelemetry.Instrumentation.AspNetCore
dotnet add package OpenTelemetry.Instrumentation.Http
dotnet add package Azure.Monitor.OpenTelemetry.AspNetCore
```

### 1.3 Update Program.cs

Add OpenTelemetry registration from Module 15. For local development (no Application Insights yet), use the console exporter:

```csharp
// Development: export to console for verification
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddOpenTelemetry()
        .WithTracing(tracing => tracing
            .AddSource("DistrictAnalytics.Pipeline")
            .AddAspNetCoreInstrumentation()
            .AddConsoleExporter())
        .WithMetrics(metrics => metrics
            .AddMeter("DistrictAnalytics.Pipeline")
            .AddConsoleExporter());
}
else
{
    // Production: Azure Monitor
    builder.Services.AddOpenTelemetry()
        .WithTracing(tracing => tracing
            .AddSource("DistrictAnalytics.Pipeline")
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddAzureMonitorTraceExporter())
        .WithMetrics(metrics => metrics
            .AddMeter("DistrictAnalytics.Pipeline")
            .AddAspNetCoreInstrumentation()
            .AddAzureMonitorMetricExporter());
}
```

### 1.4 Instrument RagOrchestrator

Apply the instrumented version from Module 15. Key additions:
- `PipelineTelemetry.Source.StartActivity()` for each stage
- Tags: `role`, `school_id`, `view_name`, `input_tokens`, `output_tokens`
- Metrics: `RequestsTotal`, `DeclinesTotal`, `InputTokens`, `OutputTokens`, `RequestDuration`
- Structured log with all audit fields

## Part 2 — Local Trace Verification

Run the API locally and verify telemetry is being generated.

### 2.1 Start the API with console exporter

```bash
cd src/DistrictAnalyticsApi
ASPNETCORE_ENVIRONMENT=Development dotnet run
```

### 2.2 Send a test request

```http
POST https://localhost:5001/api/analytics/query
Content-Type: application/json
Authorization: Bearer {{school_admin_token}}

{ "question": "What is the attendance rate at my school for Q2?" }
```

### 2.3 Verify console output

You should see output similar to:

```
Activity.TraceId:            abc123...
Activity.SpanId:             def456...
Activity.DisplayName:        RunQuery
Activity.Kind:               Internal
Activity.StartTime:          2026-09-15T10:23:44.000Z
Activity.Duration:           00:00:02.341
Activity.Tags:
    role: school_admin
    school_id: SCH001
    view_name: vw_AttendanceSummaryBySchoolAndGrade

--- Child Activity ---
Activity.DisplayName:        MetadataSearch
Activity.Duration:           00:00:00.421

--- Child Activity ---
Activity.DisplayName:        SqlQuery
Activity.Duration:           00:00:00.312

--- Child Activity ---
Activity.DisplayName:        Completion
Activity.Duration:           00:00:01.608
Activity.Tags:
    input_tokens: 1842
    output_tokens: 187
```

Record these values in your lab report.

### 2.4 Verify structured log

The log output should contain exactly:

```
[INFO] Query processed: role=school_admin school=SCH001 view=vw_AttendanceSummaryBySchoolAndGrade inputTokens=1842 outputTokens=187 latencyMs=2341 grounded=true
```

Confirm: the question text does NOT appear in any log line.

## Part 3 — Application Insights Setup

### 3.1 Create Application Insights resource

```bash
# Azure CLI
az group create --name rg-susd-analytics --location eastus

az monitor app-insights component create \
  --app ai-susd-analytics \
  --location eastus \
  --resource-group rg-susd-analytics \
  --workspace-resource-id /subscriptions/YOUR_SUB/resourceGroups/rg-susd-analytics/providers/Microsoft.OperationalInsights/workspaces/law-susd

# Get the connection string
az monitor app-insights component show \
  --app ai-susd-analytics \
  --resource-group rg-susd-analytics \
  --query connectionString -o tsv
```

### 3.2 Set the connection string

In `appsettings.json` (never commit; use environment variable or Key Vault in production):

```json
{
  "APPLICATIONINSIGHTS_CONNECTION_STRING": "InstrumentationKey=YOUR_KEY;IngestionEndpoint=..."
}
```

Or set it as an environment variable:

```bash
export APPLICATIONINSIGHTS_CONNECTION_STRING="InstrumentationKey=..."
```

### 3.3 Switch to Azure Monitor exporter

Update `Program.cs` to use `ASPNETCORE_ENVIRONMENT=Staging` or modify the condition, then restart the API.

```bash
ASPNETCORE_ENVIRONMENT=Staging dotnet run
```

Send 5 test requests (1 per role type, plus 1 declined, plus 1 SEC test):

```http
### Teacher — own section attendance
POST https://localhost:5001/api/analytics/query
Authorization: Bearer {{teacher_token}}
{ "question": "What is the attendance rate for my students in Q2?" }

###

### School admin — Grade 3 Math assessment
POST https://localhost:5001/api/analytics/query
Authorization: Bearer {{school_admin_token}}
{ "question": "How did Grade 3 do on the Math BOY benchmark?" }

###

### District admin — ELL achievement gap
POST https://localhost:5001/api/analytics/query
Authorization: Bearer {{district_admin_token}}
{ "question": "What is the ELA proficiency gap for English Language Learners?" }

###

### Decline case (teacher → admin view)
POST https://localhost:5001/api/analytics/query
Authorization: Bearer {{teacher_token}}
{ "question": "Show me the district-wide achievement gap by subgroup" }

###

### Auth failure
POST https://localhost:5001/api/analytics/query
{ "question": "What is the attendance rate?" }
```

Wait 2–3 minutes for data to appear in Application Insights.

## Part 4 — Application Insights Workbook

In the Azure Portal, navigate to your Application Insights resource and create a workbook with the following sections.

### Section 1: Overview metrics (KPIs)

Add a metrics chart:

```
Metric: analytics_requests_total
Split by: role
Time range: Last 24 hours
Chart type: Bar
```

Add a second chart:

```
Metric: analytics_request_duration_ms
Aggregation: Percentile (50, 95)
Time range: Last 24 hours
Chart type: Line
```

### Section 2: Token usage

```
Metric: analytics_input_tokens
Aggregation: Average, Percentile 95
Split by: role
```

Add a KQL query for the token budget warning:

```kql
// Requests approaching the 3,000 token limit
customMetrics
| where name == "analytics_input_tokens"
| where value >= 2500
| summarize HighTokenRequests = count(), AvgTokens = avg(value) by bin(timestamp, 1h)
| order by timestamp desc
| take 24
```

### Section 3: Quality metrics

```kql
// Groundedness trend (requires is_grounded to be logged)
traces
| where message has "Query processed"
| extend grounded = extract("grounded=(true|false)", 1, message) == "true"
| summarize 
    Total = count(),
    Grounded = countif(grounded),
    GroundedRate = round(100.0 * countif(grounded) / count(), 1)
  by bin(timestamp, 1h)
| order by timestamp desc
| take 24
```

### Section 4: Audit log viewer

```kql
// Last 50 queries with audit fields
traces
| where message has "Query processed"
| extend 
    role = extract("role=([^ ]+)", 1, message),
    school_id = extract("school=([^ ]+)", 1, message),
    view_name = extract("view=([^ ]+)", 1, message),
    input_tokens = toint(extract("inputTokens=([0-9]+)", 1, message)),
    output_tokens = toint(extract("outputTokens=([0-9]+)", 1, message)),
    latency_ms = toint(extract("latencyMs=([0-9]+)", 1, message))
| project timestamp, role, school_id, view_name, input_tokens, output_tokens, latency_ms
| order by timestamp desc
| take 50
```

### Section 5: Errors and declines

```kql
// Declines by reason
traces
| where message has "Query declined"
| extend reason = extract("reason=([^ ]+)", 1, message)
| summarize DeclineCount = count() by reason, bin(timestamp, 1h)
| order by timestamp desc
```

## Part 5 — Alert Configuration

### Alert 1: High token usage

In Azure Portal → Application Insights → Alerts → Create:

```
Signal: Custom metric — analytics_input_tokens
Condition: Percentile(95, 15m) > 3000
Severity: Warning (Sev 2)
Action group: Email IT Operations
Alert name: "Analytics High Token Usage"
```

### Alert 2: Decline spike

```kql
// KQL alert: decline rate over 25% in a 15-minute window
let total = traces
    | where timestamp > ago(15m) and message has "Query processed"
    | count;
let declined = traces
    | where timestamp > ago(15m) and message has "Query declined"
    | count;
let rate = declined / (total + declined) * 100;
union (print DeclineRate = rate)
| where DeclineRate > 25
```

If the KQL returns rows, the alert fires.

### Alert 3: Error rate

```
Signal: Failed requests (dependency or server exceptions)
Condition: Count > 5 in 5-minute window
Severity: Error (Sev 1)
Action group: Email IT Operations + SMS to on-call
Alert name: "Analytics API Errors"
```

## Part 6 — Evidence: Verify No PII in Telemetry

This final step verifies the monitoring system itself doesn't capture PII.

Run a "risky" question that contains a student name:

```http
POST https://localhost:5001/api/analytics/query
Content-Type: application/json
Authorization: Bearer {{teacher_token}}

{ "question": "How is Maria Gonzalez doing in reading?" }
```

Then run this KQL query in Application Insights:

```kql
// Search all telemetry for "Maria" (a student name)
union traces, exceptions, requests
| where timestamp > ago(1h)
| where * has "Maria"
| project timestamp, itemType, message, customDimensions
```

**Expected result:** Zero rows — "Maria" should not appear in any telemetry.

**If any rows return:** The question text is being logged. Find and fix the log statement immediately.

Document the KQL result (screenshot or paste the "No results" message) in your lab report.

## Lab Report

1. Paste the console trace output from Part 2 showing all spans and their durations.
2. Paste the structured log line from Part 2. Confirm question text is absent.
3. Paste a screenshot or text output of the Application Insights Workbook from Part 4 (at least Sections 1 and 4).
4. Paste the KQL result from Part 6 (no PII in telemetry). If rows returned, describe what you fixed and re-run to confirm zero rows.
5. For each of the 3 alerts in Part 5: describe the operational scenario that would trigger it and the correct remediation action.

*Next: Lab 08b — Production Checklist*
