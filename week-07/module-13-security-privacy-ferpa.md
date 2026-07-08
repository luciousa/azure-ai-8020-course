# Module 13 — Security, Privacy, and FERPA

**Week:** 7 | **Estimated time:** 3 hours  
**Prerequisites:** Module 11 (role-aware access); Lab 06a; Lab 06b  
**Builds toward:** Lab 07a (FERPA review)

## Learning Objectives

By the end of this module you will be able to:

1. Explain FERPA and its specific implications for AI systems that process student records.
2. Map each FERPA requirement to a specific technical control in the SUSD architecture.
3. Conduct a structured FERPA compliance review of a RAG pipeline.
4. Identify the 5 most common FERPA violations in AI-assisted analytics systems.
5. Describe the required controls for any system that sends student data to Azure OpenAI.

## FERPA Primer for Technical Staff

FERPA (20 U.S.C. § 1232g) grants parents and eligible students (18+) the right to:
- Access their education records
- Request amendment of inaccurate records
- Consent before records are disclosed to third parties

**What counts as an "education record":**
Education records are records directly related to a student and maintained by an educational agency. This includes grades, assessment scores, attendance records, IEPs, disciplinary records, and any individually identifiable information about a student.

**Aggregate data vs. individual records:**
Aggregate or statistical data that cannot identify an individual student is generally not subject to FERPA restrictions. This is why the SUSD architecture uses aggregation-only views — the data that flows through the system is aggregate, not individual education records.

**The school official exception:**
FERPA allows disclosure to school officials who have a "legitimate educational interest." For the district analytics assistant, all authorized users (teachers, school admins, district admins) are school officials. However, the system must still enforce scope — a school official doesn't have unlimited access; they have access appropriate to their role.

## FERPA Requirements → Technical Controls

| FERPA Requirement | SUSD Technical Control |
|---|---|
| No disclosure to unauthorized parties | Entra ID authentication + JWT validation |
| Legitimate educational interest required | Role-based access (teacher/school_admin/district_admin) |
| Need-to-know scoping | `UserContext.SchoolId`, `SectionIds` as SQL WHERE parameters |
| Individual record protection | No PII columns in approved views; no `SELECT *` on student tables |
| Audit trail for record access | Azure Monitor + OpenTelemetry logging of every query |
| Data minimization | Small cell suppression in `vw_AssessmentGapBySubgroup`; aggregation only |
| Third-party agreement requirements | Azure OpenAI FERPA-aligned service terms (see below) |
| Parent/student right to inspect | Out of scope for analytics assistant — handled by SIS |

## What Goes to Azure OpenAI

Every request to Azure OpenAI in the SUSD pipeline contains:

1. **System prompt** — defines the assistant's behavior; no student data
2. **Retrieved metadata** — describes data views; no student records
3. **SQL data summary** — aggregate statistics (counts, rates, percentages)
4. **User question** — free text from a school official

What does **not** go to Azure OpenAI:
- Individual student names
- Student IDs (SSN, district ID, state ID)
- Grades or assessment scores for individual students
- Behavioral or disciplinary records
- IEP content
- Protected class information tied to individuals

The aggregate SQL summary that does go to Azure OpenAI might include: "Grade 3, Math, Sunlake Elementary, 2025-26, 78% proficient, 15 students assessed." This is aggregate data, not an education record.

**Azure OpenAI FERPA alignment:**

Microsoft offers FERPA-aligned service terms for Azure, which include:
- Not using customer data to train models
- Data processing agreements (DPA) and Business Associate Agreements (BAA)
- Data residency and retention controls

> **Action item:** Before moving to production, verify that your district's Azure subscription has the FERPA-aligned service terms enabled and that a Data Processing Agreement is in place with Microsoft.

## The Five Most Common FERPA Violations in AI Systems

### Violation 1: Sending individual student records to the LLM

**How it happens:** Developer retrieves rows from `dim_Student` and includes them directly in the prompt to "give the AI more context."

**The control:** The approved view pattern ensures the AI never sees rows from `dim_Student`, `fact_Assessment` (individual), or any other record-level table. The SQL handler only calls approved views.

**Test:** Run `lab04a_pii_check.py` from Lab 04a. All approved views must have zero PII columns.

### Violation 2: Logging prompt contents that contain student references

**How it happens:** A teacher's question is "How is Maria Gonzalez doing in reading?" The full prompt (including the question) is logged to Application Insights. The log now contains a student name.

**The controls:**
- Application Insights logs should record question length and intent category, not full question text.
- Question logging should sanitize or hash free text.
- Log retention policies limit how long question text is retained.

**Recommended log format:**

```csharp
// Log category and tokens — not the full question
_logger.LogInformation(
    "Query processed: role={Role} category={Category} tokens={Tokens} grounded={Grounded}",
    ctx.Role, metadata["category"], tokensUsed, sqlResult is not null);
// Do NOT log: question text, answer text
```

### Violation 3: Caching responses that contain student-linked data

**How it happens:** Responses are cached by question text (as cache key). A second user with the same question receives the cached response — which was generated for a different user's school scope.

