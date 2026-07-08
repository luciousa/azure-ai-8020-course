# Module 09 — .NET Backend Integration

**Week:** 5 | **Estimated time:** 3 hours  
**Prerequisites:** Week 4 complete (views created, metadata catalog uploaded); Module 07 (ViewRegistry pattern)  
**Builds toward:** Lab 05a (.NET API), Week 6 (role-aware access control)

## Learning Objectives

By the end of this module you will be able to:

1. Design the .NET 10 API project structure for the district analytics assistant.
2. Implement dependency injection for Azure OpenAI, Azure AI Search, and SQL Server.
3. Build the RAG orchestration pipeline in C# using typed services.
4. Apply the ViewRegistry pattern to safely dispatch SQL queries from AI-selected view names.
5. Configure `DefaultAzureCredential` for POC (API key) and production (managed identity) auth.
6. Implement request/response models with role-based scoping from the caller context.

## Project Structure

```
DistrictAnalyticsApi/
├── DistrictAnalyticsApi.sln
├── src/
│   └── DistrictAnalyticsApi/
│       ├── Program.cs                    ← DI wiring, middleware
│       ├── appsettings.json              ← config keys (no secrets)
│       ├── appsettings.Development.json  ← local overrides
│       │
│       ├── Controllers/
│       │   └── AnalyticsController.cs    ← HTTP endpoints
│       │
│       ├── Models/
│       │   ├── AnalyticsRequest.cs       ← inbound question + context
│       │   ├── AnalyticsResponse.cs      ← outbound answer + citations
│       │   └── UserContext.cs            ← role, school, year — from auth
│       │
│       ├── Services/
│       │   ├── IRagOrchestrator.cs
│       │   ├── RagOrchestrator.cs        ← coordinates all pipeline stages
│       │   ├── IMetadataSearchService.cs
│       │   ├── MetadataSearchService.cs  ← AI Search hybrid search
│       │   ├── ISqlDataService.cs
│       │   ├── SqlDataService.cs         ← ViewRegistry + parameterized queries
│       │   ├── ICompletionService.cs
│       │   └── CompletionService.cs      ← Azure OpenAI chat completion
│       │
│       ├── Security/
│       │   └── ViewRegistry.cs           ← authorized view catalog
│       │
│       └── Prompts/
│           └── SystemPrompt.cs           ← system prompt constants
│
└── tests/
    └── DistrictAnalyticsApi.Tests/
        └── ViewRegistryTests.cs
```

## NuGet Packages

```xml
<!-- DistrictAnalyticsApi.csproj -->
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <!-- .NET 8 compatible: change to net8.0 -->
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>

  <ItemGroup>
    <!-- Azure OpenAI (.NET 10 — use latest stable) -->
    <PackageReference Include="Azure.AI.OpenAI" Version="2.*" />

    <!-- Azure AI Search -->
    <PackageReference Include="Azure.Search.Documents" Version="11.*" />

    <!-- Azure Identity — DefaultAzureCredential -->
    <PackageReference Include="Azure.Identity" Version="1.*" />

    <!-- SQL Server (Microsoft.Data.SqlClient — NOT System.Data.SqlClient) -->
    <PackageReference Include="Microsoft.Data.SqlClient" Version="5.*" />

    <!-- Options pattern for config -->
    <PackageReference Include="Microsoft.Extensions.Options.ConfigurationExtensions" Version="8.*" />

    <!-- OpenTelemetry (.NET 10 preferred telemetry) -->
    <PackageReference Include="OpenTelemetry.Extensions.Hosting" Version="1.*" />
    <PackageReference Include="OpenTelemetry.Exporter.AzureMonitor" Version="1.*" />
    <PackageReference Include="OpenTelemetry.Instrumentation.AspNetCore" Version="1.*" />
  </ItemGroup>
</Project>
```

> **Compatibility note:** If targeting .NET 8, all packages above are compatible — no changes needed except `<TargetFramework>net8.0</TargetFramework>`.

## Configuration

### appsettings.json

```json
{
  "AzureOpenAI": {
    "Endpoint": "",
    "ChatDeployment": "gpt-4o-mini",
    "EmbeddingDeployment": "text-embedding-3-small",
    "ApiVersion": "2024-08-01-preview"
  },
  "AzureSearch": {
    "Endpoint": "",
    "IndexName": "susd-metadata-v1"
  },
  "SqlServer": {
    "ConnectionString": ""
  },
  "Analytics": {
    "MaxTokensResponse": 600,
    "SearchTopK": 3
  }
}
```

