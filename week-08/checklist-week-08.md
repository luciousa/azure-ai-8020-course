# Week 08 Completion Checklist

**Week:** 8 — Monitoring, Governance, and Production Readiness  
**Modules:** 15, 16 | **Labs:** 08a, 08b

## Module 15 — Monitoring and Governance

- [ ] Read Module 15 in full
- [ ] Can name all 3 observability pillars (metrics, traces, logs) and what each answers
- [ ] Can name all 6 key metrics and their alert thresholds
- [ ] Understands the span hierarchy (RunQuery → MetadataSearch → SqlQuery → Completion)
- [ ] Can identify what should and should not appear in a structured audit log entry
- [ ] Knows the NuGet packages required for OpenTelemetry + Azure Monitor
- [ ] Can describe the `ActivitySource` and `Meter` pattern for custom telemetry
- [ ] Understands the governance framework: Policy, People, Process
- [ ] Can name the 6 Responsible AI principles and apply each to the SUSD system
- [ ] Knows the recommended review cadence (monthly, quarterly, annual)
- [ ] Completed Module 15 reflection questions

## Module 16 — POC to Production

- [ ] Read Module 16 in full
- [ ] Can list all 8 gaps between the POC and a production-ready system
- [ ] Understands `DefaultAzureCredential` and the order it tries credential sources
- [ ] Can describe what Azure RBAC roles are required (OpenAI User, Search Reader, KV Secrets User)
- [ ] Understands the private endpoint architecture (App Service VNet → private endpoint → Azure services)
- [ ] Understands what Entra ID app roles are and how they're defined in the manifest
- [ ] Can explain why the HS256 dev token approach is insecure for production
- [ ] Knows the 3 rollout phases and their success criteria
- [ ] Can estimate monthly cost at moderate usage scale
- [ ] Can articulate the 3 critical blockers before Phase 1 pilot
- [ ] Completed Module 16 reflection questions

## Lab 08a — Monitoring Setup

- [ ] `PipelineTelemetry.cs` created with `ActivitySource` and custom `Meter`
- [ ] OpenTelemetry packages added to project
- [ ] `Program.cs` updated with development (console) and production (Azure Monitor) branches
- [ ] `RagOrchestrator` instrumented with spans for all 4 stages
- [ ] Custom metrics emitted: `RequestsTotal`, `DeclinesTotal`, `InputTokens`, `OutputTokens`, `RequestDuration`
- [ ] Console trace output verified: spans and tags present (Part 2)
- [ ] Structured log line verified: role/school/view/tokens/latency present, no question text
- [ ] Application Insights resource created (or instructor provides connection string)
- [ ] Application Insights Workbook created with all 5 sections (Part 4)
- [ ] Alert 1 (high token usage) configured
- [ ] Alert 2 (decline spike) configured
- [ ] Alert 3 (error rate) configured
- [ ] PII telemetry scan (KQL query) returns zero rows (Part 6)
- [ ] Lab report completed (5 questions)

## Lab 08b — Production Checklist

- [ ] All 8 sections of the production readiness checklist completed with status marks
- [ ] Each ✓ COMPLETE item backed by specific evidence from a prior lab
- [ ] ⚙ INFRA items described with what infrastructure is needed
- [ ] 📋 PROCESS items described with what process/policy is needed
- [ ] Critical blockers identified (at least 3)
- [ ] Production readiness summary completed
- [ ] Q1 response (data protection confidence) written
- [ ] Q2 response (wrong number decision) written
- [ ] Q3 response (individual student performance expansion) written
- [ ] Lab report completed (5 questions)

## Week 08 Knowledge Check

1. **(Module 15)** Your OpenTelemetry traces show that the `MetadataSearch` span takes 1.2 seconds on average, but the `SqlQuery` span takes only 0.1 seconds. The `Completion` span takes 2.0 seconds. A stakeholder wants to cut response time. Which component has the most optimization potential, and what changes would you investigate for each of the two slowest spans?

2. **(Module 15)** The governance framework says any change to the system prompt requires review by the Data Privacy Officer before deployment. A teacher reports that the assistant frequently misinterprets questions about "chronic absenteeism" and you want to add a clarification note to the system prompt. Walk through the change control process: who reviews what, and what is the risk this particular change carries?

3. **(Module 16)** `DefaultAzureCredential` tries credentials in a specific order. You deploy to Azure App Service and the managed identity is correctly assigned, but the app is still using the environment variable `AZURE_CLIENT_ID` from a leftover local dev configuration. Which credential takes precedence, and is this a security risk? How would you fix it?

4. **(Lab 08a)** The PII scan KQL query (`where * has "Maria"`) is a simple string match. Describe 2 ways a student name could appear in telemetry and still not be caught by this query. How would you design a more robust PII-in-telemetry detection approach?

5. **(Lab 08b)** The production readiness checklist has separate tracks for technical controls (✓), infrastructure (⚙), and process/policy (📋). A district CTO says: "All the technical controls are in place — can we go to production?" What is your answer, and which specific 📋 PROCESS items would be your hardest blockers to resolve quickly?

## Time Log (Optional)

| Activity | Estimated | Actual |
|----------|-----------|--------|
| Module 15 | 2.5 hrs | |
| Module 16 | 2.5 hrs | |
| Lab 08a | 2.5 hrs | |
| Lab 08b | 2.0 hrs | |
| **Total** | **9.5 hrs** | |

*When all items above are checked, proceed to the Capstone.*
