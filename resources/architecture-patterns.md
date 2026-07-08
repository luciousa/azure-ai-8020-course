# Architecture Patterns Reference

Key patterns used throughout the course. Use this as a quick-reference during labs and the capstone.

---

## Pattern 1: RAG Pipeline (Five Stages)

```
User question
    │
    ▼
[1] EMBED — Convert question to vector (text-embedding-3-small)
    │
    ▼
[2] RETRIEVE — Hybrid search in Azure AI Search
              (BM25 keyword + vector, RRF fusion, semantic re-rank)
              Pre-filter: role_scope ∈ user's roles
    │
    ▼
[3] AUGMENT — Execute approved SQL view
              UserContext scopes the WHERE clause
              Results formatted as structured text
    │
    ▼
[4] GENERATE — Build prompt: system + metadata + SQL results + question
               Call Azure OpenAI (GPT-4o-mini)
    │
    ▼
[5] RETURN — Structured response with answer, source view, groundedness flag
```

**Where to guard:**
- Before [2]: validate UserContext is populated from token claims (not request body)
- Before [3]: `ViewRegistry.ThrowIfNotAuthorized(viewName, ctx)`
- After [3]: if row count == 0, return decline (do not call LLM with empty context)
- After [5]: log role/school/view/tokens — never log question or answer text

---

## Pattern 2: Three-Layer Access Control

```
Layer 1 — Authentication (Entra ID JWT)
    Who are you? Is your token valid and unexpired?
    Enforced by: [Authorize] attribute + Microsoft.Identity.Web
    Failure: HTTP 401

Layer 2 — Metadata Filter (AI Search pre-filter)
    Which views are you allowed to know about?
    Enforced by: role_scope pre-filter on every AI Search query
    Effect: teacher cannot retrieve metadata for district-wide views

Layer 3 — SQL Scope (UserContext WHERE parameters)
    Which rows of allowed views can you see?
    Enforced by: ViewRegistry.ThrowIfNotAuthorized() + parameterized WHERE clauses
    Effect: teacher's query automatically scoped to their own SectionIds
```

Each layer is independent. Bypassing Layer 2 (e.g., a bug in the metadata filter) does not bypass Layer 3. The SQL layer always enforces scope even if the wrong view name is received.

---

## Pattern 3: ViewRegistry Dispatch

```csharp
public class ViewRegistry
{
    private static readonly HashSet<string> _teacherViews = new()
    {
        "vw_StudentAttendanceBySectionAndTerm",
        "vw_AssessmentResultsBySection",
    };
    private static readonly HashSet<string> _schoolAdminViews = new()
    {
        "vw_AttendanceSummaryBySchoolAndGrade",
        "vw_AssessmentResultsBySchoolAndGrade",
        "vw_AssessmentGapBySubgroup",
        "vw_EnrollmentBySchoolAndGrade",
        "vw_ChronicAbsenteeismBySchool",
    };
    private static readonly HashSet<string> _districtAdminViews = new()
    {
        "vw_AttendanceSummaryByDistrictAndSchool",
        "vw_AssessmentResultsByDistrict",
        // all school admin views included implicitly
    };

    public bool IsAuthorized(string viewName, UserContext ctx) =>
        ctx.Role switch
        {
            "teacher"        => _teacherViews.Contains(viewName),
            "school_admin"   => _schoolAdminViews.Contains(viewName),
            "district_admin" => _districtAdminViews.Contains(viewName)
                                || _schoolAdminViews.Contains(viewName),
            _                => false
        };

    public void ThrowIfNotAuthorized(string viewName, UserContext ctx)
    {
        if (!IsAuthorized(viewName, ctx))
            throw new UnauthorizedAccessException(
                $"Role '{ctx.Role}' is not authorized to query view '{viewName}'.");
    }
}
```

**Key property:** The `switch` expression in `IsAuthorized` is the single source of truth for role-to-view mapping. Any new view must be added here and ONLY here — never added to the switch in `QueryViewAsync` separately.

---

## Pattern 4: UserContext — Token Claims Only

```csharp
// CORRECT — all fields sourced from validated JWT claims
public static UserContext BuildFromClaims(ClaimsPrincipal principal)
{
    var role = principal.FindFirst("roles")?.Value
        ?? throw new InvalidOperationException("Role claim missing from token.");

    var schoolId = principal.FindFirst("extension_SchoolId")?.Value;
    var schoolName = principal.FindFirst("extension_SchoolName")?.Value;

    var sectionIds = principal
        .FindAll("extension_SectionIds")
        .Select(c => c.Value)
        .ToList();

    return new UserContext(
        Role: role,
        SchoolId: schoolId,
        SchoolName: schoolName,
        SchoolYear: GetCurrentSchoolYear(),
        CurrentTermId: GetCurrentTermId(),
        SectionIds: sectionIds);
}

// WRONG — never accept scope from the request body
[HttpPost("query")]
public async Task<IActionResult> Query(
    [FromBody] QueryRequest request,
    // ❌ NEVER do this:
    // [FromBody] string role,
    // [FromQuery] string schoolId,
    // These allow users to claim any scope they want
```

---

## Pattern 5: Parameterized SQL with IN-Clause

```csharp
// Pattern for scoping a query to a list of section IDs
private (string sql, Dictionary<string, object> parameters) BuildTeacherSectionQuery(
    UserContext ctx,
    string viewName)
{
    // Build @SId0, @SId1, @SId2, ... parameter list
    var paramNames = ctx.SectionIds
        .Select((_, i) => $"@SId{i}")
        .ToList();

    var sql = $"""
        SELECT * FROM {viewName}
        WHERE SectionId IN ({string.Join(", ", paramNames)})
          AND SchoolYear = @SchoolYear
          AND TermId = @TermId
        """;

    var parameters = new Dictionary<string, object>
    {
        ["@SchoolYear"] = ctx.SchoolYear,
        ["@TermId"] = ctx.CurrentTermId,
    };

    for (int i = 0; i < ctx.SectionIds.Count; i++)
        parameters[$"@SId{i}"] = ctx.SectionIds[i];

    return (sql, parameters);
}
```