### Secrets (user-secrets or environment — never committed)

```bash
dotnet user-secrets set "AzureOpenAI:ApiKey" "your-key"
dotnet user-secrets set "AzureSearch:ApiKey" "your-key"
dotnet user-secrets set "SqlServer:ConnectionString" "Server=...;UID=ai_svc_readonly;PWD=...;"
```

## Models

### UserContext.cs

```csharp
namespace DistrictAnalyticsApi.Models;

/// <summary>
/// Represents the authenticated user's context.
/// Sourced from the HTTP request claims (Entra ID token).
/// NEVER populated from user input or request body.
/// </summary>
public record UserContext
{
    /// <summary>"teacher" | "school_admin" | "district_admin"</summary>
    public required string Role { get; init; }

    /// <summary>e.g. "SCH001" — null for district_admin</summary>
    public string? SchoolId { get; init; }

    public string? SchoolName { get; init; }

    /// <summary>End-year convention: 2026 for 2025-26 school year</summary>
    public required int SchoolYear { get; init; }

    /// <summary>Current term: Q1, Q2, Q3, Q4, EOY</summary>
    public required string CurrentTermId { get; init; }

    /// <summary>Teacher section IDs — populated only for teacher role, from HR/SIS lookup</summary>
    public IReadOnlyList<string> SectionIds { get; init; } = [];
}
```

### AnalyticsRequest.cs

```csharp
namespace DistrictAnalyticsApi.Models;

public record AnalyticsRequest
{
    /// <summary>The user's natural language question.</summary>
    public required string Question { get; init; }

    /// <summary>Optional: override defaults from UserContext (must still validate against role).</summary>
    public string? OverrideSchoolId { get; init; }
    public int? OverrideSchoolYear { get; init; }
    public string? OverrideTermId { get; init; }
}
```

### AnalyticsResponse.cs

```csharp
namespace DistrictAnalyticsApi.Models;

public record AnalyticsResponse
{
    public required string Answer { get; init; }

    /// <summary>Which metadata document was retrieved (for transparency/audit).</summary>
    public string? SourceMetadataId { get; init; }
    public string? SourceViewName { get; init; }

    /// <summary>Whether the answer was grounded in retrieved SQL data.</summary>
    public bool IsGrounded { get; init; }

    /// <summary>Approximate token usage for monitoring.</summary>
    public int? ApproxTokensUsed { get; init; }

    /// <summary>True if the question was declined (out of scope or privacy reason).</summary>
    public bool Declined { get; init; }
    public string? DeclineReason { get; init; }
}
```

## Security — ViewRegistry.cs

```csharp
namespace DistrictAnalyticsApi.Security;

/// <summary>
/// Enforces the approved view catalog. No SQL view may be queried
/// unless it appears in this registry.
/// </summary>
public static class ViewRegistry
{
    public static readonly IReadOnlySet<string> AuthorizedViews =
        new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "vw_AttendanceSummaryByStudentAndTerm",
            "vw_AttendanceSummaryBySchoolAndGrade",
            "vw_LocalAssessmentResultsBySchoolAndGrade",
            "vw_StateAssessmentSummaryBySchoolAndGrade",
            "vw_AssessmentGapBySubgroup",
            "vw_PerformanceVsBenchmark",
            "vw_LongitudinalProficiencyTrend",
            "vw_InterventionStudentSummary",
            "vw_DataQualityFlags",
        };

    public static bool IsAuthorized(string? viewName) =>
        !string.IsNullOrWhiteSpace(viewName) &&
        AuthorizedViews.Contains(viewName);

    public static void ThrowIfNotAuthorized(string? viewName)
    {
        if (!IsAuthorized(viewName))
            throw new UnauthorizedAccessException(
                $"View '{viewName}' is not in the approved catalog and cannot be queried.");
    }
}
```

## Services

### MetadataSearchService.cs

