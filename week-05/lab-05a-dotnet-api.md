# Lab 05a — .NET API: Build and Run the District Analytics Assistant

**Week:** 5 | **Lab:** 05a | **Estimated time:** 3–3.5 hours  
**Prerequisites:** Module 09 (.NET backend); Lab 04a (approved views); Lab 04b (metadata catalog)  
**Paired with:** Lab 05b (Python prototype)

## Lab Objectives

1. Create the `DistrictAnalyticsApi` .NET 10 project with all services from Module 09.
2. Implement SQL handlers for the remaining 7 approved views (stubs in Module 09).
3. Run the API locally and test all 3 role contexts using `curl` / HTTP files.
4. Verify security trimming: teacher role cannot trigger admin-only views.
5. Confirm parameterized queries by checking SQL Server logs for bind parameters.
6. Measure token usage and document the system prompt token budget.

## Part 1 — Project Setup

### 1.1 Create the project

```bash
# In your working directory
dotnet new webapi -n DistrictAnalyticsApi --framework net10.0 -o DistrictAnalyticsApi
cd DistrictAnalyticsApi

# Remove the template WeatherForecast files
rm Controllers/WeatherForecastController.cs WeatherForecast.cs
```

### 1.2 Install NuGet packages

```bash
dotnet add package Azure.AI.OpenAI --version 2.1.0
dotnet add package Azure.Search.Documents --version 11.6.1
dotnet add package Azure.Identity --version 1.13.1
dotnet add package Microsoft.Data.SqlClient --version 5.2.2
dotnet add package OpenTelemetry.Extensions.Hosting --version 1.10.0
dotnet add package OpenTelemetry.Instrumentation.AspNetCore --version 1.10.1
dotnet add package Azure.Monitor.OpenTelemetry.AspNetCore --version 1.3.0
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer --version 9.0.0
```

> **Note (.NET 8 compatible):** Replace `--framework net10.0` with `net8.0`. All packages listed are .NET 8 compatible.

### 1.3 Directory structure

Create the following directories:

```
DistrictAnalyticsApi/
├── Controllers/
├── Models/
├── Services/
├── Security/
├── Prompts/
├── appsettings.json
├── appsettings.Development.json  ← secrets (gitignored)
└── http/                         ← HTTP test files
    ├── teacher-queries.http
    ├── school-admin-queries.http
    └── district-admin-queries.http
```

```bash
mkdir -p Controllers Models Services Security Prompts http
```

## Part 2 — Models

Create `Models/UserContext.cs`:

```csharp
namespace DistrictAnalyticsApi.Models;

/// <summary>
/// Represents the authenticated user's identity and data scope.
/// Populated exclusively from Entra ID token claims — never from request body.
/// </summary>
public record UserContext
{
    public required string Role { get; init; }        // "teacher" | "school_admin" | "district_admin"
    public string? SchoolId { get; init; }
    public string? SchoolName { get; init; }
    public required int SchoolYear { get; init; }     // end year: 2026 = 2025-26
    public required string CurrentTermId { get; init; }
    public IReadOnlyList<string> SectionIds { get; init; } = [];
}
```

Create `Models/AnalyticsRequest.cs`:

```csharp
namespace DistrictAnalyticsApi.Models;

public record AnalyticsRequest
{
    public required string Question { get; init; }

    // Optional overrides for POC testing — remove in production
    public string? DebugRole { get; init; }
    public string? DebugSchoolId { get; init; }
    public string? DebugSchoolName { get; init; }
}
```

Create `Models/AnalyticsResponse.cs`:

```csharp
namespace DistrictAnalyticsApi.Models;

public record AnalyticsResponse
{
    public required string Answer { get; init; }
    public string? SourceMetadataId { get; init; }
    public string? SourceViewName { get; init; }
    public bool IsGrounded { get; init; }
    public int? ApproxTokensUsed { get; init; }
    public bool Declined { get; init; }
    public string? DeclineReason { get; init; }
}
```

## Part 3 — Security Layer

Create `Security/ViewRegistry.cs`:

```csharp
namespace DistrictAnalyticsApi.Security;

/// <summary>
/// Single source of truth for the approved view catalog.
/// ThrowIfNotAuthorized must be called before any SQL execution.
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

    // These views have metadata role_scope = ["school_admin", "district_admin"]
    // but we enforce at both Search filter AND application layer
    public static readonly IReadOnlySet<string> AdminOnlyViews =
        new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "vw_AssessmentGapBySubgroup",
            "vw_PerformanceVsBenchmark",
            "vw_LongitudinalProficiencyTrend",
            "vw_InterventionStudentSummary",
            "vw_DataQualityFlags",
        };

    public static bool IsAuthorized(string? viewName)
        => viewName is not null && AuthorizedViews.Contains(viewName);

    public static void ThrowIfNotAuthorized(string? viewName, string? role = null)
    {
        if (!IsAuthorized(viewName))
            throw new UnauthorizedAccessException(
                $"View '{viewName}' is not in the approved catalog.");

        if (role == "teacher" && viewName is not null && AdminOnlyViews.Contains(viewName))
            throw new UnauthorizedAccessException(
                $"Role 'teacher' is not authorized to query '{viewName}'.");
    }
}
```

## Part 4 — Services

### 4.1 MetadataSearchService

Create `Services/IMetadataSearchService.cs`:

```csharp
using DistrictAnalyticsApi.Models;
using Azure.Search.Documents.Models;

namespace DistrictAnalyticsApi.Services;

public interface IMetadataSearchService
{
    Task<SearchDocument?> FindBestMetadataAsync(string question, UserContext ctx,
        CancellationToken cancellationToken = default);
}
```

