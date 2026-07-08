# FERPA Reference for AI Systems in K-12

Quick reference for the Family Educational Rights and Privacy Act (FERPA) as it applies to AI analytics systems that access student education records.

> **Disclaimer:** This reference is educational and does not constitute legal advice. Consult your district's legal counsel and Data Privacy Officer for authoritative guidance on FERPA compliance.

---

## What FERPA Covers

FERPA (20 U.S.C. § 1232g; 34 CFR Part 99) protects the privacy of **student education records** at educational institutions that receive federal funding.

### Education Records — Definition

Education records are records that are:
- Directly related to a student, AND
- Maintained by an educational agency or institution, OR by a party acting for or on behalf of the agency

**Examples in a K-12 district data warehouse:**
- Attendance records (individual-level)
- Assessment scores (individual-level)
- Enrollment status
- Discipline records
- Special education records
- English Language Learner designation
- Free/reduced price lunch status

### What FERPA Does NOT Cover

- Aggregated, de-identified data where individual students cannot be identified
- Teacher observations that are not recorded and maintained as student records
- Directory information (subject to annual opt-out process)
- Records about district staff (not students)

---

## FERPA and AI Systems — Key Questions

### Does FERPA apply to our Azure OpenAI queries?

**Yes, if student education records are included in the prompt.** When student data is sent to a third-party AI service (like Azure OpenAI), FERPA requirements follow the data.

**Specifically:**
- If a prompt contains individual student data (name, score, ID), FERPA applies
- If a prompt contains only aggregate data (school-level averages, grade-level counts), FERPA still applies at the system design level but the individual record exposure risk is lower
- Azure must be operating under an appropriate agreement (see below)

### What agreement is required with Microsoft?

Azure for Education and Azure Government offer service terms that address FERPA. Before sending any student education records to Azure services:

1. Confirm your Azure subscription includes the **FERPA-aligned service terms** or a comparable data processing addendum
2. The district's Data Processing Agreement (DPA) with Microsoft should address:
   - Purpose limitation (data used only to fulfill the service)
   - Data retention (Azure OpenAI does not retain prompts by default — confirm this is true for your configuration)
   - Sub-processor disclosures
   - Data subject request handling

### What is a "school official" exception?

FERPA allows disclosure without consent to "school officials" with a "legitimate educational interest." A software service (like Azure OpenAI) may qualify as a school official if:
- The district has outsourced a function normally performed by employees
- The service is under the district's direct control regarding the use and maintenance of education records
- The service uses the records only for the authorized purpose

The AI analytics system in this course can qualify under this exception — but only if the appropriate data processing agreement is in place.

---

## FERPA Controls in This Course

### Control 1: No Individual Student Data in Prompts

The approved view catalog contains only aggregate views. No view returns individual student names, IDs, or row-level records. The LLM never receives individual student data.

**Verification:** Review each SQL view — no `StudentId`, `StudentName`, or `DateOfBirth` columns appear in any approved view output.

### Control 2: Small Cell Suppression

When a subgroup has fewer than 10 students, aggregate statistics could be used to infer individual values. Views suppress those values with NULL.

```sql
CASE WHEN StudentCount < 10 THEN NULL ELSE AvgScaledScore END AS AvgScaledScore
```

**FERPA rationale:** FERPA regulations reference NCES guidance on statistical disclosure limitation. The 10-student threshold is a common K-12 standard, though districts may use stricter thresholds (some use 15 or 20).

### Control 3: Role-Based Access at the Data Layer

Access control enforced at the SQL layer (not just the UI). The `ai_svc_readonly` service account is granted SELECT only on approved views, not on base tables.

```sql
GRANT SELECT ON dbo.vw_AttendanceSummaryBySchoolAndGrade TO ai_svc_readonly;
DENY SELECT ON dbo.dim_Student TO ai_svc_readonly;
```

### Control 4: Scope Enforcement in SQL