```csharp
using Azure;
using Azure.Search.Documents;
using Azure.Search.Documents.Models;
using Azure.AI.OpenAI;
using DistrictAnalyticsApi.Models;
using Microsoft.Extensions.Options;

namespace DistrictAnalyticsApi.Services;

public record MetadataResult(
    string Id, string Title, string Content, string Category,
    string? ViewName, string? Parameters);

public interface IMetadataSearchService
{
    Task<MetadataResult?> FindBestMetadataAsync(
        string question, UserContext userContext,
        CancellationToken ct = default);
}

public class MetadataSearchService(
    SearchClient searchClient,
    AzureOpenAIClient openAiClient,
    IOptions<AzureOpenAIOptions> aiOptions) : IMetadataSearchService
{
    private readonly string _embeddingDeployment =
        aiOptions.Value.EmbeddingDeployment;

    public async Task<MetadataResult?> FindBestMetadataAsync(
        string question, UserContext userContext, CancellationToken ct = default)
    {
        // 1. Generate query embedding
        var embeddingClient = openAiClient.GetEmbeddingClient(_embeddingDeployment);
        var embeddingResult = await embeddingClient.GenerateEmbeddingAsync(question, ct);
        var vector = embeddingResult.Value.ToFloats();

        // 2. Build security trimming filter
        var roleFilter = $"role_scope/any(r: r eq '{userContext.Role}')";

        // 3. Hybrid search (BM25 + vector)
        var searchOptions = new SearchOptions
        {
            Filter = roleFilter,
            Select = { "id", "title", "content", "category", "view_name", "parameters" },
            Size = 3,
            VectorSearch = new VectorSearchOptions
            {
                Queries =
                {
                    new VectorizedQuery(vector)
                    {
                        KNearestNeighborsCount = 50,
                        Fields = { "content_vector" },
                    }
                }
            }
        };

        var searchResults = await searchClient.SearchAsync<SearchDocument>(
            question, searchOptions, ct);

        await foreach (var result in searchResults.Value.GetResultsAsync())
        {
            var doc = result.Document;
            return new MetadataResult(
                Id: doc["id"]?.ToString() ?? "",
                Title: doc["title"]?.ToString() ?? "",
                Content: doc["content"]?.ToString() ?? "",
                Category: doc["category"]?.ToString() ?? "",
                ViewName: doc.TryGetValue("view_name", out var vn) ? vn?.ToString() : null,
                Parameters: doc.TryGetValue("parameters", out var p) ? p?.ToString() : null
            );
        }
        return null;
    }
}
```

### SqlDataService.cs