Create `Services/MetadataSearchService.cs`:

```csharp
using Azure.AI.OpenAI;
using Azure.Search.Documents;
using Azure.Search.Documents.Models;
using DistrictAnalyticsApi.Models;
using Microsoft.Extensions.Configuration;

namespace DistrictAnalyticsApi.Services;

public class MetadataSearchService : IMetadataSearchService
{
    private readonly EmbeddingClient _embeddingClient;
    private readonly SearchClient _searchClient;
    private readonly ILogger<MetadataSearchService> _logger;

    public MetadataSearchService(
        AzureOpenAIClient openAiClient,
        SearchClient searchClient,
        IConfiguration config,
        ILogger<MetadataSearchService> logger)
    {
        _embeddingClient = openAiClient.GetEmbeddingClient(
            config["AzureOpenAI:EmbeddingDeployment"] ?? "text-embedding-3-small");
        _searchClient = searchClient;
        _logger = logger;
    }

    public async Task<SearchDocument?> FindBestMetadataAsync(
        string question, UserContext ctx, CancellationToken cancellationToken = default)
    {
        // Stage 1: Embed the question
        var embeddingResult = await _embeddingClient.GenerateEmbeddingAsync(
            question, cancellationToken: cancellationToken);
        var vector = embeddingResult.Value.ToFloats();

        // Stage 2: Hybrid search with security trimming
        var vectorQuery = new VectorizedQuery(vector)
        {
            KNearestNeighborsCount = 50,
            Fields = { "content_vector" },
        };

        var options = new SearchOptions
        {
            Filter = $"role_scope/any(r: r eq '{ctx.Role}')",
            Size = 3,
            Select = { "id", "title", "content", "category", "view_name", "parameters" },
            VectorSearch = new() { Queries = { vectorQuery } },
            QueryType = SearchQueryType.Semantic,
            SemanticSearch = new SemanticSearchOptions
            {
                SemanticConfigurationName = "susd-semantic-v1",
            },
        };

        var results = await _searchClient.SearchAsync<SearchDocument>(
            question, options, cancellationToken);

        await foreach (var result in results.Value.GetResultsAsync())
        {
            _logger.LogDebug("Metadata hit: {Id} score={Score}",
                result.Document["id"], result.Score);
            return result.Document;
        }

        return null;
    }
}
```

### 4.2 SqlDataService

Create `Services/ISqlDataService.cs`:

```csharp
using DistrictAnalyticsApi.Models;

namespace DistrictAnalyticsApi.Services;

public record SqlQueryResult(string ViewName, IReadOnlyList<IDictionary<string, object?>> Rows, string Summary);

public interface ISqlDataService
{
    Task<SqlQueryResult?> QueryViewAsync(string viewName, UserContext ctx,
        IDictionary<string, string?> extractedParams,
        CancellationToken cancellationToken = default);
}
```

Create `Services/SqlDataService.cs`:

