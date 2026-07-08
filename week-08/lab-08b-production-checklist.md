# Lab 08b — Production Checklist

**Week:** 8 | **Lab:** 08b | **Estimated time:** 2 hours  
**Prerequisites:** Module 16 (POC to Production); Lab 08a  
**Builds toward:** Capstone

## Lab Objectives

1. Work through the full production readiness checklist for the SUSD Analytics Assistant.
2. Identify which items are complete (lab-verified), which require infrastructure (Azure configuration), and which require district process (governance).
3. Build a production readiness summary suitable for a technical review board.
4. Document the delta between the lab POC and what would be required for actual district deployment.

## The Production Readiness Checklist

For each item, mark:
- ✓ **COMPLETE** — verified in the lab
- ⚙ **INFRA** — requires Azure infrastructure setup (outside lab scope)
- 📋 **PROCESS** — requires district governance process or policy
- ⬜ **INCOMPLETE** — not yet done; describe what's needed

## Section 1: Authentication and Identity

| # | Requirement | Status | Evidence / Notes |
|---|---|---|---|
| 1.1 | All API endpoints require a valid JWT | ✓ | `[Authorize]` attribute on `AnalyticsController`; SEC1 and SEC2 tests pass |
| 1.2 | No-token requests return HTTP 401 | ✓ | Lab 06a SEC1 evidence |
| 1.3 | Invalid/expired tokens return HTTP 401 | ✓ | Lab 07a Layer 1 tests |
| 1.4 | Production Entra ID app registration created | ⚙ | Module 16 describes the setup; not done in lab |
| 1.5 | Role claims read from Entra ID token (not request body) | ✓ | `UserContextService.BuildFromClaims()` validated |
| 1.6 | SchoolId and SectionId claims from verified Entra attributes | ✓ | `extension_SchoolId` / `extension_SectionIds` read from token |
| 1.7 | HS256 dev tokens removed from production code path | ✓ | `if (IsDevelopment())` gate in Program.cs |
| 1.8 | Custom extension attributes configured in Entra ID for SchoolId, SectionIds | ⚙ | Requires Entra ID Enterprise App configuration by district IT |

**Section 1 status:** ✓ Lab complete; ⚙ Production Entra ID integration pending

## Section 2: Data Access Control

| # | Requirement | Status | Evidence / Notes |
|---|---|---|---|
| 2.1 | All 9 approved views created and tested | ✓ | Lab 04b; SQL view list confirmed in Lab 07a |
| 2.2 | `ai_svc_readonly` service account created | ✓ | Lab 04b service account setup |
| 2.3 | GRANT SELECT on all 9 views for service account | ✓ | Lab 07a SQL permission tests pass |
| 2.4 | DENY SELECT on base tables (`dim_Student`, `fact_Assessment`, etc.) | ✓ | Lab 07a SQL permission tests pass |
| 2.5 | No INSERT/UPDATE/DELETE rights for service account | ✓ | Lab 07a write test denied |
| 2.6 | `ViewRegistry.ThrowIfNotAuthorized()` guards all SQL dispatch | ✓ | Lab 05a code review |
| 2.7 | All SQL queries use parameterized statements (zero string interpolation) | ✓ | Lab 05a code review; no `$"{variable}"` in SQL strings |
| 2.8 | Small cell suppression active in `vw_AssessmentGapBySubgroup` | ✓ | Lab 07a Scenario 3 verified |
| 2.9 | Production SQL Server connection uses Key Vault (no hardcoded credentials) | ⚙ | Module 16 describes Key Vault integration |
| 2.10 | SQL Server accessible only from App Service VNet (not public internet) | ⚙ | Requires VNet + private endpoint setup |

**Section 2 status:** ✓ Lab complete for SQL controls; ⚙ Network isolation pending

## Section 3: AI Search and Metadata

| # | Requirement | Status | Evidence / Notes |
|---|---|---|---|
| 3.1 | AI Search index created with `role_scope` field | ✓ | Lab 04a index creation |
| 3.2 | All 49 metadata documents uploaded with correct `role_scope` values | ✓ | Lab 04b upload script |
| 3.3 | Role scope filter applied as pre-filter (not post-filter) | ✓ | Lab 07a Layer 2 test: teacher does not see admin-only metadata |
| 3.4 | Semantic ranker configuration applied | ✓ | Lab 04a semantic config |
| 3.5 | Production AI Search on Standard tier (not Free) | ⚙ | Free tier doesn't support semantic ranker at scale |
| 3.6 | Azure AI Search managed identity access to key vault (if encrypting index) | ⚙ | Optional; recommended for high-security environments |
| 3.7 | AI Search accessible only from App Service VNet | ⚙ | Private endpoint required |