```csharp
using Microsoft.Data.SqlClient;
using DistrictAnalyticsApi.Models;
using DistrictAnalyticsApi.Security;
using Microsoft.Extensions.Options;
using System.Data;
using System.Text;

namespace DistrictAnalyticsApi.Services;

public record SqlQueryResult(string ViewName, IReadOnlyList<IReadOnlyDictionary<string, object?>> Rows,
    int RowCount, string Summary);

public interface ISqlDataService
{
    Task<SqlQueryResult?> QueryViewAsync(
        string viewName, UserContext userContext,
        string question, MetadataResult metadata,
        CancellationToken ct = default);
}

public class SqlDataService(IOptions<SqlServerOptions> sqlOptions) : ISqlDataService
{
    private readonly string _connectionString = sqlOptions.Value.ConnectionString;

    public async Task<SqlQueryResult?> QueryViewAsync(
        string viewName, UserContext userContext,
        string question, MetadataResult metadata,
        CancellationToken ct = default)
    {
        // CRITICAL: validate view name before any SQL is executed
        ViewRegistry.ThrowIfNotAuthorized(viewName);

        // Dispatch to the correct typed method
        return viewName.ToLower() switch
        {
            "vw_attendancesummarybyschoolandgrade" =>
                await QueryAttendanceBySchoolGradeAsync(userContext, question, ct),

            "vw_localassessmentresultsbyschoolandgrade" =>
                await QueryLocalAssessmentAsync(userContext, question, ct),

            "vw_stateassessmentsummarybyschoolandgrade" =>
                await QueryStateAssessmentAsync(userContext, question, ct),

            "vw_assessmentgapbysubgroup" =>
                await QueryAssessmentGapAsync(userContext, question, ct),

            "vw_performancevsbenchmark" =>
                await QueryBenchmarkAsync(userContext, question, ct),

            "vw_longitudinalproficiencytrend" =>
                await QueryLongitudinalAsync(userContext, question, ct),

            "vw_interventionstudentsummary" =>
                await QueryInterventionAsync(userContext, question, ct),

            "vw_dataqualityflags" =>
                await QueryDataQualityAsync(userContext, ct),

            // vw_AttendanceSummaryByStudentAndTerm requires teacher section IDs
            "vw_attendancesummarybystudentandterm" =>
                await QueryStudentAttendanceAsync(userContext, ct),

            // Should never reach here — ThrowIfNotAuthorized catches unknown names
            _ => throw new InvalidOperationException($"No handler registered for view '{viewName}'")
        };
    }

    private async Task<SqlQueryResult> QueryAttendanceBySchoolGradeAsync(
        UserContext ctx, string question, CancellationToken ct)
    {
        // Parse grade level from question (simplified — production uses LLM extraction)
        string? gradeLevel = ExtractGradeLevel(question);

        var sql = new StringBuilder("""
            SELECT SchoolID, SchoolName, GradeLevel, TermID, SchoolYear,
                   TotalEnrollment, AttendanceRate, ChronicallyAbsentCount,
                   ChronicallyAbsentRate, AvgUnexcusedAbsences
            FROM vw_AttendanceSummaryBySchoolAndGrade
            WHERE SchoolYear = @SchoolYear
            """);

        var parameters = new List<(string Name, object? Value)>
        {
            ("@SchoolYear", ctx.SchoolYear),
        };

        if (ctx.Role != "district_admin" && ctx.SchoolId is not null)
        {
            sql.Append(" AND SchoolID = @SchoolID");
            parameters.Add(("@SchoolID", ctx.SchoolId));
        }

        if (!string.IsNullOrEmpty(ctx.CurrentTermId))
        {
            sql.Append(" AND TermID = @TermID");
            parameters.Add(("@TermID", ctx.CurrentTermId));
        }

        if (gradeLevel is not null)
        {
            sql.Append(" AND GradeLevel = @GradeLevel");
            parameters.Add(("@GradeLevel", gradeLevel));
        }

        sql.Append(" ORDER BY SchoolName, GradeLevel");

        var rows = await ExecuteQueryAsync(sql.ToString(), parameters, ct);
        return new SqlQueryResult(
            ViewName: "vw_AttendanceSummaryBySchoolAndGrade",
            Rows: rows,
            RowCount: rows.Count,
            Summary: FormatSummary(rows, "attendance")
        );
    }

    private async Task<SqlQueryResult> QueryLocalAssessmentAsync(
        UserContext ctx, string question, CancellationToken ct)
    {
        string? gradeLevel = ExtractGradeLevel(question);
        string? subjectArea = ExtractSubjectArea(question);
        string? window = ExtractAssessmentWindow(question);

        var sql = new StringBuilder("""
            SELECT SchoolID, SchoolName, GradeLevel, SubjectArea, AssessmentWindow,
                   SchoolYear, TotalAssessed, AvgScore, PctBelowBasic, PctBasic,
                   PctProficient, PctAdvanced, PctProficientOrAbove
            FROM vw_LocalAssessmentResultsBySchoolAndGrade
            WHERE SchoolYear = @SchoolYear
            """);

        var parameters = new List<(string Name, object? Value)>
        {
            ("@SchoolYear", ctx.SchoolYear),
        };

        if (ctx.Role != "district_admin" && ctx.SchoolId is not null)
        {
            sql.Append(" AND SchoolID = @SchoolID");
            parameters.Add(("@SchoolID", ctx.SchoolId));
        }
        if (gradeLevel is not null) { sql.Append(" AND GradeLevel = @GradeLevel"); parameters.Add(("@GradeLevel", gradeLevel)); }
        if (subjectArea is not null) { sql.Append(" AND SubjectArea = @SubjectArea"); parameters.Add(("@SubjectArea", subjectArea)); }
        if (window is not null) { sql.Append(" AND AssessmentWindow = @Window"); parameters.Add(("@Window", window)); }
        sql.Append(" ORDER BY SchoolName, GradeLevel, SubjectArea");

        var rows = await ExecuteQueryAsync(sql.ToString(), parameters, ct);
        return new SqlQueryResult("vw_LocalAssessmentResultsBySchoolAndGrade",
            rows, rows.Count, FormatSummary(rows, "assessment"));
    }

    // Simplified stubs for remaining views (Lab 05a fills these in)
    private Task<SqlQueryResult> QueryStateAssessmentAsync(UserContext ctx, string q, CancellationToken ct)
        => Task.FromResult(new SqlQueryResult("vw_StateAssessmentSummaryBySchoolAndGrade", [], 0, "[stub]"));
    private Task<SqlQueryResult> QueryAssessmentGapAsync(UserContext ctx, string q, CancellationToken ct)
        => Task.FromResult(new SqlQueryResult("vw_AssessmentGapBySubgroup", [], 0, "[stub]"));
    private Task<SqlQueryResult> QueryBenchmarkAsync(UserContext ctx, string q, CancellationToken ct)
        => Task.FromResult(new SqlQueryResult("vw_PerformanceVsBenchmark", [], 0, "[stub]"));
    private Task<SqlQueryResult> QueryLongitudinalAsync(UserContext ctx, string q, CancellationToken ct)
        => Task.FromResult(new SqlQueryResult("vw_LongitudinalProficiencyTrend", [], 0, "[stub]"));
    private Task<SqlQueryResult> QueryInterventionAsync(UserContext ctx, string q, CancellationToken ct)
        => Task.FromResult(new SqlQueryResult("vw_InterventionStudentSummary", [], 0, "[stub]"));
    private Task<SqlQueryResult> QueryDataQualityAsync(UserContext ctx, CancellationToken ct)
        => Task.FromResult(new SqlQueryResult("vw_DataQualityFlags", [], 0, "[stub]"));
    private Task<SqlQueryResult> QueryStudentAttendanceAsync(UserContext ctx, CancellationToken ct)
        => Task.FromResult(new SqlQueryResult("vw_AttendanceSummaryByStudentAndTerm", [], 0, "[stub]"));

    // --- Helpers ---

    private async Task<List<IReadOnlyDictionary<string, object?>>> ExecuteQueryAsync(
        string sql, IEnumerable<(string Name, object? Value)> parameters, CancellationToken ct)
    {
        await using var conn = new SqlConnection(_connectionString);
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        cmd.CommandType = CommandType.Text;

        foreach (var (name, value) in parameters)
            cmd.Parameters.AddWithValue(name, value ?? DBNull.Value);

        var rows = new List<IReadOnlyDictionary<string, object?>>();
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            var row = new Dictionary<string, object?>();
            for (int i = 0; i < reader.FieldCount; i++)
                row[reader.GetName(i)] = reader.IsDBNull(i) ? null : reader.GetValue(i);
            rows.Add(row);
        }
        return rows;
    }

    private static string FormatSummary(IReadOnlyList<IReadOnlyDictionary<string, object?>> rows, string domain)
    {
        if (rows.Count == 0) return "No data returned for the specified parameters.";
        var sb = new StringBuilder($"Retrieved {rows.Count} row(s) of {domain} data:\n");
        foreach (var row in rows.Take(10)) // cap for token budget
            sb.AppendLine(string.Join(", ", row.Select(kv => $"{kv.Key}={kv.Value}")));
        if (rows.Count > 10) sb.AppendLine($"... and {rows.Count - 10} more rows.");
        return sb.ToString();
    }

    private static string? ExtractGradeLevel(string question)
    {
        // Simplified extraction — production uses LLM extraction
        var grades = new[] { "K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12" };
        foreach (var g in grades)
        {
            if (question.Contains($"Grade {g}", StringComparison.OrdinalIgnoreCase) ||
                question.Contains($"grade {g}", StringComparison.OrdinalIgnoreCase))
                return g == "K" ? "K" : $"Grade {g}";
        }
        if (question.Contains("kindergarten", StringComparison.OrdinalIgnoreCase)) return "K";
        return null;
    }

    private static string? ExtractSubjectArea(string question)
    {
        if (question.Contains("ELA", StringComparison.OrdinalIgnoreCase) ||
            question.Contains("reading", StringComparison.OrdinalIgnoreCase) ||
            question.Contains("literacy", StringComparison.OrdinalIgnoreCase))
            return "ELA";
        if (question.Contains("math", StringComparison.OrdinalIgnoreCase) ||
            question.Contains("mathematics", StringComparison.OrdinalIgnoreCase))
            return "Math";
        return null;
    }

    private static string? ExtractAssessmentWindow(string question)
    {
        if (question.Contains("BOY", StringComparison.OrdinalIgnoreCase) ||
            question.Contains("beginning of year", StringComparison.OrdinalIgnoreCase) ||
            question.Contains("fall benchmark", StringComparison.OrdinalIgnoreCase))
            return "BOY";
        if (question.Contains("MOY", StringComparison.OrdinalIgnoreCase) ||
            question.Contains("mid-year", StringComparison.OrdinalIgnoreCase) ||
            question.Contains("middle of year", StringComparison.OrdinalIgnoreCase))
            return "MOY";
        if (question.Contains("EOY", StringComparison.OrdinalIgnoreCase) ||
            question.Contains("end of year", StringComparison.OrdinalIgnoreCase) ||
            question.Contains("spring benchmark", StringComparison.OrdinalIgnoreCase))
            return "EOY";
        return null;
    }
}
```