```csharp
using System.Text;
using DistrictAnalyticsApi.Models;
using DistrictAnalyticsApi.Security;
using Microsoft.Data.SqlClient;

namespace DistrictAnalyticsApi.Services;

public class SqlDataService : ISqlDataService
{
    private readonly string _connectionString;
    private readonly ILogger<SqlDataService> _logger;

    public SqlDataService(IConfiguration config, ILogger<SqlDataService> logger)
    {
        _connectionString = config.GetConnectionString("SqlServer")
            ?? throw new InvalidOperationException("Missing SqlServer connection string");
        _logger = logger;
    }

    public async Task<SqlQueryResult?> QueryViewAsync(
        string viewName, UserContext ctx, IDictionary<string, string?> extractedParams,
        CancellationToken cancellationToken = default)
    {
        // Guard: must be in approved catalog and role must have access
        ViewRegistry.ThrowIfNotAuthorized(viewName, ctx.Role);

        return viewName.ToLowerInvariant() switch
        {
            "vw_attendancesummarybyschoolandgrade"
                => await QueryAttendanceBySchoolGradeAsync(ctx, extractedParams, cancellationToken),
            "vw_attendancesummarybystudentandterm"
                => await QueryStudentAttendanceAsync(ctx, extractedParams, cancellationToken),
            "vw_localassessmentresultsbyschoolandgrade"
                => await QueryLocalAssessmentAsync(ctx, extractedParams, cancellationToken),
            "vw_stateassessmentsummarybyschoolandgrade"
                => await QueryStateAssessmentAsync(ctx, extractedParams, cancellationToken),
            "vw_assessmentgapbysubgroup"
                => await QueryAssessmentGapAsync(ctx, extractedParams, cancellationToken),
            "vw_performancevsbenchmark"
                => await QueryBenchmarkAsync(ctx, extractedParams, cancellationToken),
            "vw_longitudinalproficiencytrend"
                => await QueryLongitudinalAsync(ctx, extractedParams, cancellationToken),
            "vw_interventionstudentsummary"
                => await QueryInterventionAsync(ctx, extractedParams, cancellationToken),
            "vw_dataqualityflags"
                => await QueryDataQualityAsync(ctx, extractedParams, cancellationToken),
            _ => null
        };
    }

    // ── Attendance by School/Grade ──────────────────────────────────────────

    private async Task<SqlQueryResult> QueryAttendanceBySchoolGradeAsync(
        UserContext ctx, IDictionary<string, string?> p, CancellationToken ct)
    {
        var sb = new StringBuilder(@"
            SELECT SchoolID, SchoolName, GradeLevel, TermID, SchoolYear,
                   TotalEnrollment, AttendanceRate, ChronicallyAbsentCount,
                   ChronicallyAbsentRate, AvgUnexcusedAbsences
            FROM vw_AttendanceSummaryBySchoolAndGrade
            WHERE SchoolYear = @SchoolYear");

        var parms = new List<SqlParameter>
        {
            new("@SchoolYear", ctx.SchoolYear)
        };

        if (ctx.Role != "district_admin" && ctx.SchoolId is not null)
        {
            sb.Append(" AND SchoolID = @SchoolId");
            parms.Add(new("@SchoolId", ctx.SchoolId));
        }

        if (!string.IsNullOrEmpty(ctx.CurrentTermId))
        {
            sb.Append(" AND TermID = @TermId");
            parms.Add(new("@TermId", ctx.CurrentTermId));
        }

        if (p.TryGetValue("grade_level", out var grade) && !string.IsNullOrEmpty(grade))
        {
            sb.Append(" AND GradeLevel = @GradeLevel");
            parms.Add(new("@GradeLevel", grade));
        }

        sb.Append(" ORDER BY SchoolName, GradeLevel");

        var rows = await ExecuteQueryAsync(sb.ToString(), parms, ct);
        return new SqlQueryResult(
            "vw_AttendanceSummaryBySchoolAndGrade",
            rows,
            FormatSummary(rows, "attendance by school and grade"));
    }

    // ── Student Attendance (teacher-scoped) ────────────────────────────────

    private async Task<SqlQueryResult> QueryStudentAttendanceAsync(
        UserContext ctx, IDictionary<string, string?> p, CancellationToken ct)
    {
        // Teacher must provide section IDs — no cross-section access
        if (ctx.Role == "teacher" && ctx.SectionIds.Count == 0)
            return new SqlQueryResult("vw_AttendanceSummaryByStudentAndTerm",
                [], "No sections are associated with your account.");

        var sb = new StringBuilder(@"
            SELECT StudentKey, SectionID, TermID, SchoolYear,
                   TotalDaysPresent, TotalDaysAbsent, AttendanceRate,
                   ExcusedAbsences, UnexcusedAbsences, IsChronicallyAbsent
            FROM vw_AttendanceSummaryByStudentAndTerm
            WHERE SchoolYear = @SchoolYear");

        var parms = new List<SqlParameter>
        {
            new("@SchoolYear", ctx.SchoolYear)
        };

        if (ctx.Role == "teacher")
        {
            // Parameterize section list — never interpolate
            var idParams = ctx.SectionIds
                .Select((id, i) => new SqlParameter($"@SId{i}", id))
                .ToList();
            sb.Append($" AND SectionID IN ({string.Join(",", idParams.Select(x => x.ParameterName))})");
            parms.AddRange(idParams);
        }
        else if (ctx.Role == "school_admin" && ctx.SchoolId is not null)
        {
            sb.Append(" AND SchoolID = @SchoolId");
            parms.Add(new("@SchoolId", ctx.SchoolId));
        }

        if (!string.IsNullOrEmpty(ctx.CurrentTermId))
        {
            sb.Append(" AND TermID = @TermId");
            parms.Add(new("@TermId", ctx.CurrentTermId));
        }

        // Limit rows to prevent token overflow — student-level data can be large
        sb.Append(" ORDER BY AttendanceRate ASC OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY");

        var rows = await ExecuteQueryAsync(sb.ToString(), parms, ct);
        return new SqlQueryResult(
            "vw_AttendanceSummaryByStudentAndTerm",
            rows,
            FormatSummary(rows, "student attendance"));
    }

    // ── Local Assessment ───────────────────────────────────────────────────

    private async Task<SqlQueryResult> QueryLocalAssessmentAsync(
        UserContext ctx, IDictionary<string, string?> p, CancellationToken ct)
    {
        var sb = new StringBuilder(@"
            SELECT SchoolID, SchoolName, GradeLevel, SubjectArea, AssessmentWindow,
                   SchoolYear, TotalAssessed, AvgScore,
                   PctBelowBasic, PctBasic, PctProficient, PctAdvanced, PctProficientOrAbove
            FROM vw_LocalAssessmentResultsBySchoolAndGrade
            WHERE SchoolYear = @SchoolYear");

        var parms = new List<SqlParameter> { new("@SchoolYear", ctx.SchoolYear) };

        if (ctx.Role != "district_admin" && ctx.SchoolId is not null)
        {
            sb.Append(" AND SchoolID = @SchoolId");
            parms.Add(new("@SchoolId", ctx.SchoolId));
        }

        if (p.TryGetValue("grade_level", out var grade) && !string.IsNullOrEmpty(grade))
        {
            sb.Append(" AND GradeLevel = @GradeLevel");
            parms.Add(new("@GradeLevel", grade));
        }

        if (p.TryGetValue("subject_area", out var subject) && !string.IsNullOrEmpty(subject))
        {
            sb.Append(" AND SubjectArea = @SubjectArea");
            parms.Add(new("@SubjectArea", subject));
        }

        if (p.TryGetValue("assessment_window", out var window) && !string.IsNullOrEmpty(window))
        {
            sb.Append(" AND AssessmentWindow = @Window");
            parms.Add(new("@Window", window));
        }

        sb.Append(" ORDER BY SchoolName, GradeLevel, SubjectArea");

        var rows = await ExecuteQueryAsync(sb.ToString(), parms, ct);
        return new SqlQueryResult(
            "vw_LocalAssessmentResultsBySchoolAndGrade",
            rows,
            FormatSummary(rows, "local assessment results"));
    }

    // ── State Assessment ───────────────────────────────────────────────────

    private async Task<SqlQueryResult> QueryStateAssessmentAsync(
        UserContext ctx, IDictionary<string, string?> p, CancellationToken ct)
    {
        var sb = new StringBuilder(@"
            SELECT SchoolID, SchoolName, GradeLevel, SubjectArea, AssessmentYear,
                   TotalTested, PctLevel1, PctLevel2, PctLevel3, PctLevel4,
                   PctProficientOrAbove, AvgScaleScore
            FROM vw_StateAssessmentSummaryBySchoolAndGrade
            WHERE AssessmentYear = @SchoolYear");

        var parms = new List<SqlParameter> { new("@SchoolYear", ctx.SchoolYear) };

        if (ctx.Role != "district_admin" && ctx.SchoolId is not null)
        {
            sb.Append(" AND SchoolID = @SchoolId");
            parms.Add(new("@SchoolId", ctx.SchoolId));
        }

        if (p.TryGetValue("grade_level", out var grade) && !string.IsNullOrEmpty(grade))
        {
            sb.Append(" AND GradeLevel = @GradeLevel");
            parms.Add(new("@GradeLevel", grade));
        }

        if (p.TryGetValue("subject_area", out var subject) && !string.IsNullOrEmpty(subject))
        {
            sb.Append(" AND SubjectArea = @SubjectArea");
            parms.Add(new("@SubjectArea", subject));
        }

        sb.Append(" ORDER BY SchoolName, GradeLevel, SubjectArea");

        var rows = await ExecuteQueryAsync(sb.ToString(), parms, ct);
        return new SqlQueryResult(
            "vw_StateAssessmentSummaryBySchoolAndGrade",
            rows,
            FormatSummary(rows, "state assessment results"));
    }

    // ── Assessment Gap by Subgroup ─────────────────────────────────────────

    private async Task<SqlQueryResult> QueryAssessmentGapAsync(
        UserContext ctx, IDictionary<string, string?> p, CancellationToken ct)
    {
        var sb = new StringBuilder(@"
            SELECT SchoolID, SchoolName, SubjectArea, AssessmentYear, SubgroupType,
                   SubgroupValue, TotalTested, PctProficientOrAbove
            FROM vw_AssessmentGapBySubgroup
            WHERE AssessmentYear = @SchoolYear");

        var parms = new List<SqlParameter> { new("@SchoolYear", ctx.SchoolYear) };

        if (ctx.Role != "district_admin" && ctx.SchoolId is not null)
        {
            sb.Append(" AND SchoolID = @SchoolId");
            parms.Add(new("@SchoolId", ctx.SchoolId));
        }

        if (p.TryGetValue("subject_area", out var subject) && !string.IsNullOrEmpty(subject))
        {
            sb.Append(" AND SubjectArea = @SubjectArea");
            parms.Add(new("@SubjectArea", subject));
        }

        sb.Append(" ORDER BY SchoolName, SubjectArea, SubgroupType");

        var rows = await ExecuteQueryAsync(sb.ToString(), parms, ct);
        return new SqlQueryResult(
            "vw_AssessmentGapBySubgroup",
            rows,
            FormatSummary(rows, "assessment gap by subgroup (suppressed cells are FERPA-protected)"));
    }

    // ── Performance vs Benchmark ───────────────────────────────────────────

    private async Task<SqlQueryResult> QueryBenchmarkAsync(
        UserContext ctx, IDictionary<string, string?> p, CancellationToken ct)
    {
        var sql = @"
            SELECT SchoolID, SchoolName, GradeLevel, SubjectArea, AssessmentYear,
                   DistrictPctProficient, StateBenchmarkPct, NationalBenchmarkPct,
                   VsStateBenchmark, VsNationalBenchmark
            FROM vw_PerformanceVsBenchmark
            WHERE AssessmentYear = @SchoolYear
            ORDER BY SchoolName, GradeLevel, SubjectArea";

        var parms = new List<SqlParameter> { new("@SchoolYear", ctx.SchoolYear) };
        var rows = await ExecuteQueryAsync(sql, parms, ct);
        return new SqlQueryResult(
            "vw_PerformanceVsBenchmark",
            rows,
            FormatSummary(rows, "performance vs benchmark"));
    }

    // ── Longitudinal Proficiency Trend ─────────────────────────────────────

    private async Task<SqlQueryResult> QueryLongitudinalAsync(
        UserContext ctx, IDictionary<string, string?> p, CancellationToken ct)
    {
        var sql = @"
            SELECT SchoolID, SchoolName, GradeLevel, SubjectArea, AssessmentYear,
                   PctProficientOrAbove, YoYChange, ThreeYrTrend
            FROM vw_LongitudinalProficiencyTrend
            WHERE AssessmentYear BETWEEN @StartYear AND @EndYear
            ORDER BY SchoolName, GradeLevel, SubjectArea, AssessmentYear";

        var parms = new List<SqlParameter>
        {
            new("@StartYear", ctx.SchoolYear - 3),
            new("@EndYear", ctx.SchoolYear),
        };

        var rows = await ExecuteQueryAsync(sql, parms, ct);
        return new SqlQueryResult(
            "vw_LongitudinalProficiencyTrend",
            rows,
            FormatSummary(rows, "longitudinal proficiency trends (last 4 years)"));
    }

    // ── Intervention Student Summary ───────────────────────────────────────

    private async Task<SqlQueryResult> QueryInterventionAsync(
        UserContext ctx, IDictionary<string, string?> p, CancellationToken ct)
    {
        var sb = new StringBuilder(@"
            SELECT SchoolID, SchoolName, TierLevel, GradeLevel, SchoolYear,
                   StudentCount, AvgWeeksInIntervention, PctExitedWithGrowth,
                   PctRemainingTier, PctEscalatedTier
            FROM vw_InterventionStudentSummary
            WHERE SchoolYear = @SchoolYear");

        var parms = new List<SqlParameter> { new("@SchoolYear", ctx.SchoolYear) };

        if (ctx.Role != "district_admin" && ctx.SchoolId is not null)
        {
            sb.Append(" AND SchoolID = @SchoolId");
            parms.Add(new("@SchoolId", ctx.SchoolId));
        }

        sb.Append(" ORDER BY SchoolName, TierLevel, GradeLevel");

        var rows = await ExecuteQueryAsync(sb.ToString(), parms, ct);
        return new SqlQueryResult(
            "vw_InterventionStudentSummary",
            rows,
            FormatSummary(rows, "intervention student summary (aggregated)"));
    }

    // ── Data Quality Flags ─────────────────────────────────────────────────

    private async Task<SqlQueryResult> QueryDataQualityAsync(
        UserContext ctx, IDictionary<string, string?> p, CancellationToken ct)
    {
        var sb = new StringBuilder(@"
            SELECT SchoolID, SchoolName, SnapshotDate, DataDomain,
                   IssueType, IssueDescription, RecordCount, SeverityLevel
            FROM vw_DataQualityFlags
            WHERE SchoolYear = @SchoolYear");

        var parms = new List<SqlParameter> { new("@SchoolYear", ctx.SchoolYear) };

        if (ctx.Role != "district_admin" && ctx.SchoolId is not null)
        {
            sb.Append(" AND SchoolID = @SchoolId");
            parms.Add(new("@SchoolId", ctx.SchoolId));
        }

        sb.Append(" ORDER BY SeverityLevel DESC, SchoolName, DataDomain");

        var rows = await ExecuteQueryAsync(sb.ToString(), parms, ct);
        return new SqlQueryResult(
            "vw_DataQualityFlags",
            rows,
            FormatSummary(rows, "data quality flags"));
    }

    // ── Shared helpers ─────────────────────────────────────────────────────

    private async Task<IReadOnlyList<IDictionary<string, object?>>> ExecuteQueryAsync(
        string sql, IEnumerable<SqlParameter> parameters, CancellationToken ct)
    {
        var results = new List<IDictionary<string, object?>>();

        await using var conn = new SqlConnection(_connectionString);
        await conn.OpenAsync(ct);

        await using var cmd = new SqlCommand(sql, conn);
        foreach (var p in parameters)
            cmd.Parameters.Add(p);

        _logger.LogDebug("Executing SQL: {Sql} with {ParamCount} parameters",
            sql.Split('\n')[0].Trim(), cmd.Parameters.Count);

        await using var reader = await cmd.ExecuteReaderAsync(ct);
        var columns = Enumerable.Range(0, reader.FieldCount)
            .Select(i => reader.GetName(i)).ToArray();

        while (await reader.ReadAsync(ct))
        {
            var row = new Dictionary<string, object?>();
            for (var i = 0; i < columns.Length; i++)
                row[columns[i]] = reader.IsDBNull(i) ? null : reader.GetValue(i);
            results.Add(row);
        }

        return results;
    }

    private static string FormatSummary(
        IReadOnlyList<IDictionary<string, object?>> rows, string domain)
    {
        if (rows.Count == 0)
            return "No data returned for the specified parameters.";

        var sb = new StringBuilder($"Retrieved {rows.Count} row(s) of {domain} data:\n");
        foreach (var row in rows.Take(10))
            sb.AppendLine(string.Join(", ", row.Select(kv => $"{kv.Key}={kv.Value}")));

        if (rows.Count > 10)
            sb.AppendLine($"... and {rows.Count - 10} more rows.");

        return sb.ToString();
    }
}
```

