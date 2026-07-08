# Capstone Project — SUSD Analytics Assistant: Production-Ready Design

**Course:** Azure AI for K-12 District Analytics  
**Estimated time:** 10–15 hours  
**Submission:** See `capstone-submission-template.md`  
**Rubric:** See `capstone-rubric.md`

## Overview

The capstone asks you to synthesize everything from the 8-week course into a coherent, production-ready design for the SUSD Analytics Assistant (or a comparable district you define). You are not starting from scratch — you are extending, hardening, and documenting the system you built in the labs.

This capstone has two parts:

- **Part A — Technical Design (60%):** Extend the system with one new capability and produce a complete technical design document.
- **Part B — Governance and Readiness (40%):** Produce a governance plan and stakeholder communication package that would allow the district to actually deploy the system.

## Context: Where the Course Left Off

At the end of Week 8, the SUSD Analytics Assistant has:

- A RAG pipeline with role-based access (three roles, 9 approved views)
- FERPA-conscious design (no individual student names in prompts; small cell suppression)
- 30-case evaluation test set with four-dimension scoring
- OpenTelemetry instrumentation with Azure Monitor integration
- A production readiness checklist identifying remaining infrastructure and process gaps

Your capstone extends this system and prepares it for real-world deployment.

## Part A — Technical Design

### A1. New Capability (choose one)

Select **exactly one** of the following capabilities to design and partially implement:

**Option 1: Multi-Term Trend Analysis**

The current system answers questions about a single term. Extend it to support multi-term comparisons.

*Example question:* "How has attendance at Sunlake Elementary changed from Q1 to Q3?"

Requirements:
- Define a new SQL view `vw_AttendanceTrendBySchool` that returns one row per school/term with attendance rate
- Update the ViewRegistry to include the new view with appropriate role scope
- Update the metadata document for the new view with query patterns
- Implement the multi-term prompt template (how does the LLM format comparisons?)
- Add 4 test cases to the evaluation set covering multi-term questions

**Option 2: Confidence Signaling**

The current system answers or declines. There is no middle ground. Extend it to return a confidence signal alongside every answer.

Requirements:
- Define a `ConfidenceLevel` enum: `High`, `Medium`, `Low`, `Declined`
- Define the rules for each level (e.g., groundedness score ≥ 0.9 = High; ≥ 0.7 = Medium; < 0.7 = Low)
- Update `AnalyticsResponse` to include `ConfidenceLevel` and `ConfidenceReason`
- Update the response format — Low and Medium confidence responses include a caveat sentence
- Add confidence level to the audit log
- Define how confidence levels should be displayed in the user interface (design spec, not implementation)
- Add 3 test cases specifically designed to exercise the Medium confidence path

**Option 3: Suggested Follow-Up Questions**

After answering a question, suggest 2–3 follow-up questions the user might want to ask, based on the view queried.

Requirements:
- Design a follow-up generation approach (LLM in second pass, or template-based from view name)
- Define follow-up templates for all 9 approved views
- Ensure follow-up suggestions are scoped to the user's role (a teacher should not see district-level follow-up suggestions)
- Implement the follow-up templates as a static `FollowUpSuggester` class with a `GetSuggestions(viewName, userRole)` method
- Add 3 test cases where the correct follow-ups must appear for a teacher and must NOT appear for a different role

**Option 4: View Catalog Expansion**

The current catalog has 9 views. Design and implement 2 new views that would be valuable for the district.

Requirements:
- Choose 2 new analytical questions the system currently cannot answer (from the perspective of teachers or administrators)
- Design the SQL view for each (columns, filters, small cell suppression if needed)
- Assign `role_scope` values for each view
- Write the metadata document for each view (description, example questions, parameters)
- Update `ViewRegistry` to add the 2 new views
- Add 4 test cases (2 per view) to the evaluation test set
- Conduct a FERPA review of each view: does it expose any individual student data? If the view is at the section level, does it need small cell suppression?

### A2. Technical Design Document

For your chosen option, produce a technical design document (use the Architecture Decision Record template from `templates/architecture-decision-record.md`) that includes:

1. **Problem statement** — What gap in the current system does this capability fill?
2. **Approach options** — At least 2 ways you could implement this; compare trade-offs
3. **Selected approach** — Which approach you chose and why
4. **Technical specification** — Data model changes, API changes, new classes, SQL changes
5. **FERPA impact** — Does this change affect any privacy controls? How?
6. **Evaluation impact** — How does this capability affect the evaluation test set? Add new cases and update the scoring framework if needed
7. **Monitoring impact** — What new metrics or log fields are needed?
8. **Rollout** — Which rollout phase would this be ready for? What validation is needed before enabling for all users?

### A3. Code Artifacts

Produce working (or near-working) code for your chosen option:

- Any new or modified `.cs` files
- Any new or modified SQL view definitions
- Any new or modified Python evaluation scripts
- Any new metadata JSON documents

Code should follow all conventions established in the course:
- Parameterized SQL only
- `ThrowIfNotAuthorized()` before any view access
- Role scope populated in all new metadata documents
- Audit log updated to include new fields

## Part B — Governance and Readiness

### B1. FERPA Compliance Evidence Document

Complete the FERPA Compliance Evidence Document from Lab 07a (Part 6) for your full system, including any new capability from Part A.

The document must have all 7 sections filled out and be suitable for review by a Data Privacy Officer.

### B2. Completed Production Readiness Checklist

Take the checklist from Lab 08b and complete all items:

- Every ⚙ INFRA item must have a concrete plan: what needs to be configured, who does it, and how long will it take?
- Every 📋 PROCESS item must have a concrete plan: who in the district owns it, what do they need from the technical team to complete it?
- Every item should now have a target completion date (relative: e.g., "Week 2 of Phase 1 pilot")

### B3. Evaluation Report

Run the full 30-case evaluation (plus any new cases from Part A) and produce an evaluation report:

- Summary table: all 4 dimensions with scores and thresholds
- Category-by-category breakdown
- Any cases that scored below threshold — root cause analysis and remediation plan
- Comparison of manual scores vs. Azure AI Evaluation SDK scores (from Lab 07b Part 4)
- Go/no-go recommendation for Phase 1 pilot, with justification

### B4. Stakeholder Communication Package

Write 3 targeted communications:

**B4a. Executive Summary (1 page)**  
Audience: District superintendent and school board  
Content: What the system does, what protections are in place, expected benefits, pilot plan, success criteria  
Tone: Non-technical; emphasize student data protection and educational value

**B4b. Staff Training Outline**  
Audience: Teachers and school administrators who will use the system  
Content: How to ask good questions, what kinds of questions the system can and cannot answer, how to verify answers, what to do if the answer seems wrong  
Format: Bulleted outline with timing (for a 45-minute onboarding session)

**B4c. IT Operations Runbook**  
Audience: District IT staff who will maintain the system  
Content: How to check system health, how to respond to each alert type, what to do if evaluation scores drop, how to add a new approved view (the change control process), escalation contacts  
Format: Step-by-step operational procedures

## Submission

See `capstone-submission-template.md` for the exact file structure and checklist.

All code artifacts should be placed in `capstone/submission/code/`.  
All document artifacts should be placed in `capstone/submission/docs/`.

## Constraints and Guidelines

- **No real student data.** All examples, test cases, and code use synthetic SUSD data only.
- **FERPA-first.** Every design decision in Part A must be evaluated through the FERPA lens before finalizing.
- **80/20 thinking.** In Part A, focus on the highest-impact implementation for your chosen option. You do not need to build a production-complete feature — you need a solid design with proof-of-concept code.
- **Be honest.** In Part B, where items are genuinely incomplete or uncertain, say so. A realistic assessment is more valuable than a checklist that claims everything is done.

## Grading

See `capstone-rubric.md` for the detailed rubric. Summary:

| Section | Points |
|---|---|
| A1. New capability implementation | 25 |
| A2. Technical design document | 20 |
| A3. Code artifacts quality | 15 |
| B1. FERPA compliance evidence | 15 |
| B2. Production readiness plan | 10 |
| B3. Evaluation report | 10 |
| B4. Stakeholder communications | 5 |
| **Total** | **100** |

*Good luck — and remember: the goal is a system a district could actually deploy, with controls a data privacy officer could actually audit.*