**Section 3 status:** ✓ Lab complete for search controls; ⚙ Infrastructure pending

## Section 4: Azure OpenAI

| # | Requirement | Status | Evidence / Notes |
|---|---|---|---|
| 4.1 | GPT-4o-mini deployment created in Azure OpenAI | ✓ | Lab setup |
| 4.2 | `text-embedding-3-small` deployment created | ✓ | Lab setup |
| 4.3 | API key authentication replaced with managed identity | ⚙ | Module 16; `DefaultAzureCredential` code is in place but managed identity requires App Service |
| 4.4 | Azure OpenAI accessible only from App Service VNet | ⚙ | Private endpoint required |
| 4.5 | Content filtering policy configured (not disabled) | ⚙ | Verify in Azure OpenAI Studio that default content filters are on |
| 4.6 | Token per minute (TPM) quota set appropriately for expected load | ⚙ | Calculate from usage estimates in Module 16 |
| 4.7 | Data retention settings verified (Azure OpenAI does not retain prompts by default) | 📋 | Confirm with district counsel; document in DPA |

**Section 4 status:** ⚙ Managed identity and network isolation pending

## Section 5: FERPA and Privacy Controls

| # | Requirement | Status | Evidence / Notes |
|---|---|---|---|
| 5.1 | Zero PII columns in any approved view | ✓ | Lab 07a PII scan output |
| 5.2 | Individual student names never sent to Azure OpenAI | ✓ | Lab 07a Scenarios 1–2 verified; no student names in prompt |
| 5.3 | Small cell suppression returns NULL (not a number) | ✓ | Lab 07a Scenario 3 verified |
| 5.4 | Question text not logged in any operational log | ✓ | Lab 08a Part 6 KQL verified no PII in telemetry |
| 5.5 | Prompt injection blocked by ViewRegistry | ✓ | Lab 07a Scenario 5 verified |
| 5.6 | Debug role/school overrides removed from production code | ✓ | Lab 07a Scenario 6 grep verified |
| 5.7 | Azure FERPA-aligned service terms enabled for subscription | 📋 | District IT must verify with Microsoft account rep |
| 5.8 | Data Processing Agreement (DPA) signed with Microsoft | 📋 | Legal/procurement; required before production |
| 5.9 | Staff AI use policy written and approved | 📋 | Data Privacy Officer + district leadership |
| 5.10 | Staff training on AI use policy completed | 📋 | Required before any staff access to production system |
| 5.11 | Incident response plan for AI data exposure approved | 📋 | Data Privacy Officer + IT Security Lead |

**Section 5 status:** ✓ Technical controls complete; 📋 Policy and legal items pending

## Section 6: Monitoring and Observability

| # | Requirement | Status | Evidence / Notes |
|---|---|---|---|
| 6.1 | OpenTelemetry spans instrumented for all pipeline stages | ✓ | Lab 08a trace output verified |
| 6.2 | Custom metrics: RequestsTotal, Declines, InputTokens, OutputTokens, Duration | ✓ | Lab 08a console exporter verified |
| 6.3 | Structured audit log per query (role/school/view/tokens/latency) | ✓ | Lab 08a log line verified |
| 6.4 | Application Insights resource created and connected | ⚙ | Lab 08a sets this up; requires active Azure subscription |
| 6.5 | Application Insights Workbook deployed | ⚙ | Lab 08a Part 4 |
| 6.6 | Alert: High token usage (P95 > 3,000) | ⚙ | Lab 08a Part 5 Alert 1 |
| 6.7 | Alert: Decline spike (> 25%) | ⚙ | Lab 08a Part 5 Alert 2 |
| 6.8 | Alert: Error rate spike | ⚙ | Lab 08a Part 5 Alert 3 |
| 6.9 | Log retention policy defined (operational vs. audit) | 📋 | Module 15 recommends 90-day operational; longer for audit |
| 6.10 | No PII in telemetry (verified by KQL scan) | ✓ | Lab 08a Part 6 evidence |

**Section 6 status:** ✓ Instrumentation complete; ⚙ Azure infrastructure pending

## Section 7: Quality Assurance