### 4.3 CompletionService

Create `Services/CompletionService.cs`:

```csharp
using Azure.AI.OpenAI;
using OpenAI.Chat;

namespace DistrictAnalyticsApi.Services;

public interface ICompletionService
{
    Task<(string Answer, int TokensUsed)> GenerateAnswerAsync(
        string systemPrompt, string augmentedPrompt,
        CancellationToken cancellationToken = default);
}

public class CompletionService : ICompletionService
{
    private readonly ChatClient _chatClient;
    private readonly ILogger<CompletionService> _logger;

    public CompletionService(AzureOpenAIClient client, IConfiguration config,
        ILogger<CompletionService> logger)
    {
        _chatClient = client.GetChatClient(
            config["AzureOpenAI:ChatDeployment"] ?? "gpt-4o-mini");
        _logger = logger;
    }

    public async Task<(string Answer, int TokensUsed)> GenerateAnswerAsync(
        string systemPrompt, string augmentedPrompt, CancellationToken cancellationToken = default)
    {
        var options = new ChatCompletionOptions
        {
            MaxOutputTokenCount = 600,
            Temperature = 0.1f,
        };

        var messages = new List<ChatMessage>
        {
            new SystemChatMessage(systemPrompt),
            new UserChatMessage(augmentedPrompt),
        };

        var completion = await _chatClient.CompleteChatAsync(messages, options, cancellationToken);
        var answer = completion.Value.Content[0].Text;
        var tokens = completion.Value.Usage.TotalTokenCount;

        _logger.LogInformation("Completion: {Tokens} tokens used", tokens);
        return (answer, tokens);
    }
}
```

