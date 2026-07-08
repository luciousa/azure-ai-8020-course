# Lab 06a — Role-Aware Demo

**Week:** 6 | **Lab:** 06a | **Estimated time:** 3 hours  
**Prerequisites:** Module 11 (role-aware access); Lab 05a (.NET API)  
**Paired with:** Lab 06b (analytics scenarios)

## Lab Objectives

1. Integrate `UserContextService` into the .NET API, replacing the POC placeholder.
2. Generate test JWT tokens for all 3 roles using the dev helper.
3. Verify claims extraction works correctly for each role.
4. Run the full role-based access matrix tests (9 scenarios).
5. Produce a security evidence document showing role isolation is working.

## Part 1 — Integrate UserContextService

### 1.1 Add the service

Ensure `Services/UserContextService.cs` from Module 11 is in the project.

Register it in `Program.cs`:

```csharp
builder.Services.AddScoped<IUserContextService, UserContextService>();
```

### 1.2 Update AnalyticsController

Replace the POC controller with the updated version from Module 11 that uses `_userContextService.BuildFromClaims(User)`.

Also update the `AnalyticsRequest` model to remove the `Debug*` fields:

```csharp
// Models/AnalyticsRequest.cs — production version (no debug fields)
namespace DistrictAnalyticsApi.Models;

public record AnalyticsRequest
{
    public required string Question { get; init; }
}
```

> **Keep the debug fields** in a separate `appsettings.Development.json`-gated version if you need them for Lab 06b scenario testing. Document which version you're using in your lab report.

### 1.3 Configure JWT for development testing

For local testing without a full Entra ID setup, add a test JWT configuration.

Install PyJWT to generate test tokens:

```bash
pip install pyjwt
```

Create `scripts/generate_test_tokens.py` (from Module 11):

```python
# scripts/generate_test_tokens.py
import jwt, datetime, json

SECRET = "lab06a-dev-test-secret"

def token(role, school_id=None, school_name=None, section_ids=None):
    now = datetime.datetime.utcnow()
    payload = {
        "roles": [role],
        "extension_SchoolId": school_id,
        "extension_SchoolName": school_name,
        "extension_SchoolYear": "2026",
        "extension_CurrentTermId": "Q2",
        "sub": f"user-{role}",
        "iss": "https://login.microsoftonline.com/test-tenant/",
        "aud": "api://test-client-id",
        "iat": now,
        "exp": now + datetime.timedelta(hours=8),
    }
    if section_ids:
        payload["extension_SectionIds"] = section_ids
    return jwt.encode(payload, SECRET, algorithm="HS256")

tokens = {
    "teacher": token("teacher", "SCH001", "Sunlake Elementary", ["SEC001", "SEC002"]),
    "school_admin": token("school_admin", "SCH001", "Sunlake Elementary"),
    "district_admin": token("district_admin"),
}

print(json.dumps(tokens, indent=2))
```

```bash
python scripts/generate_test_tokens.py > test_tokens.json
```

### 1.4 Configure ASP.NET Core to accept HS256 test tokens

In `appsettings.Development.json`, override the JWT configuration:

```json
"Authentication": {
  "Schemes": {
    "Bearer": {
      "ValidAudiences": ["api://test-client-id"],
      "ValidIssuers": ["https://login.microsoftonline.com/test-tenant/"],
      "SigningKey": "lab06a-dev-test-secret"
    }
  }
}
```

In `Program.cs` (development branch):

```csharp
// For development: accept HS256 tokens with test secret
// REMOVE before production — production uses Entra ID RSA keys
if (builder.Environment.IsDevelopment())
{
    var signingKey = builder.Configuration["Authentication:Schemes:Bearer:SigningKey"]!;
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
            {
                ValidAudience = "api://test-client-id",
                ValidIssuer = "https://login.microsoftonline.com/test-tenant/",
                IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(
                    System.Text.Encoding.UTF8.GetBytes(signingKey)),
            };
        });
}
else
{
    // Production: use Microsoft.Identity.Web with Entra ID
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddMicrosoftIdentityWebApi(builder.Configuration.GetSection("AzureAd"));
}

builder.Services.AddAuthorization();
```