### CompletionService.cs

```csharp
using Azure.AI.OpenAI;
using OpenAI.Chat;
using DistrictAnalyticsApi.Models;
using Microsoft.Extensions.Options;

namespace DistrictAnalyticsApi.Services;

public interface ICompletionService
{
    Task<(string Answer, int TokensUsed)> GenerateAnswerAsync(
        string systemPrompt, string augmentedPrompt, CancellationToken ct = default);
}

public class CompletionService(
    AzureOpenAIClient openAiClient,
    IOptions<AzureOpenAIOptions> aiOptions) : ICompletionService
{
    private readonly string _chatDeployment = aiOptions.Value.ChatDeployment;
    private readonly int _maxTokens = 600;

    public async Task<(string Answer, int TokensUsed)> GenerateAnswerAsync(
        string systemPrompt, string augmentedPrompt, CancellationToken ct = default)
    {
        var chatClient = openAiClient.GetChatClient(_chatDeployment);

        var messages = new List<ChatMessage>
        {
            ChatMessage.CreateSystemMessage(systemPrompt),
            ChatMessage.CreateUserMessage(augmentedPrompt),
        };

        var options = new ChatCompletionOptions
        {
            MaxOutputTokenCount = _maxTokens,
            Temperature = 0.1f,  // Low temperature for factual analytics
        };

        var completion = await chatClient.CompleteChatAsync(messages, options, ct);
        var answer = completion.Value.Content[0].Text;
        var tokensUsed = completion.Value.Usage.TotalTokenCount;

        return (answer, tokensUsed);
    }
}
```

