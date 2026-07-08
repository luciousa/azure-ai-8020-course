# Capstone Submission Template

Complete this template and submit the entire `capstone/submission/` directory.

---

## Student Information

```
Name: ___________________________
Date submitted: ___________________________
Capstone option chosen (1, 2, 3, or 4): ___________________________
Option name: ___________________________
```

---

## Submission Checklist

Mark each item before submitting. Incomplete submissions will be returned for revision.

### Part A — Technical Design

- [ ] **A1 — New capability implemented**
  - [ ] All option-specific requirements from `capstone-instructions.md` are met
  - [ ] At least one working `.cs` or `.sql` file produced
  - [ ] New evaluation test cases written (minimum: per option requirement)
  - [ ] No real student data in any artifact

- [ ] **A2 — Technical design document**
  - [ ] All 8 sections present (problem statement through rollout)
  - [ ] At least 2 implementation approaches compared
  - [ ] FERPA impact section is specific to this change
  - [ ] File location: `capstone/submission/docs/technical-design.md`

- [ ] **A3 — Code artifacts**
  - [ ] All new/modified `.cs` files in `capstone/submission/code/dotnet/`
  - [ ] All new/modified `.sql` files in `capstone/submission/code/sql/`
  - [ ] All new/modified Python scripts in `capstone/submission/code/python/`
  - [ ] All new metadata JSON documents in `capstone/submission/code/metadata/`
  - [ ] Zero string-interpolated SQL (verified by grep: `$"` in any `.cs` SQL string)
  - [ ] `ThrowIfNotAuthorized()` called before every new view access
  - [ ] Role scope field populated in all new metadata documents

### Part B — Governance and Readiness

- [ ] **B1 — FERPA Compliance Evidence Document**
  - [ ] All 7 sections complete
  - [ ] New capability from Part A analyzed in Section 7
  - [ ] File location: `capstone/submission/docs/ferpa-compliance-evidence.md`

- [ ] **B2 — Production Readiness Checklist**
  - [ ] All ⚙ INFRA items have concrete plans (named resource, owner, timeline)
  - [ ] All 📋 PROCESS items have named owner and target completion date
  - [ ] Critical blockers section identifies at least 3 specific blockers
  - [ ] File location: `capstone/submission/docs/production-readiness-plan.md`

- [ ] **B3 — Evaluation Report**
  - [ ] Summary table with actual (not estimated) scores for all 4 dimensions
  - [ ] Category-by-category breakdown (A–E plus Part A cases)
  - [ ] Root cause for any below-threshold case
  - [ ] Manual vs. Azure AI Evaluation SDK comparison table
  - [ ] Go/no-go recommendation with specific justification
  - [ ] File location: `capstone/submission/docs/evaluation-report.md`

- [ ] **B4 — Stakeholder Communications**
  - [ ] B4a Executive Summary (≤ 1 page, non-technical)
  - [ ] B4b Staff Training Outline (45-minute session structure)
  - [ ] B4c IT Operations Runbook (step-by-step procedures)
  - [ ] File location: `capstone/submission/docs/stakeholder-communications.md`

---

## Submission Directory Structure

Your submission directory must match this structure exactly:

```
capstone/
└── submission/
    ├── SUBMISSION.md          ← this file, completed
    ├── code/
    │   ├── dotnet/
    │   │   └── *.cs           ← new or modified C# files
    │   ├── sql/
    │   │   └── *.sql          ← new or modified SQL view definitions
    │   ├── python/
    │   │   └── *.py           ← new or modified Python evaluation scripts
    │   └── metadata/
    │       └── *.json         ← new or modified metadata documents
    └── docs/
        ├── technical-design.md
        ├── ferpa-compliance-evidence.md
        ├── production-readiness-plan.md
        ├── evaluation-report.md
        └── stakeholder-communications.md
```

---

## Self-Assessment

Before submitting, score yourself on the rubric from `capstone-rubric.md`. If you score yourself below passing on any section, use the space below to explain the gap and what you would do differently with more time.

```
My estimated score:

  A1. New capability: ___ / 25
  A2. Technical design doc: ___ / 20
  A3. Code quality: ___ / 15
  B1. FERPA evidence: ___ / 15
  B2. Readiness checklist: ___ / 10
  B3. Evaluation report: ___ / 10
  B4. Communications: ___ / 5
  Total estimated: ___ / 100

Sections where I had difficulty and why:


What I would do differently with more time:
```

---

## Certification

By submitting this capstone, I certify that:

1. All code and documents are my own work (with AI assistance where noted per course policy).
2. No real student personally identifiable information appears in any submitted artifact.
3. All examples, test data, and scenarios use the synthetic Sunlake Unified School District dataset only.
4. I have read and applied the FERPA principles taught in Modules 13 and 14.

```
Signature (type full name): ___________________________
Date: ___________________________
```

---

## Notes to Reviewer

*(Optional: any context that would help the reviewer understand your submission — design decisions, known gaps, time constraints, etc.)*

```

```