### 4.4 RagOrchestrator

Create `Services/RagOrchestrator.cs`:

```csharp
using Azure.Search.Documents.Models;
using DistrictAnalyticsApi.Models;
using DistrictAnalyticsApi.Prompts;

namespace DistrictAnalyticsApi.Services;

public class RagOrchestrator
{
    private readonly IMetadataSearchService _search;
    private readonly ISqlDataService _sql;
    private readonly ICompletionService _completion;
    private readonly ILogger<RagOrchestrator> _logger;

    public RagOrchestrator(
        IMetadataSearchService search, ISqlDataService sql,
        ICompletionService completion, ILogger<RagOrchestrator> logger)
    {
        _search = search;
        _sql = sql;
        _completion = completion;
        _logger = logger;
    }

    public async Task<AnalyticsResponse> ProcessQuestionAsync(
        string question, UserContext ctx, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Processing question for role={Role} school={School}",
            ctx.Role, ctx.SchoolId ?? "district");

        // Stage 2: Retrieve metadata
        var metadata = await _search.FindBestMetadataAsync(question, ctx, cancellationToken);
        if (metadata is null)
        {
            return new AnalyticsResponse
            {
                Answer = "I couldn't find relevant information for that question. "
                       + "Try asking about attendance, assessment, or intervention data.",
                IsGrounded = false,
            };
        }

        var metadataId = metadata["id"]?.ToString();
        var viewName = metadata["view_name"]?.ToString();
        _logger.LogInformation("Stage 2: metadata={MetaId} view={View}", metadataId, viewName);

        // Stage 3a: Extract parameters (simple keyword matching — Python version uses LLM)
        var extractedParams = ExtractParams(question);

        // Stage 3b: Query SQL if view available
        SqlQueryResult? sqlResult = null;
        if (!string.IsNullOrEmpty(viewName))
        {
            try
            {
                sqlResult = await _sql.QueryViewAsync(
                    viewName, ctx, extractedParams, cancellationToken);
                _logger.LogInformation("Stage 3b: {Rows} rows from {View}",
                    sqlResult?.Rows.Count ?? 0, viewName);
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning("Stage 3b: Unauthorized — {Message}", ex.Message);
                return new AnalyticsResponse
                {
                    Answer = "You don't have permission to view that data.",
                    SourceMetadataId = metadataId,
                    Declined = true,
                    DeclineReason = "insufficient_role",
                };
            }
        }

        // Stage 4: Build augmented prompt
        var systemPrompt = SystemPrompt.Build(ctx);
        var augmentedPrompt = BuildAugmentedPrompt(question, ctx, metadata, sqlResult);

        // Stage 5: Generate answer
        var (answer, tokens) = await _completion.GenerateAnswerAsync(
            systemPrompt, augmentedPrompt, cancellationToken);

        return new AnalyticsResponse
        {
            Answer = answer,
            SourceMetadataId = metadataId,
            SourceViewName = viewName,
            IsGrounded = sqlResult?.Rows.Count > 0,
            ApproxTokensUsed = tokens,
        };
    }

    private static IDictionary<string, string?> ExtractParams(string question)
    {
        var q = question.ToLowerInvariant();
        return new Dictionary<string, string?>
        {
            ["grade_level"] = ExtractGrade(q),
            ["subject_area"] = ExtractSubject(q),
            ["assessment_window"] = ExtractWindow(q),
        };
    }

    private static string? ExtractGrade(string q)
    {
        if (q.Contains("kindergarten") || q.Contains(" k ")) return "K";
        for (int g = 1; g <= 12; g++)
            if (q.Contains($"grade {g}") || q.Contains($"{g}th grade") || q.Contains($"{g}rd grade")
                || q.Contains($"{g}nd grade") || q.Contains($"{g}st grade"))
                return $"Grade {g}";
        return null;
    }

    private static string? ExtractSubject(string q)
    {
        if (q.Contains("ela") || q.Contains("reading") || q.Contains("english")) return "ELA";
        if (q.Contains("math")) return "Math";
        if (q.Contains("science")) return "Science";
        if (q.Contains("social studies") || q.Contains("history")) return "Social Studies";
        return null;
    }

    private static string? ExtractWindow(string q)
    {
        if (q.Contains("beginning of year") || q.Contains("boy")) return "BOY";
        if (q.Contains("middle of year") || q.Contains("moy")) return "MOY";
        if (q.Contains("end of year") || q.Contains("eoy")) return "EOY";
        return null;
    }

    private static string BuildAugmentedPrompt(
        string question, UserContext ctx,
        SearchDocument metadata, SqlQueryResult? sqlResult)
    {
        var sb = new System.Text.StringBuilder();

        sb.AppendLine("## User Context");
        sb.AppendLine($"Role: {ctx.Role}");
        sb.AppendLine($"School: {ctx.SchoolName ?? "All Schools"} ({ctx.SchoolId ?? "district"})");
        sb.AppendLine($"School Year: {ctx.SchoolYear}");
        sb.AppendLine($"Current Term: {ctx.CurrentTermId}");
        sb.AppendLine();

        sb.AppendLine("## Retrieved Metadata");
        sb.AppendLine($"Source: {metadata["title"]}");
        sb.AppendLine(metadata["content"]?.ToString());
        sb.AppendLine();

        if (sqlResult?.Rows.Count > 0)
        {
            sb.AppendLine("## Retrieved Data");
            sb.AppendLine($"View: {sqlResult.ViewName}");
            sb.AppendLine($"Rows returned: {sqlResult.Rows.Count}");
            sb.AppendLine(sqlResult.Summary);
        }
        else
        {
            sb.AppendLine("## Note");
            sb.AppendLine("No SQL data was retrieved. Answer using only the metadata context above.");
        }

        sb.AppendLine();
        sb.AppendLine("## Question");
        sb.AppendLine(question);

        return sb.ToString();
    }
}
```