## Part 2 — Role Access Matrix Tests

Run all 9 test scenarios. Each is a question + role + expected outcome.

Create `http/role-matrix-tests.http`:

```http
### === TEACHER TESTS ===

### T1: Teacher — own section attendance (SHOULD SUCCEED with data)
POST https://localhost:5001/api/analytics/query
Content-Type: application/json
Authorization: Bearer {{teacher_token}}

{
  "question": "What is the attendance rate for my students this quarter?"
}

###

### T2: Teacher — tries admin view (SHOULD DECLINE: insufficient_role)
POST https://localhost:5001/api/analytics/query
Content-Type: application/json
Authorization: Bearer {{teacher_token}}

{
  "question": "Show me the district-wide achievement gap by subgroup"
}

###

### T3: Teacher — asks for individual student (SHOULD DECLINE: FERPA)
POST https://localhost:5001/api/analytics/query
Content-Type: application/json
Authorization: Bearer {{teacher_token}}

{
  "question": "What is the current GPA of student 12345?"
}

###

### === SCHOOL ADMIN TESTS ===

### SA1: School admin — own school attendance (SHOULD SUCCEED)
POST https://localhost:5001/api/analytics/query
Content-Type: application/json
Authorization: Bearer {{school_admin_token}}

{
  "question": "What is the chronic absenteeism rate at my school this year?"
}

###

### SA2: School admin — Grade 3 Math assessment (SHOULD SUCCEED)
POST https://localhost:5001/api/analytics/query
Content-Type: application/json
Authorization: Bearer {{school_admin_token}}

{
  "question": "How did Grade 3 students perform on the Math beginning-of-year assessment?"
}

###

### SA3: School admin — tries another school's data (SHOULD BE SCOPED to own school)
POST https://localhost:5001/api/analytics/query
Content-Type: application/json
Authorization: Bearer {{school_admin_token}}

{
  "question": "What is the attendance rate at Lakeside Middle School?"
}

###

### === DISTRICT ADMIN TESTS ===

### DA1: District admin — district-wide attendance (SHOULD SUCCEED, all schools)
POST https://localhost:5001/api/analytics/query
Content-Type: application/json
Authorization: Bearer {{district_admin_token}}

{
  "question": "What is the district-wide attendance rate for all schools this quarter?"
}

###

### DA2: District admin — benchmark comparison (SHOULD SUCCEED)
POST https://localhost:5001/api/analytics/query
Content-Type: application/json
Authorization: Bearer {{district_admin_token}}

{
  "question": "How does our Grade 5 Math proficiency compare to state and national benchmarks?"
}

###

### DA3: District admin — longitudinal 4-year trend (SHOULD SUCCEED)
POST https://localhost:5001/api/analytics/query
Content-Type: application/json
Authorization: Bearer {{district_admin_token}}

{
  "question": "What is the 4-year ELA proficiency trend across the district?"
}

###

### === SECURITY TESTS ===

### SEC1: No token (SHOULD RETURN 401)
POST https://localhost:5001/api/analytics/query
Content-Type: application/json

{
  "question": "What is the attendance rate?"
}

###

### SEC2: Invalid/expired token (SHOULD RETURN 401)
POST https://localhost:5001/api/analytics/query
Content-Type: application/json
Authorization: Bearer this.is.not.a.valid.token

{
  "question": "What is the attendance rate?"
}
```

Replace `{{teacher_token}}`, `{{school_admin_token}}`, `{{district_admin_token}}` with the values from `test_tokens.json`.

## Part 3 — Claims Extraction Verification

Create a diagnostic endpoint to verify claims extraction (development only):

