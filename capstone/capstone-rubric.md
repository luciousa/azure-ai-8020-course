# Capstone Rubric

**Total points: 100**  
**Passing score: 75**  
**Distinction: 90+**

---

## Part A — Technical Design (60 points)

### A1. New Capability Implementation (25 points)

| Score | Criteria |
|---|---|
| **23–25** | All option requirements met; SQL, .NET code, and metadata documents are complete and correct; FERPA controls respected; evaluation cases are specific, realistic, and test the actual new behavior |
| **18–22** | Most requirements met; minor gaps (e.g., missing one metadata field, one test case is vague); FERPA controls present |
| **12–17** | Core feature works but requirements are partially met; some FERPA considerations missing; evaluation cases present but low quality |
| **6–11** | Feature is partially implemented; significant gaps in requirements; FERPA impact not addressed |
| **0–5** | Feature not implemented or does not follow course conventions; no evaluation cases |

**Specific criteria by option:**

**Option 1 (Multi-Term Trend):**
- SQL view returns correct schema (school, term, attendance rate, year columns) — 5 pts
- ViewRegistry updated with correct role_scope — 3 pts
- Metadata document complete with example questions — 4 pts
- Multi-term prompt template handles comparison correctly — 7 pts
- 4 evaluation cases with meaningful expected_keywords and expected_absent — 6 pts

**Option 2 (Confidence Signaling):**
- `ConfidenceLevel` enum defined with all 4 values — 3 pts
- Scoring rules clearly defined and applied consistently — 6 pts
- `AnalyticsResponse` updated correctly — 4 pts
- Response format includes caveat on Medium/Low — 4 pts
- Audit log updated — 2 pts
- UI design spec present — 3 pts
- 3 Medium-path evaluation cases — 3 pts

**Option 3 (Follow-Up Questions):**
- Follow-up generation approach justified — 4 pts
- Templates defined for all 9 approved views — 8 pts
- Role scoping enforced in `GetSuggestions` — 5 pts
- 3 evaluation cases test cross-role scoping correctly — 8 pts

**Option 4 (View Catalog Expansion):**
- 2 new views answer genuinely useful questions not in current catalog — 4 pts
- SQL correct (parameterized, scoped, small cell suppression where needed) — 6 pts
- role_scope values appropriate for each view — 3 pts
- Metadata documents complete — 4 pts
- ViewRegistry updated — 2 pts
- FERPA review for each view present and complete — 4 pts
- 4 evaluation cases (2 per view) — 2 pts

---

### A2. Technical Design Document (20 points)

| Score | Criteria |
|---|---|
| **18–20** | All 8 sections present and substantive; trade-off analysis is genuine (not "Option A is good; Option B is worse"); FERPA impact is specific (identifies exact controls affected, not "we follow FERPA"); evaluation and monitoring impacts are concrete |
| **14–17** | All or most sections present; trade-off analysis present but superficial; FERPA and evaluation sections present but generic |
| **9–13** | Some sections missing; problem statement is vague; trade-off analysis is absent or trivial |
| **4–8** | Design document is incomplete; reads like a checklist rather than an engineering document |
| **0–3** | Document not submitted or not structured per the ADR template |

**Section-by-section:**
- Problem statement (identifies a real gap, not just "I chose Option X") — 2 pts
- Approach options with genuine trade-offs compared — 4 pts
- Selected approach with clear rationale — 2 pts
- Technical specification (data model, API, class changes specific enough to implement) — 4 pts
- FERPA impact (specific controls affected; any new views, logs, or prompts analyzed) — 4 pts
- Evaluation impact (new cases defined with scoring notes) — 2 pts
- Monitoring impact (new metrics or log fields named) — 1 pt
- Rollout section (specific phase, validation criteria) — 1 pt

---

### A3. Code Artifacts Quality (15 points)

| Score | Criteria |
|---|---|
| **13–15** | All code follows course conventions without exception; zero string-interpolated SQL; `ThrowIfNotAuthorized()` present where required; role scope in all metadata documents; structured log updated; code would compile with minor wiring |
| **10–12** | Most conventions followed; 1–2 minor violations (e.g., a parameterized query with wrong parameter naming pattern); role scope present |
| **6–9** | Conventions partially followed; string interpolation in SQL OR missing ThrowIfNotAuthorized OR role scope missing from new metadata — any one of these is a significant deduction |
| **2–5** | Multiple convention violations; code is fragmentary |
| **0–1** | No code submitted or code does not relate to the course conventions |

