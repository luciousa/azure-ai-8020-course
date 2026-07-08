# Module 11 — Role-Aware Access Control

**Week:** 6 | **Estimated time:** 2.5 hours  
**Prerequisites:** Module 09 (.NET API); Lab 05a  
**Builds toward:** Lab 06a (role-aware demo), Week 7 (security review)

## Learning Objectives

By the end of this module you will be able to:

1. Map SUSD staff roles to Entra ID group memberships and token claims.
2. Extract `UserContext` from a JWT bearer token in ASP.NET Core.
3. Explain the three layers of access control and why all three are required.
4. Implement and test the scope enforcement logic for each role.
5. Identify the specific attacks that role-aware access control prevents.

## The Three Layers of Access Control

Every question from a staff member passes through three independent checks:

```
Layer 1: Authentication    — Is this a valid SUSD staff member?
                              (Entra ID / JWT validation)

Layer 2: Metadata filter   — Which views can this role see?
                              (AI Search role_scope filter — applied at query time)

Layer 3: SQL scoping       — Which rows can this role access within the view?
                              (UserContext values used as WHERE clause parameters)
```

**Why all three layers are required:**

- Layer 1 alone: A forged token could claim any role.
- Layer 2 alone: An attacker who bypassed search could call the SQL endpoint directly.
- Layer 3 alone: Without metadata filtering, a teacher could ask "district assessment gap" and receive guidance on using a view they shouldn't see — even if the SQL query itself is scoped.

Defense-in-depth means each layer independently enforces the constraint.

## Entra ID Role Design

### Group structure

Create three Entra ID security groups:

| Group display name | Claim value | Who is a member |
|---|---|---|
| `SUSD-AI-Teacher` | `teacher` | Classroom teachers |
| `SUSD-AI-SchoolAdmin` | `school_admin` | Principals, assistant principals |
| `SUSD-AI-DistrictAdmin` | `district_admin` | C-suite, department directors |

> **Principle of least privilege:** Users should belong to exactly one group. A principal who also teaches should be in `SUSD-AI-SchoolAdmin`, not both.

### Custom token claims

Configure Entra ID app registration to emit custom claims via **optional claims** or the **claims mapping policy**:

| Claim name | Source | Example value |
|---|---|---|
| `roles` | Group membership → app role | `["school_admin"]` |
| `extension_SchoolId` | User attribute | `"SCH001"` |
| `extension_SchoolName` | User attribute | `"Sunlake Elementary"` |
| `extension_SchoolYear` | Directory extension | `"2026"` |
| `extension_CurrentTermId` | Directory extension | `"Q2"` |

Configure this in **Azure Portal → App registrations → [Your app] → Token configuration**.