### RagOrchestrator.cs

```csharp
using DistrictAnalyticsApi.Models;
using DistrictAnalyticsApi.Prompts;
using DistrictAnalyticsApi.Security;

namespace DistrictAnalyticsApi.Services;

public interface IRagOrchestrator
{
    Task<AnalyticsResponse> ProcessQuestionAsync(
        string question, UserContext userContext, CancellationToken ct = default);
}

public class RagOrchestrator(
    IMetadataSearchService metadataSearch,
    ISqlDataService sqlData,
    ICompletionService completion,
    ILogger<RagOrchestrator> logger) : IRagOrchestrator
{
    public async Task<AnalyticsResponse> ProcessQuestionAsync(
        string question, UserContext userContext, CancellationToken ct = default)
    {
        logger.LogInformation(
            "RAG pipeline started. Role={Role} SchoolId={SchoolId} Question={Question}",
            userContext.Role, userContext.SchoolId, question);

        // Stage 1 — Question received (already here)

        // Stage 2 — Embed and retrieve metadata
        var metadata = await metadataSearch.FindBestMetadataAsync(question, userContext, ct);
        if (metadata is null)
        {
            logger.LogWarning("No metadata found for question.");
            return new AnalyticsResponse
            {
                Answer = "I couldn't find relevant information in the knowledge base for that question. "
                       + "Please try rephrasing, or ask about attendance or assessment data.",
                IsGrounded = false,
                Declined = false,
            };
        }

        logger.LogInformation("Metadata retrieved: {Id} category={Category} view={View}",
            metadata.Id, metadata.Category, metadata.ViewName);

        // Stage 3a — Determine if we need SQL data
        SqlQueryResult? sqlResult = null;
        if (!string.IsNullOrEmpty(metadata.ViewName) &&
            ViewRegistry.IsAuthorized(metadata.ViewName))
        {
            try
            {
                sqlResult = await sqlData.QueryViewAsync(
                    metadata.ViewName, userContext, question, metadata, ct);

                logger.LogInformation("SQL data retrieved: view={View} rows={Rows}",
                    sqlResult.ViewName, sqlResult.RowCount);
            }
            catch (UnauthorizedAccessException ex)
            {
                logger.LogError(ex, "ViewRegistry rejected view '{View}'", metadata.ViewName);
                return new AnalyticsResponse
                {
                    Answer = "This query cannot be processed due to access restrictions.",
                    Declined = true,
                    DeclineReason = "view_not_authorized",
                };
            }
        }

        // Stage 4 — Build augmented prompt
        var augmentedPrompt = BuildAugmentedPrompt(question, userContext, metadata, sqlResult);

        // Stage 5 — Generate answer
        var (answer, tokensUsed) = await completion.GenerateAnswerAsync(
            SystemPrompt.Build(userContext), augmentedPrompt, ct);

        logger.LogInformation("Answer generated. TokensUsed={Tokens}", tokensUsed);

        return new AnalyticsResponse
        {
            Answer = answer,
            SourceMetadataId = metadata.Id,
            SourceViewName = metadata.ViewName,
            IsGrounded = sqlResult is not null,
            ApproxTokensUsed = tokensUsed,
            Declined = false,
        };
    }

    private static string BuildAugmentedPrompt(
        string question, UserContext ctx,
        MetadataResult metadata, SqlQueryResult? sqlResult)
    {
        var sb = new System.Text.StringBuilder();

        sb.AppendLine("## User Context");
        sb.AppendLine($"Role: {ctx.Role}");
        sb.AppendLine($"School: {ctx.SchoolName ?? "All Schools"} ({ctx.SchoolId ?? "district"})");
        sb.AppendLine($"School Year: {ctx.SchoolYear} (2025-26)");
        sb.AppendLine($"Current Term: {ctx.CurrentTermId}");

        sb.AppendLine("\n## Retrieved Metadata");
        sb.AppendLine($"Source: {metadata.Title}");
        sb.AppendLine(metadata.Content);

        if (sqlResult is not null)
        {
            sb.AppendLine("\n## Retrieved Data");
            sb.AppendLine($"View: {sqlResult.ViewName}");
            sb.AppendLine(sqlResult.Summary);
        }
        else
        {
            sb.AppendLine("\n## Note");
            sb.AppendLine("No SQL data was retrieved for this question. "
                + "Answer using only the metadata context above.");
        }

        sb.AppendLine($"\n## Question\n{question}");

        return sb.ToString();
    }
}
```