### 4.5 SystemPrompt

Create `Prompts/SystemPrompt.cs`:

```csharp
using DistrictAnalyticsApi.Models;

namespace DistrictAnalyticsApi.Prompts;

public static class SystemPrompt
{
    public static string Build(UserContext ctx) => $"""
        You are the SUSD Analytics Assistant for Sunlake Unified School District.

        Your role is to answer questions about attendance and assessment data
        using ONLY the data provided in the user message. Do not fabricate
        numbers, trends, or comparisons not present in the data.

        ## User Scope Rules
        - User role: {ctx.Role}
        - School: {ctx.SchoolName ?? "All Schools"} ({ctx.SchoolId ?? "district-wide"})
        - School Year: {ctx.SchoolYear} (2025-26 academic year)
        - Current Term: {ctx.CurrentTermId}

        ## Access Restrictions
        {GetScopeRules(ctx.Role)}

        ## FERPA Compliance
        - Never name individual students in your response.
        - If asked for individual student names or records, respond:
          "I cannot provide individual student records through this interface."
        - If a cell value is suppressed (NULL/null) in the data due to small group size,
          state "This data is suppressed to protect student privacy."
        - Do not infer or estimate suppressed values.

        ## Answer Format
        - Lead with the direct answer to the question.
        - Cite the data source (view name) when providing numbers.
        - If the data does not contain the answer, say:
          "I don't have that information in the available data for this query."
        - Keep responses concise — under 300 words unless the data requires more detail.
        """;

    private static string GetScopeRules(string role) => role switch
    {
        "teacher" =>
            "- You only see data for your assigned sections.\n" +
            "- You cannot access district-wide or cross-school data.",
        "school_admin" =>
            "- You see data for your school only.\n" +
            "- You cannot access other schools' student data.",
        "district_admin" =>
            "- You have access to district-wide aggregate data.\n" +
            "- All schools are visible in your data scope.",
        _ =>
            "- Your data scope is limited to authorized views.",
    };
}
```