**Automatic deductions (regardless of section score):**
- String-interpolated SQL: −5 pts
- Missing `ThrowIfNotAuthorized()` on a new view access: −4 pts
- Hardcoded API key in code: −4 pts
- Student name or individual student data in any code, test, or metadata: −10 pts (and FERPA compliance section is auto-scored 0)

---

## Part B — Governance and Readiness (40 points)

### B1. FERPA Compliance Evidence Document (15 points)

| Score | Criteria |
|---|---|
| **13–15** | All 7 sections complete; evidence is specific and traceable to labs; new capability from Part A fully analyzed; document reads as if it would survive a DPO review |
| **10–12** | All 7 sections present; some sections generic (e.g., "we use role-based access" without naming the specific mechanism); Part A new capability included |
| **6–9** | Some sections missing or very brief; Part A new capability absent from analysis |
| **2–5** | Document skeleton only; sections not filled with meaningful content |
| **0–1** | Document not submitted |

**Section weightings:**
- Section 1 (System identification) — 1 pt
- Section 2 (Data elements and student records) — 2 pts
- Section 3 (Three-layer access control) — 3 pts
- Section 4 (Data transmission and storage) — 2 pts
- Section 5 (Audit and monitoring) — 2 pts
- Section 6 (Incident response) — 2 pts
- Section 7 (Certifications) — 3 pts (must include the new capability from Part A)

---

### B2. Production Readiness Checklist (10 points)

| Score | Criteria |
|---|---|
| **9–10** | Every ⚙ INFRA item has a concrete plan (named resource, named person, estimated time); every 📋 PROCESS item has a named owner and timeline; target dates are relative but consistent (no contradictions); critical blockers are realistic |
| **7–8** | Most items have concrete plans; a few remain vague ("IT will handle this"); dates mostly consistent |
| **4–6** | Plans are present but generic; some PROCESS items have no named owner; dates are missing for many items |
| **1–3** | Checklist repeated from Lab 08b without meaningful completion |
| **0** | Not submitted |

---

### B3. Evaluation Report (10 points)

| Score | Criteria |
|---|---|
| **9–10** | All 4 dimensions reported with actual scores (not "approximately"); root cause analysis for any below-threshold case is specific (names the failure mode, not "the model was wrong"); go/no-go recommendation is justified with data |
| **7–8** | All dimensions present; root cause analysis present but somewhat generic; recommendation is justified |
| **4–6** | Some dimensions missing or using placeholder scores; limited root cause analysis; recommendation present but not well-justified |
| **1–3** | Evaluation not run; scores fabricated without evidence |
| **0** | Not submitted |

**Sub-scores:**
- Summary table with all 4 dimensions and thresholds — 2 pts
- Category-by-category breakdown (A–E + Part A new cases) — 2 pts
- Root cause for any below-threshold case — 2 pts
- Manual vs. Azure AI Evaluation SDK comparison — 2 pts
- Go/no-go recommendation with specific justification — 2 pts

---

### B4. Stakeholder Communication Package (5 points)

| Score | Criteria |
|---|---|
| **5** | All 3 communications present; each is genuinely calibrated to its audience (superintendent summary has zero technical jargon; training outline is usable in 45 minutes; IT runbook has specific KQL/steps); no internal contradictions across documents |
| **4** | All 3 present; mostly audience-appropriate; minor jargon in executive summary or vague steps in runbook |
| **3** | All 3 present but not clearly differentiated by audience; generic content that could apply to any AI system |
| **1–2** | One or two documents missing or extremely brief |
| **0** | Not submitted |

---

## Academic Integrity

All submitted code must be written by the student (with AI assistance allowed, as per course policy), and must follow the conventions established in the course labs. Code copied verbatim from external sources without attribution will result in a score of 0 for Part A.

All student-data references must use synthetic SUSD data only. Submission of any artifact containing real student personally identifiable information will result in immediate course failure and escalation to the district Data Privacy Officer.

---

## Rubric Summary Table

| Section | Max | Passing |
|---|---|---|
| A1. New capability | 25 | 15 |
| A2. Technical design doc | 20 | 12 |
| A3. Code quality | 15 | 9 |
| B1. FERPA evidence | 15 | 9 |
| B2. Readiness checklist | 10 | 6 |
| B3. Evaluation report | 10 | 6 |
| B4. Communications | 5 | 3 |
| **Total** | **100** | **60*** |

*\*Overall passing score is 75, not the sum of section minimums. You may score below a section minimum if compensated by strength elsewhere, except that FERPA auto-deductions in A3 cascade into B1.*