## Program.cs — Dependency Injection

```csharp
using Azure;
using Azure.AI.OpenAI;
using Azure.Identity;
using Azure.Search.Documents;
using DistrictAnalyticsApi.Services;
using DistrictAnalyticsApi.Security;

var builder = WebApplication.CreateBuilder(args);

// Options
builder.Services.Configure<AzureOpenAIOptions>(
    builder.Configuration.GetSection("AzureOpenAI"));
builder.Services.Configure<SqlServerOptions>(
    builder.Configuration.GetSection("SqlServer"));

// Azure OpenAI client
// POC: API key; Production: DefaultAzureCredential (zero code change needed)
builder.Services.AddSingleton<AzureOpenAIClient>(sp =>
{
    var opts = builder.Configuration.GetSection("AzureOpenAI");
    var endpoint = new Uri(opts["Endpoint"]!);
    var apiKey = opts["ApiKey"];

    return string.IsNullOrEmpty(apiKey)
        ? new AzureOpenAIClient(endpoint, new DefaultAzureCredential())  // Managed identity
        : new AzureOpenAIClient(endpoint, new AzureKeyCredential(apiKey)); // API key (POC)
});

// Azure AI Search client
builder.Services.AddSingleton<SearchClient>(sp =>
{
    var opts = builder.Configuration.GetSection("AzureSearch");
    var endpoint = new Uri(opts["Endpoint"]!);
    var indexName = opts["IndexName"]!;
    var apiKey = opts["ApiKey"];

    return string.IsNullOrEmpty(apiKey)
        ? new SearchClient(endpoint, indexName, new DefaultAzureCredential())
        : new SearchClient(endpoint, indexName, new AzureKeyCredential(apiKey));
});

// Application services
builder.Services.AddScoped<IMetadataSearchService, MetadataSearchService>();
builder.Services.AddScoped<ISqlDataService, SqlDataService>();
builder.Services.AddScoped<ICompletionService, CompletionService>();
builder.Services.AddScoped<IRagOrchestrator, RagOrchestrator>();

// API
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// OpenTelemetry (preferred in .NET 10)
// .NET 8 compatible — same API
builder.Services.AddOpenTelemetry()
    .WithTracing(b => b.AddAspNetCoreInstrumentation())
    .WithMetrics(b => b.AddAspNetCoreInstrumentation());

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthorization();
app.MapControllers();
app.Run();

// Options classes
public record AzureOpenAIOptions
{
    public required string Endpoint { get; init; }
    public string? ApiKey { get; init; }
    public required string ChatDeployment { get; init; }
    public required string EmbeddingDeployment { get; init; }
    public string ApiVersion { get; init; } = "2024-08-01-preview";
}

public record SqlServerOptions
{
    public required string ConnectionString { get; init; }
}
```