## Part 5 — Controller and Program.cs

Create `Controllers/AnalyticsController.cs`:

```csharp
using DistrictAnalyticsApi.Models;
using DistrictAnalyticsApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace DistrictAnalyticsApi.Controllers;

[ApiController]
[Route("api/analytics")]
public class AnalyticsController : ControllerBase
{
    private readonly RagOrchestrator _orchestrator;
    private readonly ILogger<AnalyticsController> _logger;

    public AnalyticsController(RagOrchestrator orchestrator,
        ILogger<AnalyticsController> logger)
    {
        _orchestrator = orchestrator;
        _logger = logger;
    }

    /// <summary>POST /api/analytics/query</summary>
    [HttpPost("query")]
    public async Task<ActionResult<AnalyticsResponse>> Query(
        [FromBody] AnalyticsRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Question))
            return BadRequest("Question is required.");

        var ctx = GetUserContextFromClaims(request);
        _logger.LogInformation("Query: role={Role} school={School} q={Question}",
            ctx.Role, ctx.SchoolId, request.Question);

        var response = await _orchestrator.ProcessQuestionAsync(
            request.Question, ctx, cancellationToken);

        return Ok(response);
    }

    /// <summary>
    /// POC placeholder: returns hardcoded context using DebugRole/DebugSchoolId.
    /// Week 6 replaces this with real Entra ID claims.
    /// </summary>
    private static UserContext GetUserContextFromClaims(AnalyticsRequest request) =>
        new()
        {
            Role = request.DebugRole ?? "school_admin",
            SchoolId = request.DebugSchoolId ?? "SCH001",
            SchoolName = request.DebugSchoolName ?? "Sunlake Elementary",
            SchoolYear = 2026,
            CurrentTermId = "Q2",
        };
}
```

Create `Program.cs`:

```csharp
using Azure.AI.OpenAI;
using Azure.Identity;
using Azure.Search.Documents;
using DistrictAnalyticsApi.Services;
using OpenTelemetry.Logs;
using OpenTelemetry.Resources;

var builder = WebApplication.CreateBuilder(args);

// ── Azure OpenAI ────────────────────────────────────────────────────────────
var aiEndpoint = new Uri(builder.Configuration["AzureOpenAI:Endpoint"]!);
var apiKey = builder.Configuration["AzureOpenAI:ApiKey"];

var openAiClient = !string.IsNullOrEmpty(apiKey)
    ? new AzureOpenAIClient(aiEndpoint, new Azure.AzureKeyCredential(apiKey))
    : new AzureOpenAIClient(aiEndpoint, new DefaultAzureCredential());

builder.Services.AddSingleton(openAiClient);

// ── Azure AI Search ─────────────────────────────────────────────────────────
var searchEndpoint = new Uri(builder.Configuration["AzureSearch:Endpoint"]!);
var searchKey = builder.Configuration["AzureSearch:ApiKey"];
var searchIndex = builder.Configuration["AzureSearch:IndexName"] ?? "susd-metadata-v1";

var searchClient = !string.IsNullOrEmpty(searchKey)
    ? new SearchClient(searchEndpoint, searchIndex, new Azure.AzureKeyCredential(searchKey))
    : new SearchClient(searchEndpoint, searchIndex, new DefaultAzureCredential());

builder.Services.AddSingleton(searchClient);

// ── Application Services ────────────────────────────────────────────────────
builder.Services.AddScoped<IMetadataSearchService, MetadataSearchService>();
builder.Services.AddScoped<ISqlDataService, SqlDataService>();
builder.Services.AddScoped<ICompletionService, CompletionService>();
builder.Services.AddScoped<RagOrchestrator>();

// ── ASP.NET Core ────────────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ── OpenTelemetry (.NET 10 preferred) ──────────────────────────────────────
var appInsightsConnString = builder.Configuration["ApplicationInsights:ConnectionString"];
if (!string.IsNullOrEmpty(appInsightsConnString))
{
    builder.Services.AddOpenTelemetry()
        .ConfigureResource(r => r.AddService("DistrictAnalyticsApi"))
        .WithLogging(l => l.AddAzureMonitorLogExporter(o =>
            o.ConnectionString = appInsightsConnString));
}

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();
```