**Why indexed names (@SId0, @SId1)?** SQL Server does not support `@SId[]` array binding. Each parameter must be a separate named parameter. Indexed names are predictable, debuggable, and injection-safe.

---

## Pattern 6: DefaultAzureCredential — POC to Production

```csharp
// POC (Lab 05a): explicit API key
var credential = new AzureKeyCredential(
    Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY")!);

// Production (Module 16): managed identity; same API call
var credential = new DefaultAzureCredential();

// The AzureOpenAIClient call is IDENTICAL — no code change required
var client = new AzureOpenAIClient(new Uri(endpoint), credential);
```

**Credential resolution order (DefaultAzureCredential):**
1. Environment variables (`AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_CLIENT_SECRET`)
2. Workload identity (AKS)
3. Managed identity (App Service, Container Apps)
4. Azure CLI (local development)
5. Visual Studio / VS Code credential

In production on App Service, step 3 is used. Remove environment variable overrides from App Service configuration to ensure managed identity is used.

---

## Pattern 7: Metadata Document Structure

```json
{
  "id": "vw_AttendanceSummaryBySchoolAndGrade_doc",
  "view_name": "vw_AttendanceSummaryBySchoolAndGrade",
  "role_scope": ["school_admin", "district_admin"],
  "description": "Provides attendance summary by school and grade level for a specified school year and term. Returns attendance rate as a percentage.",
  "example_questions": [
    "What is the attendance rate at my school for Q2?",
    "Which grades have the lowest attendance?",
    "How does Grade 3 attendance compare to Grade 4?"
  ],
  "parameters": {
    "SchoolId": "Required for school_admin. District admin can omit to get all schools.",
    "SchoolYear": "4-digit school year (e.g., 2026).",
    "TermId": "Quarter ID (Q1, Q2, Q3, Q4) or 'FULL' for full year."
  },
  "columns_returned": [
    "SchoolId", "SchoolName", "GradeLevel",
    "TotalEnrolled", "TotalPresent", "AttendanceRate",
    "SchoolYear", "TermId"
  ],
  "privacy_notes": "Aggregated by school and grade only. No individual student data. All groups include 10+ students by view design."
}
```

**Critical field: `role_scope`**  
This array is used as the AI Search pre-filter. It must exactly match the role strings used in JWT claims (`teacher`, `school_admin`, `district_admin`). A typo here means the wrong roles see (or don't see) this metadata document.

---

## Pattern 8: OpenTelemetry Span Hierarchy

```
Activity: RunQuery  [role=school_admin, school_id=SCH001, view_name=...]
├── Activity: MetadataSearch  [result_count=3]
├── Activity: SqlQuery  [view_name=vw_Attendance..., row_count=12]
└── Activity: Completion  [input_tokens=1842, output_tokens=187]
```

```csharp
// Always nest child spans inside parent using `using`
using var root = PipelineTelemetry.Source.StartActivity("RunQuery");
root?.SetTag("role", ctx.Role);

using var search = PipelineTelemetry.Source.StartActivity("MetadataSearch");
// ... search work ...
search?.SetTag("result_count", results.Count);
// search disposed here — ends the span

using var sql = PipelineTelemetry.Source.StartActivity("SqlQuery");
// ... sql work ...
// sql disposed here
```

**What NOT to put in span tags:**
- Question text
- Answer text  
- Student names
- Full SQL query string (contains parameter values that may identify scope)

---

## Pattern 9: Hybrid Search with Mandatory Pre-filter

```python
# Azure AI Search — mandatory role_scope pre-filter
# This filter runs BEFORE scoring — not after
search_results = search_client.search(
    search_text=question,           # BM25 component
    vector_queries=[
        VectorizedQuery(
            vector=question_embedding,
            k_nearest_neighbors=5,
            fields="content_vector"
        )
    ],
    filter=f"role_scope/any(r: r eq '{user_role}')",  # PRE-FILTER
    query_type=QueryType.SEMANTIC,
    semantic_configuration_name="susd-semantic",
    top=3
)
```

**Why pre-filter, not post-filter?**  
Post-filtering scores all documents first, then discards unauthorized ones — the unauthorized documents affect the scoring of authorized ones (ranking contamination). Pre-filtering removes unauthorized documents before scoring, so they have zero influence on results.

---

## Pattern 10: Small Cell Suppression in SQL

```sql
-- vw_AssessmentGapBySubgroup
SELECT
    SchoolId,
    SchoolName,
    SubgroupName,
    SchoolYear,
    TermId,
    BenchmarkName,
    StudentCount,
    -- Suppress if fewer than 10 students to protect student privacy
    CASE 
        WHEN StudentCount < 10 THEN NULL 
        ELSE AvgScaledScore 
    END AS AvgScaledScore,
    CASE 
        WHEN StudentCount < 10 THEN NULL 
        ELSE ProficiencyRate 
    END AS ProficiencyRate
FROM [dbo].[AssessmentSubgroupBase]
WHERE SchoolYear = @SchoolYear
  AND TermId = @TermId
  AND SchoolId = @SchoolId;
```

**System prompt handling of NULL:**  
The system prompt must tell the LLM what NULL means in this context:  
`"If a value is NULL, state that the value is suppressed because the group is too small to report (fewer than 10 students)."`  
Without this instruction, the LLM may say "data is unavailable" (vague) or skip the field entirely.