## Prompts — SystemPrompt.cs

```csharp
using DistrictAnalyticsApi.Models;

namespace DistrictAnalyticsApi.Prompts;

public static class SystemPrompt
{
    public static string Build(UserContext ctx) => $"""
        You are the SUSD Analytics Assistant — a data analysis tool for Sunlake Unified School District.
        
        Your role:
        - Answer questions about attendance and assessment data using ONLY the provided context.
        - Never fabricate data, percentages, or trends.
        - If retrieved data contains suppressed values (NULL), explain that the data is suppressed
          because the group size is below the 10-student reporting threshold.
        
        The user's role is: {ctx.Role}
        The user's school: {ctx.SchoolName ?? "All Schools (district-wide)"}
        
        Scope rules:
        - Teachers see only their own students and sections.
        - School administrators see only their own school.
        - District administrators may see all schools.
        
        IMPORTANT:
        - If the question asks for individual student names, scores, or records, decline:
          "I cannot provide individual student records through this interface."
        - If the question asks about data not present in the retrieved context, say:
          "I don't have that information in the available data."
        - Cite the data source (view name) when you provide numbers.
        - Keep answers concise and factual.
        """;
}
```

## Controller

```csharp
using DistrictAnalyticsApi.Models;
using DistrictAnalyticsApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace DistrictAnalyticsApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AnalyticsController(IRagOrchestrator orchestrator) : ControllerBase
{
    [HttpPost("query")]
    [ProducesResponseType<AnalyticsResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Query(
        [FromBody] AnalyticsRequest request,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Question))
            return BadRequest("Question cannot be empty.");

        // In a real deployment: extract UserContext from HttpContext.User claims.
        // For lab: use a hardcoded context simulating a school_admin.
        var userContext = GetUserContextFromClaims();

        var response = await orchestrator.ProcessQuestionAsync(
            request.Question, userContext, ct);

        return Ok(response);
    }

    private UserContext GetUserContextFromClaims()
    {
        // Lab placeholder — Week 6 replaces this with real Entra ID claim extraction
        return new UserContext
        {
            Role = "school_admin",
            SchoolId = "SCH001",
            SchoolName = "Palmetto Ridge Elementary",
            SchoolYear = 2026,
            CurrentTermId = "Q1",
        };
    }
}
```

## DefaultAzureCredential: POC vs. Production

| Environment | Auth Method | Code Change Required? |
|-------------|-------------|----------------------|
| Local POC | API key in user-secrets | No |
| Azure POC (App Service) | `DefaultAzureCredential` → system-assigned managed identity | No — already in `Program.cs` |
| Production | `DefaultAzureCredential` → managed identity | No |

`DefaultAzureCredential` tries: environment variables → workload identity → managed identity → Visual Studio → Azure CLI → browser. In local dev it falls through to CLI auth if no API key is set. In Azure, managed identity is used automatically.

The pattern in `Program.cs` above handles both cases: if `ApiKey` is present in config, it uses key auth; if absent, it uses `DefaultAzureCredential`. No code change needed when moving from POC to production — only config changes.

## Reflection Questions

1. The `UserContext` record is marked `required` for `Role` and `SchoolYear`. Why is this important for the security model?
2. The `RagOrchestrator` catches `UnauthorizedAccessException` from `ViewRegistry.ThrowIfNotAuthorized()`. What specific scenario would trigger this exception, and what does it protect against?
3. Why is `ISqlDataService` registered as `Scoped` rather than `Singleton`? What would go wrong if it were `Singleton` with `SqlConnection`?
4. The `ExtractGradeLevel` helper in `SqlDataService` uses simple string matching. What are the failure modes, and how would you improve parameter extraction in a production system?

## References

- [Azure OpenAI .NET SDK — azure-sdk-for-net](https://github.com/Azure/azure-sdk-for-net/tree/main/sdk/openai/Azure.AI.OpenAI)
- [Azure AI Search .NET SDK](https://learn.microsoft.com/dotnet/api/overview/azure/search)
- [DefaultAzureCredential — Azure Identity](https://learn.microsoft.com/dotnet/azure/sdk/authentication/credential-chains)
- [Microsoft.Data.SqlClient — parameterized queries](https://learn.microsoft.com/sql/connect/ado-net/sql/sqlclient-support-always-encrypted)
- [OpenTelemetry .NET](https://opentelemetry.io/docs/languages/net/)

*Next: Module 10 — Python Prototyping*
