# Architecture Decision Record Template

Use this template when documenting a significant design decision. An ADR captures the context, the decision, and the rationale — so that future readers (including your future self) understand why the system was designed a certain way.

---

## ADR [NUMBER]: [Short title]

**Date:** [YYYY-MM-DD]  
**Status:** [Proposed | Accepted | Superseded | Deprecated]  
**Superseded by:** [ADR number, if applicable]  
**Author(s):** [Name(s)]  
**Reviewers:** [Name(s)]

---

## Context

[Describe the situation that prompted this decision. What problem were you solving? What constraints existed? Who were the stakeholders?

Be specific. A good context section answers:
- What was the system doing before this decision?
- What problem or requirement triggered a decision?
- What constraints (technical, regulatory, organizational) applied?

Example: "The initial implementation queried SQL views using a single service account with no per-user scoping. As we added teachers to the pilot, we needed a way to ensure teachers could only see data for their own sections without modifying the service account or creating per-teacher database credentials."]

---

## Decision

**We will:** [State the decision clearly and directly. One or two sentences.]

Example: "We will enforce teacher section scoping by parameterizing the SQL query with section IDs extracted from the Entra ID JWT token claims, using indexed parameter names (@SId0, @SId1, ...) for SQL Server compatibility."

---

## Options Considered

### Option 1: [Name]

**Description:** [What this option would do]

**Pros:**
- [Pro 1]
- [Pro 2]

**Cons:**
- [Con 1]
- [Con 2]

**Why not chosen:** [If this was not the chosen option]

---

### Option 2: [Name]

**Description:** [What this option would do]

**Pros:**
- [Pro 1]
- [Pro 2]

**Cons:**
- [Con 1]
- [Con 2]

**Why not chosen:** [If this was not the chosen option]

---

### Option 3: [Name] *(chosen)*

**Description:** [What this option does — this is the decision above]

**Pros:**
- [Pro 1]
- [Pro 2]

**Cons / trade-offs accepted:**
- [Con 1]
- [Con 2]

---

## Rationale

[Explain why Option 3 was chosen over the alternatives. Reference constraints and requirements from the Context section. Include any discussion or disagreement that occurred before the decision was made.

This section should be longer than the others — it is the core value of an ADR.]

---

## FERPA and Privacy Impact

[Complete this section for any decision that affects how student data is handled, even indirectly.]

**Does this decision affect what data is exposed to the LLM?**

[ ] Yes — describe how:
[ ] No

**Does this decision affect how access control is enforced?**

[ ] Yes — describe how:
[ ] No

**Does this decision affect audit logging or data retention?**

[ ] Yes — describe how:
[ ] No

**DPO review required?**

[ ] Yes — DPO notified on [DATE]
[ ] No — explain why not: 

---

## Consequences

**Positive:**
- [What becomes easier, safer, or more correct as a result of this decision?]

**Negative / risks:**
- [What trade-offs are accepted? What new complexity is introduced?]

**Follow-up work required:**
- [ ] [Action item 1]
- [ ] [Action item 2]

---

## Implementation Notes

[Optional. If the decision has specific implementation requirements that should not be forgotten, note them here. For example: "The ViewRegistry.IsAuthorized() method is the single source of truth for role-to-view mapping. Any new view must be added there and NOT in QueryViewAsync separately."]

---

## References

- [Link or reference to relevant specification, ticket, or discussion]
- [Link to related ADR, if any]

---

## Revision History

| Date | Author | Change |
|---|---|---|
| [YYYY-MM-DD] | [Author] | Initial draft |
| [YYYY-MM-DD] | [Author] | [Change description] |

---

## Example: Completed ADR

Below is a completed example for reference.

---

### ADR 001: Aggregate-only approved view catalog

**Date:** 2025-09-01  
**Status:** Accepted  
**Author(s):** Lucio Da Silva  
**Reviewers:** Data Privacy Officer

**Context:**  
The initial design considered allowing the AI assistant to query individual student records from a restricted database view, with the LLM aggregating results before presenting them to users. This would allow more flexible question answering (e.g., "show me students below proficiency") but required sending individual student data to Azure OpenAI.

**Decision:**  
We will use an aggregate-only approved view catalog. No SQL view in the catalog will return individual student names, IDs, or row-level records. The LLM will never receive individual student data.

**Options Considered:**  
1. Row-level data with LLM aggregation (not chosen — sends individual records to Azure OpenAI)
2. Row-level data with server-side aggregation before LLM (not chosen — individual records still enter the application layer and could be logged)
3. Aggregate-only SQL views (chosen)

**Rationale:**  
Option 3 ensures individual student records never leave the SQL Server, not even to the application process or monitoring infrastructure. This is the most conservative FERPA posture and eliminates the risk of accidental individual student exposure through logging, caching, or LLM hallucination. The trade-off is that the system cannot answer individual student questions — this is explicitly a design goal, not a limitation.

**FERPA Impact:**  
This decision is driven by FERPA. DPO reviewed and approved on 2025-09-01.

**Consequences:**  
- Positive: Zero risk of LLM receiving individual student PII. FERPA controls are structural, not procedural.  
- Negative: The system cannot answer "which students need intervention?" type questions — a significant capability gap.  
- Follow-up: Add explicit decline messages for individual-student questions. Train users on what the system can and cannot do.