Create `appsettings.Development.json` (gitignore this file):

```json
{
  "AzureOpenAI": {
    "Endpoint": "https://YOUR_OPENAI.openai.azure.com/",
    "ApiKey": "your-key-here",
    "ChatDeployment": "gpt-4o-mini",
    "EmbeddingDeployment": "text-embedding-3-small"
  },
  "AzureSearch": {
    "Endpoint": "https://YOUR_SEARCH.search.windows.net",
    "ApiKey": "your-key-here",
    "IndexName": "susd-metadata-v1"
  },
  "ConnectionStrings": {
    "SqlServer": "Server=localhost;Database=SunlakeUnifiedDW;User Id=ai_svc_readonly;Password=YourPassword;TrustServerCertificate=True;"
  }
}
```

## Part 6 — HTTP Test Files

Create `http/school-admin-queries.http`:

```http
### School Admin — Attendance this term
POST https://localhost:5001/api/analytics/query
Content-Type: application/json

{
  "question": "What is the attendance rate at my school for Q2?",
  "debugRole": "school_admin",
  "debugSchoolId": "SCH001",
  "debugSchoolName": "Sunlake Elementary"
}

###

### School Admin — Grade 3 Math assessment
POST https://localhost:5001/api/analytics/query
Content-Type: application/json

{
  "question": "How did Grade 3 students perform on the Math BOY assessment?",
  "debugRole": "school_admin",
  "debugSchoolId": "SCH001",
  "debugSchoolName": "Sunlake Elementary"
}

###

### School Admin — Chronic absence
POST https://localhost:5001/api/analytics/query
Content-Type: application/json

{
  "question": "What is our chronic absenteeism rate this year?",
  "debugRole": "school_admin",
  "debugSchoolId": "SCH001",
  "debugSchoolName": "Sunlake Elementary"
}
```

Create `http/teacher-queries.http`:

```http
### Teacher — Attendance for my sections
POST https://localhost:5001/api/analytics/query
Content-Type: application/json

{
  "question": "Which of my students have attendance below 90% this quarter?",
  "debugRole": "teacher",
  "debugSchoolId": "SCH001",
  "debugSchoolName": "Sunlake Elementary"
}

###

### Teacher — Try to access admin view (should decline)
POST https://localhost:5001/api/analytics/query
Content-Type: application/json

{
  "question": "Show me the district-wide achievement gap by subgroup",
  "debugRole": "teacher",
  "debugSchoolId": "SCH001",
  "debugSchoolName": "Sunlake Elementary"
}
```

Create `http/district-admin-queries.http`:

```http
### District Admin — District-wide attendance
POST https://localhost:5001/api/analytics/query
Content-Type: application/json

{
  "question": "What is the district-wide attendance rate for all schools this year?",
  "debugRole": "district_admin"
}

###

### District Admin — Benchmark comparison
POST https://localhost:5001/api/analytics/query
Content-Type: application/json

{
  "question": "How does our Grade 5 Math proficiency compare to state and national benchmarks?",
  "debugRole": "district_admin"
}

###

### District Admin — Longitudinal trend
POST https://localhost:5001/api/analytics/query
Content-Type: application/json

{
  "question": "Show me the 4-year ELA proficiency trend across the district",
  "debugRole": "district_admin"
}
```

## Part 7 — Run and Verify

### 7.1 Run the API

```bash
cd DistrictAnalyticsApi
dotnet run
```

Open `https://localhost:5001/swagger` to confirm the API is running.

### 7.2 Run HTTP tests

Use VS Code REST Client extension or Rider's HTTP client to run the `.http` files.

For each test, record in your lab report:
- ✅ HTTP 200 received
- The `answer` field content
- The `sourceViewName` field
- The `isGrounded` value
- The `approxTokensUsed` value

### 7.3 Security verification test

Run the teacher query targeting the admin view. The expected response:

```json
{
  "answer": "You don't have permission to view that data.",
  "declined": true,
  "declineReason": "insufficient_role"
}
```

If the teacher request returns data instead of a decline, check:
1. `ViewRegistry.AdminOnlyViews` includes `vw_AssessmentGapBySubgroup`
2. `MetadataSearchService` applies the `role_scope` filter
3. `SqlDataService.QueryViewAsync` calls `ViewRegistry.ThrowIfNotAuthorized` before the switch

### 7.4 Token budget check

For a district admin attendance query, record the approximate token count.
Expected distribution:

| Section | Target tokens |
|---------|--------------|
| System prompt | ~700 |
| User context in prompt | ~100 |
| Retrieved metadata | ~800 |
| SQL data summary | ~600 |
| Question | ~100 |
| **Total input** | **~2,300** |
| Response | ≤ 600 |
| **Grand total** | **≤ 2,900** |

If token counts are higher, look at the `content` field length in your metadata documents.

## Lab Report (submit or document in your learning journal)

1. List all 9 view names and the HTTP status + `isGrounded` result for one test question per view.
2. Paste the raw response for the teacher trying to access an admin view (should be declined).
3. Compare the token counts for: (a) a question where metadata-only answered it vs. (b) a question that triggered SQL retrieval.
4. The `ExtractParams` method uses simple keyword matching. Describe one real question from your tests that it parsed incorrectly. How would LLM-based parameter extraction (as in Module 10) fix it?

*Next: Lab 05b — Python Prototype*