```csharp
// Controllers/DiagnosticsController.cs (REMOVE before production)
using DistrictAnalyticsApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DistrictAnalyticsApi.Controllers;

[ApiController]
[Route("api/diagnostics")]
[Authorize]
public class DiagnosticsController : ControllerBase
{
    private readonly IUserContextService _userContextService;

    public DiagnosticsController(IUserContextService userContextService)
    {
        _userContextService = userContextService;
    }

    /// <summary>
    /// Returns the UserContext built from the current request's token.
    /// Development only — remove before deployment.
    /// </summary>
    [HttpGet("context")]
    public ActionResult GetContext()
    {
        try
        {
            var ctx = _userContextService.BuildFromClaims(User);
            return Ok(new
            {
                ctx.Role,
                ctx.SchoolId,
                ctx.SchoolName,
                ctx.SchoolYear,
                ctx.CurrentTermId,
                SectionIdCount = ctx.SectionIds.Count,
                AllClaims = User.Claims.Select(c => new { c.Type, c.Value }).ToList(),
            });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
    }
}
```

Test it:

```http
### Verify teacher claims
GET https://localhost:5001/api/diagnostics/context
Authorization: Bearer {{teacher_token}}
```

Expected response for teacher:

```json
{
  "role": "teacher",
  "schoolId": "SCH001",
  "schoolName": "Sunlake Elementary",
  "schoolYear": 2026,
  "currentTermId": "Q2",
  "sectionIdCount": 2,
  "allClaims": [
    { "type": "roles", "value": "teacher" },
    { "type": "extension_SchoolId", "value": "SCH001" },
    ...
  ]
}
```

## Part 4 — Evidence Document

After running all test scenarios, complete the evidence table in your lab report.

| Test | Role | Question (abbreviated) | Expected | Actual HTTP | `declined` | `isGrounded` | Pass/Fail |
|------|------|------------------------|----------|-------------|------------|--------------|-----------|
| T1 | teacher | "attendance rate my students" | 200, grounded | | | | |
| T2 | teacher | "district achievement gap" | 200, declined | | | | |
| T3 | teacher | "student 12345 GPA" | 200, declined | | | | |
| SA1 | school_admin | "chronic absenteeism my school" | 200, grounded | | | | |
| SA2 | school_admin | "Grade 3 Math BOY" | 200, grounded | | | | |
| SA3 | school_admin | "Lakeside Middle School attendance" | 200, scoped to SCH001 | | | | |
| DA1 | district_admin | "district-wide attendance" | 200, all schools | | | | |
| DA2 | district_admin | "benchmark comparison" | 200, grounded | | | | |
| DA3 | district_admin | "4-year ELA trend" | 200, grounded | | | | |
| SEC1 | none | "attendance rate" | 401 | | | | |
| SEC2 | invalid | "attendance rate" | 401 | | | | |

Fill in "Actual HTTP", `declined`, and `isGrounded` from your test runs.

## Part 5 — School Admin Scope Test

Test SA3 deserves special attention. When a school admin asks about "Lakeside Middle School" (a different school), the system should:

1. Retrieve metadata for attendance views (their role allows this)
2. Execute SQL with `WHERE SchoolID = 'SCH001'` (from the token, not the question)
3. Return data for Sunlake Elementary — the school admin's own school

The answer should **not mention Lakeside Middle School's data** — because the token says `SchoolId = SCH001`.

**Correct behavior:** The answer references Sunlake Elementary's attendance and does not include any reference to Lakeside Middle School.

**Incorrect behavior (bug):** The answer either returns Lakeside's data or errors out.

If the test passes (correct behavior): document it as a security control working.

If the test fails (incorrect behavior): the `SqlDataService.QueryAttendanceBySchoolGradeAsync` method is not correctly applying the school scope. Check the `WHERE SchoolID = @SchoolId` clause.

## Lab Report

1. Paste the completed evidence table from Part 4.
2. For Test SA3: paste the `answer` from the response. Does it correctly reference only SCH001 data?
3. For Test T2: paste the full JSON response. Confirm `declined: true` and `declineReason: "insufficient_role"`.
4. Describe what would happen if the `[Authorize]` attribute were removed from `AnalyticsController`. Which specific attacks (from Module 11's attack scenario table) would become possible?
5. What change would you make to add a fourth role: `department_head` who can see their school's data for their department's grade range only? Name every file/class that would need to change.

*Next: Lab 06b — Analytics Scenarios*