Even within an approved view, a teacher sees only their own sections and a school admin sees only their own school. This is enforced by parameterized WHERE clauses using claims from the validated JWT.

### Control 5: Audit Trail

Every AI query is logged with: role, school, view queried, token counts, latency, and grounded status. Question and answer text are not logged (to minimize data retained in the monitoring system).

---

## FERPA Risk Categories in AI Systems

### High Risk — Must Prevent

| Scenario | FERPA issue |
|---|---|
| Individual student name in LLM prompt | Direct PII disclosure to third-party processor |
| Individual student score in LLM prompt | Same |
| LLM response names a specific student | System generated re-identified output |
| System prompt contains example with real student data | PII retained in model context window |
| Question text logged to Azure Monitor | Potential PII retention in monitoring system |
| Prompt injection extracts student data | Circumvents access controls |

### Medium Risk — Must Control

| Scenario | FERPA issue |
|---|---|
| Small subgroup statistics without suppression | Statistical re-identification risk |
| Answer stored in cache with student-scoped data | Data retention beyond operational need |
| Cross-school data leakage (scope bleed) | Unauthorized disclosure to wrong school official |
| Audit logs retained indefinitely | Retention beyond operational need |

### Lower Risk — Should Monitor

| Scenario | FERPA issue |
|---|---|
| Aggregated school-level data in prompt | Low re-identification risk; still education records |
| District administrator accessing all-schools view | Authorized, but scope is broad — audit important |
| Test data (synthetic) used in production environment | Procedural risk, not a FERPA violation |

---

## FERPA in System Design Decisions

### Why no individual student queries?

Even if a teacher asks "How is Maria doing in reading?" — a legitimate educational question — the system architecture intentionally cannot answer it. This is by design:

1. The approved view catalog contains no individual-level views
2. The service account cannot access `dim_Student`
3. The system prompt instructs the LLM to report at aggregate level

This design means the system can never accidentally expose individual student data, even if the LLM is prompted to try.

### Why aggregate at the view level, not at the API level?

It would be possible to return individual student data from the database and then aggregate in application code before sending to the LLM. This would still expose individual records to the API layer, the memory of the application process, and any logging infrastructure. Aggregating at the SQL view level ensures individual records never leave the database.

### Why not cache responses?

Response caching creates a FERPA risk: if a cache key does not include the full UserContext (role + school + sections + year + term), a cached response from one user's context could be returned to a different user. If caching is implemented, the cache key must be a hash of the complete UserContext, and cached entries must have a short TTL.

---

## Glossary

**Education record:** A record directly related to a student and maintained by an educational institution or party acting on its behalf.

**De-identified data:** Data from which all personally identifiable information has been removed. Under FERPA, de-identified data is not an education record and may be shared more freely. However, a school must make a "reasonable determination" that a student's identity is not traceable.

**Directory information:** Student information (name, address, phone, dates of attendance, honors) that may be disclosed without consent unless the parent/student has opted out. Not to be confused with "non-sensitive" — AI systems should not use directory information to identify individuals.

**Legitimate educational interest:** The test for whether a school official may access a student's education records without consent. An AI analytics system can have legitimate educational interest if it operates under appropriate agreement and accesses only the data needed for the authorized function.

**Personally Identifiable Information (PII) under FERPA:** Includes name, address, personal identifier (SSN, student number), indirect identifiers, and other information that alone or in combination is linkable to a specific student.

**Re-identification:** The process by which de-identified or aggregated data is combined with other information to identify an individual. Small cell suppression defends against this.

---

## Key References

- FERPA statute: 20 U.S.C. § 1232g
- FERPA regulations: 34 CFR Part 99
- U.S. Department of Education FERPA guidance: studentprivacy.ed.gov
- PTAC (Privacy Technical Assistance Center) — K-12 AI guidance: studentprivacy.ed.gov/resources
- NIST Privacy Framework — applicable for AI system design
- Microsoft Azure FERPA documentation: look up current documentation at microsoft.com/en-us/trust-center/compliance/ferpa