> **Important:** Directory extension attributes must be created before they can be included in tokens. See [Microsoft Entra custom attributes](https://docs.microsoft.com/azure/active-directory/develop/active-directory-optional-claims).

## Reading Claims in ASP.NET Core

### Add JWT Bearer authentication

In `Program.cs`, add:

```csharp
// After builder.Services.AddControllers():
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddMicrosoftIdentityWebApi(builder.Configuration.GetSection("AzureAd"));

builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});
```

And after `app.UseHttpsRedirection()`:

```csharp
app.UseAuthentication();
app.UseAuthorization();
```

Add to `appsettings.json`:

```json
"AzureAd": {
  "Instance": "https://login.microsoftonline.com/",
  "TenantId": "YOUR_TENANT_ID",
  "ClientId": "YOUR_APP_CLIENT_ID",
  "Audience": "api://YOUR_APP_CLIENT_ID"
}
```

### UserContextService — from token to UserContext

Replace the POC `GetUserContextFromClaims()` in `AnalyticsController` with a proper service:

```csharp
// Services/UserContextService.cs
using System.Security.Claims;
using DistrictAnalyticsApi.Models;

namespace DistrictAnalyticsApi.Services;

public interface IUserContextService
{
    UserContext BuildFromClaims(ClaimsPrincipal principal);
}

public class UserContextService : IUserContextService
{
    private readonly ILogger<UserContextService> _logger;

    public UserContextService(ILogger<UserContextService> logger)
    {
        _logger = logger;
    }

    public UserContext BuildFromClaims(ClaimsPrincipal principal)
    {
        // Extract role from app roles claim
        var role = principal.FindFirst("roles")?.Value
            ?? principal.FindFirst(ClaimTypes.Role)?.Value
            ?? throw new UnauthorizedAccessException("No role claim found in token.");

        ValidateRole(role);

        // School attributes from extension claims (or null for district_admin)
        var schoolId = principal.FindFirst("extension_SchoolId")?.Value;
        var schoolName = principal.FindFirst("extension_SchoolName")?.Value;

        // School year with fallback to current year + 1
        var schoolYearStr = principal.FindFirst("extension_SchoolYear")?.Value;
        var schoolYear = int.TryParse(schoolYearStr, out var yr)
            ? yr
            : DateTime.UtcNow.Month >= 8
                ? DateTime.UtcNow.Year + 1   // Aug–Dec: next calendar year is the end year
                : DateTime.UtcNow.Year;       // Jan–Jul: current calendar year

        var termId = principal.FindFirst("extension_CurrentTermId")?.Value ?? "Q1";

        // Teacher section IDs may come from a separate claim
        var sectionIds = principal.FindAll("extension_SectionId")
            .Select(c => c.Value)
            .ToList();

        _logger.LogInformation(
            "UserContext built: role={Role} school={School} year={Year} term={Term}",
            role, schoolId ?? "district", schoolYear, termId);

        // Validate: non-district roles must have a school
        if (role != "district_admin" && string.IsNullOrEmpty(schoolId))
        {
            _logger.LogWarning("Role {Role} has no SchoolId claim — scoping will be incomplete", role);
        }

        return new UserContext
        {
            Role = role,
            SchoolId = schoolId,
            SchoolName = schoolName,
            SchoolYear = schoolYear,
            CurrentTermId = termId,
            SectionIds = sectionIds,
        };
    }

    private static void ValidateRole(string role)
    {
        if (role is not ("teacher" or "school_admin" or "district_admin"))
            throw new UnauthorizedAccessException($"Unknown role: '{role}'");
    }
}
```

### Updated AnalyticsController

```csharp
// Controllers/AnalyticsController.cs (updated)
using DistrictAnalyticsApi.Models;
using DistrictAnalyticsApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DistrictAnalyticsApi.Controllers;

[ApiController]
[Route("api/analytics")]
[Authorize]  // Week 6: requires valid Entra ID token
public class AnalyticsController : ControllerBase
{
    private readonly RagOrchestrator _orchestrator;
    private readonly IUserContextService _userContextService;
    private readonly ILogger<AnalyticsController> _logger;

    public AnalyticsController(
        RagOrchestrator orchestrator,
        IUserContextService userContextService,
        ILogger<AnalyticsController> logger)
    {
        _orchestrator = orchestrator;
        _userContextService = userContextService;
        _logger = logger;
    }

    [HttpPost("query")]
    public async Task<ActionResult<AnalyticsResponse>> Query(
        [FromBody] AnalyticsRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Question))
            return BadRequest("Question is required.");

        UserContext ctx;
        try
        {
            ctx = _userContextService.BuildFromClaims(User);
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning("Invalid claims: {Message}", ex.Message);
            return Forbid();
        }

        var response = await _orchestrator.ProcessQuestionAsync(
            request.Question, ctx, cancellationToken);

        return Ok(response);
    }
}
```

Register in `Program.cs`:

```csharp
builder.Services.AddScoped<IUserContextService, UserContextService>();
```

And add the NuGet package:

```bash
dotnet add package Microsoft.Identity.Web --version 3.4.0
```

## Role-Scope Enforcement Matrix

This table defines what each role can and cannot see. Reference this in code reviews and security testing.

| Data | Teacher | School Admin | District Admin |
|------|---------|--------------|----------------|
| Own sections' student attendance | ✅ | ❌ (school aggregate) | ❌ (district aggregate) |
| School attendance aggregate | ❌ | ✅ (own school) | ✅ (all schools) |
| Local assessment results | ❌ | ✅ (own school) | ✅ (all schools) |
| State assessment summary | ❌ | ✅ (own school) | ✅ (all schools) |
| Achievement gap by subgroup | ❌ | ✅ (own school) | ✅ (all schools) |
| Performance vs benchmark | ❌ | ✅ (own school) | ✅ (all schools) |
| Longitudinal proficiency trend | ❌ | ✅ (own school) | ✅ (all schools) |
| Intervention summary (aggregate) | ❌ | ✅ (own school) | ✅ (all schools) |
| Data quality flags | ❌ | ✅ (own school) | ✅ (all schools) |
| **Individual student records** | ❌ FERPA | ❌ FERPA | ❌ FERPA |

> **Note on teacher access to student attendance:** `vw_AttendanceSummaryByStudentAndTerm` is accessible to teachers but scoped to their `SectionIds`. The system returns aggregate-style rows (StudentKey, not student name) for the teacher's own sections only. No cross-section access is possible because `SectionIds` comes from the token, not the request.

## Attack Scenarios and Mitigations

### Attack 1: Token spoofing
**Scenario:** An attacker forges a JWT claiming `role=district_admin`.  
**Mitigation:** The JWT is signed by Entra ID. `AddMicrosoftIdentityWebApi` validates the signature against Entra's public keys. A forged token fails signature validation and returns HTTP 401.

### Attack 2: Role escalation via request body
**Scenario:** A teacher sends `{"question": "...", "debugRole": "district_admin"}` in the request body.  
**Mitigation:** In production (Week 6), `GetUserContextFromClaims()` is replaced by `_userContextService.BuildFromClaims(User)` which reads only the validated `ClaimsPrincipal`. The `DebugRole` field in `AnalyticsRequest` is removed in production. No user-supplied field is used to determine role.

### Attack 3: View bypassing via direct API call
**Scenario:** A teacher's client reverse-engineers the API and calls `/api/analytics/query` with a question that names a non-teacher view.  
**Mitigation:** Layer 2 (AI Search `role_scope` filter) prevents teacher-role searches from returning admin-only metadata. Layer 3 (`ViewRegistry.ThrowIfNotAuthorized(viewName, ctx.Role)`) blocks execution even if a view name somehow appears.

### Attack 4: Cross-school data leakage
**Scenario:** A school admin sets their client to send `SchoolId=SCH002` (another school) in the request body.  
**Mitigation:** `SchoolId` comes exclusively from the validated token claim `extension_SchoolId`. Nothing in the request body can override it. All SQL queries use `WHERE SchoolID = @SchoolId` with the token-sourced value.

## Claims Testing Without a Full Entra Setup

For Lab 06a, you can test the claims-based `UserContextService` using test JWT tokens. Generate them with a helper script:

```python
# scripts/generate_test_token.py (development only — never use in production)
"""Generate a local test JWT for development when Entra ID is not available."""
import jwt
import datetime

SECRET = "dev-test-secret-not-for-production"

def make_test_token(role: str, school_id: str | None, school_name: str | None) -> str:
    payload = {
        "roles": [role],
        "extension_SchoolId": school_id,
        "extension_SchoolName": school_name,
        "extension_SchoolYear": "2026",
        "extension_CurrentTermId": "Q2",
        "sub": f"test-user-{role}",
        "iss": "https://login.microsoftonline.com/test-tenant/",
        "aud": "api://test-client-id",
        "iat": datetime.datetime.utcnow(),
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1),
    }
    return jwt.encode(payload, SECRET, algorithm="HS256")

if __name__ == "__main__":
    print("Teacher token:")
    print(make_test_token("teacher", "SCH001", "Sunlake Elementary"))
    print("\nSchool Admin token:")
    print(make_test_token("school_admin", "SCH001", "Sunlake Elementary"))
    print("\nDistrict Admin token:")
    print(make_test_token("district_admin", None, None))
```

> **For local testing only.** In `appsettings.Development.json`, configure JWT validation to accept HS256 with the test secret. Remove before deploying.

## Reflection Questions

1. A teacher is also a department head and needs to see school-level assessment data. How should this be handled in the Entra ID group design? (Hint: consider whether a user can be in two groups and what that implies for the security model.)

2. The `UserContextService` logs a warning when a non-district role has no `SchoolId` claim. Should this warning be elevated to an error that declines the request? What are the trade-offs?

3. Explain why `SectionIds` for a teacher must come from the token, not from the question. What would an attacker be able to do if section IDs came from the request body?

4. In the attack scenario table, Attack 3 relies on Layer 2 preventing a teacher from even knowing that admin-only views exist. Is information hiding (preventing the teacher from learning about unavailable views) a security control or a UX choice? Can the system be secure without it?

## References

- [Microsoft Identity Web — ASP.NET Core](https://github.com/AzureAD/microsoft-identity-web)
- [Entra ID optional claims](https://docs.microsoft.com/azure/active-directory/develop/active-directory-optional-claims)
- [Entra ID app roles](https://docs.microsoft.com/azure/active-directory/develop/howto-add-app-roles-in-apps)
- [JWT validation in ASP.NET Core](https://docs.microsoft.com/aspnet/core/security/authentication/jwt-authn)

*Next: Module 12 — Assessment Analytics Scenarios*