**The controls:**
- If caching is implemented, the cache key must include the full `UserContext` hash, not just the question.
- Preferably: do not cache responses at all in the initial deployment. Caching comes after security audit.

### Violation 4: Cross-scope data leakage via semantic similarity

**How it happens:** AI Search's semantic re-ranking returns metadata documents from outside the user's role scope. A teacher receives metadata describing the `vw_AssessmentGapBySubgroup` view (admin only) and uses the retrieved parameters to construct a question that bypasses the SQL scope check.

**The controls:**
- The `role_scope` filter is applied at the Azure AI Search level **as a mandatory pre-filter**, not as a post-filter.
- The `ViewRegistry.ThrowIfNotAuthorized(viewName, ctx.Role)` check catches any case where the metadata filter was bypassed.

### Violation 5: Using production student data in development/testing

**How it happens:** A developer copies a production SQL snapshot to a dev environment for testing. The dev environment lacks production-level security controls.

**The control:** The course uses synthetic data exclusively. All labs reference `SunlakeUnifiedDW` (synthetic). The policy "never use real student data in development or testing" must be documented and enforced.

## Minimum Required Controls for Production

Before the SUSD analytics assistant goes to production, all of these controls must be verified:

### Authentication and authorization
- [ ] Entra ID authentication enforced on all endpoints
- [ ] JWT validation against Entra public keys (not a dev secret)
- [ ] Role claims sourced from verified Entra group membership
- [ ] `SchoolId` and `SectionId` claims sourced from verified directory attributes
- [ ] No user-supplied role or school overrides accepted

### Data access
- [ ] All 9 approved views created and verified in production SQL Server
- [ ] `ai_svc_readonly` service account: GRANT SELECT on views only, DENY SELECT on base tables
- [ ] All SQL queries use parameterized statements — zero string interpolation
- [ ] Small cell suppression active in `vw_AssessmentGapBySubgroup`
- [ ] Token sent to Azure OpenAI contains no individual student names or IDs

### Logging and audit
- [ ] Every successful query logged: role, school, view used, timestamp
- [ ] Question text and answer text NOT included in operational logs
- [ ] Log retention policy defined and enforced (recommended: 90 days for operational logs)
- [ ] Audit log (who queried what) retained per district records policy
- [ ] Anomaly detection: flag any query that returns >100 rows from student-level views

### Agreements and governance
- [ ] Azure FERPA-aligned service terms enabled for the subscription
- [ ] Data Processing Agreement (DPA) signed with Microsoft
- [ ] District's AI/data governance policy reviewed and approved
- [ ] Staff training on AI use policy completed before access is granted
- [ ] Incident response plan drafted for data breach involving AI system

## Threat Model Summary

| Threat | Likelihood (pre-controls) | Likelihood (post-controls) | Residual risk |
|--------|--------------------------|---------------------------|---------------|
| Unauthenticated access | High | Very Low | JWT validation handles |
| Role escalation via request | High | Very Low | Claims from token only |
| Cross-school data leakage | Medium | Very Low | SQL scope + search filter |
| LLM sees individual student data | High | Low | Approved views + no PII columns |
| Prompt log contains student name | Medium | Low | Log sanitization |
| Response caching leakage | Medium | Low | No caching in v1 |
| Suppressed cell estimation by LLM | Medium | Low | Explicit system prompt instruction |
| Production data in dev | High (typical) | Very Low | Synthetic data policy |

## Responsible Disclosure

If a member of the district team discovers a security issue with the AI system:

1. Document the issue privately — do not share publicly or through chat
2. Report to the district's data privacy officer and IT security lead
3. Do not attempt to access data beyond what you found as evidence
4. Follow the district's existing incident response procedure

## Reflection Questions

1. A teacher asks the analytics assistant: "Can you tell me which of my students might drop out?" This question is about a legitimate educational concern. However, it implies requesting data that doesn't exist in the approved view catalog (dropout prediction). Describe the correct response and explain what additional controls would be required to ever answer this question.

2. FERPA's small cell suppression (fewer than 10 students) is a regulatory requirement for some types of reporting, but the SUSD architecture applies it proactively to all subgroup views. Is this the right decision? What are the costs (lost analytical value) and benefits (privacy protection)?

3. You discover that a previous developer added `_logger.LogDebug("Question: {Q} Answer: {A}", question, answer)` to the `RagOrchestrator`. This log entry is disabled in production (DEBUG level) but enabled in dev and staging. Is this a FERPA concern? Explain.

4. A parent contacts the district and says: "I want to see all the AI system's records about my child." Under FERPA, how should the district respond? What parts of the system's logs are education records? What parts are not?

## References

- [FERPA — U.S. Department of Education](https://studentprivacy.ed.gov/ferpa)
- [FERPA and cloud computing guidance](https://studentprivacy.ed.gov/resources/cloud-computing-guidance-under-ferpa)
- [Microsoft Azure FERPA overview](https://docs.microsoft.com/azure/compliance/offerings/offering-ferpa)
- [Student Data Privacy Consortium](https://studentdataprivacy.org/)
- [CoSN Privacy Toolkit](https://www.cosn.org/privacy-toolkit/)

*Next: Module 14 — Evaluation and Hallucination Safety*
