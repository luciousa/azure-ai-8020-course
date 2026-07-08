# Week 06 Completion Checklist

**Week:** 6 — Role-Aware Access and Analytics Scenarios  
**Modules:** 11, 12 | **Labs:** 06a, 06b

## Module 11 — Role-Aware Access Control

- [ ] Read Module 11 in full
- [ ] Can name and explain all 3 layers of access control (authentication, metadata filter, SQL scope)
- [ ] Understands the Entra ID group structure: 3 groups, one group per user
- [ ] Can explain which claims map to each field in `UserContext`
- [ ] Can describe the `UserContextService.BuildFromClaims()` logic end-to-end
- [ ] Can identify all 4 attack scenarios and describe the mitigation for each
- [ ] Understands why `SectionIds` must come from the token, not the request
- [ ] Can explain why the "debug role" approach is POC-only and insecure in production
- [ ] Completed Module 11 reflection questions

## Module 12 — Assessment Analytics Scenarios

- [ ] Read Module 12 in full
- [ ] Can name all 5 assessment domains and their primary views
- [ ] Understands the question-to-answer mapping for each domain
- [ ] Can describe 3 question types that must be declined and the correct response for each
- [ ] Understands the difference between BOY/MOY/EOY assessment windows
- [ ] Understands the 4-level state assessment scale vs. local assessment proficiency bands
- [ ] Can explain the correct response to a suppressed cell (NULL in view output)
- [ ] Knows the responsible language rules for longitudinal trend descriptions
- [ ] Completed Module 12 reflection questions

## Lab 06a — Role-Aware Demo

- [ ] `UserContextService.cs` integrated and registered in DI
- [ ] `AnalyticsController` updated to use `_userContextService.BuildFromClaims(User)` in production path
- [ ] Test JWT generator script created and executed (`generate_test_tokens.py`)
- [ ] `DiagnosticsController` created and tested (returns correct context for each role)
- [ ] All 11 role matrix tests executed (T1–T3, SA1–SA3, DA1–DA3, SEC1–SEC2)
- [ ] Evidence table completed: all 11 tests documented with actual HTTP status and outcome
- [ ] Test T2 (teacher → admin view): confirmed `declined: true`, `declineReason: "insufficient_role"`
- [ ] Test SA3 (school admin → other school): confirmed response scoped to SCH001 only
- [ ] Test SEC1 and SEC2: confirmed HTTP 401 returned for no token and invalid token
- [ ] Lab report completed (5 questions)

## Lab 06b — Analytics Scenarios

- [ ] All Scenario Set 1 (Attendance A1–A4) executed and documented
- [ ] All Scenario Set 2 (Local Assessment LA1–LA4) executed and documented
- [ ] All Scenario Set 3 (State Assessment SA1–SA3) executed and documented
- [ ] All Scenario Set 4 (Achievement Gap G1–G3) executed and documented
- [ ] Scenario G3 (small cell): confirmed suppressed cell response — no number, no inference
- [ ] All Scenario Set 5 (Longitudinal T1–T3) executed and documented
- [ ] Scenario T3 (causal question): confirmed no causal explanation in response
- [ ] Scenario Analysis Worksheet completed for all 5 domains
- [ ] At least one prompt improvement implemented and tested (Option A, B, or C)
- [ ] All 4 FERPA scenarios (F1–F4) executed: no student names in any response
- [ ] Token efficiency review table completed
- [ ] Lab report completed (5 questions)

## Week 06 Knowledge Check

1. **(Module 11)** A teacher calls the API with a valid token (role=teacher) and asks: "How many students at Lakeside Middle School are chronically absent?" Trace the request through all 3 layers of access control and describe what happens at each layer. What does the teacher ultimately receive?

2. **(Module 11)** The `UserContextService` logs a warning when `role != "district_admin"` and `SchoolId` is null. A new principal joins and their account hasn't been fully provisioned yet — their token has no `extension_SchoolId` claim. Should this warning be upgraded to an error that declines the request? What are the security vs. usability trade-offs?

3. **(Module 12)** A district administrator asks: "Did our intervention program work this year?" Describe exactly how you would answer this question using only data available in the approved view catalog, and what you would tell the user about the limits of the answer.

4. **(Lab 06a)** You remove the `[Authorize]` attribute from `AnalyticsController` and redeploy. Which 3 specific attacks from Module 11 become possible, and for each, describe the worst-case data exposure?

5. **(Lab 06b)** You are reviewing Scenario G3 (suppressed cell test). The assistant returns: "The data for this group is not available." Is this response FERPA-compliant? Is it ideal? Write a better response that is both compliant and informative.

## Time Log (Optional)

| Activity | Estimated | Actual |
|----------|-----------|--------|
| Module 11 | 2.5 hrs | |
| Module 12 | 2.0 hrs | |
| Lab 06a | 3.0 hrs | |
| Lab 06b | 2.5 hrs | |
| **Total** | **10.0 hrs** | |

*When all items above are checked, proceed to Week 07.*