| # | Requirement | Status | Evidence / Notes |
|---|---|---|---|
| 7.1 | 30-case evaluation test set defined | ✓ | Lab 07b |
| 7.2 | Evaluation run completed: scope safety = 1.00 | ✓ | Lab 07b evidence (or document actual score) |
| 7.3 | Evaluation run completed: groundedness ≥ 0.85 | ✓ | Lab 07b evidence |
| 7.4 | Evaluation run completed: factual accuracy ≥ 0.90 | ✓ | Lab 07b evidence |
| 7.5 | Azure AI Evaluation SDK groundedness scores match manual scores ≥ 80% | ✓ | Lab 07b Part 4 |
| 7.6 | FERPA compliance evidence document completed and signed | ✓ | Lab 07a Part 6 |
| 7.7 | Rate limiting configured | ✓ | Module 16 code in Program.cs |
| 7.8 | Quarterly evaluation cadence documented in governance plan | 📋 | Module 15 governance framework |

**Section 7 status:** ✓ Lab QA complete; 📋 Ongoing cadence needs process owner

## Section 8: Deployment and Operations

| # | Requirement | Status | Evidence / Notes |
|---|---|---|---|
| 8.1 | CI/CD pipeline defined (GitHub Actions or Azure DevOps) | ⚙ | Module 16 provides the YAML; requires repo and Azure pipeline setup |
| 8.2 | Staging environment mirrors production configuration | ⚙ | Infrastructure |
| 8.3 | Blue-green or slot deployment configured | ⚙ | Azure App Service deployment slots |
| 8.4 | Rollback procedure documented | 📋 | Define in runbook before Phase 1 pilot |
| 8.5 | On-call escalation path defined for AI-specific incidents | 📋 | Who gets paged when the analytics assistant is down? |
| 8.6 | Phase 1 pilot success criteria formally agreed | 📋 | Module 16 defines criteria; district must formally adopt |

## Part 2 — Readiness Summary

Based on your checklist, complete this readiness summary:

```
SUSD Analytics Assistant — Production Readiness Summary
Date: ___

LAB-VERIFIED CONTROLS (ready for production):
Total items: ___
✓ COMPLETE: ___

PENDING ITEMS:
⚙ INFRA items (Azure infrastructure): ___
📋 PROCESS items (governance/policy): ___
⬜ INCOMPLETE items: ___

SECTION-BY-SECTION STATUS:
1. Authentication:  [LAB READY / INFRA PENDING / PROCESS PENDING]
2. Data Access:     [LAB READY / INFRA PENDING / PROCESS PENDING]
3. AI Search:       [LAB READY / INFRA PENDING / PROCESS PENDING]
4. Azure OpenAI:    [LAB READY / INFRA PENDING / PROCESS PENDING]
5. FERPA/Privacy:   [LAB READY / INFRA PENDING / PROCESS PENDING]
6. Monitoring:      [LAB READY / INFRA PENDING / PROCESS PENDING]
7. Quality:         [LAB READY / INFRA PENDING / PROCESS PENDING]
8. Deployment:      [LAB READY / INFRA PENDING / PROCESS PENDING]

CRITICAL BLOCKERS (must be resolved before Phase 1 pilot):
1. ___
2. ___
3. ___

ESTIMATED TIME TO PHASE 1 PILOT: ___ weeks (assuming ___ staff)
```

## Part 3 — The Decision Conversation

Imagine you are presenting this readiness summary to a district technology committee. They will ask one of these questions. Prepare a written response for each.

**Q1:** "How confident are you that student data is protected?"

Write a response that:
- Acknowledges the risk honestly
- Describes the three layers of technical control
- Identifies the remaining process and infrastructure items that would further reduce risk
- Does not overclaim ("100% secure") or underclaim ("we can't guarantee anything")

**Q2:** "What happens if this system gives a principal a wrong number and they make a decision based on it?"

Write a response that:
- Describes the groundedness and accuracy controls
- Explains how the source view citation enables verification
- Acknowledges the limitation (the system can hallucinate, though controls reduce this)
- Describes the recommended human-in-the-loop workflow for high-stakes decisions

**Q3:** "Can we expand this to answer questions about individual student performance?"

Write a response that:
- Explains why the current architecture prevents this (and why that's intentional)
- Describes what technical and legal changes would be required to support individual-level queries
- Recommends a specific safeguard (e.g., a separate highly-restricted scope with individual user audit trails) if this is to be considered

## Lab Report

1. Paste the complete production readiness checklist with your status marks (Sections 1–8).
2. Paste the completed readiness summary from Part 2.
3. Paste your written responses to all 3 questions from Part 3.
4. Which section of the checklist has the most ⚙ INFRA items? What is the single highest-priority infrastructure task, and why?
5. Which section has the most 📋 PROCESS items? Who in the district would be responsible for clearing those items, and what would they need from the technology team to do so?

*Next: Week 08 Checklist → Capstone*
