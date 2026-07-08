# Week 05 Completion Checklist

**Week:** 5 — Backend Integration  
**Modules:** 09, 10 | **Labs:** 05a, 05b

## Module 09 — .NET Backend Integration

- [ ] Read Module 09 in full
- [ ] Can describe the full 5-stage pipeline orchestration in `RagOrchestrator`
- [ ] Understands why `UserContext` is populated from Entra ID claims, not request body
- [ ] Can explain the `DefaultAzureCredential` POC-to-production pattern (zero code change)
- [ ] Can identify what `ViewRegistry.ThrowIfNotAuthorized` protects against
- [ ] Understands why the switch dispatch in `SqlDataService` is safer than `eval()` or reflection
- [ ] Understands the token budget (~3,000 total) and how it shapes prompt design
- [ ] Can explain why `Temperature = 0.1f` is used for analytics queries
- [ ] Completed Module 09 reflection questions

## Module 10 — Python Prototyping

- [ ] Read Module 10 in full
- [ ] Can explain when Python is the right tool vs. when to use the .NET API
- [ ] Understands the Python–to–.NET handoff checklist and when to apply it
- [ ] Can describe how `extract_query_parameters` uses structured LLM output (JSON mode)
- [ ] Understands the evaluation harness: groundedness, decline, keyword scores
- [ ] Knows what a score of 2.5/3.0 means and how to investigate failing cases
- [ ] Completed Module 10 reflection questions

## Lab 05a — .NET API

- [ ] `DistrictAnalyticsApi` project created and builds without errors (`dotnet build`)
- [ ] All NuGet packages installed successfully
- [ ] All source files created: Controllers, Models, Services, Security, Prompts
- [ ] `ViewRegistry.AdminOnlyViews` contains all 5 admin-only view names
- [ ] All 9 view handlers implemented in `SqlDataService` (no stubs remaining)
- [ ] `Program.cs` DI wiring: all services registered as Scoped
- [ ] `DefaultAzureCredential` branch tested: API key path used in dev (confirmed by log output)
- [ ] API runs locally (`dotnet run`) — Swagger UI accessible at `/swagger`
- [ ] All 3 `.http` test files executed:
  - [ ] School admin attendance query → HTTP 200, `isGrounded: true`
  - [ ] School admin assessment query → HTTP 200, `isGrounded: true`
  - [ ] District admin benchmark query → HTTP 200, `isGrounded: true`
  - [ ] Teacher attendance query → HTTP 200
  - [ ] Teacher admin-view attempt → HTTP 200, `declined: true`, `declineReason: "insufficient_role"`
- [ ] Token budget recorded for at least one grounded and one metadata-only response
- [ ] Lab report completed (4 questions)

## Lab 05b — Python Prototype

- [ ] `prototype/` directory created with all module files copied from Module 10
- [ ] `requirements.txt` installed without errors
- [ ] `.env.local` configured and added to `.gitignore`
- [ ] `search_helper.py` complete (hybrid search with security trimming)
- [ ] `db_helper.py` complete — all 9 view handlers, no `[stub]` returns
- [ ] `scripts/run_question.py` tested for all 3 roles
- [ ] Teacher admin-view attempt → correctly declined
- [ ] Teacher FERPA scenario (individual name) → correctly declined
- [ ] `scripts/run_evaluation.py` executed — evaluation_results.csv saved
- [ ] Evaluation average score ≥ 2.5 / 3.0
- [ ] `scripts/compare_extraction.py` executed — keyword vs. LLM comparison recorded
- [ ] Python-to-.NET handoff checklist: all boxes checked
- [ ] Lab report completed (5 questions)

## Week 05 Knowledge Check

1. **(Module 09)** The `GetUserContextFromClaims()` method in Lab 05a uses `request.DebugRole` as a POC placeholder. Describe exactly what this method should do in production (Week 6): where does each field of `UserContext` come from, and why can none of them come from the request body?

2. **(Module 09)** You discover that the `vw_LongitudinalProficiencyTrend` handler is returning all data for a district admin regardless of school year, and the token count is going over budget. Identify the cause and describe the fix in `SqlDataService`.

3. **(Module 10)** Your evaluation shows that Case 11 ("What does 'chronically absent' mean?") consistently returns `isGrounded: false`. Is this a bug or the correct behavior? Explain what the correct answer is for a glossary question and why it doesn't need SQL data.

4. **(Lab 05a + 05b)** Both the Python and .NET implementations have a "dispatch" pattern: Python uses a `dict` of callables, .NET uses a `switch` expression. Describe a scenario where adding a new approved view would require more changes in .NET than in Python — and whether that difference matters in production.

5. **(Lab 05b)** During evaluation, Case 6 (individual student name request) should be declined. However, you notice the pipeline returns a grounded answer because the teacher's sections happened to have a student named "Sarah" in the data. Describe exactly which part of the code should have declined this before the SQL query was executed, and write the logic to fix it.

## Time Log (Optional)

| Activity | Estimated | Actual |
|----------|-----------|--------|
| Module 09 | 2.5 hrs | |
| Module 10 | 2.5 hrs | |
| Lab 05a | 3.5 hrs | |
| Lab 05b | 3.0 hrs | |
| **Total** | **11.5 hrs** | |

*When all items above are checked, proceed to Week 06.*
